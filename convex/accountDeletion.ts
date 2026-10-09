import { action, query, internalAction, internalMutation, internalQuery } from './_generated/server';
import { internal } from './_generated/api';
import { getAuthUserId } from '@convex-dev/auth/server';
import { generateRandomString } from '@oslojs/crypto/random';
import { sha256 } from '@oslojs/crypto/sha2';
import { v } from 'convex/values';

export const digest=(value:string)=>Array.from(sha256(new TextEncoder().encode(value)),byte=>byte.toString(16).padStart(2,'0')).join('');
const equal=(left:string,right:string)=>{let difference=left.length^right.length;for(let i=0;i<left.length;i++)difference|=left.charCodeAt(i)^(right.charCodeAt(i)||0);return difference===0;};
const random=(alphabet:string,length:number)=>generateRandomString({read:bytes=>{const fresh=new Uint8Array(bytes.length);crypto.getRandomValues(fresh);bytes.set(fresh);}},alphabet,length);

export const status=query({args:{},returns:v.union(v.literal('active'),v.literal('deleting'),v.literal('deleted'),v.literal('signed_out')),handler:async ctx=>{
  const userId=await getAuthUserId(ctx);if(!userId)return 'signed_out';
  if(!await ctx.db.get(userId))return 'deleted';
  const state=await ctx.db.query('accountDeletions').withIndex('by_user',q=>q.eq('userId',userId)).unique();
  return state?.deleting?'deleting':'active';
}});

export const recipient=internalQuery({args:{userId:v.id('users')},returns:v.string(),handler:async(ctx,{userId})=>{
  const user=await ctx.db.get(userId),state=await ctx.db.query('accountDeletions').withIndex('by_user',q=>q.eq('userId',userId)).unique();
  if(!user?.email || state?.deleting)throw new Error('This account is not available.');
  if((state?.failedAt??[]).filter(time=>time>Date.now()-3_600_000).length>=5)throw new Error('Too many incorrect codes. Try again in an hour.');
  return user.email;
}});
export const saveChallenge=internalMutation({args:{userId:v.id('users'),challengeId:v.string(),codeHash:v.string(),emailHash:v.string()},returns:v.null(),handler:async(ctx,args)=>{
  if(!await ctx.db.get(args.userId))throw new Error('This account is not available.');
  const old=await ctx.db.query('accountDeletions').withIndex('by_user',q=>q.eq('userId',args.userId)).unique();
  if(old?.deleting)throw new Error('Deletion has already started.');
  const failedAt=(old?.failedAt??[]).filter(time=>time>Date.now()-3_600_000);
  if(failedAt.length>=5)throw new Error('Too many incorrect codes. Try again in an hour.');
  const fields={...args,expiresAt:Date.now()+15*60_000,failedAt,deleting:false};
  if(old)await ctx.db.replace(old._id,fields);else await ctx.db.insert('accountDeletions',fields);
  return null;
}});
export const invalidate=internalMutation({args:{userId:v.id('users'),challengeId:v.string()},returns:v.null(),handler:async(ctx,args)=>{
  const state=await ctx.db.query('accountDeletions').withIndex('by_user',q=>q.eq('userId',args.userId)).unique();
  if(state?.challengeId===args.challengeId&&!state.deleting)await ctx.db.patch(state._id,{codeHash:'',expiresAt:0});
  return null;
}});
export const requestCode=action({args:{},returns:v.object({challengeId:v.string()}),handler:async ctx=>{
  const userId=await getAuthUserId(ctx);if(!userId)throw new Error('Sign in before deleting your account.');
  const email=await ctx.runQuery(internal.accountDeletion.recipient,{userId});
  const key=process.env.AUTH_RESEND_KEY,from=process.env.AUTH_EMAIL_FROM;
  if(!key||!from)throw new Error('Email delivery is unavailable.');
  const emailHash=digest(email.toLowerCase());
  if(!await ctx.runMutation(internal.login.reserveEmail,{emailHash}))throw new Error('Please wait a minute before requesting another code.');
  const code=random('0123456789',6),challengeId=random('0123456789abcdef',32);
  await ctx.runMutation(internal.accountDeletion.saveChallenge,{userId,challengeId,emailHash,codeHash:digest(`${challengeId}:${code}`)});
  try{
    const response=await fetch('https://api.resend.com/emails',{method:'POST',headers:{Authorization:`Bearer ${key}`,'Content-Type':'application/json'},signal:AbortSignal.timeout(15_000),
      body:JSON.stringify({from,to:[email],subject:'Confirm deletion of your CareNama account',text:`Your account deletion code is ${code}.\n\nIt expires in 15 minutes. Entering this code and confirming deletion permanently removes your CareNama account and its record. If you did not request this, ignore this email.\n\nThis email contains no health information.`})});
    if(!response.ok)throw new Error('Email delivery failed.');
  }catch{await ctx.runMutation(internal.accountDeletion.invalidate,{userId,challengeId});throw new Error('We could not send your deletion code. Try again in a minute.');}
  return{challengeId};
}});

export const begin=internalMutation({args:{userId:v.id('users'),challengeId:v.string(),code:v.string()},returns:v.union(v.literal('deleted'),v.literal('started'),v.literal('limited'),v.literal('expired'),v.literal('invalid')),handler:async(ctx,{userId,challengeId,code})=>{
  if(!await ctx.db.get(userId))return 'deleted';
  const state=await ctx.db.query('accountDeletions').withIndex('by_user',q=>q.eq('userId',userId)).unique();
  if(state?.deleting)return 'started';
  const now=Date.now(),failedAt=(state?.failedAt??[]).filter(time=>time>now-3_600_000);
  if(failedAt.length>=5)return 'limited';
  if(!state||state.expiresAt<=now)return 'expired';
  if(challengeId!==state.challengeId||!/^\d{6}$/.test(code)||!equal(state.codeHash,digest(`${challengeId}:${code}`))){
    await ctx.db.patch(state._id,{failedAt:[...failedAt,now]});return 'invalid';
  }
  await ctx.db.patch(state._id,{deleting:true,codeHash:'',expiresAt:0});
  // A second worker ensures closing the page cannot cancel verified deletion.
  await ctx.scheduler.runAfter(0,internal.accountDeletion.finish,{userId,attempt:0});
  return 'started';
}});

// Each transaction removes at most 20 rows per growing child table. No full-table scan,
// source rewrite, or data from another caregiver is involved.
export const purge=internalMutation({args:{userId:v.id('users')},returns:v.boolean(),handler:async(ctx,{userId})=>{
  const state=await ctx.db.query('accountDeletions').withIndex('by_user',q=>q.eq('userId',userId)).unique();
  if(!state?.deleting)return !await ctx.db.get(userId);
  const events=await ctx.db.query('healthEvents').withIndex('by_caregiver_confirmation',q=>q.eq('caregiverId',userId)).take(20);
  if(events.length){for(const row of events)await ctx.db.delete(row._id);return false;}
  const family=await ctx.db.query('families').withIndex('by_caregiver',q=>q.eq('caregiverId',userId)).first();
  if(family){
    const person=await ctx.db.query('people').withIndex('by_family',q=>q.eq('familyId',family._id)).first();
    if(person){
      const record=await ctx.db.query('healthRecords').withIndex('by_person',q=>q.eq('personId',person._id)).first();
      if(record){const timeline=await ctx.db.query('healthTimelines').withIndex('by_record',q=>q.eq('recordId',record._id)).first();await ctx.db.delete(timeline?timeline._id:record._id);}
      else await ctx.db.delete(person._id);
    }else await ctx.db.delete(family._id);
    return false;
  }
  const session=await ctx.db.query('authSessions').withIndex('userId',q=>q.eq('userId',userId)).first();
  if(session){
    const tokens=await ctx.db.query('authRefreshTokens').withIndex('sessionId',q=>q.eq('sessionId',session._id)).take(20);
    const verifiers=await ctx.db.query('authVerifiers').withIndex('by_session',q=>q.eq('sessionId',session._id)).take(20);
    for(const row of [...tokens,...verifiers])await ctx.db.delete(row._id);
    if(!tokens.length&&!verifiers.length)await ctx.db.delete(session._id);
    return false;
  }
  const account=await ctx.db.query('authAccounts').withIndex('userIdAndProvider',q=>q.eq('userId',userId)).first();
  if(account){
    const codes=await ctx.db.query('authVerificationCodes').withIndex('accountId',q=>q.eq('accountId',account._id)).take(20);
    for(const row of codes)await ctx.db.delete(row._id);
    const limit=await ctx.db.query('authRateLimits').withIndex('identifier',q=>q.eq('identifier',account.providerAccountId)).unique();if(limit)await ctx.db.delete(limit._id);
    if(!codes.length)await ctx.db.delete(account._id);
    return false;
  }
  const usage=await ctx.db.query('loginEmailUsage').withIndex('by_email_time',q=>q.eq('emailHash',state.emailHash)).take(20);
  if(usage.length){for(const row of usage)await ctx.db.delete(row._id);return false;}
  if(await ctx.db.get(userId))await ctx.db.delete(userId);
  await ctx.db.delete(state._id);
  return true;
}});
export const finish=internalAction({args:{userId:v.id('users'),attempt:v.optional(v.number())},returns:v.null(),handler:async(ctx,{userId,attempt=0})=>{
  try{while(!await ctx.runMutation(internal.accountDeletion.purge,{userId})){};}
  catch{if(attempt<4)await ctx.scheduler.runAfter(1000,internal.accountDeletion.finish,{userId,attempt:attempt+1});throw new Error('Deletion has started. Retry to finish removing your account.');}
  return null;
}});
export const confirm=action({args:{challengeId:v.string(),code:v.string()},returns:v.null(),handler:async(ctx,args)=>{
  const userId=await getAuthUserId(ctx);if(!userId)throw new Error('Sign in before deleting your account.');
  if(args.code.length>6||args.challengeId.length>32)throw new Error('Enter the six-digit deletion code.');
  const status=await ctx.runMutation(internal.accountDeletion.begin,{userId,...args});
  if(status==='deleted')return null;
  if(status==='invalid')throw new Error('That deletion code is not correct. Try again.');
  if(status==='expired')throw new Error('That deletion code has expired. Request a new code.');
  if(status==='limited')throw new Error('Too many incorrect codes. Try again in an hour.');
  await ctx.runAction(internal.accountDeletion.finish,{userId});
  return null;
}});

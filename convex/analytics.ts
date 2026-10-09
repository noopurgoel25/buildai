import { query, mutation, internalQuery, internalMutation, internalAction } from './_generated/server';
import { internal } from './_generated/api';
import { getAuthUserId } from '@convex-dev/auth/server';
import { accountIsActive } from './lib/accountAccess';
import { safeProperties,countBucket } from './lib/analytics';
import { v } from 'convex/values';
import type { MutationCtx,QueryCtx } from './_generated/server';
import type { Id,Doc } from './_generated/dataModel';

const fields=v.record(v.string(),v.union(v.string(),v.number(),v.boolean()));
const uuid=(id:string)=>/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(id);
const byUser=async(ctx:QueryCtx|MutationCtx,userId:Id<'users'>)=>ctx.db.query('analyticsAccounts').withIndex('by_user',q=>q.eq('userId',userId)).unique();
async function account(ctx:MutationCtx,userId:Id<'users'>):Promise<Doc<'analyticsAccounts'>>{
  const existing=await byUser(ctx,userId);if(existing)return existing;
  const values={userId,distinctId:crypto.randomUUID(),enabled:true,windowAt:Date.now(),windowCount:0};
  const id=await ctx.db.insert('analyticsAccounts',values);return (await ctx.db.get(id))!;
}
export const preference=query({args:{},returns:v.boolean(),handler:async ctx=>{
  const userId=await getAuthUserId(ctx);if(!userId||!await accountIsActive(ctx,userId))throw new Error('Sign in to change account privacy.');
  return (await byUser(ctx,userId))?.enabled??true;
}});
export const setPreference=mutation({args:{enabled:v.boolean(),anonymousId:v.string()},returns:v.null(),handler:async(ctx,args)=>{
  if(!uuid(args.anonymousId))throw new Error('Invalid anonymous ID.');
  const userId=await getAuthUserId(ctx);if(userId&&!await accountIsActive(ctx,userId))throw new Error('Account is not available.');
  if(userId){const state=await account(ctx,userId);await ctx.db.patch(state._id,{enabled:args.enabled});}
  const old=await ctx.db.query('analyticsAnonymous').withIndex('by_anonymous',q=>q.eq('anonymousId',args.anonymousId)).unique();
  // A browser ID previously used by another signed-in account cannot change its preference.
  if(old?.userId&&old.userId!==userId)return null;
  if(old)await ctx.db.patch(old._id,{enabled:args.enabled,...(userId?{userId}:{})});
  else await ctx.db.insert('analyticsAnonymous',{anonymousId:args.anonymousId,...(userId?{userId}:{}),enabled:args.enabled,windowAt:Date.now(),windowCount:0});
  return null;
}});
async function queue(ctx:MutationCtx,userId:Id<'users'>|null,anonymousId:string|undefined,event:string,properties:Record<string,unknown>){
  const safe=safeProperties(event,properties);
  if(userId&&!await accountIsActive(ctx,userId))return;
  const accountState=userId?await account(ctx,userId):null;
  let state:Doc<'analyticsAccounts'>|Doc<'analyticsAnonymous'>|null=accountState;
  let anonymous:Doc<'analyticsAnonymous'>|null=null;
  if(anonymousId){
    if(!uuid(anonymousId))throw new Error('Invalid anonymous ID.');
    anonymous=await ctx.db.query('analyticsAnonymous').withIndex('by_anonymous',q=>q.eq('anonymousId',anonymousId)).unique();
    if(anonymous?.userId&&anonymous.userId!==userId)return;
    if(!anonymous){const values={anonymousId,enabled:true,windowAt:Date.now(),windowCount:0};const id=await ctx.db.insert('analyticsAnonymous',values);anonymous=await ctx.db.get(id);}
    if(!anonymous)return;
    if(userId&&!anonymous.userId)await ctx.db.patch(anonymous._id,{userId});
    if(!state)state=anonymous;
  }
  if(!state?.enabled||(!accountState&&anonymous?.enabled===false))return;
  const now=Date.now(),windowCount=now-state.windowAt>=60_000?0:state.windowCount;
  if(windowCount>=60)return;
  await ctx.db.patch(state._id,{windowAt:windowCount?state.windowAt:now,windowCount:windowCount+1});
  await ctx.scheduler.runAfter(0,internal.analytics.deliver,{userId,anonymousId:anonymousId??null,distinctId:accountState?.distinctId??anonymousId!,event,properties:safe,insertId:crypto.randomUUID(),time:Math.floor(now/1000)});
}
export const track=mutation({args:{anonymousId:v.string(),event:v.string(),properties:fields},returns:v.null(),handler:async(ctx,args)=>{
  // Saved/deleted account events are generated only by the corresponding server operations.
  if(['update_saved','update_changed','update_deleted','account_deleted'].includes(args.event))throw new Error('Server event only.');
  const userId=await getAuthUserId(ctx);
  if(!userId&&!['landing_viewed','setup_completed','capture_started','capture_failed','clarification_asked','update_confirmed'].includes(args.event))return null;
  let properties=safeProperties(args.event,args.properties);
  if(userId&&args.event==='timeline_opened'){const rows=await ctx.db.query('healthEvents').withIndex('by_caregiver_confirmation',q=>q.eq('caregiverId',userId)).take(51);properties={note_count:countBucket(rows.length)};}
  if(userId&&args.event==='signin_completed'){const saved=await ctx.db.query('healthEvents').withIndex('by_caregiver_confirmation',q=>q.eq('caregiverId',userId)).first();properties={is_returning:!!saved};}
  await queue(ctx,userId,args.anonymousId,args.event,properties);return null;
}});
export const recordEvent=internalMutation({args:{userId:v.id('users'),event:v.string(),properties:fields},returns:v.null(),handler:async(ctx,args)=>{
  let properties=args.properties;
  if(args.event==='update_saved'&&properties.days_since_last_save===undefined){
    const state=await byUser(ctx,args.userId),now=Date.now();
    properties={...properties,days_since_last_save:state?.lastSavedAt?Math.min(36500,Math.max(0,Math.floor((now-state.lastSavedAt)/86400_000))):0};
    if(await accountIsActive(ctx,args.userId)){const own=await account(ctx,args.userId);await ctx.db.patch(own._id,{lastSavedAt:now});}
  }
  await queue(ctx,args.userId,undefined,args.event,properties);return null;
}});
export const allowed=internalQuery({args:{userId:v.union(v.id('users'),v.null()),anonymousId:v.union(v.string(),v.null()),distinctId:v.string()},returns:v.boolean(),handler:async(ctx,args)=>{
  if(args.userId){if(!await accountIsActive(ctx,args.userId))return false;const state=await byUser(ctx,args.userId);if(!state?.enabled||state.distinctId!==args.distinctId)return false;}
  if(args.anonymousId){const state=await ctx.db.query('analyticsAnonymous').withIndex('by_anonymous',q=>q.eq('anonymousId',args.anonymousId!)).unique();if(!state||(!args.userId&&!state.enabled))return false;if(state.userId&&state.userId!==args.userId)return false;}
  return true;
}});
export async function send(endpoint:string,payload:unknown){
  const response=await fetch(`https://api-eu.mixpanel.com/${endpoint}?ip=0&verbose=1`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify([payload]),signal:AbortSignal.timeout(10_000)});
  const result=await response.json();if(!response.ok||!(result===1||result.status===1))throw new Error('Analytics delivery unavailable.');
}
export const deliver=internalAction({args:{userId:v.union(v.id('users'),v.null()),anonymousId:v.union(v.string(),v.null()),distinctId:v.string(),event:v.string(),properties:fields,insertId:v.string(),time:v.number()},returns:v.null(),handler:async(ctx,args)=>{
  const token=process.env.MIXPANEL_TOKEN;if(!token)return null;
  if(!await ctx.runQuery(internal.analytics.allowed,{userId:args.userId,anonymousId:args.anonymousId,distinctId:args.distinctId}))return null;
  const properties=safeProperties(args.event,args.properties);
  try{await send('track',{event:args.event,properties:{...properties,token,distinct_id:args.distinctId,...(args.userId?{$user_id:args.distinctId}:{}),...(args.anonymousId?{$device_id:args.anonymousId}:{}),$insert_id:args.insertId,time:args.time,ip:0}});}catch{/* Analytics never blocks a health flow. No provider payload is logged. */}
  return null;
}});
export const removeProfile=internalAction({args:{id:v.id('analyticsCleanup')},returns:v.null(),handler:async(ctx,{id})=>{
  const job=await ctx.runQuery(internal.analytics.cleanupJob,{id});if(!job)return null;
  const token=process.env.MIXPANEL_TOKEN;
  try{
    if(!token)throw new Error('Not configured.');
    if(job.reportDeletion){try{await send('track',{event:'account_deleted',properties:{token,distinct_id:job.distinctId,$user_id:job.distinctId,$insert_id:job.distinctId+'-deleted',time:Math.floor(job.createdAt/1000),ip:0}});}catch{/* A lost usage event must never prevent deleting the profile. */}}
    await send('engage',{$token:token,$distinct_id:job.distinctId,$delete:null,$ignore_alias:false,$ip:0});
    await ctx.runMutation(internal.analytics.completeCleanup,{id});
  }catch{/* Durable job stays for the hourly retry, without retaining account or health data. */}
  return null;
}});
export const cleanupJob=internalQuery({args:{id:v.id('analyticsCleanup')},returns:v.union(v.null(),v.object({distinctId:v.string(),reportDeletion:v.boolean(),createdAt:v.number()})),handler:async(ctx,{id})=>{const row=await ctx.db.get(id);return row?{distinctId:row.distinctId,reportDeletion:row.reportDeletion,createdAt:row.createdAt}:null;}});
export const completeCleanup=internalMutation({args:{id:v.id('analyticsCleanup')},returns:v.null(),handler:async(ctx,{id})=>{if(await ctx.db.get(id))await ctx.db.delete(id);return null;}});
export const retryCleanup=internalMutation({args:{},returns:v.null(),handler:async ctx=>{for(const job of await ctx.db.query('analyticsCleanup').withIndex('by_created').take(20))await ctx.scheduler.runAfter(0,internal.analytics.removeProfile,{id:job._id});return null;}});
export const expireAnonymous=internalMutation({args:{},returns:v.null(),handler:async ctx=>{
  const rows=await ctx.db.query('analyticsAnonymous').withIndex('by_window',q=>q.lt('windowAt',Date.now()-90*86400_000)).take(100);
  for(const row of rows)await ctx.db.delete(row._id);
  if(rows.length===100)await ctx.scheduler.runAfter(0,internal.analytics.expireAnonymous,{});
  return null;
}});

import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {stripTypeScriptTypes} from 'node:module';
import {getFunctionName} from 'convex/server';
const data=s=>`data:text/javascript;base64,${Buffer.from(s).toString('base64')}`;
const read=name=>stripTypeScriptTypes(readFileSync(new URL(`../convex/${name}`,import.meta.url),'utf8'));
const server=data(read('_generated/server.js').replace('"convex/server"',JSON.stringify(import.meta.resolve('convex/server'))));
const api=data(read('_generated/api.js').replace('"convex/server"',JSON.stringify(import.meta.resolve('convex/server'))));
const source=read('accountDeletion.ts').replace("'./_generated/server'",JSON.stringify(server)).replace("'./_generated/api'",JSON.stringify(api));
const replacements=s=>s.replace(/'(@convex-dev\/auth\/server|@oslojs\/crypto\/random|@oslojs\/crypto\/sha2|convex\/values)'/g,(_,name)=>JSON.stringify(import.meta.resolve(name)));
const functions=await import(data(replacements(source)));
const access=await import(data(replacements(read('lib/accountAccess.ts'))));
function fixture(count=126,user='users:owner'){
  const rows=[{_id:'users:owner',email:'owner@example.invalid'},{_id:'users:other',email:'other@example.invalid'},
    {_id:'families:1',caregiverId:'users:owner'},{_id:'people:1',familyId:'families:1'},{_id:'healthRecords:1',personId:'people:1'},{_id:'healthTimelines:1',recordId:'healthRecords:1'},
    ...Array.from({length:count},(_,i)=>({_id:`healthEvents:${i}`,caregiverId:'users:owner',timelineId:'healthTimelines:1',details:{originalText:'A fictional health note.'}})),
    {_id:'families:other',caregiverId:'users:other'},{_id:'people:other',familyId:'families:other'},{_id:'healthRecords:other',personId:'people:other'},{_id:'healthTimelines:other',recordId:'healthRecords:other'},
    {_id:'authAccounts:other',userId:'users:other',provider:'email-otp',providerAccountId:'other@example.invalid'},{_id:'authVerificationCodes:other',accountId:'authAccounts:other'},{_id:'authRateLimits:other',identifier:'other@example.invalid'},
    {_id:'loginEmailUsage:other',emailHash:functions.digest('other@example.invalid')},
    {_id:'healthEvents:other',caregiverId:'users:other',timelineId:'healthTimelines:other',details:{originalText:'Another fictional note.'}},
    {_id:'authSessions:1',userId:'users:owner'},{_id:'authSessions:other',userId:'users:other'},
    ...Array.from({length:25},(_,i)=>({_id:`authRefreshTokens:${i}`,sessionId:'authSessions:1'})),{_id:'authRefreshTokens:other',sessionId:'authSessions:other'},
    {_id:'authVerifiers:1',sessionId:'authSessions:1'},
    {_id:'authAccounts:1',userId:'users:owner',provider:'email-otp',providerAccountId:'owner@example.invalid'},
    ...Array.from({length:25},(_,i)=>({_id:`authVerificationCodes:${i}`,accountId:'authAccounts:1'})),
    {_id:'authRateLimits:1',identifier:'owner@example.invalid'},
    {_id:'loginEmailUsage:1',emailHash:functions.digest('owner@example.invalid')},
    {_id:'interpretationUsage:global',requestedAt:123},{_id:'transcriptionUsage:global',count:5,hour:123}];
  let next=1000;const scheduled=[];
  const db={get:async id=>rows.find(row=>row._id===id)??null,
    insert:async(table,fields)=>{const id=`${table}:${next++}`;rows.push({_id:id,...structuredClone(fields)});return id;},
    patch:async(id,fields)=>Object.assign(rows.find(row=>row._id===id),structuredClone(fields)),
    replace:async(id,fields)=>{rows.splice(rows.findIndex(row=>row._id===id),1,{_id:id,...structuredClone(fields)});},
    delete:async id=>{const index=rows.findIndex(row=>row._id===id);if(index>=0)rows.splice(index,1);},
    query:table=>{const predicates=[];const selected=()=>rows.filter(row=>row._id.startsWith(table+':')&&predicates.every(fn=>fn(row)));const query={withIndex:(_name,fn)=>{const range={eq:(key,value)=>{predicates.push(row=>row[key]===value);return range;}};fn(range);return query;},unique:async()=>{assert.ok(selected().length<=1);return selected()[0]??null;},first:async()=>selected()[0]??null,take:async n=>selected().slice(0,n)};return query;}};
  const ctx={db,auth:{getUserIdentity:async()=>user?{subject:user+'|session'}:null},scheduler:{runAfter:async(delay,ref,args)=>scheduled.push({delay,ref:getFunctionName(ref),args})},
    runQuery:async(ref,args)=>functions[getFunctionName(ref).split(':')[1]]._handler(ctx,args),
    runMutation:async(ref,args)=>getFunctionName(ref)==='login:reserveEmail'?true:functions[getFunctionName(ref).split(':')[1]]._handler(ctx,args),
    runAction:async(ref,args)=>functions[getFunctionName(ref).split(':')[1]]._handler(ctx,args)};
  const challenge={userId:'users:owner',challengeId:'a'.repeat(32),codeHash:functions.digest(`${'a'.repeat(32)}:012345`),emailHash:functions.digest('owner@example.invalid')};
  return{ctx,rows,scheduled,challenge,code:'012345'};
}

test('fresh deletion code is account-bound; invalid, expired and replayed challenges cannot delete notes',async()=>{
  const f=fixture();await functions.saveChallenge._handler(f.ctx,f.challenge);
  assert.equal(await functions.begin._handler(f.ctx,{userId:'users:other',challengeId:f.challenge.challengeId,code:f.code}),'expired');
  assert.equal(await functions.begin._handler(f.ctx,{userId:'users:owner',challengeId:'b'.repeat(32),code:f.code}),'invalid');
  assert.equal(await functions.begin._handler(f.ctx,{userId:'users:owner',challengeId:f.challenge.challengeId,code:'123456'}),'invalid');
  assert.equal(f.rows.filter(row=>row._id.startsWith('healthEvents:')).length,127);
  const state=f.rows.find(row=>row._id.startsWith('accountDeletions:'));state.expiresAt=Date.now()-1;
  assert.equal(await functions.begin._handler(f.ctx,{userId:'users:owner',challengeId:f.challenge.challengeId,code:f.code}),'expired');
  await functions.saveChallenge._handler(f.ctx,{...f.challenge,challengeId:'b'.repeat(32),codeHash:functions.digest(`${'b'.repeat(32)}:987654`)});
  assert.equal(await functions.begin._handler(f.ctx,{userId:'users:owner',challengeId:f.challenge.challengeId,code:f.code}),'invalid');assert.equal(f.scheduled.length,0);
});

test('five incorrect codes are enforced in the server and resending does not reset attempts',async()=>{
  const f=fixture();await functions.saveChallenge._handler(f.ctx,f.challenge);
  for(let i=0;i<5;i++)await assert.rejects(functions.confirm._handler(f.ctx,{challengeId:f.challenge.challengeId,code:'000000'}),/not correct/);
  await assert.rejects(functions.confirm._handler(f.ctx,{challengeId:f.challenge.challengeId,code:f.code}),/hour/);
  await assert.rejects(functions.saveChallenge._handler(f.ctx,f.challenge),/hour/);assert.equal(f.rows.filter(row=>row._id.startsWith('healthEvents:')).length,127);
});

test('verified deletion locks writes immediately, deletes every owned row in batches and preserves other accounts and shared usage',async()=>{
  const f=fixture(),protectedRows=structuredClone(f.rows.filter(row=>row._id.includes('other')||row._id.includes('global')));
  await functions.saveChallenge._handler(f.ctx,f.challenge);assert.equal(await access.getActiveUserId(f.ctx),'users:owner');
  assert.equal(await functions.begin._handler(f.ctx,{userId:'users:owner',challengeId:f.challenge.challengeId,code:f.code}),'started');
  assert.equal(await access.getActiveUserId(f.ctx),null);assert.equal(await functions.status._handler(f.ctx,{}),'deleting');assert.equal(f.scheduled[0].ref,'accountDeletion:finish');
  assert.equal(await functions.purge._handler(f.ctx,{userId:'users:owner'}),false);assert.equal(f.rows.filter(row=>row.caregiverId==='users:owner'&&row._id.startsWith('healthEvents:')).length,106);
  await functions.confirm._handler(f.ctx,{challengeId:f.challenge.challengeId,code:f.code});
  assert.deepEqual(f.rows,protectedRows);assert.equal(await access.getActiveUserId(f.ctx),null);assert.equal(await functions.status._handler(f.ctx,{}),'deleted');
  await functions.confirm._handler(f.ctx,{challengeId:f.challenge.challengeId,code:f.code});assert.deepEqual(f.rows,protectedRows);
});

test('deletion delivery uses only the signed-in email, stores only a salted hash, and invalidates failed delivery',async()=>{
  const f=fixture(1),originalFetch=globalThis.fetch,key=process.env.AUTH_RESEND_KEY,from=process.env.AUTH_EMAIL_FROM;process.env.AUTH_RESEND_KEY='fictional-provider-key';process.env.AUTH_EMAIL_FROM='CareNama <fictional@example.invalid>';
  try{
    let message;globalThis.fetch=async(_url,options)=>{message=JSON.parse(options.body);return{ok:true};};
    const result=await functions.requestCode._handler(f.ctx,{});assert.deepEqual(message.to,['owner@example.invalid']);assert.ok(!message.text.includes('fictional health note'));assert.match(message.text,/\b\d{6}\b/);
    const state=f.rows.find(row=>row._id.startsWith('accountDeletions:')),code=message.text.match(/code is (\d{6})/)[1];assert.notEqual(state.codeHash,code);assert.equal(state.codeHash,functions.digest(`${result.challengeId}:${code}`));
    globalThis.fetch=async()=>({ok:false});await assert.rejects(functions.requestCode._handler(f.ctx,{}),/could not send/);assert.equal(f.rows.find(row=>row._id.startsWith('accountDeletions:')).codeHash,'');
    f.ctx.runMutation=async(ref,args)=>getFunctionName(ref)==='login:reserveEmail'?false:functions[getFunctionName(ref).split(':')[1]]._handler(f.ctx,args);
    await assert.rejects(functions.requestCode._handler(f.ctx,{}),/wait a minute/);
    const anonymous=fixture(1,null);await assert.rejects(functions.requestCode._handler(anonymous.ctx,{}),/Sign in/);await assert.rejects(functions.confirm._handler(anonymous.ctx,{challengeId:'',code:''}),/Sign in/);
  }finally{globalThis.fetch=originalFetch;if(key===undefined)delete process.env.AUTH_RESEND_KEY;else process.env.AUTH_RESEND_KEY=key;if(from===undefined)delete process.env.AUTH_EMAIL_FROM;else process.env.AUTH_EMAIL_FROM=from;}
});

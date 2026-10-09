import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {stripTypeScriptTypes} from 'node:module';
import {getFunctionName} from 'convex/server';
const data=s=>`data:text/javascript;base64,${Buffer.from(s).toString('base64')}`;
const read=name=>stripTypeScriptTypes(readFileSync(new URL(`../convex/${name}`,import.meta.url),'utf8'));
const server=data(read('_generated/server.js').replace('"convex/server"',JSON.stringify(import.meta.resolve('convex/server'))));
const api=data(read('_generated/api.js').replace('"convex/server"',JSON.stringify(import.meta.resolve('convex/server'))));
const access=data(read('lib/accountAccess.ts').replace("'@convex-dev/auth/server'",JSON.stringify(import.meta.resolve('@convex-dev/auth/server'))));
const lib=data(read('lib/analytics.ts'));
const {safeProperties,eventRules}=await import(lib);
const source=read('analytics.ts').replace("'./_generated/server'",JSON.stringify(server)).replace("'./_generated/api'",JSON.stringify(api)).replace("'./lib/accountAccess'",JSON.stringify(access)).replace("'./lib/analytics'",JSON.stringify(lib)).replace("'@convex-dev/auth/server'",JSON.stringify(import.meta.resolve('@convex-dev/auth/server'))).replace("'convex/values'",JSON.stringify(import.meta.resolve('convex/values')));
const functions=await import(data(source));
const anonymousId='12345678-1234-4234-9234-123456789abc';
function fixture(user='users:owner'){
  const rows=[{_id:'users:owner'},{_id:'users:other'}],scheduled=[];let id=0;
  const db={get:async id=>rows.find(row=>row._id===id)??null,insert:async(table,values)=>{const key=table+':'+(++id);rows.push({_id:key,...structuredClone(values)});return key;},patch:async(id,values)=>Object.assign(rows.find(row=>row._id===id),structuredClone(values)),delete:async id=>{rows.splice(rows.findIndex(row=>row._id===id),1);},query:table=>{const conditions=[];const list=()=>rows.filter(row=>row._id.startsWith(table+':')&&conditions.every(fn=>fn(row)));const chain={withIndex:(_name,fn)=>{const q={eq:(key,value)=>{conditions.push(row=>row[key]===value);return q;},lt:(key,value)=>{conditions.push(row=>row[key]<value);return q;}};fn?.(q);return chain;},unique:async()=>{assert.ok(list().length<=1);return list()[0]??null;},first:async()=>list()[0]??null,take:async n=>list().slice(0,n)};return chain;}};
  const ctx={db,auth:{getUserIdentity:async()=>user?{subject:user+'|session'}:null},scheduler:{runAfter:async(delay,ref,args)=>scheduled.push({delay,ref:getFunctionName(ref),args})},runQuery:async(ref,args)=>functions[getFunctionName(ref).split(':')[1]]._handler(ctx,args),runMutation:async(ref,args)=>functions[getFunctionName(ref).split(':')[1]]._handler(ctx,args)};
  return {ctx,rows,scheduled,setUser:next=>{user=next;}};
}
test('the complete analytics allowlist rejects health text, identifiers and invalid counts',()=>{
  assert.equal(Object.keys(eventRules).length,15);
  assert.deepEqual(safeProperties('capture_started',{method:'voice',is_first:true}),{method:'voice',is_first:true});
  for(const key of ['email','name','symptom','reading','medicine','text','ip','patientId'])assert.throws(()=>safeProperties('landing_viewed',{[key]:'fictional private value'}),/Unsupported/);
  assert.throws(()=>safeProperties('capture_failed',{reason:'a fictional symptom'}),/Invalid/);
  assert.throws(()=>safeProperties('update_confirmed',{fact_count:NaN,was_edited:false}),/Invalid/);
  assert.throws(()=>safeProperties('unknown',{}),/Unsupported/);
  assert.throws(()=>safeProperties('summary_shared',{method:'copy',version:'full'}),/Invalid/);
});
test('opt-out stops queued and future account events; account identity cannot be supplied by the browser',async()=>{
  const f=fixture();await functions.track._handler(f.ctx,{anonymousId,event:'timeline_opened',properties:{note_count:'51+'}});
  const delivery=f.scheduled[0].args;assert.equal(delivery.properties.note_count,'0');assert.notEqual(delivery.distinctId,'users:owner');
  assert.equal(await functions.allowed._handler(f.ctx,delivery),true);
  await functions.setPreference._handler(f.ctx,{anonymousId,enabled:false});
  assert.equal(await functions.preference._handler(f.ctx,{}),false);assert.equal(await functions.allowed._handler(f.ctx,delivery),false);
  await functions.track._handler(f.ctx,{anonymousId,event:'landing_viewed',properties:{}});assert.equal(f.scheduled.length,1);
  f.setUser('users:other');assert.equal(await functions.preference._handler(f.ctx,{}),true);
  await functions.track._handler(f.ctx,{anonymousId,event:'landing_viewed',properties:{}});assert.equal(f.scheduled.length,1);
  await assert.rejects(functions.track._handler(f.ctx,{anonymousId,event:'update_saved',properties:{fact_count:1,days_since_last_save:0}}),/Server event/);
  f.rows.push({_id:'accountDeletions:1',userId:'users:other',deleting:true});await assert.rejects(functions.setPreference._handler(f.ctx,{anonymousId,enabled:true}),/not available/);
});
test('anonymous events merge with a random account ID once and are limited before ingestion',async()=>{
  const f=fixture(null);await functions.track._handler(f.ctx,{anonymousId,event:'landing_viewed',properties:{}});
  assert.equal(f.scheduled[0].args.distinctId,anonymousId);
  f.setUser('users:owner');await functions.track._handler(f.ctx,{anonymousId,event:'signin_completed',properties:{is_returning:false}});
  assert.equal(f.scheduled[1].args.anonymousId,anonymousId);assert.notEqual(f.scheduled[1].args.distinctId,anonymousId);
  assert.equal(await functions.allowed._handler(f.ctx,f.scheduled[0].args),false);
  for(let i=0;i<70;i++)await functions.track._handler(f.ctx,{anonymousId,event:'setup_completed',properties:{}});
  assert.equal(f.scheduled.length,61); // One anonymous event and sixty account events.
  const opted=fixture(null);await functions.setPreference._handler(opted.ctx,{anonymousId,enabled:false});await functions.track._handler(opted.ctx,{anonymousId,event:'landing_viewed',properties:{}});assert.equal(opted.scheduled.length,0);
});
test('EU delivery sends only allowed properties, disables location, and tolerates outages',async()=>{
  const f=fixture(),oldFetch=globalThis.fetch,token=process.env.MIXPANEL_TOKEN;process.env.MIXPANEL_TOKEN='fictional-token';
  try{
    await functions.track._handler(f.ctx,{anonymousId,event:'capture_started',properties:{method:'text',is_first:true}});
    let request;globalThis.fetch=async(url,options)=>{request={url,body:JSON.parse(options.body)};return{ok:true,json:async()=>({status:1})};};
    await functions.deliver._handler(f.ctx,f.scheduled[0].args);assert.match(request.url,/^https:\/\/api-eu\.mixpanel\.com\/track\?ip=0/);
    const properties=request.body[0].properties;assert.equal(properties.$user_id,properties.distinct_id);assert.equal(properties.$device_id,anonymousId);assert.equal(properties.ip,0);assert.ok(!JSON.stringify(request).includes('users:owner'));
    await functions.setPreference._handler(f.ctx,{anonymousId,enabled:false});request=null;await functions.deliver._handler(f.ctx,f.scheduled[0].args);assert.equal(request,null);
    await functions.setPreference._handler(f.ctx,{anonymousId,enabled:true});globalThis.fetch=async()=>{throw new Error('offline');};await functions.deliver._handler(f.ctx,f.scheduled[0].args);
  }finally{globalThis.fetch=oldFetch;if(token===undefined)delete process.env.MIXPANEL_TOKEN;else process.env.MIXPANEL_TOKEN=token;}
});
test('profile cleanup survives outages and suppresses account-deleted events after opt-out',async()=>{
  const f=fixture(),oldFetch=globalThis.fetch,token=process.env.MIXPANEL_TOKEN;process.env.MIXPANEL_TOKEN='fictional-token';
  const id=await f.ctx.db.insert('analyticsCleanup',{distinctId:anonymousId,reportDeletion:false,createdAt:Date.now()});
  try{
    globalThis.fetch=async()=>{throw new Error('offline');};await functions.removeProfile._handler(f.ctx,{id});assert.ok(await f.ctx.db.get(id));
    await functions.retryCleanup._handler(f.ctx,{});assert.equal(f.scheduled[0].ref,'analytics:removeProfile');
    const requests=[];globalThis.fetch=async(url,options)=>{requests.push({url,body:JSON.parse(options.body)});return{ok:true,json:async()=>({status:1})};};
    await functions.removeProfile._handler(f.ctx,{id});assert.equal(await f.ctx.db.get(id),null);assert.equal(requests.length,1);assert.match(requests[0].url,/api-eu.*engage/);assert.equal(requests[0].body[0].$delete,null);assert.equal(requests[0].body[0].$ip,0);
    await functions.removeProfile._handler(f.ctx,{id});assert.equal(requests.length,1);
    const next=await f.ctx.db.insert('analyticsCleanup',{distinctId:anonymousId,reportDeletion:true,createdAt:Date.now()});await functions.removeProfile._handler(f.ctx,{id:next});assert.equal(requests[1].body[0].event,'account_deleted');assert.match(requests[2].url,/engage/);
  }finally{globalThis.fetch=oldFetch;if(token===undefined)delete process.env.MIXPANEL_TOKEN;else process.env.MIXPANEL_TOKEN=token;}
});
test('a failed deletion usage event does not block deleting the Mixpanel profile',async()=>{
  const f=fixture(),oldFetch=globalThis.fetch,token=process.env.MIXPANEL_TOKEN;process.env.MIXPANEL_TOKEN='fictional-token';
  const id=await f.ctx.db.insert('analyticsCleanup',{distinctId:anonymousId,reportDeletion:true,createdAt:Date.now()-7*86400_000});let profiles=0;
  try{globalThis.fetch=async url=>{if(url.includes('/track'))throw new Error('old event');profiles++;return{ok:true,json:async()=>({status:1})};};await functions.removeProfile._handler(f.ctx,{id});assert.equal(profiles,1);assert.equal(await f.ctx.db.get(id),null);}
  finally{globalThis.fetch=oldFetch;if(token===undefined)delete process.env.MIXPANEL_TOKEN;else process.env.MIXPANEL_TOKEN=token;}
});
test('duplicate sign-in notifications keep privacy setup pending until anonymous opt-out reaches the account',async()=>{
  const previous=globalThis.localStorage,values=new Map([['carenama.analytics','off'],['carenama.analytics-scope','browser']]);globalThis.localStorage={getItem:key=>values.get(key)??null,setItem:(key,value)=>values.set(key,value)};
  try{
    const idModule=data(readFileSync(new URL('../src/record-id.js',import.meta.url),'utf8'));
    const client=await import(data(readFileSync(new URL('../src/analytics.js',import.meta.url),'utf8').replace("'./record-id.js'",JSON.stringify(idModule))));
    let resolvePreference,applied=false;const response=new Promise(resolve=>{resolvePreference=resolve;});
    const session={isAuthenticated:true,getAnalyticsPreference:()=>response,setAnalyticsPreference:async args=>{assert.equal(args.enabled,false);applied=true;}};
    client.configureAnalytics(session);const first=client.analyticsReady();client.configureAnalytics({...session});assert.equal(client.analyticsReady(),first);assert.equal(applied,false);
    resolvePreference(true);await client.analyticsReady();assert.equal(applied,true);assert.equal(client.analyticsEnabled(),false);assert.equal(values.get('carenama.analytics-scope'),'account');
  }finally{if(previous===undefined)delete globalThis.localStorage;else globalThis.localStorage=previous;}
});

import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {stripTypeScriptTypes} from 'node:module';
import {getFunctionName} from 'convex/server';
const data=s=>`data:text/javascript;base64,${Buffer.from(s).toString('base64')}`;
const read=name=>stripTypeScriptTypes(readFileSync(new URL(`../convex/${name}`,import.meta.url),'utf8'));
const values=JSON.stringify(import.meta.resolve('convex/values'));
const server=data(read('_generated/server.js').replace('"convex/server"',JSON.stringify(import.meta.resolve('convex/server'))));
const api=data(read('_generated/api.js').replace('"convex/server"',JSON.stringify(import.meta.resolve('convex/server'))));
const health=data(read('lib/healthEvent.ts').replace('"convex/values"',values));
const timing=data(read('lib/observationTiming.ts'));
const helper=data(read('lib/summary.ts').replace("'convex/values'",values).replace("'./healthEvent'",JSON.stringify(health)).replace("'./observationTiming'",JSON.stringify(timing)));
const source=read('summaries.ts').replace("'./_generated/server'",JSON.stringify(server)).replace("'./_generated/api'",JSON.stringify(api)).replace("'@convex-dev/auth/server'",JSON.stringify(import.meta.resolve('@convex-dev/auth/server'))).replace("'convex/server'",JSON.stringify(import.meta.resolve('convex/server'))).replace("'convex/values'",values).replace("'./lib/healthEvent'",JSON.stringify(health)).replace("'./lib/summary'",JSON.stringify(helper));
const {sourcePage,unchanged,organize,generate}=await import(data(source));
const {checkPeriod,selectSources,validateGroups}=await import(helper);
const observation=(id,event,date)=>({id,event,when:date||'Unknown',supportingWords:event,evidence:'Patient-reported',polarity:'present',timing:{date,time:null,precision:date?'date':'unknown',resolved:true},confirmed:true,edited:false});
const capture=(observations,capturedAt=Date.parse('2026-10-06T06:00:00Z'))=>({confirmationId:'00000000-0000-4000-8000-000000000001',event:observations.map(o=>o.event).join('; '),when:'Multiple observations',evidence:'Not specified',source:'text',originalText:observations.map(o=>o.event).join('; '),edited:false,aiInterpretation:null,clarifications:[],capturedAt,timeZone:'Asia/Kolkata',observations});
const records=[{id:'healthEvents:1',revision:0,details:capture([observation('1','Mira Example felt tired.','2026-10-01'),{...observation('2','No dizziness.','2026-10-06'),polarity:'absent'},observation('3','Sometime last week.',null)])}];
const patient={_id:'people:1',familyId:'families:1',name:'Mira Example',relationship:'Daughter'};
function context(rows=records,owner='users:owner'){
  const db={get:async id=>id===patient._id?patient:id==='families:1'?{caregiverId:'users:owner'}:rows.find(row=>row.id===id)?{_id:id,caregiverId:'users:owner',revision:rows.find(row=>row.id===id).revision}:null,
    query:table=>{const query={withIndex:()=>query,unique:async()=>table==='healthRecords'?{_id:'record:1'}:{_id:'timeline:1'},paginate:async opts=>{const start=Number(opts.cursor||0);return{page:rows.slice(start,start+50).map(row=>({_id:row.id,revision:row.revision,details:row.details})),isDone:start+50>=rows.length,continueCursor:String(start+50)};}};return query;}};
  let modelCalls=0;
  const ctx={db,auth:{getUserIdentity:async()=>owner?{subject:owner+'|session'}:null},
    runQuery:async(ref,args)=>getFunctionName(ref)==='summaries:sourcePage'?sourcePage._handler(ctx,args):unchanged._handler(ctx,args),
    runAction:async(_ref,args)=>{modelCalls++;return[{title:'Symptoms and observations',keys:args.sources.map(s=>s.key)}];}};
  return{ctx,calls:()=>modelCalls};
}

test('summary period follows occurrence dates rather than capture time and keeps undated and explicit negatives honest',()=>{
  const {dated,undated}=selectSources(records,'2026-10-01','2026-10-01');assert.equal(dated.length,1);assert.equal(dated[0].event,'Mira Example felt tired.');assert.equal(undated.length,0);
  const current=selectSources(records,'2026-10-06','2026-10-06');assert.equal(current.dated[0].polarity,'absent');assert.equal(current.undated.length,1);assert.equal(current.undated[0].date,null);
  for(const [start,end] of [['2026-02-30','2026-10-06'],['2026-10-07','2026-10-06'],['','2026-10-06']])assert.throws(()=>checkPeriod(start,end));
});

test('legacy relative dates resolve against original device day without rewriting records',()=>{
  const details={...capture([]),event:'Fictional patient felt tired.',when:'yesterday',originalText:'Fictional patient felt tired yesterday.',capturedAt:Date.parse('2026-10-05T20:00:00Z')};delete details.observations;
  const sources=selectSources([{id:'healthEvents:2',revision:0,details}],'2026-10-05','2026-10-05');assert.equal(sources.dated.length,1);assert.equal(details.when,'yesterday');
});

test('summary groups cannot invent prose, references, duplicates or silently drop facts',()=>{
  const {dated}=selectSources(records,'2026-10-01','2026-10-06');
  assert.equal(validateGroups({groups:[{title:'Symptoms and observations',keys:['1','2']}]},dated).length,1);
  const normalized=validateGroups({groups:[{title:'Symptoms and observations',keys:['1','2']}]},[{key:'1',evidence:'Measured',event:'BP 142/88'},{key:'2',evidence:'Measured',event:'Medicine changed from 10 mg to 5 mg'}]);assert.equal(normalized[0].title,'Measurements');assert.equal(normalized[1].title,'Care and visits');
  for(const groups of [[{title:'Diagnosis',keys:['1','2']}],[{title:'Symptoms and observations',keys:['1']}],[{title:'Symptoms and observations',keys:['1','1']}],[{title:'Measurements',keys:['1','3']}]])assert.throws(()=>validateGroups({groups},dated));
});

test('only authenticated owner can prepare summary and empty or oversized periods make no model call',async()=>{
  const anon=context(records,null);await assert.rejects(generate._handler(anon.ctx,{patientId:patient._id,start:'2026-10-01',end:'2026-10-06'}),/Sign in/);assert.equal(anon.calls(),0);
  const foreign=context(records,'users:other');await assert.rejects(generate._handler(foreign.ctx,{patientId:patient._id,start:'2026-10-01',end:'2026-10-06'}),/not available/);assert.equal(foreign.calls(),0);
  const empty=context();const result=await generate._handler(empty.ctx,{patientId:patient._id,start:'2026-09-01',end:'2026-09-30'});assert.equal(result.status,'empty');assert.equal(empty.calls(),0);
  const many=context(Array.from({length:41},(_,i)=>({id:`healthEvents:${i}`,revision:0,details:capture([observation('1','Tired.','2026-10-01')])})));assert.equal((await generate._handler(many.ctx,{patientId:patient._id,start:'2026-10-01',end:'2026-10-01'})).status,'too_many');assert.equal(many.calls(),0);
});

test('summary uses every selected current fact and refuses source deletion or correction during generation',async()=>{
  const c=context();const result=await generate._handler(c.ctx,{patientId:patient._id,start:'2026-10-01',end:'2026-10-06'});assert.equal(result.status,'ready');assert.equal(result.sources.length,2);assert.equal(result.recordCount,1);assert.equal(result.undatedCount,1);assert.equal(c.calls(),1);
  assert.equal(await unchanged._handler(c.ctx,{caregiverId:'users:other',sources:result.sources}),false);
  const changed=context();changed.ctx.runAction=async()=>{records[0].revision++;return[{title:'Symptoms and observations',keys:['1','2']}];};
  try{await assert.rejects(generate._handler(changed.ctx,{patientId:patient._id,start:'2026-10-01',end:'2026-10-06'}),/Busy/);}finally{records[0].revision--;}
});

test('registered summary action uses bounded Sarvam JSON, shared allowance, and validates response before returning',async()=>{
  const previousFetch=globalThis.fetch,previousKey=process.env.SARVAM_API_KEY;process.env.SARVAM_API_KEY='test-placeholder';
  const sources=selectSources(records,'2026-10-01','2026-10-06').dated.map(({key,event,when,evidence,polarity,date})=>({key,event,when,evidence,polarity,date}));
  let requests=0;globalThis.fetch=async(_url,options)=>{requests++;const body=JSON.parse(options.body);assert.equal(body.model,'sarvam-105b');assert.equal(body.max_tokens,500);assert.equal(body.reasoning_effort,null);assert.ok(!options.body.includes('Sometime last week'));return{ok:true,json:async()=>({choices:[{finish_reason:'stop',message:{content:JSON.stringify({groups:[{title:'Symptoms and observations',keys:['1','2']}]})}}]})};};
  try{await assert.rejects(organize._handler({runMutation:async()=>false},{sources}),/Busy/);assert.equal(requests,0);assert.equal((await organize._handler({runMutation:async()=>true},{sources})).length,1);}
  finally{globalThis.fetch=previousFetch;if(previousKey===undefined)delete process.env.SARVAM_API_KEY;else process.env.SARVAM_API_KEY=previousKey;}
});


test('voice, text interpretation and summary reservations share the 100-call allowance, including legacy voice attempts',async()=>{
  const captureSource=read('capture.ts').replace('"./_generated/server"',JSON.stringify(server)).replace('"convex/values"',values);
  const {reserveTranscription,reserveInterpretation}=await import(data(captureSource));
  const attempts=[],legacy=[];
  const ctx={db:{query:table=>{let minimum=0;const q={withIndex:(_index,fn)=>{fn({gte:(_field,value)=>{minimum=value;}});return q;},take:async count=>(table==='interpretationUsage'?attempts.filter(row=>row.requestedAt>=minimum):legacy.filter(row=>row.hour>=minimum)).slice(0,count)};return q;},insert:async(_table,row)=>attempts.push(row)}};
  assert.equal(await reserveTranscription._handler(ctx,{}),true);for(let i=0;i<99;i++)assert.equal(await reserveInterpretation._handler(ctx,{}),true);
  assert.equal(await reserveTranscription._handler(ctx,{}),false);assert.equal(await reserveInterpretation._handler(ctx,{}),false);assert.equal(attempts.length,100);
  attempts.splice(0,100);legacy.push({hour:Math.floor(Date.now()/3600000),count:100});assert.equal(await reserveInterpretation._handler(ctx,{}),false);
});

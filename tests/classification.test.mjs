import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {stripTypeScriptTypes} from 'node:module';
const data=source=>`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`;
const read=name=>stripTypeScriptTypes(readFileSync(new URL(`../convex/${name}`,import.meta.url),'utf8'));
const values=JSON.stringify(import.meta.resolve('convex/values'));
const health=data(read('lib/healthEvent.ts').replace('"convex/values"',values));
const server=data(read('_generated/server.js').replace('"convex/server"',JSON.stringify(import.meta.resolve('convex/server'))));
const api=data(read('_generated/api.js').replace('"convex/server"',JSON.stringify(import.meta.resolve('convex/server'))));
const source=read('classification.ts').replace("'./_generated/server'",JSON.stringify(server)).replace("'./_generated/api'",JSON.stringify(api)).replace("'convex/values'",values).replace("'./lib/healthEvent'",JSON.stringify(health));
const {classifyMetadata,labelsForSave}=await import(health);
const {applyLabels,pendingFacts,migrateBatch,retry,labelUpdate}=await import(data(source));
const fact={id:'1',event:'No dizziness today',type:'symptom',symptomName:'dizziness',polarity:'absent',timing:{date:'2026-10-08',time:null,precision:'date',resolved:true}};
function fixture(details={observations:[{...fact,type:'pending'}]}){
  const row={_id:'healthEvents:1',details,revision:3,updatedAt:123,originalDetails:{originalText:'Unchanged first snapshot'},confirmedAt:456};
  const scheduled=[];
  return {row,scheduled,ctx:{db:{get:async()=>row,patch:async(_id,fields)=>Object.assign(row,structuredClone(fields)),query:()=>({withIndex:()=>({take:async()=>row.classificationVersion?[]:[row]})})},scheduler:{runAfter:async(delay,_fn,args)=>scheduled.push({delay,args})}}};
}
test('invalid labels and invented names/readings fall back without adding clinical facts',()=>{
  assert.deepEqual(classifyMetadata({type:'diagnosis'},'No dizziness'),{type:'other'});
  assert.deepEqual(classifyMetadata({type:'symptom',symptomName:'stroke'},'No dizziness'),{type:'other'});
  assert.deepEqual(classifyMetadata({type:'symptom',symptomName:'dizziness'},'chakkar aana'),{type:'symptom',symptomName:'dizziness'});
  assert.deepEqual(classifyMetadata({type:'symptom',symptomName:'swelling'},'noticed swelling'),{type:'symptom',symptomName:'swelling'});
  const reading={type:'measurement',measurement:{kind:'blood_pressure',value:'142/88',unit:''}};
  assert.deepEqual(classifyMetadata(reading,'BP 142/88'),reading);
  assert.deepEqual(classifyMetadata({...reading,measurement:{...reading.measurement,unit:'mmHg'}},'BP 142/88'),{type:'other'});
  assert.deepEqual(classifyMetadata(reading,'Doctor reduced medicine to 5 mg'),{type:'other'});
});

test('new heartburn labels are checked in context while unchanged saved labels are preserved',()=>{
  const words='Heartburn after lunch today.';
  assert.deepEqual(classifyMetadata({type:'symptom',symptomName:'heartburn'},words),{type:'symptom',symptomName:'heartburn'});
  assert.deepEqual(classifyMetadata({type:'symptom',symptomName:'GERD'},words),{type:'other'});
  assert.deepEqual(classifyMetadata({type:'daily_wellbeing'},words),{type:'other'});
  const before={event:words,type:'daily_wellbeing',edited:false};
  assert.equal(labelsForSave({...before,edited:true},before).type,'daily_wellbeing');
});
test('changing timing keeps a label; changing words clears stale labels even if a client claims otherwise',()=>{
  assert.equal(labelsForSave({...fact,edited:true},fact).type,'symptom');
  const changed=labelsForSave({...fact,event:'Appetite improved',edited:false},fact);
  assert.equal(changed.type,'pending');assert.equal(changed.symptomName,undefined);
});
test('migration adds metadata only to live and legacy notes and is safe to repeat',async()=>{
  for(const details of [{event:'No dizziness',originalText:'No dizziness',capturedAt:123,timeZone:'Asia/Kolkata'},{observations:[{...fact,type:undefined}],capturedAt:123,timeZone:'Asia/Kolkata'}]){
    const {ctx,row}=fixture(details),before=structuredClone(row);
    assert.deepEqual(await migrateBatch._handler(ctx,{}),{queued:1,more:false});
    const withoutLabel=structuredClone(row.details);
    if(withoutLabel.observations)delete withoutLabel.observations[0].type;else delete withoutLabel.type;
    const expected=structuredClone(before.details);if(expected.observations)delete expected.observations[0].type;
    assert.deepEqual(withoutLabel,expected);assert.deepEqual(row.originalDetails,before.originalDetails);
    assert.equal(row.revision,3);assert.equal(row.updatedAt,123);assert.equal(row.confirmedAt,456);
    assert.deepEqual(await migrateBatch._handler(ctx,{}),{queued:0,more:false});
  }
});
test('late labelling cannot replace edited words, deleted records, polarity or timing',async()=>{
  const {ctx,row}=fixture(),before=structuredClone(row);
  const labels=[{id:'1',words:fact.event,type:'symptom',symptomName:'dizziness'}];
  assert.equal(await applyLabels._handler(ctx,{id:row._id,labels}),1);
  assert.equal(row.details.observations[0].polarity,'absent');assert.deepEqual(row.details.observations[0].timing,fact.timing);
  assert.deepEqual(row.originalDetails,before.originalDetails);assert.equal(row.revision,3);
  row.details.observations[0]={...fact,event:'No headache',type:'pending'};
  assert.equal(await applyLabels._handler(ctx,{id:row._id,labels}),0);
  assert.equal(await applyLabels._handler({...ctx,db:{get:async()=>null}},{id:row._id,labels}),0);
});
test('retry is bounded and its final fallback cannot change a newer pending fact',async()=>{
  const {ctx,row,scheduled}=fixture(),facts=[{id:'1',words:fact.event}];
  await retry._handler(ctx,{id:row._id,attempt:0,facts});assert.equal(scheduled[0].delay,300000);
  row.details.observations[0].event='No headache';
  await retry._handler(ctx,{id:row._id,attempt:3,facts});assert.equal(row.details.observations[0].type,'pending');
  await retry._handler(ctx,{id:row._id,attempt:3,facts:[{id:'1',words:'No headache'}]});assert.equal(row.details.observations[0].type,'other');
});
test('shared allowance blocks provider calls but retains pending facts and schedules a retry',async()=>{
  const {ctx,row}=fixture();let called=false,retried=false;
  const previous=globalThis.fetch,key=process.env.SARVAM_API_KEY;process.env.SARVAM_API_KEY='fictional-placeholder';
  globalThis.fetch=async()=>{called=true;throw Error('Must not call');};
  try{
    await labelUpdate._handler({...ctx,runQuery:async()=>pendingFacts._handler(ctx,{id:row._id}),runMutation:async(_ref,args)=>{if('attempt'in args){retried=true;return retry._handler(ctx,args);}return false;}},{id:row._id,attempt:0});
    assert.equal(called,false);assert.equal(retried,true);assert.equal(row.details.observations[0].type,'pending');
  }finally{globalThis.fetch=previous;if(key===undefined)delete process.env.SARVAM_API_KEY;else process.env.SARVAM_API_KEY=key;}
});
test('one bounded provider call labels pending facts and preserves their words',async()=>{
  const {ctx,row}=fixture();let calls=0;
  const previous=globalThis.fetch,key=process.env.SARVAM_API_KEY;process.env.SARVAM_API_KEY='fictional-placeholder';
  globalThis.fetch=async(_url,options)=>{
    calls++;const request=JSON.parse(options.body);assert.equal(request.max_tokens,500);assert.equal(request.reasoning_effort,null);
    return {ok:true,json:async()=>({choices:[{finish_reason:'stop',message:{content:JSON.stringify({labels:[{id:'1',type:'symptom',symptomName:'dizziness',measurement:{kind:'',value:'',unit:''}}]})}}]})};
  };
  try{
    await labelUpdate._handler({...ctx,runQuery:async()=>pendingFacts._handler(ctx,{id:row._id}),runMutation:async(_ref,args)=>'labels'in args?applyLabels._handler(ctx,args):true},{id:row._id,attempt:0});
    assert.equal(calls,1);assert.equal(row.details.observations[0].type,'symptom');assert.equal(row.details.observations[0].event,fact.event);assert.equal(row.details.observations[0].polarity,'absent');
  }finally{globalThis.fetch=previous;if(key===undefined)delete process.env.SARVAM_API_KEY;else process.env.SARVAM_API_KEY=key;}
});

import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {stripTypeScriptTypes} from 'node:module';
const data = text => `data:text/javascript;base64,${Buffer.from(text).toString('base64')}`;
const read = name => stripTypeScriptTypes(readFileSync(new URL(`../convex/${name}`,import.meta.url),'utf8'));
const server=data(read('_generated/server.js').replace('"convex/server"',JSON.stringify(import.meta.resolve('convex/server'))));
const api=data(read('_generated/api.js').replace('"convex/server"',JSON.stringify(import.meta.resolve('convex/server'))));
const values=JSON.stringify(import.meta.resolve('convex/values'));
const health=data(read('lib/healthEvent.ts').replace('"convex/values"',values));
let source=read('interpretation.ts').replace('"./_generated/server"',JSON.stringify(server)).replace('"./_generated/api"',JSON.stringify(api)).replace('"convex/values"',values)
  .replace('"./lib/captureValidation"',JSON.stringify(data(read('lib/captureValidation.ts'))))
  .replace('"./lib/formatSpokenTime"',JSON.stringify(data(read('lib/formatSpokenTime.ts'))))
  .replace("'./lib/healthEvent'",JSON.stringify(health)).replace("'./lib/observationTiming'",JSON.stringify(data(read('lib/observationTiming.ts'))));
const {interpretCapture}=await import(data(source));
const args={text:'I noticed a headache today and she did not feel dizzy.',source:'text',patient:{name:'Mira Example',relationship:'Daughter'},timeZone:'Asia/Kolkata',capturedAt:Date.now()};
const items=[{event:'a headache',when:'today',evidence:'Not specified',polarity:'present'},{event:'did not feel dizzy',when:'Not specified',evidence:'Not specified',polarity:'absent'}];
async function run(result,finish='stop',input=args) {
  const previousFetch=globalThis.fetch, previousKey=process.env.SARVAM_API_KEY;
  process.env.SARVAM_API_KEY='test-only-placeholder';
  globalThis.fetch=async(_url,options)=>{
    const body=JSON.parse(options.body);assert.equal(body.max_tokens,500);assert.equal(body.reasoning_effort,null);
    return {ok:true,json:async()=>({choices:[{finish_reason:finish,message:{content:JSON.stringify(result)}}]})};
  };
  try{return await interpretCapture._handler({runMutation:async()=>true},input);}
  finally {globalThis.fetch=previousFetch;if(previousKey===undefined)delete process.env.SARVAM_API_KEY;else process.env.SARVAM_API_KEY=previousKey;}
}
test('server preserves each negative and its own evidence/timing without inventing unmentioned symptoms',async()=>{
  const result=await run({status:'ready',question:'',observations:items});
  assert.equal(result.observations.length,2);assert.equal(result.observations[0].evidence,'Caregiver-observed');
  assert.equal(result.observations[1].polarity,'absent');assert.equal(result.observations[1].timing.resolved,false);
  assert.ok(result.observations.every(o=>!o.confirmed));
});
test('token truncation, missing clauses and invented quotes cannot become an interpretation',async()=>{
  await assert.rejects(run({status:'ready',question:'',observations:items},'length'),/incomplete/);
  await assert.rejects(run({status:'ready',question:'',observations:[items[0]]}),/incomplete-observations/);
  const grounded=await run({status:'ready',question:'',observations:[{...items[0],polarity:'absent'},items[1]]});
  assert.equal(grounded.observations[0].polarity,'present');
  await assert.rejects(run({status:'ready',question:'',observations:[{...items[0],event:'invented fever'},items[1]]}),/ungrounded-output/);
});
test('short model excerpts retain original qualifiers and distinguish absence of reporting from absence of symptoms',async()=>{
  const result=await run({status:'ready',question:'',observations:[{event:'better',when:'today',evidence:'Not specified',polarity:'absent'},{event:'dizziness',when:'Not specified',evidence:'Not specified',polarity:'absent'}]},'stop',{...args,text:'Mira Example seems better today, but she did not report dizziness.'});
  assert.match(result.observations[0].event,/seems better/);assert.equal(result.observations[0].polarity,'uncertain');
  assert.match(result.observations[1].event,/did not report dizziness/);assert.equal(result.observations[1].polarity,'uncertain');
});
test('a model excerpt cannot resolve conflicting dates by silently quoting just one alternative',async()=>{
  const result=await run({status:'ready',question:'',observations:[{event:'a headache',when:'today',evidence:'Not specified',polarity:'present'}]},'stop',{...args,text:'Mira Example had a headache today or yesterday.'});
  assert.equal(result.observations[0].timing.resolved,false); assert.equal(result.observations[0].timing.date,null);
  assert.match(result.observations[0].when,/today or yesterday/);
});
test('a clearly different named patient asks for clarification before any model classification',async()=>{
  const result=await run({status:'rejected',question:'',observations:[]},'stop',{...args,text:'Alex Example felt dizzy today.'});
  assert.equal(result.status,'clarification');assert.match(result.question,/Alex Example.*Mira Example/);assert.deepEqual(result.observations,[]);
});
test('a direct medication-advice request is refused before spending model tokens',async()=>{
  const result=await run({status:'ready',question:'',observations:items},'stop',{...args,text:'Should I double her blood pressure medicine?'});
  assert.equal(result.status,'rejected');assert.deepEqual(result.observations,[]);
});
test('reported speech with pronouns is not mistaken for a different named patient',async()=>{
  const result=await run({status:'ready',question:'',observations:[{event:'felt tired',when:'today',evidence:'Patient-reported',polarity:'present'}]},'stop',{...args,text:'She told me she felt tired today.'});
  assert.equal(result.status,'ready');assert.equal(result.observations[0].evidence,'Patient-reported');
});


test('doctor speech and medication changes retain attribution and dose without becoming advice, another patient or a measured vital',async()=>{
  const text='Doctor said to reduce her medicine from 10 mg to 5 mg today.';
  const result=await run({status:'ready',question:'',observations:[{event:'reduce her medicine from 10 mg to 5 mg',when:'today',evidence:'Measured',polarity:'present'}]},'stop',{...args,text});
  assert.equal(result.status,'ready');assert.equal(result.observations[0].event,text);assert.equal(result.observations[0].evidence,'Not specified');assert.equal(result.observations[0].timing.resolved,true);
});

test('doctor visits and qualitative appetite sleep and energy changes retain their individual words and times',async()=>{
  for(const text of ['We visited the doctor yesterday.','She said her appetite is better today.','I noticed she slept poorly last night.','She said her energy is better today.','She started her medicine today.','She stopped her medicine yesterday.']) {
    const when=text.includes('yesterday')?'yesterday':text.includes('last night')?'last night':'today';
    const result=await run({status:'ready',question:'',observations:[{event:text,when,evidence:'Not specified',polarity:'present'}]},'stop',{...args,text});
    assert.equal(result.status,'ready');assert.equal(result.observations[0].event,text);assert.equal(result.observations[0].when,when);assert.ok(!result.observations[0].confirmed);
    if(text.startsWith('She said'))assert.equal(result.observations[0].evidence,'Patient-reported');
    if(text.startsWith('I noticed'))assert.equal(result.observations[0].evidence,'Caregiver-observed');
  }
});

test('a medication report with missing name or dose stays incomplete in meaning instead of inventing details',async()=>{
  const text='Her medicine was changed yesterday.';
  const result=await run({status:'ready',question:'',observations:[{event:'medicine was changed',when:'yesterday',evidence:'Measured',polarity:'present'}]},'stop',{...args,text});
  assert.equal(result.observations[0].event,text);assert.equal(result.observations[0].evidence,'Not specified');
  await assert.rejects(run({status:'ready',question:'',observations:[{event:'medicine was changed to 5 mg',when:'yesterday',evidence:'Not specified',polarity:'present'}]},'stop',{...args,text}),/ungrounded-output/);
  const bp=await run({status:'ready',question:'',observations:[{event:'BP 142/88',when:'today',evidence:'Measured',polarity:'present'}]},'stop',{...args,text:'BP 142/88 today.'});assert.equal(bp.observations[0].evidence,'Measured');
});

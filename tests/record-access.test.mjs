import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { stripTypeScriptTypes } from 'node:module';
const dataUrl = source => `data:text/javascript;base64,${Buffer.from(source).toString('base64')}`;
const validatorsSource = stripTypeScriptTypes(readFileSync(new URL('../convex/lib/healthEvent.ts', import.meta.url), 'utf8')).replace('"convex/values"', JSON.stringify(import.meta.resolve('convex/values')));
const validatorsUrl = dataUrl(validatorsSource);
const serverSource = readFileSync(new URL('../convex/_generated/server.js', import.meta.url), 'utf8').replace('"convex/server"', JSON.stringify(import.meta.resolve('convex/server')));
const source = stripTypeScriptTypes(readFileSync(new URL('../convex/records.ts', import.meta.url), 'utf8'))
  .replace('"./_generated/server"', JSON.stringify(dataUrl(serverSource)))
  .replace('"@convex-dev/auth/server"', JSON.stringify(import.meta.resolve('@convex-dev/auth/server')))
  .replace('"convex/values"', JSON.stringify(import.meta.resolve('convex/values')))
  .replace('"convex/server"', JSON.stringify(import.meta.resolve('convex/server')))
  .replace('"./lib/healthEvent"', JSON.stringify(validatorsUrl));
const { firstRecord, saveFirstRecord, saveCapture, timelinePage, addUpdate, correctUpdate, deleteUpdate } = await import(dataUrl(source));
const { validateConfirmedEvent } = await import(validatorsUrl);
const event = { confirmationId: '00000000-0000-4000-8000-000000000001', event: 'Mira Example reported tiredness.', when: 'Today', evidence: 'Patient-reported', source: 'text', originalText: 'Mira Example said she felt tired today.', edited: true, aiInterpretation: null, clarifications: [], capturedAt: Date.now(), timeZone: 'Asia/Kolkata' };
function database() {
  const tables = new Map(); let next = 1;
  return {
    insert: async (name, fields) => { const id = `${name}:${next++}`; const rows = tables.get(name) || []; rows.push({ _id: id, _creationTime: next, ...structuredClone(fields) }); tables.set(name, rows); return id; },
    get: async id => [...tables.values()].flat().find(row=>row._id===id) || null,
    patch: async (id,fields) => { const row=[...tables.values()].flat().find(row=>row._id===id); Object.assign(row,structuredClone(fields)); },
    delete: async id => { for(const [name,rows] of tables) tables.set(name,rows.filter(row=>row._id!==id)); },
    query: name => {
      let predicates = [], indexName='', descending=false;
      const rows=()=>{const list=(tables.get(name)||[]).filter(row=>predicates.every(fn=>fn(row)));return list.sort((a,b)=>{const key=indexName==='by_timeline_capture'?'capturedAt':null;const diff=key?a.details[key]-b.details[key]:a._creationTime-b._creationTime;return descending?-diff:diff;});};
      const query = {
        withIndex: (_name, fn) => { indexName=_name; const range = { eq: (key, value) => { predicates.push(row => key.split('.').reduce((item, part) => item[part], row) === value); return range; } }; fn(range); return query; },
        order: direction => {descending=direction==='desc';return query;},
        paginate: async options=>{const start=Number(options.cursor||0),all=rows(),page=all.slice(start,start+options.numItems);return{page,isDone:start+page.length>=all.length,continueCursor:String(start+page.length)};},
        unique: async () => { const rows = (tables.get(name) || []).filter(row => predicates.every(fn => fn(row))); assert.ok(rows.length <= 1); return rows[0] || null; },
        first: async () => rows()[0] || null,
      }; return query;
    },
    count: name => (tables.get(name) || []).length,
  };
}
const ctx = (db, user) => ({ db, auth: { getUserIdentity: async () => user ? { subject: `${user}|session` } : null } });

test('anonymous calls cannot read or save health records', async () => {
  const db = database();
  await assert.rejects(firstRecord._handler(ctx(db, null), {}), /Sign in/);
  await assert.rejects(saveFirstRecord._handler(ctx(db, null), { patient: { name: 'Mira Example', relationship: 'Daughter' }, event }), /Sign in/);
  assert.equal(db.count('healthEvents'), 0);
});
test('saving is owned by the signed-in account and retrying does not duplicate the first event', async () => {
  const db = database(), owner = ctx(db, 'users:owner');
  const input = { patient: { name: 'Mira Example', relationship: 'Daughter' }, event };
  const id = await saveFirstRecord._handler(owner, input);
  assert.equal(await saveFirstRecord._handler(owner, input), id);
  for (const table of ['families', 'people', 'healthRecords', 'healthTimelines', 'healthEvents']) assert.equal(db.count(table), 1);
  assert.deepEqual(await firstRecord._handler(owner, {}), { ...input.patient, event });
  assert.equal(await firstRecord._handler(ctx(db, 'users:other'), {}), null);
  await assert.rejects(saveFirstRecord._handler(owner, { ...input, event: { ...event, confirmationId: '00000000-0000-4000-8000-000000000002' } }), /already has/);
});
test('server rejects empty, oversized or invalid confirmed events', () => {
  for (const invalid of [{ event: '' }, { originalText: 'x'.repeat(5001) }, { capturedAt: Date.now() + 600_000 }, { timeZone: 'invalid-zone' }, { confirmationId: 'bad' }]) {
    assert.throws(() => validateConfirmedEvent({ ...event, ...invalid }));
  }
});

const observation = (id, words, polarity='present') => ({id,event:words,when:'Unknown',supportingWords:words,evidence:'Not specified',polarity,timing:{date:null,time:null,precision:'unknown',resolved:true},confirmed:true,edited:false});
test('a capture saves several individually confirmed observations together, preserves explicit negatives and stays duplicate-safe', async () => {
  const db=database(), owner=ctx(db,'users:owner');
  const originalText='BP 142/88 this morning and she did not feel dizzy.';
  const details={...event,event:originalText,originalText,observations:[observation('1','BP 142/88 this morning'),observation('2','she did not feel dizzy','absent')]};
  const args={patient:{name:'Mira Example',relationship:'Daughter'},event:details};
  const id=await saveCapture._handler(owner,args);
  assert.equal(await saveCapture._handler(owner,args),id);
  assert.equal(db.count('healthEvents'),1);
  assert.deepEqual((await firstRecord._handler(owner,{})).event.observations,details.observations);
  assert.equal(await firstRecord._handler(ctx(db,'users:other'),{}),null);
});
test('new capture API rejects unresolved, unconfirmed, unsupported or invalid observation timing without writing a partial capture', async () => {
  for(const patch of [{confirmed:false},{timing:{date:null,time:null,precision:'unknown',resolved:false}},{supportingWords:'invented symptom'},{timing:{date:'2026-02-30',time:null,precision:'date',resolved:true}},{timing:{date:null,time:'25:00',precision:'exact',resolved:true}}]) {
    const db=database();
    const details={...event,observations:[{...observation('1',event.originalText),...patch}]};
    await assert.rejects(saveCapture._handler(ctx(db,'users:owner'),{patient:{name:'Mira Example',relationship:'Daughter'},event:details}));
    assert.equal(db.count('families'),0); assert.equal(db.count('healthEvents'),0);
  }
  await assert.rejects(saveCapture._handler(ctx(database(),'users:owner'),{patient:{name:'Mira Example',relationship:'Daughter'},event}),/Review each/);
});

test('timeline includes legacy notes and added captures, paginates by captured time and isolates each account',async()=>{
  const db=database(),owner=ctx(db,'users:owner');
  await saveFirstRecord._handler(owner,{patient:{name:'Mira Example',relationship:'Daughter'},event:{...event,capturedAt:event.capturedAt-10000}});
  const initial=await timelinePage._handler(owner,{paginationOpts:{numItems:1,cursor:null}});
  const next={...event,confirmationId:'00000000-0000-4000-8000-000000000002',observations:[observation('1',event.originalText)]};
  const id=await addUpdate._handler(owner,{patientId:initial.patient.id,event:next});
  assert.equal(await addUpdate._handler(owner,{patientId:initial.patient.id,event:next}),id);
  assert.equal(db.count('people'),1);assert.equal(db.count('healthEvents'),2);
  const first=await timelinePage._handler(owner,{paginationOpts:{numItems:1,cursor:null}});
  assert.equal(first.page[0].id,id);assert.equal(first.isDone,false);
  const older=await timelinePage._handler(owner,{paginationOpts:{numItems:1,cursor:first.continueCursor}});
  assert.equal(older.page.length,1);assert.equal(older.isDone,true);assert.equal(older.page[0].details.observations,undefined);
  assert.deepEqual(await timelinePage._handler(ctx(db,'users:other'),{paginationOpts:{numItems:10,cursor:null}}),{patient:null,page:[],isDone:true,continueCursor:''});
  await assert.rejects(timelinePage._handler(ctx(db,null),{paginationOpts:{numItems:10,cursor:null}}),/Sign in/);
  await assert.rejects(timelinePage._handler(owner,{paginationOpts:{numItems:11,cursor:null}}),/up to 10/);
});

test('adding an update cannot target another patient, save unresolved facts or create a second family',async()=>{
  const db=database(),owner=ctx(db,'users:owner');
  await saveFirstRecord._handler(owner,{patient:{name:'Mira Example',relationship:'Daughter'},event});
  const timeline=await timelinePage._handler(owner,{paginationOpts:{numItems:10,cursor:null}});
  const next={...event,confirmationId:'00000000-0000-4000-8000-000000000002',observations:[observation('1',event.originalText)]};
  await assert.rejects(addUpdate._handler(ctx(db,'users:other'),{patientId:timeline.patient.id,event:next}),/not available/);
  await assert.rejects(addUpdate._handler(ctx(db,null),{patientId:timeline.patient.id,event:next}),/Sign in/);
  await assert.rejects(addUpdate._handler(owner,{patientId:'people:missing',event:next}),/not available/);
  await assert.rejects(addUpdate._handler(owner,{patientId:timeline.patient.id,event:{...next,observations:[{...next.observations[0],confirmed:false}]}}),/Review/);
  assert.equal(db.count('families'),1);assert.equal(db.count('healthEvents'),1);
});


test('saved corrections preserve capture evidence, survive read-back, retry safely and reject stale or foreign changes',async()=>{
  const db=database(),owner=ctx(db,'users:owner');
  const original={...event,observations:[observation('1',event.originalText)]};
  const id=await saveCapture._handler(owner,{patient:{name:'Mira Example',relationship:'Daughter'},event:original});
  const corrected={...original,event:'Mira Example reported mild tiredness.',edited:true,observations:[{...original.observations[0],event:'Mild tiredness',edited:true}]};
  const args={id,event:corrected,expectedRevision:0,changeId:'00000000-0000-4000-8000-000000000010'};
  await assert.rejects(correctUpdate._handler(ctx(db,null),args),/Sign in/);
  await assert.rejects(correctUpdate._handler(ctx(db,'users:other'),args),/not available/);
  for(const patch of [{capturedAt:event.capturedAt-1},{originalText:'changed'},{timeZone:'UTC'},{source:'voice'},{confirmationId:'00000000-0000-4000-8000-000000000003'},{aiInterpretation:{status:'ready',event:'Invented',when:'Today',evidence:'Measured',question:'',message:''}},{clarifications:[{question:'Invented',answer:'Yes'}]}]) {
    await assert.rejects(correctUpdate._handler(owner,{...args,event:{...corrected,...patch}}));
  }
  await assert.rejects(correctUpdate._handler(owner,{...args,event:{...corrected,observations:[]}}));
  assert.equal(await correctUpdate._handler(owner,args),1);
  assert.equal(await correctUpdate._handler(owner,args),1);
  const row=await db.get(id);assert.deepEqual(row.originalDetails,original);assert.equal(row.details.capturedAt,original.capturedAt);assert.equal(row.details.originalText,original.originalText);
  const page=await timelinePage._handler(owner,{paginationOpts:{numItems:10,cursor:null}});assert.equal(page.page[0].details.observations[0].event,'Mild tiredness');assert.equal(page.page[0].revision,1);assert.equal(db.count('healthEvents'),1);
  await assert.rejects(correctUpdate._handler(owner,{...args,changeId:'00000000-0000-4000-8000-000000000011'}),/changed elsewhere/);
  await assert.rejects(deleteUpdate._handler(owner,{id,expectedRevision:0}),/changed elsewhere/);
});

test('deletion requires ownership and current revision; retry is safe and removing the last note keeps the patient',async()=>{
  const db=database(),owner=ctx(db,'users:owner');
  const id=await saveFirstRecord._handler(owner,{patient:{name:'Mira Example',relationship:'Daughter'},event});
  const args={id,expectedRevision:0};
  await assert.rejects(deleteUpdate._handler(ctx(db,null),args),/Sign in/);
  await assert.rejects(deleteUpdate._handler(ctx(db,'users:other'),args),/not available/);
  assert.equal(db.count('healthEvents'),1);
  assert.equal(await deleteUpdate._handler(owner,args),null);assert.equal(await deleteUpdate._handler(owner,args),null);
  const page=await timelinePage._handler(owner,{paginationOpts:{numItems:10,cursor:null}});assert.equal(page.page.length,0);assert.equal(page.patient.name,'Mira Example');assert.equal(db.count('people'),1);
  const next={...event,confirmationId:'00000000-0000-4000-8000-000000000002',observations:[observation('1',event.originalText)]};
  await addUpdate._handler(owner,{patientId:page.patient.id,event:next});assert.equal(db.count('people'),1);assert.equal(db.count('healthEvents'),1);
});

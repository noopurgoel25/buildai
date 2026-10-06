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
  .replace('"./lib/healthEvent"', JSON.stringify(validatorsUrl));
const { firstRecord, saveFirstRecord, saveCapture } = await import(dataUrl(source));
const { validateConfirmedEvent } = await import(validatorsUrl);
const event = { confirmationId: '00000000-0000-4000-8000-000000000001', event: 'Mira Example reported tiredness.', when: 'Today', evidence: 'Patient-reported', source: 'text', originalText: 'Mira Example said she felt tired today.', edited: true, aiInterpretation: null, clarifications: [], capturedAt: Date.now(), timeZone: 'Asia/Kolkata' };
function database() {
  const tables = new Map(); let next = 1;
  return {
    insert: async (name, fields) => { const id = `${name}:${next++}`; const rows = tables.get(name) || []; rows.push({ _id: id, ...structuredClone(fields) }); tables.set(name, rows); return id; },
    query: name => {
      let predicates = [];
      const query = {
        withIndex: (_name, fn) => { const range = { eq: (key, value) => { predicates.push(row => key.split('.').reduce((item, part) => item[part], row) === value); return range; } }; fn(range); return query; },
        order: () => query,
        unique: async () => { const rows = (tables.get(name) || []).filter(row => predicates.every(fn => fn(row))); assert.ok(rows.length <= 1); return rows[0] || null; },
        first: async () => (tables.get(name) || []).find(row => predicates.every(fn => fn(row))) || null,
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

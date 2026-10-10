import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const source=readFileSync(new URL('../src/update-corrections.js',import.meta.url),'utf8').replace("import { createRecordId } from './record-id.js';","const createRecordId=()=>crypto.randomUUID();");
const {reconcileCorrections}=await import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`);
const original='Fictional person felt tired yesterday. No dizziness today.';
const previous=[{id:'one',event:'Felt tired.',supportingWords:'felt tired yesterday',edited:true,confirmed:true,type:'symptom',symptomName:'tiredness',evidence:'Patient-reported',polarity:'present',timing:{date:'2026-10-04',time:null,precision:'date',resolved:true}},{id:'two',event:'No dizziness.',supportingWords:'No dizziness today.',type:'symptom',symptomName:'dizziness',polarity:'absent',timing:{date:'2026-10-05',time:null,precision:'date',resolved:true}}];
test('rewriting an update preserves unchanged facts and earlier timing corrections even when returned in a different order',()=>{
 const baseline=structuredClone(previous);
 const next=reconcileCorrections(previous,[{...previous[1],timing:{date:'2026-10-10'}},{...previous[0],id:'model-id',edited:false,timing:{date:'2026-10-09'}}],original);
 assert.deepEqual(next,[previous[1],previous[0]]);assert.deepEqual(previous,baseline);
});
test('changed facts get fresh IDs and pending labels while keeping the immutable original as correction provenance',()=>{
 const next=reconcileCorrections(previous,[{...previous[0],event:'Slept better.',measurement:{kind:'blood_pressure',value:'123/80'},symptomName:'invented',supportingWords:'Slept better.'}],original);
 assert.notEqual(next[0].id,previous[0].id);assert.equal(next[0].edited,true);assert.equal(next[0].confirmed,false);assert.equal(next[0].type,'pending');assert.equal(next[0].supportingWords,original);assert.equal(next[0].measurement,undefined);assert.equal(next[0].symptomName,undefined);
});
test('repeated identical facts cannot reuse a single previous fact ID',()=>{
 const next=reconcileCorrections([previous[0]],[previous[0],previous[0]],original);
 assert.equal(next[0].id,'one');assert.notEqual(next[1].id,'one');
});

import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {stripTypeScriptTypes} from 'node:module';
const source=stripTypeScriptTypes(readFileSync(new URL('../convex/lib/observationTiming.ts',import.meta.url),'utf8'));
const {resolveTiming,timingLabel,validDate}=await import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`);
const capturedAt=Date.parse('2026-10-05T19:00:00Z'); // 00:30 on Oct 6 in Kolkata.
test('relative dates use capture-local day, including midnight and yesterday',()=>{
  assert.equal(resolveTiming('today at 5 p.m.',capturedAt,'Asia/Kolkata').date,'2026-10-06');
  assert.equal(resolveTiming('yesterday morning',capturedAt,'Asia/Kolkata').date,'2026-10-05');
  assert.equal(resolveTiming('today',capturedAt,'America/New_York').date,'2026-10-05');
  assert.equal(resolveTiming('today at 5 p.m.',capturedAt,'Asia/Kolkata').time,'17:00');
});
test('missing dates and ambiguous timing never receive silently guessed dates or clock times',()=>{
  for(const words of ['Not specified','this morning','sometime last week','today or yesterday','today around 5 p.m.']) assert.equal(resolveTiming(words,capturedAt,'Asia/Kolkata').resolved,false);
  assert.equal(resolveTiming('today morning',capturedAt,'Asia/Kolkata').time,null);
  assert.equal(resolveTiming('5 in the evening',capturedAt,'Asia/Kolkata').time,'17:00');
  assert.equal(validDate('2026-02-30'),false);
  assert.equal(validDate('2026-10-06'),true);
  assert.equal(timingLabel('Not specified',{date:null,time:null,precision:'unknown',resolved:true}),'Unknown');
});

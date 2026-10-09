import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {stripTypeScriptTypes} from 'node:module';
const source=stripTypeScriptTypes(readFileSync(new URL('../convex/lib/observationTiming.ts',import.meta.url),'utf8'));
const {resolveTiming,timingLabel,validDate,formatDate,parseDisplayDate}=await import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`);
const capturedAt=Date.parse('2026-10-05T19:00:00Z'); // 00:30 on Oct 6 in Kolkata.
test('relative dates use capture-local day, including midnight and yesterday',()=>{
  assert.equal(resolveTiming('today at 5 p.m.',capturedAt,'Asia/Kolkata').date,'2026-10-06');
  assert.equal(resolveTiming('yesterday morning',capturedAt,'Asia/Kolkata').date,'2026-10-05');
  assert.equal(resolveTiming('today',capturedAt,'America/New_York').date,'2026-10-05');
  assert.equal(resolveTiming('today at 5 p.m.',capturedAt,'Asia/Kolkata').time,'17:00');
});
test('missing dates and ambiguous timing never receive silently guessed dates or clock times',()=>{
  for(const words of ['Not specified','this morning','sometime last week','today or yesterday']) assert.equal(resolveTiming(words,capturedAt,'Asia/Kolkata').resolved,false);
  assert.equal(resolveTiming('today morning',capturedAt,'Asia/Kolkata').time,null);
  assert.equal(resolveTiming('5 in the evening',capturedAt,'Asia/Kolkata').time,'17:00');
  assert.equal(validDate('2026-02-30'),false);
  assert.equal(validDate('2026-10-06'),true);
  assert.equal(timingLabel('Not specified',{date:null,time:null,precision:'unknown',resolved:true}),'Unknown');
});

test('an approximate clock does not erase an explicit capture-local day',()=>{
  for(const words of ['today around 5 p.m.','around 5 today','today morning']) {
    const timing=resolveTiming(words,capturedAt,'Asia/Kolkata');
    assert.equal(timing.date,'2026-10-06');assert.equal(timing.datePrecision,'exact');
    assert.equal(timing.time,null);assert.equal(timing.timePrecision,'approximate');assert.equal(timing.resolved,true);
  }
  assert.equal(resolveTiming('maybe yesterday',capturedAt,'Asia/Kolkata').date,null);
  assert.equal(resolveTiming('today at 5 p.m.',capturedAt,'Asia/Kolkata').timePrecision,'exact');
  const clocks=resolveTiming('today at 5 p.m. or 6 p.m.',capturedAt,'Asia/Kolkata');
  assert.equal(clocks.date,'2026-10-06');assert.equal(clocks.time,null);assert.equal(clocks.timePrecision,'approximate');
  const unknownDay=resolveTiming('not sure which day, at 5 p.m.',capturedAt,'Asia/Kolkata');
  assert.equal(unknownDay.date,null);assert.equal(unknownDay.time,'17:00');assert.equal(unknownDay.datePrecision,'approximate');assert.equal(unknownDay.timePrecision,'exact');assert.equal(unknownDay.resolved,false);
});

test('display dates are DD/MM/YYYY and invalid or incomplete calendar input stays invalid',()=>{
  assert.equal(formatDate('2026-10-06'),'06/10/2026');
  assert.equal(parseDisplayDate('06/10/2026'),'2026-10-06');
  assert.equal(resolveTiming('06/10/2026 at 5 p.m.',capturedAt,'Asia/Kolkata').date,'2026-10-06');
  for(const value of ['30/02/2026','6/10/2026','2026-10-06','06/10',''])assert.equal(parseDisplayDate(value),null);
  assert.equal(parseDisplayDate('29/02/2024'),'2024-02-29');
  assert.equal(timingLabel('today around 5 p.m.',resolveTiming('today around 5 p.m.',capturedAt,'Asia/Kolkata')),'06/10/2026 · around 5 p.m.');
});

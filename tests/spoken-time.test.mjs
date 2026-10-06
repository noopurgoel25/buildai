import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { stripTypeScriptTypes } from 'node:module';
const source = stripTypeScriptTypes(readFileSync(new URL('../convex/lib/formatSpokenTime.ts', import.meta.url), 'utf8'));
const { formatSpokenTime } = await import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`);

test('formats explicit spoken times without changing observations', () => {
  assert.equal(formatSpokenTime('She felt pukish at ten a m; did not puke.'), 'She felt pukish at 10 a.m.; did not puke.');
  assert.equal(formatSpokenTime('At twelve p.m. or one P M.'), 'At 12 p.m. or 1 p.m.');
  assert.equal(formatSpokenTime('At 10 am, then 11 p.m.'), 'At 10 a.m., then 11 p.m.');
});

test('leaves unspecified timing and other quantities unchanged', () => {
  for (const text of ['around ten', 'ten tablets', 'ten thirty a m', '110 am', 'yesterday morning', 'ten amoxicillin tablets']) {
    assert.equal(formatSpokenTime(text), text);
  }
});

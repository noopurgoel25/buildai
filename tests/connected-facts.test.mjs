import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const { connectedFacts } = await import(`data:text/javascript;base64,${Buffer.from(readFileSync(new URL('../src/observation-groups.js',import.meta.url),'utf8')).toString('base64')}`);
const originalText='She vomited today after dinner yesterday. BP was 142/88 today.';
const observations=[
  {id:'1',event:'vomited today',supportingWords:'vomited today',timing:{date:'2026-10-06'}},
  {id:'2',event:'dinner yesterday',supportingWords:'dinner yesterday',timing:{date:'2026-10-05'}},
  {id:'3',event:'BP was 142/88 today.',supportingWords:'BP was 142/88 today.',timing:{date:'2026-10-06'}},
];
const group={observationIds:['2','1'],supportingWords:'She vomited today after dinner yesterday.'};
test('explicitly connected facts render together in original fact order with their own dates, without mutating the capture',()=>{
  const event={originalText,observations,relatedGroups:[group]},before=structuredClone(event);
  const result=connectedFacts(event);
  assert.deepEqual(result.map(group=>group.items.map(item=>item.id)),[['1','2'],['3']]);
  assert.equal(result[0].related,true);assert.equal(result[1].related,false);
  assert.deepEqual(result[0].items.map(item=>item.timing.date),['2026-10-06','2026-10-05']);assert.deepEqual(event,before);
});
test('invalid, overlapping, invented and edited grouping falls back to every intact individual fact',()=>{
  for(const groups of [[{...group,observationIds:['1','missing']}],[group,group],[{...group,supportingWords:'Dinner caused vomiting.'}],[{...group,supportingWords:'She vomited today and ate dinner yesterday.'}]]) {
    const result=connectedFacts({originalText,observations,relatedGroups:groups});
    assert.ok(result.every(group=>!group.related));assert.deepEqual(result.flatMap(group=>group.items),observations);
  }
  const edited=observations.map(item=>({...item,edited:item.id==='2'}));
  assert.ok(connectedFacts({originalText,observations:edited,relatedGroups:[group]}).every(group=>!group.related));
});
test('unrelated and legacy notes never acquire a connection based on shared dates',()=>{
  assert.ok(connectedFacts({originalText,observations}).every(group=>!group.related));
  const legacy={event:'Mira Example felt tired.',when:'yesterday',evidence:'Patient-reported'};
  assert.equal(connectedFacts(legacy)[0].items[0].event,legacy.event);assert.equal(connectedFacts(legacy)[0].related,false);
});

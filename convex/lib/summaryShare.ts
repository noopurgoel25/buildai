import type { Infer } from 'convex/values';
import type { periodResult } from './summary';

export const SHARE_TEXT_LIMIT = 1_500;
const NEUTRAL_OVERVIEW = 'There is not enough information to describe an overall change in health yet. Add more updates to build a fuller picture.';

// Use the same complete, attributed facts on screen and in the checked draft.
// Saved categories own the grouping; no model assigns importance or rewrites a fact.
export function summaryHighlights(period:Pick<Infer<typeof periodResult>,'sources'|'groups'>) {
  const day=(value:string)=>`${value.slice(8,10)}/${value.slice(5,7)}/${value.slice(0,4)}`;
  const byKey=new Map(period.sources.map(source=>[source.key,source]));
  const categories=period.groups.map(group=>{
    const facts=group.keys.map(key=>byKey.get(key)).filter(source=>!!source && !!source.date);
    const seen=new Set<string>();
    const notes=[...facts].sort((a,b)=>b!.date!.localeCompare(a!.date!) || b!.capturedAt-a!.capturedAt).filter(source=>{
      const topic=source!.symptomName??source!.event;
      if(seen.has(topic))return false;seen.add(topic);return true;
    }).slice(0,2).map(source=>({key:source!.key,text:source!.event.length<=240
      ?`${day(source!.date!)} · ${source!.evidence}: "${source!.event}"`
      :`${day(source!.date!)} · ${source!.evidence}: A longer recorded note. Open details for the full wording.`}));
    return {title:group.title,count:group.keys.length,notes:group.title==='Measurements'?[]:notes};
  });
  const preferred=['Symptoms','Symptoms and observations','Medication changes','Doctor visits','Care and visits'];
  const ordered=preferred.flatMap(title=>categories.filter(category=>category.title===title));
  const notable=[0,1].flatMap(index=>ordered.flatMap(category=>category.notes[index]?[{...category.notes[index],title:category.title}]:[])).slice(0,3);
  return {categories,notable};
}

// Keep whole supported statements. Longer facts stay complete in the detail
// view; never shorten their wording to make a concise statement fit.
export function summaryNarrative(period:Pick<Infer<typeof periodResult>,'overview'>,budget=SHARE_TEXT_LIMIT) {
  const statements:string[]=[];
  for(const item of period.overview??[]) {
    if([...statements,item.text].join(' ').length<=budget)statements.push(item.text);
  }
  return statements.join(' ') || NEUTRAL_OVERVIEW;
}

export function summaryPresentation(period:Pick<Infer<typeof periodResult>,'sources'|'groups'|'overview'>) {
  const highlights=summaryHighlights(period),narrative=summaryNarrative(period,600);
  let remaining=SHARE_TEXT_LIMIT-narrative.length-2;
  const used=new Set<string>();
  const fit=(note:{key:string;text:string})=>{
    if(used.has(note.key)||note.text.length+2>remaining)return false;
    used.add(note.key);remaining-=note.text.length+2;return true;
  };
  const notable=highlights.notable.filter(fit);
  const categories=highlights.categories.map(category=>({...category,highlighted:category.notes.some(note=>used.has(note.key)),notes:category.notes.slice(0,1).filter(fit)}));
  return {notable,categories,narrative};
}

export function formatSharingDraft(period:Infer<typeof periodResult>,start:string,end:string) {
  const day=(value:string)=>`${value.slice(8,10)}/${value.slice(5,7)}/${value.slice(0,4)}`;
  const header=`CareNama: ${period.name}'s health summary\nPeriod: ${day(start)} to ${day(end)}`;
  const details=`${period.sources.length} dated ${period.sources.length===1?'detail':'details'}${period.undatedCount?` and ${period.undatedCount} details with uncertain timing`:''}. Full measurements and notes are available in CareNama through View all details.`;
  const context=`Based on ${period.recordCount} saved ${period.recordCount===1?'update':'updates'}.${period.recordCount<=2?' Only a few updates are available, so this gives a limited picture.':''} One-off notes do not establish a pattern.`;
  const footer='Based on saved caregiver notes. Days without notes tell us nothing about symptoms.';
  const fixed=[header,context,details,footer].join('\n\n');
  const highlights=summaryHighlights(period),seen=new Set<string>();
  const recorded=[...highlights.notable,...highlights.categories.flatMap(category=>category.notes.map(note=>({...note,title:category.title})))].filter(note=>{
    if(seen.has(note.key))return false;seen.add(note.key);return true;
  });
  const statements=[...recorded.slice(0,3).map(note=>`Recorded note · ${note.title}: ${note.text}`),...(period.overview??[]).map(item=>`Across dated updates: ${item.text}`),...recorded.slice(3).map(note=>`Recorded note · ${note.title}: ${note.text}`)];
  const selected:string[]=[];
  const budget=SHARE_TEXT_LIMIT-fixed.length-2;
  for(const statement of statements)if([...selected,statement].join('\n\n').length<=budget)selected.push(statement);
  const narrative=selected.join('\n\n') || summaryNarrative({overview:[]},budget);
  return [header,narrative,context,details,footer].join('\n\n');
}

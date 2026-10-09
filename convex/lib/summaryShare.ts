import type { Infer } from 'convex/values';
import type { periodResult } from './summary';

export const SHARE_TEXT_LIMIT = 1_500;
const NEUTRAL_OVERVIEW = 'There is not enough information to describe an overall change in health yet. Add more updates to build a fuller picture.';

// Keep whole supported statements. Full facts are retained in the detail view,
// never shortened or pasted into the concise draft to make them fit.
export function summaryNarrative(period:Pick<Infer<typeof periodResult>,'overview'>,budget=SHARE_TEXT_LIMIT) {
  const statements:string[]=[];
  for(const item of period.overview??[]) {
    if([...statements,item.text].join(' ').length<=budget)statements.push(item.text);
  }
  return statements.join(' ') || NEUTRAL_OVERVIEW;
}

export function formatSharingDraft(period:Infer<typeof periodResult>,start:string,end:string) {
  const day=(value:string)=>`${value.slice(8,10)}/${value.slice(5,7)}/${value.slice(0,4)}`;
  const header=`CareNama: ${period.name}'s health summary\nPeriod: ${day(start)} to ${day(end)}`;
  const details=`${period.sources.length} dated ${period.sources.length===1?'detail':'details'}${period.undatedCount?` and ${period.undatedCount} details with uncertain timing`:''}. Full measurements and notes are available in CareNama through View all details.`;
  const context=`Based on ${period.recordCount} saved ${period.recordCount===1?'update':'updates'}.${period.recordCount<=2?' Only a few updates are available, so this gives a limited picture.':''}`;
  const footer='Based on saved caregiver notes. Days without notes tell us nothing about symptoms.';
  const fixed=[header,context,details,footer].join('\n\n');
  const narrative=summaryNarrative(period,SHARE_TEXT_LIMIT-fixed.length-2);
  return [header,narrative,context,details,footer].join('\n\n');
}

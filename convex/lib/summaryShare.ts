import type { Infer } from 'convex/values';
import type { periodResult } from './summary';

export const SHARE_TEXT_LIMIT = 40_000;

export function formatSharingDraft(period:Infer<typeof periodResult>,start:string,end:string) {
  const day=(value:string)=>new Intl.DateTimeFormat('en-GB',{dateStyle:'medium',timeZone:'UTC'}).format(new Date(`${value}T12:00:00Z`));
  const lines=[`CareNama: ${period.name}'s health summary`,`Period: ${day(start)} to ${day(end)}`,'',
    'What the updates tell us',...(period.overview?.length?period.overview.map(item=>item.text):['These saved notes do not establish an overall change in health for this period.']),
    `Based on ${period.recordCount} saved ${period.recordCount===1?'update':'updates'}.`];
  if(period.recordCount<=2)lines.push('Only a few updates are available, so this gives a limited picture.');
  const fact=(source:Infer<typeof periodResult>['sources'][number])=>{
    const capture=new Intl.DateTimeFormat('en-GB',{dateStyle:'medium',timeStyle:'medium',timeZone:source.timeZone}).format(source.capturedAt);
    const polarity={present:'Explicitly present',absent:'Explicitly absent',uncertain:'Uncertain'}[source.polarity] || 'Uncertain';
    return [`- ${source.event}`,`  When: ${source.date?day(source.date):'Timing not known'}${source.when?` | ${source.when}`:''}`,
      `  Evidence: ${source.evidence} | ${polarity}${source.edited?' | Corrected by caregiver':''}`,
      `  Captured: ${capture} (${source.timeZone})`];
  };
  for(const group of period.groups){lines.push('',group.title);for(const key of group.keys)lines.push(...fact(period.sources.find(source=>source.key===key)!));}
  if(period.undatedCount){lines.push('','Details with uncertain timing','Recorded in this period; when they happened is not known.');for(const source of period.undated)lines.push(...fact(source));
    if(period.undatedCount>period.undated.length)lines.push(`Showing ${period.undated.length} of ${period.undatedCount} details with uncertain timing; other details remain in the timeline.`);}
  lines.push('','Based on saved caregiver notes. Days without notes tell us nothing about symptoms.');
  return lines.join('\n');
}

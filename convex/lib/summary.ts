import { v, type Infer } from 'convex/values';
import { confirmedEvent } from './healthEvent';
import { resolveTiming, validDate } from './observationTiming';

export const summarySource = v.object({key:v.string(),recordId:v.id('healthEvents'),revision:v.number(),event:v.string(),when:v.string(),
  evidence:v.string(),polarity:v.string(),edited:v.boolean(),date:v.union(v.string(),v.null()),capturedAt:v.number(),timeZone:v.string(),supportingWords:v.string()});
export const summaryTitle = v.union(v.literal('Symptoms and observations'),v.literal('Measurements'),v.literal('Care and visits'),v.literal('Appetite, sleep and energy'));
export const summaryGroup = v.object({title:summaryTitle,keys:v.array(v.string())});
export type SummarySource = Infer<typeof summarySource>;
export function checkPeriod(start:string,end:string) {
  if(!validDate(start) || !validDate(end) || start>end) throw new Error('Choose valid dates, with the start before the end.');
}
export function selectSources(records:{id:string;revision:number;details:Infer<typeof confirmedEvent>}[],start:string,end:string) {
  checkPeriod(start,end);
  const dated:SummarySource[]=[],undated:SummarySource[]=[];
  for(const record of records) {
    const d=record.details, captureDay=new Intl.DateTimeFormat('en-CA',{timeZone:d.timeZone}).format(d.capturedAt);
    const items=d.observations ?? [{id:'legacy',event:d.event,when:d.when,evidence:d.evidence,polarity:'uncertain',supportingWords:d.originalText,timing:resolveTiming(d.when,d.capturedAt,d.timeZone)}];
    for(const item of items){
      const date=item.timing.resolved ? item.timing.date : null;
      const source={key:'',recordId:record.id as SummarySource['recordId'],revision:record.revision,event:item.event,when:item.when,evidence:item.evidence,polarity:item.polarity,edited:'edited' in item?item.edited:d.edited,date,capturedAt:d.capturedAt,timeZone:d.timeZone,supportingWords:item.supportingWords};
      if(date && date>=start && date<=end)dated.push(source);
      else if(!date && captureDay>=start && captureDay<=end)undated.push(source);
    }
  }
  dated.sort((a,b)=>a.date!.localeCompare(b.date!) || a.capturedAt-b.capturedAt);
  dated.forEach((source,index)=>source.key=String(index+1));
  undated.forEach((source,index)=>source.key=`u${index+1}`);
  return {dated,undated};
}
export function validateGroups(raw:unknown,sources:{key:string;evidence?:string;event?:string}[]):Infer<typeof summaryGroup>[] {
  const groups=(raw as {groups?:unknown})?.groups;
  if(!Array.isArray(groups) || groups.length<1 || groups.length>4)throw new Error('invalid-summary');
  const titles=['Symptoms and observations','Measurements','Care and visits','Appetite, sleep and energy'];
  const seen=new Set<string>(),seenTitles=new Set<string>();
  for(const group of groups){
    if(!group || !titles.includes(group.title) || seenTitles.has(group.title) || !Array.isArray(group.keys) || !group.keys.length)throw new Error('invalid-summary');
    seenTitles.add(group.title);
    for(const key of group.keys){if(typeof key!=='string' || seen.has(key) || !sources.some(source=>source.key===key))throw new Error('ungrounded-summary');seen.add(key);}
  }
  if(seen.size!==sources.length)throw new Error('incomplete-summary');
  const normalized=new Map<Infer<typeof summaryGroup>['title'],string[]>();
  for(const group of groups)for(const key of group.keys){
    const source=sources.find(source=>source.key===key)!;
    const medicine=/\b(?:medicin\w*|medicat\w*|dose\w*|tablet\w*|capsule\w*|prescrib\w*|mg|mcg)\b/i.test(source.event || '');
    const title=medicine?'Care and visits':source.evidence==='Measured'?'Measurements':group.title;
    normalized.set(title,[...(normalized.get(title)||[]),key]);
  }
  return [...normalized].map(([title,keys])=>({title,keys}));
}

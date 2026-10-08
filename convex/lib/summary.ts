import { v, type Infer } from 'convex/values';
import { sha256 } from '@oslojs/crypto/sha2';
import { confirmedEvent, classificationFields } from './healthEvent';
import { resolveTiming, validDate } from './observationTiming';

export const summarySource = v.object({...classificationFields,observationId:v.optional(v.string()),key:v.string(),recordId:v.id('healthEvents'),revision:v.number(),event:v.string(),when:v.string(),
  evidence:v.string(),polarity:v.string(),edited:v.boolean(),date:v.union(v.string(),v.null()),capturedAt:v.number(),timeZone:v.string(),supportingWords:v.string()});
export const summaryTitle = v.union(v.literal('Symptoms and observations'),v.literal('Measurements'),v.literal('Care and visits'),v.literal('Appetite, sleep and energy'),v.literal('Other'),v.literal('Symptoms'),v.literal('Medication changes'),v.literal('Doctor visits'),v.literal('Daily wellbeing'),v.literal('Appetite'));
export const summaryGroup = v.object({title:summaryTitle,keys:v.array(v.string())});
export const summaryInsight = v.object({id:v.string(),text:v.string(),keys:v.array(v.string())});
export const periodResult = v.object({conciseOverview:v.optional(v.string()),snapshotHash:v.optional(v.string()),status:v.union(v.literal('ready'),v.literal('empty'),v.literal('too_many')),name:v.string(),groups:v.array(summaryGroup),overview:v.optional(v.array(summaryInsight)),sources:v.array(summarySource),undated:v.array(summarySource),undatedCount:v.number(),recordCount:v.number(),message:v.string(),generatedAt:v.number()});
export type SummarySource = Infer<typeof summarySource>;
export function checkPeriod(start:string,end:string) {
  if(!validDate(start) || !validDate(end) || start>end) throw new Error('Choose valid dates, with the start before the end.');
  if((Date.parse(end)-Date.parse(start))/86400000+1>90)throw new Error('Choose a period of up to 90 days.');
}
export function selectSources(records:{id:string;revision:number;details:Infer<typeof confirmedEvent>}[],start:string,end:string) {
  checkPeriod(start,end);
  const dated:SummarySource[]=[],undated:SummarySource[]=[];
  for(const record of records) {
    const d=record.details, captureDay=new Intl.DateTimeFormat('en-CA',{timeZone:d.timeZone}).format(d.capturedAt);
    const items=d.observations ?? [{type:d.type,symptomName:d.symptomName,measurement:d.measurement,id:'legacy',event:d.event,when:d.when,evidence:d.evidence,polarity:'uncertain',supportingWords:d.originalText,timing:resolveTiming(d.when,d.capturedAt,d.timeZone)}];
    for(const item of items){
      const date=item.timing.resolved ? item.timing.date : null;
      const source={observationId:item.id,...('type' in item && item.type?{type:item.type}:{}),...('symptomName' in item && item.symptomName?{symptomName:item.symptomName}:{}),...('measurement' in item && item.measurement?{measurement:item.measurement}:{}),key:'',recordId:record.id as SummarySource['recordId'],revision:record.revision,event:item.event,when:item.when,evidence:item.evidence,polarity:item.polarity,edited:'edited' in item?item.edited:d.edited,date,capturedAt:d.capturedAt,timeZone:d.timeZone,supportingWords:item.supportingWords};
      if(date && date>=start && date<=end)dated.push(source);
      else if(!date && captureDay>=start && captureDay<=end)undated.push(source);
    }
  }
  dated.sort((a,b)=>a.date!.localeCompare(b.date!) || a.capturedAt-b.capturedAt);
  dated.forEach((source,index)=>source.key=String(index+1));
  undated.forEach((source,index)=>source.key=`u${index+1}`);
  return {dated,undated};
}
// Saved labels own grouping; neither model wording nor keyword guesses can move facts.
export function groupSources(sources: Pick<SummarySource,'key'|'type'>[]):Infer<typeof summaryGroup>[] {
  const titles:Record<string,Infer<typeof summaryGroup>['title']>={symptom:'Symptoms',measurement:'Measurements',medication_change:'Medication changes',doctor_visit:'Doctor visits',daily_wellbeing:'Daily wellbeing',appetite:'Appetite'};
  const grouped=new Map<Infer<typeof summaryGroup>['title'],string[]>();
  for(const source of sources){const title=titles[source.type??'']??'Other';grouped.set(title,[...(grouped.get(title)??[]),source.key]);}
  return ['Symptoms','Measurements','Medication changes','Doctor visits','Daily wellbeing','Appetite','Other'].filter(title=>grouped.has(title as Infer<typeof summaryGroup>['title'])).map(title=>({title:title as Infer<typeof summaryGroup>['title'],keys:grouped.get(title as Infer<typeof summaryGroup>['title'])!}));
}
export function validateGroups(raw:unknown,sources:Pick<SummarySource,'key'|'type'>[]):Infer<typeof summaryGroup>[] {
  const groups=(raw as {groups?:unknown})?.groups;
  const titles=['Symptoms','Measurements','Medication changes','Doctor visits','Daily wellbeing','Appetite','Other','Symptoms and observations','Care and visits','Appetite, sleep and energy'];
  if(!Array.isArray(groups)||groups.length>7)throw new Error('invalid-summary');
  const seen=new Set<string>(),seenTitles=new Set<string>();
  for(const group of groups){
    if(!group||!titles.includes(group.title)||seenTitles.has(group.title)||!Array.isArray(group.keys)||!group.keys.length)throw new Error('invalid-summary');
    seenTitles.add(group.title);
    for(const key of group.keys){if(typeof key!=='string'||seen.has(key)||!sources.some(source=>source.key===key))throw new Error('ungrounded-summary');seen.add(key);}
  }
  if(seen.size!==sources.length)throw new Error('incomplete-summary');
  return groupSources(sources);
}
export function periodHash(start:string,end:string,dated:SummarySource[],undated:SummarySource[]) {
  const value=JSON.stringify({start,end,dated,undated});
  return Array.from(sha256(new TextEncoder().encode(value)),byte=>byte.toString(16).padStart(2,'0')).join('');
}
export function numberSources(dated:SummarySource[],undated:SummarySource[]) {
  dated.sort((a,b)=>a.date!.localeCompare(b.date!)||a.capturedAt-b.capturedAt||String(a.recordId).localeCompare(String(b.recordId))||(a.observationId??a.key).localeCompare(b.observationId??b.key));
  dated.forEach((source,index)=>source.key=String(index+1));
  undated.sort((a,b)=>a.capturedAt-b.capturedAt||String(a.recordId).localeCompare(String(b.recordId))||(a.observationId??a.key).localeCompare(b.observationId??b.key));
  undated.forEach((source,index)=>source.key=`u${index+1}`);
}
// These templates describe notes, never clinical progress or days without notes.
export function overviewCandidates(sources:(Pick<SummarySource,'key'|'event'|'date'|'polarity'|'evidence'|'type'|'symptomName'>&Partial<Pick<SummarySource,'recordId'>>)[]):Infer<typeof summaryInsight>[] {
  const day=(date:string)=>new Intl.DateTimeFormat('en-GB',{day:'numeric',month:'short',year:'numeric',timeZone:'UTC'}).format(new Date(`${date}T12:00:00Z`));
  const topics=new Map<string,typeof sources>();
  for(const source of sources){
    if(!source.date||source.type==='pending'||source.type==='measurement')continue;
    const topic=source.type==='symptom'&&source.symptomName?source.symptomName:source.type==='appetite'?'appetite':source.type==='daily_wellbeing'?(/\bsleep|slept\b/i.test(source.event)?'sleep':/\benergy|energetic\b/i.test(source.event)?'energy':'daily wellbeing'):null;
    if(topic)topics.set(topic,[...(topics.get(topic)??[]),source]);
  }
  const candidates:Infer<typeof summaryInsight>[]=[];
  for(const [name,notes] of [...topics].sort(([a],[b])=>a.localeCompare(b))){
    notes.sort((a,b)=>a.date!.localeCompare(b.date!));
    if(new Set(notes.map(note=>note.date)).size<2||new Set(notes.map(note=>note.recordId??note.key)).size<2)continue;
    const label=name.charAt(0).toUpperCase()+name.slice(1);
    const first=notes.find(note=>note.polarity==='present');
    const absent=first&&notes.find(note=>note.date!>first.date!&&note.polarity==='absent'&&note.event.length<=240&&note.evidence===first.evidence&&!/\b(report\w*|mention\w*)\b/i.test(note.event));
    if(first&&absent){candidates.push({id:`absence:${name}`,text:`${label} was recorded on ${day(first.date!)}. A later note on ${day(absent.date!)} explicitly records its absence: "${absent.event}" This describes those notes, not the days between them.`,keys:[first.key,absent.key]});continue;}
    const change=[...notes].reverse().find(note=>note.event.length<=240&&note.polarity!=='absent'&&!/\b(not|no|never|didn't|isn't|wasn't|hasn't|if|unless|might|could|would|should)\b/i.test(note.event)&&/\b(better|improved|improving|fewer|worse|worsened|worsening)\b/i.test(note.event));
    const earlier=change&&notes.find(note=>note.date!<change.date!&&note.evidence===change.evidence);
    if(change&&earlier){candidates.push({id:`change:${name}`,text:`An earlier ${name} note was recorded on ${day(earlier.date!)}. On ${day(change.date!)}, a note reported: "${change.event}" This is reported wording, not an overall health verdict.`,keys:[earlier.key,change.key]});continue;}
    const mentioned=notes,days=[...new Set(mentioned.map(note=>note.date!))];
    if(days.length>=2)candidates.push({id:`repeat:${name}`,text:`${label} was mentioned in saved updates on ${days.length} different days: ${days.slice(0,4).map(day).join(', ')}${days.length>4?` and ${days.length-4} other recorded days`:''}. This counts recorded days, not separate episodes.`,keys:mentioned.map(note=>note.key)});
  }
  return candidates.sort((a,b)=>(a.id.startsWith('repeat:')?1:0)-(b.id.startsWith('repeat:')?1:0));
}
export function selectOverview(ids:unknown,candidates:Infer<typeof summaryInsight>[]) {
  if(!Array.isArray(ids)||ids.length>2||new Set(ids).size!==ids.length||ids.some(id=>typeof id!=='string'||!candidates.some(candidate=>candidate.id===id)))throw new Error('ungrounded-overview');
  return ids.map(id=>candidates.find(candidate=>candidate.id===id)!);
}
// Exact, source-grounded alternatives keep every AI sentence checkable.
export function wordingOptions(candidate:Infer<typeof summaryInsight>) {
  return [candidate.text,candidate.text.replace('was mentioned in saved updates on','appears in recorded notes on').replace('A later note on','A subsequent note on').replace('a note reported:','the caregiver recorded:')];
}
export function validateOverview(raw:unknown,candidates:Infer<typeof summaryInsight>[]) {
  const items=(raw as {overview?:unknown})?.overview;
  if(!Array.isArray(items)||items.length!==Math.min(2,candidates.length))throw new Error('invalid-overview');
  const picked=selectOverview(items.map(item=>item?.id),candidates.slice(0,2));
  return picked.map((candidate,index)=>{if(!wordingOptions(candidate).includes(items[index]?.text))throw new Error('ungrounded-overview');return {...candidate,text:items[index].text};});
}

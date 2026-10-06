import { v, type Infer } from 'convex/values';
import { confirmedEvent } from './healthEvent';
import { resolveTiming, validDate } from './observationTiming';

export const summarySource = v.object({key:v.string(),recordId:v.id('healthEvents'),revision:v.number(),event:v.string(),when:v.string(),
  evidence:v.string(),polarity:v.string(),edited:v.boolean(),date:v.union(v.string(),v.null()),capturedAt:v.number(),timeZone:v.string(),supportingWords:v.string()});
export const summaryTitle = v.union(v.literal('Symptoms and observations'),v.literal('Measurements'),v.literal('Care and visits'),v.literal('Appetite, sleep and energy'));
export const summaryGroup = v.object({title:summaryTitle,keys:v.array(v.string())});
export const summaryInsight = v.object({id:v.string(),text:v.string(),keys:v.array(v.string())});
export const periodResult = v.object({status:v.union(v.literal('ready'),v.literal('empty'),v.literal('too_many')),name:v.string(),groups:v.array(summaryGroup),overview:v.optional(v.array(summaryInsight)),sources:v.array(summarySource),undated:v.array(summarySource),undatedCount:v.number(),recordCount:v.number(),message:v.string(),generatedAt:v.number()});
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
// One category per input position avoids repeated titles and lost source keys.
export function validateCategories(raw:unknown,sources:{key:string;evidence?:string;event?:string}[]):Infer<typeof summaryGroup>[] {
  const categories=(raw as {categories?:unknown})?.categories;
  if(!Array.isArray(categories) || categories.length!==sources.length || categories.some(category=>!Number.isInteger(category) || category<1 || category>4))throw new Error('invalid-summary-categories');
  const titles=['Symptoms and observations','Measurements','Care and visits','Appetite, sleep and energy'];
  const grouped=new Map<string,string[]>();
  categories.forEach((category,index)=>{const title=titles[category-1];grouped.set(title,[...(grouped.get(title)||[]),sources[index].key]);});
  return validateGroups({groups:[...grouped].map(([title,keys])=>({title,keys}))},sources);
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
    const event=source.event || '';
    const care=/\b(doctor|clinic|hospital|appointment|consultation)\b/i.test(event);
    const wellbeing=/\b(appetite|sleep|slept|sleeping|energy)\b/i.test(event);
    const symptom=/\b(dizz\w*|headaches?|fever|nausea|vomit\w*|pain|cough\w*|breath\w*|tired\w*|fatigue|rash\w*|allerg\w*)\b/i.test(event);
    const title=medicine?'Care and visits':source.evidence==='Measured'?'Measurements':care?'Care and visits':wellbeing?'Appetite, sleep and energy':symptom?'Symptoms and observations':group.title;
    normalized.set(title,[...(normalized.get(title)||[]),key]);
  }
  return [...normalized].map(([title,keys])=>({title,keys}));
}

// Propose only narrow, checkable descriptions. Sarvam can choose these, not invent a verdict.
export function overviewCandidates(sources:Pick<SummarySource,'key'|'event'|'date'|'polarity'|'evidence'>[]):Infer<typeof summaryInsight>[] {
  const candidates:Infer<typeof summaryInsight>[]=[];
  const day=(date:string)=>new Intl.DateTimeFormat('en-GB',{day:'numeric',month:'short',year:'numeric',timeZone:'UTC'}).format(new Date(`${date}T12:00:00Z`));
  const topics=[['Dizziness',/\b(dizzy|dizziness)\b/i],['Headache',/\bheadaches?\b/i],['Fever',/\bfever\b/i],['Nausea',/\bnausea\b/i],['Tiredness',/\b(tired|tiredness|fatigue)\b/i]] as const;
  const topic=(event:string)=>{const matches=topics.filter(([,pattern])=>pattern.test(event));return matches.length===1?matches[0][0]:null;};
  const usable=sources.filter(s=>s.date && s.event.length<=240);
  // A single reported change belongs in its category, not the period overview.
  for(const [name] of topics){
    const notes=usable.filter(s=>topic(s.event)===name && s.evidence!=='Measured').sort((a,b)=>a.date!.localeCompare(b.date!));
    const first=notes.find(s=>s.polarity==='present');
    const later=first && notes.find(s=>s.date!>first.date! && s.polarity==='absent' && s.evidence===first.evidence && !/\b(report\w*|mention\w*)\b/i.test(s.event));
    if(first && later)candidates.push({id:'',text:`${name} was recorded on ${day(first.date!)}. A later note on ${day(later.date!)} explicitly records its absence: “${later.event}” This describes those notes, not the days between them.`,keys:[first.key,later.key]});
    else {
      const present=notes.filter(s=>s.polarity==='present'),days=new Set(present.map(s=>s.date));
      if(days.size>=2)candidates.push({id:'',text:`${name} was mentioned in saved updates on ${days.size} different days. This counts recorded days, not separate episodes.`,keys:present.map(s=>s.key)});
    }
  }
  return candidates.slice(0,8).map((c,index)=>({...c,id:`h${index+1}`}));
}

export function selectOverview(ids:unknown,candidates:Infer<typeof summaryInsight>[]) {
  if(!Array.isArray(ids) || ids.length>2 || new Set(ids).size!==ids.length || ids.some(id=>typeof id!=='string' || !candidates.some(c=>c.id===id)))throw new Error('ungrounded-overview');
  return ids.map(id=>candidates.find(c=>c.id===id)!);
}

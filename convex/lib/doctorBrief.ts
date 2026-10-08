import { v, type Infer } from 'convex/values';
import { periodResult, summarySource, summaryInsight, summaryGroup } from './summary';

export const briefSection = v.object({title:v.union(v.literal('Reported improvements'),v.literal('Reported worsening or new symptoms'),v.literal('Other observations'),v.literal('Recorded measurements'),v.literal('Care and visits')),keys:v.array(v.string())});
export const briefResult = v.object({conciseOverview:v.optional(v.string()),snapshotHash:v.optional(v.string()),status:v.union(v.literal('ready'),v.literal('empty'),v.literal('too_many')),name:v.string(),groups:v.array(summaryGroup),start:v.string(),end:v.string(),overview:v.array(summaryInsight),sections:v.array(briefSection),discussionKeys:v.array(v.string()),sources:v.array(summarySource),undated:v.array(summarySource),undatedCount:v.number(),recordCount:v.number(),message:v.string(),generatedAt:v.number()});

export function composeBrief(period:Infer<typeof periodResult>,start:string,end:string):Infer<typeof briefResult> {
  const sections=new Map<Infer<typeof briefSection>['title'],string[]>();
  const groupOf=(key:string)=>period.groups.find(group=>group.keys.includes(key))?.title;
  for(const source of period.sources){
    const group=groupOf(source.key),event=source.event;
    // These headings describe recorded wording, not a clinical interpretation.
    const comparison=source.polarity!=='absent' && !/\b(not|no|never|didn't|isn't|wasn't|hasn't|if|unless|might|could|would|should)\b/i.test(event);
    const improvement=comparison && /\b(better|improved|improving|fewer)\b/i.test(event);
    const worsening=comparison && /\b(worse|worsened|worsening)\b/i.test(event);
    const newSymptom=comparison && ['Symptoms','Symptoms and observations'].includes(group??'') && /\b(new|started|developed|first time)\b/i.test(event);
    const title=group==='Measurements'?'Recorded measurements':['Care and visits','Medication changes','Doctor visits'].includes(group??'')?'Care and visits':improvement && !worsening?'Reported improvements':worsening || newSymptom?'Reported worsening or new symptoms':'Other observations';
    sections.set(title,[...(sections.get(title)||[]),source.key]);
  }
  const order:Infer<typeof briefSection>['title'][]=['Reported improvements','Reported worsening or new symptoms','Other observations','Recorded measurements','Care and visits'];
  const questions=period.sources.filter(s=>/\?|\b(asked|question|discuss)\b/i.test(s.event)).map(s=>s.key);
  const discussionKeys=[...new Set(questions.length?questions:(period.overview||[]).flatMap(item=>item.keys))];
  return {...period.conciseOverview?{conciseOverview:period.conciseOverview}:{},...period.snapshotHash?{snapshotHash:period.snapshotHash}:{},status:period.status,name:period.name,groups:period.groups,start,end,overview:period.overview||[],sections:order.filter(title=>sections.has(title)).map(title=>({title,keys:sections.get(title)!})),discussionKeys,sources:period.sources,undated:period.undated,undatedCount:period.undatedCount,recordCount:period.recordCount,message:period.message,generatedAt:period.generatedAt};
}

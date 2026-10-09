// Only these literal fields can leave CareNama. Never accept free text.
export const eventRules = {
  landing_viewed:{}, setup_completed:{}, clarification_asked:{}, update_changed:{}, update_deleted:{}, account_deleted:{},
  capture_started:{method:['voice','text'],is_first:'boolean'},
  capture_failed:{reason:['mic_denied','empty','busy','too_long']},
  update_confirmed:{fact_count:'count',was_edited:'boolean'},
  signin_completed:{is_returning:'boolean'},
  update_saved:{fact_count:'count',days_since_last_save:'days'},
  timeline_opened:{note_count:['0','1-2','3-10','11-50','51+']},
  summary_prepared:{period_days:'period',source_count:['0','1-2','3-10','11-50','51+'],result:['ok','empty','too_long','failed']},
  share_draft_edited:{edit_size:['small','medium','large']},
  summary_shared:{method:['share','copy'],version:['concise']},
} as const;
export type EventName=keyof typeof eventRules;
export function safeProperties(event:string,input:Record<string,unknown>):Record<string,string|number|boolean>{
  if(!Object.hasOwn(eventRules,event))throw new Error('Unsupported analytics event.');
  const rules=eventRules[event as EventName] as Record<string,unknown>;
  if(Object.keys(input).some(key=>!Object.hasOwn(rules,key)))throw new Error('Unsupported analytics field.');
  const result:Record<string,string|number|boolean>={};
  for(const [key,rule] of Object.entries(rules)){
    const value=input[key];
    const valid=Array.isArray(rule)?rule.includes(value):rule==='boolean'?typeof value==='boolean':
      typeof value==='number'&&Number.isInteger(value)&&value>=(rule==='period'?1:0)&&value<=(rule==='period'||rule==='days'?36500:100);
    if(!valid)throw new Error('Invalid analytics field.');
    result[key]=value as string|number|boolean;
  }
  return result;
}
export const countBucket=(count:number)=>count===0?'0':count<=2?'1-2':count<=10?'3-10':count<=50?'11-50':'51+';

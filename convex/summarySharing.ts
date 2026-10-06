import { action } from './_generated/server';
import { internal } from './_generated/api';
import { getAuthUserId } from '@convex-dev/auth/server';
import { v, type Infer } from 'convex/values';
import type { Id } from './_generated/dataModel';
import { confirmedEvent } from './lib/healthEvent';
import { checkPeriod, selectSources, summaryGroup, validateGroups, overviewCandidates, selectOverview } from './lib/summary';
import { formatSharingDraft, SHARE_TEXT_LIMIT } from './lib/summaryShare';

// Read-only: no share link, draft row, AI call or outbound delivery is created.
export const prepare=action({
  args:{patientId:v.id('people'),start:v.string(),end:v.string(),records:v.array(v.object({id:v.id('healthEvents'),revision:v.number()})),datedCount:v.number(),undatedCount:v.number(),groups:v.array(summaryGroup),overviewIds:v.array(v.string()),text:v.union(v.string(),v.null())},
  returns:v.object({status:v.union(v.literal('ready'),v.literal('stale'),v.literal('too_many')),title:v.string(),text:v.string(),message:v.string()}),
  handler:async(ctx,args)=>{
    const caregiverId=await getAuthUserId(ctx);if(!caregiverId)throw new Error('Sign in to review and share your summary.');
    checkPeriod(args.start,args.end);
    if(!args.records.length || args.records.length>60 || new Set(args.records.map(record=>record.id)).size!==args.records.length || args.records.some(record=>!Number.isInteger(record.revision)||record.revision<0) || !Number.isInteger(args.datedCount)||args.datedCount<1||args.datedCount>40 || !Number.isInteger(args.undatedCount)||args.undatedCount<0)throw new Error('This summary is not available for sharing.');
    if(args.text!==null && (!args.text.trim() || args.text.length>SHARE_TEXT_LIMIT))throw new Error('Use 1 to 40,000 characters for your sharing draft.');
    const rows:{id:Id<'healthEvents'>;revision:number;details:Infer<typeof confirmedEvent>}[]=[];let cursor:null|string=null,name='',done=false;
    for(let page=0;page<20;page++){
      const result:{name:string;page:typeof rows;isDone:boolean;continueCursor:string}=await ctx.runQuery(internal.summaries.sourcePage,{caregiverId,patientId:args.patientId,paginationOpts:{numItems:50,cursor}});
      name=result.name;rows.push(...result.page);cursor=result.continueCursor;if(result.isDone){done=true;break;}
    }
    const base={title:`${name}'s health summary`,text:'',message:''};
    if(!done)return{...base,status:'too_many' as const,message:'Choose a shorter period and prepare Summary again.'};
    const {dated,undated}=selectSources(rows,args.start,args.end),shownUndated=undated.slice(0,20);
    const versions=new Map([...dated,...shownUndated].map(source=>[source.recordId,source.revision]));
    const stale=()=>({...base,status:'stale' as const,message:'A saved note changed. Go back and prepare Summary again before sharing. Your draft is still here.'});
    if(dated.length!==args.datedCount || undated.length!==args.undatedCount || versions.size!==args.records.length || args.records.some(record=>versions.get(record.id)!==record.revision))return stale();
    if(dated.reduce((n,source)=>n+source.event.length+source.when.length,0)>8000)return{...base,status:'too_many' as const,message:'Choose a shorter period and prepare Summary again.'};
    const groups=validateGroups({groups:args.groups},dated),overview=selectOverview(args.overviewIds,overviewCandidates(dated));
    const period={status:'ready' as const,name,groups,overview,sources:dated,undated:shownUndated,undatedCount:undated.length,recordCount:new Set(dated.map(source=>source.recordId)).size,message:'',generatedAt:Date.now()};
    const text=args.text ?? formatSharingDraft(period,args.start,args.end);
    if(text.length>SHARE_TEXT_LIMIT)return{...base,status:'too_many' as const,message:'There is more detail than fits in a sharing draft. Choose a shorter period.'};
    if(!await ctx.runQuery(internal.summaries.unchanged,{caregiverId,sources:[...dated,...shownUndated]}))return stale();
    return{...base,status:'ready' as const,text};
  },
});

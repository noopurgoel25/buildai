import { action } from './_generated/server';
import { loadPeriod } from './summaries';
import { getAuthUserId } from '@convex-dev/auth/server';
import { v } from 'convex/values';
import { checkPeriod, summaryGroup, summaryInsight, validateGroups, overviewCandidates, selectOverview, validateOverview } from './lib/summary';
import { formatSharingDraft, SHARE_TEXT_LIMIT } from './lib/summaryShare';

// Read-only: no share link, draft row, AI call or outbound delivery is created.
export const prepare=action({
  args:{snapshotHash:v.optional(v.string()),overview:v.optional(v.array(summaryInsight)),patientId:v.id('people'),start:v.string(),end:v.string(),records:v.array(v.object({id:v.id('healthEvents'),revision:v.number()})),datedCount:v.number(),undatedCount:v.number(),groups:v.array(summaryGroup),overviewIds:v.array(v.string()),text:v.union(v.string(),v.null())},
  returns:v.object({status:v.union(v.literal('ready'),v.literal('stale'),v.literal('too_many')),title:v.string(),text:v.string(),message:v.string()}),
  handler:async(ctx,args)=>{
    const caregiverId=await getAuthUserId(ctx);if(!caregiverId)throw new Error('Sign in to review and share your summary.');
    checkPeriod(args.start,args.end);
    if(!args.records.length || new Set(args.records.map(record=>record.id)).size!==args.records.length || args.records.some(record=>!Number.isInteger(record.revision)||record.revision<0) || !Number.isInteger(args.datedCount)||args.datedCount<1 || !Number.isInteger(args.undatedCount)||args.undatedCount<0)throw new Error('This summary is not available for sharing.');
    if(args.text!==null && (!args.text.trim() || args.text.length>SHARE_TEXT_LIMIT))throw new Error('Use 1 to 1,500 characters for your sharing draft.');
    const selected=await loadPeriod(ctx,{caregiverId,patientId:args.patientId,start:args.start,end:args.end});
    const {name,dated,undated,snapshotHash}=selected;
    const base={title:`${name}'s health summary`,text:'',message:''};
    const versions=new Map([...dated,...undated].map(source=>[source.recordId,source.revision]));
    const stale=()=>({...base,status:'stale' as const,message:'A saved note changed. Go back and prepare Summary again before sharing. Your draft is still here.'});
    if((args.snapshotHash!==undefined&&args.snapshotHash!==snapshotHash)||dated.length!==args.datedCount || undated.length!==args.undatedCount || versions.size!==args.records.length || args.records.some(record=>versions.get(record.id)!==record.revision))return stale();
    const groups=validateGroups({groups:args.groups},dated),picked=selectOverview(args.overviewIds,overviewCandidates(dated));
    if(args.overview&&JSON.stringify(args.overview.map(item=>item.id))!==JSON.stringify(args.overviewIds))throw new Error('Check the summary overview.');
    const overview=args.overview?validateOverview({overview:args.overview},picked):picked;
    const period={status:'ready' as const,name,groups,overview,sources:dated,undated,undatedCount:undated.length,recordCount:new Set(dated.map(source=>source.recordId)).size,message:'',generatedAt:Date.now()};
    const text=args.text ?? formatSharingDraft(period,args.start,args.end);
    if(text.length>SHARE_TEXT_LIMIT)return{...base,status:'too_many' as const,message:'There is more detail than fits in a sharing draft. Choose a shorter period.'};
    if((await loadPeriod(ctx,{caregiverId,patientId:args.patientId,start:args.start,end:args.end})).snapshotHash!==snapshotHash)return stale();
    return{...base,status:'ready' as const,text};
  },
});

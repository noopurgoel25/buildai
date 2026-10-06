import { internalMutation } from "./_generated/server";
import { v } from "convex/values";
import type { MutationCtx } from './_generated/server';

// One shared rolling allowance for transcription, interpretation and summaries.
async function reserveAI(ctx: MutationCtx) {
  const now=Date.now(),hour=Math.floor(now/3_600_000);
  const recent=await ctx.db.query('interpretationUsage').withIndex('by_requestedAt',q=>q.gte('requestedAt',now-3_600_000)).take(100);
  // Old transcription counters age out conservatively during the transition.
  const legacy=await ctx.db.query('transcriptionUsage').withIndex('by_hour',q=>q.gte('hour',hour-1)).take(2);
  if(recent.length+legacy.reduce((count,row)=>count+row.count,0)>=100)return false;
  await ctx.db.insert('interpretationUsage',{requestedAt:now});return true;
}

export const reserveTranscription = internalMutation({
  args: {},
  returns: v.boolean(),
  handler: reserveAI,
});

// Count attempts atomically across the app during the preceding hour.
export const reserveInterpretation = internalMutation({
  args: {},
  returns: v.boolean(),
  handler: reserveAI,
});

import { internalMutation } from "./_generated/server";
import { v } from "convex/values";

export const reserveTranscription = internalMutation({
  args: {},
  returns: v.boolean(),
  handler: async (ctx) => {
    const hour = Math.floor(Date.now() / 3_600_000);
    const usage = await ctx.db.query("transcriptionUsage").withIndex("by_hour", q => q.eq("hour", hour)).unique();
    if (usage && usage.count >= 100) return false;
    if (usage) await ctx.db.patch(usage._id, { count: usage.count + 1 });
    else await ctx.db.insert("transcriptionUsage", { hour, count: 1 });
    return true;
  },
});

// Count attempts atomically across the app during the preceding hour.
export const reserveInterpretation = internalMutation({
  args: {},
  returns: v.boolean(),
  handler: async (ctx) => {
    const now = Date.now();
    const recent = await ctx.db.query("interpretationUsage")
      .withIndex("by_requestedAt", q => q.gte("requestedAt", now - 3_600_000)).take(100);
    if (recent.length >= 100) return false;
    await ctx.db.insert("interpretationUsage", { requestedAt: now });
    return true;
  },
});

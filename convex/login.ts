import { internalMutation } from "./_generated/server";
import { v } from "convex/values";

export const reserveEmail = internalMutation({
  args: { emailHash: v.string() }, returns: v.boolean(),
  handler: async (ctx, { emailHash }) => {
    const now = Date.now();
    const recent = await ctx.db.query("loginEmailUsage").withIndex("by_email_time", q => q.eq("emailHash", emailHash).gte("requestedAt", now - 3_600_000)).take(5);
    const global = await ctx.db.query("loginEmailUsage").withIndex("by_time", q => q.gte("requestedAt", now - 3_600_000)).take(100);
    if (recent.length >= 5 || global.length >= 100 || recent.some(item => item.requestedAt > now - 60_000)) return false;
    await ctx.db.insert("loginEmailUsage", { emailHash, requestedAt: now });
    return true;
  },
});

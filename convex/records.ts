import { query, mutation } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";
import { confirmedEvent, validateConfirmedEvent } from "./lib/healthEvent";

export const firstRecord = query({
  args: {},
  returns: v.union(v.null(), v.object({ name: v.string(), relationship: v.string(), event: confirmedEvent })),
  handler: async ctx => {
    const caregiverId = await getAuthUserId(ctx);
    if (!caregiverId) throw new Error("Sign in to view your health record.");
    const family = await ctx.db.query("families").withIndex("by_caregiver", q => q.eq("caregiverId", caregiverId)).unique();
    if (!family) return null;
    const person = await ctx.db.query("people").withIndex("by_family", q => q.eq("familyId", family._id)).unique();
    if (!person) return null;
    const record = await ctx.db.query("healthRecords").withIndex("by_person", q => q.eq("personId", person._id)).unique();
    if (!record) return null;
    const timeline = await ctx.db.query("healthTimelines").withIndex("by_record", q => q.eq("recordId", record._id)).unique();
    if (!timeline) return null;
    const event = await ctx.db.query("healthEvents").withIndex("by_timeline", q => q.eq("timelineId", timeline._id)).order("desc").first();
    if (!event) return null;
    return { name: person.name, relationship: person.relationship, event: event.details };
  },
});

export const saveFirstRecord = mutation({
  args: { patient: v.object({ name: v.string(), relationship: v.string() }), event: confirmedEvent },
  returns: v.id("healthEvents"),
  handler: async (ctx, args) => {
    const caregiverId = await getAuthUserId(ctx);
    if (!caregiverId) throw new Error("Sign in before saving this health record.");
    validateConfirmedEvent(args.event);
    const name = args.patient.name.trim(), relationship = args.patient.relationship.trim();
    if (!name || !relationship || name.length > 500 || relationship.length > 500) throw new Error("Check the patient details.");
    const alreadySaved = await ctx.db.query("healthEvents").withIndex("by_caregiver_confirmation", q => q.eq("caregiverId", caregiverId).eq("details.confirmationId", args.event.confirmationId)).unique();
    if (alreadySaved) return alreadySaved._id;
    const existing = await ctx.db.query("families").withIndex("by_caregiver", q => q.eq("caregiverId", caregiverId)).unique();
    if (existing) throw new Error("This account already has a health record. Your new update has not been saved.");
    // All five objects are created together, or none are saved if this fails.
    const familyId = await ctx.db.insert("families", { caregiverId });
    const personId = await ctx.db.insert("people", { familyId, name, relationship });
    const recordId = await ctx.db.insert("healthRecords", { personId });
    const timelineId = await ctx.db.insert("healthTimelines", { recordId });
    return await ctx.db.insert("healthEvents", { caregiverId, timelineId, details: args.event, confirmedAt: Date.now() });
  },
});

import { query, mutation } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";
import { v, type Infer } from "convex/values";
import type { MutationCtx } from "./_generated/server";
import { confirmedEvent, validateConfirmedEvent } from "./lib/healthEvent";
import { paginationOptsValidator } from "convex/server";

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

const saveArgs = { patient: v.object({ name: v.string(), relationship: v.string() }), event: confirmedEvent };
async function persistFirstRecord(ctx: MutationCtx, args: { patient: {name:string;relationship:string}; event: Infer<typeof confirmedEvent> }) {
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
}

// Legacy API remains available while the new frontend is reviewed and deployed.
export const saveFirstRecord = mutation({args:saveArgs,returns:v.id("healthEvents"),handler:persistFirstRecord});
export const saveCapture = mutation({args:saveArgs,returns:v.id("healthEvents"),handler:async (ctx,args) => {
  if (!args.event.observations?.length) throw new Error("Review each observation before saving.");
  return await persistFirstRecord(ctx,args);
}});

export const timelinePage = query({
  args: { paginationOpts: paginationOptsValidator },
  returns: v.object({
    patient: v.union(v.null(), v.object({ id: v.id('people'), name: v.string(), relationship: v.string() })),
    page: v.array(v.object({ id: v.id('healthEvents'), details: confirmedEvent, revision: v.number() })),
    isDone: v.boolean(), continueCursor: v.string(),
  }),
  handler: async (ctx, args) => {
    const caregiverId = await getAuthUserId(ctx);
    if (!caregiverId) throw new Error('Sign in to view your timeline.');
    if (!Number.isInteger(args.paginationOpts.numItems) || args.paginationOpts.numItems < 1 || args.paginationOpts.numItems > 10) throw new Error('Request up to 10 updates at a time.');
    const empty = { patient: null, page: [], isDone: true, continueCursor: '' };
    const family = await ctx.db.query('families').withIndex('by_caregiver', q => q.eq('caregiverId', caregiverId)).unique();
    if (!family) return empty;
    const person = await ctx.db.query('people').withIndex('by_family', q => q.eq('familyId', family._id)).unique();
    if (!person) return empty;
    const patient = { id: person._id, name: person.name, relationship: person.relationship };
    const record = await ctx.db.query('healthRecords').withIndex('by_person', q => q.eq('personId', person._id)).unique();
    if (!record) return { ...empty, patient };
    const timeline = await ctx.db.query('healthTimelines').withIndex('by_record', q => q.eq('recordId', record._id)).unique();
    if (!timeline) return { ...empty, patient };
    const result = await ctx.db.query('healthEvents').withIndex('by_timeline_capture', q => q.eq('timelineId', timeline._id))
      .order('desc').paginate({ ...args.paginationOpts, maximumBytesRead: 400_000 });
    return { patient, page: result.page.map(event => ({ id: event._id, details: event.details, revision: event.revision ?? 0 })), isDone: result.isDone, continueCursor: result.continueCursor };
  },
});

export const correctUpdate = mutation({
  args: { id: v.id('healthEvents'), event: confirmedEvent, expectedRevision: v.number(), changeId: v.string() },
  returns: v.number(),
  handler: async (ctx, args) => {
    const caregiverId = await getAuthUserId(ctx);
    if (!caregiverId) throw new Error('Sign in before changing this update.');
    const saved = await ctx.db.get(args.id);
    if (!saved || saved.caregiverId !== caregiverId) throw new Error('This update is not available in your account.');
    if (!/^[a-f0-9-]{36}$/i.test(args.changeId)) throw new Error('Check the change before saving.');
    if (saved.lastChangeId === args.changeId) return saved.revision ?? 0;
    if ((saved.revision ?? 0) !== args.expectedRevision) throw new Error('This update changed elsewhere. Return to the timeline and open it again.');
    validateConfirmedEvent(args.event);
    const before = saved.details;
    for (const key of ['confirmationId', 'capturedAt', 'timeZone', 'source', 'originalText', 'aiInterpretation', 'clarifications'] as const) {
      if (JSON.stringify(before[key]) !== JSON.stringify(args.event[key])) throw new Error('The original capture cannot be changed.');
    }
    const allowed = [...(before.observations ?? []), ...(before.removedObservations ?? [])];
    for (const item of [...(args.event.observations ?? []), ...(args.event.removedObservations ?? [])]) {
      const original = allowed.find(old => old.id === item.id);
      if (before.observations ? !original || original.supportingWords !== item.supportingWords : item.supportingWords !== before.originalText) throw new Error('Keep the original supporting words.');
    }
    if (!args.event.observations?.length) throw new Error('Keep at least one detail, or delete the whole update.');
    const revision = (saved.revision ?? 0) + 1;
    await ctx.db.patch(saved._id, { details: { ...args.event, edited: true }, originalDetails: saved.originalDetails ?? before,
      revision, updatedAt: Date.now(), lastChangeId: args.changeId });
    return revision;
  },
});

export const deleteUpdate = mutation({
  args: { id: v.id('healthEvents'), expectedRevision: v.number() }, returns: v.null(),
  handler: async (ctx, args) => {
    const caregiverId = await getAuthUserId(ctx);
    if (!caregiverId) throw new Error('Sign in before deleting this update.');
    const saved = await ctx.db.get(args.id);
    if (!saved) return null; // A retry after successful deletion is safe.
    if (saved.caregiverId !== caregiverId) throw new Error('This update is not available in your account.');
    if ((saved.revision ?? 0) !== args.expectedRevision) throw new Error('This update changed elsewhere. Return to the timeline and open it again.');
    await ctx.db.delete(saved._id);
    return null;
  },
});

async function persistUpdate(ctx: MutationCtx, args: { patientId: import('./_generated/dataModel').Id<'people'>; event: Infer<typeof confirmedEvent> }) {
    const caregiverId = await getAuthUserId(ctx);
    if (!caregiverId) throw new Error('Sign in before saving this update.');
    const person = await ctx.db.get(args.patientId);
    const family = person ? await ctx.db.get(person.familyId) : null;
    if (!person || family?.caregiverId !== caregiverId) throw new Error('This patient is not available in your account.');
    validateConfirmedEvent(args.event);
    if (!args.event.observations?.length) throw new Error('Review the update before saving.');
    const record = await ctx.db.query('healthRecords').withIndex('by_person', q => q.eq('personId', person._id)).unique();
    const timeline = record ? await ctx.db.query('healthTimelines').withIndex('by_record', q => q.eq('recordId', record._id)).unique() : null;
    if (!timeline) throw new Error('We could not find your timeline.');
    const saved = await ctx.db.query('healthEvents').withIndex('by_caregiver_confirmation', q => q.eq('caregiverId', caregiverId).eq('details.confirmationId', args.event.confirmationId)).unique();
    if (saved) {
      if (saved.timelineId !== timeline._id) throw new Error('This update belongs to a different timeline.');
      return saved._id;
    }
    return await ctx.db.insert('healthEvents', { caregiverId, timelineId: timeline._id, details: args.event, confirmedAt: Date.now() });
}
export const addUpdate = mutation({
  args: { patientId: v.id('people'), event: confirmedEvent }, returns: v.id('healthEvents'), handler: persistUpdate,
});

function sameIdentity(left: {name:string;relationship:string}, right: {name:string;relationship:string}) {
  if ([left.name,left.relationship,right.name,right.relationship].some(value=>!value.trim() || value.length>500)) return false;
  const normalize = (value: string) => value.normalize('NFKC').trim().replace(/\s+/g, ' ').toLowerCase();
  return normalize(left.name) === normalize(right.name) && normalize(left.relationship) === normalize(right.relationship);
}
export const matchingPatient = query({
  args: { patient: saveArgs.patient },
  returns: v.union(v.null(), v.object({ id: v.id('people'), name: v.string(), relationship: v.string() })),
  handler: async (ctx,args) => {
    const caregiverId = await getAuthUserId(ctx);
    if (!caregiverId) throw new Error('Sign in before checking your record.');
    if (!args.patient.name.trim() || !args.patient.relationship.trim() || args.patient.name.length > 500 || args.patient.relationship.length > 500) throw new Error('Check the patient details.');
    const family = await ctx.db.query('families').withIndex('by_caregiver', q=>q.eq('caregiverId',caregiverId)).unique();
    const person = family ? await ctx.db.query('people').withIndex('by_family', q=>q.eq('familyId',family._id)).unique() : null;
    return person && sameIdentity(person,args.patient) ? {id:person._id,name:person.name,relationship:person.relationship} : null;
  },
});
export const saveMatchedUpdate = mutation({
  args: { patientId: v.id('people'), patient: saveArgs.patient, event: confirmedEvent, samePersonConfirmed: v.literal(true) },
  returns: v.id('healthEvents'),
  handler: async (ctx,args) => {
    const caregiverId = await getAuthUserId(ctx);
    if (!caregiverId) throw new Error('Sign in before saving this update.');
    const person = await ctx.db.get(args.patientId);
    const family = person ? await ctx.db.get(person.familyId) : null;
    if (!person || family?.caregiverId !== caregiverId || !sameIdentity(person,args.patient) || args.samePersonConfirmed !== true) throw new Error('Confirm the matching person before saving.');
    return await persistUpdate(ctx,args);
  },
});

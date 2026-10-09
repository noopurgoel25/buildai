import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { authTables } from "@convex-dev/auth/server";
import { confirmedEvent } from "./lib/healthEvent";

export default defineSchema({
  ...authTables,
  authVerifiers: authTables.authVerifiers.index('by_session', ['sessionId']),
  accountDeletions: defineTable({userId:v.id('users'),challengeId:v.string(),codeHash:v.string(),emailHash:v.string(),expiresAt:v.number(),failedAt:v.array(v.number()),deleting:v.boolean()}).index('by_user',['userId']),
  families: defineTable({ caregiverId: v.id("users") }).index("by_caregiver", ["caregiverId"]),
  people: defineTable({ familyId: v.id("families"), name: v.string(), relationship: v.string() }).index("by_family", ["familyId"]),
  healthRecords: defineTable({ personId: v.id("people") }).index("by_person", ["personId"]),
  healthTimelines: defineTable({ recordId: v.id("healthRecords") }).index("by_record", ["recordId"]),
  healthEvents: defineTable({ caregiverId: v.id("users"), timelineId: v.id("healthTimelines"), details: confirmedEvent, confirmedAt: v.number(),
    classificationVersion: v.optional(v.number()), originalDetails: v.optional(confirmedEvent), revision: v.optional(v.number()), updatedAt: v.optional(v.number()), lastChangeId: v.optional(v.string()) })
    .index("by_caregiver_confirmation", ["caregiverId", "details.confirmationId"])
    .index("by_classification", ["classificationVersion"])
    .index("by_timeline", ["timelineId"])
    .index("by_timeline_capture", ["timelineId", "details.capturedAt"]),
  loginEmailUsage: defineTable({ emailHash: v.string(), requestedAt: v.number() })
    .index("by_email_time", ["emailHash", "requestedAt"]).index("by_time", ["requestedAt"]),
  transcriptionUsage: defineTable({ hour: v.number(), count: v.number() }).index("by_hour", ["hour"]),
  interpretationUsage: defineTable({ requestedAt: v.number() }).index("by_requestedAt", ["requestedAt"]),
});

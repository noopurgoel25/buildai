import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

// Only request counts are stored here; no audio, text or patient information.
export default defineSchema({
  transcriptionUsage: defineTable({ hour: v.number(), count: v.number() }).index("by_hour", ["hour"]),
  interpretationUsage: defineTable({ requestedAt: v.number() }).index("by_requestedAt", ["requestedAt"]),
});

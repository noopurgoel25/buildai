import { v } from "convex/values";

export const interpretation = v.object({
  status: v.literal("ready"), event: v.string(), when: v.string(), evidence: v.string(),
  question: v.string(), message: v.string(),
});
export const confirmedEvent = v.object({
  confirmationId: v.string(), event: v.string(), when: v.string(),
  evidence: v.union(v.literal("Measured"), v.literal("Patient-reported"), v.literal("Caregiver-observed"), v.literal("Not specified")),
  source: v.union(v.literal("text"), v.literal("voice")), originalText: v.string(),
  edited: v.boolean(), aiInterpretation: v.union(interpretation, v.null()),
  clarifications: v.array(v.object({ question: v.string(), answer: v.string() })),
  capturedAt: v.number(), timeZone: v.string(),
});

export function validateConfirmedEvent(value: {
  confirmationId: string; event: string; when: string; originalText: string;
  aiInterpretation: { event: string; when: string; evidence: string; question: string; message: string } | null;
  clarifications: { question: string; answer: string }[]; capturedAt: number; timeZone: string;
}) {
  if (!/^[a-f0-9-]{36}$/i.test(value.confirmationId) ||
    [value.event, value.when, value.originalText].some(text => !text.trim() || text.length > 5000) ||
    value.clarifications.length > 20 || value.clarifications.some(item => !item.question.trim() || !item.answer.trim() || item.question.length > 5000 || item.answer.length > 1000) ||
    !Number.isFinite(value.capturedAt) || value.capturedAt <= 0 || value.capturedAt > Date.now() + 300_000 || value.timeZone.length > 100 ||
    (value.aiInterpretation && Object.values(value.aiInterpretation).some(text => typeof text !== "string" || text.length > 5000))) {
    throw new Error("Check the confirmed update before saving it.");
  }
  new Intl.DateTimeFormat("en-CA", { timeZone: value.timeZone });
}

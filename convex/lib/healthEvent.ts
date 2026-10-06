import { v, type Infer } from "convex/values";

export const observation = v.object({
  id: v.string(), event: v.string(), when: v.string(), supportingWords: v.string(),
  evidence: v.union(v.literal("Measured"), v.literal("Patient-reported"), v.literal("Caregiver-observed"), v.literal("Not specified")),
  polarity: v.union(v.literal("present"), v.literal("absent"), v.literal("uncertain")),
  timing: v.object({ date: v.union(v.string(), v.null()), time: v.union(v.string(), v.null()),
    precision: v.union(v.literal("exact"), v.literal("date"), v.literal("approximate"), v.literal("unknown")), resolved: v.boolean() }),
  confirmed: v.boolean(), edited: v.boolean(),
});

export const interpretation = v.object({
  status: v.literal("ready"), event: v.string(), when: v.string(), evidence: v.string(),
  question: v.string(), message: v.string(),
  observations: v.optional(v.array(observation)),
});
export const confirmedEvent = v.object({
  confirmationId: v.string(), event: v.string(), when: v.string(),
  evidence: v.union(v.literal("Measured"), v.literal("Patient-reported"), v.literal("Caregiver-observed"), v.literal("Not specified")),
  source: v.union(v.literal("text"), v.literal("voice")), originalText: v.string(),
  edited: v.boolean(), aiInterpretation: v.union(interpretation, v.null()),
  clarifications: v.array(v.object({ question: v.string(), answer: v.string() })),
  capturedAt: v.number(), timeZone: v.string(),
  observations: v.optional(v.array(observation)),
  removedObservations: v.optional(v.array(observation)),
});

export function validateConfirmedEvent(value: Infer<typeof confirmedEvent>) {
  if (!/^[a-f0-9-]{36}$/i.test(value.confirmationId) ||
    [value.event, value.when, value.originalText].some(text => !text.trim() || text.length > 5000) ||
    value.clarifications.length > 20 || value.clarifications.some(item => !item.question.trim() || !item.answer.trim() || item.question.length > 5000 || item.answer.length > 1000) ||
    !Number.isFinite(value.capturedAt) || value.capturedAt <= 0 || value.capturedAt > Date.now() + 300_000 || value.timeZone.length > 100 ||
    (value.aiInterpretation && ['event', 'when', 'evidence', 'question', 'message'].some(field => {
      const text = value.aiInterpretation![field as 'event']; return typeof text !== 'string' || text.length > 5000;
    }))) {
    throw new Error("Check the confirmed update before saving it.");
  }
  new Intl.DateTimeFormat("en-CA", { timeZone: value.timeZone });
  if (value.removedObservations && (value.removedObservations.length > 20 || value.removedObservations.some(item => !item.id || item.event.length > 5000 || item.when.length > 5000 || !item.supportingWords.trim() || !value.originalText.includes(item.supportingWords)))) throw new Error('Check the removed observations.');
  if (value.observations) {
    if (!value.observations.length || value.observations.length > 20 || new Set(value.observations.map(o => o.id)).size !== value.observations.length) throw new Error('Check the observations.');
    for (const item of value.observations) {
      const t = item.timing;
      if (!item.id || !item.confirmed || !t.resolved || !item.event.trim() || item.event.length > 5000 || item.when.length > 5000 ||
        !item.supportingWords.trim() || !value.originalText.includes(item.supportingWords) ||
        (t.date !== null && (!/^\d{4}-\d{2}-\d{2}$/.test(t.date) || !Number.isFinite(Date.parse(t.date)) || new Date(t.date).toISOString().slice(0,10) !== t.date)) ||
        (t.time !== null && !/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(t.time)) ||
        (t.precision === 'exact' && (!t.date || !t.time)) || (t.precision === 'date' && (!t.date || t.time)) ||
        (t.precision === 'unknown' && (t.date || t.time)) || (t.precision === 'approximate' && !item.when.trim())) throw new Error('Review and confirm every observation before saving.');
    }
  }
}

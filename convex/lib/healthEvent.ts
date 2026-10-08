import { v, type Infer } from "convex/values";

export const factType = v.union(...(['symptom', 'measurement', 'medication_change', 'doctor_visit', 'daily_wellbeing', 'appetite', 'other', 'pending'] as const).map(value => v.literal(value)));
export const classificationFields = {
  type: v.optional(factType), symptomName: v.optional(v.string()),
  measurement: v.optional(v.object({ kind: v.string(), value: v.string(), unit: v.string() })),
};
export type Classification = { type: 'symptom' | 'measurement' | 'medication_change' | 'doctor_visit' | 'daily_wellbeing' | 'appetite' | 'other' | 'pending'; symptomName?: string; measurement?: {kind:string;value:string;unit:string} };
export function classifyMetadata(raw: unknown, words: string): Classification {
  const item = raw as Record<string, unknown> | null;
  if (!item || !['symptom','measurement','medication_change','doctor_visit','daily_wellbeing','appetite','other'].includes(String(item.type))) return {type:'other'};
  const type = item.type as Classification['type'];
  if (type === 'symptom') {
    const name = typeof item.symptomName === 'string' ? item.symptomName.trim().toLowerCase() : '';
    const aliases: Record<string, RegExp> = {dizziness:/dizz|chakkar|चक्कर/iu, headache:/headache|head ache|sir dard|सिर दर्द/iu, cough:/cough|khansi|खांसी/iu, fever:/fever|bukhar|बुखार/iu, nausea:/nause|pukish|जी मिचल/iu, vomiting:/vomit|puke|उल्टी/iu, swelling:/swell|सूजन/iu};
    if (!name || name.length > 80 || !(aliases[name]?.test(words) || words.toLowerCase().includes(name))) return {type:'other'};
    return {type, symptomName:name};
  }
  if (type === 'measurement') {
    const m = item.measurement as Record<string, unknown> | null;
    const kinds: Record<string, RegExp> = {blood_pressure:/\bbp\b|blood pressure/i, temperature:/temperature/i, blood_glucose:/glucose|blood sugar/i, pulse:/pulse|heart rate/i, oxygen_saturation:/oxygen|spo2/i, weight:/weight/i};
    if (!m || typeof m.kind !== 'string' || !kinds[m.kind]?.test(words) || typeof m.value !== 'string' || !/\d/.test(m.value) || m.value.length > 40 || !words.includes(m.value) || typeof m.unit !== 'string' || m.unit.length > 20 || (m.unit && !words.toLowerCase().includes(m.unit.toLowerCase())) || /\b(?:dose|tablet|capsule|mg|mcg)\b/i.test(words)) return {type:'other'};
    return {type,measurement:{kind:m.kind,value:m.value,unit:m.unit}};
  }
  return {type};
}

// Labels are derived from words, never carried over after the words change.
export function labelsForSave<T extends {event:string; type?: Classification['type']; symptomName?:string; measurement?:Classification['measurement']; edited?:boolean}>(item:T, before?:T): T {
  const {type:_type,symptomName:_name,measurement:_measurement,...facts} = item;
  const label = before?.event === item.event && before.type ? classifySaved(before) : before || item.edited || !item.type ? {type:'pending' as const} : classifyMetadata(item,item.event);
  return {...facts,...label} as T;
}
function classifySaved(item: {event:string;type?:Classification['type'];symptomName?:string;measurement?:Classification['measurement']}): Classification {
  return item.type === 'pending' ? {type:'pending'} : classifyMetadata(item,item.event);
}

export const observation = v.object({
  ...classificationFields,
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
  ...classificationFields,
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

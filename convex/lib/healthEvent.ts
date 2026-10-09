import { v, type Infer } from "convex/values";

export const factType = v.union(...(['symptom', 'measurement', 'medication_change', 'doctor_visit', 'daily_wellbeing', 'appetite', 'other', 'pending'] as const).map(value => v.literal(value)));
export const classificationFields = {
  type: v.optional(factType), symptomName: v.optional(v.string()),
  measurement: v.optional(v.object({ kind: v.string(), value: v.string(), unit: v.string() })),
};
export type Classification = { type: 'symptom' | 'measurement' | 'medication_change' | 'doctor_visit' | 'daily_wellbeing' | 'appetite' | 'other' | 'pending'; symptomName?: string; measurement?: {kind:string;value:string;unit:string} };
export function classifyMetadata(raw: unknown, words: string, checkContext = true): Classification {
  const item = raw as Record<string, unknown> | null;
  if (!item || !['symptom','measurement','medication_change','doctor_visit','daily_wellbeing','appetite','other'].includes(String(item.type))) return {type:'other'};
  const type = item.type as Classification['type'];
  // A clearly named symptom alone cannot be accepted as general wellbeing.
  // A bad provider label falls back, rather than inventing its replacement.
  if (checkContext && type === 'daily_wellbeing' && /\bheartburn\b/i.test(words) && !/\b(?:sleep|slept|energy|tired|rest)\b/i.test(words)) return {type:'other'};
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

export function contextPolarity(words: string, suggested: 'present' | 'absent' | 'uncertain') {
  const reporting = /\b(?:not|never|didn['’]t|doesn['’]t)\s+report\b|\bno\s+(?:report|mention)|\bnot\s+reported\b/i.test(words);
  const unsureSymptom = /\b(?:not sure|unsure|uncertain)\b/i.test(words) && !/\b(?:day|date|time|when)\b/i.test(words);
  if (reporting || unsureSymptom || /\b(?:seems|seemed|maybe|might|perhaps)\b/i.test(words)) return 'uncertain';
  if (/\b(?:not|no)\s+(?:improv\w*|better|change\w*)|\bnot\s+(?:getting|feeling)\s+better/i.test(words)) return 'present';
  const meaning = words.replace(/\b(?:not sure|unsure|uncertain)\b.{0,40}\b(?:day|date|time|when)\b/gi, '');
  const denial = /\b(no|not|never|without|didn['’]t|doesn['’]t|wasn['’]t|weren['’]t|denied|denies|absent)\b|नहीं/iu.test(meaning);
  return denial ? 'absent' : suggested === 'absent' ? 'present' : suggested;
}

export const relatedGroup = v.object({observationIds:v.array(v.string()),supportingWords:v.string()});
export function safeRelatedGroups(raw: unknown, facts: {id:string;supportingWords:string;edited?:boolean}[], original: string) {
  if (!Array.isArray(raw) || raw.length > 10) return [];
  const seen = new Set<string>();
  const groups: {observationIds:string[];supportingWords:string}[] = [];
  for (const group of raw) {
    if (!group || !Array.isArray(group.observationIds) || group.observationIds.length < 2 || group.observationIds.length > 20 ||
      typeof group.supportingWords !== 'string' || !group.supportingWords || !original.includes(group.supportingWords) ||
      !/\b(?:after|before|but|with|alongside|followed|following|then)\b/i.test(group.supportingWords)) return [];
    for (const id of group.observationIds) {
      const fact = facts.find(fact => fact.id === id);
      if (!fact || fact.edited || seen.has(id) || !group.supportingWords.includes(fact.supportingWords)) return [];
      seen.add(id);
    }
    groups.push({observationIds:[...group.observationIds],supportingWords:group.supportingWords});
  }
  return groups;
}

// Labels are derived from words, never carried over after the words change.
export function labelsForSave<T extends {event:string; type?: Classification['type']; symptomName?:string; measurement?:Classification['measurement']; edited?:boolean}>(item:T, before?:T): T {
  const {type:_type,symptomName:_name,measurement:_measurement,...facts} = item;
  const label = before?.event === item.event && before.type ? classifySaved(before) : before || item.edited || !item.type ? {type:'pending' as const} : classifyMetadata(item,item.event);
  return {...facts,...label} as T;
}
function classifySaved(item: {event:string;type?:Classification['type'];symptomName?:string;measurement?:Classification['measurement']}): Classification {
  return item.type === 'pending' ? {type:'pending'} : classifyMetadata(item,item.event,false);
}

export const observation = v.object({
  ...classificationFields,
  id: v.string(), event: v.string(), when: v.string(), supportingWords: v.string(),
  evidence: v.union(v.literal("Measured"), v.literal("Patient-reported"), v.literal("Caregiver-observed"), v.literal("Not specified")),
  polarity: v.union(v.literal("present"), v.literal("absent"), v.literal("uncertain")),
  timing: v.object({ date: v.union(v.string(), v.null()), time: v.union(v.string(), v.null()),
    datePrecision:v.optional(v.union(v.literal('exact'),v.literal('approximate'),v.literal('unknown'))),
    timePrecision:v.optional(v.union(v.literal('exact'),v.literal('approximate'),v.literal('unknown'))),
    precision: v.union(v.literal("exact"), v.literal("date"), v.literal("approximate"), v.literal("unknown")), resolved: v.boolean() }),
  confirmed: v.boolean(), edited: v.boolean(),
});

export const interpretation = v.object({
  interpretationVersion:v.optional(v.string()), relatedGroups:v.optional(v.array(relatedGroup)),
  status: v.literal("ready"), event: v.string(), when: v.string(), evidence: v.string(),
  question: v.string(), message: v.string(),
  observations: v.optional(v.array(observation)),
});
export const confirmedEvent = v.object({
  interpretationVersion:v.optional(v.string()), relatedGroups:v.optional(v.array(relatedGroup)),
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
  if (value.interpretationVersion && (value.interpretationVersion.length > 80 || !/^[a-z0-9-]+$/.test(value.interpretationVersion))) throw new Error('Check the interpretation version.');
  if (value.relatedGroups?.length && safeRelatedGroups(value.relatedGroups,value.observations ?? [],value.originalText).length !== value.relatedGroups.length) throw new Error('Check the related details before saving.');
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
      if ((t.datePrecision === 'exact' && !t.date) || (t.datePrecision === 'unknown' && t.date) ||
        (t.timePrecision === 'exact' && !t.time) || (t.timePrecision === 'unknown' && t.time) ||
        (t.precision === 'exact' && ((t.datePrecision && t.datePrecision !== 'exact') || (t.timePrecision && t.timePrecision !== 'exact')))) throw new Error('Check the day and clock certainty.');
    }
  }
}

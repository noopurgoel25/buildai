export type Certainty = 'exact' | 'approximate' | 'unknown';
export type Timing = { date: string | null; time: string | null; precision: "exact" | "date" | "approximate" | "unknown"; resolved: boolean; datePrecision?: Certainty; timePrecision?: Certainty };

export function validDate(date: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(date) && Number.isFinite(Date.parse(date)) && new Date(date).toISOString().slice(0, 10) === date;
}

export function formatDate(date: string) {
  if (!validDate(date)) throw new Error('Invalid calendar date.');
  return `${date.slice(8,10)}/${date.slice(5,7)}/${date.slice(0,4)}`;
}

export function parseDisplayDate(value: string): string | null {
  const match = value.trim().match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!match) return null;
  const date = `${match[3]}-${match[2]}-${match[1]}`;
  return validDate(date) ? date : null;
}

export function localDate(capturedAt: number, zone: string) {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: zone, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(capturedAt);
  const part = (name: string) => parts.find(p => p.type === name)!.value;
  return `${part('year')}-${part('month')}-${part('day')}`;
}

export function timingCertainty(timing: Timing) {
  return {datePrecision: timing.datePrecision ?? (timing.date ? 'exact' : timing.precision === 'approximate' ? 'approximate' : 'unknown'),
    timePrecision: timing.timePrecision ?? (timing.time ? 'exact' : timing.precision === 'approximate' ? 'approximate' : 'unknown')} as const;
}

// Resolve the day and clock independently, always against the original capture.
export function resolveTiming(words: string, capturedAt: number, zone: string): Timing {
  const local = localDate(capturedAt, zone);
  const uncertainDay = /\b(?:sometime|last week)\b|\b(?:maybe|perhaps)\s+(?:today|yesterday|on\b)|\b(?:not sure|unsure|uncertain)\b.{0,40}\b(?:day|date|when)\b|\b(?:day|date|when)\b.{0,40}\b(?:not sure|unsure|uncertain)\b|\b(?:today|yesterday)\b.{0,15}\bor\b.{0,15}\b(?:today|yesterday|monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/i.test(words);
  const approximateClock = /\b(?:around|approximately|about|roughly|maybe|perhaps)\s+\d|\b(?:not sure|unsure|uncertain)\b.{0,30}\b(?:clock|time)\b/i.test(words);
  const relative = words.match(/\b(today|yesterday)\b/gi) || [];
  const dates = [...(words.match(/\b\d{4}-\d{2}-\d{2}\b/g) || []), ...(words.match(/\b\d{2}\/\d{2}\/\d{4}\b/g) || []).map(value => parseDisplayDate(value) || '')];
  let date: string | null = null;
  if (!uncertainDay && new Set(relative.map(w => w.toLowerCase())).size <= 1 && dates.length <= 1) {
    if (dates.length && validDate(dates[0]!)) date = dates[0]!;
    else if (relative.length) date = relative[0]!.toLowerCase() === 'today' ? local : new Date(Date.parse(`${local}T12:00:00Z`) - 86400000).toISOString().slice(0, 10);
    if (dates.length && relative.length) date = null; // Ask rather than reconcile conflicting statements.
  }
  const clocks = [...words.matchAll(/\b(\d{1,2})(?::(\d{2}))?\s*(a\.?m\.?|p\.?m\.?)\b/gi)];
  let time: string | null = null;
  if (clocks.length === 1 && !approximateClock) {
    const [, h, m = '00', period] = clocks[0];
    if (+h >= 1 && +h <= 12 && +m <= 59) time = `${String(+h % 12 + (/p/i.test(period) ? 12 : 0)).padStart(2, '0')}:${m}`;
  }
  const evening = words.match(/\b(\d{1,2})(?::(\d{2}))?\s+(?:in (?:the )?|this )?(morning|evening|afternoon|night)\b/i);
  const military = words.match(/\b([01]\d|2[0-3]):([0-5]\d)\b/);
  if (!time && !approximateClock && evening && +evening[1] >= 1 && +evening[1] <= 12) time = `${String(+evening[1]%12 + (/morning/i.test(evening[3]) ? 0 : 12)).padStart(2,'0')}:${evening[2] || '00'}`;
  if (!time && !approximateClock && clocks.length === 0 && military) time = `${military[1]}:${military[2]}`;
  const unknown = /^(?:not specified|unknown)?$/i.test(words.trim());
  const vagueClock = approximateClock || /\b(?:morning|afternoon|evening|night|lunch|dinner)\b/i.test(words) || clocks.length > 1;
  return { date, time, precision: date ? time ? 'exact' : 'date' : unknown ? 'unknown' : 'approximate', resolved: Boolean(date),
    datePrecision: date ? 'exact' : unknown ? 'unknown' : 'approximate', timePrecision: time ? 'exact' : vagueClock ? 'approximate' : 'unknown' };
}

export function timingLabel(when: string, timing: Timing) {
  if (timing.precision === 'unknown') return 'Unknown';
  const clockWords = when.replace(/\b(?:today|yesterday)\b/gi,'').trim();
  if (timing.date) return `${timingCertainty(timing).datePrecision === 'approximate' ? 'Around ' : ''}${formatDate(timing.date)}${timing.time ? ` at ${timingCertainty(timing).timePrecision === 'approximate' ? 'around ' : ''}${timing.time}` : clockWords && !/^(?:not specified|\d{4}-\d{2}-\d{2}|\d{2}\/\d{2}\/\d{4})$/i.test(clockWords) && !/\b(or|last week|sometime|not sure|unsure)\b/i.test(clockWords) ? ` · ${clockWords}` : ''}`;
  if(timing.time && /^(?:not specified|unknown)?$/i.test(when.trim()))return `Day not known · at ${timingCertainty(timing).timePrecision === 'approximate' ? 'around ' : ''}${timing.time}`;
  return when;
}

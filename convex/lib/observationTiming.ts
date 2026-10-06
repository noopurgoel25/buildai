export type Timing = { date: string | null; time: string | null; precision: "exact" | "date" | "approximate" | "unknown"; resolved: boolean };

export function validDate(date: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(date) && Number.isFinite(Date.parse(date)) && new Date(date).toISOString().slice(0, 10) === date;
}

// Only resolve unambiguous calendar words. Preserve everything else for review.
export function resolveTiming(words: string, capturedAt: number, zone: string): Timing {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: zone, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(capturedAt);
  const part = (name: string) => parts.find(p => p.type === name)!.value;
  const local = `${part('year')}-${part('month')}-${part('day')}`;
  const uncertain = /\b(?:or|sometime|last week|not sure|unsure|maybe|around|approximately)\b/i.test(words);
  const relative = words.match(/\b(today|yesterday)\b/gi) || [];
  const dates = words.match(/\b\d{4}-\d{2}-\d{2}\b/g) || [];
  let date: string | null = null;
  if (!uncertain && new Set(relative.map(w => w.toLowerCase())).size <= 1 && dates.length <= 1) {
    if (dates.length && validDate(dates[0]!)) date = dates[0]!;
    else if (relative.length) date = relative[0]!.toLowerCase() === 'today' ? local : new Date(Date.parse(`${local}T12:00:00Z`) - 86400000).toISOString().slice(0, 10);
    if (dates.length && relative.length) date = null; // Ask rather than reconcile conflicting statements.
  }
  const clocks = [...words.matchAll(/\b(\d{1,2})(?::(\d{2}))?\s*(a\.?m\.?|p\.?m\.?)\b/gi)];
  let time: string | null = null;
  if (clocks.length === 1 && !uncertain) {
    const [, h, m = '00', period] = clocks[0];
    if (+h >= 1 && +h <= 12 && +m <= 59) time = `${String(+h % 12 + (/p/i.test(period) ? 12 : 0)).padStart(2, '0')}:${m}`;
  }
  const evening = words.match(/\b(\d{1,2})(?::(\d{2}))?\s+(?:in (?:the )?|this )?(morning|evening|afternoon|night)\b/i);
  const military = words.match(/\b([01]\d|2[0-3]):([0-5]\d)\b/);
  if (!time && !uncertain && evening && +evening[1] >= 1 && +evening[1] <= 12) time = `${String(+evening[1]%12 + (/morning/i.test(evening[3]) ? 0 : 12)).padStart(2,'0')}:${evening[2] || '00'}`;
  if (!time && !uncertain && military) time = `${military[1]}:${military[2]}`;
  return { date, time, precision: date ? time ? 'exact' : 'date' : /^(?:not specified|unknown)?$/i.test(words.trim()) ? 'unknown' : 'approximate', resolved: Boolean(date) };
}

export function timingLabel(when: string, timing: Timing) {
  if (timing.precision === 'unknown') return 'Unknown';
  if (timing.date) return `${timing.date}${timing.time ? ` at ${timing.time}` : when && !/^(today|yesterday|not specified)$/i.test(when) && !/\b(or|last week|sometime|not sure|unsure)\b/i.test(when) ? ` · ${when}` : ''}`;
  return when;
}

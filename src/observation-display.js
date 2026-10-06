import { timingLabel } from '../convex/lib/observationTiming.ts';
export const escape = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]));
export function captureLabel(event) {
  return new Intl.DateTimeFormat('en-GB', { timeZone: event.timeZone, dateStyle: 'medium', timeStyle: 'long' }).format(event.capturedAt) + ` (${event.timeZone})`;
}
export function observationDetails(item) {
  return `<dl><dt>What happened</dt><dd>${escape(item.event)}</dd><dt>When it happened</dt><dd>${escape(timingLabel(item.when, item.timing))}</dd><dt>Evidence</dt><dd>${escape(item.evidence)}</dd><dt>Observation</dt><dd>${escape({present:'Explicitly present', absent:'Explicitly absent', uncertain:'Uncertain'}[item.polarity])}</dd></dl>${item.edited ? '<p class="hint">Edited by you.</p>' : ''}`;
}
export function savedObservationDetails(event) {
  return (event.observations ? event.observations.map((o,i) => `<section class="observation"><h3>Observation ${i+1}</h3>${observationDetails(o)}</section>`).join('') : `<dl><dt>What happened</dt><dd>${escape(event.event)}</dd><dt>When it happened</dt><dd>${escape(event.when)}</dd><dt>Evidence</dt><dd>${escape(event.evidence)}</dd></dl>`) + `<p class="hint">Captured on ${escape(captureLabel(event))}</p>${!event.observations && event.source === 'voice' ? '<p class="hint">Older entry: capture time was recorded after transcription.</p>' : ''}`;
}

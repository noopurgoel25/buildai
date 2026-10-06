import { timingLabel } from '../convex/lib/observationTiming.ts';
export const escape = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]));
export function captureLabel(event) {
  return new Intl.DateTimeFormat('en-GB', { timeZone: event.timeZone, dateStyle: 'medium', timeStyle: 'long' }).format(event.capturedAt) + ` (${event.timeZone})`;
}
export function observationDetails(item) {
  return `<dl><dt>What happened</dt><dd>${escape(item.event)}</dd><dt>When it happened</dt><dd>${escape(timingLabel(item.when, item.timing))}</dd><dt>Evidence</dt><dd>${escape(item.evidence)}</dd><dt>Observation</dt><dd>${escape({present:'Explicitly present', absent:'Explicitly absent', uncertain:'Uncertain'}[item.polarity])}</dd></dl>${item.edited ? '<p class="hint">Edited by you.</p>' : ''}`;
}
export function savedObservationDetails(event) {
  return updateFacts(event) + recordDetails(event);
}

export function updateFacts(event, editable = false) {
  const items = event.observations || [{ event: event.event, when: event.when, evidence: event.evidence }];
  return `<ul class="update-facts">${items.map((item, index) => `<li><div><p class="fact-text">${escape(item.event)}</p><p class="fact-time">${escape(occurrenceLabel(item))}</p></div>${editable ? `<button class="text-action" type="button" data-edit="${escape(item.id)}" aria-label="Change detail ${index + 1}">Change</button>` : ''}</li>`).join('')}</ul>`;
}

function occurrenceLabel(item) {
  if (!item.timing) return item.when;
  if (item.timing.precision === 'unknown') return 'Timing not known';
  const label = timingLabel(item.when, item.timing);
  if (!item.timing.date) return label;
  const date = new Intl.DateTimeFormat('en-GB', {day:'numeric',month:'short',year:'numeric',timeZone:'UTC'}).format(new Date(`${item.timing.date}T12:00:00Z`));
  return label.replace(item.timing.date, date);
}

export function recordDetails(event) {
  const original = event.originalText || event.text;
  return `<details class="record-details"><summary>Record details</summary>
    <p class="hint">Captured on ${escape(captureLabel(event))}</p>
    ${!event.observations && event.source === 'voice' ? '<p class="hint">Older entry: capture time was recorded after transcription.</p>' : ''}
    ${event.observations ? event.observations.map((item, index) => `<div class="detail-evidence"><h3>Detail ${index + 1}</h3>${observationDetails(item)}<p class="hint">Supporting words: ${escape(item.supportingWords)}</p></div>`).join('') : `<p class="hint">Source: ${escape(event.evidence)}</p>`}
    ${original ? `<details><summary>Your original update</summary><p class="original-update">${escape(original)}</p></details>` : ''}
    ${event.clarifications?.length ? `<details><summary>Your clarification</summary>${event.clarifications.map(item => `<p>${escape(item.question)}</p><p class="original-update">${escape(item.answer)}</p>`).join('')}</details>` : ''}
  </details>`;
}

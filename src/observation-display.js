import { timingLabel, formatDate, localDate, timingCertainty } from '../convex/lib/observationTiming.ts';
import { connectedFacts } from './observation-groups.js';
export const escape = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]));
export function captureLabel(event) {
  return `${formatDate(localDate(event.capturedAt,event.timeZone))}, ${new Intl.DateTimeFormat('en-GB', { timeZone: event.timeZone, hour:'2-digit',minute:'2-digit',second:'2-digit',timeZoneName:'short',hourCycle:'h23' }).format(event.capturedAt)} (${event.timeZone})`;
}
export function classificationLabel(item) {
  const names={symptom:'Symptom',measurement:'Measurement',medication_change:'Medication change',doctor_visit:'Doctor visit',daily_wellbeing:'Daily wellbeing',appetite:'Appetite',other:'Other'};
  if(item.type==='pending')return 'being sorted'+String.fromCharCode(8212)+'it will appear here shortly.';
  if(!item.type)return '';
  const detail=item.type==='symptom'?item.symptomName:item.type==='measurement'&&item.measurement?[item.measurement.kind.replaceAll('_',' '),item.measurement.value,item.measurement.unit].filter(Boolean).join(' '):'';
  return (names[item.type]||'Other')+(detail?' '+String.fromCharCode(183)+' '+detail:'');
}
function recordedAs(item){const label=classificationLabel(item);return label?`<dt>Recorded as</dt><dd>${escape(label)}</dd>`:'';}
export function observationDetails(item) {
  return `<dl>${recordedAs(item)}<dt>Evidence</dt><dd>${escape(item.evidence)}</dd><dt>Observation</dt><dd>${escape({present:'Explicitly present', absent:'Explicitly absent', uncertain:'Uncertain'}[item.polarity])}</dd></dl>${item.edited ? '<p class="hint">Edited by you.</p>' : ''}`;
}
export function savedObservationDetails(event) {
  return updateFacts(event) + recordDetails(event);
}

export function updateFacts(event, editable = false) {
  const items = event.observations || [{ event: event.event, when: event.when, evidence: event.evidence }];
  const fact = item => `<li><div><p class="fact-text">${escape(item.event)}</p><p class="fact-time">${escape(occurrenceLabel(item))}</p></div>${editable ? `<button class="text-action" type="button" data-edit="${escape(item.id)}" aria-label="Change detail ${items.indexOf(item) + 1}">Change</button>` : ''}</li>`;
  return `<ul class="update-facts">${connectedFacts(event).map(group => group.related ? `<li class="connected-facts"><section aria-label="Connected details"><div class="connection-heading"><h3>Connected details</h3><p>${escape(occurrenceRange(group.items))}</p></div><ul class="update-facts connected-detail-list">${group.items.map(fact).join('')}</ul></section></li>` : fact(group.items[0])).join('')}</ul>`;
}

export function occurrenceRange(items) {
  const dated = items.filter(item => item.timing?.date && timingCertainty(item.timing).datePrecision === 'exact');
  const dates = [...new Set(dated.map(item => item.timing.date))].sort();
  if (!dates.length) return 'Timing not known';
  const range = dates.length === 1 ? formatDate(dates[0]) : `${formatDate(dates[0])} to ${formatDate(dates.at(-1))}`;
  return range + (dated.length < items.length ? ' · some timing not known' : '');
}

export function updatePreviewTiming(event) {
  const first = connectedFacts(event)[0];
  return first.related ? occurrenceRange(first.items) : occurrenceLabel(first.items[0]);
}

export function occurrenceLabel(item) {
  if (!item.timing) return item.when;
  if (item.timing.precision === 'unknown') return 'Timing not known';
  return timingLabel(item.when, item.timing);
}

export function recordDetails(event) {
  const original = event.originalText || event.text;
  return `<p class="capture-origin hint">Captured on ${escape(captureLabel(event))}</p><details class="record-details"><summary>Record details</summary>
    ${!event.observations && event.source === 'voice' ? '<p class="hint">Older entry: capture time was recorded after transcription.</p>' : ''}
    ${event.observations ? event.observations.map((item, index) => `<div class="detail-evidence"><h3>Detail ${index + 1}</h3>${observationDetails(item)}<p class="hint">Supporting words: ${escape(item.supportingWords)}</p></div>`).join('') : `<dl>${recordedAs(event)}</dl><p class="hint">Source: ${escape(event.evidence)}</p>`}
    ${original ? `<details><summary>Your original update</summary><p class="original-update">${escape(original)}</p></details>` : ''}
    ${event.clarifications?.length ? `<details><summary>Your clarification</summary>${event.clarifications.map(item => `<p>${escape(item.question)}</p><p class="original-update">${escape(item.answer)}</p>`).join('')}</details>` : ''}
  </details>`;
}

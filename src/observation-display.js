import { timingLabel, formatDate, localDate } from '../convex/lib/observationTiming.ts';
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
  return `<dl>${recordedAs(item)}<dt>What happened</dt><dd>${escape(item.event)}</dd><dt>When it happened</dt><dd>${escape(timingLabel(item.when, item.timing))}</dd><dt>Evidence</dt><dd>${escape(item.evidence)}</dd><dt>Observation</dt><dd>${escape({present:'Explicitly present', absent:'Explicitly absent', uncertain:'Uncertain'}[item.polarity])}</dd></dl>${item.edited ? '<p class="hint">Edited by you.</p>' : ''}`;
}
export function savedObservationDetails(event) {
  return updateFacts(event) + recordDetails(event);
}

export function updateFacts(event, editable = false) {
  const items = event.observations || [{ event: event.event, when: event.when, evidence: event.evidence }];
  return `<ul class="update-facts">${items.map((item, index) => `<li><div><p class="fact-text">${escape(item.event)}</p><p class="fact-time">${escape(occurrenceLabel(item))}</p></div>${editable ? `<button class="text-action" type="button" data-edit="${escape(item.id)}" aria-label="Change detail ${index + 1}">Change</button>` : ''}</li>`).join('')}</ul>`;
}

export function occurrenceLabel(item) {
  if (!item.timing) return item.when;
  if (item.timing.precision === 'unknown') return 'Timing not known';
  return timingLabel(item.when, item.timing);
}

export function recordDetails(event) {
  const original = event.originalText || event.text;
  return `<details class="record-details"><summary>Record details</summary>
    <p class="hint">Captured on ${escape(captureLabel(event))}</p>
    ${!event.observations && event.source === 'voice' ? '<p class="hint">Older entry: capture time was recorded after transcription.</p>' : ''}
    ${event.observations ? event.observations.map((item, index) => `<div class="detail-evidence"><h3>Detail ${index + 1}</h3>${observationDetails(item)}<p class="hint">Supporting words: ${escape(item.supportingWords)}</p></div>`).join('') : `<dl>${recordedAs(event)}</dl><p class="hint">Source: ${escape(event.evidence)}</p>`}
    ${original ? `<details><summary>Your original update</summary><p class="original-update">${escape(original)}</p></details>` : ''}
    ${event.clarifications?.length ? `<details><summary>Your clarification</summary>${event.clarifications.map(item => `<p>${escape(item.question)}</p><p class="original-update">${escape(item.answer)}</p>`).join('')}</details>` : ''}
  </details>`;
}

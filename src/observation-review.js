import { escape, observationDetails, captureLabel } from './observation-display.js';
import { validDate } from '../convex/lib/observationTiming.ts';
import { createRecordId } from './record-id.js';

export function mountObservationReview(root, draft, onConfirm, onReturn) {
  const items = draft.interpretation.observations;
  let error = '';
  function changed(item) { item.confirmed = false; draft.confirmed = null; }
  function draw() {
    const firstUnresolved = items.find(item => !item.timing.resolved);
    const sharedDateItems = items.filter(item => !item.timing.resolved && !/\b(or|not sure|unsure)\b/i.test(item.when));
    root.innerHTML = `<div class="capture-result"><h2 tabindex="-1">Here’s what I understood</h2>
      <p>Review and confirm each observation. Nothing has been saved.</p>
      <p class="hint">Captured on ${escape(captureLabel(draft))}</p>
      ${items.map((item,i) => `<section class="observation" aria-label="Observation ${i+1}"><h3>Observation ${i+1}</h3>
        ${observationDetails(item)}
        ${!item.timing.resolved && item === firstUnresolved ? `<p class="hint">${/not specified/i.test(item.when) ? 'When did this happen?' : 'Which day did this happen? You can keep approximate timing if you don’t remember.'}</p>
          ${/\b(or|not sure|unsure)\b/i.test(item.when) ? '<p>These time words conflict or are uncertain. Edit this observation to choose the date and time you know, or explicitly keep the uncertainty below.</p>' : `<form data-timing="${item.id}" novalidate><label for="day-${item.id}">Date for observation ${i+1}</label><input id="day-${item.id}" type="date" value="${escape(item.dayDraft || '')}">${sharedDateItems.length>1 ? `<label class="shared-date"><input type="checkbox" name="shared-date"> Use this date for observations ${sharedDateItems.map(o=>items.indexOf(o)+1).join(' and ')}</label>` : ''}<button class="secondary" type="submit">Use this date</button></form>`}
          ${!/not specified|^unknown$/i.test(item.when) ? `<button class="secondary" data-approximate="${item.id}" type="button">Keep approximate timing</button>` : ''}
          <button class="secondary" data-unknown="${item.id}" type="button">I don’t remember</button>` : ''}
        <p class="hint">${item.confirmed ? 'Confirmed by you.' : 'Not confirmed yet.'}</p>
        <button class="primary" data-confirm="${item.id}" type="button" ${item.confirmed || !item.timing.resolved ? 'disabled' : ''}>Confirm observation ${i+1}</button>
        <button class="secondary" data-edit="${item.id}" type="button">Edit observation ${i+1}</button>
        <button class="secondary" data-remove="${item.id}" type="button">Remove from this update</button>
      </section>`).join('')}
      ${error ? `<p class="error" role="alert">${escape(error)}</p>` : ''}
      <details><summary>Your original update</summary><p class="original-update">${escape(draft.originalText || draft.text)}</p></details>
      ${draft.interpretation.manual ? `<button class="secondary" id="add-observation" type="button" ${items.length >= 20 ? 'disabled' : ''}>Add observation from your update</button>` : ''}
      <button class="primary" id="save-update" type="button" ${!items.length || items.some(o => !o.confirmed || !o.timing.resolved) ? 'disabled' : ''}>Save update</button>
      <button class="secondary" id="return-capture" type="button">Return to capture</button></div>`;
    const find = id => items.find(o => o.id === id);
    root.querySelectorAll('[data-confirm]').forEach(b => b.onclick = () => { const item = find(b.dataset.confirm); if (item.timing.resolved) item.confirmed = true; error=''; draw(); });
    root.querySelectorAll('[data-remove]').forEach(b => b.onclick = () => {
      const index = items.findIndex(o => o.id === b.dataset.remove);
      (draft.removedObservations ||= []).push(structuredClone(items[index])); items.splice(index,1); draft.confirmed=null;
      if (!items.length) { draft.interpretation=null; onReturn(); } else draw();
    });
    root.querySelectorAll('[data-timing]').forEach(form => {
      const item = find(form.dataset.timing), input = form.querySelector('input');
      input.oninput = () => { item.dayDraft=input.value; };
      form.onsubmit = e => { e.preventDefault(); if (!validDate(input.value)) { error='Choose a valid date, or choose “I don’t remember”.'; draw(); return; }
        const selected = form.querySelector('[name="shared-date"]')?.checked ? sharedDateItems : [item];
        for(const target of selected) { changed(target); target.timing={...target.timing,date:input.value,precision:target.timing.time?'exact':'date',resolved:true};
          recordAnswer(target, selected.length>1 ? `Which day did observations ${selected.map(o=>items.indexOf(o)+1).join(' and ')} happen?` : 'Which day did this observation happen?', input.value); delete target.dayDraft; }
        error=''; draw(); };
    });
    root.querySelectorAll('[data-unknown]').forEach(b => b.onclick = () => { const item=find(b.dataset.unknown); changed(item); item.timing={date:null,time:null,precision:'unknown',resolved:true}; recordAnswer(item,'When did this observation happen?','I don’t remember'); error=''; draw(); });
    root.querySelectorAll('[data-approximate]').forEach(b => b.onclick = () => { const item=find(b.dataset.approximate); changed(item); item.timing={date:null,time:item.timing.time,precision:'approximate',resolved:true}; recordAnswer(item,'Keep this approximate timing?',item.when); error=''; draw(); });
    root.querySelectorAll('[data-edit]').forEach(b => b.onclick = () => edit(find(b.dataset.edit)));
    root.querySelector('#save-update').onclick = () => { if (items.length && items.every(o => o.confirmed && o.timing.resolved)) onConfirm(); };
    root.querySelector('#return-capture').onclick = onReturn;
    root.querySelector('#add-observation')?.addEventListener('click', () => {
      const item={id:createRecordId(),event:'',when:'Not specified',supportingWords:draft.originalText || draft.text,evidence:'Not specified',polarity:'uncertain',timing:{date:null,time:null,precision:'unknown',resolved:true},confirmed:false,edited:true};
      items.push(item); draft.confirmed=null; edit(item);
    });
  }
  function recordAnswer(item, question, answer) {
    (draft.clarifications ||= []).push({question:`For “${item.supportingWords.slice(0,120)}”: ${question}`,answer});
  }
  function edit(item) {
    const saved = draft.observationEdit?.id === item.id ? draft.observationEdit : structuredClone(item);
    draft.observationEdit=saved;
    root.innerHTML = `<div class="capture-result"><h2>Edit observation</h2><form novalidate>
      <label for="observation-text">What happened</label><textarea id="observation-text" maxlength="5000">${escape(saved.event)}</textarea>
      <label for="observation-when">Timing words</label><input id="observation-when" maxlength="5000" value="${escape(saved.when)}">
      <label for="observation-date">Event date</label><input id="observation-date" type="date" value="${escape(saved.timing.date || '')}">
      <label for="observation-time">Exact time, if known</label><input id="observation-time" type="time" value="${escape(saved.timing.time || '')}">
      <label for="observation-precision">How certain is the timing?</label><select id="observation-precision">${['exact','date','approximate','unknown'].map(p => `<option value="${p}" ${saved.timing.precision===p?'selected':''}>${{exact:'Exact date and time',date:'Known date; clock time not known',approximate:'Approximate timing',unknown:'I don’t remember'}[p]}</option>`).join('')}</select>
      <label for="observation-evidence">How do you know?</label><select id="observation-evidence">${['Not specified','Measured','Patient-reported','Caregiver-observed'].map(p => `<option ${p===saved.evidence?'selected':''}>${p}</option>`).join('')}</select>
      <label for="observation-polarity">What was explicitly stated?</label><select id="observation-polarity">${['present','absent','uncertain'].map(p => `<option value="${p}" ${p===saved.polarity?'selected':''}>${{present:'Present',absent:'Absent',uncertain:'Uncertain'}[p]}</option>`).join('')}</select>
      ${error ? `<p class="error" role="alert">${escape(error)}</p>` : ''}<button class="primary" type="submit">Apply changes</button><button class="secondary" id="cancel" type="button">Cancel editing</button></form><p class="hint">You’ll confirm this observation again after editing.</p></div>`;
    const read = () => { saved.event=root.querySelector('#observation-text').value; saved.when=root.querySelector('#observation-when').value;
      saved.evidence=root.querySelector('#observation-evidence').value; saved.polarity=root.querySelector('#observation-polarity').value;
      saved.timing={date:root.querySelector('#observation-date').value || null,time:root.querySelector('#observation-time').value || null,precision:root.querySelector('#observation-precision').value,resolved:true}; };
    root.querySelector('form').oninput=read;
    root.querySelector('form').onsubmit=e => {e.preventDefault(); read(); const t=saved.timing;
      if (!saved.event.trim() || (t.date && !validDate(t.date)) || (t.precision==='exact' && (!t.date || !t.time)) || (t.precision==='date' && !t.date) || (t.precision==='approximate' && !saved.when.trim())) {error='Check the description and timing before applying changes.'; edit(item); return;}
      if(t.precision==='unknown') {t.date=null;t.time=null;} if(t.precision==='date') t.time=null;
      Object.assign(item,saved,{confirmed:false,edited:true}); draft.confirmed=null; draft.observationEdit=null; error=''; draw(); };
    root.querySelector('#cancel').onclick=()=>{if(!item.event.trim()) items.splice(items.indexOf(item),1);draft.observationEdit=null;error='';draw();};
    root.querySelector('h2').focus();
  }
  if (draft.observationEdit) edit(items.find(o => o.id === draft.observationEdit.id)); else draw();
}

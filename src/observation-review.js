import { escape, updateFacts, recordDetails } from './observation-display.js';
import { validDate, resolveTiming, formatDate, parseDisplayDate, timingCertainty } from '../convex/lib/observationTiming.ts';
import { dateInput, bindDateInput } from './date-input.js';
import { createRecordId } from './record-id.js';
import { track } from './analytics.js';

export function mountObservationReview(root, draft, onConfirm, onReturn) {
  const items = draft.interpretation.observations;
  let error = '';
  function changed(item) { item.confirmed = false; draft.confirmed = null; }
  function draw() {
    const first = items.find(item => !item.timing.resolved);
    if(first && !draft.savedEdit && !draft.analyticsClarifications?.includes(first.id)){(draft.analyticsClarifications ||= []).push(first.id);track('clarification_asked');}
    const shared = items.filter(item => !item.timing.resolved && !/\b(or|not sure|unsure)\b/i.test(item.when));
    const details = recordDetails({...draft, observations:items});
    root.innerHTML = first ? `<div class="capture-result timing-question">
      <h2 tabindex="-1">A little more about the timing</h2>
      <blockquote>${escape(first.event)}</blockquote>
      <p>${/not specified/i.test(first.when) ? 'When did this happen?' : `You mentioned “${escape(first.when)}”. Which day was that?`}</p>
      <p class="hint">It’s okay if you don’t remember exactly.</p>
      ${shared.includes(first) && shared.length > 1 ? `<label class="shared-date"><input type="checkbox" id="shared-date" ${draft.sharedDateForId === first.id && draft.sharedDateSelected ? 'checked' : ''}><span class="shared-date-content"><span class="shared-date-title">Use the day I choose for these details:</span><span class="shared-date-details">${shared.map(item=>`“${escape(item.event)}”`).join('<br>')}</span></span></label>` : ''}
      <div class="date-choices"><button class="secondary" data-day="today" type="button">Today</button><button class="secondary" data-day="yesterday" type="button">Yesterday</button></div>
      <button class="secondary" id="choose-date" type="button">Choose a date</button>
      <form id="date-form" novalidate ${first.choosingDate ? '' : 'hidden'}><label for="event-day">Date for this detail</label>${dateInput('event-day',first.dayDraft || '')}<button class="primary" type="submit">Use this date</button></form>
      ${!/not specified|^unknown$/i.test(first.when) ? '<button class="text-action" id="keep-approximate" type="button">Keep the timing as written</button>' : ''}
      <button class="text-action" id="unknown-time" type="button">I’m not sure</button>
      ${error ? `<p class="error" role="alert">${escape(error)}</p>` : ''}
      ${details}<button class="text-action" id="return-capture" type="button">Return to capture</button></div>` : `<div class="capture-result review-update">
      <h2 tabindex="-1">Does this look right?</h2><p class="review-intro">${draft.savedEdit ? 'Review your corrections before saving.' : 'Check the details before you continue.'}</p>
      <div class="review-surface">${updateFacts({observations:items},true)}</div>
      ${error ? `<p class="error" role="alert">${escape(error)}</p>` : ''}
      ${details}
      ${draft.interpretation.manual ? `<button class="text-action" id="add-observation" type="button" ${items.length >= 20 ? 'disabled' : ''}>Add a detail from your update</button>` : ''}
      <div class="flow-actions"><button class="primary" id="confirm-update" type="button" ${!items.length ? 'disabled' : ''}>${draft.savedEdit ? 'Save changes' : (draft.saveDirectly || draft.existingPatient) ? 'Save update' : 'Yes, continue'}</button><p class="hint">${draft.savedEdit ? 'Your changes haven&#8217;t been saved yet.' : 'This update hasn&#8217;t been saved yet.'}</p><button class="text-action" id="return-capture" type="button">${draft.savedEdit ? 'Cancel changes' : 'Return to capture'}</button></div></div>`;
    if (first) {
      root.querySelector('#shared-date')?.addEventListener('change', event => { draft.sharedDateForId=first.id; draft.sharedDateSelected=event.target.checked; });
      function setDate(date) {
        const selected=root.querySelector('#shared-date')?.checked ? shared : [first];
        for(const target of selected) {
          changed(target); target.timing={...target.timing,date,datePrecision:'exact',timePrecision:timingCertainty(target.timing).timePrecision,precision:target.timing.time?(timingCertainty(target.timing).timePrecision==='approximate'?'approximate':'exact'):'date',resolved:true};
          recordAnswer(target,'Which day did this detail happen?',date); delete target.dayDraft; delete target.choosingDate;
        }
        draft.sharedDateSelected=false; draft.sharedDateForId=null;
        error=''; draw(); root.querySelector('h2')?.focus();
      }
      root.querySelectorAll('[data-day]').forEach(button=>button.onclick=()=>setDate(resolveTiming(button.dataset.day,draft.capturedAt,draft.timeZone).date));
      root.querySelector('#choose-date').onclick=()=>{first.choosingDate=true; draw();root.querySelector('#event-day').focus();};
      const input=root.querySelector('#event-day'); bindDateInput(input,()=>{first.dayDraft=input.value;});
      root.querySelector('#date-form').onsubmit=event=>{event.preventDefault();const date=parseDisplayDate(input.value);if(!date){error='Enter a valid date as DD/MM/YYYY, or select “I’m not sure”.';draw();return;}setDate(date);};
      root.querySelector('#unknown-time').onclick=()=>{changed(first);first.timing={date:null,time:first.timing.time,precision:first.timing.time?'approximate':'unknown',datePrecision:'unknown',timePrecision:first.timing.time?timingCertainty(first.timing).timePrecision:'unknown',resolved:true};delete first.choosingDate;delete first.dayDraft;draft.sharedDateSelected=false;draft.sharedDateForId=null;recordAnswer(first,'When did this detail happen?',"I’m not sure");error='';draw();root.querySelector('h2')?.focus();};
      root.querySelector('#keep-approximate')?.addEventListener('click',()=>{changed(first);first.timing={date:null,time:first.timing.time,precision:'approximate',datePrecision:'approximate',timePrecision:timingCertainty(first.timing).timePrecision,resolved:true};delete first.choosingDate;delete first.dayDraft;draft.sharedDateSelected=false;draft.sharedDateForId=null;recordAnswer(first,'Keep the timing as written?',first.when);error='';draw();root.querySelector('h2')?.focus();});
    }
    root.querySelectorAll('[data-edit]').forEach(button=>button.onclick=()=>edit(items.find(item=>item.id===button.dataset.edit)));
    root.querySelector('#confirm-update')?.addEventListener('click',()=>{
      if(items.length && items.every(item=>item.timing.resolved)){items.forEach(item=>{delete item.choosingDate;delete item.dayDraft;item.confirmed=true;});onConfirm();}
    });
    root.querySelector('#return-capture').onclick=onReturn;
    root.querySelector('#add-observation')?.addEventListener('click',()=>{
      const item={id:createRecordId(),event:'',when:'Not specified',supportingWords:draft.originalText || draft.text,evidence:'Not specified',polarity:'uncertain',timing:{date:null,time:null,precision:'unknown',resolved:true},confirmed:false,edited:true};
      items.push(item);draft.confirmed=null;draft.addingObservationId=item.id;edit(item);
    });
  }
  function recordAnswer(item, question, answer) {
    (draft.clarifications ||= []).push({question:`For “${item.supportingWords.slice(0,120)}”: ${question}`,answer});
  }
  function edit(item) {
    const saved = draft.observationEdit?.id === item.id ? draft.observationEdit : structuredClone(item);
    draft.observationEdit=saved;
    const adding=draft.addingObservationId===item.id;
    root.innerHTML = `<div class="capture-result"><h2 tabindex="-1">${adding ? 'Add a detail' : 'Change a detail'}</h2>${adding ? `<div class="add-detail-context"><p class="hint">Your original update</p><blockquote>${escape(draft.originalText || draft.text || item.supportingWords || '')}</blockquote></div>` : ''}<form novalidate>
      <label for="observation-text">${adding ? 'What else would you like to add?' : 'What happened'}</label><textarea id="observation-text" maxlength="5000">${escape(saved.event)}</textarea>
      <label for="observation-when">Timing words</label><input id="observation-when" maxlength="5000" value="${escape(saved.when)}">
      <label for="observation-date">Event date</label>${dateInput('observation-date',saved.dateInput ?? (saved.timing.date ? formatDate(saved.timing.date) : ''))}
      <label for="observation-time">Clock time, if known</label><input id="observation-time" type="time" value="${escape(saved.timing.time || '')}">
      <label for="observation-date-precision">How certain is the day?</label><select id="observation-date-precision">${['exact','approximate','unknown'].map(p => `<option value="${p}" ${timingCertainty(saved.timing).datePrecision===p?'selected':''}>${{exact:'I know the day',approximate:'An approximate day',unknown:'I don’t remember the day'}[p]}</option>`).join('')}</select>
      <label for="observation-time-precision">How certain is the clock time?</label><select id="observation-time-precision">${['exact','approximate','unknown'].map(p => `<option value="${p}" ${timingCertainty(saved.timing).timePrecision===p?'selected':''}>${{exact:'I know the clock time',approximate:'An approximate time',unknown:'Clock time not known'}[p]}</option>`).join('')}</select>
      <details class="editor-extra"><summary>Source and meaning</summary><label for="observation-evidence">How do you know?</label><select id="observation-evidence">${['Not specified','Measured','Patient-reported','Caregiver-observed'].map(p => `<option ${p===saved.evidence?'selected':''}>${p}</option>`).join('')}</select>
      <label for="observation-polarity">What was explicitly stated?</label><select id="observation-polarity">${['present','absent','uncertain'].map(p => `<option value="${p}" ${p===saved.polarity?'selected':''}>${{present:'Present',absent:'Absent',uncertain:'Uncertain'}[p]}</option>`).join('')}</select></details>
      ${error ? `<p class="error" role="alert">${escape(error)}</p>` : ''}<button class="primary" type="submit">Apply changes</button><button class="text-action" id="cancel" type="button">Cancel editing</button><button class="text-action remove-action" id="remove-detail" type="button">Remove this detail</button></form><p class="hint">You’ll review the whole update before saving.</p></div>`;
    const read = () => { saved.event=root.querySelector('#observation-text').value; saved.when=root.querySelector('#observation-when').value;
      saved.evidence=root.querySelector('#observation-evidence').value; saved.polarity=root.querySelector('#observation-polarity').value;
      saved.dateInput=root.querySelector('#observation-date').value;
      const datePrecision=root.querySelector('#observation-date-precision').value,timePrecision=root.querySelector('#observation-time-precision').value;
      const date=parseDisplayDate(saved.dateInput),time=root.querySelector('#observation-time').value || null;
      saved.timing={date,time,datePrecision,timePrecision,precision:datePrecision==='exact'&&date&&timePrecision==='exact'&&time?'exact':datePrecision==='exact'&&date&&!time?'date':datePrecision==='unknown'&&timePrecision==='unknown'?'unknown':'approximate',resolved:true}; };
    bindDateInput(root.querySelector('#observation-date'));
    root.querySelector('form').oninput=event=>{
      if(event.target.id==='observation-date' && parseDisplayDate(event.target.value) && root.querySelector('#observation-date-precision').value==='unknown')root.querySelector('#observation-date-precision').value='exact';
      if(event.target.id==='observation-time' && event.target.value && root.querySelector('#observation-time-precision').value==='unknown')root.querySelector('#observation-time-precision').value='exact';
      read();
    };
    root.querySelector('form').onsubmit=e => {e.preventDefault(); read(); const t=saved.timing;
      if (!saved.event.trim()) {error='Check the description and timing before applying changes.';edit(item);return;}
      if ((saved.dateInput.trim()&&!parseDisplayDate(saved.dateInput)) || (t.datePrecision==='exact'&&!t.date)) {error='Enter a valid date as DD/MM/YYYY, or choose an approximate or unknown day.';edit(item);return;}
      if ((t.timePrecision==='exact'&&!t.time) || (t.precision==='approximate' && !saved.when.trim())) {error='Enter a clock time, or choose an approximate or unknown time and keep the timing words.';edit(item);return;}
      if(t.datePrecision==='unknown')t.date=null;if(t.timePrecision==='unknown')t.time=null;delete saved.dateInput;
      if(item.event!==saved.event){delete saved.symptomName;delete saved.measurement;delete item.symptomName;delete item.measurement;saved.type='pending';}
      Object.assign(item,saved,{confirmed:false,edited:true}); draft.confirmed=null; draft.observationEdit=null;delete draft.addingObservationId; error=''; draw(); };
    root.querySelector('#remove-detail').onclick=()=>{
      if(draft.savedEdit && items.length===1){error='Keep one detail here. To remove the whole update, return to the timeline and choose Delete update.';edit(item);return;}
      const removed=structuredClone(item);delete removed.choosingDate;delete removed.dayDraft;
      (draft.removedObservations ||= []).push(removed);items.splice(items.indexOf(item),1);draft.confirmed=null;draft.observationEdit=null;delete draft.addingObservationId;
      if(!items.length){draft.interpretation=null;onReturn();}else{error='';draw();}
    };
    root.querySelector('#cancel').onclick=()=>{if(!item.event.trim()) items.splice(items.indexOf(item),1);draft.observationEdit=null;delete draft.addingObservationId;error='';draw();};
    root.querySelector('h2').focus();
  }
  if (draft.observationEdit) edit(items.find(o => o.id === draft.observationEdit.id)); else draw();
}

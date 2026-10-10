import { escape, recordDetails, occurrenceLabel } from './observation-display.js';
import { resolveTiming, parseDisplayDate, timingCertainty } from '../convex/lib/observationTiming.ts';
import { dateInput, bindDateInput } from './date-input.js';
import { createRecordId } from './record-id.js';
import { track } from './analytics.js';
import { storyCard, icon } from './ui.js';
import { reconcileCorrections } from './update-corrections.js';

export function mountObservationReview(root, draft, onConfirm, onReturn, onBack=onReturn) {
  const items = draft.interpretation.observations;
  let error = '';
  function changed(item) { item.confirmed = false; draft.confirmed = null; }
  function draw() { if(draft.wholeEditing) wholeEditor(); else drawReview(); }
  function drawReview() {
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
      <button class="back" id="review-back" type="button">${draft.savedEdit?'Back to your update':'Back to capture'}</button>
      <h2 tabindex="-1">Does this sound right?</h2><p class="review-intro">${draft.savedEdit ? 'Review your corrections before saving.' : 'Your words, organised into one update.'}</p>
      ${draft.rewriteDifference?`<details class="rewrite-difference"><summary>What changed</summary><p class="hint">Before</p><p class="original-update">${escape(draft.rewriteDifference.before)}</p><p class="hint">After</p><p class="original-update">${escape(draft.rewriteDifference.after)}</p></details>`:''}
      <div class="review-surface">${storyCard({...draft,relatedGroups:draft.interpretation.relatedGroups ?? draft.relatedGroups,observations:items},true)}</div>
      ${error ? `<p class="error" role="alert">${escape(error)}</p>` : ''}
      ${details}
      ${draft.interpretation.manual ? `<button class="text-action" id="add-observation" type="button" ${items.length >= 20 ? 'disabled' : ''}>Add a detail from your update</button>` : ''}
      <div class="flow-actions"><button class="primary" id="confirm-update" type="button" ${!items.length ? 'disabled' : ''}>${draft.savedEdit ? 'Save changes' : (draft.saveDirectly || draft.existingPatient) ? 'Save update' : 'Continue to save'}</button><p class="hint action-caption">${draft.savedEdit ? 'Your changes haven&#8217;t been saved yet.' : (draft.saveDirectly || draft.existingPatient) ? 'Your update hasn&#8217;t been saved yet.' : 'Sign in next to save this note.'}</p><button class="text-action" id="return-capture" type="button">${draft.savedEdit ? 'Cancel changes' : 'Add something else'}</button></div></div>`;
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
    root.querySelectorAll('[data-edit]').forEach(button=>button.onclick=()=>{draft.timingOnly=button.classList.contains('edit-row');draft.observationTimingForId=null;edit(items.find(item=>item.id===button.dataset.edit));});
    root.querySelector('#change-update')?.addEventListener('click',startWholeEditor);
    root.querySelector('#review-back')?.addEventListener('click',onBack);
    root.querySelector('#confirm-update')?.addEventListener('click',()=>{
      if(draft.wholeBaseline || draft.observationEdit){error='Finish or cancel your changes before saving.';drawReview();return;}
      if(items.length && items.every(item=>item.timing.resolved)){items.forEach(item=>{delete item.choosingDate;delete item.dayDraft;item.confirmed=true;});onConfirm();}
    });
    root.querySelector('#return-capture').onclick=()=>{if(first || draft.savedEdit)onReturn();else{startWholeEditor();draft.wholeText+='\n';wholeEditor();root.querySelector('#whole-update-text').focus();}};
    root.querySelector('#add-observation')?.addEventListener('click',()=>{
      const item={id:createRecordId(),event:'',when:'Not specified',supportingWords:draft.originalText || draft.text,evidence:'Not specified',polarity:'uncertain',timing:{date:null,time:null,precision:'unknown',resolved:true},confirmed:false,edited:true};
      items.push(item);draft.confirmed=null;draft.addingObservationId=item.id;edit(item);
    });
  }
  function recordAnswer(item, question, answer) {
    (draft.clarifications ||= []).push({question:`For “${item.supportingWords.slice(0,120)}”: ${question}`,answer});
  }
  function startWholeEditor(){
    draft.wholeBaseline ||= {items:structuredClone(items),removed:structuredClone(draft.removedObservations || []),confirmed:draft.confirmed};
    draft.wholeText ??= items.map(item=>item.event).join('\n');draft.wholeEditing=true;error='';wholeEditor();
  }
  function cancelWholeEditor(){
    items.splice(0,items.length,...structuredClone(draft.wholeBaseline.items));
    draft.removedObservations=structuredClone(draft.wholeBaseline.removed);draft.confirmed=draft.wholeBaseline.confirmed;
    delete draft.wholeEditing;delete draft.wholeText;delete draft.wholeBaseline;draft.observationEdit=null;error='';if(draft.savedEdit)onReturn();else drawReview();
  }
  function wholeEditor(){
    const text=draft.wholeText ?? items.map(item=>item.event).join('\n');
    root.innerHTML=`<div class="capture-result whole-update-editor"><button class="back" id="whole-back" type="button">Back to review</button><h2 tabindex="-1">Change your update</h2><p>Keep what’s right. Change what isn’t.</p><form id="whole-form" novalidate><label for="whole-update-text">What happened?</label><textarea id="whole-update-text" rows="4" maxlength="5000">${escape(text)}</textarea><h3 class="section-title">When it happened</h3>${items.map((item,index)=>`<button class="edit-row" type="button" data-edit="${escape(item.id)}" aria-label="Change timing for detail ${index+1}"><span><strong>${escape(item.event)}</strong><small>${escape(occurrenceLabel(item))}</small></span>${icon('pencil')}</button>`).join('')}<p class="hint">Only change a date if it needs correcting.</p><details class="whole-more"><summary>More record details</summary>${items.map((item,index)=>`<button class="text-action" type="button" data-edit="${escape(item.id)}" aria-label="Change detail ${index+1}">Change detail ${index+1}</button>`).join('')}</details>${error?`<p class="error" role="alert">${escape(error)}</p>`:''}<button class="primary" type="submit">Review changes</button><button class="text-action" id="whole-cancel" type="button">Cancel changes</button></form></div>`;
    const input=root.querySelector('#whole-update-text');input.oninput=()=>draft.wholeText=input.value;
    root.querySelectorAll('[data-edit]').forEach(button=>button.onclick=()=>{draft.timingOnly=button.classList.contains('edit-row');draft.observationTimingForId=null;edit(items.find(item=>item.id===button.dataset.edit));});
    root.querySelector('#whole-back').onclick=()=>{draft.wholeEditing=false;drawReview();};root.querySelector('#whole-cancel').onclick=cancelWholeEditor;
    root.querySelector('#whole-form').onsubmit=async event=>{
      event.preventDefault();const revised=input.value.trim();draft.wholeText=input.value;
      if(draft.observationEdit){error='Finish or cancel the detail you’re editing before reviewing this update.';wholeEditor();return;}
      if(!revised){error='Keep at least one detail in your update.';wholeEditor();return;}
      if(revised!==items.map(item=>item.event).join('\n')){
        const editor=root.querySelector('.whole-update-editor');input.disabled=true;root.querySelectorAll('button').forEach(button=>button.disabled=true);
        const status=document.createElement('p');status.setAttribute('role','status');status.textContent='Preparing your changes for review…';editor.append(status);
        try{
          const response=await fetch('/api/interpret',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({text:revised,source:draft.source || 'text',patient:draft.patient || {},capturedAt:draft.capturedAt,timeZone:draft.timeZone}),signal:AbortSignal.timeout(90_000)});
          const result=await response.json();if(!root.contains(editor))return;
          if(!response.ok || result.status!=='ready' || !result.observations?.length)throw new Error('We couldn’t prepare these changes. Your edited words are still here. Try again.');
          const before=items.map(item=>item.event).join('\n');
          const next=reconcileCorrections(items,result.observations,draft.originalText || draft.text);
          if(next.length>20)throw new Error('Keep this update to 20 details or fewer.');
          const removed=items.filter(item=>!next.some(nextItem=>nextItem.id===item.id));
          const removedDetails=[...(draft.removedObservations || []),...structuredClone(removed)];
          if(removedDetails.length>20)throw new Error('Too many changes in this note. Keep the current details or add a new update.');
          draft.removedObservations=removedDetails;
          items.splice(0,items.length,...next);
          draft.rewriteDifference={before,after:revised};draft.confirmed=null;
          draft.interpretation.relatedGroups=(draft.interpretation.relatedGroups ?? draft.relatedGroups ?? []).filter(group=>group.observationIds.every(id=>items.some(item=>item.id===id && !item.edited)));
        }catch(cause){if(!root.contains(editor))return;error=/^(Keep this update|Too many changes)/.test(cause.message || '')?cause.message:'We couldn’t prepare these changes. Your edited words are still here. Try again.';wholeEditor();return;}
      }
      delete draft.wholeEditing;delete draft.wholeBaseline;delete draft.wholeText;error='';drawReview();root.querySelector('h2')?.focus();
    };
    root.querySelector('h2').focus();
  }
  function edit(item) {
    const saved = draft.observationEdit?.id === item.id ? draft.observationEdit : structuredClone(item);
    draft.observationEdit=saved;
    const adding=draft.addingObservationId===item.id;
    if(draft.observationTimingForId!==item.id){draft.observationTimingForId=item.id;draft.observationTimingOpen=adding || draft.timingOnly || !saved.timing.resolved;}
    root.innerHTML = `<div class="capture-result observation-editor"><button class="back" id="detail-back" type="button">Back to your changes</button><h2 tabindex="-1">${adding ? 'Add a detail' : 'Change a detail'}</h2>${adding ? `<div class="add-detail-context"><p class="hint">Your original update</p><blockquote>${escape(draft.originalText || draft.text || item.supportingWords || '')}</blockquote></div>` : ''}<form novalidate>
      <div ${draft.timingOnly?'hidden':''}><label for="observation-text">${adding ? 'What else would you like to add?' : 'What happened'}</label><textarea id="observation-text" rows="3" maxlength="5000">${escape(saved.event)}</textarea></div>
      <details class="editor-timing" ${draft.observationTimingOpen ? 'open' : ''}><summary><span>When this happened</span><span id="editor-timing-label">${escape(occurrenceLabel(saved))}</span></summary><div class="timing-fields">
      <label for="observation-when">Timing words</label><input id="observation-when" maxlength="5000" value="${escape(saved.when)}">
      <label for="observation-date">Event date</label>${dateInput('observation-date',saved.dateInput ?? (saved.timing.date ? formatDate(saved.timing.date) : ''))}
      <label for="observation-time">Clock time, if known</label><input id="observation-time" type="time" value="${escape(saved.timing.time || '')}">
      <label for="observation-date-precision">How certain is the day?</label><select id="observation-date-precision">${['exact','approximate','unknown'].map(p => `<option value="${p}" ${timingCertainty(saved.timing).datePrecision===p?'selected':''}>${{exact:'I know the day',approximate:'An approximate day',unknown:'I don’t remember the day'}[p]}</option>`).join('')}</select>
      <label for="observation-time-precision">How certain is the clock time?</label><select id="observation-time-precision">${['exact','approximate','unknown'].map(p => `<option value="${p}" ${timingCertainty(saved.timing).timePrecision===p?'selected':''}>${{exact:'I know the clock time',approximate:'An approximate time',unknown:'Clock time not known'}[p]}</option>`).join('')}</select>
      </div></details>
      <details class="editor-extra"><summary>Source and meaning</summary><label for="observation-evidence">How do you know?</label><select id="observation-evidence">${['Not specified','Measured','Patient-reported','Caregiver-observed'].map(p => `<option ${p===saved.evidence?'selected':''}>${p}</option>`).join('')}</select>
      <label for="observation-polarity">What was explicitly stated?</label><select id="observation-polarity">${['present','absent','uncertain'].map(p => `<option value="${p}" ${p===saved.polarity?'selected':''}>${{present:'Present',absent:'Absent',uncertain:'Uncertain'}[p]}</option>`).join('')}</select></details>
      ${error ? `<p class="error" role="alert">${escape(error)}</p>` : ''}<button class="primary" type="submit">Apply changes</button><button class="text-action" id="cancel" type="button">Cancel editing</button><button class="text-action remove-action" id="remove-detail" type="button">Remove this detail</button></form><p class="hint">You’ll review the whole update before saving.</p></div>`;
    const read = () => { saved.event=root.querySelector('#observation-text').value; saved.when=root.querySelector('#observation-when').value;
      saved.evidence=root.querySelector('#observation-evidence').value; saved.polarity=root.querySelector('#observation-polarity').value;
      saved.dateInput=root.querySelector('#observation-date').value;
      const datePrecision=root.querySelector('#observation-date-precision').value,timePrecision=root.querySelector('#observation-time-precision').value;
      const date=parseDisplayDate(saved.dateInput),time=root.querySelector('#observation-time').value || null;
      saved.timing={date,time,datePrecision,timePrecision,precision:datePrecision==='exact'&&date&&timePrecision==='exact'&&time?'exact':datePrecision==='exact'&&date&&!time?'date':datePrecision==='unknown'&&timePrecision==='unknown'?'unknown':'approximate',resolved:true}; };
    root.querySelector('.editor-timing').addEventListener('toggle',event=>{draft.observationTimingOpen=event.target.open;});
    bindDateInput(root.querySelector('#observation-date'));
    root.querySelector('form').oninput=event=>{
      if(event.target.id==='observation-date' && parseDisplayDate(event.target.value) && root.querySelector('#observation-date-precision').value==='unknown')root.querySelector('#observation-date-precision').value='exact';
      if(event.target.id==='observation-time' && event.target.value && root.querySelector('#observation-time-precision').value==='unknown')root.querySelector('#observation-time-precision').value='exact';
      read();
      root.querySelector('#editor-timing-label').textContent=saved.dateInput.trim()&&!parseDisplayDate(saved.dateInput)?saved.dateInput:occurrenceLabel(saved);
    };
    root.querySelector('form').onsubmit=e => {e.preventDefault(); read(); const t=saved.timing;
      if (!saved.event.trim()) {error='Check the description and timing before applying changes.';edit(item);return;}
      if ((saved.dateInput.trim()&&!parseDisplayDate(saved.dateInput)) || (t.datePrecision==='exact'&&!t.date)) {draft.observationTimingOpen=true;error='Enter a valid date as DD/MM/YYYY, or choose an approximate or unknown day.';edit(item);return;}
      if ((t.timePrecision==='exact'&&!t.time) || (t.precision==='approximate' && !saved.when.trim())) {draft.observationTimingOpen=true;error='Enter a clock time, or choose an approximate or unknown time and keep the timing words.';edit(item);return;}
      if(t.datePrecision==='unknown')t.date=null;if(t.timePrecision==='unknown')t.time=null;delete saved.dateInput;
      if(item.event!==saved.event){delete saved.symptomName;delete saved.measurement;delete item.symptomName;delete item.measurement;saved.type='pending';}
      const oldText=items.map(item=>item.event).join('\n');
      Object.assign(item,saved,{confirmed:false,edited:true});
      if(draft.wholeText===oldText)draft.wholeText=items.map(item=>item.event).join('\n');
      draft.confirmed=null; draft.observationEdit=null;delete draft.addingObservationId; error=''; draw(); };
    root.querySelector('#remove-detail').onclick=()=>{
      if(draft.savedEdit && items.length===1){error='Keep one detail here. To remove the whole update, return to the timeline and choose Delete update.';edit(item);return;}
      const oldText=items.map(item=>item.event).join('\n');
      const removed=structuredClone(item);delete removed.choosingDate;delete removed.dayDraft;
      if((draft.removedObservations || []).length>=20){error='Too many changes in this note. Keep the current details or add a new update.';edit(item);return;}
      (draft.removedObservations ||= []).push(removed);items.splice(items.indexOf(item),1);draft.confirmed=null;draft.observationEdit=null;delete draft.addingObservationId;
      if(draft.wholeText===oldText)draft.wholeText=items.map(item=>item.event).join('\n');
      if(!items.length){draft.interpretation=null;delete draft.wholeEditing;delete draft.wholeBaseline;delete draft.wholeText;onReturn();}else{error='';draw();}
    };
    root.querySelector('#cancel').onclick=()=>{if(!item.event.trim()) items.splice(items.indexOf(item),1);draft.observationEdit=null;delete draft.addingObservationId;error='';draw();};
    root.querySelector('#detail-back').onclick=()=>{draw();};
    root.querySelector('h2').focus();
  }
  if (draft.observationEdit) edit(items.find(o => o.id === draft.observationEdit.id));
  else if(draft.savedEdit && !draft.editStarted){draft.editStarted=true;startWholeEditor();}
  else draw();
}

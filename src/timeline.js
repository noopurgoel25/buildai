import { noteOrientation } from './onboarding.js';
import { formatDate, localDate } from '../convex/lib/observationTiming.ts';
import { mountAccountDeletion } from './account-deletion.js';
import { escape, savedObservationDetails, updatePreviewTiming, recordDetails } from './observation-display.js';
import { mountObservationReview } from './observation-review.js';
import { createRecordId } from './record-id.js';
import { mountPeriodSummary } from './summary.js';
import { track,bucket } from './analytics.js';
import { personContext, storyCard, storyTitle, categoryInfo, icon, recordTabs, detailHeading } from './ui.js';

export function mountTimeline(root, session, pending, onSaved, onAdd, onSignOut, onOpened=()=>{},onDeleted=onSignOut,onDeleting=()=>{}) {
  let disposed=false, busy=false, entries=[], patient=null, cursor=null, isDone=true, loaded=false, error='', errorKind='load', saved=false;
  let confirmedMatch=null, savingPending=false;
  let detailEntry=null;
  let disposeSummary=()=>{},disposeDeletion=()=>{};
  let correctionOpen=false;
  const beforeNavigate=event=>{if(correctionOpen && !window.confirm('Leave these unsaved changes? Your saved update will stay unchanged.'))event.preventDefault();};
  const openTimeline=()=>{if(disposed)return;disposeSummary();detailEntry=null;draw();root.querySelector('h1').focus();};
  const openSummary=()=>{if(disposed || !patient || !loaded)return;disposeSummary();detailEntry=null;disposeSummary=mountPeriodSummary(root,session,patient,()=>{disposeSummary();loadPage(true);});};
  root.addEventListener('carenama:open-summary',openSummary);
  root.addEventListener('carenama:before-navigate',beforeNavigate);
  root.addEventListener('carenama:open-timeline',openTimeline);
  function shell(content) { if(!disposed) root.innerHTML=`<section class="screen timeline-screen" aria-labelledby="title">${content}</section>`; }
  function draw() {
    correctionOpen=false;
    root.carenamaPatient=patient;
    if(detailEntry){showDetail(detailEntry);return;}
    shell(`${patient?personContext(patient):''}<h1 id="title" tabindex="-1">${patient ? `${escape(patient.name)}’s health notes` : 'Who are you caring for?'}</h1>
      ${patient ? '<p>Small updates. A story you can return to.</p>'+recordTabs('timeline') : `<p>Start with their name and your relationship. Then add a health update and check it before saving.</p>${noteOrientation(true)}`}
      ${saved ? `<p class="saved-message" role="status">Saved to ${escape(patient.name)}’s record.</p>` : ''}
      <button class="primary account-start" id="add-update" type="button" ${!loaded?'disabled':''}>${patient ? 'Add update' : 'Set up a health record'}</button>
      ${loaded && !entries.length ? '<div class="timeline-empty"><p>No saved updates yet.</p><p class="hint">You can add a note whenever there’s something you want to remember.</p></div>' : ''}
      <ol class="timeline-list">${entries.map((entry,index)=>timelineEntry(entry,index,index===0 || recordedDate(entry.details)!==recordedDate(entries[index-1].details))).join('')}</ol>
      ${error ? `<p class="error" role="alert">${escape(error)}</p><button class="secondary" id="retry-page" type="button">Try again</button>` : ''}
      ${!isDone && !error ? `<button class="secondary" id="load-more" type="button" ${busy?'disabled':''}>${busy?'Loading older updates…':'Load older updates'}</button>` : ''}
      `);
    root.querySelectorAll('[data-open]').forEach(button=>button.onclick=()=>{detailEntry=entries[Number(button.dataset.open)];showDetail(detailEntry);});
    root.querySelector('#add-update').onclick=()=>onAdd(patient);
    root.querySelector('#period-summary')?.addEventListener('click',openSummary);
    root.querySelector('#load-more')?.addEventListener('click',()=>loadPage(false));
    root.querySelector('#retry-page')?.addEventListener('click',()=>errorKind==='signout'?signOut():loadPage(!loaded));
    root.querySelectorAll('[data-change]').forEach(button=>button.onclick=()=>changeUpdate(entries[Number(button.dataset.change)]));
    root.querySelectorAll('[data-delete]').forEach(button=>button.onclick=()=>confirmDelete(entries[Number(button.dataset.delete)]));
  }
  function showDetail(entry){
    correctionOpen=false;
    const event=entry.details,items=event.observations || [event];
    shell(`<button class="back" id="detail-timeline-back" type="button">Back to timeline</button>${personContext(patient)}<h1 id="title" tabindex="-1">${escape(detailHeading(event))}</h1><div class="timeline-expanded">${storyCard(event)}<h2 class="section-title">Your original note</h2><blockquote class="original-update">${escape(event.originalText || event.event)}</blockquote>${recordDetails(event,false).replace('<summary>Record details</summary>','<summary>Source &amp; record details</summary>')}<button class="primary account-start" id="detail-change" type="button">Change update</button><button class="text-action remove-action" id="detail-delete" type="button">Delete update</button></div>`);
    root.querySelector('#detail-timeline-back').onclick=()=>{detailEntry=null;draw();root.querySelector(`[data-open="${entries.indexOf(entry)}"]`)?.focus();};
    root.querySelector('#detail-change').onclick=()=>changeUpdate(entry);root.querySelector('#detail-delete').onclick=()=>confirmDelete(entry);root.querySelector('h1').focus();
  }
  function changeUpdate(entry) {
    correctionOpen=true;
    const base=structuredClone(entry.details);let changeId=createRecordId();
    const observations=base.observations ?? [{id:'legacy',event:base.event,when:base.when,supportingWords:base.originalText,evidence:base.evidence,polarity:'uncertain',timing:{date:null,time:null,precision:'approximate',resolved:true},confirmed:true,edited:false}];
    const originalObservations=JSON.stringify(observations);
    const draft={...base,patient:{name:patient.name,relationship:patient.relationship},savedEdit:true,interpretation:{observations},removedObservations:base.removedObservations || []};
    function returnToUpdate(){draw();root.querySelector('h1').focus();}
    function backToUpdate(){
      const changed=originalObservations!==JSON.stringify(observations) || draft.observationEdit || (draft.wholeText!=null && draft.wholeText!==observations.map(item=>item.event).join('\n'));
      if(changed && !window.confirm('Leave these unsaved changes? Your saved update will stay unchanged.'))return;
      returnToUpdate();
    }
    function review(){if(disposed)return;shell(`${personContext(patient)}<div id="saved-review"></div>`);mountObservationReview(root.querySelector('#saved-review'),draft,saveChanges,returnToUpdate,backToUpdate);}
    async function saveChanges(){
      const event={...base,...(base.relatedGroups?{relatedGroups:base.relatedGroups.filter(group=>group.observationIds.every(id=>observations.some(item=>item.id===id&&!item.edited)))}:{}),observations:structuredClone(observations),removedObservations:structuredClone(draft.removedObservations),edited:true,
        event:observations.map(item=>item.event).join('; '),when:observations.map(item=>item.when).join('; '),evidence:observations[0].evidence};
      shell('<h1 id="title" tabindex="-1">Saving your changes…</h1><p role="status">Keeping the original capture time.</p>');
      try {const revision=await session.correctUpdate({id:entry.id,event,expectedRevision:entry.revision ?? 0,changeId});if(disposed)return;entry.details=event;entry.revision=revision;draw();root.querySelector('h1').focus();}
      catch(cause){if(disposed)return;const stale=/changed elsewhere|not available/.test(cause.message || '');shell(`<h1 id="title" tabindex="-1">Your changes are still here.</h1><p class="error" role="alert">${stale?'This update changed or was removed elsewhere. Open it again from the timeline before making changes.':'We couldn’t save your changes. Try again without closing this page.'}</p>${stale?'':'<button class="primary account-start" id="retry-change">Try again</button><button class="text-action" id="back-review">Back to your changes</button>'}<button class="text-action" id="back-timeline">Back to timeline</button>`);root.querySelector('#retry-change')?.addEventListener('click',saveChanges);root.querySelector('#back-review')?.addEventListener('click',()=>{changeId=createRecordId();review();});root.querySelector('#back-timeline').onclick=()=>loadPage(true);}
    }
    review();
  }
  function confirmDelete(entry) {
    shell(`<h1 id="title" tabindex="-1">Delete this update?</h1><p>This removes the whole update and all its details from ${escape(patient.name)}’s timeline. This cannot be undone.</p><div class="delete-preview">${savedObservationDetails(entry.details)}</div><p class="error" id="delete-error" role="alert"></p><button class="primary account-start destructive" id="confirm-delete">Delete update</button><button class="text-action" id="cancel-delete">Keep update</button>`);
    root.querySelector('h1').focus();
    const button=root.querySelector('#confirm-delete'),cancel=root.querySelector('#cancel-delete');
    cancel.onclick=()=>{draw();root.querySelector('h1').focus();};
    button.onclick=async()=>{button.disabled=true;cancel.disabled=true;button.textContent='Deleting…';try{await session.deleteUpdate({id:entry.id,expectedRevision:entry.revision ?? 0});if(disposed)return;entries=entries.filter(item=>item.id!==entry.id);detailEntry=null;saved=false;draw();root.querySelector('h1').focus();}catch(cause){if(disposed)return;const stale=/changed elsewhere|not available/.test(cause.message || '');root.querySelector('#delete-error').textContent=stale?'This update changed elsewhere. Return to the timeline and open it again.':'We couldn’t delete this update. Your saved note is still there. Try again.';button.disabled=stale;cancel.disabled=false;button.textContent='Delete update';if(stale){cancel.textContent='Back to timeline';cancel.onclick=()=>loadPage(true);}}};
  }
  async function signOut(){try{await session.signOut();if(!disposed)onSignOut();}catch{if(disposed)return;errorKind='signout';error='We couldn’t sign out. Try again.';draw();}}
  async function loadPage(first) {
    if(busy || disposed)return;
    if(first){detailEntry=null;correctionOpen=false;}
    busy=true;error='';errorKind='load';
    if(first) shell('<h1 id="title" tabindex="-1">Opening your timeline…</h1><p role="status">Loading your saved notes.</p><div class="timeline-skeleton" aria-hidden="true"><span></span><span></span><span></span></div>');
    else draw();
    try {
      const result=await session.getTimeline({numItems:10,cursor:first?null:cursor});
      if(disposed)return;
      patient=result.patient;if(patient)onOpened();entries=first?result.page:[...entries,...result.page.filter(next=>!entries.some(old=>old.id===next.id))];
      cursor=result.continueCursor;isDone=result.isDone;loaded=true;busy=false;draw();
      if(first)track('timeline_opened',{note_count:bucket(result.isDone?result.page.length:11)});
      if(first)root.querySelector('h1').focus();
      if(sessionStorage.getItem('carenama.open-summary')==='1'){sessionStorage.removeItem('carenama.open-summary');openSummary();}
    } catch {
      if(disposed)return;
      if(session.getAccountState){try{const state=await session.getAccountState();if(disposed)return;if(state==='deleting'){busy=false;disposeDeletion=mountAccountDeletion(root,session,patient,()=>{},onDeleted,onDeleting,true);return;}if(state==='deleted'){await session.signOut();if(!disposed)onDeleted();return;}}catch{}}
      busy=false;error='We couldn’t load the timeline. Your saved notes are still there. Try again.';
      if(loaded)draw();else{shell(`<h1 id="title" tabindex="-1">We couldn’t open your timeline.</h1><p class="error" role="alert">${escape(error)}</p><button class="primary account-start" id="retry-load">Try again</button>`);root.querySelector('#retry-load').onclick=()=>loadPage(true);}
    }
  }
  async function savePending() {
    if(savingPending || disposed)return;
    savingPending=true;
    shell('<h1 id="title" tabindex="-1">Saving your update…</h1><p role="status">Keeping it with your saved notes.</p>');
    try {
      if(confirmedMatch) await session.saveMatchedUpdate({patientId:confirmedMatch.id,patient:{name:pending.patient.name,relationship:pending.patient.relationship},event:pending.event,samePersonConfirmed:true});
      else if(pending.existingPatient) await session.saveUpdate({patientId:pending.patient.id,event:pending.event});
      else await session.saveRecord({patient:{name:pending.patient.name,relationship:pending.patient.relationship},event:pending.event});
      if(disposed)return;
      saved=true;onSaved();await loadPage(true);
    } catch(cause) {
      if(disposed)return;
      const conflict=/already has a health record/.test(cause.message || '');
      if(conflict && !confirmedMatch){await checkMatch();return;}
      const incompatible=/extra field|unexpected field/i.test(cause.message || '') && /datePrecision|timePrecision|interpretationVersion|relatedGroups/.test(cause.message || '');
      saveFailure(conflict,incompatible);
    } finally {savingPending=false;}
  }
  function saveFailure(conflict,incompatible=false) {
      shell(`<h1 id="title" tabindex="-1">Your update is still here.</h1><p class="error" role="alert">${incompatible?'Saving this note is not available in this preview yet. Your note is still here.':conflict?'For now, each account keeps notes for one person. This account already has a record, so we haven’t saved this new update.':'Your update hasn’t been saved yet. Try again without closing this page.'}</p>${incompatible?'':conflict?'<p class="hint">You can open the existing timeline. Your new update stays only in this open page; refreshing or closing clears it.</p><button class="primary account-start" id="existing-record">Open existing timeline</button>':'<button class="primary account-start" id="retry-save">Try again</button>'}<a class="text-action account-link" href="${pending.existingPatient?'#capture':'#first-value'}">Back to your update</a>`);
      root.querySelector('#retry-save')?.addEventListener('click',savePending);
      root.querySelector('#existing-record')?.addEventListener('click',()=>loadPage(true));
  }
  async function checkMatch() {
    if(disposed)return;
    shell('<h1 id="title" tabindex="-1">Checking your existing record…</h1><p role="status">Your prepared update is still here.</p>');
    try {
      const match=await session.matchingPatient({name:pending.patient.name,relationship:pending.patient.relationship});
      if(disposed)return;
      if(!match){saveFailure(true);return;}
      shell(`<h1 id="title" tabindex="-1">Is this update for ${escape(match.name)}?</h1><p>This account already has a record for ${escape(match.name)} (${escape(match.relationship)}). The name and relationship match what you entered.</p><div class="capture-result">${savedObservationDetails(pending.event)}</div><p class="hint">Confirm it’s the same person before we add this update to their existing timeline. Nothing new has been saved yet.</p><button class="primary account-start" id="confirm-match">Yes, save to this record</button><a class="text-action account-link" href="#first-value">No, back to my update</a>`);
      root.querySelector('h1').focus();
      root.querySelector('#confirm-match').onclick=()=>{confirmedMatch=match;savePending();};
    } catch {
      if(disposed)return;
      shell('<h1 id="title" tabindex="-1">Your update is still here.</h1><p class="error" role="alert">We couldn’t check your existing record. Try again without closing this page.</p><button class="primary account-start" id="retry-match">Try again</button><a class="text-action account-link" href="#first-value">Back to your update</a>');
      root.querySelector('#retry-match').onclick=checkMatch;
    }
  }
  if(pending)savePending();else loadPage(true);
  return()=>{disposed=true;disposeSummary();disposeDeletion();root.removeEventListener('carenama:before-navigate',beforeNavigate);root.removeEventListener('carenama:open-timeline',openTimeline);root.removeEventListener('carenama:open-summary',openSummary);root.carenamaPatient=null;};
}

function recordedDate(event) {
  return formatDate(localDate(event.capturedAt,event.timeZone));
}

function timelineEntry(entry,index,newDay) {
  const event=entry.details,{label,kind}=categoryInfo(event);
  return `<li>${newDay?`<p class="timeline-recorded">Recorded ${escape(recordedDate(event))}</p>`:''}<article class="timeline-entry"><button class="timeline-entry-open" data-open="${index}" type="button"><span class="timeline-marker marker-${kind}" aria-hidden="true">${icon(kind)}</span><span class="timeline-preview"><span class="timeline-category">${escape(label)}</span><span class="timeline-preview-text">${escape(storyTitle(event))}</span><span class="timeline-preview-time">${escape(updatePreviewTiming(event))}</span></span>${icon('chevron')}</button></article></li>`;
}

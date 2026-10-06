import { escape, savedObservationDetails } from './observation-display.js';
import { mountObservationReview } from './observation-review.js';
import { createRecordId } from './record-id.js';

export function mountTimeline(root, session, pending, onSaved, onAdd, onSignOut) {
  let disposed=false, busy=false, entries=[], patient=null, cursor=null, isDone=true, loaded=false, error='', errorKind='load', saved=false;
  function shell(content) { if(!disposed) root.innerHTML=`<section class="screen timeline-screen" aria-labelledby="title">${content}</section>`; }
  function draw() {
    shell(`<h1 id="title" tabindex="-1">${patient ? `${escape(patient.name)}’s health story` : 'Your health story starts here.'}</h1>
      ${patient ? `<p>${escape(patient.relationship)}</p>` : '<p>A note about someone you care for is enough to start.</p>'}
      ${saved ? `<p class="saved-message" role="status">Saved to ${escape(patient.name)}’s record.</p>` : ''}
      <button class="primary account-start" id="add-update" type="button">Add update</button>
      ${patient ? '<h2 class="timeline-heading">Your timeline</h2><p class="hint">Newest recorded updates first. Each detail shows when it happened.</p>' : ''}
      ${loaded && !entries.length ? '<div class="timeline-empty"><p>No saved updates yet.</p><p class="hint">You can add a note whenever there’s something you want to remember.</p></div>' : ''}
      <ol class="timeline-list">${entries.map((entry,index)=>`<li><article class="timeline-entry"><h3>Recorded ${escape(recordedDate(entry.details))}</h3><div class="capture-result">${savedObservationDetails(entry.details)}</div><div class="note-actions"><button class="text-action" data-change="${index}" type="button">Change update</button><button class="text-action remove-action" data-delete="${index}" type="button">Delete update</button></div></article></li>`).join('')}</ol>
      ${error ? `<p class="error" role="alert">${escape(error)}</p><button class="secondary" id="retry-page" type="button">Try again</button>` : ''}
      ${!isDone && !error ? `<button class="secondary" id="load-more" type="button" ${busy?'disabled':''}>${busy?'Loading older updates…':'Load older updates'}</button>` : ''}
      <button class="text-action timeline-signout" id="signout" type="button">Sign out</button>`);
    root.querySelector('#add-update').onclick=()=>onAdd(patient);
    root.querySelector('#load-more')?.addEventListener('click',()=>loadPage(false));
    root.querySelector('#retry-page')?.addEventListener('click',()=>errorKind==='signout'?signOut():loadPage(!loaded));
    root.querySelector('#signout').onclick=signOut;
    root.querySelectorAll('[data-change]').forEach(button=>button.onclick=()=>changeUpdate(entries[Number(button.dataset.change)]));
    root.querySelectorAll('[data-delete]').forEach(button=>button.onclick=()=>confirmDelete(entries[Number(button.dataset.delete)]));
  }
  function changeUpdate(entry) {
    const base=structuredClone(entry.details);let changeId=createRecordId();
    const observations=base.observations ?? [{id:'legacy',event:base.event,when:base.when,supportingWords:base.originalText,evidence:base.evidence,polarity:'uncertain',timing:{date:null,time:null,precision:'approximate',resolved:true},confirmed:true,edited:false}];
    const draft={...base,savedEdit:true,interpretation:{observations},removedObservations:base.removedObservations || []};
    function review(){if(disposed)return;shell(`<h1 id="title" tabindex="-1">Change your update</h1><p>${escape(patient.name)} · Recorded ${escape(recordedDate(base))}</p><div id="saved-review"></div>`);mountObservationReview(root.querySelector('#saved-review'),draft,saveChanges,()=>{draw();root.querySelector('h1').focus();});}
    async function saveChanges(){
      const event={...base,observations:structuredClone(observations),removedObservations:structuredClone(draft.removedObservations),edited:true,
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
    button.onclick=async()=>{button.disabled=true;cancel.disabled=true;button.textContent='Deleting…';try{await session.deleteUpdate({id:entry.id,expectedRevision:entry.revision ?? 0});if(disposed)return;entries=entries.filter(item=>item.id!==entry.id);saved=false;draw();root.querySelector('h1').focus();}catch(cause){if(disposed)return;const stale=/changed elsewhere|not available/.test(cause.message || '');root.querySelector('#delete-error').textContent=stale?'This update changed elsewhere. Return to the timeline and open it again.':'We couldn’t delete this update. Your saved note is still there. Try again.';button.disabled=stale;cancel.disabled=false;button.textContent='Delete update';if(stale){cancel.textContent='Back to timeline';cancel.onclick=()=>loadPage(true);}}};
  }
  async function signOut(){try{await session.signOut();if(!disposed)onSignOut();}catch{if(disposed)return;errorKind='signout';error='We couldn’t sign out. Try again.';draw();}}
  async function loadPage(first) {
    if(busy || disposed)return;
    busy=true;error='';errorKind='load';
    if(first) shell('<h1 id="title" tabindex="-1">Opening your timeline…</h1><p role="status">Loading your saved notes.</p><div class="timeline-skeleton" aria-hidden="true"><span></span><span></span><span></span></div>');
    else draw();
    try {
      const result=await session.getTimeline({numItems:10,cursor:first?null:cursor});
      if(disposed)return;
      patient=result.patient;entries=first?result.page:[...entries,...result.page.filter(next=>!entries.some(old=>old.id===next.id))];
      cursor=result.continueCursor;isDone=result.isDone;loaded=true;busy=false;draw();
      if(first)root.querySelector('h1').focus();
    } catch {
      if(disposed)return;
      busy=false;error='We couldn’t load the timeline. Your saved notes are still there. Try again.';
      if(loaded)draw();else{shell(`<h1 id="title" tabindex="-1">We couldn’t open your timeline.</h1><p class="error" role="alert">${escape(error)}</p><button class="primary account-start" id="retry-load">Try again</button>`);root.querySelector('#retry-load').onclick=()=>loadPage(true);}
    }
  }
  async function savePending() {
    shell('<h1 id="title" tabindex="-1">Saving your update…</h1><p role="status">Keeping it with your saved notes.</p>');
    try {
      if(pending.existingPatient) await session.saveUpdate({patientId:pending.patient.id,event:pending.event});
      else await session.saveRecord({patient:{name:pending.patient.name,relationship:pending.patient.relationship},event:pending.event});
      if(disposed)return;
      saved=true;onSaved();await loadPage(true);
    } catch(cause) {
      if(disposed)return;
      const conflict=/already has a health record/.test(cause.message || '');
      shell(`<h1 id="title" tabindex="-1">Your update is still here.</h1><p class="error" role="alert">${conflict?'For now, each account keeps notes for one person. This account already has a record, so we haven’t saved this new update.':'Your update hasn’t been saved yet. Try again without closing this page.'}</p>${conflict?'<p class="hint">You can open the existing timeline. Your new update stays only in this open page; refreshing or closing clears it.</p><button class="primary account-start" id="existing-record">Open existing timeline</button>':'<button class="primary account-start" id="retry-save">Try again</button>'}<a class="text-action account-link" href="${pending.existingPatient?'#capture':'#first-value'}">Back to your update</a>`);
      root.querySelector('#retry-save')?.addEventListener('click',savePending);
      root.querySelector('#existing-record')?.addEventListener('click',()=>loadPage(true));
    }
  }
  if(pending)savePending();else loadPage(true);
  return()=>{disposed=true;};
}

function recordedDate(event) {
  return new Intl.DateTimeFormat('en-GB',{timeZone:event.timeZone,dateStyle:'medium'}).format(event.capturedAt);
}

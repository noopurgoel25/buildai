import { escape, savedObservationDetails } from './observation-display.js';

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
      <ol class="timeline-list">${entries.map(entry=>`<li><article class="timeline-entry"><h3>Recorded ${escape(recordedDate(entry.details))}</h3><div class="capture-result">${savedObservationDetails(entry.details)}</div></article></li>`).join('')}</ol>
      ${error ? `<p class="error" role="alert">${escape(error)}</p><button class="secondary" id="retry-page" type="button">Try again</button>` : ''}
      ${!isDone && !error ? `<button class="secondary" id="load-more" type="button" ${busy?'disabled':''}>${busy?'Loading older updates…':'Load older updates'}</button>` : ''}
      <button class="text-action timeline-signout" id="signout" type="button">Sign out</button>`);
    root.querySelector('#add-update').onclick=()=>onAdd(patient);
    root.querySelector('#load-more')?.addEventListener('click',()=>loadPage(false));
    root.querySelector('#retry-page')?.addEventListener('click',()=>errorKind==='signout'?signOut():loadPage(!loaded));
    root.querySelector('#signout').onclick=signOut;
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
      shell(`<h1 id="title" tabindex="-1">Your update is still here.</h1><p class="error" role="alert">${conflict?'This account already has a health record. Your new update has not been saved.':'Your update hasn’t been saved yet. Try again without closing this page.'}</p><button class="primary account-start" id="retry-save">Try again</button><a class="text-action account-link" href="${pending.existingPatient?'#capture':'#first-value'}">Back to your update</a>${conflict?'<button class="secondary" id="existing-record">View existing record</button>':''}`);
      root.querySelector('#retry-save').onclick=savePending;
      root.querySelector('#existing-record')?.addEventListener('click',()=>loadPage(true));
    }
  }
  if(pending)savePending();else loadPage(true);
  return()=>{disposed=true;};
}

function recordedDate(event) {
  return new Intl.DateTimeFormat('en-GB',{timeZone:event.timeZone,dateStyle:'medium'}).format(event.capturedAt);
}

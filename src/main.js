import '@fontsource/inter/400.css';
import '@fontsource/inter/600.css';
import './style.css';
import { journeyProgress } from './journey-progress.js';
import { mountCapture } from './capture.js';
import { startSession } from './session.js';
import { mountSignIn } from './account.js';
import { mountTimeline } from './timeline.js';
import { savedObservationDetails } from './observation-display.js';
import { createRecordId } from './record-id.js';
import { mountPrivacy } from './privacy.js';
import { configureAnalytics,resetAnalytics,track } from './analytics.js';
import { mountNavigation } from './navigation.js';
import { mountAccountDeletion } from './account-deletion.js';
import { noteOrientation, noteExamples } from './onboarding.js';

const app = document.querySelector('#app');
// Unsaved capture details stay only in this open page.
const patient = { name: '', relationship: '' };
const captureDraft = { text: '', source: 'text', audio: null, interpretation: null };
let disposeCapture = () => {};
let disposeAccount = () => {};
let session = { isLoading: true, isAuthenticated: false };
let authResolved = false,accountDeleting=false,accountDeleted=false;
let privacyReturn = null, deletionReturn = '#record';
// A non-sensitive routing hint, never identity or authorization.
function returningRecord(){try{return localStorage.getItem('carenama.returning')==='1';}catch{return false;}}
function rememberRecord(){try{localStorage.setItem('carenama.returning','1');}catch{}}
const loginDraft = { email: '', code: '', codeSent: false };
const escapeHtml = (value) => value.replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));

function render() {
  disposeCapture();
  disposeAccount();
  if(!authResolved){app.innerHTML='<section class="screen"><h1>Opening CareNama</h1><p role="status">Checking your sign-in.</p></section>';return;}
  if(location.hash==='#privacy'){disposeAccount=mountPrivacy(app,session,()=>{location.hash=privacyReturn || (session.isAuthenticated?'#record':'#');},privacyReturn==='#capture'?'Back to your update':undefined);return;}
  if(location.hash==='#delete-account'){
    if(!session.isAuthenticated){location.replace('#signin');return;}
    disposeAccount=mountAccountDeletion(app,session,null,()=>{location.hash=deletionReturn;},()=>{accountDeleting=false;accountDeleted=true;clearDraft();session={...session,isAuthenticated:false};try{localStorage.removeItem('carenama.returning');}catch{}location.hash='#';render();},busy=>{accountDeleting=busy;});return;
  }
  if (location.hash === '#signin') {
    if (session.isAuthenticated) { location.replace('#record'); return; }
    disposeAccount = mountSignIn(app, loginDraft, session, Boolean(captureDraft.confirmed));
    return;
  }
  if (location.hash === '#record') {
    if (session.isLoading) { app.innerHTML = '<section class="screen"><h1>Opening your health record…</h1><p role="status">Checking your sign-in.</p></section>'; return; }
    if (!session.isAuthenticated) { location.replace('#signin'); return; }
    disposeAccount = mountTimeline(app, session,
      captureDraft.confirmed && !captureDraft.persisted && (!captureDraft.existingPatient || captureDraft.saveRequested) ? { patient: { ...patient }, event: captureDraft.confirmed, existingPatient:Boolean(captureDraft.existingPatient) } : null,
      () => { captureDraft.persisted = true; captureDraft.saveRequested=false; }, savedPatient => {
        clearDraft();
        if(savedPatient){Object.assign(patient,savedPatient);captureDraft.existingPatient=true;location.hash='#capture';}
        else location.hash='#patient-setup';
      }, () => { clearDraft(); location.hash = '#'; }, rememberRecord,()=>{accountDeleting=false;accountDeleted=true;clearDraft();session={...session,isAuthenticated:false};try{localStorage.removeItem('carenama.returning');}catch{}location.hash='#';render();},busy=>{accountDeleting=busy;if(!busy&&!session.isAuthenticated){clearDraft();location.hash='#signin';}});
    return;
  }
  const setup = location.hash === '#patient-setup';
  const capture = location.hash === '#capture';
  const firstValue = location.hash === '#first-value';
  if (session.isAuthenticated && captureDraft.persisted && (setup || capture || firstValue)) {
    location.replace('#record'); return;
  }
  if ((capture || firstValue) && (!patient.name.trim() || !patient.relationship.trim())) {
    location.replace('#patient-setup');
    return;
  }
  if (firstValue && !captureDraft.confirmed) {
    location.replace('#capture');
    return;
  }
  const confirmed = captureDraft.confirmed;
  app.innerHTML = firstValue ? `
    <section class="screen setup first-value" aria-labelledby="title">
      <a class="back" href="#capture">Back to review</a>
      <h1 id="title" tabindex="-1">Your update is ready.</h1>
      <p>You’ve checked the details for ${escapeHtml(patient.name)}.</p>
      <article class="capture-result confirmed-event" aria-labelledby="confirmed-title">
        <h2 id="confirmed-title">${escapeHtml(patient.name)}’s update</h2>
        ${savedObservationDetails(confirmed)}
      </article>
      <div class="temporary-notice">
        <h2>Keep this for next time</h2>
        <p>Sign in to save it to ${escapeHtml(patient.name)}’s record. Until then, it stays only in this open page; refreshing or closing clears it.</p>
        <a class="primary account-start" href="${session.isAuthenticated ? '#record' : '#signin'}">Save this update</a>
      </div>
    </section>` : capture ? `
    <section class="screen setup" aria-labelledby="title">
      <a class="back" id="capture-back" href="${captureDraft.existingPatient ? '#record' : '#patient-setup'}">${captureDraft.existingPatient ? 'Back to timeline' : 'Back to person details'}</a>
      <div id="journey-progress">${journeyProgress(captureDraft.existingPatient ? ['Update','Review'] : ['Person','Update','Review'],captureDraft.existingPatient ? 0 : 1)}</div>
      <div class="patient-context"><h2>${escapeHtml(patient.name)}</h2><p>${escapeHtml(patient.relationship)}</p></div>
      <div class="capture-intro"><h1 id="title" tabindex="-1">What would you like to note about ${escapeHtml(patient.name)}?</h1><p>Say it in your own words.</p></div>
      <div id="capture-controls"></div>
    </section>` : setup ? `
    <section class="screen setup" aria-labelledby="title">
      <a class="back" href="${session.isAuthenticated ? '#record' : '#'}">${session.isAuthenticated ? 'Back to your record' : 'Back'}</a>
      ${journeyProgress(['Person','Update','Review'],0)}
      <div class="intro">
        <h1 id="title" tabindex="-1">Who are you caring for?</h1>
        ${session.isAuthenticated ? '<p>A name and your relationship are enough to start.</p>' : '<p class="hint">For now, each account keeps notes for one person. If you already have a record, sign in to continue their timeline.</p><a class="text-action" href="#signin">Already have a record? Sign in</a><p class="hint">Person, update, then review. An email code is needed to save your first update.</p>'}
        <form id="patient-form" novalidate>
          <div class="field"><label for="patient-name">Their name</label><input id="patient-name" name="name" autocomplete="off" value="${escapeHtml(patient.name)}" aria-describedby="name-error" required><p id="name-error" class="error" hidden></p></div>
          <div class="field"><label for="relationship">Your relationship to them</label><input id="relationship" name="relationship" autocomplete="off" value="${escapeHtml(patient.relationship)}" aria-describedby="relationship-hint relationship-error" required><p id="relationship-hint" class="hint">For example, daughter, son or partner.</p><p id="relationship-error" class="error" hidden></p></div>
          <p class="reassurance">${session.isAuthenticated ? 'No medical profile needed.' : 'A name and your relationship are enough to start.'}</p>
          <p class="hint temporary">These details will be saved with your first update. Until then, refreshing this page will clear them.</p>
          <button class="primary" type="submit">Continue to your update</button>
        </form>
      </div>
    </section>` : `
    <section class="screen welcome" aria-labelledby="title">
      ${accountDeleted?'<p role="status">Your account and health record have been permanently deleted.</p>':''}<div class="intro">
        <h1 id="title" tabindex="-1">A place for the details you want to remember.</h1>
        <p>Health notes for someone you care for, in your own words.</p>
      </div>
      <img class="welcome-family" src="/images/welcome-family-caricature.png" width="1672" height="941" alt="Illustration of an adult daughter embracing her father." fetchpriority="high">
      ${noteOrientation()}
      <div class="welcome-actions">
        <a class="primary" href="#patient-setup">Start a health note</a>
        <a class="returning-signin" href="#signin">Already started? Sign in</a>
      </div>
      ${noteExamples()}
    </section>`;
  if (setup || capture || firstValue) document.querySelector('h1').focus();
  if(capture) captureDraft.saveDirectly=session.isAuthenticated;
  if (capture) disposeCapture = mountCapture(document.querySelector('#capture-controls'), patient, captureDraft, () => {
    const result = captureDraft.interpretation;
    if (result?.status !== 'ready' || !result.event.trim() || captureDraft.editDraft) return;
    if (result.observations && (!result.observations.length || result.observations.some(o => !o.confirmed || !o.timing.resolved))) return;
    captureDraft.confirmed = structuredClone({
      event: result.event, when: result.when, evidence: result.evidence,
      edited: Boolean(result.edited || result.observations?.some(o => o.edited)), source: captureDraft.source,
      confirmationId: captureDraft.confirmed?.confirmationId || createRecordId(),
      aiInterpretation: captureDraft.aiInterpretation || null,
      ...(result.interpretationVersion ? {interpretationVersion:result.interpretationVersion} : {}),
      ...(result.relatedGroups ? {relatedGroups:result.relatedGroups.filter(group=>group.observationIds.every(id=>result.observations.some(item=>item.id===id&&!item.edited)))} : {}),
      capturedAt: captureDraft.capturedAt || Date.now(),
      timeZone: captureDraft.timeZone || Intl.DateTimeFormat().resolvedOptions().timeZone,
      originalText: captureDraft.originalText || captureDraft.text,
      clarifications: captureDraft.clarifications || [],
      ...(result.observations ? {observations:result.observations,removedObservations:captureDraft.removedObservations || []} : {}),
    });
    track('update_confirmed',{fact_count:result.observations?.length??1,was_edited:captureDraft.confirmed.edited});
    if(session.isAuthenticated){captureDraft.saveRequested=true;location.hash='#record';}
    else location.hash = '#first-value';
  },stage=>{const labels=captureDraft.existingPatient ? ['Update','Review'] : ['Person','Update','Review'];document.querySelector('#journey-progress').innerHTML=journeyProgress(labels,stage==='review' ? labels.length-1 : labels.length-2);});
  if(capture) document.querySelector('#capture-back').onclick=()=>{captureDraft.saveRequested=false;};
  if (setup) {
    const form = document.querySelector('#patient-form');
    form.addEventListener('input', (event) => {
      if (patient[event.target.name] !== event.target.value) {
        captureDraft.interpretation = null;
        captureDraft.aiInterpretation = null;
        captureDraft.confirmed = null;
        captureDraft.editDraft = null;
        captureDraft.observationEdit = null;
        captureDraft.clarificationAnswer = '';
        captureDraft.clarifications = [];
      }
      patient[event.target.name] = event.target.value;
      event.target.removeAttribute('aria-invalid');
      document.querySelector(event.target.name === 'name' ? '#name-error' : '#relationship-error').hidden = true;
    });
    form.addEventListener('submit', (event) => {
      event.preventDefault();
      let firstInvalid;
      for (const [key, id, message] of [['name', 'patient-name', 'Enter their name.'], ['relationship', 'relationship', 'Enter your relationship to them.']]) {
        const input = document.getElementById(id);
        const error = document.getElementById(`${key}-error`);
        const invalid = !patient[key].trim();
        error.textContent = invalid ? message : '';
        error.hidden = !invalid;
        input.setAttribute('aria-invalid', String(invalid));
        if (invalid && !firstInvalid) firstInvalid = input;
      }
      if (firstInvalid) { firstInvalid.focus(); return; }
      patient.name = patient.name.trim();
      patient.relationship = patient.relationship.trim();
      track('setup_completed');
      location.hash = '#capture';
    });
  }
}

window.addEventListener('hashchange', render);
function canLeaveScreen() { return app.dispatchEvent(new CustomEvent('carenama:before-navigate',{cancelable:true})); }
mountNavigation(app, {
  getSession:()=>session,
  isLocked:()=>!authResolved || accountDeleting,
  isRecording:()=>app.querySelector('#voice')?.textContent === 'Stop recording',
  onPrivacy:()=>{if(!canLeaveScreen())return;privacyReturn=location.hash || '#';location.hash='#privacy';},
  onDelete:()=>{if(!canLeaveScreen())return;deletionReturn=location.hash || '#record';location.hash='#delete-account';},
  onTimeline:()=>{if(!canLeaveScreen())return false;if(location.hash==='#record'){app.dispatchEvent(new CustomEvent('carenama:open-timeline'));return true;}if(location.hash==='#capture' && captureDraft.text && !captureDraft.persisted && !confirm('Leave this unsaved update and return to the timeline? Adding another update will replace this draft.'))return false;location.hash='#record';return true;},
  onSignOut:async()=>{if(!canLeaveScreen())return false;if((captureDraft.text || captureDraft.audio || captureDraft.confirmed) && !captureDraft.persisted && !confirm('Sign out and discard your unsaved update?'))return false;await session.signOut();return true;},
});
render();
function clearDraft() {
  patient.name = ''; patient.relationship = '';
  delete patient.id;
  for (const key of Object.keys(captureDraft)) delete captureDraft[key];
  Object.assign(captureDraft, { text: '', source: 'text', audio: null, interpretation: null });
  Object.assign(loginDraft, { email: '', code: '', codeSent: false, sentAt: 0 });
}
startSession(next => {
  // A token being checked is not a logout. Keep the last settled identity and draft.
  if (next.isLoading) {
    session = { ...next, isAuthenticated: session.isAuthenticated };
    return;
  }
  const firstResolved = !authResolved;
  authResolved = true;
  const authChanged = session.isAuthenticated !== next.isAuthenticated;
  const becameSignedIn = !session.isAuthenticated && next.isAuthenticated;
  const signedOut = session.isAuthenticated && !next.isAuthenticated;
  session = next;
  if(signedOut)resetAnalytics();
  configureAnalytics(next);
  if(firstResolved&&!next.isAuthenticated&&!returningRecord())track('landing_viewed');
  if(becameSignedIn)track('signin_completed',{is_returning:returningRecord()});
  if(accountDeleting)return;
  if (signedOut) { clearDraft(); location.hash = '#'; }
  else if (becameSignedIn) {
    if(location.hash==='#privacy'){render();return;}
    if (location.hash === '#record') render();
    else location.hash = '#record';
  }
  else if(firstResolved && returningRecord() && ['', '#'].includes(location.hash)){location.replace('#signin');}
  else if(firstResolved || (authChanged && ['#signin', '#record'].includes(location.hash))) render();
});

import '@fontsource/inter/400.css';
import '@fontsource/inter/600.css';
import './style.css';
import { mountCapture } from './capture.js';
import { startSession } from './session.js';
import { mountSignIn } from './account.js';
import { mountTimeline } from './timeline.js';
import { savedObservationDetails } from './observation-display.js';
import { createRecordId } from './record-id.js';
import { mountPrivacy } from './privacy.js';
import { configureAnalytics,resetAnalytics,track } from './analytics.js';

const app = document.querySelector('#app');
// Unsaved capture details stay only in this open page.
const patient = { name: '', relationship: '' };
const captureDraft = { text: '', source: 'text', audio: null, interpretation: null };
let disposeCapture = () => {};
let disposeAccount = () => {};
let session = { isLoading: true, isAuthenticated: false };
let authResolved = false,accountDeleting=false,accountDeleted=false;
// A non-sensitive routing hint, never identity or authorization.
function returningRecord(){try{return localStorage.getItem('carenama.returning')==='1';}catch{return false;}}
function rememberRecord(){try{localStorage.setItem('carenama.returning','1');}catch{}}
const loginDraft = { email: '', code: '', codeSent: false };
const escapeHtml = (value) => value.replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));

function render() {
  disposeCapture();
  disposeAccount();
  if(!authResolved){app.innerHTML='<section class="screen"><h1>Opening CareNama</h1><p role="status">Checking your sign-in.</p></section>';return;}
  if(location.hash==='#privacy'){disposeAccount=mountPrivacy(app,session,()=>{location.hash=session.isAuthenticated?'#record':'#';});return;}
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
      <a class="back" id="capture-back" href="${captureDraft.existingPatient ? '#record' : '#patient-setup'}">${captureDraft.existingPatient ? 'Back to timeline' : 'Back'}</a>
      <div class="patient-context"><h2>${escapeHtml(patient.name)}</h2><p>${escapeHtml(patient.relationship)}</p></div>
      <div class="capture-intro"><h1 id="title" tabindex="-1">What would you like to note about ${escapeHtml(patient.name)}?</h1><p>Say it in your own words.</p></div>
      <div id="capture-controls"></div>
    </section>` : setup ? `
    <section class="screen setup" aria-labelledby="title">
      <a class="back" href="#">Back</a>
      <div class="intro">
        <h1 id="title" tabindex="-1">Who are you caring for?</h1>
        <p class="hint">For now, each account keeps notes for one person. If you already have a record, sign in to continue their timeline.</p>
        <a class="text-action" href="#signin">Already have a record? Sign in</a>
        <form id="patient-form" novalidate>
          <div class="field"><label for="patient-name">Their name</label><input id="patient-name" name="name" autocomplete="off" value="${escapeHtml(patient.name)}" aria-describedby="name-error" required><p id="name-error" class="error" hidden></p></div>
          <div class="field"><label for="relationship">Your relationship to them</label><input id="relationship" name="relationship" autocomplete="off" value="${escapeHtml(patient.relationship)}" aria-describedby="relationship-hint relationship-error" required><p id="relationship-hint" class="hint">For example, daughter, son or partner.</p><p id="relationship-error" class="error" hidden></p></div>
          <p class="reassurance">A name and your relationship are enough to start.</p>
          <p class="hint temporary">These details are temporary until you sign up. Refreshing this page will clear them.</p>
          <button class="primary" type="submit">Continue</button>
        </form>
      </div>
    </section>` : `
    <section class="screen welcome" aria-labelledby="title">
      ${accountDeleted?'<p role="status">Your account and health record have been permanently deleted.</p>':''}<div class="intro">
        <h1 id="title" tabindex="-1">A place for the details you want to remember.</h1>
        <p>Health notes for someone you care for, in your own words.</p>
      </div>
      <div class="folded-note" aria-hidden="true"><span class="note-fold"></span><span class="note-stroke"></span><span class="note-stroke short"></span><span class="note-stroke last"></span></div>
      <a class="primary" href="#patient-setup">Get started</a>
      <a class="returning-signin" href="#signin">Already started? Sign in</a><a class="text-action privacy-link" href="#privacy">Privacy &amp; your choices</a>
    </section>`;
  if (setup || capture || firstValue) document.querySelector('h1').focus();
  if (capture) disposeCapture = mountCapture(document.querySelector('#capture-controls'), patient, captureDraft, () => {
    const result = captureDraft.interpretation;
    if (result?.status !== 'ready' || !result.event.trim() || captureDraft.editDraft) return;
    if (result.observations && (!result.observations.length || result.observations.some(o => !o.confirmed || !o.timing.resolved))) return;
    captureDraft.confirmed = structuredClone({
      event: result.event, when: result.when, evidence: result.evidence,
      edited: Boolean(result.edited || result.observations?.some(o => o.edited)), source: captureDraft.source,
      confirmationId: captureDraft.confirmed?.confirmationId || createRecordId(),
      aiInterpretation: captureDraft.aiInterpretation || null,
      capturedAt: captureDraft.capturedAt || Date.now(),
      timeZone: captureDraft.timeZone || Intl.DateTimeFormat().resolvedOptions().timeZone,
      originalText: captureDraft.originalText || captureDraft.text,
      clarifications: captureDraft.clarifications || [],
      ...(result.observations ? {observations:result.observations,removedObservations:captureDraft.removedObservations || []} : {}),
    });
    track('update_confirmed',{fact_count:result.observations?.length??1,was_edited:captureDraft.confirmed.edited});
    if(captureDraft.existingPatient && session.isAuthenticated){captureDraft.saveRequested=true;location.hash='#record';}
    else location.hash = '#first-value';
  });
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

import { savedObservationDetails } from './observation-display.js';
const escape = value => String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));

export function mountSignIn(root, draft, session, hasUpdate) {
  let disposed = false, busy = false, error = '';
  function draw() {
    if (disposed) return;
    root.innerHTML = `<section class="screen setup" aria-labelledby="title">
      <a class="back" href="${hasUpdate ? '#first-value' : '#'}">${hasUpdate ? 'Back to your update' : 'Back'}</a>
      <h1 id="title" tabindex="-1">${draft.codeSent ? 'Check your email' : hasUpdate ? 'Keep this health record for next time.' : 'Welcome back.'}</h1>
      <p>${draft.codeSent ? `Enter the 8-digit code sent to ${escape(draft.email)}. It expires in 15 minutes.` : 'Sign in with your email. No password needed.'}</p>
      <form id="signin-form" novalidate>
        ${draft.codeSent ? `<div class="field"><label for="signin-code">Email code</label><input id="signin-code" name="code" type="text" inputmode="numeric" autocomplete="one-time-code" maxlength="8" value="${escape(draft.code || '')}" ${busy ? 'disabled' : ''}></div>` : `<div class="field"><label for="signin-email">Your email</label><input id="signin-email" name="email" type="email" autocomplete="email" maxlength="254" value="${escape(draft.email || '')}" ${busy ? 'disabled' : ''}></div>`}
        ${error ? `<p class="error" role="alert">${escape(error)}</p>` : ''}
        <button class="primary" type="submit" ${busy || session.isLoading ? 'disabled' : ''}>${busy ? draft.codeSent ? 'Verifying code…' : 'Sending code…' : draft.codeSent ? 'Verify code' : 'Continue'}</button>
      </form>
      ${draft.codeSent ? `<button class="secondary" id="resend" type="button" ${busy ? 'disabled' : ''}>Send another code</button><button class="secondary" id="change-email" type="button" ${busy ? 'disabled' : ''}>Use a different email</button>` : ''}
      <p class="hint reassurance">The login email contains only your code, never health information.</p>
      ${hasUpdate ? '<p class="hint">Your confirmed update stays in this open page until sign-in and saving succeed. Refreshing or closing clears it.</p>' : ''}
    </section>`;
    const input = root.querySelector('input');
    input.oninput = event => { draft[event.target.name] = event.target.value; };
    root.querySelector('form').onsubmit = async event => {
      event.preventDefault();
      if (busy) return;
      if (draft.codeSent) {
        if (!/^\d{8}$/.test(draft.code || '')) { error = 'Enter the 8-digit code from your email.'; draw(); root.querySelector('input').focus(); return; }
        busy = true; error = ''; draw();
        try { await session.signIn('email-otp', { email: draft.email, code: draft.code }); }
        catch { error = 'That code is incorrect or expired. Try again or request another code.'; }
        busy = false; draw();
      } else await sendCode();
    };
    root.querySelector('#resend')?.addEventListener('click', sendCode);
    root.querySelector('#change-email')?.addEventListener('click', () => { draft.codeSent = false; draft.code = ''; error = ''; draw(); root.querySelector('input').focus(); });
  }
  async function sendCode() {
    if (busy) return;
    draft.email = (draft.email || '').trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(draft.email)) { error = 'Enter a valid email address.'; draw(); root.querySelector('input').focus(); return; }
    if (draft.sentAt && Date.now() - draft.sentAt < 60_000) { error = 'Wait a minute before requesting another code.'; draw(); return; }
    busy = true; error = ''; draw();
    try {
      await session.signIn('email-otp', { email: draft.email });
      draft.codeSent = true; draft.code = ''; draft.sentAt = Date.now();
    } catch {
      draft.codeSent = false;
      error = 'We couldn’t send your code. Wait a minute and try again.';
    }
    busy = false; draw(); root.querySelector('input')?.focus();
  }
  draw(); root.querySelector('h1').focus();
  return () => { disposed = true; };
}

export function mountRecord(root, session, pending, onSaved, onSignOut) {
  let disposed = false, generation = 0;
  const shell = content => { if (!disposed) root.innerHTML = `<section class="screen setup" aria-labelledby="title">${content}</section>`; };
  async function load(trySave = true) {
    const request = ++generation;
    shell(`<h1 id="title" tabindex="-1">${pending && trySave ? 'Keeping your health record…' : 'Opening your health record…'}</h1><p role="status">${pending && trySave ? 'Saving your confirmed update.' : 'Loading your saved update.'}</p>`);
    try {
      if (pending && trySave) await session.saveRecord(pending);
      const record = await session.getRecord();
      if (disposed || request !== generation) return;
      if (pending && trySave) onSaved();
      shell(record ? `<h1 id="title" tabindex="-1">${escape(record.name)}’s health story</h1>
        <p>Your confirmed update is saved for next time.</p>
        <article class="capture-result confirmed-event"><h2>Your saved update</h2>${savedObservationDetails(record.event)}
        ${record.event.edited ? '<p class="hint">Edited by you.</p>' : ''}
        ${record.event.clarifications.length ? `<details><summary>Your clarification</summary>${record.event.clarifications.map(item => `<p>${escape(item.question)}</p><p class="original-update">${escape(item.answer)}</p>`).join('')}</details>` : ''}
        <details><summary>Your original update</summary><p class="original-update">${escape(record.event.originalText)}</p></details></article>
        <button class="secondary" id="signout" type="button">Sign out</button>` : `<h1 id="title" tabindex="-1">Your health story starts with an update.</h1><p>There’s no saved health record in this account yet.</p><a class="primary account-start" href="#patient-setup">Get started</a><button class="secondary" id="signout" type="button">Sign out</button>`);
      root.querySelector('h1').focus();
      root.querySelector('#signout').onclick = async () => {
        try { await session.signOut(); if (!disposed) onSignOut(); }
        catch { root.querySelector('#signout').insertAdjacentHTML('beforebegin', '<p class="error" role="alert">Couldn’t sign out. Try again.</p>'); }
      };
    } catch (cause) {
      if (disposed || request !== generation) return;
      const conflict = /already has a health record/.test(cause.message || '');
      shell(`<h1 id="title" tabindex="-1">${pending ? 'Your update is still here.' : 'We couldn’t open your record.'}</h1><p class="error" role="alert">${conflict ? 'This account already has a health record. Your new update has not been saved.' : pending ? 'We couldn’t save your update. Try again without closing this page.' : 'Try again in a moment.'}</p><button class="primary account-start" id="retry" type="button">Try again</button>${pending ? '<a class="secondary account-link" href="#first-value">Back to your update</a>' : ''}${conflict ? '<button class="secondary" id="existing" type="button">View existing record</button>' : ''}`);
      root.querySelector('#retry').onclick = () => load(trySave);
      root.querySelector('#existing')?.addEventListener('click', () => load(false));
    }
  }
  load();
  return () => { disposed = true; generation++; };
}

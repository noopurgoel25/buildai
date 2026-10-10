import { warmNote } from './ui.js';
const escape = value => String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));

export function mountSignIn(root, draft, session, hasUpdate, patient = {}) {
  let disposed = false, busy = false, error = '';
  function draw() {
    if (disposed) return;
    root.innerHTML = `<section class="screen setup" aria-labelledby="title">
      <a class="back" href="${hasUpdate ? '#first-value' : '#'}">${hasUpdate ? 'Back to your update' : 'Back'}</a>
      <h1 id="title" tabindex="-1">${draft.codeSent ? (hasUpdate ? 'Keep this note safe for later' : 'Welcome back.') : hasUpdate ? 'Save your update for next time.' : 'Welcome back.'}</h1>
      <p>${draft.codeSent ? `Enter the 6-digit code sent to <strong>${escape(draft.email)}</strong>. It expires in 15 minutes.` : 'Use your email to keep these notes safe. No password needed.'}</p>
      <form id="signin-form" novalidate>
        ${draft.codeSent ? `<div class="field"><label for="signin-code">Email code</label><input id="signin-code" class="six-digit-code" name="code" type="text" inputmode="numeric" autocomplete="one-time-code" maxlength="6" value="${escape(draft.code || '')}" ${busy ? 'disabled' : ''}></div>` : `<div class="field"><label for="signin-email">Your email</label><input id="signin-email" name="email" type="email" autocomplete="email" maxlength="254" value="${escape(draft.email || '')}" ${busy ? 'disabled' : ''}></div>`}
        ${error ? `<p class="error" role="alert">${escape(error)}</p>` : ''}
        <button class="primary" type="submit" ${busy || session.isLoading ? 'disabled' : ''}>${busy ? draft.codeSent ? 'Verifying code…' : 'Sending code…' : draft.codeSent ? (hasUpdate ? 'Verify &amp; save update' : 'Verify &amp; continue') : 'Continue'}</button>
      </form>
      ${draft.codeSent && hasUpdate ? `<p class="hint action-caption">Your update will be saved to ${escape(patient.name)}&#8217;s record.</p>` : ''}
      ${draft.codeSent ? `<div class="signin-actions"><button class="text-action" id="resend" type="button" ${busy ? 'disabled' : ''}>Resend code</button><button class="text-action" id="change-email" type="button" ${busy ? 'disabled' : ''}>Change email</button></div>` : ''}
      ${warmNote('Only you can access this record. You choose what to share.', 'lock')}
      ${hasUpdate ? '<p class="hint">Unsaved &middot; Closing or refreshing clears this note.</p>' : ''}
    </section>`;
    const input = root.querySelector('input');
    input.oninput = event => { draft[event.target.name] = event.target.value; };
    root.querySelector('form').onsubmit = async event => {
      event.preventDefault();
      if (busy) return;
      if (draft.codeSent) {
        if (!/^\d{6}$/.test(draft.code || '')) { error = 'Enter the 6-digit code from your email.'; draw(); root.querySelector('input').focus(); return; }
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

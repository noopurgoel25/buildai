const escape = value => String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));

export function mountSignIn(root, draft, session, hasUpdate) {
  let disposed = false, busy = false, error = '';
  function draw() {
    if (disposed) return;
    root.innerHTML = `<section class="screen setup" aria-labelledby="title">
      <a class="back" href="${hasUpdate ? '#first-value' : '#'}">${hasUpdate ? 'Back to your update' : 'Back'}</a>
      <h1 id="title" tabindex="-1">${draft.codeSent ? 'Check your email' : hasUpdate ? 'Save your update for next time.' : 'Welcome back.'}</h1>
      <p>${draft.codeSent ? `Enter the 8-digit code sent to ${escape(draft.email)}. It expires in 15 minutes.` : 'Use your email to keep these notes safe. No password needed.'}</p>
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

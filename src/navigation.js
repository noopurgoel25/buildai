const arrow = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m14 5-7 7 7 7M7 12h14"/></svg>';

// Navigation opens independently of the screen: recording and edits stay mounted.
export function mountNavigation(root, { getSession, onPrivacy, onDelete, onSignOut, onTimeline, isLocked, isRecording }) {
  const trigger = document.querySelector('#open-navigation');
  const panel = document.querySelector('#common-navigation');
  const content = panel.querySelector('.navigation-content');
  let signingOut = false;
  function close() { panel.close(); trigger.setAttribute('aria-expanded', 'false'); trigger.focus(); }
  function draw() {
    const authenticated = getSession().isAuthenticated;
    content.innerHTML = `<nav aria-label="CareNama navigation">
      ${authenticated ? '<h2>Your record</h2><button id="menu-record" type="button">Your timeline</button>' : '<a href="#signin">Sign in</a>'}
      <h2>Support</h2><button id="menu-help" type="button">What can I record?</button><a id="menu-privacy" href="#privacy">Privacy &amp; your choices</a>
      ${authenticated ? '<h2>Account</h2><button id="signout" type="button">Sign out</button><button id="delete-account" class="remove-action" type="button">Delete account and record</button>' : ''}
      <p class="navigation-reassurance">You don’t need to capture everything. Start with what you want to remember.</p><p id="navigation-error" class="error" role="alert" hidden></p></nav>`;
    content.querySelectorAll('a').forEach(link => link.addEventListener('click', event => { if (isRecording() || signingOut) event.preventDefault(); else if (link.id !== 'menu-privacy') close(); }));
    content.querySelector('#menu-privacy').onclick = event => { event.preventDefault(); if (isRecording() || signingOut) return; close(); onPrivacy(); };
    content.querySelector('#menu-record')?.addEventListener('click', () => { if (!signingOut && onTimeline()) close(); });
    content.querySelector('#delete-account')?.addEventListener('click', () => { if(signingOut)return;close(); onDelete(); });
    content.querySelector('#signout')?.addEventListener('click', async event => {
      if (signingOut) return;
      signingOut = true; event.currentTarget.disabled = true;
      content.querySelector('#menu-help').disabled = true;
      try { if (await onSignOut()) close(); }
      catch { const error = content.querySelector('#navigation-error'); error.hidden = false; error.textContent = 'We couldn’t sign you out. Try again.'; }
      finally { signingOut = false; const button=content.querySelector('#signout');if(button)button.disabled=false;const help=content.querySelector('#menu-help');if(help)help.disabled=false; }
    });
    content.querySelector('#menu-help').onclick = () => {
      if(signingOut)return;
      content.innerHTML = '<section aria-labelledby="record-help-title"><h2 id="record-help-title" tabindex="-1">A small note is enough.</h2><p>You can record a symptom, a reading, a medicine change or something different in their day.</p><p>For example: “Dad felt dizzy after lunch today.” Say or type it in your own words, then check the details before saving.</p><button id="help-back" type="button">Back to menu</button></section>';
      content.querySelector('#help-back').onclick = () => { draw(); content.querySelector('#menu-help').focus(); };
      content.querySelector('h2').focus();
    };
    if (isRecording()) {
      for (const id of ['menu-record','signout','delete-account']) { const button=content.querySelector('#'+id); if (button) button.disabled=true; }
      content.querySelectorAll('a').forEach(link=>{link.setAttribute('aria-disabled','true');link.tabIndex=-1;});
      const notice=document.createElement('p');notice.className='hint';notice.textContent='Finish your recording before leaving this screen.';content.prepend(notice);
    }
  }
  trigger.onclick = () => {
    if (isLocked() || signingOut) return;
    draw(); panel.showModal(); trigger.setAttribute('aria-expanded', 'true'); panel.querySelector('#close-navigation').focus();
  };
  panel.querySelector('#close-navigation').onclick = close;
  panel.addEventListener('cancel', event => { if (signingOut) event.preventDefault(); });
  panel.addEventListener('close', () => { trigger.setAttribute('aria-expanded', 'false'); trigger.focus(); });
  function enhanceBacks() {
    root.querySelectorAll('.back').forEach(back => {
      const label = back.textContent.trim();
      if (!label || back.dataset.navigationLabel === label) return;
      back.dataset.navigationLabel = label;
      back.setAttribute('aria-label', label);
      back.setAttribute('title', label);
      const text = document.createElement('span'); text.className = 'visually-hidden'; text.textContent = label;
      back.innerHTML = arrow; back.append(text);
    });
  }
  const observer = new MutationObserver(enhanceBacks);
  observer.observe(root, { childList: true, subtree: true, characterData: true });
  enhanceBacks();
}

import { personContext, icon, warmNote } from './ui.js';
const arrow = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m14 5-7 7 7 7M7 12h14"/></svg>';

// Navigation opens independently of the screen: recording and edits stay mounted.
export function mountNavigation(root, { getSession, getPatient, onPrivacy, onDelete, onSignOut, onTimeline, onSummary, isLocked, isRecording }) {
  const trigger = document.querySelector('#open-navigation');
  const panel = document.querySelector('#common-navigation');
  const content = panel.querySelector('.navigation-content');
  let signingOut = false;
  function close() { panel.close(); trigger.setAttribute('aria-expanded', 'false'); trigger.focus(); }
  function draw() {
    const authenticated = getSession().isAuthenticated;
    const patient=getPatient?.();
    content.innerHTML = `<h1 id="navigation-title">Your CareNama</h1>${authenticated && patient?`${personContext(patient)}<p class="hint">You’re keeping notes for ${escapeText(patient.name)}.</p>`:''}<nav aria-label="CareNama navigation">
      ${authenticated ? `<h2>Your record</h2><button id="menu-record" type="button">Timeline${icon('chevron')}</button><button id="menu-summary" type="button">Summary${icon('chevron')}</button>` : '<a href="#signin">Sign in</a>'}
      <h2>Support</h2><button id="menu-help" type="button">What can I record?</button><a id="menu-privacy" href="#privacy">Privacy &amp; your choices</a>
      ${authenticated ? '<h2>Account</h2><button id="signout" type="button">Sign out</button><button id="delete-account" class="remove-action" type="button">Delete account and record</button>' : ''}
      ${warmNote('You don’t need to capture everything. Start with what you want to remember.')}<p id="navigation-error" class="error" role="alert" hidden></p></nav>`;
    content.querySelectorAll('a').forEach(link => link.addEventListener('click', event => { if (isRecording() || signingOut) event.preventDefault(); else if (link.id !== 'menu-privacy') close(); }));
    content.querySelector('#menu-privacy').onclick = event => { event.preventDefault(); if (isRecording() || signingOut) return; close(); onPrivacy(); };
    content.querySelector('#menu-record')?.addEventListener('click', () => { if (!signingOut && onTimeline()) close(); });
    content.querySelector('#menu-summary')?.addEventListener('click', () => { if (!signingOut && onSummary()) close(); });
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
      for (const id of ['menu-record','menu-summary','signout','delete-account']) { const button=content.querySelector('#'+id); if (button) button.disabled=true; }
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
    const source=[...root.querySelectorAll('.back')].at(-1);
    const header=document.querySelector('.app-header');
    const previous=header.querySelector('#screen-back');
    if(!source){previous?.remove();header.classList.remove('has-back');return;}
    source.hidden=true;
    const label=source.getAttribute('aria-label') || source.textContent.trim();
    if(previous)previous.disabled=Boolean(source.disabled);
    if(previous?.backSource===source && previous.getAttribute('aria-label')===label)return;
    previous?.remove();
    const back=document.createElement(source.tagName.toLowerCase());
    back.id='screen-back';back.className='navigation-icon';back.setAttribute('aria-label',label);back.title=label;
    back.disabled=Boolean(source.disabled);
    if(source.tagName==='A')back.href=source.href;else back.type='button';
    back.innerHTML=arrow;back.backSource=source;
    back.onclick=event=>{event.preventDefault();if(!source.disabled && !isLocked() && !isRecording())source.click();};
    header.prepend(back);header.classList.add('has-back');
  }
  function escapeText(value){const span=document.createElement('span');span.textContent=value;return span.innerHTML;}
  const observer = new MutationObserver(enhanceBacks);
  observer.observe(root, { childList: true, subtree: true, characterData: true, attributes:true, attributeFilter:['disabled'] });
  enhanceBacks();
}

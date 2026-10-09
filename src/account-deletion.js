import { escape } from './observation-display.js';

export function mountAccountDeletion(root,session,patient,onBack,onDeleted,onDeleting=()=>{},alreadyStarted=false) {
  let disposed=false,busy=false,challengeId='',code='',error='',sentAt=0,started=alreadyStarted;
  function draw(){if(disposed)return;
    root.innerHTML=`<section class="screen account-deletion" aria-labelledby="title"><h1 id="title" tabindex="-1">Delete account and record?</h1><p>This permanently removes your CareNama account${patient?`, ${escape(patient.name)}’s record`:''}, every saved update and its original words.</p><p class="deletion-warning">This cannot be undone. Signing in again will start a new, empty account.</p>${challengeId?`<p>We sent a fresh six-digit deletion code to your sign-in email. It expires in 15 minutes.</p><form id="delete-account-form" novalidate><label for="deletion-code">Deletion code</label><input id="deletion-code" inputmode="numeric" autocomplete="one-time-code" pattern="[0-9]{6}" maxlength="6" value="${escape(code)}" aria-describedby="deletion-error" ${busy?'disabled':''}><button class="primary account-start destructive" type="submit" ${busy?'disabled':''}>${busy?'Removing your account…':'Permanently delete account and record'}</button></form>`:`<p class="hint">First, we’ll send a new code to the email you use to sign in. No health details go into the email.</p><button class="primary account-start" id="send-deletion-code" type="button" ${busy?'disabled':''}>${busy?'Sending your code…':'Send deletion code'}</button>`}<p class="error" id="deletion-error" role="alert" ${error?'':'hidden'}>${escape(error)}</p>${started?'<p class="hint">Deletion has started. Your record is locked while it is removed.</p>':`<button class="text-action account-link" id="cancel-account-deletion" type="button" ${busy?'disabled':''}>Keep my account</button>`}${challengeId&&!started?`<button class="text-action account-link" id="resend-deletion-code" type="button" ${busy?'disabled':''}>Send a new code</button>`:''}</section>`;
    root.querySelector('#cancel-account-deletion')?.addEventListener('click',()=>{disposed=true;onBack();});
    root.querySelector('#send-deletion-code')?.addEventListener('click',sendCode);
    root.querySelector('#resend-deletion-code')?.addEventListener('click',sendCode);
    root.querySelector('#deletion-code')?.addEventListener('input',event=>{code=event.target.value;error='';root.querySelector('#deletion-error').hidden=true;});
    root.querySelector('#delete-account-form')?.addEventListener('submit',confirm);
    if(started){
      root.querySelector('h1').textContent='Finish deleting your account';
      root.querySelector('#send-deletion-code')?.remove();root.querySelector('#delete-account-form')?.remove();const explanation=root.querySelector('.deletion-warning + p');if(explanation)explanation.textContent='You already confirmed deletion with a fresh email code. Continue removing the remaining account data.';
      const button=document.createElement('button');button.className='primary account-start destructive';button.type='button';button.disabled=busy;button.textContent=busy?'Removing your account…':'Finish deleting my account';button.onclick=confirm;root.querySelector('.account-deletion').append(button);
    }
  }
  async function sendCode(){if(busy||disposed)return;if(sentAt&&Date.now()-sentAt<60_000){error='Please wait a minute before requesting another code.';draw();return;}
    busy=true;error='';draw();
    try{const response=await session.requestDeletionCode();if(disposed)return;challengeId=response.challengeId;code='';sentAt=Date.now();}
    catch(cause){if(disposed)return;error=/hour/.test(cause.message??'')?'Too many incorrect codes. Try again in an hour.':/wait a minute/.test(cause.message??'')?'Please wait a minute before requesting another code.':'We couldn’t send your deletion code. Wait a minute and try again. Your account is still here.';}
    busy=false;draw();root.querySelector('#deletion-code')?.focus();
  }
  async function confirm(event){event.preventDefault();if(busy||disposed)return;
    if(!started&&!/^\d{6}$/.test(code)){error='Enter the six-digit deletion code from your email.';draw();root.querySelector('#deletion-code')?.focus();return;}
    busy=true;error='';onDeleting(true);draw();
    try{await session.deleteAccount({challengeId,code});if(disposed)return;
      // Convex Auth clears local credentials even after the sessions were deleted.
      await session.signOut();if(disposed)return;disposed=true;onDeleted();
    }catch(cause){if(disposed)return;started=started||/Deletion has started/.test(cause.message??'');const message=cause.message??'';error=/not correct/.test(message)?'That deletion code is not correct. Try again.':/expired/.test(message)?'That deletion code has expired. Request a new code.':/hour/.test(message)?'Too many incorrect codes. Try again in an hour.':started?'Deletion has started. Retry to finish removing your account.':'We couldn’t confirm completion. Try again. If deletion already started, it will continue.';busy=false;draw();onDeleting(false);}
  }
  draw();root.querySelector('h1').focus();return()=>{disposed=true;};
}

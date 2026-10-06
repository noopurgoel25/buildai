import { escape } from './observation-display.js';

export function mountSummarySharing(root,session,patient,period,result,draft) {
  let disposed=false,busy=false,error='',notice='',blocked=false,manualCopy=false,pendingHandoff=null;
  const records=[...new Map([...result.sources,...result.undated].map(source=>[source.recordId,{id:source.recordId,revision:source.revision}])).values()];
  const request=()=>({patientId:patient.id,...period,records,datedCount:result.sources.length,undatedCount:result.undatedCount,groups:result.groups,overviewIds:(result.overview||[]).map(item=>item.id),text:draft.text});
  const canShare=()=>window.isSecureContext && typeof navigator.share==='function';
  function controls(){
    const editor=root.querySelector('#sharing-text');if(editor)editor.disabled=busy;
    root.querySelectorAll('[data-send]').forEach(button=>button.disabled=busy||blocked||draft.text===null||!draft.text.trim()||draft.text.length>40000);
    const status=root.querySelector('#sharing-status');if(status){status.textContent=busy?'Checking your saved notes…':notice;status.hidden=!status.textContent;}
    const alert=root.querySelector('#sharing-error');if(alert){alert.textContent=error;alert.hidden=!error;}
    const count=root.querySelector('#sharing-count');if(count)count.textContent=`${(draft.text||'').length.toLocaleString()} / 40,000 characters`;
    root.querySelector('#manual-copy')?.toggleAttribute('hidden',!manualCopy);
  }
  function draw(){if(disposed)return;
    root.innerHTML=`<section class="sharing-review" aria-labelledby="sharing-title"><h2 id="sharing-title" tabindex="-1">Make it yours before sharing</h2><p>Read through and change anything you’d like. Your saved health notes stay as they are.</p>${draft.text===null?'<p role="status">Opening your sharing draft…</p>':`<label for="sharing-text">Text to share</label><textarea id="sharing-text" rows="12" maxlength="40000" aria-describedby="sharing-help sharing-count">${escape(draft.text)}</textarea><p class="hint" id="sharing-count"></p><p class="hint" id="sharing-help">This draft stays only in this open page. Changes won’t be saved to the health record.</p>${canShare()?'': '<p class="hint">Use Copy text to paste this into the app you choose.</p>'}<div class="sharing-actions">${canShare()?'<button class="primary" type="button" data-send="share">Share</button>':''}<button class="${canShare()?'secondary':'primary'}" type="button" data-send="copy">Copy text</button></div><p class="hint" id="manual-copy" hidden>Automatic copying isn’t available here. The text is selected; use Copy on your device.</p>`}<p class="hint" id="sharing-status" role="status" hidden></p><p class="error" id="sharing-error" role="alert" hidden></p>${draft.text===null?'<button class="secondary" id="sharing-retry" type="button" hidden>Try again</button>':''}</section>`;
    root.querySelector('#sharing-retry')?.addEventListener('click',open);
    root.querySelector('#sharing-text')?.addEventListener('input',event=>{draft.text=event.target.value;pendingHandoff=null;error='';notice='';manualCopy=false;controls();});
    root.querySelectorAll('[data-send]').forEach(button=>button.onclick=()=>send(button.dataset.send));
    controls();
  }
  async function check(){const response=await session.prepareSummaryShare(request());if(disposed)return null;if(response.status!=='ready'){blocked=true;error=response.message;return null;}blocked=false;return response;}
  async function open(){if(busy||disposed)return;busy=true;error='';draw();try{const response=await check();if(disposed)return;if(response){draft.text=response.text;draft.originalText=response.text;}}catch{if(disposed)return;error='We couldn’t check the saved notes. Try again; your summary is still here.';}busy=false;draw();const retry=root.querySelector('#sharing-retry');if(retry)retry.hidden=!error;root.querySelector('#sharing-title').focus();}
  async function send(kind){if(busy||blocked||disposed)return;let checked=false;busy=true;error='';notice='';manualCopy=false;controls();
    try{
      // A slow server check can outlast the browser's click permission. A second
      // explicit click hands off the same just-checked text without another wait.
      const response=kind==='share' && pendingHandoff && pendingHandoff.text===draft.text && Date.now()-pendingHandoff.checkedAt<15000?pendingHandoff:await check();if(disposed)return;if(!response)return;
      pendingHandoff=null;
      checked=true;const payload={title:response.title,text:response.text};
      if(kind==='share'){
        if(!canShare() || (navigator.canShare && !navigator.canShare(payload))){notice='Sharing isn’t available here. Use Copy text instead.';return;}
        if(navigator.userActivation && !navigator.userActivation.isActive){pendingHandoff={...response,checkedAt:Date.now()};notice='Your draft is checked. Tap Share to open your device’s menu.';return;}
        await navigator.share(payload);if(disposed)return;notice='Sharing completed on this device. Your draft is still here.';
      }else{
        if(!window.isSecureContext || !navigator.clipboard?.writeText){selectText();return;}
        try{await navigator.clipboard.writeText(response.text);if(disposed)return;notice='Copied. Paste it into the app you choose.';}catch{if(disposed)return;selectText();}
      }
    }catch(cause){if(disposed)return;if(kind==='share' && cause.name==='AbortError')notice='Sharing cancelled. Your draft is still here.';
      else error=kind==='share' && checked?'We couldn’t open sharing. Your draft is still here. Try again or use Copy text.':'We couldn’t check the saved notes. Your draft is still here. Try again.';
    }finally{if(!disposed){busy=false;controls();if(manualCopy)selectText();}}
  }
  function selectText(){manualCopy=true;notice='';const editor=root.querySelector('#sharing-text');if(editor){editor.focus();editor.select();}}
  draw();if(draft.text===null)open();else root.querySelector('#sharing-title').focus();
  return()=>{disposed=true;};
}

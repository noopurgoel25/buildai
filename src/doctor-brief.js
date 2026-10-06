import { escape, captureLabel } from './observation-display.js';
import { validDate } from '../convex/lib/observationTiming.ts';

const dateLabel=value=>new Intl.DateTimeFormat('en-GB',{dateStyle:'medium',timeZone:'UTC'}).format(new Date(`${value}T12:00:00Z`));
function fact(source) {
  return `<li><div><p class="fact-text">${escape(source.event)}</p><p class="fact-time">${source.date?escape(dateLabel(source.date)):'Timing not known'}${source.when && !/^(today|yesterday|Not specified|Unknown)$/i.test(source.when)?` · ${escape(source.when)}`:''}</p><p class="brief-evidence">${escape(source.evidence)}${source.polarity==='absent'?' · Explicitly absent':source.polarity==='uncertain'?' · Uncertain':''}</p><details class="summary-source"><summary>View source</summary>${source.edited?'<p>Corrected by you.</p>':''}<p class="hint">Captured on ${escape(captureLabel(source))}</p><p class="original-update">${escape(source.supportingWords)}</p></details></div></li>`;
}

export function mountDoctorBrief(root,session,patient,onBack,initialPeriod=null) {
  const today=new Intl.DateTimeFormat('en-CA',{timeZone:Intl.DateTimeFormat().resolvedOptions().timeZone}).format(Date.now());
  let start=initialPeriod?.start || new Date(Date.parse(`${today}T12:00:00Z`)-13*86400000).toISOString().slice(0,10),end=initialPeriod?.end || today;
  let busy=false,error='',result=null,disposed=false;
  function facts(keys){return keys.map(key=>fact(result.sources.find(s=>s.key===key))).join('');}
  function section(section) {
    return `<section class="brief-section"><h3>${escape(section.title)}</h3><ul class="update-facts">${facts(section.keys.slice(0,3))}</ul>${section.keys.length>3?`<details class="brief-more"><summary>${section.keys.length-3} more recorded ${section.keys.length===4?'detail':'details'}</summary><ul class="update-facts">${facts(section.keys.slice(3))}</ul></details>`:''}</section>`;
  }
  function resultMarkup() {
    if(!result)return '';
    return `<div class="brief-result" aria-live="polite"><h2 tabindex="-1">${escape(dateLabel(start))} to ${escape(dateLabel(end))}</h2>${result.status==='empty'?'<p>There are no dated updates to include in a doctor brief for this period.</p>':result.status==='too_many'?`<p>${escape(result.message)}</p>`:`<p class="hint">Based on ${result.recordCount} saved ${result.recordCount===1?'update':'updates'}. ${result.recordCount<=2?'Only a few updates are available, so this gives a limited picture.':''}</p><article class="doctor-brief" aria-label="Doctor brief"><section class="brief-section brief-overview"><h3>Overall progress</h3><p>${result.overview.length?escape(result.overview.map(item=>item.text).join(' ')):'The saved notes do not establish an overall change in health for this period.'}</p>${result.overview.length?`<details class="brief-more"><summary>Notes behind this overview</summary><ul class="update-facts">${facts([...new Set(result.overview.flatMap(item=>item.keys))])}</ul></details>`:''}</section>${result.sections.map(section).join('')}<section class="brief-section brief-discussion"><h3>Points to discuss</h3>${result.discussionKeys.length?`<p class="hint">Recorded questions and points from the notes, with their original wording.</p><ul class="update-facts">${facts(result.discussionKeys.slice(0,3))}</ul>${result.discussionKeys.length>3?`<details class="brief-more"><summary>${result.discussionKeys.length-3} more recorded points</summary><ul class="update-facts">${facts(result.discussionKeys.slice(3))}</ul></details>`:''}`:'<p>No specific questions or discussion points are available from these notes.</p>'}</section></article><p class="hint brief-limits">Only recorded details are included. A symptom first appearing in the notes is not automatically a new symptom; days without notes do not establish its absence.</p><details class="summary-prepared"><summary>About this brief</summary><p class="hint">Prepared ${escape(captureLabel({capturedAt:result.generatedAt,timeZone:Intl.DateTimeFormat().resolvedOptions().timeZone}))}.</p><p class="hint">This brief stays in this open page and has not been shared.</p></details>`}${result.undatedCount?`<details class="undated-summary"><summary>${result.undatedCount} ${result.undatedCount===1?'detail with uncertain timing':'details with uncertain timing'}</summary><p class="hint">Recorded in this period, but their occurrence dates are unknown. These are separate from the dated brief.</p><ul class="update-facts">${result.undated.map(fact).join('')}</ul>${result.undatedCount>result.undated.length?`<p class="hint">Showing the first ${result.undated.length} undated details.</p>`:''}</details>`:''}</div>`;
  }
  function draw() {
    if(disposed)return;
    root.innerHTML=`<section class="screen period-summary doctor-brief-screen" aria-labelledby="title"><button class="text-action back" id="brief-back" type="button">Back to timeline</button><h1 id="title" tabindex="-1">${escape(patient.name)}’s doctor brief</h1><p>A clear set of notes for your next conversation.</p>${result?'<details class="summary-period-picker"><summary>Change dates</summary>':''}<form id="brief-period" novalidate><div class="period-dates"><div><label for="brief-start">From</label><input id="brief-start" type="date" value="${start}" ${busy?'disabled':''}></div><div><label for="brief-end">To</label><input id="brief-end" type="date" value="${end}" ${busy?'disabled':''}></div></div><p class="hint">Choose the period you want to discuss. Dates refer to when things happened.</p><button class="primary account-start" type="submit" ${busy?'disabled':''}>${busy?'Preparing your doctor brief…':'Prepare doctor brief'}</button></form>${result?'</details>':''}${busy?'<p role="status">Bringing the saved notes together.</p>':''}${error?`<p class="error" role="alert">${escape(error)}</p>`:''}${resultMarkup()}</section>`;
    root.querySelector('#brief-back').onclick=()=>{disposed=true;onBack();};
    function change(){start=root.querySelector('#brief-start').value;end=root.querySelector('#brief-end').value;result=null;error='';root.querySelector('.brief-result')?.remove();root.querySelector('[role="alert"]')?.remove();}
    root.querySelector('#brief-start').oninput=change;root.querySelector('#brief-end').oninput=change;
    root.querySelector('#brief-period').onsubmit=event=>{event.preventDefault();prepare();};
  }
  async function prepare() {
    if(busy || disposed)return;
    if(!validDate(start)||!validDate(end)||start>end){error='Choose valid dates, with the start before the end.';result=null;draw();return;}
    busy=true;error='';result=null;draw();
    try{const response=await session.generateDoctorBrief({patientId:patient.id,start,end});if(disposed)return;result=response;}
    catch{if(disposed)return;error='Busy right now. Try again in a few minutes. Your saved notes are still there.';}
    busy=false;draw();root.querySelector('.brief-result h2')?.focus();
  }
  draw();root.querySelector('h1').focus();if(initialPeriod)prepare();
  return()=>{disposed=true;};
}

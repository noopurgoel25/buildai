import { track,bucket } from './analytics.js';
import { personContext, recordTabs, icon } from './ui.js';
import { summaryPresentation } from '../convex/lib/summaryShare.ts';
import { escape, captureLabel } from './observation-display.js';
import { mountSummarySharing } from './summary-sharing.js';
import { validDate, formatDate, parseDisplayDate, localDate } from '../convex/lib/observationTiming.ts';
import { dateInput, bindDateInput } from './date-input.js';

export function mountPeriodSummary(root,session,patient,onBack) {
  const today=localDate(Date.now(),Intl.DateTimeFormat().resolvedOptions().timeZone);
  let start=new Date(Date.parse(`${today}T12:00:00Z`)-13*86400000).toISOString().slice(0,10),end=today,busy=false,error='',result=null,disposed=false,sharing=false,detailsView=false,detailsOrigin=null;
  let startInput=formatDate(start),endInput=formatDate(end);
  let sharingDraft={text:null,originalText:null},disposeSharing=()=>{};
  const hasEdits=()=>sharingDraft.text!==null && sharingDraft.text!==sharingDraft.originalText;
  const canDiscard=()=>!hasEdits() || window.confirm('This will clear your sharing edits. Your saved health notes will stay unchanged. Continue?');
  const beforeNavigate=event=>{if(!canDiscard())event.preventDefault();};
  root.addEventListener('carenama:before-navigate',beforeNavigate);
  const dateLabel=formatDate;
  function periodLabel(){return start===end?dateLabel(end):`${dateLabel(start)} to ${dateLabel(end)}`;}
  function source(source){return `<li><div><p class="fact-text">${escape(source.event)}</p>${changeLabel(source)}${source.measurement?`<p class="hint">Recorded measurement: ${escape(source.measurement.kind.replaceAll('_',' '))} ${escape(source.measurement.value)}${source.measurement.unit?` ${escape(source.measurement.unit)}`:''}</p>`:''}<p class="fact-time">${source.date?escape(dateLabel(source.date)):'Timing not known'}${source.when && !/^(today|yesterday|Not specified|Unknown)$/i.test(source.when)?` · ${escape(source.when)}`:''}</p><details class="summary-source"><summary>View source</summary><p>Evidence: ${escape(source.evidence)}</p>${source.edited?'<p>Corrected by you.</p>':''}<p>${escape({present:'Explicitly present',absent:'Explicitly absent',uncertain:'Uncertain'}[source.polarity] || 'Uncertain')}</p><p class="hint">Captured on ${escape(captureLabel(source))}</p><p class="original-update">${escape(source.supportingWords)}</p></details></div></li>`;}
  function changeLabel(item){const section=result?.sections?.find(section=>section.keys.includes(item.key));return section && ['Reported improvements','Reported worsening or new symptoms'].includes(section.title)?`<p class="hint">${escape(section.title)}</p>`:'';}
  const presentation=()=>result.presentation??summaryPresentation(result);
  function highlightsMarkup(mode){
    const {notable,categories,narrative}=presentation();
    const patternKeys=new Set((result.overview || []).flatMap(item=>item.keys));
    // Reserve room for headings, category labels/counts and attribution. Keep
    // complete notes only; full wording remains in the detail view.
    let highlightBudget=Math.max(0,1500-(result.overview?.length?narrative.length:0)-600);
    const isolated=notable.filter(note=>!patternKeys.has(note.key)).filter(note=>{if(note.text.length>highlightBudget)return false;highlightBudget-=note.text.length;return true;});
    if(mode==='notable')return `<section class="summary-highlights" aria-labelledby="highlights-title"><h2 id="highlights-title">What stands out</h2>${result.overview?.length?`<p class="summary-narrative">${escape(narrative)}</p>`:''}${isolated.map(note=>`<p class="notable-note">${escape(note.text)}</p>`).join('')}${!notable.length && !result.overview?.length?`<p class="summary-narrative">${escape(narrative)}</p>`:''}<p class="hint summary-attribution">From your notes &middot; not a medical assessment</p>${isolated.length?'<p class="hint">One-off notes do not establish a pattern.</p>':''}${result.recordCount<=2?'<p class="hint summary-limited">A few notes give a limited picture; one note does not establish a pattern.</p>':''}${result.overview?.length?`<details class="overview-sources"><summary>Notes behind this overview</summary><ul class="update-facts">${[...patternKeys].map(key=>source(result.sources.find(item=>item.key===key))).join('')}</ul></details>`:''}</section>`;
    return `<section class="summary-category-highlights" aria-labelledby="categories-title"><h2 id="categories-title">In this period</h2>${categories.map(category=>{
      const group=result.groups.find(group=>group.title===category.title);
      const facts=(group?.keys || []).map(key=>result.sources.find(item=>item.key===key)).filter(Boolean);
      let highlight='';
      if(category.title==='Symptoms' || category.title==='Symptoms and observations') highlight=[...new Set(facts.map(item=>item.symptomName?`${item.symptomName}${item.polarity==='absent'?' (reported absent)':item.polarity==='uncertain'?' (uncertain)':''}`:item.event))].join(' / ');
      else if(category.title==='Measurements') highlight=[...new Set(facts.map(item=>item.measurement?.kind?.replaceAll('_',' ') || 'Reading'))].join(' / ')+' recorded';
      else highlight=facts[0]?.event || 'Recorded notes';
      // Keep complete statements; a long note stays available in full inside.
      if(highlight.length>Math.min(160,highlightBudget))highlight='';
      highlightBudget-=highlight.length;
      const days=new Set(facts.map(item=>item.date).filter(Boolean)).size;
      return `<button class="summary-highlight-row" type="button" data-category-details="${escape(category.title)}">${categoryIcon(category.title)}<span><strong>${escape(categoryLabel(category.title))}</strong>${highlight?`<span class="category-highlight">${escape(highlight)}</span>`:''}<small>${category.title==='Measurements'?'Full measurements inside':`${category.count} ${category.count===1?'detail':'details'}${days?` across ${days} recorded ${days===1?'day':'days'}`:''}`}</small></span>${icon('chevron')}</button>`;
    }).join('')}</section>`;
  }
  function draw(){if(disposed)return;
    root.innerHTML=`<section class="screen period-summary" aria-labelledby="title"><button class="text-action back" id="summary-back" type="button">Back to timeline</button>${personContext(patient)}<h1 id="title" tabindex="-1">A clearer picture for your visit</h1>${recordTabs('summary')}${result?`<details class="summary-period-picker"><summary>${icon('calendar')}<span class="selected-period">${escape(periodLabel())}</span><span class="change-dates">${icon('pencil')}<span class="visually-hidden">Change dates</span></span></summary>`:''}<form id="summary-period" novalidate><div class="period-dates"><div><label for="period-start">From</label>${dateInput('period-start',startInput,busy)}</div><div><label for="period-end">To</label>${dateInput('period-end',endInput,busy)}</div></div><p class="hint">Choose up to 90 days. Based on when things happened; uncertain dates stay separate.</p><button class="primary account-start" type="submit" ${busy?'disabled':''}>${busy?'Preparing your summary…':'Prepare summary'}</button></form>${result?'</details>':''}${busy?'<p role="status">Reading the saved notes for this period.</p>':''}${error?`<p class="error" role="alert">${escape(error)}</p>`:''}
    ${result?`<div class="period-result" aria-live="polite" tabindex="-1">
      ${result.status==='empty'?'<p>There are no dated updates to summarise for this period.</p>':result.status==='too_many'?`<p>${escape(result.message)}</p>`:`${highlightsMarkup('notable')}${highlightsMarkup('categories')}<button class="primary summary-review-share" id="review-share" type="button">Review &amp; share summary</button><div class="summary-categories">${result.groups.map(group=>`<details class="summary-category" data-category="${escape(group.title)}" open><summary>${categoryIcon(group.title)}<span><h3>${escape(categoryLabel(group.title))}</h3><span class="hint">${group.keys.length} recorded ${group.keys.length===1?'detail':'details'}</span></span><svg class="category-chevron" aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="m9 5 7 7-7 7"/></svg></summary><ul class="update-facts">${group.keys.map(key=>source(result.sources.find(item=>item.key===key))).join('')}</ul></details>`).join('')}</div>${result.discussionKeys?.length?`<details class="summary-category summary-discussion"><summary>${categoryIcon('Care and visits')}<span><h3>Points to discuss at a visit</h3><span class="hint">${result.discussionKeys.length} recorded ${result.discussionKeys.length===1?'detail':'details'}</span></span><svg class="category-chevron" aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="m9 5 7 7-7 7"/></svg></summary><p class="hint">Saved questions and notes behind the overview, for you to review.</p><ul class="update-facts">${result.discussionKeys.map(key=>source(result.sources.find(item=>item.key===key))).join('')}</ul></details>`:''}<details class="summary-prepared"><summary>About this summary</summary><p class="hint">Prepared ${escape(captureLabel({capturedAt:result.generatedAt,timeZone:Intl.DateTimeFormat().resolvedOptions().timeZone}))}. Based only on saved updates; days without notes tell us nothing about symptoms.</p></details>`}
      ${result.undatedCount?`<details class="undated-summary" open><summary>${result.undatedCount} ${result.undatedCount===1?'detail with uncertain timing':'details with uncertain timing'}</summary><p class="hint">These were recorded in this period, but we don’t know when they happened. They are separate from the dated summary.</p><ul class="update-facts">${result.undated.map(source).join('')}</ul>${result.undatedCount>result.undated.length?`<p class="hint">Showing the first ${result.undated.length} undated details.</p>`:''}</details>`:''}</div>`:''}</section>`;
    const full=document.createElement('div');full.className='summary-full-details';
    full.innerHTML='<h2 id="details-title" tabindex="-1">All recorded details</h2><p class="hint">Full readings and notes for this period. Opening these details keeps your sharing draft as it is.</p>';
    for(const selector of ['.overview-sources','.summary-categories','.summary-discussion','.undated-summary']){
      const section=root.querySelector(selector);if(section)full.append(section);
    }
    const openDetails=(title=null)=>{disposeSharing();detailsOrigin=typeof title==='string'?title:null;detailsView=true;draw();const target=typeof title==='string'?[...root.querySelectorAll('[data-category]')].find(element=>element.dataset.category===title)?.querySelector('summary'):root.querySelector('#details-title');target?.focus();};
    root.querySelectorAll('[data-category-details]').forEach(button=>button.onclick=()=>openDetails(button.dataset.categoryDetails));
    const resultRoot=root.querySelector('.period-result');
    if(resultRoot && (result.sources.length || result.undatedCount)){
      const action=document.createElement('button');action.className='text-action summary-details-action';action.id='view-all-details';action.type='button';action.textContent='View all details';action.onclick=()=>openDetails();
      const hint=document.createElement('p');hint.className='hint summary-details-hint';hint.textContent=`Full measurements and notes: ${result.sources.length} dated ${result.sources.length===1?'detail':'details'}${result.undatedCount?` and ${result.undatedCount} with uncertain timing`:''}.`;
      hint.textContent='A concise summary. Full details one click deeper.';resultRoot.insertBefore(hint,root.querySelector('#review-share')?.nextSibling || null);resultRoot.insertBefore(action,root.querySelector('.summary-prepared'));
    }
    root.querySelector('#tab-timeline').onclick=()=>{if(!canDiscard())return;disposed=true;disposeSharing();onBack();};
    root.querySelector('#period-summary').disabled=true;
    root.querySelector('#summary-back').onclick=()=>{if(!canDiscard())return;disposed=true;disposeSharing();onBack();};
    root.querySelector('#review-share')?.addEventListener('click',()=>{sharing=true;draw();});
    if(sharing && !detailsView && result?.status==='ready'){const back=root.querySelector('#summary-back');back.textContent='Back to summary';back.onclick=()=>{disposeSharing();sharing=false;draw();root.querySelector('#review-share')?.focus();};root.querySelector('.summary-period-picker').hidden=true;root.querySelector('.period-summary > p')?.setAttribute('hidden','');root.querySelector('.period-result').removeAttribute('aria-live');root.querySelector('.period-result').innerHTML='<div id="summary-sharing"></div>';disposeSharing();disposeSharing=mountSummarySharing(root.querySelector('#summary-sharing'),session,patient,{start,end},result,sharingDraft,()=>openDetails());}
    if(detailsView && resultRoot){
      resultRoot.removeAttribute('aria-live');resultRoot.replaceChildren(full);
      root.querySelector('.summary-period-picker').hidden=true;root.querySelector('.period-summary > p')?.setAttribute('hidden','');
      const back=root.querySelector('#summary-back');back.textContent=sharing?'Back to sharing draft':'Back to summary';
      back.onclick=()=>{detailsView=false;draw();const origin=!sharing&&detailsOrigin?[...root.querySelectorAll('[data-category-details]')].find(button=>button.dataset.categoryDetails===detailsOrigin):root.querySelector(sharing?'#sharing-details':'#view-all-details');origin?.focus();};
    }
    function change(){if(!canDiscard()){root.querySelector('#period-start').value=startInput;root.querySelector('#period-end').value=endInput;return;}disposeSharing();sharingDraft={text:null,originalText:null};detailsView=false;sharing=false;startInput=root.querySelector('#period-start').value;endInput=root.querySelector('#period-end').value;start=parseDisplayDate(startInput)||'';end=parseDisplayDate(endInput)||'';result=null;error='';const period=root.querySelector('.selected-period');if(period)period.textContent=validDate(start)&&validDate(end)&&start<=end?periodLabel():'Choose dates';root.querySelector('.period-result')?.remove();root.querySelector('[role="alert"]')?.remove();}
    bindDateInput(root.querySelector('#period-start'),change);bindDateInput(root.querySelector('#period-end'),change);
    root.querySelector('#summary-period').onsubmit=async event=>{event.preventDefault();if(busy)return;if(!canDiscard())return;sharingDraft={text:null,originalText:null};detailsView=false;sharing=false;disposeSharing();if(!validDate(start)||!validDate(end)||start>end){error='Use valid DD/MM/YYYY dates, with the start before the end.';result=null;draw();return;}if((Date.parse(end)-Date.parse(start))/86400000+1>90){error='Choose a period of up to 90 days.';result=null;track('summary_prepared',{period_days:Math.min(36500,(Date.parse(end)-Date.parse(start))/86400000+1),source_count:'0',result:'too_long'});draw();return;}busy=true;error='';result=null;draw();try{const response=await session.generateSummary({patientId:patient.id,start,end});if(disposed)return;result=response;track('summary_prepared',{period_days:(Date.parse(end)-Date.parse(start))/86400000+1,source_count:bucket(response.recordCount||0),result:response.status==='empty'?'empty':response.status==='ready'?'ok':'failed'});}catch(cause){if(disposed)return;track('summary_prepared',{period_days:(Date.parse(end)-Date.parse(start))/86400000+1,source_count:'0',result:'failed'});error=/saved note changed|notes changed while loading/.test(cause.message??'')?'A saved note changed. Prepare Summary again.':/up to 90 days/.test(cause.message??'')?'Choose a period of up to 90 days.':'Busy right now. Try again in a few minutes. Your saved notes are still there.';}busy=false;draw();root.querySelector('.period-result')?.focus();};
  }
  const beforeLeave=event=>{if(hasEdits()){event.preventDefault();event.returnValue='';}};window.addEventListener('beforeunload',beforeLeave);
  draw();root.querySelector('h1').focus();return()=>{disposed=true;disposeSharing();window.removeEventListener('beforeunload',beforeLeave);root.removeEventListener('carenama:before-navigate',beforeNavigate);};
}

function categoryLabel(title) {
  return {'Symptoms and observations':'Symptoms','Measurements':'Readings','Care and visits':'Care and visits','Appetite, sleep and energy':'Daily wellbeing'}[title] || (title==='Measurements'?'Readings':title);
}
function categoryIcon(title) {
  const kind={'Measurements':'measurement','Medication changes':'care','Doctor visits':'care','Care and visits':'care','Daily wellbeing':'wellbeing','Appetite':'wellbeing','Appetite, sleep and energy':'wellbeing'}[title] || 'note';
  return `<span class="category-icon marker-${kind}" aria-hidden="true">${icon(kind)}</span>`;
}

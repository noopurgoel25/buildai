const { test, expect } = require('@playwright/test');
async function openOriginalNote(page){const disclosure=page.locator('.record-details details > summary').filter({hasText:/^Your original (note|update)$/});if(await disclosure.count())await disclosure.click();}
async function reviewDetailChanges(page){if(await page.locator('#whole-form').count())await page.getByRole('button',{name:'Review changes',exact:true}).click();}
async function applyDetailChanges(page){await page.getByRole('button',{name:await page.locator('#edit-event').count()?'Review changes':'Apply changes',exact:true}).click();await reviewDetailChanges(page);}
async function saveReviewedChanges(page){await reviewDetailChanges(page);await page.getByRole('button',{name:'Save changes',exact:true}).click();}
async function openLegacyEditor(page){await page.getByRole('button',{name:'Change this update',exact:true}).click();for(const selector of ['.editor-timing > summary','.editor-extra > summary'])await page.locator(selector).click();}

async function openDetailEditor(page,number){if(await page.getByRole('button',{name:'Change this update',exact:true}).count())await page.getByRole('button',{name:'Change this update',exact:true}).click();await page.locator('.whole-more > summary').click();await page.getByRole('button',{name:`Change detail ${number}`,exact:true}).click();}
const {checkReleaseScreen}=require('./release-screen-check.cjs');

test('a reviewed dated note opens its timing editor and cancellation keeps the reviewed date',async({page})=>{
 const interpretation=connectedInterpretation(),errors=[];
 page.on('pageerror',error=>errors.push(error.message));
 await mockSession(page,{interpretation});await openMulti(page,interpretation.event);
 await page.getByRole('button',{name:'Change this update',exact:true}).click();
 await page.getByRole('button',{name:'Change timing for detail 1',exact:true}).click();
 await expect(page.getByLabel('Event date',{exact:true})).toHaveValue('06/10/2026');
 await page.getByLabel('Event date',{exact:true}).fill('07/10/2026');
 await page.getByRole('button',{name:'Cancel editing',exact:true}).click();
 await page.getByRole('button',{name:'Cancel changes',exact:true}).click();
 await expect(page.locator('.fact-time').first()).toHaveText('06/10/2026');
 expect(errors).toEqual([]);
});

async function openTiming(page) {
 const timing=page.locator('.editor-timing');
 if(await timing.count() && !await timing.evaluate(node=>node.open))await timing.locator('summary').click();
}

function connectedInterpretation() {
 const text='She vomited today after dinner yesterday. She did not feel dizzy today.';
 const observations=[['1','vomited today','today','2026-10-06','present'],['2','dinner yesterday','yesterday','2026-10-05','present'],['3','She did not feel dizzy today.','today','2026-10-06','absent']].map(([id,event,when,date,polarity])=>({id,event,when,supportingWords:event,evidence:'Not specified',polarity,timing:{date,time:null,precision:'date',datePrecision:'exact',timePrecision:'unknown',resolved:true},confirmed:false,edited:false}));
 return {status:'ready',event:text,when:'Multiple observations',evidence:'Not specified',question:'',message:'',interpretationVersion:'capture-context-v2',relatedGroups:[{observationIds:['1','2'],supportingWords:'She vomited today after dinner yesterday.'}],observations};
}

test.describe('Milestone 25 connected records',()=>{
 test('review and saved timeline keep a connection, individual dates and a negative; sources open only on request',async({page})=>{
  const interpretation=connectedInterpretation(),mock=await mockSession(page,{interpretation});await openMulti(page,interpretation.event);
  await expect(page.getByRole('region',{name:'Connected details',exact:true})).toBeVisible();await expect(page.locator('.connected-facts .fact-text')).toHaveText(['vomited today','dinner yesterday']);await expect(page.locator('.fact-time')).toHaveText(['06/10/2026','05/10/2026','06/10/2026']);
  await expect(page.getByText('Explicitly absent',{exact:true})).not.toBeVisible();const captured=await page.getByText(/^Captured on /).textContent();await expect(page.getByText(captured,{exact:true})).toBeVisible();
  for(const width of [320,390,768,1440]){await page.setViewportSize({width,height:844});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);await page.screenshot({path:`.impeccable/review/m25-review-${width}.png`,fullPage:true});}
  await page.getByRole('button',{name:'Continue to save',exact:true}).click();await login(page);await expect(page.locator('.timeline-entry')).toHaveCount(1);await expect(page.locator('.timeline-preview-time')).toHaveText('05/10/2026 to 06/10/2026');
  const toggle=page.locator('.timeline-entry-open');await page.keyboard.press('Tab');await toggle.focus();expect(await toggle.evaluate(node=>getComputedStyle(node).outlineStyle)).toBe('solid');await page.keyboard.press('Enter');await expect(page.locator('#title')).toBeFocused();
  await expect(page.getByRole('region',{name:'Connected details',exact:true})).toBeVisible();await expect(page.locator('.fact-text')).toHaveCount(3);await expect(page.getByText('Explicitly absent',{exact:true})).not.toBeVisible();await expect(page.getByText(captured,{exact:true})).toBeVisible();
  for(const width of [320,390,768,1440]){await page.setViewportSize({width,height:844});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);await page.screenshot({path:`.impeccable/review/m25-timeline-${width}.png`,fullPage:true});}
  await page.getByText(/^(Record details|Source & record details)$/).click();await expect(page.getByText('Explicitly absent',{exact:true})).toBeVisible();await openOriginalNote(page);await expect(page.locator('.original-update')).toHaveText(interpretation.event);await expect(page.getByText(captured,{exact:true})).toHaveCount(1);
  await page.reload();await openTimelineNote(page);await expect(page.getByRole('region',{name:'Connected details',exact:true})).toBeVisible();expect(mock.state().record.event.relatedGroups).toEqual(interpretation.relatedGroups);expect(mock.state().savedCalls).toBe(1);
 });
 test('populated editor stays short; one timing edit keeps sibling dates, original interpretation and capture time',async({page})=>{
  const interpretation=connectedInterpretation(),original={...legacyEvent(1),event:interpretation.event,originalText:interpretation.event,observations:interpretation.observations.map(item=>({...item,confirmed:true})),relatedGroups:interpretation.relatedGroups,interpretationVersion:interpretation.interpretationVersion,aiInterpretation:interpretation};
  const mock=await mockSession(page,{initialEvents:[original]});await page.goto('/#record');await openTimelineNote(page);await page.getByRole('button',{name:'Change update',exact:true}).click();await openDetailEditor(page,2);
  await expect(page.getByLabel('What happened',{exact:true})).toHaveValue('dinner yesterday');await expect(page.getByLabel('Event date',{exact:true})).not.toBeVisible();await expect(page.getByLabel('How do you know?',{exact:true})).not.toBeVisible();await expect(page.locator('#editor-timing-label')).toHaveText('05/10/2026');
  for(const width of [320,390,768,1440]){await page.setViewportSize({width,height:844});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);await expect(page.getByRole('button',{name:'Apply changes',exact:true})).toBeInViewport();await page.screenshot({path:`.impeccable/review/m25-compact-editor-${width}.png`,fullPage:true});}
  await openTiming(page);await openTiming(page);await page.getByLabel('Event date',{exact:true}).fill('30/02/2026');await applyDetailChanges(page);await expect(page.getByRole('alert')).toContainText('DD/MM/YYYY');await expect(page.getByLabel('Event date',{exact:true})).toHaveValue('30/02/2026');await expect(page.getByLabel('Event date',{exact:true})).toBeVisible();
  await openTiming(page);await page.getByLabel('Event date',{exact:true}).fill('04/10/2026');await applyDetailChanges(page);await expect(page.locator('.fact-time')).toHaveText(['06/10/2026','04/10/2026','06/10/2026']);await expect(page.getByRole('region',{name:'Connected details',exact:true})).toHaveCount(0);await saveReviewedChanges(page);await openTimelineNote(page);
  const saved=mock.state().entries[0].details;expect(saved.capturedAt).toBe(original.capturedAt);expect(saved.timeZone).toBe(original.timeZone);expect(saved.originalText).toBe(original.originalText);expect(saved.aiInterpretation).toEqual(original.aiInterpretation);expect(saved.relatedGroups).toEqual([]);expect(saved.observations[0]).toEqual(original.observations[0]);expect(saved.observations[2]).toEqual(original.observations[2]);expect(mock.state().correctionCalls).toBe(1);
 });
 test('invalid connection metadata leaves every individually dated fact available without a date range',async({page})=>{
  const interpretation=connectedInterpretation();interpretation.relatedGroups[0].observationIds[1]='missing';await mockSession(page,{interpretation});await openMulti(page,interpretation.event);await expect(page.getByRole('region',{name:'Connected details',exact:true})).toHaveCount(0);await expect(page.locator('.fact-text')).toHaveText(interpretation.observations.map(item=>item.event));await expect(page.locator('.fact-time')).toHaveText(['06/10/2026','05/10/2026','06/10/2026']);
 });
});

test.describe('Milestone 24 date and context review',()=>{
 test.use({timezoneId:'Asia/Kolkata'});
 test('known day with approximate clock reaches review, corrects DD/MM/YYYY and saves with its capture time intact',async({page})=>{
  await page.addInitScript(()=>{Date.now=()=>Date.parse('2026-10-05T19:00:00Z');});
  const text='She reported heartburn today around 5 p.m.';
  const interpretation={status:'ready',event:text,when:'Multiple observations',evidence:'Not specified',question:'',message:'',interpretationVersion:'capture-context-v2',relatedGroups:[],observations:[{id:'1',event:text,supportingWords:text,when:'today around 5 p.m.',evidence:'Patient-reported',polarity:'present',type:'symptom',symptomName:'heartburn',timing:{date:'2026-10-06',time:null,precision:'date',datePrecision:'exact',timePrecision:'approximate',resolved:true},confirmed:false,edited:false}]};
  const mock=await mockSession(page,{interpretation});await openMulti(page,text);
  await expect(page.getByRole('heading',{name:'Does this sound right?',exact:true})).toBeVisible();await expect(page.getByRole('button',{name:'Today',exact:true})).toHaveCount(0);
  await expect(page.locator('.fact-time')).toHaveText('06/10/2026 · around 5 p.m.');
  const deviceZone=await page.evaluate(()=>Intl.DateTimeFormat().resolvedOptions().timeZone);const captured=await page.getByText(/^Captured on /).textContent();expect(captured).toContain('06/10/2026, 00:30:00');expect(captured).toContain(deviceZone);
  await openDetailEditor(page,1);
  await expect(page.getByLabel('Event date',{exact:true})).toHaveValue('06/10/2026');await expect(page.getByLabel('How certain is the day?',{exact:true})).toHaveValue('exact');await expect(page.getByLabel('How certain is the clock time?',{exact:true})).toHaveValue('approximate');
  await openTiming(page);await page.getByLabel('Event date',{exact:true}).fill('30/02/2026');await applyDetailChanges(page);await expect(page.getByRole('alert')).toContainText('DD/MM/YYYY');await expect(page.getByLabel('Event date',{exact:true})).toHaveValue('30/02/2026');
  await openTiming(page);await page.getByLabel('Event date',{exact:true}).fill('');await page.getByLabel('Event date',{exact:true}).pressSequentially('07102026');await expect(page.getByLabel('Event date',{exact:true})).toHaveValue('07/10/2026');
  for(const width of [320,390,768,1440]){await page.setViewportSize({width,height:844});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);await page.screenshot({path:`.impeccable/review/m24-date-editor-${width}.png`,fullPage:true});}
  await applyDetailChanges(page);await expect(page.locator('.fact-time')).toHaveText('07/10/2026 · around 5 p.m.');await page.getByRole('button',{name:'Continue to save',exact:true}).click();await login(page);await expect(page.locator('.timeline-entry')).toHaveCount(1);
  expect(mock.state().record.event.capturedAt).toBe(Date.parse('2026-10-05T19:00:00Z'));expect(mock.state().record.event.timeZone).toBe(deviceZone);expect(mock.state().record.event.observations[0].timing.date).toBe('2026-10-07');expect(mock.state().record.event.aiInterpretation.observations[0].timing.date).toBe('2026-10-06');expect(mock.state().codeRequests).toBe(1);
  await page.locator('.timeline-entry-open').click();await expect(page.getByText(captured,{exact:true})).toBeVisible();
 });
 test('related dinner and vomiting keep separate dates and a correction drops grouping without changing the original interpretation',async({page})=>{
  const text='She vomited today after dinner yesterday.';
  const facts=[['1','vomited today','today','2026-10-06'],['2','dinner yesterday','yesterday','2026-10-05']].map(([id,event,when,date])=>({id,event,when,supportingWords:event,evidence:'Not specified',polarity:'present',timing:{date,time:null,precision:'date',datePrecision:'exact',timePrecision:'unknown',resolved:true},confirmed:false,edited:false}));
  const relatedGroups=[{observationIds:['1','2'],supportingWords:text}],interpretation={status:'ready',event:text,when:'Multiple observations',evidence:'Not specified',question:'',message:'',interpretationVersion:'capture-context-v2',relatedGroups,observations:facts};
  const mock=await mockSession(page,{interpretation});await openMulti(page,text);await expect(page.locator('.fact-time')).toHaveText(['06/10/2026','05/10/2026']);
  await openDetailEditor(page,2);await page.getByLabel('What happened',{exact:true}).fill('Dinner was partly eaten.');await applyDetailChanges(page);await page.getByRole('button',{name:'Continue to save',exact:true}).click();await login(page);await expect(page.locator('.timeline-entry')).toHaveCount(1);
  expect(mock.state().record.event.relatedGroups).toEqual([]);expect(mock.state().record.event.aiInterpretation.relatedGroups).toEqual(relatedGroups);expect(mock.state().record.event.observations.map(item=>item.timing.date)).toEqual(['2026-10-06','2026-10-05']);expect(mock.state().savedCalls).toBe(1);
 });
 test('Summary rejects invalid display dates, keeps entries and sends canonical dates to the server',async({page})=>{
  const mock=await mockSession(page,{initialEvents:[legacyEvent(1)]}),periods=[];page.on('request',request=>{if(new URL(request.url()).pathname==='/__test/summary')periods.push(request.postDataJSON());});
  await page.goto('/#record');await page.getByRole('button',{name:'Summary',exact:true}).click();
  await page.getByLabel('From',{exact:true}).fill('30/02/2026');await page.getByLabel('To',{exact:true}).fill('06/10/2026');await page.getByRole('button',{name:'Prepare summary',exact:true}).click();await expect(page.getByRole('alert')).toContainText('DD/MM/YYYY');await expect(page.getByLabel('From',{exact:true})).toHaveValue('30/02/2026');expect(mock.state().summaryCalls).toBe(0);
  await page.getByLabel('From',{exact:true}).fill('01/10/2026');await page.getByRole('button',{name:'Prepare summary',exact:true}).click();await expect(page.getByText('There are no dated updates to summarise for this period.',{exact:true})).toBeVisible();expect(periods[0].start).toBe('2026-10-01');expect(periods[0].end).toBe('2026-10-06');
 });
});

async function mockSession(page, { failSave = false, interpretation = null, initialEvents = [], failTimelineAt = 0, failAppend = false, failCorrection = false, failDelete = false, staleCorrection = false, signedOutInitially = false, failMatch = false, summaryReply = null, shareDraftText = null, failSummary = false, failShareCheckAt = 0, staleShareAt = 0, pendingSession = false, failDeletionCode = false, failAccountDeletion = false, deletingInitially = false,analyticsInitially=true,failPrivacy=false } = {}) {
  let analytics=analyticsInitially,privacyCalls=0;const analyticsEvents=[];
  let deletionStarted=deletingInitially;
  let signed = initialEvents.length>0 && !signedOutInitially, record = initialEvents.length ? {name:'Mira Example',relationship:'Daughter',event:initialEvents[0]} : null, savedCalls = 0, codeRequests = 0, timelineCalls=0, appendCalls=0, correctionCalls=0, deleteCalls=0, matchCalls=0, summaryCalls=0, shareCheckCalls=0,deletionCodeCalls=0,accountDeletionCalls=0;
  const entries=initialEvents.map((details,index)=>({id:String(index+1),details}));
  const savedIds = [];
  await page.route('**/src/session.js*', route => route.fulfill({ contentType: 'application/javascript', body: `
    export function startSession(onChange) {
      const state = { isLoading: false, isAuthenticated: ${signed},
        async signIn(provider, params) {
          const response = await fetch('/__test/signin', { method: 'POST', body: JSON.stringify(params) });
          if (!response.ok) throw new Error('Invalid code');
          if (params.code) { state.isAuthenticated = true; onChange({ ...state }); }
        },
        async getAccountState() {return (await fetch('/__test/account-state')).json();},
        async getAnalyticsPreference(){return (await fetch('/__test/privacy')).json();},
        async setAnalyticsPreference(value){const response=await fetch('/__test/privacy',{method:'POST',body:JSON.stringify(value)});if(!response.ok)throw new Error('Unavailable');},
        async trackAnalytics(value){await fetch('/__test/analytics',{method:'POST',body:JSON.stringify(value)});},
        async requestDeletionCode() {const response=await fetch('/__test/deletion-code');if(!response.ok)throw new Error('Delivery unavailable');return response.json();},
        async deleteAccount(value) {const response=await fetch('/__test/delete-account',{method:'POST',body:JSON.stringify(value)});if(!response.ok)throw new Error(await response.text());state.isAuthenticated=false;onChange({...state});},
        async signOut() { await fetch('/__test/signout'); state.isAuthenticated = false; onChange({ ...state }); },
        async saveRecord(value) { const response = await fetch('/__test/save', { method: 'POST', body: JSON.stringify(value) }); if (!response.ok) throw new Error(await response.text()); },
        async getRecord() { return (await fetch('/__test/record')).json(); },
        async getTimeline(options) {const response=await fetch('/__test/timeline',{method:'POST',body:JSON.stringify(options)});if(!response.ok)throw new Error('Unavailable');return response.json();},
        async correctUpdate(value) {const response=await fetch('/__test/correct',{method:'POST',body:JSON.stringify(value)});if(!response.ok)throw new Error(await response.text());return response.json();},
        async deleteUpdate(value) {const response=await fetch('/__test/delete',{method:'POST',body:JSON.stringify(value)});if(!response.ok)throw new Error(await response.text());},
        async prepareSummaryShare(value) {const response=await fetch('/__test/share-check',{method:'POST',body:JSON.stringify(value)});if(!response.ok)throw new Error('Unavailable');return response.json();},
        async generateSummary(value) {const response=await fetch('/__test/summary',{method:'POST',body:JSON.stringify(value)});if(!response.ok)throw new Error('Busy');return response.json();},
        async matchingPatient(patient) {const response=await fetch('/__test/match',{method:'POST',body:JSON.stringify(patient)});if(!response.ok)throw new Error('Unavailable');return response.json();},
        async saveMatchedUpdate(value) {return state.saveUpdate(value);},
        async saveUpdate(value) {const response=await fetch('/__test/append',{method:'POST',body:JSON.stringify(value)});if(!response.ok)throw new Error('Unavailable');},
      }; window.__testSessionChange = next => { Object.assign(state,next);onChange({...state}); }; window.__testResolveSession=()=>onChange({...state});queueMicrotask(() => onChange({ ...state,isLoading:${pendingSession} }));
    }` }));
  await page.route('**/__test/**', route => {
    const path = new URL(route.request().url()).pathname;
    if(path.endsWith('privacy')){if(route.request().method()==='POST'){privacyCalls++;if(failPrivacy&&privacyCalls===1)return route.fulfill({status:503,body:'Unavailable'});analytics=route.request().postDataJSON().enabled;}return route.fulfill({json:analytics});}
    if(path.endsWith('analytics')){if(analytics)analyticsEvents.push(route.request().postDataJSON());return route.fulfill({json:null});}
    if (path.endsWith('signin')) {
      const params = route.request().postDataJSON();
      if (!params.code) { codeRequests++; return route.fulfill({ json: {} }); }
      if (params.code !== '123456') return route.fulfill({ status: 400, json: {} });
      signed = true; return route.fulfill({ json: {} });
    }
    if(path.endsWith('account-state'))return route.fulfill({json:deletionStarted?'deleting':signed?'active':'deleted'});
    if(path.endsWith('deletion-code')) {deletionCodeCalls++;if(failDeletionCode&&deletionCodeCalls===1)return route.fulfill({status:503,body:'Unavailable'});return route.fulfill({json:{challengeId:'d'.repeat(32)}});}
    if(path.endsWith('delete-account')) {accountDeletionCalls++;const input=route.request().postDataJSON();if(!deletionStarted&&input.code!=='654321')return route.fulfill({status:400,body:'That deletion code is not correct. Try again.'});if(failAccountDeletion&&accountDeletionCalls===2){deletionStarted=true;return route.fulfill({status:503,body:'Deletion has started. Retry to finish removing your account.'});}deletionStarted=false;signed=false;record=null;entries.splice(0);return route.fulfill({json:null});}
    if (path.endsWith('signout')) { signed = false; return route.fulfill({ json: {} }); }
    if(path.endsWith('timeline')) {
      timelineCalls++;if(deletionStarted||timelineCalls===failTimelineAt)return route.fulfill({status:503,json:{}});
      const options=route.request().postDataJSON(),start=Number(options.cursor||0),ordered=[...entries].sort((a,b)=>b.details.capturedAt-a.details.capturedAt || Number(b.id)-Number(a.id)),page=ordered.slice(start,start+options.numItems);
      return route.fulfill({json:{patient:record?{id:'person-test',name:record.name,relationship:record.relationship}:null,page,isDone:start+page.length>=entries.length,continueCursor:String(start+page.length)}});
    }
    if(path.endsWith('share-check')) {
      shareCheckCalls++;if(shareCheckCalls===failShareCheckAt)return route.fulfill({status:503,body:'Unavailable'});if(shareCheckCalls===staleShareAt)return route.fulfill({json:{status:'stale',title:'Mira Example health summary',text:'',message:'A saved note changed. Go back and prepare Summary again before sharing. Your draft is still here.'}});
      const input=route.request().postDataJSON();return route.fulfill({json:{status:'ready',title:'Mira Example health summary',text:input.text===null?(shareDraftText??sharingFixtureText):input.text,message:''}});
    }
    if(path.endsWith('summary')) {
      summaryCalls++;if(failSummary && summaryCalls===1)return route.fulfill({status:503,body:'Busy'});
      return route.fulfill({json:summaryReply || {status:'empty',name:'Mira Example',groups:[],sources:[],undated:[],undatedCount:0,recordCount:0,message:'',generatedAt:Date.now()}});
    }
    if(path.endsWith('match')) {
      matchCalls++;if(failMatch && matchCalls===1)return route.fulfill({status:503,body:'Unavailable'});
      const input=route.request().postDataJSON(),normalize=value=>value.trim().replace(/\s+/g,' ').toLowerCase();
      return route.fulfill({json:record && normalize(input.name)===normalize(record.name) && normalize(input.relationship)===normalize(record.relationship)?{id:'person-test',name:record.name,relationship:record.relationship}:null});
    }
    if(path.endsWith('correct')) {
      correctionCalls++;const input=route.request().postDataJSON();
      if(staleCorrection)return route.fulfill({status:409,body:'This update changed elsewhere.'});
      if(failCorrection && correctionCalls===1)return route.fulfill({status:503,body:'Unavailable'});
      const entry=entries.find(entry=>entry.id===input.id);entry.details=input.event;entry.revision=(entry.revision||0)+1;return route.fulfill({json:entry.revision});
    }
    if(path.endsWith('delete')) {
      deleteCalls++;if(failDelete && deleteCalls===1)return route.fulfill({status:503,body:'Unavailable'});
      const input=route.request().postDataJSON(),index=entries.findIndex(entry=>entry.id===input.id);if(index>=0)entries.splice(index,1);return route.fulfill({json:null});
    }
    if(path.endsWith('append')) {
      savedCalls++;appendCalls++;const input=route.request().postDataJSON();savedIds.push(input.event.confirmationId);
      if(failAppend && appendCalls===1)return route.fulfill({status:503,json:{}});
      if(!entries.some(entry=>entry.details.confirmationId===input.event.confirmationId))entries.push({id:String(entries.length+1),details:input.event});
      record={...record,event:input.event};return route.fulfill({json:{}});
    }
    if (path.endsWith('save')) {
      savedCalls++;
      savedIds.push(route.request().postDataJSON().event.confirmationId);
      if (initialEvents.length && record)return route.fulfill({status:409,body:'This account already has a health record.'});
      if (failSave && savedCalls === 1) return route.fulfill({ status: 503, json: {} });
      const input = route.request().postDataJSON();
      record = { ...input.patient, event: input.event }; if(!entries.some(entry=>entry.details.confirmationId===input.event.confirmationId))entries.push({id:String(entries.length+1),details:input.event}); return route.fulfill({ json: {} });
    }
    return route.fulfill({ json: record });
  });
  await page.route('**/api/**', route => {
    if (route.request().url().endsWith('/capture-text')) return route.fulfill({ json: { text: route.request().postDataJSON().text, source: 'text' } });
    return route.fulfill({ json: interpretation || { status: 'ready', event: 'Mira Example said she felt tired today.', when: 'today', evidence: 'Patient-reported', question: '', message: '' } });
  });
  return { state: () => ({ signed, record, savedCalls, codeRequests, savedIds, entries, timelineCalls, appendCalls, correctionCalls, deleteCalls, matchCalls, summaryCalls, shareCheckCalls, deletionCodeCalls, accountDeletionCalls,analytics,privacyCalls,analyticsEvents }) };
}
async function confirm(page) {
  await page.goto('/');
  await page.getByRole('link', { name: 'Start a health note', exact: true }).click();
  await page.getByLabel('Name').fill('Mira Example');
  await page.getByLabel('Relationship').fill('Daughter');
  await page.getByRole('button', { name: 'Continue to your update', exact: true }).click();

  await page.getByLabel('Your health note').fill('Mira Example said she felt tired today.');
  await page.getByRole('button', { name: 'Review your note' }).click();
  await page.getByRole('button', { name: 'Continue to save' }).click();
  await expect(page.getByRole('heading',{name:'Your update is ready.'})).toBeVisible();
}

test('sign-in follows first value, incorrect code preserves the update, and saved record returns after refresh and sign-in (provider mocked)', async ({ page }) => {
  const mock = await mockSession(page);
  await confirm(page);
  expect(mock.state().savedCalls).toBe(0);
  await page.getByRole('link', { name: 'Save this update', exact: true }).click();
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  await expect(page.getByRole('alert')).toHaveText('Enter a valid email address.');
  await page.getByLabel('Your email').fill('caregiver@example.test');
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  await expect(page.getByLabel('Email code')).toHaveAttribute('maxlength','6');
  await page.getByLabel('Email code').fill('12345');await page.getByRole('button',{name:/Verify & (save update|continue)/}).click();await expect(page.getByRole('alert')).toHaveText('Enter the 6-digit code from your email.');
  await page.getByLabel('Email code').fill('000000');
  await page.getByRole('button', { name: /Verify & (save update|continue)/ }).click();
  await expect(page.getByRole('alert')).toContainText('incorrect or expired');
  expect(mock.state().savedCalls).toBe(0);
  await page.getByRole('link', { name: 'Back to your update' }).click();
  await expect(page.locator('.fact-text').first()).toHaveText('Mira Example said she felt tired today.');
  await page.getByRole('link', { name: 'Save this update', exact: true }).click();
  await page.getByLabel('Email code').fill('123456');
  await page.getByRole('button', { name: /Verify & (save update|continue)/ }).click();
  await expect(page.getByText('Saved to Mira Example’s record.')).toBeVisible();
  expect(mock.state().savedCalls).toBe(1);
  await page.screenshot({ path: '.impeccable/review/saved-record-mobile.png', fullPage: true });
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Mira Example’s health notes', exact: true })).toBeVisible();
  expect(mock.state().savedCalls).toBe(1);
  await page.getByRole('button',{name:'Open menu',exact:true}).click();await page.getByRole('button', { name: 'Sign out', exact: true }).click();
  await expect(page.getByRole('link', { name: 'Already have a record? Sign in' })).toBeVisible();
  await page.getByRole('link', { name: 'Already have a record? Sign in' }).click();
  await page.getByLabel('Your email').fill('caregiver@example.test');
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  await page.getByLabel('Email code').fill('123456');
  await page.getByRole('button', { name: /Verify & (save update|continue)/ }).click();
  await openTimelineNote(page);await expect(page.locator('.fact-text').first()).toHaveText('Mira Example said she felt tired today.');
  expect(mock.state().savedCalls).toBe(1);
});

test('a save failure keeps the confirmed update and retry saves it without another sign-in (provider mocked)', async ({ page }) => {
  const mock = await mockSession(page, { failSave: true });
  await confirm(page);
  await page.getByRole('link', { name: 'Save this update', exact: true }).click();
  await page.getByLabel('Your email').fill('caregiver@example.test');
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  await page.screenshot({ path: '.impeccable/review/email-code-mobile.png', fullPage: true });
  await page.getByLabel('Email code').fill('123456');
  await page.getByRole('button', { name: /Verify & (save update|continue)/ }).click();
  await expect(page.getByRole('alert')).toContainText('Your update hasn’t been saved yet.');
  await page.getByRole('button', { name: 'Try again' }).click();
  await expect(page.getByText('Saved to Mira Example’s record.')).toBeVisible();
  expect(mock.state().codeRequests).toBe(1);
  expect(mock.state().record.event.originalText).toBe('Mira Example said she felt tired today.');
  expect(mock.state().record.event.aiInterpretation.status).toBe('ready');
});

const multiText='BP 142/88 this morning and she did not feel dizzy.';
function multiInterpretation() {
  return {status:'ready',event:multiText,when:'Multiple observations',evidence:'Not specified',question:'',message:'',observations:[
    {id:'1',event:'BP 142/88 this morning',supportingWords:'BP 142/88 this morning',when:'this morning',evidence:'Measured',polarity:'present',timing:{date:null,time:null,precision:'approximate',resolved:false},confirmed:false,edited:false},
    {id:'2',event:'she did not feel dizzy',supportingWords:'she did not feel dizzy',when:'Not specified',evidence:'Not specified',polarity:'absent',timing:{date:null,time:null,precision:'unknown',resolved:false},confirmed:false,edited:false},
  ]};
}
async function openMulti(page, text=multiText, url='/') {
  await page.goto(url); await page.getByRole('link',{name:'Start a health note',exact:true}).click();
  await page.getByLabel('Name').fill('Mira Example'); await page.getByLabel('Relationship').fill('Daughter');
  await page.getByRole('button',{name:'Continue to your update',exact:true}).click();
  await page.getByLabel('Your health note').fill(text);await page.getByRole('button',{name:'Review your note'}).click();
}
async function resolveMulti(page) {
  await page.getByRole('button',{name:'Keep the timing as written'}).click();
  await page.getByRole('button',{name:'I’m not sure',exact:true}).click();
  await expect(page.getByRole('heading',{name:'Does this sound right?'})).toBeVisible();
}
async function login(page) {
  await page.getByRole('link',{name:'Save this update',exact:true}).click();
  await page.getByLabel('Your email').fill('caregiver@example.test');await page.getByRole('button',{name:'Continue',exact:true}).click();
  await page.getByLabel('Email code').fill('123456');await page.getByRole('button',{name:/Verify & (save update|continue)/}).click();
}

test('one confirmation approves all visible facts, preserves explicit negatives and capture time, then saves atomically (services mocked)',async({page})=>{
  const mock=await mockSession(page,{interpretation:multiInterpretation()});await openMulti(page);
  const captured=await page.getByText(/^Captured on /).textContent();
  await expect(page.getByRole('button',{name:'Continue to save'})).toHaveCount(0);
  await expect(page.getByRole('button',{name:'I’m not sure',exact:true})).toHaveCount(1);
  await page.getByRole('button',{name:'Today',exact:true}).click();
  await page.getByRole('button',{name:'I’m not sure',exact:true}).click();
  await expect(page.locator('.fact-text')).toHaveText(['BP 142/88 this morning','she did not feel dizzy']);
  await openDetailEditor(page,1);await expect(page.getByLabel('What happened',{exact:true})).toHaveValue('BP 142/88 this morning');await expect(page.getByLabel('Timing words',{exact:true})).toHaveValue('this morning');await page.getByRole('button',{name:'Cancel editing',exact:true}).click();await reviewDetailChanges(page);
  await expect(page.getByRole('button',{name:/Confirm observation/})).toHaveCount(0);
  await expect(page.getByRole('button',{name:'Continue to save'})).toHaveCount(1);
  await expect(page.getByText('Explicitly absent',{exact:true})).not.toBeVisible();
  await page.screenshot({path:'.impeccable/review/carenama-review-mobile.png',fullPage:true});
  await page.setViewportSize({width:1440,height:900});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await page.screenshot({path:'.impeccable/review/carenama-review-desktop.png',fullPage:true});
  await page.getByRole('button',{name:'Continue to save'}).click();expect(mock.state().savedCalls).toBe(0);await login(page);
  await expect(page.getByText('Saved to Mira Example’s record.')).toBeVisible();
  const stored=mock.state().record.event;
  expect(stored.observations).toHaveLength(2);expect(stored.observations.every(item=>item.confirmed)).toBe(true);
  expect(stored.observations[1].polarity).toBe('absent');expect(stored.observations[1].timing.precision).toBe('unknown');
  expect(stored.originalText).toBe(multiText);expect(stored.aiInterpretation.observations.every(item=>!item.confirmed)).toBe(true);
  await page.reload();await openTimelineNote(page);await expect(page.getByText(/^Captured on /)).toHaveText(captured);expect(mock.state().savedCalls).toBe(1);
});

test('changes return to whole-update review; removal is inside the editor and removing every fact never saves (services mocked)',async({page})=>{
  const mock=await mockSession(page,{interpretation:multiInterpretation()});await openMulti(page);
  await page.getByRole('checkbox',{name:/Use the day I choose for these details/}).check();
  await page.getByRole('button',{name:'Choose a date'}).click();await resolveMulti(page);
  await page.getByRole('button',{name:'Continue to save'}).click();await page.getByRole('link',{name:'Back to review'}).click();
  await openDetailEditor(page,1);await page.getByLabel('What happened',{exact:true}).fill('BP 140/88 this morning');
  await applyDetailChanges(page);await expect(page.getByRole('heading',{name:'Does this sound right?'})).toBeVisible();
  await expect(page.locator('.fact-text')).toHaveText(['BP 140/88 this morning','she did not feel dizzy']);
  await openDetailEditor(page,2);await page.getByRole('button',{name:'Remove this detail'}).click();await reviewDetailChanges(page);
  await page.getByRole('button',{name:'Continue to save'}).click();
  await page.getByText(/^(Record details|Source & record details)$/).click();await openOriginalNote(page);
  await expect(page.getByText(multiText,{exact:true})).toBeVisible();
  await page.getByRole('link',{name:'Back to review'}).click();await openDetailEditor(page,1);
  await page.getByRole('button',{name:'Remove this detail'}).click();await reviewDetailChanges(page);
  await expect(page.getByLabel('Your health note')).toHaveValue(multiText);expect(mock.state().savedCalls).toBe(0);
});

test('a shared date requires an explicit choice, names both facts and preserves their different times (services mocked)',async({page})=>{
  const text='Experienced mild headache this morning and noticed an allergy flare up at 5 in the evening.';
  const result=multiInterpretation();result.event=text;result.observations[0].event=result.observations[0].supportingWords='mild headache';
  result.observations[1].event=result.observations[1].supportingWords='noticed an allergy flare up';result.observations[1].polarity='present';result.observations[1].evidence='Caregiver-observed';result.observations[1].when='at 5 in the evening';result.observations[1].timing.time='17:00';result.observations[1].timing.precision='approximate';
  await mockSession(page,{interpretation:result});await openMulti(page,text);
  const shared=page.getByRole('checkbox',{name:/Use the day I choose for these details/});await expect(shared).not.toBeChecked();
  await expect(shared).toHaveAccessibleName(/mild headache.*noticed an allergy flare up/);
  for(const width of [320,390,768,1440]){
    await page.setViewportSize({width,height:844});
    const geometry=await page.locator('.shared-date').evaluate(label=>{const box=label.querySelector('input').getBoundingClientRect(),title=label.querySelector('.shared-date-title')?.getBoundingClientRect(),detail=label.querySelector('.shared-date-details')?.getBoundingClientRect();return{width:box.width,height:box.height,aligned:!!title&&Math.abs(box.top-title.top)<=4,stacked:!!detail&&!!title&&detail.top>=title.bottom,overflow:document.documentElement.scrollWidth>innerWidth};});
    expect(geometry).toEqual({width:20,height:20,aligned:true,stacked:true,overflow:false});
    if(width===390)await page.screenshot({path:'.impeccable/review/timing-checkbox-mobile.png',fullPage:true});
  }
  await shared.check();await page.getByRole('button',{name:'Choose a date'}).click();
  // Opening the date picker must preserve the explicit shared-date choice.
  await expect(page.getByRole('checkbox',{name:/Use the day I choose for these details/})).toBeChecked();
  await page.getByLabel('Date for this detail').fill('06/10/2026');await page.getByRole('button',{name:'Use this date'}).click();
  await expect(page.getByRole('heading',{name:'Does this sound right?'})).toBeVisible();
  await expect(page.locator('.fact-time').nth(1)).toHaveText('06/10/2026 at 17:00');
  await expect(page.getByRole('button',{name:'Continue to save'})).toBeEnabled();
});

test('manual recovery can add an explicitly negative detail and approve the whole update once (services mocked)',async({page})=>{
  const mock=await mockSession(page);
  await page.route('**/api/interpret',route=>route.fulfill({status:503,json:{error:'Busy right now. Try again in a few minutes.'}}));
  await openMulti(page);await page.getByRole('button',{name:'Edit manually'}).click();
  await page.getByLabel('What happened',{exact:true}).fill('BP 142/88 this morning');
  await applyDetailChanges(page);
  await page.getByRole('button',{name:'Add a detail from your update'}).click();
  await expect(page.getByRole('heading',{name:'Add a detail',exact:true})).toBeVisible();
  await expect(page.locator('.add-detail-context blockquote')).toHaveText(multiText);
  await expect(page.getByLabel('What else would you like to add?',{exact:true})).toHaveValue('');
  await page.getByRole('button',{name:'Cancel editing',exact:true}).click();await expect(page.locator('.fact-text')).toHaveCount(1);
  await page.getByRole('button',{name:'Add a detail from your update'}).click();
  for(const width of [320,390,768,1440]){await page.setViewportSize({width,height:900});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);await page.screenshot({path:`.impeccable/review/add-detail-context-${width}.png`,fullPage:true});}
  await page.getByLabel('What else would you like to add?',{exact:true}).fill('she did not feel dizzy');
  await page.getByText('Source and meaning',{exact:true}).click();
  await page.getByLabel('What was explicitly stated?').selectOption('absent');
  await applyDetailChanges(page);
  await expect(page.locator('.fact-text')).toHaveText(['BP 142/88 this morning','she did not feel dizzy']);
  await openDetailEditor(page,1);await expect(page.getByLabel('What happened',{exact:true})).toHaveValue('BP 142/88 this morning');await expect(page.getByLabel('Timing words',{exact:true})).toHaveValue('Not specified');await page.getByRole('button',{name:'Cancel editing',exact:true}).click();await reviewDetailChanges(page);
  await page.getByRole('button',{name:'Continue to save'}).click();await login(page);
  await expect(page.getByText('Saved to Mira Example’s record.')).toBeVisible();
  expect(mock.state().record.event.observations).toHaveLength(2);
  expect(mock.state().record.event.observations[1].polarity).toBe('absent');
  expect(mock.state().record.event.aiInterpretation).toBe(null);
});

test('LIVE: real interpretation reaches a single review and preserves both facts and capture time',async({page})=>{
  test.skip(process.env.CAPTURE_LIVE!=='1','Opt in to real Sarvam calls.');test.setTimeout(100000);
  await openMulti(page,'Mira Example had a mild headache today morning and I noticed an allergy flare up today at 5 p.m.');
  await expect(page.getByRole('heading',{name:'Does this sound right?'})).toBeVisible({timeout:90000});
  await page.getByText(/^(Record details|Source & record details)$/).click();
  await expect(page.getByText('Symptom · headache',{exact:true})).toBeVisible();
  await expect(page.getByText('Recorded as',{exact:true})).toHaveCount(2);
  await expect(page.locator('.fact-text')).toHaveCount(2);const captured=await page.getByText(/^Captured on /).textContent();
  await page.screenshot({path:'.impeccable/review/carenama-live-mobile.png',fullPage:true});
  await page.getByRole('button',{name:'Continue to save'}).click();await expect(page.getByRole('heading',{name:'Your update is ready.'})).toBeVisible();
  await expect(page.getByText(/^Captured on /)).toHaveText(captured);
});

for(const preview of ['desktop','phone HTTP']) {
  test(`${preview}: a failed save retries with the same record ID and saved facts return after refresh (services mocked)`,async({page,baseURL})=>{
    const address=Object.values(require('node:os').networkInterfaces()).flat().find(item=>item.family==='IPv4'&&!item.internal)?.address;
    test.skip(preview==='phone HTTP'&&!address,'Requires a local network address.');
    const origin=preview==='desktop'?baseURL:`http://${address}:${new URL(baseURL).port}`;
    const errors=[];page.on('pageerror',error=>errors.push(error.message));
    const mock=await mockSession(page,{failSave:true,interpretation:multiInterpretation()});await openMulti(page,multiText,origin);await resolveMulti(page);
    expect(await page.evaluate(()=>isSecureContext)).toBe(preview==='desktop');
    await page.getByRole('button',{name:'Continue to save'}).click();await login(page);
    await expect(page.getByRole('alert')).toContainText('Try again without closing this page.');await page.getByRole('button',{name:'Try again',exact:true}).click();
    await expect(page.getByText('Saved to Mira Example’s record.')).toBeVisible();
    const {savedIds,record}=mock.state();expect(savedIds).toHaveLength(2);expect(savedIds[0]).toBe(savedIds[1]);
    expect(savedIds[0]).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
    expect(record.event.observations.every(item=>item.confirmed)).toBe(true);
    await page.reload();await expect(page.getByRole('heading',{name:/health notes$/,exact:false})).toBeVisible();expect(mock.state().savedCalls).toBe(2);expect(errors).toEqual([]);
  });
}

test('Add update reuses the patient and whole-update review, retries a failed append and returns both notes after refresh (services mocked)',async({page})=>{
  const mock=await mockSession(page,{interpretation:multiInterpretation(),failAppend:true});
  await openMulti(page);await resolveMulti(page);await page.getByRole('button',{name:'Continue to save'}).click();await login(page);
  await expect(page.getByRole('heading',{name:/health notes$/,exact:false})).toBeVisible();
  await page.getByRole('button',{name:'Add update',exact:true}).click();
  await expect(page.getByLabel('Name')).toHaveCount(0);
  await expect(page.getByRole('heading',{name:'Mira Example',exact:true})).toBeVisible();
  await page.getByLabel('Your health note').fill(multiText);
  await page.getByRole('button',{name:'Review your note'}).click();await resolveMulti(page);
  await expect(page.getByRole('button',{name:'Continue to save'})).toHaveCount(0);
  await page.getByRole('button',{name:'Save update',exact:true}).click();
  await expect(page.getByRole('alert')).toContainText('Your update hasn’t been saved yet.');
  await page.getByRole('button',{name:'Try again',exact:true}).click();
  await expect(page.locator('.timeline-entry')).toHaveCount(2);
  expect(mock.state().appendCalls).toBe(2);expect(mock.state().codeRequests).toBe(1);
  expect(mock.state().savedIds[1]).toBe(mock.state().savedIds[2]);
  expect(mock.state().entries[0].details.confirmationId).not.toBe(mock.state().entries[1].details.confirmationId);
  await page.reload();await expect(page.locator('.timeline-entry')).toHaveCount(2);expect(mock.state().appendCalls).toBe(2);
  await page.screenshot({path:'.impeccable/review/timeline-mobile.png',fullPage:true});
  await page.setViewportSize({width:1440,height:900});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await page.screenshot({path:'.impeccable/review/timeline-desktop.png',fullPage:true});
});

const legacyEvent=index=>({confirmationId:`00000000-0000-4000-8000-${String(index).padStart(12,'0')}`,event:`Fictional note ${index}: Mira Example reported tiredness.`,when:'Not specified',evidence:'Patient-reported',source:'text',originalText:`Fictional note ${index}: Mira Example reported tiredness.`,edited:false,aiInterpretation:null,clarifications:[],capturedAt:Date.now()-index*86400000,timeZone:'Asia/Kolkata'});

test('stored labels stay inside Record details, determine icons and refresh after word edits without new controls',async({page})=>{
  const observations=multiInterpretation().observations.map(item=>({...item,confirmed:true,timing:{date:null,time:null,precision:'unknown',resolved:true}}));
  Object.assign(observations[0],{type:'measurement',measurement:{kind:'blood_pressure',value:'142/88',unit:''}});
  Object.assign(observations[1],{type:'symptom',symptomName:'dizziness'});
  const mixed={...legacyEvent(1),event:multiText,originalText:multiText,observations};
  const appetite={...legacyEvent(2),type:'appetite',event:'Appetite improved today'};
  const mock=await mockSession(page,{initialEvents:[mixed,appetite]});
  await page.goto('/#record');
  await expect(page.locator('.timeline-marker').nth(0)).toHaveClass(/marker-note/);
  await expect(page.locator('.timeline-marker').nth(1)).toHaveClass(/marker-wellbeing/);
  await expect(page.locator('.timeline-entry').first().getByText('Recorded as',{exact:true}).first()).not.toBeVisible();
  await page.locator('.timeline-entry-open').first().click();
  await page.getByText(/^(Record details|Source & record details)$/).first().click();
  await expect(page.getByText('Measurement · blood pressure 142/88',{exact:true})).toBeVisible();
  await expect(page.getByText('Symptom · dizziness',{exact:true})).toBeVisible();
  await expect(page.getByText('Explicitly absent',{exact:true})).toBeVisible();
  for(const width of [320,390,768,1440]){
    await page.setViewportSize({width,height:900});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
    await page.screenshot({path:`.impeccable/review/fact-labels-${width}.png`,fullPage:true});
  }
  await page.getByRole('button',{name:'Change update',exact:true}).first().click();
  await expect(page.getByLabel('Recorded as')).toHaveCount(0);
  await openDetailEditor(page,2);
  await page.getByLabel('What happened',{exact:true}).fill('She did not have a headache');
  await applyDetailChanges(page);
  await saveReviewedChanges(page);
  await page.getByText(/^(Record details|Source & record details)$/).first().click();
  await expect(page.getByText(/being sorted/)).toBeVisible();
  const stored=mock.state().entries[0].details;
  expect(stored.observations[1].type).toBe('pending');expect(stored.observations[1].symptomName).toBeUndefined();
  expect(stored.observations[0].measurement.value).toBe('142/88');expect(stored.originalText).toBe(mixed.originalText);expect(stored.capturedAt).toBe(mixed.capturedAt);
});

test('timeline loads older legacy notes in pages; a loading failure retains visible notes and retries without duplicates (services mocked)',async({page})=>{
  const mock=await mockSession(page,{initialEvents:Array.from({length:12},(_,index)=>legacyEvent(index+1)),failTimelineAt:2});
  await page.goto('/#record');await expect(page.locator('.timeline-entry')).toHaveCount(10);
  await expect(page.locator('.timeline-preview-text').first()).toHaveText('Fictional note 1: Mira Example reported tiredness.');
  await page.getByRole('button',{name:'Load older updates'}).click();await expect(page.getByRole('alert')).toContainText('Your saved notes are still there.');
  await expect(page.locator('.timeline-entry')).toHaveCount(10);
  await page.getByRole('button',{name:'Try again',exact:true}).click();await expect(page.locator('.timeline-entry')).toHaveCount(12);
  await expect(page.getByRole('button',{name:'Load older updates'})).toHaveCount(0);expect(mock.state().timelineCalls).toBe(3);
  await page.locator('.timeline-entry-open').last().click();
  await expect(page.getByText(/^Captured on /)).toBeVisible();
});

test('an initial timeline failure retries, while leaving an unconfirmed new capture never saves it (services mocked)',async({page})=>{
  const mock=await mockSession(page,{initialEvents:[legacyEvent(1)],failTimelineAt:1});
  await page.goto('/#record');await expect(page.getByRole('heading',{name:'We couldn’t open your timeline.'})).toBeVisible();
  await page.getByRole('button',{name:'Try again'}).click();await expect(page.locator('.timeline-entry')).toHaveCount(1);
  await page.getByRole('button',{name:'Add update'}).click();
  await page.getByLabel('Your health note').fill('Mira Example felt tired today.');
  await page.getByRole('link',{name:'Back to timeline'}).click();await expect(page.locator('.timeline-entry')).toHaveCount(1);
  expect(mock.state().savedCalls).toBe(0);
});

test('a signed-in empty account sets up a person and saves once without another sign-in',async({page})=>{
  const mock=await mockSession(page);await page.goto('/#signin');
  await page.getByLabel('Your email').fill('caregiver@example.test');await page.getByRole('button',{name:'Continue',exact:true}).click();
  await page.getByLabel('Email code').fill('123456');await page.getByRole('button',{name:/Verify & (save update|continue)/}).click();
  await expect(page.getByRole('button',{name:'Set up a health record'})).toBeVisible();
  await expect(page.getByRole('list',{name:'How a health note works'})).toContainText('Ready for your visit');
  await expect(page.getByText('Save with an email code.',{exact:true})).toHaveCount(0);
  expect(mock.state().codeRequests).toBe(1);
  for(const width of [320,390,768,1440]){await page.setViewportSize({width,height:844});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);await page.screenshot({path:`.impeccable/review/empty-record-m23-${width}.png`,fullPage:true});}
  await page.getByRole('button',{name:'Set up a health record'}).click();
  await expect(page.getByRole('link',{name:'Already have a record? Sign in'})).toHaveCount(0);
  await expect(page.getByRole('navigation',{name:'Update progress'}).locator('[aria-current="step"]')).toHaveText(/Person/);
  await expect(page.getByText(/Step [0-9] of/)).toHaveCount(0);
  await expect(page.locator('h1 + p')).toHaveText(/Just a name and your relationship\.\s*No medical profile needed\./);
  for(const width of [320,390,768,1440]){await page.setViewportSize({width,height:900});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);await page.screenshot({path:`.impeccable/review/first-record-setup-${width}.png`,fullPage:true});}
  await page.getByLabel('Name').fill('Mira Example');await page.getByLabel('Relationship').fill('Mother');
  await page.getByRole('button',{name:'Continue to your update',exact:true}).click();
  await expect(page.getByRole('navigation',{name:'Update progress'}).locator('[aria-current="step"]')).toHaveText(/Update/);
  for(const width of [320,390,768,1440]){await page.setViewportSize({width,height:900});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);await page.screenshot({path:`.impeccable/review/first-record-capture-${width}.png`,fullPage:true});}
  await page.getByRole('link',{name:'Back to person details'}).click();await expect(page.getByLabel('Name')).toHaveValue('Mira Example');
  await page.getByRole('button',{name:'Continue to your update',exact:true}).click();
  await expect(page.locator('#capture-draft-note')).toBeHidden();
  await page.getByLabel('Your health note').fill('Mira Example said she felt tired today.');await expect(page.locator('#capture-draft-note')).toBeVisible();await expect(page.locator('#capture-draft-note')).toHaveText('Unsaved draft \u00b7 Refreshing clears it');await page.getByRole('button',{name:'Review your note'}).click();
  await expect(page.getByRole('navigation',{name:'Update progress'}).locator('[aria-current="step"]')).toHaveText(/Review/);
  for(const width of [320,390,768,1440]){await page.setViewportSize({width,height:900});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);await page.screenshot({path:`.impeccable/review/first-record-review-${width}.png`,fullPage:true});}
  await page.getByRole('button',{name:'Save update',exact:true}).focus();await expect(page.getByRole('button',{name:'Save update',exact:true})).toBeFocused();await page.keyboard.press('Enter');
  await expect(page.locator('.timeline-entry')).toHaveCount(1);expect(mock.state().savedCalls).toBe(1);expect(mock.state().codeRequests).toBe(1);
  await page.getByRole('button',{name:'Add update'}).click();await expect(page.getByRole('navigation',{name:'Update progress'}).locator('[aria-current="step"]')).toHaveText(/Update/);
  await page.getByLabel('Your health note').fill('Mira Example said she felt tired today.');await page.getByRole('button',{name:'Review your note'}).click();await expect(page.getByRole('navigation',{name:'Update progress'}).locator('[aria-current="step"]')).toHaveText(/Review/);
  await page.getByRole('button',{name:'Add something else',exact:true}).click();await expect(page.getByRole('navigation',{name:'Update progress'}).locator('[aria-current="step"]')).toHaveText(/Review/);await expect(page.getByLabel('What happened',{exact:true})).toHaveValue('Mira Example said she felt tired today.\n');
});

test('back from a failed confirmed save does not silently retry saving when opening the timeline (services mocked)',async({page})=>{
  const mock=await mockSession(page,{initialEvents:[legacyEvent(1)],interpretation:multiInterpretation(),failAppend:true});
  await page.goto('/#record');await page.getByRole('button',{name:'Add update'}).click();
  await page.getByLabel('Your health note').fill(multiText);
  await page.getByRole('button',{name:'Review your note'}).click();await resolveMulti(page);
  await page.getByRole('button',{name:'Save update',exact:true}).click();await expect(page.getByRole('alert')).toContainText('Your update hasn’t been saved yet.');
  await page.getByRole('link',{name:'Back to your update'}).click();await page.getByRole('link',{name:'Back to timeline'}).click();
  await expect(page.locator('.timeline-entry')).toHaveCount(1);expect(mock.state().appendCalls).toBe(1);
});


test('saved updates use whole review for corrections; cancel is safe, retry and refresh retain original capture (services mocked)',async({page})=>{
  const original=legacyEvent(1),mock=await mockSession(page,{initialEvents:[original],failCorrection:true});
  await page.goto('/#record');await openTimelineNote(page);await page.getByRole('button',{name:'Change update',exact:true}).click();
  await openDetailEditor(page,1);await page.getByLabel('What happened',{exact:true}).fill('Mira Example reported mild tiredness.');
  await applyDetailChanges(page);await page.getByRole('button',{name:'Cancel changes'}).click();
  await expect(page.locator('.fact-text')).toHaveText(original.event);expect(mock.state().correctionCalls).toBe(0);
  await openTimelineNote(page);await page.getByRole('button',{name:'Change update',exact:true}).click();await openDetailEditor(page,1);
  await page.getByLabel('What happened',{exact:true}).fill('Mira Example reported mild tiredness.');
  await page.getByRole('button',{name:'Remove this detail'}).click();await expect(page.getByRole('alert')).toContainText('Keep one detail');
  await applyDetailChanges(page);
  await page.screenshot({path:'.impeccable/review/saved-edit-mobile.png',fullPage:true});
  await page.setViewportSize({width:1440,height:900});await page.screenshot({path:'.impeccable/review/saved-edit-desktop.png',fullPage:true});await page.setViewportSize({width:390,height:844});
  await saveReviewedChanges(page);await expect(page.getByRole('alert')).toContainText('save your changes');
  await page.getByRole('button',{name:'Try again'}).click();await expect(page.locator('.fact-text')).toHaveText('Mira Example reported mild tiredness.');
  expect(mock.state().entries[0].details.originalText).toBe(original.originalText);expect(mock.state().entries[0].details.capturedAt).toBe(original.capturedAt);
  await page.reload();await openTimelineNote(page);await expect(page.locator('.fact-text')).toHaveText('Mira Example reported mild tiredness.');expect(mock.state().correctionCalls).toBe(2);
});

test('deleting needs explicit confirmation, failures retain the note and deleting the last note retains the patient (services mocked)',async({page})=>{
  const mock=await mockSession(page,{initialEvents:[legacyEvent(1)],failDelete:true});
  await page.goto('/#record');await openTimelineNote(page);await page.getByRole('button',{name:'Delete update',exact:true}).click();
  await expect(page.getByRole('heading',{name:'Delete this update?'})).toBeVisible();await page.getByRole('button',{name:'Keep update'}).click();expect(mock.state().deleteCalls).toBe(0);
  await openTimelineNote(page);await page.getByRole('button',{name:'Delete update',exact:true}).click();await page.screenshot({path:'.impeccable/review/delete-mobile.png',fullPage:true});
  await openTimelineNote(page);await page.getByRole('button',{name:'Delete update',exact:true}).click();await expect(page.getByRole('alert')).toContainText('Your saved note is still there');
  await openTimelineNote(page);await page.getByRole('button',{name:'Delete update',exact:true}).click();await expect(page.getByText('No saved updates yet.',{exact:true})).toBeVisible();
  await page.reload();await expect(page.getByText('No saved updates yet.',{exact:true})).toBeVisible();await expect(page.getByRole('heading',{name:/Mira Example.*health notes/})).toBeVisible();
  await page.getByRole('button',{name:'Add update'}).click();await expect(page.getByLabel('Name')).toHaveCount(0);expect(mock.state().deleteCalls).toBe(2);
});

test('a stale saved correction offers reopening instead of overwriting another change (services mocked)',async({page})=>{
  const mock=await mockSession(page,{initialEvents:[legacyEvent(1)],staleCorrection:true});await page.goto('/#record');
  await openTimelineNote(page);await page.getByRole('button',{name:'Change update',exact:true}).click();await saveReviewedChanges(page);
  await expect(page.getByRole('alert')).toContainText('changed or was removed elsewhere');await expect(page.getByRole('button',{name:'Try again'})).toHaveCount(0);
  await page.getByRole('button',{name:'Back to timeline'}).click();await expect(page.locator('.timeline-entry')).toHaveCount(1);expect(mock.state().correctionCalls).toBe(1);
});


test('a correction can remove one fact while preserving the linked negative and original capture (services mocked)',async({page})=>{
  const original=legacyEvent(1);original.originalText='BP 142/88 this morning and she did not feel dizzy';original.event=original.originalText;
  original.observations=[{id:'1',event:'BP 142/88',when:'this morning',supportingWords:'BP 142/88 this morning',evidence:'Measured',polarity:'present',timing:{date:null,time:null,precision:'approximate',resolved:true},confirmed:true,edited:false},{id:'2',event:'she did not feel dizzy',when:'Unknown',supportingWords:'she did not feel dizzy',evidence:'Patient-reported',polarity:'absent',timing:{date:null,time:null,precision:'unknown',resolved:true},confirmed:true,edited:false}];
  const mock=await mockSession(page,{initialEvents:[original]});await page.goto('/#record');await openTimelineNote(page);await page.getByRole('button',{name:'Change update',exact:true}).click();
  await openDetailEditor(page,1);await page.getByRole('button',{name:'Remove this detail'}).click();await reviewDetailChanges(page);
  await expect(page.locator('.fact-text')).toHaveText('she did not feel dizzy');await saveReviewedChanges(page);await expect(page.locator('.fact-text')).toHaveText('she did not feel dizzy');await page.getByRole('button',{name:'Back to timeline',exact:true}).click();await expect(page.locator('.timeline-entry')).toHaveCount(1);
  await page.reload();await openTimelineNote(page);await expect(page.locator('.fact-text')).toHaveText('she did not feel dizzy');expect(mock.state().entries[0].details.observations[0].polarity).toBe('absent');expect(mock.state().entries[0].details.removedObservations).toHaveLength(1);expect(mock.state().entries[0].details.originalText).toBe(original.originalText);
});


test('care updates share capture, whole review, saved timeline and refresh without category forms (services mocked)',async({page})=>{
  const mock=await mockSession(page,{initialEvents:[legacyEvent(1)]});
  await page.route('**/api/interpret',route=>{const text=route.request().postDataJSON().text;return route.fulfill({json:{status:'ready',event:text,when:'today',evidence:'Not specified',question:'',message:'',observations:[{id:'1',event:text,when:'today',supportingWords:text,evidence:text.startsWith('She said')?'Patient-reported':'Not specified',polarity:'present',timing:{date:'2026-10-06',time:null,precision:'date',resolved:true},confirmed:false,edited:false}]}});});
  await page.goto('/#record');
  const texts=['Doctor said to reduce her medicine from 10 mg to 5 mg today.','We visited the doctor today.','She said her appetite is better today.','She said she slept poorly today.','She said her energy is better today.'];
  for(const [index,text] of texts.entries()){
    await page.getByRole('button',{name:'Add update'}).click();await page.getByLabel('Your health note').fill(text);await page.getByRole('button',{name:'Review your note'}).click();
    await expect(page.getByRole('heading',{name:'Does this sound right?'})).toBeVisible();await expect(page.locator('.fact-text')).toHaveText(text);
    if(index===0){await page.screenshot({path:'.impeccable/review/care-context-mobile.png',fullPage:true});await page.setViewportSize({width:1440,height:900});await page.screenshot({path:'.impeccable/review/care-context-desktop.png',fullPage:true});await page.setViewportSize({width:390,height:844});}
    await page.getByRole('button',{name:'Save update',exact:true}).click();await expect(page.locator('.timeline-entry')).toHaveCount(index+2);
  }
  await page.reload();await expect(page.locator('.timeline-entry')).toHaveCount(6);for(const text of texts)await expect(page.getByText(text,{exact:true}).first()).toBeVisible();expect(mock.state().codeRequests).toBe(0);expect(mock.state().appendCalls).toBe(5);
});

for(const sample of [
  {name:'reported medicine change',text:'Doctor said to reduce her medicine from 10 mg to 5 mg today.',count:1},
  {name:'doctor visit and appetite',text:'We visited the doctor yesterday and she said her appetite is better today.',count:2},
  {name:'sleep and energy',text:'I noticed she slept poorly yesterday and she said her energy is better today.',count:2},
])test(`LIVE: ${sample.name} reaches whole review without advice or invented details`,async({page})=>{
  test.skip(process.env.CAPTURE_LIVE!=='1','Opt in to real Sarvam calls.');test.setTimeout(100000);
  await openMulti(page,sample.text);await expect(page.getByRole('heading',{name:'Does this sound right?'})).toBeVisible({timeout:90000});
  await expect(page.locator('.fact-text')).toHaveCount(sample.count);const facts=await page.locator('.fact-text').allTextContents();for(const fact of facts)expect(sample.text).toContain(fact);
  if(sample.count===1){expect(facts[0]).toContain('Doctor said');expect(facts[0]).toContain('10 mg to 5 mg');}
  const captured=await page.getByText(/^Captured on /).textContent();await page.getByRole('button',{name:'Continue to save'}).click();await expect(page.getByRole('heading',{name:'Your update is ready.'})).toBeVisible();await expect(page.getByText(/^Captured on /)).toHaveText(captured);
});


test('same-person capture before login is kept, explicitly matched, retried and appended without re-entry (services mocked)',async({page})=>{
  const mock=await mockSession(page,{initialEvents:[legacyEvent(1)],signedOutInitially:true,interpretation:multiInterpretation(),failMatch:true,failAppend:true});
  await openMulti(page);await resolveMulti(page);await page.getByRole('button',{name:'Continue to save'}).click();await login(page);
  await expect(page.getByRole('alert')).toContainText('check your existing record');await page.getByRole('button',{name:'Try again'}).click();
  await expect(page.getByRole('heading',{name:'Is this update for Mira Example?'})).toBeVisible();expect(mock.state().appendCalls).toBe(0);
  await expect(page.locator('.fact-text')).toHaveCount(2);await page.screenshot({path:'.impeccable/review/match-mobile.png',fullPage:true});await page.setViewportSize({width:1440,height:900});await page.screenshot({path:'.impeccable/review/match-desktop.png',fullPage:true});await page.setViewportSize({width:390,height:844});
  await page.getByRole('link',{name:'No, back to my update'}).click();await expect(page.getByRole('heading',{name:'Your update is ready.'})).toBeVisible();expect(mock.state().appendCalls).toBe(0);
  await page.getByRole('link',{name:'Save this update',exact:true}).click();await expect(page.getByRole('heading',{name:'Is this update for Mira Example?'})).toBeVisible();
  const captured=await page.getByText(/^Captured on /).textContent();await page.getByRole('button',{name:'Yes, save to this record'}).click();await expect(page.getByRole('alert')).toContainText('hasn');
  await page.getByRole('button',{name:'Try again'}).click();await expect(page.locator('.timeline-entry')).toHaveCount(2);
  expect(mock.state().savedIds.at(-1)).toBe(mock.state().savedIds.at(-2));expect(mock.state().entries[1].details.observations).toHaveLength(2);expect(mock.state().entries[1].details.observations[1].polarity).toBe('absent');
  await page.reload();await expect(page.locator('.timeline-entry')).toHaveCount(2);await openTimelineNote(page);await expect(page.getByText(/^Captured on /).first()).toHaveText(captured);expect(mock.state().codeRequests).toBe(1);
});

test('different identity after login stays unsaved and can return to its prepared update (services mocked)',async({page})=>{
  const mock=await mockSession(page,{initialEvents:[legacyEvent(1)],signedOutInitially:true});
  await page.goto('/');await page.getByRole('link',{name:'Start a health note',exact:true}).click();await page.getByLabel('Name').fill('Other Example');await page.getByLabel('Relationship').fill('Father');await page.getByRole('button',{name:'Continue to your update',exact:true}).click();
  await page.getByLabel('Your health note').fill('Other Example felt tired today.');await page.getByRole('button',{name:'Review your note'}).click();await page.getByRole('button',{name:'Continue to save'}).click();await login(page);
  await expect(page.getByRole('alert')).toContainText('each account keeps notes for one person');await expect(page.getByRole('button',{name:'Yes, save to this record'})).toHaveCount(0);expect(mock.state().appendCalls).toBe(0);
  await page.getByRole('link',{name:'Back to your update'}).click();await expect(page.getByRole('heading',{name:'Your update is ready.'})).toBeVisible();expect(mock.state().entries).toHaveLength(1);
});


const summaryFixture=()=>({status:'ready',name:'Mira Example',groups:[{title:'Symptoms and observations',keys:['1']}],sources:[{key:'1',recordId:'1',revision:0,edited:true,event:'She did not feel dizzy.',when:'today',evidence:'Patient-reported',polarity:'absent',date:'2026-10-06',capturedAt:Date.now(),timeZone:'Asia/Kolkata',supportingWords:'She did not feel dizzy.'}],undated:[{key:'u1',recordId:'1',revision:0,event:'Her appetite seemed better sometime last week.',when:'sometime last week',evidence:'Caregiver-observed',polarity:'uncertain',date:null,capturedAt:Date.now(),timeZone:'Asia/Kolkata',supportingWords:'Her appetite seemed better sometime last week.'}],undatedCount:1,recordCount:1,message:'',generatedAt:Date.now()});

test('six-week summary shows all stored categories and 126 facts, with source details and a 90-day boundary',async({page})=>{
  const categories=['Symptoms','Measurements','Medication changes','Doctor visits','Daily wellbeing','Appetite','Other'];
  const sources=Array.from({length:126},(_,index)=>({...summaryFixture().sources[0],key:String(index+1),recordId:String(index+1),event:`Fictional saved fact ${index+1}`,supportingWords:`Fictional saved fact ${index+1}`,date:new Date(Date.parse('2026-08-26T12:00:00Z')+Math.floor(index/3)*86400000).toISOString().slice(0,10)}));
  const result={...summaryFixture(),sources,groups:categories.map((title,index)=>({title,keys:sources.filter((_,sourceIndex)=>sourceIndex%7===index).map(source=>source.key)})),recordCount:126,undated:[],undatedCount:0,overview:[{id:'repeat:swelling',text:'Swelling appears in recorded notes on 42 different days. This counts recorded days, not separate episodes.',keys:['1','4']}],snapshotHash:'a'.repeat(64)};
  const mock=await mockSession(page,{initialEvents:[legacyEvent(1)],summaryReply:result});
  await page.goto('/#record');await page.getByRole('button',{name:'Summary'}).click();
  await page.getByLabel('From',{exact:true}).fill('01/07/2026');await page.getByLabel('To',{exact:true}).fill('29/09/2026');await page.getByRole('button',{name:'Prepare summary'}).click();
  await expect(page.getByRole('alert')).toHaveText('Choose a period of up to 90 days.');expect(mock.state().summaryCalls).toBe(0);
  await page.getByLabel('From',{exact:true}).fill('26/08/2026');await page.getByLabel('To',{exact:true}).fill('06/10/2026');await page.getByRole('button',{name:'Prepare summary'}).click();
  await expect(page.locator('.summary-highlights')).toContainText('42 different days');await expect(page.locator('.summary-categories')).toHaveCount(0);await page.getByRole('button',{name:'View all details',exact:true}).click();await expect(page.locator('.summary-categories .summary-category')).toHaveCount(7);
  await expect(page.locator('.summary-category .marker-wellbeing')).toHaveCount(2);await expect(page.locator('.summary-category .marker-care')).toHaveCount(2);
  for(const width of [320,390,768,1440]){
    await page.setViewportSize({width,height:900});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
    await page.screenshot({path:`.impeccable/review/stored-type-summary-${width}.png`,fullPage:true});
  }
  await expect(page.locator('.summary-categories .update-facts li:visible')).toHaveCount(126);
  await page.locator('.summary-categories details > summary').first().focus();await page.keyboard.press('Enter');await page.keyboard.press('Enter');
  await page.locator('.summary-categories .summary-source > summary').first().click();await expect(page.locator('.summary-categories').getByText('Explicitly absent',{exact:true}).first()).toBeVisible();
  await page.getByRole('button',{name:'Back to summary',exact:true}).click();await page.getByRole('button',{name:'Review & share summary'}).click();await expect(page.getByLabel('Text to share',{exact:true})).toBeVisible();
  expect(mock.state().shareCheckCalls).toBe(1);expect(mock.state().savedCalls).toBe(0);
});

test('period summary validates dates, retains period on failure, shows source evidence and undated details, then returns to timeline (services mocked)',async({page})=>{
  const mock=await mockSession(page,{initialEvents:[legacyEvent(1)],summaryReply:summaryFixture(),failSummary:true});await page.goto('/#record');await page.getByRole('button',{name:'Summary'}).click();
  await page.getByLabel('From',{exact:true}).fill('07/10/2026');await page.getByLabel('To',{exact:true}).fill('06/10/2026');await page.getByRole('button',{name:'Prepare summary'}).click();await expect(page.getByRole('alert')).toContainText('start before the end');expect(mock.state().summaryCalls).toBe(0);
  await page.getByLabel('From',{exact:true}).fill('01/10/2026');await page.getByRole('button',{name:'Prepare summary'}).click();await expect(page.getByRole('alert')).toContainText('Busy right now');await expect(page.getByLabel('From',{exact:true})).toHaveValue('01/10/2026');
  await page.getByRole('button',{name:'Prepare summary'}).click();await expect(page.getByRole('button',{name:'View all details',exact:true})).toBeVisible();await expect(page.getByText('A few notes give a limited picture; one note does not establish a pattern.')).toBeVisible();
  await page.getByRole('button',{name:'View all details',exact:true}).click();await expect(page.locator('.period-result .fact-text').first()).toHaveText('She did not feel dizzy.');await page.getByText('View source',{exact:true}).first().click();await expect(page.getByText('Explicitly absent',{exact:true})).toBeVisible();await expect(page.getByText('Corrected by you.',{exact:true})).toBeVisible();
  await expect(page.getByText(/^Timing not known/)).toBeVisible();
  await page.screenshot({path:'.impeccable/review/summary-mobile.png',fullPage:true});await page.setViewportSize({width:1440,height:900});await page.screenshot({path:'.impeccable/review/summary-desktop.png',fullPage:true});
  await page.getByRole('button',{name:'Back to summary',exact:true}).click();await page.locator('.summary-period-picker > summary').click();await page.getByLabel('From',{exact:true}).fill('01/09/2026');await expect(page.locator('.period-result')).toHaveCount(0);await page.getByRole('button',{name:'Back to timeline'}).click();await expect(page.locator('.timeline-entry')).toHaveCount(1);expect(mock.state().savedCalls).toBe(0);
});

for(const scenario of ['empty','too_many'])test(`period summary ${scenario} explains available data and retains saved timeline (services mocked)`,async({page})=>{
  await mockSession(page,{initialEvents:[legacyEvent(1)],summaryReply:{...summaryFixture(),status:scenario,groups:[],sources:[],undated:[],undatedCount:0,recordCount:0,message:'Choose a shorter period.'}});await page.goto('/#record');await page.getByRole('button',{name:'Summary'}).click();await page.getByRole('button',{name:'Prepare summary'}).click();await expect(page.getByText(scenario==='empty'?'There are no dated updates to summarise for this period.':'Choose a shorter period.',{exact:true})).toBeVisible();await page.getByRole('button',{name:'Back to timeline'}).click();await expect(page.locator('.timeline-entry')).toHaveCount(1);
});

async function openTimelineNote(page) {
 await page.locator('.timeline-entry-open, .timeline-expanded, .delete-preview').first().waitFor();
 const note=page.locator('.timeline-entry-open').first();
 if(await note.count())await note.click();
}


test('compact timeline reveals complete notes in one tap, keeps negatives and works across widths and keyboard (services mocked)',async({page})=>{
  const errors=[];page.on('pageerror',error=>errors.push(error.message));
  const original=legacyEvent(1);original.observations=[
    {id:'a',event:'BP 142/88',when:'this morning',evidence:'Measured',polarity:'present',supportingWords:'BP 142/88 this morning',timing:{date:'2026-10-06',time:null,precision:'approximate',resolved:true}},
    {id:'b',event:'She did not feel dizzy',when:'this morning',evidence:'Patient-reported',polarity:'absent',supportingWords:'she did not feel dizzy',timing:{date:'2026-10-06',time:null,precision:'approximate',resolved:true}},
    {id:'c',event:'Long fictional detail '.repeat(40),when:'Timing not known',evidence:'Caregiver-observed',polarity:'uncertain',supportingWords:'x'.repeat(600),timing:{date:null,time:null,precision:'unknown',resolved:true}}
  ];
  const measured={...legacyEvent(2),event:'BP 120/80',evidence:'Measured',type:'measurement'},care={...legacyEvent(3),event:'We visited the doctor.',type:'doctor_visit'};
  const mock=await mockSession(page,{initialEvents:[original,measured,care]});await page.goto('/#record');
  await expect(page.locator('.timeline-entry')).toHaveCount(3);
  await expect(page.getByRole('button',{name:'Change update'})).toHaveCount(0);
  await expect(page.getByRole('button',{name:'Delete update'})).toHaveCount(0);
  await expect(page.getByText('One note. 3 details.',{exact:true})).toBeVisible();
  await expect(page.locator('.marker-note')).toHaveCount(1);await expect(page.locator('.marker-measurement')).toHaveCount(1);await expect(page.locator('.marker-care')).toHaveCount(1);
  for(const width of [320,390,768,1440]){
    await page.setViewportSize({width,height:900});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
    if(width===390 || width===1440)await page.screenshot({path:`.impeccable/review/compact-timeline-${width}.png`,fullPage:true});
  }
  const summary=page.locator('.timeline-entry-open').first();await summary.focus();await page.keyboard.press('Enter');
  await expect(page.locator('.timeline-expanded').first().getByText('She did not feel dizzy',{exact:true}).first()).toBeVisible();
  await expect(page.getByText('Explicitly absent',{exact:true})).not.toBeVisible();await page.getByText(/^(Record details|Source & record details)$/).first().click();await expect(page.getByText('Explicitly absent',{exact:true})).toBeVisible();await expect(page.getByText(/^Captured on /).first()).toBeVisible();
  for(const width of [320,390,1440]){
    await page.setViewportSize({width,height:900});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
    if(width===390)await page.screenshot({path:'.impeccable/review/compact-expanded-mobile.png',fullPage:true});
  }
  await page.getByRole('button',{name:'Change update',exact:true}).click();await page.getByRole('button',{name:'Cancel changes',exact:true}).click();
  await page.getByText(/^(Record details|Source & record details)$/).first().click();await expect(page.getByText('Explicitly absent',{exact:true})).toBeVisible();
  await page.getByRole('button',{name:'Delete update',exact:true}).click();await page.getByRole('button',{name:'Keep update'}).click();
  expect(mock.state().deleteCalls).toBe(0);expect(mock.state().correctionCalls).toBe(0);
  await page.getByRole('button',{name:'Back to timeline',exact:true}).click();await expect(page.getByRole('button',{name:'Change update'})).toHaveCount(0);const row=page.locator('.timeline-entry-open').first();await expect(row).toBeFocused();expect(errors).toEqual([]);
});

test('summary starts with supported overview and calm categories, sources disclose on tap and narrow layouts stay intact (services mocked)',async({page})=>{
  const result=summaryFixture();result.overview=[{id:'h1',text:'A later note explicitly records no dizziness. This describes those notes, not the days between them.',keys:['1']}];
  for(const [title,key,event] of [['Measurements','2','BP 142/88'],['Care and visits','3','Doctor visit recorded.'],['Appetite, sleep and energy','4','She said she slept poorly.']]){result.groups.push({title,keys:[key]});result.sources.push({...result.sources[0],key,recordId:key,event,polarity:'present'});}
  result.recordCount=4;const errors=[];page.on('pageerror',e=>errors.push(e.message));await mockSession(page,{initialEvents:[legacyEvent(1)],summaryReply:result});await page.goto('/#record');await page.getByRole('button',{name:'Summary'}).click();await page.getByRole('button',{name:'Prepare summary'}).click();
  await expect(page.locator('.summary-narrative')).toHaveText(result.overview[0].text);await page.getByRole('button',{name:'View all details',exact:true}).click();await expect(page.locator('.summary-category')).toHaveCount(4);await expect(page.getByText('Corrected by you.',{exact:true}).first()).not.toBeVisible();
  for(const width of [320,390,768,1440]){await page.setViewportSize({width,height:900});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);if(width===390 || width===1440)await page.screenshot({path:`.impeccable/review/calm-summary-${width}.png`,fullPage:true});}
  const category=page.locator('.summary-category > summary').first();await category.focus();await page.keyboard.press('Enter');await page.keyboard.press('Enter');await page.locator('.summary-category').first().getByText('View source',{exact:true}).click();await expect(page.locator('.summary-category').first().getByText('Explicitly absent',{exact:true})).toBeVisible();
  await page.getByText('Notes behind this overview',{exact:true}).click();await expect(page.locator('.overview-sources .fact-text')).toHaveText('She did not feel dizzy.');
  await page.setViewportSize({width:320,height:900});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);expect(errors).toEqual([]);
});

test('unrelated sparse notes use neutral overview rather than an unsupported better or worse claim (services mocked)',async({page})=>{
  await mockSession(page,{initialEvents:[legacyEvent(1)],summaryReply:summaryFixture()});await page.goto('/#record');await page.getByRole('button',{name:'Summary'}).click();await page.getByRole('button',{name:'Prepare summary'}).click();await expect(page.locator('.summary-highlights')).toContainText('one note does not establish a pattern');await expect(page.locator('.summary-highlights')).not.toContainText('looking better');await expect(page.locator('.summary-highlights')).not.toContainText('since last visit');
});

test('checking an existing sign-in never signs out or clears a typed update, and duplicate auth notifications keep the summary open (services mocked)',async({page})=>{
  const mock=await mockSession(page,{initialEvents:[legacyEvent(1)],summaryReply:summaryFixture()});await page.goto('/#record');await expect(page.locator('.timeline-entry')).toHaveCount(1);
  await page.getByRole('button',{name:'Add update'}).click();await page.getByLabel('Your health note').fill('Mira Example felt tired this morning.');
  await page.evaluate(()=>window.__testSessionChange({isLoading:true,isAuthenticated:false}));
  await expect(page.getByLabel('Your health note')).toHaveValue('Mira Example felt tired this morning.');await expect(page).toHaveURL(/#capture$/);
  await page.evaluate(()=>window.__testSessionChange({isLoading:false,isAuthenticated:true}));await expect(page.getByLabel('Your health note')).toHaveValue('Mira Example felt tired this morning.');
  await page.getByRole('link',{name:'Back to timeline'}).click();await page.getByRole('button',{name:'Summary'}).click();await page.getByRole('button',{name:'Prepare summary'}).click();await expect(page.locator('.period-result')).toBeVisible();
  const reads=mock.state().timelineCalls;
  await page.evaluate(()=>window.__testSessionChange({isLoading:false,isAuthenticated:true}));await expect(page.locator('.period-result')).toBeVisible();expect(mock.state().timelineCalls).toBe(reads);
  await page.getByRole('button',{name:'Back to timeline'}).click();await page.getByRole('button',{name:'Open menu',exact:true}).click();page.once('dialog',dialog=>dialog.accept());await page.getByRole('button',{name:'Sign out'}).click();await expect(page.getByRole('link',{name:'Already have a record? Sign in'})).toBeVisible();
});

const briefFixture=()=>{
  const base=summaryFixture(),sources=[base.sources[0],...[
    ['2','She said her appetite seems better.','uncertain','Patient-reported'],['3','She said her headache was worse.','present','Patient-reported'],['4','BP 142/88','present','Measured'],['5','Doctor said to reduce medicine from 10 mg to 5 mg.','present','Not specified'],['6','She asked about the previous reading?','uncertain','Patient-reported']
  ].map(([key,event,polarity,evidence])=>({...base.sources[0],key,recordId:key,event,polarity,evidence,supportingWords:event}))];
  return {...base,start:'2026-10-01',end:'2026-10-06',overview:[],sources,recordCount:6,sections:[{title:'Reported improvements',keys:['2']},{title:'Reported worsening or new symptoms',keys:['3']},{title:'Other observations',keys:['1']},{title:'Recorded measurements',keys:['4']},{title:'Care and visits',keys:['5']}],discussionKeys:['6']};
};

test('summary includes visit preparation without a second screen or second AI request (services mocked)',async({page})=>{
  const result=briefFixture();result.groups=[{title:'Symptoms and observations',keys:['1','3','6']},{title:'Measurements',keys:['4']},{title:'Care and visits',keys:['5']},{title:'Appetite, sleep and energy',keys:['2']}];
  const errors=[];page.on('pageerror',error=>errors.push(error.message));const mock=await mockSession(page,{initialEvents:[legacyEvent(1)],summaryReply:result,failSummary:true});
  await page.goto('/#record');await expect(page.getByRole('button',{name:'For a doctor visit'})).toHaveCount(0);await page.getByRole('button',{name:'Summary'}).click();
  await page.getByLabel('From',{exact:true}).fill('01/10/2026');await page.getByLabel('To',{exact:true}).fill('06/10/2026');await page.getByRole('button',{name:'Prepare summary'}).click();await expect(page.getByRole('alert')).toContainText('Busy');await expect(page.getByLabel('From',{exact:true})).toHaveValue('01/10/2026');await page.getByRole('button',{name:'Prepare summary'}).click();
  await expect(page.locator('.period-result')).toBeVisible();await expect(page.getByRole('button',{name:'Prepare doctor brief'})).toHaveCount(0);
  await page.getByRole('button',{name:'View all details',exact:true}).click();await page.getByText('Points to discuss at a visit',{exact:true}).click();await expect(page.locator('.summary-discussion .fact-text')).toBeVisible();
  await page.locator('.summary-category').filter({has:page.getByRole('heading',{name:'Daily wellbeing',exact:true})}).locator(':scope > summary').focus();await expect(page.getByText('Reported improvements',{exact:true})).toBeVisible();await expect(page.locator('.period-result').getByText('She said her appetite seems better.',{exact:true}).first()).toBeVisible();
  for(const width of [320,390,768,1440]){await page.setViewportSize({width,height:900});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);if(width===390||width===1440)await page.screenshot({path:`.impeccable/review/unified-summary-${width}.png`,fullPage:true});}
  await page.evaluate(()=>window.__testSessionChange({isLoading:true,isAuthenticated:false}));await page.evaluate(()=>window.__testSessionChange({isLoading:false,isAuthenticated:true}));await expect(page.locator('.period-result')).toBeVisible();
  await page.getByRole('button',{name:'Back to summary',exact:true}).click();await page.getByRole('button',{name:'Back to timeline'}).click();await expect(page.locator('.timeline-entry')).toHaveCount(1);expect(mock.state().summaryCalls).toBe(2);expect(mock.state().savedCalls).toBe(0);expect(errors).toEqual([]);
});

test('prepared summary keeps dates in a compact row, opens the form on demand and retains the individual change (services mocked)',async({page})=>{
 const result=summaryFixture();result.sources[0].event='Mira Example started feeling better around 9 p.m. today';result.sources[0].supportingWords=result.sources[0].event;result.sources[0].polarity='present';result.sections=[{title:'Reported improvements',keys:['1']}];
 await mockSession(page,{initialEvents:[legacyEvent(1)],summaryReply:result});await page.goto('/#record');await page.getByRole('button',{name:'Summary'}).click();await page.getByLabel('From',{exact:true}).fill('01/10/2026');await page.getByLabel('To',{exact:true}).fill('06/10/2026');await page.getByRole('button',{name:'Prepare summary'}).click();
 await expect(page.locator('.summary-highlights')).toContainText('one note does not establish a pattern');await expect(page.locator('.summary-highlights')).toContainText(result.sources[0].event);await expect(page.locator('.summary-narrative')).toHaveCount(0);await expect(page.getByLabel('From',{exact:true})).not.toBeVisible();
 for(const width of [320,390,768,1440]){await page.setViewportSize({width,height:900});const row=await page.locator('.summary-period-picker').boundingBox();expect(row.height).toBeLessThanOrEqual(52);await expect(page.locator('.selected-period')).toContainText('01/10/2026');expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);if(width===390||width===1440)await page.screenshot({path:`.impeccable/review/compact-summary-dates-${width}.png`,fullPage:true});}
 await page.getByRole('button',{name:'View all details',exact:true}).click();await expect(page.locator('.summary-category .fact-text').first()).toHaveText(result.sources[0].event);await expect(page.getByText('Reported improvements',{exact:true})).toBeVisible();
 await page.getByRole('button',{name:'Back to summary',exact:true}).click();await page.locator('.summary-period-picker > summary').click();await expect(page.getByLabel('From',{exact:true})).toHaveValue('01/10/2026');await page.getByLabel('From',{exact:true}).fill('01/09/2026');await expect(page.locator('.period-result')).toHaveCount(0);await expect(page.locator('.selected-period')).toContainText('01/09/2026');await page.getByRole('button',{name:'Prepare summary'}).click();await expect(page.getByLabel('From',{exact:true})).not.toBeVisible();
});

const sharingFixtureText="CareNama: Mira Example's health summary\nPeriod: 01/10/2026 to 06/10/2026\n\nThere is not enough information to describe an overall change in health yet. Add more updates to build a fuller picture.\n\nBased on 1 saved update. Only a few updates are available, so this gives a limited picture.\n\n1 dated detail and 1 detail with uncertain timing. Full measurements and notes are available in CareNama through View all details.\n\nBased on saved caregiver notes. Days without notes tell us nothing about symptoms.";
async function openSharing(page,options={},origin=''){
 const mock=await mockSession(page,{initialEvents:[legacyEvent(1)],summaryReply:summaryFixture(),...options});await page.goto(`${origin}/#record`);await page.getByRole('button',{name:'Summary'}).click();await page.getByRole('button',{name:'Prepare summary'}).click();await page.getByRole('button',{name:'Review & share summary'}).click();return mock;
}
async function sharingDevice(page,{available=true,shareError=null,clipboardError=false,slowCheck=false}={}){
 await page.addInitScript(({available,shareError,clipboardError,slowCheck})=>{
  window.__deviceShares=[];window.__deviceCopies=[];window.__allowActivation=!slowCheck;
  Object.defineProperty(navigator,'share',{configurable:true,value:available?async data=>{window.__deviceShares.push(data);if(shareError)throw new DOMException('Test error',shareError);}:undefined});
  Object.defineProperty(navigator,'canShare',{configurable:true,value:()=>true});
  Object.defineProperty(navigator,'userActivation',{configurable:true,value:{get isActive(){return window.__allowActivation;}}});
  Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:async text=>{if(clipboardError)throw new DOMException('Test error','NotAllowedError');window.__deviceCopies.push(text);}}});
 },{available,shareError,clipboardError,slowCheck});
}

test('summary sharing reviews exact text, keeps edits on Back, copies and shares only on request without saving notes (device and services mocked)',async({page})=>{
 await sharingDevice(page);const mock=await openSharing(page);await expect(page.getByLabel('Text to share')).toHaveValue(sharingFixtureText);expect(await page.evaluate(()=>window.__deviceShares.length+window.__deviceCopies.length)).toBe(0);
 const revised=sharingFixtureText+'\nQuestion for the doctor: what did the last reading mean?';await page.getByLabel('Text to share').fill(revised);await page.getByRole('button',{name:'Back to summary',exact:true}).click();await expect(page.locator('.summary-highlights')).toContainText('one note does not establish a pattern');await page.getByRole('button',{name:'Review & share summary'}).click();await expect(page.getByLabel('Text to share')).toHaveValue(revised);
 for(const width of [320,390,768,1440]){await page.setViewportSize({width,height:900});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);if(width===390||width===1440)await page.screenshot({path:`.impeccable/review/summary-sharing-${width}.png`,fullPage:true});}
 await page.getByRole('button',{name:'Copy text',exact:true}).focus();await page.keyboard.press('Enter');await expect(page.getByText('Copied. Paste it into the app you choose.',{exact:true})).toBeVisible();expect(await page.evaluate(()=>window.__deviceCopies)).toEqual([revised]);
 await page.getByRole('button',{name:'Share',exact:true}).click();await expect(page.getByText('Sharing completed on this device. Your draft is still here.',{exact:true})).toBeVisible();expect(await page.evaluate(()=>window.__deviceShares[0].text)).toBe(revised);
 await page.evaluate(()=>window.__testSessionChange({isLoading:true,isAuthenticated:false}));await page.evaluate(()=>window.__testSessionChange({isLoading:false,isAuthenticated:true}));await expect(page.getByLabel('Text to share')).toHaveValue(revised);
 expect(mock.state().summaryCalls).toBe(1);expect(mock.state().shareCheckCalls).toBe(3);expect(mock.state().savedCalls).toBe(0);expect(mock.state().correctionCalls).toBe(0);
 await page.getByRole('button',{name:'Back to summary',exact:true}).click();await page.locator('.summary-period-picker > summary').click();page.once('dialog',dialog=>dialog.dismiss());await page.getByLabel('From',{exact:true}).fill('01/09/2026');await expect(page.locator('.period-result')).toBeVisible();await page.getByRole('button',{name:'Review & share summary'}).click();await expect(page.getByLabel('Text to share')).toHaveValue(revised);
 await page.getByLabel('Text to share').fill('   ');await expect(page.getByRole('button',{name:'Share',exact:true})).toBeDisabled();await expect(page.getByRole('button',{name:'Copy text',exact:true})).toBeDisabled();
});

for(const nativeError of ['AbortError','DataError'])test(`summary sharing ${nativeError} keeps draft for retry and copy (device and services mocked)`,async({page})=>{
 await sharingDevice(page,{shareError:nativeError});await openSharing(page);await expect(page.getByLabel('Text to share')).toHaveValue(sharingFixtureText);await page.getByRole('button',{name:'Share',exact:true}).click();
 await expect(page.getByText(nativeError==='AbortError'?'Sharing cancelled. Your draft is still here.':'We couldn’t open sharing. Your draft is still here. Try again or use Copy text.',{exact:true})).toBeVisible();await expect(page.getByLabel('Text to share')).toHaveValue(sharingFixtureText);await page.getByRole('button',{name:'Copy text',exact:true}).click();await expect(page.getByText('Copied. Paste it into the app you choose.',{exact:true})).toBeVisible();
});

test('summary copy fallback selects text when device sharing or clipboard is unavailable (device and services mocked)',async({page})=>{
 await sharingDevice(page,{available:false,clipboardError:true});await page.addInitScript(()=>document.execCommand=()=>false);await openSharing(page);await expect(page.getByRole('button',{name:'Share',exact:true})).toHaveCount(0);await expect(page.getByLabel('Text to share')).toHaveValue(sharingFixtureText);await page.getByRole('button',{name:'Copy text',exact:true}).click();await expect(page.getByText(/Automatic copying isn’t available/)).toBeVisible();expect(await page.getByLabel('Text to share').evaluate(element=>element.selectionEnd-element.selectionStart)).toBe(sharingFixtureText.length);await expect(page.getByLabel('Text to share')).toBeEnabled();
});

test('server checks prevent stale or failed sharing without discarding the edited draft (device and services mocked)',async({page})=>{
 await sharingDevice(page);const mock=await openSharing(page,{failShareCheckAt:2,staleShareAt:4});await expect(page.getByLabel('Text to share')).toHaveValue(sharingFixtureText);await page.getByLabel('Text to share').fill(sharingFixtureText+'\nA caregiver edit.');await page.getByRole('button',{name:'Share',exact:true}).click();await expect(page.getByText('We couldn’t check the saved notes. Your draft is still here. Try again.',{exact:true})).toBeVisible();expect(await page.evaluate(()=>window.__deviceShares.length)).toBe(0);
 await page.getByRole('button',{name:'Copy text',exact:true}).click();await expect(page.getByText('Copied. Paste it into the app you choose.',{exact:true})).toBeVisible();await page.getByRole('button',{name:'Share',exact:true}).click();await expect(page.getByText(/A saved note changed/)).toBeVisible();await expect(page.getByLabel('Text to share')).toHaveValue(/A caregiver edit\./);await expect(page.getByRole('button',{name:'Share',exact:true})).toBeDisabled();await expect(page.getByRole('button',{name:'Copy text',exact:true})).toBeDisabled();expect(await page.evaluate(()=>window.__deviceShares.length)).toBe(0);expect(mock.state().savedCalls).toBe(0);
});

test('slow server check needs a fresh share tap and leaving before completion never opens sharing (device and services mocked)',async({page})=>{
 await sharingDevice(page,{slowCheck:true});const mock=await openSharing(page);await expect(page.getByLabel('Text to share')).toHaveValue(sharingFixtureText);await page.getByRole('button',{name:'Share',exact:true}).click();await expect(page.getByText('Your draft is checked. Tap Share to open your device’s menu.',{exact:true})).toBeVisible();expect(await page.evaluate(()=>window.__deviceShares.length)).toBe(0);await page.evaluate(()=>window.__allowActivation=true);await page.getByRole('button',{name:'Share',exact:true}).click();await expect(page.getByText('Sharing completed on this device. Your draft is still here.',{exact:true})).toBeVisible();expect(mock.state().shareCheckCalls).toBe(2);
 let release;await page.route('**/__test/share-check',async route=>{await new Promise(resolve=>release=resolve);await route.fulfill({json:{status:'ready',title:'Mira Example summary',text:sharingFixtureText,message:''}});});await page.getByRole('button',{name:'Share',exact:true}).click();await expect(page.getByText('Checking your saved notes…',{exact:true})).toBeVisible();await expect.poll(()=>typeof release).toBe('function');await page.getByRole('button',{name:'Back to summary',exact:true}).click();release();await expect(page.locator('.summary-highlights')).toBeVisible();expect(await page.evaluate(()=>window.__deviceShares.length)).toBe(1);
});

test('phone HTTP preview copies the reviewed text into the actual clipboard (services mocked)',async({page,context,baseURL})=>{
 const address=Object.values(require('node:os').networkInterfaces()).flat().find(item=>item.family==='IPv4'&&!item.internal)?.address;test.skip(!address,'Requires a local network address.');
 await context.grantPermissions(['clipboard-read','clipboard-write']);await page.setViewportSize({width:390,height:844});
 await openSharing(page,{},`http://${address}:${new URL(baseURL).port}`);await expect(page.getByLabel('Text to share')).toHaveValue(sharingFixtureText);
 expect(await page.evaluate(()=>isSecureContext)).toBe(false);await expect(page.getByRole('button',{name:'Share',exact:true})).toHaveCount(0);
 const revised=sharingFixtureText+'\nA caregiver edit.';await page.getByLabel('Text to share').fill(revised);
 await page.getByRole('button',{name:'Copy text',exact:true}).click();await expect(page.getByText('Copied. Paste it into the app you choose.',{exact:true})).toBeVisible();
 await expect(page.getByLabel('Text to share')).toHaveValue(revised);await expect(page.getByLabel('Text to share')).toBeEnabled();
 const reader=await context.newPage();await reader.goto('/');expect(await reader.evaluate(async expected=>(await navigator.clipboard.readText()).replace(/\r\n/g,'\n')===expected,revised)).toBe(true);await reader.close();
});

test('slow copy check needs a fresh tap without checking again (device and services mocked)',async({page})=>{
 await sharingDevice(page,{slowCheck:true});const mock=await openSharing(page);await expect(page.getByLabel('Text to share')).toHaveValue(sharingFixtureText);
 await page.getByRole('button',{name:'Copy text',exact:true}).click();await expect(page.getByText('Your draft is checked. Tap Copy text again to copy it.',{exact:true})).toBeVisible();
 expect(await page.evaluate(()=>window.__deviceCopies.length)).toBe(0);await page.evaluate(()=>window.__allowActivation=true);
 await page.getByRole('button',{name:'Copy text',exact:true}).click();await expect(page.getByText('Copied. Paste it into the app you choose.',{exact:true})).toBeVisible();expect(mock.state().shareCheckCalls).toBe(2);expect(await page.evaluate(()=>window.__deviceCopies)).toEqual([sharingFixtureText]);
});

test('Copy text writes the reviewed draft to the actual browser clipboard (account services mocked)',async({page,context})=>{
 await context.grantPermissions(['clipboard-read','clipboard-write']);await openSharing(page);await expect(page.getByLabel('Text to share')).toHaveValue(sharingFixtureText);await page.getByRole('button',{name:'Copy text',exact:true}).click();await expect(page.getByText('Copied. Paste it into the app you choose.',{exact:true})).toBeVisible();const copied=await page.evaluate(async expected=>{const text=await navigator.clipboard.readText();return{matches:text.replace(/\r\n/g,'\n')===expected,length:text.length,lineFeeds:(text.match(/\n/g)||[]).length,carriageReturns:(text.match(/\r/g)||[]).length};},sharingFixtureText);expect(copied.matches).toBe(true);
});


test('returning caregiver reopens an unfinished capture at the saved timeline without setup (services mocked)',async({page,context})=>{
 const mock=await mockSession(page,{initialEvents:[legacyEvent(1)],interpretation:multiInterpretation()});await page.goto('/');await expect(page.locator('.timeline-entry')).toHaveCount(1);
 await page.getByRole('button',{name:'Add update',exact:true}).click();await page.getByLabel('Your health note').fill('An unfinished note.');
 await page.reload();await expect(page.getByRole('heading',{name:/health notes$/,exact:false})).toBeVisible();await expect(page.getByLabel('Name')).toHaveCount(0);expect(mock.state().savedCalls).toBe(0);
 await page.getByRole('button',{name:'Add update',exact:true}).click();await expect(page.getByRole('heading',{name:'Mira Example',exact:true})).toBeVisible();
 await expect(page.getByRole('list',{name:'How a health note works'})).toHaveCount(0);await expect(page.getByText('“Felt dizzy after lunch today.”',{exact:true})).toHaveCount(1);
 await page.getByLabel('Your health note').fill('Mira Example said she felt tired today.');await page.getByRole('button',{name:'Review your note'}).click();await resolveMulti(page);await page.getByRole('button',{name:'Save update',exact:true}).click();
 await expect(page.locator('.timeline-entry')).toHaveCount(2);await page.goto('/');await expect(page.locator('.timeline-entry')).toHaveCount(2);expect(mock.state().appendCalls).toBe(1);expect(mock.state().codeRequests).toBe(0);
 await page.screenshot({path:'.impeccable/review/returning-caregiver-mobile.png',fullPage:true});
 const storedEvents=mock.state().entries.map(entry=>entry.details);await page.close();const reopened=await context.newPage();const next=await mockSession(reopened,{initialEvents:storedEvents});await reopened.goto('/');await expect(reopened.locator('.timeline-entry')).toHaveCount(2);await expect(reopened.getByLabel('Name')).toHaveCount(0);expect(next.state().savedCalls).toBe(0);await reopened.close();
});

test('expired returning session reopens at sign-in and returns to the same notes (services mocked)',async({page})=>{
 const mock=await mockSession(page,{initialEvents:[legacyEvent(1)],signedOutInitially:true});await page.addInitScript(()=>localStorage.setItem('carenama.returning','1'));await page.goto('/');
 await expect(page.getByRole('heading',{name:'Welcome back.',exact:true})).toBeVisible();expect(mock.state().timelineCalls).toBe(0);
 await page.getByLabel('Your email').fill('caregiver@example.test');await page.getByRole('button',{name:'Continue',exact:true}).click();await page.getByLabel('Email code').fill('123456');await page.getByRole('button',{name:/Verify & (save update|continue)/}).click();
 await expect(page.locator('.timeline-entry')).toHaveCount(1);expect(mock.state().savedCalls).toBe(0);await page.getByRole('button',{name:'Open menu',exact:true}).click();await page.getByRole('button',{name:'Sign out',exact:true}).click();await expect(page.getByRole('link',{name:'Start a health note',exact:true})).toBeVisible();
});

test('reopening waits for sign-in verification and retries timeline failure without creating records (services mocked)',async({page})=>{
 const mock=await mockSession(page,{initialEvents:[legacyEvent(1)],failTimelineAt:1,pendingSession:true});
 await page.goto('/#capture');await expect(page.getByRole('heading',{name:'Opening CareNama',exact:true})).toBeVisible();await expect(page.getByLabel('Name')).toHaveCount(0);expect(mock.state().timelineCalls).toBe(0);await page.evaluate(()=>window.__testResolveSession());await expect(page.getByRole('alert')).toContainText('load the timeline');await expect(page.getByLabel('Name')).toHaveCount(0);await expect(page.getByRole('button',{name:'Add update',exact:true})).toHaveCount(0);
 await page.getByRole('button',{name:'Try again',exact:true}).click();await expect(page.locator('.timeline-entry')).toHaveCount(1);expect(mock.state().savedCalls).toBe(0);
});


test('blocked browser storage still allows returning to the server-owned timeline (services mocked)',async({page})=>{
 await mockSession(page,{initialEvents:[legacyEvent(1)]});await page.addInitScript(()=>{Storage.prototype.getItem=()=>{throw new DOMException('Blocked','SecurityError');};Storage.prototype.setItem=()=>{throw new DOMException('Blocked','SecurityError');};});
 await page.goto('/');await expect(page.locator('.timeline-entry')).toHaveCount(1);await page.reload();await expect(page.locator('.timeline-entry')).toHaveCount(1);await expect(page.getByLabel('Name')).toHaveCount(0);
});


test('concise sharing keeps edits through one-click full details, enforces 1500 characters and copies only the draft',async({page})=>{
 await sharingDevice(page);const result=summaryFixture();result.sources.push({...result.sources[0],key:'2',event:'BP was 142/88.',type:'measurement',measurement:{kind:'blood_pressure',value:'142/88',unit:'mmHg'}});result.groups.push({title:'Measurements',keys:['2']});result.undated=Array.from({length:25},(_,index)=>({...result.undated[0],key:`u${index+1}`,event:`Unknown-timing fictional detail ${index+1}.`}));result.undatedCount=25;
 const mock=await openSharing(page,{summaryReply:result});const revised=sharingFixtureText+'\nMy question for the doctor.';await page.getByLabel('Text to share').fill(revised);
 await page.getByRole('button',{name:'View all details',exact:true}).click();await expect(page.getByText('BP was 142/88.',{exact:true})).toBeVisible();await expect(page.getByText('Unknown-timing fictional detail 25.',{exact:true})).toBeVisible();await expect(page.getByText('She did not feel dizzy.',{exact:true}).first()).toBeVisible();
 await page.screenshot({path:'.impeccable/review/concise-details-390.png',fullPage:false});await page.getByRole('button',{name:'Back to sharing draft',exact:true}).click();await expect(page.getByLabel('Text to share')).toHaveValue(revised);expect(mock.state().shareCheckCalls).toBe(1);
 await expect(page.getByLabel('Text to share')).toHaveAttribute('maxlength','1500');await page.getByLabel('Text to share').fill('a'.repeat(1500));await expect(page.locator('#sharing-count')).toHaveText('1,500 / 1,500 characters');await expect(page.getByRole('button',{name:'Copy text',exact:true})).toBeEnabled();
 await page.getByLabel('Text to share').evaluate(element=>{element.value='b'.repeat(1501);element.dispatchEvent(new Event('input',{bubbles:true}));});await expect(page.getByRole('button',{name:'Copy text',exact:true})).toBeDisabled();await expect(page.getByRole('alert')).toHaveText('Keep your draft within 1,500 characters.');
 await page.getByLabel('Text to share').fill(revised);await page.getByRole('button',{name:'Copy text',exact:true}).click();await expect(page.getByText('Copied. Paste it into the app you choose.',{exact:true})).toBeVisible();expect(await page.evaluate(()=>window.__deviceCopies)).toEqual([revised]);expect(mock.state().savedCalls).toBe(0);
 for(const width of [320,390,768,1440]){await page.setViewportSize({width,height:900});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);await page.screenshot({path:`.impeccable/review/concise-sharing-${width}.png`,fullPage:true});}
 await page.getByRole('button',{name:'Back to summary',exact:true}).click();await page.getByRole('button',{name:'View all details',exact:true}).focus();await page.keyboard.press('Enter');await expect(page.getByRole('heading',{name:'All recorded details',exact:true})).toBeFocused();
});


test('account deletion requires a fresh code, allows cancellation, retains invalid input, and returns to a fresh start',async({page})=>{
 const mock=await mockSession(page,{initialEvents:[legacyEvent(1)],failDeletionCode:true,failAccountDeletion:true});await page.goto('/#record');await page.getByRole('button',{name:'Open menu',exact:true}).click();await page.getByRole('button',{name:'Delete account and record',exact:true}).click();
 await expect(page.getByRole('heading',{name:'Delete account and record?',exact:true})).toBeVisible();await expect(page.getByText(/This cannot be undone/)).toBeVisible();expect(mock.state().deletionCodeCalls).toBe(0);await page.getByRole('button',{name:'Keep my account',exact:true}).click();await expect(page.locator('.timeline-entry')).toHaveCount(1);
 await page.getByRole('button',{name:'Open menu',exact:true}).click();await page.getByRole('button',{name:'Delete account and record',exact:true}).click();await page.getByRole('button',{name:'Send deletion code',exact:true}).click();await expect(page.getByRole('alert')).toContainText('couldn');expect(mock.state().entries).toHaveLength(1);
 await page.getByRole('button',{name:'Send deletion code',exact:true}).click();await expect(page.getByLabel('Deletion code')).toBeFocused();await page.getByRole('button',{name:'Send a new code',exact:true}).click();await expect(page.getByRole('alert')).toContainText('wait a minute');expect(mock.state().deletionCodeCalls).toBe(2);
 await page.getByLabel('Deletion code').fill('123456');await page.getByRole('button',{name:'Permanently delete account and record',exact:true}).click();await expect(page.getByRole('alert')).toContainText('not correct');await expect(page.getByLabel('Deletion code')).toHaveValue('123456');expect(mock.state().entries).toHaveLength(1);
 for(const width of [320,390,768,1440]){await page.setViewportSize({width,height:900});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);if(width===390||width===1440)await page.screenshot({path:`.impeccable/review/delete-account-${width}.png`,fullPage:true});}
 await page.getByLabel('Deletion code').fill('654321');await page.getByRole('button',{name:'Permanently delete account and record',exact:true}).click();await expect(page.getByRole('alert')).toContainText('Deletion has started');await expect(page.getByRole('button',{name:'Keep my account',exact:true})).toHaveCount(0);
 await page.getByRole('button',{name:'Finish deleting my account',exact:true}).click();await expect(page.getByRole('status')).toHaveText('Your account and health record have been permanently deleted.');await expect(page.getByRole('link',{name:'Start a health note',exact:true})).toBeVisible();expect(mock.state().entries).toHaveLength(0);expect(mock.state().record).toBe(null);expect(await page.evaluate(()=>localStorage.getItem('carenama.returning'))).toBe(null);
 await page.reload();await expect(page.getByRole('link',{name:'Start a health note',exact:true})).toBeVisible();await page.getByRole('link',{name:'Already have a record? Sign in',exact:true}).click();await page.getByLabel('Your email').fill('caregiver@example.test');await page.getByRole('button',{name:'Continue',exact:true}).click();await page.getByLabel('Email code').fill('123456');await page.getByRole('button',{name:/Verify & (save update|continue)/,exact:true}).click();await expect(page.getByText('No saved updates yet.',{exact:true})).toBeVisible();await page.getByRole('button',{name:'Set up a health record',exact:true}).click();await expect(page.getByLabel('Name')).toHaveValue('');await page.getByLabel('Name').fill('Mira Example');await page.getByLabel('Relationship').fill('Daughter');await page.getByRole('button',{name:'Continue to your update',exact:true}).click();await page.getByLabel('Your health note').fill('Mira Example said she felt tired today.');await page.getByRole('button',{name:'Review your note',exact:true}).click();await page.getByRole('button',{name:'Save update',exact:true}).click();await expect(page.locator('.timeline-entry')).toHaveCount(1);expect(mock.state().savedCalls).toBe(1);
});


test('reopening an already verified deletion resumes cleanup without exposing notes or sending another code',async({page})=>{
 const mock=await mockSession(page,{initialEvents:[legacyEvent(1)],deletingInitially:true});await page.goto('/#record');await expect(page.getByRole('button',{name:'Finish deleting my account',exact:true})).toBeVisible();await expect(page.locator('.timeline-entry')).toHaveCount(0);await expect(page.getByRole('button',{name:'Keep my account',exact:true})).toHaveCount(0);expect(mock.state().deletionCodeCalls).toBe(0);
 await page.getByRole('button',{name:'Finish deleting my account',exact:true}).click();await expect(page.getByRole('status')).toHaveText('Your account and health record have been permanently deleted.');expect(mock.state().entries).toHaveLength(0);expect(mock.state().accountDeletionCalls).toBe(1);
});


test('pending sign-out cannot replace the menu with help or throw on completion',async({page})=>{
 await mockSession(page,{initialEvents:[legacyEvent(1)]});let release;const errors=[];
 page.on('pageerror',error=>errors.push(error.message));
 await page.route('**/__test/signout',async route=>{await new Promise(resolve=>{release=resolve;});await route.fulfill({json:null});});
 await page.goto('/#record');await expect(page.locator('.timeline-entry')).toHaveCount(1);
 await page.getByRole('button',{name:'Open menu',exact:true}).click();await page.getByRole('button',{name:'Sign out',exact:true}).click();
 await expect(page.getByRole('button',{name:'What can I record?',exact:true})).toBeDisabled();
 await expect.poll(()=>typeof release).toBe('function');release();
 await expect(page.getByRole('link',{name:'Already have a record? Sign in',exact:true})).toBeVisible();expect(errors).toEqual([]);
});

test('common menu cannot bypass protection for edited sharing text',async({page})=>{
 await openSharing(page);const changed=sharingFixtureText+' A fictional caregiver edit.';
 await page.getByLabel('Text to share').fill(changed);await page.getByRole('button',{name:'Open menu',exact:true}).click();
 page.once('dialog',dialog=>dialog.dismiss());await page.getByRole('link',{name:'Privacy & your choices',exact:true}).click();
 await expect(page.getByLabel('Text to share')).toHaveValue(changed);await expect(page).toHaveURL(/#record$/);
});

test('menu preserves an unsaved update through help, Escape and privacy',async({page})=>{
 await mockSession(page,{initialEvents:[legacyEvent(1)]});
 await page.goto('/#record');await page.getByRole('button',{name:'Add update',exact:true}).click();

 await page.locator('#health-update').fill('Mira Example felt tired after lunch today.');
 const menu=page.getByRole('button',{name:'Open menu',exact:true});
 await menu.click();await expect(menu).toHaveAttribute('aria-expanded','true');
 await page.keyboard.press('Escape');await expect(menu).toBeFocused();await expect(menu).toHaveAttribute('aria-expanded','false');
 await menu.click();await page.getByRole('button',{name:'What can I record?',exact:true}).click();
 await expect(page.getByRole('heading',{name:'A small note is enough.',exact:true})).toBeVisible();
 await page.getByRole('button',{name:'Back to menu',exact:true}).click();await expect(page.getByRole('button',{name:'What can I record?',exact:true})).toBeFocused();
 await page.getByRole('link',{name:'Privacy & your choices',exact:true}).click();
 await page.getByRole('button',{name:'Back to your update',exact:true}).click();
 await expect(page.locator('#health-update')).toHaveValue('Mira Example felt tired after lunch today.');
 await expect(page.getByRole('link',{name:'Back to timeline',exact:true})).toHaveAttribute('aria-label','Back to timeline');
});

test('account deletion cancellation from the common menu restores the current draft',async({page})=>{
 const mock=await mockSession(page,{initialEvents:[legacyEvent(1)]});await page.goto('/#record');
 await page.getByRole('button',{name:'Add update',exact:true}).click();
 await page.locator('#health-update').fill('Mira Example slept better last night.');
 await page.getByRole('button',{name:'Open menu',exact:true}).click();await page.getByRole('button',{name:'Delete account and record',exact:true}).click();
 await page.getByRole('button',{name:'Keep my account',exact:true}).click();
 await expect(page.locator('#health-update')).toHaveValue('Mira Example slept better last night.');
 expect(mock.state().deletionCodeCalls).toBe(0);expect(mock.state().entries).toHaveLength(1);
});

test('signed-out menu hides account controls and preserves a partially entered email',async({page})=>{
 await mockSession(page,{signedOutInitially:true});await page.goto('/#signin');
 await page.locator('#signin-email').fill('fictional@example.com');await page.getByRole('button',{name:'Open menu',exact:true}).click();
 await expect(page.getByRole('dialog').getByRole('button',{name:'Sign out',exact:true})).toHaveCount(0);
 await expect(page.getByRole('dialog').getByRole('button',{name:'Delete account and record',exact:true})).toHaveCount(0);
 await page.getByRole('button',{name:'Close menu',exact:true}).click();await expect(page.locator('#signin-email')).toHaveValue('fictional@example.com');
});

test('privacy is reachable before sign-in, explains processing, and keeps browser opt-out after reopening',async({page})=>{
 const mock=await mockSession(page);await page.goto('/');await page.getByRole('button',{name:'Open menu',exact:true}).click();await page.getByRole('link',{name:'Privacy & your choices',exact:true}).click();
 await expect(page.getByRole('heading',{name:'Your notes. Your choice.',exact:true})).toBeVisible();await expect(page.getByText('Mixpanel, in the EU',{exact:true})).toBeVisible();await expect(page.getByRole('switch',{name:'Usage tracking On',exact:true})).toHaveAttribute('aria-checked','true');
 for(const width of [320,390,768,1440]){await page.setViewportSize({width,height:900});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);if(width===390||width===1440)await page.screenshot({path:`.impeccable/review/privacy-${width}.png`,fullPage:true});}
 await page.keyboard.press('Tab');await page.getByRole('switch').focus();expect(await page.getByRole('switch').evaluate(el=>getComputedStyle(el).outlineStyle)).not.toBe('none');
 await page.getByRole('switch').click();await expect(page.getByRole('switch')).toHaveAttribute('aria-checked','false');expect(mock.state().analytics).toBe(false);expect(await page.evaluate(()=>localStorage.getItem('carenama.analytics'))).toBe('off');
 const count=mock.state().analyticsEvents.length;await page.getByRole('button',{name:'Back',exact:true}).click();await page.getByRole('link',{name:'Start a health note',exact:true}).click();await page.getByLabel('Name').fill('Mira Example');await page.getByLabel('Relationship').fill('Daughter');await page.getByRole('button',{name:'Continue to your update',exact:true}).click();await expect(page.getByRole('button',{name:'Tap to record',exact:true})).toBeVisible();expect(mock.state().analyticsEvents).toHaveLength(count);
 await page.goto('/#privacy');await expect(page.getByRole('switch')).toHaveAttribute('aria-checked','false');await page.getByRole('switch').click();await expect(page.getByRole('switch')).toHaveAttribute('aria-checked','true');expect(mock.state().analytics).toBe(true);
});

test('account privacy saves across reopening, recovers from failure and never sends health details',async({page})=>{
 const mock=await mockSession(page,{initialEvents:[legacyEvent(1)],failPrivacy:true});await page.goto('/#record');await page.getByRole('button',{name:'Open menu',exact:true}).click();await page.getByRole('link',{name:'Privacy & your choices',exact:true}).click();await expect(page.getByRole('switch')).toBeEnabled();await page.getByRole('switch').click();await expect(page.getByRole('alert')).toContainText('save your choice');await expect(page.getByRole('switch')).toHaveAttribute('aria-checked','true');expect(mock.state().entries).toHaveLength(1);
 await page.getByRole('switch').click();await expect(page.getByRole('switch')).toHaveAttribute('aria-checked','false');const count=mock.state().analyticsEvents.length;
 await page.getByRole('button',{name:'Back to timeline',exact:true}).click();await expect(page.locator('.timeline-entry')).toHaveCount(1);await page.getByRole('button',{name:'Open menu',exact:true}).click();await page.getByRole('link',{name:'Privacy & your choices',exact:true}).click();await expect(page.getByRole('switch')).toHaveAttribute('aria-checked','false');expect(mock.state().analyticsEvents).toHaveLength(count);
 await page.reload();await expect(page.getByRole('switch')).toHaveAttribute('aria-checked','false');expect(mock.state().analyticsEvents).toHaveLength(count);
 await page.getByRole('switch').click();await expect(page.getByRole('switch')).toHaveAttribute('aria-checked','true');await page.getByRole('button',{name:'Back to timeline',exact:true}).click();await expect.poll(()=>mock.state().analyticsEvents.length).toBeGreaterThan(count);
 for(const entry of mock.state().analyticsEvents){expect(Object.keys(entry)).toEqual(['anonymousId','event','properties']);expect(JSON.stringify(entry)).not.toContain('Mira');expect(JSON.stringify(entry)).not.toContain('tired');expect(JSON.stringify(entry)).not.toContain('@');}
});


test('a tracking preference changed on another device is authoritative when this account reopens',async({page})=>{
 await page.addInitScript(()=>{localStorage.setItem('carenama.analytics','off');localStorage.setItem('carenama.analytics-scope','account');});
 const mock=await mockSession(page,{initialEvents:[legacyEvent(1)],analyticsInitially:true});await page.goto('/#record');await expect(page.locator('.timeline-entry')).toHaveCount(1);await expect.poll(()=>mock.state().analyticsEvents.length).toBeGreaterThan(0);expect(mock.state().privacyCalls).toBe(0);expect(mock.state().analytics).toBe(true);
 await page.getByRole('button',{name:'Open menu',exact:true}).click();await page.getByRole('link',{name:'Privacy & your choices',exact:true}).click();await expect(page.getByRole('switch')).toHaveAttribute('aria-checked','true');
});

test('usage events count successful copying and edited drafts without counting a cancelled share or sending draft text',async({page})=>{
 await sharingDevice(page,{shareError:'AbortError'});const mock=await openSharing(page);await expect(page.getByLabel('Text to share')).toHaveValue(sharingFixtureText);await page.getByLabel('Text to share').fill(sharingFixtureText+' A fictional caregiver edit.');await page.getByRole('button',{name:'Share',exact:true}).click();await expect(page.getByText('Sharing cancelled. Your draft is still here.',{exact:true})).toBeVisible();
 expect(mock.state().analyticsEvents.filter(item=>item.event==='summary_shared')).toHaveLength(0);await expect.poll(()=>mock.state().analyticsEvents.filter(item=>item.event==='share_draft_edited').length).toBe(1);
 await page.getByRole('button',{name:'Copy text',exact:true}).click();await expect(page.getByText('Copied. Paste it into the app you choose.',{exact:true})).toBeVisible();await expect.poll(()=>mock.state().analyticsEvents.filter(item=>item.event==='summary_shared').length).toBe(1);
 expect(mock.state().analyticsEvents.find(item=>item.event==='summary_shared').properties).toEqual({method:'copy',version:'concise'});expect(mock.state().analyticsEvents.find(item=>item.event==='share_draft_edited').properties).toEqual({edit_size:'small'});expect(mock.state().analyticsEvents.filter(item=>item.event==='share_draft_edited')).toHaveLength(1);
 expect(JSON.stringify(mock.state().analyticsEvents)).not.toContain('caregiver edit');expect(JSON.stringify(mock.state().analyticsEvents)).not.toContain('Mira Example');expect(mock.state().analyticsEvents.find(item=>item.event==='summary_prepared').properties.result).toBe('ok');
});

const milestone26Fixture=()=>{
 const result=summaryFixture();result.overview=[];result.undated=[];result.undatedCount=0;
 result.sources=[['1','symptom','Mira Example said she might have heartburn, but no chest pain.','heartburn'],['2','medication_change','Doctor said to reduce fictional medicine from 10 mg to 5 mg.'],['3','doctor_visit','A fictional doctor visit was recorded.'],['4','measurement','BP 142/88'],['5','daily_wellbeing','She said her sleep was not improving.']].map(([key,type,event,symptomName])=>({...result.sources[0],key,recordId:key,event,supportingWords:event,type,...(symptomName?{symptomName}:{}),polarity:key==='1'?'uncertain':'present'}));
 result.groups=[['Symptoms','1'],['Medication changes','2'],['Doctor visits','3'],['Measurements','4'],['Daily wellbeing','5']].map(([title,key])=>({title,keys:[key]}));result.recordCount=5;return result;
};
async function milestone26Helpers(){
 const {stripTypeScriptTypes}=await import('node:module');const {readFileSync}=require('node:fs');
 const source=stripTypeScriptTypes(readFileSync('convex/lib/summaryShare.ts','utf8'));
 return import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));
}
async function milestone26Draft(result){
 const {formatSharingDraft}=await milestone26Helpers();
 return formatSharingDraft(result,'2026-10-01','2026-10-06');
}
test('M26 shows one-off heartburn, care and category highlights while readings stay one click deeper (services mocked)',async({page})=>{
 const result=milestone26Fixture(),errors=[];result.presentation=(await milestone26Helpers()).summaryPresentation(result);page.on('pageerror',error=>errors.push(error.message));const mock=await mockSession(page,{initialEvents:[legacyEvent(1)],summaryReply:result});
 await page.goto('/#record');await page.getByRole('button',{name:'Summary'}).click();await page.getByRole('button',{name:'Prepare summary'}).click();
 await expect(page.getByRole('heading',{name:'What stands out',exact:true})).toBeVisible();await expect(page.locator('.summary-highlights')).toContainText(result.sources[0].event);await expect(page.locator('.summary-highlights')).toContainText('10 mg to 5 mg');await expect(page.locator('.summary-highlights')).toContainText('One-off notes do not establish a pattern');await expect(page.locator('.summary-category-highlights')).toContainText('sleep was not improving');expect((await page.locator('.summary-highlights, .summary-category-highlights').allTextContents()).join('').length).toBeLessThanOrEqual(1500);await expect(page.locator('.period-result')).not.toContainText('142/88');
 for(const width of [320,390,768,1440]){await page.setViewportSize({width,height:844});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);await page.screenshot({path:`.impeccable/review/m26-summary-${width}.png`,fullPage:true});}
 const action=page.getByRole('button',{name:/Readings/i});await page.keyboard.press('Tab');await action.focus();expect(await action.evaluate(element=>getComputedStyle(element).outlineStyle)).not.toBe('none');await page.keyboard.press('Enter');await expect(page.getByRole('heading',{name:'All recorded details'})).toBeVisible();await expect(page.locator('[data-category="Measurements"] > summary')).toBeFocused();await expect(page.locator('.summary-categories')).toContainText('BP 142/88');await expect(page.locator('.summary-categories')).toContainText(result.sources[0].event);await page.getByRole('button',{name:'Back to summary',exact:true}).click();await expect(page.getByRole('heading',{name:'What stands out',exact:true})).toBeVisible();expect(mock.state().savedCalls+mock.state().correctionCalls+mock.state().deleteCalls).toBe(0);expect(errors).toEqual([]);
});
test('M26 meaningful checked sharing keeps exact doses and uncertainty, copies and retains edits through details (services mocked)',async({page})=>{
 const result=milestone26Fixture(),draft=await milestone26Draft(result);await sharingDevice(page);const mock=await openSharing(page,{summaryReply:result,shareDraftText:draft});
 await expect(page.getByLabel('Text to share')).toHaveValue(draft);expect(draft.length).toBeLessThanOrEqual(1500);expect(draft).toContain(result.sources[0].event);expect(draft).toContain('10 mg to 5 mg');expect(draft).toContain('One-off notes do not establish a pattern');expect(draft).not.toContain('142/88');
 const edit=draft+'\nMy fictional question for the visit.';await page.getByLabel('Text to share').fill(edit);await page.getByRole('button',{name:'View all details',exact:true}).click();await expect(page.locator('.summary-categories')).toContainText('BP 142/88');await page.getByRole('button',{name:'Back to sharing draft',exact:true}).click();await expect(page.getByLabel('Text to share')).toHaveValue(edit);await page.getByRole('button',{name:'Copy text',exact:true}).click();await expect(page.getByText('Copied. Paste it into the app you choose.',{exact:true})).toBeVisible();expect(await page.evaluate(()=>window.__deviceCopies.at(-1))).toBe(edit);expect(mock.state().savedCalls+mock.state().correctionCalls).toBe(0);
});


test('M27 release journey preserves connected notes and drafts with accessible long-content layouts (services mocked)',async({page})=>{
 test.setTimeout(90000);
 const interpretation=connectedInterpretation(),result=milestone26Fixture(),draft=await milestone26Draft(result),issues=[],errors=[];
 const mock=await mockSession(page,{interpretation,summaryReply:result,shareDraftText:draft});await sharingDevice(page);page.on('pageerror',error=>errors.push(error.message));
 const inspect=async name=>{issues.push(...await checkReleaseScreen(page,name));if(['Capture','Summary source'].includes(name)){await page.setViewportSize({width:390,height:844});await page.screenshot({path:`.impeccable/review/m27-${name.toLowerCase().replaceAll(' ','-')}-390.png`,fullPage:true});}};
 await page.goto('/');await expect(page.getByRole('link',{name:'Start a health note'})).toBeVisible();await inspect('Welcome');await page.getByRole('button',{name:'Open menu',exact:true}).click();await page.getByRole('link',{name:'Privacy & your choices',exact:true}).click();await expect(page.getByRole('heading',{name:'Your notes. Your choice.'})).toBeVisible();await inspect('Privacy');await page.getByRole('switch',{name:'Usage tracking',exact:false}).click();await expect(page.getByRole('switch')).toHaveAttribute('aria-checked','false');await inspect('Privacy tracking off');await page.getByRole('button',{name:'Back',exact:true}).click();
 await page.getByRole('link',{name:'Start a health note'}).click();await page.getByLabel('Name').fill('FictionalLongName'.repeat(12));await page.getByLabel('Relationship').fill('Daughter');await inspect('Setup');
 await page.getByRole('button',{name:'Continue to your update'}).click();await page.getByLabel('Your health note').fill(interpretation.event);await inspect('Capture');
 await page.getByRole('button',{name:'Review your note'}).click();await expect(page.getByRole('heading',{name:'Does this sound right?'})).toBeVisible();await inspect('Review');
 await page.getByText(/^(Record details|Source & record details)$/).click();await openOriginalNote(page);await inspect('Review sources');
 await openDetailEditor(page,2);await inspect('Editor');await openTiming(page);await inspect('Expanded timing');await applyDetailChanges(page);
 await page.getByRole('button',{name:'Continue to save',exact:true}).click();await inspect('First value');expect(mock.state().savedCalls).toBe(0);
 await page.getByRole('link',{name:'Save this update',exact:true}).click();await inspect('Email');await page.getByLabel('Your email').fill('caregiver@example.test');await page.getByRole('button',{name:'Continue',exact:true}).click();await page.getByLabel('Email code').fill('000000');await page.getByRole('button',{name:/Verify & (save update|continue)/,exact:true}).click();await expect(page.getByRole('alert')).toContainText('incorrect or expired');await inspect('Code error');
 await page.getByLabel('Email code').fill('123456');await page.getByRole('button',{name:/Verify & (save update|continue)/,exact:true}).click();await expect(page.locator('.timeline-entry')).toHaveCount(1);await openTimelineNote(page);await inspect('Timeline');expect(mock.state().savedCalls).toBe(1);await page.getByRole('button',{name:'Open menu',exact:true}).click();await page.getByRole('button',{name:'Delete account and record',exact:true}).click();await inspect('Account deletion explanation');await page.getByRole('button',{name:'Keep my account',exact:true}).click();await expect(page.locator('.timeline-entry')).toHaveCount(1);
 await page.getByRole('button',{name:'Summary'}).click();await inspect('Summary period');await page.getByRole('button',{name:'Prepare summary'}).click();await expect(page.getByRole('heading',{name:'What stands out'})).toBeVisible();await inspect('Summary');
 await page.getByRole('button',{name:'Review & share summary'}).click();await expect(page.getByLabel('Text to share')).toHaveValue(draft);await page.getByLabel('Text to share').fill(draft+'\nA fictional question for the visit.');await inspect('Sharing');await page.getByRole('button',{name:'View all details',exact:true}).click();await inspect('Summary full details');await page.getByText('View source',{exact:true}).first().click();await inspect('Summary source');await page.getByRole('button',{name:'Back to sharing draft',exact:true}).click();await expect(page.getByLabel('Text to share')).toHaveValue(draft+'\nA fictional question for the visit.');
 await page.getByRole('button',{name:'Open menu',exact:true}).click();await inspect('Menu');await page.keyboard.press('Escape');await expect(page.getByRole('button',{name:'Open menu',exact:true})).toBeFocused();
 require('node:fs').writeFileSync('.impeccable/review/m27-screen-audit.json',JSON.stringify({issues,browserErrors:errors,screens:20,widths:[320,390,768,1440]},null,2));
 expect(errors).toEqual([]);expect(issues).toEqual([]);expect(mock.state().savedCalls).toBe(1);expect(mock.state().correctionCalls+mock.state().deleteCalls+mock.state().deletionCodeCalls+mock.state().accountDeletionCalls).toBe(0);
});

test('approved boards appear in the actual app with one compact header and working screen navigation',async({page})=>{
 test.setTimeout(180000);
 const interpretation=connectedInterpretation(),summary=milestone26Fixture(),issues=[],errors=[];
 interpretation.observations[0].type='symptom';interpretation.observations[0].symptomName='vomiting';interpretation.observations[1].type='daily_wellbeing';interpretation.observations[2].type='symptom';interpretation.observations[2].symptomName='dizziness';
 await mockSession(page,{interpretation,summaryReply:summary});page.on('pageerror',error=>errors.push(error.message));
 const inspect=async name=>{issues.push(...await checkReleaseScreen(page,name));await page.setViewportSize({width:390,height:844});await page.locator('h1,h2').filter({visible:true}).first().click();await page.screenshot({path:`.impeccable/review/corrected-${name}.png`,fullPage:true});};
 await page.goto('/');await expect(page.getByRole('heading',{name:'A little note. A clearer picture.'})).toBeVisible();await expect(page.locator('.note-examples')).toHaveCount(0);await inspect('welcome');
 await page.getByRole('link',{name:'Start a health note'}).click();await expect(page.getByRole('textbox',{name:'Relationship',exact:true})).toBeVisible();await expect(page.getByRole('combobox')).toHaveCount(0);await inspect('setup');
 await page.getByLabel('Name',{exact:true}).fill('Mira Example');await page.getByLabel('Relationship',{exact:true}).fill('Daughter');await page.getByRole('button',{name:'Continue to your update'}).click();await expect(page.getByLabel('Your health note')).toBeVisible();await inspect('capture');
 await page.getByLabel('Your health note').fill(interpretation.event);await page.getByRole('button',{name:'Review your note'}).click();await expect(page.getByRole('heading',{name:'Does this sound right?'})).toBeVisible();await expect(page.getByRole('button',{name:'Change this update'})).toHaveCount(1);await expect(page.getByRole('button',{name:/^Change detail/})).toHaveCount(0);await inspect('review');
 await page.getByRole('button',{name:'Continue to save'}).click();await inspect('first-note');await page.getByRole('link',{name:'Save this update'}).click();await page.getByLabel('Your email').fill('caregiver@example.test');await page.getByRole('button',{name:'Continue',exact:true}).click();await page.getByLabel('Email code').fill('123456');await inspect('code');
 await page.getByRole('button',{name:'Verify & save update'}).click();await expect(page.locator('.timeline-entry')).toHaveCount(1);await inspect('timeline');await page.getByRole('button',{name:'Open menu'}).click();await expect(page.getByRole('dialog').locator('.brand')).toBeVisible();await expect(page.getByRole('dialog').getByRole('button',{name:'Summary',exact:true})).toBeVisible();await inspect('menu');await page.getByRole('button',{name:'Close menu'}).click();
 await openTimelineNote(page);await expect(page.getByRole('heading',{name:'Your original note'})).toBeVisible();await inspect('details');await page.getByRole('button',{name:'Change update',exact:true}).click();await expect(page.getByLabel('What happened?',{exact:true})).toHaveValue(interpretation.observations.map(item=>item.event).join('\n'));await inspect('editing');await page.getByRole('button',{name:'Cancel changes',exact:true}).click();await page.getByRole('button',{name:'Back to timeline'}).click();
 await page.getByRole('button',{name:'Summary',exact:true}).click();await page.getByRole('button',{name:'Prepare summary'}).click();await expect(page.getByRole('heading',{name:'A clearer picture for your visit'})).toBeVisible();await expect(page.getByRole('heading',{name:'In this period'})).toBeVisible();await inspect('summary');
 expect(issues).toEqual([]);expect(errors).toEqual([]);
});

test('rewriting a whole note preserves an unchanged corrected detail and reviews differences before saving',async({page})=>{
 const interpretation=connectedInterpretation(),mock=await mockSession(page,{interpretation});await openMulti(page,interpretation.event);
 await page.getByRole('button',{name:'Change this update'}).click();const rewritten='She vomited today. Dinner was lighter yesterday. She did not feel dizzy today.';
 await page.getByLabel('What happened?',{exact:true}).fill(rewritten);
 await page.route('**/api/interpret',route=>route.fulfill({json:{...interpretation,observations:[interpretation.observations[0],{...interpretation.observations[1],id:'new-model-id',event:'Dinner was lighter yesterday.',supportingWords:'Dinner was lighter yesterday.'},interpretation.observations[2]]}}));
 await page.getByRole('button',{name:'Review changes'}).click();await expect(page.getByRole('heading',{name:'Does this sound right?'})).toBeVisible();await page.getByText('What changed',{exact:true}).click();await expect(page.locator('.rewrite-difference')).toContainText(rewritten);expect(mock.state().savedCalls).toBe(0);
 await page.getByRole('button',{name:'Continue to save'}).click();await login(page);await expect(page.locator('.timeline-entry')).toHaveCount(1);
 const event=mock.state().record.event;expect(event.originalText).toBe(interpretation.event);expect(event.aiInterpretation).toEqual(interpretation);expect(event.observations[0]).toMatchObject({...interpretation.observations[0],confirmed:true});expect(event.observations[2]).toMatchObject({...interpretation.observations[2],confirmed:true});expect(event.observations[1].supportingWords).toBe(interpretation.event);expect(event.observations[1].type).toBe('pending');expect(event.relatedGroups).toEqual([]);
});

test('an older preview backend gives a clear recovery message and retains the reviewed note',async({page})=>{
 const interpretation=connectedInterpretation();await mockSession(page,{interpretation});await openMulti(page,interpretation.event);await page.getByRole('button',{name:'Continue to save'}).click();
 await page.route('**/__test/save',route=>route.fulfill({status:400,body:'ArgumentValidationError: Object contains extra field datePrecision'}));await login(page);
 await expect(page.getByRole('alert')).toHaveText('Saving this note is not available in this preview yet. Your note is still here.');await expect(page.getByRole('button',{name:'Try again',exact:true})).toHaveCount(0);await page.getByRole('link',{name:'Back to your update'}).click();await expect(page.locator('.fact-text')).toHaveText(interpretation.observations.map(item=>item.event));
});


test('Back preserves unfinished whole changes; Cancel restores the reviewed facts; returning from capture keeps corrected timing',async({page})=>{
 const interpretation=connectedInterpretation(),mock=await mockSession(page,{interpretation});await openMulti(page,interpretation.event);
 await page.getByRole('button',{name:'Change this update'}).click();await page.getByLabel('What happened?',{exact:true}).fill('An unfinished fictional correction.');await page.getByRole('button',{name:'Back to review',exact:true}).click();await page.getByRole('button',{name:'Continue to save'}).click();await expect(page.getByRole('alert')).toContainText('Finish or cancel');
 await page.getByRole('button',{name:'Change this update'}).click();await expect(page.getByLabel('What happened?',{exact:true})).toHaveValue('An unfinished fictional correction.');await page.getByRole('button',{name:'Cancel changes',exact:true}).click();await expect(page.locator('.fact-text')).toHaveText(interpretation.observations.map(item=>item.event));
 await openDetailEditor(page,2);await openTiming(page);await page.getByLabel('Event date',{exact:true}).fill('04/10/2026');await applyDetailChanges(page);await expect(page.locator('.fact-time').nth(1)).toHaveText('04/10/2026');
 await page.getByRole('button',{name:'Back to capture',exact:true}).click();await page.getByRole('button',{name:'Review your note',exact:true}).click();await expect(page.locator('.fact-time').nth(1)).toHaveText('04/10/2026');await page.getByRole('button',{name:'Add something else',exact:true}).click();await expect(page.getByLabel('What happened?',{exact:true})).toHaveValue(interpretation.observations.map(item=>item.event).join('\n')+'\n');expect(mock.state().savedCalls).toBe(0);
});


test('a period with only uncertain dates keeps those notes available in full details',async({page})=>{
 const result={...summaryFixture(),status:'empty',groups:[],sources:[]},errors=[];await mockSession(page,{initialEvents:[legacyEvent(1)],summaryReply:result});page.on('pageerror',error=>errors.push(error.message));await page.goto('/#record');await page.getByRole('button',{name:'Summary',exact:true}).click();await page.getByRole('button',{name:'Prepare summary'}).click();await expect(page.getByText('There are no dated updates to summarise for this period.',{exact:true})).toBeVisible();await page.getByRole('button',{name:'View all details',exact:true}).click();await expect(page.locator('.fact-text')).toHaveText(result.undated[0].event);await page.getByRole('button',{name:'Back to summary',exact:true}).click();await expect(page.getByRole('button',{name:'View all details',exact:true})).toBeFocused();expect(errors).toEqual([]);
});


test('Back from saved corrections protects changed words until the caregiver chooses to leave',async({page})=>{
 const original=legacyEvent(1),mock=await mockSession(page,{initialEvents:[original]});await page.goto('/#record');await openTimelineNote(page);await page.getByRole('button',{name:'Change update',exact:true}).click();await openDetailEditor(page,1);await page.getByLabel('What happened',{exact:true}).fill('A fictional corrected note.');await applyDetailChanges(page);page.once('dialog',dialog=>dialog.dismiss());await page.getByRole('button',{name:'Back to your update',exact:true}).click();await expect(page.locator('.fact-text')).toHaveText('A fictional corrected note.');await page.getByRole('button',{name:'Cancel changes',exact:true}).click();await expect(page.locator('.fact-text')).toHaveText(original.event);expect(mock.state().correctionCalls).toBe(0);
});

const { test, expect } = require('@playwright/test');

async function mockSession(page, { failSave = false, interpretation = null, initialEvents = [], failTimelineAt = 0, failAppend = false, failCorrection = false, failDelete = false, staleCorrection = false, signedOutInitially = false, failMatch = false, summaryReply = null, failSummary = false, failShareCheckAt = 0, staleShareAt = 0, pendingSession = false, failDeletionCode = false, failAccountDeletion = false, deletingInitially = false,analyticsInitially=true,failPrivacy=false } = {}) {
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
      const input=route.request().postDataJSON();return route.fulfill({json:{status:'ready',title:'Mira Example health summary',text:input.text===null?sharingFixtureText:input.text,message:''}});
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
  await page.getByRole('link', { name: 'Get started', exact: true }).click();
  await page.getByLabel('Their name').fill('Mira Example');
  await page.getByLabel('Your relationship to them').fill('Daughter');
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  await page.getByRole('button', { name: 'Type instead', exact: true }).click();
  await page.getByLabel('Or type your update').fill('Mira Example said she felt tired today.');
  await page.getByRole('button', { name: 'Continue with text' }).click();
  await page.getByRole('button', { name: 'Yes, continue' }).click();
  await expect(page.getByText('Keep this for next time')).toBeVisible();
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
  await page.getByLabel('Email code').fill('12345');await page.getByRole('button',{name:'Verify code'}).click();await expect(page.getByRole('alert')).toHaveText('Enter the 6-digit code from your email.');
  await page.getByLabel('Email code').fill('000000');
  await page.getByRole('button', { name: 'Verify code' }).click();
  await expect(page.getByRole('alert')).toContainText('incorrect or expired');
  expect(mock.state().savedCalls).toBe(0);
  await page.getByRole('link', { name: 'Back to your update' }).click();
  await expect(page.locator('.fact-text').first()).toHaveText('Mira Example said she felt tired today.');
  await page.getByRole('link', { name: 'Save this update', exact: true }).click();
  await page.getByLabel('Email code').fill('123456');
  await page.getByRole('button', { name: 'Verify code' }).click();
  await expect(page.getByText('Saved to Mira Example’s record.')).toBeVisible();
  expect(mock.state().savedCalls).toBe(1);
  await page.screenshot({ path: '.impeccable/review/saved-record-mobile.png', fullPage: true });
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Mira Example’s health story', exact: true })).toBeVisible();
  expect(mock.state().savedCalls).toBe(1);
  await page.getByRole('button',{name:'Open menu',exact:true}).click();await page.getByRole('button', { name: 'Sign out', exact: true }).click();
  await expect(page.getByRole('link', { name: 'Already started? Sign in' })).toBeVisible();
  await page.getByRole('link', { name: 'Already started? Sign in' }).click();
  await page.getByLabel('Your email').fill('caregiver@example.test');
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  await page.getByLabel('Email code').fill('123456');
  await page.getByRole('button', { name: 'Verify code' }).click();
  await expect(page.locator('.fact-text').first()).toHaveText('Mira Example said she felt tired today.');
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
  await page.getByRole('button', { name: 'Verify code' }).click();
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
  await page.goto(url); await page.getByRole('link',{name:'Get started',exact:true}).click();
  await page.getByLabel('Their name').fill('Mira Example'); await page.getByLabel('Your relationship to them').fill('Daughter');
  await page.getByRole('button',{name:'Continue',exact:true}).click(); await page.getByRole('button',{name:'Type instead',exact:true}).click();
  await page.getByLabel('Or type your update').fill(text);await page.getByRole('button',{name:'Continue with text'}).click();
}
async function resolveMulti(page) {
  await page.getByRole('button',{name:'Keep the timing as written'}).click();
  await page.getByRole('button',{name:'I’m not sure',exact:true}).click();
  await expect(page.getByRole('heading',{name:'Does this look right?'})).toBeVisible();
}
async function login(page) {
  await page.getByRole('link',{name:'Save this update',exact:true}).click();
  await page.getByLabel('Your email').fill('caregiver@example.test');await page.getByRole('button',{name:'Continue',exact:true}).click();
  await page.getByLabel('Email code').fill('123456');await page.getByRole('button',{name:'Verify code'}).click();
}

test('one confirmation approves all visible facts, preserves explicit negatives and capture time, then saves atomically (services mocked)',async({page})=>{
  const mock=await mockSession(page,{interpretation:multiInterpretation()});await openMulti(page);
  const captured=await page.getByText(/^Captured on /).textContent();
  await expect(page.getByRole('button',{name:'Yes, continue'})).toHaveCount(0);
  await expect(page.getByRole('button',{name:'I’m not sure',exact:true})).toHaveCount(1);
  await page.getByRole('button',{name:'Today',exact:true}).click();
  await page.getByRole('button',{name:'I’m not sure',exact:true}).click();
  await expect(page.locator('.fact-text')).toHaveText(['BP 142/88 this morning','she did not feel dizzy']);
  await page.getByRole('button',{name:'Change detail 1'}).click();await expect(page.getByLabel('What happened',{exact:true})).toHaveValue('BP 142/88 this morning');await expect(page.getByLabel('Timing words',{exact:true})).toHaveValue('this morning');await page.getByRole('button',{name:'Cancel editing',exact:true}).click();
  await expect(page.getByRole('button',{name:/Confirm observation/})).toHaveCount(0);
  await expect(page.getByRole('button',{name:'Yes, continue'})).toHaveCount(1);
  await expect(page.getByText('Explicitly absent',{exact:true})).not.toBeVisible();
  await page.screenshot({path:'.impeccable/review/carenama-review-mobile.png',fullPage:true});
  await page.setViewportSize({width:1440,height:900});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await page.screenshot({path:'.impeccable/review/carenama-review-desktop.png',fullPage:true});
  await page.getByRole('button',{name:'Yes, continue'}).click();expect(mock.state().savedCalls).toBe(0);await login(page);
  await expect(page.getByText('Saved to Mira Example’s record.')).toBeVisible();
  const stored=mock.state().record.event;
  expect(stored.observations).toHaveLength(2);expect(stored.observations.every(item=>item.confirmed)).toBe(true);
  expect(stored.observations[1].polarity).toBe('absent');expect(stored.observations[1].timing.precision).toBe('unknown');
  expect(stored.originalText).toBe(multiText);expect(stored.aiInterpretation.observations.every(item=>!item.confirmed)).toBe(true);
  await page.reload();await expect(page.getByText(/^Captured on /)).toHaveText(captured);expect(mock.state().savedCalls).toBe(1);
});

test('changes return to whole-update review; removal is inside the editor and removing every fact never saves (services mocked)',async({page})=>{
  const mock=await mockSession(page,{interpretation:multiInterpretation()});await openMulti(page);
  await page.getByRole('checkbox',{name:/Use the day I choose for these details/}).check();
  await page.getByRole('button',{name:'Choose a date'}).click();await resolveMulti(page);
  await page.getByRole('button',{name:'Yes, continue'}).click();await page.getByRole('link',{name:'Back to review'}).click();
  await page.getByRole('button',{name:'Change detail 1'}).click();await page.getByLabel('What happened',{exact:true}).fill('BP 140/88 this morning');
  await page.getByRole('button',{name:'Apply changes'}).click();await expect(page.getByRole('heading',{name:'Does this look right?'})).toBeVisible();
  await expect(page.locator('.fact-text')).toHaveText(['BP 140/88 this morning','she did not feel dizzy']);
  await page.getByRole('button',{name:'Change detail 2'}).click();await page.getByRole('button',{name:'Remove this detail'}).click();
  await page.getByRole('button',{name:'Yes, continue'}).click();
  await page.getByText('Record details',{exact:true}).click();await page.getByText('Your original update',{exact:true}).click();
  await expect(page.getByText(multiText,{exact:true})).toBeVisible();
  await page.getByRole('link',{name:'Back to review'}).click();await page.getByRole('button',{name:'Change detail 1'}).click();
  await page.getByRole('button',{name:'Remove this detail'}).click();
  await expect(page.getByLabel('Or type your update')).toHaveValue(multiText);expect(mock.state().savedCalls).toBe(0);
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
  await page.getByLabel('Date for this detail').fill('2026-10-06');await page.getByRole('button',{name:'Use this date'}).click();
  await expect(page.getByRole('heading',{name:'Does this look right?'})).toBeVisible();
  await expect(page.locator('.fact-time').nth(1)).toHaveText('6 Oct 2026 at 17:00');
  await expect(page.getByRole('button',{name:'Yes, continue'})).toBeEnabled();
});

test('manual recovery can add an explicitly negative detail and approve the whole update once (services mocked)',async({page})=>{
  const mock=await mockSession(page);
  await page.route('**/api/interpret',route=>route.fulfill({status:503,json:{error:'Busy right now. Try again in a few minutes.'}}));
  await openMulti(page);await page.getByRole('button',{name:'Edit manually'}).click();
  await page.getByLabel('What happened',{exact:true}).fill('BP 142/88 this morning');
  await page.getByRole('button',{name:'Apply changes'}).click();
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
  await page.getByRole('button',{name:'Apply changes'}).click();
  await expect(page.locator('.fact-text')).toHaveText(['BP 142/88 this morning','she did not feel dizzy']);
  await page.getByRole('button',{name:'Change detail 1'}).click();await expect(page.getByLabel('What happened',{exact:true})).toHaveValue('BP 142/88 this morning');await expect(page.getByLabel('Timing words',{exact:true})).toHaveValue('Not specified');await page.getByRole('button',{name:'Cancel editing',exact:true}).click();
  await page.getByRole('button',{name:'Yes, continue'}).click();await login(page);
  await expect(page.getByText('Saved to Mira Example’s record.')).toBeVisible();
  expect(mock.state().record.event.observations).toHaveLength(2);
  expect(mock.state().record.event.observations[1].polarity).toBe('absent');
  expect(mock.state().record.event.aiInterpretation).toBe(null);
});

test('LIVE: real interpretation reaches a single review and preserves both facts and capture time',async({page})=>{
  test.skip(process.env.CAPTURE_LIVE!=='1','Opt in to real Sarvam calls.');test.setTimeout(100000);
  await openMulti(page,'Mira Example had a mild headache today morning and I noticed an allergy flare up today at 5 p.m.');
  await expect(page.getByRole('heading',{name:'Does this look right?'})).toBeVisible({timeout:90000});
  await page.getByText('Record details',{exact:true}).click();
  await expect(page.getByText('Symptom · headache',{exact:true})).toBeVisible();
  await expect(page.getByText('Recorded as',{exact:true})).toHaveCount(2);
  await expect(page.locator('.fact-text')).toHaveCount(2);const captured=await page.getByText(/^Captured on /).textContent();
  await page.screenshot({path:'.impeccable/review/carenama-live-mobile.png',fullPage:true});
  await page.getByRole('button',{name:'Yes, continue'}).click();await expect(page.getByRole('heading',{name:'Your update is ready.'})).toBeVisible();
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
    await page.getByRole('button',{name:'Yes, continue'}).click();await login(page);
    await expect(page.getByRole('alert')).toContainText('Try again without closing this page.');await page.getByRole('button',{name:'Try again',exact:true}).click();
    await expect(page.getByText('Saved to Mira Example’s record.')).toBeVisible();
    const {savedIds,record}=mock.state();expect(savedIds).toHaveLength(2);expect(savedIds[0]).toBe(savedIds[1]);
    expect(savedIds[0]).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
    expect(record.event.observations.every(item=>item.confirmed)).toBe(true);
    await page.reload();await expect(page.getByRole('heading',{name:'Your timeline',exact:true})).toBeVisible();expect(mock.state().savedCalls).toBe(2);expect(errors).toEqual([]);
  });
}

test('Add update reuses the patient and whole-update review, retries a failed append and returns both notes after refresh (services mocked)',async({page})=>{
  const mock=await mockSession(page,{interpretation:multiInterpretation(),failAppend:true});
  await openMulti(page);await resolveMulti(page);await page.getByRole('button',{name:'Yes, continue'}).click();await login(page);
  await expect(page.getByRole('heading',{name:'Your timeline',exact:true})).toBeVisible();
  await page.getByRole('button',{name:'Add update',exact:true}).click();
  await expect(page.getByLabel('Their name')).toHaveCount(0);
  await expect(page.getByRole('heading',{name:'Mira Example',exact:true})).toBeVisible();
  await page.getByRole('button',{name:'Type instead'}).click();await page.getByLabel('Or type your update').fill(multiText);
  await page.getByRole('button',{name:'Continue with text'}).click();await resolveMulti(page);
  await expect(page.getByRole('button',{name:'Yes, continue'})).toHaveCount(0);
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
  await page.locator('.timeline-disclosure > summary').first().click();
  await expect(page.getByText('Measurement · blood pressure 142/88',{exact:true})).toBeVisible();
  await expect(page.getByText('Symptom · dizziness',{exact:true})).toBeVisible();
  await expect(page.getByText('Explicitly absent',{exact:true})).toBeVisible();
  for(const width of [320,390,768,1440]){
    await page.setViewportSize({width,height:900});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
    await page.screenshot({path:`.impeccable/review/fact-labels-${width}.png`,fullPage:true});
  }
  await page.getByRole('button',{name:'Change update',exact:true}).first().click();
  await expect(page.getByLabel('Recorded as')).toHaveCount(0);
  await page.getByRole('button',{name:'Change detail 2'}).click();
  await page.getByLabel('What happened',{exact:true}).fill('She did not have a headache');
  await page.getByRole('button',{name:'Apply changes'}).click();
  await page.getByRole('button',{name:'Save changes'}).click();
  await expect(page.getByText(/being sorted/)).toBeVisible();
  const stored=mock.state().entries[0].details;
  expect(stored.observations[1].type).toBe('pending');expect(stored.observations[1].symptomName).toBeUndefined();
  expect(stored.observations[0].measurement.value).toBe('142/88');expect(stored.originalText).toBe(mixed.originalText);expect(stored.capturedAt).toBe(mixed.capturedAt);
});

test('timeline loads older legacy notes in pages; a loading failure retains visible notes and retries without duplicates (services mocked)',async({page})=>{
  const mock=await mockSession(page,{initialEvents:Array.from({length:12},(_,index)=>legacyEvent(index+1)),failTimelineAt:2});
  await page.goto('/#record');await expect(page.locator('.timeline-entry')).toHaveCount(10);
  await expect(page.locator('.fact-text').first()).toHaveText('Fictional note 1: Mira Example reported tiredness.');
  await page.getByRole('button',{name:'Load older updates'}).click();await expect(page.getByRole('alert')).toContainText('Your saved notes are still there.');
  await expect(page.locator('.timeline-entry')).toHaveCount(10);
  await page.getByRole('button',{name:'Try again',exact:true}).click();await expect(page.locator('.timeline-entry')).toHaveCount(12);
  await expect(page.getByRole('button',{name:'Load older updates'})).toHaveCount(0);expect(mock.state().timelineCalls).toBe(3);
  await page.locator('.timeline-disclosure > summary').last().click();
  await expect(page.locator('.timeline-entry').last().getByText(/^Captured on /)).toBeVisible();
});

test('an initial timeline failure retries, while leaving an unconfirmed new capture never saves it (services mocked)',async({page})=>{
  const mock=await mockSession(page,{initialEvents:[legacyEvent(1)],failTimelineAt:1});
  await page.goto('/#record');await expect(page.getByRole('heading',{name:'We couldn’t open your timeline.'})).toBeVisible();
  await page.getByRole('button',{name:'Try again'}).click();await expect(page.locator('.timeline-entry')).toHaveCount(1);
  await page.getByRole('button',{name:'Add update'}).click();await page.getByRole('button',{name:'Type instead'}).click();
  await page.getByLabel('Or type your update').fill('Mira Example felt tired today.');
  await page.getByRole('link',{name:'Back to timeline'}).click();await expect(page.locator('.timeline-entry')).toHaveCount(1);
  expect(mock.state().savedCalls).toBe(0);
});

test('a signed-in empty account sets up a person and saves once without another sign-in',async({page})=>{
  const mock=await mockSession(page);await page.goto('/#signin');
  await page.getByLabel('Your email').fill('caregiver@example.test');await page.getByRole('button',{name:'Continue',exact:true}).click();
  await page.getByLabel('Email code').fill('123456');await page.getByRole('button',{name:'Verify code'}).click();
  await expect(page.getByRole('button',{name:'Set up a health record'})).toBeVisible();
  await page.getByRole('button',{name:'Set up a health record'}).click();
  await expect(page.getByRole('link',{name:'Already have a record? Sign in'})).toHaveCount(0);
  await expect(page.getByRole('navigation',{name:'Update progress'}).locator('[aria-current="step"]')).toHaveText(/Person/);
  await expect(page.getByText(/Step [0-9] of/)).toHaveCount(0);
  expect(await page.locator('h1 + p').textContent()).toBe('A name and your relationship are enough to start.');
  for(const width of [320,390,768,1440]){await page.setViewportSize({width,height:900});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);await page.screenshot({path:`.impeccable/review/first-record-setup-${width}.png`,fullPage:true});}
  await page.getByLabel('Their name').fill('Mira Example');await page.getByLabel('Your relationship to them').fill('Mother');
  await page.getByRole('button',{name:'Continue',exact:true}).click();
  await expect(page.getByRole('navigation',{name:'Update progress'}).locator('[aria-current="step"]')).toHaveText(/Update/);
  for(const width of [320,390,768,1440]){await page.setViewportSize({width,height:900});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);await page.screenshot({path:`.impeccable/review/first-record-capture-${width}.png`,fullPage:true});}
  await page.getByRole('link',{name:'Back to person details'}).click();await expect(page.getByLabel('Their name')).toHaveValue('Mira Example');
  await page.getByRole('button',{name:'Continue',exact:true}).click();await page.getByRole('button',{name:'Type instead'}).click();
  await expect(page.locator('#capture-draft-note')).toBeHidden();
  await page.getByLabel('Or type your update').fill('Mira Example said she felt tired today.');await expect(page.locator('#capture-draft-note')).toBeVisible();await expect(page.locator('#capture-draft-note')).toHaveText('Unsaved draft \u00b7 Refreshing clears it');await page.getByRole('button',{name:'Continue with text'}).click();
  await expect(page.getByRole('navigation',{name:'Update progress'}).locator('[aria-current="step"]')).toHaveText(/Review/);
  for(const width of [320,390,768,1440]){await page.setViewportSize({width,height:900});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);await page.screenshot({path:`.impeccable/review/first-record-review-${width}.png`,fullPage:true});}
  await page.getByRole('button',{name:'Save update',exact:true}).focus();await expect(page.getByRole('button',{name:'Save update',exact:true})).toBeFocused();await page.keyboard.press('Enter');
  await expect(page.locator('.timeline-entry')).toHaveCount(1);expect(mock.state().savedCalls).toBe(1);expect(mock.state().codeRequests).toBe(1);
  await page.getByRole('button',{name:'Add update'}).click();await expect(page.getByRole('navigation',{name:'Update progress'}).locator('[aria-current="step"]')).toHaveText(/Update/);
  await page.getByRole('button',{name:'Type instead'}).click();await page.getByLabel('Or type your update').fill('Mira Example said she felt tired today.');await page.getByRole('button',{name:'Continue with text'}).click();await expect(page.getByRole('navigation',{name:'Update progress'}).locator('[aria-current="step"]')).toHaveText(/Review/);
  await page.getByRole('button',{name:'Return to capture',exact:true}).click();await expect(page.getByRole('navigation',{name:'Update progress'}).locator('[aria-current="step"]')).toHaveText(/Update/);await expect(page.getByLabel('Or type your update')).toHaveValue('Mira Example said she felt tired today.');
});

test('back from a failed confirmed save does not silently retry saving when opening the timeline (services mocked)',async({page})=>{
  const mock=await mockSession(page,{initialEvents:[legacyEvent(1)],interpretation:multiInterpretation(),failAppend:true});
  await page.goto('/#record');await page.getByRole('button',{name:'Add update'}).click();
  await page.getByRole('button',{name:'Type instead'}).click();await page.getByLabel('Or type your update').fill(multiText);
  await page.getByRole('button',{name:'Continue with text'}).click();await resolveMulti(page);
  await page.getByRole('button',{name:'Save update',exact:true}).click();await expect(page.getByRole('alert')).toContainText('Your update hasn’t been saved yet.');
  await page.getByRole('link',{name:'Back to your update'}).click();await page.getByRole('link',{name:'Back to timeline'}).click();
  await expect(page.locator('.timeline-entry')).toHaveCount(1);expect(mock.state().appendCalls).toBe(1);
});


test('saved updates use whole review for corrections; cancel is safe, retry and refresh retain original capture (services mocked)',async({page})=>{
  const original=legacyEvent(1),mock=await mockSession(page,{initialEvents:[original],failCorrection:true});
  await page.goto('/#record');await openTimelineNote(page);await page.getByRole('button',{name:'Change update',exact:true}).click();
  await page.getByRole('button',{name:'Change detail 1'}).click();await page.getByLabel('What happened',{exact:true}).fill('Mira Example reported mild tiredness.');
  await page.getByRole('button',{name:'Apply changes'}).click();await page.getByRole('button',{name:'Cancel changes'}).click();
  await expect(page.locator('.fact-text')).toHaveText(original.event);expect(mock.state().correctionCalls).toBe(0);
  await openTimelineNote(page);await page.getByRole('button',{name:'Change update',exact:true}).click();await page.getByRole('button',{name:'Change detail 1'}).click();
  await page.getByLabel('What happened',{exact:true}).fill('Mira Example reported mild tiredness.');
  await page.getByRole('button',{name:'Remove this detail'}).click();await expect(page.getByRole('alert')).toContainText('Keep one detail');
  await page.getByRole('button',{name:'Apply changes'}).click();
  await page.screenshot({path:'.impeccable/review/saved-edit-mobile.png',fullPage:true});
  await page.setViewportSize({width:1440,height:900});await page.screenshot({path:'.impeccable/review/saved-edit-desktop.png',fullPage:true});await page.setViewportSize({width:390,height:844});
  await page.getByRole('button',{name:'Save changes'}).click();await expect(page.getByRole('alert')).toContainText('save your changes');
  await page.getByRole('button',{name:'Try again'}).click();await expect(page.locator('.fact-text')).toHaveText('Mira Example reported mild tiredness.');
  expect(mock.state().entries[0].details.originalText).toBe(original.originalText);expect(mock.state().entries[0].details.capturedAt).toBe(original.capturedAt);
  await page.reload();await expect(page.locator('.fact-text')).toHaveText('Mira Example reported mild tiredness.');expect(mock.state().correctionCalls).toBe(2);
});

test('deleting needs explicit confirmation, failures retain the note and deleting the last note retains the patient (services mocked)',async({page})=>{
  const mock=await mockSession(page,{initialEvents:[legacyEvent(1)],failDelete:true});
  await page.goto('/#record');await openTimelineNote(page);await page.getByRole('button',{name:'Delete update',exact:true}).click();
  await expect(page.getByRole('heading',{name:'Delete this update?'})).toBeVisible();await page.getByRole('button',{name:'Keep update'}).click();expect(mock.state().deleteCalls).toBe(0);
  await openTimelineNote(page);await page.getByRole('button',{name:'Delete update',exact:true}).click();await page.screenshot({path:'.impeccable/review/delete-mobile.png',fullPage:true});
  await openTimelineNote(page);await page.getByRole('button',{name:'Delete update',exact:true}).click();await expect(page.getByRole('alert')).toContainText('Your saved note is still there');
  await openTimelineNote(page);await page.getByRole('button',{name:'Delete update',exact:true}).click();await expect(page.getByText('No saved updates yet.',{exact:true})).toBeVisible();
  await page.reload();await expect(page.getByText('No saved updates yet.',{exact:true})).toBeVisible();await expect(page.getByRole('heading',{name:/Mira Example.*health story/})).toBeVisible();
  await page.getByRole('button',{name:'Add update'}).click();await expect(page.getByLabel('Their name')).toHaveCount(0);expect(mock.state().deleteCalls).toBe(2);
});

test('a stale saved correction offers reopening instead of overwriting another change (services mocked)',async({page})=>{
  const mock=await mockSession(page,{initialEvents:[legacyEvent(1)],staleCorrection:true});await page.goto('/#record');
  await openTimelineNote(page);await page.getByRole('button',{name:'Change update',exact:true}).click();await page.getByRole('button',{name:'Save changes'}).click();
  await expect(page.getByRole('alert')).toContainText('changed or was removed elsewhere');await expect(page.getByRole('button',{name:'Try again'})).toHaveCount(0);
  await page.getByRole('button',{name:'Back to timeline'}).click();await expect(page.locator('.timeline-entry')).toHaveCount(1);expect(mock.state().correctionCalls).toBe(1);
});


test('a correction can remove one fact while preserving the linked negative and original capture (services mocked)',async({page})=>{
  const original=legacyEvent(1);original.originalText='BP 142/88 this morning and she did not feel dizzy';original.event=original.originalText;
  original.observations=[{id:'1',event:'BP 142/88',when:'this morning',supportingWords:'BP 142/88 this morning',evidence:'Measured',polarity:'present',timing:{date:null,time:null,precision:'approximate',resolved:true},confirmed:true,edited:false},{id:'2',event:'she did not feel dizzy',when:'Unknown',supportingWords:'she did not feel dizzy',evidence:'Patient-reported',polarity:'absent',timing:{date:null,time:null,precision:'unknown',resolved:true},confirmed:true,edited:false}];
  const mock=await mockSession(page,{initialEvents:[original]});await page.goto('/#record');await openTimelineNote(page);await page.getByRole('button',{name:'Change update',exact:true}).click();
  await page.getByRole('button',{name:'Change detail 1'}).click();await page.getByRole('button',{name:'Remove this detail'}).click();
  await expect(page.locator('.fact-text')).toHaveText('she did not feel dizzy');await page.getByRole('button',{name:'Save changes'}).click();await expect(page.locator('.timeline-entry')).toHaveCount(1);
  await page.reload();await expect(page.locator('.fact-text')).toHaveText('she did not feel dizzy');expect(mock.state().entries[0].details.observations[0].polarity).toBe('absent');expect(mock.state().entries[0].details.removedObservations).toHaveLength(1);expect(mock.state().entries[0].details.originalText).toBe(original.originalText);
});


test('care updates share capture, whole review, saved timeline and refresh without category forms (services mocked)',async({page})=>{
  const mock=await mockSession(page,{initialEvents:[legacyEvent(1)]});
  await page.route('**/api/interpret',route=>{const text=route.request().postDataJSON().text;return route.fulfill({json:{status:'ready',event:text,when:'today',evidence:'Not specified',question:'',message:'',observations:[{id:'1',event:text,when:'today',supportingWords:text,evidence:text.startsWith('She said')?'Patient-reported':'Not specified',polarity:'present',timing:{date:'2026-10-06',time:null,precision:'date',resolved:true},confirmed:false,edited:false}]}});});
  await page.goto('/#record');
  const texts=['Doctor said to reduce her medicine from 10 mg to 5 mg today.','We visited the doctor today.','She said her appetite is better today.','She said she slept poorly today.','She said her energy is better today.'];
  for(const [index,text] of texts.entries()){
    await page.getByRole('button',{name:'Add update'}).click();await page.getByRole('button',{name:'Type instead'}).click();await page.getByLabel('Or type your update').fill(text);await page.getByRole('button',{name:'Continue with text'}).click();
    await expect(page.getByRole('heading',{name:'Does this look right?'})).toBeVisible();await expect(page.locator('.fact-text')).toHaveText(text);
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
  await openMulti(page,sample.text);await expect(page.getByRole('heading',{name:'Does this look right?'})).toBeVisible({timeout:90000});
  await expect(page.locator('.fact-text')).toHaveCount(sample.count);const facts=await page.locator('.fact-text').allTextContents();for(const fact of facts)expect(sample.text).toContain(fact);
  if(sample.count===1){expect(facts[0]).toContain('Doctor said');expect(facts[0]).toContain('10 mg to 5 mg');}
  const captured=await page.getByText(/^Captured on /).textContent();await page.getByRole('button',{name:'Yes, continue'}).click();await expect(page.getByRole('heading',{name:'Your update is ready.'})).toBeVisible();await expect(page.getByText(/^Captured on /)).toHaveText(captured);
});


test('same-person capture before login is kept, explicitly matched, retried and appended without re-entry (services mocked)',async({page})=>{
  const mock=await mockSession(page,{initialEvents:[legacyEvent(1)],signedOutInitially:true,interpretation:multiInterpretation(),failMatch:true,failAppend:true});
  await openMulti(page);await resolveMulti(page);await page.getByRole('button',{name:'Yes, continue'}).click();await login(page);
  await expect(page.getByRole('alert')).toContainText('check your existing record');await page.getByRole('button',{name:'Try again'}).click();
  await expect(page.getByRole('heading',{name:'Is this update for Mira Example?'})).toBeVisible();expect(mock.state().appendCalls).toBe(0);
  await expect(page.locator('.fact-text')).toHaveCount(2);await page.screenshot({path:'.impeccable/review/match-mobile.png',fullPage:true});await page.setViewportSize({width:1440,height:900});await page.screenshot({path:'.impeccable/review/match-desktop.png',fullPage:true});await page.setViewportSize({width:390,height:844});
  await page.getByRole('link',{name:'No, back to my update'}).click();await expect(page.getByRole('heading',{name:'Your update is ready.'})).toBeVisible();expect(mock.state().appendCalls).toBe(0);
  await page.getByRole('link',{name:'Save this update',exact:true}).click();await expect(page.getByRole('heading',{name:'Is this update for Mira Example?'})).toBeVisible();
  const captured=await page.getByText(/^Captured on /).textContent();await page.getByRole('button',{name:'Yes, save to this record'}).click();await expect(page.getByRole('alert')).toContainText('hasn');
  await page.getByRole('button',{name:'Try again'}).click();await expect(page.locator('.timeline-entry')).toHaveCount(2);
  expect(mock.state().savedIds.at(-1)).toBe(mock.state().savedIds.at(-2));expect(mock.state().entries[1].details.observations).toHaveLength(2);expect(mock.state().entries[1].details.observations[1].polarity).toBe('absent');
  await page.reload();await expect(page.locator('.timeline-entry')).toHaveCount(2);await expect(page.getByText(/^Captured on /).first()).toHaveText(captured);expect(mock.state().codeRequests).toBe(1);
});

test('different identity after login stays unsaved and can return to its prepared update (services mocked)',async({page})=>{
  const mock=await mockSession(page,{initialEvents:[legacyEvent(1)],signedOutInitially:true});
  await page.goto('/');await page.getByRole('link',{name:'Get started',exact:true}).click();await page.getByLabel('Their name').fill('Other Example');await page.getByLabel('Your relationship to them').fill('Father');await page.getByRole('button',{name:'Continue',exact:true}).click();
  await page.getByRole('button',{name:'Type instead'}).click();await page.getByLabel('Or type your update').fill('Other Example felt tired today.');await page.getByRole('button',{name:'Continue with text'}).click();await page.getByRole('button',{name:'Yes, continue'}).click();await login(page);
  await expect(page.getByRole('alert')).toContainText('each account keeps notes for one person');await expect(page.getByRole('button',{name:'Yes, save to this record'})).toHaveCount(0);expect(mock.state().appendCalls).toBe(0);
  await page.getByRole('link',{name:'Back to your update'}).click();await expect(page.getByRole('heading',{name:'Your update is ready.'})).toBeVisible();expect(mock.state().entries).toHaveLength(1);
});


const summaryFixture=()=>({status:'ready',name:'Mira Example',groups:[{title:'Symptoms and observations',keys:['1']}],sources:[{key:'1',recordId:'1',revision:0,edited:true,event:'She did not feel dizzy.',when:'today',evidence:'Patient-reported',polarity:'absent',date:'2026-10-06',capturedAt:Date.now(),timeZone:'Asia/Kolkata',supportingWords:'She did not feel dizzy.'}],undated:[{key:'u1',recordId:'1',revision:0,event:'Her appetite seemed better sometime last week.',when:'sometime last week',evidence:'Caregiver-observed',polarity:'uncertain',date:null,capturedAt:Date.now(),timeZone:'Asia/Kolkata',supportingWords:'Her appetite seemed better sometime last week.'}],undatedCount:1,recordCount:1,message:'',generatedAt:Date.now()});

test('six-week summary shows all stored categories and 126 facts, with source details and a 90-day boundary',async({page})=>{
  const categories=['Symptoms','Measurements','Medication changes','Doctor visits','Daily wellbeing','Appetite','Other'];
  const sources=Array.from({length:126},(_,index)=>({...summaryFixture().sources[0],key:String(index+1),recordId:String(index+1),event:`Fictional saved fact ${index+1}`,supportingWords:`Fictional saved fact ${index+1}`,date:new Date(Date.parse('2026-08-26T12:00:00Z')+Math.floor(index/3)*86400000).toISOString().slice(0,10)}));
  const result={...summaryFixture(),sources,groups:categories.map((title,index)=>({title,keys:sources.filter((_,sourceIndex)=>sourceIndex%7===index).map(source=>source.key)})),recordCount:126,undated:[],undatedCount:0,overview:[{id:'repeat:swelling',text:'Swelling appears in recorded notes on 42 different days. This counts recorded days, not separate episodes.',keys:['1','4']}],snapshotHash:'a'.repeat(64)};
  const mock=await mockSession(page,{initialEvents:[legacyEvent(1)],summaryReply:result});
  await page.goto('/#record');await page.getByRole('button',{name:'Summary for a period'}).click();
  await page.getByLabel('From',{exact:true}).fill('2026-07-01');await page.getByLabel('To',{exact:true}).fill('2026-09-29');await page.getByRole('button',{name:'Prepare summary'}).click();
  await expect(page.getByRole('alert')).toHaveText('Choose a period of up to 90 days.');expect(mock.state().summaryCalls).toBe(0);
  await page.getByLabel('From',{exact:true}).fill('2026-08-26');await page.getByLabel('To',{exact:true}).fill('2026-10-06');await page.getByRole('button',{name:'Prepare summary'}).click();
  await expect(page.locator('.summary-narrative')).toContainText('42 different days');await expect(page.locator('.summary-categories')).toHaveCount(0);await page.getByRole('button',{name:'View all details',exact:true}).click();await expect(page.locator('.summary-categories .summary-category')).toHaveCount(7);
  await expect(page.locator('.summary-category .marker-wellbeing')).toHaveCount(2);await expect(page.locator('.summary-category .marker-care')).toHaveCount(2);
  for(const width of [320,390,768,1440]){
    await page.setViewportSize({width,height:900});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
    await page.screenshot({path:`.impeccable/review/stored-type-summary-${width}.png`,fullPage:true});
  }
  await expect(page.locator('.summary-categories .update-facts li:visible')).toHaveCount(126);
  await page.locator('.summary-categories details > summary').first().focus();await page.keyboard.press('Enter');await page.keyboard.press('Enter');
  await page.locator('.summary-categories .summary-source > summary').first().click();await expect(page.locator('.summary-categories').getByText('Explicitly absent',{exact:true}).first()).toBeVisible();
  await page.getByRole('button',{name:'Back to summary',exact:true}).click();await page.getByRole('button',{name:'Review & share'}).click();await expect(page.getByLabel('Text to share',{exact:true})).toBeVisible();
  expect(mock.state().shareCheckCalls).toBe(1);expect(mock.state().savedCalls).toBe(0);
});

test('period summary validates dates, retains period on failure, shows source evidence and undated details, then returns to timeline (services mocked)',async({page})=>{
  const mock=await mockSession(page,{initialEvents:[legacyEvent(1)],summaryReply:summaryFixture(),failSummary:true});await page.goto('/#record');await page.getByRole('button',{name:'Summary for a period'}).click();
  await page.getByLabel('From',{exact:true}).fill('2026-10-07');await page.getByLabel('To',{exact:true}).fill('2026-10-06');await page.getByRole('button',{name:'Prepare summary'}).click();await expect(page.getByRole('alert')).toContainText('start before the end');expect(mock.state().summaryCalls).toBe(0);
  await page.getByLabel('From',{exact:true}).fill('2026-10-01');await page.getByRole('button',{name:'Prepare summary'}).click();await expect(page.getByRole('alert')).toContainText('Busy right now');await expect(page.getByLabel('From',{exact:true})).toHaveValue('2026-10-01');
  await page.getByRole('button',{name:'Prepare summary'}).click();await expect(page.getByRole('button',{name:'View all details',exact:true})).toBeVisible();await expect(page.getByText('This is based on only a few updates, so it gives a limited picture of this period.')).toBeVisible();
  await page.getByRole('button',{name:'View all details',exact:true}).click();await expect(page.locator('.period-result .fact-text').first()).toHaveText('She did not feel dizzy.');await page.getByText('View source',{exact:true}).first().click();await expect(page.getByText('Explicitly absent',{exact:true})).toBeVisible();await expect(page.getByText('Corrected by you.',{exact:true})).toBeVisible();
  await expect(page.getByText(/^Timing not known/)).toBeVisible();
  await page.screenshot({path:'.impeccable/review/summary-mobile.png',fullPage:true});await page.setViewportSize({width:1440,height:900});await page.screenshot({path:'.impeccable/review/summary-desktop.png',fullPage:true});
  await page.getByRole('button',{name:'Back to summary',exact:true}).click();await page.getByText('Change dates',{exact:true}).click();await page.getByLabel('From',{exact:true}).fill('2026-09-01');await expect(page.locator('.period-result')).toHaveCount(0);await page.getByRole('button',{name:'Back to timeline'}).click();await expect(page.locator('.timeline-entry')).toHaveCount(1);expect(mock.state().savedCalls).toBe(0);
});

for(const scenario of ['empty','too_many'])test(`period summary ${scenario} explains available data and retains saved timeline (services mocked)`,async({page})=>{
  await mockSession(page,{initialEvents:[legacyEvent(1)],summaryReply:{...summaryFixture(),status:scenario,groups:[],sources:[],undated:[],undatedCount:0,recordCount:0,message:'Choose a shorter period.'}});await page.goto('/#record');await page.getByRole('button',{name:'Summary for a period'}).click();await page.getByRole('button',{name:'Prepare summary'}).click();await expect(page.getByText(scenario==='empty'?'There are no dated updates to summarise for this period.':'Choose a shorter period.',{exact:true})).toBeVisible();await page.getByRole('button',{name:'Back to timeline'}).click();await expect(page.locator('.timeline-entry')).toHaveCount(1);
});

async function openTimelineNote(page) {
  const note=page.locator('.timeline-disclosure').first();
  if(await note.count() && (await note.getAttribute('open')) === null)await note.locator(':scope > summary').click();
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
  await expect(page.getByText('3 details, View update',{exact:true})).toBeVisible();
  await expect(page.locator('.marker-note')).toHaveCount(1);await expect(page.locator('.marker-measurement')).toHaveCount(1);await expect(page.locator('.marker-care')).toHaveCount(1);
  for(const width of [320,390,768,1440]){
    await page.setViewportSize({width,height:900});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
    if(width===390 || width===1440)await page.screenshot({path:`.impeccable/review/compact-timeline-${width}.png`,fullPage:true});
  }
  const summary=page.locator('.timeline-disclosure > summary').first();await summary.focus();await page.keyboard.press('Enter');
  await expect(page.locator('.timeline-expanded').first().getByText('She did not feel dizzy',{exact:true}).first()).toBeVisible();
  await expect(page.getByText('Explicitly absent',{exact:true})).toBeVisible();await expect(page.getByText(/^Captured on /).first()).toBeVisible();
  for(const width of [320,390,1440]){
    await page.setViewportSize({width,height:900});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
    if(width===390)await page.screenshot({path:'.impeccable/review/compact-expanded-mobile.png',fullPage:true});
  }
  await page.getByRole('button',{name:'Change update',exact:true}).click();await page.getByRole('button',{name:'Cancel changes',exact:true}).click();
  await expect(page.getByText('Explicitly absent',{exact:true})).toBeVisible();
  await page.getByRole('button',{name:'Delete update',exact:true}).click();await page.getByRole('button',{name:'Keep update'}).click();
  expect(mock.state().deleteCalls).toBe(0);expect(mock.state().correctionCalls).toBe(0);
  await page.locator('.timeline-disclosure > summary').first().click();await expect(page.getByRole('button',{name:'Change update'})).toHaveCount(0);expect(errors).toEqual([]);
});

test('summary starts with supported overview and calm categories, sources disclose on tap and narrow layouts stay intact (services mocked)',async({page})=>{
  const result=summaryFixture();result.overview=[{id:'h1',text:'A later note explicitly records no dizziness. This describes those notes, not the days between them.',keys:['1']}];
  for(const [title,key,event] of [['Measurements','2','BP 142/88'],['Care and visits','3','Doctor visit recorded.'],['Appetite, sleep and energy','4','She said she slept poorly.']]){result.groups.push({title,keys:[key]});result.sources.push({...result.sources[0],key,recordId:key,event,polarity:'present'});}
  result.recordCount=4;const errors=[];page.on('pageerror',e=>errors.push(e.message));await mockSession(page,{initialEvents:[legacyEvent(1)],summaryReply:result});await page.goto('/#record');await page.getByRole('button',{name:'Summary for a period'}).click();await page.getByRole('button',{name:'Prepare summary'}).click();
  await expect(page.locator('.summary-narrative')).toHaveText(result.overview[0].text);await page.getByRole('button',{name:'View all details',exact:true}).click();await expect(page.locator('.summary-category')).toHaveCount(4);await expect(page.getByText('Corrected by you.',{exact:true}).first()).not.toBeVisible();
  for(const width of [320,390,768,1440]){await page.setViewportSize({width,height:900});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);if(width===390 || width===1440)await page.screenshot({path:`.impeccable/review/calm-summary-${width}.png`,fullPage:true});}
  const category=page.locator('.summary-category > summary').first();await category.focus();await page.keyboard.press('Enter');await page.keyboard.press('Enter');await page.locator('.summary-category').first().getByText('View source',{exact:true}).click();await expect(page.locator('.summary-category').first().getByText('Explicitly absent',{exact:true})).toBeVisible();
  await page.getByText('Notes behind this overview',{exact:true}).click();await expect(page.locator('.overview-sources .fact-text')).toHaveText('She did not feel dizzy.');
  await page.setViewportSize({width:320,height:900});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);expect(errors).toEqual([]);
});

test('unrelated sparse notes use neutral overview rather than an unsupported better or worse claim (services mocked)',async({page})=>{
  await mockSession(page,{initialEvents:[legacyEvent(1)],summaryReply:summaryFixture()});await page.goto('/#record');await page.getByRole('button',{name:'Summary for a period'}).click();await page.getByRole('button',{name:'Prepare summary'}).click();await expect(page.locator('.summary-narrative')).toContainText('Add more updates to build a fuller picture.');await expect(page.locator('.summary-narrative')).not.toContainText('looking better');await expect(page.locator('.summary-narrative')).not.toContainText('since last visit');
});

test('checking an existing sign-in never signs out or clears a typed update, and duplicate auth notifications keep the summary open (services mocked)',async({page})=>{
  const mock=await mockSession(page,{initialEvents:[legacyEvent(1)],summaryReply:summaryFixture()});await page.goto('/#record');await expect(page.locator('.timeline-entry')).toHaveCount(1);
  await page.getByRole('button',{name:'Add update'}).click();await page.getByRole('button',{name:'Type instead'}).click();await page.getByLabel('Or type your update').fill('Mira Example felt tired this morning.');
  await page.evaluate(()=>window.__testSessionChange({isLoading:true,isAuthenticated:false}));
  await expect(page.getByLabel('Or type your update')).toHaveValue('Mira Example felt tired this morning.');await expect(page).toHaveURL(/#capture$/);
  await page.evaluate(()=>window.__testSessionChange({isLoading:false,isAuthenticated:true}));await expect(page.getByLabel('Or type your update')).toHaveValue('Mira Example felt tired this morning.');
  await page.getByRole('link',{name:'Back to timeline'}).click();await page.getByRole('button',{name:'Summary for a period'}).click();await page.getByRole('button',{name:'Prepare summary'}).click();await expect(page.locator('.period-result')).toBeVisible();
  const reads=mock.state().timelineCalls;
  await page.evaluate(()=>window.__testSessionChange({isLoading:false,isAuthenticated:true}));await expect(page.locator('.period-result')).toBeVisible();expect(mock.state().timelineCalls).toBe(reads);
  await page.getByRole('button',{name:'Back to timeline'}).click();await page.getByRole('button',{name:'Open menu',exact:true}).click();page.once('dialog',dialog=>dialog.accept());await page.getByRole('button',{name:'Sign out'}).click();await expect(page.getByRole('link',{name:'Already started? Sign in'})).toBeVisible();
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
  await page.goto('/#record');await expect(page.getByRole('button',{name:'For a doctor visit'})).toHaveCount(0);await page.getByRole('button',{name:'Summary for a period'}).click();
  await page.getByLabel('From',{exact:true}).fill('2026-10-01');await page.getByLabel('To',{exact:true}).fill('2026-10-06');await page.getByRole('button',{name:'Prepare summary'}).click();await expect(page.getByRole('alert')).toContainText('Busy');await expect(page.getByLabel('From',{exact:true})).toHaveValue('2026-10-01');await page.getByRole('button',{name:'Prepare summary'}).click();
  await expect(page.locator('.period-result')).toBeVisible();await expect(page.getByRole('button',{name:'Prepare doctor brief'})).toHaveCount(0);
  await page.getByRole('button',{name:'View all details',exact:true}).click();await page.getByText('Points to discuss at a visit',{exact:true}).click();await expect(page.locator('.summary-discussion .fact-text')).toBeVisible();
  await page.locator('.summary-category').filter({has:page.getByRole('heading',{name:'Daily wellbeing',exact:true})}).locator(':scope > summary').focus();await expect(page.getByText('Reported improvements',{exact:true})).toBeVisible();await expect(page.locator('.period-result').getByText('She said her appetite seems better.',{exact:true}).first()).toBeVisible();
  for(const width of [320,390,768,1440]){await page.setViewportSize({width,height:900});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);if(width===390||width===1440)await page.screenshot({path:`.impeccable/review/unified-summary-${width}.png`,fullPage:true});}
  await page.evaluate(()=>window.__testSessionChange({isLoading:true,isAuthenticated:false}));await page.evaluate(()=>window.__testSessionChange({isLoading:false,isAuthenticated:true}));await expect(page.locator('.period-result')).toBeVisible();
  await page.getByRole('button',{name:'Back to summary',exact:true}).click();await page.getByRole('button',{name:'Back to timeline'}).click();await expect(page.locator('.timeline-entry')).toHaveCount(1);expect(mock.state().summaryCalls).toBe(2);expect(mock.state().savedCalls).toBe(0);expect(errors).toEqual([]);
});

test('prepared summary keeps dates in a compact row, opens the form on demand and retains the individual change (services mocked)',async({page})=>{
 const result=summaryFixture();result.sources[0].event='Mira Example started feeling better around 9 p.m. today';result.sources[0].supportingWords=result.sources[0].event;result.sources[0].polarity='present';result.sections=[{title:'Reported improvements',keys:['1']}];
 await mockSession(page,{initialEvents:[legacyEvent(1)],summaryReply:result});await page.goto('/#record');await page.getByRole('button',{name:'Summary for a period'}).click();await page.getByLabel('From',{exact:true}).fill('2026-10-01');await page.getByLabel('To',{exact:true}).fill('2026-10-06');await page.getByRole('button',{name:'Prepare summary'}).click();
 await expect(page.locator('.summary-narrative')).toContainText('Add more updates to build a fuller picture.');await expect(page.locator('.summary-narrative')).not.toContainText('started feeling better');await expect(page.getByLabel('From',{exact:true})).not.toBeVisible();
 for(const width of [320,390,768,1440]){await page.setViewportSize({width,height:900});const row=await page.locator('.summary-period-picker').boundingBox();expect(row.height).toBeLessThanOrEqual(52);await expect(page.locator('.selected-period')).toContainText('1 Oct');expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);if(width===390||width===1440)await page.screenshot({path:`.impeccable/review/compact-summary-dates-${width}.png`,fullPage:true});}
 await page.getByRole('button',{name:'View all details',exact:true}).click();await expect(page.locator('.summary-category .fact-text').first()).toHaveText(result.sources[0].event);await expect(page.getByText('Reported improvements',{exact:true})).toBeVisible();
 await page.getByRole('button',{name:'Back to summary',exact:true}).click();await page.getByText('Change dates',{exact:true}).click();await expect(page.getByLabel('From',{exact:true})).toHaveValue('2026-10-01');await page.getByLabel('From',{exact:true}).fill('2026-09-01');await expect(page.locator('.period-result')).toHaveCount(0);await expect(page.locator('.selected-period')).toContainText('1 Sept');await page.getByRole('button',{name:'Prepare summary'}).click();await expect(page.getByLabel('From',{exact:true})).not.toBeVisible();
});

const sharingFixtureText="CareNama: Mira Example's health summary\nPeriod: 1 Oct 2026 to 6 Oct 2026\n\nThere is not enough information to describe an overall change in health yet. Add more updates to build a fuller picture.\n\nBased on 1 saved update. Only a few updates are available, so this gives a limited picture.\n\n1 dated detail and 1 detail with uncertain timing. Full measurements and notes are available in CareNama through View all details.\n\nBased on saved caregiver notes. Days without notes tell us nothing about symptoms.";
async function openSharing(page,options={},origin=''){
 const mock=await mockSession(page,{initialEvents:[legacyEvent(1)],summaryReply:summaryFixture(),...options});await page.goto(`${origin}/#record`);await page.getByRole('button',{name:'Summary for a period'}).click();await page.getByRole('button',{name:'Prepare summary'}).click();await page.getByRole('button',{name:'Review & share'}).click();return mock;
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
 const revised=sharingFixtureText+'\nQuestion for the doctor: what did the last reading mean?';await page.getByLabel('Text to share').fill(revised);await page.getByRole('button',{name:'Back to summary',exact:true}).click();await expect(page.locator('.summary-narrative')).toContainText('Add more updates');await page.getByRole('button',{name:'Review & share'}).click();await expect(page.getByLabel('Text to share')).toHaveValue(revised);
 for(const width of [320,390,768,1440]){await page.setViewportSize({width,height:900});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);if(width===390||width===1440)await page.screenshot({path:`.impeccable/review/summary-sharing-${width}.png`,fullPage:true});}
 await page.getByRole('button',{name:'Copy text',exact:true}).focus();await page.keyboard.press('Enter');await expect(page.getByText('Copied. Paste it into the app you choose.',{exact:true})).toBeVisible();expect(await page.evaluate(()=>window.__deviceCopies)).toEqual([revised]);
 await page.getByRole('button',{name:'Share',exact:true}).click();await expect(page.getByText('Sharing completed on this device. Your draft is still here.',{exact:true})).toBeVisible();expect(await page.evaluate(()=>window.__deviceShares[0].text)).toBe(revised);
 await page.evaluate(()=>window.__testSessionChange({isLoading:true,isAuthenticated:false}));await page.evaluate(()=>window.__testSessionChange({isLoading:false,isAuthenticated:true}));await expect(page.getByLabel('Text to share')).toHaveValue(revised);
 expect(mock.state().summaryCalls).toBe(1);expect(mock.state().shareCheckCalls).toBe(3);expect(mock.state().savedCalls).toBe(0);expect(mock.state().correctionCalls).toBe(0);
 await page.getByRole('button',{name:'Back to summary',exact:true}).click();await page.getByText('Change dates',{exact:true}).click();page.once('dialog',dialog=>dialog.dismiss());await page.getByLabel('From',{exact:true}).fill('2026-09-01');await expect(page.locator('.period-result')).toBeVisible();await page.getByRole('button',{name:'Review & share'}).click();await expect(page.getByLabel('Text to share')).toHaveValue(revised);
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
 let release;await page.route('**/__test/share-check',async route=>{await new Promise(resolve=>release=resolve);await route.fulfill({json:{status:'ready',title:'Mira Example summary',text:sharingFixtureText,message:''}});});await page.getByRole('button',{name:'Share',exact:true}).click();await expect(page.getByText('Checking your saved notes…',{exact:true})).toBeVisible();await expect.poll(()=>typeof release).toBe('function');await page.getByRole('button',{name:'Back to summary',exact:true}).click();release();await expect(page.locator('.summary-narrative')).toBeVisible();expect(await page.evaluate(()=>window.__deviceShares.length)).toBe(1);
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
 await page.getByRole('button',{name:'Add update',exact:true}).click();await page.getByRole('button',{name:'Type instead'}).click();await page.getByLabel('Or type your update').fill('An unfinished note.');
 await page.reload();await expect(page.getByRole('heading',{name:'Your timeline',exact:true})).toBeVisible();await expect(page.getByLabel('Their name')).toHaveCount(0);expect(mock.state().savedCalls).toBe(0);
 await page.getByRole('button',{name:'Add update',exact:true}).click();await expect(page.getByRole('heading',{name:'Mira Example',exact:true})).toBeVisible();
 await page.getByRole('button',{name:'Type instead'}).click();await page.getByLabel('Or type your update').fill('Mira Example said she felt tired today.');await page.getByRole('button',{name:'Continue with text'}).click();await resolveMulti(page);await page.getByRole('button',{name:'Save update',exact:true}).click();
 await expect(page.locator('.timeline-entry')).toHaveCount(2);await page.goto('/');await expect(page.locator('.timeline-entry')).toHaveCount(2);expect(mock.state().appendCalls).toBe(1);expect(mock.state().codeRequests).toBe(0);
 await page.screenshot({path:'.impeccable/review/returning-caregiver-mobile.png',fullPage:true});
 const storedEvents=mock.state().entries.map(entry=>entry.details);await page.close();const reopened=await context.newPage();const next=await mockSession(reopened,{initialEvents:storedEvents});await reopened.goto('/');await expect(reopened.locator('.timeline-entry')).toHaveCount(2);await expect(reopened.getByLabel('Their name')).toHaveCount(0);expect(next.state().savedCalls).toBe(0);await reopened.close();
});

test('expired returning session reopens at sign-in and returns to the same notes (services mocked)',async({page})=>{
 const mock=await mockSession(page,{initialEvents:[legacyEvent(1)],signedOutInitially:true});await page.addInitScript(()=>localStorage.setItem('carenama.returning','1'));await page.goto('/');
 await expect(page.getByRole('heading',{name:'Welcome back.',exact:true})).toBeVisible();expect(mock.state().timelineCalls).toBe(0);
 await page.getByLabel('Your email').fill('caregiver@example.test');await page.getByRole('button',{name:'Continue',exact:true}).click();await page.getByLabel('Email code').fill('123456');await page.getByRole('button',{name:'Verify code'}).click();
 await expect(page.locator('.timeline-entry')).toHaveCount(1);expect(mock.state().savedCalls).toBe(0);await page.getByRole('button',{name:'Open menu',exact:true}).click();await page.getByRole('button',{name:'Sign out',exact:true}).click();await expect(page.getByRole('link',{name:'Get started',exact:true})).toBeVisible();
});

test('reopening waits for sign-in verification and retries timeline failure without creating records (services mocked)',async({page})=>{
 const mock=await mockSession(page,{initialEvents:[legacyEvent(1)],failTimelineAt:1,pendingSession:true});
 await page.goto('/#capture');await expect(page.getByRole('heading',{name:'Opening CareNama',exact:true})).toBeVisible();await expect(page.getByLabel('Their name')).toHaveCount(0);expect(mock.state().timelineCalls).toBe(0);await page.evaluate(()=>window.__testResolveSession());await expect(page.getByRole('alert')).toContainText('load the timeline');await expect(page.getByLabel('Their name')).toHaveCount(0);await expect(page.getByRole('button',{name:'Add update',exact:true})).toHaveCount(0);
 await page.getByRole('button',{name:'Try again',exact:true}).click();await expect(page.locator('.timeline-entry')).toHaveCount(1);expect(mock.state().savedCalls).toBe(0);
});


test('blocked browser storage still allows returning to the server-owned timeline (services mocked)',async({page})=>{
 await mockSession(page,{initialEvents:[legacyEvent(1)]});await page.addInitScript(()=>{Storage.prototype.getItem=()=>{throw new DOMException('Blocked','SecurityError');};Storage.prototype.setItem=()=>{throw new DOMException('Blocked','SecurityError');};});
 await page.goto('/');await expect(page.locator('.timeline-entry')).toHaveCount(1);await page.reload();await expect(page.locator('.timeline-entry')).toHaveCount(1);await expect(page.getByLabel('Their name')).toHaveCount(0);
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
 await page.getByRole('button',{name:'Finish deleting my account',exact:true}).click();await expect(page.getByRole('status')).toHaveText('Your account and health record have been permanently deleted.');await expect(page.getByRole('link',{name:'Get started',exact:true})).toBeVisible();expect(mock.state().entries).toHaveLength(0);expect(mock.state().record).toBe(null);expect(await page.evaluate(()=>localStorage.getItem('carenama.returning'))).toBe(null);
 await page.reload();await expect(page.getByRole('link',{name:'Get started',exact:true})).toBeVisible();await page.getByRole('link',{name:'Already started? Sign in',exact:true}).click();await page.getByLabel('Your email').fill('caregiver@example.test');await page.getByRole('button',{name:'Continue',exact:true}).click();await page.getByLabel('Email code').fill('123456');await page.getByRole('button',{name:'Verify code',exact:true}).click();await expect(page.getByText('No saved updates yet.',{exact:true})).toBeVisible();await page.getByRole('button',{name:'Set up a health record',exact:true}).click();await expect(page.getByLabel('Their name')).toHaveValue('');await page.getByLabel('Their name').fill('Mira Example');await page.getByLabel('Your relationship to them').fill('Daughter');await page.getByRole('button',{name:'Continue',exact:true}).click();await page.getByRole('button',{name:'Type instead',exact:true}).click();await page.getByLabel('Or type your update').fill('Mira Example said she felt tired today.');await page.getByRole('button',{name:'Continue with text',exact:true}).click();await page.getByRole('button',{name:'Save update',exact:true}).click();await expect(page.locator('.timeline-entry')).toHaveCount(1);expect(mock.state().savedCalls).toBe(1);
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
 await expect(page.getByRole('link',{name:'Already started? Sign in',exact:true})).toBeVisible();expect(errors).toEqual([]);
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
 await page.getByRole('button',{name:'Type instead',exact:true}).click();
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
 await page.getByRole('button',{name:'Add update',exact:true}).click();await page.getByRole('button',{name:'Type instead',exact:true}).click();
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
 const count=mock.state().analyticsEvents.length;await page.getByRole('button',{name:'Back',exact:true}).click();await page.getByRole('link',{name:'Get started',exact:true}).click();await page.getByLabel('Their name').fill('Mira Example');await page.getByLabel('Your relationship to them').fill('Daughter');await page.getByRole('button',{name:'Continue',exact:true}).click();await expect(page.getByRole('button',{name:'Speak an update',exact:true})).toBeVisible();expect(mock.state().analyticsEvents).toHaveLength(count);
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

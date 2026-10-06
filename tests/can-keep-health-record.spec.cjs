const { test, expect } = require('@playwright/test');

async function mockSession(page, { failSave = false, interpretation = null, initialEvents = [], failTimelineAt = 0, failAppend = false, failCorrection = false, failDelete = false, staleCorrection = false, signedOutInitially = false, failMatch = false, summaryReply = null, failSummary = false } = {}) {
  let signed = initialEvents.length>0 && !signedOutInitially, record = initialEvents.length ? {name:'Mira Example',relationship:'Daughter',event:initialEvents[0]} : null, savedCalls = 0, codeRequests = 0, timelineCalls=0, appendCalls=0, correctionCalls=0, deleteCalls=0, matchCalls=0, summaryCalls=0;
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
        async signOut() { await fetch('/__test/signout'); state.isAuthenticated = false; onChange({ ...state }); },
        async saveRecord(value) { const response = await fetch('/__test/save', { method: 'POST', body: JSON.stringify(value) }); if (!response.ok) throw new Error(await response.text()); },
        async getRecord() { return (await fetch('/__test/record')).json(); },
        async getTimeline(options) {const response=await fetch('/__test/timeline',{method:'POST',body:JSON.stringify(options)});if(!response.ok)throw new Error('Unavailable');return response.json();},
        async correctUpdate(value) {const response=await fetch('/__test/correct',{method:'POST',body:JSON.stringify(value)});if(!response.ok)throw new Error(await response.text());return response.json();},
        async deleteUpdate(value) {const response=await fetch('/__test/delete',{method:'POST',body:JSON.stringify(value)});if(!response.ok)throw new Error(await response.text());},
        async generateSummary(value) {const response=await fetch('/__test/summary',{method:'POST',body:JSON.stringify(value)});if(!response.ok)throw new Error('Busy');return response.json();},
        async matchingPatient(patient) {const response=await fetch('/__test/match',{method:'POST',body:JSON.stringify(patient)});if(!response.ok)throw new Error('Unavailable');return response.json();},
        async saveMatchedUpdate(value) {return state.saveUpdate(value);},
        async saveUpdate(value) {const response=await fetch('/__test/append',{method:'POST',body:JSON.stringify(value)});if(!response.ok)throw new Error('Unavailable');},
      }; queueMicrotask(() => onChange({ ...state }));
    }` }));
  await page.route('**/__test/**', route => {
    const path = new URL(route.request().url()).pathname;
    if (path.endsWith('signin')) {
      const params = route.request().postDataJSON();
      if (!params.code) { codeRequests++; return route.fulfill({ json: {} }); }
      if (params.code !== '12345678') return route.fulfill({ status: 400, json: {} });
      signed = true; return route.fulfill({ json: {} });
    }
    if (path.endsWith('signout')) { signed = false; return route.fulfill({ json: {} }); }
    if(path.endsWith('timeline')) {
      timelineCalls++;if(timelineCalls===failTimelineAt)return route.fulfill({status:503,json:{}});
      const options=route.request().postDataJSON(),start=Number(options.cursor||0),ordered=[...entries].sort((a,b)=>b.details.capturedAt-a.details.capturedAt || Number(b.id)-Number(a.id)),page=ordered.slice(start,start+options.numItems);
      return route.fulfill({json:{patient:record?{id:'person-test',name:record.name,relationship:record.relationship}:null,page,isDone:start+page.length>=entries.length,continueCursor:String(start+page.length)}});
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
      if (initialEvents.length)return route.fulfill({status:409,body:'This account already has a health record.'});
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
  return { state: () => ({ signed, record, savedCalls, codeRequests, savedIds, entries, timelineCalls, appendCalls, correctionCalls, deleteCalls, matchCalls, summaryCalls }) };
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
  await page.getByLabel('Email code').fill('00000000');
  await page.getByRole('button', { name: 'Verify code' }).click();
  await expect(page.getByRole('alert')).toContainText('incorrect or expired');
  expect(mock.state().savedCalls).toBe(0);
  await page.getByRole('link', { name: 'Back to your update' }).click();
  await expect(page.locator('.fact-text').first()).toHaveText('Mira Example said she felt tired today.');
  await page.getByRole('link', { name: 'Save this update', exact: true }).click();
  await page.getByLabel('Email code').fill('12345678');
  await page.getByRole('button', { name: 'Verify code' }).click();
  await expect(page.getByText('Saved to Mira Example’s record.')).toBeVisible();
  expect(mock.state().savedCalls).toBe(1);
  await page.screenshot({ path: '.impeccable/review/saved-record-mobile.png', fullPage: true });
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Mira Example’s health story', exact: true })).toBeVisible();
  expect(mock.state().savedCalls).toBe(1);
  await page.getByRole('button', { name: 'Sign out', exact: true }).click();
  await expect(page.getByRole('link', { name: 'Already started? Sign in' })).toBeVisible();
  await page.getByRole('link', { name: 'Already started? Sign in' }).click();
  await page.getByLabel('Your email').fill('caregiver@example.test');
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  await page.getByLabel('Email code').fill('12345678');
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
  await page.getByLabel('Email code').fill('12345678');
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
  await page.getByLabel('Email code').fill('12345678');await page.getByRole('button',{name:'Verify code'}).click();
}

test('one confirmation approves all visible facts, preserves explicit negatives and capture time, then saves atomically (services mocked)',async({page})=>{
  const mock=await mockSession(page,{interpretation:multiInterpretation()});await openMulti(page);
  const captured=await page.getByText(/^Captured on /).textContent();
  await expect(page.getByRole('button',{name:'Yes, continue'})).toHaveCount(0);
  await expect(page.getByRole('button',{name:'I’m not sure',exact:true})).toHaveCount(1);
  await page.getByRole('button',{name:'Today',exact:true}).click();
  await page.getByRole('button',{name:'I’m not sure',exact:true}).click();
  await expect(page.locator('.fact-text')).toHaveText(['BP 142/88 this morning','she did not feel dizzy']);
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
  await page.getByRole('checkbox',{name:/Use this date for these details/}).check();
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
  const shared=page.getByRole('checkbox',{name:/Use this date for these details/});await expect(shared).not.toBeChecked();
  await expect(shared).toHaveAccessibleName(/mild headache.*noticed an allergy flare up/);
  await shared.check();await page.getByRole('button',{name:'Choose a date'}).click();
  // Opening the date picker must preserve the explicit shared-date choice.
  await expect(page.getByRole('checkbox',{name:/Use this date for these details/})).toBeChecked();
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
  await page.getByLabel('What happened',{exact:true}).fill('she did not feel dizzy');
  await page.getByText('Source and meaning',{exact:true}).click();
  await page.getByLabel('What was explicitly stated?').selectOption('absent');
  await page.getByRole('button',{name:'Apply changes'}).click();
  await expect(page.locator('.fact-text')).toHaveText(['BP 142/88 this morning','she did not feel dizzy']);
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

test('a signed-in account with no notes sees an honest empty timeline and can start patient setup (services mocked)',async({page})=>{
  await mockSession(page);await page.goto('/');await page.getByRole('link',{name:'Already started? Sign in'}).click();
  await page.getByLabel('Your email').fill('caregiver@example.test');await page.getByRole('button',{name:'Continue',exact:true}).click();
  await page.getByLabel('Email code').fill('12345678');await page.getByRole('button',{name:'Verify code'}).click();
  await expect(page.getByText('No saved updates yet.',{exact:true})).toBeVisible();
  await page.getByRole('button',{name:'Add update'}).click();await expect(page.getByRole('heading',{name:'Who are you caring for?'})).toBeVisible();
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

test('period summary validates dates, retains period on failure, shows source evidence and undated details, then returns to timeline (services mocked)',async({page})=>{
  const mock=await mockSession(page,{initialEvents:[legacyEvent(1)],summaryReply:summaryFixture(),failSummary:true});await page.goto('/#record');await page.getByRole('button',{name:'Summary for a period'}).click();
  await page.getByLabel('From',{exact:true}).fill('2026-10-07');await page.getByLabel('To',{exact:true}).fill('2026-10-06');await page.getByRole('button',{name:'Prepare summary'}).click();await expect(page.getByRole('alert')).toContainText('start before the end');expect(mock.state().summaryCalls).toBe(0);
  await page.getByLabel('From',{exact:true}).fill('2026-10-01');await page.getByRole('button',{name:'Prepare summary'}).click();await expect(page.getByRole('alert')).toContainText('Busy right now');await expect(page.getByLabel('From',{exact:true})).toHaveValue('2026-10-01');
  await page.getByRole('button',{name:'Prepare summary'}).click();await expect(page.getByRole('heading',{name:'Symptoms and observations'})).toBeVisible();await expect(page.getByText('This is based on only a few updates, so it gives a limited picture of this period.')).toBeVisible();
  await expect(page.locator('.period-result .fact-text').first()).toHaveText('She did not feel dizzy.');await page.getByText('View source',{exact:true}).first().click();await expect(page.getByText('Explicitly absent',{exact:true})).toBeVisible();await expect(page.getByText('Corrected by you.',{exact:true})).toBeVisible();
  await page.getByText('1 detail with uncertain timing',{exact:true}).click();await expect(page.getByText(/^Timing not known/)).toBeVisible();
  await page.screenshot({path:'.impeccable/review/summary-mobile.png',fullPage:true});await page.setViewportSize({width:1440,height:900});await page.screenshot({path:'.impeccable/review/summary-desktop.png',fullPage:true});
  await page.getByLabel('From',{exact:true}).fill('2026-09-01');await expect(page.locator('.period-result')).toHaveCount(0);await page.getByRole('button',{name:'Back to timeline'}).click();await expect(page.locator('.timeline-entry')).toHaveCount(1);expect(mock.state().savedCalls).toBe(0);
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
  const measured={...legacyEvent(2),event:'BP 120/80',evidence:'Measured'},care={...legacyEvent(3),event:'We visited the doctor.'};
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

const { test, expect } = require('@playwright/test');

async function mockSession(page, { failSave = false, interpretation = null } = {}) {
  let signed = false, record = null, savedCalls = 0, codeRequests = 0;
  await page.route('**/src/session.js', route => route.fulfill({ contentType: 'application/javascript', body: `
    export function startSession(onChange) {
      const state = { isLoading: false, isAuthenticated: ${signed},
        async signIn(provider, params) {
          const response = await fetch('/__test/signin', { method: 'POST', body: JSON.stringify(params) });
          if (!response.ok) throw new Error('Invalid code');
          if (params.code) { state.isAuthenticated = true; onChange({ ...state }); }
        },
        async signOut() { await fetch('/__test/signout'); state.isAuthenticated = false; onChange({ ...state }); },
        async saveRecord(value) { const response = await fetch('/__test/save', { method: 'POST', body: JSON.stringify(value) }); if (!response.ok) throw new Error('Unavailable'); },
        async getRecord() { return (await fetch('/__test/record')).json(); },
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
    if (path.endsWith('save')) {
      savedCalls++;
      if (failSave && savedCalls === 1) return route.fulfill({ status: 503, json: {} });
      const input = route.request().postDataJSON();
      record = { ...input.patient, event: input.event }; return route.fulfill({ json: {} });
    }
    return route.fulfill({ json: record });
  });
  await page.route('**/api/**', route => {
    if (route.request().url().endsWith('/capture-text')) return route.fulfill({ json: { text: route.request().postDataJSON().text, source: 'text' } });
    return route.fulfill({ json: interpretation || { status: 'ready', event: 'Mira Example said she felt tired today.', when: 'today', evidence: 'Patient-reported', question: '', message: '' } });
  });
  return { state: () => ({ signed, record, savedCalls, codeRequests }) };
}
async function confirm(page) {
  await page.goto('/');
  await page.getByRole('link', { name: 'Get started', exact: true }).click();
  await page.getByLabel('Their name').fill('Mira Example');
  await page.getByLabel('Your relationship to them').fill('Daughter');
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  await page.getByLabel('Or type your update').fill('Mira Example said she felt tired today.');
  await page.getByRole('button', { name: 'Continue with text' }).click();
  await page.getByRole('button', { name: 'Confirm update' }).click();
  await expect(page.getByText('Not saved for next time')).toBeVisible();
}

test('sign-in follows first value, incorrect code preserves the update, and saved record returns after refresh and sign-in (provider mocked)', async ({ page }) => {
  const mock = await mockSession(page);
  await confirm(page);
  expect(mock.state().savedCalls).toBe(0);
  await page.getByRole('link', { name: 'Keep this health record', exact: true }).click();
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  await expect(page.getByRole('alert')).toHaveText('Enter a valid email address.');
  await page.getByLabel('Your email').fill('caregiver@example.test');
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  await page.getByLabel('Email code').fill('00000000');
  await page.getByRole('button', { name: 'Verify code' }).click();
  await expect(page.getByRole('alert')).toContainText('incorrect or expired');
  expect(mock.state().savedCalls).toBe(0);
  await page.getByRole('link', { name: 'Back to your update' }).click();
  await expect(page.getByRole('definition').first()).toHaveText('Mira Example said she felt tired today.');
  await page.getByRole('link', { name: 'Keep this health record', exact: true }).click();
  await page.getByLabel('Email code').fill('12345678');
  await page.getByRole('button', { name: 'Verify code' }).click();
  await expect(page.getByText('Your confirmed update is saved for next time.')).toBeVisible();
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
  await expect(page.getByRole('definition').first()).toHaveText('Mira Example said she felt tired today.');
  expect(mock.state().savedCalls).toBe(1);
});

test('a save failure keeps the confirmed update and retry saves it without another sign-in (provider mocked)', async ({ page }) => {
  const mock = await mockSession(page, { failSave: true });
  await confirm(page);
  await page.getByRole('link', { name: 'Keep this health record', exact: true }).click();
  await page.getByLabel('Your email').fill('caregiver@example.test');
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  await page.screenshot({ path: '.impeccable/review/email-code-mobile.png', fullPage: true });
  await page.getByLabel('Email code').fill('12345678');
  await page.getByRole('button', { name: 'Verify code' }).click();
  await expect(page.getByRole('alert')).toContainText('We couldn’t save your update.');
  await page.getByRole('button', { name: 'Try again' }).click();
  await expect(page.getByText('Your confirmed update is saved for next time.')).toBeVisible();
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
async function openMulti(page, text=multiText) {
  await page.goto('/'); await page.getByRole('link',{name:'Get started',exact:true}).click();
  await page.getByLabel('Their name').fill('Mira Example'); await page.getByLabel('Your relationship to them').fill('Daughter');
  await page.getByRole('button',{name:'Continue',exact:true}).click(); await page.getByLabel('Or type your update').fill(text);
  await page.getByRole('button',{name:'Continue with text'}).click();
  await expect(page.getByRole('region',{name:'Observation 1',exact:true})).toBeVisible();
}
test('one capture holds measured and explicitly absent observations; each needs confirmation before atomic save and refresh (services mocked)',async({page})=>{
  const mock=await mockSession(page,{interpretation:multiInterpretation()}); await openMulti(page);
  const captured=await page.getByText(/^Captured on /).textContent();
  await expect(page.getByRole('button',{name:'Save update',exact:true})).toBeDisabled();
  await expect(page.getByRole('button',{name:'Confirm observation 1'})).toBeDisabled();
  await expect(page.getByLabel('Date for observation 2')).toHaveCount(0); // One timing question at a time.
  await page.getByLabel('Date for observation 1').fill('2026-10-06'); await page.getByRole('button',{name:'Use this date'}).click();
  await page.getByRole('button',{name:'Confirm observation 1'}).click();
  await expect(page.getByRole('button',{name:'Save update',exact:true})).toBeDisabled();
  await page.getByRole('button',{name:'I don’t remember'}).click(); await page.getByRole('button',{name:'Confirm observation 2'}).click();
  await page.screenshot({path:'.impeccable/review/separate-observations-mobile.png',fullPage:true});
  await page.setViewportSize({width:1440,height:900}); expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await page.screenshot({path:'.impeccable/review/separate-observations-desktop.png',fullPage:true});
  await page.getByRole('button',{name:'Save update',exact:true}).click(); expect(mock.state().savedCalls).toBe(0);
  await page.getByRole('link',{name:'Keep this health record',exact:true}).click(); await page.getByLabel('Your email').fill('caregiver@example.test');
  await page.getByRole('button',{name:'Continue',exact:true}).click(); await page.getByLabel('Email code').fill('12345678'); await page.getByRole('button',{name:'Verify code'}).click();
  await expect(page.getByText('Your confirmed update is saved for next time.')).toBeVisible();
  const stored=mock.state().record.event;
  expect(stored.observations).toHaveLength(2); expect(stored.observations[1].polarity).toBe('absent'); expect(stored.observations[1].timing.precision).toBe('unknown');
  expect(stored.originalText).toBe(multiText); expect(stored.aiInterpretation.observations[0].confirmed).toBe(false); expect(mock.state().savedCalls).toBe(1);
  await page.reload(); await expect(page.getByText(/^Captured on /)).toHaveText(captured); expect(mock.state().savedCalls).toBe(1);
});
test('editing reconfirms only the affected observation, removal retains original words, and removing all never saves (services mocked)',async({page})=>{
  const mock=await mockSession(page,{interpretation:multiInterpretation()}); await openMulti(page);
  await page.getByRole('button',{name:'Keep approximate timing'}).click(); await page.getByRole('button',{name:'Confirm observation 1'}).click();
  await page.getByRole('button',{name:'I don’t remember'}).click(); await page.getByRole('button',{name:'Confirm observation 2'}).click();
  await page.getByRole('button',{name:'Edit observation 1'}).click(); await page.getByLabel('What happened',{exact:true}).fill('BP 140/88 this morning');
  await page.getByRole('button',{name:'Apply changes'}).click(); await expect(page.getByRole('button',{name:'Confirm observation 1'})).toBeEnabled();
  await expect(page.getByRole('button',{name:'Confirm observation 2'})).toBeDisabled(); await expect(page.getByRole('button',{name:'Save update',exact:true})).toBeDisabled();
  await page.getByRole('button',{name:'Confirm observation 1'}).click(); await page.getByRole('button',{name:'Remove from this update'}).nth(1).click();
  await page.getByRole('button',{name:'Save update',exact:true}).click(); await page.getByText('Your original update',{exact:true}).click();
  await expect(page.getByText(multiText,{exact:true})).toBeVisible();
  await page.getByRole('link',{name:'Back to review'}).click(); await page.getByRole('button',{name:'Remove from this update'}).click();
  await expect(page.getByLabel('Or type your update')).toHaveValue(multiText); expect(mock.state().savedCalls).toBe(0);
});

test('a shared date applies to both observations only when explicitly selected, preserving their different clock times (services mocked)',async({page})=>{
  const text='Experienced mild headache this morning and noticed an allergy flare up at 5 in the evening.';
  const result=multiInterpretation(); result.event=text; result.observations[0].event=result.observations[0].supportingWords='mild headache';
  result.observations[1].event=result.observations[1].supportingWords='noticed an allergy flare up'; result.observations[1].polarity='present'; result.observations[1].evidence='Caregiver-observed'; result.observations[1].when='at 5 in the evening'; result.observations[1].timing.time='17:00'; result.observations[1].timing.precision='approximate';
  await mockSession(page,{interpretation:result}); await openMulti(page,text);
  await expect(page.getByRole('checkbox',{name:'Use this date for observations 1 and 2'})).not.toBeChecked();
  await page.getByLabel('Date for observation 1').fill('2026-10-06'); await page.getByRole('checkbox',{name:'Use this date for observations 1 and 2'}).check();
  await page.getByRole('button',{name:'Use this date'}).click(); await expect(page.getByRole('button',{name:'Confirm observation 1'})).toBeEnabled();
  await expect(page.getByRole('button',{name:'Confirm observation 2'})).toBeEnabled(); await expect(page.getByText('2026-10-06 at 17:00',{exact:true})).toBeVisible();
  await expect(page.getByRole('button',{name:'Save update',exact:true})).toBeDisabled();
});

test('LIVE: real interpretation splits observations, preserves local capture time and requires separate confirmation',async({page})=>{
  test.skip(process.env.CAPTURE_LIVE!=='1','Opt in to real Sarvam calls.'); test.setTimeout(100000);
  await page.goto('/'); await page.getByRole('link',{name:'Get started',exact:true}).click();
  await page.getByLabel('Their name').fill('Mira Example'); await page.getByLabel('Your relationship to them').fill('Daughter');
  await page.getByRole('button',{name:'Continue',exact:true}).click();
  await page.getByLabel('Or type your update').fill('Mira Example had a mild headache today morning and I noticed an allergy flare up today at 5 p.m.');
  const responsePromise=page.waitForResponse(r=>r.url().endsWith('/api/interpret'),{timeout:90000});
  await page.getByRole('button',{name:'Continue with text'}).click();
  const response=await responsePromise; expect(response.status()).toBe(200);
  const result=await response.json(); expect(result.observations).toHaveLength(2); expect(result.observations[1].evidence).toBe('Caregiver-observed'); expect(result.observations[1].timing.time).toBe('17:00');
  await expect(page.getByRole('button',{name:'Confirm observation 1'})).toBeEnabled();
  const captured=await page.getByText(/^Captured on /).textContent();
  await page.getByRole('button',{name:'Confirm observation 1'}).click(); await expect(page.getByRole('button',{name:'Save update',exact:true})).toBeDisabled();
  await page.getByRole('button',{name:'Confirm observation 2'}).click();
  await page.screenshot({path:'.impeccable/review/observations-live-mobile.png',fullPage:true});
  await page.getByRole('button',{name:'Save update',exact:true}).click();
  await expect(page.getByText('Not saved for next time')).toBeVisible(); await expect(page.getByText(/^Captured on /)).toHaveText(captured);
});

const { test, expect } = require('@playwright/test');

async function mockSession(page, { failSave = false } = {}) {
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
    return route.fulfill({ json: { status: 'ready', event: 'Mira Example said she felt tired today.', when: 'today', evidence: 'Patient-reported', question: '', message: '' } });
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

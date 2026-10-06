const { test, expect } = require('@playwright/test');
const path = require('node:path');

const live = process.env.CAPTURE_LIVE === '1';
const audioPath = process.env.CAPTURE_AUDIO;
test.use({ launchOptions: { args: [
  '--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream',
  ...(audioPath ? [`--use-file-for-fake-audio-capture=${path.resolve(audioPath)}`] : []),
] } });

const update = 'Mira Example felt dizzy after lunch today.';
const understood = { status: 'ready', event: update, when: 'after lunch today', evidence: 'Caregiver-observed', question: '', message: '' };

async function openCapture(page) {
  await page.goto('/');
  await page.getByRole('link', { name: 'Get started' }).click();
  await page.getByLabel('Their name').fill('Mira Example');
  await page.getByLabel('Your relationship to them').fill('Daughter');
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Tell me' })).toBeVisible();
  await expect(page.getByText('Voice and text capture are coming next.')).toHaveCount(0);
}

async function mockCapture(page, { transcriptionFailure = false, interpretationFailure = false } = {}) {
  const calls = [];
  await page.route('**/api/**', async route => {
    const request = route.request();
    const endpoint = new URL(request.url()).pathname;
    calls.push({ endpoint, body: request.postDataBuffer() });
    if (endpoint.endsWith('/transcribe')) {
      const wav = request.postDataBuffer();
      expect(wav.subarray(0, 4).toString()).toBe('RIFF');
      expect(wav.length).toBeGreaterThan(44);
      expect(wav.length).toBeLessThanOrEqual(960044);
      return route.fulfill({ status: transcriptionFailure ? 502 : 200, json: transcriptionFailure ? { error: 'Busy right now. Try again in a few minutes.' } : { text: update, source: 'voice' } });
    }
    if (endpoint.endsWith('/capture-text')) return route.fulfill({ json: { text: request.postDataJSON().text.trim(), source: 'text' } });
    if (endpoint.endsWith('/interpret')) return route.fulfill({ status: interpretationFailure ? 503 : 200, json: interpretationFailure ? { error: 'Busy right now. Try again in a few minutes.' } : understood });
    return route.abort();
  });
  return calls;
}

test('typed update goes through capture validation into interpretation, without saving or login', async ({ page }) => {
  const calls = await mockCapture(page);
  await openCapture(page);
  await page.getByRole('button', { name: 'Continue with text' }).click();
  await expect(page.getByRole('alert')).toHaveText('Type what happened before continuing.');
  await page.getByLabel('Or type your update').fill(update);
  await page.getByRole('button', { name: 'Continue with text' }).click();
  await expect(page.getByRole('heading', { name: 'Here’s what I understood' })).toBeVisible();
  expect(calls.map(call => call.endpoint)).toEqual(['/api/capture-text', '/api/interpret']);
  expect(JSON.parse(calls[1].body.toString()).text).toBe(update);
  expect(JSON.parse(calls[1].body.toString()).patient.name).toBe('Mira Example');
  await expect(page.getByText('Nothing has been saved.')).toBeVisible();
  await expect(page.getByRole('button', { name: /Save|Confirm|Log in/i })).toHaveCount(0);
  await page.getByRole('button', { name: 'Return to capture' }).click();
  await expect(page.getByLabel('Or type your update')).toHaveValue(update);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: '.impeccable/review/capture-mobile.png', fullPage: true });
  await page.setViewportSize({ width: 1440, height: 900 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: '.impeccable/review/capture-desktop.png', fullPage: true });
});

test('real browser recorder starts and stops, uploads WAV, then hands transcript to interpretation (provider responses mocked)', async ({ page }) => {
  const calls = await mockCapture(page);
  await openCapture(page);
  await page.getByRole('button', { name: 'Tell me' }).click();
  await expect(page.getByRole('status')).toHaveText('Listening…');
  await expect(page.getByText('1 / 30 seconds', { exact: true })).toBeVisible();
  expect(calls).toHaveLength(0);
  await page.getByRole('button', { name: 'Stop recording' }).click();
  await expect(page.getByRole('heading', { name: 'Here’s what I understood' })).toBeVisible();
  expect(calls.map(call => call.endpoint)).toEqual(['/api/transcribe', '/api/interpret']);
  expect(JSON.parse(calls[1].body.toString()).source).toBe('voice');
  expect(JSON.parse(calls[1].body.toString()).text).toBe(update);
});

test('transcription failure retains audio for retry and offers text fallback', async ({ page }) => {
  const calls = await mockCapture(page, { transcriptionFailure: true });
  await openCapture(page);
  await page.getByRole('button', { name: 'Tell me' }).click();
  await expect(page.getByText('1 / 30 seconds', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Stop recording' }).click();
  await expect(page.getByRole('alert')).toContainText('Busy right now.');
  await page.getByRole('button', { name: 'Try again' }).click();
  await expect(page.getByRole('alert')).toContainText('Busy right now.');
  expect(calls.filter(call => call.endpoint.endsWith('/transcribe'))).toHaveLength(2);
  expect(calls[0].body.equals(calls[1].body)).toBe(true);
  await expect(page.getByLabel('Or type your update')).toBeEnabled();
  await expect(page.getByRole('button', { name: 'Tell me' })).toBeEnabled();
});

test('unusable recording explains the problem and offers text without uploading', async ({ page }) => {
  const calls = await mockCapture(page);
  await page.addInitScript(() => {
    AudioContext.prototype.decodeAudioData = () => Promise.reject(new DOMException('Unusable recording', 'EncodingError'));
  });
  await openCapture(page);
  await page.getByRole('button', { name: 'Tell me' }).click();
  await expect(page.getByText('1 / 30 seconds', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Stop recording' }).click();
  await expect(page.getByRole('alert')).toHaveText('I couldn’t hear anything. Try again or type it instead.');
  await expect(page.getByLabel('Or type your update')).toBeEnabled();
  await expect(page.getByRole('button', { name: 'Tell me' })).toBeEnabled();
  expect(calls).toHaveLength(0);
});

test('interpretation failure preserves text and retry reuses the captured update', async ({ page }) => {
  const calls = await mockCapture(page, { interpretationFailure: true });
  await openCapture(page);
  await page.getByLabel('Or type your update').fill(update);
  await page.getByRole('button', { name: 'Continue with text' }).click();
  await expect(page.getByRole('alert')).toContainText('Busy right now.');
  await expect(page.getByLabel('Or type your update')).toHaveValue(update);
  await page.getByRole('button', { name: 'Try again' }).click();
  await expect(page.getByRole('alert')).toContainText('Busy right now.');
  expect(calls.map(call => call.endpoint)).toEqual(['/api/capture-text', '/api/interpret', '/api/interpret']);
});

test('changing patient details clears the old interpretation and rechecks the original update', async ({ page }) => {
  await mockCapture(page);
  await openCapture(page);
  await page.getByLabel('Or type your update').fill(update);
  await page.getByRole('button', { name: 'Continue with text' }).click();
  await expect(page.getByRole('heading', { name: 'Here’s what I understood' })).toBeVisible();
  await page.getByRole('link', { name: 'Back' }).click();
  await page.getByLabel('Their name').fill('Jamie Example');
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Here’s what I understood' })).toHaveCount(0);
  await expect(page.getByLabel('Or type your update')).toHaveValue(update);
  await page.route('**/api/interpret', route => {
    expect(route.request().postDataJSON().patient.name).toBe('Jamie Example');
    return route.fulfill({ json: { status: 'clarification', event: '', when: '', evidence: '', question: 'Is this update about Mira or Jamie?', message: '' } });
  });
  await page.getByRole('button', { name: 'Continue with text' }).click();
  await expect(page.getByText('Is this update about Mira or Jamie?')).toBeVisible();
});

test('blocked microphone offers text, and switching away releases recording without uploading', async ({ page }) => {
  const calls = await mockCapture(page);
  await page.addInitScript(() => {
    const getUserMedia = navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);
    let attempts = 0;
    navigator.mediaDevices.getUserMedia = (...args) => {
      if (++attempts === 1) return Promise.reject(new DOMException('Blocked', 'NotAllowedError'));
      return getUserMedia(...args).then(stream => { window.testStream = stream; return stream; });
    };
  });
  await openCapture(page);
  await page.getByRole('button', { name: 'Tell me' }).click();
  await expect(page.getByRole('alert')).toContainText('Microphone permission is required');
  await expect(page.getByLabel('Or type your update')).toBeEnabled();
  await page.getByRole('button', { name: 'Tell me' }).click();
  await expect(page.getByRole('status')).toHaveText('Listening…');
  await page.getByRole('button', { name: 'Switch to text' }).click();
  expect(await page.evaluate(() => window.testStream.getTracks().every(track => track.readyState === 'ended'))).toBe(true);
  expect(calls).toHaveLength(0);
  await expect(page.getByLabel('Or type your update')).toBeFocused();
});

test('30-second limit stops recording visibly and does not send a cut-off update', async ({ page }) => {
  test.setTimeout(45000);
  const calls = await mockCapture(page);
  await openCapture(page);
  await page.getByRole('button', { name: 'Tell me' }).click();
  await expect(page.getByRole('status')).toHaveText('Listening…');
  await expect(page.getByRole('alert')).toContainText('Recording stopped at the 30-second limit.', { timeout: 33000 });
  expect(calls).toHaveLength(0);
  await expect(page.getByRole('button', { name: 'Tell me' })).toBeEnabled();
  await expect(page.getByLabel('Or type your update')).toBeEnabled();
});

test('LIVE: typed health update reaches actual Convex and Sarvam interpretation', async ({ page }) => {
  test.skip(!live, 'Run with CAPTURE_LIVE=1 after server keys are configured.');
  test.setTimeout(100000);
  await openCapture(page);
  await page.getByLabel('Or type your update').fill(update);
  const interpretationResponse = page.waitForResponse(response => response.url().endsWith('/api/interpret'), { timeout: 90000 });
  await page.getByRole('button', { name: 'Continue with text' }).click();
  const response = await interpretationResponse;
  expect(response.status()).toBe(200);
  expect((await response.json()).evidence).toBe('Not specified');
  await expect(page.getByRole('heading', { name: 'Here’s what I understood' })).toBeVisible({ timeout: 90000 });
  await expect(page.getByText('Nothing has been saved.')).toBeVisible();
  await page.screenshot({ path: '.impeccable/review/capture-live-text.png', fullPage: true });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.setViewportSize({ width: 1440, height: 900 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test('LIVE: spoken fictional update reaches actual Sarvam transcription then interpretation', async ({ page }) => {
  test.skip(!live || !audioPath, 'Requires CAPTURE_LIVE=1 and CAPTURE_AUDIO pointing to fictional spoken WAV.');
  test.setTimeout(100000);
  const calls = [];
  page.on('response', response => { if (/\/api\/(transcribe|interpret)$/.test(response.url())) calls.push({ url: response.url(), status: response.status() }); });
  const transcriptResponse = page.waitForResponse(response => response.url().endsWith('/api/transcribe'), { timeout: 90000 });
  await openCapture(page);
  await page.getByRole('button', { name: 'Tell me' }).click();
  await expect(page.getByRole('status')).toHaveText('Listening…');
  await expect(page.getByText('6 / 30 seconds', { exact: true })).toBeVisible({ timeout: 9000 });
  const interpretationResponse = page.waitForResponse(response => response.url().endsWith('/api/interpret'), { timeout: 90000 });
  await page.getByRole('button', { name: 'Stop recording' }).click();
  const transcript = await (await transcriptResponse).json();
  if (process.env.CAPTURE_COLLOQUIAL === '1') {
    expect(transcript.text).toMatch(/\bpukish\b/i);
    expect(transcript.text).toMatch(/did not puke/i);
    expect(transcript.text).not.toMatch(/queasy|uneasy|vomit/i);
  }
  expect((await interpretationResponse).status()).toBe(200);
  await expect(page.getByRole('heading', { name: 'Here’s what I understood' })).toBeVisible({ timeout: 90000 });
  expect(calls.map(call => call.status)).toEqual([200, 200]);
  await page.screenshot({ path: '.impeccable/review/capture-live-voice.png', fullPage: true });
  await page.getByRole('button', { name: 'Edit details' }).click();
  await page.getByLabel('When', { exact: true }).fill('Today after lunch');
  await page.getByRole('button', { name: 'Apply changes' }).click();
  await expect(page.getByText('Today after lunch', { exact: true })).toBeVisible();
  await page.getByText('Your original update', { exact: true }).click();
  await expect(page.locator('.original-update')).toHaveText(transcript.text);
});

test('LIVE: Sarvam asks about unclear patient/timing, rejects off-topic input, and preserves uncertainty', async ({ page }) => {
  test.skip(!live, 'Requires the actual Sarvam backend.');
  test.setTimeout(150000);
  await openCapture(page);
  const cases = [
    { text: 'Alex Example felt dizzy today.', status: 'clarification' },
    { text: 'Mira Example felt dizzy last Monday or Tuesday; I am not sure which day.', status: 'clarification' },
    { text: 'What is the capital of France?', status: 'rejected' },
    { text: 'Should I double her blood pressure medicine?', status: 'rejected' },
    { text: 'Mira Example seems better today, but she did not report dizziness.', status: 'ready' },
  ];
  for (const item of cases) {
    await page.getByLabel('Or type your update').fill(item.text);
    const responsePromise = page.waitForResponse(response => response.url().endsWith('/api/interpret'), { timeout: 90000 });
    await page.getByRole('button', { name: 'Continue with text' }).click();
    const response = await responsePromise;
    expect(response.status()).toBe(200);
    const result = await response.json();
    expect(result.status).toBe(item.status);
    if (item.status === 'ready') {
      expect(result.event).toContain('seems better');
      expect(result.event).toContain('did not report dizziness');
      expect(item.text.includes(result.event)).toBe(true);
    } else if (item.status === 'clarification') {
      expect(result.question.trim().length).toBeGreaterThan(0);
      expect(result.event).toBe('');
    }
    await expect(page.getByText('Nothing has been saved.')).toBeVisible();
    await page.getByRole('button', { name: 'Return to capture' }).click();
  }
});

test('LIVE: voice interpretation formats explicit time but retains the original symptom wording', async ({ page }) => {
  test.skip(!live, 'Requires the actual Sarvam backend.');
  test.setTimeout(100000);
  const spoken = 'She felt pukish at ten a m yesterday, but did not puke.';
  await page.route('**/api/transcribe', route => route.fulfill({ json: { text: spoken, source: 'voice' } }));
  await openCapture(page);
  await page.getByRole('button', { name: 'Tell me' }).click();
  await expect(page.getByText('1 / 30 seconds', { exact: true })).toBeVisible();
  const responsePromise = page.waitForResponse(response => response.url().endsWith('/api/interpret'), { timeout: 90000 });
  await page.getByRole('button', { name: 'Stop recording' }).click();
  const response = await responsePromise;
  expect(response.status()).toBe(200);
  const result = await response.json();
  expect(result.event).toBe('She felt pukish at 10 a.m. yesterday, but did not puke.');
  expect(result.when).toContain('10 a.m.');
  await expect(page.getByRole('heading', { name: 'Here’s what I understood' })).toBeVisible();
  await page.getByText('Your original update', { exact: true }).click();
  await expect(page.locator('.original-update')).toHaveText(spoken);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test('review edits are applied, cancellation preserves previous details, and original update remains unchanged', async ({ page }) => {
  const calls = await mockCapture(page);
  await openCapture(page);
  await page.getByLabel('Or type your update').fill(update);
  await page.getByRole('button', { name: 'Continue with text' }).click();
  await page.getByRole('button', { name: 'Edit details' }).click();
  await page.getByLabel('What happened', { exact: true }).fill('Mira Example felt tired, not dizzy.');
  await page.getByLabel('When', { exact: true }).fill('Yesterday at 10 a.m.');
  await page.getByLabel('How do you know?').selectOption('Patient-reported');
  await page.screenshot({ path: '.impeccable/review/review-edit-mobile.png', fullPage: true });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.screenshot({ path: '.impeccable/review/review-edit-desktop.png', fullPage: true });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.getByRole('button', { name: 'Apply changes' }).click();
  await expect(page.getByText('Mira Example felt tired, not dizzy.', { exact: true })).toBeVisible();
  await expect(page.getByText('Yesterday at 10 a.m.', { exact: true })).toBeVisible();
  await expect(page.getByText('Patient-reported', { exact: true })).toBeVisible();
  await page.getByText('Your original update', { exact: true }).click();
  await expect(page.locator('details').filter({ has: page.getByText('Your original update', { exact: true }) }).locator('.original-update')).toHaveText(update);
  await page.getByRole('button', { name: 'Edit details' }).click();
  await page.getByLabel('What happened', { exact: true }).fill('Discard this change.');
  await page.getByRole('button', { name: 'Cancel editing' }).click();
  await expect(page.getByText('Mira Example felt tired, not dizzy.', { exact: true })).toBeVisible();
  await page.getByRole('link', { name: 'Back' }).click();
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  await expect(page.getByText('Mira Example felt tired, not dizzy.', { exact: true })).toBeVisible();
  expect(calls.map(call => call.endpoint)).toEqual(['/api/capture-text', '/api/interpret']);
  await expect(page.getByRole('button', { name: /Save|Confirm|Log in/i })).toHaveCount(0);
});

test('empty edits preserve entered timing, and failed AI offers manual editing', async ({ page }) => {
  await mockCapture(page, { interpretationFailure: true });
  await openCapture(page);
  await page.getByLabel('Or type your update').fill(update);
  await page.getByRole('button', { name: 'Continue with text' }).click();
  await page.getByRole('button', { name: 'Edit manually' }).click();
  await page.getByLabel('What happened', { exact: true }).fill('');
  await page.getByLabel('When', { exact: true }).fill('Yesterday');
  await page.getByRole('button', { name: 'Apply changes' }).click();
  await expect(page.getByRole('alert')).toHaveText('Describe what happened before applying your changes.');
  await expect(page.getByLabel('When', { exact: true })).toHaveValue('Yesterday');
  await page.getByLabel('What happened', { exact: true }).fill('Mira Example reported tiredness.');
  await page.getByRole('button', { name: 'Apply changes' }).click();
  await expect(page.getByText('Edited by you.')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Review your update' })).toBeVisible();
  await page.screenshot({ path: '.impeccable/review/review-manual-mobile.png', fullPage: true });
  await expect(page.getByText('Nothing has been saved.')).toBeVisible();
});

test('clarification requires an answer and retains the original update when interpretation is retried', async ({ page }) => {
  await mockCapture(page);
  let attempt = 0;
  await page.route('**/api/interpret', route => {
    const text = route.request().postDataJSON().text;
    if (++attempt === 1) return route.fulfill({ json: { status: 'clarification', event: '', when: '', evidence: '', question: 'What day did this happen?', message: '' } });
    expect(text).toContain('Clarification (What day did this happen?): Yesterday');
    return route.fulfill({ json: { ...understood, when: 'Yesterday' } });
  });
  await openCapture(page);
  await page.getByLabel('Or type your update').fill(update);
  await page.getByRole('button', { name: 'Continue with text' }).click();
  await page.getByRole('button', { name: 'Update interpretation' }).click();
  await expect(page.getByRole('alert')).toHaveText('Answer the question before continuing.');
  await page.getByLabel('Your answer').fill('Yesterday');
  await page.getByRole('button', { name: 'Update interpretation' }).click();
  await expect(page.getByRole('heading', { name: 'Here’s what I understood' })).toBeVisible();
  await page.getByText('Your original update', { exact: true }).click();
  await expect(page.locator('details').filter({ has: page.getByText('Your original update', { exact: true }) }).locator('.original-update')).toHaveText(update);
});

test('LIVE: unclear date can be answered and the resulting interpretation edited', async ({ page }) => {
  test.skip(!live, 'Requires the actual Sarvam backend.');
  test.setTimeout(150000);
  await openCapture(page);
  const original = 'Mira Example felt tired last Monday or Tuesday; I am not sure which day.';
  await page.getByLabel('Or type your update').fill(original);
  await page.getByRole('button', { name: 'Continue with text' }).click();
  await expect(page.getByLabel('Your answer')).toBeVisible({ timeout: 90000 });
  await page.getByLabel('Your answer').fill('It happened last Monday.');
  await page.getByRole('button', { name: 'Update interpretation' }).click();
  await expect(page.getByRole('button', { name: 'Edit details' })).toBeVisible({ timeout: 90000 });
  await expect(page.locator('dd').first()).toHaveText(original);
  await expect(page.getByText('Original observation', { exact: true })).toBeVisible();
  await expect(page.getByText('Clarified timing', { exact: true })).toBeVisible();
  await page.getByText('Your clarification', { exact: true }).click();
  await page.screenshot({ path: '.impeccable/review/review-clarification-mobile.png', fullPage: true });
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.screenshot({ path: '.impeccable/review/review-clarification-desktop.png', fullPage: true });
  await page.getByRole('button', { name: 'Edit details' }).click();
  await page.getByLabel('What happened', { exact: true }).fill('Mira Example felt tired.');
  await page.getByRole('button', { name: 'Apply changes' }).click();
  await expect(page.getByText('Mira Example felt tired.', { exact: true })).toBeVisible();
  await page.getByText('Your original update', { exact: true }).click();
  await expect(page.locator('details').filter({ has: page.getByText('Your original update', { exact: true }) }).locator('.original-update')).toHaveText(original);
});

test('unfinished review edits and clarification answers survive Back without saving', async ({ page }) => {
  await mockCapture(page);
  await openCapture(page);
  await page.getByLabel('Or type your update').fill(update);
  await page.getByRole('button', { name: 'Continue with text' }).click();
  await page.getByRole('button', { name: 'Edit details' }).click();
  await page.getByLabel('What happened', { exact: true }).fill('Mira Example reported tiredness.');
  await page.getByLabel('When', { exact: true }).fill('Yesterday');
  await page.getByRole('link', { name: 'Back' }).click();
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  await expect(page.getByLabel('What happened', { exact: true })).toHaveValue('Mira Example reported tiredness.');
  await expect(page.getByLabel('When', { exact: true })).toHaveValue('Yesterday');
  await page.getByRole('button', { name: 'Cancel editing' }).click();
  await expect(page.locator('dd').first()).toHaveText(update);
  await page.getByRole('button', { name: 'Return to capture' }).click();
  await page.route('**/api/interpret', route => route.fulfill({ json: { status: 'clarification', event: '', when: '', evidence: '', question: 'What day did this happen?', message: '' } }));
  await page.getByRole('button', { name: 'Continue with text' }).click();
  await page.getByLabel('Your answer').fill('Yesterday');
  await page.getByRole('link', { name: 'Back' }).click();
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  await expect(page.getByLabel('Your answer')).toHaveValue('Yesterday');
});

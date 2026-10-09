const { test, expect } = require('@playwright/test');
test.beforeEach(async ({ page }) => {
  await page.route('**/src/session.js*', route => route.fulfill({
    contentType: 'application/javascript',
    body: 'export function startSession(onChange) { onChange({isLoading:false,isAuthenticated:false}); }',
  }));
});
test('I can see the welcome page and start without signing up', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'A place for the details you want to remember.' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Start a health note' })).toBeVisible();
  await expect(page.getByRole('list', { name: 'How a health note works' })).toContainText('Say');
  await expect(page.getByRole('list', { name: 'How a health note works' })).toContainText('Check');
  await expect(page.getByRole('list', { name: 'How a health note works' })).toContainText('Save with an email code.');
  await expect(page.getByText('“BP was 142/88 this morning.”', {exact:true})).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: '.impeccable/review/mobile.png', fullPage: true });
  await page.getByRole('link', { name: 'Start a health note' }).click();
  await expect(page.getByRole('heading', { name: 'Who are you caring for?' })).toBeVisible();
  await expect(page.getByRole('textbox')).toHaveCount(2);
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Who are you caring for?' })).toBeVisible();
  await page.getByRole('link', { name: 'Back' }).click();
  await expect(page.getByRole('link', { name: 'Start a health note' })).toBeVisible();
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.screenshot({ path: '.impeccable/review/desktop.png', fullPage: true });
});

test('welcome illustration, start and returning sign-in work at every screen width', async ({ page }) => {
  await page.goto('/');
  const illustration = page.getByRole('img', {name:'Illustration of an adult daughter embracing her father.'});
  await expect(illustration).toBeVisible();
  await expect.poll(() => illustration.evaluate(img => img.complete && img.naturalWidth > 0)).toBe(true);
  for (const width of [320,390,768,1440]) {
    await page.setViewportSize({width,height:844});
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    const start = page.getByRole('link',{name:'Start a health note',exact:true});
    await start.focus();
    await expect(start).toBeFocused();
    expect(await start.evaluate(link => getComputedStyle(link).outlineStyle)).toBe('solid');
    expect((await start.boundingBox()).height).toBeGreaterThanOrEqual(44);
    await page.screenshot({path:`.impeccable/review/welcome-m23-${width}.png`,fullPage:true});
  }
  await page.getByRole('link',{name:'Already started? Sign in',exact:true}).click();
  await expect(page.getByLabel('Your email')).toBeVisible();
  await expect(page.getByLabel('Their name')).toHaveCount(0);
});

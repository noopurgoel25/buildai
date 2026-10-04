const { test, expect } = require('@playwright/test');
test('I can see the welcome page and start without signing up', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Remember what happens between doctor visits.' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Get started' })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: '.impeccable/review/mobile.png', fullPage: true });
  await page.getByRole('link', { name: 'Get started' }).click();
  await expect(page.getByRole('heading', { name: 'Who are you keeping track of?' })).toBeVisible();
  await expect(page.getByRole('textbox')).toHaveCount(2);
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Who are you keeping track of?' })).toBeVisible();
  await page.getByRole('link', { name: 'Back' }).click();
  await expect(page.getByRole('link', { name: 'Get started' })).toBeVisible();
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.screenshot({ path: '.impeccable/review/desktop.png', fullPage: true });
});

import { expect, test } from '@playwright/test';
const routes = ['/', '/giris', '/kayit', '/dayanak', '/yontem', '/plan'];
for (const route of routes) {
  test(`page ${route} renders without runtime exception or horizontal overflow`, async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', error => errors.push(error.message));
    const response = await page.goto(route, { waitUntil: 'domcontentloaded' });
    expect(response?.status()).toBeLessThan(500);
    await expect(page.locator('body')).toBeVisible();
    await expect(page.locator('body')).not.toBeEmpty();
    await page.waitForTimeout(500);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow).toBeLessThanOrEqual(2);
    expect(errors).toEqual([]);
  });
}
test('navigation to login page works', async ({ page }) => {
  await page.goto('/giris');
  await expect(page.locator('body')).toBeVisible();
});

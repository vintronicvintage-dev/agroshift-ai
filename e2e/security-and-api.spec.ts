import { expect, test } from '@playwright/test';

test.describe('API abuse and input validation (no upstream calls)', () => {
  for (const endpoint of ['/api/climate', '/api/soil', '/api/ndvi']) {
    for (const query of ['', '?lat=abc&lon=32', '?lat=95&lon=32', '?lat=37&lon=200']) {
      test(`${endpoint} rejects ${query || 'missing coordinates'}`, async ({ request }) => {
        const response = await request.get(endpoint + query);
        expect(response.status()).toBe(400);
        expect(response.headers()['content-type']).toContain('application/json');
      });
    }
  }

  test('field endpoint rejects malformed JSON', async ({ request }) => {
    const response = await request.post('/api/field', {
      data: '{broken',
      headers: { 'content-type': 'application/json' },
    });
    expect(response.status()).toBe(400);
  });

  test('field endpoint rejects unsupported part selector', async ({ request }) => {
    const response = await request.post('/api/field?parts=unsupported', {
      data: { lat: 37.57, lon: 32.78 },
    });
    expect(response.status()).toBe(400);
  });

  test('parcel engine rejects invalid coordinates', async ({ request }) => {
    const response = await request.post('/api/parcel-engine', {
      data: {
        lat: 'invalid', lon: 32.78, alan_dekar: 100,
        ekim_bicimi: 'aniza_dogrudan_ekim', sulama_bicimi: 'damla',
      },
    });
    expect(response.status()).toBe(400);
  });

  test('parcel engine rejects non-three-year rotations', async ({ request }) => {
    const response = await request.post('/api/parcel-engine', {
      data: {
        lat: 37.57, lon: 32.78, alan_dekar: 100,
        secilen_urunler: ['Bugday', 'Nohut'],
        ekim_bicimi: 'aniza_dogrudan_ekim', sulama_bicimi: 'damla',
      },
    });
    expect(response.status()).toBe(400);
  });
});

test.describe('Guest mode / authentication pages', () => {
  for (const route of ['/giris', '/kayit', '/sifre-sifirla', '/sifre-yenile']) {
    test(`${route} does not crash in guest mode`, async ({ page }) => {
      const errors: string[] = [];
      page.on('pageerror', error => errors.push(error.message));
      const response = await page.goto(route, { waitUntil: 'domcontentloaded' });
      expect(response?.status()).toBeLessThan(500);
      await expect(page.locator('body')).toBeVisible();
      await page.waitForTimeout(250);
      expect(errors).toEqual([]);
      expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(2);
    });
  }
});

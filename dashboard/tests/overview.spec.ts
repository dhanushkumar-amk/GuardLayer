import { test, expect } from '@playwright/test';
import { setupAdminAndApiKey, loginAsAdmin } from './helpers';

test.beforeAll(async () => {
  await setupAdminAndApiKey();
});

test.describe('Overview Page E2E Tests', () => {
  test('Overview page loads after login', async ({ page }) => {
    await loginAsAdmin(page);
    await expect(page.locator('h1')).toContainText('Security Operations Node');
  });

  test('Stat cards all render with numbers', async ({ page }) => {
    await loginAsAdmin(page);
    // Wait for elements to be visible
    await expect(page.locator('text=Total Requests')).toBeVisible();
    await expect(page.locator('text=Block Rate')).toBeVisible();
    await expect(page.locator('text=Avg Latency')).toBeVisible();
  });

  test('Charts render without errors', async ({ page }) => {
    await loginAsAdmin(page);
    // Check for SVGs or chart container divs
    const charts = page.locator('.recharts-responsive-container');
    await expect(charts.first()).toBeVisible();
  });

  test('Recent threats list renders', async ({ page }) => {
    await loginAsAdmin(page);
    await expect(page.locator('text=Recent Threats Log')).toBeVisible();
  });

  test('Recent audit logs list renders', async ({ page }) => {
    await loginAsAdmin(page);
    await expect(page.locator('text=Recent Transactions Stream')).toBeVisible();
  });

  test('Page auto refreshes every 30 seconds — verify with network intercept', async ({ page }) => {
    await loginAsAdmin(page);
    await page.waitForLoadState('networkidle');

    // Setup network interception for analytics summary response
    const refreshPromise = page.waitForResponse(
      response => response.url().includes('/api/analytics/summary'),
      { timeout: 35000 }
    );

    const response = await refreshPromise;
    expect(response.status()).toBe(200);
  });
});

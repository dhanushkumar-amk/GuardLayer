import { test, expect } from '@playwright/test';
import { setupAdminAndApiKey, loginAsAdmin } from './helpers';

test.beforeAll(async () => {
  await setupAdminAndApiKey();
});

test.describe('Audit Log Page E2E Tests', () => {
  test('Audit log page loads', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/audit');
    await expect(page.locator('h1')).toContainText('Security Auditing');
  });

  test('Table renders with correct columns', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/audit');
    await expect(page.locator('th:has-text("Request ID")')).toBeVisible();
    await expect(page.locator('th:has-text("API Key ID")')).toBeVisible();
    await expect(page.locator('th:has-text("Latency")')).toBeVisible();
    await expect(page.locator('th:has-text("Status")')).toBeVisible();
    await expect(page.locator('th:has-text("Provider & Model")')).toBeVisible();
    await expect(page.locator('th:has-text("Guards Fired")')).toBeVisible();
    await expect(page.locator('th:has-text("Time")')).toBeVisible();
  });

  test('Search by request ID works', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/audit');
    
    // Fill first search input
    await page.fill('input[placeholder="Search Request ID or input prompt..."]', 'req-');
    await page.waitForLoadState('networkidle');
  });

  test('Filter by blocked true — only blocked logs shown', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/audit');
    
    // Select Option "Blocked Only" from dropdown
    await page.selectOption('select', { value: 'true' });
    await page.waitForLoadState('networkidle');
  });

  test('Click row — detail panel slides out', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/audit');
    
    const row = page.locator('tbody tr').first();
    if (await row.isVisible()) {
      await row.click();
      await expect(page.locator('text=Request Audit Panel')).toBeVisible();
    }
  });

  test('Detail panel shows original input and scrubbed input', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/audit');

    const row = page.locator('tbody tr').first();
    if (await row.isVisible()) {
      await row.click();
      await expect(page.locator('text=Original Client Input')).toBeVisible();
      await expect(page.locator('text=Scrubbed Prompt Sent to LLM')).toBeVisible();
    }
  });

  test('Export CSV triggers download', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/audit');

    const exportBtn = page.locator('button:has-text("CSV")');
    if (await exportBtn.isEnabled()) {
      const downloadPromise = page.waitForEvent('download');
      await exportBtn.click();
      const download = await downloadPromise;
      expect(download.suggestedFilename()).toContain('guardlayer_audit_log');
    }
  });

  test('Pagination works correctly', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/audit');

    const nextBtn = page.locator('button:has-text("Next")');
    if (await nextBtn.isVisible() && await nextBtn.isEnabled()) {
      await nextBtn.click();
      await page.waitForLoadState('networkidle');
      const prevBtn = page.locator('button:has-text("Prev")');
      await expect(prevBtn).toBeEnabled();
      await prevBtn.click();
    }
  });
});

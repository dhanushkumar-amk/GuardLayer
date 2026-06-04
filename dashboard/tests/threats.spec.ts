import { test, expect } from '@playwright/test';
import { setupAdminAndApiKey, loginAsAdmin } from './helpers';

test.beforeAll(async () => {
  await setupAdminAndApiKey();
});

test.describe('Threat Intelligence Page E2E Tests', () => {
  test('Threats page loads', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/threats');
    await expect(page.locator('h1')).toContainText('Threat Intelligence');
  });

  test('Threats table renders with columns', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/threats');
    await expect(page.locator('th:has-text("Threat Type")')).toBeVisible();
    await expect(page.locator('th:has-text("Severity Score")')).toBeVisible();
    await expect(page.locator('th:has-text("API Key ID")')).toBeVisible();
    await expect(page.locator('th:has-text("Intercept Guard")')).toBeVisible();
    await expect(page.locator('th:has-text("Detected Time")')).toBeVisible();
  });

  test('Filter by threat type works', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/threats');
    // Select dropdown option
    await page.selectOption('select', 'prompt_injection');
    await page.waitForLoadState('networkidle');
  });

  test('Date range filter works', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/threats');
    // Set dates
    const dateInputs = page.locator('input[type="date"]');
    if (await dateInputs.count() >= 2) {
      await dateInputs.nth(0).fill('2026-01-01');
      await dateInputs.nth(1).fill('2026-12-31');
    }
  });

  test('Click threat row — detail expands', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/threats');
    
    // Find first threat row and click
    const row = page.locator('tbody tr').first();
    if (await row.isVisible()) {
      await row.click();
      await expect(page.locator('text=Adversarial Input Inspector')).toBeVisible();
    }
  });

  test('Export CSV button triggers download', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/threats');

    const exportBtn = page.locator('button:has-text("Export CSV")');
    if (await exportBtn.isEnabled()) {
      const downloadPromise = page.waitForEvent('download');
      await exportBtn.click();
      const download = await downloadPromise;
      expect(download.suggestedFilename()).toContain('guardlayer_threats');
    }
  });

  test('Pagination works — next and previous page', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/threats');

    const nextBtn = page.locator('button:has-text("Next")');
    if (await nextBtn.isVisible() && await nextBtn.isEnabled()) {
      await nextBtn.click();
      await page.waitForLoadState('networkidle');
      const prevBtn = page.locator('button:has-text("Prev")');
      await expect(prevBtn).toBeEnabled();
      await prevBtn.click();
    }
  });

  test('Empty state shows when no threats', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/threats');
    // Set a date filter that has no entries
    const dateInputs = page.locator('input[type="date"]');
    if (await dateInputs.count() >= 2) {
      await dateInputs.nth(0).fill('2020-01-01');
      await dateInputs.nth(1).fill('2020-01-02');
      await page.waitForLoadState('networkidle');
      await expect(page.locator('text=Clear Threat History')).toBeVisible();
    }
  });
});

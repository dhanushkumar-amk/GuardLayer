import { test, expect } from '@playwright/test';
import { setupAdminAndApiKey, loginAsAdmin } from './helpers';

test.beforeAll(async () => {
  await setupAdminAndApiKey();
});

test.describe('Authentication & Registration E2E Tests', () => {
  test('Visit login page — renders correctly', async ({ page }) => {
    await page.goto('/login');
    await expect(page.locator('h2')).toContainText('Sign in to gateway');
    await expect(page.locator('button:has-text("Sign In")')).toBeVisible();
  });

  test('Login with wrong credentials — error message appears', async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[label="Email address"]', 'wrong@guardlayer.dev');
    await page.fill('input[label="Password"]', 'wrong-pass');
    await page.click('button:has-text("Sign In")');
    await expect(page.locator('form div')).toContainText('Invalid email or password');
  });

  test('Login with correct credentials — redirected to overview', async ({ page }) => {
    await loginAsAdmin(page);
  });

  test('Visit login while authenticated — redirected to overview', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/login');
    await expect(page).toHaveURL('/overview');
  });

  test('Logout — redirected to login', async ({ page }) => {
    await loginAsAdmin(page);
    await page.click('button:has-text("Logout")');
    await expect(page).toHaveURL('/login');
  });

  test('Visit protected page while logged out — redirected to login', async ({ page }) => {
    await page.goto('/overview');
    await expect(page).toHaveURL('/login');
  });

  test('Register page renders correctly', async ({ page }) => {
    await page.goto('/register');
    await expect(page.locator('h2')).toContainText('Register Admin User');
    await expect(page.locator('button:has-text("Register Admin")')).toBeVisible();
  });

  test('Register with mismatched passwords — validation error shown', async ({ page }) => {
    await page.goto('/register');
    await page.fill('input[label="Email address"]', 'newadmin@guardlayer.dev');
    await page.fill('input[label="Password"]', 'Pass123!');
    await page.fill('input[label="Confirm Password"]', 'Pass1234!');
    await page.click('button:has-text("Register Admin")');
    await expect(page.locator('#register-error')).toContainText('Passwords do not match.');
  });

  test('Register when admin exists — warning banner shown', async ({ page }) => {
    await page.goto('/register');
    await page.fill('input[label="Email address"]', 'admin@guardlayer.dev');
    await page.fill('input[label="Password"]', 'Password123!');
    await page.fill('input[label="Confirm Password"]', 'Password123!');
    await page.click('button:has-text("Register Admin")');
    await expect(page.locator('#register-error')).toContainText('Registration blocked. Admin user already exists.');
  });
});

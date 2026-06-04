import { request, Page, expect } from '@playwright/test';

export async function setupAdminAndApiKey() {
  const apiContext = await request.newContext();
  
  // 1. Try to register admin user
  try {
    const regRes = await apiContext.post('http://localhost:8080/auth/register', {
      data: {
        email: 'admin@guardlayer.dev',
        password: 'Password123!'
      }
    });
    if (regRes.ok()) {
      console.log('Admin account registered.');
    }
  } catch (err) {
    // Ignore error if already registered
  }

  // 2. Login to get token
  let token = '';
  try {
    const loginRes = await apiContext.post('http://localhost:8080/api/auth/login', {
      data: {
        email: 'admin@guardlayer.dev',
        password: 'Password123!'
      }
    });
    if (loginRes.ok()) {
      const loginData = await loginRes.json();
      token = loginData.token;
    }
  } catch (err) {
    console.error('Login failed during setup:', err);
  }

  // 3. Create an API key if none exist
  if (token) {
    try {
      const keysRes = await apiContext.get('http://localhost:8080/api/keys', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (keysRes.ok()) {
        const keys = await keysRes.json();
        // Look for existing E2E testing key
        const exists = keys.some((k: any) => k.name === 'E2E Testing Key');
        if (!exists) {
          await apiContext.post('http://localhost:8080/api/keys', {
            data: { name: 'E2E Testing Key' },
            headers: { 'Authorization': `Bearer ${token}` }
          });
          console.log('E2E Testing Key created.');
        }
      }
    } catch (err) {
      console.error('Failed to create E2E API key:', err);
    }
  }

  await apiContext.dispose();
}

export async function loginAsAdmin(page: Page) {
  await page.goto('/login');
  await page.fill('input[type="email"]', 'admin@guardlayer.dev');
  await page.fill('input[type="password"]', 'Password123!');
  await page.click('button:has-text("Sign In")');
  await expect(page).toHaveURL('/overview');
}

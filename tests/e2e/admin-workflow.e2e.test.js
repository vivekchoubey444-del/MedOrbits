'use strict';
/**
 * MedOrbits -- Admin Workflow E2E Tests
 *
 * File: tests/e2e/admin-workflow.e2e.test.js
 *
 * Framework: Playwright Test
 *
 * Run:
 *   npx playwright test tests/e2e/admin-workflow.e2e.test.js
 *
 * Environment:
 *   E2E_BASE_URL
 *   E2E_ADMIN_EMAIL
 *   E2E_ADMIN_PASSWORD
 *   E2E_USER_EMAIL
 *   E2E_USER_PASSWORD
 *
 * Security:
 * - Use a dedicated test environment and synthetic test accounts.
 * - Never point destructive E2E tests at production.
 * - Do not hard-code credentials in this file.
 * - Configure the admin account and test data before running.
 */
const { test, expect } = require('@playwright/test');
const BASE_URL = (
  process.env.E2E_BASE_URL || 'http://127.0.0.1:3000'
).replace(/\/+$/, '');
const ADMIN_EMAIL = process.env.E2E_ADMIN_EMAIL;
const ADMIN_PASSWORD = process.env.E2E_ADMIN_PASSWORD;
const USER_EMAIL = process.env.E2E_USER_EMAIL;
const USER_PASSWORD = process.env.E2E_USER_PASSWORD;
const ROUTES = Object.freeze({
  login: process.env.E2E_LOGIN_PATH || '/login',
  dashboard: process.env.E2E_ADMIN_DASHBOARD_PATH || '/admin',
  users: process.env.E2E_ADMIN_USERS_PATH || '/admin/users',
  applications:
    process.env.E2E_ADMIN_APPLICATIONS_PATH || '/admin/applications',
});
const SELECTORS = Object.freeze({
  email: [
    'input[name="email"]',
    'input[type="email"]',
    '#email',
  ],
  password: [
    'input[name="password"]',
    'input[type="password"]',
    '#password',
  ],
  loginButton: [
    'button[type="submit"]',
    'button:has-text("Sign in")',
    'button:has-text("Log in")',
    'button:has-text("Login")',
  ],
  logoutButton: [
    'button:has-text("Log out")',
    'button:has-text("Logout")',
    'button:has-text("Sign out")',
    'a:has-text("Logout")',
    'a:has-text("Sign out")',
  ],
});
const TIMEOUTS = Object.freeze({
  navigation: 15000,
  action: 10000,
});
function requireEnvironmentVariable(value, name) {
  test.skip(
    !value,
    `Set ${name} to run this admin workflow test.`,
  );
}
async function firstVisibleLocator(page, selectors) {
  for (const selector of selectors) {
    const locator = page.locator(selector).first();
    if (await locator.isVisible().catch(() => false)) {
      return locator;
    }
  }
  throw new Error(
    `Could not find a visible element matching: ${selectors.join(', ')}`,
  );
}
async function login(page, email, password) {
  await page.goto(`${BASE_URL}${ROUTES.login}`);
  const emailInput = await firstVisibleLocator(
    page,
    SELECTORS.email,
  );
  const passwordInput = await firstVisibleLocator(
    page,
    SELECTORS.password,
  );
  await emailInput.fill(email);
  await passwordInput.fill(password);
  const loginButton = await firstVisibleLocator(
    page,
    SELECTORS.loginButton,
  );
  await Promise.all([
    page.waitForLoadState('domcontentloaded').catch(() => {}),
    loginButton.click(),
  ]);
  await expect(page).not.toHaveURL(
    new RegExp(`${ROUTES.login.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?:[/?#]|$)`),
    { timeout: TIMEOUTS.navigation },
  );
}
async function assertAccessDenied(page) {
  const currentUrl = page.url();
  const isLoginPage = new URL(currentUrl).pathname === ROUTES.login;
  const isForbiddenPage =
    /forbidden|unauthorized|access-denied|not-authorized/i.test(
      currentUrl,
    );
  const forbiddenMessage = page.getByText(
    /access denied|not authorized|forbidden|permission denied/i,
  ).first();
  const hasForbiddenMessage = await forbiddenMessage
    .isVisible()
    .catch(() => false);
  expect(
    isLoginPage || isForbiddenPage || hasForbiddenMessage,
    `Expected access to be denied, but the page was ${currentUrl}`,
  ).toBeTruthy();
}
test.describe('MedOrbits admin workflow', () => {
  test.beforeEach(async ({ page }) => {
    test.setTimeout(30000);
    await page.setViewportSize({
      width: 1440,
      height: 900,
    });
  });
  test('admin can sign in and open the admin dashboard', async ({
    page,
  }) => {
    requireEnvironmentVariable(ADMIN_EMAIL, 'E2E_ADMIN_EMAIL');
    requireEnvironmentVariable(
      ADMIN_PASSWORD,
      'E2E_ADMIN_PASSWORD',
    );
    await login(page, ADMIN_EMAIL, ADMIN_PASSWORD);
    await page.goto(`${BASE_URL}${ROUTES.dashboard}`);
    await expect(page).toHaveURL(
      new RegExp(
        `${ROUTES.dashboard.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?:[/?#]|$)`,
      ),
    );
    await expect(page.locator('body')).not.toContainText(
      /internal server error|uncaught exception/i,
    );
    await expect(page.locator('body')).toBeVisible();
  });
  test('unauthenticated visitors cannot access the admin dashboard', async ({
    page,
  }) => {
    await page.goto(`${BASE_URL}${ROUTES.dashboard}`);
    await expect
      .poll(
        async () => {
          const pathname = new URL(page.url()).pathname;
          if (pathname === ROUTES.login) {
            return 'redirected-to-login';
          }
          if (
            /forbidden|unauthorized|access-denied|not-authorized/i.test(
              page.url(),
            )
          ) {
            return 'forbidden';
          }
          const message = page.getByText(
            /access denied|not authorized|forbidden|please log in|sign in to continue/i,
          ).first();
          if (await message.isVisible().catch(() => false)) {
            return 'access-denied-message';
          }
          return 'unresolved';
        },
        { timeout: TIMEOUTS.navigation },
      )
      .not.toBe('unresolved');
  });
  test('admin can access user management', async ({ page }) => {
    requireEnvironmentVariable(ADMIN_EMAIL, 'E2E_ADMIN_EMAIL');
    requireEnvironmentVariable(
      ADMIN_PASSWORD,
      'E2E_ADMIN_PASSWORD',
    );
    await login(page, ADMIN_EMAIL, ADMIN_PASSWORD);
    await page.goto(`${BASE_URL}${ROUTES.users}`);
    await expect(page).toHaveURL(
      new RegExp(
        `${ROUTES.users.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?:[/?#]|$)`,
      ),
    );
    await expect(page.locator('body')).not.toContainText(
      /internal server error|uncaught exception/i,
    );
  });
  test('admin can access application review', async ({ page }) => {
    requireEnvironmentVariable(ADMIN_EMAIL, 'E2E_ADMIN_EMAIL');
    requireEnvironmentVariable(
      ADMIN_PASSWORD,
      'E2E_ADMIN_PASSWORD',
    );
    await login(page, ADMIN_EMAIL, ADMIN_PASSWORD);
    await page.goto(`${BASE_URL}${ROUTES.applications}`);
    await expect(page).toHaveURL(
      new RegExp(
        `${ROUTES.applications.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?:[/?#]|$)`,
      ),
    );
    await expect(page.locator('body')).not.toContainText(
      /internal server error|uncaught exception/i,
    );
  });
  test('ordinary user cannot access the admin dashboard', async ({
    page,
  }) => {
    requireEnvironmentVariable(USER_EMAIL, 'E2E_USER_EMAIL');
    requireEnvironmentVariable(
      USER_PASSWORD,
      'E2E_USER_PASSWORD',
    );
    await login(page, USER_EMAIL, USER_PASSWORD);
    await page.goto(`${BASE_URL}${ROUTES.dashboard}`);
    await assertAccessDenied(page);
  });
  test('ordinary user cannot access admin user management', async ({
    page,
  }) => {
    requireEnvironmentVariable(USER_EMAIL, 'E2E_USER_EMAIL');
    requireEnvironmentVariable(
      USER_PASSWORD,
      'E2E_USER_PASSWORD',
    );
    await login(page, USER_EMAIL, USER_PASSWORD);
    await page.goto(`${BASE_URL}${ROUTES.users}`);
    await assertAccessDenied(page);
  });
  test('ordinary user cannot access application administration', async ({
    page,
  }) => {
    requireEnvironmentVariable(USER_EMAIL, 'E2E_USER_EMAIL');
    requireEnvironmentVariable(
      USER_PASSWORD,
      'E2E_USER_PASSWORD',
    );
    await login(page, USER_EMAIL, USER_PASSWORD);
    await page.goto(`${BASE_URL}${ROUTES.applications}`);
    await assertAccessDenied(page);
  });
  test('admin session is not retained after logout', async ({ page }) => {
    requireEnvironmentVariable(ADMIN_EMAIL, 'E2E_ADMIN_EMAIL');
    requireEnvironmentVariable(
      ADMIN_PASSWORD,
      'E2E_ADMIN_PASSWORD',
    );
    await login(page, ADMIN_EMAIL, ADMIN_PASSWORD);
    const logoutButton = await firstVisibleLocator(
      page,
      SELECTORS.logoutButton,
    );
    await logoutButton.click();
    await expect
      .poll(
        async () => {
          const pathname = new URL(page.url()).pathname;
          if (pathname === ROUTES.login) {
            return 'logged-out';
          }
          if (/login|logout|signed-out/i.test(pathname)) {
            return 'logged-out';
          }
          const signedOutMessage = page.getByText(
            /you have been logged out|signed out successfully|logged out successfully/i,
          ).first();
          if (
            await signedOutMessage.isVisible().catch(() => false)
          ) {
            return 'logged-out';
          }
          return 'pending';
        },
        { timeout: TIMEOUTS.navigation },
      )
      .toBe('logged-out');
    await page.goto(`${BASE_URL}${ROUTES.dashboard}`);
    await expect
      .poll(
        async () => {
          const pathname = new URL(page.url()).pathname;
          if (pathname === ROUTES.login) {
            return 'protected';
          }
          if (
            /forbidden|unauthorized|access-denied|not-authorized/i.test(
              page.url(),
            )
          ) {
            return 'protected';
          }
          return 'not-yet-protected';
        },
        { timeout: TIMEOUTS.navigation },
      )
      .toBe('protected');
  });
  test('login page provides required credential inputs', async ({
    page,
  }) => {
    await page.goto(`${BASE_URL}${ROUTES.login}`);
    const emailInput = await firstVisibleLocator(
      page,
      SELECTORS.email,
    );
    const passwordInput = await firstVisibleLocator(
      page,
      SELECTORS.password,
    );
    await expect(emailInput).toBeVisible();
    await expect(passwordInput).toBeVisible();
    await expect(emailInput).toHaveAttribute('type', /email|text/);
    await expect(passwordInput).toHaveAttribute('type', 'password');
  });
  test('invalid credentials do not grant admin access', async ({
    page,
  }) => {
    await page.goto(`${BASE_URL}${ROUTES.login}`);
    const emailInput = await firstVisibleLocator(
      page,
      SELECTORS.email,
    );
    const passwordInput = await firstVisibleLocator(
      page,
      SELECTORS.password,
    );
    await emailInput.fill('invalid.admin@example.test');
    await passwordInput.fill('DefinitelyWrong!Password123');
    const loginButton = await firstVisibleLocator(
      page,
      SELECTORS.loginButton,
    );
    await loginButton.click();
    await expect
      .poll(
        async () => {
          const pathname = new URL(page.url()).pathname;
          const errorMessage = page.getByText(
            /invalid credentials|incorrect password|login failed|unable to sign in|invalid email or password/i,
          ).first();
          if (
            await errorMessage.isVisible().catch(() => false)
          ) {
            return 'rejected';
          }
          if (
            pathname === ROUTES.login ||
            pathname.startsWith(`${ROUTES.login}/`)
          ) {
            return 'still-on-login';
          }
          return 'unknown';
        },
        { timeout: TIMEOUTS.action },
      )
      .not.toBe('unknown');
    await page.goto(`${BASE_URL}${ROUTES.dashboard}`);
    await expect
      .poll(async () => {
        const pathname = new URL(page.url()).pathname;
        return pathname === ROUTES.login ||
          /forbidden|unauthorized|access-denied|not-authorized/i.test(
            page.url(),
          )
          ? 'protected'
          : 'unprotected';
      })
      .toBe('protected');
  });
});
'use strict';
/**
 * MedOrbits -- Authentication E2E Tests
 *
 * File: tests/e2e/authentication.e2e.test.js
 *
 * Framework: Playwright Test
 *
 * Run:
 *   npx playwright test tests/e2e/authentication.e2e.test.js
 *
 * Environment:
 *   E2E_BASE_URL
 *   E2E_LOGIN_PATH
 *   E2E_DASHBOARD_PATH
 *   E2E_USER_EMAIL
 *   E2E_USER_PASSWORD
 *
 * Optional:
 *   E2E_LOGOUT_PATH
 *   E2E_REGISTER_PATH
 *   E2E_PROTECTED_PATH
 *
 * Use only a dedicated test environment and synthetic accounts.
 */
const { test, expect } = require('@playwright/test');
const BASE_URL = (
  process.env.E2E_BASE_URL || 'http://127.0.0.1:3000'
).replace(/\/+$/, '');
const ROUTES = Object.freeze({
  login: process.env.E2E_LOGIN_PATH || '/login',
  dashboard: process.env.E2E_DASHBOARD_PATH || '/dashboard',
  logout: process.env.E2E_LOGOUT_PATH || null,
  register: process.env.E2E_REGISTER_PATH || '/register',
  protected: process.env.E2E_PROTECTED_PATH || '/dashboard',
});
const USER_EMAIL = process.env.E2E_USER_EMAIL;
const USER_PASSWORD = process.env.E2E_USER_PASSWORD;
const TIMEOUT = 15000;
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
  submit: [
    'button[type="submit"]',
    'input[type="submit"]',
    'button:has-text("Sign in")',
    'button:has-text("Log in")',
    'button:has-text("Login")',
  ],
  logout: [
    'button:has-text("Log out")',
    'button:has-text("Logout")',
    'button:has-text("Sign out")',
    'a:has-text("Log out")',
    'a:has-text("Logout")',
    'a:has-text("Sign out")',
  ],
  success: [
    '[data-testid="login-success"]',
    '[role="status"]:has-text("Welcome")',
  ],
  error: [
    '[role="alert"]',
    '[data-testid="login-error"]',
    '.error-message',
  ],
});
function skipIfMissing(value, name) {
  test.skip(!value, `Set ${name} to run this test.`);
}
function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
async function firstVisible(page, selectors) {
  for (const selector of selectors) {
    const locator = page.locator(selector).first();
    if (await locator.isVisible().catch(() => false)) {
      return locator;
    }
  }
  return null;
}
async function requiredVisible(page, selectors, description) {
  const locator = await firstVisible(page, selectors);
  if (!locator) {
    throw new Error(
      `Could not locate ${description}. ` +
      `Check the selectors against the MedOrbits interface.`,
    );
  }
  return locator;
}
async function openLoginPage(page) {
  await page.goto(`${BASE_URL}${ROUTES.login}`);
  await expect(page.locator('body')).toBeVisible();
}
async function submitCredentials(page, email, password) {
  const emailInput = await requiredVisible(
    page,
    SELECTORS.email,
    'login email field',
  );
  const passwordInput = await requiredVisible(
    page,
    SELECTORS.password,
    'login password field',
  );
  await emailInput.fill(email);
  await passwordInput.fill(password);
  const submitButton = await requiredVisible(
    page,
    SELECTORS.submit,
    'login submit button',
  );
  await submitButton.click();
}
async function expectNotAuthenticated(page) {
  const loginPath = new URL(`${BASE_URL}${ROUTES.login}`).pathname;
  await expect
    .poll(
      async () => {
        const currentPath = new URL(page.url()).pathname;
        if (
          currentPath === loginPath ||
          currentPath.startsWith(`${loginPath}/`)
        ) {
          return 'login';
        }
        if (
          /unauthorized|forbidden|access-denied|not-authorized/i.test(
            page.url(),
          )
        ) {
          return 'denied';
        }
        const error = page.getByText(
          /invalid credentials|incorrect password|login failed|unable to sign in|please log in|access denied|not authorized/i,
        ).first();
        if (await error.isVisible().catch(() => false)) {
          return 'error';
        }
        return 'pending';
      },
      { timeout: TIMEOUT },
    )
    .not.toBe('pending');
}
async function login(page, email, password) {
  await openLoginPage(page);
  await submitCredentials(page, email, password);
  await expect
    .poll(
      async () => {
        const loginPath = new URL(
          `${BASE_URL}${ROUTES.login}`,
        ).pathname;
        const currentPath = new URL(page.url()).pathname;
        if (
          currentPath !== loginPath &&
          !currentPath.startsWith(`${loginPath}/`)
        ) {
          return 'navigated';
        }
        const successMessage = page.getByText(
          /login successful|welcome back|signed in successfully/i,
        ).first();
        if (
          await successMessage.isVisible().catch(() => false)
        ) {
          return 'success';
        }
        return 'pending';
      },
      { timeout: TIMEOUT },
    )
    .not.toBe('pending');
}
async function logout(page) {
  if (ROUTES.logout) {
    await page.goto(`${BASE_URL}${ROUTES.logout}`);
    return;
  }
  const logoutControl = await firstVisible(
    page,
    SELECTORS.logout,
  );
  if (logoutControl) {
    await logoutControl.click();
    return;
  }
  throw new Error(
    'No logout control was found. Set E2E_LOGOUT_PATH or configure ' +
    'the logout selectors for the MedOrbits interface.',
  );
}
test.describe('MedOrbits authentication', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({
      width: 1365,
      height: 900,
    });
  });
  test('login page loads successfully', async ({ page }) => {
    await openLoginPage(page);
    await expect(
      await requiredVisible(
        page,
        SELECTORS.email,
        'login email field',
      ),
    ).toBeVisible();
    await expect(
      await requiredVisible(
        page,
        SELECTORS.password,
        'login password field',
      ),
    ).toBeVisible();
    await expect(
      await requiredVisible(
        page,
        SELECTORS.submit,
        'login submit button',
      ),
    ).toBeVisible();
  });
  test('password field masks entered characters', async ({ page }) => {
    await openLoginPage(page);
    const passwordInput = await requiredVisible(
      page,
      SELECTORS.password,
      'login password field',
    );
    await expect(passwordInput).toHaveAttribute(
      'type',
      'password',
    );
  });
  test('empty credentials are rejected by form validation', async ({
    page,
  }) => {
    await openLoginPage(page);
    const emailInput = await requiredVisible(
      page,
      SELECTORS.email,
      'login email field',
    );
    const passwordInput = await requiredVisible(
      page,
      SELECTORS.password,
      'login password field',
    );
    const submitButton = await requiredVisible(
      page,
      SELECTORS.submit,
      'login submit button',
    );
    await submitButton.click();
    const validation = await Promise.all([
      emailInput.evaluate((element) => ({
        required: element.required,
        valid: element.checkValidity(),
        valueMissing: element.validity.valueMissing,
      })),
      passwordInput.evaluate((element) => ({
        required: element.required,
        valid: element.checkValidity(),
        valueMissing: element.validity.valueMissing,
      })),
    ]);
    const browserValidationBlocks =
      validation.some(
        (field) => field.required && !field.valid,
      );
    const errorMessage = page.getByText(
      /email is required|password is required|enter your email|enter your password|required field/i,
    ).first();
    const hasError = await errorMessage
      .isVisible()
      .catch(() => false);
    expect(
      browserValidationBlocks || hasError,
      'Empty login should be blocked by client-side validation.',
    ).toBeTruthy();
  });
  test('invalid credentials do not authenticate a user', async ({
    page,
  }) => {
    await openLoginPage(page);
    await submitCredentials(
      page,
      'invalid.user@example.test',
      'WrongTestOnly!Password999',
    );
    await expectNotAuthenticated(page);
    const currentPath = new URL(page.url()).pathname;
    expect(
      currentPath === new URL(`${BASE_URL}${ROUTES.dashboard}`).pathname,
      'Invalid credentials must not grant access to the dashboard.',
    ).toBe(false);
  });
  test('valid test-user credentials authenticate successfully', async ({
    page,
  }) => {
    skipIfMissing(USER_EMAIL, 'E2E_USER_EMAIL');
    skipIfMissing(USER_PASSWORD, 'E2E_USER_PASSWORD');
    await login(page, USER_EMAIL, USER_PASSWORD);
    await expect(page.locator('body')).not.toContainText(
      /internal server error|uncaught exception/i,
    );
  });
  test('authenticated user can access a protected route', async ({
    page,
  }) => {
    skipIfMissing(USER_EMAIL, 'E2E_USER_EMAIL');
    skipIfMissing(USER_PASSWORD, 'E2E_USER_PASSWORD');
    await login(page, USER_EMAIL, USER_PASSWORD);
    await page.goto(`${BASE_URL}${ROUTES.protected}`);
    const loginPath = new URL(
      `${BASE_URL}${ROUTES.login}`,
    ).pathname;
    await expect(page).not.toHaveURL(
      new RegExp(
        `${escapeRegExp(loginPath)}(?:[/?#]|$)`,
      ),
    );
  });
  test('unauthenticated user is redirected or denied on protected route', async ({
    page,
  }) => {
    await page.goto(`${BASE_URL}${ROUTES.protected}`);
    await expectNotAuthenticated(page);
  });
  test('logout ends access to protected pages', async ({ page }) => {
    skipIfMissing(USER_EMAIL, 'E2E_USER_EMAIL');
    skipIfMissing(USER_PASSWORD, 'E2E_USER_PASSWORD');
    await login(page, USER_EMAIL, USER_PASSWORD);
    await logout(page);
    await page.goto(`${BASE_URL}${ROUTES.protected}`);
    await expectNotAuthenticated(page);
  });
  test('refreshing a protected page preserves a valid session', async ({
    page,
  }) => {
    skipIfMissing(USER_EMAIL, 'E2E_USER_EMAIL');
    skipIfMissing(USER_PASSWORD, 'E2E_USER_PASSWORD');
    await login(page, USER_EMAIL, USER_PASSWORD);
    await page.goto(`${BASE_URL}${ROUTES.protected}`);
    await page.reload();
    const loginPath = new URL(
      `${BASE_URL}${ROUTES.login}`,
    ).pathname;
    await expect(page).not.toHaveURL(
      new RegExp(
        `${escapeRegExp(loginPath)}(?:[/?#]|$)`,
      ),
    );
  });
  test('registration page loads when registration is enabled', async ({
    page,
  }) => {
    await page.goto(`${BASE_URL}${ROUTES.register}`);
    const status = await page.evaluate(() => ({
      path: window.location.pathname,
      title: document.title,
      bodyText: document.body.innerText,
    }));
    const registrationAvailable =
      status.path === ROUTES.register ||
      /register|create account|sign up/i.test(status.bodyText);
    const registrationDisabled =
      /404|not found|registration is disabled/i.test(
        status.bodyText,
      );
    test.skip(
      !registrationAvailable && registrationDisabled,
      'Registration is not enabled on this deployment.',
    );
    expect(
      registrationAvailable,
      'Expected a registration page or a registration-disabled response.',
    ).toBe(true);
  });
  test('login failure does not reveal internal server details', async ({
    page,
  }) => {
    await openLoginPage(page);
    await submitCredentials(
      page,
      'unknown.user@example.test',
      'WrongTestOnly!Password999',
    );
    await expectNotAuthenticated(page);
    await expect(page.locator('body')).not.toContainText(
      /stack trace|database connection string|sqlstate|password hash|secret key|node_modules\/.*\.js/i,
    );
  });
});
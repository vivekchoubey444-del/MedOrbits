'use strict';
/**
 * MedOrbits -- Payment Checkout E2E Tests
 *
 * File: tests/e2e/payment-checkout.e2e.test.js
 *
 * Framework: Playwright Test
 *
 * Run:
 *   npx playwright test tests/e2e/payment-checkout.e2e.test.js
 *
 * Environment:
 *   E2E_BASE_URL
 *   E2E_CHECKOUT_PATH
 *   E2E_LOGIN_PATH
 *   E2E_USER_EMAIL
 *   E2E_USER_PASSWORD
 *
 * Optional:
 *   E2E_CHECKOUT_REQUIRES_AUTH=true
 *   E2E_PAYMENT_MODE=mock
 *
 * Security:
 * - Use a dedicated test environment.
 * - Use provider sandbox credentials or a deterministic mock.
 * - Never use live payment credentials or real card details.
 * - A browser redirect or success message alone does not prove a payment
 *   has been verified by the server.
 * - Verify payment status and amount server-side in integration tests.
 */
const { test, expect } = require('@playwright/test');
const BASE_URL = (
  process.env.E2E_BASE_URL || 'http://127.0.0.1:3000'
).replace(/\/+$/, '');
const ROUTES = Object.freeze({
  checkout: process.env.E2E_CHECKOUT_PATH || '/checkout',
  login: process.env.E2E_LOGIN_PATH || '/login',
});
const USER_EMAIL = process.env.E2E_USER_EMAIL;
const USER_PASSWORD = process.env.E2E_USER_PASSWORD;
const REQUIRES_AUTH =
  process.env.E2E_CHECKOUT_REQUIRES_AUTH === 'true';
const PAYMENT_MODE = process.env.E2E_PAYMENT_MODE || 'mock';
const TIMEOUT = 15000;
const SELECTORS = Object.freeze({
  checkoutForm: [
    'form[data-testid="checkout-form"]',
    'form#checkout-form',
    'form[name="checkout"]',
    'form',
  ],
  amount: [
    '[data-testid="checkout-amount"]',
    '[data-testid="payment-amount"]',
    '[name="amount"]',
    '#amount',
    '.checkout-amount',
  ],
  currency: [
    '[data-testid="checkout-currency"]',
    '[name="currency"]',
    '#currency',
  ],
  description: [
    '[data-testid="checkout-description"]',
    '[name="description"]',
    '#description',
    '.checkout-description',
  ],
  submit: [
    'button[data-testid="pay-button"]',
    'button[type="submit"]',
    'button:has-text("Pay now")',
    'button:has-text("Pay Now")',
    'button:has-text("Proceed to payment")',
    'button:has-text("Continue to payment")',
  ],
  success: [
    '[data-testid="payment-success"]',
    '[role="status"]',
    '.payment-success',
  ],
  failure: [
    '[data-testid="payment-error"]',
    '[role="alert"]',
    '.payment-error',
  ],
  cancel: [
    'a:has-text("Cancel")',
    'button:has-text("Cancel payment")',
    'button:has-text("Cancel Payment")',
  ],
});
function skipIfMissing(value, name) {
  test.skip(!value, `Set ${name} to run this test.`);
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
      'Update the selectors to match the MedOrbits checkout interface.',
    );
  }
  return locator;
}
function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
async function login(page) {
  await page.goto(`${BASE_URL}${ROUTES.login}`);
  const email = await requiredVisible(
    page,
    ['input[name="email"]', 'input[type="email"]', '#email'],
    'login email field',
  );
  const password = await requiredVisible(
    page,
    ['input[name="password"]', 'input[type="password"]', '#password'],
    'login password field',
  );
  await email.fill(USER_EMAIL);
  await password.fill(USER_PASSWORD);
  const submit = await requiredVisible(
    page,
    [
      'button[type="submit"]',
      'button:has-text("Sign in")',
      'button:has-text("Log in")',
      'button:has-text("Login")',
    ],
    'login submit button',
  );
  await submit.click();
  await expect(page).not.toHaveURL(
    new RegExp(
      `${escapeRegExp(ROUTES.login)}(?:[/?#]|$)`,
    ),
    { timeout: TIMEOUT },
  );
}
async function openCheckout(page) {
  await page.goto(`${BASE_URL}${ROUTES.checkout}`);
  if (REQUIRES_AUTH) {
    const loginPath = new URL(
      `${BASE_URL}${ROUTES.login}`,
    ).pathname;
    await expect(page).toHaveURL(
      new RegExp(
        `${escapeRegExp(loginPath)}(?:[/?#]|$)`,
      ),
      { timeout: TIMEOUT },
    );
    skipIfMissing(USER_EMAIL, 'E2E_USER_EMAIL');
    skipIfMissing(USER_PASSWORD, 'E2E_USER_PASSWORD');
    await login(page);
    await page.goto(`${BASE_URL}${ROUTES.checkout}`);
  }
  await expect(page.locator('body')).toBeVisible();
}
async function readAmount(page) {
  const amountElement = await firstVisible(page, SELECTORS.amount);
  if (amountElement) {
    const text = await amountElement.textContent();
    if (text && text.trim()) {
      return text.trim();
    }
    const value = await amountElement.inputValue().catch(() => '');
    if (value) {
      return value;
    }
  }
  return null;
}
async function expectPaymentFeedback(page) {
  await expect
    .poll(
      async () => {
        const success = page.getByText(
          /payment successful|payment completed|payment received|checkout complete/i,
        ).first();
        if (await success.isVisible().catch(() => false)) {
          return 'success';
        }
        const failure = page.getByText(
          /payment failed|payment declined|payment cancelled|payment canceled|unable to process payment/i,
        ).first();
        if (await failure.isVisible().catch(() => false)) {
          return 'failure';
        }
        const successRoute =
          /payment\/success|checkout\/success|payment-success/i.test(
            new URL(page.url()).pathname,
          );
        if (successRoute) {
          return 'success-route';
        }
        const failureRoute =
          /payment\/failed|payment\/cancel|checkout\/cancel/i.test(
            new URL(page.url()).pathname,
          );
        if (failureRoute) {
          return 'failure-route';
        }
        return 'pending';
      },
      { timeout: TIMEOUT },
    )
    .not.toBe('pending');
}
test.describe('MedOrbits payment checkout', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({
      width: 1365,
      height: 900,
    });
  });
  test('checkout page loads without a server error', async ({ page }) => {
    await openCheckout(page);
    await expect(page.locator('body')).not.toContainText(
      /internal server error|uncaught exception/i,
    );
  });
  test('checkout displays a payment amount', async ({ page }) => {
    await openCheckout(page);
    const amount = await readAmount(page);
    expect(
      amount,
      'The checkout should display an amount using a configured selector.',
    ).not.toBeNull();
    expect(amount.trim()).not.toBe('');
  });
  test('checkout displays a valid non-negative payment amount', async ({
    page,
  }) => {
    await openCheckout(page);
    const amountText = await readAmount(page);
    test.skip(
      !amountText,
      'No checkout amount is exposed by the configured selectors.',
    );
    const normalized = amountText.replace(/,/g, '');
    const match = normalized.match(/-?\d+(?:\.\d{1,2})?/);
    expect(
      match,
      `Could not parse a monetary amount from "${amountText}".`,
    ).not.toBeNull();
    const amount = Number(match[0]);
    expect(Number.isFinite(amount)).toBe(true);
    expect(amount).toBeGreaterThanOrEqual(0);
  });
  test('checkout provides a payment action', async ({ page }) => {
    await openCheckout(page);
    const submit = await requiredVisible(
      page,
      SELECTORS.submit,
      'checkout payment button',
    );
    await expect(submit).toBeVisible();
    await expect(submit).toBeEnabled();
  });
  test('checkout does not expose secrets in rendered content', async ({
    page,
  }) => {
    await openCheckout(page);
    await expect(page.locator('body')).not.toContainText(
      /secret key|private key|webhook signing secret|database connection string|password hash/i,
    );
    const bodyText = await page.locator('body').innerText();
    expect(bodyText).not.toMatch(
      /\bsk_live_[A-Za-z0-9]+\b|\brk_live_[A-Za-z0-9]+\b/,
    );
  });
  test('checkout form prevents empty required fields', async ({
    page,
  }) => {
    await openCheckout(page);
    const form = await firstVisible(page, SELECTORS.checkoutForm);
    test.skip(
      !form,
      'No checkout form is exposed. The payment action may be provider-hosted.',
    );
    const submit = await firstVisible(page, SELECTORS.submit);
    test.skip(
      !submit,
      'No checkout submit control is available.',
    );
    await submit.click();
    const requiredInputs = form.locator(
      'input[required], select[required], textarea[required]',
    );
    const invalidCount = await requiredInputs.evaluateAll(
      (elements) =>
        elements.filter((element) => !element.checkValidity()).length,
    );
    const error = page.getByText(
      /required field|please enter|please select|complete this field/i,
    ).first();
    const hasError = await error.isVisible().catch(() => false);
    expect(
      invalidCount > 0 || hasError,
      'Expected checkout validation to block an empty submission.',
    ).toBeTruthy();
  });
  test('cancel action does not display a successful payment result', async ({
    page,
  }) => {
    await openCheckout(page);
    const cancel = await firstVisible(page, SELECTORS.cancel);
    test.skip(
      !cancel,
      'No cancellation control exists on this checkout screen.',
    );
    await cancel.click();
    const successMessage = page.getByText(
      /payment successful|payment completed|payment received/i,
    ).first();
    await expect(successMessage).toHaveCount(0);
  });
  test('repeated payment clicks do not crash the checkout interface', async ({
    page,
  }) => {
    await openCheckout(page);
    const submit = await requiredVisible(
      page,
      SELECTORS.submit,
      'checkout payment button',
    );
    await submit.click();
    if (
      await submit.isVisible().catch(() => false) &&
      !(await submit.isDisabled().catch(() => false))
    ) {
      await submit.click().catch(() => {});
    }
    await expect(page.locator('body')).not.toContainText(
      /uncaught exception|application crashed/i,
    );
  });
  test('payment feedback does not expose internal error details', async ({
    page,
  }) => {
    await openCheckout(page);
    await expect(page.locator('body')).not.toContainText(
      /stack trace|sqlstate|database connection string|password hash|webhook signing secret/i,
    );
  });
  test('payment mode is explicitly configured for non-live testing', async () => {
    expect(
      ['mock', 'sandbox'].includes(PAYMENT_MODE),
      'E2E_PAYMENT_MODE must be "mock" or "sandbox". Live payment testing is prohibited.',
    ).toBe(true);
  });
  test('unauthenticated users cannot access a protected checkout', async ({
    page,
  }) => {
    test.skip(
      !REQUIRES_AUTH,
      'Set E2E_CHECKOUT_REQUIRES_AUTH=true if checkout requires authentication.',
    );
    await page.goto(`${BASE_URL}${ROUTES.checkout}`);
    const loginPath = new URL(
      `${BASE_URL}${ROUTES.login}`,
    ).pathname;
    await expect(page).toHaveURL(
      new RegExp(
        `${escapeRegExp(loginPath)}(?:[/?#]|$)`,
      ),
      { timeout: TIMEOUT },
    );
  });
});
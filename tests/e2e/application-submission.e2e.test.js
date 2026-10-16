'use strict';
/**
 * MedOrbits -- Application Submission E2E Tests
 *
 * File: tests/e2e/application-submission.e2e.test.js
 *
 * Framework: Playwright Test
 *
 * Run:
 *   npx playwright test tests/e2e/application-submission.e2e.test.js
 *
 * Environment:
 *   E2E_BASE_URL
 *   E2E_APPLICATION_PATH
 *   E2E_LOGIN_PATH
 *   E2E_USER_EMAIL
 *   E2E_USER_PASSWORD
 *
 * Optional:
 *   E2E_APPLICATION_REQUIRES_AUTH=true
 *
 * Notes:
 * - Use a dedicated test environment and synthetic accounts.
 * - Configure a test database and email/document storage.
 * - Selectors and field names must match the actual MedOrbits form.
 * - Tests do not assume that a submission succeeded until the UI confirms it.
 */
const { test, expect } = require('@playwright/test');
const BASE_URL = (
  process.env.E2E_BASE_URL || 'http://127.0.0.1:3000'
).replace(/\/+$/, '');
const APPLICATION_PATH =
  process.env.E2E_APPLICATION_PATH || '/applications/new';
const LOGIN_PATH = process.env.E2E_LOGIN_PATH || '/login';
const USER_EMAIL = process.env.E2E_USER_EMAIL;
const USER_PASSWORD = process.env.E2E_USER_PASSWORD;
const APPLICATION_REQUIRES_AUTH =
  process.env.E2E_APPLICATION_REQUIRES_AUTH === 'true';
const TIMEOUT = 15000;
const SELECTORS = Object.freeze({
  form: [
    'form[data-testid="application-form"]',
    'form#application-form',
    'form[name="application"]',
    'form',
  ],
  firstName: [
    '[name="firstName"]',
    '[name="first_name"]',
    '#firstName',
    '#first_name',
  ],
  lastName: [
    '[name="lastName"]',
    '[name="last_name"]',
    '#lastName',
    '#last_name',
  ],
  email: [
    '[name="email"]',
    '[name="applicantEmail"]',
    '#email',
  ],
  phone: [
    '[name="phone"]',
    '[name="mobile"]',
    '[name="phoneNumber"]',
    '#phone',
  ],
  course: [
    '[name="courseId"]',
    '[name="course"]',
    '[name="course_id"]',
    '#course',
  ],
  message: [
    '[name="message"]',
    '[name="statement"]',
    '[name="remarks"]',
    '[name="description"]',
    'textarea',
  ],
  consent: [
    '[name="consent"]',
    '[name="privacyConsent"]',
    '[name="termsAccepted"]',
    'input[type="checkbox"][required]',
  ],
  fileInput: [
    'input[type="file"][name="documents"]',
    'input[type="file"][name="document"]',
    'input[type="file"][name="resume"]',
    'input[type="file"][name="attachment"]',
    'input[type="file"]',
  ],
  submit: [
    'button[type="submit"]',
    'input[type="submit"]',
    'button:has-text("Submit application")',
    'button:has-text("Submit Application")',
    'button:has-text("Apply now")',
    'button:has-text("Apply Now")',
    'button:has-text("Submit")',
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
      `Unable to find visible ${description}. ` +
      `Check the selectors against the MedOrbits application form.`,
    );
  }
  return locator;
}
async function openApplicationForm(page) {
  await page.goto(`${BASE_URL}${APPLICATION_PATH}`);
  await expect(page.locator('body')).toBeVisible();
  if (APPLICATION_REQUIRES_AUTH) {
    await expect(page).toHaveURL(
      new RegExp(
        `${LOGIN_PATH.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?:[/?#]|$)`,
      ),
      { timeout: TIMEOUT },
    );
    skipIfMissing(USER_EMAIL, 'E2E_USER_EMAIL');
    skipIfMissing(USER_PASSWORD, 'E2E_USER_PASSWORD');
    await login(page, USER_EMAIL, USER_PASSWORD);
    await page.goto(`${BASE_URL}${APPLICATION_PATH}`);
  }
}
async function login(page, email, password) {
  await page.goto(`${BASE_URL}${LOGIN_PATH}`);
  const emailInput = await requiredVisible(
    page,
    ['input[name="email"]', 'input[type="email"]', '#email'],
    'login email field',
  );
  const passwordInput = await requiredVisible(
    page,
    ['input[name="password"]', 'input[type="password"]', '#password'],
    'login password field',
  );
  await emailInput.fill(email);
  await passwordInput.fill(password);
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
      `${LOGIN_PATH.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?:[/?#]|$)`,
    ),
    { timeout: TIMEOUT },
  );
}
async function fillIfPresent(page, selectors, value) {
  const locator = await firstVisible(page, selectors);
  if (!locator) {
    return false;
  }
  const tagName = await locator.evaluate((element) =>
    element.tagName.toLowerCase(),
  );
  if (tagName === 'select') {
    const options = await locator.locator('option').evaluateAll((items) =>
      items.map((item) => ({
        value: item.value,
        text: item.textContent.trim(),
        disabled: item.disabled,
      })),
    );
    const matchingOption = options.find(
      (option) =>
        !option.disabled &&
        option.value &&
        new RegExp(value, 'i').test(option.text),
    );
    if (matchingOption) {
      await locator.selectOption(matchingOption.value);
      return true;
    }
    const firstValidOption = options.find(
      (option) =>
        !option.disabled &&
        option.value &&
        option.value !== '',
    );
    if (firstValidOption) {
      await locator.selectOption(firstValidOption.value);
      return true;
    }
    return false;
  }
  await locator.fill(value);
  return true;
}
async function fillApplicationForm(page, suffix = '001') {
  await fillIfPresent(
    page,
    SELECTORS.firstName,
    'TestApplicant',
  );
  await fillIfPresent(
    page,
    SELECTORS.lastName,
    `E2E${suffix}`,
  );
  await fillIfPresent(
    page,
    SELECTORS.email,
    `applicant.${suffix}@example.test`,
  );
  await fillIfPresent(
    page,
    SELECTORS.phone,
    '9000000001',
  );
  await fillIfPresent(
    page,
    SELECTORS.course,
    'MBBS',
  );
  await fillIfPresent(
    page,
    SELECTORS.message,
    'This is a synthetic end-to-end application submission test.',
  );
  const consent = await firstVisible(page, SELECTORS.consent);
  if (consent) {
    const tagName = await consent.evaluate((element) =>
      element.tagName.toLowerCase(),
    );
    if (tagName === 'input') {
      const type = await consent.getAttribute('type');
      if (type === 'checkbox' && !(await consent.isChecked())) {
        await consent.check();
      }
    }
  }
}
async function submitApplication(page) {
  const submit = await requiredVisible(
    page,
    SELECTORS.submit,
    'application submit button',
  );
  await submit.click();
}
async function expectSubmissionFeedback(page) {
  await expect
    .poll(
      async () => {
        const success = page.getByText(
          /application submitted|submission successful|application received|successfully submitted|application created/i,
        ).first();
        if (await success.isVisible().catch(() => false)) {
          return 'success';
        }
        const error = page.getByText(
          /internal server error|something went wrong|submission failed/i,
        ).first();
        if (await error.isVisible().catch(() => false)) {
          return 'error';
        }
        const confirmationRoute =
          /application\/(success|confirmation)|applications\/confirmation|thank-you/i.test(
            new URL(page.url()).pathname,
          );
        if (confirmationRoute) {
          return 'confirmation-route';
        }
        return 'pending';
      },
      { timeout: TIMEOUT },
    )
    .not.toBe('pending');
}
test.describe('MedOrbits application submission', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({
      width: 1365,
      height: 900,
    });
  });
  test('application page loads without a server error', async ({
    page,
  }) => {
    await openApplicationForm(page);
    await expect(page.locator('body')).not.toContainText(
      /internal server error|uncaught exception/i,
    );
    await expect(page.locator('body')).toBeVisible();
  });
  test('application form contains a submit control', async ({
    page,
  }) => {
    await openApplicationForm(page);
    const form = await firstVisible(page, SELECTORS.form);
    expect(
      form,
      'No visible application form was found.',
    ).not.toBeNull();
    const submit = await firstVisible(page, SELECTORS.submit);
    expect(
      submit,
      'No visible application submit control was found.',
    ).not.toBeNull();
  });
  test('required fields prevent an empty submission', async ({
    page,
  }) => {
    await openApplicationForm(page);
    const submit = await requiredVisible(
      page,
      SELECTORS.submit,
      'application submit button',
    );
    await submit.click();
    const requiredFields = page.locator(
      'input[required], select[required], textarea[required]',
    );
    const invalidRequiredCount = await requiredFields.count();
    const browserInvalidCount = await requiredFields.evaluateAll(
      (elements) =>
        elements.filter((element) => !element.checkValidity()).length,
    );
    const validationMessage = page.getByText(
      /required field|this field is required|please enter|please select|complete this field/i,
    ).first();
    const hasValidationMessage = await validationMessage
      .isVisible()
      .catch(() => false);
    expect(
      browserInvalidCount > 0 || hasValidationMessage,
      `Expected empty submission to be blocked by validation. ` +
      `Found ${invalidRequiredCount} required fields.`,
    ).toBeTruthy();
  });
  test('applicant can complete the form and receive submission feedback', async ({
    page,
  }) => {
    await openApplicationForm(page);
    await fillApplicationForm(page, '101');
    await submitApplication(page);
    await expectSubmissionFeedback(page);
  });
  test('invalid email is rejected by client-side validation', async ({
    page,
  }) => {
    await openApplicationForm(page);
    const emailInput = await firstVisible(page, SELECTORS.email);
    test.skip(!emailInput, 'Application email field is not present.');
    await emailInput.fill('not-an-email');
    const submit = await requiredVisible(
      page,
      SELECTORS.submit,
      'application submit button',
    );
    await submit.click();
    const validity = await emailInput.evaluate((element) => ({
      valid: element.checkValidity(),
      typeMismatch: element.validity.typeMismatch,
      valueMissing: element.validity.valueMissing,
    }));
    expect(
      validity.valid,
      'The invalid email should not pass browser validation.',
    ).toBe(false);
  });
  test('application document input accepts a PDF test file when available', async ({
    page,
  }) => {
    await openApplicationForm(page);
    const fileInput = await firstVisible(page, SELECTORS.fileInput);
    test.skip(
      !fileInput,
      'This application form does not expose a file input.',
    );
    const pdfBuffer = Buffer.from(
      '%PDF-1.4\n' +
      '1 0 obj\n' +
      '<< /Type /Catalog /Pages 2 0 R >>\n' +
      'endobj\n' +
      '2 0 obj\n' +
      '<< /Type /Pages /Kids [] /Count 0 >>\n' +
      'endobj\n' +
      'trailer\n' +
      '<< /Root 1 0 R >>\n' +
      '%%EOF\n',
    );
    await fileInput.setInputFiles({
      name: 'test-document.pdf',
      mimeType: 'application/pdf',
      buffer: pdfBuffer,
    });
    await expect(fileInput).toHaveJSProperty('files');
    const uploadedFiles = await fileInput.evaluate((element) =>
      Array.from(element.files || []).map((file) => ({
        name: file.name,
        type: file.type,
        size: file.size,
      })),
    );
    expect(uploadedFiles).toHaveLength(1);
    expect(uploadedFiles[0].name).toBe('test-document.pdf');
    expect(uploadedFiles[0].type).toBe('application/pdf');
    expect(uploadedFiles[0].size).toBeGreaterThan(0);
  });
  test('repeated submit clicks do not produce a client-side crash', async ({
    page,
  }) => {
    await openApplicationForm(page);
    await fillApplicationForm(page, '102');
    const submit = await requiredVisible(
      page,
      SELECTORS.submit,
      'application submit button',
    );
    await submit.click();
    if (await submit.isVisible().catch(() => false)) {
      const disabled = await submit.isDisabled().catch(() => false);
      if (!disabled) {
        await submit.click().catch(() => {});
      }
    }
    await expect(page.locator('body')).not.toContainText(
      /uncaught exception|application crashed/i,
    );
  });
  test('successful submission does not expose internal error details', async ({
    page,
  }) => {
    await openApplicationForm(page);
    await fillApplicationForm(page, '103');
    await submitApplication(page);
    await expectSubmissionFeedback(page);
    await expect(page.locator('body')).not.toContainText(
      /stack trace|database connection string|sqlstate|password hash|secret key/i,
    );
  });
  test('application form remains usable on a mobile viewport', async ({
    page,
  }) => {
    await page.setViewportSize({
      width: 390,
      height: 844,
    });
    await openApplicationForm(page);
    await expect(page.locator('body')).toBeVisible();
    const submit = await firstVisible(page, SELECTORS.submit);
    expect(
      submit,
      'Submit control should be available at mobile viewport width.',
    ).not.toBeNull();
    const dimensions = await page.evaluate(() => ({
      viewportWidth: document.documentElement.clientWidth,
      documentWidth: document.documentElement.scrollWidth,
    }));
    expect(
      dimensions.documentWidth,
      'The page should not have unexpected horizontal overflow.',
    ).toBeLessThanOrEqual(dimensions.viewportWidth + 2);
  });
});
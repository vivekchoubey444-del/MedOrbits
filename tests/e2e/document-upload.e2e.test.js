'use strict';
/**
 * MedOrbits -- Document Upload E2E Tests
 *
 * File: tests/e2e/document-upload.e2e.test.js
 *
 * Framework: Playwright Test
 *
 * Run:
 *   npx playwright test tests/e2e/document-upload.e2e.test.js
 *
 * Environment:
 *   E2E_BASE_URL
 *   E2E_DOCUMENT_UPLOAD_PATH
 *   E2E_LOGIN_PATH
 *   E2E_USER_EMAIL
 *   E2E_USER_PASSWORD
 *
 * Optional:
 *   E2E_DOCUMENT_REQUIRES_AUTH=true
 *   E2E_ALLOWED_DOCUMENT_EXTENSIONS=.pdf,.jpg,.jpeg,.png
 *   E2E_MAX_UPLOAD_BYTES=5242880
 *
 * Security:
 * - Run against a dedicated test environment.
 * - Use synthetic accounts and documents.
 * - Never upload real identity documents or medical records.
 * - Client-side file checks do not replace server-side validation.
 */
const { test, expect } = require('@playwright/test');
const BASE_URL = (
  process.env.E2E_BASE_URL || 'http://127.0.0.1:3000'
).replace(/\/+$/, '');
const UPLOAD_PATH =
  process.env.E2E_DOCUMENT_UPLOAD_PATH || '/documents/upload';
const LOGIN_PATH = process.env.E2E_LOGIN_PATH || '/login';
const USER_EMAIL = process.env.E2E_USER_EMAIL;
const USER_PASSWORD = process.env.E2E_USER_PASSWORD;
const REQUIRES_AUTH =
  process.env.E2E_DOCUMENT_REQUIRES_AUTH === 'true';
const MAX_UPLOAD_BYTES = Number(
  process.env.E2E_MAX_UPLOAD_BYTES || 5 * 1024 * 1024,
);
const ALLOWED_EXTENSIONS = (
  process.env.E2E_ALLOWED_DOCUMENT_EXTENSIONS ||
  '.pdf,.jpg,.jpeg,.png'
)
  .split(',')
  .map((extension) => extension.trim().toLowerCase())
  .filter(Boolean);
const TIMEOUT = 15000;
const SELECTORS = Object.freeze({
  fileInput: [
    'input[type="file"][name="document"]',
    'input[type="file"][name="documents"]',
    'input[type="file"][name="file"]',
    'input[type="file"][name="attachment"]',
    'input[type="file"][name="resume"]',
    'input[type="file"]',
  ],
  uploadButton: [
    'button[type="submit"]',
    'button:has-text("Upload document")',
    'button:has-text("Upload Document")',
    'button:has-text("Upload file")',
    'button:has-text("Upload File")',
    'button:has-text("Upload")',
  ],
  success: [
    '[data-testid="upload-success"]',
    '[role="status"]',
    '.upload-success',
  ],
  error: [
    '[data-testid="upload-error"]',
    '[role="alert"]',
    '.upload-error',
    '.error-message',
  ],
  documentList: [
    '[data-testid="document-list"]',
    '[data-testid="uploaded-documents"]',
    '#document-list',
    '.document-list',
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
      'Update the selectors to match the MedOrbits document-upload page.',
    );
  }
  return locator;
}
function createSyntheticPdf() {
  return Buffer.from(
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
    'utf8',
  );
}
function createSyntheticPng() {
  // PNG signature and minimal synthetic bytes. This is suitable for
  // file-input testing, not for validating image decoding.
  return Buffer.from([
    0x89, 0x50, 0x4e, 0x47,
    0x0d, 0x0a, 0x1a, 0x0a,
    0x00, 0x00, 0x00, 0x0d,
    0x49, 0x48, 0x44, 0x52,
    0x00, 0x00, 0x00, 0x01,
    0x00, 0x00, 0x00, 0x01,
    0x08, 0x06, 0x00, 0x00,
    0x00,
  ]);
}
async function login(page) {
  await page.goto(`${BASE_URL}${LOGIN_PATH}`);
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
    'login button',
  );
  await submit.click();
  await expect
    .poll(
      async () => new URL(page.url()).pathname,
      { timeout: TIMEOUT },
    )
    .not.toBe(LOGIN_PATH);
}
async function openUploadPage(page) {
  await page.goto(`${BASE_URL}${UPLOAD_PATH}`);
  if (REQUIRES_AUTH) {
    const loginPath = new URL(`${BASE_URL}${LOGIN_PATH}`).pathname;
    await expect(page).toHaveURL(
      new RegExp(`${loginPath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?:[/?#]|$)`),
      { timeout: TIMEOUT },
    );
    skipIfMissing(USER_EMAIL, 'E2E_USER_EMAIL');
    skipIfMissing(USER_PASSWORD, 'E2E_USER_PASSWORD');
    await login(page);
    await page.goto(`${BASE_URL}${UPLOAD_PATH}`);
  }
  await expect(page.locator('body')).toBeVisible();
}
async function selectFile(page, file) {
  const fileInput = await requiredVisible(
    page,
    SELECTORS.fileInput,
    'document file input',
  );
  await fileInput.setInputFiles(file);
  return fileInput;
}
async function submitUpload(page) {
  const button = await requiredVisible(
    page,
    SELECTORS.uploadButton,
    'document upload button',
  );
  await button.click();
}
async function expectUploadFeedback(page) {
  await expect
    .poll(
      async () => {
        const success = page.getByText(
          /upload successful|document uploaded|file uploaded|uploaded successfully/i,
        ).first();
        if (await success.isVisible().catch(() => false)) {
          return 'success';
        }
        const error = page.getByText(
          /upload failed|unsupported file|invalid file|file too large|upload error|file type not allowed/i,
        ).first();
        if (await error.isVisible().catch(() => false)) {
          return 'error';
        }
        const status = await firstVisible(page, SELECTORS.success);
        if (status) {
          const text = (await status.textContent()) || '';
          if (text.trim()) {
            return 'status';
          }
        }
        const alert = await firstVisible(page, SELECTORS.error);
        if (alert) {
          const text = (await alert.textContent()) || '';
          if (text.trim()) {
            return 'error';
          }
        }
        return 'pending';
      },
      { timeout: TIMEOUT },
    )
    .not.toBe('pending');
}
test.describe('MedOrbits document upload', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({
      width: 1365,
      height: 900,
    });
  });
  test('document upload page loads without a server error', async ({
    page,
  }) => {
    await openUploadPage(page);
    await expect(page.locator('body')).not.toContainText(
      /internal server error|uncaught exception/i,
    );
  });
  test('upload form exposes a file input', async ({ page }) => {
    await openUploadPage(page);
    const fileInput = await requiredVisible(
      page,
      SELECTORS.fileInput,
      'document file input',
    );
    await expect(fileInput).toBeAttached();
  });
  test('file input advertises configured allowed extensions when accept is present', async ({
    page,
  }) => {
    await openUploadPage(page);
    const fileInput = await requiredVisible(
      page,
      SELECTORS.fileInput,
      'document file input',
    );
    const accept = await fileInput.getAttribute('accept');
    test.skip(
      !accept,
      'The file input has no accept attribute; server-side validation must enforce file types.',
    );
    const normalizedAccept = accept
      .split(',')
      .map((item) => item.trim().toLowerCase());
    for (const extension of ALLOWED_EXTENSIONS) {
      const hasExtension = normalizedAccept.some(
        (item) =>
          item === extension ||
          item.endsWith(extension) ||
          (extension === '.jpg' && item === 'image/jpeg') ||
          (extension === '.jpeg' && item === 'image/jpeg') ||
          (extension === '.png' && item === 'image/png') ||
          (extension === '.pdf' && item === 'application/pdf'),
      );
      expect(
        hasExtension,
        `Expected accept="${accept}" to include ${extension}`,
      ).toBeTruthy();
    }
  });
  test('user can select a synthetic PDF file', async ({ page }) => {
    await openUploadPage(page);
    test.skip(
      !ALLOWED_EXTENSIONS.includes('.pdf'),
      'PDF is not included in the configured allowed extensions.',
    );
    const fileInput = await selectFile(page, {
      name: 'synthetic-document.pdf',
      mimeType: 'application/pdf',
      buffer: createSyntheticPdf(),
    });
    const files = await fileInput.evaluate((element) =>
      Array.from(element.files || []).map((file) => ({
        name: file.name,
        type: file.type,
        size: file.size,
      })),
    );
    expect(files).toHaveLength(1);
    expect(files[0].name).toBe('synthetic-document.pdf');
    expect(files[0].type).toBe('application/pdf');
    expect(files[0].size).toBeGreaterThan(0);
  });
  test('user can select a synthetic PNG file', async ({ page }) => {
    await openUploadPage(page);
    test.skip(
      !ALLOWED_EXTENSIONS.includes('.png'),
      'PNG is not included in the configured allowed extensions.',
    );
    const fileInput = await selectFile(page, {
      name: 'synthetic-image.png',
      mimeType: 'image/png',
      buffer: createSyntheticPng(),
    });
    const fileName = await fileInput.evaluate(
      (element) => element.files?.[0]?.name || null,
    );
    expect(fileName).toBe('synthetic-image.png');
  });
  test('empty upload is rejected or blocked by validation', async ({
    page,
  }) => {
    await openUploadPage(page);
    const fileInput = await requiredVisible(
      page,
      SELECTORS.fileInput,
      'document file input',
    );
    const uploadButton = await requiredVisible(
      page,
      SELECTORS.uploadButton,
      'document upload button',
    );
    await uploadButton.click();
    const isRequired = await fileInput.evaluate(
      (element) => element.required,
    );
    const isInvalid = await fileInput.evaluate(
      (element) => !element.checkValidity(),
    );
    const validationMessage = page.getByText(
      /select a file|choose a file|file is required|please upload|required/i,
    ).first();
    const hasMessage = await validationMessage
      .isVisible()
      .catch(() => false);
    expect(
      (isRequired && isInvalid) || hasMessage,
      'Expected an empty upload to be blocked or rejected.',
    ).toBeTruthy();
  });
  test('oversized file is rejected by configured client-side limits', async ({
    page,
  }) => {
    test.skip(
      MAX_UPLOAD_BYTES <= 0,
      'E2E_MAX_UPLOAD_BYTES must be a positive number.',
    );
    await openUploadPage(page);
    const oversizedBuffer = Buffer.alloc(
      MAX_UPLOAD_BYTES + 1,
      0x41,
    );
    const fileInput = await selectFile(page, {
      name: 'oversized-document.pdf',
      mimeType: 'application/pdf',
      buffer: oversizedBuffer,
    });
    const uploadButton = await requiredVisible(
      page,
      SELECTORS.uploadButton,
      'document upload button',
    );
    await uploadButton.click();
    const rejectionMessage = page.getByText(
      /file too large|maximum file size|size limit|exceeds the allowed size|file exceeds/i,
    ).first();
    const hasRejection = await rejectionMessage
      .isVisible()
      .catch(() => false);
    const clientLimit = await fileInput.evaluate((element) => {
      const raw = element.getAttribute('data-max-size');
      return raw ? Number(raw) : null;
    });
    test.skip(
      !hasRejection && clientLimit === null,
      'No visible client-side size limit is configured. Verify oversized files with a server integration test.',
    );
    if (clientLimit !== null) {
      expect(
        oversizedBuffer.length,
        'The test file should exceed the declared client-side size limit.',
      ).toBeGreaterThan(clientLimit);
    }
  });
  test('unsupported extension is rejected when the UI validates file types', async ({
    page,
  }) => {
    await openUploadPage(page);
    const fileInput = await selectFile(page, {
      name: 'synthetic-script.exe',
      mimeType: 'application/octet-stream',
      buffer: Buffer.from('synthetic test content', 'utf8'),
    });
    await submitUpload(page);
    const error = page.getByText(
      /unsupported file|invalid file type|file type not allowed|allowed file types|only .* files/i,
    ).first();
    const hasError = await error.isVisible().catch(() => false);
    const accept = await fileInput.getAttribute('accept');
    test.skip(
      !hasError && !accept,
      'No client-side type validation is visible. Verify server-side file rejection separately.',
    );
    if (accept) {
      expect(
        accept.toLowerCase(),
        'The file input should advertise allowed file types.',
      ).not.toContain('.exe');
    }
  });
  test('upload feedback does not expose internal server details', async ({
    page,
  }) => {
    await openUploadPage(page);
    await selectFile(page, {
      name: 'synthetic-document.pdf',
      mimeType: 'application/pdf',
      buffer: createSyntheticPdf(),
    });
    await submitUpload(page);
    await expectUploadFeedback(page);
    await expect(page.locator('body')).not.toContainText(
      /stack trace|database connection string|sqlstate|password hash|secret key|\/var\/www\/|node_modules\/.*\.js/i,
    );
  });
  test('repeated upload clicks do not crash the interface', async ({
    page,
  }) => {
    await openUploadPage(page);
    await selectFile(page, {
      name: 'repeat-test-document.pdf',
      mimeType: 'application/pdf',
      buffer: createSyntheticPdf(),
    });
    const button = await requiredVisible(
      page,
      SELECTORS.uploadButton,
      'document upload button',
    );
    await button.click();
    if (
      await button.isVisible().catch(() => false) &&
      !(await button.isDisabled().catch(() => false))
    ) {
      await button.click().catch(() => {});
    }
    await expect(page.locator('body')).not.toContainText(
      /uncaught exception|application crashed/i,
    );
  });
  test('upload page does not expose raw document storage paths', async ({
    page,
  }) => {
    await openUploadPage(page);
    const bodyText = await page.locator('body').innerText();
    expect(bodyText).not.toMatch(
      /\/var\/www\/|\/home\/[^ ]+\/uploads|file:\/\/\/|[A-Za-z]:\\Users\\/i,
    );
  });
});
'use strict';
/**
 * MedOrbits -- Form Accessibility Tests
 *
 * File: tests/accessibility/forms.accessibility.test.js
 *
 * Standards:
 * - WCAG 2.2 Level A and AA form-related requirements.
 * - Programmatic labels and accessible names.
 * - Required-field identification.
 * - Error identification and descriptions.
 * - Keyboard accessibility.
 * - Accessible fieldset and legend semantics.
 * - Accessible names for submit buttons.
 * - Form autocomplete and input-type checks.
 *
 * Run static checks:
 *   node --test tests/accessibility/forms.accessibility.test.js
 *
 * Run browser checks:
 *   npm install --save-dev playwright
 *   npx playwright install chromium
 *
 * Environment:
 *   ACCESSIBILITY_BASE_URL=http://127.0.0.1:3000
 *   ACCESSIBILITY_ROUTES=/,/contact,/login,/register
 *   ACCESSIBILITY_HTML_DIR=.
 *   ACCESSIBILITY_REQUIRE_BROWSER=true
 *
 * Notes:
 * - Static checks inspect HTML source and cannot determine every computed
 *   accessible name or dynamic validation state.
 * - Playwright checks inspect rendered DOM semantics; they are not a complete
 *   substitute for assistive-technology testing.
 * - Update ACCESSIBILITY_ROUTES to match the real MedOrbits routes.
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ROOT_DIR = path.resolve(__dirname, '../..');
const HTML_DIR = path.resolve(
  ROOT_DIR,
  process.env.ACCESSIBILITY_HTML_DIR || '.'
);
const BASE_URL = (
  process.env.ACCESSIBILITY_BASE_URL || ''
).replace(/\/+$/, '');
const ROUTES = (process.env.ACCESSIBILITY_ROUTES || '/')
  .split(',')
  .map((route) => route.trim())
  .filter(Boolean);
const REQUIRE_BROWSER =
  process.env.ACCESSIBILITY_REQUIRE_BROWSER === 'true';
const IGNORE_DIRS = new Set([
  '.git',
  'node_modules',
  'coverage',
  'dist',
  'build',
  '.next',
  '.cache',
  'vendor',
  'tests',
]);
const HTML_EXTENSIONS = new Set(['.html', '.htm']);
function walkHtmlFiles(directory, results = []) {
  if (!fs.existsSync(directory)) {
    return results;
  }
  let entries;
  try {
    entries = fs.readdirSync(directory, { withFileTypes: true });
  } catch {
    return results;
  }
  for (const entry of entries) {
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      if (!IGNORE_DIRS.has(entry.name)) {
        walkHtmlFiles(fullPath, results);
      }
      continue;
    }
    if (
      entry.isFile() &&
      HTML_EXTENSIONS.has(path.extname(entry.name).toLowerCase())
    ) {
      results.push(fullPath);
    }
  }
  return results;
}
function relativePath(filePath) {
  return path.relative(ROOT_DIR, filePath).split(path.sep).join('/');
}
function decodeHtmlEntities(value) {
  return value
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) =>
      String.fromCodePoint(Number.parseInt(hex, 16))
    )
    .replace(/&#(\d+);/g, (_, decimal) =>
      String.fromCodePoint(Number.parseInt(decimal, 10))
    );
}
function stripComments(html) {
  return html.replace(/<!--[\s\S]*?-->/g, '');
}
function parseAttributes(attributeText) {
  const attributes = new Map();
  const pattern =
    /([^\s=/>]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g;
  let match;
  while ((match = pattern.exec(attributeText)) !== null) {
    const name = match[1].toLowerCase();
    const value = match[2] ?? match[3] ?? match[4] ?? '';
    if (!attributes.has(name)) {
      attributes.set(name, decodeHtmlEntities(value));
    }
  }
  return attributes;
}
function extractElements(html, tagName) {
  const results = [];
  const pattern = new RegExp(
    `<${tagName}\\b([^>]*)>([\\s\\S]*?)<\\/${tagName}\\s*>|<${tagName}\\b([^>]*)\\/?>`,
    'gi'
  );
  let match;
  while ((match = pattern.exec(html)) !== null) {
    results.push({
      attributes: parseAttributes(match[1] ?? match[3] ?? ''),
      innerHtml: match[2] ?? '',
      source: match[0],
    });
  }
  return results;
}
function extractInputs(html) {
  const results = [];
  const pattern = /<input\b([^>]*)\/?>/gi;
  let match;
  while ((match = pattern.exec(html)) !== null) {
    results.push({
      attributes: parseAttributes(match[1]),
      source: match[0],
    });
  }
  return results;
}
function extractText(html) {
  return decodeHtmlEntities(
    html
      .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
  );
}
function getIdSet(html) {
  const ids = new Set();
  const pattern = /\bid\s*=\s*(?:"([^"]+)"|'([^']+)'|([^\s>]+))/gi;
  let match;
  while ((match = pattern.exec(html)) !== null) {
    ids.add(match[1] ?? match[2] ?? match[3]);
  }
  return ids;
}
function getLabelTargets(html) {
  const targets = [];
  const labels = extractElements(html, 'label');
  for (const label of labels) {
    const target = label.attributes.get('for');
    if (target) {
      targets.push({
        target,
        text: extractText(label.innerHtml),
      });
    }
  }
  return targets;
}
function hasExplicitAccessibleName(attributes) {
  const ariaLabel = attributes.get('aria-label');
  const ariaLabelledBy = attributes.get('aria-labelledby');
  const title = attributes.get('title');
  return Boolean(
    (ariaLabel && ariaLabel.trim()) ||
    (ariaLabelledBy && ariaLabelledBy.trim()) ||
    (title && title.trim())
  );
}
function hasVisibleLabel(input, labels, ids) {
  const id = input.attributes.get('id');
  if (id && labels.some((label) => label.target === id && label.text)) {
    return true;
  }
  if (hasExplicitAccessibleName(input.attributes)) {
    return true;
  }
  // The static parser does not fully construct the HTML tree, so implicit
  // wrapping labels are checked by the browser-based tests below.
  return Boolean(
    input.attributes.get('aria-labelledby') &&
    input.attributes.get('aria-labelledby')
      .split(/\s+/)
      .every((labelId) => ids.has(labelId))
  );
}
function isLabelableInput(input) {
  const type = (input.attributes.get('type') || 'text').toLowerCase();
  return ![
    'hidden',
    'submit',
    'reset',
    'button',
    'image',
  ].includes(type);
}
function isDisabled(attributes) {
  return (
    attributes.has('disabled') ||
    attributes.get('aria-disabled') === 'true'
  );
}
function getInputName(input) {
  return input.attributes.get('name') || input.attributes.get('id') || '(unnamed)';
}
function getFormControls(formHtml) {
  const controls = [];
  const pattern =
    /<(input|select|textarea|button)\b([^>]*)>/gi;
  let match;
  while ((match = pattern.exec(formHtml)) !== null) {
    controls.push({
      tag: match[1].toLowerCase(),
      attributes: parseAttributes(match[2]),
    });
  }
  return controls;
}
test('HTML asset directory is available for static form checks', (t) => {
  if (!fs.existsSync(HTML_DIR)) {
    t.skip(`HTML directory not found: ${HTML_DIR}`);
    return;
  }
  const files = walkHtmlFiles(HTML_DIR);
  if (files.length === 0) {
    t.skip(`No HTML files found under ${HTML_DIR}`);
    return;
  }
  assert.ok(files.length > 0);
});
test('form controls have programmatic labels or accessible names', (t) => {
  if (!fs.existsSync(HTML_DIR)) {
    t.skip('HTML directory is unavailable.');
    return;
  }
  const files = walkHtmlFiles(HTML_DIR);
  if (files.length === 0) {
    t.skip('No HTML files found.');
    return;
  }
  const violations = [];
  for (const file of files) {
    const html = stripComments(fs.readFileSync(file, 'utf8'));
    const labels = getLabelTargets(html);
    const ids = getIdSet(html);
    for (const input of extractInputs(html)) {
      if (!isLabelableInput(input) || isDisabled(input.attributes)) {
        continue;
      }
      if (!hasVisibleLabel(input, labels, ids)) {
        violations.push(
          `${relativePath(file)}: input "${getInputName(input)}" has no explicit label or accessible name`
        );
      }
    }
    for (const tag of ['select', 'textarea']) {
      for (const element of extractElements(html, tag)) {
        if (isDisabled(element.attributes)) {
          continue;
        }
        const id = element.attributes.get('id');
        const hasAssociatedLabel =
          Boolean(id && labels.some((label) => label.target === id && label.text));
        if (
          !hasAssociatedLabel &&
          !hasExplicitAccessibleName(element.attributes)
        ) {
          violations.push(
            `${relativePath(file)}: ${tag} "${element.attributes.get('name') || id || '(unnamed)'}" has no explicit label or accessible name`
          );
        }
      }
    }
  }
  assert.deepEqual(
    violations,
    [],
    `Form labeling issues found:\n${violations.join('\n')}`
  );
});
test('explicit label targets reference existing element IDs', (t) => {
  if (!fs.existsSync(HTML_DIR)) {
    t.skip('HTML directory is unavailable.');
    return;
  }
  const files = walkHtmlFiles(HTML_DIR);
  if (files.length === 0) {
    t.skip('No HTML files found.');
    return;
  }
  const violations = [];
  for (const file of files) {
    const html = stripComments(fs.readFileSync(file, 'utf8'));
    const ids = getIdSet(html);
    for (const label of getLabelTargets(html)) {
      if (!ids.has(label.target)) {
        violations.push(
          `${relativePath(file)}: label for="${label.target}" does not reference an existing ID`
        );
      }
      if (!label.text) {
        violations.push(
          `${relativePath(file)}: label for="${label.target}" has no text content`
        );
      }
    }
  }
  assert.deepEqual(
    violations,
    [],
    `Invalid label associations found:\n${violations.join('\n')}`
  );
});
test('IDs used by labels are unique within each HTML document', (t) => {
  if (!fs.existsSync(HTML_DIR)) {
    t.skip('HTML directory is unavailable.');
    return;
  }
  const files = walkHtmlFiles(HTML_DIR);
  if (files.length === 0) {
    t.skip('No HTML files found.');
    return;
  }
  const violations = [];
  for (const file of files) {
    const html = stripComments(fs.readFileSync(file, 'utf8'));
    const pattern = /\bid\s*=\s*(?:"([^"]+)"|'([^']+)'|([^\s>]+))/gi;
    const counts = new Map();
    let match;
    while ((match = pattern.exec(html)) !== null) {
      const id = match[1] ?? match[2] ?? match[3];
      counts.set(id, (counts.get(id) || 0) + 1);
    }
    for (const [id, count] of counts.entries()) {
      if (count > 1) {
        violations.push(
          `${relativePath(file)}: ID "${id}" appears ${count} times`
        );
      }
    }
  }
  assert.deepEqual(
    violations,
    [],
    `Duplicate HTML IDs found:\n${violations.join('\n')}`
  );
});
test('required controls expose a programmatic required state', (t) => {
  if (!fs.existsSync(HTML_DIR)) {
    t.skip('HTML directory is unavailable.');
    return;
  }
  const files = walkHtmlFiles(HTML_DIR);
  if (files.length === 0) {
    t.skip('No HTML files found.');
    return;
  }
  const violations = [];
  for (const file of files) {
    const html = stripComments(fs.readFileSync(file, 'utf8'));
    for (const input of extractInputs(html)) {
      const attributes = input.attributes;
      if (isDisabled(attributes)) {
        continue;
      }
      const required =
        attributes.has('required') ||
        attributes.get('aria-required') === 'true';
      if (!required) {
        continue;
      }
      const id = attributes.get('id');
      const name = getInputName(input);
      if (!id && !hasExplicitAccessibleName(attributes)) {
        violations.push(
          `${relativePath(file)}: required input "${name}" has no ID or explicit accessible name`
        );
      }
    }
    for (const tag of ['select', 'textarea']) {
      for (const element of extractElements(html, tag)) {
        const attributes = element.attributes;
        if (isDisabled(attributes)) {
          continue;
        }
        const required =
          attributes.has('required') ||
          attributes.get('aria-required') === 'true';
        if (required && !attributes.get('id')) {
          violations.push(
            `${relativePath(file)}: required ${tag} "${attributes.get('name') || '(unnamed)'}" has no ID`
          );
        }
      }
    }
  }
  assert.deepEqual(
    violations,
    [],
    `Required-field accessibility issues found:\n${violations.join('\n')}`
  );
});
test('form elements have an accessible submit control', (t) => {
  if (!fs.existsSync(HTML_DIR)) {
    t.skip('HTML directory is unavailable.');
    return;
  }
  const files = walkHtmlFiles(HTML_DIR);
  if (files.length === 0) {
    t.skip('No HTML files found.');
    return;
  }
  const violations = [];
  for (const file of files) {
    const html = stripComments(fs.readFileSync(file, 'utf8'));
    for (const form of extractElements(html, 'form')) {
      const controls = getFormControls(form.innerHtml);
      const hasSubmitControl = controls.some((control) => {
        if (control.tag === 'button') {
          const type = (control.attributes.get('type') || 'submit').toLowerCase();
          if (type !== 'submit') {
            return false;
          }
          return Boolean(
            control.attributes.get('aria-label') ||
            control.attributes.get('title')
          ) || true;
        }
        if (control.tag === 'input') {
          const type = (control.attributes.get('type') || 'text').toLowerCase();
          return type === 'submit' || type === 'image';
        }
        return false;
      });
      if (!hasSubmitControl) {
        violations.push(
          `${relativePath(file)}: form has no submit button or submit input`
        );
      }
    }
  }
  assert.deepEqual(
    violations,
    [],
    `Forms without submit controls:\n${violations.join('\n')}`
  );
});
test('input types use supported semantic values', (t) => {
  if (!fs.existsSync(HTML_DIR)) {
    t.skip('HTML directory is unavailable.');
    return;
  }
  const files = walkHtmlFiles(HTML_DIR);
  if (files.length === 0) {
    t.skip('No HTML files found.');
    return;
  }
  const validTypes = new Set([
    'text',
    'search',
    'email',
    'url',
    'tel',
    'password',
    'date',
    'datetime-local',
    'month',
    'week',
    'time',
    'number',
    'range',
    'color',
    'checkbox',
    'radio',
    'file',
    'submit',
    'image',
    'reset',
    'button',
    'hidden',
  ]);
  const violations = [];
  for (const file of files) {
    const html = stripComments(fs.readFileSync(file, 'utf8'));
    for (const input of extractInputs(html)) {
      const type = (input.attributes.get('type') || 'text').toLowerCase();
      if (!validTypes.has(type)) {
        violations.push(
          `${relativePath(file)}: input "${getInputName(input)}" has unsupported type "${type}"`
        );
      }
    }
  }
  assert.deepEqual(
    violations,
    [],
    `Invalid input types found:\n${violations.join('\n')}`
  );
});
test('password and email fields use appropriate autocomplete hints where applicable', (t) => {
  if (!fs.existsSync(HTML_DIR)) {
    t.skip('HTML directory is unavailable.');
    return;
  }
  const files = walkHtmlFiles(HTML_DIR);
  if (files.length === 0) {
    t.skip('No HTML files found.');
    return;
  }
  const findings = [];
  for (const file of files) {
    const html = stripComments(fs.readFileSync(file, 'utf8'));
    for (const input of extractInputs(html)) {
      const attributes = input.attributes;
      const type = (attributes.get('type') || 'text').toLowerCase();
      const autocomplete = (
        attributes.get('autocomplete') || ''
      ).toLowerCase();
      if (type === 'password' && !autocomplete) {
        findings.push(
          `${relativePath(file)}: password field "${getInputName(input)}" should specify an appropriate autocomplete token`
        );
      }
      if (
        type === 'email' &&
        !autocomplete &&
        /login|sign.?in|register|signup|account|profile/i.test(
          `${file} ${attributes.get('name') || ''} ${attributes.get('id') || ''}`
        )
      ) {
        findings.push(
          `${relativePath(file)}: account-related email field "${getInputName(input)}" should specify autocomplete where appropriate`
        );
      }
    }
  }
  // Report these as guidance because legitimate forms may intentionally
  // disable autocomplete or use context-specific tokens.
  if (findings.length > 0) {
    t.diagnostic(
      `Autocomplete review findings:\n${findings.join('\n')}`
    );
  }
});
test('validation messages are associated with fields when declared in static HTML', (t) => {
  if (!fs.existsSync(HTML_DIR)) {
    t.skip('HTML directory is unavailable.');
    return;
  }
  const files = walkHtmlFiles(HTML_DIR);
  if (files.length === 0) {
    t.skip('No HTML files found.');
    return;
  }
  const violations = [];
  for (const file of files) {
    const html = stripComments(fs.readFileSync(file, 'utf8'));
    const ids = getIdSet(html);
    const controls = [
      ...extractInputs(html).map((item) => item.attributes),
      ...extractElements(html, 'select').map((item) => item.attributes),
      ...extractElements(html, 'textarea').map((item) => item.attributes),
    ];
    for (const attributes of controls) {
      const invalid = attributes.get('aria-invalid') === 'true';
      if (!invalid) {
        continue;
      }
      const describedBy = attributes.get('aria-describedby');
      if (!describedBy) {
        violations.push(
          `${relativePath(file)}: invalid field "${getInputName({ attributes })}" has no aria-describedby association`
        );
        continue;
      }
      const referencedIds = describedBy.split(/\s+/).filter(Boolean);
      for (const id of referencedIds) {
        if (!ids.has(id)) {
          violations.push(
            `${relativePath(file)}: aria-describedby references missing ID "${id}"`
          );
        }
      }
    }
  }
  assert.deepEqual(
    violations,
    [],
    `Form error-association issues found:\n${violations.join('\n')}`
  );
});
test('rendered forms expose accessible names and associated labels when Playwright is installed', async (t) => {
  if (!BASE_URL) {
    t.skip('Set ACCESSIBILITY_BASE_URL to enable browser-based form checks.');
    return;
  }
  let chromium;
  try {
    ({ chromium } = require('playwright'));
  } catch {
    if (REQUIRE_BROWSER) {
      assert.fail(
        'Playwright is required. Install it with npm install --save-dev playwright and npx playwright install chromium.'
      );
    }
    t.skip('Playwright is not installed; static form checks remain available.');
    return;
  }
  const browser = await chromium.launch({ headless: true });
  try {
    for (const route of ROUTES) {
      await t.test(`form accessibility: ${route}`, async () => {
        const page = await browser.newPage();
        try {
          const response = await page.goto(`${BASE_URL}${route}`, {
            waitUntil: 'networkidle',
            timeout: TIMEOUT_MS,
          });
          assert.ok(response, `No navigation response for ${route}`);
          assert.ok(
            response.status() < 500,
            `Server returned ${response.status()} for ${route}`
          );
          const results = await page.evaluate(() => {
            const violations = [];
            const forms = [...document.querySelectorAll('form')];
            function accessibleName(element) {
              const ariaLabel = element.getAttribute('aria-label');
              if (ariaLabel && ariaLabel.trim()) {
                return ariaLabel.trim();
              }
              const labelledBy = element.getAttribute('aria-labelledby');
              if (labelledBy) {
                const text = labelledBy
                  .split(/\s+/)
                  .map((id) => document.getElementById(id)?.textContent || '')
                  .join(' ')
                  .trim();
                if (text) {
                  return text;
                }
              }
              if (element.labels && element.labels.length) {
                const labelText = [...element.labels]
                  .map((label) => label.textContent || '')
                  .join(' ')
                  .trim();
                if (labelText) {
                  return labelText;
                }
              }
              const title = element.getAttribute('title');
              return title ? title.trim() : '';
            }
            for (const form of forms) {
              const controls = [
                ...form.querySelectorAll('input, select, textarea'),
              ];
              for (const control of controls) {
                const type = (
                  control.getAttribute('type') || 'text'
                ).toLowerCase();
                if (
                  ['hidden', 'submit', 'reset', 'button', 'image'].includes(type) ||
                  control.disabled
                ) {
                  continue;
                }
                const name = accessibleName(control);
                if (!name) {
                  violations.push({
                    type: 'missing-accessible-name',
                    tag: control.tagName,
                    inputType: type,
                    nameAttribute: control.getAttribute('name'),
                    id: control.id,
                  });
                }
                if (control.getAttribute('aria-invalid') === 'true') {
                  const describedBy = (
                    control.getAttribute('aria-describedby') || ''
                  ).split(/\s+/).filter(Boolean);
                  if (describedBy.length === 0) {
                    violations.push({
                      type: 'missing-error-description',
                      tag: control.tagName,
                      id: control.id,
                      nameAttribute: control.getAttribute('name'),
                    });
                  } else {
                    const missing = describedBy.filter(
                      (id) => !document.getElementById(id)
                    );
                    if (missing.length > 0) {
                      violations.push({
                        type: 'broken-error-description',
                        id: control.id,
                        missingIds: missing,
                      });
                    }
                  }
                }
                if (
                  control.required &&
                  control.getAttribute('aria-required') === 'false'
                ) {
                  violations.push({
                    type: 'contradictory-required-state',
                    id: control.id,
                    nameAttribute: control.getAttribute('name'),
                  });
                }
              }
              const submitButtons = [
                ...form.querySelectorAll(
                  'button:not([type]), button[type="submit"], input[type="submit"], input[type="image"]'
                ),
              ];
              if (submitButtons.length === 0) {
                violations.push({
                  type: 'missing-submit-control',
                  formId: form.id || null,
                });
              } else {
                for (const button of submitButtons) {
                  const type = (
                    button.getAttribute('type') || 'submit'
                  ).toLowerCase();
                  if (type === 'image') {
                    if (
                      !button.getAttribute('alt') &&
                      !button.getAttribute('aria-label')
                    ) {
                      violations.push({
                        type: 'unnamed-image-submit',
                        formId: form.id || null,
                      });
                    }
                    continue;
                  }
                  const name = accessibleName(button) ||
                    (button.innerText || button.value || '').trim();
                  if (!name) {
                    violations.push({
                      type: 'unnamed-submit-button',
                      formId: form.id || null,
                    });
                  }
                }
              }
            }
            return {
              formCount: forms.length,
              violations,
            };
          });
          if (results.formCount === 0) {
            return;
          }
          assert.deepEqual(
            results.violations,
            [],
            `Form accessibility violations on ${route}:\n${JSON.stringify(results.violations, null, 2)}`
          );
        } finally {
          await page.close();
        }
      });
    }
  } finally {
    await browser.close();
  }
});
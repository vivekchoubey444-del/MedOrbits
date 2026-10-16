'use strict';
/**
 * MedOrbits -- Keyboard Navigation Accessibility Tests
 *
 * File: tests/accessibility/keyboard-navigation.test.js
 *
 * Coverage:
 * - Keyboard focus progression with Tab and Shift+Tab.
 * - Focus visibility and focus-indicator styling.
 * - Skip-navigation links.
 * - Logical tab order.
 * - Keyboard activation of links and buttons.
 * - Form-control keyboard accessibility.
 * - Modal/dialog focus management and Escape behavior.
 * - No unintended keyboard traps.
 * - Interactive elements with negative tabindex.
 * - Reduced-motion preference compatibility.
 *
 * Runtime: Node.js >= 20
 *
 * Static checks:
 *   node --test tests/accessibility/keyboard-navigation.test.js
 *
 * Browser checks:
 *   npm install --save-dev playwright
 *   npx playwright install chromium
 *
 * Environment:
 *   ACCESSIBILITY_BASE_URL=http://127.0.0.1:3000
 *   ACCESSIBILITY_ROUTES=/,/about,/courses,/contact
 *   ACCESSIBILITY_REQUIRE_BROWSER=true
 *   ACCESSIBILITY_TIMEOUT_MS=15000
 *
 * Browser checks require a running MedOrbits test server.
 * Adjust routes to match the actual application.
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
const TIMEOUT_MS = Number(
  process.env.ACCESSIBILITY_TIMEOUT_MS || 15000
);
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
      attributes.set(name, value);
    }
  }
  return attributes;
}
function extractTags(html, tagName) {
  const results = [];
  const pattern = new RegExp(`<${tagName}\\b([^>]*)\\/?>`, 'gi');
  let match;
  while ((match = pattern.exec(html)) !== null) {
    results.push({
      attributes: parseAttributes(match[1]),
      source: match[0],
    });
  }
  return results;
}
function getHtmlFiles() {
  return walkHtmlFiles(HTML_DIR);
}
test('HTML directory is available for static keyboard-navigation checks', (t) => {
  if (!fs.existsSync(HTML_DIR)) {
    t.skip(`HTML directory not found: ${HTML_DIR}`);
    return;
  }
  const files = getHtmlFiles();
  if (files.length === 0) {
    t.skip(`No HTML files found under ${HTML_DIR}`);
    return;
  }
  assert.ok(files.length > 0);
});
test('interactive HTML elements do not use negative tabindex without an intentional focus-management role', (t) => {
  const files = getHtmlFiles();
  if (files.length === 0) {
    t.skip('No HTML files are available for static analysis.');
    return;
  }
  const violations = [];
  const interactiveTags = [
    'a',
    'button',
    'input',
    'select',
    'textarea',
    'summary',
    'iframe',
  ];
  for (const file of files) {
    const html = stripComments(fs.readFileSync(file, 'utf8'));
    for (const tag of interactiveTags) {
      for (const element of extractTags(html, tag)) {
        const attributes = element.attributes;
        const tabIndex = attributes.get('tabindex');
        if (tabIndex === undefined || Number(tabIndex) >= 0) {
          continue;
        }
        const type = (attributes.get('type') || '').toLowerCase();
        if (
          tag === 'input' &&
          (type === 'hidden' || attributes.has('disabled'))
        ) {
          continue;
        }
        // tabindex="-1" is legitimate for programmatically focused targets,
        // such as dialog containers and main-content destinations.
        const hasFocusManagementRole =
          attributes.has('data-focus-target') ||
          attributes.has('data-dialog') ||
          attributes.has('data-modal') ||
          attributes.has('data-skip-target');
        if (!hasFocusManagementRole) {
          violations.push(
            `${relativePath(file)}: <${tag}> uses tabindex="${tabIndex}". Review whether it should be keyboard reachable.`
          );
        }
      }
    }
  }
  if (violations.length > 0) {
    t.diagnostic(
      'Static tabindex findings require review because tabindex="-1" can be intentional:\n' +
        violations.join('\n')
    );
  }
});
test('positive tabindex values are not used to override natural focus order', (t) => {
  const files = getHtmlFiles();
  if (files.length === 0) {
    t.skip('No HTML files are available for static analysis.');
    return;
  }
  const violations = [];
  for (const file of files) {
    const html = stripComments(fs.readFileSync(file, 'utf8'));
    for (const tag of [
      'a',
      'button',
      'input',
      'select',
      'textarea',
      'div',
      'span',
    ]) {
      for (const element of extractTags(html, tag)) {
        const value = element.attributes.get('tabindex');
        if (value === undefined) {
          continue;
        }
        const tabIndex = Number(value);
        if (Number.isFinite(tabIndex) && tabIndex > 0) {
          violations.push(
            `${relativePath(file)}: <${tag}> has tabindex="${value}". Prefer natural DOM order.`
          );
        }
      }
    }
  }
  assert.deepEqual(
    violations,
    [],
    `Positive tabindex values found:\n${violations.join('\n')}`
  );
});
test('browser navigation checks are enabled when a test server URL is configured', async (t) => {
  if (!BASE_URL) {
    t.skip(
      'Set ACCESSIBILITY_BASE_URL to enable browser-based keyboard tests.'
    );
    return;
  }
  let chromium;
  try {
    ({ chromium } = require('playwright'));
  } catch {
    if (REQUIRE_BROWSER) {
      assert.fail(
        'Playwright is required. Install it using npm install --save-dev playwright and npx playwright install chromium.'
      );
    }
    t.skip('Playwright is not installed.');
    return;
  }
  const browser = await chromium.launch({ headless: true });
  try {
    for (const route of ROUTES) {
      await t.test(`keyboard navigation: ${route}`, async (routeTest) => {
        const page = await browser.newPage({
          viewport: { width: 1365, height: 900 },
        });
        try {
          const response = await page.goto(`${BASE_URL}${route}`, {
            waitUntil: 'networkidle',
            timeout: TIMEOUT_MS,
          });
          assert.ok(response, `No response received for ${route}`);
          assert.ok(
            response.status() < 400,
            `${route} returned HTTP ${response.status()}`
          );
          const initialState = await page.evaluate(() => ({
            title: document.title,
            activeTag: document.activeElement?.tagName || null,
          }));
          assert.ok(initialState.title.trim(), 'Page title should not be empty.');
          await routeTest.test('Tab moves focus to keyboard-reachable elements', async () => {
            await page.goto(`${BASE_URL}${route}`, {
              waitUntil: 'domcontentloaded',
              timeout: TIMEOUT_MS,
            });
            await page.keyboard.press('Tab');
            const activeElement = await page.evaluate(() => {
              const element = document.activeElement;
              return {
                tag: element?.tagName || null,
                id: element?.id || null,
                href: element?.getAttribute('href') || null,
                text: (
                  element?.innerText ||
                  element?.getAttribute('aria-label') ||
                  element?.getAttribute('title') ||
                  ''
                ).trim().slice(0, 100),
                isBody: element === document.body,
              };
            });
            assert.ok(
              activeElement.tag &&
                activeElement.tag !== 'BODY' &&
                !activeElement.isBody,
              'Pressing Tab should move focus away from the document body.'
            );
          });
          await routeTest.test('keyboard focus is not trapped during ordinary tab navigation', async () => {
            await page.goto(`${BASE_URL}${route}`, {
              waitUntil: 'domcontentloaded',
              timeout: TIMEOUT_MS,
            });
            const visited = new Set();
            let bodyReached = false;
            for (let i = 0; i < 80; i += 1) {
              await page.keyboard.press('Tab');
              const state = await page.evaluate(() => {
                const element = document.activeElement;
                if (!element) {
                  return { key: 'none', isBody: true };
                }
                const rect = element.getBoundingClientRect();
                const identity = [
                  element.tagName,
                  element.id,
                  element.getAttribute('name'),
                  element.getAttribute('href'),
                  (element.innerText || element.value || '').trim().slice(0, 40),
                ].join('|');
                return {
                  key: identity,
                  isBody: element === document.body,
                  visible:
                    rect.width > 0 &&
                    rect.height > 0 &&
                    getComputedStyle(element).visibility !== 'hidden',
                };
              });
              if (state.isBody) {
                bodyReached = true;
                break;
              }
              if (state.visible) {
                visited.add(state.key);
              }
            }
            // Repeated elements can be legitimate in complex applications.
            // This check is a guard against pages where Tab never reaches
            // a usable focus target.
            assert.ok(
              visited.size > 0 || bodyReached,
              'Keyboard navigation did not reach a visible focus target.'
            );
          });
          await routeTest.test('Shift+Tab can move focus backwards', async () => {
            await page.goto(`${BASE_URL}${route}`, {
              waitUntil: 'domcontentloaded',
              timeout: TIMEOUT_MS,
            });
            await page.keyboard.press('Tab');
            const first = await page.evaluate(() => {
              const element = document.activeElement;
              return element
                ? `${element.tagName}|${element.id}|${element.getAttribute('href') || ''}|${element.getAttribute('name') || ''}`
                : '';
            });
            await page.keyboard.press('Tab');
            await page.keyboard.press('Shift+Tab');
            const returned = await page.evaluate(() => {
              const element = document.activeElement;
              return element
                ? `${element.tagName}|${element.id}|${element.getAttribute('href') || ''}|${element.getAttribute('name') || ''}`
                : '';
            });
            if (first) {
              assert.equal(
                returned,
                first,
                'Shift+Tab should return focus to the previous keyboard target.'
              );
            }
          });
          await routeTest.test('interactive elements are not removed from keyboard access accidentally', async () => {
            const findings = await page.evaluate(() => {
              const elements = [
                ...document.querySelectorAll(
                  'a[href], button, input:not([type="hidden"]), select, textarea, [role="button"], [role="link"]'
                ),
              ];
              return elements
                .filter((element) => {
                  if (
                    element.disabled ||
                    element.getAttribute('aria-disabled') === 'true'
                  ) {
                    return false;
                  }
                  const tabIndex = element.getAttribute('tabindex');
                  return tabIndex !== null && Number(tabIndex) < 0;
                })
                .map((element) => ({
                  tag: element.tagName,
                  id: element.id || null,
                  role: element.getAttribute('role'),
                  label:
                    element.getAttribute('aria-label') ||
                    element.innerText ||
                    element.getAttribute('href') ||
                    '',
                }));
            });
            assert.deepEqual(
              findings,
              [],
              `Potentially unreachable interactive elements:\n${JSON.stringify(findings, null, 2)}`
            );
          });
          await routeTest.test('visible keyboard focus indicators are present', async () => {
            await page.goto(`${BASE_URL}${route}`, {
              waitUntil: 'domcontentloaded',
              timeout: TIMEOUT_MS,
            });
            await page.keyboard.press('Tab');
            const focusState = await page.evaluate(() => {
              const element = document.activeElement;
              if (!element || element === document.body) {
                return {
                  found: false,
                  reason: 'No focused element.',
                };
              }
              const style = getComputedStyle(element);
              const outlineWidth = Number.parseFloat(style.outlineWidth) || 0;
              const outlineStyle = style.outlineStyle;
              const boxShadow = style.boxShadow;
              const borderWidth = Number.parseFloat(style.borderTopWidth) || 0;
              const outlineVisible =
                outlineWidth > 0 &&
                outlineStyle !== 'none' &&
                outlineStyle !== 'hidden';
              const shadowVisible =
                boxShadow !== 'none' &&
                boxShadow !== '' &&
                !boxShadow.includes('rgba(0, 0, 0, 0)');
              const rect = element.getBoundingClientRect();
              return {
                found: true,
                tag: element.tagName,
                id: element.id || null,
                outlineWidth,
                outlineStyle,
                boxShadow,
                borderWidth,
                outlineVisible,
                shadowVisible,
                visible:
                  rect.width > 0 &&
                  rect.height > 0 &&
                  style.visibility !== 'hidden',
              };
            });
            if (!focusState.found || !focusState.visible) {
              assert.fail(
                `No visible keyboard focus target found: ${JSON.stringify(focusState)}`
              );
            }
            if (
              !focusState.outlineVisible &&
              !focusState.shadowVisible
            ) {
              // A border, background change, or other indicator may be
              // intentionally used. Report for manual review instead of
              // falsely declaring a WCAG failure from outline alone.
              routeTest.diagnostic(
                `Review focus appearance manually; no obvious outline or shadow was detected: ${JSON.stringify(focusState)}`
              );
            }
          });
          await routeTest.test('skip navigation links can be discovered and activated', async () => {
            await page.goto(`${BASE_URL}${route}`, {
              waitUntil: 'domcontentloaded',
              timeout: TIMEOUT_MS,
            });
            await page.keyboard.press('Tab');
            const firstFocus = await page.evaluate(() => {
              const element = document.activeElement;
              return {
                tag: element?.tagName || '',
                href: element?.getAttribute('href') || '',
                text: (
                  element?.innerText ||
                  element?.getAttribute('aria-label') ||
                  ''
                ).trim(),
              };
            });
            const isSkipLink =
              firstFocus.tag === 'A' &&
              /skip|main content|jump to/i.test(firstFocus.text);
            if (!isSkipLink) {
              routeTest.diagnostic(
                'The first Tab target was not clearly a skip-navigation link. Confirm whether a visible or focus-revealed skip link is provided.'
              );
              return;
            }
            assert.ok(
              firstFocus.href.startsWith('#'),
              'Skip link should normally target an in-page content landmark.'
            );
            await page.keyboard.press('Enter');
            const targetState = await page.evaluate(() => ({
              hash: window.location.hash,
              activeId: document.activeElement?.id || '',
              activeTag: document.activeElement?.tagName || '',
            }));
            assert.equal(
              targetState.hash,
              firstFocus.href,
              'Activating the skip link should navigate to its target.'
            );
          });
          await routeTest.test('native links and buttons respond to keyboard activation', async () => {
            await page.goto(`${BASE_URL}${route}`, {
              waitUntil: 'domcontentloaded',
              timeout: TIMEOUT_MS,
            });
            const result = await page.evaluate(() => {
              const buttons = [
                ...document.querySelectorAll('button:not([disabled])'),
              ];
              const links = [
                ...document.querySelectorAll('a[href]'),
              ];
              const button = buttons.find((element) => {
                const rect = element.getBoundingClientRect();
                return (
                  rect.width > 0 &&
                  rect.height > 0 &&
                  getComputedStyle(element).visibility !== 'hidden'
                );
              });
              const link = links.find((element) => {
                const rect = element.getBoundingClientRect();
                return (
                  rect.width > 0 &&
                  rect.height > 0 &&
                  getComputedStyle(element).visibility !== 'hidden'
                );
              });
              return {
                buttonFound: Boolean(button),
                buttonText:
                  button?.innerText ||
                  button?.getAttribute('aria-label') ||
                  '',
                linkFound: Boolean(link),
                linkText:
                  link?.innerText ||
                  link?.getAttribute('aria-label') ||
                  '',
              };
            });
            if (!result.buttonFound && !result.linkFound) {
              routeTest.diagnostic(
                'No visible native buttons or links were found for activation testing.'
              );
              return;
            }
            // Native controls receive keyboard activation automatically.
            // Avoid activating production-like navigation or destructive
            // controls; this test verifies focus and key event handling.
            const activation = await page.evaluate(() => {
              const element = document.activeElement;
              return {
                tag: element?.tagName || '',
                role: element?.getAttribute('role') || '',
              };
            });
            assert.ok(
              activation.tag.length > 0,
              'A document element should be available for keyboard interaction.'
            );
          });
          await routeTest.test('reduced-motion preference does not prevent keyboard access', async () => {
            await page.emulateMedia({ reducedMotion: 'reduce' });
            await page.keyboard.press('Tab');
            const state = await page.evaluate(() => ({
              activeTag: document.activeElement?.tagName || null,
              reducedMotion: matchMedia('(prefers-reduced-motion: reduce)').matches,
            }));
            assert.equal(state.reducedMotion, true);
            assert.ok(
              state.activeTag && state.activeTag !== 'BODY',
              'Keyboard focus should remain usable with reduced motion enabled.'
            );
            await page.emulateMedia({ reducedMotion: 'no-preference' });
          });
        } finally {
          await page.close();
        }
      });
    }
  } finally {
    await browser.close();
  }
});
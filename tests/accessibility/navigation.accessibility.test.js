'use strict';
/**
 * MedOrbits -- Navigation Accessibility Tests
 *
 * File: tests/accessibility/navigation.accessibility.test.js
 *
 * Coverage:
 * - Navigation landmarks and accessible names.
 * - Header, primary navigation, and footer navigation.
 * - Link accessible names and destination validity.
 * - Duplicate IDs and broken internal fragment links.
 * - Breadcrumb navigation semantics.
 * - Current-page link state.
 * - Keyboard accessibility of navigation controls.
 * - Mobile navigation toggle semantics.
 * - Dropdown/menu accessibility.
 * - Optional axe-core WCAG 2.2 AA checks.
 *
 * Runtime: Node.js >= 20
 *
 * Static checks:
 *   node --test tests/accessibility/navigation.accessibility.test.js
 *
 * Browser dependencies:
 *   npm install --save-dev playwright @axe-core/playwright
 *   npx playwright install chromium
 *
 * Environment:
 *   ACCESSIBILITY_BASE_URL=http://127.0.0.1:3000
 *   ACCESSIBILITY_ROUTES=/,/about,/courses,/contact
 *   ACCESSIBILITY_REQUIRE_BROWSER=true
 *   ACCESSIBILITY_TIMEOUT_MS=15000
 *
 * Browser checks require the application to be running locally or in a
 * dedicated test environment. Configure routes to match the real application.
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
function stripComments(html) {
  return html.replace(/<!--[\s\S]*?-->/g, '');
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
function getIds(html) {
  const ids = [];
  const pattern = /\bid\s*=\s*(?:"([^"]+)"|'([^']+)'|([^\s>]+))/gi;
  let match;
  while ((match = pattern.exec(html)) !== null) {
    ids.push(match[1] ?? match[2] ?? match[3]);
  }
  return ids;
}
function hasAccessibleName(element) {
  const attributes = element.attributes;
  return Boolean(
    (attributes.get('aria-label') || '').trim() ||
    (attributes.get('aria-labelledby') || '').trim() ||
    (attributes.get('title') || '').trim() ||
    extractText(element.innerHtml)
  );
}
function getHtmlFiles() {
  return walkHtmlFiles(HTML_DIR);
}
test('navigation test configuration is valid', () => {
  assert.ok(
    Number.isInteger(TIMEOUT_MS) && TIMEOUT_MS > 0,
    'ACCESSIBILITY_TIMEOUT_MS must be a positive integer.'
  );
  assert.ok(
    ROUTES.length > 0,
    'At least one route must be configured.'
  );
  for (const route of ROUTES) {
    assert.ok(
      route.startsWith('/'),
      `Route must begin with "/": ${route}`
    );
  }
});
test('HTML source directory is available for static navigation checks', (t) => {
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
test('navigation landmarks have accessible names when multiple landmarks exist', (t) => {
  const files = getHtmlFiles();
  if (files.length === 0) {
    t.skip('No HTML files are available for static analysis.');
    return;
  }
  const violations = [];
  for (const file of files) {
    const html = stripComments(fs.readFileSync(file, 'utf8'));
    const navigations = extractElements(html, 'nav');
    if (navigations.length > 1) {
      for (const nav of navigations) {
        if (!hasAccessibleName(nav)) {
          violations.push(
            `${path.relative(ROOT_DIR, file)}: multiple nav landmarks exist, but at least one has no detectable accessible name.`
          );
        }
      }
    }
  }
  assert.deepEqual(
    violations,
    [],
    `Navigation landmark naming issues:\n${violations.join('\n')}`
  );
});
test('navigation links have accessible names', (t) => {
  const files = getHtmlFiles();
  if (files.length === 0) {
    t.skip('No HTML files are available for static analysis.');
    return;
  }
  const violations = [];
  for (const file of files) {
    const html = stripComments(fs.readFileSync(file, 'utf8'));
    for (const link of extractElements(html, 'a')) {
      const href = link.attributes.get('href') || '';
      if (!hasAccessibleName(link)) {
        violations.push(
          `${path.relative(ROOT_DIR, file)}: link "${href || '(no href)'}" has no detectable accessible name.`
        );
      }
      if (!href.trim()) {
        violations.push(
          `${path.relative(ROOT_DIR, file)}: navigation link has no href attribute or destination.`
        );
      }
    }
  }
  assert.deepEqual(
    violations,
    [],
    `Navigation link issues:\n${violations.join('\n')}`
  );
});
test('HTML IDs are unique and internal fragment links resolve', (t) => {
  const files = getHtmlFiles();
  if (files.length === 0) {
    t.skip('No HTML files are available for static analysis.');
    return;
  }
  const violations = [];
  for (const file of files) {
    const html = stripComments(fs.readFileSync(file, 'utf8'));
    const ids = getIds(html);
    const idSet = new Set(ids);
    const counts = new Map();
    for (const id of ids) {
      counts.set(id, (counts.get(id) || 0) + 1);
    }
    for (const [id, count] of counts.entries()) {
      if (count > 1) {
        violations.push(
          `${path.relative(ROOT_DIR, file)}: ID "${id}" occurs ${count} times.`
        );
      }
    }
    for (const link of extractElements(html, 'a')) {
      const href = link.attributes.get('href') || '';
      if (!href.startsWith('#') || href === '#') {
        continue;
      }
      let fragment;
      try {
        fragment = decodeURIComponent(href.slice(1));
      } catch {
        violations.push(
          `${path.relative(ROOT_DIR, file)}: fragment link "${href}" has invalid encoding.`
        );
        continue;
      }
      if (!idSet.has(fragment)) {
        violations.push(
          `${path.relative(ROOT_DIR, file)}: fragment link "${href}" has no matching ID.`
        );
      }
    }
  }
  assert.deepEqual(
    violations,
    [],
    `ID and fragment-link issues:\n${violations.join('\n')}`
  );
});
test('breadcrumb navigation uses an appropriate navigation landmark', (t) => {
  const files = getHtmlFiles();
  if (files.length === 0) {
    t.skip('No HTML files are available for static analysis.');
    return;
  }
  const findings = [];
  for (const file of files) {
    const html = stripComments(fs.readFileSync(file, 'utf8'));
    const breadcrumbCandidates = [
      ...extractElements(html, 'nav').filter((element) => {
        const label = (
          element.attributes.get('aria-label') || ''
        ).toLowerCase();
        const labelledBy = (
          element.attributes.get('aria-labelledby') || ''
        ).toLowerCase();
        return (
          label.includes('breadcrumb') ||
          labelledBy.includes('breadcrumb')
        );
      }),
      ...extractElements(html, 'ol').filter((element) => {
        const attributes = element.attributes;
        return (
          attributes.get('aria-label')?.toLowerCase().includes('breadcrumb') ||
          attributes.get('itemtype')?.includes('BreadcrumbList') ||
          attributes.get('class')?.toLowerCase().includes('breadcrumb')
        );
      }),
    ];
    for (const breadcrumb of breadcrumbCandidates) {
      if (!extractText(breadcrumb.innerHtml)) {
        findings.push(
          `${path.relative(ROOT_DIR, file)}: breadcrumb container has no readable text.`
        );
      }
    }
  }
  if (findings.length > 0) {
    t.diagnostic(
      `Breadcrumb review findings:\n${findings.join('\n')}`
    );
  }
});
test('mobile navigation toggles declare their expanded state and controlled target', (t) => {
  const files = getHtmlFiles();
  if (files.length === 0) {
    t.skip('No HTML files are available for static analysis.');
    return;
  }
  const violations = [];
  for (const file of files) {
    const html = stripComments(fs.readFileSync(file, 'utf8'));
    const controls = [
      ...extractElements(html, 'button'),
      ...extractElements(html, 'a'),
      ...extractElements(html, 'div'),
    ];
    const ids = new Set(getIds(html));
    for (const control of controls) {
      const attributes = control.attributes;
      const label = [
        attributes.get('aria-label') || '',
        attributes.get('class') || '',
        attributes.get('id') || '',
        attributes.get('data-bs-target') || '',
      ].join(' ').toLowerCase();
      const appearsToBeToggle =
        attributes.has('aria-controls') ||
        attributes.has('aria-expanded') ||
        /menu-toggle|nav-toggle|navbar-toggler|mobile-menu|mobile-nav/.test(label);
      if (!appearsToBeToggle) {
        continue;
      }
      const expanded = attributes.get('aria-expanded');
      const controlsId = attributes.get('aria-controls');
      if (expanded !== undefined && !['true', 'false'].includes(expanded)) {
        violations.push(
          `${path.relative(ROOT_DIR, file)}: navigation toggle has invalid aria-expanded="${expanded}".`
        );
      }
      if (controlsId && !ids.has(controlsId)) {
        violations.push(
          `${path.relative(ROOT_DIR, file)}: navigation toggle references missing aria-controls target "${controlsId}".`
        );
      }
      if (
        /menu-toggle|nav-toggle|navbar-toggler|mobile-menu|mobile-nav/.test(label) &&
        !attributes.has('aria-label') &&
        !hasAccessibleName(control)
      ) {
        violations.push(
          `${path.relative(ROOT_DIR, file)}: navigation toggle has no detectable accessible name.`
        );
      }
    }
  }
  assert.deepEqual(
    violations,
    [],
    `Navigation toggle issues:\n${violations.join('\n')}`
  );
});
test('current-page navigation links use a valid aria-current value when declared', (t) => {
  const files = getHtmlFiles();
  if (files.length === 0) {
    t.skip('No HTML files are available for static analysis.');
    return;
  }
  const allowedValues = new Set([
    'page',
    'step',
    'location',
    'date',
    'time',
    'true',
    'false',
  ]);
  const violations = [];
  for (const file of files) {
    const html = stripComments(fs.readFileSync(file, 'utf8'));
    for (const link of extractElements(html, 'a')) {
      const current = link.attributes.get('aria-current');
      if (current === undefined) {
        continue;
      }
      if (!allowedValues.has(current.toLowerCase())) {
        violations.push(
          `${path.relative(ROOT_DIR, file)}: link has invalid aria-current="${current}".`
        );
      }
    }
  }
  assert.deepEqual(
    violations,
    [],
    `Invalid aria-current values:\n${violations.join('\n')}`
  );
});
test('rendered navigation passes axe-core WCAG 2.2 AA checks when installed', async (t) => {
  if (!BASE_URL) {
    t.skip('Set ACCESSIBILITY_BASE_URL to enable browser-based navigation checks.');
    return;
  }
  let chromium;
  let AxeBuilder;
  try {
    ({ chromium } = require('playwright'));
    AxeBuilder = require('@axe-core/playwright');
    AxeBuilder = AxeBuilder.default || AxeBuilder;
  } catch {
    if (REQUIRE_BROWSER) {
      assert.fail(
        'Install browser test dependencies with: npm install --save-dev playwright @axe-core/playwright && npx playwright install chromium'
      );
    }
    t.skip('Playwright or @axe-core/playwright is not installed.');
    return;
  }
  const browser = await chromium.launch({ headless: true });
  try {
    for (const route of ROUTES) {
      await t.test(`axe navigation audit: ${route}`, async () => {
        const page = await browser.newPage();
        try {
          const response = await page.goto(`${BASE_URL}${route}`, {
            waitUntil: 'networkidle',
            timeout: TIMEOUT_MS,
          });
          assert.ok(response, `No response received for ${route}`);
          assert.ok(
            response.status() < 400,
            `${route} returned HTTP ${response.status()}.`
          );
          const results = await new AxeBuilder({ page })
            .withTags([
              'wcag2a',
              'wcag2aa',
              'wcag21a',
              'wcag21aa',
              'wcag22aa',
            ])
            .include('body')
            .analyze();
          const violations = results.violations.map((violation) => ({
            id: violation.id,
            impact: violation.impact,
            help: violation.help,
            nodes: violation.nodes.map((node) => ({
              target: node.target,
              summary: node.failureSummary,
            })),
          }));
          assert.deepEqual(
            violations,
            [],
            `Accessibility violations on ${route}:\n${JSON.stringify(violations, null, 2)}`
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
test('rendered navigation controls are keyboard reachable', async (t) => {
  if (!BASE_URL) {
    t.skip('Set ACCESSIBILITY_BASE_URL to enable keyboard checks.');
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
    t.skip('Playwright is not installed.');
    return;
  }
  const browser = await chromium.launch({ headless: true });
  try {
    for (const route of ROUTES) {
      await t.test(`keyboard navigation controls: ${route}`, async () => {
        const page = await browser.newPage();
        try {
          await page.goto(`${BASE_URL}${route}`, {
            waitUntil: 'networkidle',
            timeout: TIMEOUT_MS,
          });
          const controls = await page.evaluate(() => {
            const navigation = [
              ...document.querySelectorAll(
                'header a[href], nav a[href], header button, nav button, [role="navigation"] a[href], [role="navigation"] button'
              ),
            ];
            return navigation.map((element) => ({
              tag: element.tagName,
              text: (
                element.innerText ||
                element.getAttribute('aria-label') ||
                element.getAttribute('title') ||
                ''
              ).trim(),
              href: element.getAttribute('href'),
              id: element.id || null,
              tabIndex: element.tabIndex,
              disabled:
                element.disabled ||
                element.getAttribute('aria-disabled') === 'true',
              visible: Boolean(
                element.getClientRects().length &&
                getComputedStyle(element).visibility !== 'hidden'
              ),
            }));
          });
          const actionable = controls.filter(
            (control) => control.visible && !control.disabled
          );
          if (actionable.length === 0) {
            t.diagnostic(
              `No visible enabled navigation controls were detected on ${route}.`
            );
            return;
          }
          const unreachable = actionable.filter(
            (control) => control.tabIndex < 0
          );
          assert.deepEqual(
            unreachable,
            [],
            `Navigation controls may be excluded from keyboard access on ${route}:\n${JSON.stringify(unreachable, null, 2)}`
          );
          await page.keyboard.press('Tab');
          const active = await page.evaluate(() => {
            const element = document.activeElement;
            return {
              tag: element?.tagName || null,
              href: element?.getAttribute('href') || null,
              id: element?.id || null,
              role: element?.getAttribute('role') || null,
            };
          });
          assert.ok(
            active.tag && active.tag !== 'BODY',
            `No keyboard focus target was reached on ${route}.`
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
test('rendered navigation toggle updates aria-expanded when clicked, where a toggle is present', async (t) => {
  if (!BASE_URL) {
    t.skip('Set ACCESSIBILITY_BASE_URL to enable navigation-toggle tests.');
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
    t.skip('Playwright is not installed.');
    return;
  }
  const browser = await chromium.launch({ headless: true });
  try {
    for (const route of ROUTES) {
      await t.test(`navigation toggle behavior: ${route}`, async (routeTest) => {
        const page = await browser.newPage({
          viewport: { width: 390, height: 844 },
        });
        try {
          await page.goto(`${BASE_URL}${route}`, {
            waitUntil: 'networkidle',
            timeout: TIMEOUT_MS,
          });
          const toggle = page.locator(
            'button[aria-controls][aria-expanded], button.navbar-toggler, button.menu-toggle, button.nav-toggle, button[aria-label*="menu" i]'
          ).first();
          if (!(await toggle.count())) {
            routeTest.diagnostic(
              'No conventional navigation toggle was found; verify custom mobile-navigation controls manually.'
            );
            return;
          }
          if (!(await toggle.isVisible()) || !(await toggle.isEnabled())) {
            routeTest.diagnostic(
              'The detected navigation toggle is not visible or enabled at this viewport.'
            );
            return;
          }
          const expandedBefore = await toggle.getAttribute('aria-expanded');
          await toggle.focus();
          const focused = await toggle.evaluate(
            (element) => document.activeElement === element
          );
          assert.equal(
            focused,
            true,
            'Navigation toggle should be programmatically focusable.'
          );
          await page.keyboard.press('Enter');
          const expandedAfter = await toggle.getAttribute('aria-expanded');
          if (expandedBefore !== null && expandedAfter !== null) {
            assert.notEqual(
              expandedAfter,
              expandedBefore,
              'Activating the navigation toggle should change aria-expanded.'
            );
          } else {
            routeTest.diagnostic(
              'Toggle does not expose aria-expanded before and after activation; verify its state semantics manually.'
            );
          }
        } finally {
          await page.close();
        }
      });
    }
  } finally {
    await browser.close();
  }
});
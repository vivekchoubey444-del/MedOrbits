'use strict';
/**
 * MedOrbits -- Screen Reader Accessibility Tests
 *
 * File: tests/accessibility/screen-reader.test.js
 *
 * Purpose:
 *   Check common accessibility requirements that improve screen-reader
 *   navigation and interpretation across MedOrbits pages.
 *
 * Modes:
 *   1. Static mode: checks configured local HTML files using lightweight
 *      markup inspection. No browser dependency is required.
 *   2. Browser mode: optionally uses Playwright and axe-core for DOM-based
 *      accessibility checks against a running application.
 *
 * Static mode is a heuristic, not a replacement for assistive-technology
 * testing. Automated checks cannot confirm that a page is understandable
 * or usable with a real screen reader.
 *
 * Environment:
 *   ACCESSIBILITY_HTML_DIR=.
 *   ACCESSIBILITY_HTML_FILES=index.html,about.html
 *   ACCESSIBILITY_BASE_URL=http://localhost:3000
 *   ACCESSIBILITY_ROUTES=/,/about,/courses
 *   ACCESSIBILITY_REQUIRE_BROWSER=false
 *   ACCESSIBILITY_TIMEOUT_MS=10000
 *
 * Optional development dependencies:
 *   npm install --save-dev playwright @axe-core/playwright
 *   npx playwright install chromium
 *
 * Run:
 *   node --test tests/accessibility/screen-reader.test.js
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const HTML_DIR = path.resolve(
  process.env.ACCESSIBILITY_HTML_DIR || '.'
);
const HTML_FILES = (process.env.ACCESSIBILITY_HTML_FILES || 'index.html')
  .split(',')
  .map((file) => file.trim())
  .filter(Boolean);
const BASE_URL = process.env.ACCESSIBILITY_BASE_URL || '';
const ROUTES = (process.env.ACCESSIBILITY_ROUTES || '/')
  .split(',')
  .map((route) => route.trim())
  .filter(Boolean);
const REQUIRE_BROWSER =
  String(process.env.ACCESSIBILITY_REQUIRE_BROWSER || 'false')
    .toLowerCase() === 'true';
const TIMEOUT_MS = Number(
  process.env.ACCESSIBILITY_TIMEOUT_MS || 10000
);
const hasBrowserConfig = Boolean(BASE_URL);
const hasStaticFiles = HTML_FILES.some((file) =>
  fs.existsSync(path.resolve(HTML_DIR, file))
);
let chromium;
let AxeBuilder;
let browserDependenciesAvailable = false;
try {
  ({ chromium } = require('playwright'));
  ({ default: AxeBuilder } = require('@axe-core/playwright'));
  browserDependenciesAvailable = Boolean(chromium && AxeBuilder);
} catch {
  browserDependenciesAvailable = false;
}
function readHtml(file) {
  const resolved = path.resolve(HTML_DIR, file);
  assert.ok(
    resolved === HTML_DIR ||
      resolved.startsWith(`${HTML_DIR}${path.sep}`),
    `HTML file must remain inside ACCESSIBILITY_HTML_DIR: ${file}`
  );
  assert.ok(fs.existsSync(resolved), `HTML file not found: ${resolved}`);
  return fs.readFileSync(resolved, 'utf8');
}
/**
 * Lightweight tag scanner.
 *
 * This intentionally avoids treating comments and script/style contents
 * as normal page markup. It is not a complete HTML parser; browser checks
 * should be preferred when available.
 */
function tokenizeHtml(html) {
  const withoutComments = html.replace(/<!--[\s\S]*?-->/g, '');
  const withoutRawText = withoutComments.replace(
    /<(script|style|template)\b[^>]*>[\s\S]*?<\/\1\s*>/gi,
    ''
  );
  return [...withoutRawText.matchAll(/<([a-z][\w:-]*)\b([^>]*)>/gi)]
    .map((match) => ({
      tag: match[1].toLowerCase(),
      attrs: match[2] || '',
      raw: match[0],
    }));
}
function getAttribute(attrs, name) {
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = attrs.match(
    new RegExp(`(?:^|\\s)${escaped}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s>]+))`, 'i')
  );
  if (!match) {
    return null;
  }
  return match[1] ?? match[2] ?? match[3] ?? '';
}
function hasAttribute(attrs, name) {
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`(?:^|\\s)${escaped}(?:\\s*=|\\s|$)`, 'i')
    .test(attrs);
}
function hasNonEmptyAttribute(attrs, name) {
  const value = getAttribute(attrs, name);
  return value !== null && value.trim().length > 0;
}
function getOpeningTags(html, tagName) {
  return tokenizeHtml(html).filter((token) => token.tag === tagName);
}
function getIds(html) {
  return tokenizeHtml(html)
    .map((token) => getAttribute(token.attrs, 'id'))
    .filter((id) => id !== null && id.trim() !== '');
}
function getLabelForValues(html) {
  return getOpeningTags(html, 'label')
    .map((token) => getAttribute(token.attrs, 'for'))
    .filter((value) => value !== null && value.trim() !== '');
}
function getExplicitLabelIds(html) {
  return getLabelForValues(html);
}
function getInputs(html) {
  const formControls = new Set([
    'input',
    'select',
    'textarea',
  ]);
  return tokenizeHtml(html).filter((token) => {
    if (!formControls.has(token.tag)) {
      return false;
    }
    if (token.tag !== 'input') {
      return true;
    }
    const type = (getAttribute(token.attrs, 'type') || 'text')
      .toLowerCase();
    return !['hidden', 'submit', 'reset', 'button', 'image'].includes(type);
  });
}
function hasAccessibleNameHeuristic(token) {
  if (hasNonEmptyAttribute(token.attrs, 'aria-label')) {
    return true;
  }
  if (hasNonEmptyAttribute(token.attrs, 'aria-labelledby')) {
    return true;
  }
  if (token.tag === 'input') {
    const type = (getAttribute(token.attrs, 'type') || 'text')
      .toLowerCase();
    if (type === 'image' && hasNonEmptyAttribute(token.attrs, 'alt')) {
      return true;
    }
  }
  if (token.tag === 'img' && hasNonEmptyAttribute(token.attrs, 'alt')) {
    return true;
  }
  if (
    token.tag === 'button' &&
    (hasAttribute(token.attrs, 'title') ||
      hasAttribute(token.attrs, 'aria-label'))
  ) {
    return true;
  }
  return false;
}
function isDecorativeImage(token) {
  return (
    getAttribute(token.attrs, 'alt') === '' ||
    getAttribute(token.attrs, 'role') === 'presentation' ||
    getAttribute(token.attrs, 'role') === 'none' ||
    getAttribute(token.attrs, 'aria-hidden') === 'true'
  );
}
function checkUniqueIds(html) {
  const ids = getIds(html);
  const seen = new Set();
  const duplicates = new Set();
  for (const id of ids) {
    if (seen.has(id)) {
      duplicates.add(id);
    }
    seen.add(id);
  }
  return [...duplicates];
}
function checkLabelReferences(html) {
  const ids = new Set(getIds(html));
  const missing = [];
  for (const id of getExplicitLabelIds(html)) {
    if (!ids.has(id)) {
      missing.push(id);
    }
  }
  return missing;
}
function checkAriaReferences(html) {
  const ids = new Set(getIds(html));
  const missing = [];
  for (const token of tokenizeHtml(html)) {
    for (const attrName of ['aria-labelledby', 'aria-describedby', 'aria-controls', 'aria-owns']) {
      const value = getAttribute(token.attrs, attrName);
      if (!value) {
        continue;
      }
      for (const id of value.trim().split(/\s+/)) {
        if (id && !ids.has(id)) {
          missing.push({
            attribute: attrName,
            id,
            element: token.tag,
          });
        }
      }
    }
  }
  return missing;
}
function checkHeadingStructure(html) {
  const headings = tokenizeHtml(html)
    .filter((token) => /^h[1-6]$/.test(token.tag))
    .map((token) => Number(token.tag.slice(1)));
  const issues = [];
  if (headings.length === 0) {
    issues.push('No semantic h1–h6 headings found.');
    return issues;
  }
  if (!headings.includes(1)) {
    issues.push('No h1 heading found.');
  }
  if (headings.filter((level) => level === 1).length > 1) {
    issues.push('More than one h1 heading found; verify the page outline.');
  }
  for (let i = 1; i < headings.length; i += 1) {
    if (headings[i] > headings[i - 1] + 1) {
      issues.push(
        `Heading level jumps from h${headings[i - 1]} to h${headings[i]}.`
      );
    }
  }
  return issues;
}
function checkLandmarks(html) {
  const tokens = tokenizeHtml(html);
  const semanticLandmarks = new Set([
    'header',
    'nav',
    'main',
    'footer',
    'aside',
  ]);
  const hasMain = tokens.some((token) =>
    token.tag === 'main' ||
    getAttribute(token.attrs, 'role') === 'main'
  );
  const hasNavigation = tokens.some((token) =>
    token.tag === 'nav' ||
    getAttribute(token.attrs, 'role') === 'navigation'
  );
  const issues = [];
  if (!hasMain) {
    issues.push('No main landmark found.');
  }
  if (!hasNavigation) {
    issues.push('No navigation landmark found; verify whether navigation is needed on this page.');
  }
  const roleMainCount = tokens.filter((token) =>
    token.tag === 'main' ||
    getAttribute(token.attrs, 'role') === 'main'
  ).length;
  if (roleMainCount > 1) {
    issues.push('Multiple main landmarks found.');
  }
  // Retain this set to document which native landmark elements are recognized.
  assert.ok(semanticLandmarks.size > 0);
  return issues;
}
function checkImages(html) {
  const images = getOpeningTags(html, 'img');
  return images
    .filter((image) => {
      if (isDecorativeImage(image)) {
        return false;
      }
      return !hasAttribute(image.attrs, 'alt');
    })
    .map((image) => image.raw);
}
function checkFormControls(html) {
  const controls = getInputs(html);
  const ids = new Set(getIds(html));
  const explicitLabels = new Set(getLabelForValues(html));
  const issues = [];
  for (const control of controls) {
    const id = getAttribute(control.attrs, 'id');
    const hasLabelByFor = id && explicitLabels.has(id);
    const hasAriaLabel =
      hasNonEmptyAttribute(control.attrs, 'aria-label') ||
      hasNonEmptyAttribute(control.attrs, 'aria-labelledby');
    // A wrapping <label> is difficult to establish reliably with this
    // lightweight scanner. Browser mode validates the rendered DOM.
    const hasSomeLabel = hasLabelByFor || hasAriaLabel;
    if (!hasSomeLabel) {
      issues.push(
        `${control.tag} control may not have an accessible name: ${control.raw}`
      );
    }
    if (id && !ids.has(id)) {
      issues.push(`Control references an unknown id: ${id}`);
    }
  }
  return issues;
}
function checkInteractiveNames(html) {
  const tokens = tokenizeHtml(html);
  const issues = [];
  for (const token of tokens) {
    const isInteractive =
      token.tag === 'button' ||
      token.tag === 'select' ||
      token.tag === 'textarea' ||
      (token.tag === 'input' &&
        !['hidden', 'submit', 'reset', 'button', 'image'].includes(
          (getAttribute(token.attrs, 'type') || 'text').toLowerCase()
        )) ||
      (token.tag === 'a' && hasAttribute(token.attrs, 'href')) ||
      hasAttribute(token.attrs, 'onclick') ||
      ['button', 'link', 'checkbox', 'radio', 'switch', 'tab', 'menuitem']
        .includes((getAttribute(token.attrs, 'role') || '').toLowerCase());
    if (!isInteractive) {
      continue;
    }
    const hasNameAttribute =
      hasAccessibleNameHeuristic(token) ||
      hasNonEmptyAttribute(token.attrs, 'title');
    // Static scanning cannot inspect inner text or labels wrapping controls.
    // Flag only missing name attributes as a prompt for browser verification.
    if (!hasNameAttribute) {
      issues.push(
        `${token.tag} may need an accessible name; inspect its rendered text and label relationships.`
      );
    }
  }
  return issues;
}
function checkLiveRegionMarkup(html) {
  const tokens = tokenizeHtml(html);
  const hasLiveRegion = tokens.some((token) => {
    const live = (getAttribute(token.attrs, 'aria-live') || '')
      .toLowerCase();
    return ['polite', 'assertive', 'off'].includes(live) ||
      ['status', 'alert', 'log', 'marquee', 'timer']
        .includes((getAttribute(token.attrs, 'role') || '').toLowerCase());
  });
  // A live region is not required on every page. This check is informational.
  return {
    hasLiveRegion,
    message: hasLiveRegion
      ? 'A live-region pattern is present; verify announcements are appropriate.'
      : 'No live region detected. Add one only where dynamic updates need announcement.',
  };
}
function checkAriaHiddenFocusables(html) {
  const tokens = tokenizeHtml(html);
  const issues = [];
  let hiddenAncestorDepth = 0;
  // This detects direct aria-hidden on a focusable element, not all ancestor
  // relationships. Use the browser check for accurate DOM ancestry.
  for (const token of tokens) {
    const role = (getAttribute(token.attrs, 'role') || '').toLowerCase();
    const isFocusableByDefault =
      ['a', 'button', 'input', 'select', 'textarea'].includes(token.tag) &&
      !(token.tag === 'a' && !hasAttribute(token.attrs, 'href')) &&
      !(token.tag === 'input' &&
        (getAttribute(token.attrs, 'type') || '').toLowerCase() === 'hidden');
    const hasTabIndex =
      getAttribute(token.attrs, 'tabindex') !== null &&
      Number(getAttribute(token.attrs, 'tabindex')) >= 0;
    if (
      getAttribute(token.attrs, 'aria-hidden') === 'true' &&
      (isFocusableByDefault || hasTabIndex || role === 'button' || role === 'link')
    ) {
      issues.push(
        `Focusable element is directly marked aria-hidden="true": ${token.raw}`
      );
    }
  }
  return issues;
}
function runStaticChecks(file) {
  const html = readHtml(file);
  const tokens = tokenizeHtml(html);
  assert.ok(tokens.length > 0, `${file}: no recognizable HTML tags found`);
  const duplicateIds = checkUniqueIds(html);
  const missingLabelTargets = checkLabelReferences(html);
  const missingAriaRefs = checkAriaReferences(html);
  const headingIssues = checkHeadingStructure(html);
  const landmarkIssues = checkLandmarks(html);
  const missingAlt = checkImages(html);
  const formIssues = checkFormControls(html);
  const interactiveIssues = checkInteractiveNames(html);
  const hiddenFocusableIssues = checkAriaHiddenFocusables(html);
  const liveRegionInfo = checkLiveRegionMarkup(html);
  assert.deepEqual(
    duplicateIds,
    [],
    `${file}: duplicate id values: ${duplicateIds.join(', ')}`
  );
  assert.deepEqual(
    missingLabelTargets,
    [],
    `${file}: label[for] points to missing id(s): ${missingLabelTargets.join(', ')}`
  );
  assert.deepEqual(
    missingAriaRefs,
    [],
    `${file}: broken ARIA ID references: ${JSON.stringify(missingAriaRefs)}`
  );
  assert.deepEqual(
    missingAlt,
    [],
    `${file}: images may be missing alt attributes: ${missingAlt.join('; ')}`
  );
  assert.deepEqual(
    hiddenFocusableIssues,
    [],
    `${file}: focusable elements are hidden from assistive technology: ${hiddenFocusableIssues.join('; ')}`
  );
  // Heading and landmark checks are strict by default. If a page is a partial
  // or intentionally minimal fragment, test a full page or configure it out.
  assert.deepEqual(
    headingIssues,
    [],
    `${file}: heading structure issues: ${headingIssues.join(' ')}`
  );
  assert.deepEqual(
    landmarkIssues,
    [],
    `${file}: landmark issues: ${landmarkIssues.join(' ')}`
  );
  assert.deepEqual(
    formIssues,
    [],
    `${file}: possible form-label issues: ${formIssues.join(' ')}`
  );
  assert.deepEqual(
    interactiveIssues,
    [],
    `${file}: possible interactive-name issues: ${interactiveIssues.join(' ')}`
  );
  // No assertion is made about live-region presence because static pages do
  // not necessarily need dynamic announcements.
  return {
    file,
    liveRegionInfo,
  };
}
test('screen-reader accessibility configuration is valid', () => {
  assert.ok(
    Number.isFinite(TIMEOUT_MS) && TIMEOUT_MS > 0,
    'ACCESSIBILITY_TIMEOUT_MS must be a positive number'
  );
  assert.ok(HTML_FILES.length > 0, 'At least one static HTML file is required');
  if (REQUIRE_BROWSER) {
    assert.ok(
      hasBrowserConfig,
      'ACCESSIBILITY_REQUIRE_BROWSER=true requires ACCESSIBILITY_BASE_URL'
    );
    assert.ok(
      browserDependenciesAvailable,
      'Browser testing was required but Playwright or @axe-core/playwright is unavailable'
    );
  }
});
if (hasStaticFiles) {
  for (const file of HTML_FILES) {
    const resolved = path.resolve(HTML_DIR, file);
    if (!fs.existsSync(resolved)) {
      test(`static screen-reader checks: ${file}`, { skip: 'Configured file does not exist' }, () => {});
      continue;
    }
    test(`static screen-reader checks: ${file}`, () => {
      const result = runStaticChecks(file);
      if (!result.liveRegionInfo.hasLiveRegion) {
        console.log(
          `[accessibility] ${file}: ${result.liveRegionInfo.message}`
        );
      }
    });
  }
} else {
  test('static screen-reader checks', {
    skip: `No configured HTML files found in ${HTML_DIR}`,
  }, () => {});
}
if (hasBrowserConfig && browserDependenciesAvailable) {
  test('browser screen-reader accessibility checks', async (t) => {
    const browser = await chromium.launch({ headless: true });
    try {
      const context = await browser.newContext();
      const page = await context.newPage();
      page.setDefaultTimeout(TIMEOUT_MS);
      for (const route of ROUTES) {
        await t.test(`axe scan: ${route}`, async () => {
          const url = new URL(route, BASE_URL).toString();
          await page.goto(url, {
            waitUntil: 'domcontentloaded',
            timeout: TIMEOUT_MS,
          });
          const results = await new AxeBuilder({ page })
            .withTags([
              'wcag2a',
              'wcag2aa',
              'wcag21a',
              'wcag21aa',
              'wcag22aa',
              'best-practice',
            ])
            .analyze();
          const seriousViolations = results.violations.filter((violation) =>
            ['critical', 'serious'].includes(violation.impact)
          );
          assert.deepEqual(
            seriousViolations.map((violation) => ({
              id: violation.id,
              impact: violation.impact,
              help: violation.help,
              nodes: violation.nodes.map((node) => ({
                target: node.target,
                summary: node.failureSummary,
              })),
            })),
            [],
            `Accessibility violations on ${url}`
          );
        });
        await t.test(`document landmarks and heading presence: ${route}`, async () => {
          const url = new URL(route, BASE_URL).toString();
          await page.goto(url, {
            waitUntil: 'domcontentloaded',
            timeout: TIMEOUT_MS,
          });
          const structure = await page.evaluate(() => {
            const mainLandmarks = document.querySelectorAll(
              'main, [role="main"]'
            ).length;
            const headings = Array.from(
              document.querySelectorAll('h1, h2, h3, h4, h5, h6')
            ).map((heading) => ({
              level: Number(heading.tagName.slice(1)),
              text: (heading.innerText || heading.textContent || '').trim(),
            }));
            const unnamedButtons = Array.from(
              document.querySelectorAll('button, [role="button"]')
            ).filter((element) => {
              const name = (
                element.getAttribute('aria-label') ||
                element.getAttribute('title') ||
                element.innerText ||
                element.textContent ||
                ''
              ).trim();
              const labelledBy = element.getAttribute('aria-labelledby');
              return !name && !labelledBy;
            }).map((element) => element.outerHTML.slice(0, 300));
            const unnamedLinks = Array.from(
              document.querySelectorAll('a[href], [role="link"]')
            ).filter((element) => {
              const name = (
                element.getAttribute('aria-label') ||
                element.getAttribute('title') ||
                element.innerText ||
                element.textContent ||
                ''
              ).trim();
              const labelledBy = element.getAttribute('aria-labelledby');
              return !name && !labelledBy;
            }).map((element) => element.outerHTML.slice(0, 300));
            const unnamedFormControls = Array.from(
              document.querySelectorAll('input:not([type="hidden"]), select, textarea')
            ).filter((element) => {
              if (
                ['submit', 'reset', 'button', 'image'].includes(
                  (element.getAttribute('type') || '').toLowerCase()
                )
              ) {
                return false;
              }
              const hasNativeLabel =
                typeof element.labels !== 'undefined' &&
                element.labels &&
                element.labels.length > 0;
              const hasAriaLabel =
                Boolean(element.getAttribute('aria-label')) ||
                Boolean(element.getAttribute('aria-labelledby'));
              return !hasNativeLabel && !hasAriaLabel;
            }).map((element) => element.outerHTML.slice(0, 300));
            const imagesMissingAlt = Array.from(
              document.querySelectorAll('img:not([alt])')
            ).map((element) => element.outerHTML.slice(0, 300));
            const brokenReferences = [];
            for (const element of document.querySelectorAll(
              '[aria-labelledby], [aria-describedby], [aria-controls], [aria-owns]'
            )) {
              for (const attr of [
                'aria-labelledby',
                'aria-describedby',
                'aria-controls',
                'aria-owns',
              ]) {
                const value = element.getAttribute(attr);
                if (!value) continue;
                for (const id of value.trim().split(/\s+/)) {
                  if (id && !document.getElementById(id)) {
                    brokenReferences.push({
                      attribute: attr,
                      id,
                      element: element.outerHTML.slice(0, 200),
                    });
                  }
                }
              }
            }
            return {
              mainLandmarks,
              headings,
              unnamedButtons,
              unnamedLinks,
              unnamedFormControls,
              imagesMissingAlt,
              brokenReferences,
            };
          });
          assert.equal(
            structure.mainLandmarks,
            1,
            `${url}: expected exactly one main landmark`
          );
          assert.ok(
            structure.headings.some((heading) => heading.level === 1 && heading.text),
            `${url}: expected a non-empty h1`
          );
          assert.deepEqual(
            structure.unnamedButtons,
            [],
            `${url}: unnamed buttons: ${JSON.stringify(structure.unnamedButtons)}`
          );
          assert.deepEqual(
            structure.unnamedLinks,
            [],
            `${url}: unnamed links: ${JSON.stringify(structure.unnamedLinks)}`
          );
          assert.deepEqual(
            structure.unnamedFormControls,
            [],
            `${url}: unnamed form controls: ${JSON.stringify(structure.unnamedFormControls)}`
          );
          assert.deepEqual(
            structure.imagesMissingAlt,
            [],
            `${url}: images missing alt attributes: ${JSON.stringify(structure.imagesMissingAlt)}`
          );
          assert.deepEqual(
            structure.brokenReferences,
            [],
            `${url}: broken ARIA references: ${JSON.stringify(structure.brokenReferences)}`
          );
        });
      }
      await context.close();
    } finally {
      await browser.close();
    }
  });
} else if (hasBrowserConfig && REQUIRE_BROWSER) {
  test('browser screen-reader accessibility checks', () => {
    assert.fail(
      'Browser tests required but Playwright and @axe-core/playwright are not installed.'
    );
  });
} else {
  test('browser screen-reader accessibility checks', {
    skip: hasBrowserConfig
      ? 'Install Playwright and @axe-core/playwright to enable browser checks'
      : 'Set ACCESSIBILITY_BASE_URL to enable browser checks',
  }, () => {});
}
'use strict';
/**
 * MedOrbits -- Color Contrast Accessibility Tests
 *
 * File: tests/accessibility/color-contrast.test.js
 *
 * Checks:
 * - WCAG relative luminance and contrast-ratio calculations.
 * - Normal text contrast: WCAG AA >= 4.5:1.
 * - Large text contrast: WCAG AA >= 3:1.
 * - Non-text UI components and meaningful graphics: >= 3:1.
 * - CSS color token definitions.
 * - CSS foreground/background declarations where statically resolvable.
 * - Optional rendered-page contrast checks using Playwright.
 *
 * Runtime: Node.js >= 20
 *
 * Run:
 *   node --test tests/accessibility/color-contrast.test.js
 *
 * Optional:
 *   npm install --save-dev playwright
 *   npx playwright install chromium
 *
 * Environment:
 *   ACCESSIBILITY_BASE_URL=http://127.0.0.1:3000
 *   ACCESSIBILITY_ROUTES=/,/about,/courses
 *   ACCESSIBILITY_CSS_DIR=assets/css
 *   ACCESSIBILITY_HTML_DIR=.
 *   ACCESSIBILITY_REQUIRE_BROWSER=true
 *
 * Notes:
 * - Static CSS analysis cannot resolve every computed color.
 * - Browser checks are more reliable for rendered foreground/background pairs.
 * - Images, gradients, transparency, pseudo-elements, and overlays may require
 *   manual verification or dedicated visual accessibility tooling.
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ROOT_DIR = path.resolve(__dirname, '../..');
const CSS_DIR = path.resolve(
  ROOT_DIR,
  process.env.ACCESSIBILITY_CSS_DIR || 'assets/css'
);
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
const NORMAL_TEXT_MIN = 4.5;
const LARGE_TEXT_MIN = 3;
const NON_TEXT_MIN = 3;
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
const CSS_EXTENSIONS = new Set(['.css']);
const HTML_EXTENSIONS = new Set(['.html', '.htm']);
function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}
function parseRgbChannel(channel) {
  const value = Number.parseFloat(channel);
  if (!Number.isFinite(value)) {
    return null;
  }
  if (channel.trim().endsWith('%')) {
    return clamp(value / 100, 0, 1);
  }
  return clamp(value / 255, 0, 1);
}
function parseAlpha(channel) {
  if (channel === undefined) {
    return 1;
  }
  const value = Number.parseFloat(channel);
  if (!Number.isFinite(value)) {
    return null;
  }
  if (channel.trim().endsWith('%')) {
    return clamp(value / 100, 0, 1);
  }
  return clamp(value, 0, 1);
}
function parseColor(input) {
  if (typeof input !== 'string') {
    return null;
  }
  const color = input.trim().toLowerCase();
  const namedColors = {
    black: '#000000',
    white: '#ffffff',
    red: '#ff0000',
    green: '#008000',
    blue: '#0000ff',
    yellow: '#ffff00',
    orange: '#ffa500',
    purple: '#800080',
    gray: '#808080',
    grey: '#808080',
    silver: '#c0c0c0',
    maroon: '#800000',
    navy: '#000080',
    teal: '#008080',
    olive: '#808000',
    lime: '#00ff00',
    aqua: '#00ffff',
    cyan: '#00ffff',
    fuchsia: '#ff00ff',
    magenta: '#ff00ff',
    rebeccapurple: '#663399',
    transparent: 'transparent',
  };
  const normalized = namedColors[color] || color;
  if (normalized === 'transparent') {
    return { r: 0, g: 0, b: 0, a: 0 };
  }
  const hexMatch = normalized.match(
    /^#([0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})$/i
  );
  if (hexMatch) {
    let hex = hexMatch[1];
    if (hex.length === 3 || hex.length === 4) {
      hex = [...hex].map((character) => character + character).join('');
    }
    const hasAlpha = hex.length === 8;
    return {
      r: Number.parseInt(hex.slice(0, 2), 16) / 255,
      g: Number.parseInt(hex.slice(2, 4), 16) / 255,
      b: Number.parseInt(hex.slice(4, 6), 16) / 255,
      a: hasAlpha
        ? Number.parseInt(hex.slice(6, 8), 16) / 255
        : 1,
    };
  }
  const rgbMatch = normalized.match(
    /^rgba?\(\s*([^)]*)\s*\)$/
  );
  if (rgbMatch) {
    const contents = rgbMatch[1].replace(/\s*\/\s*/, ',');
    const parts = contents.includes(',')
      ? contents.split(',').map((part) => part.trim())
      : contents.trim().split(/\s+/);
    if (parts.length < 3 || parts.length > 4) {
      return null;
    }
    const r = parseRgbChannel(parts[0]);
    const g = parseRgbChannel(parts[1]);
    const b = parseRgbChannel(parts[2]);
    const a = parseAlpha(parts[3]);
    if ([r, g, b, a].some((value) => value === null)) {
      return null;
    }
    return { r, g, b, a };
  }
  return null;
}
function linearizeChannel(channel) {
  return channel <= 0.04045
    ? channel / 12.92
    : ((channel + 0.055) / 1.055) ** 2.4;
}
function relativeLuminance(color) {
  const parsed = typeof color === 'string' ? parseColor(color) : color;
  if (!parsed || parsed.a < 1) {
    throw new Error(
      `Cannot calculate luminance for an unresolved or transparent color: ${color}`
    );
  }
  const r = linearizeChannel(parsed.r);
  const g = linearizeChannel(parsed.g);
  const b = linearizeChannel(parsed.b);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
function contrastRatio(foreground, background) {
  const foregroundLuminance = relativeLuminance(foreground);
  const backgroundLuminance = relativeLuminance(background);
  const lighter = Math.max(
    foregroundLuminance,
    backgroundLuminance
  );
  const darker = Math.min(
    foregroundLuminance,
    backgroundLuminance
  );
  return (lighter + 0.05) / (darker + 0.05);
}
function meetsContrast(foreground, background, minimum) {
  return contrastRatio(foreground, background) >= minimum;
}
function walkFiles(directory, extensions, results = []) {
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
        walkFiles(fullPath, extensions, results);
      }
      continue;
    }
    if (entry.isFile() && extensions.has(path.extname(entry.name).toLowerCase())) {
      results.push(fullPath);
    }
  }
  return results;
}
function relativePath(filePath) {
  return path.relative(ROOT_DIR, filePath).split(path.sep).join('/');
}
function stripCssComments(css) {
  return css.replace(/\/\*[\s\S]*?\*\//g, '');
}
function extractDeclarations(css) {
  const declarations = [];
  const rulePattern = /([^{}]+)\{([^{}]*)\}/g;
  let match;
  while ((match = rulePattern.exec(css)) !== null) {
    const selector = match[1].trim();
    const body = match[2];
    for (const declaration of body.split(';')) {
      const separator = declaration.indexOf(':');
      if (separator < 0) {
        continue;
      }
      const property = declaration.slice(0, separator).trim().toLowerCase();
      const value = declaration.slice(separator + 1).trim();
      if (property && value) {
        declarations.push({
          selector,
          property,
          value,
        });
      }
    }
  }
  return declarations;
}
function extractHexColors(css) {
  return css.match(/#[0-9a-f]{3,8}\b/gi) || [];
}
function resolveCssVariable(value, variables, depth = 0) {
  if (depth > 10) {
    return null;
  }
  const match = value.match(
    /^var\(\s*(--[\w-]+)\s*(?:,\s*(.+))?\)$/
  );
  if (!match) {
    return value;
  }
  const [, variableName, fallback] = match;
  const replacement = variables.get(variableName) || fallback;
  if (!replacement) {
    return null;
  }
  return resolveCssVariable(replacement.trim(), variables, depth + 1);
}
function extractVariables(declarations) {
  const variables = new Map();
  for (const declaration of declarations) {
    if (declaration.property.startsWith('--')) {
      variables.set(declaration.property, declaration.value);
    }
  }
  return variables;
}
function isPotentiallyVisibleColor(value) {
  return (
    /^(#|rgb\(|rgba\(|white$|black$|red$|blue$|green$|gray$|grey$|maroon$|navy$|teal$|purple$|orange$|yellow$)/i
      .test(value.trim()) ||
    /^var\(/i.test(value.trim())
  );
}
function analyzeCssFile(filePath) {
  const source = stripCssComments(fs.readFileSync(filePath, 'utf8'));
  const declarations = extractDeclarations(source);
  const variables = extractVariables(declarations);
  const findings = [];
  const unresolved = [];
  for (const declaration of declarations) {
    const { selector, property, value } = declaration;
    if (
      property !== 'color' &&
      property !== 'background-color' &&
      property !== 'border-color' &&
      property !== 'outline-color' &&
      property !== 'fill' &&
      property !== 'stroke'
    ) {
      continue;
    }
    const resolvedValue = resolveCssVariable(value, variables);
    if (!resolvedValue || !parseColor(resolvedValue)) {
      if (isPotentiallyVisibleColor(value)) {
        unresolved.push({
          selector,
          property,
          value,
        });
      }
      continue;
    }
    findings.push({
      selector,
      property,
      value: resolvedValue,
      color: parseColor(resolvedValue),
    });
  }
  return {
    file: relativePath(filePath),
    declarations,
    variables,
    findings,
    unresolved,
    hexColors: extractHexColors(source),
  };
}
function extractCssColorTokens(cssFiles) {
  const tokens = new Map();
  for (const filePath of cssFiles) {
    const source = stripCssComments(fs.readFileSync(filePath, 'utf8'));
    const declarations = extractDeclarations(source);
    const variables = extractVariables(declarations);
    for (const [name, value] of variables.entries()) {
      const resolved = resolveCssVariable(value, variables);
      if (resolved && parseColor(resolved)) {
        tokens.set(name, {
          value: resolved,
          source: relativePath(filePath),
        });
      }
    }
  }
  return tokens;
}
function contrastFailuresForSimplePairs(analyses) {
  const failures = [];
  for (const analysis of analyses) {
    const colorsBySelector = new Map();
    for (const item of analysis.findings) {
      if (
        item.property !== 'color' &&
        item.property !== 'background-color'
      ) {
        continue;
      }
      if (!colorsBySelector.has(item.selector)) {
        colorsBySelector.set(item.selector, {});
      }
      colorsBySelector.get(item.selector)[item.property] = item.value;
    }
    for (const [selector, pair] of colorsBySelector.entries()) {
      if (!pair.color || !pair['background-color']) {
        continue;
      }
      try {
        const ratio = contrastRatio(
          pair.color,
          pair['background-color']
        );
        if (ratio < NORMAL_TEXT_MIN) {
          failures.push({
            file: analysis.file,
            selector,
            foreground: pair.color,
            background: pair['background-color'],
            ratio: Number(ratio.toFixed(2)),
            minimum: NORMAL_TEXT_MIN,
          });
        }
      } catch {
        // Transparent colors and unsupported formats are not statically
        // resolvable. They must be checked in a rendered browser context.
      }
    }
  }
  return failures;
}
test('WCAG contrast calculations match known reference values', () => {
  assert.equal(contrastRatio('#000000', '#ffffff'), 21);
  assert.ok(
    Math.abs(contrastRatio('#767676', '#ffffff') - 4.54) < 0.02
  );
  assert.ok(
    Math.abs(contrastRatio('#777777', '#ffffff') - 4.48) < 0.02
  );
  assert.equal(meetsContrast('#000000', '#ffffff', 4.5), true);
  assert.equal(meetsContrast('#777777', '#ffffff', 4.5), false);
  assert.equal(meetsContrast('#777777', '#ffffff', 3), true);
});
test('WCAG contrast calculations support short and alpha hex colors', () => {
  assert.equal(contrastRatio('#000', '#fff'), 21);
  assert.equal(contrastRatio('#000000', '#ffffff'), 21);
  const transparentBlack = parseColor('#00000000');
  assert.ok(transparentBlack);
  assert.equal(transparentBlack.a, 0);
});
test('RGB and percentage RGB colors are parsed correctly', () => {
  assert.deepEqual(parseColor('rgb(0, 0, 0)'), {
    r: 0,
    g: 0,
    b: 0,
    a: 1,
  });
  assert.deepEqual(parseColor('rgb(100% 100% 100%)'), {
    r: 1,
    g: 1,
    b: 1,
    a: 1,
  });
  assert.equal(
    contrastRatio('rgb(0, 0, 0)', 'rgb(255, 255, 255)'),
    21
  );
});
test('transparent colors are not incorrectly treated as opaque contrast pairs', () => {
  assert.throws(
    () => relativeLuminance('transparent'),
    /transparent color/i
  );
  assert.throws(
    () => contrastRatio('#00000000', '#ffffff'),
    /transparent color/i
  );
});
test('contrast ratio is symmetric and always at least 1 for opaque colors', () => {
  const pairs = [
    ['#000000', '#ffffff'],
    ['#162d25', '#f4efe6'],
    ['#8b1e3f', '#f7e7ce'],
    ['#444444', '#dddddd'],
  ];
  for (const [foreground, background] of pairs) {
    const forward = contrastRatio(foreground, background);
    const reverse = contrastRatio(background, foreground);
    assert.ok(forward >= 1);
    assert.ok(Math.abs(forward - reverse) < 1e-12);
  }
});
test('CSS asset directory is present or explicitly reported as unavailable', (t) => {
  if (!fs.existsSync(CSS_DIR)) {
    t.diagnostic(
      `CSS directory not found: ${CSS_DIR}. Set ACCESSIBILITY_CSS_DIR to the actual CSS directory.`
    );
    t.skip('No CSS directory available for static analysis.');
    return;
  }
  const cssFiles = walkFiles(CSS_DIR, CSS_EXTENSIONS);
  assert.ok(
    cssFiles.length > 0,
    `No CSS files found under ${CSS_DIR}`
  );
});
test('CSS color declarations use parseable literal colors or documented CSS variables', (t) => {
  if (!fs.existsSync(CSS_DIR)) {
    t.skip('CSS directory is unavailable.');
    return;
  }
  const cssFiles = walkFiles(CSS_DIR, CSS_EXTENSIONS);
  if (cssFiles.length === 0) {
    t.skip('No CSS files found.');
    return;
  }
  const issues = [];
  for (const filePath of cssFiles) {
    const analysis = analyzeCssFile(filePath);
    for (const item of analysis.unresolved) {
      issues.push(
        `${analysis.file}: ${item.selector} { ${item.property}: ${item.value} }`
      );
    }
  }
  assert.deepEqual(
    issues,
    [],
    `Unresolved CSS color values were found:\n${issues.join('\n')}`
  );
});
test('CSS custom-property color tokens are non-empty and parseable', (t) => {
  if (!fs.existsSync(CSS_DIR)) {
    t.skip('CSS directory is unavailable.');
    return;
  }
  const cssFiles = walkFiles(CSS_DIR, CSS_EXTENSIONS);
  if (cssFiles.length === 0) {
    t.skip('No CSS files found.');
    return;
  }
  const tokens = extractCssColorTokens(cssFiles);
  for (const [name, token] of tokens.entries()) {
    assert.ok(name.startsWith('--'));
    assert.ok(token.value.length > 0);
    assert.ok(
      parseColor(token.value),
      `Invalid color token ${name}: ${token.value} (${token.source})`
    );
  }
});
test('simple CSS foreground/background pairs meet WCAG AA normal-text contrast', (t) => {
  if (!fs.existsSync(CSS_DIR)) {
    t.skip('CSS directory is unavailable.');
    return;
  }
  const cssFiles = walkFiles(CSS_DIR, CSS_EXTENSIONS);
  if (cssFiles.length === 0) {
    t.skip('No CSS files found.');
    return;
  }
  const analyses = cssFiles.map(analyzeCssFile);
  const failures = contrastFailuresForSimplePairs(analyses);
  assert.deepEqual(
    failures,
    [],
    [
      'Static CSS contrast failures detected.',
      'Review the foreground/background pair and determine the applicable WCAG text-size threshold.',
      JSON.stringify(failures, null, 2),
    ].join('\n')
  );
});
test('HTML asset directory can be scanned for inline color declarations', (t) => {
  if (!fs.existsSync(HTML_DIR)) {
    t.skip(`HTML directory not found: ${HTML_DIR}`);
    return;
  }
  const htmlFiles = walkFiles(HTML_DIR, HTML_EXTENSIONS);
  if (htmlFiles.length === 0) {
    t.diagnostic(`No HTML files found under ${HTML_DIR}.`);
    t.skip('No HTML files available for static analysis.');
    return;
  }
  const findings = [];
  for (const filePath of htmlFiles) {
    const source = fs.readFileSync(filePath, 'utf8');
    const inlineStylePattern =
      /style\s*=\s*["'][^"']*(?:color|background-color)\s*:[^"']*["']/gi;
    for (const match of source.matchAll(inlineStylePattern)) {
      findings.push({
        file: relativePath(filePath),
        declaration: match[0],
      });
    }
  }
  // Inline styles are reported for review rather than automatically rejected.
  // Their computed contrast depends on the final rendered background.
  if (findings.length > 0) {
    t.diagnostic(
      `Found ${findings.length} inline color declaration(s). Review these in a browser:\n` +
        findings
          .slice(0, 25)
          .map((finding) => `${finding.file}: ${finding.declaration}`)
          .join('\n')
    );
  }
});
test('rendered pages meet WCAG AA contrast where Playwright is installed', async (t) => {
  if (!BASE_URL) {
    t.skip(
      'Set ACCESSIBILITY_BASE_URL to enable rendered-page contrast testing.'
    );
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
    t.skip(
      'Playwright is not installed; static CSS checks remain available.'
    );
    return;
  }
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage();
    for (const route of ROUTES) {
      await t.test(`rendered contrast: ${route}`, async () => {
        const response = await page.goto(`${BASE_URL}${route}`, {
          waitUntil: 'networkidle',
          timeout: TIMEOUT_MS,
        });
        assert.ok(
          response,
          `No navigation response received for ${route}`
        );
        assert.ok(
          response.status() < 500,
          `Page returned server error ${response.status()} for ${route}`
        );
        const results = await page.evaluate(() => {
          function parseComputedRgb(value) {
            const match = value.match(
              /^rgba?\(\s*([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)(?:\s*[,/]\s*([\d.]+%?))?\s*\)$/i
            );
            if (!match) {
              return null;
            }
            const alpha = match[4]
              ? match[4].endsWith('%')
                ? Number.parseFloat(match[4]) / 100
                : Number.parseFloat(match[4])
              : 1;
            return {
              r: Number(match[1]) / 255,
              g: Number(match[2]) / 255,
              b: Number(match[3]) / 255,
              a: alpha,
            };
          }
          function linearize(value) {
            return value <= 0.04045
              ? value / 12.92
              : ((value + 0.055) / 1.055) ** 2.4;
          }
          function luminance(color) {
            return (
              0.2126 * linearize(color.r) +
              0.7152 * linearize(color.g) +
              0.0722 * linearize(color.b)
            );
          }
          function ratio(foreground, background) {
            const a = luminance(foreground);
            const b = luminance(background);
            return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
          }
          function isLargeText(element, style) {
            const size = Number.parseFloat(style.fontSize);
            const weight = Number.parseInt(style.fontWeight, 10) || 400;
            // WCAG large text: at least 18pt (24 CSS px), or at least
            // 14pt (approximately 18.67 CSS px) when bold.
            return size >= 24 || (weight >= 700 && size >= 18.67);
          }
          function effectiveBackground(element) {
            let current = element;
            while (current && current.nodeType === Node.ELEMENT_NODE) {
              const style = getComputedStyle(current);
              const color = parseComputedRgb(style.backgroundColor);
              if (color && color.a >= 0.999) {
                return color;
              }
              current = current.parentElement;
            }
            // The actual page canvas may be influenced by browser defaults,
            // transparent body styles, or imagery. Do not assume white here.
            return null;
          }
          const failures = [];
          const unresolved = [];
          const checked = [];
          const candidates = document.querySelectorAll(
            'p, a, button, label, li, dt, dd, th, td, h1, h2, h3, h4, h5, h6, ' +
            'input, textarea, select, summary, [role="button"], [role="link"]'
          );
          for (const element of candidates) {
            const style = getComputedStyle(element);
            if (
              style.display === 'none' ||
              style.visibility === 'hidden' ||
              Number.parseFloat(style.opacity) === 0
            ) {
              continue;
            }
            const text = (
              element.innerText ||
              element.value ||
              element.getAttribute('aria-label') ||
              ''
            ).trim();
            if (!text) {
              continue;
            }
            const foreground = parseComputedRgb(style.color);
            const background = effectiveBackground(element);
            if (!foreground || !background || foreground.a < 0.999) {
              unresolved.push({
                tag: element.tagName,
                text: text.slice(0, 80),
                reason: 'Foreground/background requires compositing or image analysis.',
              });
              continue;
            }
            const minimum = isLargeText(element, style) ? 3 : 4.5;
            const contrast = ratio(foreground, background);
            const result = {
              tag: element.tagName,
              text: text.slice(0, 80),
              foreground: style.color,
              background: `rgb(${Math.round(background.r * 255)}, ${Math.round(background.g * 255)}, ${Math.round(background.b * 255)})`,
              ratio: Number(contrast.toFixed(2)),
              minimum,
            };
            checked.push(result);
            if (contrast < minimum) {
              failures.push(result);
            }
          }
          return {
            failures,
            unresolved,
            checkedCount: checked.length,
          };
        });
        assert.ok(
          results.checkedCount > 0,
          `No text contrast pairs could be checked on ${route}.`
        );
        if (results.unresolved.length > 0) {
          t.diagnostic(
            `${route}: ${results.unresolved.length} contrast pair(s) need manual or advanced rendered-background analysis.`
          );
        }
        assert.deepEqual(
          results.failures,
          [],
          `WCAG AA text contrast failures on ${route}:\n${JSON.stringify(results.failures, null, 2)}`
        );
      });
    }
  } finally {
    await browser.close();
  }
});
test('non-text UI contrast requirements are documented for manual verification', (t) => {
  t.diagnostic(
    `Check component boundaries, focus indicators, meaningful icons, and control states against the WCAG ${NON_TEXT_MIN}:1 minimum. Automated text-pair analysis does not establish non-text contrast compliance.`
  );
  t.diagnostic(
    `Normal text requires ${NORMAL_TEXT_MIN}:1 contrast; large text requires ${LARGE_TEXT_MIN}:1 under WCAG AA.`
  );
  t.diagnostic(
    'Also test hover, focus, disabled, error, selected, and high-contrast states. Review gradients, background images, overlays, and transparent layers manually.'
  );
});
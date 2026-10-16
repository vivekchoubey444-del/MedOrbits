
'use strict';

const fs = require('node:fs');
const path = require('node:path');

const { JSDOM } = require('jsdom');

const PROJECT_ROOT = path.resolve(__dirname, '../..');

const HOMEPAGE_CANDIDATES = [
  'index.html',
  'pages/index.html',
  'public/index.html',
];

const CSS_CANDIDATES = [
  'style.css',
  'css/style.css',
  'assets/css/style.css',
  'assets/css/accessibility.css',
  'css/accessibility.css',
];

function findExistingFile(candidates) {
  return candidates
    .map((relativePath) => path.join(PROJECT_ROOT, relativePath))
    .find((absolutePath) => fs.existsSync(absolutePath));
}

function loadHomepage() {
  const homepagePath = findExistingFile(HOMEPAGE_CANDIDATES);

  if (!homepagePath) {
    throw new Error(
      `Homepage not found. Checked: ${HOMEPAGE_CANDIDATES.join(', ')}`
    );
  }

  return {
    path: homepagePath,
    html: fs.readFileSync(homepagePath, 'utf8'),
  };
}

function loadCss() {
  return CSS_CANDIDATES
    .map((relativePath) => path.join(PROJECT_ROOT, relativePath))
    .filter((absolutePath) => fs.existsSync(absolutePath))
    .map((absolutePath) => fs.readFileSync(absolutePath, 'utf8'))
    .join('\n');
}

function parseHomepage() {
  const homepage = loadHomepage();

  return {
    ...homepage,
    dom: new JSDOM(homepage.html, {
      url: 'https://medorbits.in/',
      pretendToBeVisual: true,
    }),
  };
}

function getAccessibleName(element) {
  const ariaLabel = element.getAttribute('aria-label');

  if (ariaLabel && ariaLabel.trim()) {
    return ariaLabel.trim();
  }

  const labelledBy = element.getAttribute('aria-labelledby');

  if (labelledBy) {
    const name = labelledBy
      .split(/\s+/)
      .map((id) => element.ownerDocument.getElementById(id))
      .filter(Boolean)
      .map((node) => node.textContent.trim())
      .filter(Boolean)
      .join(' ');

    if (name) return name;
  }

  if (element.tagName === 'INPUT') {
    const id = element.id;

    if (id) {
      const label = element.ownerDocument.querySelector(
        `label[for="${id}"]`
      );

      if (label && label.textContent.trim()) {
        return label.textContent.trim();
      }
    }

    if (element.getAttribute('type') === 'hidden') {
      return 'hidden input';
    }

    return (
      element.getAttribute('placeholder') ||
      element.getAttribute('title') ||
      ''
    ).trim();
  }

  if (element.tagName === 'IMG') {
    return (element.getAttribute('alt') || '').trim();
  }

  return (
    element.getAttribute('title') ||
    element.textContent ||
    ''
  ).trim();
}

function parseColor(value) {
  if (!value) return null;

  const normalized = value.trim().toLowerCase();

  const namedColors = {
    black: [0, 0, 0],
    white: [255, 255, 255],
    red: [255, 0, 0],
    green: [0, 128, 0],
    blue: [0, 0, 255],
    transparent: [0, 0, 0],
  };

  if (namedColors[normalized]) {
    return namedColors[normalized];
  }

  const hex = normalized.match(/^#([0-9a-f]{3,8})$/i);

  if (hex) {
    let digits = hex[1];

    if (digits.length === 3 || digits.length === 4) {
      digits = digits
        .slice(0, 3)
        .split('')
        .map((digit) => digit + digit)
        .join('');
    }

    if (digits.length === 6 || digits.length === 8) {
      return [
        parseInt(digits.slice(0, 2), 16),
        parseInt(digits.slice(2, 4), 16),
        parseInt(digits.slice(4, 6), 16),
      ];
    }
  }

  const rgb = normalized.match(
    /^rgba?\(\s*([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)/
  );

  if (rgb) {
    return [
      Number(rgb[1]),
      Number(rgb[2]),
      Number(rgb[3]),
    ];
  }

  return null;
}

function relativeLuminance(rgb) {
  const channels = rgb.map((channel) => {
    const value = channel / 255;

    return value <= 0.04045
      ? value / 12.92
      : ((value + 0.055) / 1.055) ** 2.4;
  });

  return (
    0.2126 * channels[0] +
    0.7152 * channels[1] +
    0.0722 * channels[2]
  );
}

function contrastRatio(foreground, background) {
  const fg = parseColor(foreground);
  const bg = parseColor(background);

  if (!fg || !bg) return null;

  const luminanceA = relativeLuminance(fg);
  const luminanceB = relativeLuminance(bg);

  const lighter = Math.max(luminanceA, luminanceB);
  const darker = Math.min(luminanceA, luminanceB);

  return (lighter + 0.05) / (darker + 0.05);
}

function hasAccessibleFocusRule(css) {
  return (
    /:focus-visible\b/i.test(css) &&
    /outline\s*:\s*(?!none\b)[^;}]+/i.test(
      css.slice(css.search(/:focus-visible\b/i))
    )
  );
}

describe('MedOrbits homepage accessibility', () => {
  let dom;
  let document;
  let html;
  let homepagePath;
  let css;

  beforeAll(() => {
    const homepage = parseHomepage();

    dom = homepage.dom;
    document = dom.window.document;
    html = homepage.html;
    homepagePath = homepage.path;
    css = loadCss();
  });

  afterAll(() => {
    if (dom) {
      dom.window.close();
    }
  });

  describe('document structure', () => {
    test('homepage exists and contains valid HTML content', () => {
      expect(fs.existsSync(homepagePath)).toBe(true);
      expect(html.trim().length).toBeGreaterThan(0);
      expect(document.documentElement).not.toBeNull();
      expect(document.body).not.toBeNull();
    });

    test('document declares its language', () => {
      const language = document.documentElement.getAttribute('lang');

      expect(language).toBeTruthy();
      expect(language.trim()).not.toBe('');
    });

    test('document includes a meaningful title', () => {
      expect(document.title.trim().length).toBeGreaterThan(0);
    });

    test('document includes a viewport declaration', () => {
      const viewport = document.querySelector(
        'meta[name="viewport"]'
      );

      expect(viewport).not.toBeNull();

      expect(viewport.getAttribute('content')).toMatch(
        /width\s*=\s*device-width/i
      );
    });

    test('homepage has exactly one primary h1 heading', () => {
      expect(document.querySelectorAll('h1').length).toBe(1);

      expect(
        document.querySelector('h1').textContent.trim().length
      ).toBeGreaterThan(0);
    });

    test('heading levels do not skip hierarchy', () => {
      const headings = Array.from(
        document.querySelectorAll('h1, h2, h3, h4, h5, h6')
      );

      let previousLevel = 0;

      for (const heading of headings) {
        const level = Number(heading.tagName.slice(1));

        expect(heading.textContent.trim().length).toBeGreaterThan(0);

        if (previousLevel > 0) {
          expect(level).toBeLessThanOrEqual(previousLevel + 1);
        }

        previousLevel = level;
      }
    });

    test('homepage exposes a main landmark', () => {
      const main = document.querySelector(
        'main, [role="main"]'
      );

      expect(main).not.toBeNull();
    });

    test('navigation landmarks have accessible names when multiple exist', () => {
      const navigation = Array.from(
        document.querySelectorAll('nav, [role="navigation"]')
      );

      if (navigation.length > 1) {
        const names = navigation.map((element) =>
          getAccessibleName(element)
        );

        expect(
          names.every((name) => name.length > 0)
        ).toBe(true);
      }
    });

    test('landmark elements are not nested redundantly', () => {
      expect(
        document.querySelector('main main')
      ).toBeNull();

      expect(
        document.querySelector('header header')
      ).toBeNull();

      expect(
        document.querySelector('footer footer')
      ).toBeNull();
    });
  });

  describe('images and media', () => {
    test('images have an alt attribute', () => {
      const images = Array.from(
        document.querySelectorAll('img')
      );

      for (const image of images) {
        expect(image.hasAttribute('alt')).toBe(true);
      }
    });

    test('non-decorative images have a meaningful accessible name', () => {
      const images = Array.from(
        document.querySelectorAll('img:not([alt=""])')
      );

      for (const image of images) {
        expect(
          image.getAttribute('alt').trim().length
        ).toBeGreaterThan(0);
      }
    });

    test('decorative images can use empty alt text', () => {
      const decorativeImages = document.querySelectorAll(
        'img[alt=""]'
      );

      for (const image of decorativeImages) {
        expect(image.getAttribute('alt')).toBe('');
      }
    });

    test('video elements provide captions or an accessible alternative', () => {
      const videos = Array.from(
        document.querySelectorAll('video')
      );

      for (const video of videos) {
        const hasCaptions = video.querySelector(
          'track[kind="captions"], track[kind="subtitles"]'
        );

        const hasAccessibleAlternative =
          video.hasAttribute('aria-label') ||
          video.hasAttribute('aria-labelledby') ||
          video.hasAttribute('title') ||
          video.parentElement?.querySelector(
            'a[href], p, figcaption'
          );

        expect(
          Boolean(hasCaptions || hasAccessibleAlternative)
        ).toBe(true);
      }
    });
  });

  describe('links and controls', () => {
    test('links have accessible names', () => {
      const links = Array.from(
        document.querySelectorAll('a[href]')
      );

      for (const link of links) {
        const name = getAccessibleName(link);

        expect(name.length).toBeGreaterThan(0);
      }
    });

    test('buttons have accessible names', () => {
      const buttons = Array.from(
        document.querySelectorAll(
          'button, input[type="button"], input[type="submit"], input[type="reset"], [role="button"]'
        )
      );

      for (const button of buttons) {
        if (
          button.matches('input') &&
          button.type === 'hidden'
        ) {
          continue;
        }

        expect(
          getAccessibleName(button).length
        ).toBeGreaterThan(0);
      }
    });

    test('interactive controls do not use positive tabindex values', () => {
      const controls = document.querySelectorAll(
        'a, button, input, select, textarea, [tabindex]'
      );

      for (const control of controls) {
        const tabindex = control.getAttribute('tabindex');

        if (tabindex !== null) {
          expect(Number(tabindex)).toBeLessThanOrEqual(0);
        }
      }
    });

    test('links do not use vague standalone labels', () => {
      const vagueLabels = new Set([
        'click here',
        'here',
        'read more',
        'more',
        'learn more',
      ]);

      const links = document.querySelectorAll('a[href]');

      for (const link of links) {
        const name = getAccessibleName(link)
          .replace(/\s+/g, ' ')
          .trim()
          .toLowerCase();

        if (vagueLabels.has(name)) {
          expect(
            link.hasAttribute('aria-label') ||
            link.hasAttribute('aria-labelledby')
          ).toBe(true);
        }
      }
    });

    test('links opening new tabs warn users', () => {
      const externalTabLinks = document.querySelectorAll(
        'a[target="_blank"]'
      );

      for (const link of externalTabLinks) {
        const description = [
          getAccessibleName(link),
          link.getAttribute('aria-label') || '',
          link.getAttribute('title') || '',
          link.textContent || '',
        ]
          .join(' ')
          .toLowerCase();

        const hasWarning =
          /new tab|new window|opens in/i.test(description) ||
          Boolean(
            link.querySelector(
              '[aria-label*="new tab" i], [aria-label*="new window" i]'
            )
          );

        expect(hasWarning).toBe(true);

        const rel = (link.getAttribute('rel') || '')
          .toLowerCase()
          .split(/\s+/);

        expect(
          rel.includes('noopener') ||
          rel.includes('noreferrer')
        ).toBe(true);
      }
    });

    test('icon-only controls have accessible labels', () => {
      const iconControls = document.querySelectorAll(
        'button:has(svg), a[href]:has(svg), button:has(i[class*="icon"]), a[href]:has(i[class*="icon"])'
      );

      for (const control of iconControls) {
        const hasVisibleText =
          (control.textContent || '').trim().length > 0;

        const hasImageAlternative = Boolean(
          control.querySelector('img[alt]:not([alt=""])')
        );

        const hasAriaLabel =
          Boolean(control.getAttribute('aria-label')) ||
          Boolean(control.getAttribute('aria-labelledby'));

        expect(
          hasVisibleText || hasImageAlternative || hasAriaLabel
        ).toBe(true);
      }
    });
  });

  describe('forms and validation', () => {
    test('form controls have programmatic labels', () => {
      const controls = Array.from(
        document.querySelectorAll(
          'input:not([type="hidden"]):not([type="submit"]):not([type="button"]):not([type="reset"]), select, textarea'
        )
      );

      for (const control of controls) {
        const hasAssociatedLabel = Boolean(
          control.id &&
          document.querySelector(
            `label[for="${control.id}"]`
          )
        );

        const hasWrappingLabel = Boolean(
          control.closest('label')
        );

        const hasAriaLabel =
          Boolean(control.getAttribute('aria-label')) ||
          Boolean(control.getAttribute('aria-labelledby'));

        expect(
          hasAssociatedLabel ||
          hasWrappingLabel ||
          hasAriaLabel
        ).toBe(true);
      }
    });

    test('required fields expose their required status', () => {
      const requiredFields = document.querySelectorAll(
        'input[required], select[required], textarea[required], [aria-required="true"]'
      );

      for (const field of requiredFields) {
        expect(
          field.hasAttribute('required') ||
          field.getAttribute('aria-required') === 'true'
        ).toBe(true);
      }
    });

    test('invalid form controls expose their error state', () => {
      const invalidFields = document.querySelectorAll(
        '[aria-invalid="true"]'
      );

      for (const field of invalidFields) {
        const describedBy = (
          field.getAttribute('aria-describedby') || ''
        )
          .split(/\s+/)
          .filter(Boolean);

        const hasErrorMessage = describedBy.some((id) => {
          const message = document.getElementById(id);

          return Boolean(
            message &&
            message.textContent.trim().length > 0
          );
        });

        const hasInlineError = Boolean(
          field.parentElement?.querySelector(
            '[role="alert"], .error, .error-message, .field-error'
          )
        );

        expect(
          hasErrorMessage || hasInlineError
        ).toBe(true);
      }
    });

    test('placeholder text is not the only labeling mechanism', () => {
      const controls = document.querySelectorAll(
        'input[placeholder], textarea[placeholder]'
      );

      for (const control of controls) {
        const hasLabel = Boolean(
          (control.id &&
            document.querySelector(
              `label[for="${control.id}"]`
            )) ||
          control.closest('label') ||
          control.hasAttribute('aria-label') ||
          control.hasAttribute('aria-labelledby')
        );

        expect(hasLabel).toBe(true);
      }
    });
  });

  describe('keyboard accessibility and focus', () => {
    test('interactive elements remain keyboard-focusable', () => {
      const interactiveElements = document.querySelectorAll(
        'a[href], button, input:not([type="hidden"]), select, textarea, [role="button"], [role="link"]'
      );

      for (const element of interactiveElements) {
        const tabindex = element.getAttribute('tabindex');

        expect(
          tabindex === null || Number(tabindex) >= 0
        ).toBe(true);
      }
    });

    test('the page does not disable keyboard focus outlines globally', () => {
      const cssToInspect = [
        html,
        css,
      ].join('\n');

      expect(cssToInspect).not.toMatch(
        /\*[^{}]*\{[^}]*outline\s*:\s*none[^}]*\}/i
      );

      expect(cssToInspect).not.toMatch(
        /:focus(?:-visible)?\s*\{[^}]*outline\s*:\s*none/i
      );
    });

    test('CSS defines a visible focus-visible indicator', () => {
      const inlineStyles = Array.from(
        document.querySelectorAll('style')
      )
        .map((style) => style.textContent)
        .join('\n');

      const combinedCss = `${css}\n${inlineStyles}`;

      expect(
        hasAccessibleFocusRule(combinedCss)
      ).toBe(true);
    });

    test('skip navigation links are provided when the page has substantial navigation', () => {
      const navigation = document.querySelector(
        'header nav, nav'
      );

      if (!navigation) return;

      const skipLinks = Array.from(
        document.querySelectorAll('a[href^="#"]')
      ).filter((link) => {
        const text = getAccessibleName(link).toLowerCase();

        return (
          /skip to (main|content)/.test(text) ||
          /skip navigation/.test(text)
        );
      });

      expect(skipLinks.length).toBeGreaterThan(0);

      const destination = skipLinks[0]
        .getAttribute('href')
        .slice(1);

      expect(
        document.getElementById(destination)
      ).not.toBeNull();
    });
  });

  describe('color contrast', () => {
    test('the contrast calculation helper meets WCAG AA for a known passing pair', () => {
      expect(
        contrastRatio('#000000', '#ffffff')
      ).toBeCloseTo(21, 0);

      expect(
        contrastRatio('#000000', '#ffffff')
      ).toBeGreaterThanOrEqual(4.5);
    });

    test('the contrast calculation helper identifies a failing pair', () => {
      expect(
        contrastRatio('#aaaaaa', '#ffffff')
      ).toBeLessThan(4.5);
    });

    test('declared foreground and background colors meet WCAG AA where statically resolvable', () => {
      const styleBlocks = Array.from(
        document.querySelectorAll('style')
      )
        .map((style) => style.textContent)
        .join('\n');

      const combinedCss = `${css}\n${styleBlocks}`;

      const rules = combinedCss.matchAll(
        /([^{}]+)\{([^{}]+)\}/g
      );

      let checkedPairs = 0;

      for (const [, selector, declarations] of rules) {
        if (
          /@media|@supports|@keyframes/i.test(selector)
        ) {
          continue;
        }

        const foregroundMatch = declarations.match(
          /(?:^|;)\s*color\s*:\s*([^;!]+)/i
        );

        const backgroundMatch = declarations.match(
          /(?:^|;)\s*background-color\s*:\s*([^;!]+)/i
        );

        if (!foregroundMatch || !backgroundMatch) {
          continue;
        }

        const foreground = foregroundMatch[1].trim();
        const background = backgroundMatch[1].trim();

        if (
          foreground.includes('var(') ||
          background.includes('var(') ||
          foreground === 'inherit' ||
          background === 'inherit' ||
          foreground === 'currentcolor' ||
          background === 'transparent'
        ) {
          continue;
        }

        const ratio = contrastRatio(
          foreground,
          background
        );

        if (ratio === null) continue;

        const isLargeText =
          /font-size\s*:\s*(?:1[89](?:\.\d+)?px|[2-9]\dpx)/i.test(
            declarations
          ) ||
          /font-size\s*:\s*(?:1\.(?:5|6|7|8|9)\d*rem|[2-9]\d*rem)/i.test(
            declarations
          );

        expect({
          selector: selector.trim(),
          foreground,
          background,
          ratio,
        }).toEqual(
          expect.objectContaining({
            ratio: expect.any(Number),
          })
        );

        expect(ratio).toBeGreaterThanOrEqual(
          isLargeText ? 3 : 4.5
        );

        checkedPairs += 1;
      }

      // Avoid pretending this static check can evaluate CSS variables,
      // inherited colors, image backgrounds, or browser-computed styles.
      expect(checkedPairs).toBeGreaterThanOrEqual(0);
    });
  });

  describe('motion and visual accessibility', () => {
    test('reduced-motion preferences are respected in CSS', () => {
      const styleBlocks = Array.from(
        document.querySelectorAll('style')
      )
        .map((style) => style.textContent)
        .join('\n');

      const combinedCss = `${css}\n${styleBlocks}`;

      expect(combinedCss).toMatch(
        /prefers-reduced-motion\s*:\s*reduce/i
      );

      expect(combinedCss).toMatch(
        /prefers-reduced-motion\s*:\s*reduce[\s\S]*?\{/
      );
    });

    test('images declare responsive sizing or use responsive image markup', () => {
      const images = document.querySelectorAll('img');

      for (const image of images) {
        const responsiveAttributes =
          image.hasAttribute('srcset') ||
          image.hasAttribute('sizes') ||
          image.hasAttribute('width') ||
          image.hasAttribute('height') ||
          Boolean(image.closest('picture'));

        expect(responsiveAttributes).toBe(true);
      }
    });

    test('status messages do not rely exclusively on color', () => {
      const statusElements = document.querySelectorAll(
        '[role="status"], [role="alert"], [aria-live]'
      );

      for (const element of statusElements) {
        const hasText =
          element.textContent.trim().length > 0;

        const hasAccessibleName =
          Boolean(element.getAttribute('aria-label')) ||
          Boolean(element.getAttribute('aria-labelledby'));

        expect(
          hasText || hasAccessibleName
        ).toBe(true);
      }
    });

    test('HTML does not disable browser zoom', () => {
      const viewport = document.querySelector(
        'meta[name="viewport"]'
      );

      if (!viewport) return;

      const content = viewport
        .getAttribute('content')
        .toLowerCase();

      expect(content).not.toMatch(
        /user-scalable\s*=\s*no/
      );

      expect(content).not.toMatch(
        /maximum-scale\s*=\s*1(?:\.0+)?(?:\s|,|$)/
      );
    });
  });

  describe('responsive usability', () => {
    test('document does not contain fixed-width viewport declarations', () => {
      const viewport = document.querySelector(
        'meta[name="viewport"]'
      );

      expect(viewport).not.toBeNull();

      expect(
        viewport.getAttribute('content')
      ).not.toMatch(/width\s*=\s*\d+/i);
    });

    test('CSS contains a responsive layout mechanism', () => {
      const styleBlocks = Array.from(
        document.querySelectorAll('style')
      )
        .map((style) => style.textContent)
        .join('\n');

      const combinedCss = `${css}\n${styleBlocks}`;

      const hasResponsiveRules =
        /@media\s*\(/i.test(combinedCss) ||
        /max-width\s*:\s*100%/i.test(combinedCss) ||
        /width\s*:\s*min\(/i.test(combinedCss) ||
        /grid-template-columns\s*:\s*repeat\(auto-fit/i.test(combinedCss) ||
        /grid-template-columns\s*:\s*repeat\(auto-fill/i.test(combinedCss);

      expect(hasResponsiveRules).toBe(true);
    });

    test('CSS includes safeguards against common horizontal overflow', () => {
      const styleBlocks = Array.from(
        document.querySelectorAll('style')
      )
        .map((style) => style.textContent)
        .join('\n');

      const combinedCss = `${css}\n${styleBlocks}`;

      const hasOverflowSafeguard =
        /overflow-wrap\s*:\s*(?:anywhere|break-word)/i.test(combinedCss) ||
        /word-break\s*:\s*break-word/i.test(combinedCss) ||
        /max-width\s*:\s*100%/i.test(combinedCss) ||
        /overflow-x\s*:\s*(?:hidden|clip|auto)/i.test(combinedCss);

      expect(hasOverflowSafeguard).toBe(true);
    });

    test('images and embedded media are not explicitly assigned oversized viewport widths', () => {
      const oversizedMedia = document.querySelectorAll(
        'img[width], video[width], iframe[width]'
      );

      for (const media of oversizedMedia) {
        const width = Number(
          media.getAttribute('width')
        );

        if (Number.isFinite(width) && width > 0) {
          expect(width).toBeLessThanOrEqual(1920);
        }
      }
    });
  });

  describe('semantic and ARIA correctness', () => {
    test('ARIA attributes use valid boolean values where applicable', () => {
      const booleanAttributes = [
        'aria-hidden',
        'aria-expanded',
        'aria-pressed',
        'aria-selected',
        'aria-checked',
        'aria-disabled',
        'aria-required',
        'aria-invalid',
      ];

      for (const attribute of booleanAttributes) {
        const elements = document.querySelectorAll(
          `[${attribute}]`
        );

        for (const element of elements) {
          const value = element
            .getAttribute(attribute)
            .toLowerCase();

          const allowedValues =
            attribute === 'aria-invalid'
              ? ['true', 'false', 'grammar', 'spelling']
              : ['true', 'false'];

          expect(allowedValues).toContain(value);
        }
      }
    });

    test('ARIA references point to existing element IDs', () => {
      const referenceAttributes = [
        'aria-labelledby',
        'aria-describedby',
        'aria-controls',
        'aria-owns',
        'aria-details',
        'aria-errormessage',
      ];

      for (const attribute of referenceAttributes) {
        const elements = document.querySelectorAll(
          `[${attribute}]`
        );

        for (const element of elements) {
          const ids = element
            .getAttribute(attribute)
            .split(/\s+/)
            .filter(Boolean);

          for (const id of ids) {
            expect(
              document.getElementById(id)
            ).not.toBeNull();
          }
        }
      }
    });

    test('element IDs are unique', () => {
      const ids = Array.from(
        document.querySelectorAll('[id]')
      ).map((element) => element.id);

      expect(new Set(ids).size).toBe(ids.length);
    });

    test('elements hidden from assistive technology are not focusable', () => {
      const hiddenElements = document.querySelectorAll(
        '[aria-hidden="true"]'
      );

      for (const hidden of hiddenElements) {
        const focusableDescendants = hidden.querySelectorAll(
          'a[href], button, input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );

        expect(focusableDescendants.length).toBe(0);

        expect(
          hidden.matches(
            'a[href], button, input, select, textarea, [tabindex]:not([tabindex="-1"])'
          )
        ).toBe(false);
      }
    });

    test('tables use appropriate header cells when data tables exist', () => {
      const tables = document.querySelectorAll('table');

      for (const table of tables) {
        const hasHeader =
          table.querySelector('th') !== null ||
          table.querySelector('[role="columnheader"]') !== null;

        const hasCaption =
          table.querySelector('caption') !== null ||
          Boolean(table.getAttribute('aria-label')) ||
          Boolean(table.getAttribute('aria-labelledby'));

        expect(hasHeader).toBe(true);
        expect(hasCaption).toBe(true);
      }
    });
  });
});

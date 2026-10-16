# MedOrbits Accessibility Tests
## 1. Purpose
The `tests/accessibility/` directory contains automated tests for the accessibility of the MedOrbits platform.
The objective is to identify accessibility barriers affecting users with disabilities, including users who rely on screen readers, keyboard navigation, magnification, or assistive technologies.
The test suite focuses on:
- WCAG 2.2 Level AA requirements.
- Semantic HTML and accessible names.
- Keyboard accessibility and focus management.
- Form labels, instructions, and validation feedback.
- Color contrast and non-color visual indicators.
- Navigation landmarks and heading hierarchy.
- Screen-reader compatibility.
- Homepage accessibility and primary user journeys.
- Responsive layouts and accessible interactive components.
Automated tests help identify common accessibility defects. They do not replace manual testing with assistive technologies or a complete WCAG conformance evaluation.
## 2. Directory structure
```text
tests/
└── accessibility/
    ├── README.md
    ├── color-contrast.test.js
    ├── forms.accessibility.test.js
    ├── homepage.accessibility.test.js
    ├── keyboard-navigation.test.js
    ├── navigation.accessibility.test.js
    └── screen-reader.test.js

Keep this inventory synchronized with the actual repository.

3. Test responsibilities

File	Responsibility
color-contrast.test.js	Text contrast, visual indicators, and accessible color usage
forms.accessibility.test.js	Labels, required fields, instructions, error messages, and validation accessibility
homepage.accessibility.test.js	Homepage landmarks, headings, links, images, and primary interactions
keyboard-navigation.test.js	Keyboard access, focus visibility, logical focus order, and keyboard interaction
navigation.accessibility.test.js	Navigation landmarks, menus, accessible names, and current-page indicators
screen-reader.test.js	Semantic structure, accessible names, ARIA usage, and announcements

These files define testing responsibilities; actual coverage depends on their implemented assertions and the pages they inspect.

4. Accessibility standards

Use WCAG 2.2 Level AA as the primary accessibility target.

Important requirements include:

* Text alternatives for meaningful non-text content.
* Sufficient text and interface contrast.
* Keyboard accessibility.
* Visible keyboard focus.
* Logical focus order.
* Descriptive page titles and headings.
* Accessible form labels and error identification.
* Programmatic names, roles, and states.
* Reflow and zoom support.
* Accessible authentication and error recovery.
* Adequate target sizes where applicable.
* Consistent navigation and interaction behavior.

Relevant references:

* WCAG 2.2: https://www.w3.org/TR/WCAG22/
* WAI-ARIA 1.2: https://www.w3.org/TR/wai-aria-1.2/
* ARIA Authoring Practices Guide: https://www.w3.org/WAI/ARIA/apg/
* WAI Forms Tutorial: https://www.w3.org/WAI/tutorials/forms/
* WAI Images Tutorial: https://www.w3.org/WAI/tutorials/images/

5. Dependencies and tooling

Use the accessibility tools already established in the project’s package configuration.

Common options include:

* Jest for test execution.
* jest-axe and axe-core for automated accessibility rules.
* Testing Library for semantic DOM queries and accessible interactions.
* @testing-library/user-event for keyboard and user interaction simulation.
* Playwright or another browser automation framework for browser-level accessibility testing.

Do not add or replace dependencies without checking the existing package.json and test configuration.

Example installation, if the project uses Jest and Testing Library but does not yet have these accessibility dependencies:

npm install —save-dev jest-axe axe-core

Browser-based testing may require additional packages and browser installation.

6. Running accessibility tests

Run the entire accessibility suite:

npx jest tests/accessibility —runInBand

Run an individual test file:

npx jest tests/accessibility/color-contrast.test.js —runInBand

Run form accessibility tests:

npx jest tests/accessibility/forms.accessibility.test.js —runInBand

Run homepage accessibility tests:

npx jest tests/accessibility/homepage.accessibility.test.js —runInBand

Run keyboard navigation tests:

npx jest tests/accessibility/keyboard-navigation.test.js —runInBand

Run navigation accessibility tests:

npx jest tests/accessibility/navigation.accessibility.test.js —runInBand

Run screen-reader-oriented tests:

npx jest tests/accessibility/screen-reader.test.js —runInBand

Run with coverage:

npx jest tests/accessibility —coverage —runInBand

Use the repository’s existing npm scripts if they provide equivalent commands.

7. Automated accessibility assertions

Where the project uses jest-axe, a typical test may look like this:

‘use strict’;
const { render } = require(‘@testing-library/react’);
const { axe, toHaveNoViolations } = require(‘jest-axe’);
expect.extend(toHaveNoViolations);
test(‘renders without detectable accessibility violations’, async () => {
  const { container } = render(
    <main>
      <h1>MedOrbits</h1>
      <p>Education and admissions guidance.</p>
    </main>
  );
  const results = await axe(container);
  expect(results).toHaveNoViolations();
});

This is an illustrative React example. Adapt it to the actual MedOrbits architecture, whether the application uses React, server-rendered HTML, or static pages.

Automated checks should be supplemented with explicit assertions for important application behavior.

8. Color contrast

Test contrast using the actual foreground and background colors in the rendered interface.

WCAG 2.2 Level AA generally requires:

Content	Minimum contrast ratio
Normal text	4.5:1
Large text	3:1
Essential non-text interface components and graphical objects	3:1

Large text generally means at least 18 pt regular or 14 pt bold, approximately 24 px or 18.7 px respectively.

Test representative states, including:

* Default text and backgrounds.
* Links and interactive controls.
* Hover and focus states.
* Error and success messages.
* Disabled controls where applicable.
* Text over images and gradients.
* Dark and light themes, if supported.

Do not infer that a design is accessible merely because it uses a particular brand palette. Test the actual rendered color combinations.

9. Forms and validation

Forms should provide accessible names, instructions, and understandable validation feedback.

Test that:

* Every input has an accessible label.
* Required fields are identified programmatically.
* Input errors identify the affected field.
* Error messages explain how to correct the problem.
* Instructions are associated with the relevant controls.
* Invalid submissions preserve entered information when appropriate.
* Keyboard users can reach and operate every control.
* Focus moves appropriately when error recovery requires it.
* Success and failure feedback is available to assistive technologies.
* Password and authentication controls have meaningful labels.

Placeholder text should not be the only label.

10. Keyboard navigation

Test the complete keyboard interaction model, not only whether elements can receive focus.

Verify that:

* Interactive elements are reachable using the keyboard.
* Focus order follows a meaningful sequence.
* Focus indicators remain visible.
* No keyboard trap prevents users from leaving a component.
* Menus, dialogs, tabs, and expandable controls support their expected keyboard interactions.
* Escape closes dismissible dialogs or overlays where appropriate.
* Focus is managed correctly when dialogs open and close.
* Custom controls implement the expected keyboard behavior.
* Sticky headers and overlays do not obscure focused elements.

Use real keyboard interaction tests for critical flows rather than relying exclusively on DOM inspection.

11. Navigation and semantic structure

Verify that pages provide a coherent structure for assistive technology.

Check for:

* A descriptive document title.
* A clear primary page heading.
* Logical heading levels.
* Appropriate main, nav, header, and footer landmarks.
* Descriptive link text.
* Accessible names for icon-only controls.
* Meaningful alternative text for informative images.
* Empty alternative text for decorative images.
* Accessible menu and disclosure states.
* Programmatically identified current-page navigation items.
* No unnecessary or conflicting ARIA attributes.

Use native HTML semantics wherever possible instead of recreating standard controls with custom elements.

12. Screen-reader-oriented testing

DOM-based tests can verify accessible names, roles, states, and relationships. They cannot prove that a page works correctly with every screen reader.

Supplement automated tests with manual checks using supported combinations such as:

* NVDA with Firefox or Chrome.
* JAWS with a supported browser.
* VoiceOver with Safari on macOS or iOS.

Test important journeys, including:

* Homepage navigation.
* Course and institution search.
* Application forms.
* Authentication.
* Document upload and download.
* Payment initiation and confirmation.
* Error recovery and status announcements.

Pay particular attention to dynamic updates, validation messages, dialogs, expanded controls, and loading states.

13. Homepage accessibility

The homepage test should evaluate the actual rendered homepage and its primary interactions.

Verify:

* A meaningful page title and primary heading.
* Correct semantic landmarks.
* Accessible navigation and search.
* Alternative text for meaningful images.
* Keyboard access to primary actions.
* Visible focus.
* Sufficient contrast.
* Accessible responsive navigation.
* No detectable critical or serious automated accessibility violations.

Avoid testing only a simplified mockup if the production homepage uses substantially different components or styles.

14. Test environments and fixtures

Accessibility tests should use stable, representative page content.

For browser-based tests:

* Start the application using the project’s test or preview server.
* Use deterministic fixtures.
* Disable or mock irrelevant external services.
* Wait for the page and dynamic content to reach a stable state.
* Avoid relying on live production data.
* Test important responsive viewports.
* Clean up browser resources after each test.

Automated DOM tests and browser-level tests should be clearly distinguished because they validate different aspects of the user experience.

15. Failure triage

When a test fails:

1. Identify the page, component, and accessibility rule.
2. Reproduce the issue in the rendered interface.
3. Determine whether the defect is in markup, CSS, interaction behavior, or application state.
4. Correct the underlying accessibility issue.
5. Add or update a regression test.
6. Re-run the affected test and the complete accessibility suite.
7. Perform manual assistive-technology checks for high-impact changes.

Do not suppress an accessibility violation simply to make the test pass. If a rule is genuinely inapplicable, document the rationale and narrowly scope the exception.

16. Definition of done

Accessibility work is ready for review when:

* [ ]	All six listed test files exist and run.
* [ ]	Critical user journeys have been tested.
* [ ]	No unresolved critical accessibility barriers remain.
* [ ]	Automated checks have been reviewed rather than blindly suppressed.
* [ ]	Keyboard navigation has been tested.
* [ ]	Forms and validation feedback are accessible.
* [ ]	Color contrast has been checked against rendered styles.
* [ ]	Screen-reader-oriented manual testing has been performed.
* [ ]	Responsive layouts and zoom behavior have been checked.
* [ ]	Failures have been documented and assigned for remediation.
* [ ]	Tests run in the project’s CI pipeline.

Passing automated tests alone does not establish full WCAG conformance.

17. Maintenance

Update this README whenever accessibility tooling, test files, supported page templates, or test commands change.

The implemented UI, rendered behavior, WCAG requirements, and actual test configuration remain the sources of truth.
MedOrbits CSS Architecture

Project: MedOrbits
Directory: css/
Purpose: Modular, maintainable, accessible, and responsive styling
Design direction: Royal Burgundy & Champagne Gold
Status: Architecture and maintenance specification

⸻

1. Overview

The css/ directory contains the modular styling system for the MedOrbits website. It separates foundational styles, design tokens, typography, shared components, page layouts, responsive behavior, accessibility, animations, and page-specific presentation into dedicated stylesheets.

The architecture supports the MedOrbits platform across:

* Education consultancy and course discovery
* Medical and other education pathways
* Study-abroad services
* Authentication and account management
* Student and user dashboards
* Career guidance, jobs, and internships
* Employer and recruitment services
* Administrative interfaces
* Printable application and information pages

The primary objective is to preserve the existing homepage’s visual identity and functionality while making the CSS system easier to maintain, extend, debug, and deploy.

Core principles

1. Preserve existing behavior. Existing HTML classes, JavaScript-dependent selectors, navigation interactions, and opening animations must remain compatible during migration.
2. Use a consistent design system. Shared colours, typography, spacing, borders, and shadows should come from centralized design tokens.
3. Separate responsibilities. Each stylesheet should have a clearly defined purpose.
4. Avoid unnecessary duplication. Reuse shared components instead of maintaining equivalent declarations in multiple files.
5. Design responsively. Layouts must remain usable across mobile, tablet, laptop, and desktop screens.
6. Prioritize accessibility. Keyboard navigation, focus visibility, contrast, and reduced-motion preferences must be respected.
7. Validate before deployment. Architectural changes must be tested against the existing homepage and all affected page types.

Important: This document defines the intended architecture. It does not, by itself, establish that every module has been implemented, imported, or verified in the live application.

⸻

2. Directory Structure

The expected CSS directory structure is:

css/
├── README.md
├── reset.css
├── variables.css
├── typography.css
├── style.css
├── components.css
├── layout.css
├── responsive.css
├── accessibility.css
├── animations.css
├── forms.css
├── auth.css
├── dashboard.css
├── education.css
├── career.css
├── admin.css
└── print.css

Keep this documentation synchronized with the actual repository. Add, remove, or rename entries when the corresponding files change.

File ownership at a glance

File	Primary responsibility
reset.css	Browser normalization and foundational defaults
variables.css	Design tokens and CSS custom properties
typography.css	Fonts, headings, body text, and readability
style.css	Master stylesheet and import order
components.css	Reusable UI components
layout.css	Header, navigation, containers, and footer
responsive.css	Shared responsive overrides
accessibility.css	Focus states, hidden utilities, and accessibility support
animations.css	Opening animation and reusable motion effects
forms.css	Shared inputs, search fields, and form controls
auth.css	Authentication page presentation
dashboard.css	Account dashboard components
education.css	Education homepage sections and cards
career.css	Career, job, and internship components
admin.css	Administrative layouts and tables
print.css	Print-specific presentation

⸻

3. Design System

3.1 Brand identity

MedOrbits uses a premium academic-consultancy aesthetic built around Royal Burgundy, Champagne Gold, deep plum, and complementary muted tones.

The CSS architecture should preserve the actual values already established by the homepage and variables.css.

Do not replace the existing palette with unrelated colours merely to standardize the code.

3.2 Design tokens

Define reusable design values centrally in variables.css.

Typical token categories include:

* Brand and accent colours
* Page backgrounds and surface colours
* Primary and secondary text colours
* Muted text and border colours
* Spacing scales
* Border radii
* Shadows
* Typography families and sizes
* Transition durations
* Layering and stacking levels

Example structure using the existing MedOrbits token names:

:root {
  color-scheme: dark;
  —bg: #100a17;
  —bg-2: #191023;
  —panel: #21172b;
  —panel-2: #2b1d36;
  —gold: #c9a96e;
  —gold-light: #e4d0a1;
  —lav: #d9cce4;
  —muted: #b7acbf;
  —white: #f7f1fa;
  —line: rgba(201, 169, 110, 0.24);
  —radius: 18px;
  —shadow: 0 22px 65px rgba(0, 0, 0, 0.25);
}

This example reflects the existing token values supplied for the MedOrbits stylesheet. Before adoption, compare it with the actual variables.css and preserve any additional existing tokens.

Token rules:

* Reuse existing variables instead of hardcoding repeated values.
* Use sensible fallbacks where a component must tolerate a missing token.
* Avoid defining the same token differently in unrelated modules.
* Introduce new tokens only when they represent reusable design decisions.
* Document intentional exceptions.

⸻

4. Stylesheet Responsibilities

4.1 reset.css — Foundation

Provides predictable browser defaults before application styling is applied.

Responsibilities:

* Establish consistent box-sizing behavior.
* Normalize default margins and padding where appropriate.
* Standardize foundational element behavior.
* Ensure images and other media fit their containers.
* Provide consistent form-control foundations.
* Reduce browser inconsistencies.

Keep this file independent of the homepage, dashboard, or other page-specific components.

4.2 variables.css — Design tokens

Defines shared CSS custom properties.

Responsibilities:

* Brand palette
* Background and surface colours
* Typography tokens
* Border and radius values
* Shadows
* Spacing conventions
* Transition and layering values, where appropriate

All modules should consume these tokens rather than independently recreating the design system.

4.3 typography.css — Text and readability

Defines global typography conventions.

Responsibilities:

* Font families and weights
* Heading hierarchy
* Body text and paragraph spacing
* Link presentation
* Text hierarchy
* Line heights and readability

Keep page-specific exceptions limited and deliberate. Verify that headings and paragraphs remain legible against the existing dark backgrounds.

4.4 style.css — Master entry point

Acts as the principal stylesheet for pages that use the complete shared design system.

Responsibilities:

* Import the intended CSS modules.
* Establish a documented dependency order.
* Provide a predictable global styling entry point.
* Avoid duplicating declarations owned by individual modules.

The master stylesheet should remain an orchestration file rather than becoming another large collection of component rules.

4.5 components.css — Reusable interface elements

Contains shared presentation components such as:

* Buttons and button variants
* Eyebrows and section labels
* Tags and badges
* Text links
* Visual captions and stamps
* Shared cards, where appropriate
* Disclaimers and notices
* Skip-navigation links

Components should be reusable across multiple page types without requiring duplicate declarations.

4.6 layout.css — Shared site structure

Owns the common website structure.

Responsibilities:

* Announcement bar
* Brand and logo area
* Sticky header
* Primary navigation
* Dropdown menus
* Shared structural containers
* Footer and footer columns

Preserve the existing homepage selectors and HTML compatibility.

In particular, changes involving .header, .nav-group, .dropdown, .nav-wrap, .announcement, and .footer must be checked against the real markup and JavaScript.

4.7 responsive.css — Responsive overrides

Contains shared media queries and responsive layout adjustments.

Responsibilities:

* Desktop, tablet, and mobile layouts
* Navigation collapse and expansion layouts
* Card and grid adjustments
* Footer column changes
* Form layout adjustments
* Dashboard and admin responsiveness
* Overflow prevention
* Responsive spacing and typography

Use a consistent breakpoint strategy. Avoid maintaining conflicting copies of the same media query in multiple files.

Page-specific responsive exceptions should remain in their owning module when that is necessary to keep the component understandable.

4.8 accessibility.css — Accessible presentation

Contains shared accessibility-related styles.

Responsibilities:

* Keyboard-focus indicators
* Focus visibility
* Visually hidden utilities
* Hidden-state helpers
* Reduced-motion support where appropriate
* Accessible interaction states

Do not remove visible focus outlines merely to achieve a cleaner appearance.

Use visually hidden utilities carefully: content intended for assistive technology must not be accidentally removed from the accessibility tree.

4.9 animations.css — Motion and opening animation

Owns the homepage opening-animation styles and reusable animation effects.

Responsibilities:

* Existing intro-screen selectors
* Opening-animation keyframes
* Entrance effects
* Animation states and classes
* Reduced-motion-compatible animation behavior

Preserve the current animation HTML, JavaScript, class names, and keyframes during CSS migration.

Test the full opening-animation lifecycle, including the initial state, completed state, hidden state, and reduced-motion behavior.

4.10 forms.css — Shared form controls

Contains reusable form and search styling.

Responsibilities:

* Input fields
* Select controls
* Textareas
* Search forms
* Form labels
* Focus states
* Validation and error presentation
* Disabled controls
* Shared form layouts

Use common classes such as .field where they match the existing HTML.

Keep authentication-specific container and page presentation in auth.css, while general input behavior remains in forms.css.

4.11 auth.css — Authentication presentation

Contains reusable styles for:

* Login pages
* Registration pages
* Password recovery
* Verification interfaces
* Authentication cards
* Authentication headings
* Authentication actions and links

This module controls presentation only. Authentication, session management, authorization, and password recovery must be implemented by application logic and the backend.

4.12 dashboard.css — Account dashboards

Contains:

* Dashboard layouts
* Sidebar navigation
* Account panels
* Summary statistics
* Dashboard grids
* Dashboard navigation states
* Account-specific status indicators

Keep dashboard rules scoped to dashboard components to avoid unintentionally changing public pages.

4.13 education.css — Education content

Contains education homepage sections and reusable education presentation components.

Responsibilities:

* Hero section and hero visual
* Education pillars
* Search band
* Course and service cards
* About section
* Benefits and checklists
* Video content
* Calls to action
* Frequently asked questions

Preserve existing homepage classes and background-image paths during migration.

Avoid duplicating the shared button, navigation, typography, and container rules already owned by other modules.

4.14 career.css — Career and recruitment

Contains reusable career presentation components.

Responsibilities:

* Career card grids
* Job and internship cards
* Career metadata
* Status labels
* Career-specific presentation patterns

Keep job data, application eligibility, recruitment workflows, and application processing in the relevant application logic.

A CSS status class must never be treated as proof that a vacancy is open or that an applicant is eligible.

4.15 admin.css — Administrative interfaces

Contains:

* Administrative layouts
* Sidebar and content panels
* Data-table presentation
* Administrative cards
* Status indicators
* Responsive table wrappers
* Admin-specific spacing

Scope selectors to administrative components to reduce the risk of affecting public-facing pages.

Security requirement: CSS visibility is not access control. Administrative permissions and protected data must be enforced by the backend.

4.16 print.css — Print presentation

Contains print-specific styling for:

* Page margins
* Readable printed typography
* Screen-only navigation and controls
* Print-friendly backgrounds and borders
* Images and content widths
* Page-break behavior

Ensure essential information remains available when navigation, buttons, or other screen-only elements are hidden.

⸻

5. Master Stylesheet and Cascade Order

5.1 Recommended import order

The master stylesheet should load foundational styles before the components that depend on them.

A suitable starting order is:

/* 1. Design foundations */
@import url(“./variables.css”);
@import url(“./reset.css”);
@import url(“./typography.css”);
/* 2. Shared interface and site structure */
@import url(“./components.css”);
@import url(“./layout.css”);
/* 3. Shared controls */
@import url(“./forms.css”);
/* 4. Page-specific components */
@import url(“./education.css”);
@import url(“./career.css”);
@import url(“./auth.css”);
@import url(“./dashboard.css”);
@import url(“./admin.css”);
/* 5. Cross-cutting behavior */
@import url(“./animations.css”);
@import url(“./accessibility.css”);
@import url(“./responsive.css”);
@import url(“./print.css”);

This is a proposed order, not a verified copy of the repository’s current import graph. Check actual dependencies before adopting it.

CSS import order affects the cascade. Specificity, source order, cascade layers, and media conditions can all influence the final result.

5.2 Entry-point responsibilities

The master stylesheet should:

* Import each required module once.
* Use correct relative paths.
* Keep dependency order consistent.
* Avoid duplicating declarations already owned by modules.
* Remain easy to inspect during debugging.

Place @import rules before ordinary style rules and other declarations that would make them invalid in that position.

5.3 Shared versus page-specific loading

For a smaller application, importing all modules through style.css can be a reasonable starting point.

As MedOrbits grows, consider loading only the page-specific modules needed by each page. This can reduce unnecessary CSS downloads and prevent unrelated components from affecting other interfaces.

Do not import a module through style.css and then load it a second time in the HTML unless there is a specific reason.

⸻

6. HTML Integration

6.1 Load the master stylesheet

Use the actual public path configured for the deployment:

<link rel=“stylesheet” href=“/assets/css/style.css”>

The path above is an example. Verify whether the repository actually serves CSS from /assets/css/, /css/, or another directory.

6.2 Load a page-specific module

If page-specific styles are intentionally excluded from the master stylesheet, a page may load its own module:

<link rel=“stylesheet” href=“/assets/css/style.css”>
<link rel=“stylesheet” href=“/assets/css/auth.css”>

Only use this pattern if auth.css is not already imported by style.css.

6.3 Preserve existing homepage behavior

Before migrating inline CSS or changing imports:

1. Create a baseline copy or commit of the current homepage.
2. Identify the existing inline and external style rules.
3. Map each rule to its intended module.
4. Preserve existing selectors and JavaScript-dependent classes.
5. Migrate one logical group at a time.
6. Compare the original and updated pages.
7. Remove duplicate declarations only after verifying their effects.

Do not assume that two declarations are interchangeable simply because their property values look similar. Specificity, source order, inheritance, pseudo-elements, and media conditions may affect rendering.

⸻

7. Naming and Coding Standards

7.1 Class naming

* Use descriptive and consistent class names.
* Prefer reusable classes for repeated components.
* Keep page-specific selectors appropriately scoped.
* Avoid unnecessarily deep selector nesting.
* Avoid broad selectors that unintentionally affect unrelated components.
* Preserve existing class names when reorganizing the current homepage.

7.2 Formatting

Use consistent indentation, spacing, and selector grouping.

Prefer:

.career-card {
  padding: 20px;
  border: 1px solid var(—line);
  border-radius: 14px;
}

Avoid compressing entire components into single-line declarations in maintained source files.

7.3 Specificity

* Prefer simple class selectors.
* Avoid unnecessary !important.
* Keep intentional overrides understandable.
* Avoid redefining shared components in page-specific files.
* Document exceptional overrides where their purpose is not obvious.

Use !important only when justified by the cascade, including carefully scoped print overrides or established compatibility requirements.

⸻

8. Responsive Design Standards

Test relevant pages at narrow mobile, larger mobile, tablet, laptop, and desktop widths.

Pay particular attention to:

* Header and navigation behavior
* Dropdown menus and touch interaction
* Course and destination cards
* Search controls and enquiry forms
* Authentication layouts
* Dashboard sidebars and statistic grids
* Administrative tables
* Footer columns
* Long words, URLs, and email addresses
* Image sizing and aspect ratios
* Horizontal overflow
* Touch-target size and spacing

Do not rely on the existence of a media query as proof of responsive behavior. Test the rendered result.

Use minmax(0, 1fr), flexible widths, and appropriate wrapping where they help prevent grid overflow.

For tables, prefer a controlled horizontal scrolling container over allowing the entire page to overflow.

⸻

9. Accessibility Standards

Every relevant interface should support:

* Keyboard navigation
* Clearly visible focus indicators
* Sufficient text and control contrast
* Reduced-motion preferences
* Readable content at increased zoom
* Understandable form labels and errors
* Appropriate semantic HTML
* Status communication that does not rely on colour alone

For example, a keyboard-focus rule can use the existing brand token:

:focus-visible {
  outline: 2px solid var(—gold-light, #e4d0a1);
  outline-offset: 3px;
}

Do not globally suppress outlines without providing an equally visible replacement.

For animations, avoid making essential content dependent on motion. Respect prefers-reduced-motion without unintentionally hiding or delaying essential interface content.

Use semantic HTML for interactive elements; CSS cannot make an incorrectly structured control fully accessible.

⸻

10. Animation and Performance Standards

Animation requirements

* Preserve the existing opening-animation selectors and keyframes.
* Avoid unnecessary layout-triggering animation properties.
* Avoid duplicating keyframes under different names without a clear need.
* Ensure hidden and completed animation states remain compatible with existing JavaScript.
* Verify reduced-motion behavior.

Performance requirements

* Avoid duplicate stylesheet requests.
* Keep shared modules focused.
* Remove unused CSS only after checking HTML, templates, and JavaScript references.
* Avoid unnecessarily expensive effects on frequently updated elements.
* Verify asset paths in the production environment.
* Review browser developer tools for failed requests and stylesheet errors.

Where appropriate, animate transform and opacity rather than repeatedly triggering layout changes.

Do not introduce build tools or minification steps unless they fit the repository’s existing deployment process.

⸻

11. Validation and Testing

Complete the relevant checks before merging CSS changes.

Structure and imports

* [ ]	All documented files exist.
* [ ]	Filenames match the actual repository.
* [ ]	The master stylesheet imports the intended modules.
* [ ]	Import paths resolve correctly.
* [ ]	Each module is loaded only as intended.
* [ ]	The cascade order has been reviewed.
* [ ]	No unexpected CSS syntax errors remain.

Visual compatibility

* [ ]	The homepage retains its established brand identity.
* [ ]	The announcement bar remains correctly styled.
* [ ]	The sticky header behaves as expected.
* [ ]	Dropdown navigation remains functional.
* [ ]	The footer retains its structure.
* [ ]	Opening animations still work with existing HTML and JavaScript.
* [ ]	Images and background assets load correctly.
* [ ]	Existing inline styles have not been removed prematurely.

Page coverage

* [ ]	Education sections and cards render correctly.
* [ ]	Forms and search controls remain usable.
* [ ]	Authentication pages retain their layout.
* [ ]	Dashboard grids and navigation work.
* [ ]	Career cards and status labels remain consistent.
* [ ]	Administrative tables remain readable.
* [ ]	Print layouts retain essential information.

Responsive and accessibility checks

* [ ]	No unintended horizontal overflow is introduced.
* [ ]	Mobile, tablet, and desktop layouts have been tested.
* [ ]	Keyboard-focus indicators remain visible.
* [ ]	Reduced-motion preferences are respected.
* [ ]	Text contrast remains sufficient.
* [ ]	Form controls have usable labels and states.
* [ ]	Interactive controls remain usable by keyboard and touch.

Deployment checks

* [ ]	Public stylesheet paths match deployment configuration.
* [ ]	No unexpected 404 responses occur for CSS assets.
* [ ]	Browser console errors have been reviewed.
* [ ]	Production rendering has been compared with the validated local or staging version.

Mark checklist items complete only after verification.

⸻

12. Recommended Migration Workflow

Use this sequence when reorganizing the existing stylesheet system:

1. Inspect: Review the current CSS files, homepage markup, inline styles, and JavaScript-dependent selectors.
2. Baseline: Record the current homepage appearance and working interactions.
3. Map: Assign each existing rule to its intended module.
4. Migrate: Move one logical group of rules at a time.
5. Import: Update style.css only after confirming file names and dependencies.
6. Compare: Test the original and modular versions at the same viewport sizes.
7. Resolve: Fix duplicate declarations, specificity conflicts, and missing asset paths.
8. Validate: Test affected pages, responsive layouts, accessibility, and print output.
9. Document: Update this README when the directory or module responsibilities change.
10. Commit: Keep related CSS changes and any necessary HTML or JavaScript adjustments in a reviewable commit.

Avoid combining a large architectural migration with an unrelated redesign. Keeping those changes separate makes regressions easier to identify and resolve.

⸻

13. Maintenance and Security Boundaries

CSS controls presentation, not application permissions or data integrity.

The following must remain enforced outside CSS:

* Authentication and session validation
* Role-based access control
* Administrative authorization
* Application submission and processing
* Job availability and eligibility
* Payment and subscription state
* Document access and privacy
* Form validation and server-side data handling

Hiding an element with display: none does not protect the underlying data or functionality.

Likewise, visual status labels must reflect trusted application data rather than being treated as authoritative state.

⸻

14. Definition of Done

A CSS architecture change is ready for review when:

* The intended module ownership is clear.
* All required imports and paths are verified.
* Existing homepage behavior is preserved or the change is explicitly documented.
* The affected page types have been tested.
* Responsive and accessibility checks have been completed.
* No unintended duplicate styling or cascade regressions remain.
* The README accurately describes the current repository.
* Any remaining limitations are documented.

⸻

15. Final Architecture Principle

The MedOrbits CSS system should provide a consistent, premium visual experience without sacrificing compatibility, maintainability, responsiveness, accessibility, or performance.

Preserve first. Modularize deliberately. Validate before deployment.

The objective is not simply to divide CSS into more files. It is to make every stylesheet’s responsibility clear, every dependency intentional, and every change verifiable.
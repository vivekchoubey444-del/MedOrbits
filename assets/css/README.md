MedOrbits CSS Architecture

Project: MedOrbits
Directory: assets/css/
Document: README.md
Version: 1.2.0
Status: Architecture and maintenance specification
Design direction: Luxury Aubergine, Royal Burgundy & Champagne Gold

⸻

1. Overview

The MedOrbits CSS architecture is a modular styling system designed to provide a consistent, accessible, responsive, and maintainable interface across the MedOrbits website.

The system separates design tokens, browser normalization, local font loading, typography, reusable components, site structure, page-specific presentation, responsive behavior, accessibility, animation, and print styling into dedicated stylesheets.

The architecture supports:

* Education consultancy and course discovery
* Medical and allied-health education pathways
* Study-abroad services
* Authentication and account management
* Student and user dashboards
* Career guidance, jobs, and internships
* Employer and recruitment services
* Administrative interfaces
* Printable applications and information pages

Core objectives

1. Preserve the established homepage appearance and behavior.
2. Centralize reusable design decisions in design tokens.
3. Keep each stylesheet responsible for a clearly defined area.
4. Avoid duplicate declarations and conflicting cascade rules.
5. Support mobile, tablet, laptop, and desktop layouts.
6. Maintain keyboard accessibility and reduced-motion support.
7. Load fonts efficiently using verified local assets.
8. Validate changes before deployment.

Compatibility principle: Existing HTML classes, JavaScript-dependent selectors, navigation interactions, asset paths, and opening-animation behavior must be preserved unless a change is intentional and tested.

This document defines the intended architecture. It does not certify that all modules are implemented, correctly imported, or tested in production.

⸻

2. Directory Structure

2.1 Current target structure

The following structure reflects the modular stylesheet organization used by MedOrbits:

assets/
└── css/
    ├── README.md
    ├── master.css
    ├── variables.css
    ├── reset.css
    ├── font.css
    ├── typography.css
    ├── components.css
    ├── layout.css
    ├── forms.css
    ├── education.css
    ├── career.css
    ├── auth.css
    ├── dashboard.css
    ├── admin.css
    ├── animations.css
    ├── accessibility.css
    ├── responsive.css
    └── print.css

This is the documented target structure, not a verified inventory of the deployed repository.

Keep this document synchronized with the actual files. If the project uses style.css instead of master.css, document that filename and update the references accordingly.

2.2 File ownership

Stylesheet	Primary responsibility
variables.css	Design tokens and shared CSS custom properties
reset.css	Browser normalization and foundational defaults
font.css	Local font registration and font-loading configuration
typography.css	Headings, paragraphs, text hierarchy, and readability
master.css	Master stylesheet and import orchestration
components.css	Reusable buttons, labels, tags, and UI elements
layout.css	Header, navigation, shared containers, and footer
forms.css	Shared inputs, labels, validation, and search controls
education.css	Education homepage sections and course presentation
career.css	Career, job, and internship presentation
auth.css	Login, registration, and recovery page presentation
dashboard.css	Account dashboard components
admin.css	Administrative layouts, cards, and tables
animations.css	Opening animation and reusable motion effects
accessibility.css	Focus states and accessibility utilities
responsive.css	Cross-module responsive overrides
print.css	Print-specific styling

Each rule should have one primary owner. Another module may override a rule when necessary, but the exception should be deliberate.

⸻

3. Design System

3.1 Brand identity

MedOrbits uses a premium academic-consultancy visual identity built around deep aubergine, royal burgundy, champagne gold, and complementary muted tones.

The existing homepage and variables.css are the source of truth for the actual palette.

Do not introduce a new palette merely to standardize the stylesheet architecture.

3.2 Existing design tokens

The current design system includes tokens such as:

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
  —font-body: “DM Sans”, Arial, sans-serif;
  —font-heading: “Playfair Display”, Georgia, serif;
  —font-ui: “DM Sans”, Arial, sans-serif;
}

This example documents the established token family. Before changing variables.css, compare the complete file and preserve any additional tokens used by existing components.

3.3 Token rules

* Reuse existing custom properties instead of hardcoding repeated values.
* Keep shared color, typography, spacing, radius, shadow, and transition decisions centralized.
* Use fallbacks when a component must tolerate an absent token.
* Avoid redefining shared tokens in unrelated modules.
* Introduce new tokens only for reusable design decisions.
* Document intentional exceptions.
* Use two ordinary hyphens in every custom property name.

Correct:

—gold: #c9a96e;
—font-body: “DM Sans”, Arial, sans-serif;

Incorrect:

–gold: #c9a96e;

The incorrect example contains a typographic en dash, not the two ASCII hyphens required by CSS.

⸻

4. Stylesheet Responsibilities

4.1 variables.css — Design tokens

Defines the shared design vocabulary.

Responsibilities:

* Brand colors and accent colors
* Backgrounds and surfaces
* Primary and muted text colors
* Border and radius values
* Shadows
* Spacing conventions
* Typography tokens
* Transition durations
* Stacking levels

Keep component-specific declarations out of this file.

4.2 reset.css — Browser foundation

Provides predictable browser defaults.

Responsibilities:

* Consistent box-sizing
* Foundational margin and padding behavior
* Image and media sizing
* Form-control foundations
* Default element behavior
* Basic focus and hidden-state compatibility where appropriate

Avoid placing homepage-specific or dashboard-specific presentation here.

Coordinate reset rules with typography.css and accessibility.css to avoid unnecessary duplication.

4.3 font.css — Font loading

Registers the local font files used by MedOrbits.

The current font family configuration is:

* DM Sans for body text and interface elements
* Playfair Display for premium editorial headings

The available font assets shown in the project’s font directory are:

fonts/main/
├── DMSans-Regular.ttf
├── DMSans-Medium.ttf
├── DMSans-SemiBold.ttf
├── DMSans-Bold.ttf
├── PlayfairDisplay-Medium.ttf
├── PlayfairDisplay-SemiBold.ttf
└── PlayfairDisplay-Bold.ttf

Verify the actual repository path before using these filenames.

Responsibilities:

* Define @font-face declarations
* Register available font weights
* Set font-display
* Provide consistent font-family names
* Keep fallback font stacks available
* Avoid duplicate font downloads

Example:

@font-face {
  font-family: “DM Sans”;
  src: url(“../../fonts/main/DMSans-Regular.ttf”)
    format(“truetype”);
  font-style: normal;
  font-weight: 400;
  font-display: swap;
}

The example assumes font.css is located at assets/css/font.css and the font file is located at fonts/main/DMSans-Regular.ttf.

Important: The relative URL must match the real file location. CSS cannot load a font merely because a similar filename exists elsewhere in the repository.

Font implementation rules

1. Prefer WOFF2 for production when suitable files are available.
2. Use only font assets whose licences permit the intended use.
3. Declare only weights and styles that actually exist.
4. Do not label a static regular font as bold unless a deliberate synthetic-weight strategy is intended.
5. For variable fonts, declare the supported weight range only when the file supports it.
6. Use font-display: swap or another deliberate loading strategy.
7. Keep system-font fallbacks available.
8. Avoid loading unused weights, families, and character subsets.
9. Do not combine external font imports and duplicate local definitions without a documented reason.
10. Verify successful font requests in the browser.

Font loading belongs in font.css. General text presentation belongs in typography.css.

4.4 typography.css — Text and readability

Controls how registered fonts are used throughout the site.

Responsibilities:

* Global font assignments
* Heading hierarchy
* Body text and paragraph spacing
* Link presentation
* Text hierarchy
* Line height and readability
* Responsive typography

Example:

body {
  font-family: var(—font-body, “DM Sans”, Arial, sans-serif);
  line-height: 1.6;
}
h1,
h2,
h3,
h4,
h5,
h6 {
  font-family:
    var(—font-heading, “Playfair Display”, Georgia, serif);
  line-height: 1.2;
}

Use decorative heading fonts for headings and short editorial elements rather than long paragraphs.

4.5 master.css — Master stylesheet

Acts as the main stylesheet entry point for pages that use the complete shared design system.

Responsibilities:

* Import the required modules
* Establish the intended cascade order
* Prevent duplicate module imports
* Keep dependencies understandable

Avoid turning master.css into another large file of component declarations.

If the application already uses style.css, choose one master entry point rather than maintaining two competing files.

4.6 components.css — Reusable UI

Owns shared interface components such as:

* Buttons and button variants
* Eyebrows and section labels
* Tags and badges
* Text links
* Visual captions and stamps
* Reusable cards where appropriate
* Notices and disclaimers
* Skip-navigation links

Components should work across multiple pages without duplicating equivalent declarations.

4.7 layout.css — Shared site structure

Owns:

* Announcement bar
* Header and logo area
* Sticky header
* Primary navigation
* Dropdown menus
* Shared containers
* Footer and footer columns

Preserve existing selectors and JavaScript-dependent behavior, particularly for:

* .header
* .nav-wrap
* .nav-group
* .dropdown
* .announcement
* .footer

Do not rename these classes during a CSS-only refactor unless the associated HTML and JavaScript are updated and tested together.

4.8 forms.css — Shared controls

Owns:

* Input fields
* Select controls
* Textareas
* Search forms
* Labels
* Focus states
* Validation and error presentation
* Disabled states
* Shared form layouts

Authentication-specific containers belong in auth.css; reusable control behavior belongs here.

4.9 education.css — Education presentation

Owns education-related page sections, including:

* Hero sections
* Education pillars
* Search bands
* Course and service cards
* About sections
* Benefits and checklists
* Video content
* Calls to action
* FAQs

Preserve existing homepage selectors and image paths. Shared buttons, navigation, typography, and containers should remain owned by their respective modules.

4.10 career.css — Career and recruitment

Owns:

* Career card grids
* Job and internship cards
* Career metadata
* Status labels
* Career-specific layouts

CSS classes provide presentation only. Vacancy status, applicant eligibility, and recruitment decisions must come from trusted application data.

4.11 auth.css — Authentication presentation

Owns:

* Login and registration layouts
* Password recovery
* Verification interfaces
* Authentication cards
* Authentication headings and actions
* Authentication-specific links

Authentication, session management, password recovery, and authorization must be enforced by application logic and the backend.

4.12 dashboard.css — Account dashboards

Owns:

* Dashboard layouts
* Sidebar navigation
* Account panels
* Summary statistics
* Dashboard grids
* Navigation states
* Account status indicators

Keep dashboard selectors scoped so they do not unintentionally affect public pages.

4.13 admin.css — Administrative interfaces

Owns:

* Administrative layouts
* Sidebar and content panels
* Data tables
* Administrative cards
* Status indicators
* Responsive table wrappers

CSS visibility is not authorization. Protected routes, administrative permissions, and sensitive data must be enforced server-side.

4.14 animations.css — Opening animation and motion

Owns:

* Existing intro-screen selectors
* Opening-animation keyframes
* Entrance effects
* Animation state classes
* Reusable motion effects

Preserve the existing animation lifecycle, including its initial state, completion state, hidden state, and JavaScript interactions.

Respect prefers-reduced-motion without unintentionally hiding essential content.

4.15 accessibility.css — Accessibility utilities

Owns shared accessibility presentation, including:

* Keyboard focus indicators
* Visually hidden utilities
* Focus visibility
* Accessible interaction states
* Appropriate reduced-motion support

Avoid duplicating every reset rule here. Establish one primary owner for each shared behavior.

4.16 responsive.css — Cross-module responsive behavior

Owns shared responsive overrides for:

* Navigation collapse
* Global grids and columns
* Shared footer layouts
* Cross-module spacing adjustments
* Overflow prevention
* Responsive controls

Component-specific responsive rules may remain in their owning module when that improves maintainability.

Avoid contradictory media queries across multiple files.

4.17 print.css — Print presentation

Owns:

* Print page margins
* Readable printed typography
* Screen-only navigation and controls
* Print-friendly backgrounds and borders
* Images and content widths
* Page-break behavior

Do not hide essential information merely because it is not interactive.

⸻

5. Master Stylesheet and Cascade Order

5.1 Recommended import order

For the current assets/css/master.css entry point, use this as the proposed order:

/* 1. Design tokens */
@import url(“./variables.css”);
/* 2. Font registration */
@import url(“./font.css”);
/* 3. Browser foundation and typography */
@import url(“./reset.css”);
@import url(“./typography.css”);
/* 4. Shared interface and structure */
@import url(“./components.css”);
@import url(“./layout.css”);
/* 5. Shared controls */
@import url(“./forms.css”);
/* 6. Page-specific modules */
@import url(“./education.css”);
@import url(“./career.css”);
@import url(“./auth.css”);
@import url(“./dashboard.css”);
@import url(“./admin.css”);
/* 7. Cross-cutting presentation */
@import url(“./animations.css”);
@import url(“./accessibility.css”);
@import url(“./responsive.css”);
/* 8. Print presentation */
@import url(“./print.css”);

This is a starting point, not a guarantee that the order is correct for every existing rule. Inspect the actual files before adopting it.

Import order affects the cascade, but specificity, source order, inheritance, media conditions, and cascade layers also influence the final result.

5.2 Entry-point rules

* Import each module only as intended.
* Use correct relative paths.
* Keep font registration before rules that use the fonts.
* Keep imports before ordinary style rules.
* Avoid duplicate imports through both HTML and the master stylesheet.
* Document intentional ordering dependencies.
* Keep the entry point focused on orchestration.

5.3 Avoid competing master files

Do not independently maintain both style.css and master.css as competing complete entry points.

If style.css is the actual entry point, update this documentation and use that filename consistently. If master.css is the actual entry point, use it consistently instead.

5.4 Shared and page-specific loading

Loading the full shared stylesheet is a reasonable starting point for a smaller application.

As MedOrbits grows, consider loading only the page-specific modules needed for a page, provided the change is compatible with the existing deployment and HTML structure.

Do not load a module twice unless there is a specific, documented reason.

⸻

6. HTML Integration and Font Preloading

6.1 Load the master stylesheet

Use the public path configured by the application:

<link rel=“stylesheet” href=“/assets/css/master.css”>

This path is an example. Confirm that the server actually exposes assets/css/ at /assets/css/.

6.2 Page-specific modules

If a module is intentionally excluded from the master stylesheet, a page can load it separately:

<link rel=“stylesheet” href=“/assets/css/master.css”>
<link rel=“stylesheet” href=“/assets/css/auth.css”>

Only use this pattern if auth.css is not already imported by the master stylesheet.

6.3 Font preloading

Preload only critical fonts that are needed for initial rendering.

Example for a verified WOFF2 font:

<link
  rel=“preload”
  href=“/fonts/main/dm-sans-regular.woff2”
  as=“font”
  type=“font/woff2”
  crossorigin
>

This example assumes that the WOFF2 file exists at that public URL. Do not use it for a TTF asset or a file that has not been verified.

Font preloading rules:

* Preload only critical fonts.
* Match the font type to the actual file format.
* Use crossorigin for font preloads.
* Avoid preloading every weight.
* Verify public paths and server responses.
* Avoid duplicate font requests.

⸻

7. Naming and Coding Standards

7.1 Class naming

* Use descriptive, consistent class names.
* Prefer reusable classes for repeated components.
* Scope page-specific selectors appropriately.
* Avoid unnecessary selector depth.
* Avoid broad rules that affect unrelated components.
* Preserve existing classes during refactoring.

7.2 Formatting

Use consistent indentation, selector grouping, and spacing.

Preferred:

.career-card {
  padding: 20px;
  border: 1px solid var(—line);
  border-radius: var(—radius);
}

Avoid compressing maintained source files into single-line declarations.

7.3 Specificity

* Prefer straightforward class selectors.
* Avoid unnecessary !important.
* Keep overrides understandable.
* Do not recreate shared components in page-specific files.
* Document exceptional overrides where their purpose is not obvious.

7.4 CSS custom properties

All custom properties must use two ordinary hyphens:

—gold: #c9a96e;
—font-body: “DM Sans”, Arial, sans-serif;

Use straight quotes in CSS strings. Typographic quotation marks copied from rich-text documents can invalidate declarations.

⸻

8. Responsive Design Standards

Test relevant pages at narrow mobile, larger mobile, tablet, laptop, and desktop widths.

Check:

* Header and navigation behavior
* Dropdown interaction and touch usability
* Course and service cards
* Search controls and enquiry forms
* Authentication layouts
* Dashboard sidebars and statistics
* Administrative tables
* Footer columns
* Long URLs and email addresses
* Images and background-image paths
* Horizontal overflow
* Touch-target sizing
* Text wrapping when fallback fonts render differently

Use flexible grids and widths where appropriate:

.card-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 24px;
}
@media (max-width: 900px) {
  .card-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
@media (max-width: 600px) {
  .card-grid {
    grid-template-columns: minmax(0, 1fr);
  }
}

This is a generic example. Apply it only where the actual HTML and existing class names support it.

For wide tables, prefer a controlled scrolling container rather than allowing the whole page to overflow.

A media query is not proof of responsive behavior. Test the rendered result.

⸻

9. Accessibility Standards

Every relevant interface should support:

* Keyboard navigation
* Visible focus indicators
* Sufficient text and control contrast
* Reduced-motion preferences
* Readable content at increased zoom
* Understandable form labels and errors
* Semantic HTML
* Status communication that does not rely on color alone
* Readable fallback fonts

Example:

:focus-visible {
  outline: 2px solid var(—gold-light, #e4d0a1);
  outline-offset: 3px;
}

Do not suppress outlines without providing an equally visible replacement.

Visually hidden content intended for assistive technology must remain accessible to the accessibility tree.

Essential content must not depend on animation to become visible.

Font accessibility

* Use readable sizes and line heights.
* Avoid decorative typefaces for long paragraphs.
* Keep text understandable when custom fonts fail to load.
* Test zoom and text resizing.
* Prevent clipping and unintended horizontal overflow.
* Maintain adequate contrast against the existing backgrounds.

⸻

10. Animation and Performance

Animation requirements

* Preserve existing intro-screen selectors and keyframes.
* Avoid unnecessary layout-triggering animations.
* Avoid duplicate keyframes without a clear reason.
* Keep animation states compatible with existing JavaScript.
* Respect reduced-motion preferences.
* Ensure essential content remains available if animation is disabled.

Where appropriate, prefer transform and opacity over repeatedly animating layout properties.

Performance requirements

* Avoid duplicate stylesheet requests.
* Keep modules focused.
* Remove unused CSS only after checking HTML, templates, and JavaScript references.
* Avoid expensive effects on frequently updated elements.
* Verify production asset paths.
* Review browser network and console errors.
* Load only the necessary font weights.
* Prefer optimized WOFF2 assets when available.
* Apply suitable cache headers to static assets.

Do not introduce a build system, bundler, or minification process unless it fits the repository’s existing deployment process.

⸻

11. Validation Checklist

Complete relevant checks before merging CSS changes.

Structure and imports

* [ ]	All documented files exist.
* [ ]	Filenames match the repository.
* [ ]	The master stylesheet imports the intended modules.
* [ ]	Import paths resolve correctly.
* [ ]	Modules are not unintentionally loaded twice.
* [ ]	The cascade order has been reviewed.
* [ ]	CSS syntax errors have been checked.

Fonts

* [ ]	font.css is included in the intended entry point.
* [ ]	Every declared font file exists.
* [ ]	Font-family names match the design tokens.
* [ ]	Weights and styles match the actual font assets.
* [ ]	Font licences permit the intended use.
* [ ]	Font requests succeed in the browser.
* [ ]	Fallback fonts render readable text.
* [ ]	Preloading is limited to critical fonts.
* [ ]	Duplicate font requests are avoided.
* [ ]	Text remains readable while fonts load.

Visual compatibility

* [ ]	The homepage retains its established identity.
* [ ]	The announcement bar and sticky header work.
* [ ]	Dropdown navigation remains functional.
* [ ]	The footer retains its structure.
* [ ]	Opening animations remain compatible with existing JavaScript.
* [ ]	Images and backgrounds load correctly.
* [ ]	Inline styles have not been removed prematurely.
* [ ]	Typography remains consistent after font loading.

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
* [ ]	Mobile, tablet, and desktop layouts are tested.
* [ ]	Keyboard focus remains visible.
* [ ]	Reduced-motion preferences are respected.
* [ ]	Text contrast is sufficient.
* [ ]	Form controls have usable labels and states.
* [ ]	Keyboard and touch interactions remain usable.
* [ ]	Text remains legible at increased zoom.

Deployment

* [ ]	Public paths match the deployment configuration.
* [ ]	CSS and font assets do not return unexpected 404 responses.
* [ ]	Browser console errors have been reviewed.
* [ ]	Production rendering has been compared with the validated version.

Mark checklist items complete only after verification.

⸻

12. Recommended Migration Workflow

1. Inspect: Review current CSS, homepage markup, inline styles, JavaScript-dependent selectors, and font assets.
2. Baseline: Record the current homepage appearance and working interactions.
3. Map: Assign each existing rule to its intended module.
4. Audit fonts: Verify font files, paths, licensing, weights, and current usage.
5. Migrate typography: Separate font registration from general text styling without redesigning the homepage.
6. Migrate components: Move one logical group of rules at a time.
7. Update imports: Modify the master stylesheet after confirming filenames and dependencies.
8. Compare: Test original and updated versions at the same viewport sizes.
9. Resolve conflicts: Fix duplicate declarations, specificity issues, missing paths, and font-loading errors.
10. Validate: Test affected pages, responsive layouts, accessibility, and print output.
11. Document: Update this README when the directory or module responsibilities change.
12. Commit: Keep related CSS and necessary HTML or JavaScript changes in reviewable commits.

Avoid combining a large architecture migration with an unrelated redesign. Separating those changes makes regressions easier to identify.

⸻

13. Maintenance and Security Boundaries

CSS controls presentation, not application permissions or data integrity.

The following must be enforced outside CSS:

* Authentication and session validation
* Role-based access control
* Administrative authorization
* Application submission and processing
* Job availability and eligibility
* Payment and subscription state
* Document access and privacy
* Form validation and server-side data handling

Hiding an element with display: none does not protect the underlying data or functionality.

Status labels must reflect trusted application data. Visual classes are not authoritative application state.

Font assets must also have verified origins, suitable licences, and appropriate integrity and deployment handling.

⸻

14. Definition of Done

A CSS architecture change is ready for review when:

* Module ownership is clear.
* Required imports and paths have been verified.
* Font declarations reference available, licensed assets.
* Existing homepage behavior is preserved or changes are documented.
* Affected pages have been tested.
* Responsive and accessibility checks have been completed.
* No unintended duplicate styling or cascade regressions remain.
* The README reflects the actual repository.
* Remaining limitations are documented.

⸻

15. Final Architecture Principle

The MedOrbits CSS system should deliver a consistent, premium visual experience without sacrificing compatibility, maintainability, responsiveness, accessibility, or performance.

Preserve first. Modularize deliberately. Centralize fonts. Validate before deployment.

The objective is not simply to divide CSS into more files. It is to make every stylesheet’s responsibility clear, every dependency intentional, and every change verifiable.
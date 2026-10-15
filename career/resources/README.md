# MedOrbits Career Resources — Rosewood Elite

This directory contains the career-resource library for MedOrbits, using the existing career page as the shared structural reference.

## Design system
- **Palette:** dark brown, deep forest green and antique gold — Rosewood Elite.
- **Shared shell:** the same opening animation, announcement strip, logo, sticky header/navigation, footer and JavaScript shell used by `/career/index.html`.
- **Layout:** responsive sections, resource cards, checklists, tables and FAQ accordions.
- **Accessibility:** skip link, semantic headings, keyboard-friendly native details/summary accordions and reduced-motion support inherited from the shared shell.

## Files
- `index.html` — resource library landing page.
- `guides.html` — job-search planning, application checklist, networking and offer evaluation.
- `resume-templates.html` — resume outlines for students, experienced professionals, career changers and academic/healthcare profiles.
- `interview-questions.html` — interview question bank and preparation checklist.
- `salary-guide.html` — salary research method, total-compensation comparison and negotiation preparation.
- `job-fraud-awareness.html` — warning signs, independent verification and practical response steps.
- `faqs.html` — frequently asked questions about career resources and safer job searching.

## Shared assets
The pages reference root-relative shared assets already used by MedOrbits:
- `/assets/images/logo/medorbits-logo.png`
- `/assets/images/hero/hero-home.jpg`
- `/assets/css/style.css`
- `/assets/js/constants.js`
- `/assets/js/config.js`
- `/assets/js/utils.js`
- `/assets/js/navigation.js`
- `/assets/js/search.js`
- `/assets/js/animations.js`
- `/assets/js/app.js`

The logo and hero image must exist at these exact paths. Resource content uses local HTML and does not require extra image files.

## Installation
Copy this folder to the website at `/career/resources/`. All links are written for that deployed path.

## Important note
Career resources are general educational information. They do not guarantee employment, interviews, salary outcomes or recruitment results. Verify employers, vacancies, compensation and other material claims independently.

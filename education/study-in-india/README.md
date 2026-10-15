MedOrbits — Study in India

Directory

/education/study-india/

This directory contains the MedOrbits destination hub and
course-specific pages for students exploring education opportunities in
India.

File Structure

study-india/
├── README.md
├── index.html
├── mbbs.html
├── bds.html
├── ayush.html
├── nursing.html
├── pharmacy.html
├── paramedical.html
├── engineering.html
├── management.html
├── law.html
├── pg-medical.html
├── pg-others.html
└── more-courses.html

Page Responsibilities

────────

File                                Purpose

────────

index.html                        Main Study in India landing page;
introduces study pathways and links
to course pages.

mbbs.html                         MBBS education, admission pathway,
eligibility, counselling, and
medical-college research.

bds.html                          Dental education and BDS admission
information.

ayush.html                        AYUSH pathways, including relevant
traditional and complementary
healthcare programmes.

nursing.html                      Nursing courses, study routes,
eligibility, and career pathways.

pharmacy.html                     Pharmacy programmes, admission
planning, and related career
options.

paramedical.html                  Paramedical and allied-health
programmes and application
guidance.

engineering.html                  Engineering disciplines, course
selection, entrance exams, and
institution research.

management.html                   Management and business programmes,
including undergraduate and
postgraduate pathways.

law.html                          Legal education pathways, entrance
examinations, and law-school
research.

pg-medical.html                   Postgraduate medical education and
related admission planning.

pg-others.html                    Other postgraduate programmes
outside the dedicated medical
postgraduate page.

more-courses.html                 Additional courses and pathways not covered by the primary pages.

Design System

Use the Royal Burgundy & Champagne Gold visual direction
consistently across this directory.

• Primary surfaces: deep royal burgundy and dark aubergine.
• Accents: champagne gold for highlights, borders, icons, and
primary actions.
• Typography: elegant display headings paired with a legible
sans-serif body font.
• Layout: responsive sections, compact cards, clear hierarchy, and
readable spacing.
• Interaction: sticky header, dropdown navigation, mobile menu,
subtle transitions, and an animated MedOrbits intro where used by
the reference page.
• Accessibility: semantic HTML, visible focus states, descriptive
image alt text, keyboard-operable controls, and reduced-motion
support.

Avoid pure-white section backgrounds. Maintain strong contrast between
text, surfaces, and gold accents.

Shared Project Dependencies

Use the existing site-wide assets rather than creating duplicate files:

• Shared stylesheet: /assets/css/style.css
• JavaScript modules: /assets/js/constants.js,
/assets/js/config.js, /assets/js/utils.js,
/assets/js/navigation.js, /assets/js/search.js,
/assets/js/animations.js, and /assets/js/app.js
• Brand logo: /assets/images/logo/medorbits-logo.png
• Images: existing paths under /assets/images/
• Image fallback, where available:
/assets/images/placeholders/image-placeholder.svg

Only include script files that exist in the deployed project. Keep
shared navigation, footer, logo, and asset paths consistent with the
rest of MedOrbits.

Navigation and Linking

• Link the Study in India hub from the main Education navigation and
relevant Study Abroad or Education Hub pages.
• Link each course card to its matching page in this directory.
• Provide a clear route back to /education/study-india/index.html.
• Link general course discovery to /education/courses.html.
• Use the existing admission, fee, scholarship, document, college, and
university resource pages where relevant.
• Keep contact and guidance calls to action aligned with the current
site routes, such as /pages/contact.html and /pages/apply.html,
when those pages are available.

SEO and Page Metadata

Every HTML page should have:

• A unique, descriptive <title>.
• A concise, page-specific meta description.
• A canonical URL matching the deployed page path.
• A viewport declaration and appropriate theme color.
• Meaningful heading hierarchy and descriptive link text.
• Relevant image alt text and loading=“lazy” for non-critical
images.
• index, follow only when the page is intended to be publicly
indexed.

Do not copy the MBBS page title, description, or canonical URL unchanged
to other pages.

Content and Accuracy

• Treat course eligibility, entrance exams, recognition, fees, seat
availability, counselling rules, and deadlines as cycle-specific.
• Prefer official regulator, examination, institution, and
counselling-authority information.
• Clearly distinguish general guidance from official requirements.
• Do not promise admission, scholarships, employment, or specific
outcomes.
• Direct students to verify current requirements with the appropriate
official authority before applying.

Quality Checklist

Before publishing a page:

☐ Confirm the file name and internal links.
☐ Check desktop, tablet, and mobile layouts.
☐ Test the sticky header, dropdowns, mobile menu, search, and
calls to action.
☐ Verify that all image and script paths resolve.
☐ Check browser console errors and missing assets.
☐ Validate metadata, canonical URL, headings, and image alt text.
☐ Confirm keyboard navigation, focus visibility, and
reduced-motion behavior.
☐ Verify factual admission details against current official
sources.
☐ Confirm the page uses the Royal Burgundy & Champagne Gold design
system.

Maintenance

When adding a new course page, add it to this README, the Study in India
landing page, and the relevant site navigation or course directory.
Reuse established MedOrbits components and paths so that pages remain
visually and technically consistent.
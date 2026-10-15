MedOrbits — Study Abroad

Purpose

The study-abroad/ section helps students explore international study options, understand common application steps, and navigate destination-specific information from one consistent area of the MedOrbits website.

This directory contains a general study-abroad landing page, an MBBS-abroad guide, destination pages, and a page for additional countries.

Directory Structure

study-abroad/
├── README.md
├── index.html
├── mbbs-abroad.html
├── russia.html
├── georgia.html
├── kazakhstan.html
├── uzbekistan.html
├── kyrgyzstan.html
├── uae.html
└── more-countries.html

Page Responsibilities

|File                 |Purpose                                                                                                                      |
|———————|——————————————————————————————————————————|
|`index.html`         |Main study-abroad hub. Introduces international study planning and links to destination and subject-specific pages.          |
|`mbbs-abroad.html`   |Overview of MBBS abroad research, eligibility considerations, admissions, costs, recognition, licensing and student planning.|
|`russia.html`        |Destination guide for researching study options in Russia.                                                                   |
|`georgia.html`       |Destination guide for researching study options in Georgia.                                                                  |
|`kazakhstan.html`    |Destination guide for researching study options in Kazakhstan.                                                               |
|`uzbekistan.html`    |Destination guide for researching study options in Uzbekistan.                                                               |
|`kyrgyzstan.html`    |Destination guide for researching study options in Kyrgyzstan.                                                               |
|`uae.html`           |Destination guide for researching study options in the United Arab Emirates.                                                 |
|`more-countries.html`|Entry point for other destinations not covered by a dedicated page.                                                          |

Shared Design and Navigation

Keep these pages consistent with the MedOrbits site-wide design system:

• Use the existing brand logo and shared header, navigation dropdowns, footer and opening animation where appropriate.
• Follow the visual design and component patterns established by the root index.html and /education/index.html.
• Keep pages responsive across mobile, tablet and desktop sizes.
• Use accessible headings, descriptive image alt text, keyboard-friendly controls and visible focus states.
• Use the site’s established burgundy, emerald, gold or other page-specific palette intentionally; maintain readable contrast and a consistent MedOrbits identity.
• Reuse shared CSS and JavaScript under /assets/css/ and /assets/js/ instead of duplicating site-wide behavior when practical.

Suggested Page Content

index.html

• Introduction to studying abroad
• Destination cards linking to all country pages
• Study fields and degree-level pathways
• Application planning steps
• Fees, scholarships, documents and FAQs
• Clear links to request guidance

mbbs-abroad.html

• Overview of international medical education research
• Country and institution comparison considerations
• Academic eligibility and entrance requirements
• Tuition, living costs and other expenses
• Recognition and approval checks
• Language of instruction and clinical training considerations
• Current licensing, screening and registration requirements for the student’s intended country of practice
• Application documents, visa planning and FAQs

Destination pages

Each country page should use a common information structure where possible:

1. Destination overview
2. Available study fields and qualification types
3. Institutions and programme research links
4. Admission requirements and application process
5. Tuition, living expenses and funding considerations
6. Language, accommodation, travel and student-life information
7. Visa and immigration requirements
8. Recognition, accreditation and professional licensing checks where relevant
9. Documents checklist
10. FAQs and a request-guidance call to action

Country-specific details should be verified and maintained independently; do not copy requirements from one country to another.

more-countries.html

• List additional destinations
• Link to official national education, immigration and institution resources
• Link to a dedicated destination page when one is added

Asset and Link Conventions

Use root-relative URLs so the pages work consistently when deployed at the website root.

Examples:

<link rel=“stylesheet” href=“/assets/css/style.css”>
<img src=“/assets/images/destinations/russia.jpg” alt=“University campus in Russia”>
<a href=“/education/study-abroad/georgia.html”>Explore Georgia</a>

Suggested image directory:

assets/
└── images/
    └── destinations/
        ├── russia.jpg
        ├── georgia.jpg
        ├── kazakhstan.jpg
        ├── uzbekistan.jpg
        ├── kyrgyzstan.jpg
        ├── uae.jpg
        └── study-uk.jpg

These are suggested paths only. Confirm that each asset exists before referencing it in a page.

Accuracy, Compliance and Student Safety

International education requirements can change. Before publishing country-specific claims, verify them with current official sources, including:

• The university or institution itself
• The relevant national education regulator or recognition authority
• The appropriate immigration or visa authority
• The relevant professional regulator or licensing authority for regulated careers

Clearly distinguish general information from confirmed institution-specific requirements. Do not promise admission, visa approval, scholarships, employment, licensing eligibility or particular outcomes. Show dates or review notes for time-sensitive information and update them when requirements change.

For MBBS and other regulated professional programmes, students should verify the exact university, campus, programme, clinical training arrangement and recognition status against the rules that apply in the country where they intend to practise.

Functional Requirements

Before considering this section production-ready, confirm that:

• All destination links resolve to the correct page.
• Navigation and footer links match the actual project structure.
• Search and enquiry forms have a working destination and server-side validation, if included.
• Shared JavaScript files exist and do not produce console errors.
• Images and videos load correctly, with fallbacks where appropriate.
• Pages include unique titles, descriptions and canonical URLs.
• Mobile navigation, keyboard interaction and reduced-motion preferences work correctly.
• Country-specific information is reviewed for accuracy.

Maintenance Checklist

When adding or updating a destination:

☐ Add or update its HTML page.
☐ Add links from index.html and more-countries.html.
☐ Add the destination to relevant navigation or search data if the project uses them.
☐ Confirm all image and script paths.
☐ Verify current official admission, recognition, visa and cost information.
☐ Test desktop and mobile layouts.
☐ Check internal links and browser-console errors.
☐ Update the page’s SEO metadata and review date.

────────

Section: Education → Study Abroad
Suggested URL base: /education/study-abroad/
Brand: MedOrbits

This README documents the intended structure and maintenance guidance. It does not imply that every listed HTML page or asset has already been created.
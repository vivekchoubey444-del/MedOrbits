MedOrbits — Education Resources

This directory contains the education resource pages for the MedOrbits website. It brings together information and guidance on education costs, scholarships, accommodation, study planning, brochures, student loans and common questions.

Directory Structure

resources/
├── README.md
├── index.html
├── fees.html
├── scholarships.html
├── hostels.html
├── guides.html
├── brochures.html
├── student-loans.html
└── faqs.html

Page Guide

|File                |Purpose                                                                                                                                               |
|———————|——————————————————————————————————————————————————|
|`index.html`        |Main resources landing page. Introduces the resource library and links to the pages in this directory.                                                |
|`fees.html`         |Education fee information and cost-planning guidance. Where applicable, help visitors identify tuition and other expenses to verify with institutions.|
|`scholarships.html` |Scholarship and financial-aid information, including eligibility, application requirements and deadlines to check with providers.                     |
|`hostels.html`      |Student accommodation and hostel information, including facilities, location, costs and rules to confirm before booking.                              |
|`guides.html`       |Study-planning and education guidance articles, checklists and practical reference material.                                                          |
|`brochures.html`    |Brochure and downloadable-resource library. Link only to files that have actually been added to the project.                                          |
|`student-loans.html`|Student-loan and education-financing information, including lender requirements, interest, repayment and eligibility considerations.                  |
|`faqs.html`         |Frequently asked questions about education resources, fees, funding, accommodation and study planning.                                                |

Recommended Page Responsibilities

index.html

• Serve as the entry point for the resource library.
• Provide concise summaries and clear links to each resource page.
• Include a resource search or category navigation if supported by the site’s shared components.

fees.html

• Organize fee information by course, institution, location or cost type where relevant.
• Distinguish tuition from additional expenses such as accommodation, travel, deposits and examination charges.
• Display the source and review date for figures when available.

scholarships.html

• Explain scholarship categories and common application steps.
• Present eligibility, coverage, required documents and deadlines only when verified.
• Link applicants to the official scholarship provider for current terms.

hostels.html

• Help students compare accommodation options and practical facilities.
• Include rent, deposits, utilities, location, safety information and cancellation terms only when verified.
• Make clear whether a listing is informational or an actual available booking.

guides.html

• Organize guides by topic, course, study level or destination.
• Include publication or review dates for time-sensitive guidance.
• Link to official institutions or authorities for rules and requirements.

brochures.html

• List brochures with a title, short description, category, format and file link.
• Store project-owned brochure PDFs in a consistent directory, for example /assets/documents/brochures/.
• Do not show a download action for a file that does not exist.

student-loans.html

• Explain financing concepts in plain language.
• Identify key items to compare, including interest rates, fees, collateral or co-applicant requirements, moratorium terms and repayment conditions.
• Direct users to official lenders for current eligibility and product terms. Avoid promising loan approval.

faqs.html

• Group questions by topic and provide concise answers.
• Keep answers consistent with the related resource pages.
• Direct users to official sources for current fees, scholarship rules, lending terms and accommodation availability.

Shared Design and Integration

Follow the existing MedOrbits website design system when implementing these pages:

• Use the site’s established premium dark colour themes, typography, spacing, cards, buttons and responsive breakpoints.
• Keep navigation, logo, footer and common UI elements consistent with the pages that already exist.
• Reuse shared CSS and JavaScript where available instead of duplicating site-wide functionality.
• Use absolute site-root paths for shared assets and internal links where that matches the existing project, such as /assets/css/style.css and /assets/images/....
• Ensure every page has a descriptive <title>, meta description, a single clear <h1>, accessible labels and meaningful image alt text.
• Preserve mobile usability, keyboard navigation, visible focus states and reduced-motion preferences.

Suggested Shared Assets

assets/
├── css/
│   └── style.css
├── js/
│   ├── app.js
│   ├── navigation.js
│   └── search.js
├── images/
│   └── ...
└── documents/
    └── brochures/
        ├── medical-courses-guide.pdf
        ├── admission-checklist.pdf
        ├── study-abroad-guide.pdf
        └── career-planning-checklist.pdf

The asset names above are examples. Create only the files that are actually used by the pages.

Content Accuracy and Maintenance

• Treat fees, scholarships, hostel availability, loan terms, eligibility and deadlines as changeable information.
• Verify such details with the relevant institution, official authority, accommodation provider or lender before publishing.
• Record a source and last-reviewed date for time-sensitive information.
• Do not guarantee admission, scholarships, accommodation, loan approval or employment outcomes.
• Check internal links, downloadable files and mobile layouts before deployment.

Implementation Checklist

☐ All eight HTML pages exist and use the shared MedOrbits structure.
☐ The resource landing page links to every resource page.
☐ All internal links resolve to the intended pages.
☐ Every brochure download points to a real file.
☐ Fees, scholarships, accommodation and loan details are verified and dated.
☐ Search and filters, if present, work with keyboard and touch input.
☐ Pages are responsive and accessible.
☐ Page titles, descriptions and canonical URLs are correct.
☐ Shared navigation and footer links are tested.
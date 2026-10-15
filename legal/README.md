Legal & Policies — MedOrbits

Overview

The legal/ directory contains the public-facing legal, privacy, payment, service, and accessibility information for the MedOrbits website and its education and career services. These pages should clearly explain applicable policies, user choices, service limitations, and ways to contact the appropriate team.

Important: This README is an implementation guide, not legal advice and not a statement that any policy has been legally reviewed. Policy text must reflect MedOrbits’ actual operations, applicable jurisdictions, vendor relationships, and current legal obligations. Have qualified counsel review the final wording before publication.

Directory Structure

legal/
├── README.md
├── index.html
├── privacy-policy.html
├── terms.html
├── refund-policy.html
├── disclaimer.html
├── cookie-policy.html
├── accessibility-statement.html
├── data-deletion.html
├── consent-preferences.html
├── job-service-terms.html
├── employer-terms.html
├── payment-terms.html
└── grievance-redressal.html

Page Responsibilities

|File                          |Purpose                                                                                                                                                             |
|——————————|———————————————————————————————————————————————————————|
|`index.html`                  |Legal information hub with clear links to all policy and terms pages.                                                                                               |
|`privacy-policy.html`         |Explain personal data collected, purposes and lawful basis where applicable, sharing, retention, security, user rights, and contact routes.                         |
|`terms.html`                  |Set the general website terms, permitted use, intellectual-property rules, account responsibilities, limitations, and dispute provisions.                           |
|`refund-policy.html`          |Explain refund eligibility, exclusions, cancellation steps, timelines, and how refund requests are assessed. Ensure it matches the actual service and payment model.|
|`disclaimer.html`             |Clarify the scope and limits of educational, admission, career, recruitment, and informational content without making unsupported guarantees.                       |
|`cookie-policy.html`          |Describe cookies and similar technologies, their purposes, relevant categories, and how users can manage them.                                                      |
|`accessibility-statement.html`|State accessibility goals, known limitations if assessed, feedback channels, and the process for requesting assistance or accommodations.                           |
|`data-deletion.html`          |Explain how users can request deletion of eligible personal data, identity-verification steps, exceptions, and what happens after a request.                        |
|`consent-preferences.html`    |Provide controls and explanations for optional cookies or consent-based processing where applicable, including how to update or withdraw choices.                   |
|`job-service-terms.html`      |Define terms for job seekers using career support, job listings, resume assistance, internships, or related services.                                               |
|`employer-terms.html`         |Define employer account rules, job-posting requirements, candidate-data responsibilities, prohibited listings, and account enforcement.                             |
|`payment-terms.html`          |Explain accepted payment methods, billing, subscriptions where applicable, failed payments, cancellations, receipts, taxes where applicable, and payment disputes.  |
|`grievance-redressal.html`    |Publish the approved complaint and escalation process, response expectations, and verified grievance contact details.                                               |

Navigation and Page Structure

• Provide a prominent link to legal/index.html from the site footer.
• Include a consistent legal navigation list on every legal page so visitors can move between policies.
• Show the page title, last-updated date, and an appropriate contact or escalation route.
• Use meaningful headings, short sections, accessible links, and a readable content width.
• Link related policies contextually, such as payment terms from refund policy and privacy policy from data-deletion and consent pages.
• Keep the navigation and page structure consistent with the main MedOrbits design system.

Design Guidelines

• Reuse the website’s shared CSS and JavaScript where practical.
• Maintain the established premium visual style, with deep tinted backgrounds, high-contrast text, and restrained metallic accents; do not use plain white page sections if that conflicts with the site design system.
• Use a calm, content-first layout. Legal pages should prioritize legibility and navigation over decorative animation.
• Make the pages responsive and usable on mobile, tablet, and desktop.
• Use semantic HTML, a logical heading hierarchy, visible keyboard focus, and descriptive link text.
• Respect prefers-reduced-motion and avoid interaction patterns that obstruct access to policy text.

Accuracy and Governance

• Keep policies aligned with actual business practices, data flows, service providers, retention schedules, refund rules, subscription billing, and support processes.
• Do not invent a registered business address, legal entity name, grievance officer, email address, phone number, response deadline, certification, or compliance claim. Add only details that have been verified and approved.
• Use accurate effective and revision dates. Do not display a “last updated” date that does not reflect a real review.
• Explain distinctions between general educational information and decisions made by institutions, regulators, employers, immigration authorities, payment providers, or other third parties.
• Avoid promising admission, employment, visas, scholarships, refunds, or outcomes unless the precise commitment is authorized, accurate, and reflected in the applicable service agreement.
• Make any exclusions, limitations, and cancellation rules conspicuous and consistent across related pages.
• Ensure privacy, cookie, consent, and data-deletion wording matches the technologies and processes actually used by the website.

Privacy, Consent, and Data Requests

• Collect only information needed for a stated purpose and protect it using appropriate technical and organizational controls.
• Describe third-party processors and sharing practices accurately.
• Define how identity and authority are verified before fulfilling access, correction, deletion, or other data requests.
• Explain that some records may need to be retained where required or permitted by applicable law, contract, security, accounting, or dispute-resolution needs; state only exceptions that genuinely apply.
• Ensure consent controls accurately reflect the available choices and do not imply that optional tracking is disabled if it remains active.
• Provide an operational process for routing, tracking, responding to, and documenting data requests and grievances.

Recommended Implementation Order

1. index.html — legal policy hub and navigation.
2. privacy-policy.html, terms.html, and disclaimer.html.
3. payment-terms.html and refund-policy.html.
4. cookie-policy.html, consent-preferences.html, and data-deletion.html.
5. job-service-terms.html and employer-terms.html.
6. accessibility-statement.html and grievance-redressal.html.
7. Review cross-links, dates, contact details, and consistency across every page.

Testing Checklist

☐ Every listed page exists and loads successfully.
☐ All policy links and footer links point to the correct locations.
☐ Pages work on mobile, tablet, and desktop.
☐ Keyboard users can navigate all links and controls.
☐ Headings, document titles, and language metadata are meaningful.
☐ Last-updated and effective dates are accurate.
☐ Privacy, cookie, consent, and deletion pages reflect the actual implementation.
☐ Refund and payment terms match the live checkout and service arrangements.
☐ Grievance contact details have been verified and are monitored.
☐ No placeholder legal contacts, fabricated compliance claims, or unsupported guarantees remain.
☐ Qualified legal review is completed before publishing policy commitments.

Maintenance

Assign an owner to review these pages whenever the business model, services, payment flow, subscription rules, data collection, analytics, third-party providers, or applicable requirements change. Record approved revisions and keep related pages synchronized.

This README describes the intended scope of the legal pages. It does not confirm that any specific policy, consent mechanism, deletion workflow, grievance process, or compliance control has already been implemented.
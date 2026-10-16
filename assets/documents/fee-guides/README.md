# MedOrbits Fee Guides

**Package:** MedOrbits Fee Guides  
**Directory:** `assets/documents/fee-guides/`  
**Authoritative manifest:** `assets/documents/fee-guides/MANIFEST.json`  
**Manifest schema:** `assets/schemas/fee-guides.schema.json`  
**Application catalogue:** `assets/data/fee-guides.json`  
**Maintained by:** MedOrbits  
**Brand:** Royal Burgundy and Champagne Gold  
**Classification:** Public frontend assets  
**Documentation version:** 2.0.0

## 1. Purpose

This collection provides general educational guidance for students, applicants, graduates, and families planning education expenses. Topics include tuition, institutional charges, accommodation, scholarships, financial aid, education loans, counselling charges, and refund or cancellation terms.

These resources are planning aids. They are not official fee notifications and do not guarantee admission, fee amounts, scholarships, loan approval, or refunds.

## 2. Source of truth

`MANIFEST.json` is the authoritative package manifest. `assets/data/fee-guides.json` is the application-facing catalogue and should be generated from the manifest by a deterministic build or validation script. Do not maintain two independent copies manually.

The package schema is stored at `assets/schemas/fee-guides.schema.json`. From the package manifest, its relative reference is `../../schemas/fee-guides.schema.json`.

## 3. Resource inventory

| Resource | Filename |
|—|—|
| Education Fee Guide | `education-fee-guide.pdf` |
| College Fee Guide | `college-fee-guide.pdf` |
| University Fee Guide | `university-fee-guide.pdf` |
| MBBS Fee Guide | `mbbs-fee-guide.pdf` |
| BDS Fee Guide | `bds-fee-guide.pdf` |
| AYUSH Fee Guide | `ayush-fee-guide.pdf` |
| Nursing Fee Guide | `nursing-fee-guide.pdf` |
| Pharmacy Fee Guide | `pharmacy-fee-guide.pdf` |
| Paramedical Fee Guide | `paramedical-fee-guide.pdf` |
| Engineering Fee Guide | `engineering-fee-guide.pdf` |
| Management Fee Guide | `management-fee-guide.pdf` |
| Law Fee Guide | `law-fee-guide.pdf` |
| Postgraduate Fee Guide | `postgraduate-fee-guide.pdf` |
| Hostel and Accommodation Fee Guide | `hostel-and-accommodation-fee-guide.pdf` |
| Scholarship and Financial Aid Guide | `scholarship-and-financial-aid-guide.pdf` |
| Education Loan Guide | `education-loan-guide.pdf` |
| Admission and Counselling Fees Guide | `admission-and-counselling-fees-guide.pdf` |
| Refund and Cancellation Fee Guide | `refund-and-cancellation-fee-guide.pdf` |

The manifest registers 18 resources. Entries currently marked `planned` are not evidence that the corresponding PDF files exist.

## 4. Publication lifecycle

Allowed statuses are `planned`, `draft`, `in_review`, `verified`, `published`, `under_review`, `outdated`, `archived`, and `withdrawn`.

- `planned`: intended resource; file may not exist.
- `draft`: content is being prepared.
- `in_review`: awaiting editorial or subject-matter review.
- `verified`: checks have been recorded, but publication approval is still required.
- `published`: approved and available for public download.
- `under_review`: temporarily requires reassessment.
- `outdated`: information may be superseded; do not promote as current.
- `archived`: retained for historical reference and not publicly promoted.
- `withdrawn`: removed from distribution.

Only `published` resources may be offered as downloads, and only after the deployed file is confirmed to exist and pass required checks. `featured: true` does not override publication status.

## 5. Fee accuracy and verification

Fees vary by institution, campus, programme, academic year, intake, admission category, residency status, quota, and applicable regulations.

Before publication:

1. Check the latest official fee schedule, prospectus, or written notification.
2. Consult the relevant regulator or counselling authority when applicable.
3. Separate tuition, admission charges, deposits, accommodation, and other expenses.
4. Record the academic year, currency, and payment period where relevant.
5. Record official source URLs and verification dates.
6. Distinguish official charges from estimates and historical figures.
7. Confirm refundability and conditions in the applicable written policy.
8. Do not invent fees, deadlines, refund terms, or source URLs.

A source URL alone does not prove verification. Mark information verified only after the relevant source has actually been reviewed.

## 6. Financial safety

- Confirm payment instructions using independently obtained official contact details.
- Use verified institutional or provider payment channels.
- Obtain official receipts and retain transaction records securely.
- Review written refund and cancellation terms before paying.
- Verify education agents and their authorization directly with the institution.
- Do not send money to personal accounts solely at an agent’s request.
- Never disclose passwords, one-time passwords, card security codes, or banking credentials.
- Verify loan interest, fees, repayment terms, collateral, and co-borrower obligations with the lender.

MedOrbits must not claim that an institution, agent, lender, scholarship, or payment channel has been verified unless the relevant checks have actually been completed.

## 7. Recommended cost breakdown

Where applicable, explain the following separately:

- Tuition and recurring academic charges.
- Admission, application, registration, and enrolment charges.
- Refundable and non-refundable deposits.
- Examination, laboratory, library, and student-service charges.
- Hostel or rental costs, utilities, and food.
- Transport, books, equipment, insurance, and other living expenses.
- Scholarships, grants, sponsorships, and education loans.
- Payment deadlines and accepted official payment methods.
- Refund, cancellation, deduction, and appeal procedures.

Clearly distinguish one-time, annual, semester, monthly, optional, estimated, and officially published amounts. Do not combine amounts with different payment periods without explaining the calculation.

## 8. Privacy and security

This directory is for approved public resources only. Never publish personal financial records, completed applicant forms, identity documents, confidential student records, transaction receipts, passwords, API keys, or access tokens.

Inspect PDF metadata and embedded content. Validate file type from actual content, scan for malware, and verify PDF integrity before publication. Public asset paths must not be treated as access-controlled storage.

## 9. PDF quality assurance

Before changing a resource to `published`, confirm:

- The PDF exists at the configured path and is non-empty.
- The file is a valid PDF and within the configured size limit.
- The filename, title, manifest entry, and deployed path agree.
- The content has passed review and official-source verification where applicable.
- Time-sensitive claims have appropriate verification dates.
- Currency, academic year, fees, and payment periods are clear.
- Refund, loan, and scholarship terms have been checked.
- Metadata, links, tables, typography, and print layout are reviewed.
- Accessibility and readable-text checks have been completed.
- Embedded files, comments, hidden content, and malware have been inspected.
- A SHA-256 checksum is calculated from the final published file.
- The deployed download URL works.
- The manifest and generated catalogue are synchronized.

Schema validation does not prove that a PDF exists, is accurate, is accessible, or has been scanned. These are separate checks.

## 10. Website integration

Example download link (use only after the file is approved and deployed):

```html
<a href=“/assets/documents/fee-guides/education-fee-guide.pdf”>
  Download the Education Fee Guide (PDF)
</a>
```

The example assumes the website serves `assets/` from the root URL. Adjust the URL if production uses a different base path.

The application catalogue should be generated from `MANIFEST.json`. Filter the catalogue so that only resources with `status: “published”` and confirmed existing files receive active download links. Handle unavailable resources gracefully, and do not expose unpublished entries through public sitemaps.

Frontend filtering is not a security boundary. If uploads or approvals are dynamic, enforce authorization and publication rules on the server.

## 11. Related guides

Each `relatedDocumentIds` value must reference an existing document `id`. Automated checks should detect missing references, self-references, duplicate IDs, duplicate filenames, and category IDs not defined in the manifest.

## 12. Maintenance

Review time-sensitive information whenever official notices or policies change. Update review dates only after a review actually occurs. Keep the manifest, generated catalogue, README, and actual files synchronized. Preserve previous versions when needed for auditability, but do not promote outdated versions as current resources.

## 13. Disclaimer

These guides provide general educational and financial-planning information. They are not financial, legal, tax, or investment advice. They do not guarantee admission, scholarships, loan approval, fee amounts, or refunds. Confirm current costs and conditions with the relevant institution, counselling authority, scholarship provider, lender, or government authority before making financial commitments.

—

**Maintained by:** MedOrbits  
**Directory:** `assets/documents/fee-guides/`  
**Authoritative manifest:** `assets/documents/fee-guides/MANIFEST.json`  
**Application catalogue:** `assets/data/fee-guides.json`

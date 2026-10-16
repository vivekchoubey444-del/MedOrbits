
# MedOrbits Document Templates

**Directory:** `src/templates/documents/`

## 1. Purpose

This directory contains standalone HTML templates for generating printable documents across the MedOrbits platform, including application summaries, payment receipts, counselling summaries, resumes, and document checklists.

Templates follow the MedOrbits visual identity: Deep Plum, Royal Plum, Burgundy Plum, Champagne Gold, and Soft Lavender.

Documents use self-contained layouts focused on document content rather than the main website interface. They must not depend on website navigation, application dashboards, or shared website headers and footers.

A generated document is not automatically a legally valid document, proof of payment, official admission confirmation, or verified credential. Its validity depends on the underlying records, applicable requirements, and authorized issuance process.

## 2. Directory Structure

```text
src/templates/documents/
├── README.md
├── application-summary.html
├── payment-receipt.html
├── counselling-summary.html
├── resume.html
└── document-checklist.html
```

This is the intended structure. Verify that each file exists in the repository before treating the inventory as complete.

## 3. Template Responsibilities

| Template | Purpose |
|—|—|
| `application-summary.html` | Presents a structured summary of an education or career application. |
| `payment-receipt.html` | Formats payment information obtained from authoritative transaction records. |
| `counselling-summary.html` | Presents counselling details, recommendations, and next steps. |
| `resume.html` | Formats candidate-provided professional and educational information. |
| `document-checklist.html` | Lists required, received, missing, or pending documents. |

Templates are presentation resources. They must not independently establish payment completion, application approval, admission status, eligibility, or credential authenticity.

The existence of a template does not establish that its rendering, PDF conversion, storage, or delivery workflow has been implemented.

## 4. Design Standards

### 4.1 Brand Palette

Use the shared MedOrbits design palette consistently.

| Color | Hex | Intended use |
|—|—|—|
| Deep Plum | `#100a17` | Primary backgrounds and dark surfaces. |
| Royal Plum | `#191023` | Main content surfaces. |
| Burgundy Plum | `#21172b` | Secondary surfaces and panels. |
| Champagne Gold | `#c9a96e` | Accents, borders, and emphasis. |
| Light Champagne | `#e4d0a1` | Headings and selected highlights. |
| Soft Lavender | `#d9cce4` | Supporting text and accents. |
| Muted Text | `#b7acbf` | Secondary text where contrast permits. |
| Primary Text | `#f7f1fa` | Main text on dark surfaces. |

These colors are design tokens, not a guarantee of accessibility. Verify contrast for every text and background combination.

### 4.2 Layout Requirements

- Use standalone document layouts without main-site navigation or website footers.
- Keep document branding inside the document itself where appropriate.
- Maintain a clear hierarchy of headings, labels, tables, and content.
- Use readable typography, sufficient spacing, and adequate contrast.
- Support responsive previews and print-friendly layouts.
- Handle long text, missing optional fields, and multi-page content.
- Prevent tables, signatures, totals, and key labels from splitting awkwardly across pages where feasible.
- Avoid decorative elements that interfere with document readability.
- Use print styles that produce predictable output on A4 paper unless another format is required.
- Respect `prefers-reduced-motion` when templates include animation.
- Avoid unnecessary external fonts, images, scripts, and network dependencies in production rendering.
- Test the rendered output in the actual browser or PDF renderer.

### 4.3 Self-Contained Documents

Templates must not require the website’s interactive interface to remain usable.

Document-specific branding, including an approved MedOrbits logo, may appear inside the document. Such assets must use verified paths and must be available to the rendering environment.

Do not add website navigation, dashboard controls, or unrelated promotional content to printable documents.

## 5. Template Data and Rendering

### 5.1 Rendering Contract

The `{{variable}}` syntax used by the HTML templates is a placeholder convention, not a rendering engine.

Use the template engine and rendering functions actually implemented in the project. Confirm whether the engine supports automatic escaping, conditional sections, loops, and missing-value handling before relying on those features.

Recommended rendering workflow:

1. The authorized controller receives a document-generation request.
2. The appropriate service identifies the required template.
3. Authoritative records are retrieved through the relevant repository or service.
4. The requester’s identity, permissions, and access to the records are verified.
5. Required fields and business rules are validated.
6. A minimal presentation object is prepared.
7. The configured template engine renders the HTML.
8. The document-generation service returns the HTML or passes it to the configured PDF renderer.
9. Generated files are stored or delivered through an authorized workflow, where implemented.
10. Access controls, audit requirements, and retention policies are applied.

This workflow describes the intended architecture; it does not confirm that these components currently exist.

### 5.2 Data Validation

Validate input before rendering, including:

- Required fields and identifier formats.
- Amounts, currency codes, and financial precision.
- Dates, timestamps, and timezone assumptions.
- Status values against approved enumerations.
- Optional fields and maximum text lengths.
- URLs and permitted external destinations.
- Nested data structures and collection sizes.
- Document row counts and maximum output sizes.
- Any business rules required for the particular document type.

Use explicit schemas or existing project validators where available. Avoid silently converting invalid values into plausible-looking output.

Do not rely on template rendering to validate business rules or establish that source records are genuine.

### 5.3 Missing Values

Templates must handle optional values consistently.

- Omit optional sections when the rendering engine supports safe conditional sections.
- Use an appropriate neutral fallback when omission is not possible.
- Never display raw placeholder syntax to end users.
- Do not substitute fabricated names, dates, references, amounts, or statuses.
- Reject missing required fields before rendering.
- Avoid empty table rows and unexplained blank sections.

## 6. Security and Privacy

### 6.1 HTML Safety

- Escape untrusted values according to their output context.
- Use automatic escaping when supported by the selected template engine.
- Never concatenate untrusted input into raw HTML.
- Do not permit arbitrary user-supplied HTML or executable JavaScript.
- Validate URLs and restrict permitted destinations.
- Avoid executable scripts and unnecessary external resources.
- Treat HTML attributes, URLs, CSS, and JavaScript contexts as distinct escaping contexts.
- Use sanitization only when rich HTML is explicitly required and an appropriate allowlist policy exists.

HTML escaping alone does not make arbitrary HTML safe for a browser-based PDF renderer.

### 6.2 Data Integrity

- Use authoritative application, counselling, and transaction records.
- Never trust client-supplied payment status, totals, tax amounts, or transaction references.
- Verify record ownership and permissions before generating a document.
- Prevent unauthorized users from requesting documents using another user’s identifier.
- Apply server-side business rules before presenting approval or completion statuses.
- Avoid exposing unnecessary personal, educational, or financial information.
- Ensure generated document references cannot be used to bypass authorization.

### 6.3 File Protection

- Store private generated documents outside publicly served directories.
- Enforce authorization on every document retrieval.
- Use unpredictable storage identifiers where appropriate.
- Keep storage paths and internal filesystem details private.
- Apply documented retention, deletion, and audit requirements.
- Avoid logging complete documents or sensitive field values.
- Clean up temporary files after successful and failed generation attempts.
- Do not expose private documents through unrestricted static-file hosting.

## 7. Template-Specific Requirements

### 7.1 Application Summary

- Obtain application status and reference details from authoritative application records.
- Clearly distinguish submitted, pending, approved, rejected, and other supported statuses.
- Do not imply admission or approval unless the underlying authorized record confirms it.
- Avoid including unnecessary identity or document details.

### 7.2 Payment Receipt

- Obtain payment information from the trusted transaction or payment service.
- Confirm the transaction state before representing a payment as completed.
- Calculate totals using decimal-safe financial arithmetic.
- Use a valid currency code and consistent formatting.
- Include applicable tax or business details only when verified.
- Do not label the receipt as a tax invoice unless the applicable requirements are satisfied.

### 7.3 Counselling Summary

- Present counselling details and recommendations accurately.
- Distinguish adviser recommendations from confirmed institutional requirements.
- Avoid guarantees about admission, employment, scholarships, eligibility, or outcomes.
- Limit disclosure of sensitive student information.

### 7.4 Resume

- Preserve candidate-provided facts without inventing qualifications or experience.
- Escape all candidate-provided text.
- Validate profile URLs before rendering them as clickable links.
- Avoid unnecessary sensitive personal information.
- Keep sections readable when professional history or skills span multiple pages.

### 7.5 Document Checklist

- Distinguish required, optional, received, pending, and rejected documents using approved values.
- Base document requirements on the relevant application route or authoritative source.
- Do not imply that a checklist guarantees acceptance or completeness.
- Restrict access to document names and notes when they reveal sensitive information.

## 8. PDF Conversion

PDF conversion must use a dedicated, controlled document-generation service.

For production:

- Run the renderer in a sandbox with restricted operating-system permissions.
- Do not accept arbitrary user HTML or scripts as trusted rendering input.
- Disable unnecessary network access, including outbound requests to internal services.
- Prevent access to cloud metadata endpoints, local secrets, and application files.
- Restrict filesystem access to explicitly permitted temporary directories.
- Enforce CPU, memory, execution-time, page-count, and output-size limits.
- Validate generated output and clean up temporary files.
- Pin and maintain the rendering engine and its dependencies.
- Handle renderer crashes, timeouts, and malformed documents without leaking internal errors.
- Ensure that the renderer cannot access unauthorized application data through local files or network requests.

A browser-based PDF renderer can introduce server-side request forgery and other risks if it can access arbitrary URLs or internal resources. Apply network and operating-system restrictions in addition to input validation and HTML escaping.

## 9. Integration Boundaries

| Module | Responsibility |
|—|—|
| `src/services/` | Coordinates document workflows and prepares validated data. |
| `src/repositories/` | Retrieves authoritative application and transaction records. |
| `src/controllers/` | Handles authorized document-generation requests and standardized responses. |
| `src/workers/` | Processes queued document-generation tasks, where implemented. |
| `src/integrations/storage/` | Stores and retrieves generated files through the configured storage adapter. |
| `src/templates/documents/` | Defines document presentation and layout. |

Keep document templates independent of database queries, authorization logic, payment-provider operations, filesystem management, and storage-specific implementation details.

Templates should receive prepared presentation data rather than querying application services directly.

## 10. Testing Checklist

### Template and Rendering Tests

- [ ] Every documented template exists.
- [ ] Each template renders using the configured template engine.
- [ ] Required template variables are validated.
- [ ] Missing optional fields render safely.
- [ ] Unknown or malformed values are handled appropriately.
- [ ] Untrusted values are escaped correctly.
- [ ] Invalid amounts, dates, and identifiers are rejected.
- [ ] Long text, tables, and multi-page layouts are handled correctly.
- [ ] Print styles are checked in the actual rendering environment.
- [ ] Contrast and document readability are reviewed.
- [ ] Generated HTML does not expose unresolved placeholders.

### Business and Security Tests

- [ ] Payment receipts use authoritative transaction records.
- [ ] Financial totals and currency formatting are verified.
- [ ] Application and counselling statuses come from authorized records.
- [ ] Unauthorized document-generation requests are rejected.
- [ ] Unauthorized document retrieval is rejected.
- [ ] Cross-user identifier manipulation does not disclose private documents.
- [ ] URL and renderer network restrictions are tested.
- [ ] Generated files follow retention and deletion policies.
- [ ] PDF rendering is sandboxed and resource-limited.
- [ ] Temporary files are cleaned up after success and failure.
- [ ] Sensitive data is not written to application logs.

Use synthetic data in automated tests. Do not use real applicant documents, personal identifiers, or payment details in fixtures or test logs.

## 11. Implementation Status

This README documents the intended template organization, visual standards, architecture, and security requirements.

Before treating any capability as implemented, verify the actual:

- Template files and rendering engine.
- Document-generation service.
- Data validation and authorization paths.
- PDF renderer and sandbox configuration.
- Storage adapter and retrieval controls.
- Retention, deletion, and audit mechanisms.
- Automated tests and deployment configuration.

Do not infer implementation status from the existence of HTML templates or this documentation.

—

**MedOrbits — Study · Work · Grow**

Standalone printable documents designed for consistent presentation, data integrity, privacy, and controlled access.

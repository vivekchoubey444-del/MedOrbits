MedOrbits Career Module

Royal Purple & Antique Gold career, recruitment, and employer-services section for MedOrbits.

Files

• index.html — career hub
• jobs.html — job directory
• job-details.html — job detail template
• job-categories.html — job category directory
• internships.html — internship directory
• internship-details.html — internship detail template
• register.html — candidate registration
• employer-services.html — employer services
• employer-login.html — employer login interface
• employer-register.html — employer registration interface
• employer-dashboard.html — employer dashboard template
• post-job.html — job submission form
• manage-jobs.html — employer job management template
• applicants.html — applicant management template
• recruitment.html — recruitment services
• guidance.html — career guidance resources
• resume-support.html — resume guidance
• resume-builder.html — resume information form
• interview-preparation.html — interview preparation resources

Design and shared structure

These pages reuse the existing MedOrbits homepage’s head styles, opening animation, announcement strip, logo, navigation, footer, and shared JavaScript references. The career module adds only page-specific content and supplemental styles. The palette stays in the Royal Purple/Aubergine and Antique Gold family.

Asset paths

The pages refer to shared assets already used by the site, including:

• /assets/images/logo/medorbits-logo.png
• /assets/images/hero/hero-home.jpg
• /assets/images/backgrounds/education-global.jpg
• /assets/images/placeholders/image-placeholder.svg
• /assets/css/style.css
• /assets/js/constants.js
• /assets/js/config.js
• /assets/js/utils.js
• /assets/js/navigation.js
• /assets/js/search.js
• /assets/js/animations.js
• /assets/js/app.js

Keep these assets available at the root of the deployed website. Relative-to-domain paths starting with /assets/ are intentional.

Backend integration required

Forms currently point to illustrative endpoints such as /api/career/register, /api/employer/login, /api/employer/register, /api/employer/jobs, and /api/career/resume. Implement and test these endpoints before production use. Use HTTPS, server-side validation, CSRF protections where applicable, rate limiting, secure password hashing, session security, authorization checks, privacy notices, and audit logs for employer actions and applicant data.

The job and internship listings, employer dashboard, job management, and applicant tables include placeholder content/states. Connect them to verified records through authenticated APIs before displaying real listings or personal information. Never rely on front-end checks alone to authorize access.

Install

Copy this folder to the website root as /career/. All internal links assume that path.
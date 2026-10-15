MedOrbits Icons

This directory contains the icon assets used across the MedOrbits website. Keep icons organized by feature area so they can be reused consistently across pages without changing the site’s existing layout, opening animation, header, footer, or colour theme.

Directory structure

icons/
├── README.md
├── education/
├── career/
└── social/

Folder guidelines

education/

Store icons used for education and admissions interfaces, such as:

• Courses and subjects
• Colleges and universities
• Admissions and counselling
• Entrance examinations
• Fees and scholarships
• Documents and study destinations

Suggested filenames:

• course-medical.svg
• course-dental.svg
• course-nursing.svg
• college.svg
• university.svg
• admissions.svg
• scholarship.svg
• documents.svg
• study-abroad.svg

career/

Store icons for job seekers, employers and recruitment features, such as:

• Jobs and internships
• Career guidance
• Resume and profile tools
• Recruitment and employer services
• Skills and professional development

Suggested filenames:

• jobs.svg
• internship.svg
• resume.svg
• career-guidance.svg
• recruitment.svg
• employer.svg
• skills.svg

social/

Store icons used for social networks and community links.

Suggested filenames:

• instagram.svg
• facebook.svg
• linkedin.svg
• youtube.svg
• whatsapp.svg
• x.svg
• share.svg

Use official brand assets and follow each platform’s current brand guidelines when displaying social logos.

File conventions

• Prefer SVG for simple, scalable interface icons.
• Use PNG or WebP only when a raster image is necessary.
• Use lowercase, descriptive, hyphen-separated filenames.
• Avoid spaces, duplicate names and unclear labels such as icon1.svg.
• Keep icons visually consistent in stroke weight, proportions and alignment.
• Use transparent backgrounds unless an icon specifically requires a background.
• Do not recolour official social-brand marks in ways that violate their brand guidelines.
• Optimize SVGs and raster assets before deployment.

Accessibility

• Decorative icons should be hidden from assistive technology when the adjacent text already communicates the same meaning.
• Meaningful icons must have an accessible name or visible text label.
• Do not use an icon alone for an important action when the meaning could be unclear.
• Ensure adequate contrast against the page background and preserve keyboard focus indicators for interactive controls.

Referencing icons

Example for an SVG image:

<img src=“/assets/icons/education/course-medical.svg”
     alt=“”
     aria-hidden=“true”
     width=“24”
     height=“24”>

Example for a social link:

<a href=“https://www.instagram.com/“
   aria-label=“Visit MedOrbits on Instagram”>
  <img src=“/assets/icons/social/instagram.svg”
       alt=“”
       aria-hidden=“true”
       width=“22”
       height=“22”>
</a>

Replace example URLs with the official MedOrbits profile URLs before publishing. The example icon filenames are naming suggestions; add the corresponding files before referencing them in production.

Maintenance checklist

☐ Place each icon in the correct feature folder.
☐ Confirm every referenced file exists and loads successfully.
☐ Verify icon sizing and contrast on desktop and mobile.
☐ Test accessibility labels and keyboard interaction.
☐ Check social icon links and brand usage before release.
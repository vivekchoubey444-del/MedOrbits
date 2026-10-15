MedOrbits Images Directory

This directory contains the visual assets used across the MedOrbits website. Keep image paths consistent with the existing HTML and CSS so the site’s layout, opening animation, header, footer, and page styling remain unchanged.

Directory Structure

assets/images/
├── README.md
├── logo/
├── hero/
├── courses/
├── destinations/
├── education/
├── colleges/
├── career/
├── jobs/
├── team/
├── backgrounds/
└── placeholders/

Folder Guide

|Folder         |Purpose                                                                                                      |Example filenames                                            |
|—————|-————————————————————————————————————|-————————————————————|
|`logo/`        |Main brand logo, compact logo, and favicon source images.                                                    |`medorbits-logo.png`, `medorbits-mark.svg`                   |
|`hero/`        |Hero and feature imagery used near the top of pages.                                                         |`hero-home.jpg`, `hero-education.jpg`                        |
|`courses/`     |Course-category images for medical, dental, nursing, pharmacy, engineering, management, and other programmes.|`mbbs.jpg`, `bds.jpg`, `nursing.jpg`, `engineering.jpg`      |
|`destinations/`|Study-abroad country and destination imagery.                                                                |`russia.jpg`, `georgia.jpg`, `kazakhstan.jpg`, `study-uk.jpg`|
|`education/`   |General education, learning, student-life, and admissions imagery.                                           |`admissions-guidance.jpg`, `student-learning.jpg`            |
|`colleges/`    |College, university, campus, and institution images.                                                         |`campus-placeholder.jpg`, `university-building.jpg`          |
|`career/`      |Career guidance, resume support, internships, recruitment, and professional development imagery.             |`career-guidance.jpg`, `internships.jpg`, `recruitment.jpg`  |
|`jobs/`        |Job search, vacancies, workplace, and employment-category imagery.                                           |`jobs.jpg`, `workplace.jpg`                                  |
|`team/`        |Approved team portraits and staff photographs.                                                               |`team-member-01.jpg`, `team-group.jpg`                       |
|`backgrounds/` |Decorative page backgrounds and section textures.                                                            |`education-global.jpg`, `subtle-pattern.webp`                |
|`placeholders/`|Fallback graphics for missing or unavailable images.                                                         |`image-placeholder.svg`, `avatar-placeholder.svg`            |

Example filenames are recommendations, not confirmation that those files already exist. Use the exact filenames referenced by your HTML, CSS, or JavaScript.

Existing Image Paths Used by Pages

The current MedOrbits pages reference paths including:

/assets/images/logo/medorbits-logo.png
/assets/images/hero/hero-home.jpg
/assets/images/courses/mbbs.jpg
/assets/images/courses/bds.jpg
/assets/images/courses/ayush.jpg
/assets/images/courses/nursing.jpg
/assets/images/courses/pharmacy.jpg
/assets/images/courses/paramedical.jpg
/assets/images/courses/engineering.jpg
/assets/images/courses/management.jpg
/assets/images/destinations/russia.jpg
/assets/images/destinations/georgia.jpg
/assets/images/destinations/kazakhstan.jpg
/assets/images/destinations/study-uk.jpg
/assets/images/career/career-guidance.jpg
/assets/images/career/internships.jpg
/assets/images/career/recruitment.jpg
/assets/images/jobs/jobs.jpg
/assets/images/backgrounds/education-global.jpg
/assets/images/placeholders/image-placeholder.svg

Keep these paths unchanged unless you also update every relevant HTML, CSS, or JavaScript reference.

Image Guidelines

• Brand consistency: Use approved MedOrbits brand assets. Preserve the logo’s aspect ratio and transparent background where supplied.
• Recommended formats: Use SVG for suitable logos and simple icons; WebP or AVIF for optimized photographs; PNG when transparency is required; JPEG when an existing page specifically references .jpg.
• Responsive quality: Provide appropriately sized images for the displayed component. Avoid unnecessarily large originals.
• Aspect ratios: Use landscape images for hero panels and cards unless the design calls for another crop. Check how object-fit: cover crops the subject.
• Accessibility: Give meaningful content images descriptive alt text. Use empty alt=“” for purely decorative images.
• Performance: Compress images, use loading=“lazy” for below-the-fold content, and reserve eager loading or fetchpriority=“high” for the primary above-the-fold image when appropriate.
• Privacy and consent: Publish team portraits or identifiable people only when you have the right to use them.
• Licensing: Use original, licensed, or otherwise authorized assets. Track attribution requirements when applicable.
• Security: Do not store confidential documents, identity documents, private student photos, credentials, or other sensitive data in this public asset directory.

Naming Convention

Use lowercase, descriptive, hyphen-separated filenames:

hero-home.jpg
medical-students.webp
study-abroad-georgia.webp
career-guidance.jpg
image-placeholder.svg

Avoid spaces, uppercase names, and vague filenames such as image1.jpg. Match filename extensions and letter casing exactly; production hosting environments may be case-sensitive.

Fallback Image

The homepage JavaScript may replace failed image requests with:

/assets/images/placeholders/image-placeholder.svg

Ensure this file exists and is a valid SVG. If you change the fallback path, update the corresponding JavaScript as well.

Adding or Replacing an Image

1. Place the image in the appropriate subfolder.
2. Use a descriptive, lowercase filename.
3. Update or verify the corresponding HTML src, CSS url(...), or JavaScript reference.
4. Check image dimensions, crop, contrast, and accessibility text.
5. Test the page on mobile and desktop.
6. Confirm the browser network panel reports no missing-image errors.

Important

This README documents the image asset structure; it does not create the image files themselves. The website’s opening animation, header, footer, navigation, and overall design should remain unchanged when adding assets. Only change those elements if the corresponding design change is intentional.
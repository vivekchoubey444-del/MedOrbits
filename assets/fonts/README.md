MedOrbits Fonts

Brand: MedOrbits
Design System: Royal Burgundy and Champagne Gold
Package: Local Web Font Assets
Version: 1.1.0

1. Overview

The MedOrbits Fonts package provides locally hosted typography assets for the MedOrbits website and related web applications.

The typography system combines two complementary font families:

* DM Sans: Body text, navigation, forms, buttons, labels, dashboards and interface elements.
* Playfair Display: Editorial headings, premium display text, promotional banners and selected branding elements.

The fonts must integrate with the existing MedOrbits design system without changing its established colors, page layouts, opening animations, header, footer or responsive behavior.

2. Current Font Assets

Based on the current package directory, the available source assets are TrueType fonts (.ttf).

fonts/
├── DMSans-Regular.ttf
├── DMSans-Medium.ttf
├── DMSans-SemiBold.ttf
├── DMSans-Bold.ttf
├── PlayfairDisplay-Medium.ttf
├── PlayfairDisplay-SemiBold.ttf
└── PlayfairDisplay-Bold.ttf
download-fonts.sh
README.md

The filenames above preserve the naming convention shown in the existing directory. Confirm the actual directory structure before running scripts that expect these files inside a nested fonts/ directory.

3. Font Inventory

Font file	Family	Weight
DMSans-Regular.ttf	DM Sans	400
DMSans-Medium.ttf	DM Sans	500
DMSans-SemiBold.ttf	DM Sans	600
DMSans-Bold.ttf	DM Sans	700
PlayfairDisplay-Medium.ttf	Playfair Display	500
PlayfairDisplay-SemiBold.ttf	Playfair Display	600
PlayfairDisplay-Bold.ttf	Playfair Display	700

The listed weights are the intended mappings. Verify the font metadata before production deployment.

4. Requirements

The font download script requires:

* Bash
* curl
* Python 3
* Internet access

The application does not need an external font download during normal operation when the required assets are included in the deployment.

5. Installation and Asset Generation

Run the existing downloader from the directory containing download-fonts.sh:

bash download-fonts.sh

To make the script executable:

chmod +x download-fonts.sh
./download-fonts.sh

Important: The existing screenshot shows .ttf files. The earlier downloader was designed to create .woff2 files. Running it may create an additional set of files rather than replace the existing TTF assets.

The package should explicitly document whether TTF files are retained as source assets or converted to WOFF2 for web delivery.

6. Recommended Web Font Format

Use WOFF2 for production web delivery when compatible files are available. It is optimized for web use and generally provides smaller downloads than equivalent TTF files.

Recommended production assets:

fonts/
├── dm-sans-regular.woff2
├── dm-sans-medium.woff2
├── dm-sans-semibold.woff2
├── dm-sans-bold.woff2
├── playfair-display-medium.woff2
├── playfair-display-semibold.woff2
└── playfair-display-bold.woff2

Do not rename a .ttf file to .woff2. Convert the font using an appropriate font-conversion tool or obtain the WOFF2 resource from the upstream font distribution.

7. CSS Integration

Create or update fonts.css using the paths that match your actual repository.

The following example assumes the stylesheet is located at the repository root and the WOFF2 files are stored in fonts/.

/* DM Sans */
@font-face {
  font-family: “DM Sans”;
  src: url(“./fonts/dm-sans-regular.woff2”) format(“woff2”);
  font-weight: 400;
  font-style: normal;
  font-display: swap;
}
@font-face {
  font-family: “DM Sans”;
  src: url(“./fonts/dm-sans-medium.woff2”) format(“woff2”);
  font-weight: 500;
  font-style: normal;
  font-display: swap;
}
@font-face {
  font-family: “DM Sans”;
  src: url(“./fonts/dm-sans-semibold.woff2”) format(“woff2”);
  font-weight: 600;
  font-style: normal;
  font-display: swap;
}
@font-face {
  font-family: “DM Sans”;
  src: url(“./fonts/dm-sans-bold.woff2”) format(“woff2”);
  font-weight: 700;
  font-style: normal;
  font-display: swap;
}
/* Playfair Display */
@font-face {
  font-family: “Playfair Display”;
  src: url(“./fonts/playfair-display-medium.woff2”) format(“woff2”);
  font-weight: 500;
  font-style: normal;
  font-display: swap;
}
@font-face {
  font-family: “Playfair Display”;
  src: url(“./fonts/playfair-display-semibold.woff2”) format(“woff2”);
  font-weight: 600;
  font-style: normal;
  font-display: swap;
}
@font-face {
  font-family: “Playfair Display”;
  src: url(“./fonts/playfair-display-bold.woff2”) format(“woff2”);
  font-weight: 700;
  font-style: normal;
  font-display: swap;
}

If you are using the existing TTF assets directly, change the CSS URLs and format declarations to match the .ttf filenames and format(“truetype”).

Typography tokens

Merge these tokens into the existing MedOrbits CSS variables. Do not replace the current design system.

:root {
  —font-body: “DM Sans”, sans-serif;
  —font-heading: “Playfair Display”, serif;
}
body,
button,
input,
select,
textarea {
  font-family: var(—font-body);
}
h1,
h2,
h3,
.display-heading {
  font-family: var(—font-heading);
}

8. Brand Usage

DM Sans

Use for:

* Body copy and paragraphs
* Navigation and breadcrumbs
* Forms and input labels
* Buttons and calls to action
* Course listings and fee tables
* Dashboards and interface components

Playfair Display

Use for:

* Main page headings
* Editorial titles
* Selected premium promotional banners
* Admissions and study-abroad headings
* Emphasized display text

Maintain readable line heights, consistent typography and responsive text sizing across desktop, tablet and mobile.

9. Performance and Deployment

Before production deployment:

1. Confirm all seven font assets exist.
2. Validate the file format and internal font metadata.
3. Verify the intended weight of every file.
4. Check CSS paths and browser network requests.
5. Keep font assets local to the application.
6. Use font-display: swap.
7. Preload only fonts needed for initial page rendering.
8. Configure caching for static assets.
9. Include the font assets in the deployment package.
10. Preserve the existing MedOrbits design system and page behavior.

Avoid downloading fonts on every application startup.

10. Licensing and Attribution

DM Sans and Playfair Display are open-source font families distributed through Google Fonts.

For redistribution:

* Obtain the applicable upstream license for each font family.
* Retain the required copyright notices and license text.
* Record the source and version of each font.
* Verify the license terms before redistributing modified assets.

Recommended license directory:

LICENSES/
├── OFL-DM-Sans.txt
└── OFL-Playfair-Display.txt

Include these files only after obtaining and verifying the applicable license text.

11. Quality Assurance

* [ ]	All seven intended font assets are present.
* [ ]	File formats match their extensions.
* [ ]	Font metadata matches the intended family and weight.
* [ ]	Required character sets render correctly.
* [ ]	CSS paths resolve successfully.
* [ ]	Fonts load without browser console errors.
* [ ]	Body text uses DM Sans.
* [ ]	Headings use Playfair Display.
* [ ]	Mobile and desktop layouts remain readable.
* [ ]	Existing colors, layouts, animations, header and footer remain unchanged.
* [ ]	License files are included and verified.
* [ ]	Production assets are version-controlled.

12. Troubleshooting

Fonts do not load: Check the CSS paths, filename casing and browser network errors.

Fonts appear too bold or too light: Verify the internal font weight and CSS weight declaration.

Characters are missing: Check the font’s supported character set and Unicode coverage.

Downloads fail: Check network connectivity, Google Fonts responses and proxy restrictions.

Duplicate font files appear: Check whether the download script writes to a different directory or produces a different format than the existing assets.

13. Maintenance

Update the README, CSS declarations and font inventory whenever assets change.

Test the affected pages after each update to confirm that typography, responsive layouts and existing branding remain intact.

⸻

MedOrbits Fonts
Royal Burgundy and Champagne Gold Design System
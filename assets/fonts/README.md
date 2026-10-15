MedOrbits Fonts

This directory is reserved for locally hosted font files used by the MedOrbits website.

Purpose

Use this folder when the project needs self-hosted typography instead of loading fonts from an external provider. Keeping font files organized here makes typography easier to manage and helps the website maintain a consistent visual identity.

Suggested structure

fonts/
├── README.md
├── dm-sans-regular.woff2
├── dm-sans-medium.woff2
├── dm-sans-semibold.woff2
├── dm-sans-bold.woff2
├── playfair-display-medium.woff2
├── playfair-display-semibold.woff2
└── playfair-display-bold.woff2

The filenames above are examples only. Add files only when you have the corresponding font files and the appropriate licence to use them.

Usage

Reference a font file from the site’s CSS using a path relative to the CSS file. For example, if your stylesheet is /assets/css/style.css and fonts are stored in /assets/fonts/:

@font-face {
  font-family: “DM Sans”;
  src: url(“../fonts/dm-sans-regular.woff2”) format(“woff2”);
  font-style: normal;
  font-weight: 400;
  font-display: swap;
}

@font-face {
  font-family: “Playfair Display”;
  src: url(“../fonts/playfair-display-medium.woff2”) format(“woff2”);
  font-style: normal;
  font-weight: 500;
  font-display: swap;
}

Then use the families in your existing CSS:

body {
  font-family: “DM Sans”, sans-serif;
}

h1,
h2,
h3 {
  font-family: “Playfair Display”, Georgia, serif;
}

Best practices

• Prefer modern .woff2 font files for web delivery.
• Include only the weights and styles actually used by the website.
• Use font-display: swap to keep text visible while fonts load.
• Confirm font licences permit web embedding and redistribution.
• Avoid unnecessary duplicate font files or oversized font families.
• If fonts are served locally, update CSS references and remove external font imports only after checking all pages that depend on them.
• Keep a system-font fallback in every font stack.

Compatibility with the current design

MedOrbits pages use a premium visual style with DM Sans for body text and Playfair Display for headings. This README documents the optional local-font setup only; it does not change any HTML, CSS, opening animation, header, footer, or navigation.

Important

This folder currently contains documentation only. It does not include actual font binaries. Download font files from a legitimate source and verify the licence before adding them.
'use strict';

const path = require('node:path');
const sharp = require('sharp');

const root = path.resolve(__dirname, '..');
const source = path.join(root, 'assets/images/education/medical-education.webp');
const output = path.join(root, 'assets/images/education/mbbs.jpg');

sharp(source)
  .resize(1200, 675, { fit: 'cover', position: 'attention' })
  .jpeg({ quality: 88, mozjpeg: true })
  .toFile(output)
  .then((result) => {
    console.log(`Created assets/images/education/mbbs.jpg (${result.width}x${result.height})`);
  })
  .catch((error) => {
    console.error(`[mbbs-image] ${error.message}`);
    process.exitCode = 1;
  });

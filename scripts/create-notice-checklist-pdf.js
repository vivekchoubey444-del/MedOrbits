'use strict';

const fs = require('node:fs/promises');
const path = require('node:path');
const { PDFDocument, StandardFonts, rgb } = require('pdf-lib');

const ROOT = path.resolve(__dirname, '..');
const OUTPUT = path.join(
  ROOT,
  'assets/documents/checklists/general/official-notice-verification-checklist.pdf',
);
const LOGO = path.join(ROOT, 'assets/images/logo/medorbits-logo.png');

function color(hex) {
  const value = hex.replace('#', '');
  return rgb(
    Number.parseInt(value.slice(0, 2), 16) / 255,
    Number.parseInt(value.slice(2, 4), 16) / 255,
    Number.parseInt(value.slice(4, 6), 16) / 255,
  );
}

function wrap(text, font, size, maxWidth) {
  const lines = [];
  let line = '';
  for (const word of text.split(/\s+/)) {
    const candidate = line ? `${line} ${word}` : word;
    if (line && font.widthOfTextAtSize(candidate, size) > maxWidth) {
      lines.push(line);
      line = word;
    } else {
      line = candidate;
    }
  }
  if (line) lines.push(line);
  return lines;
}

async function main() {
  const pdf = await PDFDocument.create();
  const page = pdf.addPage([612, 792]);
  const regular = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const logo = await pdf.embedPng(await fs.readFile(LOGO));
  const burgundy = color('#711F36');
  const gold = color('#C9A96E');
  const pale = color('#F6F0E6');
  const ink = color('#342D2D');
  const muted = color('#6F6663');

  page.drawRectangle({ x: 0, y: 0, width: 612, height: 792, color: rgb(1, 1, 1) });
  page.drawRectangle({ x: 0, y: 774, width: 612, height: 18, color: burgundy });
  page.drawImage(logo, { x: 48, y: 680, width: 64, height: 64 });
  page.drawText('MEDORBITS', { x: 126, y: 716, size: 19, font: bold, color: burgundy });
  page.drawText('STUDY  |  CAREER  |  CONSULTANCY', { x: 127, y: 698, size: 8, font: regular, color: muted });
  page.drawRectangle({ x: 48, y: 630, width: 516, height: 34, color: pale });
  page.drawText('PUBLIC INFORMATION CHECKLIST', { x: 61, y: 642, size: 9, font: bold, color: burgundy });
  page.drawText('Verify an official notice', { x: 48, y: 590, size: 25, font: bold, color: burgundy });
  page.drawText('A practical check before acting on an admission, exam, result, or policy update.', {
    x: 48,
    y: 570,
    size: 10,
    font: regular,
    color: muted,
  });

  const items = [
    'Open the issuing authority or institution website directly. Do not rely only on forwarded screenshots or social posts.',
    'Check the issuing organization, notice number, publication date, and the course, exam, intake, or group it applies to.',
    'Look for a newer correction, extension, withdrawal, or superseding notice on the same official channel.',
    'Confirm dates, time zone, eligibility, required documents, and next steps against the original notice.',
    'Use only the official portal for applications and payments. Keep copies of the notice and payment receipts.',
    'If any detail conflicts, pause and ask the issuing authority using contact details from its official website.',
  ];
  let y = 526;
  for (const [index, item] of items.entries()) {
    page.drawRectangle({
      x: 50,
      y: y - 2,
      width: 15,
      height: 15,
      borderColor: gold,
      borderWidth: 1.2,
    });
    page.drawText(String(index + 1).padStart(2, '0'), {
      x: 78,
      y,
      size: 9,
      font: bold,
      color: burgundy,
    });
    const lines = wrap(item, regular, 10, 450);
    lines.forEach((line, lineIndex) => {
      page.drawText(line, {
        x: 104,
        y: y - lineIndex * 14,
        size: 10,
        font: regular,
        color: ink,
      });
    });
    y -= Math.max(48, lines.length * 14 + 26);
  }

  page.drawRectangle({ x: 48, y: 78, width: 516, height: 76, color: pale });
  page.drawText('Need help finding the right source?', { x: 61, y: 135, size: 10, font: bold, color: burgundy });
  page.drawText('Use the official issuer contact details shown on its own website.', {
    x: 61,
    y: 118,
    size: 9,
    font: regular,
    color: ink,
  });
  page.drawText('support@medorbits.in  |  +91 62058 89064  |  +91 76449 87052', {
    x: 61,
    y: 100,
    size: 8,
    font: regular,
    color: muted,
  });
  page.drawText('WhatsApp: wa.me/916205889064  |  wa.me/917644987052', {
    x: 61,
    y: 86,
    size: 8,
    font: regular,
    color: muted,
  });
  page.drawRectangle({ x: 48, y: 58, width: 516, height: 2, color: gold });
  page.drawText('General information only. This checklist is not an official notice or a substitute for issuer instructions.', {
    x: 48,
    y: 40,
    size: 7,
    font: regular,
    color: muted,
  });

  pdf.setAuthor('MedOrbits');
  pdf.setTitle('Official Notice Verification Checklist');
  pdf.setSubject('General checklist for checking education and career notices');
  pdf.setKeywords([
    'MedOrbits',
    'MedOrbits-Branded-Cover-v1',
    'notice verification',
    'checklist',
    'education',
    'career',
  ]);

  await fs.mkdir(path.dirname(OUTPUT), { recursive: true });
  await fs.writeFile(OUTPUT, await pdf.save({ useObjectStreams: false }));
  console.log(`Created ${path.relative(ROOT, OUTPUT)}`);
}

main().catch((error) => {
  console.error(`[notice-checklist] ${error.message}`);
  process.exitCode = 1;
});

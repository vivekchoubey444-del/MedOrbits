'use strict';

const fs = require('node:fs/promises');
const path = require('node:path');
const { PDFDocument, StandardFonts, rgb } = require('pdf-lib');

const ROOT = path.resolve(__dirname, '..');
const PDF_ROOT = path.join(ROOT, 'assets/documents');
const LOGO_PATH = path.join(ROOT, 'assets/images/logo/medorbits-logo.png');
const BACKUP_ROOT = path.join(ROOT, 'storage/temporary/pdf-brand-backups');
const TEMP_ROOT = path.join(ROOT, 'storage/temporary/pdf-brand-output');
const BRAND_MARKER = 'MedOrbits-Branded-Cover-v1';
const CONTACT_LINES = [
  'support@medorbits.in',
  '+91 62058 89064  |  +91 76449 87052',
  'WhatsApp: wa.me/916205889064  |  wa.me/917644987052',
];

const PALETTES = {
  checklists: { primary: '#711F36', secondary: '#C9A96E', pale: '#F6F0E6' },
  'admission-guides': { primary: '#64233A', secondary: '#D5A85D', pale: '#F8F1E7' },
  'fee-guides': { primary: '#155B58', secondary: '#D8B86A', pale: '#EDF5F0' },
  'study-abroad': { primary: '#244F70', secondary: '#76B7C4', pale: '#EDF4F7' },
  'career-resources': { primary: '#315A42', secondary: '#C19A62', pale: '#F0F4ED' },
};

function color(hex) {
  const value = hex.replace('#', '');
  return rgb(
    Number.parseInt(value.slice(0, 2), 16) / 255,
    Number.parseInt(value.slice(2, 4), 16) / 255,
    Number.parseInt(value.slice(4, 6), 16) / 255,
  );
}

function titleFromFilename(filename) {
  return path.basename(filename, '.pdf')
    .split('-')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function categoryForFile(filename) {
  const relative = path.relative(PDF_ROOT, filename).split(path.sep);
  return relative[0];
}

async function listPdfs(directory) {
  const entries = await fs.readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const filename = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await listPdfs(filename));
    else if (entry.isFile() && filename.toLowerCase().endsWith('.pdf')) files.push(filename);
  }
  return files.sort();
}

function wrapText(text, font, size, maxWidth) {
  const words = text.split(/\s+/);
  const lines = [];
  let line = '';
  for (const word of words) {
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

function coverDescription(category) {
  const descriptions = {
    checklists: 'A practical planning resource from MedOrbits. Use it to organize your next steps and confirm requirements with the relevant institution or authority.',
    'admission-guides': 'An informational guide to support admission planning. Confirm current eligibility, documents, dates, and procedures with official sources.',
    'fee-guides': 'A financial planning resource. Confirm current fees, payment schedules, refund terms, and funding conditions directly with the institution.',
    'study-abroad': 'A planning guide for international study. Verify admission, immigration, insurance, and travel requirements with official sources.',
    'career-resources': 'A career planning resource from MedOrbits. Tailor guidance to your experience and confirm role-specific requirements with employers.',
  };
  return descriptions[category] || 'An informational planning resource from MedOrbits. Independently confirm all current details with the relevant official source.';
}

async function brandPdf(filename) {
  const original = await fs.readFile(filename);
  const pdf = await PDFDocument.load(original, { updateMetadata: false });
  const keywords = pdf.getKeywords() || [];
  if (keywords.includes(BRAND_MARKER)) return { status: 'already-branded' };

  const category = categoryForFile(filename);
  const palette = PALETTES[category] || PALETTES.checklists;
  const regular = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const logo = await pdf.embedPng(await fs.readFile(LOGO_PATH));
  const page = pdf.insertPage(0, [595.28, 841.89]);
  const width = page.getWidth();
  const height = page.getHeight();
  const primary = color(palette.primary);
  const secondary = color(palette.secondary);
  const pale = color(palette.pale);

  page.drawRectangle({ x: 0, y: 0, width, height, color: rgb(1, 1, 1) });
  page.drawRectangle({ x: 0, y: height - 18, width, height: 18, color: primary });
  page.drawRectangle({ x: 44, y: 56, width: width - 88, height: 2, color: secondary });
  page.drawImage(logo, { x: 48, y: height - 143, width: 76, height: 76 });
  page.drawText('MEDORBITS', {
    x: 142,
    y: height - 104,
    size: 20,
    font: bold,
    color: primary,
  });
  page.drawText('STUDY  |  CAREER  |  CONSULTANCY', {
    x: 143,
    y: height - 124,
    size: 8,
    font: regular,
    color: color('#655A54'),
  });

  const categoryLabel = category.replace(/-/g, ' ').toUpperCase();
  page.drawRectangle({ x: 48, y: height - 226, width: width - 96, height: 34, color: pale });
  page.drawText(categoryLabel, {
    x: 62,
    y: height - 214,
    size: 9,
    font: bold,
    color: primary,
  });

  const title = pdf.getTitle() || titleFromFilename(filename);
  const titleLines = wrapText(title, bold, 27, width - 112);
  let titleY = height - 286;
  for (const line of titleLines.slice(0, 3)) {
    page.drawText(line, { x: 50, y: titleY, size: 27, font: bold, color: primary });
    titleY -= 36;
  }

  page.drawRectangle({ x: 50, y: titleY - 8, width: 62, height: 3, color: secondary });
  const descriptionLines = wrapText(coverDescription(category), regular, 12, width - 112);
  let descriptionY = titleY - 42;
  for (const line of descriptionLines.slice(0, 5)) {
    page.drawText(line, { x: 50, y: descriptionY, size: 12, font: regular, color: color('#403A3A') });
    descriptionY -= 19;
  }

  page.drawRectangle({ x: 48, y: 95, width: width - 96, height: 94, color: pale });
  page.drawText('MEDORBITS RESOURCE', { x: 62, y: 167, size: 8, font: bold, color: primary });
  page.drawText('Keep this guide with your planning notes.', { x: 62, y: 148, size: 10, font: regular, color: color('#403A3A') });
  CONTACT_LINES.forEach((line, index) => {
    page.drawText(line, { x: 62, y: 129 - index * 13, size: 8, font: regular, color: color('#403A3A') });
  });
  page.drawText('Informational use only. Verify time-sensitive information with official sources.', {
    x: 50,
    y: 70,
    size: 8,
    font: regular,
    color: color('#655A54'),
  });

  pdf.setAuthor('MedOrbits');
  pdf.setTitle(title);
  pdf.setSubject(pdf.getSubject() || 'MedOrbits informational planning resource');
  pdf.setKeywords([...new Set([...keywords, BRAND_MARKER, category])]);

  const relativePath = path.relative(PDF_ROOT, filename);
  const backup = path.join(BACKUP_ROOT, relativePath);
  const temporary = path.join(TEMP_ROOT, relativePath);
  await fs.mkdir(path.dirname(backup), { recursive: true });
  await fs.mkdir(path.dirname(temporary), { recursive: true });

  try {
    await fs.access(backup);
  } catch {
    await fs.copyFile(filename, backup);
  }

  const brandedBytes = await pdf.save({ useObjectStreams: false });
  await fs.writeFile(temporary, brandedBytes);
  await PDFDocument.load(await fs.readFile(temporary), { updateMetadata: false });
  await fs.rename(temporary, filename);
  return { status: 'branded', pages: pdf.getPageCount(), backup };
}

async function preflightPdfs(files) {
  const errors = [];
  let alreadyBranded = 0;

  for (const filename of files) {
    try {
      const pdf = await PDFDocument.load(await fs.readFile(filename), {
        updateMetadata: false,
      });
      if ((pdf.getKeywords() || []).includes(BRAND_MARKER)) {
        alreadyBranded += 1;
      }
    } catch (error) {
      errors.push(`${path.relative(PDF_ROOT, filename)}: ${error.message}`);
    }
  }

  return { errors, alreadyBranded };
}

async function main() {
  const write = process.argv.includes('--write');
  const limitArgument = process.argv.indexOf('--limit');
  const limit = limitArgument >= 0 ? Number(process.argv[limitArgument + 1]) : Infinity;
  if (limitArgument >= 0 && (!Number.isSafeInteger(limit) || limit < 1)) {
    throw new Error('--limit must be a positive integer.');
  }

  const files = (await listPdfs(PDF_ROOT)).slice(0, limit);
  const preflight = await preflightPdfs(files);
  if (preflight.errors.length) {
    for (const error of preflight.errors) console.error(`Unreadable PDF: ${error}`);
    throw new Error('Preflight failed; no PDFs were changed.');
  }

  if (!write) {
    console.log(`Preflight passed: ${files.length} PDF(s), ${preflight.alreadyBranded} already branded. No files changed.`);
    console.log('Use --write to add a branded cover page; originals are backed up under storage/temporary/pdf-brand-backups/.');
    return;
  }

  const results = [];
  for (const filename of files) {
    const result = await brandPdf(filename);
    results.push(result);
    console.log(`${result.status}: ${path.relative(PDF_ROOT, filename)}`);
  }
  console.log(`Completed: ${results.filter((item) => item.status === 'branded').length} branded; ${results.filter((item) => item.status === 'already-branded').length} already branded.`);
}

main().catch((error) => {
  console.error(`[brand-pdfs] ${error.message}`);
  process.exitCode = 1;
});

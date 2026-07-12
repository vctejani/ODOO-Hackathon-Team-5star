import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import PDFDocument from 'pdfkit';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const LOGO_PATH = path.resolve(__dirname, '../../../frontend/public/favicon.png');

export const BRAND_BLUE = '#1d4ed8';
export const BRAND_DARK = '#0f172a';
export const ACCENT = '#64748b';
export const MARGIN = 50;
export const PAGE_WIDTH = 595.28;
export const PAGE_HEIGHT = 841.89;
export const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2;
export const FOOTER_Y = PAGE_HEIGHT - 45;
export const BOTTOM_LIMIT = FOOTER_Y - 15;

export const ROLE_LABELS = {
  FLEET_MANAGER: 'Fleet Manager',
  DRIVER: 'Driver',
  SAFETY_OFFICER: 'Safety Officer',
  FINANCIAL_ANALYST: 'Financial Analyst',
};

export const fmt = (n) => `$${(n || 0).toFixed(2)}`;
export const fmtDate = (d) => (d ? new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : '-');
export const fmtDateTime = (d) => (d ? new Date(d).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' }) : '-');
export const fmtStatus = (s) => s?.replace(/_/g, ' ') || '-';

export function resetTextStyle(doc, color = BRAND_DARK, size = 10, font = 'Helvetica') {
  doc.fillColor(color).strokeColor(color).fontSize(size).font(font);
}

export function ensureSpace(doc, needed = 60) {
  if (doc.y + needed > BOTTOM_LIMIT) {
    doc.addPage();
    resetTextStyle(doc);
  }
}

export function drawPageFooter(doc, pageNum, totalPages) {
  resetTextStyle(doc, ACCENT, 8);
  doc.moveTo(MARGIN, FOOTER_Y - 8).lineTo(PAGE_WIDTH - MARGIN, FOOTER_Y - 8).strokeColor('#cbd5e1').stroke();
  doc.text('TransitOps — Smart Transport Operations Platform', MARGIN, FOOTER_Y, {
    width: CONTENT_WIDTH / 2,
    lineBreak: false,
  });
  doc.text(`Page ${pageNum} of ${totalPages}`, MARGIN + CONTENT_WIDTH / 2, FOOTER_Y, {
    width: CONTENT_WIDTH / 2,
    align: 'right',
    lineBreak: false,
  });
}

export function drawReportHeader(doc, { reportId = 'FR-FLEET' } = {}) {
  doc.save();
  doc.fillColor(BRAND_BLUE).rect(0, 0, PAGE_WIDTH, 100).fill();
  doc.restore();

  if (fs.existsSync(LOGO_PATH)) {
    doc.image(LOGO_PATH, MARGIN, 18, { width: 64, height: 64 });
  }

  resetTextStyle(doc, '#ffffff', 26, 'Helvetica-Bold');
  doc.text('TransitOps', MARGIN + 78, 28, { lineBreak: false });
  resetTextStyle(doc, '#ffffff', 11, 'Helvetica');
  doc.text('Smart Transport Operations Platform', MARGIN + 78, 58, { lineBreak: false });
  resetTextStyle(doc, '#ffffff', 9, 'Helvetica');
  doc.text(`Report ID: ${reportId}`, MARGIN, 78, { width: CONTENT_WIDTH, align: 'right', lineBreak: false });

  doc.y = 115;
  resetTextStyle(doc);
}

export function drawSectionTitle(doc, title) {
  ensureSpace(doc, 36);
  const y = doc.y;

  doc.save();
  doc.fillColor('#eff6ff').rect(MARGIN, y, CONTENT_WIDTH, 22).fill();
  doc.restore();

  resetTextStyle(doc, BRAND_BLUE, 11, 'Helvetica-Bold');
  doc.text(title.toUpperCase(), MARGIN + 10, y + 6, { width: CONTENT_WIDTH - 20, lineBreak: false });
  doc.y = y + 30;
  resetTextStyle(doc);
}

export function drawMetricsGrid(doc, metrics) {
  ensureSpace(doc, 50);
  const startY = doc.y;
  const colWidth = CONTENT_WIDTH / 3;

  metrics.forEach((m, i) => {
    const col = i % 3;
    const row = Math.floor(i / 3);
    const x = MARGIN + col * colWidth;
    const y = startY + row * 40;

    resetTextStyle(doc, ACCENT, 8);
    doc.text(m.label, x, y, { width: colWidth - 10, lineBreak: false });
    resetTextStyle(doc, BRAND_DARK, 11, 'Helvetica-Bold');
    doc.text(m.value, x, y + 13, { width: colWidth - 10, lineBreak: false });
  });

  doc.y = startY + Math.ceil(metrics.length / 3) * 40 + 6;
  resetTextStyle(doc);
}

export function drawKeyValueRows(doc, rows) {
  rows.forEach(([label, value]) => {
    ensureSpace(doc, 16);
    const y = doc.y;

    resetTextStyle(doc, ACCENT, 9);
    doc.text(label, MARGIN, y, { width: 170, lineBreak: false });
    resetTextStyle(doc, BRAND_DARK, 9, 'Helvetica-Bold');
    doc.text(String(value), MARGIN + 175, y, { width: CONTENT_WIDTH - 175, lineBreak: false });

    doc.y = y + 14;
  });
  doc.y += 4;
  resetTextStyle(doc);
}

export function drawBulletList(doc, items) {
  items.forEach((line) => {
    ensureSpace(doc, 24);
    resetTextStyle(doc, BRAND_DARK, 9);
    doc.text(`- ${line}`, MARGIN, doc.y, { width: CONTENT_WIDTH });
    doc.y += doc.heightOfString(`- ${line}`, { width: CONTENT_WIDTH }) + 4;
  });
}

export function drawTable(doc, columns, rows) {
  const drawTableHeader = (y) => {
    doc.save();
    doc.fillColor(BRAND_DARK).rect(MARGIN, y, CONTENT_WIDTH, 18).fill();
    doc.restore();

    let x = MARGIN + 4;
    columns.forEach((col) => {
      resetTextStyle(doc, '#ffffff', 7, 'Helvetica-Bold');
      doc.text(col.label, x, y + 5, { width: col.width, lineBreak: false });
      x += col.width;
    });
  };

  if (!rows.length) {
    ensureSpace(doc, 20);
    resetTextStyle(doc, ACCENT, 9);
    doc.text('No records found.', MARGIN, doc.y);
    doc.y += 16;
    return;
  }

  ensureSpace(doc, 40);
  let y = doc.y;
  drawTableHeader(y);
  doc.y = y + 22;

  rows.forEach((row, idx) => {
    ensureSpace(doc, 20);
    y = doc.y;

    if (idx % 2 === 0) {
      doc.save();
      doc.fillColor('#f8fafc').rect(MARGIN, y, CONTENT_WIDTH, 16).fill();
      doc.restore();
    }

    let x = MARGIN + 4;
    row.forEach((cell, ci) => {
      resetTextStyle(doc, BRAND_DARK, 7);
      doc.text(String(cell ?? '-'), x, y + 4, { width: columns[ci].width, lineBreak: false });
      x += columns[ci].width;
    });

    doc.y = y + 18;
  });

  doc.y += 6;
  resetTextStyle(doc);
}

export function createPdfDocument() {
  const doc = new PDFDocument({ margin: MARGIN, size: 'A4', bufferPages: true, autoFirstPage: true });
  const chunks = [];
  doc.on('data', (c) => chunks.push(c));
  return {
    doc,
    toBuffer: () => new Promise((resolve, reject) => {
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);
    }),
  };
}

export function finalizePdf(doc, toBuffer) {
  const { start, count } = doc.bufferedPageRange();
  for (let i = 0; i < count; i += 1) {
    doc.switchToPage(start + i);
    drawPageFooter(doc, i + 1, count);
  }
  doc.end();
  return toBuffer();
}

export function drawReportTitle(doc, title, subtitle) {
  resetTextStyle(doc, BRAND_DARK, 16, 'Helvetica-Bold');
  doc.text(title, MARGIN, doc.y);
  doc.y += 20;
  if (subtitle) {
    resetTextStyle(doc, ACCENT, 10);
    doc.text(subtitle, MARGIN, doc.y);
    doc.y += 14;
  }
  resetTextStyle(doc, ACCENT, 9);
  doc.text(`Generated on ${new Date().toLocaleString('en-US')}`, MARGIN, doc.y);
  doc.y += 24;
}

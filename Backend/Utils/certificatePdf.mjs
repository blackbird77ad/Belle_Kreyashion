const PAGE_WIDTH = 841.89;
const PAGE_HEIGHT = 595.28;

const escapePdfText = (value = '') => String(value)
  .replace(/\\/g, '\\\\')
  .replace(/\(/g, '\\(')
  .replace(/\)/g, '\\)')
  .replace(/\r/g, '')
  .replace(/\n/g, ' ');

const formatDate = (value) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' });
};

const sanitizeColor = (value, fallback) => {
  const normalized = String(value || '').trim();
  return /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(normalized) ? normalized : fallback;
};

const hexToRgb = (hex) => {
  const normalized = String(hex || '').replace('#', '');
  const full = normalized.length === 3
    ? normalized.split('').map((char) => char + char).join('')
    : normalized;
  const value = Number.parseInt(full, 16);
  return {
    r: ((value >> 16) & 255) / 255,
    g: ((value >> 8) & 255) / 255,
    b: (value & 255) / 255,
  };
};

const toRgb = (hex, fallback) => {
  const { r, g, b } = hexToRgb(sanitizeColor(hex, fallback));
  return `${r.toFixed(3)} ${g.toFixed(3)} ${b.toFixed(3)}`;
};

const fontBaseNames = (fontFamily = 'classic_serif') => (
  ['classic_serif', 'formal_serif'].includes(fontFamily)
    ? { regular: 'Times-Roman', bold: 'Times-Bold' }
    : { regular: 'Helvetica', bold: 'Helvetica-Bold' }
);

const normalizeTextBody = ({ body, productName }) => {
  const trimmed = String(body || '').trim();
  if (trimmed) return trimmed;
  if (productName) return `For successfully completing ${productName} and meeting the requirements of the programme.`;
  return 'In recognition of outstanding participation and achievement';
};

const estimateTextWidth = (text = '', fontSize = 12) => {
  const value = String(text || '');
  let units = 0;
  for (const char of value) {
    if (char === ' ') units += 0.28;
    else if (/[MW@#%&QG]/.test(char)) units += 0.9;
    else if (/[A-Z0-9]/.test(char)) units += 0.66;
    else if (/[mw]/.test(char)) units += 0.78;
    else if (/[iltI1',.:;]/.test(char)) units += 0.28;
    else if (/[-_()/]/.test(char)) units += 0.34;
    else units += 0.56;
  }
  return units * fontSize;
};

const wrapText = (text = '', maxWidth = 300, fontSize = 12) => {
  const paragraphs = String(text || '').split(/\r?\n/);
  const lines = [];

  for (const paragraph of paragraphs) {
    const trimmed = paragraph.trim();
    if (!trimmed) {
      lines.push('');
      continue;
    }

    const words = trimmed.split(/\s+/);
    let line = '';

    for (const word of words) {
      const next = line ? `${line} ${word}` : word;
      if (estimateTextWidth(next, fontSize) <= maxWidth || !line) {
        line = next;
        continue;
      }
      lines.push(line);
      line = word;
    }

    if (line) lines.push(line);
  }

  return lines;
};

const buildTextCommands = (lines, {
  x,
  y,
  font = 'F1',
  fontSize = 12,
  lineHeight = 15,
  color = '0 0 0',
}) => {
  const filtered = Array.isArray(lines) ? lines : [String(lines || '')];
  const commands = [
    'BT',
    `/${font} ${fontSize} Tf`,
    `${color} rg`,
    `${lineHeight} TL`,
    `1 0 0 1 ${x.toFixed(2)} ${y.toFixed(2)} Tm`,
  ];

  filtered.forEach((line, index) => {
    if (index > 0) commands.push('T*');
    commands.push(`(${escapePdfText(line)}) Tj`);
  });

  commands.push('ET');
  return commands.join('\n');
};

const buildRectangle = ({ x, y, width, height, fillColor = null, strokeColor = null, lineWidth = 1 }) => {
  const commands = ['q'];
  if (fillColor) commands.push(`${fillColor} rg`);
  if (strokeColor) commands.push(`${strokeColor} RG`);
  commands.push(`${lineWidth} w`);
  commands.push(`${x.toFixed(2)} ${y.toFixed(2)} ${width.toFixed(2)} ${height.toFixed(2)} re`);
  if (fillColor && strokeColor) commands.push('B');
  else if (fillColor) commands.push('f');
  else commands.push('S');
  commands.push('Q');
  return commands.join('\n');
};

const buildLine = ({ x1, y1, x2, y2, strokeColor, lineWidth = 1 }) => [
  'q',
  `${strokeColor} RG`,
  `${lineWidth} w`,
  `${x1.toFixed(2)} ${y1.toFixed(2)} m`,
  `${x2.toFixed(2)} ${y2.toFixed(2)} l`,
  'S',
  'Q',
].join('\n');

const buildPdf = (objects = []) => {
  let output = '%PDF-1.4\n%\xE2\xE3\xCF\xD3\n';
  const offsets = [0];

  objects.forEach((object, index) => {
    offsets.push(Buffer.byteLength(output, 'binary'));
    output += `${index + 1} 0 obj\n${object}\nendobj\n`;
  });

  const xrefOffset = Buffer.byteLength(output, 'binary');
  output += `xref\n0 ${objects.length + 1}\n`;
  output += '0000000000 65535 f \n';
  offsets.slice(1).forEach((offset) => {
    output += `${String(offset).padStart(10, '0')} 00000 n \n`;
  });
  output += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;

  return Buffer.from(output, 'binary');
};

export const buildCertificatePdf = (record, { brandName = 'BELLE KREYASHON' } = {}) => {
  const learnerName = String(record.learnerName || 'Learner').trim();
  const productName = String(record.productName || '').trim();
  const title = String(record.certificateTitle || 'Certificate of Completion').trim();
  const subtitle = String(record.certificateSubtitle || '').trim();
  const body = normalizeTextBody({
    body: record.certificateBody,
    productName,
  });
  const issueDate = formatDate(record.issueDate || record.generatedAt || new Date());
  const certificateNumber = String(record.certificateNumber || '').trim();
  const organizerName = String(record.organizerName || brandName).trim();
  const sponsors = Array.isArray(record.sponsors) ? record.sponsors.filter(Boolean) : [];
  const signatories = Array.isArray(record.signatories)
    ? record.signatories.filter((entry) => entry?.name || entry?.role).slice(0, 3)
    : [];
  const showOrganizerBlock = organizerName && organizerName.toLowerCase() !== String(brandName || '').trim().toLowerCase();

  const primaryColor = toRgb(record.primaryColor, '#111827');
  const accentColor = toRgb(record.accentColor, '#FDC700');
  const backgroundColor = toRgb(record.backgroundColor, '#FFFDF7');
  const fontColor = toRgb(record.fontColor, '#374151');
  const frameStyles = {
    classic: { borderWidth: 10, innerWidth: 1.5 },
    double: { borderWidth: 14, innerWidth: 2.5 },
    soft: { borderWidth: 8, innerWidth: 1.5 },
    minimal: { borderWidth: 6, innerWidth: 1 },
  };
  const frame = frameStyles[record.frameStyle] || frameStyles.classic;

  const fonts = fontBaseNames(record.fontFamily || 'classic_serif');
  const outer = { x: 24, y: 24, width: PAGE_WIDTH - 48, height: PAGE_HEIGHT - 48 };
  const inner = { x: 40, y: 40, width: PAGE_WIDTH - 80, height: PAGE_HEIGHT - 80 };
  const topY = PAGE_HEIGHT - 78;
  const brandWidth = 170;
  const leftX = 68;
  const bodyMaxWidth = 620;
  const sponsorText = sponsors.length ? `Sponsors: ${sponsors.join(', ')}` : '';

  const titleLines = wrapText(title.toUpperCase(), 620, 26);
  const subtitleLines = subtitle ? wrapText(subtitle.toUpperCase(), 320, 10) : [];
  const brandLines = wrapText(String(brandName || '').trim().toUpperCase(), 620, 11);
  const learnerLines = wrapText(learnerName, 620, 27);
  const bodyLines = wrapText(body, bodyMaxWidth, 15);
  const programmeLines = productName ? wrapText(productName, 620, 20) : [];
  const issueText = issueDate ? `Issued ${issueDate}` : '';
  const issueLines = issueText ? wrapText(issueText, 620, 12.5) : [];
  const numberLines = certificateNumber ? wrapText(certificateNumber, 150, 9.5) : [];

  const commands = [];
  commands.push(buildRectangle({
    x: 0,
    y: 0,
    width: PAGE_WIDTH,
    height: PAGE_HEIGHT,
    fillColor: '1 1 1',
  }));
  commands.push(buildRectangle({
    x: outer.x,
    y: outer.y,
    width: outer.width,
    height: outer.height,
    fillColor: backgroundColor,
    strokeColor: primaryColor,
    lineWidth: frame.borderWidth,
  }));
  commands.push(buildRectangle({
    x: inner.x,
    y: inner.y,
    width: inner.width,
    height: inner.height,
    strokeColor: primaryColor,
    lineWidth: frame.innerWidth,
  }));

  commands.push(buildTextCommands(['CERTIFICATE'], {
    x: leftX,
    y: topY,
    font: 'F2',
    fontSize: 9.5,
    lineHeight: 12,
    color: accentColor,
  }));
  commands.push(buildTextCommands(titleLines, {
    x: leftX,
    y: topY - 26,
    font: 'F2',
    fontSize: 28,
    lineHeight: 31,
    color: primaryColor,
  }));
  if (subtitleLines.length) {
    const subtitleY = topY - 26 - (titleLines.length * 31) - 4;
    commands.push(buildTextCommands(subtitleLines, {
      x: leftX,
      y: subtitleY,
      font: 'F2',
      fontSize: 10,
      lineHeight: 12,
      color: accentColor,
    }));
  }
  const brandY = subtitleLines.length
    ? topY - 26 - (titleLines.length * 31) - 4 - (subtitleLines.length * 12) - 14
    : topY - 26 - (titleLines.length * 31) - 18;
  commands.push(buildTextCommands(brandLines, {
    x: leftX,
    y: brandY,
    font: 'F2',
    fontSize: 11,
    lineHeight: 13,
    color: primaryColor,
  }));
  const contentTop = brandY - (brandLines.length * 13) - 26;

  commands.push(buildTextCommands(['Presented To'], {
    x: leftX,
    y: contentTop,
    font: 'F2',
    fontSize: 11,
    lineHeight: 13,
    color: '0.420 0.451 0.510',
  }));

  const learnerStartY = contentTop - 28;
  commands.push(buildTextCommands(learnerLines, {
    x: leftX,
    y: learnerStartY,
    font: 'F2',
    fontSize: 27,
    lineHeight: 31,
    color: primaryColor,
  }));

  const learnerBlockHeight = learnerLines.length * 31;
  const bodyStartY = learnerStartY - learnerBlockHeight - 14;
  commands.push(buildTextCommands(bodyLines, {
    x: leftX,
    y: bodyStartY,
    font: 'F1',
    fontSize: 15,
    lineHeight: 20,
    color: fontColor,
  }));

  if (programmeLines.length) {
    const programmeLabelY = bodyStartY - (bodyLines.length * 20) - 18;
    commands.push(buildTextCommands(['Programme'], {
      x: leftX,
      y: programmeLabelY,
      font: 'F2',
      fontSize: 10,
      lineHeight: 12,
      color: '0.420 0.451 0.510',
    }));
    commands.push(buildTextCommands(programmeLines, {
      x: leftX,
      y: programmeLabelY - 18,
      font: 'F2',
      fontSize: 20,
      lineHeight: 24,
      color: primaryColor,
    }));

    if (issueLines.length) {
      const issueStartY = programmeLabelY - 18 - (programmeLines.length * 24) - 24;
      commands.push(buildTextCommands(issueLines, {
        x: leftX,
        y: issueStartY,
        font: 'F2',
        fontSize: 12.5,
        lineHeight: 14,
        color: fontColor,
      }));
    }
  } else if (issueLines.length) {
    const issueStartY = bodyStartY - (bodyLines.length * 20) - 24;
    commands.push(buildTextCommands(issueLines, {
      x: leftX,
      y: issueStartY,
      font: 'F2',
      fontSize: 12.5,
      lineHeight: 14,
      color: fontColor,
    }));
  }

  const footerBaseY = 108;
  if (sponsorText) {
    const sponsorLines = wrapText(sponsorText, 360, 9.5);
    commands.push(buildTextCommands(sponsorLines, {
      x: leftX,
      y: footerBaseY + 30,
      font: 'F1',
      fontSize: 9.5,
      lineHeight: 11.5,
      color: '0.420 0.451 0.510',
    }));
  }

  if (showOrganizerBlock) {
    commands.push(buildTextCommands(['Issued By'], {
      x: leftX,
      y: footerBaseY + 8,
      font: 'F2',
      fontSize: 10,
      lineHeight: 12,
      color: '0.420 0.451 0.510',
    }));
    const organizerLines = wrapText(organizerName, 260, 15);
    commands.push(buildTextCommands(organizerLines, {
      x: leftX,
      y: footerBaseY - 10,
      font: 'F2',
      fontSize: 15,
      lineHeight: 18,
      color: primaryColor,
    }));
  }

  if (signatories.length) {
    const signWidth = 156;
    const signGap = 18;
    signatories.forEach((signatory, index) => {
      const x = 392 + (index * (signWidth + signGap));
      commands.push(buildLine({
        x1: x,
        y1: 116,
        x2: x + signWidth,
        y2: 116,
        strokeColor: primaryColor,
        lineWidth: 1.1,
      }));
      commands.push(buildTextCommands(wrapText(signatory.name || '', signWidth, 11.5), {
        x,
        y: 100,
        font: 'F2',
        fontSize: 11.5,
        lineHeight: 13,
        color: primaryColor,
      }));
      if (signatory.role) {
        commands.push(buildTextCommands(wrapText(signatory.role, signWidth, 9.5), {
          x,
          y: 84,
          font: 'F1',
          fontSize: 9.5,
          lineHeight: 11,
          color: '0.420 0.451 0.510',
        }));
      }
    });
  }

  if (numberLines.length) {
    commands.push(buildTextCommands(numberLines, {
      x: PAGE_WIDTH - 188,
      y: 78,
      font: 'F1',
      fontSize: 9.5,
      lineHeight: 11,
      color: '0.420 0.451 0.510',
    }));
  }

  const contentStream = commands.join('\n');
  const fontsRef = fontBaseNames(record.fontFamily || 'classic_serif');
  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Count 1 /Kids [3 0 R] >>',
    `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PAGE_WIDTH.toFixed(2)} ${PAGE_HEIGHT.toFixed(2)}] /Resources << /Font << /F1 4 0 R /F2 5 0 R >> >> /Contents 6 0 R >>`,
    `<< /Type /Font /Subtype /Type1 /BaseFont /${fontsRef.regular} >>`,
    `<< /Type /Font /Subtype /Type1 /BaseFont /${fontsRef.bold} >>`,
    `<< /Length ${Buffer.byteLength(contentStream, 'binary')} >>\nstream\n${contentStream}\nendstream`,
  ];

  return buildPdf(objects);
};

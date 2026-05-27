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
  width = 0,
  align = 'left',
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
  ];

  filtered.forEach((line, index) => {
    const lineWidth = estimateTextWidth(line, fontSize);
    let lineX = x;
    if (width > 0 && align === 'center') lineX = x + Math.max(0, (width - lineWidth) / 2);
    if (width > 0 && align === 'right') lineX = x + Math.max(0, width - lineWidth);
    const lineY = y - (index * lineHeight);
    commands.push(`1 0 0 1 ${lineX.toFixed(2)} ${lineY.toFixed(2)} Tm`);
    commands.push(`(${escapePdfText(line)}) Tj`);
  });

  commands.push('ET');
  return commands.join('\n');
};

const measureTextBlockHeight = (lines, fontSize = 12, lineHeight = 15) => {
  const entries = Array.isArray(lines) ? lines : [String(lines || '')];
  if (!entries.length) return 0;
  return fontSize + (Math.max(entries.length - 1, 0) * lineHeight);
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

  const outer = { x: 24, y: 24, width: PAGE_WIDTH - 48, height: PAGE_HEIGHT - 48 };
  const inner = { x: 40, y: 40, width: PAGE_WIDTH - 80, height: PAGE_HEIGHT - 80 };
  const contentBox = { x: inner.x + 60, width: inner.width - 120 };
  const titleMaxWidth = Math.min(contentBox.width, 660);
  const bodyMaxWidth = Math.min(contentBox.width, 580);
  const footerTextWidth = Math.min(contentBox.width, 520);
  const sponsorText = sponsors.length ? `Sponsors: ${sponsors.join(', ')}` : '';

  const titleLines = wrapText(title.toUpperCase(), titleMaxWidth, 26);
  const subtitleLines = subtitle ? wrapText(subtitle.toUpperCase(), Math.min(contentBox.width, 520), 10) : [];
  const brandLines = wrapText(String(brandName || '').trim().toUpperCase(), titleMaxWidth, 11);
  const learnerLines = wrapText(learnerName, bodyMaxWidth, 27);
  const bodyLines = wrapText(body, bodyMaxWidth, 15);
  const programmeLines = productName ? wrapText(productName, bodyMaxWidth, 20) : [];
  const issueText = issueDate ? `Issued ${issueDate}` : '';
  const issueLines = issueText ? wrapText(issueText, bodyMaxWidth, 12.5) : [];
  const numberLines = certificateNumber ? wrapText(certificateNumber, Math.min(contentBox.width, 320), 9.5) : [];

  const titleLineHeight = 32;
  const subtitleLineHeight = 13;
  const brandLineHeight = 14;
  const learnerLineHeight = 31;
  const bodyLineHeight = 21;
  const programmeLineHeight = 24;
  const issueLineHeight = 14;
  const labelLineHeight = 12;
  const sponsorLineHeight = 11.5;
  const organizerLineHeight = 18;

  let contentStackHeight = measureTextBlockHeight(['CERTIFICATE'], 9.5, 12) + 14;
  contentStackHeight += measureTextBlockHeight(titleLines, 28, titleLineHeight);
  contentStackHeight += subtitleLines.length
    ? 10 + measureTextBlockHeight(subtitleLines, 10, subtitleLineHeight)
    : 16;
  contentStackHeight += 16 + measureTextBlockHeight(brandLines, 11, brandLineHeight);
  contentStackHeight += 20 + measureTextBlockHeight(['Presented To'], 11, labelLineHeight);
  contentStackHeight += 14 + measureTextBlockHeight(learnerLines, 27, learnerLineHeight);
  contentStackHeight += measureTextBlockHeight(bodyLines, 15, bodyLineHeight);
  if (programmeLines.length) {
    contentStackHeight += 16 + measureTextBlockHeight(['Programme'], 10, labelLineHeight);
    contentStackHeight += 12 + measureTextBlockHeight(programmeLines, 20, programmeLineHeight);
  }
  if (issueLines.length) contentStackHeight += 18 + measureTextBlockHeight(issueLines, 12.5, issueLineHeight);

  const contentTopY = PAGE_HEIGHT - 88;
  const contentBottomY = 188;
  const availableContentHeight = contentTopY - contentBottomY;
  let cursorY = contentTopY - Math.max(0, (availableContentHeight - contentStackHeight) / 2);

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
    x: contentBox.x,
    y: cursorY,
    width: contentBox.width,
    align: 'center',
    font: 'F2',
    fontSize: 9.5,
    lineHeight: 12,
    color: accentColor,
  }));
  cursorY -= 14 + measureTextBlockHeight(['CERTIFICATE'], 9.5, 12);

  commands.push(buildTextCommands(titleLines, {
    x: contentBox.x,
    y: cursorY,
    width: contentBox.width,
    align: 'center',
    font: 'F2',
    fontSize: 28,
    lineHeight: titleLineHeight,
    color: primaryColor,
  }));
  cursorY -= measureTextBlockHeight(titleLines, 28, titleLineHeight) + (subtitleLines.length ? 10 : 16);

  if (subtitleLines.length) {
    commands.push(buildTextCommands(subtitleLines, {
      x: contentBox.x,
      y: cursorY,
      width: contentBox.width,
      align: 'center',
      font: 'F2',
      fontSize: 10,
      lineHeight: subtitleLineHeight,
      color: accentColor,
    }));
    cursorY -= measureTextBlockHeight(subtitleLines, 10, subtitleLineHeight) + 16;
  }

  commands.push(buildTextCommands(brandLines, {
    x: contentBox.x,
    y: cursorY,
    width: contentBox.width,
    align: 'center',
    font: 'F2',
    fontSize: 11,
    lineHeight: brandLineHeight,
    color: primaryColor,
  }));
  cursorY -= measureTextBlockHeight(brandLines, 11, brandLineHeight) + 20;

  commands.push(buildTextCommands(['Presented To'], {
    x: contentBox.x,
    y: cursorY,
    width: contentBox.width,
    align: 'center',
    font: 'F2',
    fontSize: 11,
    lineHeight: labelLineHeight,
    color: '0.420 0.451 0.510',
  }));
  cursorY -= measureTextBlockHeight(['Presented To'], 11, labelLineHeight) + 14;

  commands.push(buildTextCommands(learnerLines, {
    x: contentBox.x,
    y: cursorY,
    width: contentBox.width,
    align: 'center',
    font: 'F2',
    fontSize: 27,
    lineHeight: learnerLineHeight,
    color: primaryColor,
  }));
  cursorY -= measureTextBlockHeight(learnerLines, 27, learnerLineHeight) + 14;

  commands.push(buildTextCommands(bodyLines, {
    x: contentBox.x,
    y: cursorY,
    width: contentBox.width,
    align: 'center',
    font: 'F1',
    fontSize: 15,
    lineHeight: bodyLineHeight,
    color: fontColor,
  }));
  cursorY -= measureTextBlockHeight(bodyLines, 15, bodyLineHeight);

  if (programmeLines.length) {
    cursorY -= 16;
    commands.push(buildTextCommands(['Programme'], {
      x: contentBox.x,
      y: cursorY,
      width: contentBox.width,
      align: 'center',
      font: 'F2',
      fontSize: 10,
      lineHeight: labelLineHeight,
      color: '0.420 0.451 0.510',
    }));
    cursorY -= measureTextBlockHeight(['Programme'], 10, labelLineHeight) + 12;

    commands.push(buildTextCommands(programmeLines, {
      x: contentBox.x,
      y: cursorY,
      width: contentBox.width,
      align: 'center',
      font: 'F2',
      fontSize: 20,
      lineHeight: programmeLineHeight,
      color: primaryColor,
    }));
    cursorY -= measureTextBlockHeight(programmeLines, 20, programmeLineHeight);
  }

  if (issueLines.length) {
    cursorY -= 18;
    commands.push(buildTextCommands(issueLines, {
      x: contentBox.x,
      y: cursorY,
      width: contentBox.width,
      align: 'center',
      font: 'F2',
      fontSize: 12.5,
      lineHeight: issueLineHeight,
      color: fontColor,
    }));
  }

  const footerBaseY = 110;
  let footerTextY = signatories.length ? 156 : 148;
  if (sponsorText) {
    const sponsorLines = wrapText(sponsorText, footerTextWidth, 9.5);
    commands.push(buildTextCommands(sponsorLines, {
      x: contentBox.x,
      y: footerTextY,
      width: contentBox.width,
      align: 'center',
      font: 'F1',
      fontSize: 9.5,
      lineHeight: sponsorLineHeight,
      color: '0.420 0.451 0.510',
    }));
    footerTextY -= measureTextBlockHeight(sponsorLines, 9.5, sponsorLineHeight) + 10;
  }

  if (showOrganizerBlock) {
    commands.push(buildTextCommands(['Issued By'], {
      x: contentBox.x,
      y: footerTextY,
      width: contentBox.width,
      align: 'center',
      font: 'F2',
      fontSize: 10,
      lineHeight: labelLineHeight,
      color: '0.420 0.451 0.510',
    }));
    footerTextY -= measureTextBlockHeight(['Issued By'], 10, labelLineHeight) + 8;
    const organizerLines = wrapText(organizerName, footerTextWidth, 15);
    commands.push(buildTextCommands(organizerLines, {
      x: contentBox.x,
      y: footerTextY,
      width: contentBox.width,
      align: 'center',
      font: 'F2',
      fontSize: 15,
      lineHeight: organizerLineHeight,
      color: primaryColor,
    }));
    footerTextY -= measureTextBlockHeight(organizerLines, 15, organizerLineHeight) + 8;
  }

  if (signatories.length) {
    const signWidth = 156;
    const signGap = 18;
    const totalWidth = (signatories.length * signWidth) + ((signatories.length - 1) * signGap);
    const signStartX = (PAGE_WIDTH - totalWidth) / 2;
    signatories.forEach((signatory, index) => {
      const x = signStartX + (index * (signWidth + signGap));
      commands.push(buildLine({
        x1: x,
        y1: footerBaseY,
        x2: x + signWidth,
        y2: footerBaseY,
        strokeColor: primaryColor,
        lineWidth: 1.1,
      }));
      const signNameLines = wrapText(signatory.name || '', signWidth, 11.5);
      commands.push(buildTextCommands(signNameLines, {
        x,
        y: footerBaseY - 16,
        width: signWidth,
        align: 'center',
        font: 'F2',
        fontSize: 11.5,
        lineHeight: 13,
        color: primaryColor,
      }));
      if (signatory.role) {
        const signRoleY = footerBaseY - 20 - measureTextBlockHeight(signNameLines, 11.5, 13);
        commands.push(buildTextCommands(wrapText(signatory.role, signWidth, 9.5), {
          x,
          y: signRoleY,
          width: signWidth,
          align: 'center',
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
      x: contentBox.x,
      y: signatories.length ? 66 : 78,
      width: contentBox.width,
      align: 'center',
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

const escapeHtml = (value = '') => String(value)
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#39;');

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
  const normalized = hex.replace('#', '');
  const full = normalized.length === 3
    ? normalized.split('').map((char) => char + char).join('')
    : normalized;
  const value = Number.parseInt(full, 16);
  return {
    r: (value >> 16) & 255,
    g: (value >> 8) & 255,
    b: value & 255,
  };
};

const rgba = (hex, alpha) => {
  const { r, g, b } = hexToRgb(hex);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

const fontStack = (fontFamily = 'classic_serif') => {
  const map = {
    classic_serif: 'Georgia, "Times New Roman", serif',
    formal_serif: '"Palatino Linotype", "Book Antiqua", Palatino, serif',
    modern_sans: '"Trebuchet MS", Verdana, sans-serif',
    executive_sans: '"Gill Sans", "Segoe UI", Calibri, sans-serif',
  };
  return map[fontFamily] || map.classic_serif;
};

const normalizeTextBody = ({ body, productName }) => {
  const trimmed = String(body || '').trim();
  if (trimmed) return escapeHtml(trimmed).replace(/\n/g, '<br/>');
  if (productName) return `For successfully completing ${escapeHtml(productName)} and meeting the requirements of the programme.`;
  return 'In recognition of outstanding participation and achievement';
};

export const generateCertificate = (record, options = {}) => {
  if (!record) return;

  const {
    autoPrint = false,
    brandName = 'BELLE KREYASHON',
  } = options;

  const learnerNameRaw = String(record.learnerName || 'Learner').trim();
  const productNameRaw = String(record.productName || '').trim();
  const organizerNameRaw = String(record.organizerName || brandName).trim();
  const brandNameRaw = String(brandName || '').trim();

  const learnerName = escapeHtml(learnerNameRaw);
  const certificateTitle = escapeHtml(record.certificateTitle || 'Certificate of Completion');
  const certificateSubtitle = escapeHtml(record.certificateSubtitle || '');
  const bodyText = normalizeTextBody({
    body: record.certificateBody,
    productName: productNameRaw,
  });
  const productName = escapeHtml(productNameRaw);
  const issueDate = escapeHtml(formatDate(record.issueDate || record.generatedAt || new Date()));
  const organizerName = escapeHtml(organizerNameRaw);
  const certificateNumber = escapeHtml(record.certificateNumber || '');
  const primaryColor = sanitizeColor(record.primaryColor, '#111827');
  const accentColor = sanitizeColor(record.accentColor, '#FDC700');
  const backgroundColor = sanitizeColor(record.backgroundColor, '#FFFDF7');
  const fontColor = sanitizeColor(record.fontColor, '#374151');
  const fontFamily = record.fontFamily || 'classic_serif';
  const frameStyle = ['classic', 'double', 'soft', 'minimal'].includes(record.frameStyle) ? record.frameStyle : 'classic';
  const pageBackground = rgba(backgroundColor, 0.4);
  const primaryMuted = rgba(primaryColor, 0.12);
  const primarySoft = rgba(primaryColor, 0.18);
  const primaryMedium = rgba(primaryColor, 0.4);
  const accentLight = rgba(accentColor, 0.08);
  const accentSoft = rgba(accentColor, 0.12);
  const accentGlow = rgba(accentColor, 0.18);
  const accentStrong = rgba(accentColor, 0.5);
  const accentSeal = rgba(accentColor, 0.16);
  const sponsors = Array.isArray(record.sponsors) ? record.sponsors.filter(Boolean) : [];
  const signatories = Array.isArray(record.signatories) ? record.signatories.filter((item) => item?.name || item?.role) : [];
  const showOrganizerBlock = organizerNameRaw && organizerNameRaw.toLowerCase() !== brandNameRaw.toLowerCase();
  const displayBrand = brandNameRaw || organizerNameRaw;

  const frameStyles = {
    classic: {
      bodyBackground: pageBackground,
      borderSize: '12px',
      borderRadius: '26px',
      innerBorder: `2px solid ${primaryMuted}`,
      cardBackground: `
        radial-gradient(circle at top left, ${accentGlow}, transparent 30%),
        radial-gradient(circle at bottom right, rgba(0,0,0,.05), transparent 28%),
        ${backgroundColor}
      `,
      sealBorder: `3px solid ${accentStrong}`,
      sealBackground: accentSeal,
    },
    double: {
      bodyBackground: pageBackground,
      borderSize: '16px',
      borderRadius: '18px',
      innerBorder: `4px double ${primaryMedium}`,
      cardBackground: `
        linear-gradient(180deg, ${accentSoft}, transparent 22%),
        ${backgroundColor}
      `,
      sealBorder: `4px double ${accentStrong}`,
      sealBackground: accentSoft,
    },
    soft: {
      bodyBackground: pageBackground,
      borderSize: '9px',
      borderRadius: '34px',
      innerBorder: `1.5px solid ${accentStrong}`,
      cardBackground: `
        radial-gradient(circle at top center, ${accentSoft}, transparent 38%),
        radial-gradient(circle at bottom right, ${accentLight}, transparent 32%),
        ${backgroundColor}
      `,
      sealBorder: `2px solid ${accentStrong}`,
      sealBackground: accentGlow,
    },
    minimal: {
      bodyBackground: pageBackground,
      borderSize: '7px',
      borderRadius: '14px',
      innerBorder: `1px solid ${primaryMuted}`,
      cardBackground: backgroundColor,
      sealBorder: `2px solid ${primarySoft}`,
      sealBackground: accentLight,
    },
  };
  const frameTheme = frameStyles[frameStyle];

  const sponsorsHtml = sponsors.length
    ? `<div class="footer-note">Sponsors: ${sponsors.map(escapeHtml).join(', ')}</div>`
    : '';

  const signatoriesHtml = signatories.length
    ? `<div class="signatories">
        ${signatories.map((signatory) => `
          <div class="signatory">
            <div class="sign-line">${escapeHtml(signatory.name || '')}</div>
            <div class="sign-role">${escapeHtml(signatory.role || '')}</div>
          </div>
        `).join('')}
      </div>`
    : '';

  const html = `<!DOCTYPE html><html><head><meta charset="UTF-8" />
  <title>${certificateTitle}</title>
  <style>
    @page { size: A4 landscape; margin: 0; }
    *{box-sizing:border-box}
    html,body{margin:0;padding:0}
    body{background:${frameTheme.bodyBackground};font-family:${fontStack(fontFamily)};color:${fontColor}}
    .page{
      width:297mm;
      min-height:210mm;
      margin:0 auto;
      padding:10mm;
      display:flex;
      align-items:center;
      justify-content:center;
    }
    .card{
      width:100%;
      min-height:190mm;
      background:${frameTheme.cardBackground};
      border:${frameTheme.borderSize} solid ${primaryColor};
      border-radius:${frameTheme.borderRadius};
      padding:10mm;
      box-shadow:0 16px 42px rgba(17,24,39,.08);
      position:relative;
      overflow:hidden;
      display:flex;
    }
    .inner{
      width:100%;
      min-height:100%;
      border:${frameTheme.innerBorder};
      border-radius:20px;
      padding:12mm 14mm;
      display:flex;
      flex-direction:column;
      align-items:center;
      justify-content:center;
      gap:5mm;
      text-align:center;
    }
    .topbar,.content,.footer{
      width:100%;
      display:flex;
      flex-direction:column;
      align-items:center;
    }
    .eyebrow{font-size:11px;letter-spacing:.28em;font-weight:800;color:${accentColor};text-transform:uppercase;text-align:center}
    .brand{
      margin-top:2mm;
      font-size:12px;
      font-weight:800;
      letter-spacing:.24em;
      text-transform:uppercase;
      color:${primaryColor};
      text-align:center;
      max-width:220mm;
    }
    .title{
      font-size:34px;
      font-weight:900;
      line-height:1.05;
      text-transform:uppercase;
      color:${primaryColor};
      margin:0;
      max-width:220mm;
    }
    .subtitle{
      font-size:13px;
      font-weight:700;
      letter-spacing:.16em;
      text-transform:uppercase;
      color:${accentColor};
      margin:2mm 0 0;
      max-width:200mm;
    }
    .left{
      max-width:212mm;
      margin:0 auto;
    }
    .intro{
      font-size:13px;
      font-weight:700;
      letter-spacing:.22em;
      text-transform:uppercase;
      color:#6b7280;
      margin-bottom:3mm;
    }
    .learner{
      font-size:30px;
      font-weight:900;
      line-height:1.12;
      color:${primaryColor};
      margin:0 0 4mm 0;
      max-width:210mm;
    }
    .body{
      font-size:17px;
      line-height:1.68;
      color:${fontColor};
      max-width:194mm;
      text-align:center;
      margin:0 auto;
    }
    .course-label{
      margin-top:5mm;
      font-size:11px;
      font-weight:800;
      letter-spacing:.22em;
      text-transform:uppercase;
      color:#6b7280;
    }
    .course{
      margin-top:2mm;
      font-size:24px;
      line-height:1.2;
      font-weight:900;
      color:${primaryColor};
      max-width:195mm;
      margin-left:auto;
      margin-right:auto;
    }
    .issue-date{
      margin-top:4mm;
      font-size:14px;
      font-weight:800;
      color:${fontColor};
    }
    .footer{
      margin-top:2mm;
      gap:4mm;
    }
    .footer-note{
      font-size:11px;
      color:#6b7280;
      margin-top:0;
      max-width:190mm;
    }
    .footer-side{
      text-align:center;
      align-self:center;
    }
    .issuer{
      margin-top:0;
      font-size:12px;
      font-weight:800;
      letter-spacing:.18em;
      text-transform:uppercase;
      color:#6b7280;
    }
    .issuer-name{
      margin-top:2mm;
      font-size:18px;
      font-weight:900;
      color:${primaryColor};
    }
    .cert-no{
      margin-top:0;
      font-size:11px;
      color:#6b7280;
    }
    .signatories{
      width:100%;
      max-width:205mm;
      display:grid;
      grid-template-columns:repeat(${Math.max(1, Math.min(signatories.length || 1, 3))}, minmax(0, 1fr));
      gap:8mm;
      margin-top:2mm;
    }
    .signatory{text-align:center}
    .sign-line{
      border-top:1.4px solid ${primaryColor};
      padding-top:2.5mm;
      font-size:13px;
      font-weight:800;
      color:${primaryColor};
    }
    .sign-role{
      margin-top:1.5mm;
      font-size:11px;
      color:#6b7280;
    }
    @media print{
      body{background:#fff}
      .card{box-shadow:none}
    }
  </style></head><body>
    <div class="page">
      <div class="card">
        <div class="inner">
          <div class="topbar">
            <div class="eyebrow">Certificate</div>
            <h1 class="title">${certificateTitle}</h1>
            ${certificateSubtitle ? `<p class="subtitle">${certificateSubtitle}</p>` : ''}
            <div class="brand">${escapeHtml(displayBrand)}</div>
          </div>

          <div class="content">
            <div class="left">
              <div class="intro">Presented To</div>
              <div class="learner">${learnerName}</div>
              <div class="body">${bodyText}</div>
              ${productName ? `
                <div class="course-label">Programme</div>
                <div class="course">${productName}</div>
              ` : ''}
              ${issueDate ? `<div class="issue-date">Issued ${issueDate}</div>` : ''}
            </div>
          </div>

          <div class="footer">
            <div>
              ${sponsorsHtml}
              ${showOrganizerBlock ? `
                <div class="issuer">Issued By</div>
                <div class="issuer-name">${organizerName}</div>
              ` : ''}
              ${signatoriesHtml}
            </div>
            <div class="footer-side">
              ${certificateNumber ? `<div class="cert-no">${certificateNumber}</div>` : ''}
            </div>
          </div>
        </div>
      </div>
    </div>
    ${autoPrint ? '<script>window.onload=()=>window.print()</script>' : ''}
  </body></html>`;

  const blob = new Blob([html], { type: 'text/html' });
  window.open(URL.createObjectURL(blob), '_blank', 'noopener,noreferrer');
};

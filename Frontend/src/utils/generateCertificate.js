import { CERTIFICATE_LAYOUT_VALUES } from '../data/certificateLayouts';

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

const buildMedalHtml = (className = '') => `
  <div class="layout-medal ${className}">
    <span class="layout-medal__coin"></span>
    <span class="layout-medal__ribbon layout-medal__ribbon--a"></span>
    <span class="layout-medal__ribbon layout-medal__ribbon--b"></span>
  </div>
`;

const buildLayoutDecorations = (frameStyle) => {
  switch (frameStyle) {
    case 'certificate_of_completion_2':
      return `
        <div class="layout-layer octagon-frame"></div>
        <div class="layout-layer octagon-inner-frame"></div>
        <div class="layout-layer corner-guide corner-guide--tl"></div>
        <div class="layout-layer corner-guide corner-guide--tr"></div>
        <div class="layout-layer corner-guide corner-guide--bl"></div>
        <div class="layout-layer corner-guide corner-guide--br"></div>
      `;
    case 'certificate_of_excellence':
      return `
        <div class="layout-layer ribbon-edge ribbon-edge--left-primary"></div>
        <div class="layout-layer ribbon-edge ribbon-edge--left-accent"></div>
        <div class="layout-layer ribbon-edge ribbon-edge--right-primary"></div>
        <div class="layout-layer ribbon-edge ribbon-edge--right-soft"></div>
        <div class="layout-layer outline-frame outline-frame--outer"></div>
        <div class="layout-layer outline-frame outline-frame--inner"></div>
        ${buildMedalHtml('layout-medal--left')}
      `;
    case 'blank_diploma_certificate_template_02':
      return `
        <div class="layout-layer diploma-wave diploma-wave--top-primary"></div>
        <div class="layout-layer diploma-wave diploma-wave--top-soft"></div>
        <div class="layout-layer diploma-wave diploma-wave--bottom-primary"></div>
        <div class="layout-layer diploma-wave diploma-wave--bottom-soft"></div>
        ${buildMedalHtml('layout-medal--top-right')}
      `;
    case 'certificate_of_achievement_3_simple':
      return `
        <div class="layout-layer ribbon-corner ribbon-corner--top-left"></div>
        <div class="layout-layer ribbon-corner ribbon-corner--top-left-accent"></div>
        <div class="layout-layer ribbon-corner ribbon-corner--bottom-right"></div>
        <div class="layout-layer ribbon-corner ribbon-corner--bottom-right-accent"></div>
        ${buildMedalHtml('layout-medal--top-right')}
      `;
    case 'certificate_of_achievement_2':
      return `
        <div class="layout-layer award-frame award-frame--outer"></div>
        <div class="layout-layer award-frame award-frame--inner"></div>
        <div class="layout-layer award-bar award-bar--left-primary"></div>
        <div class="layout-layer award-bar award-bar--left-soft"></div>
        <div class="layout-layer award-bar award-bar--right-primary"></div>
        <div class="layout-layer award-bar award-bar--right-accent"></div>
        <div class="layout-layer award-bar award-bar--right-soft"></div>
        <div class="layout-layer award-bar award-bar--bottom-primary"></div>
        <div class="layout-layer award-bar award-bar--bottom-accent"></div>
        ${buildMedalHtml('layout-medal--center-bottom')}
      `;
    case 'certificate_of_achievement_1':
      return `
        <div class="layout-layer prestige-frame prestige-frame--outer"></div>
        <div class="layout-layer prestige-frame prestige-frame--inner"></div>
        <div class="layout-layer prestige-corner prestige-corner--top-left"></div>
        <div class="layout-layer prestige-corner prestige-corner--top-left-accent"></div>
        <div class="layout-layer prestige-corner prestige-corner--bottom-right"></div>
        <div class="layout-layer prestige-corner prestige-corner--bottom-right-accent"></div>
        ${buildMedalHtml('layout-medal--top-right-soft')}
      `;
    case 'certificate_of_excellence_1':
      return `
        <div class="layout-layer outline-frame outline-frame--outer"></div>
        <div class="layout-layer outline-frame outline-frame--inner"></div>
        <div class="layout-layer excellence-band excellence-band--right-primary"></div>
        <div class="layout-layer excellence-band excellence-band--right-soft"></div>
        <div class="layout-layer excellence-band excellence-band--right-accent"></div>
        <div class="layout-layer excellence-band excellence-band--left-accent"></div>
        <div class="layout-layer excellence-band excellence-band--left-soft"></div>
        ${buildMedalHtml('layout-medal--left')}
      `;
    default:
      return '';
  }
};

const getLayoutTheme = ({
  frameStyle,
  primaryColor,
  accentColor,
  backgroundColor,
}) => {
  const pageBackground = rgba(backgroundColor, 0.34);
  const primaryMuted = rgba(primaryColor, 0.12);
  const primarySoft = rgba(primaryColor, 0.18);
  const primaryMedium = rgba(primaryColor, 0.4);
  const accentLight = rgba(accentColor, 0.08);
  const accentSoft = rgba(accentColor, 0.12);
  const accentGlow = rgba(accentColor, 0.18);
  const accentStrong = rgba(accentColor, 0.5);

  const legacyFrames = {
    classic: {
      bodyBackground: pageBackground,
      cardBorder: `12px solid ${primaryColor}`,
      cardRadius: '26px',
      cardPadding: '10mm',
      cardBackground: `
        radial-gradient(circle at top left, ${accentGlow}, transparent 30%),
        radial-gradient(circle at bottom right, rgba(0,0,0,.05), transparent 28%),
        ${backgroundColor}
      `,
      innerBorder: `2px solid ${primaryMuted}`,
      innerRadius: '20px',
      innerPadding: '12mm 14mm',
      alignment: 'center',
      cardClass: 'layout-classic',
    },
    double: {
      bodyBackground: pageBackground,
      cardBorder: `16px solid ${primaryColor}`,
      cardRadius: '18px',
      cardPadding: '10mm',
      cardBackground: `
        linear-gradient(180deg, ${accentSoft}, transparent 22%),
        ${backgroundColor}
      `,
      innerBorder: `4px double ${primaryMedium}`,
      innerRadius: '18px',
      innerPadding: '12mm 14mm',
      alignment: 'center',
      cardClass: 'layout-double',
    },
    soft: {
      bodyBackground: pageBackground,
      cardBorder: `9px solid ${primaryColor}`,
      cardRadius: '34px',
      cardPadding: '10mm',
      cardBackground: `
        radial-gradient(circle at top center, ${accentSoft}, transparent 38%),
        radial-gradient(circle at bottom right, ${accentLight}, transparent 32%),
        ${backgroundColor}
      `,
      innerBorder: `1.5px solid ${accentStrong}`,
      innerRadius: '28px',
      innerPadding: '12mm 14mm',
      alignment: 'center',
      cardClass: 'layout-soft',
    },
    minimal: {
      bodyBackground: pageBackground,
      cardBorder: `7px solid ${primaryColor}`,
      cardRadius: '14px',
      cardPadding: '10mm',
      cardBackground: backgroundColor,
      innerBorder: `1px solid ${primaryMuted}`,
      innerRadius: '14px',
      innerPadding: '12mm 14mm',
      alignment: 'center',
      cardClass: 'layout-minimal',
    },
  };

  if (legacyFrames[frameStyle]) {
    return {
      ...legacyFrames[frameStyle],
      decorationsHtml: '',
      titleSize: '34px',
      learnerSize: '30px',
      bodySize: '17px',
    };
  }

  const modernDefaults = {
    bodyBackground: `linear-gradient(180deg, ${pageBackground}, #ffffff 45%, ${pageBackground})`,
    cardBorder: '0 solid transparent',
    cardRadius: '24px',
    cardPadding: '9mm',
    cardBackground: backgroundColor,
    innerBorder: 'none',
    innerRadius: '20px',
    innerPadding: '13mm 16mm',
    alignment: 'center',
    titleSize: '34px',
    learnerSize: '31px',
    bodySize: '17px',
  };

  const themes = {
    certificate_of_completion_2: {
      ...modernDefaults,
      cardClass: 'layout-certificate-of-completion-2',
      bodyBackground: `linear-gradient(180deg, ${rgba(accentColor, 0.1)}, #ffffff 38%, ${rgba(primaryColor, 0.08)})`,
      cardRadius: '20px',
      cardPadding: '8mm',
      innerPadding: '14mm 16mm',
    },
    certificate_of_excellence: {
      ...modernDefaults,
      cardClass: 'layout-certificate-of-excellence',
      bodyBackground: `linear-gradient(135deg, ${rgba(primaryColor, 0.08)}, #ffffff 24%, ${rgba(accentColor, 0.08)})`,
      cardBackground: rgba(backgroundColor, 0.98),
      innerPadding: '14mm 18mm',
    },
    blank_diploma_certificate_template_02: {
      ...modernDefaults,
      cardClass: 'layout-blank-diploma-certificate-template-02',
      bodyBackground: `linear-gradient(180deg, ${rgba(primaryColor, 0.08)}, #ffffff 26%, ${rgba(accentColor, 0.08)})`,
      innerPadding: '13mm 16mm',
      alignment: 'left',
      titleSize: '30px',
      learnerSize: '27px',
      bodySize: '16px',
    },
    certificate_of_achievement_3_simple: {
      ...modernDefaults,
      cardClass: 'layout-certificate-of-achievement-3-simple',
      bodyBackground: `linear-gradient(135deg, ${rgba(primaryColor, 0.08)}, #ffffff 40%, ${rgba(accentColor, 0.08)})`,
    },
    certificate_of_achievement_2: {
      ...modernDefaults,
      cardClass: 'layout-certificate-of-achievement-2',
      bodyBackground: `linear-gradient(135deg, ${rgba(primaryColor, 0.09)}, #ffffff 28%, ${rgba(accentColor, 0.09)})`,
      innerPadding: '13mm 16mm 18mm',
    },
    certificate_of_achievement_1: {
      ...modernDefaults,
      cardClass: 'layout-certificate-of-achievement-1',
      bodyBackground: `linear-gradient(135deg, ${rgba(primaryColor, 0.1)}, #ffffff 36%, ${rgba(accentColor, 0.08)})`,
    },
    certificate_of_excellence_1: {
      ...modernDefaults,
      cardClass: 'layout-certificate-of-excellence-1',
      bodyBackground: `linear-gradient(135deg, ${rgba(primaryColor, 0.09)}, #ffffff 32%, ${rgba(accentColor, 0.08)})`,
      innerPadding: '13mm 17mm',
    },
  };

  return {
    ...themes[frameStyle],
    decorationsHtml: buildLayoutDecorations(frameStyle),
  };
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
  const frameStyle = CERTIFICATE_LAYOUT_VALUES.includes(record.frameStyle) ? record.frameStyle : 'classic';
  const sponsors = Array.isArray(record.sponsors) ? record.sponsors.filter(Boolean) : [];
  const signatories = Array.isArray(record.signatories) ? record.signatories.filter((item) => item?.name || item?.role) : [];
  const showOrganizerBlock = organizerNameRaw && organizerNameRaw.toLowerCase() !== brandNameRaw.toLowerCase();
  const displayBrand = brandNameRaw || organizerNameRaw;
  const theme = getLayoutTheme({
    frameStyle,
    primaryColor,
    accentColor,
    backgroundColor,
  });

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
    body{
      margin:0;
      background:${theme.bodyBackground};
      font-family:${fontStack(fontFamily)};
      color:${fontColor};
      --primary:${primaryColor};
      --accent:${accentColor};
      --background:${backgroundColor};
      --font:${fontColor};
      --primary-soft:${rgba(primaryColor, 0.18)};
      --primary-muted:${rgba(primaryColor, 0.12)};
      --accent-soft:${rgba(accentColor, 0.16)};
      --accent-strong:${rgba(accentColor, 0.52)};
      --accent-glow:${rgba(accentColor, 0.24)};
      --line-faint:${rgba(fontColor, 0.18)};
      --light:#ffffff;
    }
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
      background:${theme.cardBackground};
      border:${theme.cardBorder};
      border-radius:${theme.cardRadius};
      padding:${theme.cardPadding};
      box-shadow:0 16px 42px rgba(17,24,39,.08);
      position:relative;
      overflow:hidden;
      display:flex;
      isolation:isolate;
    }
    .inner{
      width:100%;
      min-height:100%;
      border:${theme.innerBorder};
      border-radius:${theme.innerRadius};
      padding:${theme.innerPadding};
      display:flex;
      flex-direction:column;
      align-items:center;
      justify-content:center;
      gap:5mm;
      text-align:center;
      position:relative;
      z-index:2;
    }
    .inner.layout-left{
      align-items:stretch;
      text-align:left;
    }
    .inner.layout-left .topbar,
    .inner.layout-left .content,
    .inner.layout-left .footer{
      align-items:flex-start;
      text-align:left;
    }
    .inner.layout-left .brand,
    .inner.layout-left .title,
    .inner.layout-left .subtitle,
    .inner.layout-left .left,
    .inner.layout-left .body,
    .inner.layout-left .course,
    .inner.layout-left .issue-date,
    .inner.layout-left .footer-note{
      margin-left:0;
      margin-right:0;
      text-align:left;
    }
    .inner.layout-left .footer-side{
      align-self:flex-start;
      text-align:left;
    }
    .topbar,.content,.footer{
      width:100%;
      display:flex;
      flex-direction:column;
      align-items:center;
    }
    .eyebrow{font-size:11px;letter-spacing:.28em;font-weight:800;color:var(--accent);text-transform:uppercase;text-align:center}
    .brand{
      margin-top:2mm;
      font-size:12px;
      font-weight:800;
      letter-spacing:.24em;
      text-transform:uppercase;
      color:var(--primary);
      text-align:center;
      max-width:220mm;
    }
    .title{
      font-size:${theme.titleSize};
      font-weight:900;
      line-height:1.05;
      text-transform:uppercase;
      color:var(--primary);
      margin:0;
      max-width:220mm;
    }
    .subtitle{
      font-size:13px;
      font-weight:700;
      letter-spacing:.16em;
      text-transform:uppercase;
      color:var(--accent);
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
      font-size:${theme.learnerSize};
      font-weight:900;
      line-height:1.12;
      color:var(--primary);
      margin:0 0 4mm 0;
      max-width:210mm;
    }
    .body{
      font-size:${theme.bodySize};
      line-height:1.68;
      color:var(--font);
      max-width:194mm;
      text-align:center;
      margin:0 auto;
    }
    .inner.layout-left .body{
      max-width:172mm;
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
      color:var(--primary);
      max-width:195mm;
      margin-left:auto;
      margin-right:auto;
    }
    .issue-date{
      margin-top:4mm;
      font-size:14px;
      font-weight:800;
      color:var(--font);
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
      color:var(--primary);
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
    .inner.layout-left .signatory{text-align:left}
    .sign-line{
      border-top:1.4px solid var(--primary);
      padding-top:2.5mm;
      font-size:13px;
      font-weight:800;
      color:var(--primary);
    }
    .sign-role{
      margin-top:1.5mm;
      font-size:11px;
      color:#6b7280;
    }
    .layout-layer,
    .layout-medal{
      position:absolute;
      pointer-events:none;
      z-index:1;
    }
    .layout-medal{
      width:22mm;
      display:flex;
      flex-direction:column;
      align-items:center;
    }
    .layout-medal__coin{
      width:16mm;
      height:16mm;
      border-radius:50%;
      background:
        radial-gradient(circle at 30% 30%, rgba(255,255,255,.7), transparent 42%),
        linear-gradient(135deg, var(--accent), var(--primary));
      border:2px solid rgba(17,24,39,.12);
      display:block;
    }
    .layout-medal__ribbon{
      width:5.5mm;
      height:10mm;
      display:block;
      margin-top:-1.2mm;
      clip-path:polygon(50% 0, 100% 100%, 0 76%);
    }
    .layout-medal__ribbon--a{background:var(--primary);transform:translateX(-2.2mm)}
    .layout-medal__ribbon--b{background:var(--accent);clip-path:polygon(50% 0, 100% 76%, 0 100%);transform:translate(2.2mm,-10mm)}
    .layout-medal--left{left:16mm;top:18mm}
    .layout-medal--top-right{right:16mm;top:10mm}
    .layout-medal--top-right-soft{right:18mm;top:14mm}
    .layout-medal--center-bottom{left:50%;bottom:12mm;transform:translateX(-50%)}

    .layout-certificate-of-completion-2{
      border:none;
      border-radius:18px;
      background:var(--background);
    }
    .layout-certificate-of-completion-2 .inner{
      border:none;
      border-radius:18px;
    }
    .layout-certificate-of-completion-2 .octagon-frame,
    .layout-certificate-of-completion-2 .octagon-inner-frame{
      clip-path:polygon(8% 0, 92% 0, 100% 8%, 100% 92%, 92% 100%, 8% 100%, 0 92%, 0 8%);
      inset:8mm;
      border:3px solid var(--primary);
    }
    .layout-certificate-of-completion-2 .octagon-inner-frame{
      inset:12mm;
      border-width:1.5px;
      border-color:var(--accent-soft);
    }
    .layout-certificate-of-completion-2 .corner-guide{
      width:16mm;
      height:10mm;
      border:1px solid var(--line-faint);
    }
    .layout-certificate-of-completion-2 .corner-guide--tl{left:12mm;top:12mm}
    .layout-certificate-of-completion-2 .corner-guide--tr{right:12mm;top:12mm}
    .layout-certificate-of-completion-2 .corner-guide--bl{left:12mm;bottom:12mm}
    .layout-certificate-of-completion-2 .corner-guide--br{right:12mm;bottom:12mm}

    .layout-certificate-of-excellence .outline-frame--outer,
    .layout-certificate-of-excellence .outline-frame--inner,
    .layout-certificate-of-excellence-1 .outline-frame--outer,
    .layout-certificate-of-excellence-1 .outline-frame--inner{
      inset:8mm;
      border:2px solid rgba(17,24,39,.45);
    }
    .layout-certificate-of-excellence .outline-frame--inner,
    .layout-certificate-of-excellence-1 .outline-frame--inner{
      inset:12mm;
      border-width:1px;
      border-color:var(--line-faint);
    }
    .ribbon-edge{
      top:-8mm;
      bottom:-8mm;
      width:22mm;
      transform-origin:center;
    }
    .ribbon-edge--left-primary{left:-6mm;background:var(--primary);transform:rotate(-22deg)}
    .ribbon-edge--left-accent{left:12mm;background:var(--accent);width:14mm;transform:rotate(-22deg);opacity:.9}
    .ribbon-edge--right-primary{right:-8mm;background:var(--primary);width:26mm;transform:rotate(24deg)}
    .ribbon-edge--right-soft{right:18mm;background:rgba(59,130,246,.35);width:14mm;transform:rotate(24deg)}

    .diploma-wave{
      border-radius:999px;
      filter:drop-shadow(0 0 14px rgba(17,24,39,.08));
    }
    .diploma-wave--top-primary{
      left:-10mm;top:-8mm;width:120mm;height:26mm;background:var(--primary);transform:rotate(-8deg)
    }
    .diploma-wave--top-soft{
      left:62mm;top:0;width:88mm;height:18mm;background:rgba(47,158,68,.16);transform:rotate(-8deg)
    }
    .diploma-wave--bottom-primary{
      right:-6mm;bottom:-8mm;width:108mm;height:24mm;background:var(--primary);transform:rotate(8deg)
    }
    .diploma-wave--bottom-soft{
      right:60mm;bottom:-1mm;width:72mm;height:16mm;background:rgba(47,158,68,.16);transform:rotate(8deg)
    }

    .ribbon-corner{
      width:30mm;
      height:58mm;
      background:var(--primary);
      transform:rotate(-24deg);
    }
    .ribbon-corner--top-left{left:-2mm;top:-16mm}
    .ribbon-corner--top-left-accent{
      left:22mm;top:-12mm;width:6mm;height:54mm;background:var(--accent);transform:rotate(-24deg)
    }
    .ribbon-corner--bottom-right{right:-2mm;bottom:-16mm;transform:rotate(24deg)}
    .ribbon-corner--bottom-right-accent{
      right:24mm;bottom:-12mm;width:6mm;height:54mm;background:var(--accent);transform:rotate(24deg)
    }

    .award-frame--outer,
    .award-frame--inner{
      inset:7mm;
      border:5px solid var(--primary);
    }
    .award-frame--inner{
      inset:11mm;
      border-width:2px;
      border-color:rgba(17,24,39,.12);
    }
    .award-bar{
      background:var(--primary);
    }
    .award-bar--left-primary{left:15mm;top:0;bottom:0;width:7mm}
    .award-bar--left-soft{left:28mm;top:0;bottom:0;width:4mm;background:rgba(15,76,129,.55)}
    .award-bar--right-primary{right:34mm;top:-14mm;width:18mm;height:90mm;transform:rotate(26deg)}
    .award-bar--right-accent{right:20mm;top:-16mm;width:10mm;height:86mm;background:var(--accent);transform:rotate(26deg)}
    .award-bar--right-soft{right:10mm;top:-14mm;width:7mm;height:78mm;background:rgba(245,197,66,.58);transform:rotate(26deg)}
    .award-bar--bottom-primary{left:20mm;bottom:-16mm;width:14mm;height:74mm;transform:rotate(-26deg)}
    .award-bar--bottom-accent{left:34mm;bottom:-14mm;width:7mm;height:70mm;background:var(--accent);transform:rotate(-26deg)}

    .prestige-frame--outer,
    .prestige-frame--inner{
      inset:8mm;
      border:2px solid rgba(91,15,38,.75);
    }
    .prestige-frame--inner{
      inset:12mm;
      border-width:1px;
      border-color:rgba(226,185,86,.4);
    }
    .prestige-corner{
      background:var(--primary);
      width:28mm;
      height:58mm;
    }
    .prestige-corner--top-left{left:-4mm;top:-18mm;transform:rotate(-20deg)}
    .prestige-corner--top-left-accent{left:22mm;top:-14mm;width:6mm;height:54mm;background:var(--accent);transform:rotate(-20deg)}
    .prestige-corner--bottom-right{right:-4mm;bottom:-18mm;transform:rotate(20deg)}
    .prestige-corner--bottom-right-accent{right:22mm;bottom:-14mm;width:6mm;height:54mm;background:var(--accent);transform:rotate(20deg)}

    .excellence-band{
      background:var(--primary);
    }
    .excellence-band--right-primary{right:-10mm;top:-18mm;width:24mm;height:120mm;transform:rotate(24deg)}
    .excellence-band--right-soft{right:18mm;top:-14mm;width:12mm;height:114mm;background:rgba(22,62,119,.55);transform:rotate(24deg)}
    .excellence-band--right-accent{right:34mm;top:-12mm;width:8mm;height:106mm;background:var(--accent);transform:rotate(24deg)}
    .excellence-band--left-accent{left:-10mm;bottom:-16mm;width:20mm;height:108mm;background:var(--accent);transform:rotate(-24deg)}
    .excellence-band--left-soft{left:18mm;bottom:-12mm;width:10mm;height:100mm;background:rgba(22,62,119,.45);transform:rotate(-24deg)}

    @media print{
      body{background:#fff}
      .card{box-shadow:none}
    }
  </style></head><body>
    <div class="page">
      <div class="card ${theme.cardClass}">
        ${theme.decorationsHtml || ''}
        <div class="inner ${theme.alignment === 'left' ? 'layout-left' : 'layout-center'}">
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

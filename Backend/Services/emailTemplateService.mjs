const BRAND_NAME = 'Belle Kreyashon';
const DEFAULT_FRONTEND_BASE_URL = 'https://bellekreyashon.com';
const FRONTEND_BASE_URL = () => {
  const candidates = [
    process.env.SITE_URL,
    process.env.FRONTEND_URL,
    DEFAULT_FRONTEND_BASE_URL,
  ]
    .map((value) => String(value || '').trim().replace(/\/+$/, ''))
    .filter(Boolean);

  const nonPreviewUrl = candidates.find((value) => {
    try {
      return !/\.pages\.dev$/i.test(new URL(value).hostname);
    } catch {
      return /^https?:\/\//i.test(value) && !/\.pages\.dev(?:\/|$)/i.test(value);
    }
  });

  return nonPreviewUrl || DEFAULT_FRONTEND_BASE_URL;
};

const COLORS = {
  backdrop: '#f6f0e5',
  surface: '#ffffff',
  border: '#e7dbc2',
  ink: '#111111',
  text: '#374151',
  muted: '#6b7280',
  accent: '#b58a2a',
  accentSoft: '#f8f1e2',
  accentBorder: '#e4d4ae',
  white: '#ffffff',
};

export const escapeHtml = (value = '') => String(value)
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#39;');

const buildBrandUrl = () => FRONTEND_BASE_URL();

export const buildEmailButton = (label, href, tone = 'primary') => {
  if (!label || !href) return '';

  const palette = tone === 'secondary'
    ? {
        background: COLORS.accentSoft,
        border: COLORS.accentBorder,
        color: COLORS.ink,
      }
    : {
        background: COLORS.ink,
        border: COLORS.ink,
        color: COLORS.white,
      };

  return `
    <a
      href="${escapeHtml(href)}"
      style="display:inline-block;padding:14px 18px;border-radius:999px;background:${palette.background};border:1px solid ${palette.border};color:${palette.color};font-size:14px;font-weight:700;line-height:1.2;text-decoration:none;"
    >${escapeHtml(label)}</a>
  `;
};

export const buildEmailList = (items = []) => {
  const safeItems = items.filter(Boolean);
  if (!safeItems.length) return '';

  return `
    <ul style="margin:0 0 22px;padding:0 0 0 18px;color:${COLORS.text};font-size:15px;line-height:1.75;">
      ${safeItems.map((item) => `<li style="margin:0 0 8px;">${escapeHtml(item)}</li>`).join('')}
    </ul>
  `;
};

export const buildEmailMetaTable = (rows = []) => {
  const safeRows = rows.filter((row) => row?.label && row?.value !== undefined && row?.value !== null && row?.value !== '');
  if (!safeRows.length) return '';

  return `
    <div style="margin:0 0 24px;border:1px solid ${COLORS.accentBorder};border-radius:20px;background:${COLORS.accentSoft};overflow:hidden;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
        ${safeRows.map((row, index) => `
          <tr>
            <td style="padding:13px 16px;border-bottom:${index === safeRows.length - 1 ? '0' : `1px solid ${COLORS.accentBorder}`};color:${COLORS.muted};font-size:12px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;vertical-align:top;">
              ${escapeHtml(row.label)}
            </td>
            <td style="padding:13px 16px;border-bottom:${index === safeRows.length - 1 ? '0' : `1px solid ${COLORS.accentBorder}`};color:${COLORS.ink};font-size:14px;font-weight:700;text-align:right;vertical-align:top;">
              ${escapeHtml(row.value)}
            </td>
          </tr>
        `).join('')}
      </table>
    </div>
  `;
};

export const buildEmailNote = (message = '') => {
  if (!message) return '';

  return `
    <div style="margin:24px 0 0;padding:14px 16px;border:1px solid ${COLORS.accentBorder};border-radius:18px;background:${COLORS.accentSoft};color:${COLORS.text};font-size:14px;line-height:1.7;">
      ${escapeHtml(message)}
    </div>
  `;
};

export const buildEmailLayout = ({
  previewText = '',
  eyebrow = '',
  title = '',
  greetingHtml = '',
  bodyHtml = '',
  metaHtml = '',
  actions = [],
  noteHtml = '',
  closingHtml = '',
  footerText = 'Reply to this email if you need help.',
}) => {
  const safeActions = actions.filter((action) => action?.label && action?.href);
  const brandUrl = buildBrandUrl();
  const actionHtml = safeActions.length
    ? `
      <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 24px;border-collapse:collapse;">
        ${safeActions.map((action, index) => `
          <tr>
            <td style="padding:${index === 0 ? '0' : '12px 0 0 0'};">
              ${buildEmailButton(action.label, action.href, action.tone)}
            </td>
          </tr>
        `).join('')}
      </table>
    `
    : '';

  const signatureHtml = closingHtml || `
    <p style="margin:24px 0 0;color:${COLORS.text};font-size:15px;line-height:1.75;">
      Thank you,<br/>
      <strong style="color:${COLORS.ink};">${BRAND_NAME}</strong>
    </p>
  `;

  return `
    <!doctype html>
    <html lang="en">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>${escapeHtml(title || BRAND_NAME)}</title>
      </head>
      <body style="margin:0;padding:0;background:${COLORS.backdrop};font-family:Arial,Helvetica,sans-serif;color:${COLORS.text};">
        <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">
          ${escapeHtml(previewText)}
        </div>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;background:${COLORS.backdrop};">
          <tr>
            <td align="center" style="padding:28px 14px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:620px;border-collapse:collapse;">
                <tr>
                  <td style="padding:0 0 14px 4px;color:${COLORS.accent};font-size:12px;font-weight:700;letter-spacing:0.24em;text-transform:uppercase;">
                    ${escapeHtml(BRAND_NAME)}
                  </td>
                </tr>
                <tr>
                  <td style="overflow:hidden;border:1px solid ${COLORS.border};border-radius:30px;background:${COLORS.surface};box-shadow:0 16px 44px rgba(17,17,17,0.08);">
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
                      <tr>
                        <td style="padding:18px 26px;background:${COLORS.ink};">
                          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
                            <tr>
                              <td style="color:${COLORS.white};font-size:12px;font-weight:700;letter-spacing:0.18em;text-transform:uppercase;">
                                ${escapeHtml(eyebrow || BRAND_NAME)}
                              </td>
                              <td align="right" style="color:${COLORS.accent};font-size:12px;">
                                <a href="${escapeHtml(brandUrl)}" style="color:${COLORS.accent};text-decoration:none;">bellekreyashon.com</a>
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                      <tr>
                        <td style="height:5px;background:${COLORS.accent};font-size:0;line-height:0;">&nbsp;</td>
                      </tr>
                      <tr>
                        <td style="padding:34px 32px 30px;">
                          <h1 style="margin:0 0 18px;color:${COLORS.ink};font-size:30px;line-height:1.18;font-weight:800;">
                            ${escapeHtml(title)}
                          </h1>
                          ${greetingHtml}
                          ${bodyHtml}
                          ${metaHtml}
                          ${actionHtml}
                          ${noteHtml}
                          ${signatureHtml}
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <tr>
                  <td style="padding:16px 10px 0;color:${COLORS.muted};font-size:12px;line-height:1.7;text-align:center;">
                    ${escapeHtml(footerText)}
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
    </html>
  `;
};

export const buildEmailText = ({ greeting = '', lines = [], actions = [], closing = BRAND_NAME }) => {
  const safeLines = lines.filter(Boolean);
  const safeActions = actions
    .filter((action) => action?.label && action?.href)
    .map((action) => `${action.label}: ${action.href}`);

  return [
    greeting,
    '',
    ...safeLines,
    ...(safeActions.length ? ['', ...safeActions] : []),
    '',
    'Thank you,',
    closing,
  ].join('\n');
};

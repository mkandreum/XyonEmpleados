const prisma = require('../lib/prisma');

/**
 * Tokens de diseño del correo. Reflejan el sistema de diseño de la app
 * (tailwind.config.js + index.css): papel/ink cálidos, acentos lime/lilac/
 * coral/sun, esquinas 28px, borde ink de 1.5px y sombra "pop".
 * Se usan como estilos inline porque los clientes de correo no cargan CSS externo.
 */
const COLORS = {
  paper: '#F4F2EA',
  ink: '#0C0C12',
  white: '#FFFFFF',
  slate900: '#111118',
  slate700: '#34353F',
  slate600: '#474955',
  slate500: '#5B5E6B',
  slate400: '#8B8778',
  slate300: '#C4BFAE',
  slate200: '#DCD8CA',
  slate100: '#EAE7DC',
  lime: '#C8F53C', limeSoft: '#EEFBC4', limeInk: '#3D4D0A',
  lilac: '#C9B6FF', lilacSoft: '#EEE8FF', lilacInk: '#3B2A80',
  coral: '#FF6B4A', coralSoft: '#FFE3DB', coralInk: '#8A2A14',
  sun: '#FFD84A', sunSoft: '#FFF5CC', sunInk: '#6B5300',
};

// Inter para el cuerpo, Inter Tight para titulares (peso black, tracking negativo).
const FONT = "'Inter','Inter Tight',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";
const DISPLAY = "'Inter Tight','Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";

// Marca que permite detectar plantillas ya tematizadas (migración de plantillas legacy).
const THEME_MARKER = 'data-xyon-theme="v2"';

const escapeHtml = (value) => String(value == null ? '' : value).replace(/[&<>"']/g, (c) => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
}[c]));

const resolveLogoUrl = (logoUrl) => {
  if (!logoUrl) return null;
  if (/^https?:\/\//i.test(logoUrl)) return logoUrl;
  const base = (process.env.FRONTEND_URL || 'https://portalempleado.xyoncloud.win')
    .split(',')[0]
    .trim()
    .replace(/\/$/, '');
  return `${base}${logoUrl.startsWith('/') ? '' : '/'}${logoUrl}`;
};

/**
 * Marca de la app (nombre de empresa + logo) desde GlobalSettings.
 */
const getBranding = async () => {
  try {
    const settings = await prisma.globalSettings.findMany({
      where: { key: { in: ['companyName', 'logoUrl'] } },
    });
    const map = settings.reduce((acc, s) => { acc[s.key] = s.value; return acc; }, {});
    const storedLogo = map.logoUrl && map.logoUrl !== '/default-logo.png' ? map.logoUrl : null;
    return {
      companyName: map.companyName || 'Xyon',
      logoUrl: resolveLogoUrl(storedLogo),
    };
  } catch (error) {
    console.warn('⚠️ [EMAIL] Could not load branding, using defaults:', error.message);
    return { companyName: 'Xyon', logoUrl: null };
  }
};

/**
 * Píldora de acento (badge) sobre el título.
 */
const renderBadge = (label, accentSoft, accentInk) => `
  <div style="display:inline-block;background:${accentSoft};color:${accentInk};font-family:${FONT};font-size:11px;font-weight:800;letter-spacing:0.08em;text-transform:uppercase;padding:6px 14px;border-radius:9999px;margin-bottom:16px;">
    ${escapeHtml(label)}
  </div>`;

/**
 * Párrafo estándar del cuerpo.
 */
const renderParagraph = (html) => `
  <p style="margin:0 0 14px;font-family:${FONT};font-size:15px;line-height:1.6;color:${COLORS.slate700};">${html}</p>`;

/**
 * Caja de datos con borde ink y esquinas de control (16px).
 * @param {Array<{label:string,value:string}>} rows
 */
const renderInfoBox = (rows) => {
  const body = rows.map((row) => `
      <tr>
        <td style="padding:6px 0;font-family:${FONT};font-size:13px;color:${COLORS.slate500};">${escapeHtml(row.label)}</td>
        <td align="right" style="padding:6px 0;font-family:${FONT};font-size:14px;font-weight:700;color:${COLORS.ink};">${row.value}</td>
      </tr>`).join('');
  return `
  <div style="background:${COLORS.paper};border:1.5px solid ${COLORS.ink};border-radius:16px;padding:16px 18px;margin:18px 0;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">${body}
    </table>
  </div>`;
};

/**
 * Botón CTA: píldora ink, el botón por defecto de la app.
 */
const renderButton = (label, href) => `
  <table role="presentation" cellpadding="0" cellspacing="0" style="margin:24px 0 8px;">
    <tr>
      <td align="center" bgcolor="${COLORS.ink}" style="border-radius:9999px;">
        <a href="${href}" target="_blank" style="display:inline-block;padding:14px 32px;font-family:${FONT};font-size:15px;font-weight:800;letter-spacing:-0.01em;color:${COLORS.paper};text-decoration:none;border-radius:9999px;">${escapeHtml(label)}</a>
      </td>
    </tr>
  </table>`;

/**
 * Cabecera ink con logo (si existe) + wordmark Xyon y nombre de empresa.
 */
const renderHeader = (branding) => {
  const company = escapeHtml(branding.companyName || 'Xyon');
  const logo = branding.logoUrl
    ? `<img src="${branding.logoUrl}" width="34" height="34" alt="${company}" style="width:34px;height:34px;border-radius:10px;display:inline-block;vertical-align:middle;background:${COLORS.white};border:0;">`
    : '';
  return `
    <td style="background:${COLORS.ink};border-radius:28px 28px 0 0;padding:20px 28px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <td align="left" style="vertical-align:middle;white-space:nowrap;">
            ${logo}
            <span style="display:inline-block;vertical-align:middle;${logo ? 'margin-left:10px;' : ''}font-family:${DISPLAY};font-weight:900;font-size:20px;letter-spacing:-0.04em;color:${COLORS.paper};">Xyon</span>
          </td>
          <td align="right" style="vertical-align:middle;font-family:${FONT};font-size:12px;font-weight:600;color:${COLORS.slate300};">${company}</td>
        </tr>
      </table>
    </td>`;
};

/**
 * Renderiza un correo completo con el diseño de la app.
 * @param {object} opts
 * @param {object} [opts.branding] - { companyName, logoUrl }
 * @param {string} [opts.accent] - color de la franja de acento (default lime)
 * @param {string} [opts.accentSoft] - fondo del badge
 * @param {string} [opts.accentInk] - texto del badge
 * @param {string} [opts.badge] - texto del badge (opcional)
 * @param {string} opts.title - titular del correo
 * @param {string} [opts.intro] - párrafo introductorio (HTML)
 * @param {string} [opts.content] - cuerpo adicional (HTML)
 * @param {{label:string,href:string}} [opts.cta] - botón de acción
 * @param {string} [opts.preheader] - texto de previsualización oculto
 * @param {string} [opts.footerNote] - nota del pie
 */
const renderEmail = ({
  branding = {},
  accent = COLORS.lime,
  accentSoft = COLORS.limeSoft,
  accentInk = COLORS.limeInk,
  badge,
  title,
  intro,
  content = '',
  cta = null,
  preheader = '',
  footerNote = 'Este es un mensaje automático del sistema de gestión de empleados.',
}) => {
  const brand = escapeHtml(branding.companyName || 'Xyon');
  const badgeHtml = badge ? renderBadge(badge, accentSoft, accentInk) : '';
  const introHtml = intro ? renderParagraph(intro) : '';
  const ctaHtml = cta ? renderButton(cta.label, cta.href) : '';
  const preheaderHtml = preheader
    ? `<div style="display:none;font-size:1px;color:${COLORS.paper};line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;">${escapeHtml(preheader)}</div>`
    : '';

  return `<!DOCTYPE html>
<html lang="es" ${THEME_MARKER}>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="light">
<title>${escapeHtml(title)}</title>
</head>
<body style="margin:0;padding:0;background:${COLORS.paper};">
${preheaderHtml}
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${COLORS.paper};">
  <tr>
    <td align="center" style="padding:32px 14px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="width:100%;max-width:600px;">
        <tr>
          <td>
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="width:100%;border-collapse:separate;">
              <tr>${renderHeader(branding)}</tr>
              <tr><td style="height:6px;line-height:6px;font-size:0;background:${accent};">&nbsp;</td></tr>
              <tr>
                <td style="background:${COLORS.white};border:1.5px solid ${COLORS.ink};border-top:0;border-radius:0 0 28px 28px;box-shadow:4px 4px 0 0 ${COLORS.ink};padding:30px 28px;">
                  ${badgeHtml}
                  <h1 style="margin:0 0 16px;font-family:${DISPLAY};font-weight:900;font-size:24px;line-height:1.15;letter-spacing:-0.03em;color:${COLORS.ink};">${title}</h1>
                  ${introHtml}
                  ${content}
                  ${ctaHtml}
                </td>
              </tr>
            </table>
          </td>
        </tr>
        <tr>
          <td style="padding:20px 10px 4px;text-align:center;font-family:${FONT};font-size:12px;line-height:1.6;color:${COLORS.slate500};">
            ${footerNote}<br>
            <span style="color:${COLORS.slate400};">${brand}</span>
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>
</body>
</html>`;
};

/**
 * ¿La plantilla guardada es una versión legacy sin tematizar?
 * Se usa para migrar plantillas por defecto antiguas sin pisar personalizaciones
 * que ya hayan dejado de usar la firma legacy.
 */
const isLegacyDefault = (html) => {
  if (!html) return true;
  if (html.includes(THEME_MARKER)) return false;
  return /font-family:\s*Arial/i.test(html) || /mensaje automático del sistema/i.test(html);
};

module.exports = {
  COLORS,
  FONT,
  DISPLAY,
  THEME_MARKER,
  escapeHtml,
  getBranding,
  renderBadge,
  renderParagraph,
  renderInfoBox,
  renderButton,
  renderEmail,
  isLegacyDefault,
};

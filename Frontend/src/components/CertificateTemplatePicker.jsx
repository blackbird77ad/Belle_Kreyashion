import { CheckCircle, Eye } from 'lucide-react';
import { getCertificateLayoutLabel } from '../data/certificateLayouts';

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

const getTemplateKey = (template = {}) => template._id || template.presetKey || template.name || '';

const Medal = ({ accentColor, primaryColor, className = '' }) => (
  <div
    className={`absolute ${className}`}
    style={{
      width: '18%',
      aspectRatio: '1 / 1.2',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'flex-start',
      pointerEvents: 'none',
    }}
  >
    <div
      style={{
        width: '72%',
        aspectRatio: '1 / 1',
        borderRadius: '999px',
        background: `radial-gradient(circle at 30% 30%, ${rgba('#FFFFFF', 0.65)}, transparent 42%), linear-gradient(135deg, ${accentColor}, ${primaryColor})`,
        border: `2px solid ${rgba(primaryColor, 0.5)}`,
      }}
    />
    <div style={{ display: 'flex', gap: '6%', marginTop: '-2%' }}>
      <div
        style={{
          width: '20%',
          height: '42%',
          clipPath: 'polygon(50% 0, 100% 100%, 0 76%)',
          background: primaryColor,
        }}
      />
      <div
        style={{
          width: '20%',
          height: '42%',
          clipPath: 'polygon(50% 0, 100% 76%, 0 100%)',
          background: accentColor,
        }}
      />
    </div>
  </div>
);

const PreviewDecorations = ({ layout, primaryColor, accentColor, backgroundColor, fontColor }) => {
  const faintLine = rgba(fontColor, 0.16);
  const faintAccent = rgba(accentColor, 0.18);
  const primaryGlow = rgba(primaryColor, 0.14);

  if (layout === 'certificate_of_completion_2') {
    return (
      <>
        <div
          className="absolute inset-[5%]"
          style={{
            clipPath: 'polygon(8% 0, 92% 0, 100% 8%, 100% 92%, 92% 100%, 8% 100%, 0 92%, 0 8%)',
            border: `3px solid ${primaryColor}`,
          }}
        />
        <div
          className="absolute inset-[8.2%]"
          style={{
            clipPath: 'polygon(8% 0, 92% 0, 100% 8%, 100% 92%, 92% 100%, 8% 100%, 0 92%, 0 8%)',
            border: `1.5px solid ${faintAccent}`,
          }}
        />
        {[
          'left-[8%] top-[8%] w-[12%] h-[8%]',
          'right-[8%] top-[8%] w-[12%] h-[8%]',
          'left-[8%] bottom-[8%] w-[12%] h-[8%]',
          'right-[8%] bottom-[8%] w-[12%] h-[8%]',
        ].map((className) => (
          <div
            key={className}
            className={`absolute ${className}`}
            style={{ border: `1px solid ${faintLine}` }}
          />
        ))}
      </>
    );
  }

  if (layout === 'certificate_of_excellence') {
    return (
      <>
        <div className="absolute inset-[5%]" style={{ border: `2px solid ${rgba(fontColor, 0.45)}` }} />
        <div className="absolute inset-[7.5%]" style={{ border: `1px solid ${rgba(fontColor, 0.2)}` }} />
        <div className="absolute left-[-7%] top-[20%] h-[64%] w-[20%] -rotate-[22deg]" style={{ background: primaryColor }} />
        <div className="absolute left-[-2%] top-[16%] h-[72%] w-[12%] -rotate-[22deg]" style={{ background: accentColor }} />
        <div className="absolute right-[-7%] top-[18%] h-[70%] w-[22%] rotate-[24deg]" style={{ background: primaryColor }} />
        <div className="absolute right-[1%] top-[8%] h-[78%] w-[12%] rotate-[24deg]" style={{ background: rgba(accentColor, 0.6) }} />
        <Medal accentColor={accentColor} primaryColor={primaryColor} className="left-[7%] top-[16%]" />
      </>
    );
  }

  if (layout === 'blank_diploma_certificate_template_02') {
    return (
      <>
        <div className="absolute inset-0" style={{ background: backgroundColor }} />
        <div className="absolute left-[-6%] top-[-4%] h-[24%] w-[48%] rotate-[-10deg] rounded-[999px]" style={{ background: primaryColor, boxShadow: `0 0 24px ${primaryGlow}` }} />
        <div className="absolute left-[18%] top-[-1%] h-[18%] w-[38%] rotate-[-10deg] rounded-[999px]" style={{ background: rgba(primaryColor, 0.18) }} />
        <div className="absolute right-[-4%] bottom-[-3%] h-[22%] w-[44%] rotate-[10deg] rounded-[999px]" style={{ background: primaryColor, boxShadow: `0 0 24px ${primaryGlow}` }} />
        <div className="absolute right-[18%] bottom-[0%] h-[16%] w-[32%] rotate-[10deg] rounded-[999px]" style={{ background: rgba(primaryColor, 0.18) }} />
        <Medal accentColor={accentColor} primaryColor={primaryColor} className="right-[8%] top-[6%]" />
      </>
    );
  }

  if (layout === 'certificate_of_achievement_3_simple') {
    return (
      <>
        <div className="absolute inset-[6%]" style={{ background: rgba(backgroundColor, 0.92), border: `1px solid ${rgba(fontColor, 0.12)}` }} />
        <div className="absolute left-[-2%] top-[-5%] h-[34%] w-[24%] -rotate-[20deg]" style={{ background: primaryColor }} />
        <div className="absolute left-[7%] top-[-3%] h-[28%] w-[5%] -rotate-[20deg]" style={{ background: accentColor }} />
        <div className="absolute right-[-1%] bottom-[-4%] h-[34%] w-[24%] rotate-[18deg]" style={{ background: primaryColor }} />
        <div className="absolute right-[9%] bottom-[-2%] h-[28%] w-[5%] rotate-[18deg]" style={{ background: accentColor }} />
        <Medal accentColor={accentColor} primaryColor={primaryColor} className="right-[8%] top-[6%]" />
      </>
    );
  }

  if (layout === 'certificate_of_achievement_2') {
    return (
      <>
        <div className="absolute inset-[4%]" style={{ border: `5px solid ${primaryColor}` }} />
        <div className="absolute inset-[7.5%]" style={{ border: `2px solid ${rgba(fontColor, 0.18)}` }} />
        <div className="absolute left-[8%] top-0 h-[100%] w-[3%]" style={{ background: primaryColor }} />
        <div className="absolute left-[13%] top-0 h-[100%] w-[2%]" style={{ background: rgba(primaryColor, 0.6) }} />
        <div className="absolute right-[18%] top-[-6%] h-[40%] w-[8%] rotate-[26deg]" style={{ background: primaryColor }} />
        <div className="absolute right-[13%] top-[-8%] h-[38%] w-[4%] rotate-[26deg]" style={{ background: accentColor }} />
        <div className="absolute right-[9%] top-[-10%] h-[34%] w-[3%] rotate-[26deg]" style={{ background: rgba(accentColor, 0.65) }} />
        <div className="absolute left-[9%] bottom-[-7%] h-[36%] w-[6%] -rotate-[26deg]" style={{ background: primaryColor }} />
        <div className="absolute left-[14%] bottom-[-8%] h-[34%] w-[3%] -rotate-[26deg]" style={{ background: accentColor }} />
        <Medal accentColor={accentColor} primaryColor={primaryColor} className="left-[41%] bottom-[8%]" />
      </>
    );
  }

  if (layout === 'certificate_of_achievement_1') {
    return (
      <>
        <div className="absolute inset-[5%]" style={{ border: `2px solid ${rgba(primaryColor, 0.8)}` }} />
        <div className="absolute inset-[8%]" style={{ border: `1px solid ${rgba(accentColor, 0.35)}` }} />
        <div className="absolute left-[-4%] top-[-4%] h-[30%] w-[24%] -rotate-[18deg]" style={{ background: primaryColor }} />
        <div className="absolute left-[8%] top-[-3%] h-[28%] w-[4%] -rotate-[18deg]" style={{ background: accentColor }} />
        <div className="absolute right-[-3%] bottom-[-4%] h-[30%] w-[24%] rotate-[18deg]" style={{ background: primaryColor }} />
        <div className="absolute right-[9%] bottom-[-3%] h-[28%] w-[4%] rotate-[18deg]" style={{ background: accentColor }} />
        <Medal accentColor={accentColor} primaryColor={primaryColor} className="right-[10%] top-[10%]" />
      </>
    );
  }

  if (layout === 'certificate_of_excellence_1') {
    return (
      <>
        <div className="absolute inset-[5%]" style={{ border: `2px solid ${rgba(primaryColor, 0.85)}` }} />
        <div className="absolute inset-[7.5%]" style={{ border: `1px solid ${rgba(fontColor, 0.16)}` }} />
        <div className="absolute right-[-6%] top-[-10%] h-[58%] w-[18%] rotate-[24deg]" style={{ background: primaryColor }} />
        <div className="absolute right-[1%] top-[-11%] h-[58%] w-[8%] rotate-[24deg]" style={{ background: rgba(primaryColor, 0.55) }} />
        <div className="absolute right-[8%] top-[-10%] h-[56%] w-[6%] rotate-[24deg]" style={{ background: accentColor }} />
        <div className="absolute left-[-6%] bottom-[-10%] h-[56%] w-[16%] -rotate-[24deg]" style={{ background: accentColor }} />
        <div className="absolute left-[5%] bottom-[-10%] h-[54%] w-[7%] -rotate-[24deg]" style={{ background: rgba(primaryColor, 0.55) }} />
        <Medal accentColor={accentColor} primaryColor={primaryColor} className="left-[8%] top-[14%]" />
      </>
    );
  }

  return (
    <>
      <div className="absolute inset-[5%] rounded-[1rem]" style={{ border: `4px solid ${primaryColor}` }} />
      <div
        className="absolute inset-[9%] rounded-[0.9rem]"
        style={{
          border:
            layout === 'double'
              ? `3px double ${rgba(primaryColor, 0.45)}`
              : layout === 'soft'
                ? `1.5px solid ${rgba(accentColor, 0.45)}`
                : `1px solid ${rgba(primaryColor, 0.16)}`,
        }}
      />
      {layout === 'soft' && (
        <>
          <div className="absolute left-[5%] top-[5%] h-[26%] w-[32%] rounded-full" style={{ background: rgba(accentColor, 0.1) }} />
          <div className="absolute right-[7%] bottom-[7%] h-[22%] w-[26%] rounded-full" style={{ background: rgba(primaryColor, 0.08) }} />
        </>
      )}
      {layout === 'minimal' && (
        <div className="absolute left-[8%] top-[8%] h-[10%] w-[16%]" style={{ borderTop: `2px solid ${accentColor}`, borderLeft: `2px solid ${accentColor}` }} />
      )}
    </>
  );
};

export const CertificateTemplatePreview = ({ template = {}, compact = false }) => {
  const primaryColor = sanitizeColor(template.primaryColor, '#111827');
  const accentColor = sanitizeColor(template.accentColor, '#FDC700');
  const backgroundColor = sanitizeColor(template.backgroundColor, '#FFFDF7');
  const fontColor = sanitizeColor(template.fontColor, '#374151');
  const layout = template.frameStyle || 'classic';
  const title = template.certificateTitle || 'Certificate of Completion';
  const subtitle = template.certificateSubtitle || 'Presented with distinction';

  return (
    <div
      className={`relative overflow-hidden rounded-[1.15rem] border border-gray-200 bg-white shadow-sm ${compact ? 'aspect-[1.5/1] p-2' : 'aspect-[1.56/1] p-2.5 sm:p-3'}`}
      style={{
        background: `linear-gradient(180deg, ${rgba(backgroundColor, 0.98)}, ${backgroundColor})`,
        fontFamily: fontStack(template.fontFamily || 'classic_serif'),
      }}
    >
      <PreviewDecorations
        layout={layout}
        primaryColor={primaryColor}
        accentColor={accentColor}
        backgroundColor={backgroundColor}
        fontColor={fontColor}
      />
      <div className="relative z-10 flex h-full flex-col justify-between">
        <div className="text-center px-[8%] pt-[4%]">
          <p className={`${compact ? 'text-[0.44rem]' : 'text-[0.56rem]'} font-extrabold uppercase tracking-[0.3em]`} style={{ color: accentColor }}>
            Certificate
          </p>
          <p
            className={`${compact ? 'mt-1 text-[0.72rem]' : 'mt-1.5 text-[0.96rem] sm:text-[1.05rem]'} font-black uppercase leading-none`}
            style={{ color: primaryColor }}
          >
            {title}
          </p>
          <p className={`${compact ? 'mt-1 text-[0.42rem]' : 'mt-1.5 text-[0.5rem] sm:text-[0.54rem]'} uppercase tracking-[0.18em]`} style={{ color: accentColor }}>
            {subtitle}
          </p>
        </div>

        <div className="text-center px-[12%]">
          <p className={`${compact ? 'text-[0.44rem]' : 'text-[0.52rem]'} font-bold uppercase tracking-[0.2em] text-gray-400`}>Awarded To</p>
          <p className={`${compact ? 'mt-1 text-[0.84rem]' : 'mt-1.5 text-[1.05rem] sm:text-[1.12rem]'} font-black leading-none`} style={{ color: primaryColor }}>
            Learner Name
          </p>
          <div className={`mx-auto ${compact ? 'mt-1.5' : 'mt-2'} h-px w-[58%]`} style={{ background: rgba(primaryColor, 0.28) }} />
          <p className={`${compact ? 'mt-1.5 text-[0.38rem]' : 'mt-2 text-[0.48rem] sm:text-[0.5rem]'} leading-relaxed`} style={{ color: fontColor }}>
            {template.certificateBody || 'For excellence, completion and practical achievement in the selected programme.'}
          </p>
        </div>

        <div className="flex items-end justify-between px-[10%] pb-[6%]">
          <div className="w-[28%]">
            <div className="h-px w-full" style={{ background: rgba(primaryColor, 0.38) }} />
            <p className={`${compact ? 'mt-1 text-[0.34rem]' : 'mt-1 text-[0.42rem] sm:text-[0.44rem]'} font-bold uppercase tracking-[0.12em]`} style={{ color: fontColor }}>Signature</p>
          </div>
          <div className="w-[24%] text-center">
            <div className={`${compact ? 'h-[0.28rem] w-[0.28rem]' : 'h-[0.38rem] w-[0.38rem]'} mx-auto rounded-full`} style={{ background: accentColor }} />
          </div>
          <div className="w-[28%] text-right">
            <div className="ml-auto h-px w-full" style={{ background: rgba(primaryColor, 0.38) }} />
            <p className={`${compact ? 'mt-1 text-[0.34rem]' : 'mt-1 text-[0.42rem] sm:text-[0.44rem]'} font-bold uppercase tracking-[0.12em]`} style={{ color: fontColor }}>Date</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default function CertificateTemplatePicker({
  templates = [],
  selectedId = '',
  appliedId = '',
  onSelect,
  onPreview,
  onApply,
  applyLabel = 'Use This Template',
  emptyMessage = 'No certificate templates yet.',
  compact = true,
  gridClassName = 'grid gap-3 md:grid-cols-2',
}) {
  if (!templates.length) {
    return (
      <div className="rounded-2xl border border-dashed border-gray-200 bg-white px-4 py-5 text-xs text-gray-500">
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className={gridClassName}>
      {templates.map((template) => {
        const templateKey = getTemplateKey(template);
        const selected = templateKey === selectedId;
        const applied = templateKey === appliedId;
        return (
          <div
            key={templateKey}
            role="button"
            tabIndex={0}
            onClick={() => onSelect?.(template)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                onSelect?.(template);
              }
            }}
            className={`rounded-[1.4rem] border bg-white p-2.5 sm:p-3 text-left shadow-sm transition-all cursor-pointer ${
              selected
                ? 'border-black ring-2 ring-black/5'
                : 'border-gray-200 hover:border-black/50'
            }`}
          >
            <CertificateTemplatePreview template={template} compact={compact} />
            <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
              <span className={`rounded-full px-2 py-1 text-[10px] font-bold uppercase tracking-[0.16em] ${
                template.isPreset
                  ? 'bg-blue-50 text-blue-700'
                  : 'bg-gray-100 text-gray-600'
              }`}>
                {template.isPreset ? 'Preset' : 'Saved'}
              </span>
              {applied && (
                <span className="inline-flex items-center gap-1 rounded-full bg-green-50 px-2 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-green-700">
                  <CheckCircle size={11} />
                  Applied
                </span>
              )}
              {!applied && selected && (
                <span className="rounded-full bg-amber-50 px-2 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-amber-700">
                  Selected
                </span>
              )}
            </div>
            <p className="mt-2.5 text-[13px] sm:text-sm font-extrabold text-gray-900 line-clamp-2">{template.name}</p>
            <p className="mt-1 text-[10px] font-bold uppercase tracking-[0.14em] text-gray-400">
              {getCertificateLayoutLabel(template.frameStyle || 'classic')}
            </p>
            <p className="mt-1.5 text-[11px] sm:text-xs text-gray-500 line-clamp-2">
              {template.certificateTitle || template.productName || 'Certificate'}
              {template.organizerName ? ` | ${template.organizerName}` : ''}
            </p>
            <div className="mt-2.5 flex items-center gap-1.5">
              {[template.primaryColor, template.accentColor, template.backgroundColor, template.fontColor].map((color, index) => (
                <span
                  key={`${templateKey}-${index}`}
                  className="h-3.5 w-3.5 rounded-full border border-gray-200"
                  style={{ backgroundColor: sanitizeColor(color, ['#111827', '#FDC700', '#FFFDF7', '#374151'][index]) }}
                />
              ))}
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {onPreview && (
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    onPreview(template);
                  }}
                  className="inline-flex items-center justify-center gap-1 rounded-xl border border-gray-200 bg-white px-2.5 py-1.5 text-[10px] sm:text-[11px] font-bold text-gray-700 hover:border-black hover:text-black"
                >
                  <Eye size={12} />
                  Preview
                </button>
              )}
              {onApply && (
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    onApply(template);
                  }}
                  className={`inline-flex items-center justify-center rounded-xl px-2.5 py-1.5 text-[10px] sm:text-[11px] font-bold ${
                    applied
                      ? 'bg-green-50 text-green-700 border border-green-200'
                      : 'bg-black text-white hover:bg-gray-900'
                  }`}
                >
                  {applied ? 'Applied' : applyLabel}
                </button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

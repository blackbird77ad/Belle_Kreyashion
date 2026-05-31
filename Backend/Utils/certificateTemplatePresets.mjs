export const CERTIFICATE_FRAME_STYLES = [
  'classic',
  'double',
  'soft',
  'minimal',
  'certificate_of_achievement_1',
  'certificate_of_excellence_1',
  'certificate_of_completion_2',
  'certificate_of_excellence',
  'blank_diploma_certificate_template_02',
  'certificate_of_achievement_2',
  'certificate_of_achievement_3_simple',
];

export const sanitizeCertificateFrameStyle = (value = '', fallback = 'classic') => (
  CERTIFICATE_FRAME_STYLES.includes(value) ? value : fallback
);

export const normalizeCertificateTemplateNameKey = (value = '') => String(value || '')
  .trim()
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, '');

export const CERTIFICATE_TEMPLATE_PRESETS = [
  {
    presetKey: 'certificate_of_achievement_1',
    name: 'Certificate of Achievement1',
    productName: '',
    certificateTitle: 'Certificate of Achievement',
    certificateSubtitle: 'Presented with distinction',
    certificateBody: 'For outstanding achievement, practical growth, and successful completion of the programme requirements.',
    primaryColor: '#5B0F26',
    accentColor: '#E2B956',
    backgroundColor: '#FFFDF8',
    fontColor: '#1F2937',
    fontFamily: 'classic_serif',
    frameStyle: 'certificate_of_achievement_1',
    issueDate: null,
    organizerName: 'Belle Kreyashon Academy',
    sponsors: [],
    signatories: [],
    notes: 'Preset template inspired by the Certificate of Achievement1 reference.',
    createdBy: 'system',
    isPreset: true,
  },
  {
    presetKey: 'certificate_of_excellence_1',
    name: 'Certificate of Excellence1',
    productName: '',
    certificateTitle: 'Certificate of Excellence',
    certificateSubtitle: 'Award of distinction',
    certificateBody: 'For exceptional performance, professional excellence, and a strong demonstration of mastery.',
    primaryColor: '#163E77',
    accentColor: '#D02A2A',
    backgroundColor: '#F8FAFC',
    fontColor: '#111827',
    fontFamily: 'modern_sans',
    frameStyle: 'certificate_of_excellence_1',
    issueDate: null,
    organizerName: 'Belle Kreyashon Academy',
    sponsors: [],
    signatories: [],
    notes: 'Preset template inspired by the Certificate of Excellence1 reference.',
    createdBy: 'system',
    isPreset: true,
  },
  {
    presetKey: 'certificate_of_completion_2',
    name: 'Certificate of completion2',
    productName: '',
    certificateTitle: 'Certificate of Completion',
    certificateSubtitle: 'Achievement unlocked',
    certificateBody: 'For successfully completing the learning programme and meeting the required standard of participation.',
    primaryColor: '#B9845F',
    accentColor: '#D8B48A',
    backgroundColor: '#FFFDF8',
    fontColor: '#111827',
    fontFamily: 'formal_serif',
    frameStyle: 'certificate_of_completion_2',
    issueDate: null,
    organizerName: 'Belle Kreyashon Academy',
    sponsors: [],
    signatories: [],
    notes: 'Preset template inspired by the Certificate of completion2 reference.',
    createdBy: 'system',
    isPreset: true,
  },
  {
    presetKey: 'certificate_of_excellence',
    name: 'Certificate-of-Excellence',
    productName: '',
    certificateTitle: 'Certificate of Excellence',
    certificateSubtitle: 'This diploma is given to',
    certificateBody: 'For completing the course programme with focus, discipline, and a consistent standard of excellence.',
    primaryColor: '#1E40AF',
    accentColor: '#DC2626',
    backgroundColor: '#E5E7EB',
    fontColor: '#111827',
    fontFamily: 'modern_sans',
    frameStyle: 'certificate_of_excellence',
    issueDate: null,
    organizerName: 'Belle Kreyashon Academy',
    sponsors: [],
    signatories: [],
    notes: 'Preset template inspired by the Certificate-of-Excellence reference.',
    createdBy: 'system',
    isPreset: true,
  },
  {
    presetKey: 'blank_diploma_certificate_template_02',
    name: 'Blank-Diploma-Certificate-Template-02',
    productName: '',
    certificateTitle: 'Diploma Certificate',
    certificateSubtitle: 'Presented to honour achievement',
    certificateBody: 'For extraordinary dedication, practical excellence, and committed participation throughout the programme.',
    primaryColor: '#2F9E44',
    accentColor: '#D8A83C',
    backgroundColor: '#FFFFFF',
    fontColor: '#111827',
    fontFamily: 'modern_sans',
    frameStyle: 'blank_diploma_certificate_template_02',
    issueDate: null,
    organizerName: 'Belle Kreyashon Academy',
    sponsors: [],
    signatories: [],
    notes: 'Preset template inspired by the Blank-Diploma-Certificate-Template-02 reference.',
    createdBy: 'system',
    isPreset: true,
  },
  {
    presetKey: 'certificate_of_achievement_2',
    name: 'Certificate of Achievement2',
    productName: '',
    certificateTitle: 'Certificate of Achievement',
    certificateSubtitle: 'Awarded for successful completion',
    certificateBody: 'For dedicated effort, achievement, and strong practical completion of the programme requirements.',
    primaryColor: '#0F4C81',
    accentColor: '#F5C542',
    backgroundColor: '#F8FAFC',
    fontColor: '#111827',
    fontFamily: 'formal_serif',
    frameStyle: 'certificate_of_achievement_2',
    issueDate: null,
    organizerName: 'Belle Kreyashon Academy',
    sponsors: [],
    signatories: [],
    notes: 'Preset template inspired by the Certificate of Achievement2 reference.',
    createdBy: 'system',
    isPreset: true,
  },
  {
    presetKey: 'certificate_of_achievement_3_simple',
    name: 'Certificate of Achievement3-simple',
    productName: '',
    certificateTitle: 'Certificate of Achievement',
    certificateSubtitle: 'Recognition of success',
    certificateBody: 'For successfully completing the programme and demonstrating practical growth, commitment, and excellence.',
    primaryColor: '#6D0F24',
    accentColor: '#E5B14A',
    backgroundColor: '#FFFDFB',
    fontColor: '#1F2937',
    fontFamily: 'classic_serif',
    frameStyle: 'certificate_of_achievement_3_simple',
    issueDate: null,
    organizerName: 'Belle Kreyashon Academy',
    sponsors: [],
    signatories: [],
    notes: 'Preset template inspired by the Certificate of Achievement3-simple reference.',
    createdBy: 'system',
    isPreset: true,
  },
];

const PRESET_BY_KEY = new Map();
const PRESET_BY_NAME = new Map();
const PRESET_BY_FRAME_STYLE = new Map();

CERTIFICATE_TEMPLATE_PRESETS.forEach((preset) => {
  PRESET_BY_KEY.set(preset.presetKey, preset);
  PRESET_BY_FRAME_STYLE.set(preset.frameStyle, preset);
  PRESET_BY_NAME.set(normalizeCertificateTemplateNameKey(preset.name), preset);
});

export const resolveCertificateTemplatePresetKey = (template = {}) => {
  const explicitPresetKey = String(template.presetKey || '').trim();
  if (explicitPresetKey && PRESET_BY_KEY.has(explicitPresetKey)) return explicitPresetKey;

  const frameStyle = String(template.frameStyle || '').trim();
  if (frameStyle && PRESET_BY_FRAME_STYLE.has(frameStyle)) {
    return PRESET_BY_FRAME_STYLE.get(frameStyle)?.presetKey || '';
  }

  const normalizedName = normalizeCertificateTemplateNameKey(template.name || '');
  if (normalizedName && PRESET_BY_NAME.has(normalizedName)) {
    return PRESET_BY_NAME.get(normalizedName)?.presetKey || '';
  }

  return '';
};

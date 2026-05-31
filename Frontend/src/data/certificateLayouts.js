export const CERTIFICATE_LAYOUT_OPTIONS = [
  {
    value: 'classic',
    label: 'Classic frame',
    description: 'Traditional centered certificate with a formal border.',
  },
  {
    value: 'double',
    label: 'Double frame',
    description: 'Structured double-line border with a polished formal feel.',
  },
  {
    value: 'soft',
    label: 'Soft rounded',
    description: 'Rounded presentation with gentler edges and lighter emphasis.',
  },
  {
    value: 'minimal',
    label: 'Minimal frame',
    description: 'Simple clean layout with subtle framing.',
  },
  {
    value: 'certificate_of_achievement_1',
    label: 'Certificate of Achievement1',
    description: 'Luxury achievement layout with deep corner accents and a warm medal tone.',
  },
  {
    value: 'certificate_of_excellence_1',
    label: 'Certificate of Excellence1',
    description: 'Bold excellence layout with layered ribbons and executive framing.',
  },
  {
    value: 'certificate_of_completion_2',
    label: 'Certificate of completion2',
    description: 'Elegant geometric frame with clipped corners and fine linework.',
  },
  {
    value: 'certificate_of_excellence',
    label: 'Certificate-of-Excellence',
    description: 'Ribbon-edge excellence layout with colorful side panels.',
  },
  {
    value: 'blank_diploma_certificate_template_02',
    label: 'Blank-Diploma-Certificate-Template-02',
    description: 'Clean diploma layout with flowing top and bottom shapes.',
  },
  {
    value: 'certificate_of_achievement_2',
    label: 'Certificate of Achievement2',
    description: 'Award-stage layout with layered blue borders and diagonal accents.',
  },
  {
    value: 'certificate_of_achievement_3_simple',
    label: 'Certificate of Achievement3-simple',
    description: 'Simple achievement layout with confident corner bands.',
  },
];

export const CERTIFICATE_LAYOUT_VALUES = CERTIFICATE_LAYOUT_OPTIONS.map((option) => option.value);

export const getCertificateLayoutOption = (value = 'classic') => (
  CERTIFICATE_LAYOUT_OPTIONS.find((option) => option.value === value)
  || CERTIFICATE_LAYOUT_OPTIONS[0]
);

export const getCertificateLayoutLabel = (value = 'classic') => (
  getCertificateLayoutOption(value).label
);

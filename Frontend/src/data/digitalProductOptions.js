export const DIGITAL_TYPE_OPTIONS = [
  { value: 'all', label: 'All Types' },
  { value: 'document', label: 'Documents' },
  { value: 'video', label: 'Videos' },
  { value: 'audio', label: 'Audio' },
  { value: 'template', label: 'Templates' },
  { value: 'bundle', label: 'Bundles' },
  { value: 'mixed', label: 'Mixed Packs' },
  { value: 'other', label: 'Other' },
];

export const DIGITAL_SKILL_LEVEL_OPTIONS = [
  { value: 'all', label: 'All Skill Levels' },
  { value: 'beginner', label: 'Beginner' },
  { value: 'intermediate', label: 'Intermediate' },
  { value: 'advanced', label: 'Advanced' },
  { value: 'all-levels', label: 'All Levels' },
];

export const DIGITAL_FORMAT_OPTIONS = [
  { value: 'all', label: 'All Formats' },
  { value: 'video-course', label: 'Video Course' },
  { value: 'text-tutorial', label: 'Text Tutorial' },
  { value: 'interactive-code', label: 'Interactive Code' },
  { value: 'audio-podcast', label: 'Audio/Podcast' },
  { value: 'mixed-bundle', label: 'Mixed Bundle' },
];

export const DIGITAL_DURATION_OPTIONS = [
  { value: 'all', label: 'Any Duration' },
  { value: 'under-1-hour', label: 'Under 1 Hour' },
  { value: '1-3-hours', label: '1-3 Hours' },
  { value: '3-10-hours', label: '3-10 Hours' },
  { value: '10-plus-hours', label: '10+ Hours' },
];

export const DIGITAL_TOPIC_OPTIONS = [
  { value: 'coding', label: 'Coding' },
  { value: 'design', label: 'Design' },
  { value: 'marketing', label: 'Marketing' },
  { value: 'business', label: 'Business' },
  { value: 'educational', label: 'Educational' },
];

export const DIGITAL_INCLUSION_OPTIONS = [
  { value: 'certification', label: 'Certification' },
  { value: 'downloadable-assets', label: 'Downloadable Assets' },
  { value: 'source-code', label: 'Source Code' },
  { value: 'quizzes', label: 'Quizzes' },
  { value: 'free-guidance', label: 'Free Guidance' },
];

export const DIGITAL_PRICE_TYPE_OPTIONS = [
  { value: 'all', label: 'Any Price Type' },
  { value: 'free', label: 'Free' },
  { value: 'trial', label: 'Free Trial + Subscription' },
  { value: 'paid', label: 'Paid' },
];

export const getDigitalOptionLabel = (options, value, fallback = '') => (
  options.find((option) => option.value === value)?.label || fallback
);

export const CONTACT_NUMBERS = [
  { local: '0594038888', intl: '+233594038888', whatsapp: '233594038888' },
  { local: '0544930276', intl: '+233544930276', whatsapp: '233544930276' },
];

export const WHATSAPP = CONTACT_NUMBERS[0].whatsapp;
export const PHONE = CONTACT_NUMBERS[0].intl;
export const PHONE_LOCAL = CONTACT_NUMBERS[0].local;
export const SECONDARY_WHATSAPP = CONTACT_NUMBERS[1].whatsapp;
export const SECONDARY_PHONE = CONTACT_NUMBERS[1].intl;
export const SECONDARY_PHONE_LOCAL = CONTACT_NUMBERS[1].local;
export const PHONE_DISPLAY = CONTACT_NUMBERS.map((item) => item.local).join(' / ');
export const FACEBOOK = 'https://facebook.com/Belle-Kreyashon-Hair';
export const LOCATION = 'Ghana';
export const BRAND    = 'Belle Kreyashon';

export const whatsappLink = (msg) => `https://wa.me/${WHATSAPP}?text=${msg}`;
export const callLink     = `tel:${PHONE}`;

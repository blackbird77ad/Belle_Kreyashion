import { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useCustomer } from './CustomerContext';

const IntlContext = createContext(null);

export const CURRENCY_OPTIONS = [
  { code: 'GHS', label: 'Ghana Cedi' },
  { code: 'USD', label: 'US Dollar' },
  { code: 'EUR', label: 'Euro' },
  { code: 'GBP', label: 'British Pound' },
  { code: 'CAD', label: 'Canadian Dollar' },
  { code: 'AUD', label: 'Australian Dollar' },
  { code: 'NGN', label: 'Nigerian Naira' },
  { code: 'ZAR', label: 'South African Rand' },
];

export const LANGUAGE_OPTIONS = [
  { code: 'en', label: 'English' },
  { code: 'fr', label: 'French' },
  { code: 'es', label: 'Spanish' },
  { code: 'pt', label: 'Portuguese' },
  { code: 'ar', label: 'Arabic' },
];

const DEFAULT_CURRENCY = 'GHS';
const DEFAULT_LANGUAGE = 'en';
const PREFERENCE_STORAGE_KEY = 'bk-intl-preferences-v1';
const RATE_CACHE_STORAGE_KEY = 'bk-intl-rates-v1';
const RATE_CACHE_TTL_MS = 12 * 60 * 60 * 1000;
const GOOGLE_TRANSLATE_CONTAINER_ID = 'bk-google-translate-element';
const GOOGLE_TRANSLATE_SCRIPT_ID = 'bk-google-translate-script';
const GOOGLE_TRANSLATE_CALLBACK_NAME = 'bkGoogleTranslateInit';

const FALLBACK_RATES = {
  GHS: 1,
  USD: 0.077,
  EUR: 0.071,
  GBP: 0.06,
  CAD: 0.105,
  AUD: 0.118,
  NGN: 121.5,
  ZAR: 1.39,
};

const LOCALE_BY_LANGUAGE = {
  en: 'en-GH',
  fr: 'fr-FR',
  es: 'es-ES',
  pt: 'pt-PT',
  ar: 'ar-EG',
};

let googleTranslateLoader = null;

const supportedCurrencyCodes = new Set(CURRENCY_OPTIONS.map((item) => item.code));
const supportedLanguageCodes = new Set(LANGUAGE_OPTIONS.map((item) => item.code));

const normalizeCurrencyCode = (value = '') => {
  const next = String(value || '').trim().toUpperCase();
  return supportedCurrencyCodes.has(next) ? next : DEFAULT_CURRENCY;
};

const normalizeLanguageCode = (value = '') => {
  const next = String(value || '').trim().toLowerCase();
  return supportedLanguageCodes.has(next) ? next : DEFAULT_LANGUAGE;
};

const getLocaleForLanguage = (languageCode = DEFAULT_LANGUAGE) => (
  LOCALE_BY_LANGUAGE[normalizeLanguageCode(languageCode)] || LOCALE_BY_LANGUAGE[DEFAULT_LANGUAGE]
);

const readStoredPreferences = () => {
  try {
    const raw = window.localStorage.getItem(PREFERENCE_STORAGE_KEY);
    if (!raw) {
      return { currency: DEFAULT_CURRENCY, language: DEFAULT_LANGUAGE };
    }
    const parsed = JSON.parse(raw);
    return {
      currency: normalizeCurrencyCode(parsed?.currency),
      language: normalizeLanguageCode(parsed?.language),
    };
  } catch {
    return { currency: DEFAULT_CURRENCY, language: DEFAULT_LANGUAGE };
  }
};

const writeStoredPreferences = (preferences) => {
  try {
    window.localStorage.setItem(PREFERENCE_STORAGE_KEY, JSON.stringify(preferences));
  } catch {
    // ignore localStorage write issues
  }
};

const readRateCache = () => {
  try {
    const raw = window.localStorage.getItem(RATE_CACHE_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed?.timestamp || !parsed?.rates) return null;
    if (Date.now() - Number(parsed.timestamp) > RATE_CACHE_TTL_MS) return null;
    return parsed;
  } catch {
    return null;
  }
};

const writeRateCache = (rates) => {
  try {
    window.localStorage.setItem(RATE_CACHE_STORAGE_KEY, JSON.stringify({
      timestamp: Date.now(),
      rates,
    }));
  } catch {
    // ignore localStorage write issues
  }
};

const sanitizeRates = (sourceRates = {}) => {
  const nextRates = { ...FALLBACK_RATES };
  CURRENCY_OPTIONS.forEach(({ code }) => {
    const rate = Number(sourceRates?.[code]);
    if (Number.isFinite(rate) && rate > 0) {
      nextRates[code] = rate;
    }
  });
  return nextRates;
};

const loadGoogleTranslateScript = () => {
  if (typeof window === 'undefined') return Promise.resolve();
  if (window.google?.translate?.TranslateElement) return Promise.resolve();
  if (googleTranslateLoader) return googleTranslateLoader;

  googleTranslateLoader = new Promise((resolve, reject) => {
    const handleReady = () => {
      if (!window.google?.translate?.TranslateElement) {
        reject(new Error('Google Translate did not load correctly.'));
        return;
      }

      if (!window.__bkGoogleTranslateInitialized) {
        const includedLanguages = LANGUAGE_OPTIONS
          .map((option) => option.code)
          .filter((code) => code !== DEFAULT_LANGUAGE)
          .join(',');

        new window.google.translate.TranslateElement(
          {
            pageLanguage: DEFAULT_LANGUAGE,
            autoDisplay: false,
            includedLanguages,
          },
          GOOGLE_TRANSLATE_CONTAINER_ID
        );
        window.__bkGoogleTranslateInitialized = true;
      }

      resolve();
    };

    window[GOOGLE_TRANSLATE_CALLBACK_NAME] = handleReady;

    const existingScript = document.getElementById(GOOGLE_TRANSLATE_SCRIPT_ID);
    if (existingScript) {
      existingScript.addEventListener('load', handleReady, { once: true });
      existingScript.addEventListener('error', () => reject(new Error('Google Translate failed to load.')), { once: true });
      return;
    }

    const script = document.createElement('script');
    script.id = GOOGLE_TRANSLATE_SCRIPT_ID;
    script.src = `https://translate.google.com/translate_a/element.js?cb=${GOOGLE_TRANSLATE_CALLBACK_NAME}`;
    script.async = true;
    script.onerror = () => reject(new Error('Google Translate failed to load.'));
    document.body.appendChild(script);
  });

  return googleTranslateLoader;
};

const triggerGoogleTranslateChange = (languageCode) => {
  const combo = document.querySelector('.goog-te-combo');
  if (!combo) return false;
  combo.value = languageCode;
  combo.dispatchEvent(new Event('change'));
  return true;
};

const applyGoogleTranslateLanguage = async (languageCode) => {
  if (languageCode === DEFAULT_LANGUAGE) {
    triggerGoogleTranslateChange(DEFAULT_LANGUAGE);
    return;
  }

  await loadGoogleTranslateScript();

  if (triggerGoogleTranslateChange(languageCode)) return;

  await new Promise((resolve, reject) => {
    let attempts = 0;
    const interval = window.setInterval(() => {
      attempts += 1;
      if (triggerGoogleTranslateChange(languageCode)) {
        window.clearInterval(interval);
        resolve();
        return;
      }
      if (attempts >= 15) {
        window.clearInterval(interval);
        reject(new Error('Translation controls were not ready in time.'));
      }
    }, 250);
  });
};

export function IntlProvider({ children }) {
  const { customer, savePreferences } = useCustomer();
  const storedPreferences = useMemo(() => readStoredPreferences(), []);
  const initialRatesCache = useMemo(() => readRateCache(), []);

  const [selectedCurrency, setSelectedCurrency] = useState(() => (
    normalizeCurrencyCode(customer?.preferredCurrency || storedPreferences.currency)
  ));
  const [selectedLanguage, setSelectedLanguage] = useState(() => (
    normalizeLanguageCode(customer?.preferredLanguage || storedPreferences.language)
  ));
  const [rates, setRates] = useState(() => sanitizeRates(initialRatesCache?.rates));
  const [ratesStatus, setRatesStatus] = useState(() => {
    if (initialRatesCache?.rates) return 'cached';
    return 'fallback';
  });
  const [ratesUpdatedAt, setRatesUpdatedAt] = useState(() => initialRatesCache?.timestamp || null);
  const [translationStatus, setTranslationStatus] = useState('idle');

  const initialCustomerSyncRef = useRef('');

  useEffect(() => {
    const nextPreferences = {
      currency: normalizeCurrencyCode(selectedCurrency),
      language: normalizeLanguageCode(selectedLanguage),
    };
    writeStoredPreferences(nextPreferences);
  }, [selectedCurrency, selectedLanguage]);

  useEffect(() => {
    if (!customer) return;

    const customerCurrency = normalizeCurrencyCode(customer.preferredCurrency || selectedCurrency);
    const customerLanguage = normalizeLanguageCode(customer.preferredLanguage || selectedLanguage);

    setSelectedCurrency(customerCurrency);
    setSelectedLanguage(customerLanguage);
    initialCustomerSyncRef.current = `${customerCurrency}|${customerLanguage}`;
  }, [customer?.id]);

  useEffect(() => {
    let cancelled = false;

    const fetchRates = async () => {
      try {
        const response = await fetch('https://open.er-api.com/v6/latest/GHS');
        const payload = await response.json();
        if (cancelled) return;
        if (payload?.result !== 'success' || !payload?.rates) {
          throw new Error('Exchange-rate response was not successful.');
        }

        const nextRates = sanitizeRates(payload.rates);
        setRates(nextRates);
        setRatesStatus('live');
        setRatesUpdatedAt(Date.now());
        writeRateCache(nextRates);
      } catch {
        if (cancelled) return;
        setRatesStatus((current) => (current === 'cached' ? current : 'fallback'));
      }
    };

    fetchRates();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!customer?.accessToken) return undefined;

    const nextSignature = `${normalizeCurrencyCode(selectedCurrency)}|${normalizeLanguageCode(selectedLanguage)}`;
    if (!initialCustomerSyncRef.current) {
      initialCustomerSyncRef.current = nextSignature;
      return undefined;
    }
    if (initialCustomerSyncRef.current === nextSignature) return undefined;

    const timer = window.setTimeout(() => {
      savePreferences({
        preferredCurrency: selectedCurrency,
        preferredLanguage: selectedLanguage,
      }).then(() => {
        initialCustomerSyncRef.current = nextSignature;
      }).catch(() => {
        // keep local preference even if remote sync fails
      });
    }, 450);

    return () => window.clearTimeout(timer);
  }, [customer?.accessToken, savePreferences, selectedCurrency, selectedLanguage]);

  useEffect(() => {
    let cancelled = false;

    const runTranslation = async () => {
      if (selectedLanguage === DEFAULT_LANGUAGE) {
        setTranslationStatus('ready');
        triggerGoogleTranslateChange(DEFAULT_LANGUAGE);
        return;
      }

      setTranslationStatus('loading');
      try {
        await applyGoogleTranslateLanguage(selectedLanguage);
        if (!cancelled) setTranslationStatus('ready');
      } catch {
        if (!cancelled) setTranslationStatus('error');
      }
    };

    runTranslation();
    return () => {
      cancelled = true;
    };
  }, [selectedLanguage]);

  const value = useMemo(() => {
    const convertFromGhs = (amount = 0, currencyCode = selectedCurrency) => {
      const baseAmount = Number(amount || 0);
      if (!Number.isFinite(baseAmount)) return 0;
      const safeCurrency = normalizeCurrencyCode(currencyCode);
      return baseAmount * Number(rates?.[safeCurrency] || 1);
    };

    const formatMoney = (amount = 0, options = {}) => {
      const baseAmount = Number(amount || 0);
      const currencyCode = normalizeCurrencyCode(options.currencyCode || selectedCurrency);
      const locale = getLocaleForLanguage(options.languageCode || selectedLanguage);
      const convertedAmount = options.fromCurrency === 'GHS' || !options.fromCurrency
        ? convertFromGhs(baseAmount, currencyCode)
        : baseAmount;

      return new Intl.NumberFormat(locale, {
        style: 'currency',
        currency: currencyCode,
        currencyDisplay: options.currencyDisplay || 'code',
        minimumFractionDigits: options.minimumFractionDigits ?? 0,
        maximumFractionDigits: options.maximumFractionDigits ?? 2,
      }).format(convertedAmount);
    };

    return {
      currencyOptions: CURRENCY_OPTIONS,
      languageOptions: LANGUAGE_OPTIONS,
      selectedCurrency,
      selectedLanguage,
      setSelectedCurrency: (currencyCode) => setSelectedCurrency(normalizeCurrencyCode(currencyCode)),
      setSelectedLanguage: (languageCode) => setSelectedLanguage(normalizeLanguageCode(languageCode)),
      formatMoney,
      formatBaseMoney: (amount = 0, options = {}) => formatMoney(amount, {
        ...options,
        currencyCode: DEFAULT_CURRENCY,
        languageCode: DEFAULT_LANGUAGE,
        fromCurrency: null,
      }),
      convertFromGhs,
      ratesStatus,
      ratesUpdatedAt,
      translationStatus,
      isConvertedDisplay: selectedCurrency !== DEFAULT_CURRENCY,
      selectedCurrencyLabel: CURRENCY_OPTIONS.find((item) => item.code === selectedCurrency)?.label || selectedCurrency,
      selectedLanguageLabel: LANGUAGE_OPTIONS.find((item) => item.code === selectedLanguage)?.label || selectedLanguage,
      ghanaCheckoutNote: selectedCurrency === DEFAULT_CURRENCY
        ? 'All payments are processed in Ghana cedis (GHS).'
        : `Displayed amounts are converted to ${selectedCurrency} for convenience. Checkout is still processed in GHS.`,
    };
  }, [rates, ratesStatus, ratesUpdatedAt, selectedCurrency, selectedLanguage, translationStatus]);

  return (
    <IntlContext.Provider value={value}>
      <style>{`
        #goog-gt-tt,
        .goog-te-banner-frame.skiptranslate,
        .goog-logo-link,
        .goog-te-gadget span {
          display: none !important;
        }
        body {
          top: 0 !important;
        }
      `}</style>
      <div id={GOOGLE_TRANSLATE_CONTAINER_ID} style={{ display: 'none' }} />
      {children}
    </IntlContext.Provider>
  );
}

export const useIntlPreferences = () => {
  const context = useContext(IntlContext);
  if (!context) {
    throw new Error('useIntlPreferences must be used inside IntlProvider');
  }
  return context;
};

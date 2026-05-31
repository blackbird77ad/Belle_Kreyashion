import { useEffect, useState } from 'react';
import {
  ArrowRight,
  CheckCircle2,
  Download,
  GraduationCap,
  MonitorSmartphone,
  Share2,
  ShoppingBag,
  X,
} from 'lucide-react';

const GUIDE_KEY = 'bk_pwa_guide_seen_v3';
const DISMISS_KEY = 'bk_pwa_prompt_dismissed_at';
const GUIDE_DELAY_MS = 900;
const DISMISS_WINDOW_MS = 1000 * 60 * 60 * 24 * 7;

const BENEFITS = [
  {
    icon: ShoppingBag,
    title: 'Shop quicker',
    copy: 'Open your cart and best sellers faster.',
  },
  {
    icon: GraduationCap,
    title: 'Keep access close',
    copy: 'Reach digital products and bookings in one tap.',
  },
  {
    icon: MonitorSmartphone,
    title: 'Use it like an app',
    copy: 'Cleaner on phone and desktop.',
  },
];

const readStorage = (key) => {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
};

const writeStorage = (key, value) => {
  try {
    window.localStorage.setItem(key, value);
    return true;
  } catch {
    return false;
  }
};

const removeStorage = (key) => {
  try {
    window.localStorage.removeItem(key);
    return true;
  } catch {
    return false;
  }
};

const isStandaloneMode = () => {
  if (typeof window === 'undefined') return false;

  return (
    window.matchMedia?.('(display-mode: standalone)')?.matches
    || window.navigator.standalone
  );
};

const detectPlatform = () => {
  if (typeof window === 'undefined') return 'desktop';

  const { navigator } = window;
  const userAgent = navigator.userAgent.toLowerCase();
  const platform = (navigator.userAgentData?.platform || navigator.platform || '').toLowerCase();
  const touchMac = platform.includes('mac') && navigator.maxTouchPoints > 1;

  if (/iphone|ipad|ipod/.test(userAgent) || touchMac) return 'ios';
  if (/android/.test(userAgent)) return 'android';
  return 'desktop';
};

const isSafariBrowser = () => {
  if (typeof window === 'undefined') return false;

  const userAgent = window.navigator.userAgent;
  return /Safari/i.test(userAgent) && !/CriOS|FxiOS|EdgiOS|OPiOS|Chrome|Chromium/i.test(userAgent);
};

const getGuideCopy = (platform, canInstallNow) => {
  if (platform === 'ios') {
    return {
      eyebrow: 'iPhone & iPad Guide',
      title: 'Add Belle Kreyashon from Safari',
      detail: isSafariBrowser()
        ? 'Use Safari to save Belle Kreyashon to your home screen.'
        : 'Open this site in Safari first, then save it to your home screen.',
      steps: [
        'Open Belle Kreyashon in Safari.',
        'Tap the Share button in the browser toolbar.',
        'Choose "Add to Home Screen" and tap "Add".',
      ],
      primaryLabel: 'I Understand',
      promptTitle: 'Add Belle Kreyashon to your home screen',
      promptCopy: 'Open in Safari, tap Share, then choose "Add to Home Screen".',
      promptButton: 'View Apple Steps',
    };
  }

  if (platform === 'android') {
    return {
      eyebrow: 'Android Guide',
      title: canInstallNow ? 'Install Belle Kreyashon in one tap' : 'Install Belle Kreyashon from your browser menu',
      detail: canInstallNow
        ? 'Save it for quicker access from your home screen.'
        : 'If the install sheet does not open, use your browser menu.',
      steps: canInstallNow
        ? [
            'Tap "Install App" below.',
            'Approve the browser install request.',
            'Launch Belle Kreyashon from your home screen whenever you want.',
          ]
        : [
            'Open the browser menu in Chrome or Edge.',
            'Choose "Install app" or "Add to Home screen".',
            'Confirm the install and open it from your home screen.',
          ],
      primaryLabel: canInstallNow ? 'Install App' : 'Done',
      promptTitle: 'Install Belle Kreyashon',
      promptCopy: canInstallNow
        ? 'Save Belle Kreyashon to your Android home screen.'
        : 'Open your browser menu and choose "Install app" or "Add to Home screen".',
      promptButton: canInstallNow ? 'Install App' : 'View Android Steps',
    };
  }

  return {
    eyebrow: 'Desktop Guide',
    title: canInstallNow ? 'Install Belle Kreyashon on this computer' : 'Use Chrome or Edge to install Belle Kreyashon',
    detail: canInstallNow
      ? 'Give Belle Kreyashon its own desktop window.'
      : 'Chrome and Edge give the smoothest desktop install flow.',
    steps: canInstallNow
      ? [
          'Click "Install App" below.',
          'Approve the browser install prompt.',
          'Open Belle Kreyashon from Start, Launchpad, the dock, or your taskbar.',
        ]
      : [
          'Open Belle Kreyashon in Chrome or Edge.',
          'Click the install icon in the address bar, or open the browser menu and choose "Install Belle Kreyashon".',
          'Pin the app to your dock or taskbar for one-click access.',
        ],
    primaryLabel: canInstallNow ? 'Install App' : 'Done',
    promptTitle: 'Install Belle Kreyashon on desktop',
    promptCopy: canInstallNow
      ? 'Save Belle Kreyashon for quicker return visits.'
      : 'Open this site in Chrome or Edge to install it as a desktop app.',
    promptButton: canInstallNow ? 'Install App' : 'View Desktop Steps',
  };
};

export default function PwaInstallPrompt() {
  const [platform] = useState(() => detectPlatform());
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [guideVisible, setGuideVisible] = useState(false);
  const [promptVisible, setPromptVisible] = useState(false);
  const [promptDismissed, setPromptDismissed] = useState(() => {
    if (typeof window === 'undefined' || isStandaloneMode()) return false;

    const dismissedAt = Number(readStorage(DISMISS_KEY) || 0);
    return Boolean(dismissedAt && (Date.now() - dismissedAt) < DISMISS_WINDOW_MS);
  });
  const canInstallNow = Boolean(deferredPrompt);
  const guideCopy = getGuideCopy(platform, canInstallNow);

  useEffect(() => {
    if (typeof window === 'undefined' || isStandaloneMode()) return undefined;

    const guideSeen = readStorage(GUIDE_KEY) === '1';

    let guideTimer;
    let promptTimer;

    if (!guideSeen) {
      guideTimer = window.setTimeout(() => setGuideVisible(true), GUIDE_DELAY_MS);
    } else if (!promptDismissed) {
      promptTimer = window.setTimeout(() => setPromptVisible(true), 2200);
    }

    return () => {
      if (guideTimer) window.clearTimeout(guideTimer);
      if (promptTimer) window.clearTimeout(promptTimer);
    };
  }, [promptDismissed]);

  useEffect(() => {
    if (typeof window === 'undefined' || isStandaloneMode()) return undefined;

    const handleBeforeInstallPrompt = (event) => {
      event.preventDefault();
      setDeferredPrompt(event);

      if (!guideVisible && !promptDismissed) {
        setPromptVisible(true);
      }
    };

    const handleInstalled = () => {
      setDeferredPrompt(null);
      setGuideVisible(false);
      setPromptVisible(false);
      setPromptDismissed(false);
      writeStorage(GUIDE_KEY, '1');
      removeStorage(DISMISS_KEY);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleInstalled);
    };
  }, [guideVisible, promptDismissed]);

  const markGuideSeen = () => {
    writeStorage(GUIDE_KEY, '1');
  };

  const dismissPrompt = () => {
    writeStorage(DISMISS_KEY, String(Date.now()));
    setPromptDismissed(true);
    setPromptVisible(false);
  };

  const closeGuide = ({ revealPrompt = true } = {}) => {
    markGuideSeen();
    setGuideVisible(false);

    if (!promptDismissed && revealPrompt && !isStandaloneMode()) {
      setPromptVisible(true);
    }
  };

  const openGuide = () => {
    setPromptVisible(false);
    setGuideVisible(true);
  };

  const install = async () => {
    if (!deferredPrompt) {
      openGuide();
      return;
    }

    deferredPrompt.prompt();
    const result = await deferredPrompt.userChoice.catch(() => null);
    setDeferredPrompt(null);

    if (result?.outcome === 'accepted') {
      markGuideSeen();
      setGuideVisible(false);
      setPromptVisible(false);
      removeStorage(DISMISS_KEY);
      return;
    }

    dismissPrompt();
  };

  return (
    <>
      {guideVisible && (
        <div
          className="fixed inset-0 z-[60] flex items-end justify-center overflow-y-auto bg-black/60 p-3 backdrop-blur-sm sm:items-center sm:p-5"
          style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))' }}
        >
          <div className="w-full max-w-3xl overflow-hidden rounded-[2rem] border border-[#f2de9f] bg-[#fff9ea] text-[#171717] shadow-[0_25px_80px_rgba(0,0,0,0.3)] max-h-[92dvh] overflow-y-auto">
            <div className="grid gap-0 lg:grid-cols-[1fr_0.92fr]">
              <div className="relative overflow-hidden bg-[#111111] px-5 py-5 text-white sm:px-6 sm:py-6">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(253,199,0,0.22),_transparent_42%),linear-gradient(135deg,_rgba(255,255,255,0.06),_transparent_45%)]" />
                <button
                  type="button"
                  onClick={() => closeGuide()}
                  className="absolute right-4 top-4 z-10 rounded-full border border-white/10 bg-white/5 p-2 text-white/75 transition-colors hover:bg-white/10 hover:text-white"
                  aria-label="Close Belle Kreyashon web app guide"
                >
                  <X size={16} />
                </button>

                <div className="relative z-10">
                  <div className="inline-flex items-center gap-3 rounded-full border border-white/15 bg-white/8 px-3 py-2">
                    <img
                      src="/icons/icon-192.png"
                      alt="Belle Kreyashon icon"
                      className="h-10 w-10 rounded-2xl border border-white/10 object-cover"
                    />
                    <div>
                      <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-[#f7d763]">Web App Tour</p>
                      <p className="text-sm font-semibold text-white">Belle Kreyashon</p>
                    </div>
                  </div>

                  <h2 className="mt-5 max-w-xl text-2xl font-black leading-tight sm:text-3xl">
                    Install Belle Kreyashon for quicker shopping and access.
                  </h2>
                  <p className="mt-3 max-w-xl text-sm leading-6 text-white/74">
                    It opens like an app and keeps your cart, orders, and digital access close.
                  </p>

                  <div className="mt-5 grid gap-2 sm:grid-cols-3">
                    {BENEFITS.map((benefit) => {
                      const BenefitIcon = benefit.icon;

                      return (
                        <div key={benefit.title} className="rounded-[1.3rem] border border-white/10 bg-white/7 p-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-[#f7c600] text-black">
                            <BenefitIcon size={18} />
                        </div>
                          <p className="mt-3 text-sm font-extrabold text-white">{benefit.title}</p>
                          <p className="mt-1.5 text-xs leading-5 text-white/72">{benefit.copy}</p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div className="px-5 py-5 sm:px-6 sm:py-6">
                <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-[#a17b0a]">
                  {guideCopy.eyebrow}
                </p>
                <h3 className="mt-3 text-xl font-black leading-tight text-[#171717] sm:text-2xl">
                  {guideCopy.title}
                </h3>
                <p className="mt-2 text-sm leading-6 text-gray-600">
                  {guideCopy.detail}
                </p>

                <div className="mt-5 space-y-2.5">
                  {guideCopy.steps.map((step, index) => (
                    <div
                      key={step}
                      className="flex items-start gap-3 rounded-[1.25rem] border border-[#f2dfaa] bg-white/80 px-4 py-3 shadow-[0_10px_30px_rgba(17,17,17,0.05)]"
                    >
                      <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#111111] text-xs font-extrabold text-[#f7c600]">
                        {index + 1}
                      </div>
                      <p className="text-sm leading-5 text-gray-700">{step}</p>
                    </div>
                  ))}
                </div>

                <div className="mt-5 rounded-[1.25rem] border border-[#f2dfaa] bg-[#fff3cb] p-4">
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#111111] text-[#f7c600]">
                      {platform === 'ios' ? <Share2 size={18} /> : <CheckCircle2 size={18} />}
                    </div>
                    <div>
                      <p className="text-sm font-extrabold text-[#171717]">Quick benefit</p>
                      <p className="mt-1 text-xs leading-5 text-gray-700">
                        Installed users get a branded icon and faster return visits.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="mt-5 flex flex-col gap-3 sm:flex-row">
                  <button
                    type="button"
                    onClick={() => closeGuide({ revealPrompt: false })}
                    className="inline-flex items-center justify-center rounded-2xl border border-gray-200 px-4 py-3 text-sm font-bold text-gray-600 transition-colors hover:border-black hover:text-black"
                  >
                    Continue in Browser
                  </button>
                  <button
                    type="button"
                    onClick={canInstallNow ? install : () => closeGuide()}
                    className="inline-flex items-center justify-center gap-2 rounded-2xl bg-black px-4 py-3 text-sm font-extrabold text-white transition-colors hover:bg-gray-900"
                  >
                    {canInstallNow ? <Download size={16} /> : <ArrowRight size={16} />}
                    {guideCopy.primaryLabel}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {promptVisible && !isStandaloneMode() && (
        <div className="fixed inset-x-3 bottom-3 z-50 sm:inset-x-auto sm:right-4 sm:max-w-sm">
          <div
            className="rounded-[1.8rem] border border-black/10 bg-white/96 p-4 shadow-[0_22px_70px_rgba(0,0,0,0.16)] backdrop-blur"
            style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex min-w-0 items-start gap-3">
                <div className="mt-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-black text-[#FDC700]">
                  <Download size={18} />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-extrabold text-black">{guideCopy.promptTitle}</p>
                  <p className="mt-1 text-xs leading-relaxed text-gray-600">
                    {guideCopy.promptCopy}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={dismissPrompt}
                className="rounded-full p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-black"
                aria-label="Dismiss install prompt"
              >
                <X size={15} />
              </button>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={canInstallNow ? install : openGuide}
                className="inline-flex items-center gap-2 rounded-2xl bg-black px-4 py-2.5 text-xs font-extrabold text-white transition-colors hover:bg-gray-900"
              >
                <Download size={14} />
                {guideCopy.promptButton}
              </button>
              <button
                type="button"
                onClick={openGuide}
                className="rounded-2xl border border-gray-200 px-4 py-2.5 text-xs font-bold text-gray-600 transition-colors hover:border-black hover:text-black"
              >
                App Guide
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

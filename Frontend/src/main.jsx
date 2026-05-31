import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App.jsx';

const ensureVerificationMeta = (name, content) => {
  const trimmed = String(content || '').trim();
  if (!trimmed || typeof document === 'undefined') return;

  let meta = document.querySelector(`meta[name="${name}"]`);
  if (!meta) {
    meta = document.createElement('meta');
    meta.setAttribute('name', name);
    document.head.appendChild(meta);
  }

  meta.setAttribute('content', trimmed);
};

ensureVerificationMeta('google-site-verification', import.meta.env.VITE_GOOGLE_SITE_VERIFICATION);
ensureVerificationMeta('msvalidate.01', import.meta.env.VITE_BING_SITE_VERIFICATION);

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>
);

if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {});
  });
}

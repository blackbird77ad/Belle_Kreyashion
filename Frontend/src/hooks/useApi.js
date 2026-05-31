import { useState, useEffect } from 'react';
import axios from 'axios';

const API = (import.meta.env.VITE_API_URL || 'http://localhost:8002').trim();

export const api = axios.create({ baseURL: API });

const stripHtml = (value = '') => String(value || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();

export function getApiErrorMessage(error, fallback = 'Something went wrong. Please try again.') {
  const apiMessage = error?.response?.data?.message;
  if (apiMessage) return apiMessage;

  const responseBody = error?.response?.data;
  if (typeof responseBody === 'string') {
    const normalized = stripHtml(responseBody);
    if (normalized) {
      if (/syntaxerror|unexpected token|json/i.test(normalized)) {
        return 'The server returned an invalid response. Please try again.';
      }
      return normalized;
    }
  }

  if (error?.code === 'ERR_NETWORK') {
    return 'We could not reach the server. Please try again in a moment.';
  }

  return fallback;
}

export function useFetch(url, deps = []) {
  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);

  useEffect(() => {
    if (!url) return;
    setLoading(true);
    api.get(url)
      .then(r => { setData(r.data); setLoading(false); })
      .catch(e => { setError(e.message); setLoading(false); });
  }, deps);

  return { data, loading, error };
}

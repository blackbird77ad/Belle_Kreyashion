import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { api } from '../hooks/useApi';

const CustomerContext = createContext();

export function CustomerProvider({ children }) {
  const [customer, setCustomer] = useState(() => {
    try { return JSON.parse(localStorage.getItem('bk_customer')) || null; } catch { return null; }
  });

  useEffect(() => {
    if (customer) localStorage.setItem('bk_customer', JSON.stringify(customer));
    else localStorage.removeItem('bk_customer');
  }, [customer]);

  // Save address to customer profile
  const saveAddress = useCallback((address) => {
    if (!customer) return;
    const updated = { ...customer, savedAddress: address };
    setCustomer(updated);
  }, [customer]);

  const savePreferences = useCallback(async (preferences = {}) => {
    if (!customer) return customer;

    const nextCustomer = {
      ...customer,
      ...(preferences.preferredCurrency ? { preferredCurrency: preferences.preferredCurrency } : {}),
      ...(preferences.preferredLanguage ? { preferredLanguage: preferences.preferredLanguage } : {}),
    };
    setCustomer(nextCustomer);

    if (!customer.accessToken) return nextCustomer;

    const { data } = await api.patch('/api/customers/preferences', preferences, {
      headers: {
        'x-customer-token': customer.accessToken,
        Authorization: `Bearer ${customer.accessToken}`,
      },
    });

    const mergedCustomer = {
      ...nextCustomer,
      ...(data?.customer || {}),
      accessToken: customer.accessToken,
    };
    setCustomer(mergedCustomer);
    return mergedCustomer;
  }, [customer]);

  useEffect(() => {
    if (!customer?.accessToken) return undefined;

    let active = true;
    api.get('/api/customers/me', {
      headers: {
        'x-customer-token': customer.accessToken,
        Authorization: `Bearer ${customer.accessToken}`,
      },
    })
      .then(({ data }) => {
        if (!active || !data?.customer) return;
        setCustomer((current) => {
          if (!current?.accessToken || current.accessToken !== customer.accessToken) return current;
          return {
            ...current,
            ...data.customer,
            accessToken: current.accessToken,
          };
        });
      })
      .catch((error) => {
        if (!active) return;
        const status = Number(error?.response?.status) || 0;
        if (status === 401 || status === 404) {
          setCustomer(null);
        }
      });

    return () => {
      active = false;
    };
  }, [customer?.accessToken]);

  const logout = useCallback(async () => {
    const accessToken = customer?.accessToken || '';
    try {
      if (accessToken) {
        await api.post('/api/customers/logout', {}, {
          headers: {
            'x-customer-token': accessToken,
            Authorization: `Bearer ${accessToken}`,
          },
        });
      }
    } catch {
      // Clear the local session even if the server cannot be reached right now.
    } finally {
      setCustomer(null);
    }
  }, [customer?.accessToken]);

  return (
    <CustomerContext.Provider value={{ customer, setCustomer, saveAddress, savePreferences, logout }}>
      {children}
    </CustomerContext.Provider>
  );
}

export const useCustomer = () => useContext(CustomerContext);

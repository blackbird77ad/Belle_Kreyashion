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

  const logout = () => setCustomer(null);

  return (
    <CustomerContext.Provider value={{ customer, setCustomer, saveAddress, savePreferences, logout }}>
      {children}
    </CustomerContext.Provider>
  );
}

export const useCustomer = () => useContext(CustomerContext);

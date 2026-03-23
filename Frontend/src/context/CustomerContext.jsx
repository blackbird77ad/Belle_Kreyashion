import { createContext, useContext, useState, useEffect } from 'react';

const CustomerContext = createContext();

export function CustomerProvider({ children }) {
  const [customer, setCustomer] = useState(() => {
    try { return JSON.parse(localStorage.getItem('bk_customer')) || null; } catch { return null; }
  });

  useEffect(() => {
    if (customer) localStorage.setItem('bk_customer', JSON.stringify(customer));
    else localStorage.removeItem('bk_customer');
  }, [customer]);

  const logout = () => setCustomer(null);

  return (
    <CustomerContext.Provider value={{ customer, setCustomer, logout }}>
      {children}
    </CustomerContext.Provider>
  );
}

export const useCustomer = () => useContext(CustomerContext);
import React, { createContext, useState, useEffect } from 'react';

export const ShortCompanyNameContext = createContext();

export const ShortCompanyNameProvider = ({ children }) => {
  const [shortCompanyName, setShortCompanyName] = useState(
    sessionStorage.getItem('ShortCompanyName') || ''
  );

  useEffect(() => {
    sessionStorage.setItem('ShortCompanyName', shortCompanyName);
  }, [shortCompanyName]);

  return (
    <ShortCompanyNameContext.Provider value={{ shortCompanyName, setShortCompanyName }}>
      {children}
    </ShortCompanyNameContext.Provider>
  );
};

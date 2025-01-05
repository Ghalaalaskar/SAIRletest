import React, { createContext, useState, useEffect } from 'react';

export const FirstNameContext = createContext();

export const FirstNameProvider = ({ children }) => {
  const [firstName, setFirstNameState] = useState(
    sessionStorage.getItem('FName') || ''
  );

  const setFirstName = (newName) => {
    setFirstNameState(newName);
    sessionStorage.setItem('FName', newName);
  };

  useEffect(() => {
    const handleStorageChange = () => {
      const updatedFirstName = sessionStorage.getItem('FName') || '';
      setFirstNameState(updatedFirstName);
    };

    window.addEventListener('storage', handleStorageChange);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  return (
    <FirstNameContext.Provider value={{ firstName, setFirstName }}>
      {children}
    </FirstNameContext.Provider>
  );
};

import React, { createContext, useState, useEffect } from 'react';

export const FisrtNameContext = createContext();

export const FirstName = ({ children }) => {
  const [firstName, setFirstNameState] = useState(
    sessionStorage.getItem('FirstName') || ''
  );

  const setFirstName = (newName) => {
    setFirstNameState(newName); // Update state
    sessionStorage.setItem('FirstName', newName); // Update sessionStorage
  };

  useEffect(() => {
    const handleStorageChange = () => {
      const updatedFirstName = sessionStorage.getItem('FirstName') || '';
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

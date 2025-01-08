import React from 'react';
import Header from './GDTHeader';
import '../../css/EmployerHome.module.css';
import '../../css/CustomModal.css';

const GDTDriverDetails = () => {
  const pageStyles = {
    backgroundSize: '1000px', 
    backgroundPosition: 'right', 
    height: '100vh',
    width: '100%', 
    backgroundRepeat: 'no-repeat',
  };

  const h1WrapperStyles = {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    height: 'calc(100vh - 50px)', 
  };

  return (
    <div style={pageStyles}>
      <Header active="gdtdriverdetails" />
      <div style={h1WrapperStyles}>
        <h1>Driver details will be done in sprint4. Stay tuned for updates!</h1>
      </div>
    </div>
  );
};

export default GDTDriverDetails;
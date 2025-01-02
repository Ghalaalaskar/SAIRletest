import React from 'react';
import homeBackground from '../../images/homebackground7.png';
import Header from './GDTHeader';
import '../../css/EmployerHome.module.css';
import '../../css/CustomModal.css';

const GDTHome = () => {
  const pageStyles = {
    backgroundImage: `url(${homeBackground})`,
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
      <Header active="gdthome" />
      <div style={h1WrapperStyles}>
        <h1>GDT dashbord will be done in sprint 5</h1>
      </div>
    </div>
  );
};

export default GDTHome;
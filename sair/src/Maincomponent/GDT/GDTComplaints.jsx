import React from 'react';
import homeBackground from '../../images/homebackground7.png';
import Header from './GDTHeader';
import '../../css/EmployerHome.module.css';
import '../../css/CustomModal.css';

const GDTComplaints = () => {
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
      <Header active="gdtcomplaints" />
      <div style={h1WrapperStyles}>
        <h1>Compalints feature currently unavailable. Stay tuned for updates!</h1>
      </div>
    </div>
  );
};

export default GDTComplaints;
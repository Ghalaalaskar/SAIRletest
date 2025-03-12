import React from 'react';
import Header from './GDTHeader';
import '../../css/Dashboard.module.css';
import '../../css/CustomModal.css';

const gdtdashboard = () => {
  const contentStyle = {
    backgroundColor: '#80808054', 
    height: '100vh',
    width: '100%', 
  }; 



  return (
    <div style={contentStyle}>
      <Header active="gdtdashboard" />
    
    </div>
  );
};

export default gdtdashboard;
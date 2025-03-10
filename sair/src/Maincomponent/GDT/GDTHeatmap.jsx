import React from 'react';
import homeBackground from '../../images/homebackground7.png';
import Header from './GDTHeader';
import '../../css/EmployerHome.module.css';
import '../../css/CustomModal.css';
import Map from "./GDTMap"; 

const GDTHeatMap = ({ locations }) => {  
  const pageStyles = {
    margin: 10,
  };


  return (
    <div style={pageStyles}>
      <Header active="gdtheatmap" />
      <Map locations={locations} />
    </div>
  );
};

export default GDTHeatMap;
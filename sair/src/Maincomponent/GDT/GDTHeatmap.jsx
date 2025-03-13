import React from 'react';
import homeBackground from '../../images/homebackground7.png';
import Header from './GDTHeader';
import '../../css/EmployerHome.module.css';
import '../../css/CustomModal.css';
import Map from "./GDTMap"; 

const GDTHeatMap = () => {
  const pageStyles = {
    margin: 10,
  };

  const locations = [
    { lat: 24.7136, lng: 46.6753, placeName: "Riyadh Center" },
    { lat: 24.7455, lng: 46.6566, placeName: "Al Olaya District" },
    { lat: 24.7740, lng: 46.7330, placeName: "King Abdullah Financial District" },
    { lat: 24.6861, lng: 46.7318, placeName: "Diriyah" },
  ];

  return (
    <div style={pageStyles}>
      <Header active="gdtheatmap" />
      <Map locations={locations} />
    </div>
  );
};

export default GDTHeatMap;
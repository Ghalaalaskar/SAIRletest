import React from 'react';
import homeBackground from '../images/homebackground7.png';
import Vision from '../images/Vision.png';
import Mision from '../images/Mision.png'; 
import Header from './Header';
import s from "../css/EmployerHome.module.css";
import '../css/CustomModal.css';

const GDTHome = () => {
  const styles = {
    backgroundImage: `url(${homeBackground})`,
    backgroundSize: '1000px', // Change to 'cover' for better scaling
    backgroundPosition: 'right', // Centers the image
    height: '100vh', // Sets the height to full viewport height
    width: '100%', // Ensures it takes the full width
    backgroundRepeat: 'no-repeat',
    };

  return (
    <div style={styles}> 
      <Header active="GDThome" /> 
      <h1>will be done in sprint 5</h1>
    </div>
  );
};

export default GDTHome;
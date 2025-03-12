import React from 'react';
import Header from './GDTHeader';
import '../../css/Dashboard.module.css';
import '../../css/CustomModal.css';
import { Link, useNavigate } from "react-router-dom";

const GDTDashboard = () => {
  const navigate = useNavigate(); // ✅ Define navigate correctly

  const contentStyle = {
    backgroundColor: '#80808054', 
    height: '100vh',
    width: '100%', 
  };

  return (
    <div style={contentStyle}>
      <Header active="gdtdashboard" />
      <div className="breadcrumb">
        <a onClick={() => navigate("/gdthome")} style={{ cursor: "pointer" }}>Home</a>
        <span> / </span>
        <a onClick={() => navigate("/GDTDashBoard")} style={{ cursor: "pointer" }}>Dashboard</a>
      </div> 
    </div>
  );
};

export default GDTDashboard;

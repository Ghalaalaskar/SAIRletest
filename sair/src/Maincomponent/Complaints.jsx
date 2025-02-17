import React, { useEffect, useState } from 'react';
import { db } from '../firebase';
import { Link, useNavigate } from 'react-router-dom';
import { collection, onSnapshot, doc, getDoc, query, where } from 'firebase/firestore';
import EyeIcon from '../images/eye.png';
import { Table, Select } from 'antd';
import Header from './Header';
import { FaFilter } from 'react-icons/fa';
import s from "../css/ComplaintList.module.css"; // CSS module for ComplaintList
import '../css/CustomModal.css';
import c from "../css/CrashList.module.css";

const ComplaintList = () => {
  const [motorcycles, setMotorcycles] = useState({});
  const [complaints, setComplaints] = useState([]);
  const [drivers, setDrivers] = useState({});
  const [selectedStatus, setSelectedStatus] = useState(''); // State for selected status
  const navigate = useNavigate();
  const [searchDate, setSearchDate] = useState('');

  const employerUID = sessionStorage.getItem('employerUID');

  useEffect(() => {
    const fetchDriversAndComplaints = async () => {
      if (!employerUID) return;

      const employerDoc = await getDoc(doc(db, 'Employer', employerUID));
      if (!employerDoc.exists()) {
        console.error("No such employer!");
        return;
      }

      const companyName = employerDoc.data().CompanyName;

      // Fetch drivers for the company
      const driverCollection = query(
        collection(db, 'Driver'),
        where('CompanyName', '==', companyName)
      );

      const unsubscribeDrivers = onSnapshot(driverCollection, (snapshot) => {
        const driverIds = [];
        const driverMap = {};
        
        snapshot.forEach((doc) => {
          const data = doc.data();
          driverIds.push(data.DriverID);
          driverMap[data.DriverID] = `${data.Fname} ${data.Lname}`; // Store driver names
        });
        
        setDrivers(driverMap); // Update state with driver names
        fetchComplaints(driverIds);
      });

      return () => unsubscribeDrivers();
    };

    const fetchComplaints = (driverIds) => {
      if (driverIds.length === 0) return;

      const complaintCollection = query(
        collection(db, 'Complaint'),
        where('driverID', 'in', driverIds)
      );

      const unsubscribeComplaints = onSnapshot(complaintCollection, (snapshot) => {
        const complaintList = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));

        setComplaints(complaintList);
        fetchMotorcycles(complaintList);
      });

      return () => unsubscribeComplaints();
    };

    const fetchMotorcycles = (complaintList) => {
      const violationIDs = complaintList.map(complaint => complaint.ViolationID); // Use ViolationID for fetching
      if (violationIDs.length === 0) return;

      const motorcycleCollection = query(
        collection(db, 'History'),
        where('ID', 'in', violationIDs) // Match ID from History with ViolationID
      );

      const unsubscribeMotorcycles = onSnapshot(motorcycleCollection, (snapshot) => {
        const motorcycleMap = {};
        snapshot.forEach((doc) => {
          const data = doc.data();
          motorcycleMap[data.ID] = data.LicensePlate; // Map ID to LicensePlate
        });
        setMotorcycles(motorcycleMap);
      });

      return () => unsubscribeMotorcycles();
    };

    fetchDriversAndComplaints();
  }, [employerUID]);

  const filteredComplaints = complaints
  .sort((a, b) => (b.DateTime?.seconds || 0) - (a.DateTime?.seconds || 0)) // Sort by DateTime in descending order
  .filter((complaint) => {
    const complaintDate = complaint.DateTime ? new Date(complaint.DateTime.seconds * 1000).toISOString().split('T')[0] : '';

    const matchesStatus = selectedStatus ? complaint.Status === selectedStatus : true;
    const matchesDate = searchDate ? complaintDate === searchDate : true;

    return matchesStatus && matchesDate;
  });


  const columns = [
    {
      title: 'Complaint ID',
      dataIndex: 'ComplaintID',
      key: 'id',
      align: 'center',
    },
    {
      title: 'Driver Name',
      key: 'driverName',
      align: 'center',
      render: (text, record) => drivers[record.driverID] || '   ',
    },
    {
      title: 'Motorcycle License Plate',
      key: 'motorcyclePlate',
      align: 'center',
      render: (text, record) => motorcycles[record.ViolationID] || '   ',
    },
    {
      title: 'Status',
      key: 'Status',
      align: 'center',
      render: (text, record) => {
        const formattedStatus = record.Status.charAt(0).toUpperCase() + record.Status.slice(1).toLowerCase();
        const color = formattedStatus === 'Pending' ? 'orange' : (formattedStatus === 'Accepted' ? 'green' : 'red');
        return (
          <span style={{ color }}>
            {formattedStatus}
          </span>
        );
      },
    },
    {
      title: 'Date',
      key: 'date',
      align: 'center',
      render: (text, record) => 
        record.DateTime ? new Date(record.DateTime.seconds * 1000).toLocaleDateString() : '',
    },
    {
      title: 'Complaint Details',
      key: 'Details',
      align: 'center',
      render: (text, record) => (
        <Link to={`/complaint/general/${record.id}`}>
          <img style={{ cursor: 'pointer' }} src={EyeIcon} alt="Details" />
        </Link>
      ),
    },
  ];

  return (
    <>
      <Header active="complaints" />
      <div className="breadcrumb">
        <a onClick={() => navigate('/employer-home')}>Home</a>
        <span> / </span>
        <a onClick={() => navigate('/complaints')}>Complaints List</a>
      </div>
      <main>
        <div className={s.container}>
          <div className={s.searchHeader}>
            <h2 className={s.title}>Complaints List</h2>
            <div className={s.searchInputs}>
              
            <div className={s.searchContainer}>
  <div className={s.selectWrapper}>
    <FaFilter className={s.filterIcon} />
    <select
  className={s.customSelect}
  onChange={event => setSelectedStatus(event.target.value)}
  defaultValue=""
  style={{
    width: "280px", 
    height:"35px", // Widen the select bar
    padding: "8px", // Add padding
    fontSize: "14px", // Adjust font size
    color:'grey'
  }}
>
  <option value="" disabled>
    Filter by Status
  </option>
  <option value="">All</option>
  <option value="Pending">Pending</option>
  <option value="Accepted">Accepted</option>
  <option value="Rejected">Rejected</option>
</select>
  </div>
</div>
<div
  className={c.searchContainerdate}
  style={{ position: "relative" }}
>
  <div>
    {/* Conditional rendering for the green circle with tick */}
    {searchDate && (
      <div style={{
        position: "absolute",
        top: "-1px",  // Adjust to position it higher
        right: "-1px",  // Adjust to position it to the right
        width: "16px",  // Smaller size for better fit
        height: "16px", // Smaller size for better fit
        borderRadius: "50%",
        backgroundColor: "#059855",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        color: "white",
        fontSize: "12px", // Slightly smaller font size
        zIndex: 1, // Ensure it appears in front

      }}>
        ✓ 
      </div>
    )}

    {/* Your SVG Icon */}
    <svg
      onClick={() => document.getElementById("date-input").focus()}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={{
        position: "absolute",
        top: "50%",
        left: "1px",
        transform: "translateY(-50%)",
        cursor: "pointer",
        width: "40px", // Adjusted width
        height: "40px", // Adjusted height
      }}
    >
      <path
        d="M18 2V4M6 2V4"
        stroke="#059855"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M11.9955 13H12.0045M11.9955 17H12.0045M15.991 13H16M8 13H8.00897M8 17H8.00897"
        stroke="#059855"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M3.5 8H20.5"
        stroke="#059855"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M2.5 12.2432C2.5 7.88594 2.5 5.70728 3.75212 4.35364C5.00424 3 7.01949 3 11.05 3H12.95C16.9805 3 18.9958 3 20.2479 4.35364C21.5 5.70728 21.5 7.88594 21.5 12.2432V12.7568C21.5 17.1141 21.5 19.2927 20.2479 20.6464C18.9958 22 16.9805 22 12.95 22H11.05C7.01949 22 5.00424 22 3.75212 20.6464C2.5 19.2927 2.5 17.1141 2.5 12.7568V12.2432Z"
        stroke="#059855"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M3 8H21"
        stroke="#059855"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>

    <input
      id="date-input"
      type="date"
      value={searchDate}
      onChange={(e) => setSearchDate(e.target.value)}
      style={{
        width: "100%",
        height: "40px", // Adjusted height
        fontSize: "16px",
        paddingLeft: "40px", // Add padding to avoid overlap with the icon
        backgroundColor: "transparent",
        border: "0px solid #ccc",
        borderRadius: "4px",
      }}
    />
  </div>
</div>
            </div>
          </div>

          <Table
            columns={columns}
            dataSource={filteredComplaints}
            rowKey="id"
            pagination={{ pageSize: 5 }}
          />
        </div>
      </main>
    </>
  );
};

export default ComplaintList;
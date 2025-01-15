import React, { useEffect, useState } from 'react';
import { db } from '../firebase';
import { Link, useNavigate } from 'react-router-dom';
import { collection, onSnapshot, doc, getDoc, query, where } from 'firebase/firestore';
import EyeIcon from '../images/eye.png';
import { Table } from 'antd';
import Header from './Header';
import s from "../css/Violations.module.css";
import '../css/CustomModal.css';

const ViolationList = () => {
  const [motorcycles, setMotorcycles] = useState({});
  const [violations, setViolations] = useState([]);
  const [drivers, setDrivers] = useState({});
  const [searchQuery, setSearchQuery] = useState('');
  const [searchDate, setSearchDate] = useState('');
  const navigate = useNavigate();
  const [viewedViolations, setViewedViolations] = useState(() => {
    const storedViewedViolations = localStorage.getItem('viewedViolations');
    return storedViewedViolations ? JSON.parse(storedViewedViolations) : {};
  });  
  const employerUID = sessionStorage.getItem('employerUID');

  useEffect(() => {
    const fetchEmployerDrivers = async () => {
      if (employerUID) {
        const employerDoc = await getDoc(doc(db, 'Employer', employerUID));
        if (employerDoc.exists()) {
          const companyName = employerDoc.data().CompanyName;
          fetchDrivers(companyName);
        } else {
          console.error("No such employer!");
        }
      }
    };

    fetchEmployerDrivers();
  }, [employerUID]);

  const fetchDrivers = (companyName) => {
    const driverCollection = query(
      collection(db, 'Driver'),
      where('CompanyName', '==', companyName)
    );

    const unsubscribe = onSnapshot(driverCollection, (snapshot) => {
      const driverMap = {};
      const driverIDs = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        driverMap[data.DriverID] = `${data.Fname} ${data.Lname}`;
        driverIDs.push(data.DriverID);
      });
      setDrivers(driverMap);
      if (driverIDs.length > 0) {
        fetchViolations(driverIDs);
      } else {
        setViolations([]);
      }
    });

    return () => unsubscribe();
  };

  const fetchMotorcycles = (violationIDs) => {
    const motorcycleCollection = query(
      collection(db, 'History'),
      where('ID', 'in', violationIDs) // Matching by violationID
    );

    const unsubscribe = onSnapshot(motorcycleCollection, (snapshot) => {
      const motorcycleMap = {};
      snapshot.forEach((doc) => {
        const data = doc.data();
        console.log("Fetched Motorcycle Data:", data); // Log fetched motorcycle data
        motorcycleMap[data.ID] = data.LicensePlate; // Map ID to License Plate
      });
      console.log("Motorcycle Map:", motorcycleMap); // Log the entire motorcycle map
      setMotorcycles(motorcycleMap);
    });

    return () => unsubscribe();
  };

  const fetchViolations = (driverIDs) => {
    const violationCollection = query(
      collection(db, 'Violation'),
      where('driverID', 'in', driverIDs)
    );
    const unsubscribe = onSnapshot(violationCollection, (snapshot) => {
      const violationList = snapshot.docs.map((doc) => {
        const data = doc.data();
        const isReckless = data.count30 > 0 || data.count50 > 0;
        return {
          id: doc.id,
          ...data,
          isReckless, // Add reckless classification
        };
      });
      setViolations(violationList);
      if (violationList.length > 0) {
        const violationIDs = violationList.map((v) => v.violationID); // Collecting violation IDs
        fetchMotorcycles(violationIDs); // Fetch motorcycles using violation IDs
      } else {
        setMotorcycles({});
      }
    });

    return () => unsubscribe();
  };

  // Filtering violations
  const filteredViolations = violations.filter((violation) => {
    const driverName = drivers[violation.driverID] || '  ';
    const licensePlate = motorcycles[violation.violationID] || '  '; // Match with violationID

    console.log("Checking Violation:", violation);
    console.log("License Plate Found for Violation ID:", violation.violationID, "->", licensePlate);

    let violationDate = '';
    if (violation.time) {
      violationDate = new Date(violation.time * 1000).toISOString().split('T')[0];
    }

    const matchesSearchQuery = driverName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      licensePlate.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesSearchDate = searchDate ? violationDate === searchDate : true;

    return matchesSearchQuery && matchesSearchDate;
  }).sort((a, b) => {
    // Sort by time in descending order (newest first)
    return (b.time || 0) - (a.time || 0);
  });

    // Function to format the date
    const formatDate = (time) => {
      const date = new Date(time * 1000); // Assuming timestamp is in seconds
      const year = date.getFullYear();
      const month = (date.getMonth() + 1).toString().padStart(2, '0'); // Months are 0-based
      const day = date.getDate().toString().padStart(2, '0'); // Days are 1-based
      return `${month}/${day}/${year}`; // Format as MM/DD/YYYY
    };

    const handleViewDetails = (record) => {
      const updatedViewedViolations = { ...viewedViolations, [record.id]: true };
      setViewedViolations(updatedViewedViolations);
      localStorage.setItem('viewedViolations', JSON.stringify(updatedViewedViolations));
      
      // Navigate after updating the state
      navigate(`/violation/general/${record.id}`);
    };
    console.log("Session Storage:", sessionStorage.getItem('viewedViolations'));
    const capitalizeFirstLetter = (string) => {
      if (!string) return "";
      return string
        .split(" ")
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join(" ");
    };
    
  const columns = [
    {
      title: 'Violation ID',
      dataIndex: 'violationID',
      key: 'violationID',
      align: 'center',
    },
    {
      title: 'Driver Name',
      key: 'driverName',
      align: 'center',
      render: (text, record) => {
        const driverName = drivers[record.driverID]|| "";
        return capitalizeFirstLetter(driverName);
      },    },
    {
      title: 'Motorcycle License Plate',
      key: 'motorcyclePlate',
      align: 'center',
      render: (text, record) => motorcycles[record.violationID] || '   ', // Use violationID for lookup
    },
    {
      title: 'Speed',
      dataIndex: 'driverSpeed',
      key: 'driverSpeed',
      align: 'center',
    },
    {
      title: "Type",
      dataIndex: "violationType",
      key: "violationType",
      align: "center",
      render: (text, record) =>
        record.isReckless ? "Reckless Violation" : "Regular Violation",
    },
    {
      title: 'Date',
      key: 'date',
      align: 'center',
      render: (text, record) => formatDate(record.time),
    },
    {
      title: 'Violation Details',
      key: 'Details',
      align: 'center',
      render: (text, record) => (
        <Link to={`/violation/general/${record.id}`} onClick={() => handleViewDetails(record)}>
          <img style={{ cursor: 'pointer' }} src={EyeIcon} alt="Details" />
        </Link>
      ),
    },
  ];

  return (
    <>
      <Header active="violations" />
      <div className="breadcrumb">
        <a onClick={() => navigate('/employer-home')}>Home</a>
        <span> / </span>
        <a onClick={() => navigate('/violations')}>Violations List</a>
      </div>
      <main>
        <div className={s.container}>
          <div className={s.searchHeader}>
            <h2 className={s.title}>Violations List</h2>
            <div className={s.searchInputs}>
              <div className={s.searchContainer}>
                <svg aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24">
                  <path stroke="#059855" strokeLinecap="round" strokeWidth="2" d="m21 21-3.5-3.5M17 10a7 7 0 1 1-14 0 7 7 0 0 1 14 0Z" />
                </svg>
                <input
                  type="text"
                  placeholder="Search by Driver Name or License Plate"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{ width: '280px' }}
                />
              </div>
              <div className={s.searchContainer}>
                <input
                  type="date"
                  value={searchDate}
                  onChange={(e) => setSearchDate(e.target.value)}
                  style={{ width: '120px', backgroundColor: 'transparent' }} />
              </div>
            </div>
          </div>

          <Table
    dataSource={violations} // Your data source
    columns={columns} // Your columns
    rowKey="id" // Unique identifier for rows
    onRow={(record) => ({
      style: {
        backgroundColor: !viewedViolations[record.id] ? '#f0f8f0' : 'transparent',
      },
    })}
  />

          
        </div>
      </main>
    </>
  );
};

export default ViolationList;
import React, { useEffect, useState } from 'react';
import { db } from '../../firebase';
import { Link, useNavigate } from 'react-router-dom';
import { collection, onSnapshot, doc, getDoc, query, where } from 'firebase/firestore';
import EyeIcon from '../../images/eye.png';
import { Table } from 'antd';
import Header from './GDTHeader';
import s from "../../css/Violations.module.css";
import  '../../css/CustomModal.css';

const ViolationList = () => {
  const [motorcycles, setMotorcycles] = useState({});
  const [violations, setViolations] = useState([]);
  const [drivers, setDrivers] = useState({});
  const [searchQuery, setSearchQuery] = useState('');
  const [searchDate, setSearchDate] = useState('');
  const navigate = useNavigate();
  const gdtUID = sessionStorage.getItem('gdtUID');

  useEffect(() => {
    const fetchEmployerDrivers = async () => {
      if (gdtUID){
        const employerDoc = await getDoc(doc(db, 'GDT', gdtUID))
        fetchDrivers();
      }
    };

    fetchEmployerDrivers();
  }, [gdtUID]);

  const fetchDrivers = () => {
    const driverCollection = query(collection(db, 'Driver'));

    const unsubscribe = onSnapshot(driverCollection, (snapshot) => {
      const driverMap = {};
      const driverIDs = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        driverMap[data.DriverID] = {
          name: `${data.Fname} ${data.Lname}`,
          companyName: data.CompanyName,
        };
        driverIDs.push(data.DriverID);
      });

      setDrivers(driverMap);

      // If there are valid driver IDs, fetch violations
      if (driverIDs.length > 0) {
        fetchViolations(driverIDs);
      } else {
        setViolations([]);
      }

      // Iterate through all driverIDs and fetch company details for each driver
      driverIDs.forEach((driverID) => {
        const companyName = driverMap[driverID].companyName;
        fetchCompany(companyName); // Fetch company info for each driver
      });
    });

    return () => unsubscribe();
  };

  const fetchCompany = (companyName) => {
    const companyCollection = query(
      collection(db, 'Employer'),
      where('CompanyName', '==', companyName)
    );

    const unsubscribe = onSnapshot(companyCollection, (snapshot) => {
      snapshot.forEach((doc) => {
        const data = doc.data();
        const companyData = {
          CompanyEmail: data.CompanyEmail,
          CompanyName: data.CompanyName,
          PhoneNumber: data.PhoneNumber,
          ShortCompanyName: data.ShortCompanyName,
          commercialNumber: data.commercialNumber,
        };
        console.log("Fetched Company Data:", companyData);
        console.log("Company Data:", data);
        // Optionally, you can save company data in state here
      });
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
      const violationList = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setViolations(violationList);
      if (violationList.length > 0) {
        const violationIDs = violationList.map(v => v.violationID); // Collecting violation IDs
        fetchMotorcycles(violationIDs); // Fetch motorcycles using violation IDs
      } else {
        setMotorcycles({});
      }
    });

    return () => unsubscribe();
  };

  //For Comapny name; since its arabic
  const normalizeText = (text) => {
    return text?.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  };

  // Filtering violations
  const filteredViolations = violations.filter((violation) => {
    const driverName = drivers[violation.driverID]?.name || '  ';
    const companyName = drivers[violation.driverID]?.companyName || '  '; 
    const licensePlate = motorcycles[violation.violationID] || '  ';

    let violationDate = '';
    if (violation.time) {
      violationDate = new Date(violation.time * 1000).toISOString().split('T')[0];
    }

    const matchesSearchQuery = driverName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                              normalizeText(companyName).includes(normalizeText(searchQuery));
    const matchesSearchDate = searchDate ? violationDate === searchDate : true;

    return matchesSearchQuery && matchesSearchDate;
  }).sort((a, b) => {
    // Sort by time in descending order (newest first)
    return (b.time || 0) - (a.time || 0);
  });

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
      render: (text, record) => drivers[record.driverID]?.name || '   ',
    },
    {
      title: 'Company Name',
      key: 'CompanyName',
      align: 'center',
      render: (text, record) => drivers[record.driverID]?.companyName || '   ',
    },
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
      title: 'Details',
      key: 'Details',
      align: 'center',
      render: (text, record) => (
        <Link to={`/gdtviolation/general/${record.id}`}> 
          <img style={{ cursor: 'pointer' }} src={EyeIcon} alt="Details" />
        </Link>
      ),
    },
  ];

  return (
    <>
      <Header active="violations" />
      <div className="breadcrumb">
        <a onClick={() => navigate('/gdt-home')}>Home</a>
        <span> / </span>
        <a onClick={() => navigate('/GDTviolations')}>Violations List</a>
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
                  placeholder="Search by Driver Name or Company Name"
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
            columns={columns}
            dataSource={filteredViolations}
            rowKey="id"
            pagination={{ pageSize: 5 }}
          />
        </div>
      </main>
    </>
  );
};

export default ViolationList;
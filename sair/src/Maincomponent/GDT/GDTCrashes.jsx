import React, { useEffect, useState } from 'react';
import { db } from '../../firebase';
import { Link, useNavigate } from 'react-router-dom';
import { collection, onSnapshot, doc, getDoc, getDocs, query, where } from 'firebase/firestore';
import EyeIcon from '../../images/eye.png';
import { Table } from 'antd';
import Header from './GDTHeader';
import s from "../../css/CrashList.module.css"; // CSS module for CrashList
import '../../css/CustomModal.css';

const CrashList = () => {
  const [motorcycles, setMotorcycles] = useState({});
  const [crashes, setCrashes] = useState([]);
  const [drivers, setDrivers] = useState({});
  const [searchDriverID, setSearchDriverID] = useState('');
  const [searchDate, setSearchDate] = useState('');
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState(''); // Single search input
  const gdtUID = sessionStorage.getItem('gdtUID');

 // State to track viewed crashes
 const [viewedCrashes, setViewedCrashes] = useState(() => {
  const storedViewedCrashes = sessionStorage.getItem('viewedCrashes');
  return storedViewedCrashes ? JSON.parse(storedViewedCrashes) : {};
});

  useEffect(() => {
    const fetchDriversAndCrashes = async () => {
      if (!gdtUID) return;

  const GDTDoc = await getDoc(doc(db, 'GDT', gdtUID));

  const driverCollection = query(
    collection(db, 'Driver'),
  );

  const unsubscribeDrivers = onSnapshot(driverCollection, (snapshot) => {
    const driverIds = [];
    const driverMap = {};
    const companyPromises = [];

    snapshot.forEach((doc) => {
      const data = doc.data();
      if (data.DriverID) {
        driverMap[data.DriverID] = {
          name: `${data.Fname} ${data.Lname}`,
          companyName: data.CompanyName,
          shortCompanyName: '', // Placeholder for ShortCompanyName
        };
      }
      
      driverIds.push(data.DriverID);
      companyPromises.push(
        fetchCompany(data.CompanyName).then((shortName) => {
          driverMap[data.DriverID].shortCompanyName = shortName;
        })
      );
    });

    if (driverIds.length === 0) {
      console.error("No valid Driver IDs found.");
      return;
    }

    setDrivers(driverMap);
    fetchCrashes(driverIds);
  });

  return () => unsubscribeDrivers();
};

  const fetchCompany = async (companyName) => {
    const companyQuery = query(
      collection(db, 'Employer'),
      where('CompanyName', '==', companyName)
    );
  
    const snapshot = await getDocs(companyQuery);
    if (!snapshot.empty) {
      const companyData = snapshot.docs[0].data();
      return companyData.ShortCompanyName || companyName; // Fallback to full name if short name not available
    }
    return companyName; // Return the original name if no match found
  };

    const fetchCrashes = (driverIds) => {
      if (!driverIds || driverIds.length === 0) {
        console.error("Driver IDs are invalid.");
        return;
      }
    
      const crashCollection = query(
        collection(db, 'Crash'),
        where('driverID', 'in', driverIds)
      );
    
      const unsubscribeCrashes = onSnapshot(crashCollection, (snapshot) => {
        const crashList = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
    
        console.log('Fetched Crashes:', crashList); // Debugging
    
        setCrashes(crashList);
        fetchMotorcycles(crashList);
      });
    
      return () => unsubscribeCrashes();
    };

    const fetchMotorcycles = (crashList) => {
      const crashIDs = crashList.map(crash => crash.crashID).filter(id => id); // Filter out undefined or null;
  
      if (!crashIDs || crashIDs.length === 0) {
        console.error("No valid Crash IDs found.");
        return;
      }
    
      const motorcycleCollection = query(
        collection(db, 'History'),
        where('ID', 'in', crashIDs) // Ensure this matches the ID field in History
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

    fetchDriversAndCrashes();
  }, [gdtUID]);

    //For Comapny name; since its arabic
    const normalizeText = (text) => {
      return text?.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
    };

  const filteredCrashes =  crashes.filter(crash => crash.Status === 'Confirmed'|| crash.Status === 'Rejected') // Only include Rejected or Confirmed statuses
  .sort((a, b) => (b.time || 0) - (a.time || 0)) // Sort by time in descending order
  .filter((crash) => {
    const crashDate = crash.time ? new Date(crash.time * 1000).toISOString().split('T')[0] : '';
    const matchesSearchDate = searchDate ? crashDate === searchDate : true;

    const driverName = drivers[crash.driverID]?.name || ' ';
      const licensePlate = motorcycles[crash.crashID] || ' '; // Use crashID to fetch motorcycle
      const companyName = drivers[crash.driverID]?.companyName || '  '; 

      const matchesSearchQuery = 
        driverName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        normalizeText(companyName).includes(normalizeText(searchQuery));
        //licensePlate.toLowerCase().includes(searchQuery.toLowerCase());


      return matchesSearchQuery && matchesSearchDate;
    });

    const formatDate = (time) => {
      const date = new Date(time * 1000); // Assuming timestamp is in seconds
      const year = date.getFullYear();
      const month = (date.getMonth() + 1).toString().padStart(2, '0'); // Months are 0-based
      const day = date.getDate().toString().padStart(2, '0'); // Days are 1-based
      return `${month}/${day}/${year}`; // Format as MM/DD/YYYY
    };

    const handleViewDetails = (record) => {
      const updatedViewedCrashes = { ...viewedCrashes, [record.id]: true };
      setViewedCrashes(updatedViewedCrashes);
      sessionStorage.setItem('viewedCrashes', JSON.stringify(updatedViewedCrashes));
  
      navigate(`/gdtcrash/general/${record.id}`); {/**path?? */}
    };

  const columns = [
    {
      title: 'Crash ID',
      dataIndex: 'crashID',
      key: 'id',
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
      render: (text, record) => drivers[record.driverID]?.shortCompanyName || '   ',
    },
    {
      title: 'Motorcycle License Plate',
      key: 'motorcyclePlate',
      align: 'center',
      render: (text, record) => motorcycles[record.crashID] || '   ', // Use crashID to fetch motorcycle
    },
    {
      title: 'Status',
      key: 'Status',
      align: 'center',
      render: (text, record) => {
        const formattedStatus = record.Status.charAt(0).toUpperCase() + record.Status.slice(1).toLowerCase();
        return (
          <span style={{ color: formattedStatus === 'Confirmed' ? 'green' : 'red' }}>
            {formattedStatus}
          </span>
        );
      },
    },
    {
      title: 'Date',
      key: 'date',
      align: 'center',
      render: (text, record) => formatDate(record.time),
    },
    {
      title: 'Details',
      key: 'Details',
      align: 'center',
      render: (text, record) => (
        <Link to={`/gdtcrash/general/${record.id}`} onClick={() => handleViewDetails(record)}>
          <img style={{ cursor: 'pointer' }} src={EyeIcon} alt="Details" />
        </Link>
      ),
    },
  ];

  return (
    <>
      <Header active="gdtcrashes" />
      <div className="breadcrumb">
        <a onClick={() => navigate('/employer-home')}>Home</a>
        <span> / </span>
        <a onClick={() => navigate('/crashes')}>Crashes List</a>
      </div>
      <main>
        <div className={s.container}>
          <div className={s.searchHeader}>
            <h2 className={s.title}>Crashes List</h2>
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
                  style={{ width: '120px', backgroundColor: 'transparent' }}
                />
              </div>
            </div>
          </div>

          <Table
            columns={columns}
            dataSource={filteredCrashes}
            rowKey="id"
            pagination={{ pageSize: 5 }}
            onRow={(record) => ({
              style: {
                backgroundColor: !viewedCrashes[record.id] ? '#f0f8f0' : 'transparent',
              },
            })}
          />
        </div>
      </main>
    </>
  );
};

export default CrashList;
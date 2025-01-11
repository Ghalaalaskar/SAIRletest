import React, { useEffect, useState } from 'react';
import { Link,useNavigate, useParams } from 'react-router-dom';
import { Table } from 'antd';
import { db } from '../../firebase';
import Header from './GDTHeader';
import s from "../../css/VDriver.module.css";
import EyeIcon from '../../images/eye.png';
import '../../css/CustomModal.css';
import { collection, query, where, onSnapshot, doc, getDoc, getDocs } from 'firebase/firestore';

const ViolationsTable = () => {
  const { driverId } = useParams(); // Get driverId from URL parameters
  const [violations, setViolations] = useState([]); // State for storing violations
  const [error, setError] = useState(null); // State for error messages
  const navigate = useNavigate(); // Hook to programmatically navigate

  useEffect(() => {
    if (!driverId) {
      setError("Driver ID is missing.");
      return; // Exit early if driverId is not available
    }
    const fetchViolations = async () => {
      try {
        const violationsQuery = query(collection(db, 'Violation'), where('driverID', '==', driverId));
        const querySnapshot = await getDocs(violationsQuery);
        const violationsList = querySnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        const sortedViolations = violationsList.sort((a, b) => b.time - a.time);
        setViolations(sortedViolations);
      } catch (error) {
        console.error('Error fetching violations:', error);
        setError('Failed to fetch violations.');
      }
    };
    
    fetchViolations();
  }, [driverId]);
  

  const formatDate = (time) => {
    const date = new Date(time * 1000); // Assuming timestamp is in seconds
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0'); // Months are 0-based
    const day = date.getDate().toString().padStart(2, '0'); // Days are 1-based
    return `${month}/${day}/${year}`; // Format as MM/DD/YYYY
  };

  const columns = [
    {
      title: 'Violation ID',
      dataIndex: 'violationID',
      key: 'violationID',
      align: 'center',
    },
    {
      title: 'Street Speed',
      dataIndex: 'streetMaxSpeed',
      key: 'streetMaxSpeed',
      align: 'center',
    },
    {
      title: 'Motorcycle Speed',
      dataIndex: 'driverSpeed',
      key: 'driverSpeed',
      align: 'center',
    },
    {
      title: 'Violation Amount',
      dataIndex: 'price',
      key: 'price',
      align: 'center',
    },
    {
      title: 'Date',
      key: 'date',
      align: 'center',
      render: (text, record) => formatDate(record.time),
    },
    {
      title: 'Type',
      dataIndex: 'violationType',
      key: 'violationType',
      align: 'center',
      render: (text, record) => {
        // Check if count30 or count50 is greater than 0
        if (record.count30 > 0 || record.count50 > 0) {
          return 'Reckless Violation'; // If either count30 or count50 is greater than 0, mark as Reckless Violation
        }
        return 'Regular Violation'; // Otherwise, mark as Regular Violation
      },
    },
    {
      title: 'Details',
      key: 'actions',
      align: 'center',
      className:'svg',
      render: (_, record) => (
        <Link 
          to={`/gdtviolation/general/${record.id}`} 
          state={{ breadcrumbParam: "Driver Violations List" }}
        >
          <img style={{ cursor: 'pointer' }} src={EyeIcon} alt="Details" />
        </Link>
      ),
      },
  ];

  if (error) {
    return <div>{error}</div>; // Display error message if there's an error
  }

  return (
    <><Header active={"gdtviolations"} />

<div className="breadcrumb">
        <a onClick={() => navigate('/gdthome')}>Home</a>
        <span> / </span>
        <a onClick={() => navigate('/gdtviolations')}>Violation List</a>
        <span> / </span>
        <a onClick={() => navigate('/gdtricklessdrives')}>Reckless Drivers List</a>
        <span> / </span>
        <a onClick={() => navigate(`/gdtviolationdriver/${driverId}`)}>Driver Violations List</a>
      </div>


    <div className={s.container}>
      <h2 className={s.title} >Violations for Driver ID: {driverId}</h2>
      <Table dataSource={violations} columns={columns} rowKey="id" />
    </div></>
  );
};

export default ViolationsTable;
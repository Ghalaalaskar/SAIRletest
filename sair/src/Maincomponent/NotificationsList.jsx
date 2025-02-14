import React, { useEffect, useState } from 'react';
import { db, auth } from '../firebase';
import { useNavigate, useParams } from 'react-router-dom';
import {
  collection, doc, onSnapshot, deleteDoc, query, where, getDoc, getDocs, updateDoc
} from 'firebase/firestore';
import TrashIcon from '../images/Trash.png';
import PencilIcon from '../images/pencil.png';
import EyeIcon from '../images/eye.png';
import successImage from '../images/Sucess.png';
import errorImage from '../images/Error.png';
import { SearchOutlined, UsergroupAddOutlined } from '@ant-design/icons';
import { Button, Table, Modal } from 'antd';
import Header from './Header';
import '../css/CustomModal.css';

import s from "../css/DriverList.module.css";

const NotificationsList = () => {
  const [driverData, setDriverData] = useState([]);
  const [driverToRemove, setDriverToRemove] = useState(null);
  const [isDeletePopupVisible, setIsDeletePopupVisible] = useState(false);
   const [searchQuery, setSearchQuery] = useState('');
  const [notificationMessage, setNotificationMessage] = useState('');
  const [isNotificationVisible, setIsNotificationVisible] = useState(false);
  const [isSuccess, setIsSuccess] = useState(true);
  const [currentEmployerCompanyName, setCurrentEmployerCompanyName] = useState('');

  const navigate = useNavigate();
  const { driverId } = useParams();
  const employerUID = sessionStorage.getItem('employerUID');

  const columns = [
    {
      title: 'Driver ID',
      dataIndex: 'DriverID',
      key: 'DriverID',
      align: 'center',
    },
    {
      title: 'Driver Name',
      dataIndex: 'DriverName',
      key: 'DriverName',
      align: 'center',
      render: (text, record) => `${record.Fname} ${record.Lname}`,
    },
    {
      title: 'Type',
      dataIndex: 'Type',
      key: 'Type',
      align: 'center',
    },
    {
      title: 'Email',
      dataIndex: 'Email',
      key: 'Email',
      align: 'center',
      render: (text) => (
        <a
          href={`mailto:${text}`}
          style={{
            color: 'black', 
            textDecoration: 'underline', 
            transition: 'color 0.3s', 
          }}
          onMouseEnter={(e) => (e.currentTarget.style.color = 'green')} // Change color on hover
          onMouseLeave={(e) => (e.currentTarget.style.color = 'black')} // Revert color on mouse leave
        >
          {text}
        </a>
      ),
    },
    {
      title: ' Details',
      key: 'Details',
      align: 'center',
      render: (text, record) => (
        <img
          style={{ cursor: 'pointer' }}
          src={EyeIcon}
          alt="Details"
          onClick={() => viewDriverDetails(record.DriverID)}
        />
      ),
    },
  ];

  const filteredData = driverData.filter(driver => {
    const fullName = `${driver.Fname} ${driver.Lname}`.toLowerCase();
    const driverID = driver.DriverID.toLowerCase();
    const query = searchQuery.toLowerCase();

    return driverID.includes(query) || fullName.includes(query);
  });

  useEffect(() => {
    const fetchEmployerCompanyName = async () => {
      if (employerUID) {
        const employerDoc = await getDoc(doc(db, 'Employer', employerUID));
        if (employerDoc.exists()) {
          setCurrentEmployerCompanyName(employerDoc.data().CompanyName);
        } else {
          console.error("No such employer!");
        }
      }
    };

    const fetchDrivers = () => {
      const driverCollection = query(
        collection(db, 'Driver'),
        where('CompanyName', '==', currentEmployerCompanyName)
      );
      const unsubscribe = onSnapshot(driverCollection, (snapshot) => {
        const driverList = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setDriverData(driverList);
      });
      return () => unsubscribe();
    };

    fetchEmployerCompanyName().then(() => {
      fetchDrivers();
 
    });
  }, [employerUID, currentEmployerCompanyName]);

  const viewDriverDetails = (driverID) => {
    console.log('Navigating to details for driver ID:', driverID);
    navigate(`/driver-details/${driverID}`);
  };

  return (
    <div>

      <div className="breadcrumb" style={{ marginRight: '100px' }}>
        <a onClick={() => navigate('/employer-home')}>Home</a>
        <span> / </span>
        <a onClick={() => navigate('/notificationslist')}>Notification List</a>
      </div>

      <main>
        <div className={s.container}>
          <h2 className={s.title}>Driver List</h2>

          <div className={s.searchInputs}>
            <div className={s.searchContainer}>
              <SearchOutlined style={{ color: '#059855' }} />
              <input
                type="text"
                placeholder="Search by Driver ID or Driver Name"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{ width: "300px" }}
              />
            </div>
           
          </div>
        </div>

        <br />

        <Table
          columns={columns}
          dataSource={filteredData}
          rowKey="id"
          pagination={{ pageSize: 5 }}
          style={{ width: '1200px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', margin: '0 auto' }}
        />

      </main>
    </div>
  );
};

export default NotificationsList;
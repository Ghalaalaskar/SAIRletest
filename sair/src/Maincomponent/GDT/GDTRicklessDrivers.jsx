import React, { useEffect, useState } from 'react';
import { db, auth } from '../../firebase';
import { useNavigate, useParams } from 'react-router-dom';
import {
  collection, doc, onSnapshot, deleteDoc, query, where, getDoc, getDocs, updateDoc
} from 'firebase/firestore';
import EyeIcon from '../../images/eye.png';
import successImage from '../../images/Sucess.png';
import errorImage from '../../images/Error.png';
import { SearchOutlined, UsergroupAddOutlined } from '@ant-design/icons';
import { Button, Table, Modal } from 'antd';
import Header from './GDTHeader';
import '../../css/CustomModal.css';
import s from "../../css/DriverList.module.css";

const DriverList = () => {
  const [driverData, setDriverData] = useState([]);
  const [driverToRemove, setDriverToRemove] = useState(null);
  const [availableMotorcycles, setAvailableMotorcycles] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [notificationMessage, setNotificationMessage] = useState('');
  const [isNotificationVisible, setIsNotificationVisible] = useState(false);
  const [isSuccess, setIsSuccess] = useState(true);
  const navigate = useNavigate();
  const GDTUID = sessionStorage.getItem('gdtUID');
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
      title: 'Phone Number',
      dataIndex: 'PhoneNumber',
      key: 'PhoneNumber',
      align: 'center',
    },
    {
      title: 'Email',
      dataIndex: 'Email',
      key: 'Email',
      align: 'center',
    },
    {
      title: 'Details',
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
    const fetchDrivers = () => {
      const driverCollection = query(
        collection(db, 'Driver'),
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

    const fetchMotorcycles = () => {
      const motorcycleQuery = query(
        collection(db, 'Motorcycle'),
      );
      const unsubscribe = onSnapshot(motorcycleQuery, (snapshot) => {
        const bikes = snapshot.docs.map((doc) => ({
          id: doc.id,
          GPSnumber: doc.data().GPSnumber,
        }));
        setAvailableMotorcycles(bikes);
      });
      return () => unsubscribe();
    };

      fetchDrivers();
      fetchMotorcycles();
   
  }, [GDTUID]);

  const viewDriverDetails = (driverID) => {
    console.log('Navigating to details for driver ID:', driverID);
    navigate(`/driver-details/${driverID}`);
  };

  const handleLogout = () => {
    auth.signOut().then(() => {
      navigate('/');
    }).catch((error) => {
      console.error('Error LOGGING out:', error);
    });
  };

  return (
    <div>
      <Header active="driverslist" />

      <div className="breadcrumb" style={{ marginRight: '100px' }}>
        <a onClick={() => navigate('/gdt-home')}>Home</a>
        <span> / </span>
        <a onClick={() => navigate('/gdtviolations')}>Violation List</a>
        <span> / </span>
        <a onClick={() => navigate('/driverslist')}>Rickless Drivers List</a>
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
            <Button type="primary" className={s.addButton}
              onClick={() => navigate('/add-driver')}>
              <UsergroupAddOutlined />
              <span>Add Driver</span>
            </Button>
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

        {/* Notification Modal */}
        <Modal
          visible={isNotificationVisible}
          onCancel={() => setIsNotificationVisible(false)}
          footer={<p style={{textAlign:'center'}}>{notificationMessage}</p>}
          style={{top:'38%'}}
          className="custom-modal" 
          closeIcon={
            <span className="custom-modal-close-icon">
              ×
            </span>
          }
        >
          <div style={{ textAlign: 'center' }}>
            <img
              src={isSuccess ? successImage : errorImage}
              alt={isSuccess ? 'Success' : 'Error'}
              style={{ width: '20%', marginBottom: '16px' }}
            />
            
          </div>
          
        </Modal>
      </main>
    </div>
  );
};

export default DriverList;
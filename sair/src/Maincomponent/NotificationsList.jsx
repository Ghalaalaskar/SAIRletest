import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { SearchOutlined } from '@ant-design/icons';
import { Table } from 'antd';
import EyeIcon from '../images/eye.png';
import s from "../css/DriverList.module.css";

const NotificationsList = () => {
  const [notifications, setNotifications] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const navigate = useNavigate();

  const safeParse = (key) => {
    try {
      const data = JSON.parse(localStorage.getItem(key));
      return Array.isArray(data) ? data : [];
    } catch (error) {
      console.error(`Error parsing ${key}:`, error);
      return [];
    }
  };

  useEffect(() => {
    const fetchData = () => {
      const types = [
        { key: 'notReadComplaints22', readKey: 'readComplaints', type: 'Complaint' },
        { key: 'notReadViolations22', readKey: 'readViolations', type: 'Violation' },
        { key: 'notReadCrashes22', readKey: 'readCrashes', type: 'Crash' }
      ];
  
      let allNotifications = [];
  
      types.forEach(({ key, readKey, type }) => {
        const unread = safeParse(key);
        const read = safeParse(readKey);
  
        console.log(`Unread ${type}:`, unread);
        console.log(`Read ${type}:`, read);
  
        const formattedUnread = unread.map(item => ({
          ID: item.id || item.ID,
          DriverID: item.driverID || item.DriverID,
          Type: type,
          Status: 'Unread',
          Fname: item.Fname,
          Lname: item.Lname,
        }));
  
        const formattedRead = read.map(item => ({
          ID: item.id || item.ID,
          DriverID: item.driverID || item.DriverID,
          Type: type,
          Status: 'Read',
          Fname: item.Fname,
          Lname: item.Lname,
        }));
  
        allNotifications = [...allNotifications, ...formattedUnread, ...formattedRead];
      });
  
      console.log('All Notifications:', allNotifications);
      setNotifications(allNotifications);
    };
  
    fetchData();
  }, []);
  const filteredData = useMemo(() => {
    return notifications.filter(item => {
      const fullName = `${item.Fname} ${item.Lname}`.toLowerCase();
      const driverID = String(item.DriverID).toLowerCase();
      const query = searchQuery.toLowerCase();
      return driverID.includes(query) || fullName.includes(query);
    });
  }, [notifications, searchQuery]);

  const columns = [
    {
      title: 'ID',
      dataIndex: 'ID',
      key: 'ID',
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
      title: 'Status',
      dataIndex: 'Status',
      key: 'Status',
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
          onClick={() => navigate(`/driver-details/${record.DriverID}`)}
        />
      ),
    },
  ];

  return (
    <div>
      <div className="breadcrumb" style={{ marginRight: '100px' }}>
        <a onClick={() => navigate('/employer-home')}>Home</a>
        <span> / </span>
        <a onClick={() => navigate('/notificationslist')}>Notification List</a>
      </div>
      <main>
        <div className={s.container}>
          <h2 className={s.title}>Notification List</h2>
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
          rowKey="ID"
          pagination={{ pageSize: 5 }}
          style={{ width: '1200px', margin: '0 auto' }}
        />
      </main>
    </div>
  );
};

export default NotificationsList;
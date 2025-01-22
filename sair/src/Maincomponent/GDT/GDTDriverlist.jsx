import React, { useEffect, useState } from "react";
import { db } from "../../firebase";
import { useNavigate } from "react-router-dom";
import { SearchOutlined } from "@ant-design/icons";
import { Table, Modal } from "antd";
import Header from "./GDTHeader";
import "../../css/CustomModal.css";
import s from "../../css/DriverList.module.css";
import {
  collection,
  onSnapshot,
  query,
  where,
  getDocs,
} from "firebase/firestore";
import EyeIcon from "../../images/eye.png";
import successImage from "../../images/Sucess.png";
import errorImage from "../../images/Error.png";

const DriverList = () => {
  const [driverData, setDriverData] = useState([]);
  const [companyMap, setCompanyMap] = useState({});
  const [searchQuery, setSearchQuery] = useState("");
  const [notificationMessage, setNotificationMessage] = useState("");
  const [isNotificationVisible, setIsNotificationVisible] = useState(false);
  const [isSuccess, setIsSuccess] = useState(true);

  const navigate = useNavigate();

  const fetchCompanyMap = async () => {
    const companiesSnapshot = await getDocs(collection(db, "Employer"));
    const map = {};
    companiesSnapshot.forEach((doc) => {
      const data = doc.data();
      map[data.CompanyName] = data.ShortCompanyName || data.CompanyName;
    });
    setCompanyMap(map);
  };

  useEffect(() => {
    const unsubscribeDrivers = fetchDrivers();
    fetchCompanyMap(); // Load company data
    return () => unsubscribeDrivers();
  }, []);

  const fetchDrivers = () => {
    const driverCollection = query(collection(db, "Driver"));
    const unsubscribe = onSnapshot(driverCollection, (snapshot) => {
      const driverList = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setDriverData(driverList);
    });
    return unsubscribe;
  };

  const filteredData = driverData.filter((driver) => {
    const fullName = `${driver.Fname || ""} ${driver.Lname || ""}`.toLowerCase();
    const driverID = driver.DriverID?.toLowerCase() || "";
    const query = searchQuery.toLowerCase();
    return driverID.includes(query) || fullName.includes(query);
  });

  const capitalizeFirstLetter = (string) =>
    string
      ? string
          .split(" ")
          .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
          .join(" ")
      : "";

  const viewDriverDetails = (driverID) => {
    navigate(`/gdtdriverdetails/${driverID}`);
  };

  const columns = [
    {
      title: "Driver ID",
      dataIndex: "DriverID",
      key: "DriverID",
      align: "center",
    },
    {
      title: "Company Name",
      key: "CompanyName",
      align: "center",
      render: (_, record) => capitalizeFirstLetter(companyMap[record.CompanyName] || ""),
    },
    {
      title: "Driver Name",
      key: "DriverName",
      align: "center",
      render: (_, record) =>
        capitalizeFirstLetter(`${record.Fname || ""} ${record.Lname || ""}`),
    },
    {
      title: "Phone Number",
      dataIndex: "PhoneNumber",
      key: "PhoneNumber",
      align: "center",
    },
    {
      title: "Email",
      dataIndex: "Email",
      key: "Email",
      align: "center",
      render: (text) => (
        <a
          href={`mailto:${text}`}
          style={{ color: "black", textDecoration: "underline" }}
        >
          {text}
        </a>
      ),
    },
    {
      title: "Details",
      key: "Details",
      align: "center",
      render: (_, record) => (
        <img
          style={{ cursor: "pointer" }}
          src={EyeIcon}
          alt="Details"
          onClick={() => viewDriverDetails(record.DriverID)}
        />
      ),
    },
  ];

  return (
    <div>
      <Header active="gdtdriverlist" />

      <div className="breadcrumb" style={{ marginRight: '100px' }}>
        <a onClick={() => navigate('/gdthome')}>Home</a>
        <span> / </span>
        <a onClick={() => navigate('/gdtdriverlist')}>Driver List</a>
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
          style={{
            width: '1200px',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            margin: '0 auto',
          }}
        />

        {/* Notification Modal */}
        <Modal
          visible={isNotificationVisible}
          onCancel={() => setIsNotificationVisible(false)}
          footer={<p style={{ textAlign: 'center' }}>{notificationMessage}</p>}
          style={{ top: '38%' }}
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

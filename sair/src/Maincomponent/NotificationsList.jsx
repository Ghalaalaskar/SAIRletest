import React, { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Table, Select } from "antd"; // Import Select from antd
import EyeIcon from "../images/eye.png";
import s from "../css/DriverList.module.css";
import f from "../css/ComplaintList.module.css"; // CSS module for ComplaintList

import { db } from "../firebase";
import Header from './Header';

import {
  doc,
  getDoc,
  collection,
  query,
  where,
  getDocs,
} from "firebase/firestore";
import { FaFilter } from "react-icons/fa"; // Import FaFilter icon
const { Option } = Select; // Destructure Option from Select

const NotificationsList = () => {
  const [notifications, setNotifications] = useState([]);
  const [filterType, setFilterType] = useState("All"); // State for filter type
  const navigate = useNavigate();

  const fetchDetailsFromDatabase = async (type, id) => {
    try {
      let collectionName;
      switch (type) {
        case "Violation":
          collectionName = "Violation";
          break;
        case "Complaint":
          collectionName = "Complaint";
          break;
        case "Crash":
          collectionName = "Crash";
          break;
        default:
          throw new Error("Invalid type");
      }

      const docRef = doc(db, collectionName, id);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        return docSnap.data();
      } else {
        console.log(`No document found for ${type} with ID ${id}`);
        return null;
      }
    } catch (error) {
      console.error(`Error fetching details for ${type} with ID ${id}:`, error);
      return null;
    }
  };

  const fetchDriverDetails = async (driverID) => {
    try {
      const q = query(
        collection(db, "Driver"),
        where("DriverID", "==", driverID)
      );
      const querySnapshot = await getDocs(q);

      if (!querySnapshot.empty) {
        const docData = querySnapshot.docs[0].data();
        return docData;
      } else {
        console.log(`No driver found with ID ${driverID}`);
        return null;
      }
    } catch (error) {
      console.error(`Error fetching driver details for ID ${driverID}:`, error);
      return null;
    }
  };

  const safeParse = (key) => {
    try {
      const data = localStorage.getItem(key);
      const parsedData = JSON.parse(data);
      if (
        parsedData &&
        typeof parsedData === "object" &&
        !Array.isArray(parsedData)
      ) {
        return Object.values(parsedData);
      }
      return Array.isArray(parsedData) ? parsedData : [];
    } catch (error) {
      console.error(`Error parsing ${key}:`, error);
      return [];
    }
  };

  const formatDate = (time) => {
    if (!time) return "N/A";
    let date;
    if (typeof time === "number") {
      date = new Date(time * 1000);
    } else if (time.toDate) {
      date = time.toDate();
    } else {
      return "N/A";
    }
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    const year = date.getFullYear();
    return `${month}/${day}/${year}`;
  };

  useEffect(() => {
    const fetchData = async () => {
      const types = [
        {
          key: "notReadComplaints22",
          readKey: "readComplaints",
          type: "Complaint",
        },
        {
          key: "notReadViolations22",
          readKey: "readViolations",
          type: "Violation",
        },
        { key: "notReadCrashes22", readKey: "readCrashes", type: "Crash" },
      ];

      let allNotifications = [];

      for (const { key, readKey, type } of types) {
        const unread = safeParse(key);
        const read = safeParse(readKey);

        const formattedUnread = await Promise.all(
          unread.map(async (item) => {
            const details = await fetchDetailsFromDatabase(
              type,
              item.id || item.ID
            );
            const driverDetails = await fetchDriverDetails(
              item.driverID || item.DriverID
            );
            return {
              ID: item.id || item.ID,
              DriverID: item.driverID || item.DriverID,
              Type: type,
              Status: details?.Status || "Unread",
              ViolationID: details?.violationID || null,
              CrashID: details?.crashID || null,
              ComplaintID: details?.ComplaintID || null,
              Fname: driverDetails?.Fname || "Unknown",
              Lname: driverDetails?.Lname || "Unknown",
              Time: details?.time || details?.DateTime || null,
            };
          })
        );

        const formattedRead = await Promise.all(
          read.map(async (item) => {
            const details = await fetchDetailsFromDatabase(
              type,
              item.id || item.ID
            );
            const driverDetails = await fetchDriverDetails(
              item.driverID || item.DriverID
            );
            return {
              ID: item.id || item.ID,
              DriverID: item.driverID || item.DriverID,
              Type: type,
              Status: details?.Status || item.Status || "Read",
              ViolationID: details?.violationID || null,
              CrashID: details?.crashID || null,
              ComplaintID: details?.ComplaintID || null,
              Fname: driverDetails?.Fname || "Unknown",
              Lname: driverDetails?.Lname || "Unknown",
              Time: details?.time || details?.DateTime || null,
            };
          })
        );

        allNotifications = [
          ...allNotifications,
          ...formattedUnread,
          ...formattedRead,
        ];
      }

      allNotifications.sort((a, b) => {
        const timeA = a.Time?.toDate ? a.Time.toDate().getTime() : a.Time || 0;
        const timeB = b.Time?.toDate ? b.Time.toDate().getTime() : b.Time || 0;
        return timeB - timeA;
      });

      setNotifications(allNotifications);
    };

    fetchData();
  }, []);

  const filteredData = useMemo(() => {
    if (filterType === "All") {
      return notifications; // Return all notifications if "All" is selected
    }
    return notifications.filter((item) => item.Type === filterType); // Filter by type
  }, [notifications, filterType]);

  const columns = [
    {
      title: "ID",
      dataIndex: "ID",
      key: "ID",
      align: "center",
      render: (text, record) => {
        switch (record.Type) {
          case "Violation":
            return record.ViolationID || "N/A";
          case "Crash":
            return record.CrashID || "N/A";
          case "Complaint":
            return record.ComplaintID || "N/A";
          default:
            return "N/A";
        }
      },
    },
    {
      title: "Type",
      dataIndex: "Type",
      key: "Type",
      align: "center",
    },
    {
      title: "Driver Name",
      dataIndex: "DriverName",
      key: "DriverName",
      align: "center",
      render: (text, record) => `${record.Fname} ${record.Lname}`,
    },
    {
      title: "Date",
      dataIndex: "Time",
      key: "Time",
      align: "center",
      render: (text, record) => formatDate(record.Time),
    },
    {
      title: "Status",
      dataIndex: "Status",
      key: "Status",
      align: "center",
      render: (text, record) => {
        let color = "black";
        switch (record.Status) {
          case "Approved":
          case "Accepted":
          case "Active":
            color = "green";
            break;
          case "Pending":
            color = "yellow";
            break;
          case "Rejected":
          case "Revoked":
          case "Emergency SOS":
            color = "red";
            break;
          default:
            color = "black";
        }
        return <span style={{ color }}>{record.Status}</span>;
      },
    },
    {
      title: "Details",
      key: "Details",
      align: "center",
      render: (text, record) => {
        let route = "";
        switch (record.Type) {
          case "Violation":
            route = `/violation/general/${record.ID}`;
            break;
          case "Crash":
            route = `/crash/general/${record.ID}`;
            break;
          case "Complaint":
            route = `/complaint/general/${record.ID}`;
            break;
          default:
            route = "#";
        }

        return (
          <img
            style={{ cursor: "pointer" }}
            src={EyeIcon}
            alt="Details"
            onClick={() => navigate(route)}
          />
        );
      },
    },
  ];

  return (

    <div>
     <Header active="notificationslist" /> 

      <div className="breadcrumb" style={{ marginRight: "100px" }}>
        <a onClick={() => navigate("/employer-home")}>Home</a>
        <span> / </span>
        <a onClick={() => navigate("/notificationslist")}>Notification List</a>
      </div>
      <main>
        <div className={s.container}>
          <h2 className={s.title}>Notification List</h2>
          <div className={s.searchInputs}>
            <div className={s.searchContainer}>
                <div className={f.selectWrapper}>
              {/* Add FaFilter with inline style for green color */}
              <FaFilter className={f.filterIcon} 
                // style={{
                //   color: "green",
                //   fontSize: "18px",
                //   marginRight: "10px",
                // }}
              />
              {/* Replace Select with a standard <select> element */}
              <select
                // style={{
                //   flexGrow: 1,
                //   border: "none",
                //   backgroundColor: "transparent",
                //   fontSize: "16px",
                //   WebkitAppearance: "none", // For Safari/Chrome
                //   MozAppearance: "none", // For Firefox
                //   appearance: "none", // Standard property
                //   padding: "8px",
                //   outline: "none",
                // }}
                
                className={f.customSelect}
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
              >
                <option value="All" disabled>
                  Filter by Type
                </option>
                <option value="All">All</option>
                <option value="Violation">Violation</option>
                <option value="Crash">Crash</option>
                <option value="Complaint">Complaint</option>
              </select>
            </div>
            </div>
          </div>
        </div>
        <br />
        <Table
          columns={columns}
          dataSource={filteredData}
          rowKey="ID"
          pagination={{ pageSize: 5 }}
          style={{ width: "1200px", margin: "0 auto" }}
        />
      </main>
    </div>
  );
};

export default NotificationsList;

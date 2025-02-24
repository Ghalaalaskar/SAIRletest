 import React, { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Table } from "antd";
import EyeIcon from "../images/eye.png";
import s from "../css/DriverList.module.css";
import f from "../css/ComplaintList.module.css";
import { db } from "../firebase";
import Header from "./Header";
import {
  doc,
  getDoc,
  collection,
  query,
  where,
  getDocs,
} from "firebase/firestore";
import { FaFilter } from "react-icons/fa";
import { useCallback } from "react";
const NotificationsList = () => {
  const [notifications, setNotifications] = useState([]);
  const [filterType, setFilterType] = useState("All");
  const navigate = useNavigate();
  const [statusFilter, setStatusFilter] = useState("All");
  const fetchDetailsFromDatabase = async (type, id) => {
    try {
      const collectionName = type;
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
        return querySnapshot.docs[0].data();
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

  const isWithinLastMonth = (time) => {
    const now = new Date();
    const oneMonthAgo = new Date(now.setMonth(now.getMonth() - 1));
    const notificationDate = new Date(time);
    return notificationDate >= oneMonthAgo;
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
  const handleDetailsClick = (record) => {
    let notReadKey, readKey;
  
    switch (record.Type) {
      case "Violation":
        notReadKey = "notReadViolations22";
        readKey = "readViolations";
        break;
      case "Crash":
        notReadKey = "notReadCrashes22";
        readKey = "readCrashes";
        break;
      case "Complaint":
        notReadKey = "notReadComplaints22";
        readKey = "readComplaints";
        break;
      default:
        return;
    }
  
    // Get existing data
    const notReadData = safeParse(notReadKey);
    const readData = safeParse(readKey);
  
    console.log("Not Read Data Before:", notReadData);
    console.log("Record ID to Remove:", record.ID);
  
    // Find and remove the notification from the unread list
    const updatedNotReadData = notReadData.filter(item => item.ID !== record.ID);
  
    console.log("Updated Not Read Data:", updatedNotReadData);
  
    // Add the notification to the read list
    const updatedReadData = [...readData, record];
  
    // Update localStorage
    localStorage.setItem(notReadKey, JSON.stringify(updatedNotReadData));
    localStorage.setItem(readKey, JSON.stringify(updatedReadData));
  
    // Force re-render by updating state
    setNotifications(prev =>
      prev.map(item =>
        item.ID === record.ID ? { ...item, FilterStatus: "Read" } : item
      )
    );
  
    // Navigate to the details page
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
  
    navigate(route);
  };
  
  const fetchData = useCallback(async () => {
    const types = [
      { key: "notReadComplaints22", type: "Complaint", filterStatus: "Unread" },
      { key: "readComplaints", type: "Complaint", filterStatus: "Read" },
      { key: "notReadViolations22", type: "Violation", filterStatus: "Unread" },
      { key: "readViolations", type: "Violation", filterStatus: "Read" },
      { key: "notReadCrashes22", type: "Crash", filterStatus: "Unread" },
      { key: "readCrashes", type: "Crash", filterStatus: "Read" },
    ];
  
    let allNotifications = [];
    let driverIDs = new Set();
  
    for (const { key, type, filterStatus } of types) {
      const parsedData = safeParse(key) || [];
  
      parsedData.forEach((item) => {
        driverIDs.add(item.driverID || item.DriverID);
      });
  
      const ids = parsedData.map((item) => item.id || item.ID);
      
      // Batch fetch all documents of this type
      const docRefs = ids.map((id) => doc(db, type, id));
      const docSnapshots = await Promise.all(docRefs.map((ref) => getDoc(ref)));
  
      const formattedData = parsedData.map((item, index) => {
        const details = docSnapshots[index]?.data() || {};
        return {
          ID: item.id || item.ID,
          DriverID: item.driverID || item.DriverID,
          Type: type,
          Status: details.Status || "Pending",
          FilterStatus: filterStatus,
          ViolationID: details.violationID || null,
          CrashID: details.crashID || null,
          ComplaintID: details.ComplaintID || null,
          Time: details.time || details.DateTime || null,
        };
      });
  
      allNotifications = [...allNotifications, ...formattedData];
    }
  
    // Batch fetch drivers
    const driverQuery = query(
      collection(db, "Driver"),
      where("DriverID", "in", Array.from(driverIDs))
    );
  
    const driverDocs = await getDocs(driverQuery);
    const driverMap = {};
    driverDocs.forEach((doc) => {
      driverMap[doc.data().DriverID] = doc.data();
    });
  
    // Attach driver details to notifications
    const finalData = allNotifications.map((notification) => ({
      ...notification,
      Fname: driverMap[notification.DriverID]?.Fname || "Unknown",
      Lname: driverMap[notification.DriverID]?.Lname || "Unknown",
    }));
  
    // Sort by time (latest first)
    finalData.sort((a, b) => {
      const timeA = a.Time ? new Date(a.Time).getTime() : 0;
      const timeB = b.Time ? new Date(b.Time).getTime() : 0;
      return timeB - timeA;
    });
  
    setNotifications(finalData);
  }, [statusFilter]);
  
  useEffect(() => {
    fetchData();
  }, [fetchData]);
  const filteredData = useMemo(() => {
    let filteredNotifications = notifications;

    // Apply status filter (Read/Unread)
    if (statusFilter !== "All") {
      filteredNotifications = filteredNotifications.filter((item) => {
        if (statusFilter === "Read") {
          return item.FilterStatus === "Read";
        } else if (statusFilter === "Unread") {
          return item.FilterStatus === "Unread";
        }
        return true;
      });
    }

    // Apply type filter (Violation, Crash, Complaint)
    if (filterType !== "All") {
      filteredNotifications = filteredNotifications.filter(
        (item) => item.Type === filterType
      );
    }

    return filteredNotifications;
  }, [notifications, filterType, statusFilter]);

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
            color = "orange";
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
      render: (text, record) => (
        <img
          style={{ cursor: "pointer" }}
          src={EyeIcon}
          alt="Details"
          onClick={() => handleDetailsClick(record)}
        />
      ),
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
          <div
            className={s.searchInputs}
            style={{ display: "flex", gap: "20px" }}
          >
            {/* Type Filter */}
            <div className={s.searchContainer}>
              <div className={f.selectWrapper}>
                <FaFilter className={f.filterIcon} />
                <select
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

            {/* Status Filter */}
            <div className={s.searchContainer}>
              <div className={f.selectWrapper}>
                <FaFilter className={f.filterIcon} />
                <select
                  className={f.customSelect}
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                >
                  <option value="All" disabled>
                    Filter by Status
                  </option>
                  <option value="All">All</option>
                  <option value="Read">Read</option>
                  <option value="Unread">Unread</option>
                </select>
              </div>
            </div>
          </div>
        </div>
        <style>
          {`
    .unread-row {
      background-color: #d4edda !important;
    }
  `}
        </style>

        <br />
        <Table
          columns={columns}
          dataSource={filteredData}
          rowKey="ID"
          pagination={{
            pageSize: 5,
            showSizeChanger: false,
          }}
          style={{ width: "1200px", margin: "0 auto" }}
          rowClassName={(record) =>
            record.FilterStatus === "Unread" ? "unread-row" : ""
          }
          rowStyle={(record) =>
            record.FilterStatus === "Unread"
              ? { backgroundColor: "#d4edda" }
              : {}
          }
        />
      </main>
    </div>
  );
};

export default NotificationsList;

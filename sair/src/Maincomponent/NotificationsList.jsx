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
  const convertToUnixTimestamp = (dateString) => {
    const date = new Date(dateString);
    return Math.floor(date.getTime() / 1000); // Convert milliseconds to seconds
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

  useEffect(() => {
    const fetchData = async () => {
      const types = [
        { key: "notReadComplaints22", type: "Complaint", filterStatus: "Unread" },
        { key: "readComplaints", type: "Complaint", filterStatus: "Read" },
        { key: "notReadViolations22", type: "Violation", filterStatus: "Unread" },
        { key: "readViolations", type: "Violation", filterStatus: "Read" },
        { key: "notReadCrashes22", type: "Crash", filterStatus: "Unread" },
        { key: "readCrashes", type: "Crash", filterStatus: "Read" },
      ];
  
      let allNotifications = [];
  
      for (const { key, type, filterStatus } of types) {
        const parsedData = safeParse(key) || []; // Ensure it's an array
  
        const formattedData = await Promise.all(
          parsedData.map(async (item) => {
            const details = await fetchDetailsFromDatabase(type, item.id || item.ID);
            const driverDetails = await fetchDriverDetails(item.driverID || item.DriverID);
  
            return {
              ID: item.id || item.ID,
              DriverID: item.driverID || item.DriverID,
              Type: type,
              Status: details?.Status || "Pending", // Shows actual status (Pending, Accepted, etc.)
              FilterStatus: filterStatus, // Used for filtering (Read or Unread)
              ViolationID: details?.violationID || null,
              CrashID: details?.crashID || null,
              ComplaintID: details?.ComplaintID || null,
              Fname: driverDetails?.Fname || "Unknown",
              Lname: driverDetails?.Lname || "Unknown",
              Time: details?.time || details?.DateTime || null,
            };
          })
        );
  
        allNotifications = [...allNotifications, ...formattedData];
      }
  
      // Apply status filter
      const filteredNotifications =
        statusFilter === "All"
          ? allNotifications
          : allNotifications.filter((n) => n.FilterStatus === statusFilter);
  
      // Sort by time (latest first)
      filteredNotifications.sort((a, b) => {
        const timeA = a.Time ? new Date(a.Time).getTime() : 0;
        const timeB = b.Time ? new Date(b.Time).getTime() : 0;
        return timeB - timeA;
      });
  
      setNotifications(filteredNotifications);
    };
  
    fetchData();
  }, [statusFilter]); // Runs when the status filter changes
  
  const filteredData = useMemo(() => {
    let filteredNotifications = notifications;

    // Apply status filter
    if (statusFilter !== "All") {
      filteredNotifications = notifications.filter((item) => {
        if (statusFilter === "Read") {
          return item.Status === "Read";
        } else if (statusFilter === "Unread") {
          return item.Status === "Unread";
        }
        return true;
      });
    }

    // Apply type filter
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

        <br />
        <Table
          columns={columns}
          dataSource={filteredData}
          rowKey="ID"
          pagination={{
            pageSize: 5, // Show 5 entries per page
            showSizeChanger: false, // Optional: Hide page size changer if you want
          }}
          style={{ width: "1200px", margin: "0 auto" }}
        />
      </main>
    </div>
  );
};

export default NotificationsList;

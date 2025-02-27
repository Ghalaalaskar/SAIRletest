import React, { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Table } from "antd";
import EyeIcon from "../images/eye.png";
import s from "../css/DriverList.module.css";
import f from "../css/ComplaintList.module.css";
import { db } from "../firebase";
import Header from "./Header";
import { doc, getDoc } from "firebase/firestore";
import "../css/CustomModal.css";
import { onSnapshot, orderBy } from "firebase/firestore";
import { getDocs, collection, query, where } from "firebase/firestore";
import { FaFilter } from "react-icons/fa";
import { useCallback } from "react";
const NotificationsList = () => {
  const [notifications, setNotifications] = useState([]);
  const [filterType, setFilterType] = useState("All");
  const navigate = useNavigate();
  const [statusFilter, setStatusFilter] = useState("All");
  const [notReadCrashes, setNotReadCrashes] = useState([]);
  const [notReadViolations, setnotReadViolations] = useState([]);
  const [notReadComplaints, setnotReadComplaints] = useState([]);
  const [drivers, setDrivers] = useState({});
  const [notificationsList, setNotificationsList] = useState([]); //merged list

  useEffect(() => {
    const readCrashes = JSON.parse(localStorage.getItem("readCrashes")) || {};
    const readViolations =
      JSON.parse(localStorage.getItem("readViolations")) || {};
    const readComplaints =
      JSON.parse(localStorage.getItem("readComplaints")) || {};
    // Function to convert the custom DateTime string to a Date object
    const parseCustomDateTime = (dateTimeString) => {
      if (typeof dateTimeString !== "string") {
        console.warn("Invalid DateTime string:", dateTimeString);
        return new Date(0);
      }
    
      try {
        // Remove 'at', AM/PM, and trim
        let cleanedString = dateTimeString.replace("at", "").replace(/\s?(AM|PM)/, "").trim();
    
        // Handle timezone (removes "UTC+3")
        cleanedString = cleanedString.replace(/UTC[+-]\d+/, "").trim();
    
        const parsedDate = new Date(cleanedString);
    
        if (isNaN(parsedDate.getTime())) {
          console.error("Invalid parsed date:", cleanedString);
          return new Date(0);
        }
    
        return parsedDate;
      } catch (error) {
        console.error("Error parsing DateTime:", error, dateTimeString);
        return new Date(0);
      }
    };
    const normalizeTimestamp = (notification) => {
      if (notification.DateTime) {
        if (typeof notification.DateTime === "object" && notification.DateTime.seconds) {
          return new Date(notification.DateTime.seconds * 1000); // Firestore Timestamp
        } else if (typeof notification.DateTime === "string") {
          return parseCustomDateTime(notification.DateTime); // Custom DateTime String
        }
      } else if (notification.time) {
        return new Date(notification.time * 1000); // Unix timestamp
      }
      return new Date(0); // Default fallback
    };
    
    // Function to filter out notifications older than a month
    const filterOldNotifications = (notifications) => {
      const oneMonthAgo = new Date();
      oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
    
      return notifications.filter((notification) => {
        const notificationDate = normalizeTimestamp(notification);
        console.log(`Checking Notification: ${notification.id || "Unknown"}, Date: ${notificationDate}, One Month Ago: ${oneMonthAgo}`);
        return notificationDate > oneMonthAgo;
      });
    };
    
    console.log("All Read Complaints Before Filtering:", Object.values(readComplaints));
    console.log("Parsed Complaints Before Filtering:", Object.values(readComplaints).map(normalizeTimestamp));
    
    // Filter read notifications
    const filteredReadCrashes = filterOldNotifications(
      Object.values(readCrashes)
    );
    const filteredReadViolations = filterOldNotifications(
      Object.values(readViolations)
    );
    const filteredReadComplaints = filterOldNotifications(
      Object.values(readComplaints)
    );

    // Merge notifications
    const mergedNotifications = [
      ...notReadCrashes.map((crash) => ({
        ...crash,
        Type: "Crash",
        FilterStatus: "Unread",
      })),
      ...notReadViolations.map((violation) => ({
        ...violation,
        Type: "Violation",
        FilterStatus: "Unread",
      })),
      ...notReadComplaints.map((complaint) => ({
        ...complaint,
        Type: "Complaint",
        FilterStatus: "Unread",
      })),
      ...filteredReadCrashes.map((crash) => ({
        ...crash,
        Type: "Crash",
        FilterStatus: "Read",
      })),
      ...filteredReadViolations.map((violation) => ({
        ...violation,
        Type: "Violation",
        FilterStatus: "Read",
      })),
      ...filteredReadComplaints.map((complaint) => ({
        ...complaint,
        Type: "Complaint",
        FilterStatus: "Read",
      })),
    ];
    console.log("Filtered Read Complaints:", filteredReadComplaints);
    console.log("Filtered Read Crashes:", filteredReadCrashes);
    console.log("Filtered Read Violations:", filteredReadViolations);

  // Sort notifications by date (newest first)
  const sortedNotifications = [...mergedNotifications].sort(
    (a, b) => normalizeTimestamp(b) - normalizeTimestamp(a)
  );

  setNotificationsList(sortedNotifications);
  }, [notReadCrashes, notReadViolations, notReadComplaints]);

  useEffect(() => {
    fetchDrivers();
  }, [notReadCrashes, notReadViolations, notReadComplaints]);

  const fetchDrivers = useCallback(async () => {
    const employerUID = sessionStorage.getItem("employerUID");
    if (employerUID) {
      const userDocRef = doc(db, "Employer", employerUID);
      const docSnap = await getDoc(userDocRef);
      const companyName = docSnap.data().CompanyName;

      // Fetch drivers
      const driverCollection = query(
        collection(db, "Driver"),
        where("CompanyName", "==", companyName)
      );

      const unsubscribeDrivers = onSnapshot(driverCollection, (snapshot) => {
        const driverIds = [];
        const driverMap = {};

        snapshot.forEach((doc) => {
          const data = doc.data();
          if (data.DriverID) {
            driverIds.push(data.DriverID);
            driverMap[data.DriverID] = `${data.Fname} ${data.Lname}`;
          }
        });

        if (driverIds.length === 0) {
          console.error("No valid Driver IDs found.");
          return;
        }

        setDrivers(driverMap);
        fetchCrashes(driverIds);
        fetchViolations(driverIds);
        fetchComplaints(driverIds);
      });

      return () => unsubscribeDrivers();
    }
  }, []);

  // Fetch crash data
  const fetchCrashes = useCallback((driverIds) => {
    if (!driverIds || !Array.isArray(driverIds) || driverIds.length === 0) return;

    const chunkSize = 10; // Customize as needed
    for (let i = 0; i < driverIds.length; i += chunkSize) {
      const chunk = driverIds.slice(i, i + chunkSize);
      if (chunk.length === 0) return; 

     const now = Math.floor(Date.now() / 1000);
     const twentyFourHoursAgo = now - 24 * 60 * 60;
     const crashCollection = query(
     collection(db, 'Crash'),
     where('driverID', 'in', chunk),
     where('Status', '==', 'Emergency SOS'),
     where('RespondedBy', '==', null),
     where("time", ">=", twentyFourHoursAgo), 
     orderBy('time', 'desc') // Order crashes by time in descending order
       );
      const unsubscribeCrashes = onSnapshot(crashCollection, (snapshot) => {
        const storedReadCrashes =
          JSON.parse(localStorage.getItem("readCrashes")) || {}; // Get read crashes from localStorage

        const crashList = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));

        const newCrashes = crashList.filter(
          (crash) => !storedReadCrashes[crash.id]
        );

        setNotReadCrashes(newCrashes);
      });

      return () => unsubscribeCrashes();
    }
  }); //not sure

  // Update crash as read and navigate to details page
  const handleNotificationClick1 = async (crash) => {
    try {
      console.log("id:", crash.id);
      const r = JSON.parse(localStorage.getItem("readCrashes")) || {};
      const updatedReadCrashes = { ...r, [crash.id]: crash };

      localStorage.setItem("readCrashes", JSON.stringify(updatedReadCrashes));

      // setReadCrashes(updatedReadCrashes);

      setNotReadCrashes((prev) => prev.filter((c) => c.id !== crash.id));

      navigate(`/crash/general/${crash.id}`);
    } catch (error) {
      console.error("Error marking notification as read:", error);
    }
  };

  // Fetch violation data
  const fetchViolations = useCallback((driverIds) => {
  if (!driverIds || !Array.isArray(driverIds) || driverIds.length === 0) return;

    const chunkSize = 10; // Customize as needed
    for (let i = 0; i < driverIds.length; i += chunkSize) {
      const chunk = driverIds.slice(i, i + chunkSize);
      if (chunk.length === 0) return; 

      const violationCollection = query(
        collection(db, "Violation"),
        where("driverID", "in", chunk),
        where("Status", "==", "Active"),
        orderBy("time", "desc")
      );
      const unsubscribeViolations = onSnapshot(
        violationCollection,
        (snapshot) => {
          const storedReadViolations =
            JSON.parse(localStorage.getItem("readViolations")) || {}; // Get read crashes from localStorage

          const violationList = snapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
          }));

          const newViolation = violationList.filter(
            (violation) => !storedReadViolations[violation.id]
          );

          setnotReadViolations(newViolation);
        }
      );

      ///ABOUT RED CIRCULE VISIBILITY
      return () => unsubscribeViolations();
    }
  }); //not sure

  // Update crash as read and navigate to details page
  const handleviolationNotificationClick = async (violation) => {
    try {
      console.log("id:", violation.id);
      const rr = JSON.parse(localStorage.getItem("notReadViolations22")) || {};
      const updatedReadViolations = { ...rr, [violation.id]: violation };

      localStorage.setItem(
        "readViolations",
        JSON.stringify(updatedReadViolations)
      );

      // setReadViolations(updatedReadViolations);
      setnotReadViolations((prev) => prev.filter((c) => c.id !== violation.id));

      navigate(`/violation/general/${violation.id}`);
    } catch (error) {
      console.error("Error marking notification as read:", error);
    }
  };

  // Fetch complaint data
  const fetchComplaints = useCallback((driverIds) => {
  if (!driverIds || !Array.isArray(driverIds) || driverIds.length === 0) return;

    const chunkSize = 10; // Customize as needed
    for (let i = 0; i < driverIds.length; i += chunkSize) {
      const chunk = driverIds.slice(i, i + chunkSize);
      if (chunk.length === 0) return; 

      const complaintCollection = query(
        collection(db, "Complaint"),
        where("driverID", "in", chunk),
        where("RespondedBy", "==", null),
        orderBy("DateTime", "desc")
      );
      const unsubscribeComplaint = onSnapshot(
        complaintCollection,
        (snapshot) => {
          const storedReadComplaints =
            JSON.parse(localStorage.getItem("readComplaints")) || {}; // Get read crashes from localStorage
          const complaintList = snapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
          }));

          const newComplaint = complaintList.filter(
            (complaint) => !storedReadComplaints[complaint.id]
          );

          setnotReadComplaints(newComplaint);
        }
      );

      ///ABOUT RED CIRCULE VISIBILITY
      return () => unsubscribeComplaint();
    }
  }); //not sure

  // Update crash as read and navigate to details page
  const handlecomplaintNotificationClick = async (complaint) => {
    try {
      console.log("id:", complaint.id);
      const r = JSON.parse(localStorage.getItem("readComplaints")) || {};
      const updatedReadComplaint = { ...r, [complaint.id]: complaint };

      localStorage.setItem(
        "readComplaints",
        JSON.stringify(updatedReadComplaint)
      );
      // setReadComplaints(updatedReadComplaint);
      setnotReadComplaints((prev) => prev.filter((c) => c.id !== complaint.id));

      navigate(`/complaint/general/${complaint.id}`);
    } catch (error) {
      console.error("Error marking notification as read:", error);
    }
  };

  const handleNotificationClick = async (notification) => {
    try {
      console.log("id:", notification.id);
      let readKey, notReadSetter;

      if (notification.Type === "Crash") {
        readKey = "readCrashes";
        notReadSetter = setNotReadCrashes;
      } else if (notification.Type === "Violation") {
        readKey = "readViolations";
        notReadSetter = setnotReadViolations;
      } else if (notification.Type === "Complaint") {
        readKey = "readComplaints";
        notReadSetter = setnotReadComplaints;
      }

      const readData = JSON.parse(localStorage.getItem(readKey)) || {};
      const updatedReadData = { ...readData, [notification.id]: notification };
      localStorage.setItem(readKey, JSON.stringify(updatedReadData));

      notReadSetter((prev) =>
        prev.filter((item) => item.id !== notification.id)
      );

      navigate(
        `/${notification.Type.toLowerCase()}/general/${notification.id}`
      );
    } catch (error) {
      console.error("Error marking notification as read:", error);
    }
  };

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
    let date;

    // Check if the time is a Unix timestamp (number in seconds)
    if (
      typeof time === "number" ||
      (typeof time === "string" && !isNaN(time))
    ) {
      date = new Date(time * 1000); // Convert to milliseconds
    } else if (time?.seconds) {
      // Handle Firestore Timestamp
      date = new Date(time.seconds * 1000);
    } else if (time instanceof Date) {
      // Handle JavaScript Date object
      date = time;
    } else {
      // Handle other cases (e.g., invalid date)
      return "Invalid Date";
    }

    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, "0");
    const day = date.getDate().toString().padStart(2, "0");

    return `${month}/${day}/${year}`; // Format as MM/DD/YYYY
  };
  // const handleDetailsClick = (record) => {
  //   let notReadKey, readKey;

  //   switch (record.Type) {
  //     case "Violation":
  //       notReadKey = "notReadViolations22";
  //       readKey = "readViolations";
  //       break;
  //     case "Crash":
  //       notReadKey = "notReadCrashes22";
  //       readKey = "readCrashes";
  //       break;
  //     case "Complaint":
  //       notReadKey = "notReadComplaints22";
  //       readKey = "readComplaints";
  //       break;
  //     default:
  //       return;
  //   }

  //   // Get existing data
  //   const notReadData = safeParse(notReadKey);
  //   const readData = safeParse(readKey);

  //   console.log("Not Read Data Before:", notReadData);
  //   console.log("Record ID to Remove:", record.ID);

  //   // Find and remove the notification from the unread list
  //   const updatedNotReadData = notReadData.filter(item => item.ID !== record.ID);

  //   console.log("Updated Not Read Data:", updatedNotReadData);

  //   // Add the notification to the read list
  //   const updatedReadData = [...readData, record];

  //   // Update localStorage
  //   localStorage.setItem(notReadKey, JSON.stringify(updatedNotReadData));
  //   localStorage.setItem(readKey, JSON.stringify(updatedReadData));

  //   // Force re-render by updating state
  //   setNotifications(prev =>
  //     prev.map(item =>
  //       item.ID === record.ID ? { ...item, FilterStatus: "Read" } : item
  //     )
  //   );

  //   // Navigate to the details page
  //   let route = "";
  //   switch (record.Type) {
  //     case "Violation":
  //       route = `/violation/general/${record.ID}`;
  //       break;
  //     case "Crash":
  //       route = `/crash/general/${record.ID}`;
  //       break;
  //     case "Complaint":
  //       route = `/complaint/general/${record.ID}`;
  //       break;
  //     default:
  //       route = "#";
  //   }

  //   navigate(route);
  // };

  const fetchData = useCallback(async () => {
    const types = [
      { key: "readComplaints", type: "Complaint", filterStatus: "Read" },
      { key: "readViolations", type: "Violation", filterStatus: "Read" },
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
    
    if (!driverIDs || !Array.isArray(driverIDs) || driverIDs.length === 0) return;

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
            return record.violationID || "N/A";
          case "Crash":
            return record.crashID || "N/A";
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
      render: (text, record) =>
        `${drivers[record.driverID] || "Unknown Driver"}`,
    },
    {
      title: "Date",
      dataIndex: "Time",
      key: "Time",
      align: "center",
      render: (text, record) => formatDate(record.time || record.DateTime),
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
          onClick={() => handleNotificationClick(record)}
        />
      ),
    },
  ];

  const filteredNotifications = notificationsList.filter((record) => {
    if (filterType !== "All" && record.Type !== filterType) return false;
    if (statusFilter !== "All" && record.FilterStatus !== statusFilter)
      return false;
    return true;
  });

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
          dataSource={filteredNotifications}
          rowKey={(record) => record.ID || record.id}
          pagination={{
            pageSize: 5,
            showSizeChanger: false,
          }}
          style={{ width: "1200px", margin: "0 auto" }}
          rowClassName={(record) =>
            (record.FilterStatus || "").toLowerCase() === "unread"
              ? "unread-row"
              : ""
          }
        />
      </main>
    </div>
  );
};

export default NotificationsList;

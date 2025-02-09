import React, { useEffect, useState } from "react";
import homeBackground from "../../images/homebackground7.png";
import Header from "./GDTHeader";
import "../../css/EmployerHome.module.css";
import "../../css/CustomModal.css";
import { db } from "../../firebase";
import { Link, useNavigate } from "react-router-dom";
import {
  collection,
  onSnapshot,
  doc,
  getDoc,
  getDocs,
  query,
  where,
} from "firebase/firestore";
import EyeIcon from "../../images/eye.png";
import { Table, Select } from "antd";
import { FaFilter } from "react-icons/fa";
import s from "../../css/ComplaintList.module.css"; // CSS module for ComplaintList
import c from "../../css/CrashList.module.css";
import "../../css/CustomModal.css";

const GDTComplaintList = () => {
  const [motorcycles, setMotorcycles] = useState({});
  const [complaints, setComplaints] = useState([]);
  const [drivers, setDrivers] = useState({});
  const [selectedStatus, setSelectedStatus] = useState(""); // State for selected status
  const [searchQuery, setSearchQuery] = useState("");
  const navigate = useNavigate();
  const [searchDate, setSearchDate] = useState("");

  //const employerUID = sessionStorage.getItem('employerUID');
  const gdtUID = sessionStorage.getItem("gdtUID");

  useEffect(() => {
    const fetchDriversAndComplaints = async () => {
      if (!gdtUID) return;

      //const employerDoc = await getDoc(doc(db, 'Employer', employerUID));
      const GdtDoc = await getDoc(doc(db, "GDT", gdtUID));
      if (!GdtDoc.exists()) {
        console.error("No such gdt!");
        return;
      }

      //const companyName = employerDoc.data().CompanyName;

      // Fetch all drivers
      const driverCollection = query(collection(db, "Driver"));

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
              shortCompanyName: "", // Placeholder for ShortCompanyName
            };
          }

          driverIds.push(data.DriverID);
          companyPromises.push(
            fetchCompany(data.CompanyName).then((shortName) => {
              driverMap[data.DriverID].shortCompanyName = shortName;
            })
          );
        });

        setDrivers(driverMap); // Update state with driver names
        fetchComplaints(driverIds);
      });

      return () => unsubscribeDrivers();
    };

    const fetchCompany = async (companyName) => {
      const companyQuery = query(
        collection(db, "Employer"),
        where("CompanyName", "==", companyName)
      );

      const snapshot = await getDocs(companyQuery);
      if (!snapshot.empty) {
        const companyData = snapshot.docs[0].data();
        return companyData.ShortCompanyName || companyName; // Fallback to full name if short name not available
      }
      return companyName; // Return the original name if no match found
    };

    const fetchComplaints = (driverIds) => {
      if (driverIds.length === 0) return;

      const complaintCollection = query(collection(db, "Complaint"));

      const unsubscribeComplaints = onSnapshot(
        complaintCollection,
        (snapshot) => {
          const complaintList = snapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
          }));

          setComplaints(complaintList);
          fetchMotorcycles(complaintList);
        }
      );

      return () => unsubscribeComplaints();
    };

    const fetchMotorcycles = (complaintList) => {
      const violationIDs = complaintList.map(
        (complaint) => complaint.ViolationID
      ); // Use ViolationID for fetching
      if (violationIDs.length === 0) return;

      const motorcycleCollection = query(
        collection(db, "History"),
        where("ID", "in", violationIDs) // Match ID from History with ViolationID
      );

      const unsubscribeMotorcycles = onSnapshot(
        motorcycleCollection,
        (snapshot) => {
          const motorcycleMap = {};
          snapshot.forEach((doc) => {
            const data = doc.data();
            motorcycleMap[data.ID] = data.LicensePlate; // Map ID to LicensePlate
          });
          setMotorcycles(motorcycleMap);
        }
      );

      return () => unsubscribeMotorcycles();
    };

    fetchDriversAndComplaints();
  }, [gdtUID]);

  const GDTResponse = (RespondedBy, setResponseByName) => {
    try {
      // Reference to GDT collection with filtering
      const gdtQuery = query(
        collection(db, "GDT"),
        where("ID", "==", RespondedBy)
      );

      // Set up a real-time listener
      const unsubscribe = onSnapshot(gdtQuery, (snapshot) => {
        if (!snapshot.empty) {
          const gdtData = snapshot.docs[0].data();
          setResponseByName(`${gdtData.Fname} ${gdtData.Lname}`);
        } else {
          console.error("No GDT document found with ID:", RespondedBy);
          setResponseByName("Unknown");
        }
      });

      // Cleanup function to remove listener when component unmounts
      return unsubscribe;
    } catch (error) {
      console.error("Error fetching GDT details:", error);
      setResponseByName("Error");
    }
  };

  const ResponseBy = ({ respondedBy }) => {
    const [responseByName, setResponseByName] = useState("");

    useEffect(() => {
      if (respondedBy) {
        const unsubscribe = GDTResponse(respondedBy, setResponseByName);
        return () => unsubscribe && unsubscribe(); // Cleanup listener on unmount
      }
    }, [respondedBy]);

    return <span>{responseByName}</span>;
  };

  const filteredComplaints = complaints
    .sort((a, b) => (b.DateTime?.seconds || 0) - (a.DateTime?.seconds || 0)) // Sort by DateTime in descending order
    .filter((complaint) => {
      const complaintDate = complaint.DateTime
        ? new Date(complaint.DateTime.seconds * 1000)
            .toISOString()
            .split("T")[0]
        : "";

      const matchesStatus = selectedStatus
        ? complaint.Status === selectedStatus
        : true;

      const driverId = complaint.driverID;
      const licensePlate = motorcycles[complaint.ViolationID] || " ";

      const matchesSearchQuery =
        driverId.includes(searchQuery) ||
        licensePlate.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesDate = searchDate ? complaintDate === searchDate : true;

      return matchesStatus && matchesDate && matchesSearchQuery;
    });

  const columns = [
    {
      title: "Complaint ID",
      dataIndex: "ComplaintID",
      key: "id",
      align: "center",
    },
    {
      title: "Driver Name",
      key: "driverName",
      align: "center",
      render: (text, record) => {
        const driverName = drivers[record.driverID]?.name || "   ";
        const capitalizeddriverName =
          driverName.charAt(0).toUpperCase() + driverName.slice(1);
        return capitalizeddriverName;
      },
    },
    {
      title: "Company Name",
      key: "CompanyName",
      align: "center",

      render: (text, record) => {
        const companyName = drivers[record.driverID]?.shortCompanyName || "   ";
        const capitalizedCompanyName =
          companyName.charAt(0).toUpperCase() + companyName.slice(1);
        return capitalizedCompanyName;
      },
    },
    {
      title: "Motorcycle License Plate",
      key: "motorcyclePlate",
      align: "center",
      render: (text, record) => motorcycles[record.ViolationID] || "   ",
    },
    {
      title: "Status",
      key: "Status",
      align: "center",
      render: (text, record) => {
        const formattedStatus =
          record.Status.charAt(0).toUpperCase() +
          record.Status.slice(1).toLowerCase();
        const color =
          formattedStatus === "Pending"
            ? "orange"
            : formattedStatus === "Accepted"
            ? "green"
            : "red";
        return <span style={{ color }}>{formattedStatus}</span>;
      },
    },
    {
      title: "Response By",
      key: "Responsed",
      align: "center",
      render: (text, record) => {
        const formattedStatus =
          record.Status.charAt(0).toUpperCase() +
          record.Status.slice(1).toLowerCase();

        if (record.RespondedBy) {
          // Render the RespondedBy value with an underline
          return <ResponseBy respondedBy={record.RespondedBy} />;
        } else if (!record.RespondedBy) {
          return (
            <p
              style={{
                backgroundColor: "transparent",
                color: "red",
                border: "none",
                borderRadius: "4px",
                padding: "4px 8px",
                cursor: "default",
              }}
            >
              Need for Response
            </p>
          );
        } else {
          return null;
        }

        //return <span style={{ color }}>{formattedStatus}</span>;
      },
    },
    {
      title: "Date",
      key: "date",
      align: "center",
      render: (text, record) =>
        record.DateTime
          ? new Date(record.DateTime.seconds * 1000).toLocaleDateString()
          : "",
    },
    {
      title: "Complaint Details",
      key: "Details",
      align: "center",
      render: (text, record) => (
        <Link to={`/gdtcomplaints/general/${record.id}`}>
          <img style={{ cursor: "pointer" }} src={EyeIcon} alt="Details" />
        </Link>
      ),
    },
  ];

  return (
    <>
      <Header active="gdtcomplaints" />
      <div className="breadcrumb">
        <a onClick={() => navigate("/gdt-home")}>Home</a>
        <span> / </span>
        <a onClick={() => navigate("/GDTComplaintList")}>Complaints List</a>
      </div>
      <main>
        <div className={s.container}>
          <div className={s.searchHeader}>
            <h2 className={s.title}>Complaints List</h2>
            <div className={s.searchInputs}>
              <div className={s.searchContainer}>
                <svg
                  aria-hidden="true"
                  xmlns="http://www.w3.org/2000/svg"
                  width="24"
                  height="24"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <path
                    stroke="#059855"
                    strokeLinecap="round"
                    strokeWidth="2"
                    d="m21 21-3.5-3.5M17 10a7 7 0 1 1-14 0 7 7 0 0 1 14 0Z"
                  />
                </svg>

                <input
                  type="text"
                  placeholder="Search by Driver ID or License Plate"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{ width: "280px" }}
                />
              </div>

              <div className={s.searchContainer}>
                <div className={s.selectWrapper}>
                  <FaFilter className={s.filterIcon} />
                  <select
                    className={s.customSelect}
                    onChange={(event) => setSelectedStatus(event.target.value)}
                    defaultValue=""
                  >
                    <option value="" disabled>
                      Filter by Status
                    </option>
                    <option value="">All</option>
                    <option value="Pending">Pending</option>
                    <option value="Accepted">Accepted</option>
                    <option value="Rejected">Rejected</option>
                  </select>
                </div>
              </div>
              {/* <div className={s.searchContainer}>
                <input
                  type="date"
                  value={searchDate}
                  className={s.dateInput}
                  onChange={(e) => setSearchDate(e.target.value)}
                  style={{ width: "120px", backgroundColor: "transparent" }}
                />
              </div> */}
              <div
                className={c.searchContainerdate}
                style={{ position: "relative" }}
              >
                <div>
                  {/* Your SVG Icon */}
                  <svg
                    onClick={() =>
                      document.getElementById("date-input").focus()
                    }
                    viewBox="0 0 24 24"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                    style={{
                      position: "absolute",
                      top: "50%",
                      left: "1px",
                      transform: "translateY(-50%)",
                      cursor: "pointer",
                      width: "40px", // Adjusted width
                      height: "40px", // Adjusted height
                    }}
                  >
                    <path
                      d="M18 2V4M6 2V4"
                      stroke="#059855"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <path
                      d="M11.9955 13H12.0045M11.9955 17H12.0045M15.991 13H16M8 13H8.00897M8 17H8.00897"
                      stroke="#059855"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <path
                      d="M3.5 8H20.5"
                      stroke="#059855"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <path
                      d="M2.5 12.2432C2.5 7.88594 2.5 5.70728 3.75212 4.35364C5.00424 3 7.01949 3 11.05 3H12.95C16.9805 3 18.9958 3 20.2479 4.35364C21.5 5.70728 21.5 7.88594 21.5 12.2432V12.7568C21.5 17.1141 21.5 19.2927 20.2479 20.6464C18.9958 22 16.9805 22 12.95 22H11.05C7.01949 22 5.00424 22 3.75212 20.6464C2.5 19.2927 2.5 17.1141 2.5 12.7568V12.2432Z"
                      stroke="#059855"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <path
                      d="M3 8H21"
                      stroke="#059855"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                  <input
                    id="date-input"
                    type="date"
                    value={searchDate}
                    onChange={(e) => setSearchDate(e.target.value)}
                    style={{
                      width: "100%",
                      height: "40px", // Adjusted height
                      fontSize: "16px",
                      paddingLeft: "40px", // Add padding to avoid overlap with the icon
                      backgroundColor: "transparent",
                      border: "0px solid #ccc",
                      borderRadius: "4px",
                    }}
                  />
                </div>
              </div>
            </div>
          </div>

          <Table
            columns={columns}
            dataSource={filteredComplaints}
            rowKey="id"
            pagination={{ pageSize: 5 }}
          />
        </div>
      </main>
    </>
  );
};

export default GDTComplaintList;

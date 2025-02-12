import React, { useEffect, useState } from "react";
import { db } from "../firebase";
import { Link, useNavigate } from "react-router-dom";
import {
  collection,
  onSnapshot,
  doc,
  getDoc,
  query,
  where,
} from "firebase/firestore";
import EyeIcon from "../images/eye.png";
import { Table } from "antd";
import Header from "./Header";
import { Button, Modal, Select,} from "antd";
import { Pagination } from "antd";
import s from "../css/Violations.module.css";
import "../css/CustomModal.css";
import X from "../images/redx.webp";
import { FaFilter } from "react-icons/fa";

const ViolationList = () => {
  const [motorcycles, setMotorcycles] = useState({});
  const [violations, setViolations] = useState([]);
  const [drivers, setDrivers] = useState({});
  const [searchQuery, setSearchQuery] = useState("");
  const [searchDate, setSearchDate] = useState("");
  const navigate = useNavigate();
  const { Option } = Select; // Destructure Option from Select
  const [showDropdown, setShowDropdown] = useState(false);
  const [filters, setFilters] = useState({
    type: [],
    status: [],
  });
    const [isPopupVisible, setIsPopupVisible] = useState(false);
    const [dropdownOpen, setDropdownOpen] = useState(false);
    const [selectedValues, setSelectedValues] = useState([]);
  
    const options = [
      { value: "Reckless Violations", label: "Reckless Violations" },
      { value: "Normal Violations", label: "Normal Violations" },
      { value: "Active", label: "Active" },
      { value: "Revoked", label: "Revoked" },
    ];
  const [viewedViolations, setViewedViolations] = useState(() => {
    const storedViewedViolations = localStorage.getItem("viewedViolations");
    return storedViewedViolations ? JSON.parse(storedViewedViolations) : {};
  });
  const employerUID = sessionStorage.getItem("employerUID");
  const [violationTypeFilter, setViolationTypeFilter] = useState("");
  useEffect(() => {
    const fetchEmployerDrivers = async () => {
      if (employerUID) {
        const employerDoc = await getDoc(doc(db, "Employer", employerUID));
        if (employerDoc.exists()) {
          const companyName = employerDoc.data().CompanyName;
          fetchDrivers(companyName);
        } else {
          console.error("No such employer!");
        }
      }
    };

    fetchEmployerDrivers();
  }, [employerUID]);
  const handleViewViolations = () => {
    if (violations.length > 0) {
      navigate(`/ricklessdrives`); // Navigate to the first violation
    } else {
      setIsPopupVisible(true); // Show popup if no violation exist
    }
  };
  const fetchDrivers = (companyName) => {
    const driverCollection = query(
      collection(db, "Driver"),
      where("CompanyName", "==", companyName)
    );

    const unsubscribe = onSnapshot(driverCollection, (snapshot) => {
      const driverMap = {};
      const driverIDs = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        driverMap[data.DriverID] = `${data.Fname} ${data.Lname}`;
        driverIDs.push(data.DriverID);
      });
      setDrivers(driverMap);
      if (driverIDs.length > 0) {
        fetchViolations(driverIDs);
      } else {
        setViolations([]);
      }
    });

    return () => unsubscribe();
  };

  const fetchMotorcycles = (violationIDs) => {
    const motorcycleCollection = query(
      collection(db, "History"),
      where("ID", "in", violationIDs) // Matching by violationID
    );

    const unsubscribe = onSnapshot(motorcycleCollection, (snapshot) => {
      const motorcycleMap = {};
      snapshot.forEach((doc) => {
        const data = doc.data();
        console.log("Fetched Motorcycle Data:", data); // Log fetched motorcycle data
        motorcycleMap[data.ID] = data.LicensePlate; // Map ID to License Plate
      });
      console.log("Motorcycle Map:", motorcycleMap); // Log the entire motorcycle map
      setMotorcycles(motorcycleMap);
    });

    return () => unsubscribe();
  };

  const fetchViolations = (driverIDs) => {
    const violationCollection = query(
      collection(db, "Violation"),
      where("driverID", "in", driverIDs)
    );
    const unsubscribe = onSnapshot(violationCollection, (snapshot) => {
      const violationList = snapshot.docs.map((doc) => {
        const data = doc.data();
        const isReckless = data.count30 > 0 || data.count50 > 0;
        return {
          id: doc.id,
          ...data,
          isReckless, // Add reckless classification
        };
      });
      setViolations(violationList);
      if (violationList.length > 0) {
        const violationIDs = violationList.map((v) => v.violationID); // Collecting violation IDs
        fetchMotorcycles(violationIDs); // Fetch motorcycles using violation IDs
      } else {
        setMotorcycles({});
      }
    });

    return () => unsubscribe();
  };

  // Filtering violations
  const toggleDropdown = () => setDropdownOpen(!dropdownOpen);

  const handleSelect = (value) => {
    const newSelection = selectedValues.includes(value)
      ? selectedValues.filter((v) => v !== value)
      : [...selectedValues, value];

    setSelectedValues(newSelection);
    const newType = newSelection.filter(val => val === "Reckless Violations" || val === "Normal Violations");
    const newStatus = newSelection.filter(val => val === "Active" || val === "Revoked");
    setFilters({ type: newType, status: newStatus });
  };

  const filteredViolations = violations
  .filter((violation) => {
    const driverName = drivers[violation.driverID]?.name || "";
    const licensePlate = motorcycles[violation.violationID] || ' ';

    let violationDate = "";
    if (violation.time) {
      violationDate = new Date(violation.time * 1000)
        .toISOString()
        .split("T")[0];
    }

    const matchesSearchQuery = driverName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      licensePlate.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesSearchDate = searchDate
      ? violationDate === searchDate
      : true;

    const matchesTypeFilter = filters.type.length === 0 ||
      (filters.type.includes("Reckless Violations") && violation.isReckless) ||
      (filters.type.includes("Normal Violations") && !violation.isReckless);

    const matchesStatusFilter = filters.status.length === 0 ||
      filters.status.includes(violation.Status); // Make sure this matches your data

    console.log(`Checking violation: ${violation.id} - Status: ${violation.Status}, Matches Status Filter: ${matchesStatusFilter}`);

    return matchesSearchQuery && matchesSearchDate && matchesTypeFilter && matchesStatusFilter;
  })
  .sort((a, b) => {
    return (b.time || 0) - (a.time || 0);
  });

  // Function to format the date
  const formatDate = (time) => {
    const date = new Date(time * 1000); // Assuming timestamp is in seconds
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, "0"); // Months are 0-based
    const day = date.getDate().toString().padStart(2, "0"); // Days are 1-based
    return `${month}/${day}/${year}`; // Format as MM/DD/YYYY
  };

  const handleViewDetails = (record) => {
    const updatedViewedViolations = { ...viewedViolations, [record.id]: true };
    setViewedViolations(updatedViewedViolations);
    localStorage.setItem(
      "viewedViolations",
      JSON.stringify(updatedViewedViolations)
    );

    // Navigate after updating the state
    navigate(`/violation/general/${record.id}`);
  };
  console.log("Session Storage:", sessionStorage.getItem("viewedViolations"));
  const capitalizeFirstLetter = (string) => {
    if (!string) return "";
    return string
      .split(" ")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(" ");
  };

  const columns = [
    {
      title: "Violation ID",
      dataIndex: "violationID",
      key: "violationID",
      align: "center",
    },
    {
      title: "Driver Name",
      key: "driverName",
      align: "center",
      render: (text, record) => {
        const driverName = drivers[record.driverID] || "";
        return capitalizeFirstLetter(driverName);
      },
    },
    {
      title: "Motorcycle License Plate",
      key: "motorcyclePlate",
      align: "center",
      render: (text, record) => motorcycles[record.violationID] || "   ", // Use violationID for lookup
    },
    {
      title: "Speed",
      dataIndex: "driverSpeed",
      key: "driverSpeed",
      align: "center",
    },
    {
      title: "Type",
      dataIndex: "violationType",
      key: "violationType",
      align: "center",
      render: (text, record) =>
        record.isReckless ? "Reckless Violation" : "Regular Violation",
    },
    {
      title: "Status",
      dataIndex: "Status",
      key: "Status",
      align: "center",
      render: (text, record) => (
        <span style={{ color: record.Status === "Active" ? 'green' : 'red' }}>
          {record.Status}
        </span>
      ),    
    },
    {
      title: "Date",
      key: "date",
      align: "center",
      render: (text, record) => formatDate(record.time),
    },
    {
      title: "Violation Details",
      key: "Details",
      align: "center",
      render: (text, record) => (
        <Link
          to={`/violation/general/${record.id}`}
          onClick={() => handleViewDetails(record)}
        >
          <img style={{ cursor: "pointer" }} src={EyeIcon} alt="Details" />
        </Link>
      ),
    },
  ];

  

  return (
    <>
      <Header active="violations" />
      <div className="breadcrumb">
        <a onClick={() => navigate("/employer-home")}>Home</a>
        <span> / </span>
        <a onClick={() => navigate("/violations")}>Violations List</a>
      </div>
      <main>
        <div className={s.container}>
          <div className={s.searchHeader}>
            <h2 className={s.title}>Violations List</h2>
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
                  placeholder="Search by Driver Name or License Plate"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{ width: "280px" }}
                />
              </div>
              <div className={s.searchContainer}>
  <div className={`${s.selectWrapper} ${s.dropdownContainer}`}>
    <FaFilter className={s.filterIcon} />
    <div style={{ position: 'relative', width: '300px', height: '30px' }}>
      <div
        onClick={toggleDropdown}
        style={{
          padding: '10px',
          backgroundColor: 'transparent', // Make background transparent
          cursor: 'pointer',
          borderRadius: '4px',
          transition: 'border 0.3s',
          color: 'grey', // Set text color to grey
          lineHeight: '0.8', 
        }}
      >
        {'Filter violations'}
      </div>
      {dropdownOpen && (
  <div
    style={{
      position: 'absolute',
      background: 'white',
      border: '1px solid #ccc',
      borderRadius: '4px',
      zIndex: 1000,
      width: '230px', // Set a wider width for the dropdown
      left: '-40px', // Adjust this value to move the dropdown left

    }}
  >
    <div style={{ padding: '10px', fontWeight: 'bold' }}>Type</div>
    {options.filter(option => option.value === "Reckless Violations" || option.value === "Normal Violations").map((option) => (
      <div key={option.value} style={{ padding: '10px', cursor: 'pointer' }}>
        <label style={{ display: 'flex', alignItems: 'center' }}>
          <input
            type="checkbox"
            checked={selectedValues.includes(option.value)}
            onChange={() => handleSelect(option.value)}
            style={{ marginRight: '10px' }} // Space between checkbox and text
          />
          {option.label}
        </label>
      </div>
    ))}
    <div style={{ padding: '10px', fontWeight: 'bold' }}>Status</div>
    {options.filter(option => option.value === "Active" || option.value === "Revoked").map((option) => (
      <div key={option.value} style={{ padding: '10px', cursor: 'pointer' }}>
        <label style={{ display: 'flex', alignItems: 'center' }}>
          <input
            type="checkbox"
            checked={selectedValues.includes(option.value)}
            onChange={() => handleSelect(option.value)}
            style={{ marginRight: '10px' }} // Space between checkbox and text
          />
          {option.label}
        </label>
      </div>
    ))}
    {/* Reset Button */}
    <div style={{ padding: '10px', textAlign: 'center' }}>
      <button
        onClick={() => {
          setSelectedValues([]); // Reset selected values
          setFilters({ type: [], status: [] }); // Reset filters
          toggleDropdown(); // Optionally close the dropdown
        }}
        style={{
          backgroundColor: '#1c7a50',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          padding: '8px 0', // Adjust padding for better appearance
          cursor: 'pointer',
          width: '100%', 
        }}
      >
        Reset Filter
      </button>
    </div>
  </div>
)}
  </div>
  </div>
</div>
              <div className={s.searchContainer}>
             
                <input
                  type="date"
                  value={searchDate}
                  onChange={(e) => setSearchDate(e.target.value)}
                  style={{ width: "120px", backgroundColor: "transparent" }}
                />
              </div>
            </div>
          </div>

          <Table
            columns={columns}
            dataSource={filteredViolations}
            rowKey="id"
            pagination={false}
          />

          {/* Flex container for button and pagination */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginTop: "16px",
            }}
          >
            <Button
              onClick={handleViewViolations}
              style={{
                width: "auto",
                height: "60px",
                fontSize: "15px",
                color: "#059855",
                borderColor: "#059855",
              }}
            >
              <i className="fas fa-eye" style={{ marginRight: "8px" }}></i>
              View Reckless Drivers
            </Button>

            <Pagination
              defaultCurrent={1}
              total={filteredViolations.length}
              pageSize={5} // Number of items per page
              style={{ marginLeft: "auto" }} // Align pagination to the right
            />
          </div>

          {/* Popup for no violations */}
          <Modal
            title={null}
            visible={isPopupVisible}
            onCancel={() => setIsPopupVisible(false)}
            footer={
              <p style={{ textAlign: "center" }}>
                There are no drivers with reckless violations.
              </p>
            }
            style={{ top: "38%" }}
            className="custom-modal"
            closeIcon={<span className="custom-modal-close-icon">×</span>}
          >
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                textAlign: "center",
              }}
            >
              <img
                src={X}
                alt="No Reckless Drivers"
                style={{ width: "20%", marginBottom: "16px" }}
              />
            </div>
          </Modal>
        </div>
      </main>
    </>
  );
};

export default ViolationList;

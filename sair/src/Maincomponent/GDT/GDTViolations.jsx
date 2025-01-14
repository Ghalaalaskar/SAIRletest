import React, { useEffect, useState } from "react";
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
import { Table } from "antd";
import Header from "./GDTHeader";
import s from "../../css/Violations.module.css";
import "../../css/CustomModal.css";
import { Button, Modal } from "antd";
import X from "../../images/redx.webp";
import { Pagination } from "antd";
import { FaFilter } from "react-icons/fa";
const ViolationList = () => {
  const [motorcycles, setMotorcycles] = useState({});
  const [violations, setViolations] = useState([]);
  const [drivers, setDrivers] = useState({});
  const [searchQuery, setSearchQuery] = useState("");
  const [searchDate, setSearchDate] = useState("");
  const navigate = useNavigate();
  const [violationTypeFilter, setViolationTypeFilter] = useState("");
  const gdtUID = sessionStorage.getItem("gdtUID");
  const [isPopupVisible, setIsPopupVisible] = useState(false);
  useEffect(() => {
    const fetchEmployerDrivers = async () => {
      if (gdtUID) {
        const employerDoc = await getDoc(doc(db, "GDT", gdtUID));
        fetchDrivers();
      }
    };

    fetchEmployerDrivers();
  }, [gdtUID]);

  const fetchDrivers = () => {
    const driverCollection = query(collection(db, "Driver"));

    const unsubscribe = onSnapshot(driverCollection, (snapshot) => {
      const driverMap = {};
      const driverIDs = [];
      const companyPromises = [];

      snapshot.forEach((doc) => {
        const data = doc.data();
        driverMap[data.DriverID] = {
          name: `${data.Fname} ${data.Lname}`,
          companyName: data.CompanyName,
          shortCompanyName: "", // Placeholder for ShortCompanyName
        };
        driverIDs.push(data.DriverID);

        // Add a promise to fetch the company details
        companyPromises.push(
          fetchCompany(data.CompanyName).then((shortName) => {
            driverMap[data.DriverID].shortCompanyName = shortName;
          })
        );
      });

      // Wait for all company data to be fetched before updating state
      Promise.all(companyPromises).then(() => {
        setDrivers(driverMap);
      });

      // Fetch violations if there are valid driver IDs
      if (driverIDs.length > 0) {
        fetchViolations(driverIDs);
      } else {
        setViolations([]);
      }
    });

    return () => unsubscribe();
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

  const fetchMotorcycles = (violationIDs) => {
    const motorcycleCollection = query(
      collection(db, "History"),
      where("ID", "in", violationIDs) // Matching by violationID
    );
    const unsubscribe = onSnapshot(motorcycleCollection, (snapshot) => {
      const motorcycleMap = {};
      snapshot.forEach((doc) => {
        const data = doc.data();
        console.log("Fetched Motorcycle Data:", data);
        motorcycleMap[data.ID] = data.LicensePlate; // Map ID to License Plate
      });
      console.log("Motorcycle Map:", motorcycleMap); // Log the entire motorcycle map
      setMotorcycles(motorcycleMap);
    });

    return () => unsubscribe();
  };

  const handleViewViolations = () => {
    if (violations.length > 0) {
      navigate(`/gdtricklessdrives`); // Navigate to the first violation
    } else {
      setIsPopupVisible(true); // Show popup if no violation exist
    }
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
  const filteredViolations = violations
    .filter((violation) => {
      const driverName = drivers[violation.driverID]?.name || "";
      const companyName = drivers[violation.driverID]?.shortCompanyName || "";

      let violationDate = "";
      if (violation.time) {
        violationDate = new Date(violation.time * 1000)
          .toISOString()
          .split("T")[0];
      }

      const matchesSearchQuery =
        driverName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        companyName.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesSearchDate = searchDate
        ? violationDate === searchDate
        : true;

      let matchesTypeFilter = true;
      if (violationTypeFilter === "Reckless Violations") {
        matchesTypeFilter = violation.isReckless;
      } else if (violationTypeFilter === "Normal Violations") {
        matchesTypeFilter = !violation.isReckless;
      }

      return matchesSearchQuery && matchesSearchDate && matchesTypeFilter;
    })
    .sort((a, b) => {
      return (b.time || 0) - (a.time || 0);
    });
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
        const driverName = drivers[record.driverID]?.name || "";
        return capitalizeFirstLetter(driverName);
      },
    },
    {
      title: "Company Name",
      key: "CompanyName",
      align: "center",
      render: (text, record) => {
        const companyName = drivers[record.driverID]?.shortCompanyName || "";
        return capitalizeFirstLetter(companyName);
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
      title: "Violation Details",
      key: "Details",
      align: "center",
      render: (text, record) => (
        <Link
          to={`/gdtviolation/general/${record.id}`}
          state={{ breadcrumbParam: "Violation List" }}
        >
          <img style={{ cursor: "pointer" }} src={EyeIcon} alt="Details" />
        </Link>
      ),
    },
  ];

  return (
    <>
      <Header active="gdtviolations" />
      <div className="breadcrumb">
        <a onClick={() => navigate("/gdthome")}>Home</a>
        <span> / </span>
        <a onClick={() => navigate("/GDTviolations")}>Violations List</a>
      </div>
      <main>
        {" "}
        <div>
          <div className={s.container}>
            <div className={s.searchHeader}>
              <h2 className={s.title}>Violations List</h2>
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
                    placeholder="Search by Driver Name or Company Name"
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
                    onChange={(e) => setViolationTypeFilter(e.target.value)} 
                    value={violationTypeFilter} 
                  >
                    <option value="" disabled>
                      Filter Violations
                    </option>
                    <option value="">All</option>
                    <option value="Reckless Violations">
                      Reckless Violations
                    </option>
                    <option value="Normal Violations">Regular Violations</option>
                  </select>
                </div>
                
                </div>
                <div className={s.searchInputs}>
                {/* Search inputs */}
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
                alt="No Complaints"
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

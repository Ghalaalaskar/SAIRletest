import { DownOutlined, UserOutlined, BellOutlined } from "@ant-design/icons";
import { Dropdown, Menu, Modal, Button, Badge } from "antd";
import { Link, useNavigate } from "react-router-dom";
import SAIRLogo from "../../images/SAIRlogo.png";
import { auth, db } from "../../firebase";
import { useEffect, useState } from "react";
import { doc, getDoc } from "firebase/firestore";
import s from "../../css/Header.module.css";
import "../../css/CustomModal.css";
import styles from "../../css/BadgeStyles.module.css";
import { FirstNameContext } from "../../FirstNameContext";
import { useContext } from "react";
import { v4 as uuidv4 } from "uuid";
const GDTHeader = ({ active }) => {
  const { firstName, setFirstName } = useContext(FirstNameContext);
  const navigate = useNavigate();
  const [modalVisible, setModalVisible] = useState(false);
  const [name, setName] = useState("");
  // const [isAdmin, setIsAdmin] = useState(false); // New state for isAdmin
  const isAdmin = sessionStorage.getItem("isAdmin") === "true"; // Retrieve isAdmin once

  const [hasNewCrashes, setHasNewCrashes] = useState(() => {
    const saved = localStorage.getItem("hasNewCrashes");
    return saved ? JSON.parse(saved) : false;
  });

  useEffect(() => {
    const fetchFirstName = async () => {
      console.log(firstName);
      if (!firstName) {
        // Fetch only if not already set
        const gdtUID = sessionStorage.getItem("gdtUID");
        if (gdtUID) {
          try {
            const userDocRef = doc(db, "GDT", gdtUID);
            const docSnap = await getDoc(userDocRef);
            if (docSnap.exists()) {
              const data = docSnap.data();
              setFirstName(data.Fname || "");
            }
          } catch (error) {
            console.error("Error fetching first name:", error);
          }
        }
      }
    };

    fetchFirstName();
  }, [firstName, setFirstName]); // Only rerun when `firstName` or `setFirstName` changes

  // Function to remove all staff-related session storage keys and navigate
  const handleNavigation = (path) => {
    Object.keys(sessionStorage).forEach((key) => {
      if (key.startsWith("staff_")) {
        sessionStorage.removeItem(key);
      }
    });

    navigate(path);
  };

  // useEffect(() => {
  //   const fetchName = async () => {
  //     const GDTUID = sessionStorage.getItem('gdtUID');
  //     console.log('GDTUID:', GDTUID);
  //     if (GDTUID) {
  //       try {
  //         const userDocRef = doc(db, 'GDT', GDTUID);
  //         const docSnap = await getDoc(userDocRef);
  //         if (docSnap.exists()) {
  //           const data = docSnap.data();
  //           console.log('Fetched data:', data);
  //           setName(data.Fname || '');

  //         } else {
  //           console.log('No such document!');
  //         }
  //       } catch (error) {
  //         console.error('Error fetching name:', error);
  //       }
  //     } else {
  //       console.log('GDTUID is not set in session storage');
  //     }
  //   };
  //   fetchName();
  // }, []);

  const handleLogout = async () => {
    try {
      await auth.signOut(); // Sign out the user
      sessionStorage.removeItem("gdtUID");
      sessionStorage.removeItem("FirstName");
      sessionStorage.removeItem("isAdmin");
      window.dispatchEvent(new Event("storage")); // Notify other components
      navigate("/");
    } catch (error) {
      console.error("Error during logout:", error);
    } finally {
      setModalVisible(false);
    }
  };

  const notificationMenu = (
    <div
      style={{
        width: "380px",
        height: "400px",
        backgroundColor: "#ffffff",
        borderRadius: "8px",
        padding: "10px",
        boxShadow: "0 4px 8px rgba(0, 0, 0, 0.1)",
        overflowY: "auto",
      }}
    >
      <h3 style={{ fontSize: "18px", marginBottom: "10px", color: "#333" }}>
        Crash Notifications
      </h3>
      <hr
        style={{
          border: "0",
          borderTop: "1px solid #ddd",
          marginTop: "0",
          marginBottom: "10px",
        }}
      />
    </div>
  );

  const menu = (
    <Menu>
      <Menu.Item
        key="profile"
        onClick={() => {
          const randomQuery = isAdmin ? `?${uuidv4()}` : '';
          handleNavigation(`/gdtprofile${randomQuery}`);
        }}
      >
        Profile
      </Menu.Item>
      <Menu.Item
        key="logout"
        onClick={() => setModalVisible(true)}
        style={{ color: "red" }}
      >
        Logout
      </Menu.Item>
    </Menu>
  );
  

  const navItems = [
    { path: "gdthome", label: "Home" },
    { path: "gdtstafflist", label: "Staff List", adminOnly: true },
    { path: "gdtdriverlist", label: "Drivers List" },
    { path: "gdtviolations", label: "Violations List" },
    { path: "gdtcomplaints", label: "Complaints List" },
    { path: "gdtcrashes", label: "Crashes List" },
    { path: "gdtdashboard", label: "Dashboard" },
    { path: "gdtheatmap", label: "Heat-Map" },
  ];

  return (
    <header>
      <nav>
        <img
          className={s.logo}
          src={SAIRLogo}
          alt="SAIR Logo"
          onClick={() => {
            const randomQuery = isAdmin ? `?${uuidv4()}` : '';
            handleNavigation(`/gdthome${randomQuery}`);
          }}
        />

        <div className={s.navLinks} id="navLinks">
          <ul>
            {navItems.map((item) => {
              // Only render if not adminOnly or user is admin
              if (!item.adminOnly || isAdmin) {
                const randomQuery = isAdmin ? `?${uuidv4()}` : ""; // Add randomQuery only for admins

                return (
                  <li key={item.path}>
                    <a
                      className={active === item.path ? s.active : ""}
                      onClick={() =>
                        handleNavigation(`/${item.path}${randomQuery}`)
                      }
                    >
                      {item.label}
                    </a>
                  </li>
                );
              }

              // Skip rendering if the condition fails
              return null;
            })}
          </ul>
        </div>

        <div className={s.logoutButton}>
          <Dropdown
            overlay={menu}
            trigger={["click"]}
            style={{ fontSize: "15px", zIndex: 999999 }}
          >
            <Link
              to={(e) => e.preventDefault()}
              style={{
                display: "flex",
                alignItems: "center",
                color: "black",
                fontSize: "17px",
              }}
              onClick={(e) => {
                e.preventDefault();  // Prevent navigation
              }}
              onMouseEnter={(e) => (e.currentTarget.style.color = "#059855")}
              onMouseLeave={(e) => (e.currentTarget.style.color = "black")}
            >
              <UserOutlined style={{ marginRight: 10 }} />
              Hello {firstName ? firstName.charAt(0).toUpperCase() + firstName.slice(1) : ""}
              <DownOutlined style={{ marginLeft: 15 }} />
            </Link>
          </Dropdown>

          <Dropdown overlay={notificationMenu} trigger={["click"]}>
            <Badge dot={hasNewCrashes} className={styles.customBadge}>
              <BellOutlined
                className={styles.bellIcon}
                onMouseEnter={(e) => (e.currentTarget.style.color = "#059855")}
                onMouseLeave={(e) => (e.currentTarget.style.color = "black")}
              />
            </Badge>
          </Dropdown>
        </div>
      </nav>

      {/* Logout Confirmation Modal */}
      <Modal
        title="Confirm Logout"
        visible={modalVisible}
        onCancel={() => setModalVisible(false)}
        centered
        style={{ top: "1%" }}
        className="custom-modal"
        closeIcon={<span className="custom-modal-close-icon">×</span>}
        footer={[
          <Button key="cancel" onClick={() => setModalVisible(false)}>
            Cancel
          </Button>,
          <Button
            key="logout"
            onClick={handleLogout}
            style={{ backgroundColor: "red", color: "white" }}
          >
            Logout
          </Button>,
        ]}
      >
        <p>Are you sure you want to log out?</p>
      </Modal>
    </header>
  );
};

export default GDTHeader;
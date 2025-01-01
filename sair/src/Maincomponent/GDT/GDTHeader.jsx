import { DownOutlined, UserOutlined, BellOutlined } from '@ant-design/icons';
import { Dropdown, Menu, Modal, Button,Badge ,Divider} from 'antd';
import { Link, useNavigate } from 'react-router-dom';
import SAIRLogo from '../images/SAIRlogo.png';
import { auth, db } from '../firebase';
import { useEffect, useState,useCallback , useRef} from 'react';
import { doc, getDoc } from 'firebase/firestore';
import s from '../css/Header.module.css';
import { useContext } from 'react';
import { ShortCompanyNameContext } from '../ShortCompanyNameContext';
import '../css/CustomModal.css';
import { collection, onSnapshot, query, where,orderBy,updateDoc } from 'firebase/firestore';
import styles from "../css/BadgeStyles.module.css";

const GDTHeader = ({ active }) => {
  const { Name , setName} = useContext();
  const navigate = useNavigate();
  const [modalVisible, setModalVisible] = useState(false);
  const [crashes, setCrashes] = useState([]); // Store crash notifications
  const [drivers, setDrivers] = useState({});

   ///ABOUT RED CIRCULE VISIBILITY
   const [isFirstLogin, setIsFirstLogin] = useState(false);
   const [hasNewCrashes, setHasNewCrashes] = useState(() => {
    const saved = localStorage.getItem("hasNewCrashes");
    return saved ? JSON.parse(saved) : false; // Default to false if not saved
  });
     const [storedCrashIds, setStoredCrashIds] = useState(() => {
    const saved = localStorage.getItem("crashIds");
    return saved ? JSON.parse(saved) : []; // Parse JSON if found, else initialize as an empty array
  });
  const [refreshKey, setRefreshKey] = useState(0);


    ///ABOUT RED CIRCULE VISIBILITY


  useEffect(() => {
    const fetchName = async () => {
      if (!shortCompanyName) { // Only fetch if it's not set
        const GDTUID = sessionStorage.getItem('GDTUID');
        if (GDTUID) {
          try {
            const userDocRef = doc(db, 'GDT', GDTUID);
            const docSnap = await getDoc(userDocRef);
            if (docSnap.exists()) {
              const data = docSnap.data();
              setName(data.Fname || '');
            }
          } catch (error) {
            console.error('Error fetching name:', error);
          }
        }
      }
    };

    fetchName();
  }, [Name , setName]);

 


  

  const handleLogout = async () => {
    try {
      await auth.signOut(); // Sign out the user
      // Clear all session-specific data
      sessionStorage.removeItem('ShortCompanyName');
      sessionStorage.removeItem('employerUID');
      localStorage.removeItem('crashIds');
      localStorage.removeItem('hasNewCrashes');
      window.dispatchEvent(new Event('storage')); // Notify other components
      // Navigate to the login page
      navigate('/');
    } catch (error) {
      console.error('Error during logout:', error);
    } finally {
      setModalVisible(false); // Close the logout confirmation modal
    }
  };

 
  const notificationMenu = (
    <div
      style={{
        width: '380px', // Increase the width
        height: '400px', // Increase the height
        backgroundColor: '#ffffff',
        borderRadius: '8px',
        padding: '10px',
        boxShadow: '0 4px 8px rgba(0, 0, 0, 0.1)',
        overflowY: 'auto', // Enable scrolling for long lists
      }}
    >
      <h3 style={{ fontSize: '18px', marginBottom: '10px', color: '#333' }}>
        Crash Notifications
      </h3>
      <hr
      style={{
        border: '0',
        borderTop: '1px solid #ddd',
        marginTop: '0', // Controls the spacing between the title and the line
        marginBottom: '10px', 

      }}
    />
      {crashes.length > 0 ? (
        crashes.map((crash) => {
          const date = formatDate(crash.time);
          const time = new Date(crash.time * 1000).toLocaleTimeString();
          const driverName = drivers[crash.driverID] || 'Unknown Driver';
  
          return (
            <div
              key={crash.id}
              style={{
                padding: '10px',
                borderBottom: '1px solid #ddd',
                cursor: 'pointer',
              }}
              onClick={() => handleNotificationClick(crash)}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#f0f0f0')}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'white')}
            >
              <strong>Driver: {driverName}</strong>
              <br />
              <span>
                Crash detected on {date} at {time}.
              </span>
            </div>
          );
        })
      ) : (
        <div style={{ textAlign: 'center', marginTop: '50px', color: '#aaa' }}>
          <BellOutlined style={{ fontSize: '36px', marginBottom: '10px' }} />
          <p>No new notifications</p>
        </div>
      )}
    </div>
  );
  
  const menu = (
    <Menu>
      <Menu.Item key='profile' onClick={() => navigate('/employee-profile')}>
        Profile
      </Menu.Item>
      <Menu.Item key='logout' onClick={showModal} style={{ color: 'red' }}>
        Logout
      </Menu.Item>
    </Menu>
  );


  // onClick={() => handleNotificationClick(index, notification)}
  const navItems = [
    { path: 'gdthome', label: 'Home' },
    { path: 'violations', label: 'Violations List' },
    { path: 'crashes', label: 'Crashes List' },
    { path: 'complaints', label: 'Complaints List' },
    { path: 'driverslist', label: 'Drivers List' },
    { path: 'motorcycleslist', label: 'Motorcycles List' },
  ];

  return (
    <header>
      <nav>
        <Link to={'/employer-home'}>
          <img className={s.logo} src={SAIRLogo} alt='SAIR Logo' />
        </Link>

        <div className={s.navLinks} id='navLinks'>
<ul>
      {navItems.map((item) => (
        <li key={item.path}>
          <Link className={active === item.path ? s.active : ''} to={`/${item.path}`}>
            {item.label}
          </Link>
        </li>
      ))}
    </ul>
        </div>

        <div className={s.logoutButton}>

          <Dropdown overlay={menu} trigger={['click']} style={{ fontSize: '15px', zIndex: 999999 }}>
            <Link
              to={(e) => e.preventDefault()}
              style={{ display: 'flex', alignItems: 'center', color: 'black', fontSize: '17px' }}
              onMouseEnter={(e) => (e.currentTarget.style.color = '#059855')}
              onMouseLeave={(e) => (e.currentTarget.style.color = 'black')}
            >
              <UserOutlined style={{ marginRight: 10 }} />
              Hello {shortCompanyName || ''}
              <DownOutlined style={{ marginLeft: 15 }} />
            </Link>
          </Dropdown>

          
          <Dropdown overlay={notificationMenu} trigger={['click']}>
             
           <Badge dot={hasNewCrashes}  className={styles.customBadge}>
           <BellOutlined className={styles.bellIcon} 
                onMouseEnter={(e) => (e.currentTarget.style.color = '#059855')}
                onMouseLeave={(e) => (e.currentTarget.style.color = 'black')}
              />
            </Badge>
          </Dropdown>

        </div>
      </nav>
      

      {/* Logout Confirmation Modal */}
      <Modal
        title="Confirm Logout"
        visible={modalVisible}
        onCancel={handleCancel}
        centered
        style={{ top: '1%' }}
        className="custom-modal"
        closeIcon={
          <span className="custom-modal-close-icon">
            ×
          </span>
        }
        footer={[
          <Button key="cancel" onClick={handleCancel}>
            Cancel
          </Button>,
          <Button key="logout" onClick={handleLogout} style={{ backgroundColor: 'red', color: 'white' }}>
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
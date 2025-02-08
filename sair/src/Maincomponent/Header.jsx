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
import { Check } from "lucide-react"; // Importing the check icon
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCheck } from "@fortawesome/free-solid-svg-icons";
import { BsCheck2Square } from "react-icons/bs"; // Importing the icon
import { FaRegCheckCircle } from "react-icons/fa";


const Header = ({ active }) => {
  const { shortCompanyName , setShortCompanyName} = useContext(ShortCompanyNameContext);
  const navigate = useNavigate();
  const [modalVisible, setModalVisible] = useState(false);
  const [crashes, setCrashes] = useState([]); // Store crash notifications
  const [drivers, setDrivers] = useState({});
  const [notReadCrashes, setNotReadCrashes] = useState([]);
  const [readCrashes, setReadCrashes] = useState(
    JSON.parse(localStorage.getItem("readCrashes")) || {}
  );

  const [notReadCrashes22, setnotReadCrashes22] = useState(
    JSON.parse(localStorage.getItem("notReadCrashes22")) || {}
  );
  //  const [hasNewCrashes, setHasNewCrashes] = useState(() => {
  //   const saved = localStorage.getItem("hasNewCrashes");
  //   return saved ? JSON.parse(saved) : false; // Default to false if not saved
  // });
  const [hasNewCrashes, setHasNewCrashes] = useState(Object.keys(notReadCrashes22).length > 0);

     const [storedCrashIds, setStoredCrashIds] = useState(() => {
    const saved = localStorage.getItem("crashIds");
    return saved ? JSON.parse(saved) : []; // Parse JSON if found, else initialize as an empty array
  });
  const [refreshKey, setRefreshKey] = useState(0);

 
 


  useEffect(() => {
    const fetchShortCompanyName = async () => {
      console.log('in headerr',shortCompanyName);
      if (!shortCompanyName) { // Only fetch if it's not set
        const employerUID = sessionStorage.getItem('employerUID');
        if (employerUID) {
          try {
            const userDocRef = doc(db, 'Employer', employerUID);
            const docSnap = await getDoc(userDocRef);
            if (docSnap.exists()) {
              const data = docSnap.data();
              setShortCompanyName(data.ShortCompanyName || '');
              console.log('in headerr',shortCompanyName);
            }
          } catch (error) {
            console.error('Error fetching short company name:', error);
          }
        }
      }
    };

    fetchShortCompanyName();
  }, [shortCompanyName, setShortCompanyName]);


  // useEffect(() => {
  //   // Check if this is the first login
  //   const savedCrashIds = localStorage.getItem("crashIds");

  //   if (!savedCrashIds) {
  //     // No crash IDs found in localStorage, mark as first login
  //     console.log("First login detected: Initializing crash IDs");
  //     setIsFirstLogin(true); // Mark first login
  //     localStorage.setItem("crashIds", JSON.stringify([])); // Initialize crash IDs in localStorage
  //   }
  // }, []);
 

//   useEffect(() => {
//     const notReadCrashes22 = JSON.parse(localStorage.getItem("notReadCrashes22")) || {};
// console.log('1',hasNewCrashes);
// console.log('2',notReadCrashes22);

//     if(Object.keys(notReadCrashes22).length > 0){
// setHasNewCrashes(true);
// localStorage.setItem("hasNewCrashes", JSON.stringify(true));
// console.log('yees',hasNewCrashes);
//     }
//     else{
//       setHasNewCrashes(false);
// localStorage.setItem("hasNewCrashes", JSON.stringify(false));
//     }
//   }, []);

  useEffect(() => {
    // Update localStorage whenever storedCrashIds changes
    localStorage.setItem("crashIds", JSON.stringify(storedCrashIds));
  }, [storedCrashIds]);
  
  // useEffect(() => {
  //   // Update localStorage whenever storedCrashIds changes
  //   localStorage.setItem("notReadCrashes22", JSON.stringify(notReadCrashes));
  // }, [notReadCrashes]);
  
  // Fetch drivers and crashes based on employer UID and company name
  const fetchDriversAndCrashes = useCallback(async () => {
    const employerUID = sessionStorage.getItem('employerUID');
    if (employerUID) {
      const userDocRef = doc(db, 'Employer', employerUID);
      const docSnap = await getDoc(userDocRef);
      const companyName = docSnap.data().CompanyName;

      // Fetch drivers
      const driverCollection = query(
        collection(db, 'Driver'),
        where('CompanyName', '==', companyName)
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
      });

      return () => unsubscribeDrivers();
    }
  }, []);

  // Fetch crash data
  const fetchCrashes = useCallback((driverIds) => {
    const chunkSize = 10; // Customize as needed
    for (let i = 0; i < driverIds.length; i += chunkSize) {
      const chunk = driverIds.slice(i, i + chunkSize);
      const crashCollection = query(
        collection(db, 'Crash'),
        where('driverID', 'in', chunk),
        where('Status', '==', 'Emergency SOS'),
        orderBy('time', 'desc') // Order crashes by time in descending order
      );
      const unsubscribeCrashes = onSnapshot(crashCollection, (snapshot) => {
        
        const storedReadCrashes = JSON.parse(localStorage.getItem("readCrashes")) || {}; // Get read crashes from localStorage

        const crashList = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        
        // setCrashes(crashList);
        // const newCrashIds = crashList.map((crash) => crash.id);
        // console.log("Fetched new crash IDs:", newCrashIds);
        // console.log('old',storedCrashIds);
       

        const newCrashes = crashList.filter(crash => !storedReadCrashes[crash.id]);


        newCrashes.forEach(crash => {
          const updatedReadCrashes = { ...notReadCrashes22, [crash.id]: crash };
          localStorage.setItem("notReadCrashes22", JSON.stringify(updatedReadCrashes));///for the red circul
          setnotReadCrashes22(updatedReadCrashes);
        })

        const r= JSON.parse(localStorage.getItem("notReadCrashes22")) || {};
        if(Object.keys(r).length > 0){
          setHasNewCrashes(true);
          localStorage.setItem("hasNewCrashes", JSON.stringify(true));
          console.log('yees',hasNewCrashes);
              }
              else{
                setHasNewCrashes(false);
          localStorage.setItem("hasNewCrashes", JSON.stringify(false));
              }

console.log('notReadCrashes222222:',notReadCrashes22);
        setNotReadCrashes(newCrashes);
      });
      
        ///ABOUT RED CIRCULE VISIBILITY
      return () => unsubscribeCrashes();
    }
  });//not sure

  

  // Update crash as read and navigate to details page
  const handleNotificationClick = async (crash) => {
    try {
      console.log('id:',crash.id);
      const updatedReadCrashes = { ...readCrashes, [crash.id]: crash };
      console.log('updated',updatedReadCrashes);
      localStorage.setItem("readCrashes", JSON.stringify(updatedReadCrashes));
     const r= JSON.parse(localStorage.getItem("readCrashes")) || {};
    console.log('r:',r);
      setReadCrashes(updatedReadCrashes);
      // Move crash to read notifications
      setNotReadCrashes(prev => prev.filter(c => c.id !== crash.id));

      let notReadCrashes22 = JSON.parse(localStorage.getItem("notReadCrashes22")) || {};
      delete notReadCrashes22[crash.id];
      localStorage.setItem("notReadCrashes22", JSON.stringify(notReadCrashes22));

      const rr= JSON.parse(localStorage.getItem("notReadCrashes22")) || {};
      console.log('check11',rr);

      if(Object.keys(rr).length > 0){
        setHasNewCrashes(true);
        localStorage.setItem("hasNewCrashes", JSON.stringify(true));
        console.log('llllol',hasNewCrashes);
            }
            else{
              setHasNewCrashes(false);
        localStorage.setItem("hasNewCrashes", JSON.stringify(false));
            }


      console.log('after remove:',notReadCrashes22);

      navigate(`/crash/general/${crash.id}`);
    } catch (error) {
      console.error("Error marking notification as read:", error);
    }
  };
  const handleNotificationClick2 = async (crash) => {
    try {
     
      navigate(`/crash/general/${crash.id}`);
    } catch (error) {
      console.error("Error marking notification as read:", error);
    }
  };
  
  // useEffect(() => {
  //   console.log('hasNewCrashes updated:', hasNewCrashes);
  // }, [hasNewCrashes, refreshKey]); // Add refreshKey as a dependency

  


  const handleallread = async (notReadCrashes) => {
    // Retrieve 'notReadCrashes22' from localStorage once
    console.log('check',notReadCrashes);
    // Create a new object for updated read crashes
    let updatedReadCrashes = { ...readCrashes};
    let notReadCrashes22 = JSON.parse(localStorage.getItem("notReadCrashes22")) || {};

    
    // for (let i = 0; i < notReadCrashes.length; i++) {
    //   const crash = notReadCrashes[i];     
    //   updatedReadCrashes = {  [crash.id]: crash };
    //   console.log('updated',updatedReadCrashes);
    //   localStorage.setItem("readCrashes", JSON.stringify(updatedReadCrashes));
    //   const r= JSON.parse(localStorage.getItem("readCrashes")) || {};
    //   console.log('readCrashes:',r);
    //   setReadCrashes(readCrashes);
    //   // Move crash to read notifications
    //   setNotReadCrashes(prev => prev.filter(c => c.id !== crash.id));

    //   notReadCrashes22 = JSON.parse(localStorage.getItem("notReadCrashes22")) || {};
    //   delete notReadCrashes22[crash.id];
    //   localStorage.setItem("notReadCrashes22", JSON.stringify(notReadCrashes22));
    //   notReadCrashes22 = JSON.parse(localStorage.getItem("notReadCrashes22")) || {};

    //   console.log('notReadCrashes22:',notReadCrashes22);
    // }
  
    
    // // setNotReadCrashes([]);  
    // // setnotReadCrashes22({});

   
    // // Set the 'hasNewCrashes' flag to false in localStorage and state
    // setHasNewCrashes(false);
    // localStorage.setItem("hasNewCrashes", JSON.stringify(false));

    notReadCrashes.forEach(crash => {
      updatedReadCrashes = { ...updatedReadCrashes, [crash.id]: crash };
      delete notReadCrashes22[crash.id];
  
      // Update localStorage and state after the loop ends
      localStorage.setItem("readCrashes", JSON.stringify(updatedReadCrashes));
  
      // Log to check intermediate values
      console.log('updatedReadCrashes:', updatedReadCrashes);
      console.log('notReadCrashes22:', notReadCrashes22);
    });
  
    // Update state after the loop
    setReadCrashes(updatedReadCrashes);
    setNotReadCrashes([]);
    localStorage.setItem("notReadCrashes22", JSON.stringify({}));


    setHasNewCrashes(false);
    localStorage.setItem("hasNewCrashes", JSON.stringify(false));
  };
  
  useEffect(() => {
    fetchDriversAndCrashes();
  }, [fetchDriversAndCrashes]);

  

  
  const formatDate = (time) => {
    const date = new Date(time * 1000);
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');

    return `${month}/${day}/${year}`; // Format as MM/DD/YYYY
  };


  const showModal = () => {
    setModalVisible(true);
  };

  const handleCancel = () => {
    setModalVisible(false);
  };

  

 
  const handleLogout = async () => {
    try {
      await auth.signOut(); // Sign out the user
      // Clear all session-specific data
      sessionStorage.removeItem('ShortCompanyName');
      sessionStorage.removeItem('employerUID');
      localStorage.removeItem('crashIds');
      // localStorage.removeItem('readCrashes');
      // localStorage.removeItem('notReadCrashes');
      // localStorage.removeItem('notReadCrashes22');

      // localStorage.removeItem('hasNewCrashes');
      window.dispatchEvent(new Event('storage')); // Notify other components
      // Navigate to the login page
      navigate('/');
    } catch (error) {
      console.error('Error during logout:', error);
    } finally {
      setModalVisible(false); // Close the logout confirmation modal
    }
  };

  const getRecentCrashes = (crashes) => {
    const currentDate = new Date();
    const oneMonthAgo = new Date();
    oneMonthAgo.setMonth(currentDate.getMonth() - 1); // Set to one month ago
  
    return Object.values(crashes).filter(crash => {
      const crashDate = new Date(crash.time * 1000); // Convert Unix timestamp to Date
      return crashDate >= oneMonthAgo; // Check if crash occurred within the last month
    });
  };
  
  // Check for recent crashes before rendering
  const recentCrashes = getRecentCrashes(readCrashes);
  const hasRecentCrashes = recentCrashes.length > 0;
  
 
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
      <div  style={{ display: 'flex', alignItems: 'center', gap: '136px' }}>
      <h3 style={{ fontSize: '18px', marginBottom: '10px', color: '#333' }}>
        Crash Notifications
      </h3>
    
<div
  style={{
    display: "flex",
    alignItems: "center",
    cursor: "pointer", // Makes it clickable

  }}
  onClick={() => handleallread(notReadCrashes)}

  
>
  <FaRegCheckCircle size={30} color="black" />
</div>

  </div>
      <hr
      style={{
        border: '0',
        borderTop: '1px solid #ddd',
        marginTop: '0', // Controls the spacing between the title and the line
        marginBottom: '10px', 

      }}
    />
 <p style={{ fontSize: '18px', marginBottom: '10px', color: '#333', marginTop:'5px' ,marginLeft:'5px'}}>Unread</p> 
 
      { notReadCrashes.length > 0 ? (
        <>
   
    {notReadCrashes.map((crash) => {
          const date = formatDate(crash.time);
          const time = new Date(crash.time * 1000).toLocaleTimeString();
          const driverName = drivers[crash.driverID] || 'Unknown Driver';
  
          return (
            <div 
            key={crash.id}
            style={{ borderBottom: '1px solid #ddd' ,
              padding: '10px',
              cursor: 'pointer',
              transition: 'background 0.3s ease',}}
              onClick={() => handleNotificationClick(crash)}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#f0f0f0')}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'white')}>
            <div
              
              style={{
                display: 'flex',
        alignItems: 'center', // Aligns the circle and text in a row
        gap: '10px', // Adds spacing between the circle and text
        
              }}
              
            >
             <div
        style={{
          width: '8px',
          height: '8px',
          backgroundColor: 'red',
          borderRadius: '50%',
          flexShrink: 0, // Prevents it from resizing
        }}
      ></div>
              <strong>Driver: {driverName}</strong>
              <br /></div>
              <span style={{padding: '17px',}}>
                Crash detected on {date} at {time}.
              </span>
            </div>
          );
        })}

  </>
      ) : (
        <div style={{ textAlign: 'center', marginTop: '50px', color: '#aaa' }}>
          <BellOutlined style={{ fontSize: '36px', marginBottom: '10px' }} />
          <p
           style={{
            marginBottom: '90px', 
          }}
          >No new notifications</p>
          <hr
      style={{
        border: '0',
        borderTop: '1px solid #ddd',
        marginTop: '0', 
        marginBottom: '10px', 

      }}
    />
        </div>
        
      )}

 
<p style={{ fontSize: '18px', marginBottom: '10px', color: '#333', marginTop:'20px',marginLeft:'5px' }}>Read</p>

{ hasRecentCrashes ? (
  <>

{Object.values(readCrashes).map((crash) => {

const currentDate = new Date();
    const oneMonthAgo = new Date();
    oneMonthAgo.setMonth(currentDate.getMonth() - 1); // Set to one month ago
    const crashDate = new Date(crash.time * 1000); // Convert Unix timestamp to Date
    
    const date = formatDate(crash.time);
    const time = new Date(crash.time * 1000).toLocaleTimeString();
    const driverName = drivers[crash.driverID] || 'Unknown Driver';
if(crashDate >= oneMonthAgo){
    return (
      <div
        key={crash.id}
        style={{
          padding: '17px',
          borderBottom: '1px solid #ddd',
          cursor: 'pointer',
          backgroundColor:'#f0f0f0',
        }}
        onClick={() => handleNotificationClick2(crash)}
        // onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#f0f0f0')}
        // onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'white')}
      >
        <strong>Driver: {driverName}</strong>
        <br />
        <span>
          Crash detected on {date} at {time}.
        </span>
      </div>
    );}
  })}

</>
) : (
  <div style={{ textAlign: 'center', marginTop: '50px', color: '#aaa' }}>
    <BellOutlined style={{ fontSize: '36px', marginBottom: '10px' }} />
    <p
    style={{
      marginBottom: '90px', 
    }}
    >No read notifications</p>
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
    { path: 'employer-home', label: 'Home' },
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

export default Header;
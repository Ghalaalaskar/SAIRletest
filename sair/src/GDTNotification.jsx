import { useEffect, useState, useRef } from 'react';
import { db } from "./firebase";
import { collection, doc, getDoc, onSnapshot, getDocs,updateDoc, query, where } from 'firebase/firestore';
import { notification } from 'antd';

notification.config({
    placement: 'topRight',
    duration: 5, // Default duration for notifications
    closeIcon: <span style={{ 
        fontSize: '20px' ,
        color: '#ffffff',  
    }}>×</span>, // Custom close icon
  });  
  



export const GDTNotification = () => {
  const [GdtDrivers, setGdtDrivers] = useState({}); // Store drivers for all employers
  const [gdtUID, setgdtUID] = useState(sessionStorage.getItem('gdtUID')); 
  const cleanupListeners = useRef([]);


const cleanupAllListeners = () => {
  cleanupListeners.current.forEach((unsubscribe) => unsubscribe());
  cleanupListeners.current = [];
};

  useEffect(() => {
    const handleStorageChange = () => {
      setgdtUID(sessionStorage.getItem('gdtUID'));
    };

    window.addEventListener('storage', handleStorageChange);

    // Also react to immediate changes
    const originalSetItem = sessionStorage.setItem;
    sessionStorage.setItem = function (key, value) {
      originalSetItem.apply(this, arguments);
      if (key === 'gdtUID') {
        setgdtUID(value); // Trigger state change immediately
      }
    };

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      sessionStorage.setItem = originalSetItem; // Restore original setItem
    };
  }, []);


  
  // Fetch drivers 
  useEffect(() => {
   
        const driverQuery = query(
          collection(db, 'Driver')
        );
        let updatedDrivers = {};

        const unsubscribeDrivers = onSnapshot(driverQuery, async (driverSnapshot) => {
            const drivers = driverSnapshot.docs.map((doc) => ({
            id: doc.data().DriverID,
            name: `${doc.data().Fname} ${doc.data().Lname}`,
            PhoneNumber: doc.data().PhoneNumber,
          }));
          updatedDrivers= drivers.reduce((acc, driver) => {
            acc[driver.id] = { name: driver.name, PhoneNumber: driver.PhoneNumber };
            return acc;
          }, {});

          setGdtDrivers((prev) => ({
            ...prev,
            ...updatedDrivers, // Spread updated drivers correctly
          }));
        
          console.log('Updated Drivers :', updatedDrivers);

    if (gdtUID) {
      console.log('gdtUID',gdtUID);
      setupCrashListeners(updatedDrivers, true);
      setupViolationListeners(updatedDrivers, true);

    }
   else{
    setupCrashListeners(updatedDrivers, false);
    setupViolationListeners(updatedDrivers, false);
   }
  });


  cleanupListeners.current.push(unsubscribeDrivers);

  return () => cleanupAllListeners();
}, [gdtUID]);
  





  // Setup crash listeners
  const setupCrashListeners = (drivers, showNotifications) => {
    console.log('in the GDT crash noti');
    console.log('data1: ',drivers);
    console.log('data1: ',showNotifications);
    if (!drivers || Object.keys(drivers).length === 0) return;
    console.log('data: ',drivers);
    console.log('data: ',showNotifications);

   

    // const unsubscribeList = [];
    const driverIds = Object.keys(drivers);
    const chunkSize = 10;

    for (let i = 0; i < driverIds.length; i += chunkSize) {
      const chunk = driverIds.slice(i, i + chunkSize);
      const crashQuery = query(
        collection(db, 'Crash'),
        where('driverID', 'in', chunk),
        where('Status', '==', 'Emergency SOS'),
      );
      console.log('in gggggggggdddddtttt');

      const unsubscribeCrash = onSnapshot(crashQuery, (snapshot) => {
        snapshot.docs.forEach(async (crashDoc) => {
          const crash = { id: crashDoc.id, ...crashDoc.data() };
          const driver = drivers[crash.driverID] || { name: 'Unknown', phoneNumber: 'Unavailable' };
          const date=formatDate(crash.time);
          const time= new Date(crash.time * 1000).toLocaleTimeString();
          console.log('gggggggggddddddttttt crash:',crash);
// Check if the crash has already been notified
const notifiedCrashes = JSON.parse(localStorage.getItem("notifiedCrashes")) || {};
if (notifiedCrashes[crash.id]) return; // Skip if already notified

console.log('local storage:',notifiedCrashes);
console.log('helo');
// Save the crash ID to localStorage
notifiedCrashes[crash.id] = true;
localStorage.setItem("notifiedCrashes", JSON.stringify(notifiedCrashes));


          // Show notification only if employer is logged in
          if (showNotifications && gdtUID) {
            notification.open({
              message: <strong>Crash Alert</strong>,
              description: `Crash detected for driver ${driver.name} on ${date} at ${time} Phone: ${driver.PhoneNumber}. Please respond to the crash by.`,
              placement: 'topRight',
              closeIcon: null, 
              duration: 20,
              className: 'custom-notification',
              style: { width: 450,
                backgroundColor: 'rgba(255, 77, 79, 0.6)', // Red with 80% opacity
                color: '#ffffff',
                borderRadius: '10px',
               },
            });
          }
          

        });
      });
      cleanupListeners.current.push(unsubscribeCrash);

      
    }

    // return () => unsubscribeList.forEach((unsubscribe) => unsubscribe());
  };

  
  // Setup violation listeners

  const setupViolationListeners = (drivers, showNotifications) => {
    console.log('in the GDT violation noti');
    console.log('data1: ',drivers);
    console.log('data1: ',showNotifications);
    if (!drivers || Object.keys(drivers).length === 0) return;
    console.log('data: ',drivers);
    console.log('data: ',showNotifications);

   
    const driverIds = Object.keys(drivers);
    const chunkSize = 10;

    for (let i = 0; i < driverIds.length; i += chunkSize) {
      const chunk = driverIds.slice(i, i + chunkSize);
      const ViolationQuery = query(
        collection(db, 'Violation'),
        where('driverID', 'in', chunk),
      );
      console.log('viooooooooolation in gggggggggdddddtttt');

      const unsubscribeViolation = onSnapshot(ViolationQuery, (snapshot) => {
        snapshot.docs.forEach(async (violationDoc) => {
          const violation = { id: violationDoc.id, ...violationDoc.data() };
          const driver = drivers[violation.driverID] || { name: 'Unknown', phoneNumber: 'Unavailable' };
          const date=formatDate(violation.time);
          const time= new Date(violation.time * 1000).toLocaleTimeString();
          console.log('gggggggggddddddttttt violation:',violation);
// Check if the crash has already been notified
const notifiedViolation = JSON.parse(localStorage.getItem("notifiedViolation")) || {};
if (notifiedViolation[violation.id]) return; // Skip if already notified

console.log('local storage:',notifiedViolation);
console.log('helo');
// Save the crash ID to localStorage
notifiedViolation[violation.id] = true;
localStorage.setItem("notifiedViolation", JSON.stringify(notifiedViolation));


          // Show notification only if employer is logged in
          if (showNotifications && gdtUID) {
            notification.open({
              message: <strong>Violation Alert</strong>,
              description: `Violation detected for driver ${driver.name} on ${date} at ${time} Phone: ${driver.PhoneNumber}.`,
              placement: 'topRight',
              closeIcon: null, 
              duration: 20,
              className: 'custom-notification',
              style: { width: 450,
                backgroundColor: 'rgba(255, 77, 79, 0.6)', // Red with 80% opacity
                color: '#ffffff',
                borderRadius: '10px',
               },
            });
          }
          

        });
      });
      cleanupListeners.current.push(unsubscribeViolation);

    }

  };


  // Cleanup all listeners
  

  const formatDate = (time) => {
    const date = new Date(time * 1000);
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');

    return `${month}/${day}/${year}`; // Format as MM/DD/YYYY
  };

   // Clear notification when clicking outside
   useEffect(() => {
    const handleClickOutside = (event) => {
      const notificationElement = document.querySelector('.custom-notification');
      if (notificationElement && !notificationElement.contains(event.target)) {
        notification.destroy();
      }
    };

    document.addEventListener('click', handleClickOutside);

    return () => {
      document.removeEventListener('click', handleClickOutside);
    };
  }, []);
// Clear notification when clicking outside


return null;
};

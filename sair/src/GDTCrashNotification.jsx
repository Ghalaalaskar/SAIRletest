import { useEffect, useState, useRef } from 'react';
import { db } from "../../firebase";
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
  

export const GDTCrashNotification = () => {
  const [gdtUID, setgdtUID] = useState(() => sessionStorage.getItem('gdtUID') || null);

  // Track changes to `sessionStorage` for employerUID
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

  // Fetch drivers for all companies
  useEffect(() => {
    const gdtQuery = collection(db, 'GDT');
  
    const unsubscribeGDT = onSnapshot(gdtQuery, async (gdtSnapshot) => {
   

      for (const gdtDoc of gdtSnapshot.docs) {
        const driverQuery = query(
          collection(db, 'Driver')
        );

        const unsubscribeDrivers = onSnapshot(driverQuery, async (driverSnapshot) => {
          const drivers = driverSnapshot.docs.map((doc) => ({
            id: doc.data().DriverID,
            name: `${doc.data().Fname} ${doc.data().Lname}`,
            PhoneNumber: doc.data().PhoneNumber,
          }));

          // Aggregate drivers under the current company
        
        

            // Handle crash listeners based on employerUID
        if (gdtUID) {
           
              setupCrashListeners(drivers, true); // Show notifications 
            
          } 
        });
        }
  
        // Update state with the drivers for all companies
      });
  
      return () => {
       
        unsubscribeGDT();
      };
    }, [gdtUID]);
  

  // Setup crash listeners
  const setupCrashListeners = (drivers, showNotifications) => {
    console.log('data1: ',drivers);
    console.log('data1: ',showNotifications);
    if (!drivers || Object.keys(drivers).length === 0) return;
    console.log('data: ',drivers);
    console.log('data: ',showNotifications);


    const driverIds = Object.keys(drivers);
    const chunkSize = 10;

    for (let i = 0; i < driverIds.length; i += chunkSize) {
      const chunk = driverIds.slice(i, i + chunkSize);
      const crashQuery = query(
        collection(db, 'Crash'),
        where('driverID', 'in', chunk),
        where('Status', '==', 'Confirmed'),
      );
      console.log('in gggggggggdddddtttt');

      const unsubscribeCrash = onSnapshot(crashQuery, (snapshot) => {
        snapshot.docs.forEach(async (crashDoc) => {
          const crash = { id: crashDoc.id, ...crashDoc.data() };
          const driver = drivers[crash.driverID] || { name: 'Unknown', phoneNumber: 'Unavailable' };
          const date=formatDate(crash.time);
          const time= new Date(crash.time * 1000).toLocaleTimeString();
          console.log('gggggggggddddddttttt crash:',crash);
          // Show notification only if employer is logged in
          if (showNotifications && gdtUID) {
            notification.open({
              message: <strong>Crash Alert</strong>,
              description: `Crash detected for driver ${driver.name} on ${date} at ${time} Phone: ${driver.PhoneNumber}. Please call the driver to confirm the crash and provide necessary support.`,
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

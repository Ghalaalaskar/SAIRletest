import { useEffect, useState, useRef } from 'react';
import { db } from './firebase';
import { collection, doc, getDoc, onSnapshot, getDocs,updateDoc, query, where } from 'firebase/firestore';
import { notification } from 'antd';
import "./css/notificationStyles.css";
// notification.config({
//     placement: 'topRight',
//     duration: 5, // Default duration for notifications
//     closeIcon: (
//         <span
//           style={{
//             fontSize: '20px',
//             color: '#ffffff',
//             padding: '0 15px', // Adjust padding to control spacing
//             display: 'inline-flex',
//             alignItems: 'center',
//             justifyContent: 'center',
//           }}
//         >
//           ×
//         </span>
//       ),
//   });

export const CrashNotification = () => {
  const [companyDrivers, setCompanyDrivers] = useState({}); // Store drivers for all employers
  const [employerUID, setEmployerUID] = useState(sessionStorage.getItem('employerUID')); // Track employerUID dynamically
  const crashListeners = useRef({}); // Store listeners for each company

  // Track changes to `sessionStorage` for employerUID
  useEffect(() => {
    const handleStorageChange = () => {
      setEmployerUID(sessionStorage.getItem('employerUID'));
    };

    window.addEventListener('storage', handleStorageChange);

    // Also react to immediate changes
    const originalSetItem = sessionStorage.setItem;
    sessionStorage.setItem = function (key, value) {
      originalSetItem.apply(this, arguments);
      if (key === 'employerUID') {
        setEmployerUID(value); // Trigger state change immediately
      }
    };

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      sessionStorage.setItem = originalSetItem; // Restore original setItem
    };
  }, []);

  // Fetch drivers for all companies
  useEffect(() => {
    const employerQuery = collection(db, 'Employer');
  
    const unsubscribeEmployers = onSnapshot(employerQuery, async (employerSnapshot) => {
      const updatedDrivers = {};

      for (const employerDoc of employerSnapshot.docs) {
        const companyName = employerDoc.data().CompanyName;
        const driverQuery = query(
          collection(db, 'Driver'),
          where('CompanyName', '==', companyName)
        );

        const unsubscribeDrivers = onSnapshot(driverQuery, async (driverSnapshot) => {
          const drivers = driverSnapshot.docs.map((doc) => ({
            id: doc.data().DriverID,
            name: `${doc.data().Fname} ${doc.data().Lname}`,
          }));

          // Aggregate drivers under the current company
          updatedDrivers[companyName] = drivers.reduce((acc, driver) => {
            acc[driver.id] = driver.name;
            return acc;
          }, {});

          setCompanyDrivers((prev) => ({
            ...prev,
            [companyName]: updatedDrivers[companyName],
          }));

          console.log('Updated Drivers for Company:', updatedDrivers[companyName]);

            // Handle crash listeners based on employerUID
        if (employerUID) {
            console.log(employerUID);
            const currentEmployerCompanyName = await getCurrentCompanyName(employerUID);
            if (currentEmployerCompanyName === companyName) {
              console.log('inside employer found');
              setupCrashListeners(updatedDrivers[companyName], companyName, true); // Show notifications for current employer
            } else {
              console.log('inside else under employer found');
              setupCrashListeners(updatedDrivers[companyName], companyName, false); // Silent processing for other employers
            }
          } else {
            console.log('inside else');
            setupCrashListeners(updatedDrivers[companyName], companyName, false); // Silent processing globally
          }
        });
        }
  
        // Update state with the drivers for all companies
      });
  
      return () => {
        cleanupAllListeners();
        unsubscribeEmployers();
      };
    }, [employerUID]);
  

  const getCurrentCompanyName = async (employerUID) => {
    if (!employerUID) return null;
  
    try {
      // Reference to the Employer document
      const employerRef = doc(db, 'Employer', employerUID);
      const employerDoc = await getDoc(employerRef);
  
      // Check if the document exists and return the CompanyName
      if (employerDoc.exists()) {
        return employerDoc.data().CompanyName;
      } else {
        console.error('Employer document not found for UID:', employerUID);
        return null;
      }
    } catch (error) {
      console.error('Error fetching company name for UID:', employerUID, error);
      return null;
    }
  };
  


  // Setup crash listeners
  const setupCrashListeners = (drivers, companyName, showNotifications) => {
    console.log('data1: ',drivers);
    console.log('data1: ',companyName);
    console.log('data1: ',showNotifications);
    if (!drivers || Object.keys(drivers).length === 0) return;
    console.log('data: ',drivers);
    console.log('data: ',companyName);
    console.log('data: ',showNotifications);


    if (crashListeners.current[companyName]) {
      crashListeners.current[companyName](); // Cleanup existing listener
      delete crashListeners.current[companyName];
    }

    const driverIds = Object.keys(drivers);
    const chunkSize = 10;

    for (let i = 0; i < driverIds.length; i += chunkSize) {
      const chunk = driverIds.slice(i, i + chunkSize);
      const crashQuery = query(
        collection(db, 'Crash'),
        where('driverID', 'in', chunk),
        where('Status', '==', 'Confirmed'),
        where('Flag', '==', false)
      );
      console.log('hfhfhfhfh');

      const unsubscribeCrash = onSnapshot(crashQuery, (snapshot) => {
        snapshot.docs.forEach(async (crashDoc) => {
          const crash = { id: crashDoc.id, ...crashDoc.data() };
          const driverName = drivers[crash.driverID] || 'Unknown';
          console.log('crash:',crash);
          // Show notification only if employer is logged in
          if (showNotifications && employerUID) {
            notification.open({
              message: 'Crash Alert',
              description: `Crash detected for driver ${driverName} (ID: ${crash.driverID}).`,
              placement: 'topRight',
              duration: 30,
              className: 'custom-notification',
              style: { width: 450,
                backgroundColor: 'rgba(255, 77, 79, 0.6)', // Red with 80% opacity
                color: '#ffffff',
                borderRadius: '10px',
               },
            });
          }

          // Mark crash as handled globally
          const crashDocRef = doc(db, 'Crash', crash.id);
          await updateDoc(crashDocRef, { Flag: true });
        });
      });

      crashListeners.current[companyName] = unsubscribeCrash; // Track listener for cleanup
    }
  };

  // Cleanup all listeners
  const cleanupAllListeners = () => {
    Object.values(crashListeners.current).forEach((unsubscribe) => unsubscribe());
    crashListeners.current = {};
  };

  return null; // No UI needed, as notifications are displayed as pop-ups
};

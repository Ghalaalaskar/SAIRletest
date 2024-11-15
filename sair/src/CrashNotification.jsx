import { useEffect, useState, useRef } from 'react';
import { db } from './firebase';
import { collection, getDoc, doc, onSnapshot, updateDoc, query, where, getDocs } from 'firebase/firestore';
import { notification } from 'antd';
import { FaCoins } from 'react-icons/fa';

export const CrashNotification = () => {
  const [driverData, setDriverData] = useState({});
  const employerUID = sessionStorage.getItem('employerUID');
  const initialized = useRef(false);
  const crashListeners = useRef([]);

  useEffect(() => {
    if (!employerUID || initialized.current) return;
    initialized.current = true;

    const initializeListeners = async () => {
      const employerRef = doc(db, 'Employer', employerUID);
      const employerDoc = await getDoc(employerRef);
      if (!employerDoc.exists()) {
        console.error('No such employer!');
        return;
      }

      const companyName = employerDoc.data().CompanyName;
      const driverQuery = query(
        collection(db, 'Driver'),
        where('CompanyName', '==', companyName)
      );

      onSnapshot(driverQuery, (driverSnapshot) => {
        const driverIds = driverSnapshot.docs.map((driverDoc) => {
          const data = driverDoc.data();
          return { id: data.DriverID, name: `${data.Fname} ${data.Lname}` };
        });
        console.log('ids:',driverIds);
        const updatedDriverData = driverIds.reduce((acc, driver) => {
          acc[driver.id] = driver.name;
          return acc;
        }, {});
        console.log('updated:',updatedDriverData);
        setDriverData(updatedDriverData);
      });
    };

    initializeListeners();

    // Cleanup all listeners when component unmounts
    return () => {
      crashListeners.current.forEach((unsubscribe) => unsubscribe());
    };
  }, [employerUID]);

  useEffect(() => {
    if (Object.keys(driverData).length > 0) {
      setupCrashListeners(Object.keys(driverData));
    }
  }, [driverData]);

  const setupCrashListeners = (driverIds) => {
    // Clean up existing listeners
    console.log('ids in setCrash: ',driverIds);
    crashListeners.current.forEach((unsubscribe) => unsubscribe());
    crashListeners.current = [];

    console.log('listener: ',crashListeners);
    const chunkSize = 10;
    for (let i = 0; i < driverIds.length; i += chunkSize) {
      const chunk = driverIds.slice(i, i + chunkSize);
      const crashQuery = query(
        collection(db, 'Crash'),
        where('driverID', 'in', chunk),
        where('Status', '==', 'Confirmed'),
        where('Flag', '==', false)
      );

      const unsubscribe = onSnapshot(crashQuery, (snapshot) => {
        if (snapshot.docs.length === 0) return;

        snapshot.docs.forEach(async (crashDoc) => {
          const crash = { id: crashDoc.id, ...crashDoc.data() };
          const driverName = driverData[crash.driverID] || 'Unknown';
          console.log('crash',crash);

          notification.open({
            message: 'Crash Alert',
            description: `Crash detected for driver ${driverName} (ID: ${crash.driverID}).`,
            placement: 'topRight',
            duration: 10,
            style: { width: 300 },
          });

          const crashDocRef = doc(db, 'Crash', crash.id);
          await updateDoc(crashDocRef, { Flag: true });
        });
      });

      crashListeners.current.push(unsubscribe);
    }
  };

  return null; // No UI needed, as notifications are displayed as pop-ups
};

import { useEffect, useState, useRef } from "react";
import { db } from "./firebase";
import {
  collection,
  doc,
  getDoc,
  onSnapshot,
  updateDoc,
  query,
  where,
} from "firebase/firestore";
import { notification, Modal, Button } from 'antd'; // Import Modal and Button

notification.config({
  placement: "topRight",
  duration: 5,
  closeIcon: (
    <span style={{ fontSize: "20px", color: "#ffffff" }}>×</span>
  ),
});

export const GDTNotification = () => {
  const [GdtDrivers, setGdtDrivers] = useState({});
  const [gdtUID, setgdtUID] = useState(sessionStorage.getItem("gdtUID"));
  const cleanupListeners = useRef([]);
  const [currentCrash, setCurrentCrash] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [GDT, setGDT] = useState({ Fname: '', Lname: '' });
  const [originalGDTData, setOriginalGDTData] = useState({});
  const crashId = currentCrash?.id;

  const cleanupAllListeners = () => {
    cleanupListeners.current.forEach((unsubscribe) => unsubscribe());
    cleanupListeners.current = [];
  };

  useEffect(() => {
    const handleStorageChange = () => {
      setgdtUID(sessionStorage.getItem("gdtUID"));
    };
    const fetchGDT = async () => {
      try {
        const docRef = doc(db, "GDT", gdtUID); // Replace GDTUID with gdtUID
        const docSnap = await getDoc(docRef);
    
        if (docSnap.exists()) {
          console.log("Document data:", docSnap.data());
          setGDT(docSnap.data()); // Set the retrieved data to the GDT state
          setOriginalGDTData(docSnap.data()); // Store the original data
        } else {
          console.error("No such document!");
        }
      } catch (error) {
        console.error("Error fetching document:", error);
      }
    };
    
    window.addEventListener("storage", handleStorageChange);

    const originalSetItem = sessionStorage.setItem;
    sessionStorage.setItem = function (key, value) {
      originalSetItem.apply(this, arguments);
      if (key === "gdtUID") {
        setgdtUID(value);
      }
    };
    fetchGDT();
    return () => {
      window.removeEventListener("storage", handleStorageChange);
      sessionStorage.setItem = originalSetItem;
    };
  }, []);

  useEffect(() => {
    const driverQuery = query(collection(db, "Driver"));
    let updatedDrivers = {};

    const unsubscribeDrivers = onSnapshot(driverQuery, async (driverSnapshot) => {
      const drivers = driverSnapshot.docs.map((doc) => ({
        id: doc.data().DriverID,
        name: `${doc.data().Fname} ${doc.data().Lname}`,
        PhoneNumber: doc.data().PhoneNumber,
      }));
      updatedDrivers = drivers.reduce((acc, driver) => {
        acc[driver.id] = {
          name: driver.name,
          PhoneNumber: driver.PhoneNumber,
        };
        return acc;
      }, {});

      setGdtDrivers((prev) => ({
        ...prev,
        ...updatedDrivers,
      }));

      if (gdtUID) {
        setupCrashListeners(updatedDrivers, true);
        setupViolationListeners(updatedDrivers, true);
      } else {
        setupCrashListeners(updatedDrivers, false);
        setupViolationListeners(updatedDrivers, false);
      }
    });

    cleanupListeners.current.push(unsubscribeDrivers);
    return () => cleanupAllListeners();

  }, [gdtUID]);

  // Setup crash listeners
  const setupCrashListeners = (drivers, showNotifications) => {
    if (!drivers || Object.keys(drivers).length === 0) return;

    const driverIds = Object.keys(drivers);
    const chunkSize = 10;

    for (let i = 0; i < driverIds.length; i += chunkSize) {
      const chunk = driverIds.slice(i, i + chunkSize);
      const crashQuery = query(
        collection(db, "Crash"),
        where("driverID", "in", chunk),
        where("Status", "==", "Emergency SOS")
      );

      const unsubscribeCrash = onSnapshot(crashQuery, (snapshot) => {
        snapshot.docs.forEach(async (crashDoc) => {
          const crash = { id: crashDoc.id, ...crashDoc.data() };
          const driver = drivers[crash.driverID] || { name: "Unknown", phoneNumber: "Unavailable" };
          const date = formatDate(crash.time);
          const time = new Date(crash.time * 1000).toLocaleTimeString();

          const notifiedCrashes = JSON.parse(localStorage.getItem("notifiedCrashes")) || {};
          if (notifiedCrashes[crash.id]) return; // Skip if already notified

          notifiedCrashes[crash.id] = true;
          localStorage.setItem("notifiedCrashes", JSON.stringify(notifiedCrashes));

          if (showNotifications && gdtUID) {
            notification.open({
              message: <strong>Crash Alert</strong>,
              description: (
                <>
                  Crash detected for driver {driver.name} on {date} at {time}. Phone: {driver.PhoneNumber}.
                  Please respond to the crash  
                  {" "}
                  <a 
                    href="#" 
                    style={{ color: "black", textDecoration: "underline" }}
                    onClick={(e) => {
                      e.preventDefault();
                      setCurrentCrash(crash);
                      setModalVisible(true);
                    }}
                  >
                    by clicking here
                  </a>.
                </>
              ),
              
              placement: "topRight",
              closeIcon: null,
              duration: 20,
              className: "custom-notification",
              style: {
                width: 450,
                backgroundColor: "rgba(255, 77, 79, 0.6)",
                color: "#ffffff",
                borderRadius: "10px",
              },
            });
          }
        });
      });
      cleanupListeners.current.push(unsubscribeCrash);
    }
  };

  // Setup violation listeners
  const setupViolationListeners = (drivers, showNotifications) => {
    if (!drivers || Object.keys(drivers).length === 0) return;

    const driverIds = Object.keys(drivers);
    const chunkSize = 10;

    for (let i = 0; i < driverIds.length; i += chunkSize) {
      const chunk = driverIds.slice(i, i + chunkSize);
      const ViolationQuery = query(
        collection(db, "Violation"),
        where("driverID", "in", chunk)
      );

      const unsubscribeViolation = onSnapshot(ViolationQuery, (snapshot) => {
        snapshot.docs.forEach(async (violationDoc) => {
          const violation = { id: violationDoc.id, ...violationDoc.data() };
          const driver = drivers[violation.driverID] || { name: "Unknown", phoneNumber: "Unavailable" };
          const date = formatDate(violation.time);
          const time = new Date(violation.time * 1000).toLocaleTimeString();

          const notifiedViolation = JSON.parse(localStorage.getItem("notifiedViolation")) || {};
          if (notifiedViolation[violation.id]) return; // Skip if already notified

          notifiedViolation[violation.id] = true;
          localStorage.setItem("notifiedViolation", JSON.stringify(notifiedViolation));

          if (showNotifications && gdtUID) {
            notification.open({
              message: <strong>Violation Alert</strong>,
              description: `Violation detected for driver ${driver.name} on ${date} at ${time} Phone: ${driver.PhoneNumber}.`,
              placement: "topRight",
              closeIcon: null,
              duration: 20,
              className: "custom-notification",
              style: {
                width: 450,
                backgroundColor: "rgba(255, 77, 79, 0.6)",
                color: "#ffffff",
                borderRadius: "10px",
              },
            });
          }
        });
      });
      cleanupListeners.current.push(unsubscribeViolation);
    }
  };

  const handleResponse = async () => {
    setModalVisible(false);

    try {
      if (!currentCrash?.id) {
        console.error("Crash ID is missing");
        return;
      }

      if (!GDT.Fname || !GDT.Lname) {
        console.error("Responder details are incomplete");
        return;
      }

      const updatedCrash = {
        ...currentCrash,
        RespondedBy: `${GDT.Fname} ${GDT.Lname}`,
      };

      const crashDocRef = doc(db, "Crash", crashId);
      const docSnapshot = await getDoc(crashDocRef);
      if (!docSnapshot.exists()) {
        console.error("No document found with ID:", crashId);
        return;
      }

      await updateDoc(crashDocRef, { RespondedBy: updatedCrash.RespondedBy });
      setCurrentCrash(updatedCrash);
      console.log("Crash response updated successfully");
    } catch (error) {
      console.error("Error updating crash response:", error);
    }
  };

  const formatDate = (time) => {
    const date = new Date(time * 1000);
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, "0");
    const day = date.getDate().toString().padStart(2, "0");

    return `${month}/${day}/${year}`; // Format as MM/DD/YYYY
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      const notificationElement = document.querySelector(".custom-notification");
      if (notificationElement && !notificationElement.contains(event.target)) {
        notification.destroy();
      }
    };

    document.addEventListener("click", handleClickOutside);

    return () => {
      document.removeEventListener("click", handleClickOutside);
    };
  }, []);

  // Return the modal and null for main component return
  return (
    <>
      <Modal
        title="Confirm Response"
        visible={modalVisible}
        onCancel={() => setModalVisible(false)}
        centered
        footer={[
          <Button key="cancel" onClick={() => setModalVisible(false)}>Cancel</Button>,
          <Button key="confirm" type="primary" onClick={handleResponse}>Confirm</Button>,
        ]}
      >
        <p>
          {GDT.Fname} {GDT.Lname}, by clicking on confirm button, you formally acknowledge your responsibility for overseeing the management of this crash.
        </p>
      </Modal>
    </>
  );
};
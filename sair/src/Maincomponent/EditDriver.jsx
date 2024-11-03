import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { doc, getDoc, setDoc, query, collection, where, onSnapshot, getDocs } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { Form, Input, Button, notification, Card, Row, Col, Select, Menu, Dropdown } from 'antd';

import successImage from '../images/Sucess.png';
import errorImage from '../images/Error.png';
import SAIRLogo from '../images/SAIRlogo.png';
import logoutIcon from '../images/logout.png';
import { UserOutlined, DownOutlined } from '@ant-design/icons';
import Header from './Header';

import s from '../css/Profile.module.css';

const EditDriver = () => {
  const { driverId } = useParams();
  const navigate = useNavigate();
  const [driverData, setDriverData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [availableMotorcycles, setAvailableMotorcycles] = useState([]);
  const [isNotificationVisible, setIsNotificationVisible] = useState(false);
  const [notificationMessage, setNotificationMessage] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);
  const [originalDriverID, setOriginalDriverID] = useState('');
  const [originalPhoneNumber, setOriginalPhoneNumber] = useState('');
  const timerRef = useRef(null); // Ref to store the timer ID
  const [companyName, setCompanyName] = useState('');
  const [phoneValidationMessage, setPhoneValidationMessage] = useState('');

  // Update state structure to match AddDriver
  const [validationMessages, setValidationMessages] = useState({
    Fname: '',
    Lname: '',
    PhoneNumber: '',
    Email: '',
    DriverID: '',
    GPSnumber: ''
  });

  const employerUID = sessionStorage.getItem('employerUID');
  // Fetch the driver's data based on driverId
  useEffect(() => {
    const fetchDriverData = async () => {
      try {
        const driverDocRef = doc(db, 'Driver', driverId);
        const driverDoc = await getDoc(driverDocRef);
        if (driverDoc.exists()) {
          const driverData = driverDoc.data();

          const companyName = await fetchCompanyName(employerUID);

          console.log('Driver data:', driverData);

          setDriverData({
            ...driverData,
            CompanyName: companyName // Include CompanyName
          });

          setOriginalDriverID(driverData.DriverID); // Store original Driver ID
          setOriginalPhoneNumber(driverData.PhoneNumber.slice(4)); // Store original Phone Number (without +966)

          // Fetch available motorcycles after driver data is set
          fetchAvailableMotorcycles(companyName);
        } else {
          notification.error({ message: 'Driver not found' });
        }
      } catch (error) {
        console.error('Error fetching driver data:', error);
        notification.error({ message: 'Error fetching driver data.' });
      } finally {
        setIsLoading(false);
      }
    };

    fetchDriverData();
  }, [driverId]);

  // Function to fetch company name based on employerUID
  const fetchCompanyName = async (employerUID) => {
    try {
      const companyDocRef = doc(db, 'Employer', employerUID);
      const companyDoc = await getDoc(companyDocRef);
      if (companyDoc.exists()) {
        const data = companyDoc.data();
        return data.CompanyName; // Return the CompanyName field
      } else {
        console.error('No such document!');
        return '';
      }
    } catch (error) {
      console.error('Error fetching company name:', error);
      return '';
    }
  };

  // Fetch available motorcycles based on company name
  const fetchAvailableMotorcycles = async (companyName) => {
    try {
      const motorcycleQuery = query(
        collection(db, 'Motorcycle'),
        where('CompanyName', '==', companyName),
        where('available', '==', true)
      );

      onSnapshot(motorcycleQuery, (snapshot) => {
        const bikes = snapshot.docs.map((doc) => ({
          id: doc.id,
          GPSnumber: doc.data().GPSnumber,
        }));
        setAvailableMotorcycles(bikes);
      });
    } catch (error) {
      console.error('Error fetching motorcycles:', error);
    }
  };

  // Show notification function
  const showNotification = (message, success) => {
    setNotificationMessage(message);
    setIsSuccess(success);
    setIsNotificationVisible(true);
    setTimeout(() => {
      setIsNotificationVisible(false);
    }, 2000); // Hide after 5 seconds
  };

  // Handle driver update
  const handleUpdateDriver = async (values) => {
    try {
      // Check if the new DriverID exists
      if (values.DriverID !== originalDriverID) {
        const driverIdExists = await checkIfDriverIdExists(values.DriverID);
        if (driverIdExists) {
          showNotification('Driver ID already exists.', false);
          return;
        }

        // Update associated violations if DriverID has changed
        await updateViolations(originalDriverID, values.DriverID);
      }

      // New phone number with prefix
      const newPhoneNumber = `+966${values.PhoneNumber}`;

      // Only check for duplication if the phone number has changed
      if (newPhoneNumber !== originalPhoneNumber) {
        const phoneNumberExists = await checkIfPhoneNumberExists(values.PhoneNumber);
        if (phoneNumberExists) {
          showNotification('Phone number already exists.', false);
          return;
        }
      }

      const driverDocRef = doc(db, 'Driver', driverId);
      const updatedData = {
        ...driverData,
        ...values,
        CompanyName: driverData.CompanyName,
        available: values.GPSnumber === null, // Set available based on GPS selection
        PhoneNumber: values.PhoneNumber.startsWith('+966') ? values.PhoneNumber : `+966${values.PhoneNumber}`,
        GPSnumber: values.GPSnumber // Set GPSnumber to null if "None" is selected
      };

      // Update the driver document
      await setDoc(driverDocRef, updatedData);

      // Update the motorcycle
      if (!values.GPSnumber) {
        // If a motorcycle is selected
        const motorcycleQuery = query(
          collection(db, 'Motorcycle'),
          where('GPSnumber', '==', values.GPSnumber)
        );
        const querySnapshot = await getDocs(motorcycleQuery);

        if (!querySnapshot.empty) {
          const motorcycleDocRef = querySnapshot.docs[0].ref; // Get the document reference
          // Update the DriverID and available fields in the motorcycle document
          await setDoc(motorcycleDocRef, {
            DriverID: values.DriverID,
            available: false // Set motorcycle's available field to false
          }, { merge: true });
        } else {
          console.error(`No motorcycle found with GPS number: ${values.GPSnumber}`);
        }
      } else {
        // If "None" is selected, update the corresponding motorcycle to set DriverID to null and available to true
        if (driverData.GPSnumber) { // Check if there was a previous GPS number
          const motorcycleQuery = query(
            collection(db, 'Motorcycle'),
            where('GPSnumber', '==', driverData.GPSnumber)
          );
          const querySnapshot = await getDocs(motorcycleQuery);

          if (!querySnapshot.empty) {
            const motorcycleDocRef = querySnapshot.docs[0].ref; // Get the document reference
            // Update the DriverID and available fields in the motorcycle document
            await setDoc(motorcycleDocRef, {
              DriverID: null, // Set DriverID to null
              available: true // Set motorcycle's available field to true
            }, { merge: true });
          } else {
            console.error(`No motorcycle found with GPS number: ${driverData.GPSnumber}`);
          }
        }
      }

      // Show success notification
      showNotification("Driver updated successfully!", true);
      // Redirect to Driver List after 2 seconds
      if (timerRef.current) clearTimeout(timerRef.current); // Clear any existing timer
      timerRef.current = setTimeout(() => {
        navigate('/driverslist');
      }, 2000); // 2 seconds

    } catch (error) {
      console.error('Error updating driver:', error);
      showNotification(`Error updating driver: ${error.message}`, false);
    }
  };

  // Function to update violations when DriverID changes
  const updateViolations = async (oldDriverID, newDriverID) => {
    const violationCollection = collection(db, 'Violation');
    const violationQuery = query(violationCollection, where('driverID', '==', oldDriverID));

    const querySnapshot = await getDocs(violationQuery);
    const updatePromises = querySnapshot.docs.map(doc => {
      const violationRef = doc.ref;
      return setDoc(violationRef, { driverID: newDriverID }, { merge: true });
    });

    await Promise.all(updatePromises);
    console.log(`Updated driverID from ${oldDriverID} to ${newDriverID} in violations.`);
  };

  // Function to check if DriverID exists
  const checkIfDriverIdExists = async (driverId) => {
    const driverQuery = query(
      collection(db, 'Driver'),
      where('DriverID', '==', driverId)
    );
    const querySnapshot = await getDocs(driverQuery);
    return !querySnapshot.empty; // Returns true if exists
  };

  // Function to check if PhoneNumber exists
  const checkIfPhoneNumberExists = async (phoneNumber) => {
    const phoneQuery = query(
      collection(db, 'Driver'),
      where('PhoneNumber', '==', `+966${phoneNumber}`)
    );
    const querySnapshot = await getDocs(phoneQuery);
    return !querySnapshot.empty; // Returns true if exists
  };

  // Effect to fetch company name on component mount
  useEffect(() => {
    const getCompanyName = async () => {
      const name = await fetchCompanyName(employerUID);
      setCompanyName(name); // Store the fetched name in state
    };
    getCompanyName();
  }, [employerUID]);

  // Update validation function
  const validatePhoneNumber = (PhoneNumber) => {
    const phoneRegex = /^\+9665\d{8}$/;
    const phoneRegex1 = /^\+96605\d{8}$/;

    if (phoneRegex.test(PhoneNumber) || phoneRegex1.test(PhoneNumber)) {
      return null;
    } else {
      return 'Phone number must start with +9665 and be followed by 8 digits.';
    }
  };

  // Update submit handler 
  const handleSubmit = (e) => {
    e.preventDefault();
    const { Fname, Lname, PhoneNumber, DriverID, GPSnumber } = driverData;
    console.log("subbb", driverData);
    let isValid = true;
    const newValidationMessages = {};

    if (!Fname) {
      newValidationMessages.Fname = 'Please enter first name';
      isValid = false;
    }

    if (!Lname) {
      newValidationMessages.Lname = 'Please enter last name';
      isValid = false;
    }

    if (!PhoneNumber) {
      newValidationMessages.PhoneNumber = 'Please enter phone number';
      isValid = false;
    } else {
      const phoneValidation = validatePhoneNumber(PhoneNumber);
      if (phoneValidation) {
        newValidationMessages.PhoneNumber = phoneValidation;
        isValid = false;
      }
    }

    if (!DriverID) {
      newValidationMessages.DriverID = 'Please enter driver ID';
      isValid = false;
    } else {
      if (DriverID.length !== 10) {
        newValidationMessages.DriverID = 'Driver ID must be 10 digits';
        isValid = false;
      }
    }

    setValidationMessages(newValidationMessages);

    if (isValid) {
      handleUpdateDriver(driverData);
    }
  };

  const handleInputChange = (e) => {
    setValidationMessages((prev) => ({
      ...prev,
      [e.target.name]: ''
    })); // Remove the validation message when the user starts typing
    const { name, value } = e.target;
    setDriverData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handlePhoneNumberChange = (e) => {
    let newPhoneNumber = e.target.value;
    if (newPhoneNumber.startsWith('+966')) {
      setDriverData({ ...driverData, PhoneNumber: newPhoneNumber });
    } else {
      newPhoneNumber = '+966' + newPhoneNumber.slice(3);
      setDriverData({ ...driverData, PhoneNumber: newPhoneNumber });
    }

    let phoneError = '';
    if (newPhoneNumber.length > 4) {
      const validationResult = validatePhoneNumber(newPhoneNumber);
      if (validationResult) {
        phoneError = validationResult;
      }
    }

    setValidationMessages(prev => ({
      ...prev,
      PhoneNumber: phoneError
    }));
  };

  const menu = (
    <Menu style={{ fontSize: '15px' }}>
      <Menu.Item key="profile" onClick={() => navigate('/employee-profile')}>
        Profile
      </Menu.Item>
      <Menu.Item key="logout" onClick={() => { auth.signOut(); navigate('/'); }} style={{ color: 'red' }}>
        Logout
      </Menu.Item>
    </Menu>
  );


  return (
    <div className="Header">

      <Header active="driverslist" />

      <div className="breadcrumb">
        <a onClick={() => navigate('/employer-home')}>Home</a>
        <span> / </span>
        <a onClick={() => navigate('/driverslist')}>Driver List</a>
        <span> / </span>
        <a onClick={() => navigate(`/edit-driver/${driverId}`)}>Edit Driver</a>
      </div>
      <main>
        <div  >
          <div className={s.container}>
            <h2 className='title'>Edit Driver</h2>
            {isLoading ? (
              <p>   </p>
            ) : (
              <form onSubmit={handleSubmit}>
                <div className={s.formRow}>
                  <div>
                    <label>First Name</label>
                    <input
                      type="text"
                      name="Fname"
                      value={driverData.Fname}
                      onChange={handleInputChange}
                    />
                    {validationMessages.Fname && <p className={s.valdationMessage}>{validationMessages.Fname}</p>}
                  </div>

                  <div>
                    <label>Last Name</label>
                    <input
                      type="text"
                      name="Lname"
                      value={driverData.Lname}
                      onChange={handleInputChange}
                    />
                    {validationMessages.Lname && <p className={s.valdationMessage}>{validationMessages.Lname}</p>}
                  </div>
                </div>

                <div className={s.formRow}>
                  <div>
                    <label>Phone Number</label>
                    <input
                      name="PhoneNumber"
                      value={driverData.PhoneNumber}
                      placeholder="+966"
                      onChange={handlePhoneNumberChange}
                    />
                    {validationMessages.PhoneNumber && <p className={s.valdationMessage}>{validationMessages.PhoneNumber}</p>}
                  </div>

                  <div>
                    <label>Email</label>
                    <input
                      name="Email"
                      value={driverData.Email}
                      disabled
                      className={s.disabledInput}
                    />
                  </div>
                </div>

                <div className={s.formRow}>
                  <div>
                    <label>Driver ID (National ID / Residency Number)</label>
                    <input
                      type="text"
                      name="DriverID"
                      maxLength={10}
                      value={driverData.DriverID}
                      onChange={handleInputChange}
                    />
                    {validationMessages.DriverID && <p className={s.valdationMessage}>{validationMessages.DriverID}</p>}
                  </div>

                  <div>
                    <label>GPS Number</label>
                    <select
                      name="GPSnumber"
                      value={driverData.GPSnumber}
                      onChange={handleInputChange}
                      className={s.select}
                    >
                      <option className={s.select} value="None">None</option>
                      {availableMotorcycles.length > 0 ? (
                        availableMotorcycles.map((item) => (
                          <option key={item.id} value={item.GPSnumber}>
                            {item.GPSnumber}
                          </option>
                        ))
                      ) : (
                        <option className={s.select} disabled>No motorcycles available</option>
                      )}
                    </select>
                    {validationMessages.GPSnumber && <p className={s.valdationMessage}>{validationMessages.GPSnumber}</p>}
                  </div>
                </div>

                <div>
                  <button type="submit" className={s.editBtn}>
                    Update Driver
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
        {isNotificationVisible && (
          <div className={`notification-popup ${isSuccess ? 'success' : 'error'}`}>
            <span className="close-popup-btn" onClick={() => setIsNotificationVisible(false)}>&times;</span>
            <img src={isSuccess ? successImage : errorImage} alt={isSuccess ? 'Success' : 'Error'} />
            <p>{notificationMessage}</p>
          </div>
        )}
      </main>
    </div>
  );
};

export default EditDriver;
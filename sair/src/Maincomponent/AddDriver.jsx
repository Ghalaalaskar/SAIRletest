import { createUserWithEmailAndPassword } from 'firebase/auth';
import React, { useEffect, useState } from 'react';
import {
  collection,
  addDoc,
  onSnapshot,
  query,
  where,
  doc,
  getDoc, getDocs,
  updateDoc,
} from 'firebase/firestore';
import { db, auth } from '../firebase';
import {
  Button,
  message,
} from 'antd';
import successImage from '../images/Sucess.png';
import errorImage from '../images/Error.png';
import { useNavigate } from 'react-router-dom';
import { generateRandomPassword } from '../utils/common';
import { sendEmail } from '../utils/email';

import Header from './Header';

import s from "../css/Profile.module.css"

const AddDriver = () => {
  const navigate = useNavigate();
  const [availableMotorcycles, setAvailableMotorcycles] = useState([]);
  const [Employer, setEmployer] = useState({ CompanyName: '' });
  const [popupVisible, setPopupVisible] = useState(false);
  const [popupMessage, setPopupMessage] = useState('');
  const [popupImage, setPopupImage] = useState('');
  const [validationMessages, setValidationMessages] = useState({
    Fname: '',
    Lname: '',
    PhoneNumber: '',
    Email: '',
    DriverID: '',
    GPSnumber: ''
  });

  const [driver, setDriver] = useState({
    Fname: '',
    Lname: '',
    PhoneNumber: '',
    Email: '',
    DriverID: '',
    GPSnumber: ''
  });

  const handleInputChange = (e) => {

    setValidationMessages((prev) => ({
      ...prev,
      [e.target.name]: ''
    })); // Remove the validation message when the user starts typing

    const { name, value } = e.target;
    setDriver(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handlePhoneNumberChange = (e) => {
    console.log(e.target.value);
    let newPhoneNumber = e.target.value;
    if (newPhoneNumber.startsWith('+966')) {
      setDriver({ ...driver, PhoneNumber: newPhoneNumber }); // Store only the digits
    }
    else {
      newPhoneNumber = '+966' + newPhoneNumber.slice(3);
      setDriver({ ...driver, PhoneNumber: newPhoneNumber }); // Store only the digits
    }
    let phoneError = '';
    if (newPhoneNumber.length > 4) {
      if (validatePhoneNumber(newPhoneNumber) === '') {
        phoneError = '';
      }
      else if (validatePhoneNumber(newPhoneNumber) === '0') {
        phoneError = '';
        var str = newPhoneNumber + "";
        str = str.substring(str.indexOf('5'));
        var st = '+966' + str;
        setDriver({ ...driver, PhoneNumber: st });

      }
      else {
        phoneError = validatePhoneNumber(newPhoneNumber);
      }
    }

    setValidationMessages((prev) => ({
      ...prev,
      phoneError: phoneError
    }));//removed when empty 
  };

  useEffect(() => {
    const employerUID = sessionStorage.getItem('employerUID');
    const fetchEmployer = async () => {
      const docRef = doc(db, 'Employer', employerUID);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const data = docSnap.data();
        setEmployer(data);
      } else {
        message.error('Employer not found');
      }
    };
    fetchEmployer();
  }, []);

  useEffect(() => {
    const fetchMotorcycles = async () => {
      if (Employer.CompanyName) {
        const motorcycleQuery = query(
          collection(db, 'Motorcycle'),
          where('CompanyName', '==', Employer.CompanyName),
          where('available', '==', true)
        );
        const unsubscribe = onSnapshot(motorcycleQuery, (snapshot) => {
          console.log("Motorcycle snapshot:", snapshot.docs); // Debug log
          const bikes = snapshot.docs.map((doc) => ({
            id: doc.id,
            GPSnumber: doc.data().GPSnumber,
          }));
          setAvailableMotorcycles(bikes);
        });
        return () => unsubscribe();
      }
    };
    fetchMotorcycles();
  }, [Employer]);

  const handleAddDriver = async (values) => {
    console.log('Adding driver:', values);
    try {
      const formattedPhoneNumber = `+966${values.PhoneNumber}`;
      const GPSnumber = values.GPSnumber === "None" ? null : values.GPSnumber;

      // Check if the phone number already exists
      const phoneQuery = query(
        collection(db, 'Driver'),
        where('PhoneNumber', '==', formattedPhoneNumber),
        where('CompanyName', '==', Employer.CompanyName)
      );
      const phoneSnapshot = await getDocs(phoneQuery);
      if (!phoneSnapshot.empty) {
        setPopupMessage("Phone number already exists.");
        setPopupImage(errorImage);
        setPopupVisible(true);
        return; // Exit the function early
      }

      // Check if the Driver ID already exists
      const driverIdQuery = query(
        collection(db, 'Driver'),
        where('DriverID', '==', values.DriverID),
        where('CompanyName', '==', Employer.CompanyName) // Check for the same company
      );
      const driverIdSnapshot = await getDocs(driverIdQuery);
      if (!driverIdSnapshot.empty) {
        setPopupMessage("Driver ID already exists.");
        setPopupImage(errorImage);
        setPopupVisible(true);
        return; // Exit the function early
      }

      // Generate random password
      const generatedPassword = generateRandomPassword();

      // Create the user in Firebase Authentication
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        values.Email,
        generatedPassword
      );

      const user = userCredential.user;

      // Prepare the new driver object
      const newDriver = {
        ...values,
        PhoneNumber: formattedPhoneNumber,
        GPSnumber: GPSnumber,
        CompanyName: Employer.CompanyName,
        isDefaultPassword: true,
        available: GPSnumber === null,
        UID: user.uid
      };

      // Store the new driver in Firestore
      await addDoc(collection(db, 'Driver'), newDriver);

      // If a motorcycle is assigned, update its availability and DriverID
      if (GPSnumber) {
        const q = query(
          collection(db, 'Motorcycle'),
          where('GPSnumber', '==', GPSnumber)
        );
        const querySnapshot = await getDocs(q);

        if (!querySnapshot.empty) {
          const motorcycleDocRef = querySnapshot.docs[0].ref; // Get the document reference

          // Update the motorcycle document
          await updateDoc(motorcycleDocRef, {
            available: false, // Set motorcycle's available field to false
            DriverID: values.DriverID // Set the DriverID to the driver's ID from the form
          });
        } else {
          console.error(`No motorcycle found with GPS number: ${GPSnumber}`);
        }
      }

      // Send welcome Email
      const response = await sendEmail({
        email: values.Email,
        subject: 'Welcome to SAIR!',
        message: `Congratulations! 
            
                You are now a driver at ${Employer.CompanyName}.
                            
                We are excited to have you with us! 
                
                Your password is: ${generatedPassword}
                
                To ensure your safety, we have set up your account in SAIR Mobile app. Download SAIR now from Google Play to monitor regulations and keep us informed about any crashes.
                
                Best Regards,  
                SAIR Team`,
      });

      if (response.success) {
        setPopupMessage("Driver added successfully!");
        setPopupImage(successImage);
      } else {
        setPopupMessage("Error adding driver");
        setPopupImage(errorImage);
      }

      setPopupVisible(true);
    } catch (error) {
      console.error('Error adding driver:', error);
      setPopupMessage("Driver Email Already exist.", false);
      setPopupVisible(true);
      setPopupImage(errorImage);
      //notification.error({
      //    message: 'Driver Email Already exist.',
      //});
    }
  };

  const validatePhoneNumber = (PhoneNumber) => {
    const phoneRegex = /^\+9665\d{8}$/; // Example for a specific format
    const phoneRegex1 = /^\+96605\d{8}$/; // Example for a specific format
    if (phoneRegex.test(PhoneNumber)) {
      return null;
    } 
    else {
      return 'Phone number must start with +9665 and be followed by 8 digits.';
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    console.log('submitting :', driver);
    const { Fname, Lname, PhoneNumber, Email, DriverID, GPSnumber } = driver;

    // Validate the form
    let isValid = true;
    const newValidationMessages = {}

    if (!Fname) {
      newValidationMessages.Fname = 'Please enter driver first name.';
      isValid = false;
    }

    if (!Lname) {
      newValidationMessages.Lname = 'Please enter driver last name.';
      isValid = false;
    }

    if (!PhoneNumber) {
      newValidationMessages.PhoneNumber = 'Please enter driver phone number.';
      isValid = false;
    }
    else {
      const phoneValidation = validatePhoneNumber(PhoneNumber);
      if (phoneValidation) {
        console.log('phoneValidation:', phoneValidation);
        newValidationMessages.PhoneNumber = phoneValidation;
        isValid = false;
      }
    }

    if (!Email) {
      newValidationMessages.Email = 'Please enter driver email.';
      isValid = false;
    } else {
      const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
      if (!emailRegex.test(Email)) {
        newValidationMessages.Email = 'Please enter a valid Email address.';
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

    // if (!GPSnumber) {
    //   newValidationMessages.GPSnumber = 'Please enter GPS number';
    //   isValid = false;
    // }

    setValidationMessages(newValidationMessages);

    if (isValid) {
      handleAddDriver(driver);
    }
  }

  const handleClosePopup = () => {
    setPopupVisible(false);
  };

  return (
    <div>

      <Header active="driverslist" />

      <div className="breadcrumb">
        <a onClick={() => navigate('/employer-home')}>Home</a>
        <span> / </span>
        <a onClick={() => navigate('/driverslist')}>Drivers List</a>
        <span> / </span>
        <a onClick={() => navigate('/add-driver')}>Add Driver</a>
      </div>

      <main className={s.container}>
        <h2 className='title'>Add Driver</h2>
        <form onSubmit={handleSubmit} >
          <div className={s.formRow}>
            <div>
              <label>First Name</label>
              <input
                type="text"
                name="Fname"
                value={driver.Fname}
                onChange={handleInputChange}
              />
              {validationMessages.Fname && <p className={s.valdationMessage}>{validationMessages.Fname}</p>}
            </div>

            <div>
              <label>Last Name</label>
              <input
                type="text"
                name="Lname"
                value={driver.Lname}
                onChange={handleInputChange}
              />
              {validationMessages.Lname && <p className={s.valdationMessage}>{validationMessages.Lname}</p>}
            </div>
          </div>
          <div className={s.formRow}>
            <div>
              <label >
                Phone Number
              </label>
              <input 
                name="PhoneNumber" 
                value={driver.PhoneNumber}
                placeholder="+966" 
                onChange={handlePhoneNumberChange}  
              />
              {validationMessages.PhoneNumber && <p className={s.valdationMessage}>{validationMessages.PhoneNumber}</p>}

            </div>
            <div>
              <label>
                Email
              </label>
              <input 
                name="Email"
                value={driver.Email}
                onChange={handleInputChange}
              />
              {validationMessages.Email && <p className={s.valdationMessage}>{validationMessages.Email}</p>}
            </div>
          </div>
          <div className={s.formRow}>
            <div>
              <label>
                Driver ID (National ID / Residency Number)
              </label>
              <input
                type="text"
                name="DriverID"
                maxLength={10}
                value={driver.DriverID}
                onChange={handleInputChange}
              />
              {validationMessages.DriverID && <p className={s.valdationMessage}>{validationMessages.DriverID}</p>}
            </div>
            <div>
              <label>
                GPS Number
              </label>
              <select
                name="GPSnumber"
                value={driver.GPSnumber}
                onChange={handleInputChange}
              >
                <option value="" disabled>Select a Motorcycle</option>
                <option value="None">None</option>
                {availableMotorcycles.length > 0 ? (
                  availableMotorcycles.map((item) => (
                    <option key={item.id} value={item.GPSnumber}>
                      {item.GPSnumber}
                    </option>
                  ))
                ) : (
                  <option disabled>No motorcycles available</option>
                )}
              </select>
              {validationMessages.GPSnumber && <p className={s.valdationMessage}>{validationMessages.GPSnumber}</p>}
            </div>
          </div>

          <div> 
            <button type="submit" className={s.editBtn}>
              Add Driver
            </button> 
          </div>
        </form>

      </main>

      {popupVisible && (
        <div className="popup">
          <button className="close-btn" onClick={handleClosePopup}>×</button>
          <img src={popupImage} alt="Popup" />
          <p>{popupMessage}</p>
        </div>
      )}

    </div>
  );
};

export default AddDriver;

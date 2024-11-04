import React, { useState, useEffect } from 'react';
import { collection, addDoc, query, where, getDocs, onSnapshot, doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { useNavigate } from 'react-router-dom';
import Header from './Header';
import successImage from '../images/Sucess.png';
import errorImage from '../images/Error.png';
import s from "../css/Profile.module.css";
import {Modal} from 'antd';

const AddMotorcycle = () => {
  const navigate = useNavigate();
  const [Employer, setEmployer] = useState({ CompanyName: '' });
  const [popupVisible, setPopupVisible] = useState(false);
  const [popupMessage, setPopupMessage] = useState('');
  const [popupImage, setPopupImage] = useState('');

  const [motorcycle, setMotorcycle] = useState({
    Model: '',
    GPSnumber: '',
    Type: '',
    Brand: '',
    LicensePlate: '',
    DriverID: ''
  });

  const [validationMessages, setValidationMessages] = useState({
    Model: '',
    GPSnumber: '',
    Type: '',
    Brand: '',
    LicensePlate: '',
    DriverID: ''
  });

  const [availableDrivers, setAvailableDrivers] = useState([]);

  const handleInputChange = (e) => {
    setValidationMessages((prev) => ({
      ...prev,
      [e.target.name]: ''
    }));

    const { name, value } = e.target;
    setMotorcycle(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleAddMotorcycle = async (values) => {
    try {
      // Check if GPS number already exists
      const gpsQuery = query(
        collection(db, 'Motorcycle'),
        where('GPSnumber', '==', values.GPSnumber),
        where('CompanyName', '==', Employer.CompanyName)
      );
      const gpsSnapshot = await getDocs(gpsQuery);
      if (!gpsSnapshot.empty) {
        setPopupMessage("GPS number already exists.");
        setPopupImage(errorImage);
        setPopupVisible(true);
        return;
      }

      const generateMotorcycleID = async (gpsNumber) => {
        let uniqueID = '';
        let isUnique = false;
    
        while (!isUnique) {
          const randomDigits = Math.floor(100 + Math.random() * 900).toString(); // Generates a random number between 100 and 999
          uniqueID = `${gpsNumber}${randomDigits}`; // Concatenates the GPS number with the random digits
    
          const q = query(collection(db, 'Motorcycle'), where('MotorcycleID', '==', uniqueID));
          const querySnapshot = await getDocs(q);
    
          if (querySnapshot.empty) {
            isUnique = true; // If no existing IDs match, this ID is unique
          }
        }
    
        return uniqueID; // Returns the unique ID
      };

      // Check if license plate already exists
      const plateQuery = query(
        collection(db, 'Motorcycle'),
        where('LicensePlate', '==', values.LicensePlate),
        where('CompanyName', '==', Employer.CompanyName)
      );
      const plateSnapshot = await getDocs(plateQuery);
      if (!plateSnapshot.empty) {
        setPopupMessage("License plate already exists.");
        setPopupImage(errorImage);
        setPopupVisible(true);
        return;
      }
    const motorcycleID = await generateMotorcycleID(values.GPSnumber);
      const newMotorcycle = {
        ...values,
        MotorcycleID: motorcycleID,
        CompanyName: Employer.CompanyName,
        available: true
      };

      await addDoc(collection(db, 'Motorcycle'), newMotorcycle);
      setPopupMessage("Motorcycle added successfully!");
      setPopupImage(successImage);
      setPopupVisible(true);

    } catch (error) {
      console.error('Error adding motorcycle:', error);
      setPopupMessage("Error adding motorcycle");
      setPopupImage(errorImage);
      setPopupVisible(true);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const { Model, GPSnumber, Type, Brand, LicensePlate, DriverID } = motorcycle;

    let isValid = true;
    const newValidationMessages = {};

    if (!Model) {
      newValidationMessages.Model = 'Please enter motorcycle model.';
      isValid = false;
    }

    if (!GPSnumber) {
      newValidationMessages.GPSnumber = 'Please enter GPS number.';
      isValid = false;
    }

    if (!Type) {
      newValidationMessages.Type = 'Please enter motorcycle type.';
      isValid = false;
    }

    if (!Brand) {
      newValidationMessages.Brand = 'Please enter motorcycle brand.';
      isValid = false;
    }

    if (!LicensePlate) {
      newValidationMessages.LicensePlate = 'Please enter motorcycle license plate.';
      isValid = false;
    }

    setValidationMessages(newValidationMessages);

    if (isValid) {
      handleAddMotorcycle(motorcycle);
    }
  };

  const handleClosePopup = () => {
    setPopupVisible(false);
  };

  useEffect(() => {
    const fetchAvailableDrivers = async () => {
      const employerUID = sessionStorage.getItem('employerUID');
      const employerDocRef = doc(db, 'Employer', employerUID);
      const docSnap = await getDoc(employerDocRef);

      if (docSnap.exists()) {
        const employerData = docSnap.data();
        setEmployer({ CompanyName: employerData.CompanyName });
        const { CompanyName } = docSnap.data();
        const dq = query(collection(db, 'Driver'), where('CompanyName', '==', CompanyName), where('available', '==', true));

        const unsubscribe = onSnapshot(dq, (drivers) => {
          const driverOptions = drivers.docs.map((doc) => {
            const driverData = doc.data();
            return { value: driverData.DriverID, label: driverData.DriverID };
          });
          setAvailableDrivers(driverOptions);
        });

        return () => unsubscribe();
      }
    };

    fetchAvailableDrivers();
  }, []);

  return (
    <div>
      <Header active="motorcycleslist" />

      <div className="breadcrumb">
        <a onClick={() => navigate('/employer-home')}>Home</a>
        <span> / </span>
        <a onClick={() => navigate('/motorcycleslist')}>Motorcycle List</a>
        <span> / </span>
        <a onClick={() => navigate('/add-motorcycle')}>Add Motorcycle</a>
      </div>

      <main className={s.container}>
        <h2 className='title'>Add Motorcycle</h2>
        <form onSubmit={handleSubmit}>
          <div className={s.formRow}> 
          <div>
              <label>GPS Number</label>
              <input
                type="text"
                name="GPSnumber"
                value={motorcycle.GPSnumber}
                onChange={handleInputChange}
              />
              {validationMessages.GPSnumber && <p className={s.valdationMessage}>{validationMessages.GPSnumber}</p>}
            </div>
            <div>
              <label>Model</label>
              <input
                type="text"
                name="Model"
                value={motorcycle.Model}
                onChange={handleInputChange}
              />
              {validationMessages.Model && <p className={s.valdationMessage}>{validationMessages.Model}</p>}
            </div>


          </div>

          <div className={s.formRow}>
            <div>
              <label>Type</label>
              <input
                type="text"
                name="Type"
                value={motorcycle.Type}
                onChange={handleInputChange}
              />
              {validationMessages.Type && <p className={s.valdationMessage}>{validationMessages.Type}</p>}
            </div>

            <div>
              <label>Brand</label>
              <input
                type="text"
                name="Brand"
                value={motorcycle.Brand}
                onChange={handleInputChange}
              />
              {validationMessages.Brand && <p className={s.valdationMessage}>{validationMessages.Brand}</p>}
            </div>
          </div>

          <div className={s.formRow}>
            <div>
              <label>License Plate</label>
              <input
                type="text"
                name="LicensePlate"
                value={motorcycle.LicensePlate}
                onChange={handleInputChange}
              />
              {validationMessages.LicensePlate && <p className={s.valdationMessage}>{validationMessages.LicensePlate}</p>}
            </div>

            <div>
              <label>Driver ID</label>
              <select
                name="DriverID"
                value={motorcycle.DriverID}
                onChange={handleInputChange}
              >
                <option value={null}>None</option>
                {availableDrivers.length > 0 ? (
                  availableDrivers.map(({ value, label }) => {
                    return (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    )
                  })
                ) : (
                  <option disabled>No drivers available</option>
                )}
              </select>
              {validationMessages.DriverID && <p className={s.valdationMessage}>{validationMessages.DriverID}</p>}
            </div>
          </div>

          <div>
            <button type="submit" className={s.editBtn}>
              Add Motorcycle
            </button>
          </div>
        </form>
      </main>

      javascript

Copy
import { Modal } from 'antd';

{popupVisible && (
  <Modal
    title={null} // No title since it's a simple image notification
    visible={popupVisible}
    onCancel={handleClosePopup}
    footer={null}
    style={{ top: '38%' }} // Center the modal vertically
  >
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
      <img src={popupImage} alt="Popup" style={{ width: '30%' }} />
      <p style={{ fontSize: '20px', fontFamily: 'Open Sans' }}>{popupMessage}</p>
    </div>
  </Modal>
)}
    </div>
  );
};

export default AddMotorcycle;
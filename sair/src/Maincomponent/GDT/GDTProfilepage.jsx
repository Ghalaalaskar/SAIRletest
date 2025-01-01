import React, { useEffect, useState } from 'react';
import { db, auth } from '../../firebase';
import { useNavigate } from 'react-router-dom';
import { doc, updateDoc, getDoc, where, getDocs, query, collection } from 'firebase/firestore';
import successImage from '../../images/Sucess.png';
import errorImage from '../../images/Error.png';
import '@fortawesome/fontawesome-free/css/all.min.css'; 
import { getAuth, updatePassword, EmailAuthProvider, reauthenticateWithCredential, sendEmailVerification } from 'firebase/auth';
import Header from "./GDTHeader" 
import { Modal } from 'antd';
import s from "../../css/Profile.module.css"
import Header from './GDTHeader';
import { useContext } from 'react';
import '../../css/CustomModal.css';

const Profile = () => {
  const [GDT, setGDT] = useState({
    GDTEmail: '',
    Lname: '',
    PhoneNumber: '',
    Fname: '',
    currentPassword: '',
    newPassword: '',
    confirmNewPassword: '',
    isAdmin:'',
  });

  const [originalGDTData, setOriginalGDTData] = useState({});
  const [editMode, setEditMode] = useState(false);
  const [missingFields, setMissingFields] = useState({});
  const [validationMessages, setValidationMessages] = useState({
    phoneError: '',
    emailError: '',
    emailperError: '',
    currentPasswordError: '',
    newPassword: '',
    confirmNewPassword: '',
    currentPasswordEmpty: '',
    confirmNewPasswordError: '',
    currentPasswordsuccess: '',
  });

  const [loading, setLoading] = useState(false);
  const [popupMessage, setPopupMessage] = useState('');
  const [popupVisible, setPopupVisible] = useState(false);
  const [popupImage, setPopupImage] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmNewPassword, setShowConfirmNewPassword] = useState(false);
  const [passwordRequirements, setPasswordRequirements] = useState({
    length: false,
    uppercase: false,
    lowercase: false,
    number: false,
    special: false,
  });
  const [currentPassValid, setCurrentPassValid] = useState(false); // New state for current password validity
  const navigate = useNavigate();
  useEffect(() => {
    const GDTUID = sessionStorage.getItem('gdtUID');
    if (!GDTUID) {
        console.error('GDTUID is null or undefined');
        setPopupMessage('GDTUID not found, please log in.');
        return;
    }

    const fetchGDT = async () => {
      const GDTUID = sessionStorage.getItem('gdtUID'); 
      if (!GDTUID) {
          console.error('UID not found in session storage');
          return;
      }
  
      try {
          const docRef = doc(db, 'GDT', GDTUID);
          const docSnap = await getDoc(docRef);
  
          if (docSnap.exists()) {
              console.log('Document data:', docSnap.data());
          } else {
              console.error('No such document!');
          }
      } catch (error) {
          console.error('Error fetching document:', error);
      }
  };
  
  fetchGDT();
}, []);

  const handleChange = (e) => {
 const { name, value } = e.target;
    setGDT((prev) => ({ ...prev, [name]: value || '' }));
     // Clear the missing field error as soon as the user fills it
     if (value.trim() !== '' && missingFields[name]) {
      console.log(missingFields);
      setMissingFields((prev) => {
        const updated = { ...prev };
        delete updated[name];
        return updated;
      });
    }
    setValidationMessages((prev) => ({
      ...prev,
      currentPasswordError: '',
      currentPasswordEmpty: '',
      currentPasswordsuccess: '',
      confirmNewPasswordError: '',
    }));


    switch (name) {
      case 'newPassword':
        const updatedRequirements = {
          length: value.length >= 8,
          uppercase: /[A-Z]/.test(value),
          lowercase: /[a-z]/.test(value),
          number: /\d/.test(value),
          special: /[!@#$%^&*(),.?":{}|<>]/.test(value),
      };
    
        // Update password requirements state
        setPasswordRequirements(updatedRequirements);
    
        // Check if all requirements are met
        const allRequirementsMet = Object.values(updatedRequirements).every(Boolean);
    
        setValidationMessages((prev) => ({
          ...prev,
          passwordError: allRequirementsMet ? '' : 'Password does not meet the requirements.',
        }));
        break;
      default:
        break;
    }
    if (value.trim() === '' && !['Password'].includes(name)) {
      setValidationMessages((prev) => ({ ...prev, [`${name}Error`]: '' }));
    }
  };

  const handlePhoneNumberChange = (e) => {
    console.log(e.target.value);
    const { name, value } = e.target;
    // Clear the missing field error as soon as the user fills it
    if (value.trim() !== '' && missingFields[name]) {
      setMissingFields((prev) => {
        const updated = { ...prev };
        delete updated[name];
        return updated;
      });
    }
    let newPhoneNumber = e.target.value;
    if (newPhoneNumber.startsWith('+966')) {
      setGDT({ ...GDT, PhoneNumber: newPhoneNumber }); // Store only the digits
    }
    else {
      newPhoneNumber = '+966' + newPhoneNumber.slice(3);
      setGDT({ ...GDT, PhoneNumber: newPhoneNumber }); // Store only the digits
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
        setGDT({ ...GDT, PhoneNumber: st });

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



  const validatePhoneNumber = (phoneNumber) => {
    const phoneRegex = /^\+9665\d{8}$/; // Example for a specific format
    const phoneRegex1 = /^\+96605\d{8}$/; // Example for a specific format
    if (phoneRegex.test(phoneNumber)) {
      return '';
    }
    else if (phoneRegex1.test(phoneNumber)) {
      return '0';
    }
    else {
      return 'Phone number must start with +9665 and be followed by 8 digits.';
    }
  };


  const handleVerifyCurrentPassword2 = async (e) => {
    console.log(e.target.value);
    GDT.currentPassword = e.target.value;
    if (!e.target.value) {
      setValidationMessages((prev) => ({
        ...prev,
        currentPasswordEmpty: '',
        currentPasswordError: '',
        currentPasswordsuccess: '',
      }));
    }
    
    else if (e.target.value.length >= 8) {
      console.log(e.target.value.length);
      const auth = getAuth();
      const user = auth.currentUser;

      try {
        const credential = EmailAuthProvider.credential(user.email, e.target.value);
        await reauthenticateWithCredential(user, credential);

        setCurrentPassValid(true);
        setValidationMessages((prev) => ({
          ...prev,
          currentPasswordError: '',
          currentPasswordEmpty: '',
          currentPasswordsuccess: 'Current password verified successfully',
         
        }));
        setTimeout(() => {
          setValidationMessages((prev) => ({
            ...prev,
            currentPasswordsuccess: '',
          }));
        }, 5000); // 10 seconds in milliseconds

      } catch (error) {
        console.error("Error verifying current password:", error);

        // Log the error code and message for troubleshooting
        console.log("Error Code:", error.code);
        console.log("Error Message:", error.message);

        setCurrentPassValid(false);
        setValidationMessages((prev) => ({
          ...prev,
          currentPasswordError: 'Incorrect current password. Please try again.',
          currentPasswordEmpty: '',
          currentPasswordsuccess: '',
        }));
      }

    }

    else {
      setValidationMessages((prev) => ({
        ...prev,
        currentPasswordError: 'Incorrect current password. Please try again.',
        currentPasswordEmpty: '',
        currentPasswordsuccess: '',
      }));
    }
  };

 
  const handleSave = async (e) => {
    e.preventDefault();
    setLoading(true);
    const newMissingFields = {};
    if (GDT.newPassword || GDT.confirmNewPassword) {
      if (!GDT.newPassword) {
        newMissingFields.newPassword = 'Please enter your new password';
      }
      if (!GDT.confirmNewPassword) {
        newMissingFields.confirmNewPassword = 'Please confirm your new password';
      }
    }

    // Check for other required fields like and PhoneNumber
    ['PhoneNumber'].forEach((field) => {
      if (!GDT[field] || (field === 'PhoneNumber' && GDT.PhoneNumber === '+966')) {
        newMissingFields[field] = `Please enter your ${field.replace(/([A-Z])/g, ' $1').toLowerCase()}`;
      }
    });
  
    // If there are missing fields, set them and stop form submission
    if (Object.keys(newMissingFields).length > 0) {
      setMissingFields(newMissingFields);
      setLoading(false);
      return;
    }

    if (Object.values(validationMessages).some((msg) => msg)) {
      setLoading(false);
      return;
    }

    const GDTUID = sessionStorage.getItem('gdtUID');
    const docRef = doc(db, 'GDT', GDTUID);
    const currentData = await getDoc(docRef);

    if (currentData.exists()) {
      const existingPhoneNumber = currentData.data().PhoneNumber;

      if (GDT.PhoneNumber && GDT.PhoneNumber !== existingPhoneNumber) {
        const existingUserQuery1 = await getDocs(query(
          collection(db, 'GDT'),
          where('PhoneNumber', '==', GDT.PhoneNumber)
        ));

        if (!existingUserQuery1.empty) {
          setPopupMessage("The phone number is already used. Please use a new number.");
          setPopupImage(errorImage);
          setPopupVisible(true);
          setLoading(false);
          return;
        }
      }
    }
      // Validate new password and confirm password
      if (GDT.newPassword || GDT.confirmNewPassword) {
  
        // Check if passwords match
        if (GDT.newPassword !== GDT.confirmNewPassword) {
          setPopupMessage("Passwords do not match.");
        setPopupImage(errorImage);
        setPopupVisible(true);
        setLoading(false);
        return;
        }
      }

    const auth = getAuth();
    const user = auth.currentUser;

    try {
      const updateData = { ...GDT };
      delete updateData.currentPassword;
      delete updateData.newPassword;
      delete updateData.confirmNewPassword;

      await updateDoc(docRef, updateData);
   
      if (GDT.newPassword && user) {
        const credential = EmailAuthProvider.credential(user.email, GDT.currentPassword);
        await reauthenticateWithCredential(user, credential);
        await updatePassword(user, GDT.newPassword);
      }

      setPopupMessage('Information Updated successfully.');
      setPopupImage(successImage);
      setPopupVisible(true);
      setEditMode(false);
      setShowCurrentPassword(false);
      setShowNewPassword(false);
      setShowConfirmNewPassword(false);
      setCurrentPassValid(false);//new

      setPasswordRequirements({
        length: false,
        uppercase: false,
        lowercase: false,
        number: false,
        special: false,
      });
      
      setGDT((prev) => ({
        ...prev,
        currentPassword: "",
        newPassword: "",
        confirmNewPassword: ""
      }));
    } catch (error) {
      console.error('Error updating profile:', error);
      setPopupMessage('Failed to update profile.');
      setPopupImage(errorImage);
      setPopupVisible(true);
    } finally {
      setLoading(false);
    }
  };


  const handleCancel = async () => {
    const GDTUID = sessionStorage.getItem('gdtUID');
    const docRef = doc(db, 'GDT', GDTUID);
    setShowCurrentPassword(false);
    setShowNewPassword(false);
    setShowConfirmNewPassword(false);
    setCurrentPassValid(false);
    // Fetch the latest data from the database
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      const latestData = docSnap.data();
      setGDT(latestData); // Restore the latest data
      setOriginalGDTData(latestData); // Update original data to latest from DB
    }
  
    setEditMode(false); // Exit edit mode
    setMissingFields({});
    setValidationMessages({ // Clear validation messages
      phoneError: '',
      emailError: '',
      newPassword: '',
      confirmNewPassword: '',
      currentPasswordError: '',
      emailperError: '',
      currentPasswordEmpty: '',
      confirmNewPasswordError: '',
      currentPasswordsuccess: '',


    });

    // Reset password requirements to default (all false)
    setPasswordRequirements({
      length: false,
      uppercase: false,
      lowercase: false,
      number: false,
      special: false,
    });
    setCurrentPassValid(false); // Reset current password verification
    // Clear the current password in the form's state
    setGDT((prev) => ({
      ...prev,
      currentPassword: "",
      newPassword: "",
      confirmNewPassword: ""
    }));
  };
  const handleClosePopup = () => {
    setPopupVisible(false);
  };


  const togglePasswordVisibility = (type) => {
    if (type === 'current') {
      setShowCurrentPassword(!showCurrentPassword);
    } else if (type === 'new') {
      setShowNewPassword(!showNewPassword);
    } else if (type === 'confirm') {
      setShowConfirmNewPassword(!showConfirmNewPassword);
    }
  };

  // Logout function to navigate back to the login page
  const handleLogout = () => {
    auth.signOut().then(() => {
      navigate('/'); // Redirect to login page (Login.jsx)
    }).catch((error) => {
      console.error('Error LOGGING out:', error);
    });
  };

  // Handle redirection functions for each page
  const handleNavigation = (path) => {
    navigate(path); // Navigate to the specified path
  };

  return (
    <div  >

      <Header />
      <div class="breadcrumb">
        <a onClick={() => navigate('/GDThome')}>Home</a>
        <span> / </span>
        <a onClick={() => navigate('/gdtprofile')}>Profile</a>
      </div>
<div className={s.forme}>
      <main className={s.container}>
        <form onSubmit={handleSave} noValidate>
          <h2 className='title'>My Profile</h2>

          <div className={s.formRow}>

         
            <div>
              <label className={s.profileLabel}>First Name</label>
              <input
                type="text"
                name="Fname"
                value={GDT.Fname}
                onChange={handleChange}
                disabled={!editMode}
                readOnly
              />

            </div>
            <div>
              <label className={s.profileLabel}>Last Name</label>
              <input
                type="text"
                name="Lname"
                value={GDT.Lname}
                onChange={handleChange}
                disabled={!editMode}
                readOnly
              />

            </div>
          </div>

          <div className={s.formRow}>
          <div>
              <label className={s.profileLabel}  >Phone Number</label>
              <input
                type="tel"
                name="PhoneNumber"
                placeholder='+966'
                value={`${GDT.PhoneNumber}`}
                onChange={handlePhoneNumberChange}
                disabled={!editMode}
                pattern="\+9665\d{8}"
                required
              />
              {missingFields['PhoneNumber'] && <p style={{ color: 'red', marginTop: '3px' }}>{missingFields['PhoneNumber']}</p>}
              {validationMessages.phoneError && <p style={{ color: 'red', marginTop: '3px' }}>{validationMessages.phoneError}</p>}
            </div>
           
           </div>

          <div className={s.formRow}>
            <div>
              <label className={s.profileLabel}>Email</label>
              <input
                type="text"
                name="GDTEmail"
                value={GDT.GDTEmail}
                onChange={handleChange}
                disabled={!editMode}
                readOnly
              />
            </div>
          </div>

          {editMode && (
            <>
              <div className={s.formRow}>
                <div style={{ position: 'relative' }}>
                  <label className={s.profileLabel}>Current Password</label>
                  <input
                    type={showCurrentPassword ? "text" : "password"}
                    name="currentPassword"
                  
                    onChange={handleVerifyCurrentPassword2}
                    required={GDT.newPassword ? true : false}
                  /> 

                  <span onClick={() => togglePasswordVisibility('current')}
                    className={s.togglePasswordVisibility}>
                    <i className={showCurrentPassword ? 'far fa-eye' : 'far fa-eye-slash'}></i>
                  </span>


                  {validationMessages.currentPasswordEmpty && (
                    <p style={{ color: '#FFA500', display: 'flex', alignItems: 'center', fontSize: '14px' ,marginTop:'3px'}}>
                      <i className="fas fa-exclamation-circle" style={{ marginRight: '5px', color: '#FFA500' }}></i>
                      {validationMessages.currentPasswordEmpty}
                    </p>
                  )}

                  {validationMessages.currentPasswordError && (
                    <p style={{ color: 'red', display: 'flex', alignItems: 'center', fontSize: '14px' ,marginTop:'3px'}}>
                      <i className="fas fa-times-circle" style={{ marginRight: '5px', color: 'red' }}></i>
                      {validationMessages.currentPasswordError}
                    </p>
                  )}

                  {currentPassValid && validationMessages.currentPasswordsuccess && (
                    <p style={{ color: 'green', display: 'flex', alignItems: 'center', fontSize: '14px',marginTop:'3px' }}>
                      <i className="fas fa-check-circle" style={{ marginRight: '5px', color: 'green' }}></i>
                      {validationMessages.currentPasswordsuccess}
                    </p>
                  )}
                </div>

              </div>
              <div className={s.formRow}>
                <div style={{ position: 'relative' }}>
                  <label className={s.profileLabel}>New Password</label>
                  <input
                    type={showNewPassword ? "text" : "password"}
                    name="newPassword"
                    onChange={handleChange}
                    disabled={!currentPassValid}
                    className='newPass'
                  />
                  <span onClick={() => togglePasswordVisibility('new')} className={s.togglePasswordVisibility}>
                    <i className={showNewPassword ? 'far fa-eye' : 'far fa-eye-slash'}></i>
                  </span>
                  {missingFields['newPassword'] && <p style={{ color: 'red' ,marginTop:'3px'}}>{missingFields['newPassword']}</p>}
                  <div className={s.passwordRequirements}>
                  <ul style={{fontSize:'14px',marginLeft:'10px' ,marginTop:'12px'}}>
                  <li style={{ color: passwordRequirements.length ? '#059855' : 'red' }}>
                Contain at least 8 characters
              </li>
              <li style={{ color: passwordRequirements.uppercase ? '#059855' : 'red' }}>
                Contain at least one uppercase letter
              </li>
              <li style={{ color: passwordRequirements.lowercase ? '#059855' : 'red' }}>
              Contain at least one lowercase letter
              </li>
              <li style={{ color: passwordRequirements.number ? '#059855' : 'red' }}>
              Contain at least one number
              </li>
              <li style={{ color: passwordRequirements.special ? '#059855' : 'red' }}>
              Contain at least one special character(!@#$%^&*)
              </li>
                    </ul>
                  </div>
                </div>
              </div>
              <div className={s.formRow}>
                <div style={{ position: 'relative' }}>
                  <label className={s.profileLabel}>Confirm New Password</label>
                  <input
                    type={showConfirmNewPassword ? "text" : "password"}
                    name="confirmNewPassword"
                    onChange={handleChange}
                    disabled={!currentPassValid}
                    className='confPass'
                  />
                  <span onClick={() => togglePasswordVisibility('confirm')} className={s.togglePasswordVisibility}>
                    <i className={showConfirmNewPassword ? 'far fa-eye' : 'far fa-eye-slash'}></i>
                  </span>
                  {missingFields['confirmNewPassword'] && <p style={{ color: 'red' , marginTop: '3px'}}>{missingFields['confirmNewPassword']}</p>}
                  {validationMessages.confirmNewPasswordError && (
                    <p style={{ color: 'red', marginTop: '3px' }}>{validationMessages.confirmNewPasswordError}</p>
                  )}
                </div>
              </div>
            </>
          )}

          <div>
            {editMode ? (
              <div>
                <button type="submit" className={s.profilesave} disabled={loading}>{loading ? 'Save Changes' : 'Save Changes'}</button>
                <button type="button" className={s.profileCancel} onClick={handleCancel}>Cancel</button>
              </div>
            ) : (
              <button type="button" className={s.editBtn} onClick={() => setEditMode(true)}>Edit</button>
            )}
          </div>
          {
          }
        </form>

        <Modal
        visible={popupVisible}
        onCancel={handleClosePopup}
        footer={<p style={{ textAlign: 'center' }}> {popupMessage}</p>} 
        style={{ top: '38%' }}
        className="custom-modal" 
        closeIcon={
          <span className="custom-modal-close-icon">
            ×
          </span>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>

          <img src={popupImage} alt="Popup" style={{width: '20%', marginBottom: '16px'  }}  />
          
        </div>
      </Modal>

      </main></div></div>
  );
};

export default Profile;
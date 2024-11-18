import React, { useState } from 'react';
import { db, auth } from '../../firebase';
import { useNavigate } from 'react-router-dom';
import { doc, addDoc } from 'firebase/firestore';
import { createUserWithEmailAndPassword, sendEmailVerification } from 'firebase/auth';
import successImage from '../../images/Sucess.png';
import errorImage from '../../images/Error.png';
import backgroundImage from '../../images/sairbackground.png';
import axios from 'axios';
import {Button, Modal} from 'antd';
import { getDocs, query, collection, where } from 'firebase/firestore';
import '@fortawesome/fontawesome-free/css/all.min.css';
import { CloseOutlined } from '@ant-design/icons'; 
import '../../css/CustomModal.css';
import s from '../../css/Signup.module.css';

const SignUp = () => {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [isCompanyNameReadOnly, setIsCompanyNameReadOnly] = useState(false);
  const [user, setUser] = useState({
    commercialNumber: '',
    PhoneNumber: '',
    CompanyName: '',
    CompanyEmail: '',
    Password: '',
    confirmPassword: '',
    confirmPasswordError: '',
    ShortCompanyName:'',
  });
  const [missingFields, setMissingFields] = useState({});
  const [validationMessages, setValidationMessages] = useState({
    phoneError: '',
    commercialNumberError: '',
    emailError: '',
    passwordError: '',
    

  });
  const [loading, setLoading] = useState(false);
  const [popupVisible, setPopupVisible] = useState(false);
  const [popupMessage, setPopupMessage] = useState('');
  const [popupImage, setPopupImage] = useState('');
  const [showConfirmNewPassword, setshowConfirmNewPassword] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState('+966');
  const [showConfirmButtons, setShowConfirmButtons] = useState(false); // To show "Yes" and "No" buttons
  const [showPassword, setShowPassword] = useState(false);
  const [passwordRequirements, setPasswordRequirements] = useState({
    length: false,
    uppercase: false,
    lowercase: false,
    number: false,
    special: false,
  });
  const navigate = useNavigate();


  const fetchRegistrationInfo = async (commercialnumber) => {
    try {
       const API_KEY='vgh6MBYzODlGM4f69bs00ukexqIH3edV';
        const response = await axios.get(
          `https://api.wathq.sa/v5/commercialregistration/info/${commercialnumber}`, 
            {
                headers: {
                    'accept': 'application/json',
                    'apiKey':API_KEY ,
                },
            }
        );
        if (response.data.crNumber) {
          return response.data.crName; // It's a valid registration response
      } else {
          return 0;
      }
  } catch (error) {
      // Handle other errors, such as network issues or unexpected responses
      return 0;
  }
};



  const handleChange = async (e) => {
    const { name, value } = e.target;
    setUser({ ...user, [name]: value });
      // Clear the missing field error as soon as the user fills it
      if (value.trim() !== '' && missingFields[name]) {
        console.log(missingFields);
        setMissingFields((prev) => {
          const updated = { ...prev };
          delete updated[name];
          return updated;
        });
      }
   
    if (name === 'commercialNumber') {
      const commercialNumberError = validateCommercialNumber(value);
      setValidationMessages((prev) => ({
        ...prev,
        commercialNumberError: value === '' ? '' : commercialNumberError,
      }));

      if (value === '' || commercialNumberError) {
        setUser((prev) => ({ ...prev, CompanyName: '' }));
        setIsCompanyNameReadOnly(false);
      }

      if (!commercialNumberError) {
        const companyName = await fetchRegistrationInfo(value);
        if (companyName !== 0) {
          setUser((prev) => ({ ...prev, CompanyName: companyName })); // Update with fetched name
          setIsCompanyNameReadOnly(true); // Set CompanyName field to read-only
          
          // Remove CompanyName from missingFields when read-only
          setMissingFields((prev) => {
              const updated = { ...prev };
              delete updated.CompanyName;
              return updated;
          });
      } else {
          setUser((prev) => ({ ...prev, CompanyName: '' })); // Clear if not valid
          setIsCompanyNameReadOnly(false);
      }
      }

    } else if (name === 'CompanyEmail') {
      const emailError = validateEmail(value);
      setValidationMessages((prev) => ({
        ...prev,
        emailError: value === '' ? '' : emailError,
      }));
    }
    

    if (name === 'Password') {
      // Calculate password requirements
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
    }
  
    // Reset validation message if the field is empty and not already handled above
    if (value.trim() === '' && !['Password', 'commercialNumber', 'CompanyEmail'].includes(name)) {
      setValidationMessages((prev) => ({ ...prev, [`${name}Error`]: '' }));
    }
  };

  const togglePasswordVisibility = (type) => {
    if (type === 'new') {
      setShowPassword(!showPassword);
    } else if (type === 'confirm') {
      setshowConfirmNewPassword(!showConfirmNewPassword);
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
      setUser({ ...user, PhoneNumber: newPhoneNumber }); // Store only the digits
    }
    else {
      newPhoneNumber = '+966' + newPhoneNumber.slice(3);
      setUser({ ...user, PhoneNumber: newPhoneNumber }); // Store only the digits
    }


    // Only validate if there is more than just the prefix ('+966')
    // const phoneError = newPhoneNumber !== '+966' ? validatePhoneNumber(newPhoneNumber) : '';
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
        setUser({ ...user, PhoneNumber: st });
      }
      else {
        phoneError = validatePhoneNumber(newPhoneNumber);
      }
    }
    setValidationMessages((prev) => ({
      ...prev,
      phoneError: phoneError
    }));
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

  const validateCommercialNumber = (number) => {
    const numberRegex = /^\d{10}$/; // Exactly 10 digits
    return numberRegex.test(number) ? '' : 'Commercial number must be exactly 10 digits long.';
  };

  const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/; // Basic email format
    return emailRegex.test(email) ? '' : 'Please enter a valid email address.';
  };


  const handleSignUp = async (e) => {
    e.preventDefault();

    // Log validation messages to debug
    console.log('Validation Messages:', validationMessages);
  
     // Check for empty required fields
     const requiredFields = ['commercialNumber', 'CompanyName', 'CompanyEmail', 'PhoneNumber', 'Password', 'confirmPassword'];
     const newMissingFields = {};
 
     requiredFields.forEach((field) => {
      if (!user[field] || (field === 'PhoneNumber' && user.PhoneNumber === '+966')) {
        // Custom message for 'confirmPassword', other fields get a standard message
        newMissingFields[field] = field === 'confirmPassword'
          ? 'Please enter your password'
          : `Please enter your ${field.replace(/([A-Z])/g, ' $1').toLowerCase()}`;
      }
    });
 
     if (Object.keys(newMissingFields).length > 0) {
       setMissingFields(newMissingFields);
       return; // Stop sign-up if there are missing fields
     }

    const hasExistingErrors = Object.values(validationMessages).some(
      (message) => message.length > 0
    );
    if (hasExistingErrors) {
      console.log('Errors in validation messages. Stopping sign-up.');
      return;
    }
  
    setLoading(true);
  
    // Reset specific validation errors
    //setValidationMessages((prev) => ({ ...prev, confirmPasswordError: '' }));
  
    // Debug password requirements
    console.log('Password Requirements:', passwordRequirements);
  
    
  
    if (user.Password !== user.confirmPassword) {
      setPopupMessage("Passwords do not match.");
      setPopupImage(errorImage);
      setPopupVisible(true);
      setLoading(false);
      return;
    }

    try {
      // Check if the commercialNumber invalid
      const isValid = await fetchRegistrationInfo(user.commercialNumber);
      if(isValid===0){
        setPopupMessage("The commercial number is invalid.");
        setPopupImage(errorImage);
        setPopupVisible(true);
        setLoading(false);
        return; // Prevent sign-up if commercial number not exist in the wathq api
      }
      
      

      // Check if the commercialNumber already exists
      const existingUserQuery = await getDocs(query(collection(db, 'Employer'), where('commercialNumber', '==', user.commercialNumber)));

      if (!existingUserQuery.empty) {
        setPopupMessage("The commercial number is already used. Do you want to go to the log in page?");
        setPopupImage(errorImage);
        setPopupVisible(true);
        setShowConfirmButtons(true);
        return; // Prevent sign-up if commercial number exists
      }

      const existingUserQuery1 = await getDocs(query(collection(db, 'Employer'), where('PhoneNumber', '==', user.PhoneNumber)));

      if (!existingUserQuery1.empty) {
        setPopupMessage("The phone number is already used. Please use a new number.");
        setPopupImage(errorImage);
        setPopupVisible(true);
        setLoading(false);
        return; // Prevent sign-up if commercial number exists
      }

      // Create user with Firebase Authentication using email
      const userCredential = await createUserWithEmailAndPassword(auth, `${user.CompanyEmail}`, user.Password);
      const newUser = userCredential.user;

      // Send email verification
      await sendEmailVerification(newUser);


      // Add user data to Firestore
      await addDoc(collection(db, 'Employer'), {
        commercialNumber: user.commercialNumber,
        PhoneNumber: user.PhoneNumber,
        CompanyName: user.CompanyName,
        ShortCompanyName:user.ShortCompanyName,
        CompanyEmail: user.CompanyEmail,
        uid: newUser.uid,
      });

      // Inform the user to check their email for verification
      setPopupMessage("You have successfully signed up! Please verify your email before logging in.");
      setPopupImage(successImage);
      setPopupVisible(true);
      setTimeout(() => {
        setPopupVisible(false);
        navigate('/');
      }, 3000);
    } catch (error) {
      console.error('Error signing up:', error);
      if (error.code === 'auth/email-already-in-use') {
        setPopupMessage('The company email is already used. Please use a different email.');
      } else {
        setPopupMessage('Signup failed. Please try again.');
      }
      setPopupImage(errorImage);
      setPopupVisible(true);
    } finally {
      setLoading(false);
    }
  };
  const handleYes = () => {
    setPopupVisible(false);
    navigate('/');
  };

  const handleNo = () => {
    setPopupVisible(false);
    setShowConfirmButtons(false);
  };
  const handleClosePopup = () => {
    setPopupVisible(false);
    setShowConfirmButtons(false);
  };


  // const getBorderColor = (field) => {
  //   // if (missingFields[field]) {
  //   //   return 'red';
  //   // }
  //   // if (field === 'Password') {
  //   //   return validationMessages.passwordError ? 'red' : !validationMessages.passwordError && user.Password ? 'green' : '';
  //   // } else if (field === 'PhoneNumber') {
  //   //   return validationMessages.phoneError ? 'red' : !validationMessages.phoneError && user.PhoneNumber ? 'green' : '';
  //   // } else if (field === 'confirmPassword') {
  //   //   return validationMessages.confirmPasswordError ? 'red' : user.confirmPassword ? 'green' : '';
  //   // } else if (field === 'CompanyEmail') {
  //   //   return validationMessages.emailError ? 'red' : !validationMessages.emailError && user.CompanyEmail ? 'green' : '';
  //   // } else if (field === 'commercialNumber') {
  //   //   return validationMessages.commercialNumberError ? 'red' : !validationMessages.commercialNumberError && user.commercialNumber ? 'green' : '';
  //   // } else {
  //   //   return validationMessages[`${field}Error`] ? 'red' : !validationMessages[`${field}Error`] && user[field] ? 'green' : '';
  //   // }
    
  //     // Check if the field has a missing field error
  //     if (missingFields[field]) {
  //       return 'red';
  //     } 
    
  //     // Check if the field has a validation error
  //     if (validationMessages[`${field}Error`]) {
  //       return 'red';
  //     }
    
  //     // Show green border if the field is filled and there’s no error
  //     if (user[field]) {
  //       return 'green';
  //     }
    
  //     // Default to no specific color if none of the conditions above apply
  //     return '';
  //   };
    




  return (

    <div
      className={s.loginContainer}
    >
      <div >
        <img
          src={backgroundImage}
          alt='Top Right'
          className={s.rightImage}
        />
      </div>
      <div >
        <h1 style={{ marginTop: '40px', fontWeight: "bold" }}>Welcome to SAIR! </h1>
        <p style={{ fontSize: '30px', color: '#059855', marginTop: '6px', marginBottom: "20px" }}>
          Your easy solution for managing <br />delivery drivers.
        </p>



        <form
          className={s.formContainer}
          onSubmit={handleSignUp}
          noValidate
        > 
          <div className={s.profileField}>
            <label>Commercial Number</label>
            <input
              type="text"
              name="commercialNumber"
              value={user.commercialNumber}
              onChange={handleChange}

              required
              //style={{ borderColor: getBorderColor('commercialNumber') }}
            />
            {missingFields['commercialNumber'] && <p style={{ color: 'red', marginTop: '3px' }}>{missingFields['commercialNumber']}</p>}
            {validationMessages.commercialNumberError && <p style={{ color: 'red', marginTop: '3px'}}>{validationMessages.commercialNumberError}</p>}
          </div>

          <div className={s.profileField}>
            <label>Company Name</label> 
            <input
              type="text"
              name="CompanyName"
              value={user.CompanyName}
              onChange={handleChange}
              readOnly={isCompanyNameReadOnly}
              required
              //style={{ borderColor: getBorderColor('CompanyName') }}
            />
            {missingFields['CompanyName'] && <p style={{ color: 'red' , marginTop: '3px'}}>{missingFields['CompanyName']}</p>}
          </div>

          <div className={s.profileField}>
            <label>Short Company Name</label> 
            <input
              type="text"
              name="ShortCompanyName"
              onChange={handleChange}
              value={user.ShortCompanyName}
            />
          </div>

          <div className={s.profileField}>
            <label>Phone Number</label>
            <input
              type="tel"
              name="PhoneNumber"
              placeholder='+966'
              value={`${user.PhoneNumber}`}
              onChange={handlePhoneNumberChange}
              pattern="\+9665\d{8}"
              required
              //style={{ borderColor: getBorderColor('PhoneNumber') }}
            />
            {missingFields['PhoneNumber'] && <p style={{ color: 'red' , marginTop: '3px'}}>{missingFields['PhoneNumber']}</p>}
            {validationMessages.phoneError && <p style={{ color: 'red', marginTop: '3px' }}>{validationMessages.phoneError}</p>}
          </div>
          <div className={s.profileField}>
            <label>Company Email</label>
            <input 
              type="email"
              name="CompanyEmail"
              value={user.CompanyEmail}
              onChange={handleChange}
              required
              //style={{ borderColor: getBorderColor('CompanyEmail') }}
            />
            {missingFields['CompanyEmail'] && <p style={{ color: 'red' , marginTop: '3px'}}>{missingFields['CompanyEmail']}</p>}           
            {validationMessages.emailError && <p style={{ color: 'red' , marginTop: '3px'}}>{validationMessages.emailError}</p>}
            
          </div>

          <div style={{ position: 'relative' }} className={`${s.profileField} ${s.passwordContainer}`}>
            <label>Password</label>
            <input
              type={showPassword ? "text" : "password"}
              name="Password"
              value={user.Password}
              onChange={handleChange}
              required
              //style={{ borderColor: getBorderColor('Password'), paddingRight: '30px' }}
            />

            <span
              onClick={() => togglePasswordVisibility('new')}
              className={s.passwordVisibilityToggle}
               
            >
              <i className={showPassword ? 'far fa-eye' : 'far fa-eye-slash'}></i>
            </span> 
            {missingFields['Password'] && <p style={{ color: 'red' , marginTop: '3px'}}>{missingFields['Password']}</p>}

            </div>
          <div  >
            <ul style={{ marginLeft: '30px',fontSize:'14px' }}>
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
              <li style={{ color: passwordRequirements.special ? '#059855' : 'red' , marginBottom:'5px'}}>
              Contain at least one special character(!@#$%^&*)
              </li>
            </ul>
          </div>
          <div style={{ position: 'relative' }} className={`${s.profileField} ${s.passwordContainer}`}>
            <label >Confirm Password</label>
            <input
              type={showConfirmNewPassword ? "text" : "password"}
              name="confirmPassword"
              value={user.confirmPassword}
              onChange={handleChange}
              required
              //style={{ borderColor: getBorderColor('confirmPassword') }}
            />
            <span
              onClick={() => togglePasswordVisibility('confirm')}
              className={s.passwordVisibilityToggle}

            >
              <i className={showConfirmNewPassword ? 'far fa-eye' : 'far fa-eye-slash'}></i>
            </span>
            {missingFields['confirmPassword'] && <p style={{ color: 'red' , marginTop: '3px'}}>{missingFields['confirmPassword']}</p>}
          </div>
          <div style={{ marginTop: '20px', textAlign: 'center', position: 'relative' }}>
            <a
              id={s.loginLink}
              onClick={() => navigate('/')}
              style={{ cursor: 'pointer', color: '#059855', textDecoration: 'underline', marginTop: '10px',cursor: 'pointer', marginLeft:'-130px'}}
            >
              Already have a company account? Log in here
            </a> <br />

            <button className={s.submitButton} type="submit" style={{ marginBottom: '15px' }}>
              Sign up
            </button>


          </div>
        </form>

        {popupVisible && (
    <Modal
        title={null} // Change as needed
        visible={popupVisible}
        onCancel={handleClosePopup}
        footer={null} // Set footer to null to avoid rendering default footer
        style={{ top: '38%' }}
        bodyStyle={{ textAlign: 'center' }} // Center text in modal body
        className="custom-modal" 
        closeIcon={
          <span className="custom-modal-close-icon">
            ×
          </span>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <img
                src={popupImage}
                alt="Popup"
                style={{ width: '20%', marginBottom: '16px' }} // Adjust as needed
            />
            <p>{popupMessage}</p>
            {showConfirmButtons && ( // Conditional rendering for buttons
                <div style={{ display: 'flex', justifyContent: 'center', gap: '5px', marginTop: '12px' }}>
                    <Button 
                        key="yes" 
                        type="default" // Use default type for the Yes button
                        onClick={handleYes}
                        style={{
                            width: '87px',
                            height: '36px',
                            fontFamily: 'Open Sans',
                        }}
                    >
                        Yes
                    </Button>
                    <Button 
                        key="no" 
                        type="default" // Use default type for the No button
                        onClick={handleNo}
                        style={{
                            width: '87px',
                            height: '36px',
                            fontFamily: 'Open Sans',
                        }}
                    >
                        No
                    </Button>
                </div>
            )}
        </div>
    </Modal>
)}
      </div>
    </div>
  );
};

export default SignUp;
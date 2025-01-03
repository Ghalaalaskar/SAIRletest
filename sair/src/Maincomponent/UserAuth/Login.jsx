import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { db } from '../../firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';
import successImage from '../../images/Sucess.png';
import errorImage from '../../images/Error.png';
import backgroundImage from '../../images/sairbackgroundL.png';
import { Form, Modal } from 'antd';
import s from '../../css/Login.module.css';
// import '@fortawesome/fontawesome-free/css/all.min.css';
// import '../../App.css';
import "../../css/common.css";
import { useContext } from 'react';
import { ShortCompanyNameContext } from '../../ShortCompanyNameContext';
import '../../css/CustomModal.css';

const Login = () => {
  const navigate = useNavigate();
  const [role, setRole] = useState('');
  const { shortCompanyName , setShortCompanyName} = useContext(ShortCompanyNameContext);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [password, setPassword] = useState('');
  const [missingFields, setMissingFields] = useState({});
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState({
    phoneStartError: '',
    phoneLengthError: '',
    commercialError: '',
  });
  const [popupVisible, setPopupVisible] = useState(false);
  const [popupMessage, setPopupMessage] = useState('');
  const [popupImage, setPopupImage] = useState('');

  useEffect(() => {
    validatePhoneNumber(phoneNumber);
  }, [phoneNumber]);

  // useEffect(() => {
  //     if (role === 'employer') {
  //         validateCommercialNumber(email);
  //     } else {
  //         setErrors((prev) => ({ ...prev, commercialError: '' }));
  //     }
  // }, [email, role]);

  const handleRoleChange = (event) => {
    const selectedRole = event.target.value;
    setRole(selectedRole);
    setPhoneNumber('');
    setEmail('');
    setPassword('');
    setErrors({
      phoneStartError: '',
      phoneLengthError: '',
      commercialError: '',
    });
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
  
    // Update state dynamically based on the input's `name` attribute
    if (name === 'email') {
      setEmail(value);
    } else if (name === 'password') {
      setPassword(value);
    }
  
    // Clear the missing field error as soon as the user starts typing
    if (value.trim() !== '' && missingFields[name]) {
      setMissingFields((prev) => {
        const updated = { ...prev };
        delete updated[name];
        return updated;
      });
    }
  };
  
  // Function to toggle password visibility
  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  const validatePhoneNumber = (phoneValue) => {
    let phoneStartError = '';
    let phoneLengthError = '';

    if (!phoneValue.startsWith('+9665') && phoneValue.length > 0) {
      phoneStartError = 'Phone number must start with +9665.';
    }

    if (phoneValue.length !== 13 && phoneValue.length > 0) {
      phoneLengthError = 'Phone number must be exactly 13 digits.';
    }

    setErrors((prev) => ({
      ...prev,
      phoneStartError,
      phoneLengthError,
    }));
  };

  //const validateCommercialNumber = (commercialValue) => {
  // const numberRegex = /^\d{10}$/;
  //const commercialError = numberRegex.test(commercialValue) ? '' : 'Commercial registration number must be exactly 10 digits long.';
  //setErrors((prev) => ({
  //  ...prev,
  //commercialError,
  // }));
  // };

  const handleSubmit = async (event) => {
    // event.preventDefault();
    const newMissingFields = {};
if (!email) {
  newMissingFields.email = 'Please enter your email.';
}
if (!password) {
  newMissingFields.password = 'Please enter your password.';
}

if (Object.keys(newMissingFields).length > 0) {
  setMissingFields(newMissingFields);
  setLoading(false);
  return;
}



    try {
      const auth = getAuth();
      let userFound = false;

      if (role === 'gdt' ) {
        const q = query(
          collection(db, 'GDT'),
          where('GDTEmail', '==', email)
        );
        const querySnapshot = await getDocs(q);

        if (!querySnapshot.empty) {
          try {
            const userCredential = await signInWithEmailAndPassword(
              auth,
              email,
              password
            );
            const user = userCredential.user;


            //proceed with login
            userFound = true;
            const gdtUID = querySnapshot.docs[0].id;
            sessionStorage.setItem('gdtUID', gdtUID);
            const isAdmin = querySnapshot.docs[0].data().isAdmin;
            if(isAdmin){
              setTimeout(() => {
                navigate('/gdthome');
              }, 1500);
              }
            else{
              setTimeout(() => {
                navigate('/gdthome');
              }, 1500);
            }
            
          } catch (error) {
            setPopupMessage('Invalid email or password.');
            setPopupImage(errorImage);
            setPopupVisible(true);
          }
        } else {
          setPopupMessage('Invalid email or password.');
          setPopupImage(errorImage);
          setPopupVisible(true);
        }
      }







      if (role === 'employer') {
        const q = query(
          collection(db, 'Employer'),
          where('CompanyEmail', '==', email)
        );
        const querySnapshot = await getDocs(q);

        if (!querySnapshot.empty) {
          try {
            const userCredential = await signInWithEmailAndPassword(
              auth,
              email,
              password
            );
            const user = userCredential.user;

            // Check if the user's email is verified
            if (!user.emailVerified) {
              setPopupMessage('Please verify your email before logging in.');
              setPopupImage(errorImage);
              setPopupVisible(true);
              return;
            }

            // If the email is verified, proceed with login
            userFound = true;
            const employerUID = querySnapshot.docs[0].id;
            sessionStorage.setItem('employerUID', employerUID);
            localStorage.setItem("crashIds", JSON.stringify([])); //not sure
             // Fetch the ShortCompanyName and update sessionStorage
             const employerData = querySnapshot.docs[0].data();
             const shortCompanyName = employerData.ShortCompanyName || '';
             sessionStorage.setItem('ShortCompanyName', shortCompanyName);
             setShortCompanyName(shortCompanyName); // Update the context

            setTimeout(() => {
              navigate('/employer-home');
            }, 1500);
          } catch (error) {
            setPopupMessage('Invalid email or password.');
            setPopupImage(errorImage);
            setPopupVisible(true);
          }
        } else {
          setPopupMessage('Invalid email or password.');
          setPopupImage(errorImage);
          setPopupVisible(true);
        }
      }

      if (!userFound) {
        setPopupMessage('Invalid Email or password.');
        setPopupImage(errorImage);
        setPopupVisible(true);
      }
    } catch (error) {
      console.error('Error fetching user: ', error);
    }
  };








  const handleClosePopup = () => {
    setPopupVisible(false);
  };

  return (
    <div className={s.loginContainer}>
      <div>
        <img
          src={backgroundImage}
          alt='sair'
          className={s.rightImage}
          
        />
      </div>

      <h1  >
        Welcome to SAIR!
      </h1>
<div style={{marginTop:'50px'}}>
      <label style={{ fontSize: '18px' }}>
      Please Select your Role
        <select
          id='roleSelect'
          onChange={handleRoleChange}
        >
          <option style={{ fontSize: '15px' }} value=''>
            -- Select a Role --
          </option>
          <option style={{ fontSize: '15px' }} value='gdt'>
            GDT
          </option>
          <option style={{ fontSize: '15px' }} value='employer'>
            Employer
          </option>
        </select>
      </label>
      <br />
      <br />

      <div
        className={s.formContainer}
        style={{
          display: role ? 'block' : 'none',
        }}
      >
        <Form id='dynamicForm' onSubmit={handleSubmit}>
          {role === 'gdt'? (
            
            <div>
            <p style={{marginBottom: '20px'}}
            >
              Please fill in the following information to log in to your
              account.
            </p>
            <style>
              {`
        input::placeholder {
          font-size: 14px;
          padding-left: 15px;

        }
      `}
            </style> 

            <input
              type='email'
              id='email'
              name='email'
              placeholder='Enter your email'
              value={email}
              onFocus={(e) => (e.target.placeholder = '')} // Clear placeholder on focus
              onBlur={(e) =>
                (e.target.placeholder = 'Enter your email')
              } // Restore placeholder on blur if empty
              onChange={handleInputChange}
            />
            {missingFields.email && <p style={{ color: 'red', marginTop: '3px',fontSize:'14px' }}>{missingFields.email}</p>}
            <br />
            <label htmlFor='password'></label>
            <br />
            <div className={s.passwordContainer}>
              <input
                type={showPassword ? 'text' : 'password'}
                name='password'
                placeholder='Enter your password'
                value={password}
                onFocus={(e) => (e.target.placeholder = '')} // Clear placeholder on focus
                onBlur={(e) => (e.target.placeholder = 'Enter your password')} // Restore placeholder on blur if empty
                onChange={handleInputChange}
              /> 
              <span
                onClick={togglePasswordVisibility}
                className={s.passwordVisibilityToggle}
              >
                <i
                  className={showPassword ? 'far fa-eye' : 'far fa-eye-slash'}
                ></i>
              </span>
              {missingFields.password && <p style={{ color: 'red', marginTop: '3px',fontSize:'14px'}}>{missingFields.password}</p>}
            </div>
          </div>







          ) : role === 'employer' ? (
            <div>
              <p style={{marginBottom: '20px'}}
              >
                Please fill in the following information to log in to your
                account.
              </p>
              <style>
                {`
          input::placeholder {
            font-size: 14px;
            padding-left: 15px;

          }
        `}
              </style> 

              <input
                type='email'
                id='email'
                name='email'
                placeholder='Enter your Company email'
                value={email}
                onFocus={(e) => (e.target.placeholder = '')} // Clear placeholder on focus
                onBlur={(e) =>
                  (e.target.placeholder = 'Enter your Company email')
                } // Restore placeholder on blur if empty
                onChange={handleInputChange}
              />
              {missingFields.email && <p style={{ color: 'red', marginTop: '3px',fontSize:'14px' }}>{missingFields.email}</p>}
              <br />
              <label htmlFor='password'></label>
              <br />
              <div className={s.passwordContainer}>
                <input
                  type={showPassword ? 'text' : 'password'}
                  name='password'
                  placeholder='Enter your password'
                  value={password}
                  onFocus={(e) => (e.target.placeholder = '')} // Clear placeholder on focus
                  onBlur={(e) => (e.target.placeholder = 'Enter your password')} // Restore placeholder on blur if empty
                  onChange={handleInputChange}
                /> 
                <span
                  onClick={togglePasswordVisibility}
                  className={s.passwordVisibilityToggle}
                >
                  <i
                    className={showPassword ? 'far fa-eye' : 'far fa-eye-slash'}
                  ></i>
                </span>
                {missingFields.password && <p style={{ color: 'red', marginTop: '3px',fontSize:'14px'}}>{missingFields.password}</p>}
              </div>
            </div>
          ) : null}
          <br></br>
          <div className='linksConta' >
            <a
              className={s.forget}
              id='forget'
              onClick={() =>  navigate(`/ForgotPassword?role=${role}`)}
             
            >
              Forget password?
            </a>
            <br />
            {role === 'employer' && (
              <a
                className={s.signupLink}
                onClick={() => navigate('/Signup')}
              
              >
                Don't have a employer account? Sign up here
              </a>
            )}
          </div>
          <button className={s.submitButton} onClick={handleSubmit} type='submit'>
            Log in
          </button>
        </Form>
      </div>
      </div>
      {popupVisible && (
    <Modal
    visible={popupVisible}
    onCancel={handleClosePopup}
    footer={<p style={{textAlign:'center'}}>{popupMessage}</p>} 
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
        alt='Popup'
        style={{ width: '20%', marginBottom: '16px' }} // Adjusted to match the modal style
      />
      
    </div>
  </Modal>
)}
    </div>
  );
};

export default Login;

import React, { useEffect, useState } from 'react';
import { db, auth } from '../../firebase';
import {
  collection,
  addDoc,
  query,
  where,
  getDocs,
  runTransaction,
  getFirestore,
} from 'firebase/firestore';
import { Modal } from 'antd';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { FaTrash } from 'react-icons/fa';
import * as XLSX from 'xlsx';
import Header from './GDTHeader';
import s from '../../css/Profile.module.css';
import successImage from '../../images/Sucess.png';
import errorImage from '../../images/Error.png';
import { useNavigate } from 'react-router-dom';
import emailjs from 'emailjs-com';
import { generateRandomPassword } from '../../utils/common';
import templateFile from './template.xlsx';
import debounce from 'lodash.debounce';
import { FaCheck, FaTimes } from 'react-icons/fa';

const GDTAddStaffBatch = () => {
  const [fileData, setFileData] = useState([]);
  const [errorData, setErrorData] = useState([]);
  const [popupVisible, setPopupVisible] = useState(false);
  const [popupMessage, setPopupMessage] = useState('');
  const [popupImage, setPopupImage] = useState('');
  const [fileName, setFileName] = useState('');
  const navigate = useNavigate();
  const [isButtonDisabled, setIsButtonDisabled] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const firestore = getFirestore(); // Get Firestore instance once

  const handleInputChange = (index, field, value) => {
    const updatedFileData = [...fileData];
    updatedFileData[index] = { ...updatedFileData[index], [field]: value };
    setFileData(updatedFileData);
    validateAllFields(updatedFileData);
  };

  const validateAllFields = async (updatedData) => {
    updatedData.map((staff, index) =>
      validateStaffMember(staff, index, updatedData)
    );

    await Promise.all(
      updatedData.map((staff, index) =>
        checkUniqueness(
          staff['Mobile Phone Number'],
          staff.Email,
          staff['Staff ID']
        )
      )
    );
  };

  const validateStaffMember = async (staff, index, allStaff) => {
    const staffErrors = {
      Fname: !staff['First name'],
      Lname: !staff['Last name'],
      PhoneNumber: false,
      Email: false,
      ID: false,
    };

    if (!staff['First name'] || !validateName(staff['First name'])) {
      staffErrors.Fname = true;
    }
    if (!staff['Last name']) {
      staffErrors.Lname = true;
    }
    if (!staff['Mobile Phone Number']) {
      staffErrors.PhoneNumber = true;
    }
    if (!staff.Email) {
      staffErrors.Email = true;
    }
    if (!staff['Staff ID']) {
      staffErrors.ID = true;
    }

    if (
      staff['Mobile Phone Number'] &&
      validatePhoneNumber(staff['Mobile Phone Number'])
    ) {
      staffErrors.PhoneNumber = true;
    }
    if (staff.Email && validateEmail(staff.Email)) {
      staffErrors.Email = true;
    }
    if (staff['Staff ID'] && validateStaffID(staff['Staff ID'])) {
      staffErrors.ID = true;
    }

    const uniquenessResult = await checkUniqueness(
      staff['Mobile Phone Number'],
      staff.Email,
      staff['Staff ID']
    );
    if (!uniquenessResult.isUnique) {
      if (uniquenessResult.message.includes('Phone number'))
        staffErrors.PhoneNumber = true;
      if (uniquenessResult.message.includes('Email')) staffErrors.Email = true;
      if (uniquenessResult.message.includes('Staff ID')) staffErrors.ID = true;
    }

    // Check for duplicates within the uploaded file
    const duplicates = allStaff.filter(
      (s, i) =>
        i !== index &&
        (s['Mobile Phone Number'] === staff['Mobile Phone Number'] ||
          s.Email === staff.Email ||
          s['Staff ID'] === staff['Staff ID'])
    );
    if (duplicates.length > 0) {
      duplicates.forEach((dup) => {
        if (dup['Mobile Phone Number'] === staff['Mobile Phone Number'])
          staffErrors.PhoneNumber = true;
        if (dup.Email === staff.Email) staffErrors.Email = true;
        if (dup['Staff ID'] === staff['Staff ID']) staffErrors.ID = true;
      });
    }

    setErrorData((prev) => {
      const updatedErrorData = [...prev];
      updatedErrorData[index] = staffErrors;
      return updatedErrorData;
    });
  };

  const checkForDuplicatesAndUpdateErrors = (updatedData) => {
    const phoneNumbers = {};
    const emails = {};
    const ids = {};

    updatedData.forEach((staff, index) => {
      if (staff['Mobile Phone Number']) {
        if (phoneNumbers[staff['Mobile Phone Number']]) {
          phoneNumbers[staff['Mobile Phone Number']].push(index);
        } else {
          phoneNumbers[staff['Mobile Phone Number']] = [index];
        }
      }
      if (staff.Email) {
        if (emails[staff.Email]) {
          emails[staff.Email].push(index);
        } else {
          emails[staff.Email] = [index];
        }
      }
      if (staff['Staff ID']) {
        if (ids[staff['Staff ID']]) {
          ids[staff['Staff ID']].push(index);
        } else {
          ids[staff['Staff ID']] = [index];
        }
      }
    });

    const updatedErrorData = [...errorData];

    // Reset all error states before applying new validation
    updatedData.forEach((staff, index) => {
      const staffErrors = updatedErrorData[index] || {};
      staffErrors.PhoneNumber = false;
      staffErrors.Email = false;
      staffErrors.ID = false;
      updatedErrorData[index] = staffErrors;
    });

    // Update error states based on duplicates
    for (const phone in phoneNumbers) {
      if (phoneNumbers[phone].length > 1) {
        phoneNumbers[phone].forEach((i) => {
          updatedErrorData[i].PhoneNumber = true;
        });
      }
    }

    for (const email in emails) {
      if (emails[email].length > 1) {
        emails[email].forEach((i) => {
          updatedErrorData[i].Email = true;
        });
      }
    }

    for (const id in ids) {
      if (ids[id].length > 1) {
        ids[id].forEach((i) => {
          updatedErrorData[i].ID = true;
        });
      }
    }

    setErrorData(updatedErrorData); // Update the state with marked errors
  };

  const validatePhoneNumber = (PhoneNumber) => {
    const phoneRegex = /^\+9665\d{8}$/;
    return phoneRegex.test(PhoneNumber)
      ? null
      : 'Phone number must start with +9665 and be followed by 8 digits.';
  };

  const validateName = (name) => {
    // Regular expression to match only letters and spaces
    const nameRegex = /^[a-zA-Z\s]+$/;
    return name && nameRegex.test(name.trim());
  };

  const validateEmail = (Email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(Email) ? null : 'Please enter a valid Email.';
  };

  const validateStaffID = (StaffID) => {
    const staffIDRegex = /^\d{10}$/;
    return staffIDRegex.test(StaffID) ? null : 'Staff ID must be 10 digits.';
  };

  const checkUniqueness = async (phone, email, staffID) => {
    // console.log('Checking uniqueness for:', { phone, email, staffID });

    try {
      // Create queries to check for existing phone, email, and staff ID
      const phoneQuery = query(
        collection(db, 'GDT'),
        where('PhoneNumber', '==', phone)
      );
      const emailQuery = query(
        collection(db, 'GDT'),
        where('GDTEmail', '==', email)
      );
      const idQuery = query(collection(db, 'GDT'), where('ID', '==', staffID));

      // Execute the queries
      const [phoneSnapshot, emailSnapshot, idSnapshot] = await Promise.all([
        getDocs(phoneQuery),
        getDocs(emailQuery),
        getDocs(idQuery),
      ]);

      // Check if any of the snapshots have documents
      if (!phoneSnapshot.empty) {
        console.log('Phone number already exists.');
        return { isUnique: false, message: 'Phone number already exists.' };
      }
      if (!emailSnapshot.empty) {
        console.log('Email already exists.');
        return { isUnique: false, message: 'Email already exists.' };
      }
      if (!idSnapshot.empty) {
        console.log('Staff ID already exists.');
        return { isUnique: false, message: 'Staff ID already exists.' };
      }

      // If no duplicates are found
      return { isUnique: true, message: '' };
    } catch (error) {
      console.error('Error checking uniqueness:', error);
      return {
        isUnique: false,
        message: 'Error checking uniqueness in the database.',
      };
    }
  };

  const handleBatchUploadResults = (errorList) => {
    if (errorList.length > 0) {
      const errorMessages = errorList.map((err) => err.message).join('\n');
      setPopupMessage(errorMessages);
      setPopupImage(errorImage);
      setPopupVisible(true);
    } else {
      setPopupMessage('All staff added successfully!');
      setPopupImage(successImage);
      setPopupVisible(true);
      setTimeout(() => navigate('/gdtstafflist'), 2000);
    }
  };

  const sendEmail = (email, staffName, password) => {
    const templateParams = {
      to_name: staffName,
      to_email: email,
      generatedPassword: password,
    };

    emailjs
      .send(
        'service_ltz361p',
        'template_gd1x3q7',
        templateParams,
        '6NEdVNsgOnsmX-H4s'
      )
      .then(
        (response) => {
          console.log(
            'Email sent successfully!',
            response.status,
            response.text
          );
        },
        (error) => {
          console.error('Failed to send email:', error);
        }
      );
  };

  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (!file) return;
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (e) => {
      const data = e.target.result;
      const workbook = XLSX.read(data, { type: 'binary' });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(worksheet);

      setFileData(jsonData);
      const initialErrorData = jsonData.map(() => ({
        Fname: false,
        Lname: false,
        PhoneNumber: false,
        Email: false,
        ID: false,
      }));
      console.log('Initial error data:', initialErrorData);
      setErrorData(initialErrorData);

      validateAllFields(jsonData);
    };
    reader.readAsBinaryString(file);
  };

  const handleRemoveFile = () => {
    setFileName('');
    document.getElementById('fileInput').value = '';
    setFileData([]);
    setIsButtonDisabled(true); // Disable button when file is removed
    setErrorMessage(''); // Clear error message
  };

  const handleClosePopup = () => {
    setPopupVisible(false);
  };

  const handleAddStaff = async () => {
    const hasErrors = errorData.some((staffErrors) =>
      Object.values(staffErrors).some((error) => error)
    );
    if (hasErrors) {
      setPopupMessage('Please fix the errors before adding staff.');
      setPopupImage(errorImage);
      setPopupVisible(true);
      return;
    }

    const errorList = [];
    for (const staff of fileData) {
      try {
        await addStaffToDatabase(staff);
      } catch (error) {
        errorList.push({
          message: `Error adding staff ${staff['First name']} ${staff['Last name']}: ${error.message}`,
        });
      }
    }
    handleBatchUploadResults(errorList);
  };

  const addStaffToDatabase = async (staff) => {
    const {
      'First name': Fname,
      'Last name': Lname,
      'Mobile Phone Number': PhoneNumber,
      Email,
      'Staff ID': ID,
    } = staff;
    const password = generateRandomPassword();
    try {
      await createUserWithEmailAndPassword(auth, Email, password);
      await addDoc(collection(db, 'GDT'), {
        Fname,
        Lname,
        PhoneNumber,
        GDTEmail: Email,
        ID,
        isAdmin: false,
        isDefaultPassword: true,
      });
      sendEmail(Email, `${Fname} ${Lname}`, password);
    } catch (error) {
      throw error; // Re-throw the error to be caught in handleAddStaff
    }
  };

  useEffect(() => {
    // Validate only when fileData changes

    const hasErrors = errorData.some((staffErrors) =>
      Object.values(staffErrors).some((error) => error)
    );
    setIsButtonDisabled(hasErrors);
    setErrorMessage(
      hasErrors
        ? 'Please fix the errors in the table highlighted with red borders.'
        : ''
    );
  }, [errorData, fileData]);

  return (
    <div>
      <Header active='gdtstafflist' />
      <div className='breadcrumb' style={{ marginRight: '100px' }}>
        <a onClick={() => navigate('/gdthome')}>Home</a>
        <span> / </span>
        <a onClick={() => navigate('/gdtstafflist')}>Staff List</a>
        <span> / </span>
        <a onClick={() => navigate('/gdtaddstaff')}>Add Staff</a>
        <span> / </span>
        <a onClick={() => navigate('/gdtaddstaffbatch')}>Add Staff as Batch</a>
      </div>
      <div className={s.container}>
        <h2 className='title'>Add Staff as Batch</h2>
        <p>
          To download the staff batch template, which must follow exactly the
          format to add the staff correctly,{' '}
          <a
            href={templateFile}
            download
            style={{
              cursor: 'pointer',
              color: '#059855',
              textDecoration: 'underline',
            }}
          >
            click here
          </a>
          .
        </p>

        <br />
        <div className={s.formRow}>
          <input
            id='fileInput'
            type='file'
            onChange={handleFileUpload}
            accept='.xls,.xlsx'
            className={s.fileInput}
          />
          {fileName && (
            <div
              style={{
                marginLeft: '10px',
                display: 'flex',
                alignItems: 'center',
              }}
            >
              <FaTrash
                onClick={handleRemoveFile}
                style={{
                  marginLeft: '10px',
                  color: '#059855',
                  cursor: 'pointer',
                  fontSize: '20px',
                }}
                title='Remove file'
              />
            </div>
          )}
        </div>

        {fileData.length > 0 && (
          <div>
            {/* Add error message display here */}
            {errorMessage && (
              <p style={{ color: 'red', marginBottom: '10px' }}>
                {errorMessage} <br />
              </p>
            )}
            <table>
              <thead>
                <tr>
                  <th style={{ color: '#059855' }}>First Name</th>
                  <th style={{ color: '#059855' }}>Last Name</th>
                  <th style={{ color: '#059855' }}>Phone Number</th>
                  <th style={{ color: '#059855' }}>Email</th>
                  <th style={{ color: '#059855' }}>ID</th>
                  <th style={{ color: '#059855' }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {fileData.map((staff, index) => (
                  <tr key={index}>
                    <td>
                      <input
                        type='text'
                        value={staff['First name'] || ''}
                        onChange={(e) =>
                          handleInputChange(index, 'First name', e.target.value)
                        }
                        style={{
                          borderColor: errorData[index]?.Fname
                            ? 'red'
                            : '#059855',
                          boxShadow: errorData[index]?.Fname
                            ? '0 0 5px red'
                            : 'none',
                          outline: 'none',
                          transition: 'border-color 0.3s, box-shadow 0.3s',
                        }}
                      />
                    </td>
                    <td>
                      <input
                        type='text'
                        value={staff['Last name'] || ''}
                        onChange={(e) =>
                          handleInputChange(index, 'Last name', e.target.value)
                        }
                        style={{
                          borderColor: errorData[index]?.Lname
                            ? 'red'
                            : '#059855',
                          boxShadow: errorData[index]?.Lname
                            ? '0 0 5px red'
                            : 'none',
                          outline: 'none',
                          transition: 'border-color 0.3s, box-shadow 0.3s',
                        }}
                      />
                    </td>
                    <td>
                      <input
                        type='text'
                        value={staff['Mobile Phone Number'] || ''}
                        onChange={(e) =>
                          handleInputChange(
                            index,
                            'Mobile Phone Number',
                            e.target.value
                          )
                        }
                        style={{
                          borderColor: errorData[index]?.PhoneNumber
                            ? 'red'
                            : '#059855',
                          boxShadow: errorData[index]?.PhoneNumber
                            ? '0 0 5px red'
                            : 'none',
                          outline: 'none',
                          transition: 'border-color 0.3s, box-shadow 0.3s',
                        }}
                      />
                    </td>
                    <td>
                      <input
                        type='email'
                        value={staff.Email || ''}
                        onChange={(e) =>
                          handleInputChange(index, 'Email', e.target.value)
                        }
                        style={{
                          borderColor: errorData[index]?.Email
                            ? 'red'
                            : '#059855',
                          boxShadow: errorData[index]?.Email
                            ? '0 0 5px red'
                            : 'none',
                          outline: 'none',
                          transition: 'border-color 0.3s, box-shadow 0.3s',
                        }}
                      />
                    </td>
                    <td>
                      <input
                        type='text'
                        value={staff['Staff ID'] || ''}
                        onChange={(e) =>
                          handleInputChange(index, 'Staff ID', e.target.value)
                        }
                        style={{
                          borderColor: errorData[index]?.ID ? 'red' : '#059855',
                          boxShadow: errorData[index]?.ID
                            ? '0 0 5px red'
                            : 'none',
                          outline: 'none',
                          transition: 'border-color 0.3s, box-shadow 0.3s',
                        }}
                      />
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      {errorData[index]?.Fname ||
                      errorData[index]?.Lname ||
                      errorData[index]?.PhoneNumber ||
                      errorData[index]?.Email ||
                      errorData[index]?.ID ? (
                        <FaTimes
                          style={{
                            color: 'red',
                            marginLeft: '10px',
                            marginTop: '5px',
                          }}
                          title='Not Valid'
                        />
                      ) : (
                        <FaCheck
                          style={{
                            color: 'green',
                            marginLeft: '10px',
                            marginTop: '5px',
                          }}
                          title='Valid'
                        />
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <button
              onClick={handleAddStaff}
              disabled={isButtonDisabled}
              className={s.editBtn}
              style={{
                backgroundColor: isButtonDisabled ? 'gray' : '#059855',
                cursor: isButtonDisabled ? 'not-allowed' : 'pointer',
                opacity: isButtonDisabled ? 0.6 : 1,
                marginBottom:'10px'
              }}
            >
              Add Staff List
            </button>
          </div>
        )}

        {popupVisible && (
          <Modal
            title={null}
            visible={popupVisible}
            onCancel={handleClosePopup}
            footer={<p style={{ textAlign: 'center' }}>{popupMessage}</p>}
            style={{ top: '38%' }}
            className='custom-modal'
            closeIcon={<span className='custom-modal-close-icon'>×</span>}
          >
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                textAlign: 'center',
              }}
            >
              <img
                src={popupImage}
                alt='Popup'
                style={{ width: '20%', marginBottom: '16px' }}
              />
            </div>
          </Modal>
        )}
      </div>
    </div>
  );
};

export default GDTAddStaffBatch;

import React, { useState } from 'react';
import { db, auth } from '../../firebase';
import { collection, addDoc, query, where, getDocs } from 'firebase/firestore';
import { Modal } from 'antd';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { FaTrash } from 'react-icons/fa'; 
import * as XLSX from 'xlsx';
import Header from './GDTHeader';
import s from "../../css/Profile.module.css";
import successImage from '../../images/Sucess.png';
import errorImage from '../../images/Error.png';
import { useNavigate } from 'react-router-dom';
import emailjs from 'emailjs-com';
import { generateRandomPassword } from '../../utils/common';
import templateFile from './template.xlsx'; 

const GDTAddStaffBatch = () => {
    const [fileData, setFileData] = useState([]);
    const [popupVisible, setPopupVisible] = useState(false);
    const [popupMessage, setPopupMessage] = useState('');
    const [popupImage, setPopupImage] = useState('');
    const [fileName, setFileName] = useState('');
    const navigate = useNavigate();


    const handleInputChange = async (index, field, value) => {
        const newData = [...fileData];
        newData[index][field] = value; // Update the specific field
        setFileData(newData);
    
        // Validate the updated staff member in real-time
        await validateStaffMember(newData[index]);
    };
    
    const validateStaffMember = async (staff,index) => {
        const { Fname, Lname, PhoneNumber, Email, ID } = staff;
        let isValid = true;
    
        // Validate fields
        if (!Fname || !Lname || !PhoneNumber || !Email || !ID) {
            staff.error = true; // Mark as error
            isValid = false;
        } else {
            const phoneValidation = validatePhoneNumber(PhoneNumber);
            if (phoneValidation) {
                staff.error = true; 
                isValid = false;
            }
    
            const emailValidation = validateEmail(Email);
            if (emailValidation) {
                staff.error = true; 
                isValid = false;
            }
    
            const staffIDValidation = validateStaffID(ID);
            if (staffIDValidation) {
                staff.error = true; 
                isValid = false;
            }
    
            const uniqueValidationResult = await checkUniqueness(PhoneNumber, Email, ID);
            if (!uniqueValidationResult.isUnique) {
                staff.error = true; 
                isValid = false;
            }
        }
        staff.error = !isValid; // Set error state
        setFileData(prevData => {
            const updatedData = [...prevData];
            updatedData[index] = staff; // Update the specific staff member
            return updatedData;
        });
    };
    
    const handleBatchUpload = async () => {
        const tempData = [...fileData];
        const errorList = [];
    
        for (let staff of tempData) {
            const { Fname, Lname, PhoneNumber, Email, ID } = staff;
    
            // Validate fields
            if (!Fname || !Lname || !PhoneNumber || !Email || !ID) {
                staff.error = true; // Mark as error
                errorList.push({ staff, message: 'All fields are required.' });
                continue;
            }
    
            const phoneValidation = validatePhoneNumber(PhoneNumber);
            if (phoneValidation) {
                staff.error = true; 
                errorList.push({ staff, message: `Error adding ${Fname} ${Lname}: ${phoneValidation}` });
                continue;
            }
    
            const emailValidation = validateEmail(Email);
            if (emailValidation) {
                staff.error = true; 
                errorList.push({ staff, message: `Error adding ${Fname} ${Lname}: ${emailValidation}` });
                continue;
            }
    
            const staffIDValidation = validateStaffID(ID);
            if (staffIDValidation) {
                staff.error = true; 
                errorList.push({ staff, message: `Error adding ${Fname} ${Lname}: ${staffIDValidation}` });
                continue;
            }   
    
            const uniqueValidationResult = await checkUniqueness(PhoneNumber, Email, ID);
            if (!uniqueValidationResult.isUnique) {
                staff.error = true; 
                errorList.push({ staff, message: `Error adding ${Fname} ${Lname}: ${uniqueValidationResult.message}` });
                continue;
            }
    
            staff.error = false; // No errors for this staff
        }
    
        setFileData(tempData); // Update state with validation errors
    
        // Show success or error popup
        if (errorList.length > 0) {
            handleBatchUploadResults(errorList);
        } else {
            setPopupMessage("All fields are correct!");
            setPopupImage(successImage);
            setPopupVisible(true);
        }
    };

    const validatePhoneNumber = (PhoneNumber) => {
        const phoneRegex = /^\+9665\d{8}$/;
        return phoneRegex.test(PhoneNumber) ? null : 'Phone number must start with +9665 and be followed by 8 digits.';
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
        const phoneQuery = query(collection(db, 'GDT'), where("PhoneNumber", "==", phone));
        const emailQuery = query(collection(db, 'GDT'), where("GDTEmail", "==", email));
        const staffIDQuery = query(collection(db, 'GDT'), where("ID", "==", staffID));
    
        const phoneSnapshot = await getDocs(phoneQuery);
        if (!phoneSnapshot.empty) {
            return { isUnique: false, message: "Phone number already exists." };
        }
    
        const emailSnapshot = await getDocs(emailQuery);
        if (!emailSnapshot.empty) {
            return { isUnique: false, message: "Email already exists." }; // Updated message
        }
    
        const staffIDSnapshot = await getDocs(staffIDQuery);
        if (!staffIDSnapshot.empty) {
            return { isUnique: false, message: "Staff ID already exists." };
        }
    
        return { isUnique: true, message: "" };
    };

    const handleBatchUploadResults = (errorList) => {
        if (errorList.length > 0) {
            const errorMessages = errorList.map(err => err.message).join('\n');
            setPopupMessage(`Some staff could not be added:\n${errorMessages}`);
            setPopupImage(errorImage);
            setPopupVisible(true);
        } else {
            setPopupMessage("All staff added successfully!");
            setPopupImage(successImage);
            setPopupVisible(true);
            setTimeout(() => {
                navigate('/gdtstafflist'); 
            }, 2000);
        }
    };

    const sendEmail = (email, staffName, password) => {
        const templateParams = {
            to_name: staffName,
            to_email: email,
            generatedPassword: password,
        };
    
        emailjs.send('service_ltz361p', 'template_gd1x3q7', templateParams, '6NEdVNsgOnsmX-H4s')
            .then((response) => {
                console.log('Email sent successfully!', response.status, response.text);
            }, (error) => {
                console.error('Failed to send email:', error);
            });
    };

    const handleFileUpload = (event) => {
        const file = event.target.files[0]; // Access the first file
        if (!file) return;
    
        setFileName(file.name);
        const reader = new FileReader();
        reader.onload = (e) => {
            const data = e.target.result;
            const workbook = XLSX.read(data, { type: 'binary' });
            const sheetName = workbook.SheetNames[0]; // Get the first sheet
            const worksheet = workbook.Sheets[sheetName];
            const jsonData = XLSX.utils.sheet_to_json(worksheet);
            console.log(jsonData); // Debugging: Check the parsed data
            setFileData(jsonData);
        };
        reader.readAsBinaryString(file); // Pass the correct file
    };

    const handleRemoveFile = () => {
        setFileName('');
        document.getElementById('fileInput').value = '';
        setFileData([]);
    };

    const handleClosePopup = () => {
        setPopupVisible(false);
    };

    const handleRefresh = () => {
        handleBatchUpload(); // Re-validate data
    };

    const handleAddStaff = async () => {
        for (let staff of fileData) {
            if (!staff.error) {
                await addStaffToDatabase(staff);
            }
        }
        setPopupMessage("Selected staff added successfully!");
        setPopupImage(successImage);
        setPopupVisible(true);
        setTimeout(() => {
            navigate('/gdtstafflist'); 
        }, 2000);
    };

    const addStaffToDatabase = async (staff) => {
        const { Fname, Lname, PhoneNumber, Email, ID } = staff;
        const password = generateRandomPassword(); // Generate a random password
        try {
            // Create user in Firebase
            await createUserWithEmailAndPassword(auth, Email, password);
            // Add staff to Firestore
            await addDoc(collection(db, 'GDT'), {
                Fname,
                Lname,
                PhoneNumber,
                GDTEmail: Email,
                ID,
                isAdmin: false,
                isDefaultPassword: true,
            });
            // Send email with the password
            sendEmail(Email, `${Fname} ${Lname}`, password);
        } catch (error) {
            console.error("Error adding staff: ", error);
        }
    };


    return (
        <div>
            <Header active="gdtstafflist" />
            <div className={s.container}>
                <h2 className='title'>Add Staff as Batch</h2>
                <p style={{color:'grey'}}> 
                    To download the add staff batch template <a href={templateFile} download style={{ color: '#059855', textDecoration: 'underline' }}>click here</a>.
                </p>

                <br/>
                <div className={s.formRow}>
                    <input
                        id="fileInput"
                        type="file"
                        onChange={handleFileUpload}
                        accept=".xls,.xlsx"
                        className={s.fileInput}
                    />
                    {fileName && (
                        <div style={{ marginLeft: '10px', display: 'flex', alignItems: 'center' }}>
                            <FaTrash onClick={handleRemoveFile} style={{ marginLeft: '10px', color: '#059855', cursor: 'pointer', fontSize: '20px' }} title="Remove file" />
                        </div>
                    )}
                </div>

                {fileData.length > 0 && (
    <div>
        <table>
            <thead>
                <tr>
                    <th style={{color: '#059855'}}>First Name</th>
                    <th style={{color: '#059855'}}>Last Name</th>
                    <th style={{color: '#059855'}}>Phone Number</th>
                    <th style={{color: '#059855'}}>Email</th>
                    <th style={{color: '#059855'}}>ID</th>
                    <th style={{color: '#059855'}}>Status</th>
                </tr>
            </thead>
            <tbody>
                {fileData.map((staff, index) => (
                    <tr key={index} style={{ boxShadow: staff.error ? '0 0 10px red' : 'none' }}>
                        <td>
                            <input 
                                type="text" 
                                value={staff.Fname} 
                                onChange={(e) => handleInputChange(index, 'Fname', e.target.value)}
                                style={{ borderColor: staff.error ? 'red' : '#059855' }}
                            />
                        </td>
                        <td>
                            <input 
                                type="text" 
                                value={staff.Lname} 
                                onChange={(e) => handleInputChange(index, 'Lname', e.target.value)}
                                style={{ borderColor: staff.error ? 'red' : '#059855' }}
                            />
                        </td>
                        <td>
                            <input 
                                type="text" 
                                value={staff.PhoneNumber} 
                                onChange={(e) => handleInputChange(index, 'PhoneNumber', e.target.value)}
                                style={{ borderColor: staff.error ? 'red' : '#059855' }}
                            />
                        </td>
                        <td>
                            <input 
                                type="email" 
                                value={staff.Email} 
                                onChange={(e) => handleInputChange(index, 'Email', e.target.value)}
                                style={{ borderColor: staff.error ? 'red' : '#059855' }}
                            />
                        </td>
                        <td>
                            <input 
                                type="text" 
                                value={staff.ID} 
                                onChange={(e) => handleInputChange(index, 'ID', e.target.value)}
                            />
                        </td>
                        <td 
                        style={{textAlign:'center'}}>
                            {staff.error ? 'Not Valid' : 'Valid'}
                        </td>
                    </tr>
                ))}
            </tbody>
        </table>
        <button onClick={handleBatchUpload} className={s.editBtn} style={{ marginBottom: "10px" }}>
            Validate Staff Data
        </button>
        <button onClick={handleAddStaff} className={s.editBtn} style={{ marginBottom: "10px" }}>
            Add Staff
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
                        className="custom-modal"
                        closeIcon={
                            <span className="custom-modal-close-icon">
                                ×
                            </span>
                        }
                    >
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
                            <img src={popupImage} alt="Popup" style={{ width: '20%', marginBottom: '16px' }} />
                        </div>
                    </Modal>
                )}
            </div>
        </div>
    );
};

export default GDTAddStaffBatch;
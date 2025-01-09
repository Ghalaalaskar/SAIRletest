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

const GDTAddStaffBatch = () => {
    const [fileData, setFileData] = useState([]);
    const [popupVisible, setPopupVisible] = useState(false);
    const [popupMessage, setPopupMessage] = useState('');
    const [popupImage, setPopupImage] = useState('');
    const [fileName, setFileName] = useState('');
    const navigate = useNavigate();

    const handleBatchUpload = async (staffArray) => {
        const errorList = [];

        for (const staff of staffArray) {
            const { Fname, Lname, PhoneNumber, Email, ID } = staff;

            if (!Fname || !Lname || !PhoneNumber || !Email || !ID) {
                errorList.push({ staff, message: 'All fields are required.' });
                continue;
            }

            const phoneValidation = validatePhoneNumber(PhoneNumber);
            if (phoneValidation) {
                errorList.push({ staff, message: `Error adding ${Fname} ${Lname}: ${phoneValidation}` });
                continue;
            }

            const emailValidation = validateEmail(Email);
            if (emailValidation) {
                errorList.push({ staff, message: `Error adding ${Fname} ${Lname}: ${emailValidation}` });
                continue;
            }

            const staffIDValidation = validateStaffID(ID);
            if (staffIDValidation) {
                errorList.push({ staff, message: `Error adding ${Fname} ${Lname}: ${staffIDValidation}` });
                continue;
            }   

            const uniqueValidationResult = await checkUniqueness(PhoneNumber, Email, ID);
            if (!uniqueValidationResult.isUnique) {
                errorList.push({ staff, message: `Error adding ${Fname} ${Lname}: ${uniqueValidationResult.message}` });
                continue;
            }

            try {
                const password = generateRandomPassword();
                await createUserWithEmailAndPassword(auth, Email, password);
                await addDoc(collection(db, 'GDT'), {
                    Fname,
                    Lname,
                    GDTEmail: Email,
                    PhoneNumber,
                    ID,
                    isAdmin: false,
                    isDefaultPassword: true,
                });
                sendEmail(Email, `${Fname} ${Lname}`, password);
            } catch (error) {
                let errorMessage = error.message || "Failed to create user.";
                errorList.push({ staff, message: `Error adding ${Fname} ${Lname}: ${errorMessage}` });
            }
        }

        handleBatchUploadResults(errorList);
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
            return { isUnique: false, message: "Email already exists." };
        }

        const staffIDSnapshot = await getDocs(staffIDQuery);
        if (!staffIDSnapshot.empty) {
            return { isUnique: false, message: "Staff ID already exists." };
        }

        return { isUnique: true, message: "" };
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
        };
        reader.readAsBinaryString(file);
    };

    const handleRemoveFile = () => {
        setFileName('');
        document.getElementById('fileInput').value = '';
        setFileData([]);
    };

    const handleClosePopup = () => {
        setPopupVisible(false);
    };

    return (
        <div>
            <Header active="gdtstafflist" />
            <div className={s.container}>
                <h2 className='title'>Add Staff as Batch</h2>
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
                        <button onClick={() => handleBatchUpload(fileData)} className={s.editBtn} style={{ marginBottom: "10px" }}>
                            Add All Staff from File
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
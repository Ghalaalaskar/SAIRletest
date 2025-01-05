import React, { useState } from 'react';
import { db } from '../../firebase';
import { collection, addDoc } from 'firebase/firestore';
import { Modal } from 'antd';
import { FaTrash } from 'react-icons/fa'; 
import * as XLSX from 'xlsx';
import Header from './GDTHeader';
import s from "../../css/Profile.module.css";
import successImage from '../../images/Sucess.png';
import errorImage from '../../images/Error.png';

const GDTAddStaff = () => {
    const [manualStaff, setManualStaff] = useState({
        Fname: '',
        Lname: '',
        PhoneNumber: '+966',
        Email: '',
        StaffID: '',
    });
    
    const [fileData, setFileData] = useState([]);
    const [validationMessages, setValidationMessages] = useState({});
    const [popupVisible, setPopupVisible] = useState(false);
    const [popupMessage, setPopupMessage] = useState('');
    const [popupImage, setPopupImage] = useState('');
    const [fileName, setFileName] = useState('');

    const handleInputChange = (e) => {
        const { name, value } = e.target;

        // For PhoneNumber, ensure it starts with +966 and doesn't allow 0 after +966
        if (name === 'PhoneNumber') {
            if (value.startsWith('+966')) {
                // Prevent entering '0' immediately after +966
                if (value === '+9660') {
                    return; // Do not update state if it's exactly +9660
                }
                setManualStaff({ ...manualStaff, PhoneNumber: value });
            } else {
                setManualStaff({ ...manualStaff, PhoneNumber: '+966' + value.replace(/\+966/g, '') });
            }
        } else {
            setManualStaff({ ...manualStaff, [name]: value });
        }

        // Validate the input in real-time
        const error = validateInput(name, value);
        setValidationMessages((prevMessages) => ({
            ...prevMessages,
            [name]: error,
        }));
    };

    const validateInput = (name, value) => {
        switch (name) {
            case 'Fname':
                return value.trim() === '' ? 'First name is required.' : '';
            case 'Lname':
                return value.trim() === '' ? 'Last name is required.' : '';
            case 'PhoneNumber':
                return validatePhoneNumber(value);
            case 'Email':
                return validateEmail(value);
            case 'StaffID':
                return validateStaffID(value);
            default:
                return '';
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
        const staffIDRegex = /^\d{10}$/; // Must be exactly 10 digits
        return staffIDRegex.test(StaffID) ? null : 'Staff ID must be 10 digits.';
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        let isValid = true;
        let newValidationMessages = {};

        const { Fname, Lname, PhoneNumber, Email, StaffID } = manualStaff;

        if (!Fname) {
            newValidationMessages.Fname = 'Please enter staff first name.';
            isValid = false;
        }

        if (!Lname) {
            newValidationMessages.Lname = 'Please enter staff last name.';
            isValid = false;
        }

        if (!PhoneNumber || PhoneNumber === '+966') {
            newValidationMessages.PhoneNumber = 'Please enter staff phone number.';
            isValid = false;
        } else {
            const phoneValidation = validatePhoneNumber(PhoneNumber);
            if (phoneValidation) {
                newValidationMessages.PhoneNumber = phoneValidation;
                isValid = false;
            }
        }

        if (!Email) {
            newValidationMessages.Email = 'Please enter Email.';
            isValid = false;
        } else {
            const emailValidation = validateEmail(Email);
            if (emailValidation) {
                newValidationMessages.Email = emailValidation;
                isValid = false;
            }
        }

        const staffIDValidation = validateStaffID(StaffID);
        if (staffIDValidation) {
            newValidationMessages.StaffID = staffIDValidation;
            isValid = false;
        }

        setValidationMessages(newValidationMessages);

        if (isValid) {
            try {
                await addDoc(collection(db, 'GDT'), {
                    Fname,
                    Lname,
                    GDTEmail: Email,
                    PhoneNumber,
                    StaffID,
                    isAdmin: false,
                    isDefaultPassword: true,
                });
                setPopupMessage("Staff added successfully!");
                setPopupVisible(true);
                setPopupImage(successImage);
                setManualStaff({ Fname: '', Lname: '', PhoneNumber: '+966', Email: '', StaffID: '' });
            } catch (error) {
                console.error('Error adding staff:', error);
                setPopupMessage("Error adding staff.");
                setPopupVisible(true);
                setPopupImage(successImage);
            }
        }
    };

    const handleBatchUpload = async (staffArray) => {
        const errorList = [];

        for (const staff of staffArray) {
            const { Fname, Lname, PhoneNumber, Email, StaffID } = staff;

            // Validate fields
            if (!Fname || !Lname || !PhoneNumber || !Email || !StaffID) {
                errorList.push({ staff, message: 'All fields are required.' });
                continue;
            }

            const phoneValidation = validatePhoneNumber(PhoneNumber);
            if (phoneValidation) {
                errorList.push({ staff, message: phoneValidation });
                continue;
            }

            const emailValidation = validateEmail(Email);
            if (emailValidation) {
                errorList.push({ staff, message: emailValidation });
                continue;
            }

            const staffIDValidation = validateStaffID(StaffID);
            if (staffIDValidation) {
                errorList.push({ staff, message: staffIDValidation });
                continue;
            }

            try {
                await addDoc(collection(db, 'GDT'), {
                    Fname,
                    Lname,
                    GDTEmail: Email,
                    PhoneNumber,
                    StaffID,
                    isAdmin: false,
                    isDefaultPassword: true,
                });
            } catch (error) {
                errorList.push({ staff, message: 'Error adding staff.' });
            }
        }

        if (errorList.length > 0) {
            setPopupMessage("Some staff could not be added. Check the errors.");
            setPopupVisible(true);
            console.error("Errors during batch addition:", errorList);
        } else {
            setPopupMessage("All staff added successfully!");
            setPopupVisible(true);
        }
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
                <h2 className={s.title}>Add Staff</h2>
                <p>You can add staff as a batch file:</p>
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

                {fileData.length === 0 ? (
                    <form onSubmit={handleSubmit} className={s.form}>
                        <div className={s.formRow}>
                            <div>
                                <label>First Name</label>
                                <input type="text" name="Fname" value={manualStaff.Fname} onChange={handleInputChange} className={s.inputField} />
                                {validationMessages.Fname && <p className={s.valdationMessage}>{validationMessages.Fname}</p>}
                            </div>
                            <div>
                                <label>Last Name</label>
                                <input type="text" name="Lname" value={manualStaff.Lname} onChange={handleInputChange} className={s.inputField} />
                                {validationMessages.Lname && <p className={s.valdationMessage}>{validationMessages.Lname}</p>}
                            </div>
                        </div>
                        <div className={s.formRow}>
                            <div>
                                <label>Phone Number</label>
                                <input name="PhoneNumber" value={manualStaff.PhoneNumber} onChange={handleInputChange} className={s.inputField} />
                                {validationMessages.PhoneNumber && <p className={s.valdationMessage}>{validationMessages.PhoneNumber}</p>}
                            </div>
                            <div>
                                <label>Email</label>
                                <input name="Email" value={manualStaff.Email} onChange={handleInputChange} className={s.inputField} />
                                {validationMessages.Email && <p className={s.valdationMessage}>{validationMessages.Email}</p>}
                            </div>
                        </div>
                        <div className={s.formRow}>
                            <div>
                                <label>Staff ID</label>
                                <input type="text" name="StaffID" value={manualStaff.StaffID} onChange={handleInputChange} className={s.inputField} />
                                {validationMessages.StaffID && <p className={s.valdationMessage}>{validationMessages.StaffID}</p>}
                            </div>
                        </div>
                        <div>
                            <button type="submit" className={s.editBtn}>Add Staff</button>
                        </div>
                    </form>
                ) : (
                    <div>
                        <button onClick={() => handleBatchUpload(fileData)} className={s.editBtn}>
                            Add All Staff from File
                        </button>
                    </div>
                )}

                {popupVisible && (
                     <Modal
                        title={null} // No title for this image notification
                        visible={popupVisible}
                        onCancel={handleClosePopup}
                        footer={<p style={{ textAlign:'center'}}>{popupMessage}</p>}
                        style={{ top: '38%' }} // Center the modal vertically
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
//check uniquness
//send the email by js
//timer for pop up and take to staff list
//check the batch
export default GDTAddStaff;
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
import { FaCheck, FaTimes } from 'react-icons/fa';

const GDTAddStaffBatch = () => {
const [fileData, setFileData] = useState([]);
const [popupVisible, setPopupVisible] = useState(false);
const [popupMessage, setPopupMessage] = useState('');
const [popupImage, setPopupImage] = useState('');
const [fileName, setFileName] = useState('');
const navigate = useNavigate();
const [isButtonDisabled, setIsButtonDisabled] = useState(true);


const handleInputChange = async (index, field, value) => {
    const updatedData = [...fileData];
    updatedData[index][field] = value;

    // Validate the updated staff member
    await validateStaffMember(updatedData[index], index);


    // Check for duplicates and update error states
    checkForDuplicatesAndUpdateErrors(updatedData);

    // Update the state with the new data
    setFileData(updatedData);

    // Check if any staff member has errors
    const hasErrors = updatedData.some(staff => Object.values(staff.errors).some(error => error));
    setIsButtonDisabled(hasErrors); // Update button state based on errors

       // Call handleBatchUpload to validate all fields
       await handleData(updatedData);
};


const handleData = async () => {
    const tempData = [...fileData];
    const errorList = [];

    for (let index = 0; index < tempData.length; index++) {
        const staff = tempData[index];
        const { Fname, Lname, PhoneNumber, Email, ID } = staff;

        // Validate required fields
        staff.errors = {
            Fname: !Fname,
            Lname: !Lname,
            PhoneNumber: !PhoneNumber,
            Email: !Email,
            ID: !ID,
        };

        // Collect error messages
        if (!Fname) errorList.push({ staff, message: 'First name is required.' });
        if (!Lname) errorList.push({ staff, message: 'Last name is required.' });
        if (!PhoneNumber) errorList.push({ staff, message: 'Phone number is required.' });
        if (!Email) errorList.push({ staff, message: 'Email is required.' });
        if (!ID) errorList.push({ staff, message: 'Staff ID is required.' });

        // Validate individual fields
        if (validatePhoneNumber(PhoneNumber)) {
            staff.errors.PhoneNumber = true;
            setIsButtonDisabled(staff.errors.PhoneNumber); // Update button state based on errors
            //errorList.push({ staff, message: `Invalid phone number.` });
        }
        if (validateEmail(Email)) {
            staff.errors.Email = true;
            setIsButtonDisabled(staff.errors.Email); // Update button state based on errors
            //errorList.push({ staff, message: `Invalid email.` });
        }
        if (validateStaffID(ID)) {
            staff.errors.ID = true;
            setIsButtonDisabled(staff.errors.ID); // Update button state based on errors
            //errorList.push({ staff, message: `Invalid staff ID.` });
        }
    }

    setFileData(tempData); // Update state with validation errors
    validateAllFields(); // Call to validate all fields

    // Show success or error popup
    if (errorList.length > 0) {
        handleBatchUploadResults(errorList);
    } else {
        //setPopupMessage("All fields are correct!");
        //setPopupImage(successImage);
        //setPopupVisible(true);
    }
};

const validateAllFields = async (updatedData) => {
    if (!Array.isArray(updatedData)) {
        console.error("updatedData is not an array:", updatedData);
        return;
    }

    let hasErrors = false;

    for (let i = 0; i < updatedData.length; i++) {
        const staff = updatedData[i];

        // Ensure staff is defined and is an object
        if (!staff || typeof staff !== 'object') {
            console.error(`Staff data at index ${i} is invalid:`, staff);
            hasErrors = true;
            continue;
        }

        const isValid = await validateStaffMember(staff, i);
        if (!isValid) {
            hasErrors = true;
        }
    }

    // Check for duplicates after validating all fields
    checkForDuplicatesAndUpdateErrors(updatedData);

    // Re-evaluate errors after checking for duplicates
    updatedData.forEach(staff => {
        if (Object.values(staff.errors).some(error => error)) {
            hasErrors = true;
        }
    });

    setIsButtonDisabled(hasErrors); // Update button state based on errors
    setFileData(updatedData); // Update state to reflect changes in errors

    // Check for duplicates after validating all fields
    checkForDuplicatesAndUpdateErrors(updatedData);
};

const validateStaffMember = async (staff, index) => {
    const { Fname, Lname, PhoneNumber, Email, ID } = staff;

    // Reset errors for the specific staff member
    staff.errors = {
        Fname: !Fname,
        Lname: !Lname,
        PhoneNumber: !PhoneNumber,
        Email: !Email,
        ID: !ID,
    };

    let isValid = true;

    // Validate required fields
    if (!Fname) {
        staff.errors.Fname = true;
        isValid = false;
    }
    if (!Lname) {
        staff.errors.Lname = true;
        isValid = false;
    }
    if (!PhoneNumber) {
        staff.errors.PhoneNumber = true;
        isValid = false;
    }
    if (!Email) {
        staff.errors.Email = true;
        isValid = false;
    }
    if (!ID) {
        staff.errors.ID = true;
        isValid = false;
    }

    // Validate uniqueness
    const uniqueValidationResult = await checkUniqueness(PhoneNumber, Email, ID);
    if (!uniqueValidationResult.isUnique) {
        if (uniqueValidationResult.message.includes("Phone number")) {
            staff.errors.PhoneNumber = true;
            isValid = false;
        }
        if (uniqueValidationResult.message.includes("Email")) {
            staff.errors.Email = true;
            isValid = false;
        }
        if (uniqueValidationResult.message.includes("Staff ID")) {
            staff.errors.ID = true;
            isValid = false;
        }
    }

    setFileData(prevData => {
        const updatedData = [...prevData];
        updatedData[index] = { ...staff }; // Update staff with errors
        return updatedData;
    });

    return isValid; // Return the validity of the staff member
};

const checkForDuplicatesAndUpdateErrors = (updatedData) => {
    const phoneNumbers = {};
    const emails = {};
    const ids = {};

    updatedData.forEach((staff, index) => {
        if (staff.PhoneNumber) {
            if (phoneNumbers[staff.PhoneNumber]) {
                phoneNumbers[staff.PhoneNumber].push(index);
            } else {
                phoneNumbers[staff.PhoneNumber] = [index];
            }
        }
        if (staff.Email) {
            if (emails[staff.Email]) {
                emails[staff.Email].push(index);
            } else {
                emails[staff.Email] = [index];
            }
        }
        if (staff.ID) {
            if (ids[staff.ID]) {
                ids[staff.ID].push(index);
            } else {
                ids[staff.ID] = [index];
            }
        }
    });

    // Reset all error states before applying new validation
    updatedData.forEach(staff => {
        staff.errors.PhoneNumber = false;
        staff.errors.Email = false;
        staff.errors.ID = false;
    });

    // Update error states based on duplicates
    for (const phone in phoneNumbers) {
        if (phoneNumbers[phone].length > 1) {
            phoneNumbers[phone].forEach(i => {
                updatedData[i].errors.PhoneNumber = true;
            });
        }
    }

    for (const email in emails) {
        if (emails[email].length > 1) {
            emails[email].forEach(i => {
                updatedData[i].errors.Email = true;
            });
        }
    }

    for (const id in ids) {
        if (ids[id].length > 1) {
            ids[id].forEach(i => {
                updatedData[i].errors.ID = true;
            });
        }
    }

    setFileData([...updatedData]); // Update the state with marked errors
};


const handleBatchUpload = async () => {
    const tempData = [...fileData];
    const errorList = [];

    for (let index = 0; index < tempData.length; index++) {
        const staff = tempData[index];
        const { Fname, Lname, PhoneNumber, Email, ID } = staff;

        // Validate required fields
        staff.errors = {
            Fname: !Fname,
            Lname: !Lname,
            PhoneNumber: !PhoneNumber,
            Email: !Email,
            ID: !ID,
        };

        // Collect error messages
        if (!Fname) errorList.push({ staff, message: 'First name is required.' });
        if (!Lname) errorList.push({ staff, message: 'Last name is required.' });
        if (!PhoneNumber) errorList.push({ staff, message: 'Phone number is required.' });
        if (!Email) errorList.push({ staff, message: 'Email is required.' });
        if (!ID) errorList.push({ staff, message: 'Staff ID is required.' });

        // Validate individual fields
        if (validatePhoneNumber(PhoneNumber)) {
            staff.errors.PhoneNumber = true;
            errorList.push({ staff, message: `Invalid phone number.` });
        }
        if (validateEmail(Email)) {
            staff.errors.Email = true;
            errorList.push({ staff, message: `Invalid email.` });
        }
        if (validateStaffID(ID)) {
            staff.errors.ID = true;
            errorList.push({ staff, message: `Invalid staff ID.` });
        }
    }

    setFileData(tempData); // Update state with validation errors
    validateAllFields(); // Call to validate all fields

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
    const emailSnapshot = await getDocs(emailQuery);
    const staffIDSnapshot = await getDocs(staffIDQuery);

    // Debugging outputs
    console.log(`Checking uniqueness: Phone: ${phone}, Email: ${email}, Staff ID: ${staffID}`);
    console.log(`Phone exists: ${!phoneSnapshot.empty}, Email exists: ${!emailSnapshot.empty}, Staff ID exists: ${!staffIDSnapshot.empty}`);

    if (!phoneSnapshot.empty) {
        return { isUnique: false, message: "Phone number already exists." };
    }

    if (!emailSnapshot.empty) {
        return { isUnique: false, message: "Email already exists." };
    }

    if (!staffIDSnapshot.empty) {
        return { isUnique: false, message: "Staff ID already exists." };
    }

    return { isUnique: true, message: "" };
};

const handleBatchUploadResults = (errorList) => {
    if (errorList.length > 0) {
        const errorMessages = errorList.map(err => err.message).join('\n');
        setPopupMessage(`${errorMessages}`);
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

        // Initialize errors for each staff member
        const validatedData = jsonData.map((staff) => ({
            ...staff,
            errors: {
                Fname: false,
                Lname: false,
                PhoneNumber: false,
                Email: false,
                ID: false,
            },
        }));

        setFileData(validatedData);
        validateAllFields(validatedData); // Validate after setting data
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

const handleRefresh = () => {
    handleBatchUpload(); // Re-validate data
};

const handleAddStaff = async () => {
    for (let staff of fileData) {
        if (!staff.error) {
            await addStaffToDatabase(staff);
        }
    }
    setPopupMessage("Staff added successfully!");
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
    <div >
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
<tr key={index}>
    <td>
        <input 
            type="text" 
            value={staff.Fname || ''}
            onChange={(e) => handleInputChange(index, 'Fname', e.target.value)}
            style={{ 
                borderColor: staff.errors.Fname ? 'red' : '#059855'
            }}
        />
    </td>
    <td>
        <input 
            type="text" 
            value={staff.Lname || ''}
            onChange={(e) => handleInputChange(index, 'Lname', e.target.value)}
            style={{ 
                borderColor: staff.errors.Lname ? 'red' : '#059855'
            }}
        />
    </td>
    <td>
    <input 
        type="text" 
        value={staff.PhoneNumber || ''}
        onChange={(e) => handleInputChange(index, 'PhoneNumber', e.target.value)}
        style={{ 
            borderColor: staff.errors.PhoneNumber ? 'red' : '#059855'
        }}
    />
</td>
<td>
    <input 
        type="email" 
        value={staff.Email || ''}
        onChange={(e) => handleInputChange(index, 'Email', e.target.value)}
        style={{ 
            borderColor: staff.errors.Email ? 'red' : '#059855'
        }}
    />
</td>
<td>
    <input 
        type="text" 
        value={staff.ID || ''}
        onChange={(e) => handleInputChange(index, 'ID', e.target.value)}
        style={{ 
            borderColor: staff.errors.ID ? 'red' : '#059855'
        }}
    />
</td>
    <td style={{ textAlign: 'center' }}>
    {staff.errors.Fname || staff.errors.Lname || staff.errors.PhoneNumber || staff.errors.Email || staff.errors.ID ? 
        <FaTimes style={{ color: 'red', marginLeft:'10px', marginTop:'5px' }} title="Not Valid" /> : 
        <FaCheck style={{ color: 'green', marginLeft:'10px', marginTop:'5px'  }} title="Valid" />
    }    </td>
</tr>
))}

</tbody>

</table>

<button onClick={handleBatchUpload} className={s.editBtn} style={{ marginBottom: "10px" }}>

Validate Staff Data

</button>

<button onClick={handleAddStaff} disabled={isButtonDisabled} className={s.editBtn} style={{ marginBottom: "10px", backgroundColor: isButtonDisabled ? 'gray' : '#059855', color: 'white',

cursor: isButtonDisabled ? 'not-allowed' : 'pointer',opacity: isButtonDisabled ? 0.6 : 1, }}>

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
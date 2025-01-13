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
const [errorMessage, setErrorMessage] = useState('');


const handleInputChange = async (index, field, value) => {
    const updatedData = [...fileData];
    updatedData[index][field] = value;

    // Validate the updated staff member
    const isValid = await validateStaffMember(updatedData[index], index, updatedData);
    
    // Update the state
    setFileData(updatedData);

    // Check if any staff member has errors
    const hasErrors = updatedData.some(staff => Object.values(staff.errors).some(error => error));
    setIsButtonDisabled(hasErrors); // Update button state based on errors

        // Update error message
        if (hasErrors) {
            setErrorMessage("Please fix the errors in the table highlighted with red borders.");
        } else {
            setErrorMessage(''); // Clear the error message if no errors
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

        // Pass updatedData as allStaff to validateStaffMember
        const isValid = await validateStaffMember(staff, i, updatedData);
        if (!isValid) {
            hasErrors = true;
        }
    }

    setIsButtonDisabled(hasErrors); // Update button state based on errors
    setFileData(updatedData); // Update state to reflect changes in errors
    // Set error message if errors are present
    setErrorMessage(hasErrors ? "Please fix the errors in the table highlighted with red borders." : '');
};

const validateStaffMember = async (staff, index, allStaff) => {
    const { 'First name': Fname, 'Last name': Lname, 'Mobile Phone Number': PhoneNumber, Email, 'Staff ID': ID } = staff;

    // Reset errors for the specific staff member
    staff.errors = {
        Fname: !Fname,
        Lname: !Lname,
        PhoneNumber: false,
        Email: false,
        ID: false,
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

    // Validate formats
    if (PhoneNumber && validatePhoneNumber(PhoneNumber)) {
        staff.errors.PhoneNumber = true;
        isValid = false;
    }
    if (Email && validateEmail(Email)) {
        staff.errors.Email = true;
        isValid = false;
    }
    if (ID && validateStaffID(ID)) {
        staff.errors.ID = true;
        isValid = false;
    }

    // Validate uniqueness against the DB
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

    // Validate uniqueness within the file
    const duplicates = allStaff.filter((s, i) => 
        i !== index && 
    (s['Phone Number'] === PhoneNumber || s.Email === Email || s['Staff ID'] === ID));
    if (duplicates.length > 0) {
        duplicates.forEach(dup => {
            if (dup['Mobile Phone Number'] === PhoneNumber) staff.errors.PhoneNumber = true;
            if (dup.Email === Email) staff.errors.Email = true;
            if (dup['Staff ID'] === ID) staff.errors.ID = true;
        });
        isValid = false;
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
        checkForDuplicatesAndUpdateErrors(validatedData); // Check for duplicates

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


const handleAddStaff = async () => {
    // Check if there are any errors before proceeding
    const hasErrors = fileData.some(staff => Object.values(staff.errors).some(error => error));
    if (hasErrors) {
        setPopupMessage("Please fix the errors before adding staff.");
        setPopupImage(errorImage);
        setPopupVisible(true);
        return; // Prevent adding staff if there are errors
    }

    for (let staff of fileData) {
        await addStaffToDatabase(staff);
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
            <p>
  To download the staff batch template, which must follow exactly the format to add the staff correctly, <a href={templateFile} download style={{ cursor: 'pointer', color: '#059855', textDecoration: 'underline' }}>click here</a>.
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
    {/* Add error message display here */}
                {errorMessage && (
                    <p style={{ color: 'red', marginBottom:'10px'}}>{errorMessage} <br/></p>
                )}
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
                value={staff['First name'] || ''}
                onChange={(e) => handleInputChange(index, 'First name', e.target.value)}
                style={{ 
                    borderColor: staff.errors.Fname ? 'red' : '#059855',
                    boxShadow: staff.errors.Fname ? '0 0 5px red' : 'none',
                    outline: 'none',
                    transition: 'border-color 0.3s, box-shadow 0.3s'
                }}
            />
        </td>
        <td>
            <input 
                type="text" 
                value={staff['Last name'] || ''}
                onChange={(e) => handleInputChange(index, 'Last name', e.target.value)}
                style={{ 
                    borderColor: staff.errors.Lname ? 'red' : '#059855',
                    boxShadow: staff.errors.Lname ? '0 0 5px red' : 'none', // Corrected this line
                    outline: 'none',
                    transition: 'border-color 0.3s, box-shadow 0.3s'
                }}
            />
        </td>
        <td>
            <input 
                type="text" 
                value={staff['Mobile Phone Number'] || ''}
                onChange={(e) => handleInputChange(index, 'Mobile Phone Number', e.target.value)}
                style={{ 
                    borderColor: staff.errors.PhoneNumber ? 'red' : '#059855',
                    boxShadow: staff.errors.PhoneNumber ? '0 0 5px red' : 'none', // Corrected this line
                    outline: 'none',
                    transition: 'border-color 0.3s, box-shadow 0.3s'
                }}
            />
        </td>
        <td>
            <input 
                type="email" 
                value={staff.Email || ''}
                onChange={(e) => handleInputChange(index, 'Email', e.target.value)}
                style={{ 
                    borderColor: staff.errors.Email ? 'red' : '#059855',
                    boxShadow: staff.errors.Email ? '0 0 5px red' : 'none', // Corrected this line
                    outline: 'none',
                    transition: 'border-color 0.3s, box-shadow 0.3s'
                }}
            />
        </td>
        <td>
            <input 
                type="text" 
                value={staff['Staff ID'] || ''}
                onChange={(e) => handleInputChange(index, 'Staff ID', e.target.value)}
                style={{ 
                    borderColor: staff.errors.ID ? 'red' : '#059855',
                    boxShadow: staff.errors.ID ? '0 0 5px red' : 'none', // Corrected this line
                    outline: 'none',
                    transition: 'border-color 0.3s, box-shadow 0.3s'
                }}
            />
        </td>
        <td style={{ textAlign: 'center' }}>
            {staff.errors.Fname || staff.errors.Lname || staff.errors.PhoneNumber || staff.errors.Email || staff.errors.ID ? 
                <FaTimes style={{ color: 'red', marginLeft:'10px', marginTop:'5px' }} title="Not Valid" /> : 
                <FaCheck style={{ color: 'green', marginLeft:'10px', marginTop:'5px' }} title="Valid" />
            }
        </td>
    </tr>
))}

</tbody>

</table>


<button onClick={handleAddStaff} disabled={isButtonDisabled} className={s.editBtn} style={{ marginBottom: "10px", backgroundColor: isButtonDisabled ? 'gray' : '#059855', color: 'white',

cursor: isButtonDisabled ? 'not-allowed' : 'pointer',opacity: isButtonDisabled ? 0.6 : 1, }}>

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
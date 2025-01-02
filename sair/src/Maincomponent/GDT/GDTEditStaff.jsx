import React, { useEffect, useState } from 'react';
import { db, auth } from '../../firebase';
import { useNavigate } from 'react-router-dom';
import {
  collection, doc, onSnapshot, deleteDoc, query, where, getDoc
} from 'firebase/firestore';
import successImage from '../../images/Sucess.png';
import errorImage from '../../images/Error.png';
import { SearchOutlined, UsergroupAddOutlined } from '@ant-design/icons';
import { Button, Table, Modal } from 'antd';
import Header from './GDTHeader';
import '../../css/CustomModal.css';
import s from "../../css/DriverList.module.css";
import { useParams } from 'react-router-dom';

const GDTEditStaff = () => {
  const { staffId } = useParams(); //from the URL 

  return (
    <div>
      <h1>Edit for Staff ID: {staffId}</h1>
    </div>
  );
};

export default GDTEditStaff;
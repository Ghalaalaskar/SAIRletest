import { DownOutlined, UserOutlined } from '@ant-design/icons';
import { Dropdown, Menu, Modal, Button } from 'antd';
import { Link, useNavigate } from 'react-router-dom';
import SAIRLogo from '../images/SAIRlogo.png';
import { auth, db } from '../firebase';
import { useEffect, useState } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import s from '../css/Header.module.css';

const Header = ({ active }) => {
  const navigate = useNavigate();
  const [currentEmployerCompanyName, setCurrentEmployerCompanyName] = useState('');
  const [modalVisible, setModalVisible] = useState(false);

  const showModal = () => {
    setModalVisible(true);
  };

  const handleCancel = () => {
    setModalVisible(false);
  };

  const handleLogout = async () => {
    await auth.signOut();
    navigate('/');
    setModalVisible(false);
  };

  const menu = (
    <Menu>
      <Menu.Item key='profile' onClick={() => navigate('/employee-profile')}>
        Profile
      </Menu.Item>
      <Menu.Item key='logout' onClick={showModal} style={{ color: 'red' }}>
        Logout
      </Menu.Item>
    </Menu>
  );

  useEffect(() => {
    const fetchUserName = async () => {
      const employerUID = sessionStorage.getItem('employerUID');
      if (employerUID) {
        try {
          const userDocRef = doc(db, 'Employer', employerUID);
          const docSnap = await getDoc(userDocRef);
          if (docSnap.exists()) {
            const employerData = docSnap.data();
            console.log('Employer Data:', employerData);
            setCurrentEmployerCompanyName(employerData.CompanyName);
          } else {
            console.log('No such document!');
          }
        } catch (error) {
          console.error('Error fetching employer data:', error);
        }
      }
    };

    fetchUserName();
  }, []);

  const navItems = [
    { path: 'employer-home', label: 'Home' },
    { path: 'violations', label: 'Violations List' },
    { path: 'crashes', label: 'Crashes List' },
    { path: 'complaints', label: 'Complaints List' },
    { path: 'driverslist', label: 'Drivers List' },
    { path: 'motorcycleslist', label: 'Motorcycles List' },
  ];

  return (
    <header>
      <nav>
        <Link to={'/employer-home'}>
          <img className={s.logo} src={SAIRLogo} alt='SAIR Logo' />
        </Link>

        <div className={s.navLinks} id='navLinks'>
<ul>
      {navItems.map((item) => (
        <li key={item.path}>
          <Link className={active === item.path ? s.active : ''} to={`/${item.path}`}>
            {item.label}
          </Link>
        </li>
      ))}
    </ul>
        </div>

        <div className={s.logoutButton}>
          <Dropdown overlay={menu} trigger={['click']} style={{ fontSize: '15px', zIndex: 999999 }}>
            <Link
              to={(e) => e.preventDefault()}
              style={{ display: 'flex', alignItems: 'center', color: 'black', fontSize: '17px' }}
              onMouseEnter={(e) => (e.currentTarget.style.color = '#059855')}
              onMouseLeave={(e) => (e.currentTarget.style.color = 'black')}
            >
              <UserOutlined style={{ marginRight: 10 }} />
              Hello {currentEmployerCompanyName || 'Guest'}
              <DownOutlined style={{ marginLeft: 15 }} />
            </Link>
          </Dropdown>
        </div>
      </nav>

      {/* Logout Confirmation Modal */}
      <Modal
        title="Confirm Logout"
        visible={modalVisible}
        onCancel={handleCancel}
        centered
        style={{ top: '1%' }}
        footer={[
          <Button key="cancel" onClick={handleCancel}>
            Cancel
          </Button>,
          <Button key="logout" onClick={handleLogout} style={{ backgroundColor: 'red', color: 'white' }}>
            Logout
          </Button>,
        ]}
      >
        <p>Are you sure you want to log out?</p>
      </Modal>
    </header>
  );
};

export default Header;
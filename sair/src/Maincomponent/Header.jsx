import { DownOutlined, UserOutlined, BellOutlined } from '@ant-design/icons';
import { Dropdown, Menu, Modal, Button } from 'antd';
import { Link, useNavigate } from 'react-router-dom';
import SAIRLogo from '../images/SAIRlogo.png';
import { auth, db } from '../firebase';
import { useEffect, useState } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import s from '../css/Header.module.css';
import { useContext } from 'react';
import { ShortCompanyNameContext } from '../ShortCompanyNameContext';
import '../css/CustomModal.css';

const Header = ({ active }) => {
  const { shortCompanyName , setShortCompanyName} = useContext(ShortCompanyNameContext);
  const navigate = useNavigate();
  const [modalVisible, setModalVisible] = useState(false);

  useEffect(() => {
    const fetchShortCompanyName = async () => {
      if (!shortCompanyName) { // Only fetch if it's not set
        const employerUID = sessionStorage.getItem('employerUID');
        if (employerUID) {
          try {
            const userDocRef = doc(db, 'Employer', employerUID);
            const docSnap = await getDoc(userDocRef);
            if (docSnap.exists()) {
              const data = docSnap.data();
              setShortCompanyName(data.ShortCompanyName || '');
            }
          } catch (error) {
            console.error('Error fetching short company name:', error);
          }
        }
      }
    };

    fetchShortCompanyName();
  }, [shortCompanyName, setShortCompanyName]);

  const showModal = () => {
    setModalVisible(true);
  };

  const handleCancel = () => {
    setModalVisible(false);
  };

  // const handleLogout = async () => {
  //   await auth.signOut();
  //   sessionStorage.removeItem('ShortCompanyName'); // Clear sessionStorage
  //   navigate('/');
  //   setModalVisible(false);
  // };
  const handleLogout = async () => {
    try {
      await auth.signOut(); // Sign out the user
      // Clear all session-specific data
      sessionStorage.removeItem('ShortCompanyName');
      sessionStorage.removeItem('employerUID');
      window.dispatchEvent(new Event('storage')); // Notify other components
      // Navigate to the login page
      navigate('/');
    } catch (error) {
      console.error('Error during logout:', error);
    } finally {
      setModalVisible(false); // Close the logout confirmation modal
    }
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
  // for notification
  const notificationMenu = (
    <Menu style={{ width: '200px' }}>
      <Menu.Item key='notification1'>Crash detected<br/>Id:8884747</Menu.Item>
      <Menu.Item key='notification2'>Notification 2</Menu.Item>
      <Menu.Item key='notification3'>Notification 3</Menu.Item>
    </Menu>
  );
  
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
              Hello {shortCompanyName || ''}
              <DownOutlined style={{ marginLeft: 15 }} />
            </Link>
          </Dropdown>

          <Dropdown overlay={notificationMenu} trigger={['click']}>
    <BellOutlined style={{ fontSize: '24px', marginLeft: '15px', cursor: 'pointer'}} 
    onMouseEnter={(e) => (e.currentTarget.style.color = '#059855')}
    onMouseLeave={(e) => (e.currentTarget.style.color = 'black')}/>
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
        className="custom-modal"
        closeIcon={
          <span className="custom-modal-close-icon">
            ×
          </span>
        }
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
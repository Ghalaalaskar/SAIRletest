import { DownOutlined, UserOutlined, BellOutlined } from '@ant-design/icons';
import { Dropdown, Menu, Modal, Button, Badge } from 'antd';
import { Link, useNavigate } from 'react-router-dom';
import SAIRLogo from '../../images/SAIRlogo.png';
import { auth, db } from '../../firebase';
import { useEffect, useState } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import s from '../../css/Header.module.css';
import '../../css/CustomModal.css';
import styles from "../../css/BadgeStyles.module.css";
import'../../FirstNameContext';
import { useContext } from 'react';
const GDTHeader = ({ active }) => {
  const { FirstName , setFirstName} = useContext(FirstNameContext);
  const navigate = useNavigate();
  const [modalVisible, setModalVisible] = useState(false);
  const [name, setName] = useState('');
  const [isAdmin, setIsAdmin] = useState(false); // New state for isAdmin
  const [hasNewCrashes, setHasNewCrashes] = useState(() => {
    const saved = localStorage.getItem("hasNewCrashes");
    return saved ? JSON.parse(saved) : false;
  });
  ////For the header
  useEffect(() => {
    const fetchFirstName = async () => {
      if (!FirstName) { // Only fetch if it's not set
        const GDTUID = sessionStorage.getItem('gdtUID');
        if (GDTUID) {
          try {
            const userDocRef = doc(db, 'GDT', GDTUID);
            const docSnap = await getDoc(userDocRef);
            if (docSnap.exists()) {
              const data = docSnap.data();
              setFirstName(data.Fname || '');
            }
          } catch (error) {
            console.error('Error fetching short company name:', error);
          }
        }
      }
    };

    fetchFirstName();
  }, [FirstName, setFirstName]);
  
  useEffect(() => {
    const fetchName = async () => {
      const GDTUID = sessionStorage.getItem('gdtUID');
      console.log('GDTUID:', GDTUID);
      if (GDTUID) {
        try {
          const userDocRef = doc(db, 'GDT', GDTUID);
          const docSnap = await getDoc(userDocRef);
          if (docSnap.exists()) {
            const data = docSnap.data();
            console.log('Fetched data:', data);
            setName(data.Fname || '');
            setIsAdmin(data.isAdmin || false); // Fetch and set isAdmin
          } else {
            console.log('No such document!');
          }
        } catch (error) {
          console.error('Error fetching name:', error);
        }
      } else {
        console.log('GDTUID is not set in session storage');
      }
    };
    fetchName();
  }, []);

  const handleLogout = async () => {
    try {
      await auth.signOut();
      sessionStorage.removeItem('gdtUID');
      window.dispatchEvent(new Event('storage'));
      navigate('/');
    } catch (error) {
      console.error('Error during logout:', error);
    } finally {
      setModalVisible(false);
    }
  };

  const notificationMenu = (
    <div
      style={{
        width: '380px',
        height: '400px',
        backgroundColor: '#ffffff',
        borderRadius: '8px',
        padding: '10px',
        boxShadow: '0 4px 8px rgba(0, 0, 0, 0.1)',
        overflowY: 'auto',
      }}
    >
      <h3 style={{ fontSize: '18px', marginBottom: '10px', color: '#333' }}>
        Crash Notifications
      </h3>
      <hr
        style={{
          border: '0',
          borderTop: '1px solid #ddd',
          marginTop: '0',
          marginBottom: '10px',
        }}
      />
    </div>
  );

  const menu = (
    <Menu>
      <Menu.Item key='profile' onClick={() => navigate('/gdtprofile')}>
        Profile
      </Menu.Item>
      <Menu.Item key='logout' onClick={() => setModalVisible(true)} style={{ color: 'red' }}>
        Logout
      </Menu.Item>
    </Menu>
  );

  const navItems = [
    { path: 'gdthome', label: 'Home' },
    { path: 'gdtviolations', label: 'Violations List' },
    { path: 'gdtcrashes', label: 'Crashes List' },
    { path: 'gdtcomplaints', label: 'Complaints List' },
    { path: 'gdtdriverlist', label: 'Drivers List' },
    { path: 'gdtheatmap', label: 'Heat-Map' },
    { path: 'gdtstafflist', label: 'Staff List', adminOnly: true },
  ];

  return (
    <header>
      <nav>
        <Link to={'/gdthome'}>
          <img className={s.logo} src={SAIRLogo} alt='SAIR Logo' />
        </Link>

        <div className={s.navLinks} id='navLinks'>
          <ul>
            {navItems.map((item) => (
              // Only render if not adminOnly or user is admin
              (!item.adminOnly || isAdmin) && (
                <li key={item.path}>
                  <Link className={active === item.path ? s.active : ''} to={`/${item.path}`}>
                    {item.label}
                  </Link>
                </li>
              )
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
              Hello {name || ''}
              <DownOutlined style={{ marginLeft: 15 }} />
            </Link>
          </Dropdown>

          <Dropdown overlay={notificationMenu} trigger={['click']}>
            <Badge dot={hasNewCrashes} className={styles.customBadge}>
              <BellOutlined className={styles.bellIcon}
                onMouseEnter={(e) => (e.currentTarget.style.color = '#059855')}
                onMouseLeave={(e) => (e.currentTarget.style.color = 'black')}
              />
            </Badge>
          </Dropdown>
        </div>
      </nav>

      {/* Logout Confirmation Modal */}
      <Modal
        title="Confirm Logout"
        visible={modalVisible}
        onCancel={() => setModalVisible(false)}
        centered
        style={{ top: '1%' }}
        className="custom-modal"
        closeIcon={
          <span className="custom-modal-close-icon">
            ×
          </span>
        }
        footer={[
          <Button key="cancel" onClick={() => setModalVisible(false)}>
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

export default GDTHeader;
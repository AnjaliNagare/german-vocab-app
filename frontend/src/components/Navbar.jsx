import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import styles from './Navbar.module.css';

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  if (!user) return null;

  const isActive = (path) => location.pathname === path;

  return (
    <nav className={styles.nav}>
      <div className={styles.inner}>
        <Link to="/dashboard" className={styles.logo}>
          Wortify
        </Link>
        <div className={styles.links}>
          <Link to="/dashboard" className={isActive('/dashboard') ? styles.active : ''}>Dashboard</Link>
          <Link to="/review" className={isActive('/review') ? styles.active : ''}>Review</Link>
          <Link to="/words" className={isActive('/words') ? styles.active : ''}>My Words</Link>
          <Link to="/add" className={isActive('/add') ? styles.active : ''}>+ Add Word</Link>
        </div>
        <div className={styles.right}>
          <span className={styles.email}>{user.email}</span>
          <button onClick={handleLogout} className={styles.logoutBtn}>Logout</button>
        </div>
      </div>
    </nav>
  );
}
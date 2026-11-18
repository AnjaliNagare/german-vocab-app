import { NavLink, Link, useNavigate } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import styles from './Navbar.module.css';

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  if (!user) return null;

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const linkClass = ({ isActive }) =>
    isActive ? `${styles.link} ${styles.active}` : styles.link;

  return (
    <nav className={styles.nav}>
      <div className={styles.inner}>
        <Link to="/dashboard" className={styles.logo}>
          <svg className={styles.mark} width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
  <rect y="0" width="18" height="6" fill="#1F2430" />
  <rect y="6" width="18" height="6" fill="#C8443F" />
  <rect y="12" width="18" height="6" fill="#E8A317" />
</svg>
          VocabApp
        </Link>

        <div className={styles.links}>
          <NavLink to="/dashboard" className={linkClass}>Dashboard</NavLink>
          <NavLink to="/review" className={linkClass}>Review</NavLink>
          <NavLink to="/words" className={linkClass}>My words</NavLink>
        </div>

        <div className={styles.right}>
          <Link to="/add" className={styles.addBtn}>
            <Plus size={16} /> <span>Add word</span>
          </Link>
          <span className={styles.avatar} title={user.email}>
            {user.email.charAt(0).toUpperCase()}
          </span>
          <button onClick={handleLogout} className={styles.logoutBtn}>Logout</button>
        </div>
      </div>
    </nav>
  );
}
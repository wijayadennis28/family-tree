import { useContext } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext';

export default function Header() {
  const { user, logout, token } = useContext(AuthContext);
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout(token);
    navigate('/login');
  };

  const initials = user?.name
    ? user.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
    : '?';

  return (
    <header className="app-header">
      <Link to="/" className="logo">
        <span className="logo-icon">🌳</span>
        Family Tree
      </Link>

      <nav>
        <NavLink to="/" end>Dashboard</NavLink>
        <NavLink to="/members">Members</NavLink>
        <NavLink to="/events">Events</NavLink>
        <NavLink to="/gallery">Gallery</NavLink>
        {(user?.role === 'Super Admin' || user?.role === 'Family Admin') && (
          <NavLink to="/admin/users">Admin</NavLink>
        )}
      </nav>

      <div className="header-right">
        {user && (
          <div className="header-user">
            <div className="header-avatar">{initials}</div>
            <span>{user.name}</span>
          </div>
        )}
        <button className="btn-logout" onClick={handleLogout}>
          Sign out
        </button>
      </div>
    </header>
  );
}

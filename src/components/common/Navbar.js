import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import './Navbar.css';

const Navbar = () => {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem('user'));

  const handleLogout = () => {
    localStorage.removeItem('user');
    navigate('/');
  };

  return (
    <nav className="navbar">
      <Link to="/" className="navbar-brand">SnackUp</Link>
      <div className="navbar-links">
        {user ? (
          <>
            <Link to="/dashboard" className="nav-link">Dashboard</Link>
            {user.isAdmin && <Link to="/admin" className="nav-link">Admin</Link>}
            <button onClick={handleLogout} className="nav-link btn-link">Logout</button>
          </>
        ) : (
          <>
            <Link to="/login" className="nav-link">Login</Link>
          </>
        )}
      </div>
    </nav>
  );
};

export default Navbar; 
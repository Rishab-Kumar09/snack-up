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

  const getNavLinks = () => {
    if (!user) {
      return (
        <Link to="/login" className="nav-link">Login</Link>
      );
    }

    if (user.isSuperAdmin) {
      return (
        <>
          <Link to="/superadmin" className="nav-link">Super Admin Dashboard</Link>
          <button onClick={handleLogout} className="nav-link btn-link">Logout</button>
        </>
      );
    }

    if (user.isAdmin) {
      return (
        <>
          <Link to="/admin" className="nav-link">Admin Dashboard</Link>
          <button onClick={handleLogout} className="nav-link btn-link">Logout</button>
        </>
      );
    }

    return (
      <>
        <Link to="/dashboard" className="nav-link">Dashboard</Link>
        <button onClick={handleLogout} className="nav-link btn-link">Logout</button>
      </>
    );
  };

  return (
    <nav className="navbar">
      <Link to="/" className="navbar-brand">SnackUp</Link>
      <div className="navbar-links">
        {getNavLinks()}
      </div>
    </nav>
  );
};

export default Navbar; 
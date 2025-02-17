import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Navbar from './components/common/Navbar';
import UserDashboard from './pages/UserDashboard';
import AdminDashboard from './pages/AdminDashboard';
import SuperAdminDashboard from './pages/SuperAdminDashboard';
import Login from './pages/Login';
import Home from './pages/Home';
import './App.css';

// Protected Route Component
const ProtectedRoute = ({ children }) => {
  const user = JSON.parse(localStorage.getItem('user'));
  
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Redirect super admin to their dashboard
  if (user.isSuperAdmin) {
    return <Navigate to="/superadmin" replace />;
  }

  // Redirect admin to their dashboard
  if (user.isAdmin) {
    return <Navigate to="/admin" replace />;
  }

  return children;
};

// Admin Route Component
const AdminRoute = ({ children }) => {
  const user = JSON.parse(localStorage.getItem('user'));
  
  if (!user || (!user.isAdmin && !user.isSuperAdmin)) {
    return <Navigate to="/login" replace />;
  }

  // Redirect super admin to their dashboard
  if (user.isSuperAdmin) {
    return <Navigate to="/superadmin" replace />;
  }

  return children;
};

// Super Admin Route Component
const SuperAdminRoute = ({ children }) => {
  const user = JSON.parse(localStorage.getItem('user'));
  
  if (!user || !user.isSuperAdmin) {
    return <Navigate to="/login" replace />;
  }

  return children;
};

function App() {
  return (
    <Router>
      <div className="app">
        <Navbar />
        <main className="main-content">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/login" element={<Login />} />
            <Route 
              path="/dashboard" 
              element={
                <ProtectedRoute>
                  <UserDashboard />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/admin" 
              element={
                <AdminRoute>
                  <AdminDashboard />
                </AdminRoute>
              } 
            />
            <Route 
              path="/superadmin" 
              element={
                <SuperAdminRoute>
                  <SuperAdminDashboard />
                </SuperAdminRoute>
              } 
            />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;

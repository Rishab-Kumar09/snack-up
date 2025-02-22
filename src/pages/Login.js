import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import config from '../config';
import './Login.css';

const Login = () => {
  const navigate = useNavigate();
  const [isLoginMode, setIsLoginMode] = useState(true);
  const [companies, setCompanies] = useState([]);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    name: '',
    role: 'customer',
    companyName: '',
    companyId: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Fetch companies list when component mounts
    const fetchCompanies = async () => {
      try {
        const response = await fetch(`${config.apiBaseUrl}/companies`);
        if (response.ok) {
          const data = await response.json();
          setCompanies(data);
        }
      } catch (err) {
        console.error('Failed to fetch companies:', err);
        setError('Failed to load companies. Please try again later.');
      }
    };

    if (!isLoginMode) {
      fetchCompanies();
    }
  }, [isLoginMode]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    // Clear error when user starts typing
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const endpoint = isLoginMode ? config.authEndpoints.login : config.authEndpoints.register;
      const response = await fetch(`${config.apiBaseUrl}${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Authentication failed');
      }

      // Store user data in localStorage
      const userData = {
        ...data.user,
        companyId: data.user.companyId ? data.user.companyId.toString() : null
      };
      localStorage.setItem('user', JSON.stringify(userData));
      
      // Navigate based on user role
      if (userData.isSuperAdmin) {
        navigate('/superadmin');
      } else if (userData.isAdmin) {
        navigate('/admin');
      } else {
        navigate('/dashboard');
      }
    } catch (err) {
      console.error('Auth error:', err);
      setError(err.message || 'An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const toggleMode = () => {
    setIsLoginMode(!isLoginMode);
    setError('');
    setFormData({
      name: '',
      email: '',
      password: '',
      role: 'customer',
      companyName: '',
      companyId: ''
    });
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <h2>Welcome to SnackUp</h2>
        <p className="login-subtitle">
          {isLoginMode 
            ? 'Sign in to manage your snack preferences' 
            : 'Create an account to start ordering snacks'}
        </p>
        
        <form onSubmit={handleSubmit} className="login-form">
          {error && (
            <div className="alert alert-error" role="alert">
              {error}
            </div>
          )}
          
          {!isLoginMode && (
            <div className="form-group">
              <label htmlFor="name">Name</label>
              <input
                type="text"
                id="name"
                name="name"
                className="form-control"
                value={formData.name}
                onChange={handleChange}
                required={!isLoginMode}
                disabled={loading}
                placeholder="Enter your full name"
              />
            </div>
          )}

          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input
              type="email"
              id="email"
              name="email"
              className="form-control"
              value={formData.email}
              onChange={handleChange}
              required
              disabled={loading}
              placeholder="Enter your email"
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              type="password"
              id="password"
              name="password"
              className="form-control"
              value={formData.password}
              onChange={handleChange}
              required
              disabled={loading}
              placeholder="Enter your password"
              minLength="6"
            />
          </div>

          {!isLoginMode && (
            <>
              <div className="form-group">
                <label htmlFor="role">Account Type</label>
                <select
                  id="role"
                  name="role"
                  className="form-control"
                  value={formData.role}
                  onChange={handleChange}
                  disabled={loading}
                >
                  <option value="customer">Employee</option>
                  <option value="admin">Company Admin</option>
                </select>
              </div>

              {formData.role === 'admin' ? (
                <div className="form-group">
                  <label htmlFor="companyName">Company Name</label>
                  <input
                    type="text"
                    id="companyName"
                    name="companyName"
                    className="form-control"
                    value={formData.companyName}
                    onChange={handleChange}
                    required
                    disabled={loading}
                    placeholder="Enter your company name"
                  />
                </div>
              ) : (
                <div className="form-group">
                  <label htmlFor="companyId">Select Company</label>
                  <select
                    id="companyId"
                    name="companyId"
                    className="form-control"
                    value={formData.companyId}
                    onChange={handleChange}
                    required
                    disabled={loading}
                  >
                    <option value="">Select a company</option>
                    {companies.map(company => (
                      <option key={company.id} value={company.id}>
                        {company.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </>
          )}

          <button 
            type="submit" 
            className="btn btn-primary login-button"
            disabled={loading}
          >
            {loading ? 'Please wait...' : (isLoginMode ? 'Sign In' : 'Sign Up')}
          </button>
        </form>

        <div className="login-options">
          <button 
            onClick={toggleMode} 
            className="btn-link"
            disabled={loading}
          >
            {isLoginMode 
              ? "Don't have an account? Sign up" 
              : "Already have an account? Sign in"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Login; 
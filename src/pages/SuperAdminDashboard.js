import React, { useState, useEffect } from 'react';
import config from '../config';
import './SuperAdminDashboard.css';

const SuperAdminDashboard = () => {
  const [users, setUsers] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('users');
  const [editingUser, setEditingUser] = useState(null);
  const [newPassword, setNewPassword] = useState('');
  const [hiddenUsers, setHiddenUsers] = useState(new Set());
  const [hiddenCompanies, setHiddenCompanies] = useState(new Set());

  const superAdminCredentials = btoa('superadmin@snackup.com:superadmin123');

  useEffect(() => {
    fetchData();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchData = async () => {
    try {
      const headers = {
        'Authorization': `Basic ${superAdminCredentials}`
      };

      const [usersResponse, companiesResponse] = await Promise.all([
        fetch(`${config.apiBaseUrl}/superadmin/users`, { headers }),
        fetch(`${config.apiBaseUrl}/companies`)
      ]);

      if (!usersResponse.ok || !companiesResponse.ok) {
        throw new Error('Failed to fetch data');
      }

      const [usersData, companiesData] = await Promise.all([
        usersResponse.json(),
        companiesResponse.json()
      ]);

      setUsers(usersData);
      setCompanies(companiesData);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteUser = async (userId) => {
    if (!window.confirm('Are you sure you want to delete this user?')) return;

    try {
      const response = await fetch(`${config.apiBaseUrl}/superadmin/users/${userId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Basic ${superAdminCredentials}`
        }
      });

      if (!response.ok) throw new Error('Failed to delete user');
      
      fetchData(); // Refresh data
    } catch (err) {
      setError(err.message);
    }
  };

  const handleDeleteCompany = async (companyId) => {
    if (!window.confirm('Are you sure you want to delete this company? All associated users will also be deleted.')) return;

    try {
      const response = await fetch(`${config.apiBaseUrl}/superadmin/companies/${companyId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Basic ${superAdminCredentials}`
        }
      });

      if (!response.ok) throw new Error('Failed to delete company');
      
      fetchData(); // Refresh data
    } catch (err) {
      setError(err.message);
    }
  };

  const handleUpdatePassword = async (userId) => {
    if (!newPassword) {
      setError('New password is required');
      return;
    }

    try {
      const response = await fetch(`${config.apiBaseUrl}/superadmin/users/${userId}/password`, {
        method: 'PUT',
        headers: {
          'Authorization': `Basic ${superAdminCredentials}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ password: newPassword })
      });

      if (!response.ok) throw new Error('Failed to update password');
      
      setEditingUser(null);
      setNewPassword('');
      fetchData(); // Refresh data
    } catch (err) {
      setError(err.message);
    }
  };

  const toggleUserVisibility = (userId) => {
    setHiddenUsers(prev => {
      const newSet = new Set(prev);
      if (newSet.has(userId)) {
        newSet.delete(userId);
      } else {
        newSet.add(userId);
      }
      return newSet;
    });
  };

  const toggleCompanyVisibility = (companyId) => {
    setHiddenCompanies(prev => {
      const newSet = new Set(prev);
      if (newSet.has(companyId)) {
        newSet.delete(companyId);
      } else {
        newSet.add(companyId);
      }
      return newSet;
    });
  };

  if (loading) return <div className="loading">Loading...</div>;
  if (error) return <div className="alert alert-error">{error}</div>;

  return (
    <div className="super-admin-dashboard">
      <h1>Super Admin Dashboard</h1>
      
      <nav className="dashboard-nav">
        <button 
          className={`tab-button ${activeTab === 'users' ? 'active' : ''}`}
          onClick={() => setActiveTab('users')}
        >
          Users Management
        </button>
        <button 
          className={`tab-button ${activeTab === 'companies' ? 'active' : ''}`}
          onClick={() => setActiveTab('companies')}
        >
          Companies Management
        </button>
      </nav>

      {activeTab === 'users' ? (
        <section className="users-section">
          <h2>All Users</h2>
          <div className="users-grid">
            {users.map(user => !hiddenUsers.has(user.id) && (
              <div key={user.id} className="user-card">
                <div className="user-header">
                  <h3>{user.name}</h3>
                  <div className="header-actions">
                    <button
                      onClick={() => toggleUserVisibility(user.id)}
                      className="btn btn-visibility"
                      title="Hide User"
                    >
                      <span className="visibility-icon">👁️</span>
                      Hide
                    </button>
                    <span className={`role-badge ${user.is_super_admin ? 'super-admin' : user.is_admin ? 'admin' : 'user'}`}>
                      {user.is_super_admin ? 'Super Admin' : user.is_admin ? 'Admin' : 'User'}
                    </span>
                  </div>
                </div>
                
                <div className="user-details">
                  <p><strong>Email:</strong> {user.email}</p>
                  <p><strong>Company:</strong> {user.company_name || 'N/A'}</p>
                  <p><strong>Current Password:</strong> {user.password}</p>
                </div>

                {editingUser === user.id ? (
                  <div className="password-update">
                    <input
                      type="password"
                      placeholder="New Password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="form-control"
                    />
                    <div className="action-buttons">
                      <button 
                        onClick={() => handleUpdatePassword(user.id)}
                        className="btn btn-primary"
                      >
                        Update
                      </button>
                      <button 
                        onClick={() => {
                          setEditingUser(null);
                          setNewPassword('');
                        }}
                        className="btn btn-secondary"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="user-actions">
                    {!user.is_super_admin && (
                      <button 
                        onClick={() => handleDeleteUser(user.id)}
                        className="btn btn-danger"
                      >
                        Delete User
                      </button>
                    )}
                    <button 
                      onClick={() => setEditingUser(user.id)}
                      className="btn btn-primary"
                    >
                      Change Password
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
          {hiddenUsers.size > 0 && (
            <div className="hidden-items-controls">
              <button
                onClick={() => setHiddenUsers(new Set())}
                className="btn btn-secondary"
              >
                Show All Hidden Users ({hiddenUsers.size})
              </button>
            </div>
          )}
        </section>
      ) : (
        <section className="companies-section">
          <h2>All Companies</h2>
          <div className="companies-grid">
            {companies.map(company => !hiddenCompanies.has(company.id) && (
              <div key={company.id} className="company-card">
                <div className="company-header">
                  <h3>{company.name}</h3>
                  <button
                    onClick={() => toggleCompanyVisibility(company.id)}
                    className="btn btn-visibility"
                    title="Hide Company"
                  >
                    <span className="visibility-icon">👁️</span>
                    Hide
                  </button>
                </div>
                <div className="company-users">
                  <h4>Users:</h4>
                  <ul>
                    {users
                      .filter(user => user.company_id === company.id)
                      .map(user => (
                        <li key={user.id}>
                          {user.name} ({user.is_admin ? 'Admin' : 'Employee'})
                        </li>
                      ))}
                  </ul>
                </div>
                <div className="company-actions">
                  <button 
                    onClick={() => handleDeleteCompany(company.id)}
                    className="btn btn-danger"
                  >
                    Delete Company
                  </button>
                </div>
              </div>
            ))}
          </div>
          {hiddenCompanies.size > 0 && (
            <div className="hidden-items-controls">
              <button
                onClick={() => setHiddenCompanies(new Set())}
                className="btn btn-secondary"
              >
                Show All Hidden Companies ({hiddenCompanies.size})
              </button>
            </div>
          )}
        </section>
      )}
    </div>
  );
};

export default SuperAdminDashboard; 
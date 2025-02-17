import React, { useState, useEffect } from 'react';
import config from '../config';
import './AdminDashboard.css';

const AdminDashboard = () => {
  const [snacks, setSnacks] = useState([]);
  const [orders, setOrders] = useState([]);
  const [preferences, setPreferences] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('snacks');
  const [weeklyQuantities, setWeeklyQuantities] = useState({});
  const [dayMultiplier, setDayMultiplier] = useState(7);
  const [selectedSnack, setSelectedSnack] = useState(null);
  const [editMode, setEditMode] = useState(false);
  const [editedSnack, setEditedSnack] = useState(null);
  const [newSnack, setNewSnack] = useState({
    name: '',
    description: '',
    price: '',
    ingredients: ''
  });
  const [companyUsers, setCompanyUsers] = useState([]);
  const [newAdminData, setNewAdminData] = useState({
    name: '',
    email: '',
    password: ''
  });

  const user = JSON.parse(localStorage.getItem('user'));

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [snacksResponse, preferencesResponse, ordersResponse, usersResponse] = await Promise.all([
        fetch(`${config.apiBaseUrl}/snacks`),
        fetch(`${config.apiBaseUrl}/preferences/company/${user.companyId}`),
        fetch(`${config.apiBaseUrl}/orders/company/${user.companyId}`),
        fetch(`${config.apiBaseUrl}/auth/company-users/${user.companyId}`)
      ]);

      if (!snacksResponse.ok) throw new Error('Failed to fetch snacks');
      if (!preferencesResponse.ok) throw new Error('Failed to fetch preferences');
      if (!ordersResponse.ok) throw new Error('Failed to fetch orders');
      if (!usersResponse.ok) throw new Error('Failed to fetch company users');

      const [snacksData, preferencesData, ordersData, usersData] = await Promise.all([
        snacksResponse.json(),
        preferencesResponse.json(),
        ordersResponse.json(),
        usersResponse.json()
      ]);

      setSnacks(snacksData);
      setPreferences(preferencesData);
      setOrders(ordersData);
      setCompanyUsers(usersData);

      // Calculate initial quantities
      const initialWeeklyQuantities = {};
      snacksData.forEach(snack => {
        const snackPrefs = preferencesData.filter(p => p.snack_id === snack.id);
        const dailyTotal = snackPrefs.reduce((sum, p) => sum + p.daily_quantity, 0);
        initialWeeklyQuantities[snack.id] = dailyTotal * dayMultiplier;
      });
      setWeeklyQuantities(initialWeeklyQuantities);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = async (orderId, newStatus) => {
    try {
      const response = await fetch(`${config.apiBaseUrl}/orders/${orderId}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!response.ok) throw new Error('Failed to update order status');
      
      // Refresh orders after status update
      fetchData();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setNewSnack(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch(`${config.apiBaseUrl}/snacks`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newSnack),
      });

      if (!response.ok) throw new Error('Failed to add snack');
      
      // Reset form and refresh snacks list
      setNewSnack({
        name: '',
        description: '',
        price: '',
        ingredients: ''
      });
      fetchData();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleWeeklyQuantityUpdate = (snackId, quantity) => {
    setWeeklyQuantities(prev => ({
      ...prev,
      [snackId]: parseInt(quantity) || 0
    }));
  };

  const calculateTotalCost = () => {
    return snacks.reduce((total, snack) => {
      const quantity = weeklyQuantities[snack.id] || 0;
      return total + (quantity * snack.price);
    }, 0);
  };

  const handleDayMultiplierChange = (newMultiplier) => {
    const multiplier = parseInt(newMultiplier) || 1;
    setDayMultiplier(multiplier);
    
    // Update all quantities with new multiplier
    const updatedQuantities = {};
    snacks.forEach(snack => {
      const snackPrefs = preferences.filter(p => p.snack_id === snack.id);
      const dailyTotal = snackPrefs.reduce((sum, p) => sum + p.daily_quantity, 0);
      updatedQuantities[snack.id] = dailyTotal * multiplier;
    });
    setWeeklyQuantities(updatedQuantities);
  };

  const renderDietaryBadges = (snack) => {
    return (
      <div className="dietary-badges">
        {snack.isVegan && (
          <span className="badge badge-vegan" title="Contains no animal products including dairy, eggs, honey, or gelatin">
            Vegan
          </span>
        )}
        {!snack.isVegan && snack.isVegetarian && (
          <span className="badge badge-veg" title="Contains no meat but may contain dairy, eggs, or honey">
            Vegetarian
          </span>
        )}
        {!snack.isVegetarian && (
          <span className="badge badge-non-veg" title="Contains meat, fish, or gelatin">
            Non-Vegetarian
          </span>
        )}
        {!snack.isVegan && snack.isDairyFree && (
          <span className="badge badge-dairy-free" title="Contains no milk products but may contain eggs, honey, or other animal products">
            Dairy Free
          </span>
        )}
      </div>
    );
  };

  const handleSnackClick = (snack) => {
    setSelectedSnack(snack);
  };

  const closeModal = () => {
    setSelectedSnack(null);
  };

  const handleEditClick = (snack, e) => {
    e.stopPropagation();
    setEditMode(true);
    setEditedSnack({
      id: snack.id,
      name: snack.name,
      description: snack.description,
      price: snack.price,
      ingredients: snack.ingredients
    });
    setSelectedSnack(snack);
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch(`${config.apiBaseUrl}/snacks/${editedSnack.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(editedSnack),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to update snack');
      }

      // Refresh the snacks list
      fetchData();
      setEditMode(false);
      setEditedSnack(null);
      setSelectedSnack(null);
    } catch (err) {
      setError(err.message);
    }
  };

  const handleEditChange = (e) => {
    const { name, value } = e.target;
    setEditedSnack(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handlePlaceWeeklyOrder = async () => {
    try {
      // Create order items from weekly quantities
      const orderItems = snacks
        .filter(snack => weeklyQuantities[snack.id] > 0)
        .map(snack => ({
          snackId: snack.id,
          quantity: weeklyQuantities[snack.id]
        }));

      if (orderItems.length === 0) {
        setError('Please add quantities for at least one snack');
        return;
      }

      const response = await fetch(`${config.apiBaseUrl}/orders`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: user.id,
          items: orderItems
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create order');
      }

      // Refresh orders data
      fetchData();
      setActiveTab('orders');
    } catch (err) {
      setError(err.message);
    }
  };

  const handleNewAdminSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch(`${config.apiBaseUrl}/auth/add-admin`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...newAdminData,
          companyId: user.companyId
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to add admin');
      }

      // Reset form and refresh data
      setNewAdminData({ name: '', email: '', password: '' });
      fetchData();
      setError('');
    } catch (err) {
      setError(err.message);
    }
  };

  const handleRemoveAdmin = async (userId) => {
    if (!window.confirm('Are you sure you want to remove this admin?')) return;

    try {
      const response = await fetch(`${config.apiBaseUrl}/auth/remove-admin/${userId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          companyId: user.companyId
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to remove admin');
      }

      fetchData();
    } catch (err) {
      setError(err.message);
    }
  };

  if (loading) return <div className="loading">Loading...</div>;
  if (error) return <div className="alert alert-error">{error}</div>;

  const getStatusColor = (status) => {
    const colors = {
      pending: 'var(--warning)',
      processing: 'var(--info)',
      out_for_delivery: 'var(--primary)',
      delivered: 'var(--success)',
      cancelled: 'var(--danger)'
    };
    return colors[status] || 'var(--text-color)';
  };

  return (
    <div className="admin-dashboard">
      <nav className="dashboard-nav">
        <button 
          className={`tab-button ${activeTab === 'snacks' ? 'active' : ''}`}
          onClick={() => setActiveTab('snacks')}
        >
          Snacks
        </button>
        <button 
          className={`tab-button ${activeTab === 'orders' ? 'active' : ''}`}
          onClick={() => setActiveTab('orders')}
        >
          Orders
        </button>
        <button 
          className={`tab-button ${activeTab === 'weekly' ? 'active' : ''}`}
          onClick={() => setActiveTab('weekly')}
        >
          Weekly Bulk Order
        </button>
        <button 
          className={`tab-button ${activeTab === 'admins' ? 'active' : ''}`}
          onClick={() => setActiveTab('admins')}
        >
          Manage Admins
        </button>
      </nav>

      {activeTab === 'snacks' ? (
        <>
          <section className="add-snack-section">
            <h2>Add New Snack</h2>
            <form onSubmit={handleSubmit} className="add-snack-form">
              <div className="form-group">
                <label htmlFor="name">Name</label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  value={newSnack.name}
                  onChange={handleInputChange}
                  className="form-control"
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="description">Description</label>
                <textarea
                  id="description"
                  name="description"
                  value={newSnack.description}
                  onChange={handleInputChange}
                  className="form-control"
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="price">Price ($)</label>
                <input
                  type="number"
                  id="price"
                  name="price"
                  value={newSnack.price}
                  onChange={handleInputChange}
                  className="form-control"
                  step="0.01"
                  min="0"
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="ingredients">Ingredients (comma-separated)</label>
                <textarea
                  id="ingredients"
                  name="ingredients"
                  value={newSnack.ingredients}
                  onChange={handleInputChange}
                  className="form-control"
                  placeholder="Enter ingredients separated by commas"
                  required
                />
                <small className="form-text">
                  List all ingredients to automatically categorize as vegetarian and dairy-free
                </small>
              </div>

              <button type="submit" className="btn btn-primary">
                Add Snack
              </button>
            </form>
          </section>

          <section className="inventory-section">
            <h2>Current Inventory</h2>
            <div className="inventory-grid">
              {snacks.map(snack => {
                const snackPreferences = preferences.filter(p => p.snack_id === snack.id);
                const averageRating = snackPreferences.length > 0
                  ? (snackPreferences.reduce((sum, p) => sum + p.rating, 0) / snackPreferences.length).toFixed(1)
                  : 'No ratings';
                const totalDailyQuantity = snackPreferences.reduce((sum, p) => sum + p.daily_quantity, 0);

                return (
                  <div key={snack.id} className="inventory-card">
                    <div className="inventory-header">
                      <h3>{snack.name}</h3>
                      <button className="btn btn-secondary btn-sm" onClick={(e) => handleEditClick(snack, e)}>
                        Edit
                      </button>
                    </div>
                    <p className="inventory-description">{snack.description}</p>
                    {renderDietaryBadges(snack)}
                    <div className="inventory-details">
                      <span className="price">${snack.price}</span>
                      <span className="rating">★ {averageRating}</span>
                    </div>
                    <div className="preference-summary">
                      <h4>Employee Preferences</h4>
                      <p>Total Daily Quantity: {totalDailyQuantity}</p>
                      <div className="employee-preferences">
                        {snackPreferences.map(pref => (
                          <div key={pref.user_id} className="employee-preference">
                            <span>{pref.user_name}</span>
                            <span>Quantity: {pref.daily_quantity}</span>
                            <span>Rating: {'★'.repeat(pref.rating)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        </>
      ) : activeTab === 'orders' ? (
        <section className="orders-section">
          <h2>Order Management</h2>
          <div className="orders-grid">
            {orders.map(order => (
              <div key={order.order_id} className="order-card">
                <div className="order-header">
                  <h3>Order #{order.order_id}</h3>
                  <span className={`status-badge ${order.status}`}>
                    {order.status.replace(/_/g, ' ')}
                  </span>
                </div>
                <div className="order-details">
                  <p>Ordered by: {order.user_name}</p>
                  <p>Email: {order.user_email}</p>
                  <p>Date: {new Date(order.created_at).toLocaleString()}</p>
                  <p className="total-cost">Total Cost: ${order.items.reduce((sum, item) => sum + (item.price * item.quantity), 0).toFixed(2)}</p>
                </div>
                <div className="order-items">
                  <h4>Items</h4>
                  <ul>
                    {order.items.map((item, index) => (
                      <li key={index}>
                        {item.quantity}x {item.snack_name} (${item.price} each)
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="order-actions">
                  <select
                    className="status-select"
                    value={order.status}
                    onChange={(e) => handleStatusUpdate(order.order_id, e.target.value)}
                  >
                    <option value="pending">Pending</option>
                    <option value="processing">Processing</option>
                    <option value="out_for_delivery">Out for Delivery</option>
                    <option value="delivered">Delivered</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </div>
              </div>
            ))}
          </div>
        </section>
      ) : activeTab === 'weekly' ? (
        <section className="weekly-order-section">
          <h2>Bulk Order Calculator</h2>
          <div className="calculator-controls">
            <div className="day-multiplier">
              <label htmlFor="dayMultiplier">Number of Days:</label>
              <input
                type="number"
                id="dayMultiplier"
                min="1"
                value={dayMultiplier}
                onChange={(e) => handleDayMultiplierChange(e.target.value)}
                className="form-control"
              />
            </div>
          </div>
          <div className="weekly-order-grid">
            {snacks.map(snack => {
              const snackPreferences = preferences.filter(p => p.snack_id === snack.id);
              const dailyTotal = snackPreferences.reduce((sum, p) => sum + p.daily_quantity, 0);
              const totalQuantity = weeklyQuantities[snack.id] || dailyTotal * dayMultiplier;
              const totalCost = totalQuantity * snack.price;

              return (
                <div key={snack.id} className="weekly-order-card">
                  <h3>{snack.name}</h3>
                  <div className="weekly-order-details">
                    <div className="quantity-info">
                      <p>Daily Employee Requests: {dailyTotal}</p>
                      <p>Suggested {dayMultiplier}-Day Quantity: {dailyTotal * dayMultiplier}</p>
                      <div className="quantity-adjust">
                        <label>Adjust {dayMultiplier}-Day Quantity:</label>
                        <input
                          type="number"
                          min="0"
                          value={totalQuantity}
                          onChange={(e) => handleWeeklyQuantityUpdate(snack.id, e.target.value)}
                          className="quantity-input"
                        />
                      </div>
                    </div>
                    <div className="cost-info">
                      <p>Price per unit: ${snack.price}</p>
                      <p className="total-cost">Total Cost: ${totalCost.toFixed(2)}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="order-summary">
            <h3>Order Summary</h3>
            <p className="period">For {dayMultiplier} days</p>
            <p className="grand-total">Total Cost: ${calculateTotalCost().toFixed(2)}</p>
            <button 
              className="btn btn-primary place-order-btn"
              onClick={handlePlaceWeeklyOrder}
            >
              Place Weekly Order
            </button>
          </div>
        </section>
      ) : (
        <section className="admins-section">
          <h2>Manage Company Admins</h2>
          
          <div className="add-admin-form">
            <h3>Add New Admin</h3>
            <form onSubmit={handleNewAdminSubmit}>
              <div className="form-group">
                <label htmlFor="name">Name</label>
                <input
                  type="text"
                  id="name"
                  value={newAdminData.name}
                  onChange={(e) => setNewAdminData(prev => ({ ...prev, name: e.target.value }))}
                  required
                  className="form-control"
                />
              </div>
              
              <div className="form-group">
                <label htmlFor="email">Email</label>
                <input
                  type="email"
                  id="email"
                  value={newAdminData.email}
                  onChange={(e) => setNewAdminData(prev => ({ ...prev, email: e.target.value }))}
                  required
                  className="form-control"
                />
              </div>
              
              <div className="form-group">
                <label htmlFor="password">Password</label>
                <input
                  type="password"
                  id="password"
                  value={newAdminData.password}
                  onChange={(e) => setNewAdminData(prev => ({ ...prev, password: e.target.value }))}
                  required
                  className="form-control"
                />
              </div>
              
              <button type="submit" className="btn btn-primary">Add Admin</button>
            </form>
          </div>

          <div className="current-admins">
            <h3>Current Admins</h3>
            <div className="admins-grid">
              {companyUsers
                .filter(user => user.is_admin)
                .map(admin => (
                  <div key={admin.id} className="admin-card">
                    <div className="admin-info">
                      <h4>{admin.name}</h4>
                      <p>{admin.email}</p>
                    </div>
                    {admin.id !== user.id && (
                      <button
                        onClick={() => handleRemoveAdmin(admin.id)}
                        className="btn btn-danger btn-sm"
                      >
                        Remove Admin
                      </button>
                    )}
                  </div>
                ))}
            </div>
          </div>
        </section>
      )}

      {selectedSnack && (
        <div className="modal-overlay" onClick={() => {
          setSelectedSnack(null);
          setEditMode(false);
          setEditedSnack(null);
        }}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <button className="modal-close" onClick={() => {
              setSelectedSnack(null);
              setEditMode(false);
              setEditedSnack(null);
            }}>&times;</button>
            
            {editMode ? (
              <form onSubmit={handleEditSubmit} className="edit-snack-form">
                <h2>Edit Snack</h2>
                <div className="form-group">
                  <label htmlFor="name">Name</label>
                  <input
                    type="text"
                    id="name"
                    name="name"
                    value={editedSnack.name}
                    onChange={handleEditChange}
                    className="form-control"
                    required
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="description">Description</label>
                  <textarea
                    id="description"
                    name="description"
                    value={editedSnack.description}
                    onChange={handleEditChange}
                    className="form-control"
                    required
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="price">Price ($)</label>
                  <input
                    type="number"
                    id="price"
                    name="price"
                    value={editedSnack.price}
                    onChange={handleEditChange}
                    className="form-control"
                    step="0.01"
                    min="0"
                    required
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="ingredients">Ingredients (comma-separated)</label>
                  <textarea
                    id="ingredients"
                    name="ingredients"
                    value={editedSnack.ingredients}
                    onChange={handleEditChange}
                    className="form-control"
                    required
                  />
                  <small className="form-text">
                    List all ingredients to automatically categorize dietary restrictions
                  </small>
                </div>

                <div className="modal-actions">
                  <button type="submit" className="btn btn-primary">Save Changes</button>
                  <button type="button" className="btn btn-secondary" onClick={() => {
                    setEditMode(false);
                    setEditedSnack(null);
                  }}>Cancel</button>
                </div>
              </form>
            ) : (
              <>
                <h2>{selectedSnack.name}</h2>
                <p className="modal-description">{selectedSnack.description}</p>
                <div className="modal-details">
                  <div className="modal-section">
                    <h3>Dietary Information</h3>
                    {renderDietaryBadges(selectedSnack)}
                  </div>
                  <div className="modal-section">
                    <h3>Ingredients</h3>
                    <p className="ingredients-list">
                      {selectedSnack.ingredients.split(',').map((ingredient, index) => (
                        <span key={index} className="ingredient">{ingredient.trim()}</span>
                      ))}
                    </p>
                  </div>
                  <div className="modal-section">
                    <h3>Price</h3>
                    <p className="modal-price">${selectedSnack.price}</p>
                  </div>
                </div>
                <div className="modal-actions">
                  <button className="btn btn-primary" onClick={(e) => handleEditClick(selectedSnack, e)}>
                    Edit Snack
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard; 
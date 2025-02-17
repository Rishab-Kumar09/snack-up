import React, { useState, useEffect } from 'react';
import config from '../config';
import './AdminDashboard.css';

const AdminDashboard = () => {
  const [snacks, setSnacks] = useState([]);
  const [orders, setOrders] = useState([]);
  const [preferences, setPreferences] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('inventory');
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

  const user = JSON.parse(localStorage.getItem('user'));

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [snacksResponse, preferencesResponse, ordersResponse] = await Promise.all([
        fetch(`${config.apiBaseUrl}/snacks`),
        fetch(`${config.apiBaseUrl}/preferences/company/${user.companyId}`),
        fetch(`${config.apiBaseUrl}/orders/company/${user.companyId}`)
      ]);

      if (!snacksResponse.ok) throw new Error('Failed to fetch snacks');
      if (!preferencesResponse.ok) throw new Error('Failed to fetch preferences');
      if (!ordersResponse.ok) throw new Error('Failed to fetch orders');

      const [snacksData, preferencesData, ordersData] = await Promise.all([
        snacksResponse.json(),
        preferencesResponse.json(),
        ordersResponse.json()
      ]);

      setSnacks(snacksData);
      setPreferences(preferencesData);
      setOrders(ordersData);

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

  if (loading) return <div className="loading">Loading...</div>;
  if (error) return <div className="alert alert-error">{error}</div>;

  const getStatusColor = (status) => {
    const colors = {
      pending: 'var(--warning)',
      out_of_stock: 'var(--danger)',
      processing: 'var(--info)',
      in_delivery: 'var(--primary)',
      delivered: 'var(--success)',
      cancelled: 'var(--danger)'
    };
    return colors[status] || 'var(--text-color)';
  };

  return (
    <div className="admin-dashboard">
      <nav className="dashboard-nav">
        <button 
          className={`tab-button ${activeTab === 'inventory' ? 'active' : ''}`}
          onClick={() => setActiveTab('inventory')}
        >
          Inventory
        </button>
        <button 
          className={`tab-button ${activeTab === 'orders' ? 'active' : ''}`}
          onClick={() => setActiveTab('orders')}
        >
          Orders
        </button>
        <button 
          className={`tab-button ${activeTab === 'analytics' ? 'active' : ''}`}
          onClick={() => setActiveTab('analytics')}
        >
          Analytics
        </button>
        <button 
          className={`tab-button ${activeTab === 'weekly-order' ? 'active' : ''}`}
          onClick={() => setActiveTab('weekly-order')}
        >
          Weekly Bulk Order
        </button>
      </nav>

      {activeTab === 'inventory' ? (
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
                  <span className="status-badge" style={{ backgroundColor: getStatusColor(order.status) }}>
                    {order.status}
                  </span>
                </div>
                <div className="order-details">
                  <p>Ordered by: {order.user_name}</p>
                  <p>Email: {order.user_email}</p>
                  <p>Date: {new Date(order.created_at).toLocaleString()}</p>
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
      ) : activeTab === 'analytics' ? (
        <section className="analytics-section">
          <h2>Snack Analytics</h2>
          <div className="analytics-grid">
            <div className="analytics-card">
              <h3>Top Rated Snacks</h3>
              <div className="analytics-content">
                {snacks.map(snack => {
                  const snackPreferences = preferences.filter(p => p.snack_id === snack.id);
                  const averageRating = snackPreferences.length > 0
                    ? (snackPreferences.reduce((sum, p) => sum + p.rating, 0) / snackPreferences.length)
                    : 0;
                  return {
                    ...snack,
                    averageRating,
                    totalRatings: snackPreferences.length
                  };
                })
                .sort((a, b) => b.averageRating - a.averageRating)
                .slice(0, 5)
                .map(snack => (
                  <div key={snack.id} className="analytics-item">
                    <div className="analytics-item-header">
                      <span className="item-name">{snack.name}</span>
                      <span className="item-rating">★ {snack.averageRating.toFixed(1)}</span>
                    </div>
                    <div className="analytics-item-details">
                      <span>Based on {snack.totalRatings} ratings</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="analytics-card">
              <h3>Most Requested Snacks</h3>
              <div className="analytics-content">
                {snacks.map(snack => {
                  const snackPreferences = preferences.filter(p => p.snack_id === snack.id);
                  const totalDailyQuantity = snackPreferences.reduce((sum, p) => sum + p.daily_quantity, 0);
                  return {
                    ...snack,
                    totalDailyQuantity,
                    totalUsers: snackPreferences.length
                  };
                })
                .sort((a, b) => b.totalDailyQuantity - a.totalDailyQuantity)
                .slice(0, 5)
                .map(snack => (
                  <div key={snack.id} className="analytics-item">
                    <div className="analytics-item-header">
                      <span className="item-name">{snack.name}</span>
                      <span className="item-quantity">{snack.totalDailyQuantity} daily</span>
                    </div>
                    <div className="analytics-item-details">
                      <span>Requested by {snack.totalUsers} employees</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="analytics-card">
              <h3>Cost Analysis</h3>
              <div className="analytics-content">
                {snacks.map(snack => {
                  const snackPreferences = preferences.filter(p => p.snack_id === snack.id);
                  const totalDailyQuantity = snackPreferences.reduce((sum, p) => sum + p.daily_quantity, 0);
                  const dailyCost = totalDailyQuantity * snack.price;
                  return {
                    ...snack,
                    dailyCost,
                    totalDailyQuantity
                  };
                })
                .sort((a, b) => b.dailyCost - a.dailyCost)
                .slice(0, 5)
                .map(snack => (
                  <div key={snack.id} className="analytics-item">
                    <div className="analytics-item-header">
                      <span className="item-name">{snack.name}</span>
                      <span className="item-cost">${snack.dailyCost.toFixed(2)}/day</span>
                    </div>
                    <div className="analytics-item-details">
                      <span>{snack.totalDailyQuantity} units at ${snack.price} each</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="analytics-card">
              <h3>Employee Engagement</h3>
              <div className="analytics-content">
                <div className="analytics-summary">
                  <div className="summary-item">
                    <span className="summary-label">Total Ratings</span>
                    <span className="summary-value">
                      {preferences.length}
                    </span>
                  </div>
                  <div className="summary-item">
                    <span className="summary-label">Average Rating</span>
                    <span className="summary-value">
                      {preferences.length > 0 
                        ? (preferences.reduce((sum, p) => sum + p.rating, 0) / preferences.length).toFixed(1)
                        : 'N/A'
                      }
                    </span>
                  </div>
                  <div className="summary-item">
                    <span className="summary-label">Active Users</span>
                    <span className="summary-value">
                      {new Set(preferences.map(p => p.user_id)).size}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      ) : (
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
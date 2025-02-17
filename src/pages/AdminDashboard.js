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
      const [snacksResponse, ordersResponse, preferencesResponse] = await Promise.all([
        fetch(`${config.apiBaseUrl}/snacks`),
        fetch(`${config.apiBaseUrl}/orders`),
        fetch(`${config.apiBaseUrl}/preferences/company/${user.companyId}`)
      ]);

      if (!snacksResponse.ok) throw new Error('Failed to fetch snacks');
      if (!ordersResponse.ok) throw new Error('Failed to fetch orders');
      if (!preferencesResponse.ok) throw new Error('Failed to fetch preferences');

      const [snacksData, ordersData, preferencesData] = await Promise.all([
        snacksResponse.json(),
        ordersResponse.json(),
        preferencesResponse.json()
      ]);

      setSnacks(snacksData);
      setOrders(ordersData);
      setPreferences(preferencesData);

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
                <label htmlFor="ingredients">Ingredients</label>
                <textarea
                  id="ingredients"
                  name="ingredients"
                  value={newSnack.ingredients}
                  onChange={handleInputChange}
                  className="form-control"
                  required
                />
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
                    <h3>{snack.name}</h3>
                    <p className="inventory-description">{snack.description}</p>
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
              <div key={order.id} className="order-card">
                <div className="order-header">
                  <h3>Order #{order.id}</h3>
                  <span 
                    className="status-badge"
                    style={{ backgroundColor: getStatusColor(order.status) }}
                  >
                    {order.status.replace('_', ' ')}
                  </span>
                </div>
                
                <div className="order-details">
                  <p><strong>Customer:</strong> {order.user_name}</p>
                  <p><strong>Company:</strong> {order.company_name}</p>
                  <p><strong>Date:</strong> {new Date(order.created_at).toLocaleString()}</p>
                  <p><strong>Total Cost:</strong> ${order.total_cost}</p>
                </div>

                <div className="order-items">
                  <h4>Items:</h4>
                  <ul>
                    {order.items.map((item, index) => (
                      <li key={index}>
                        {item.quantity}x {item.name} (${item.price_per_unit} each)
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="order-actions">
                  <select
                    value={order.status}
                    onChange={(e) => handleStatusUpdate(order.id, e.target.value)}
                    className="status-select"
                  >
                    <option value="pending">Pending</option>
                    <option value="out_of_stock">Out of Stock</option>
                    <option value="processing">Processing</option>
                    <option value="in_delivery">In Delivery</option>
                    <option value="delivered">Delivered</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </div>
              </div>
            ))}
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
          </div>
        </section>
      )}
    </div>
  );
};

export default AdminDashboard; 
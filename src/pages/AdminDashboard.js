import React, { useState, useEffect, useMemo } from 'react';
import { fetchWithAuth } from '../utils/api';
import config from '../config';
import './AdminDashboard.css';
import InventoryTracking from '../components/InventoryTracking';
import SnackForm from '../components/SnackForm';
import SnackCard from '../components/SnackCard';

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
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [employeeOrders, setEmployeeOrders] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 6;

  const user = JSON.parse(localStorage.getItem('user'));

  const paginatedSnacks = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return snacks.slice(startIndex, endIndex);
  }, [snacks, currentPage]);

  const totalPages = useMemo(() => Math.ceil(snacks.length / itemsPerPage), [snacks]);

  useEffect(() => {
    fetchData();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchData = async () => {
    try {
      const user = JSON.parse(localStorage.getItem('user'));
      if (!user || !user.companyId) return;

      const [snacksData, ordersData, usersData, preferencesData] = await Promise.all([
        fetchWithAuth('/snacks'),
        fetchWithAuth(`/orders/company/${user.companyId}`),
        fetchWithAuth(`/auth/company-users/${user.companyId}`),
        fetchWithAuth(`/preferences/company/${user.companyId}`)
      ]);

      setSnacks(snacksData);
      setOrders(ordersData);
      setCompanyUsers(usersData);
      setPreferences(preferencesData);

      // Calculate initial quantities based on preferences
      const initialWeeklyQuantities = {};
      snacksData.forEach(snack => {
        // Filter preferences for this snack using snack name since that's what we get from the API
        const snackPrefs = preferencesData.filter(p => p.snack_name === snack.name);
        // Sum up all daily quantities for this snack
        const dailyTotal = snackPrefs.reduce((sum, p) => sum + (p.daily_quantity || 0), 0);
        // Set the weekly quantity
        initialWeeklyQuantities[snack.id] = dailyTotal * dayMultiplier;
      });
      setWeeklyQuantities(initialWeeklyQuantities);
    } catch (error) {
      console.error('Error fetching data:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = async (orderId, newStatus) => {
    try {
      const data = await fetchWithAuth(`/orders/${orderId}/status`, {
        method: 'PUT',
        body: JSON.stringify({ status: newStatus })
      });
      
      // Update the order status in the local state
      setOrders(prevOrders => 
        prevOrders.map(order => 
          order.order_id === orderId 
            ? { ...order, status: data.status }
            : order
        )
      );

      setError('');
    } catch (err) {
      setError(err.message);
      // Revert the select value to the previous status
      const order = orders.find(o => o.order_id === orderId);
      if (order) {
        const select = document.querySelector(`select[data-order-id="${orderId}"]`);
        if (select) {
          select.value = order.status;
        }
      }
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setNewSnack(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (formData) => {
    try {
      const response = await fetchWithAuth('/snacks', {
        method: 'POST',
        body: JSON.stringify(formData)
      });

      setSnacks(prevSnacks => [...prevSnacks, response]);
      alert('Snack added successfully!');
    } catch (error) {
      console.error('Error adding snack:', error);
      alert('Failed to add snack. Please try again.');
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
      const snackPrefs = preferences.filter(p => p.snack_name === snack.name);
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
    setEditMode(false);
  };

  const closeModal = () => {
    setSelectedSnack(null);
    setEditMode(false);
  };

  const handleEditClick = (snack, e) => {
    if (e) {
      e.stopPropagation();
    }
    setEditMode(true);
    setEditedSnack({
      id: snack.id,
      name: snack.name,
      description: snack.description,
      price: snack.price,
      ingredients: snack.ingredients,
      image_data: snack.image_data,
      store_url: snack.store_url,
      detected_store: snack.detected_store
    });
    setSelectedSnack(snack);
  };

  const handleEditSubmit = async (formData) => {
    try {
      await fetchWithAuth(`/snacks/${editedSnack.id}`, {
        method: 'PUT',
        body: JSON.stringify(formData)
      });

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
      // Ensure companyId is a valid UUID
      const companyUUID = user.companyId.toString().length === 36 ? user.companyId : null;
      if (!companyUUID) {
        throw new Error('Invalid company ID format');
      }

      // Create order items from weekly quantities
      const orderItems = snacks
        .filter(snack => weeklyQuantities[snack.id] > 0)
        .map(snack => ({
          snackId: snack.id,
          quantity: weeklyQuantities[snack.id],
          price: snack.price
        }));

      if (orderItems.length === 0) {
        setError('Please add quantities for at least one snack');
        return;
      }

      await fetchWithAuth('/orders', {
        method: 'POST',
        body: JSON.stringify({
          userId: user.id,
          companyId: companyUUID,
          items: orderItems
        })
      });

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
      const response = await fetchWithAuth('/auth/add-admin', {
        method: 'POST',
        body: JSON.stringify({
          ...newAdminData,
          companyId: user.companyId
        })
      });

      setCompanyUsers(prevUsers => [...prevUsers, response.user]);
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
      await fetchWithAuth(`/auth/remove-admin/${userId}`, {
        method: 'PUT',
        body: JSON.stringify({
          companyId: user.companyId
        })
      });

      fetchData();
    } catch (err) {
      setError(err.message);
    }
  };

  const fetchEmployeeOrders = async (userId) => {
    try {
      const data = await fetchWithAuth(`/orders/user/${userId}`);
      setEmployeeOrders(data);
      setSelectedEmployee(companyUsers.find(user => user.id === userId));
    } catch (error) {
      setError(error.message);
    }
  };

  const handleDeleteOrder = async (orderId) => {
    if (!window.confirm('Are you sure you want to delete this order? This action cannot be undone.')) {
      return;
    }

    try {
      await fetchWithAuth(`/orders/${orderId}`, {
        method: 'DELETE'
      });

      // Remove the deleted order from the state
      setOrders(prevOrders => prevOrders.filter(order => order.order_id !== orderId));
    } catch (err) {
      setError('Failed to delete order: ' + err.message);
    }
  };

  const handleToggleAvailability = async (snackId, isAvailable) => {
    try {
      await fetchWithAuth(`/snacks/${snackId}/availability`, {
        method: 'PUT',
        body: JSON.stringify({ isAvailable })
      });

      // Update the snack's availability in the local state
      setSnacks(prevSnacks =>
        prevSnacks.map(snack =>
          snack.id === snackId
            ? { ...snack, is_available: isAvailable }
            : snack
        )
      );
    } catch (error) {
      console.error('Error updating snack availability:', error);
      alert('Failed to update snack availability. Please try again.');
    }
  };

  const handleDeleteSnack = async (snackId) => {
    try {
      await fetchWithAuth(`/snacks/${snackId}`, {
        method: 'DELETE'
      });

      // Remove the snack from the state
      setSnacks(prevSnacks => prevSnacks.filter(snack => snack.id !== snackId));
    } catch (error) {
      console.error('Error deleting snack:', error);
      alert('Failed to delete snack. Please try again.');
    }
  };

  if (loading) return <div className="loading">Loading...</div>;
  if (error) return <div className="alert alert-error">{error}</div>;

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
          className={`tab-button ${activeTab === 'inventory' ? 'active' : ''}`}
          onClick={() => setActiveTab('inventory')}
        >
          Inventory Tracking
        </button>
        <button 
          className={`tab-button ${activeTab === 'employee-orders' ? 'active' : ''}`}
          onClick={() => setActiveTab('employee-orders')}
          data-tab="employee-orders"
        >
          Employee Orders
        </button>
        <button 
          className={`tab-button ${activeTab === 'admins' ? 'active' : ''}`}
          onClick={() => setActiveTab('admins')}
        >
          Manage Admins
        </button>
      </nav>

      {activeTab === 'inventory' ? (
        <InventoryTracking />
      ) : activeTab === 'employee-orders' ? (
        <section className="employee-orders-section">
          <h2>Employee Orders</h2>
          <div className="employee-orders-grid">
            <div className="employees-list">
              <h3>Select Employee</h3>
              <div className="employees-grid">
                {companyUsers.map(user => (
                  <div
                    key={user.id}
                    className={`employee-card ${selectedEmployee?.id === user.id ? 'selected' : ''}`}
                    onClick={() => fetchEmployeeOrders(user.id)}
                  >
                    <h4>{user.name}</h4>
                    <p>{user.email}</p>
                  </div>
                ))}
              </div>
            </div>
            
            {selectedEmployee && (
              <div className="employee-orders">
                <h3>Orders for {selectedEmployee.name}</h3>
                <div className="orders-grid">
                  {employeeOrders.map(order => (
                    <div key={order.order_id} className="order-card">
                      <div className="order-header">
                        <span className={`status-badge ${order.status}`}>
                          {order.status.replace(/_/g, ' ')}
                        </span>
                      </div>
                      <div className="order-details">
                        <p>Date: {new Date(order.created_at).toLocaleString()}</p>
                        <p className="total-cost">
                          Total Cost: ${order.items.reduce((sum, item) => sum + (item.price * item.quantity), 0).toFixed(2)}
                        </p>
                      </div>
                      <div className="order-items">
                        <h4>Items</h4>
                        <ul>
                          {order.items.map((item, index) => (
                            <li key={index}>
                              {item.quantity}x {item.snack_name} (${item.price_per_unit} each)
                            </li>
                          ))}
                        </ul>
                      </div>
                      <div className="order-actions">
                        <select
                          className="status-select"
                          value={order.status}
                          data-order-id={order.order_id}
                          onChange={(e) => handleStatusUpdate(order.order_id, e.target.value)}
                        >
                          <option value="pending">Pending</option>
                          <option value="processing">Processing</option>
                          <option value="out_for_delivery">Out for Delivery</option>
                          <option value="delivered">Delivered</option>
                          <option value="cancelled">Cancelled</option>
                        </select>
                        <button
                          onClick={() => handleDeleteOrder(order.order_id)}
                          className="btn btn-danger btn-sm"
                          title="Delete Order"
                        >
                          Delete Order
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </section>
      ) : activeTab === 'snacks' ? (
        <>
          <section className="add-snack-section">
            <h2>Add New Snack</h2>
            <SnackForm onSubmit={handleSubmit} />
          </section>

          <section className="inventory-section">
            <h2>Current Inventory</h2>
            <div className="inventory-grid">
              {paginatedSnacks.map(snack => (
                <SnackCard
                  key={snack.id}
                  snack={snack}
                  onEdit={handleEditClick}
                  onDelete={handleDeleteSnack}
                  onToggleAvailability={handleToggleAvailability}
                  isAdmin={true}
                />
              ))}
            </div>
            <div className="pagination-controls">
              <button 
                className="pagination-button" 
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
              >
                Previous
              </button>
              <div className="page-numbers">
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(pageNum => (
                  <button
                    key={pageNum}
                    className={`page-number ${pageNum === currentPage ? 'active' : ''}`}
                    onClick={() => setCurrentPage(pageNum)}
                  >
                    {pageNum}
                  </button>
                ))}
              </div>
              <button 
                className="pagination-button"
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
              >
                Next
              </button>
            </div>
          </section>
        </>
      ) : activeTab === 'orders' ? (
        <section className="orders-section">
          <h2>Order Management</h2>
          
          {/* New Orders Section */}
          <div className="orders-category">
            <h3>New Orders {orders.filter(order => order.status === 'pending').length > 0 && 
              <span className="new-orders-badge">
                {orders.filter(order => order.status === 'pending').length}
              </span>}
            </h3>
            <div className="orders-grid">
              {orders
                .filter(order => order.status === 'pending')
                .map(order => (
                  <div key={order.order_id} className="order-card new-order">
                    <div className="order-header">
                      <span className={`status-badge ${order.status}`}>
                        {order.status.replace(/_/g, ' ')}
                      </span>
                    </div>
                    <div className="order-details">
                      <p>Ordered by: {order.user_name}</p>
                      <p>Email: {order.user_email}</p>
                      <p>Date: {new Date(order.created_at).toLocaleString()}</p>
                      <p className="total-cost">Total Cost: ${order.total_cost.toFixed(2)}</p>
                    </div>
                    <div className="order-items">
                      <h4>Items</h4>
                      <ul>
                        {order.items.map((item, index) => (
                          <li key={index}>
                            {item.quantity}x {item.snack_name} (${item.price_per_unit} each)
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div className="order-actions">
                      <select
                        className="status-select"
                        value={order.status}
                        data-order-id={order.order_id}
                        onChange={(e) => handleStatusUpdate(order.order_id, e.target.value)}
                      >
                        <option value="pending">Pending</option>
                        <option value="processing">Processing</option>
                        <option value="out_for_delivery">Out for Delivery</option>
                        <option value="delivered">Delivered</option>
                        <option value="cancelled">Cancelled</option>
                      </select>
                      <button
                        onClick={() => handleDeleteOrder(order.order_id)}
                        className="btn btn-danger btn-sm"
                        title="Delete Order"
                      >
                        Delete Order
                      </button>
                    </div>
                  </div>
                ))}
            </div>
          </div>

          {/* Previous Orders Section */}
          <div className="orders-category">
            <h3>Previous Orders</h3>
            <div className="orders-grid">
              {orders
                .filter(order => order.status !== 'pending')
                .map(order => (
                  <div key={order.order_id} className="order-card">
                    <div className="order-header">
                      <span className={`status-badge ${order.status}`}>
                        {order.status.replace(/_/g, ' ')}
                      </span>
                    </div>
                    <div className="order-details">
                      <p>Ordered by: {order.user_name}</p>
                      <p>Email: {order.user_email}</p>
                      <p>Date: {new Date(order.created_at).toLocaleString()}</p>
                      <p className="total-cost">Total Cost: ${order.total_cost.toFixed(2)}</p>
                    </div>
                    <div className="order-items">
                      <h4>Items</h4>
                      <ul>
                        {order.items.map((item, index) => (
                          <li key={index}>
                            {item.quantity}x {item.snack_name} (${item.price_per_unit} each)
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div className="order-actions">
                      <select
                        className="status-select"
                        value={order.status}
                        data-order-id={order.order_id}
                        onChange={(e) => handleStatusUpdate(order.order_id, e.target.value)}
                      >
                        <option value="pending">Pending</option>
                        <option value="processing">Processing</option>
                        <option value="out_for_delivery">Out for Delivery</option>
                        <option value="delivered">Delivered</option>
                        <option value="cancelled">Cancelled</option>
                      </select>
                      <button
                        onClick={() => handleDeleteOrder(order.order_id)}
                        className="btn btn-danger btn-sm"
                        title="Delete Order"
                      >
                        Delete Order
                      </button>
                    </div>
                  </div>
                ))}
            </div>
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
              // Filter preferences by snack name since that's what we get from the API
              const snackPreferences = preferences.filter(p => p.snack_name === snack.name);
              const dailyTotal = snackPreferences.reduce((sum, p) => sum + (p.daily_quantity || 0), 0);
              const totalQuantity = weeklyQuantities[snack.id] || (dailyTotal * dayMultiplier);
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
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <button className="modal-close" onClick={closeModal}>&times;</button>
            
            {editMode ? (
              <>
                <h2>Edit Snack</h2>
                <SnackForm 
                  onSubmit={handleEditSubmit}
                  initialData={editedSnack}
                />
              </>
            ) : (
              <>
                <h2>{selectedSnack.name}</h2>
                {selectedSnack.image_data && (
                  <div className="snack-image-container">
                    <img src={selectedSnack.image_data} alt={selectedSnack.name} className="snack-image" />
                  </div>
                )}
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
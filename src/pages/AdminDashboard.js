import React, { useState, useEffect } from 'react';
import config from '../config';
import './AdminDashboard.css';
import InventoryTracking from '../components/InventoryTracking';
import SnackForm from '../components/SnackForm';

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

  const user = JSON.parse(localStorage.getItem('user'));

  // Helper function to get validated company UUID
  const getCompanyUUID = () => {
    if (!user || !user.companyId) {
      throw new Error('No company ID found');
    }
    const companyUUID = user.companyId.toString().length === 36 ? user.companyId : null;
    if (!companyUUID) {
      throw new Error('Invalid company ID format');
    }
    return companyUUID;
  };

  useEffect(() => {
    fetchData();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchData = async () => {
    try {
      const companyUUID = getCompanyUUID();

      const [snacksResponse, ordersResponse, preferencesResponse, usersResponse] = await Promise.all([
        fetch(`${config.apiBaseUrl}/snacks?companyId=${companyUUID}&userId=${user.id}`),
        fetch(`${config.apiBaseUrl}/orders/company/${companyUUID}?userId=${user.id}`),
        fetch(`${config.apiBaseUrl}/preferences/company/${companyUUID}?userId=${user.id}`),
        fetch(`${config.apiBaseUrl}/auth/company-users/${companyUUID}?userId=${user.id}`)
      ]);

      if (!snacksResponse.ok) throw new Error('Failed to fetch snacks');
      if (!ordersResponse.ok) throw new Error('Failed to fetch orders');
      if (!preferencesResponse.ok) throw new Error('Failed to fetch preferences');
      if (!usersResponse.ok) throw new Error('Failed to fetch company users');

      const [snacksData, ordersData, preferencesData, usersData] = await Promise.all([
        snacksResponse.json(),
        ordersResponse.json(),
        preferencesResponse.json(),
        usersResponse.json()
      ]);

      setSnacks(snacksData);
      setOrders(ordersData);
      setPreferences(preferencesData);
      setCompanyUsers(usersData);

      // Calculate initial quantities based on preferences
      const initialWeeklyQuantities = {};
      snacksData.forEach(snack => {
        const snackPrefs = preferencesData.filter(p => p.snack_name === snack.name);
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

  const handleSubmit = async (formData) => {
    try {
      const companyUUID = getCompanyUUID();
      const response = await fetch(`${config.apiBaseUrl}/snacks`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          companyId: companyUUID,
          userId: user.id
        }),
      });

      if (!response.ok) throw new Error('Failed to add snack');
      
      // Refresh snacks list
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
    setEditMode(false);
  };

  const closeModal = () => {
    setSelectedSnack(null);
    setEditMode(false);
  };

  const handleEditClick = (snack, e) => {
    e.stopPropagation();
    setEditMode(true);
    setEditedSnack({
      id: snack.id,
      name: snack.name,
      description: snack.description,
      price: snack.price,
      ingredients: snack.ingredients,
      image_data: snack.image_data
    });
    setSelectedSnack(snack);
  };

  const handleEditSubmit = async (formData) => {
    try {
      const response = await fetch(`${config.apiBaseUrl}/snacks/${editedSnack.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
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
      const companyUUID = getCompanyUUID();

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
          companyId: companyUUID,
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
          companyId: user.companyId,
          userId: user.id
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
          companyId: user.companyId,
          userId: user.id
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

  const fetchEmployeeOrders = async (userId) => {
    try {
      const companyUUID = getCompanyUUID();
      const response = await fetch(`${config.apiBaseUrl}/orders/user/${userId}?companyId=${companyUUID}&userId=${user.id}`);
      if (!response.ok) throw new Error('Failed to fetch employee orders');
      const data = await response.json();
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
      const companyUUID = getCompanyUUID();
      const response = await fetch(`${config.apiBaseUrl}/orders/${orderId}?companyId=${companyUUID}&userId=${user.id}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        throw new Error('Failed to delete order');
      }

      // Remove the deleted order from the state
      setOrders(prevOrders => prevOrders.filter(order => order.order_id !== orderId));
    } catch (err) {
      setError('Failed to delete order: ' + err.message);
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
                        <span className={`
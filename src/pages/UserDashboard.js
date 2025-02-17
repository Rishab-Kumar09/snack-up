import React, { useState, useEffect } from 'react';
import config from '../config';
import './UserDashboard.css';

const UserDashboard = () => {
  const [snacks, setSnacks] = useState([]);
  const [preferences, setPreferences] = useState({});
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('snacks');
  const [selectedSnack, setSelectedSnack] = useState(null);
  const user = JSON.parse(localStorage.getItem('user'));

  useEffect(() => {
    fetchData();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchData = async () => {
    try {
      const [snacksResponse, preferencesResponse, ordersResponse] = await Promise.all([
        fetch(`${config.apiBaseUrl}/snacks`),
        fetch(`${config.apiBaseUrl}/preferences/user/${user.id}`),
        fetch(`${config.apiBaseUrl}/orders/user/${user.id}`)
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
      setOrders(ordersData);
      
      // Convert preferences array to object for easier lookup
      const prefsObj = {};
      preferencesData.forEach(pref => {
        prefsObj[pref.snack_id] = {
          rating: pref.rating,
          dailyQuantity: pref.daily_quantity
        };
      });
      setPreferences(prefsObj);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handlePreferenceUpdate = async (snackId, rating, dailyQuantity) => {
    try {
      // Convert values to numbers and handle invalid inputs
      const numericRating = Number(rating);
      const numericQuantity = Number(dailyQuantity);

      // Validate the numbers
      if (isNaN(numericRating) || isNaN(numericQuantity)) {
        throw new Error('Rating and quantity must be valid numbers');
      }

      const response = await fetch(`${config.apiBaseUrl}/preferences`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: user.id,
          snackId,
          rating: numericRating,
          dailyQuantity: numericQuantity
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to update preference');
      }

      setPreferences(prev => ({
        ...prev,
        [snackId]: { rating: numericRating, dailyQuantity: numericQuantity }
      }));
      setError('');
    } catch (err) {
      setError(err.message);
    }
  };

  const renderStars = (snackId) => {
    const currentRating = preferences[snackId]?.rating || 0;
    return (
      <div className="rating-stars">
        {[1, 2, 3, 4, 5].map(star => (
          <button
            key={star}
            className={`star-button ${star <= currentRating ? 'active' : ''}`}
            onClick={() => handlePreferenceUpdate(
              snackId,
              star,
              preferences[snackId]?.dailyQuantity || 0
            )}
          >
            ★
          </button>
        ))}
      </div>
    );
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

  if (loading) return <div className="loading">Loading...</div>;
  if (error) return <div className="alert alert-error">{error}</div>;

  return (
    <div className="dashboard-container">
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
          My Orders
        </button>
      </nav>

      {activeTab === 'snacks' ? (
        <section className="snacks-section">
          <h2>Available Snacks</h2>
          <div className="snacks-grid">
            {snacks.map(snack => (
              <div key={snack.id} className="snack-card" onClick={() => handleSnackClick(snack)}>
                <h3>{snack.name}</h3>
                <p className="snack-description">{snack.description}</p>
                <p className="snack-price">${snack.price}</p>
                {renderDietaryBadges(snack)}
                
                <div className="snack-preferences">
                  <div className="rating-container">
                    <label>Rating:</label>
                    {renderStars(snack.id)}
                  </div>
                  
                  <div className="quantity-container">
                    <label>Daily Quantity:</label>
                    <input
                      type="number"
                      min="0"
                      value={preferences[snack.id]?.dailyQuantity || 0}
                      onChange={(e) => handlePreferenceUpdate(
                        snack.id,
                        preferences[snack.id]?.rating || 0,
                        parseInt(e.target.value) || 0
                      )}
                      className="quantity-input"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      ) : (
        <section className="orders-section">
          <h2>My Order History</h2>
          
          {/* Personal Orders */}
          <h3>Personal Orders</h3>
          <div className="orders-grid">
            {orders.filter(order => !order.is_admin_order).map(order => (
              <div key={order.order_id} className="order-card">
                <div className="order-header">
                  <h3>Order #{order.order_id}</h3>
                  <span className={`status-badge ${order.status}`}>
                    {order.status.replace(/_/g, ' ')}
                  </span>
                </div>
                <div className="order-details">
                  <p>Date: {new Date(order.created_at).toLocaleString()}</p>
                </div>
                <div className="order-items">
                  <h4>Items</h4>
                  <ul>
                    {order.items.map((item, index) => (
                      <li key={index}>
                        {item.quantity}x {item.snack_name}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            ))}
          </div>

          {/* Admin Bulk Orders */}
          <h3 className="bulk-orders-title">Company Bulk Orders</h3>
          <div className="orders-grid">
            {orders.filter(order => order.is_admin_order).map(order => (
              <div key={order.order_id} className="order-card bulk-order">
                <div className="order-header">
                  <h3>Bulk Order #{order.order_id}</h3>
                  <span className={`status-badge ${order.status}`}>
                    {order.status.replace(/_/g, ' ')}
                  </span>
                </div>
                <div className="order-details">
                  <p>Date: {new Date(order.created_at).toLocaleString()}</p>
                  <p className="ordered-by">Placed by: {order.ordered_by}</p>
                </div>
                <div className="order-items">
                  <h4>Items</h4>
                  <ul>
                    {order.items.map((item, index) => (
                      <li key={index}>
                        {item.quantity}x {item.snack_name}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {selectedSnack && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <button className="modal-close" onClick={closeModal}>&times;</button>
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
          </div>
        </div>
      )}
    </div>
  );
};

export default UserDashboard; 
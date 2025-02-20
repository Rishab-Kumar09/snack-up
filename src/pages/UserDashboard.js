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
  const [isPreferencesModalOpen, setIsPreferencesModalOpen] = useState(false);
  const user = JSON.parse(localStorage.getItem('user'));

  useEffect(() => {
    fetchData();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchData = async () => {
    try {
      const [snacksResponse, preferencesResponse, ordersResponse] = await Promise.all([
        fetch(`${config.apiBaseUrl}/snacks?companyId=${user.companyId}`),
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
      const numericQuantity = Number(dailyQuantity);

      // Validate the quantity
      if (isNaN(numericQuantity)) {
        throw new Error('Quantity must be a valid number');
      }

      // Ensure quantity is not negative
      if (numericQuantity < 0) {
        throw new Error('Daily quantity cannot be negative');
      }

      // Only include rating in the request if it's being updated (not 0)
      const requestBody = {
        userId: user.id,
        snackId,
        dailyQuantity: numericQuantity
      };

      if (rating > 0) {
        if (rating < 1 || rating > 5) {
          throw new Error('Rating must be between 1 and 5');
        }
        requestBody.rating = rating;
      }

      const response = await fetch(`${config.apiBaseUrl}/preferences`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to update preference');
      }

      setPreferences(prev => ({
        ...prev,
        [snackId]: { 
          rating: rating > 0 ? rating : (prev[snackId]?.rating || 0),
          dailyQuantity: numericQuantity 
        }
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

  const handleSnackCardClick = (e, snack) => {
    // Only open modal if clicking on the card itself, not on inputs
    if (!e.target.closest('.snack-preferences')) {
      setSelectedSnack(snack);
    }
  };

  const handleSetPreferences = () => {
    // Show modal with current preferences
    setIsPreferencesModalOpen(true);
  };

  const handleUpdatePreference = (snackId, newQuantity) => {
    handlePreferenceUpdate(
      snackId,
      preferences[snackId]?.rating || 0,
      parseInt(newQuantity) || 0
    );
  };

  const closeModal = () => {
    setSelectedSnack(null);
    setIsPreferencesModalOpen(false);
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
          <div className="snacks-header">
            <h2>Available Snacks</h2>
            <button 
              onClick={handleSetPreferences}
              className="btn btn-primary set-preferences-btn"
            >
              Update Daily Preferences
            </button>
          </div>
          <div className="snacks-grid">
            {snacks.map(snack => (
              <div key={snack.id} className="snack-card" onClick={(e) => handleSnackCardClick(e, snack)}>
                {snack.image_data && (
                  <div className="snack-image-container">
                    <img src={snack.image_data} alt={snack.name} className="snack-image" />
                  </div>
                )}
                <h3>{snack.name}</h3>
                <p className="snack-description">Ingredients: {snack.ingredients}</p>
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
          <div className="orders-grid">
            {orders.map(order => (
              <div key={order.order_id} className="order-card">
                <div className="order-header">
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
        </section>
      )}

      {/* Preferences Modal */}
      {isPreferencesModalOpen && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal-content preferences-modal" onClick={e => e.stopPropagation()}>
            <button className="modal-close" onClick={closeModal}>&times;</button>
            <h2>Update Daily Preferences</h2>
            
            <div className="preferences-list">
              {snacks.map(snack => (
                <div key={snack.id} className="preference-item">
                  <span className="item-name">{snack.name}</span>
                  <div className="preference-controls">
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
                        onChange={(e) => handleUpdatePreference(snack.id, e.target.value)}
                        className="quantity-input"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
            
            <div className="modal-footer">
              <button onClick={closeModal} className="btn btn-primary">
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Snack Details Modal */}
      {selectedSnack && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <button className="modal-close" onClick={closeModal}>&times;</button>
            {selectedSnack.image_data && (
              <div className="modal-image-container">
                <img src={selectedSnack.image_data} alt={selectedSnack.name} className="modal-snack-image" />
              </div>
            )}
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
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserDashboard; 
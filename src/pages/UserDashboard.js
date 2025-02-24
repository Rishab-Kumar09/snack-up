import React, { useState, useEffect, useMemo } from 'react';
import config from '../config';
import './UserDashboard.css';
import SnackCard from '../components/SnackCard';
import { fetchWithAuth } from '../utils/api';

const UserDashboard = () => {
  const [snacks, setSnacks] = useState([]);
  const [preferences, setPreferences] = useState({});
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('snacks');
  const [selectedSnack, setSelectedSnack] = useState(null);
  const [isPreferencesModalOpen, setIsPreferencesModalOpen] = useState(false);
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
      console.log('Fetching data for user:', user.id);
      const [snacksData, preferencesData, ordersData] = await Promise.all([
        fetchWithAuth('/snacks'),
        fetchWithAuth(`/preferences/user/${user.id}`),
        fetchWithAuth(`/orders/user/${user.id}`)
      ]);

      setSnacks(snacksData);
      setOrders(ordersData);
      
      // Convert preferences array to object for easier lookup
      const prefsObj = {};
      preferencesData.forEach(pref => {
        prefsObj[pref.snack_id] = {
          dailyQuantity: pref.daily_quantity
        };
      });
      setPreferences(prefsObj);
    } catch (err) {
      console.error('Error in fetchData:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handlePreferenceUpdate = async (snackId, dailyQuantity) => {
    try {
      // Convert value to number and handle invalid inputs
      const numericQuantity = Number(dailyQuantity);

      // Validate the quantity
      if (isNaN(numericQuantity)) {
        throw new Error('Quantity must be a valid number');
      }

      // Ensure quantity is not negative
      if (numericQuantity < 0) {
        throw new Error('Daily quantity cannot be negative');
      }

      const requestBody = {
        userId: user.id,
        snackId,
        dailyQuantity: numericQuantity
      };

      await fetchWithAuth('/preferences', {
        method: 'POST',
        body: JSON.stringify(requestBody),
      });

      setPreferences(prev => ({
        ...prev,
        [snackId]: { 
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

  const handleUpdatePreference = (snackId, quantity) => {
    handlePreferenceUpdate(snackId, quantity);
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
            {paginatedSnacks.map(snack => (
              <SnackCard
                key={snack.id}
                snack={snack}
                isAdmin={false}
                onClick={(e) => handleSnackCardClick(e, snack)}
                preferences={preferences[snack.id]}
                onPreferenceUpdate={handlePreferenceUpdate}
                renderStars={renderStars}
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
      ) : (
        <section className="orders-section">
          <h2>My Daily Preferences</h2>
          <div className="preferences-summary">
            {snacks.map(snack => {
              const quantity = preferences[snack.id]?.dailyQuantity || 0;
              if (quantity > 0) {
                return (
                  <div key={snack.id} className="preference-summary-item">
                    <span className="snack-name">{snack.name}</span>
                    <span className="quantity">{quantity} per day</span>
                  </div>
                );
              }
              return null;
            }).filter(Boolean)}
            {Object.keys(preferences).length === 0 && (
              <p className="no-preferences">No daily preferences set yet. Go to the Snacks tab to set your preferences.</p>
            )}
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
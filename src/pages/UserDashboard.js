import React, { useState, useEffect } from 'react';
import config from '../config';
import './UserDashboard.css';

const UserDashboard = () => {
  const [snacks, setSnacks] = useState([]);
  const [preferences, setPreferences] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const user = JSON.parse(localStorage.getItem('user'));

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [snacksResponse, preferencesResponse] = await Promise.all([
        fetch(`${config.apiBaseUrl}/snacks`),
        fetch(`${config.apiBaseUrl}/preferences/${user.id}`)
      ]);

      if (!snacksResponse.ok) throw new Error('Failed to fetch snacks');
      if (!preferencesResponse.ok) throw new Error('Failed to fetch preferences');

      const [snacksData, preferencesData] = await Promise.all([
        snacksResponse.json(),
        preferencesResponse.json()
      ]);

      setSnacks(snacksData);
      
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
      const response = await fetch(`${config.apiBaseUrl}/preferences`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: user.id,
          snackId,
          rating,
          dailyQuantity
        }),
      });

      if (!response.ok) throw new Error('Failed to update preference');

      setPreferences(prev => ({
        ...prev,
        [snackId]: { rating, dailyQuantity }
      }));
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

  if (loading) return <div className="loading">Loading...</div>;
  if (error) return <div className="alert alert-error">{error}</div>;

  return (
    <div className="dashboard-container">
      <section className="snacks-section">
        <h2>Available Snacks</h2>
        <div className="snacks-grid">
          {snacks.map(snack => (
            <div key={snack.id} className="snack-card">
              <h3>{snack.name}</h3>
              <p className="snack-description">{snack.description}</p>
              <p className="snack-price">${snack.price}</p>
              
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
    </div>
  );
};

export default UserDashboard; 
import React, { useState, useEffect } from 'react';
import config from '../config';
import './UserDashboard.css';

const UserDashboard = () => {
  const [snacks, setSnacks] = useState([]);
  const [recommendations, setRecommendations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch snacks
        const snacksResponse = await fetch(`${config.apiBaseUrl}/snacks`);
        if (!snacksResponse.ok) throw new Error('Failed to fetch snacks');
        const snacksData = await snacksResponse.json();
        setSnacks(snacksData);

        // Fetch recommendations (assuming user ID 1 for now)
        const recommendationsResponse = await fetch(`${config.apiBaseUrl}/recommendations/1`);
        if (!recommendationsResponse.ok) throw new Error('Failed to fetch recommendations');
        const recommendationsData = await recommendationsResponse.json();
        setRecommendations(recommendationsData.recommendations);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) return <div className="loading">Loading...</div>;
  if (error) return <div className="alert alert-error">{error}</div>;

  return (
    <div className="dashboard-container">
      <section className="recommendations-section">
        <h2>Your Snack Recommendations</h2>
        <div className="recommendations-content">
          <p>{recommendations}</p>
        </div>
      </section>

      <section className="snacks-section">
        <h2>Available Snacks</h2>
        <div className="snacks-grid">
          {snacks.map(snack => (
            <div key={snack.id} className="snack-card">
              <h3>{snack.name}</h3>
              <p className="snack-description">{snack.description}</p>
              <p className="snack-price">${snack.price}</p>
              <div className="snack-actions">
                <button className="btn btn-primary">Add to Order</button>
                <button className="btn btn-secondary">Rate Snack</button>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};

export default UserDashboard; 
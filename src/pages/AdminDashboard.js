import React, { useState, useEffect } from 'react';
import config from '../config';
import './AdminDashboard.css';

const AdminDashboard = () => {
  const [snacks, setSnacks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [newSnack, setNewSnack] = useState({
    name: '',
    description: '',
    price: '',
    stock: '',
    ingredients: ''
  });

  useEffect(() => {
    fetchSnacks();
  }, []);

  const fetchSnacks = async () => {
    try {
      const response = await fetch(`${config.apiBaseUrl}/snacks`);
      if (!response.ok) throw new Error('Failed to fetch snacks');
      const data = await response.json();
      setSnacks(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
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
        stock: '',
        ingredients: ''
      });
      fetchSnacks();
    } catch (err) {
      setError(err.message);
    }
  };

  if (loading) return <div className="loading">Loading...</div>;
  if (error) return <div className="alert alert-error">{error}</div>;

  return (
    <div className="admin-dashboard">
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

          <div className="form-row">
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
              <label htmlFor="stock">Stock</label>
              <input
                type="number"
                id="stock"
                name="stock"
                value={newSnack.stock}
                onChange={handleInputChange}
                className="form-control"
                min="0"
                required
              />
            </div>
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
          {snacks.map(snack => (
            <div key={snack.id} className="inventory-card">
              <h3>{snack.name}</h3>
              <p className="inventory-description">{snack.description}</p>
              <div className="inventory-details">
                <span className="price">${snack.price}</span>
                <span className="stock">Stock: {snack.stock}</span>
              </div>
              <div className="inventory-actions">
                <button className="btn btn-secondary">Edit</button>
                <button className="btn btn-primary">Update Stock</button>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};

export default AdminDashboard; 
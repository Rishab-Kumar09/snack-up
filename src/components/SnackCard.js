import React from 'react';
import { getStoreName } from '../utils/storeDetection';

const SnackCard = ({ 
  snack, 
  onEdit, 
  onDelete, 
  onToggleAvailability, 
  isAdmin,
  preferences,
  onPreferenceUpdate,
  onClick
}) => {
  const {
    id,
    name,
    description,
    price,
    ingredients,
    is_available,
    isDairyFree,
    isVegetarian,
    isVegan,
    image_data,
    store_url,
    detected_store
  } = snack;

  const handleDelete = () => {
    if (window.confirm(`Are you sure you want to delete ${name}?`)) {
      onDelete(id);
    }
  };

  const truncateText = (text, maxLength) => {
    if (text?.length > maxLength) {
      return `${text.substring(0, maxLength)}...`;
    }
    return text;
  };

  return (
    <div className={`snack-card ${!is_available ? 'unavailable' : ''}`} onClick={onClick}>
      <div className="image-container">
        {image_data ? (
          <img src={image_data} alt={name} className="snack-image" />
        ) : (
          <div className="placeholder-image">No Image</div>
        )}
      </div>
      <div className="content">
        <div className="header">
          <h3>{truncateText(name, 25)}</h3>
          <p className="price">${parseFloat(price).toFixed(2)}</p>
        </div>
        <p className="description">{truncateText(ingredients, 60)}</p>
        <div className="dietary-info">
          {isDairyFree && <span className="tag dairy-free">Dairy Free</span>}
          {isVegetarian && !isVegan && <span className="tag vegetarian">Vegetarian</span>}
          {isVegan && <span className="tag vegan">Vegan</span>}
          {!isVegetarian && <span className="tag non-veg">Non-Veg</span>}
        </div>
        {!isAdmin && (
          <div className="snack-preferences" onClick={e => e.stopPropagation()}>
            <div className="quantity-container">
              <label>Daily Quantity:</label>
              <input
                type="number"
                min="0"
                value={preferences?.dailyQuantity || 0}
                onChange={(e) => onPreferenceUpdate(
                  id,
                  parseInt(e.target.value) || 0
                )}
                className="quantity-input"
              />
            </div>
          </div>
        )}
        {store_url && (
          <div className="store-info">
            <span className="store-name">{getStoreName(detected_store)}</span>
            <a 
              href={store_url} 
              target="_blank" 
              rel="noopener noreferrer" 
              className="buy-button"
              onClick={e => e.stopPropagation()}
            >
              Buy Now
            </a>
          </div>
        )}
        {isAdmin && (
          <div className="admin-controls">
            <button onClick={(e) => {
              e.stopPropagation();
              onEdit(snack, e);
            }} className="edit-button">
              Edit
            </button>
            <button onClick={(e) => {
              e.stopPropagation();
              handleDelete();
            }} className="delete-button">
              Delete
            </button>
          </div>
        )}
      </div>

      <style jsx>{`
        .snack-card {
          border: 1px solid #ddd;
          border-radius: 8px;
          overflow: hidden;
          margin: 0.5rem;
          background: white;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
          width: 280px;
          display: flex;
          flex-direction: column;
        }
        
        .image-container {
          height: 180px;
          overflow: hidden;
          background: #f5f5f5;
        }
        
        .snack-image {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }
        
        .placeholder-image {
          width: 100%;
          height: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #f0f0f0;
          color: #666;
          font-size: 0.8rem;
        }
        
        .content {
          padding: 1rem;
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 0.5rem;
        }
        
        h3 {
          margin: 0;
          color: #333;
          font-size: 1.1rem;
          flex: 1;
        }
        
        .description {
          color: #666;
          margin: 0;
          font-size: 0.9rem;
          line-height: 1.4;
        }
        
        .price {
          font-weight: bold;
          color: #2c5282;
          margin: 0;
          font-size: 1rem;
          white-space: nowrap;
        }
        
        .dietary-info {
          display: flex;
          gap: 0.25rem;
          flex-wrap: wrap;
        }
        
        .tag {
          padding: 0.2rem 0.4rem;
          border-radius: 3px;
          font-size: 0.75rem;
          font-weight: 600;
          display: inline-block;
          white-space: nowrap;
        }
        
        .dairy-free {
          background: #E3F2FD;
          color: #1565C0;
        }
        
        .vegetarian {
          background: #E8F5E9;
          color: #2E7D32;
        }
        
        .vegan {
          background: #F3E5F5;
          color: #7B1FA2;
        }
        
        .non-veg {
          background: #FFEBEE;
          color: #C62828;
        }

        .snack-preferences {
          margin-top: 0.75rem;
          padding-top: 0.75rem;
          border-top: 1px solid #eee;
          font-size: 0.9rem;
        }

        .quantity-container {
          margin-bottom: 0.5rem;
        }

        .quantity-container label {
          display: block;
          margin-bottom: 0.25rem;
          color: #666;
          font-weight: 500;
        }

        .quantity-input {
          width: 70px;
          padding: 0.35rem;
          border: 1px solid #ddd;
          border-radius: 3px;
          font-size: 0.9rem;
        }

        .store-info {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-top: 0.5rem;
          padding-top: 0.5rem;
          border-top: 1px solid #eee;
        }

        .store-name {
          font-size: 0.85rem;
          color: #666;
        }

        .buy-button {
          background: #2c5282;
          color: white;
          padding: 0.35rem 0.75rem;
          border-radius: 3px;
          font-size: 0.85rem;
          text-decoration: none;
          transition: background-color 0.2s;
        }

        .buy-button:hover {
          background: #1a365d;
        }
        
        .admin-controls {
          display: flex;
          gap: 0.25rem;
          margin-top: 0.15rem;
        }
        
        button {
          padding: 0.35rem 0.75rem;
          border: none;
          border-radius: 3px;
          cursor: pointer;
          font-size: 0.85rem;
          flex: 1;
        }
        
        .edit-button {
          background: #4CAF50;
          color: white;
        }
        
        .edit-button:hover {
          background: #45a049;
        }
        
        .delete-button {
          background: #dc3545;
          color: white;
        }
        
        .delete-button:hover {
          background: #c82333;
        }
        
        .unavailable {
          opacity: 0.7;
        }
        
        .unavailable::after {
          content: 'Unavailable';
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%) rotate(-45deg);
          background: rgba(244, 67, 54, 0.9);
          color: white;
          padding: 0.25rem 1rem;
          font-weight: bold;
          text-transform: uppercase;
          letter-spacing: 1px;
          font-size: 0.7rem;
        }
      `}</style>
    </div>
  );
};

export default SnackCard; 
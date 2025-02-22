import React from 'react';
import { getStoreName } from '../utils/storeDetection';

const SnackCard = ({ snack, onEdit, onDelete, onToggleAvailability, isAdmin }) => {
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
    <div className={`snack-card ${!is_available ? 'unavailable' : ''}`}>
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
        <p className="description">{truncateText(description, 60)}</p>
        <div className="dietary-info">
          {isDairyFree && <span className="tag dairy-free">Dairy Free</span>}
          {isVegetarian && !isVegan && <span className="tag vegetarian">Vegetarian</span>}
          {isVegan && <span className="tag vegan">Vegan</span>}
          {!isVegetarian && <span className="tag non-veg">Non-Veg</span>}
        </div>
        {store_url && (
          <div className="store-info">
            <span className="store-name">{getStoreName(detected_store)}</span>
            <a href={store_url} target="_blank" rel="noopener noreferrer" className="buy-button">
              Buy Now
            </a>
          </div>
        )}
        {isAdmin && (
          <div className="admin-controls">
            <button onClick={(e) => onEdit(snack, e)} className="edit-button">
              Edit
            </button>
            <button onClick={handleDelete} className="delete-button">
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
          width: 200px;
          display: flex;
          flex-direction: column;
        }
        
        .image-container {
          height: 120px;
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
          padding: 0.5rem;
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
        }

        .header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 0.25rem;
        }
        
        h3 {
          margin: 0;
          color: #333;
          font-size: 0.9rem;
          flex: 1;
        }
        
        .description {
          color: #666;
          margin: 0;
          font-size: 0.75rem;
          line-height: 1.2;
        }
        
        .price {
          font-weight: bold;
          color: #2c5282;
          margin: 0;
          font-size: 0.85rem;
          white-space: nowrap;
        }
        
        .dietary-info {
          display: flex;
          gap: 0.15rem;
          flex-wrap: wrap;
        }
        
        .tag {
          padding: 0.1rem 0.25rem;
          border-radius: 3px;
          font-size: 0.6rem;
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

        .store-info {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-top: 0.15rem;
          padding-top: 0.15rem;
          border-top: 1px solid #eee;
        }

        .store-name {
          font-size: 0.7rem;
          color: #666;
        }

        .buy-button {
          background: #2c5282;
          color: white;
          padding: 0.25rem 0.5rem;
          border-radius: 3px;
          font-size: 0.7rem;
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
          padding: 0.25rem 0.4rem;
          border: none;
          border-radius: 3px;
          cursor: pointer;
          font-size: 0.7rem;
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
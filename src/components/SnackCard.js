import React from 'react';

const SnackCard = ({ snack, onEdit, onToggleAvailability, isAdmin }) => {
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
    image_data
  } = snack;

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
        <h3>{name}</h3>
        <p className="description">{description}</p>
        <p className="price">${parseFloat(price).toFixed(2)}</p>
        <p className="ingredients">
          <strong>Ingredients:</strong> {ingredients}
        </p>
        <div className="dietary-info">
          {isDairyFree && <span className="tag dairy-free">Dairy Free</span>}
          {isVegetarian && <span className="tag vegetarian">Vegetarian</span>}
          {isVegan && <span className="tag vegan">Vegan</span>}
        </div>
        {isAdmin && (
          <div className="admin-controls">
            <button onClick={() => onEdit(snack)} className="edit-button">
              Edit
            </button>
            <button
              onClick={() => onToggleAvailability(id, !is_available)}
              className={`availability-button ${is_available ? 'mark-unavailable' : 'mark-available'}`}
            >
              {is_available ? 'Mark Unavailable' : 'Mark Available'}
            </button>
          </div>
        )}
      </div>

      <style jsx>{`
        .snack-card {
          border: 1px solid #ddd;
          border-radius: 8px;
          overflow: hidden;
          margin: 1rem;
          background: white;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
          width: 300px;
          display: flex;
          flex-direction: column;
        }
        
        .image-container {
          height: 200px;
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
        }
        
        .content {
          padding: 1rem;
        }
        
        h3 {
          margin: 0 0 0.5rem 0;
          color: #333;
        }
        
        .description {
          color: #666;
          margin-bottom: 0.5rem;
        }
        
        .price {
          font-weight: bold;
          color: #2c5282;
          margin-bottom: 0.5rem;
        }
        
        .ingredients {
          font-size: 0.9rem;
          color: #444;
          margin-bottom: 0.5rem;
        }
        
        .dietary-info {
          display: flex;
          gap: 0.5rem;
          flex-wrap: wrap;
          margin-bottom: 1rem;
        }
        
        .tag {
          padding: 0.25rem 0.5rem;
          border-radius: 4px;
          font-size: 0.8rem;
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
        
        .admin-controls {
          display: flex;
          gap: 0.5rem;
        }
        
        button {
          padding: 0.5rem 1rem;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          font-size: 0.9rem;
        }
        
        .edit-button {
          background: #4CAF50;
          color: white;
        }
        
        .edit-button:hover {
          background: #45a049;
        }
        
        .availability-button {
          flex: 1;
        }
        
        .mark-unavailable {
          background: #f44336;
          color: white;
        }
        
        .mark-available {
          background: #2196F3;
          color: white;
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
          padding: 0.5rem 2rem;
          font-weight: bold;
          text-transform: uppercase;
          letter-spacing: 2px;
        }
      `}</style>
    </div>
  );
};

export default SnackCard; 
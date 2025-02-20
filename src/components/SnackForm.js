import React, { useState } from 'react';
import ImageUpload from './ImageUpload';

const SnackForm = ({ onSubmit, initialData = {} }) => {
  const [formData, setFormData] = useState({
    name: initialData.name || '',
    description: initialData.description || '',
    price: initialData.price || '',
    ingredients: initialData.ingredients || '',
    image_data: initialData.image_data || null
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleImageChange = (imageData) => {
    setFormData(prev => ({
      ...prev,
      image_data: imageData
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
    
    // Reset form data if it's not in edit mode (no initialData.id)
    if (!initialData.id) {
      setFormData({
        name: '',
        description: '',
        price: '',
        ingredients: '',
        image_data: null
      });
    }
  };

  return (
    <form onSubmit={handleSubmit} className="snack-form">
      <div className="form-group">
        <label htmlFor="name">Name:</label>
        <input
          type="text"
          id="name"
          name="name"
          value={formData.name}
          onChange={handleChange}
          required
        />
      </div>

      <div className="form-group">
        <label htmlFor="description">Description:</label>
        <textarea
          id="description"
          name="description"
          value={formData.description}
          onChange={handleChange}
          required
        />
      </div>

      <div className="form-group">
        <label htmlFor="price">Price:</label>
        <input
          type="number"
          id="price"
          name="price"
          value={formData.price}
          onChange={handleChange}
          step="0.01"
          min="0"
          required
        />
      </div>

      <div className="form-group">
        <label htmlFor="ingredients">Ingredients:</label>
        <textarea
          id="ingredients"
          name="ingredients"
          value={formData.ingredients}
          onChange={handleChange}
          required
          placeholder="Enter ingredients separated by commas"
        />
      </div>

      <div className="form-group">
        <label>Snack Image:</label>
        <ImageUpload
          currentImage={formData.image_data}
          onImageChange={handleImageChange}
        />
      </div>

      <button type="submit" className="submit-button">
        {initialData.id ? 'Update Snack' : 'Add Snack'}
      </button>

      <style jsx>{`
        .snack-form {
          max-width: 600px;
          margin: 0 auto;
          padding: 20px;
        }
        .form-group {
          margin-bottom: 1rem;
        }
        label {
          display: block;
          margin-bottom: 0.5rem;
          font-weight: bold;
          color: var(--text-color);
        }
        input, textarea {
          width: 100%;
          padding: 0.5rem;
          border: 1px solid #ddd;
          border-radius: 4px;
          font-size: 1rem;
        }
        textarea {
          min-height: 100px;
          resize: vertical;
        }
        .submit-button {
          width: 100%;
          background-color: var(--primary-color);
          color: white;
          padding: 12px 20px;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          font-size: 1rem;
          transition: background-color 0.2s;
        }
        .submit-button:hover {
          background-color: var(--primary-color-dark);
        }
      `}</style>
    </form>
  );
};

export default SnackForm; 
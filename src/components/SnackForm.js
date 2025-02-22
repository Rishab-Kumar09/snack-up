import React, { useState, useEffect } from 'react';
import ImageUpload from './ImageUpload';
import { detectStoreFromUrl } from '../utils/storeDetection';

const SnackForm = ({ onSubmit, initialData = null }) => {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    ingredients: '',
    image_data: null,
    store_url: '',
    detected_store: null
  });

  const [boxCalculator, setBoxCalculator] = useState({
    boxCost: '',
    unitCount: ''
  });

  useEffect(() => {
    if (initialData) {
      setFormData({
        name: initialData.name || '',
        description: initialData.description || '',
        price: initialData.price || '',
        ingredients: initialData.ingredients || '',
        image_data: initialData.image_data || null,
        store_url: initialData.store_url || '',
        detected_store: initialData.detected_store || null
      });
    }
  }, [initialData]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    
    if (name === 'store_url') {
      const detectedStore = detectStoreFromUrl(value);
      setFormData(prev => ({
        ...prev,
        [name]: value,
        detected_store: detectedStore
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };

  const handleBoxCalculatorChange = (e) => {
    const { name, value } = e.target;
    setBoxCalculator(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const calculateUnitPrice = () => {
    const boxCost = parseFloat(boxCalculator.boxCost);
    const unitCount = parseInt(boxCalculator.unitCount);
    
    if (boxCost && unitCount && unitCount > 0) {
      const unitPrice = (boxCost / unitCount).toFixed(2);
      setFormData(prev => ({
        ...prev,
        price: unitPrice
      }));
    }
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

      <div className="box-calculator">
        <h4>Per Unit Cost Calculator</h4>
        <div className="calculator-inputs">
          <div className="calc-input">
            <label htmlFor="boxCost">Box Cost ($):</label>
            <input
              type="number"
              id="boxCost"
              name="boxCost"
              value={boxCalculator.boxCost}
              onChange={handleBoxCalculatorChange}
              step="0.01"
              min="0"
              placeholder="Enter box cost"
            />
          </div>
          <div className="calc-input">
            <label htmlFor="unitCount">Units in Box:</label>
            <input
              type="number"
              id="unitCount"
              name="unitCount"
              value={boxCalculator.unitCount}
              onChange={handleBoxCalculatorChange}
              min="1"
              placeholder="Enter number of units"
            />
          </div>
          <button 
            type="button" 
            onClick={calculateUnitPrice}
            className="calculate-button"
          >
            Calculate Unit Price
          </button>
        </div>
      </div>

      <div className="form-group">
        <label htmlFor="price">Price per Unit ($):</label>
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
        <label htmlFor="store_url">Store URL:</label>
        <input
          type="url"
          id="store_url"
          name="store_url"
          value={formData.store_url}
          onChange={handleChange}
          placeholder="https://store.com/product"
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
        {initialData ? 'Update Snack' : 'Add Snack'}
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
        .box-calculator {
          background: #f8f9fa;
          padding: 1rem;
          border-radius: 8px;
          margin-bottom: 1.5rem;
          border: 1px solid #e9ecef;
        }
        .box-calculator h4 {
          margin: 0 0 1rem 0;
          color: var(--primary-color);
        }
        .calculator-inputs {
          display: grid;
          gap: 1rem;
        }
        .calc-input {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }
        .calculate-button {
          background-color: var(--primary-color);
          color: white;
          padding: 0.5rem;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          font-size: 1rem;
          margin-top: 0.5rem;
          transition: background-color 0.2s;
        }
        .calculate-button:hover {
          background-color: var(--primary-color-dark);
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
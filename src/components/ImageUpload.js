import React, { useState } from 'react';

const ImageUpload = ({ currentImage, onImageChange }) => {
  const [previewUrl, setPreviewUrl] = useState(currentImage || '');

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) { // 5MB limit
        alert('Image size must be less than 5MB');
        return;
      }

      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result;
        setPreviewUrl(base64String);
        onImageChange(base64String);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveImage = () => {
    setPreviewUrl('');
    onImageChange(null);
  };

  return (
    <div className="image-upload-container">
      <div className="image-preview">
        {previewUrl ? (
          <div className="preview-wrapper">
            <img src={previewUrl} alt="Snack preview" className="preview-image" />
            <button 
              type="button"
              onClick={handleRemoveImage}
              className="remove-image-btn"
            >
              Remove Image
            </button>
          </div>
        ) : (
          <div className="upload-placeholder">
            <label htmlFor="image-upload" className="upload-label">
              <span>Click to upload image</span>
              <input
                id="image-upload"
                type="file"
                accept="image/*"
                onChange={handleImageChange}
                className="hidden-input"
              />
            </label>
          </div>
        )}
      </div>
      <style jsx>{`
        .image-upload-container {
          margin-bottom: 1rem;
        }
        .image-preview {
          width: 200px;
          height: 200px;
          border: 2px dashed #ccc;
          border-radius: 8px;
          overflow: hidden;
        }
        .preview-wrapper {
          position: relative;
          width: 100%;
          height: 100%;
        }
        .preview-image {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }
        .upload-placeholder {
          width: 100%;
          height: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
        }
        .upload-label {
          text-align: center;
          cursor: pointer;
          color: #666;
        }
        .hidden-input {
          display: none;
        }
        .remove-image-btn {
          position: absolute;
          bottom: 10px;
          left: 50%;
          transform: translateX(-50%);
          background: rgba(255, 0, 0, 0.8);
          color: white;
          border: none;
          padding: 5px 10px;
          border-radius: 4px;
          cursor: pointer;
        }
        .remove-image-btn:hover {
          background: rgba(255, 0, 0, 1);
        }
      `}</style>
    </div>
  );
};

export default ImageUpload; 
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
        <div className={`preview-wrapper ${previewUrl ? 'has-image' : ''}`}>
          {previewUrl ? (
            <img src={previewUrl} alt="Snack preview" className="preview-image" />
          ) : (
            <label className="upload-placeholder" htmlFor="image-input">
              <span>Click to upload image</span>
              <input
                id="image-input"
                type="file"
                accept="image/*"
                onChange={handleImageChange}
                className="hidden-input"
              />
            </label>
          )}
          <div className="image-controls">
            <label className="upload-label" htmlFor="image-input-change">
              <span>{previewUrl ? 'Change Image' : 'Upload Image'}</span>
              <input
                id="image-input-change"
                type="file"
                accept="image/*"
                onChange={handleImageChange}
                className="hidden-input"
              />
            </label>
            {previewUrl && (
              <button 
                type="button"
                onClick={handleRemoveImage}
                className="remove-image-btn"
              >
                Remove
              </button>
            )}
          </div>
        </div>
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
          display: flex;
          flex-direction: column;
        }
        .preview-wrapper.has-image:hover .image-controls {
          opacity: 1;
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
          color: #666;
          background: #f8f9fa;
          cursor: pointer;
          transition: background-color 0.2s;
          text-align: center;
          font-size: 1rem;
          padding: 1rem;
        }
        .upload-placeholder span {
          display: block;
          width: 100%;
        }
        .upload-placeholder:hover {
          background: #e9ecef;
        }
        .image-controls {
          position: absolute;
          bottom: 0;
          left: 0;
          right: 0;
          padding: 10px;
          background: rgba(0, 0, 0, 0.7);
          display: flex;
          gap: 10px;
          justify-content: center;
          opacity: 0;
          transition: opacity 0.2s;
        }
        .preview-wrapper:not(.has-image) .image-controls {
          display: none;
        }
        .upload-label {
          padding: 5px 10px;
          background: var(--primary-color);
          color: white;
          border-radius: 4px;
          cursor: pointer;
          font-size: 0.9rem;
        }
        .upload-label:hover {
          background: var(--primary-color-dark);
        }
        .hidden-input {
          display: none;
        }
        .remove-image-btn {
          padding: 5px 10px;
          background: #dc3545;
          color: white;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          font-size: 0.9rem;
        }
        .remove-image-btn:hover {
          background: #c82333;
        }
      `}</style>
    </div>
  );
};

export default ImageUpload; 
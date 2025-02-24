import React, { useState, useEffect } from 'react';

const ImageUpload = ({ currentImage, onImageChange }) => {
  const [previewUrl, setPreviewUrl] = useState('');

  useEffect(() => {
    // Set the preview URL when currentImage prop changes
    if (currentImage) {
      setPreviewUrl(currentImage);
    }
  }, [currentImage]);

  const compressImage = (file) => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          
          // Calculate new dimensions (max width/height of 800px)
          let width = img.width;
          let height = img.height;
          const maxSize = 800;
          
          if (width > height && width > maxSize) {
            height *= maxSize / width;
            width = maxSize;
          } else if (height > maxSize) {
            width *= maxSize / height;
            height = maxSize;
          }

          canvas.width = width;
          canvas.height = height;

          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);

          // Compress to JPEG with 0.7 quality (70%)
          const compressedBase64 = canvas.toDataURL('image/jpeg', 0.7);
          resolve(compressedBase64);
        };
        img.src = event.target.result;
      };
      reader.readAsDataURL(file);
    });
  };

  const handleImageChange = async (e) => {
    const file = e.target.files[0];
    if (file) {
      try {
        // Compress the image
        const compressedBase64 = await compressImage(file);
        
        // Update preview
        setPreviewUrl(compressedBase64);
        
        // Send to parent component
        onImageChange(compressedBase64);
        
        // Log size reduction
        const originalSize = file.size / 1024 / 1024;
        const compressedSize = (compressedBase64.length * 0.75) / 1024 / 1024;
        console.log(`Image size reduced from ${originalSize.toFixed(2)}MB to ${compressedSize.toFixed(2)}MB`);
      } catch (error) {
        console.error('Error compressing image:', error);
        alert('Error processing image. Please try again.');
      }
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
            <>
              <img src={previewUrl} alt="Snack preview" className="preview-image" />
              <div className="image-controls">
                <label className="upload-label" htmlFor="image-input-change">
                  <span>Change Image</span>
                  <input
                    id="image-input-change"
                    type="file"
                    accept="image/*"
                    onChange={handleImageChange}
                    className="hidden-input"
                  />
                </label>
                <button 
                  type="button"
                  onClick={handleRemoveImage}
                  className="remove-image-btn"
                >
                  Remove
                </button>
              </div>
            </>
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
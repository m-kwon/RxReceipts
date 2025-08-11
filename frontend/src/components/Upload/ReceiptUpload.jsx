import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';

function ReceiptUpload({ user, onError }) {
  const [selectedFile, setSelectedFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [dragOver, setDragOver] = useState(false);

  const fileInputRef = useRef(null);
  const cameraInputRef = useRef(null);
  const navigate = useNavigate();

  const IMAGE_SERVICE_URL = 'http://localhost:5001';

  const handleFileSelect = (file) => {
    if (!file.type.startsWith('image/')) {
      onError('Please select an image file (JPG, PNG, etc.)');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      onError('File is too large. Please select an image under 10MB.');
      return;
    }

    setSelectedFile(file);

    const reader = new FileReader();
    reader.onload = (e) => setPreview(e.target.result);
    reader.readAsDataURL(file);
  };

  const handleFileInput = (e) => {
    const file = e.target.files[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleCameraCapture = (e) => {
    const file = e.target.files[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setDragOver(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);

    const file = e.dataTransfer.files[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const uploadAndProcess = async () => {
    if (!selectedFile) {
      onError('Please select a file first');
      return;
    }

    setUploading(true);
    setProgress(20);

    try {
      const imageFormData = new FormData();
      imageFormData.append('image', selectedFile);

      const imageUploadResponse = await fetch(`${IMAGE_SERVICE_URL}/upload`, {
        method: 'POST',
        body: imageFormData
      });

      if (!imageUploadResponse.ok) {
        throw new Error('Failed to upload image');
      }

      const imageData = await imageUploadResponse.json();
      const imageId = imageData.id;

      setProgress(60);

      const ocrResponse = await api.post('/receipts/ocr/parse', {
        image_id: imageId
      });

      setProgress(100);

      if (ocrResponse.data.success) {
        navigate('/receipt/new', {
          state: {
            ocrData: ocrResponse.data.data,
            imageId: imageId
          }
        });
      } else {
        navigate('/receipt/new', {
          state: {
            imageId: imageId
          }
        });
      }

    } catch (error) {
      console.error('Upload and OCR failed:', error);
      setProgress(0);
      onError('Upload failed: ' + error.message);
    } finally {
      setUploading(false);
    }
  };

  const proceedManually = () => {
    navigate('/receipt/new');
  };

  const clearSelection = () => {
    setSelectedFile(null);
    setPreview(null);
    setProgress(0);
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (cameraInputRef.current) cameraInputRef.current.value = '';
  };

  return (
    <div className="upload-page">
      <div className="container-sm">
        <div className="upload-container">
          <div className="upload-header">
            <h1>Add New Receipt</h1>
            <p>Upload your healthcare receipt to automatically extract expense details</p>
          </div>

          {!selectedFile && (
            <div className="upload-instructions" style={{
              background: 'var(--light-gray)',
              padding: 'var(--spacing-lg)',
              borderRadius: 'var(--border-radius-md)',
              marginBottom: 'var(--spacing-xl)'
            }}>
              <h3 style={{ marginTop: 0 }}>For Best Results:</h3>
              <ul style={{
                fontSize: 'var(--font-size-sm)',
                color: 'var(--text-secondary)',
                paddingLeft: 'var(--spacing-lg)'
              }}>
                <li>Ensure the receipt is well-lit and text is clearly visible</li>
                <li>Lay the receipt flat on a contrasting surface</li>
                <li>Include the full receipt with all edges visible</li>
                <li>Avoid shadows, glare, and blurry text</li>
                <li>Supported formats: JPG, PNG (max 10MB)</li>
              </ul>
            </div>
          )}

          <div
            className={`upload-area ${dragOver ? 'dragover' : ''}`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            style={{ cursor: selectedFile ? 'default' : 'pointer' }}
          >
            {!selectedFile ? (
              <>
                <div className="upload-icon">📷</div>
                <div className="upload-text">
                  <strong>Choose Upload Method</strong>
                </div>
                <div className="upload-buttons">
                  <button
                    onClick={() => cameraInputRef.current?.click()}
                    className="btn btn-primary"
                  >
                    Take Photo
                  </button>

                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="btn btn-secondary"
                  >
                    Choose File
                  </button>
                </div>
                <div className="upload-subtext">
                  Or drag and drop an image here
                </div>
              </>
            ) : (
              <div className="upload-preview">
                <img
                  src={preview}
                  alt="Receipt preview"
                  className="preview-image"
                />
                <div style={{ marginTop: 'var(--spacing-lg)' }}>
                  <p><strong>File:</strong> {selectedFile.name}</p>
                  <p><strong>Size:</strong> {(selectedFile.size / 1024 / 1024).toFixed(2)} MB</p>
                </div>
              </div>
            )}
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileInput}
            className="file-input"
          />

          <input
            ref={cameraInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handleCameraCapture}
            className="file-input"
          />

          {/* Progress Bar */}
          {uploading && (
            <div className="upload-progress">
              <div className="progress-bar">
                <div
                  className="progress-fill"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <div className="progress-text">
                {progress < 30 ? 'Uploading image...' :
                 progress < 80 ? 'Processing receipt...' :
                 progress < 100 ? 'Extracting data...' : 'Complete!'}
              </div>
            </div>
          )}

          {/* Action Buttons */}
          {selectedFile && !uploading && (
            <div style={{
              display: 'flex',
              gap: 'var(--spacing-lg)',
              justifyContent: 'center',
              marginTop: 'var(--spacing-xl)'
            }}>
              <button
                onClick={uploadAndProcess}
                className="btn btn-primary btn-lg"
              >
                Upload & Continue
              </button>
              <button
                onClick={clearSelection}
                className="btn btn-outline"
              >
                Choose Different Image
              </button>
            </div>
          )}

          <div className="divider-text">
            <span>OR</span>
          </div>

          <div style={{ textAlign: 'center' }}>
            <button
              onClick={proceedManually}
              className="btn btn-outline btn-lg"
              disabled={uploading}
            >
              Enter Receipt Details Manually
            </button>
          </div>

          <div className="help-section" style={{
            marginTop: 'var(--spacing-xxl)',
            padding: 'var(--spacing-lg)',
            background: 'rgba(52, 152, 219, 0.05)',
            borderRadius: 'var(--border-radius-md)',
            borderLeft: '4px solid var(--primary-color)'
          }}>
            <h4 style={{ color: 'var(--primary-color)', marginTop: 0 }}>How It Works</h4>
            <ul style={{
              fontSize: 'var(--font-size-sm)',
              color: 'var(--text-secondary)',
              paddingLeft: 'var(--spacing-lg)',
              margin: 0
            }}>
              <li>Upload your receipt image and we'll automatically read the text</li>
              <li>Our system extracts store name, amount, date, and categorizes the expense</li>
              <li>Review and edit the extracted data before saving</li>
              <li>Save time and reduce manual data entry errors</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ReceiptUpload;
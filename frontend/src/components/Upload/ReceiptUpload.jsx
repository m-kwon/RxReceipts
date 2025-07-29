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

  // IH#7: Provide ways to try out different approaches
  const handleFileSelect = (file) => {
    // Validate file type
    if (!file.type.startsWith('image/')) {
      onError('Please select an image file (JPG, PNG, etc.)');
      return;
    }

    // Validate file size (10MB limit)
    if (file.size > 10 * 1024 * 1024) {
      onError('File is too large. Please select an image under 10MB.');
      return;
    }

    setSelectedFile(file);

    // Create preview
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

  // Drag and drop handlers
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

  const uploadFile = async () => {
    if (!selectedFile) {
      onError('Please select a file first');
      return;
    }

    setUploading(true);
    setProgress(10);

    try {
      const formData = new FormData();
      formData.append('image', selectedFile);

      // Add basic receipt info (we'll let user fill details on next screen)
      formData.append('store_name', 'Store Name (Please Edit)');
      formData.append('amount', '00.01');
      formData.append('receipt_date', new Date().toISOString().split('T')[0]);
      formData.append('category', 'Other');
      formData.append('description', 'Receipt uploaded - please add details');

      setProgress(50);

      const response = await api.upload.receiptImage(formData);

      setProgress(100);

      // Success - redirect to edit the receipt
      setTimeout(() => {
        navigate(`/receipt/${response.data.receipt.id}/edit`, {
          state: { newUpload: true }
        });
      }, 500);

    } catch (error) {
      console.error('Upload failed:', error);
      const errorMessage = error.response?.data?.details ||
                          error.response?.data?.error ||
                          'Upload failed. Please try again.';
      onError(errorMessage);
      setProgress(0);
    } finally {
      setUploading(false);
    }
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
            <p>Upload your healthcare receipt to track expenses for HSA/FSA</p>
          </div>

          {/* IH#6: Provide explicit path through the task */}
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
                <li>Supported formats: JPG, PNG (max 10MB)</li>
              </ul>
            </div>
          )}

          {/* Upload Area (IH#7: Multiple approaches) */}
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
                  {/* Camera Capture - Mobile optimized */}
                  <button
                    onClick={() => cameraInputRef.current?.click()}
                    className="btn btn-primary"
                  >
                    Take Photo
                  </button>

                  {/* File Upload */}
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
              /* Preview */
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

          {/* Hidden File Inputs */}
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
                Uploading... {progress}%
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
                onClick={uploadFile}
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

          {/* Alternative Method */}
          <div className="divider-text">
            <span>OR</span>
          </div>

          <div style={{ textAlign: 'center' }}>
            <button
              onClick={() => navigate('/receipt/new')}
              className="btn btn-outline btn-lg"
              disabled={uploading}
            >
              Enter Receipt Details Manually
            </button>
          </div>

          {/* Help Section (IH#1: Explain benefits) */}
          <div className="help-section" style={{
            marginTop: 'var(--spacing-xxl)',
            padding: 'var(--spacing-lg)',
            background: 'rgba(52, 152, 219, 0.05)',
            borderRadius: 'var(--border-radius-md)',
            borderLeft: '4px solid var(--primary-color)'
          }}>
            <h4 style={{ color: 'var(--primary-color)', marginTop: 0 }}>Why Upload Receipts?</h4>
            <ul style={{
              fontSize: 'var(--font-size-sm)',
              color: 'var(--text-secondary)',
              paddingLeft: 'var(--spacing-lg)',
              margin: 0
            }}>
              <li>Keep digital backups of important medical expense records</li>
              <li>Automatically organize receipts by medical category</li>
              <li>Generate HSA/FSA compliant reports for easy reimbursement</li>
              <li>Never lose another receipt or miss a deduction</li>
            </ul>
          </div>

          {/* IH#2: Explain costs */}
          {/* <div className="requirements-note" style={{
            marginTop: 'var(--spacing-lg)',
            padding: 'var(--spacing-md)',
            background: 'var(--warning-color)',
            color: 'white',
            borderRadius: 'var(--border-radius-md)',
            fontSize: 'var(--font-size-sm)'
          }}>
            <strong>⚠️ Next Step:</strong> After uploading, you'll need to verify and add details like store name, amount, date, and category. This ensures your records are complete for HSA/FSA documentation.
          </div> */}
        </div>
      </div>
    </div>
  );
}

export default ReceiptUpload;
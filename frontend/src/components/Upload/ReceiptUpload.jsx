import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';

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
  const OCR_SERVICE_URL = 'http://localhost:5002';

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
    setProgress(10);

    try {
      const imageFormData = new FormData();
      imageFormData.append('image', selectedFile);

      const imageUploadResponse = await fetch(`${IMAGE_SERVICE_URL}/upload`, {
        method: 'POST',
        body: imageFormData
      });

      if (!imageUploadResponse.ok) {
        throw new Error('Failed to upload image to image service');
      }

      const imageData = await imageUploadResponse.json();
      const imageId = imageData.id;
      console.log('Image uploaded successfully, ID:', imageId);

      setProgress(40);
      const ocrResponse = await fetch(`${OCR_SERVICE_URL}/ocr/extract-by-id`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          image_id: imageId
        })
      });

      setProgress(80);

      let ocrData = null;
      if (ocrResponse.ok) {
        const ocrResult = await ocrResponse.json();
        if (ocrResult.success && ocrResult.data && ocrResult.data.text) {
          console.log('OCR successful, extracted text length:', ocrResult.data.text.length);

          ocrData = parseOcrText(ocrResult.data.text);
          console.log('Parsed OCR data:', ocrData);
        } else {
          console.log('OCR completed but no text extracted');
        }
      } else {
        console.log('OCR service failed, proceeding without OCR data');
      }

      setProgress(100);
      navigate('/receipt/new', {
        state: {
          imageId: imageId,
          ocrData: ocrData
        }
      });

    } catch (error) {
      console.error('Upload and process failed:', error);
      setProgress(0);
      onError('Upload failed: ' + error.message);
    } finally {
      setUploading(false);
    }
  };

  const parseOcrText = (text) => {
    if (!text || text.trim().length === 0) {
      return null;
    }

    const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);

    let storeName = '';
    for (const line of lines.slice(0, 3)) {
      if (line.length > 3 && !isAmountLine(line) && !isDateLine(line)) {
        storeName = cleanStoreName(line);
        break;
      }
    }

    let amount = null;
    const amountPatterns = [
      /total[:\s]*\$?([0-9]+\.?[0-9]*)/i,
      /amount[:\s]*\$?([0-9]+\.?[0-9]*)/i,
      /\$([0-9]+\.[0-9]{2})/g
    ];

    for (const pattern of amountPatterns) {
      const match = text.match(pattern);
      if (match) {
        const extractedAmount = parseFloat(match[1] || match[0].replace('$', ''));
        if (!isNaN(extractedAmount) && extractedAmount > 0 && extractedAmount < 10000) {
          amount = extractedAmount;
          break;
        }
      }
    }

    // Extract date
    let receiptDate = null;
    const datePattern = /(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})/;
    const dateMatch = text.match(datePattern);
    if (dateMatch) {
      const [_, month, day, year] = dateMatch;
      const fullYear = year.length === 2 ? (parseInt(year) > 50 ? '19' + year : '20' + year) : year;
      const date = new Date(fullYear, parseInt(month) - 1, parseInt(day));

      const now = new Date();
      const oneYearAgo = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());

      if (date <= now && date >= oneYearAgo && !isNaN(date.getTime())) {
        receiptDate = date.toISOString().split('T')[0]; // YYYY-MM-DD format
      }
    }

    let suggestedCategory = 'Other';
    if (storeName) {
      const store = storeName.toLowerCase();
      if (store.includes('cvs') || store.includes('walgreens') || store.includes('pharmacy')) {
        suggestedCategory = 'Pharmacy';
      } else if (store.includes('dental') || store.includes('dentist')) {
        suggestedCategory = 'Dental';
      } else if (store.includes('vision') || store.includes('optical') || store.includes('eye')) {
        suggestedCategory = 'Vision';
      } else if (store.includes('clinic') || store.includes('medical') || store.includes('doctor')) {
        suggestedCategory = 'Doctor Visit';
      }
    }

    return {
      store_name: storeName,
      amount: amount,
      receipt_date: receiptDate,
      suggested_category: suggestedCategory,
      raw_text: text
    };
  };

  const isAmountLine = (line) => {
    return /\$[0-9]+\.?[0-9]*/.test(line) || /total|amount|balance/i.test(line);
  };

  const isDateLine = (line) => {
    return /\d{1,2}[/-]\d{1,2}[/-]\d{2,4}/.test(line);
  };

  const cleanStoreName = (name) => {
    return name
      .replace(/[^\w\s&'-]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .split(' ')
      .slice(0, 3)
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  };

  const proceedManually = () => {
    navigate('/receipt/new');
    console.log(user);
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
                 progress < 60 ? 'Processing with OCR...' :
                 progress < 90 ? 'Extracting receipt data...' : 'Almost done...'}
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
                Upload & Process
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
              <li>Upload your receipt image to our secure image service</li>
              <li>Our OCR service automatically reads the text from your receipt</li>
              <li>We extract store name, amount, date, and suggest a category</li>
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
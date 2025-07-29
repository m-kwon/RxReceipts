import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import api from '../../services/api';

function ReceiptForm({ user, onError, isEdit = false }) {
  const [formData, setFormData] = useState({
    store_name: '',
    amount: '',
    receipt_date: new Date().toISOString().split('T')[0],
    category: '',
    description: ''
  });
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [existingReceipt, setExistingReceipt] = useState(null);

  const navigate = useNavigate();
  const { id } = useParams();
  const location = useLocation();

  // Check if this is a new upload that needs editing
  const isNewUpload = location.state?.newUpload;

  useEffect(() => {
    fetchCategories();

    if (isEdit && id) {
      fetchReceiptData();
    }
  }, [isEdit, id]);

  const fetchCategories = async () => {
    try {
      const response = await api.receipts.getCategories();
      setCategories(response.data.categories || []);

      // Set default category if none selected
      if (!formData.category && response.data.categories.length > 0) {
        setFormData(prev => ({
          ...prev,
          category: response.data.categories[0].value
        }));
      }
    } catch (error) {
      console.error('Failed to fetch categories:', error);
      onError('Failed to load categories. Please refresh the page.');
    }
  };

  const fetchReceiptData = async () => {
    if (!id) return;

    try {
      setLoading(true);
      const response = await api.receipts.getById(id);
      const receipt = response.data.receipt;

      setExistingReceipt(receipt);
      setFormData({
        store_name: receipt.store_name || '',
        amount: receipt.amount?.toString() || '',
        receipt_date: receipt.receipt_date || '',
        category: receipt.category || '',
        description: receipt.description || ''
      });
    } catch (error) {
      console.error('Failed to fetch receipt:', error);
      onError('Failed to load receipt data. Please try again.');
      navigate('/receipts');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const validateForm = () => {
    const errors = [];

    if (!formData.store_name.trim()) {
      errors.push('Store/Provider name is required');
    }

    if (!formData.amount || parseFloat(formData.amount) <= 0) {
      errors.push('Amount must be a positive number');
    }

    if (!formData.receipt_date) {
      errors.push('Receipt date is required');
    }

    if (!formData.category) {
      errors.push('Category is required for HSA/FSA compliance');
    }

    // Validate date is not in the future
    const receiptDate = new Date(formData.receipt_date);
    const today = new Date();
    today.setHours(23, 59, 59, 999); // End of today

    if (receiptDate > today) {
      errors.push('Receipt date cannot be in the future');
    }

    if (errors.length > 0) {
      onError(errors.join('. '));
      return false;
    }

    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) return;

    setSaving(true);

    try {
      const receiptData = {
        store_name: formData.store_name.trim(),
        amount: parseFloat(formData.amount),
        receipt_date: formData.receipt_date,
        category: formData.category,
        description: formData.description.trim() || null
      };

      let response;
      if (isEdit && id) {
        // Update existing receipt
        response = await api.receipts.update(id, receiptData);

        // Success message
        const successDiv = document.createElement('div');
        successDiv.style.cssText = `
          position: fixed; top: 70px; left: 50%; transform: translateX(-50%);
          background: var(--success-color); color: white; padding: var(--spacing-md);
          border-radius: var(--border-radius-md); box-shadow: var(--shadow-md);
          z-index: 1000;
        `;
        successDiv.innerHTML = '<span>Receipt updated successfully! ✅</span>';
        document.body.appendChild(successDiv);
        setTimeout(() => successDiv.remove(), 3000);

      } else {
        // Create new receipt
        response = await api.receipts.create(receiptData);

        // Success message
        const successDiv = document.createElement('div');
        successDiv.style.cssText = `
          position: fixed; top: 70px; left: 50%; transform: translateX(-50%);
          background: var(--success-color); color: white; padding: var(--spacing-md);
          border-radius: var(--border-radius-md); box-shadow: var(--shadow-md);
          z-index: 1000;
        `;
        successDiv.innerHTML = '<span>Receipt saved successfully! ✅</span>';
        document.body.appendChild(successDiv);
        setTimeout(() => successDiv.remove(), 3000);
      }

      // Navigate back to receipts list
      setTimeout(() => {
        navigate('/receipts');
      }, 1000);

    } catch (error) {
      console.error('Save failed:', error);
      const errorMessage = error.response?.data?.details ||
                          error.response?.data?.error ||
                          'Failed to save receipt. Please try again.';
      onError(errorMessage);
    } finally {
      setSaving(false);
    }
  };

  // IH#8: Encourage mindful tinkering - warn about unsaved changes
  const handleCancel = () => {
    const hasChanges = isEdit ? (
      formData.store_name !== (existingReceipt?.store_name || '') ||
      formData.amount !== (existingReceipt?.amount?.toString() || '') ||
      formData.receipt_date !== (existingReceipt?.receipt_date || '') ||
      formData.category !== (existingReceipt?.category || '') ||
      formData.description !== (existingReceipt?.description || '')
    ) : (
      formData.store_name ||
      formData.amount ||
      formData.description ||
      formData.receipt_date !== new Date().toISOString().split('T')[0]
    );

    if (hasChanges) {
      if (!window.confirm('You have unsaved changes. Are you sure you want to leave? Your changes will be lost.')) {
        return;
      }
    }

    navigate('/receipts');
  };

  if (loading) {
    return (
      <div className="receipt-form-page">
        <div className="container-sm">
          <div className="loading-container">
            <div className="loading-spinner"></div>
            <p>Loading receipt data...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="receipt-form-page" style={{ padding: 'var(--spacing-xl) 0' }}>
      <div className="container-sm">
        <div className="upload-container">
          {/* Header */}
          <div className="upload-header">
            <h1>
              {isEdit ? 'Edit Receipt' : 'Add Receipt Details'}
            </h1>
            <p>
              {isEdit
                ? 'Update your receipt information'
                : isNewUpload
                  ? 'Please verify and complete the receipt information'
                  : 'Enter your receipt details manually'
              }
            </p>
          </div>

          {/* New Upload Notice */}
          {isNewUpload && (
            <div style={{
              background: 'var(--info-color)',
              color: 'white',
              padding: 'var(--spacing-md)',
              borderRadius: 'var(--border-radius-md)',
              marginBottom: 'var(--spacing-lg)',
              fontSize: 'var(--font-size-sm)'
            }}>
              <strong>Image uploaded successfully!</strong> Please review and complete the details below.
            </div>
          )}

          {/* IH#2: Explain requirements and costs */}
          <div className="form-requirements" style={{
            background: 'var(--light-gray)',
            padding: 'var(--spacing-lg)',
            borderRadius: 'var(--border-radius-md)',
            marginBottom: 'var(--spacing-xl)'
          }}>
            <h3 style={{ marginTop: 0, color: 'var(--text-primary)' }}>Required for HSA/FSA Compliance</h3>
            <p style={{
              fontSize: 'var(--font-size-sm)',
              color: 'var(--text-secondary)',
              margin: 0
            }}>
              Fields marked with <span style={{ color: 'var(--danger-color)' }}>*</span> are required for proper expense documentation and reimbursement claims.
            </p>
          </div>

          {/* Receipt Form */}
          <form onSubmit={handleSubmit} className="receipt-form">
            {/* Store/Provider Name */}
            <div className="form-group">
              <label htmlFor="store_name">
                Store/Provider Name <span className="required">*</span>
              </label>
              <input
                type="text"
                id="store_name"
                name="store_name"
                value={formData.store_name}
                onChange={handleChange}
                placeholder="CVS Pharmacy, Dr. Smith Dental, etc."
                className="form-input"
                required
                autoComplete="organization"
              />
              <small style={{ color: 'var(--text-secondary)', fontSize: 'var(--font-size-xs)' }}>
                The business or healthcare provider name
              </small>
            </div>

            {/* Amount and Date Row */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: 'var(--spacing-lg)'
            }}>
              {/* Amount */}
              <div className="form-group">
                <label htmlFor="amount">
                  Amount <span className="required">*</span>
                </label>
                <input
                  type="number"
                  id="amount"
                  name="amount"
                  value={formData.amount}
                  onChange={handleChange}
                  placeholder="0.00"
                  step="0.01"
                  min="0"
                  className="form-input"
                  required
                />
                <small style={{ color: 'var(--text-secondary)', fontSize: 'var(--font-size-xs)' }}>
                  Total amount paid (USD)
                </small>
              </div>

              {/* Date */}
              <div className="form-group">
                <label htmlFor="receipt_date">
                  Receipt Date <span className="required">*</span>
                </label>
                <input
                  type="date"
                  id="receipt_date"
                  name="receipt_date"
                  value={formData.receipt_date}
                  onChange={handleChange}
                  max={new Date().toISOString().split('T')[0]}
                  className="form-input"
                  required
                />
                <small style={{ color: 'var(--text-secondary)', fontSize: 'var(--font-size-xs)' }}>
                  When the expense occurred
                </small>
              </div>
            </div>

            {/* Category */}
            <div className="form-group">
              <label htmlFor="category">
                Medical Category <span className="required">*</span>
              </label>
              <select
                id="category"
                name="category"
                value={formData.category}
                onChange={handleChange}
                className="form-select"
                required
              >
                <option value="">Select a category...</option>
                {categories.map(cat => (
                  <option key={cat.value} value={cat.value}>
                    {/* {cat.label} {cat.hsa_eligible === true ? '✅' : cat.hsa_eligible === 'varies' ? '⚠️' : ''} */}
                    {cat.label} {cat.hsa_eligible === true ? '' : cat.hsa_eligible === 'varies' ? '' : ''}
                  </option>
                ))}
              </select>
              {/* <small style={{ color: 'var(--text-secondary)', fontSize: 'var(--font-size-xs)' }}>
                ✅ = Generally HSA/FSA eligible • ⚠️ = Eligibility varies • Choose the most specific category
              </small> */}
            </div>

            {/* Description */}
            <div className="form-group">
              <label htmlFor="description">
                Description <span style={{ color: 'var(--text-secondary)' }}>(Optional)</span>
              </label>
              <textarea
                id="description"
                name="description"
                value={formData.description}
                onChange={handleChange}
                placeholder="Additional details about this expense (medication name, procedure, etc.)"
                className="form-textarea"
                rows="3"
              />
              <small style={{ color: 'var(--text-secondary)', fontSize: 'var(--font-size-xs)' }}>
                Optional notes to help you remember this expense
              </small>
            </div>

            {/* Form Actions */}
            <div className="form-actions" style={{
              display: 'flex',
              gap: 'var(--spacing-lg)',
              justifyContent: 'center',
              marginTop: 'var(--spacing-xxl)'
            }}>
              <button
                type="submit"
                disabled={saving}
                className="btn btn-primary btn-lg"
              >
                {saving
                  ? (isEdit ? 'Updating...' : 'Saving...')
                  : (isEdit ? 'Update Receipt' : 'Save Receipt')
                }
              </button>

              <button
                type="button"
                onClick={handleCancel}
                disabled={saving}
                className="btn btn-outline btn-lg"
              >
                Cancel
              </button>
            </div>
          </form>

          {/* Form Tips (IH#6: Provide explicit path) */}
          <div className="form-tips" style={{
            marginTop: 'var(--spacing-xxl)',
            padding: 'var(--spacing-lg)',
            background: 'rgba(39, 174, 96, 0.05)',
            borderRadius: 'var(--border-radius-md)',
            borderLeft: '4px solid var(--secondary-color)'
          }}>
            <h4 style={{ color: 'var(--secondary-color)', marginTop: 0 }}>Tips for Accurate Records</h4>
            <ul style={{
              fontSize: 'var(--font-size-sm)',
              color: 'var(--text-secondary)',
              paddingLeft: 'var(--spacing-lg)',
              margin: 0
            }}>
              <li><strong>Store Name:</strong> Use the exact business name from the receipt</li>
              <li><strong>Amount:</strong> Enter the total amount you paid (after insurance, if applicable)</li>
              <li><strong>Category:</strong> Choose the most specific category for better organization</li>
              <li><strong>Description:</strong> Add details like medication names or procedure types for easier searching</li>
            </ul>
          </div>

          {/* HSA/FSA Info */}
          {/* <div className="hsa-info" style={{
            marginTop: 'var(--spacing-lg)',
            padding: 'var(--spacing-md)',
            background: 'var(--info-color)',
            color: 'white',
            borderRadius: 'var(--border-radius-md)',
            fontSize: 'var(--font-size-sm)'
          }}>
            <strong>ℹHSA/FSA Note:</strong> This receipt will be stored securely and can be included in expense reports for reimbursement. Consult your plan administrator for specific eligibility rules.
          </div> */}
        </div>
      </div>
    </div>
  );
}

export default ReceiptForm;
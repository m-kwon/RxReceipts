import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';

function AllReceipts({ user, onError }) {
  const [receipts, setReceipts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    search: '',
    category: 'all',
    sortBy: 'date',
    sortOrder: 'desc'
  });
  const [categories, setCategories] = useState([]);

  const IMAGE_SERVICE_URL = 'http://localhost:5001';

  useEffect(() => {
    fetchCategories();
    fetchReceipts();
  }, [filters]);

  const fetchCategories = async () => {
    try {
      const response = await api.receipts.getCategories();
      setCategories(response.data.categories || []);
    } catch (error) {
      console.error('Failed to fetch categories:', error);
    }
  };

  const fetchReceipts = async () => {
    try {
      setLoading(true);
      const params = {
        search: filters.search,
        category: filters.category !== 'all' ? filters.category : undefined,
        limit: 50
      };

      const response = await api.receipts.getAll(params);
      let fetchedReceipts = response.data.receipts || [];

      fetchedReceipts.sort((a, b) => {
        let aValue, bValue;

        switch (filters.sortBy) {
          case 'amount':
            aValue = parseFloat(a.amount);
            bValue = parseFloat(b.amount);
            break;
          case 'store':
            aValue = a.store_name.toLowerCase();
            bValue = b.store_name.toLowerCase();
            break;
          case 'category':
            aValue = a.category.toLowerCase();
            bValue = b.category.toLowerCase();
            break;
          case 'date':
          default:
            aValue = new Date(a.receipt_date);
            bValue = new Date(b.receipt_date);
            break;
        }

        if (filters.sortOrder === 'asc') {
          return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
        } else {
          return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
        }
      });

      setReceipts(fetchedReceipts);
    } catch (error) {
      console.error('Failed to fetch receipts:', error);
      onError('Failed to load receipts. Please refresh the page.');
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const getImageUrl = (receipt) => {
    if (receipt.image_id) {
      return `${IMAGE_SERVICE_URL}/image/${receipt.image_id}`;
    }
    if (receipt.legacy_image_url) {
      return `http://localhost:3001${receipt.legacy_image_url}`;
    }
    if (receipt.image_path) {
      return `http://localhost:3001/uploads/${user.id}/${receipt.image_path}`;
    }
    return null;
  };

  const handleDelete = async (receiptId) => {
    if (!window.confirm('Are you sure you want to delete this receipt? This action cannot be undone and you will lose all receipt data.')) {
      return;
    }

    try {
      await api.receipts.delete(receiptId);
      setReceipts(prev => prev.filter(r => r.id !== receiptId));

      const successMessage = document.createElement('div');
      successMessage.className = 'success-banner';
      successMessage.innerHTML = `
        <span>Receipt deleted successfully</span>
        <button onclick="this.parentElement.remove()">×</button>
      `;
      successMessage.style.cssText = `
        background-color: var(--success-color);
        color: white;
        padding: var(--spacing-md);
        position: fixed;
        top: 70px;
        left: 50%;
        transform: translateX(-50%);
        border-radius: var(--border-radius-md);
        box-shadow: var(--shadow-md);
        z-index: 1000;
      `;
      document.body.appendChild(successMessage);
      setTimeout(() => successMessage.remove(), 3000);

    } catch (error) {
      console.error('Failed to delete receipt:', error);
      onError('Failed to delete receipt. Please try again.');
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount || 0);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const totalAmount = receipts.reduce((sum, receipt) => sum + parseFloat(receipt.amount || 0), 0);

  return (
    <div className="receipts-page" style={{ padding: 'var(--spacing-xl) 0' }}>
      <div className="container">
        {/* Page Header */}
        <div className="page-header" style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 'var(--spacing-xl)'
        }}>
          <div>
            <h1>All Receipts</h1>
            <p style={{ color: 'var(--text-secondary)', margin: '0' }}>
              {receipts.length} receipt{receipts.length !== 1 ? 's' : ''} • {formatCurrency(totalAmount)} total
            </p>
          </div>
          <Link to="/upload" className="btn btn-primary">
            Add Receipt
          </Link>
        </div>

        {/* Filters Section */}
        <div className="filters-section">
          <div className="filters-grid">
            {/* Search Input */}
            <div className="form-group" style={{ margin: 0 }}>
              <label htmlFor="search" style={{ fontSize: 'var(--font-size-sm)', marginBottom: 'var(--spacing-xs)' }}>
                Search receipts
              </label>
              <input
                type="text"
                id="search"
                placeholder="Search by store, description, or category..."
                value={filters.search}
                onChange={(e) => handleFilterChange('search', e.target.value)}
                className="search-input"
              />
            </div>

            {/* Category Filter */}
            <div className="form-group" style={{ margin: 0 }}>
              <label htmlFor="category" style={{ fontSize: 'var(--font-size-sm)', marginBottom: 'var(--spacing-xs)' }}>
                Category
              </label>
              <select
                id="category"
                value={filters.category}
                onChange={(e) => handleFilterChange('category', e.target.value)}
                className="form-select"
              >
                <option value="all">All Categories</option>
                {categories.map(cat => (
                  <option key={cat.value} value={cat.value}>
                    {cat.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Sort Options */}
            <div className="form-group" style={{ margin: 0 }}>
              <label htmlFor="sort" style={{ fontSize: 'var(--font-size-sm)', marginBottom: 'var(--spacing-xs)' }}>
                Sort by
              </label>
              <div style={{ display: 'flex', gap: 'var(--spacing-sm)' }}>
                <select
                  id="sort"
                  value={filters.sortBy}
                  onChange={(e) => handleFilterChange('sortBy', e.target.value)}
                  className="form-select"
                  style={{ flex: 1 }}
                >
                  <option value="date">Date</option>
                  <option value="amount">Amount</option>
                  <option value="store">Store Name</option>
                  <option value="category">Category</option>
                </select>
                <button
                  onClick={() => handleFilterChange('sortOrder', filters.sortOrder === 'asc' ? 'desc' : 'asc')}
                  className="btn btn-outline"
                  style={{ padding: 'var(--spacing-sm) var(--spacing-md)' }}
                  title={`Sort ${filters.sortOrder === 'asc' ? 'Descending' : 'Ascending'}`}
                >
                  {filters.sortOrder === 'asc' ? '^' : 'v'}
                </button>
              </div>
            </div>

            {/* Clear Filters */}
            <div style={{ display: 'flex', alignItems: 'end' }}>
              <button
                onClick={() => setFilters({
                  search: '',
                  category: 'all',
                  sortBy: 'date',
                  sortOrder: 'desc'
                })}
                className="btn btn-text"
                style={{ padding: 'var(--spacing-sm)' }}
              >
                Clear Filters
              </button>
            </div>
          </div>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="loading-container">
            <div className="loading-spinner"></div>
            <p>Loading receipts...</p>
          </div>
        )}

        {/* Empty State */}
        {!loading && receipts.length === 0 && (
          <div className="empty-state" style={{
            textAlign: 'center',
            padding: 'var(--spacing-xxl)',
            background: 'white',
            borderRadius: 'var(--border-radius-lg)',
            boxShadow: 'var(--shadow-sm)',
            marginTop: 'var(--spacing-xl)'
          }}>
            <div style={{ fontSize: '4rem', marginBottom: 'var(--spacing-lg)' }}>🔍</div>
            {filters.search || filters.category !== 'all' ? (
              <>
                <h3>No receipts found</h3>
                <p style={{ color: 'var(--text-secondary)', marginBottom: 'var(--spacing-lg)' }}>
                  Try adjusting your search terms or filters.
                </p>
                <button
                  onClick={() => setFilters({
                    search: '',
                    category: 'all',
                    sortBy: 'date',
                    sortOrder: 'desc'
                  })}
                  className="btn btn-outline"
                >
                  Clear All Filters
                </button>
              </>
            ) : (
              <>
                <h3>No receipts yet</h3>
                <p style={{ color: 'var(--text-secondary)', marginBottom: 'var(--spacing-lg)' }}>
                  Start building your healthcare expense history by adding your first receipt.
                </p>
                <Link to="/upload" className="btn btn-primary">
                  Add Your First Receipt
                </Link>
              </>
            )}
          </div>
        )}

        {/* Receipts List */}
        {!loading && receipts.length > 0 && (
          <div className="receipts-grid" style={{ marginTop: 'var(--spacing-xl)' }}>
            {receipts.map((receipt) => {
              const imageUrl = getImageUrl(receipt);

              return (
                <div key={receipt.id} className="receipt-card fade-in">
                  <div className="receipt-thumbnail">
                    {imageUrl ? (
                      <img
                        src={imageUrl}
                        alt={`Receipt from ${receipt.store_name}`}
                        onError={(e) => {
                          e.target.style.display = 'none';
                          e.target.nextSibling.style.display = 'flex';
                        }}
                        style={{
                          width: '100%',
                          height: '100%',
                          objectFit: 'cover',
                          borderRadius: 'var(--border-radius-sm)'
                        }}
                      />
                    ) : null}
                    <div style={{
                      display: imageUrl ? 'none' : 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 'var(--font-size-xl)',
                      color: 'var(--text-muted)'
                    }}>
                      📄
                    </div>
                  </div>

                  <div className="receipt-details">
                    <div className="receipt-store">{receipt.store_name}</div>
                    <div className="receipt-meta">
                      {formatDate(receipt.receipt_date)}
                    </div>
                    <div className="receipt-amount">
                      {formatCurrency(receipt.amount)}
                    </div>
                    <div className="receipt-category">
                      {receipt.category}
                    </div>
                    {receipt.description && (
                      <div style={{
                        fontSize: 'var(--font-size-sm)',
                        color: 'var(--text-secondary)',
                        marginTop: 'var(--spacing-xs)',
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden'
                      }}>
                        {receipt.description}
                      </div>
                    )}
                  </div>

                  {/* Receipt Actions */}
                  <div className="receipt-actions">
                    <Link
                      to={`/receipt/${receipt.id}/edit`}
                      className="btn btn-sm btn-outline"
                      style={{ textDecoration: 'none' }}
                    >
                      Edit
                    </Link>
                    <button
                      onClick={() => handleDelete(receipt.id)}
                      className="btn btn-sm delete-btn"
                      style={{
                        background: 'none',
                        border: '1px solid var(--danger-color)',
                        color: 'var(--danger-color)'
                      }}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Summary Footer */}
        {!loading && receipts.length > 0 && (
          <div className="summary-footer" style={{
            marginTop: 'var(--spacing-xxl)',
            padding: 'var(--spacing-lg)',
            background: 'white',
            borderRadius: 'var(--border-radius-lg)',
            boxShadow: 'var(--shadow-sm)',
            textAlign: 'center'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-around', flexWrap: 'wrap', gap: 'var(--spacing-lg)' }}>
              <div>
                <div style={{ fontSize: 'var(--font-size-xl)', fontWeight: 'bold', color: 'var(--accent-color)' }}>
                  {new Set(receipts.map(r => r.category)).size}
                </div>
                <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)' }}>
                  Categories
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default AllReceipts;
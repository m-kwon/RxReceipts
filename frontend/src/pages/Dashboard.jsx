import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';

function Dashboard({ user, onError }) {
  const [stats, setStats] = useState(null);
  const [recentReceipts, setRecentReceipts] = useState([]);
  const [loading, setLoading] = useState(true);

  const IMAGE_SERVICE_URL = 'http://localhost:5001';

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);

      const [statsResponse, receiptsResponse] = await Promise.all([
        api.receipts.getStats(),
        api.receipts.getAll({ limit: 5 })
      ]);

      setStats(statsResponse.data);
      setRecentReceipts(receiptsResponse.data.receipts || []);

    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
      onError('Failed to load dashboard data. Please refresh the page.');
    } finally {
      setLoading(false);
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

  const getImageUrl = (receipt) => {
    if (receipt.image_id) {
      return `${IMAGE_SERVICE_URL}/image/${receipt.image_id}`;
    }
    if (receipt.image_path) {
      return `http://localhost:3001/uploads/${user.id}/${receipt.image_path}`;
    }
    return null;
  };

  if (loading) {
    return (
      <div className="dashboard">
        <div className="container">
          <div className="loading-container">
            <div className="loading-spinner"></div>
            <p>Loading your dashboard...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard">
      <div className="container">
        {/* Dashboard Header */}
        <div className="dashboard-header">
          <h1 className="dashboard-title">
            Welcome back, {user?.name}!
          </h1>
          <p className="dashboard-subtitle">
            Here's your healthcare expense overview
          </p>
        </div>

        {/* Stats Grid */}
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-number">
              {stats?.total_receipts || 0}
            </div>
            <div className="stat-label">Total Receipts</div>
          </div>

          <div className="stat-card">
            <div className="stat-number">
              {formatCurrency(stats?.total_amount)}
            </div>
            <div className="stat-label">Total Expenses</div>
          </div>

          <div className="stat-card">
            <div className="stat-number">
              {stats?.categories?.length || 0}
            </div>
            <div className="stat-label">Categories Used</div>
          </div>

          <div className="stat-card">
            <div className="stat-number">
              {new Date().getFullYear()}
            </div>
            <div className="stat-label">Current Year</div>
          </div>
        </div>

        {/* Category Breakdown */}
        {stats?.categories && stats.categories.length > 0 && (
          <div className="category-section">
            <h3>Expenses by Category</h3>
            <div className="category-grid" style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: 'var(--spacing-lg)',
              margin: 'var(--spacing-lg) 0'
            }}>
              {stats.categories.map((category, index) => (
                <div key={index} className="category-card" style={{
                  background: 'white',
                  padding: 'var(--spacing-lg)',
                  borderRadius: 'var(--border-radius-lg)',
                  boxShadow: 'var(--shadow-sm)',
                  border: '1px solid var(--border-color)'
                }}>
                  <div style={{
                    fontSize: 'var(--font-size-lg)',
                    fontWeight: 'bold',
                    marginBottom: 'var(--spacing-sm)',
                    color: 'var(--text-primary)'
                  }}>
                    {category.category}
                  </div>
                  <div style={{
                    fontSize: 'var(--font-size-xl)',
                    fontWeight: 'bold',
                    color: 'var(--primary-color)',
                    marginBottom: 'var(--spacing-xs)'
                  }}>
                    {formatCurrency(category.total)}
                  </div>
                  <div style={{
                    fontSize: 'var(--font-size-sm)',
                    color: 'var(--text-secondary)'
                  }}>
                    {category.count} receipt{category.count !== 1 ? 's' : ''}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Quick Actions */}
        <div className="quick-actions">
          <Link to="/upload" className="btn btn-primary btn-lg">
            Add New Receipt
          </Link>
          <Link to="/receipts" className="btn btn-primary btn-lg">
            View All Receipts
          </Link>
          <Link to="/receipt/new" className="btn btn-primary btn-lg">
            Manual Entry
          </Link>
        </div>

        {/* Recent Receipts */}
        <div className="recent-receipts">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3>Recent Receipts</h3>
            {recentReceipts.length > 0 && (
              <Link to="/receipts" className="btn btn-text">
                View All →
              </Link>
            )}
          </div>

          {recentReceipts.length === 0 ? (
            <div className="empty-state" style={{
              textAlign: 'center',
              padding: 'var(--spacing-xxl)',
              background: 'white',
              borderRadius: 'var(--border-radius-lg)',
              boxShadow: 'var(--shadow-sm)'
            }}>
              <div style={{ fontSize: '3rem', marginBottom: 'var(--spacing-lg)' }}>📄</div>
              <h4 style={{ marginBottom: 'var(--spacing-md)' }}>No receipts yet</h4>
              <p style={{ color: 'var(--text-secondary)', marginBottom: 'var(--spacing-lg)' }}>
                Start by adding your first healthcare receipt to track your medical expenses.
              </p>
              <Link to="/upload" className="btn btn-primary">
                Add Your First Receipt
              </Link>
            </div>
          ) : (
            <div className="receipts-list">
              {recentReceipts.map((receipt) => {
                const imageUrl = getImageUrl(receipt);

                return (
                  <div key={receipt.id} className="receipt-card">
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

                    <div className="receipt-actions">
                      <Link
                        to={`/receipt/${receipt.id}/edit`}
                        style={{
                          color: 'var(--primary-color)',
                          textDecoration: 'none',
                          fontSize: 'var(--font-size-sm)'
                        }}
                      >
                        Edit
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default Dashboard;
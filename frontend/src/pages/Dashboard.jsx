import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';

function Dashboard({ user, onError }) {
  const [stats, setStats] = useState(null);
  const [recentReceipts, setRecentReceipts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);

      // Fetch stats and recent receipts in parallel
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

        {/* Stats Grid (IH#3: Summary information) */}
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

        {/* Category Breakdown (if available) */}
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

        {/* Quick Actions (IH#6: Provide explicit path) */}
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

        {/* Recent Receipts (IH#3: Show recent activity, allow drill-down) */}
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
              {recentReceipts.map((receipt) => (
                <div key={receipt.id} className="receipt-card">
                  <div className="receipt-thumbnail">
                    {receipt.image_path ? (
                      <img
                        src={`http://localhost:3001/uploads/${user.id}/${receipt.image_path}`}
                        alt={`Receipt from ${receipt.store_name}`}
                        onError={(e) => {
                          e.target.style.display = 'none';
                          e.target.nextSibling.style.display = 'block';
                        }}
                      />
                    ) : null}
                    <div style={{ display: receipt.image_path ? 'none' : 'block' }}>
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
                        marginTop: 'var(--spacing-xs)'
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
              ))}
            </div>
          )}
        </div>

        {/* Tips Section (IH#1: Explain benefits) */}
        {/* <div className="tips-section" style={{
          background: 'white',
          padding: 'var(--spacing-xl)',
          borderRadius: 'var(--border-radius-lg)',
          boxShadow: 'var(--shadow-sm)',
          marginTop: 'var(--spacing-xxl)'
        }}>
          <h3 style={{ marginBottom: 'var(--spacing-lg)' }}>💡 Tips for Managing Your Receipts</h3>
          <div className="tips-grid" style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
            gap: 'var(--spacing-lg)'
          }}>
            <div className="tip-item">
              <h4>📱 Quick Upload</h4>
              <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)' }}>
                Take photos immediately after purchases for best quality and to avoid losing receipts.
              </p>
            </div>
            <div className="tip-item">
              <h4>🏷️ Proper Categorization</h4>
              <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)' }}>
                Accurate categories help with HSA/FSA compliance and make tax time easier.
              </p>
            </div>
            <div className="tip-item">
              <h4>📊 Regular Reviews</h4>
              <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)' }}>
                Check your expenses monthly to stay on budget and catch any missing receipts.
              </p>
            </div>
          </div>
        </div> */}
      </div>
    </div>
  );
}

export default Dashboard;
import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';

function Navbar({ user, onLogout }) {
  const location = useLocation();
  const [showUserMenu, setShowUserMenu] = useState(false);

  const isActive = (path) => {
    return location.pathname === path;
  };

  // IH#8: Encourage mindful tinkering - confirm logout
  const handleLogout = () => {
    if (window.confirm('Are you sure you want to log out? You can always sign back in to access your receipts.')) {
      onLogout();
    }
  };

  return (
    <nav className="navbar">
      <div className="navbar-content">
        {/* Brand Logo (IH#4: Keep familiar features available) */}
        <Link to="/dashboard" className="navbar-brand">
          RxReceipts
        </Link>

        {/* Navigation Links */}
        <div className="navbar-nav">
          <Link
            to="/dashboard"
            className={`nav-link ${isActive('/dashboard') ? 'active' : ''}`}
          >
            Dashboard
          </Link>

          <Link
            to="/receipts"
            className={`nav-link ${isActive('/receipts') ? 'active' : ''}`}
          >
            All Receipts
          </Link>

          <Link
            to="/upload"
            className={`nav-link ${isActive('/upload') ? 'active' : ''}`}
          >
            Add Receipt
          </Link>

          {/* User Menu */}
          <div className="user-menu" style={{ position: 'relative' }}>
            <button
              className="user-menu-toggle"
              onClick={() => setShowUserMenu(!showUserMenu)}
              style={{
                background: 'none',
                border: 'none',
                padding: 'var(--spacing-sm) var(--spacing-md)',
                borderRadius: 'var(--border-radius-md)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 'var(--spacing-sm)',
                color: 'var(--text-primary)'
              }}
            >
              {user?.name}
              <span style={{ fontSize: '0.8rem' }}>▼</span>
            </button>

            {showUserMenu && (
              <div
                className="user-dropdown"
                style={{
                  position: 'absolute',
                  top: '100%',
                  right: 0,
                  background: 'white',
                  border: '1px solid var(--border-color)',
                  borderRadius: 'var(--border-radius-md)',
                  boxShadow: 'var(--shadow-lg)',
                  minWidth: '180px',
                  zIndex: 1000,
                  marginTop: 'var(--spacing-xs)'
                }}
              >
                <div style={{ padding: 'var(--spacing-md)', borderBottom: '1px solid var(--border-color)' }}>
                  <div style={{ fontWeight: 'bold', fontSize: 'var(--font-size-sm)' }}>
                    {user?.name}
                  </div>
                  <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-secondary)' }}>
                    {user?.email}
                  </div>
                </div>

                <button
                  onClick={handleLogout}
                  style={{
                    width: '100%',
                    padding: 'var(--spacing-md)',
                    background: 'none',
                    border: 'none',
                    textAlign: 'left',
                    cursor: 'pointer',
                    color: 'var(--danger-color)',
                    fontSize: 'var(--font-size-sm)'
                  }}
                  onMouseEnter={(e) => e.target.style.backgroundColor = 'var(--light-gray)'}
                  onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
                >
                  Sign Out
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Close dropdown when clicking outside */}
      {showUserMenu && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 999
          }}
          onClick={() => setShowUserMenu(false)}
        />
      )}
    </nav>
  );
}

export default Navbar;
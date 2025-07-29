import React from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';

function Welcome() {
  // Demo login handler (IH#7: Provide different approaches)
  const handleDemoLogin = async () => {
    try {
      const response = await api.auth.demoLogin();
      const { token } = response.data;

      localStorage.setItem('rxreceipts_token', token);
      api.setAuthToken(token);

      // Redirect to dashboard
      window.location.href = '/dashboard';
    } catch (error) {
      console.error('Demo login failed:', error);
      alert('Demo login failed. Please try again.');
    }
  };

  return (
    <div className="welcome-page">
      {/* Hero Section */}
      <div className="hero-section">
        <div className="hero-content">
          <h1 className="hero-title">RxReceipts</h1>
          <p className="hero-subtitle">
            Your Healthcare Receipt Management Solution
          </p>

          {/* IH#1: Explain benefits of using the app */}
          <div className="benefits-section">
            <h2>Why Use RxReceipts?</h2>
            <div className="benefits-grid">
              <div className="benefit-card">
                {/* <div className="benefit-icon">📱</div> */}
                <h3>Easy Upload</h3>
                <p>Take photos of receipts or upload images instantly from your phone or computer</p>
              </div>

              <div className="benefit-card">
                {/* <div className="benefit-icon">🏷️</div> */}
                <h3>Smart Organization</h3>
                <p>Automatically categorize expenses by pharmacy, dental, vision, and more</p>
              </div>

              <div className="benefit-card">
                {/* <div className="benefit-icon">💰</div> */}
                <h3>HSA/FSA Ready</h3>
                <p>Generate compliant reports for easy reimbursement from your health savings accounts</p>
              </div>

              <div className="benefit-card">
                {/* <div className="benefit-icon">🔒</div> */}
                <h3>Secure & Private</h3>
                <p>Your medical and financial data is encrypted and stored securely</p>
              </div>
            </div>
          </div>

          {/* Call to Action Buttons */}
          <div className="cta-section">
            <h3>Get Started Today</h3>
            <div className="cta-buttons">
              <Link to="/register" className="btn btn-primary">
                Create Account
              </Link>
              <Link to="/login" className="btn btn-primary">
                Sign In
              </Link>
              <Link onClick={handleDemoLogin} className="btn btn-primary">
                Try Demo
              </Link>
            </div>

            {/* IH#2: Explain costs/requirements */}
            <div className="signup-info">
              <p className="info-text">
                <strong>Account creation takes less than 2 minutes.</strong><br/>
                We'll need your email, a secure password, and your name to get started.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="features-section">
        <div className="container">
          <h2>How It Works</h2>

          {/* IH#6: Provide explicit path through tasks */}
          <div className="steps-container">
            <div className="step">
              <div className="step-number">1</div>
              <h3>Upload Your Receipt</h3>
              <p>Take a photo with your phone camera, upload an existing image, or enter details manually</p>
            </div>

            <div className="step">
              <div className="step-number">2</div>
              <h3>Categorize & Review</h3>
              <p>Select the appropriate medical category (pharmacy, dental, vision, etc.) and add any notes</p>
            </div>

            <div className="step">
              <div className="step-number">3</div>
              <h3>Track & Export</h3>
              <p>View all your expenses in one place and generate reports for HSA/FSA reimbursement</p>
            </div>
          </div>
        </div>
      </div>

      {/* Trust & Security Section */}
      {/* <div className="trust-section">
        <div className="container">
          <h2>Your Data is Safe</h2>
          <div className="trust-features">
            <div className="trust-item">
              <span className="trust-icon">🔐</span>
              <h4>Bank-Level Security</h4>
              <p>All data is encrypted in transit and at rest</p>
            </div>

            <div className="trust-item">
              <span className="trust-icon">🏥</span>
              <h4>HIPAA Compliant</h4>
              <p>Designed with healthcare privacy regulations in mind</p>
            </div>

            <div className="trust-item">
              <span className="trust-icon">📱</span>
              <h4>Works Everywhere</h4>
              <p>Access your receipts from any device, anywhere</p>
            </div>
          </div>
        </div>
      </div> */}

      {/* Footer */}
      <footer className="welcome-footer">
        <div className="container">
          <p>&copy; 2024 RxReceipts</p>
          <div className="footer-links">
            <Link to="/login">Sign In</Link>
            <Link to="/register">Create Account</Link>
            <Link onClick={handleDemoLogin} className="demo-link">
              Try Demo
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default Welcome;
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';

function Register({ onLogin, onError }) {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const validateForm = () => {
    if (!formData.name.trim()) {
      onError('Name is required');
      return false;
    }

    if (!formData.email.trim()) {
      onError('Email is required');
      return false;
    }

    if (formData.password.length < 6) {
      onError('Password must be at least 6 characters long');
      return false;
    }

    if (formData.password !== formData.confirmPassword) {
      onError('Passwords do not match');
      return false;
    }

    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) return;

    setLoading(true);

    try {
      const response = await api.auth.register({
        name: formData.name.trim(),
        email: formData.email.trim(),
        password: formData.password
      });

      const { user, token, message } = response.data;

      onLogin(user, token);

      // Show success message
      if (message) {
        console.log('Registration success:', message);
      }

    } catch (error) {
      console.error('Registration error:', error);
      const errorMessage = error.response?.data?.details ||
                          error.response?.data?.error ||
                          'Registration failed. Please try again.';
      onError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // Demo login handler (IH#7: Different approaches)
  const handleDemoLogin = async () => {
    setLoading(true);
    try {
      const response = await api.auth.demoLogin();
      const { user, token } = response.data;
      onLogin(user, token);
    } catch (error) {
      console.error('Demo login error:', error);
      onError('Demo login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-container">
        <div className="auth-header">
          <h1>Create Your RxReceipts Account</h1>
          <p>Join thousands managing their healthcare expenses</p>
        </div>

        <form onSubmit={handleSubmit} className="auth-form">
          {/* Name Field */}
          <div className="form-group">
            <label htmlFor="name">
              Full Name <span className="required">*</span>
            </label>
            <input
              type="text"
              id="name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              required
              placeholder="John Doe"
              autoComplete="name"
              className="form-input"
            />
          </div>

          {/* Email Field */}
          <div className="form-group">
            <label htmlFor="email">
              Email Address <span className="required">*</span>
            </label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              required
              placeholder="your@email.com"
              autoComplete="email"
              className="form-input"
            />
          </div>

          {/* Password Field */}
          <div className="form-group">
            <label htmlFor="password">
              Password <span className="required">*</span>
            </label>
            <div className="password-input-container">
              <input
                type={showPassword ? 'text' : 'password'}
                id="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                required
                placeholder="At least 6 characters"
                autoComplete="new-password"
                className="form-input"
              />
              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? '(o_o)' : '(-_-)'}
              </button>
            </div>
            <small style={{ color: 'var(--text-secondary)', fontSize: 'var(--font-size-xs)' }}>
              Must be at least 6 characters for security
            </small>
          </div>

          {/* Confirm Password Field */}
          <div className="form-group">
            <label htmlFor="confirmPassword">
              Confirm Password <span className="required">*</span>
            </label>
            <div className="password-input-container">
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                id="confirmPassword"
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleChange}
                required
                placeholder="Repeat your password"
                autoComplete="new-password"
                className="form-input"
              />
              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
              >
                {showConfirmPassword ? '(o_o)' : '(-_-)'}
              </button>
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading || !formData.name || !formData.email || !formData.password || !formData.confirmPassword}
            className="btn btn-primary btn-full"
          >
            {loading ? 'Creating Account...' : 'Create Account'}
          </button>
        </form>

        {/* IH#2: Explain benefits and time investment */}
        <div className="signup-benefits">
          <div style={{
            background: 'var(--light-gray)',
            padding: 'var(--spacing-md)',
            borderRadius: 'var(--border-radius-md)',
            marginBottom: 'var(--spacing-lg)'
          }}>
            <p className="benefits-text">
              <strong>Takes less than 2 minutes</strong>
            </p>
            <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)', margin: '0' }}>
              Once registered, you'll be able to:
            </p>
            <ul className="benefits-list" style={{ marginTop: 'var(--spacing-sm)' }}>
              <li>✅ Securely store unlimited receipt photos</li>
              <li>✅ Auto-categorize medical expenses</li>
              <li>✅ Generate HSA/FSA compliant reports</li>
              <li>✅ Access your data from any device</li>
            </ul>
          </div>
        </div>

        {/* Alternative Options (IH#7: Multiple approaches) */}
        <div className="auth-alternatives">
          <div className="divider">
            <span>or</span>
          </div>

          <button
            onClick={handleDemoLogin}
            disabled={loading}
            className="btn btn-outline btn-full"
          >
            {loading ? 'Loading Demo...' : 'Try Demo First'}
          </button>

          <div className="demo-info">
            <small>
              Explore all features with sample data before creating an account
            </small>
          </div>
        </div>

        {/* Login Link */}
        <div className="auth-footer">
          <p>
            Already have an account?{' '}
            <Link to="/login" className="auth-link">
              Sign in here
            </Link>
          </p>
        </div>

        {/* Back to Welcome */}
        <div className="back-link">
          <Link to="/" className="btn btn-text">
            ← Back to Welcome
          </Link>
        </div>
      </div>
    </div>
  );
}

export default Register;
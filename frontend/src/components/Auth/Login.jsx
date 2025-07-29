import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';

function Login({ onLogin, onError }) {
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await api.auth.login(formData);
      const { user, token, message } = response.data;

      onLogin(user, token);

      // Show success message
      if (message) {
        // You could show a toast notification here
        console.log('Login success:', message);
      }

    } catch (error) {
      console.error('Login error:', error);
      const errorMessage = error.response?.data?.details ||
                          error.response?.data?.error ||
                          'Login failed. Please try again.';
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
          <h1>Sign In to RxReceipts</h1>
          <p>Access your healthcare receipt collection</p>
        </div>

        <form onSubmit={handleSubmit} className="auth-form">
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
                placeholder="Enter your password"
                autoComplete="current-password"
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
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading || !formData.email || !formData.password}
            className="btn btn-primary btn-full"
          >
            {loading ? 'Signing In...' : 'Sign In'}
          </button>
        </form>

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
            {loading ? 'Loading Demo...' : 'Try Demo Account'}
          </button>

          <div className="demo-info">
            <small>
              Demo account includes sample receipts to explore all features
            </small>
          </div>
        </div>

        {/* Registration Link */}
        <div className="auth-footer">
          <p>
            Don't have an account?{' '}
            <Link to="/register" className="auth-link">
              Create one here
            </Link>
          </p>

          {/* IH#2: Explain benefits/costs */}
          <div className="signup-benefits">
            <p className="benefits-text">
              <strong>Creating an account gives you:</strong>
            </p>
            <ul className="benefits-list">
              <li>✅ Secure cloud storage for all receipts</li>
              <li>✅ Automatic categorization and organization</li>
              <li>✅ HSA/FSA compliant expense reports</li>
              <li>✅ Access from any device, anywhere</li>
            </ul>
          </div>
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

export default Login;
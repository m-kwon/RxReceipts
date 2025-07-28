import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import './App.css';
import Welcome from './pages/Welcome';
import Login from './components/Auth/Login';
import Register from './components/Auth/Register';
import Dashboard from './pages/Dashboard';
import AllReceipts from './pages/AllReceipts';
import ReceiptUpload from './components/Upload/ReceiptUpload';
import ReceiptForm from './components/Upload/ReceiptForm';
import Navbar from './components/Layout/Navbar';
import api from './services/api';

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const token = localStorage.getItem('rxreceipts_token');
    if (token) {
      api.setAuthToken(token);
      fetchUserInfo();
    } else {
      setLoading(false);
    }
  }, []);

  const fetchUserInfo = async () => {
    try {
      const response = await api.get('/auth/me');
      setUser(response.data.user);
    } catch (error) {
      console.error('Failed to fetch user info:', error);
      // Token might be expired
      localStorage.removeItem('rxreceipts_token');
      api.clearAuthToken();
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = (userData, token) => {
    localStorage.setItem('rxreceipts_token', token);
    api.setAuthToken(token);
    setUser(userData);
    setError(null);
  };

  const handleLogout = () => {
    localStorage.removeItem('rxreceipts_token');
    api.clearAuthToken();
    setUser(null);
    setError(null);
  };

  const handleError = (errorMessage) => {
    setError(errorMessage);
    // Clear error after 5 seconds
    setTimeout(() => setError(null), 5000);
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>Loading RxReceipts...</p>
      </div>
    );
  }

  return (
    <Router>
      <div className="app">
        {/* Global Error Display */}
        {error && (
          <div className="error-banner">
            <span>{error}</span>
            <button onClick={() => setError(null)}>×</button>
          </div>
        )}

        {/* Navigation - only show when user is logged in (IH#4: Keep familiar features available) */}
        {user && <Navbar user={user} onLogout={handleLogout} />}

        <main className="main-content">
          <Routes>
            {/* Public routes */}
            <Route
              path="/"
              element={user ? <Navigate to="/dashboard" /> : <Welcome />}
            />
            <Route
              path="/login"
              element={
                user ? (
                  <Navigate to="/dashboard" />
                ) : (
                  <Login onLogin={handleLogin} onError={handleError} />
                )
              }
            />
            <Route
              path="/register"
              element={
                user ? (
                  <Navigate to="/dashboard" />
                ) : (
                  <Register onLogin={handleLogin} onError={handleError} />
                )
              }
            />

            {/* Protected routes */}
            <Route
              path="/dashboard"
              element={
                user ? (
                  <Dashboard user={user} onError={handleError} />
                ) : (
                  <Navigate to="/" />
                )
              }
            />
            <Route
              path="/receipts"
              element={
                user ? (
                  <AllReceipts user={user} onError={handleError} />
                ) : (
                  <Navigate to="/" />
                )
              }
            />
            <Route
              path="/upload"
              element={
                user ? (
                  <ReceiptUpload user={user} onError={handleError} />
                ) : (
                  <Navigate to="/" />
                )
              }
            />
            <Route
              path="/receipt/new"
              element={
                user ? (
                  <ReceiptForm user={user} onError={handleError} />
                ) : (
                  <Navigate to="/" />
                )
              }
            />
            <Route
              path="/receipt/:id/edit"
              element={
                user ? (
                  <ReceiptForm user={user} onError={handleError} isEdit={true} />
                ) : (
                  <Navigate to="/" />
                )
              }
            />

            {/* Catch all route */}
            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;
const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { getUserByEmail, createUser, getUserById } = require('../models/database');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'rxreceipts-secret-key-change-in-production';

// Register new user
router.post('/register', async (req, res) => {
  try {
    const { email, password, name } = req.body;

    // Validation (IH#2: Explain costs - show what's required)
    if (!email || !password || !name) {
      return res.status(400).json({
        error: 'Missing required fields',
        details: 'Email, password, and name are required to create your secure account'
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        error: 'Password too short',
        details: 'Password must be at least 6 characters for account security'
      });
    }

    // Check if user already exists
    const existingUser = await getUserByEmail(email);
    if (existingUser) {
      return res.status(409).json({
        error: 'Account already exists',
        details: 'An account with this email already exists. Try logging in instead.'
      });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const user = await createUser(email, hashedPassword, name);

    // Generate JWT token
    const token = jwt.sign(
      { userId: user.id, email: user.email },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.status(201).json({
      message: 'Account created successfully! Welcome to RxReceipts.',
      user: {
        id: user.id,
        email: user.email,
        name: user.name
      },
      token
    });

  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({
      error: 'Registration failed',
      details: 'Unable to create account. Please try again.'
    });
  }
});

// Login user
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validation (IH#6: Provide explicit path)
    if (!email || !password) {
      return res.status(400).json({
        error: 'Missing login credentials',
        details: 'Please enter both email and password to sign in'
      });
    }

    // Find user
    const user = await getUserByEmail(email);
    if (!user) {
      return res.status(401).json({
        error: 'Invalid credentials',
        details: 'No account found with this email address'
      });
    }

    // Check password
    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return res.status(401).json({
        error: 'Invalid credentials',
        details: 'Incorrect password. Please try again.'
      });
    }

    // Generate JWT token
    const token = jwt.sign(
      { userId: user.id, email: user.email },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      message: `Welcome back, ${user.name}!`,
      user: {
        id: user.id,
        email: user.email,
        name: user.name
      },
      token
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      error: 'Login failed',
      details: 'Unable to sign in. Please try again.'
    });
  }
});

// Get current user info (protected route)
router.get('/me', authenticateToken, async (req, res) => {
  try {
    const user = await getUserById(req.user.userId);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        created_at: user.created_at
      }
    });

  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Unable to fetch user information' });
  }
});

// Demo login (IH#7: Provide different approaches)
router.post('/demo', async (req, res) => {
  try {
    // Get demo user
    const demoUser = await getUserByEmail('demo@rxreceipts.com');

    if (!demoUser) {
      return res.status(404).json({
        error: 'Demo account not available',
        details: 'The demo account was not found. Please create a new account.'
      });
    }

    // Generate JWT token
    const token = jwt.sign(
      { userId: demoUser.id, email: demoUser.email },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      message: 'Welcome to the RxReceipts demo! Explore with sample data.',
      user: {
        id: demoUser.id,
        email: demoUser.email,
        name: demoUser.name
      },
      token,
      demo: true
    });

  } catch (error) {
    console.error('Demo login error:', error);
    res.status(500).json({
      error: 'Demo login failed',
      details: 'Unable to access demo account. Please try again.'
    });
  }
});

// Logout (client-side token removal, but we can track it server-side later)
router.post('/logout', authenticateToken, (req, res) => {
  res.json({
    message: 'Logged out successfully. Your receipt data is safely stored.',
    action: 'Please remove the token from your device storage'
  });
});

module.exports = router;
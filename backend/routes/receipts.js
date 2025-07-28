const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const { authenticateToken } = require('../middleware/auth');
const {
  createReceipt,
  getReceiptsByUser,
  getReceiptById,
  updateReceipt,
  deleteReceipt,
  getReceiptStats
} = require('../models/database');

const router = express.Router();

// Configure multer for file uploads (IH#7: Multiple approaches)
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../uploads', req.user.userId.toString());
    try {
      await fs.mkdir(uploadDir, { recursive: true });
      cb(null, uploadDir);
    } catch (error) {
      cb(error);
    }
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'receipt-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    // Accept images only
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed for receipt uploads'));
    }
  }
});

// Get all receipts for user (IH#3: Let users gather as much info as they want)
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { page = 1, limit = 20, category, search } = req.query;
    const offset = (page - 1) * limit;

    let receipts = await getReceiptsByUser(req.user.userId, parseInt(limit), offset);

    // Filter by category if specified
    if (category && category !== 'all') {
      receipts = receipts.filter(receipt =>
        receipt.category.toLowerCase() === category.toLowerCase()
      );
    }

    // Search functionality (IH#3: Users can find specific info)
    if (search) {
      const searchTerm = search.toLowerCase();
      receipts = receipts.filter(receipt =>
        receipt.store_name.toLowerCase().includes(searchTerm) ||
        receipt.description?.toLowerCase().includes(searchTerm) ||
        receipt.category.toLowerCase().includes(searchTerm)
      );
    }

    res.json({
      receipts,
      pagination: {
        current_page: parseInt(page),
        per_page: parseInt(limit),
        total: receipts.length
      }
    });

  } catch (error) {
    console.error('Get receipts error:', error);
    res.status(500).json({
      error: 'Unable to fetch receipts',
      details: 'Please try refreshing the page'
    });
  }
});

// Get receipt statistics (IH#3: Summary information)
router.get('/stats', authenticateToken, async (req, res) => {
  try {
    const stats = await getReceiptStats(req.user.userId);
    res.json(stats);
  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({
      error: 'Unable to fetch statistics',
      details: 'Please try again later'
    });
  }
});

// Get single receipt by ID
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const receipt = await getReceiptById(req.params.id, req.user.userId);

    if (!receipt) {
      return res.status(404).json({
        error: 'Receipt not found',
        details: 'This receipt may have been deleted or you may not have permission to view it'
      });
    }

    res.json({ receipt });

  } catch (error) {
    console.error('Get receipt error:', error);
    res.status(500).json({
      error: 'Unable to fetch receipt',
      details: 'Please try again'
    });
  }
});

// Create new receipt (IH#7: Multiple input methods)
router.post('/', authenticateToken, upload.single('image'), async (req, res) => {
  try {
    const { store_name, amount, receipt_date, category, description } = req.body;

    // Validation (IH#2: Explain costs/requirements)
    if (!store_name || !amount || !receipt_date || !category) {
      return res.status(400).json({
        error: 'Missing required fields',
        details: 'Store name, amount, date, and category are required for HSA/FSA documentation',
        required_fields: ['store_name', 'amount', 'receipt_date', 'category']
      });
    }

    // Validate amount format
    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      return res.status(400).json({
        error: 'Invalid amount',
        details: 'Amount must be a positive number (e.g., 25.99)'
      });
    }

    // Validate date format
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(receipt_date)) {
      return res.status(400).json({
        error: 'Invalid date format',
        details: 'Date must be in YYYY-MM-DD format'
      });
    }

    // Validate category
    const validCategories = ['Pharmacy', 'Dental', 'Vision', 'Medical Device', 'Doctor Visit', 'Other'];
    if (!validCategories.includes(category)) {
      return res.status(400).json({
        error: 'Invalid category',
        details: `Category must be one of: ${validCategories.join(', ')}`
      });
    }

    const receiptData = {
      user_id: req.user.userId,
      store_name: store_name.trim(),
      amount: parsedAmount,
      receipt_date,
      category,
      description: description?.trim() || null,
      image_path: req.file ? req.file.filename : null
    };

    const receipt = await createReceipt(receiptData);

    res.status(201).json({
      message: 'Receipt saved successfully!',
      receipt: {
        id: receipt.id,
        ...receiptData,
        image_url: req.file ? `/uploads/${req.user.userId}/${req.file.filename}` : null
      }
    });

  } catch (error) {
    console.error('Create receipt error:', error);

    // Clean up uploaded file if database save failed
    if (req.file) {
      try {
        await fs.unlink(req.file.path);
      } catch (unlinkError) {
        console.error('Failed to clean up uploaded file:', unlinkError);
      }
    }

    res.status(500).json({
      error: 'Failed to save receipt',
      details: 'Please check your information and try again'
    });
  }
});

// Update receipt (IH#5: Make undo/redo available)
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const receiptId = req.params.id;
    const { store_name, amount, receipt_date, category, description } = req.body;

    // Check if receipt exists and belongs to user
    const existingReceipt = await getReceiptById(receiptId, req.user.userId);
    if (!existingReceipt) {
      return res.status(404).json({
        error: 'Receipt not found',
        details: 'This receipt may have been deleted or you may not have permission to edit it'
      });
    }

    // Build update object with only provided fields
    const updates = {};
    if (store_name !== undefined) updates.store_name = store_name.trim();
    if (amount !== undefined) {
      const parsedAmount = parseFloat(amount);
      if (isNaN(parsedAmount) || parsedAmount <= 0) {
        return res.status(400).json({
          error: 'Invalid amount',
          details: 'Amount must be a positive number'
        });
      }
      updates.amount = parsedAmount;
    }
    if (receipt_date !== undefined) updates.receipt_date = receipt_date;
    if (category !== undefined) updates.category = category;
    if (description !== undefined) updates.description = description?.trim() || null;

    const result = await updateReceipt(receiptId, req.user.userId, updates);

    if (result.changes === 0) {
      return res.status(404).json({ error: 'Receipt not found or no changes made' });
    }

    res.json({
      message: 'Receipt updated successfully!',
      receipt_id: receiptId
    });

  } catch (error) {
    console.error('Update receipt error:', error);
    res.status(500).json({
      error: 'Failed to update receipt',
      details: 'Please try again'
    });
  }
});

// Delete receipt (IH#8: Encourage mindful tinkering with confirmation)
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const receiptId = req.params.id;

    // Get receipt info before deletion (for cleanup)
    const receipt = await getReceiptById(receiptId, req.user.userId);
    if (!receipt) {
      return res.status(404).json({
        error: 'Receipt not found',
        details: 'This receipt may have already been deleted'
      });
    }

    // Delete from database
    const result = await deleteReceipt(receiptId, req.user.userId);

    if (result.changes === 0) {
      return res.status(404).json({ error: 'Receipt not found' });
    }

    // Clean up image file if it exists
    if (receipt.image_path) {
      try {
        const imagePath = path.join(__dirname, '../uploads', req.user.userId.toString(), receipt.image_path);
        await fs.unlink(imagePath);
      } catch (fileError) {
        console.error('Failed to delete image file:', fileError);
        // Don't fail the request if file cleanup fails
      }
    }

    res.json({
      message: 'Receipt deleted successfully',
      warning: 'This action cannot be undone. You will need to re-enter the receipt if you need it again.'
    });

  } catch (error) {
    console.error('Delete receipt error:', error);
    res.status(500).json({
      error: 'Failed to delete receipt',
      details: 'Please try again'
    });
  }
});

// Get categories list (IH#6: Provide explicit path)
router.get('/meta/categories', authenticateToken, (req, res) => {
  const categories = [
    {
      value: 'Pharmacy',
      label: 'Pharmacy',
      description: 'Prescription medications, over-the-counter drugs',
      hsa_eligible: true
    },
    {
      value: 'Dental',
      label: 'Dental',
      description: 'Dental care, cleanings, procedures',
      hsa_eligible: true
    },
    {
      value: 'Vision',
      label: 'Vision',
      description: 'Eye exams, glasses, contacts, vision care',
      hsa_eligible: true
    },
    {
      value: 'Medical Device',
      label: 'Medical Device',
      description: 'Medical equipment, supplies, devices',
      hsa_eligible: true
    },
    {
      value: 'Doctor Visit',
      label: 'Doctor Visit',
      description: 'Medical consultations, checkups, specialist visits',
      hsa_eligible: true
    },
    {
      value: 'Other',
      label: 'Other Medical',
      description: 'Other qualifying medical expenses',
      hsa_eligible: 'varies'
    }
  ];

  res.json({
    categories,
    note: 'HSA/FSA eligibility may vary. Consult your plan administrator for specific rules.'
  });
});

module.exports = router;
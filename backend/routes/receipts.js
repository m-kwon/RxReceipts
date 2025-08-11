const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const axios = require('axios');
const { authenticateToken } = require('../middleware/auth');
const {
  createReceipt,
  getReceiptsByUser,
  getReceiptById,
  updateReceipt,
  deleteReceipt,
  getReceiptStats
} = require('../models/database');
const ocrService = require('../services/ocrService');

const router = express.Router();

const IMAGE_SERVICE_URL = process.env.IMAGE_SERVICE_URL || 'http://localhost:5001';

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
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed for receipt uploads'));
    }
  }
});

async function verifyImageExists(imageId) {
  try {
    const response = await axios.head(`${IMAGE_SERVICE_URL}/image/${imageId}`);
    return response.status === 200;
  } catch (error) {
    return false;
  }
}

function getImageUrl(imageId) {
  return imageId ? `${IMAGE_SERVICE_URL}/image/${imageId}` : null;
}

router.get('/', authenticateToken, async (req, res) => {
  try {
    const { page = 1, limit = 20, category, search } = req.query;
    const offset = (page - 1) * limit;

    let receipts = await getReceiptsByUser(req.user.userId, parseInt(limit), offset);

    if (category && category !== 'all') {
      receipts = receipts.filter(receipt =>
        receipt.category.toLowerCase() === category.toLowerCase()
      );
    }

    if (search) {
      const searchTerm = search.toLowerCase();
      receipts = receipts.filter(receipt =>
        receipt.store_name.toLowerCase().includes(searchTerm) ||
        receipt.description?.toLowerCase().includes(searchTerm) ||
        receipt.category.toLowerCase().includes(searchTerm)
      );
    }

    // Add image URLs to receipts
    receipts = receipts.map(receipt => ({
      ...receipt,
      image_url: getImageUrl(receipt.image_id),
      legacy_image_path: receipt.image_path
    }));

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

router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const receipt = await getReceiptById(req.params.id, req.user.userId);

    if (!receipt) {
      return res.status(404).json({
        error: 'Receipt not found',
        details: 'This receipt may have been deleted or you may not have permission to view it'
      });
    }

    receipt.image_url = getImageUrl(receipt.image_id);

    res.json({ receipt });

  } catch (error) {
    console.error('Get receipt error:', error);
    res.status(500).json({
      error: 'Unable to fetch receipt',
      details: 'Please try again'
    });
  }
});

// Create new receipt
router.post('/', authenticateToken, upload.single('image'), async (req, res) => {
  try {
    const { store_name, amount, receipt_date, category, description, image_id } = req.body;

    if (!store_name || !amount || !receipt_date || !category) {
      return res.status(400).json({
        error: 'Missing required fields',
        details: 'Store name, amount, date, and category are required for HSA/FSA documentation',
        required_fields: ['store_name', 'amount', 'receipt_date', 'category']
      });
    }

    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      return res.status(400).json({
        error: 'Invalid amount',
        details: 'Amount must be a positive number (e.g., 25.99)'
      });
    }

    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(receipt_date)) {
      return res.status(400).json({
        error: 'Invalid date format',
        details: 'Date must be in YYYY-MM-DD format'
      });
    }

    const validCategories = ['Pharmacy', 'Dental', 'Vision', 'Medical Device', 'Doctor Visit', 'Other'];
    if (!validCategories.includes(category)) {
      return res.status(400).json({
        error: 'Invalid category',
        details: `Category must be one of: ${validCategories.join(', ')}`
      });
    }

    if (image_id) {
      const imageExists = await verifyImageExists(image_id);
      if (!imageExists) {
        return res.status(400).json({
          error: 'Invalid image ID',
          details: 'The provided image ID does not exist in the image service'
        });
      }
    }

    const receiptData = {
      user_id: req.user.userId,
      store_name: store_name.trim(),
      amount: parsedAmount,
      receipt_date,
      category,
      description: description?.trim() || null,
      image_id: image_id || null,
      image_path: req.file ? req.file.filename : null
    };

    const receipt = await createReceipt(receiptData);

    res.status(201).json({
      message: 'Receipt saved successfully!',
      receipt: {
        id: receipt.id,
        ...receiptData,
        image_url: getImageUrl(image_id),
        legacy_image_url: req.file ? `/uploads/${req.user.userId}/${req.file.filename}` : null
      }
    });

  } catch (error) {
    console.error('Create receipt error:', error);

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

// Update receipt
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const receiptId = req.params.id;
    const { store_name, amount, receipt_date, category, description, image_id } = req.body;

    const existingReceipt = await getReceiptById(receiptId, req.user.userId);
    if (!existingReceipt) {
      return res.status(404).json({
        error: 'Receipt not found',
        details: 'This receipt may have been deleted or you may not have permission to edit it'
      });
    }

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

    if (image_id !== undefined) {
      if (image_id && await verifyImageExists(image_id)) {
        updates.image_id = image_id;
      } else if (image_id === null || image_id === '') {
        updates.image_id = null;
      } else {
        return res.status(400).json({
          error: 'Invalid image ID',
          details: 'The provided image ID does not exist in the image service'
        });
      }
    }

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

// Delete receipt
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const receiptId = req.params.id;

    const receipt = await getReceiptById(receiptId, req.user.userId);
    if (!receipt) {
      return res.status(404).json({
        error: 'Receipt not found',
        details: 'This receipt may have already been deleted'
      });
    }

    const result = await deleteReceipt(receiptId, req.user.userId);

    if (result.changes === 0) {
      return res.status(404).json({ error: 'Receipt not found' });
    }

    if (receipt.image_path) {
      try {
        const imagePath = path.join(__dirname, '../uploads', req.user.userId.toString(), receipt.image_path);
        await fs.unlink(imagePath);
      } catch (fileError) {
        console.error('Failed to delete legacy image file:', fileError);
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

// Get categories list
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

router.post('/ocr/parse', authenticateToken, async (req, res) => {
  try {
    const { image_id } = req.body;

    if (!image_id) {
      return res.status(400).json({
        error: 'Missing image ID',
        details: 'Please provide an image_id from the image service'
      });
    }

    console.log(`Processing OCR for image ID: ${image_id}`);

    const ocrResult = await ocrService.extractTextFromImageId(image_id);

    if (!ocrResult.success) {
      return res.status(500).json({
        error: 'OCR extraction failed',
        details: ocrResult.details || 'Failed to extract text from image'
      });
    }

    const extractedText = ocrResult.data.text;
    console.log(`Extracted text (${extractedText.length} chars): ${extractedText.substring(0, 100)}...`);

    const parsedData = ocrService.parseReceiptData(extractedText);

    res.json({
      success: true,
      message: 'Receipt data extracted and parsed successfully',
      data: {
        store_name: parsedData.store_name,
        amount: parsedData.amount,
        receipt_date: parsedData.receipt_date,
        suggested_category: parsedData.category,
        line_items: parsedData.line_items,

        confidence: parsedData.confidence,
        ocr_processing_time: ocrResult.data.processing_time_ms,
        text_length: ocrResult.data.text_length,

        raw_text: parsedData.raw_text,
        image_id: image_id
      },
      suggestions: {
        review_required: parsedData.confidence === 'low',
        fields_to_verify: getFieldsToVerify(parsedData)
      }
    });

  } catch (error) {
    console.error('OCR parsing error:', error);
    res.status(500).json({
      error: 'OCR processing failed',
      details: error.message,
      suggestion: 'You can still enter receipt details manually'
    });
  }
});

function getFieldsToVerify(parsedData) {
  const fieldsToVerify = [];

  if (!parsedData.store_name || parsedData.store_name === 'Unknown Store') {
    fieldsToVerify.push('store_name');
  }

  if (!parsedData.amount || parsedData.amount <= 0) {
    fieldsToVerify.push('amount');
  }

  if (!parsedData.receipt_date) {
    fieldsToVerify.push('receipt_date');
  }

  if (parsedData.category === 'Other') {
    fieldsToVerify.push('category');
  }

  return fieldsToVerify;
}

module.exports = router;
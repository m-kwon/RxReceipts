// backend/models/database.js
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs').promises;

const DB_PATH = path.join(__dirname, '../rxreceipts.db');

let db;

// Initialize database connection
function initializeDatabase() {
  return new Promise((resolve, reject) => {
    db = new sqlite3.Database(DB_PATH, (err) => {
      if (err) {
        console.error('Error opening database:', err);
        reject(err);
      } else {
        console.log('Connected to SQLite database');
        createTables()
          .then(() => resolve())
          .catch(reject);
      }
    });
  });
}

// Create database tables
function createTables() {
  return new Promise((resolve, reject) => {
    const createUsersTable = `
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        name TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `;

    const createReceiptsTable = `
      CREATE TABLE IF NOT EXISTS receipts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        store_name TEXT NOT NULL,
        amount DECIMAL(10,2) NOT NULL,
        receipt_date DATE NOT NULL,
        category TEXT NOT NULL,
        description TEXT,
        image_path TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users (id)
      )
    `;

    db.serialize(() => {
      db.run(createUsersTable, (err) => {
        if (err) {
          console.error('Error creating users table:', err);
          reject(err);
          return;
        }
      });

      db.run(createReceiptsTable, (err) => {
        if (err) {
          console.error('Error creating receipts table:', err);
          reject(err);
          return;
        }

        // Insert sample data for demonstration
        insertSampleData()
          .then(() => {
            console.log('✅ Database tables created successfully');
            resolve();
          })
          .catch(reject);
      });
    });
  });
}

// Insert sample data for demonstration (IH#3: Let users see data immediately)
async function insertSampleData() {
  return new Promise((resolve, reject) => {
    // Check if sample user already exists
    db.get("SELECT id FROM users WHERE email = 'demo@rxreceipts.com'", (err, row) => {
      if (err) {
        reject(err);
        return;
      }

      if (row) {
        // Sample data already exists
        resolve();
        return;
      }

      // Insert demo user (password: "demo123")
      const bcrypt = require('bcrypt');
      const hashedPassword = bcrypt.hashSync('demo123', 10);

      const insertUser = `
        INSERT INTO users (email, password, name)
        VALUES ('demo@rxreceipts.com', ?, 'Demo User')
      `;

      db.run(insertUser, [hashedPassword], function(err) {
        if (err) {
          reject(err);
          return;
        }

        const userId = this.lastID;

        // Insert sample receipts
        const sampleReceipts = [
          {
            store_name: 'CVS Pharmacy',
            amount: 25.99,
            receipt_date: '2024-03-15',
            category: 'Pharmacy',
            description: 'Monthly prescription refill'
          },
          {
            store_name: 'Dr. Smith Dental',
            amount: 150.00,
            receipt_date: '2024-03-12',
            category: 'Dental',
            description: 'Routine cleaning and checkup'
          },
          {
            store_name: 'LensCrafters',
            amount: 89.99,
            receipt_date: '2024-03-08',
            category: 'Vision',
            description: 'Contact lens solution'
          }
        ];

        const insertReceipt = `
          INSERT INTO receipts (user_id, store_name, amount, receipt_date, category, description)
          VALUES (?, ?, ?, ?, ?, ?)
        `;

        let completed = 0;
        sampleReceipts.forEach((receipt) => {
          db.run(insertReceipt, [
            userId,
            receipt.store_name,
            receipt.amount,
            receipt.receipt_date,
            receipt.category,
            receipt.description
          ], (err) => {
            if (err) {
              console.error('Error inserting sample receipt:', err);
            }
            completed++;
            if (completed === sampleReceipts.length) {
              console.log('✅ Sample data inserted');
              resolve();
            }
          });
        });
      });
    });
  });
}

// Database helper functions
const dbHelpers = {
  // Get user by email
  getUserByEmail: (email) => {
    return new Promise((resolve, reject) => {
      db.get("SELECT * FROM users WHERE email = ?", [email], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
  },

  // Create new user
  createUser: (email, hashedPassword, name) => {
    return new Promise((resolve, reject) => {
      const sql = "INSERT INTO users (email, password, name) VALUES (?, ?, ?)";
      db.run(sql, [email, hashedPassword, name], function(err) {
        if (err) reject(err);
        else resolve({ id: this.lastID, email, name });
      });
    });
  },

  // Get user by ID
  getUserById: (userId) => {
    return new Promise((resolve, reject) => {
      db.get("SELECT id, email, name, created_at FROM users WHERE id = ?", [userId], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
  },

  // Create new receipt
  createReceipt: (receiptData) => {
    return new Promise((resolve, reject) => {
      const sql = `
        INSERT INTO receipts (user_id, store_name, amount, receipt_date, category, description, image_path)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `;

      db.run(sql, [
        receiptData.user_id,
        receiptData.store_name,
        receiptData.amount,
        receiptData.receipt_date,
        receiptData.category,
        receiptData.description,
        receiptData.image_path
      ], function(err) {
        if (err) reject(err);
        else resolve({ id: this.lastID, ...receiptData });
      });
    });
  },

  // Get receipts for user
  getReceiptsByUser: (userId, limit = 50, offset = 0) => {
    return new Promise((resolve, reject) => {
      const sql = `
        SELECT * FROM receipts
        WHERE user_id = ?
        ORDER BY created_at DESC
        LIMIT ? OFFSET ?
      `;

      db.all(sql, [userId, limit, offset], (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  },

  // Get receipt by ID
  getReceiptById: (receiptId, userId) => {
    return new Promise((resolve, reject) => {
      db.get(
        "SELECT * FROM receipts WHERE id = ? AND user_id = ?",
        [receiptId, userId],
        (err, row) => {
          if (err) reject(err);
          else resolve(row);
        }
      );
    });
  },

  // Update receipt
  updateReceipt: (receiptId, userId, updates) => {
    return new Promise((resolve, reject) => {
      const fields = Object.keys(updates).map(key => `${key} = ?`).join(', ');
      const values = Object.values(updates);
      values.push(receiptId, userId);

      const sql = `
        UPDATE receipts
        SET ${fields}, updated_at = CURRENT_TIMESTAMP
        WHERE id = ? AND user_id = ?
      `;

      db.run(sql, values, function(err) {
        if (err) reject(err);
        else resolve({ changes: this.changes });
      });
    });
  },

  // Delete receipt
  deleteReceipt: (receiptId, userId) => {
    return new Promise((resolve, reject) => {
      db.run(
        "DELETE FROM receipts WHERE id = ? AND user_id = ?",
        [receiptId, userId],
        function(err) {
          if (err) reject(err);
          else resolve({ changes: this.changes });
        }
      );
    });
  },

  // Get receipt statistics
  getReceiptStats: (userId) => {
    return new Promise((resolve, reject) => {
      const sql = `
        SELECT
          COUNT(*) as total_receipts,
          SUM(amount) as total_amount,
          COUNT(DISTINCT category) as categories_used,
          category,
          COUNT(*) as category_count,
          SUM(amount) as category_total
        FROM receipts
        WHERE user_id = ?
        GROUP BY category
      `;

      db.all(sql, [userId], (err, rows) => {
        if (err) reject(err);
        else {
          const totalStats = {
            total_receipts: rows.length > 0 ? rows[0].total_receipts : 0,
            total_amount: rows.reduce((sum, row) => sum + (row.category_total || 0), 0),
            categories: rows.map(row => ({
              category: row.category,
              count: row.category_count,
              total: row.category_total
            }))
          };
          resolve(totalStats);
        }
      });
    });
  }
};

module.exports = {
  initializeDatabase,
  db,
  ...dbHelpers
};
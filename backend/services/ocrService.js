const axios = require('axios');

const OCR_SERVICE_URL = 'http://localhost:5002';

class OCRService {
  async extractTextFromImageId(imageId) {
    try {
      const response = await axios.post(`${OCR_SERVICE_URL}/ocr/extract-by-id`, {
        image_id: imageId
      }, {
        timeout: 40000
      });

      return response.data;
    } catch (error) {
      console.error('OCR extraction error:', error.message);
      throw new Error(`Failed to extract text from image: ${error.message}`);
    }
  }

  parseReceiptData(extractedText) {
    if (!extractedText || extractedText.trim().length === 0) {
      return {
        store_name: '',
        amount: null,
        receipt_date: null,
        line_items: [],
      };
    }

    const text = extractedText.toLowerCase();
    const originalText = extractedText;
    const storeName = this.extractStoreName(originalText);
    const amount = this.extractAmount(text);
    const receiptDate = this.extractDate(text);
    const lineItems = this.extractLineItems(originalText);
    const category = this.suggestCategory(storeName, text);
    return {
      store_name: storeName,
      amount: amount,
      receipt_date: receiptDate,
      category: category,
      line_items: lineItems,
      raw_text: extractedText
    };
  }

  extractStoreName(text) {
    const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);

    const medicalStores = [
      'cvs', 'walgreens', 'rite aid', 'walmart pharmacy', 'target pharmacy',
      'costco pharmacy', 'kroger pharmacy', 'safeway pharmacy', 'publix pharmacy',
      'dental', 'dentist', 'orthodontics', 'vision', 'optometry', 'lenscrafters',
      'pearle vision', 'america\'s best', 'kaiser', 'clinic', 'medical center',
      'hospital', 'urgent care', 'family practice'
    ];

    for (const line of lines.slice(0, 5)) {
      const lowerLine = line.toLowerCase();
      for (const store of medicalStores) {
        if (lowerLine.includes(store)) {
          return this.cleanStoreName(line);
        }
      }
    }

    for (const line of lines.slice(0, 3)) {
      if (line.length > 3 && !this.isAmountLine(line) && !this.isDateLine(line)) {
        return this.cleanStoreName(line);
      }
    }

    return '';
  }

  cleanStoreName(name) {
    const cleaned = name
      .replace(/[^\w\s&'-]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .slice(0, 3)
      .join(' ')
    return cleaned;
  }

  extractAmount(text) {
    const totalPatterns = [
      /total[:\s]*\$?([0-9]+\.?[0-9]*)/i,
      /amount[:\s]*\$?([0-9]+\.?[0-9]*)/i,
      /balance[:\s]*\$?([0-9]+\.?[0-9]*)/i,
      /\$([0-9]+\.[0-9]{2})/g
    ];

    for (const pattern of totalPatterns) {
      const matches = text.match(pattern);
      if (matches) {
        const amount = parseFloat(matches[1] || matches[0].replace('$', ''));
        if (!isNaN(amount) && amount > 0 && amount < 10000) { // Reasonable range
          return amount;
        }
      }
    }

    const dollarMatches = text.match(/\$([0-9]+\.?[0-9]*)/g);
    if (dollarMatches) {
      const amounts = dollarMatches
        .map(match => parseFloat(match.replace('$', '')))
        .filter(amount => !isNaN(amount) && amount > 0 && amount < 10000)
        .sort((a, b) => b - a);

      if (amounts.length > 0) {
        return amounts[0];
      }
    }

    return null;
  }

  extractDate(text) {
    const datePatterns = [
      /(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})/g,
      /(\d{2,4})[/-](\d{1,2})[/-](\d{1,2})/g
    ];

    for (const pattern of datePatterns) {
      const matches = Array.from(text.matchAll(pattern));
      for (const match of matches) {
        const [_, part1, part2, part3] = match;

        // Try different date formats
        const formats = [
          [part1, part2, part3], // MM/DD/YYYY or MM/DD/YY
          [part3, part1, part2], // YYYY/MM/DD
          [part2, part1, part3]  // DD/MM/YYYY
        ];

        for (const [month, day, year] of formats) {
          const fullYear = year.length === 2 ? (parseInt(year) > 50 ? '19' + year : '20' + year) : year;
          const date = new Date(fullYear, parseInt(month) - 1, parseInt(day));

          // Check if date is valid and reasonable (not in future, not too old)
          const now = new Date();
          const oneYearAgo = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());

          if (date <= now && date >= oneYearAgo && !isNaN(date.getTime())) {
            return date.toISOString().split('T')[0]; // Return YYYY-MM-DD format
          }
        }
      }
    }

    return null;
  }

  extractLineItems(text) {
    const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);
    const items = [];

    for (const line of lines) {
      const itemMatch = line.match(/^(.+?)\s+\$?([0-9]+\.?[0-9]*)$/);
      if (itemMatch) {
        const [_, description, price] = itemMatch;
        if (description.length > 2 && parseFloat(price) > 0) {
          items.push({
            description: description.trim(),
            price: parseFloat(price)
          });
        }
      }
    }

    return items.slice(0, 10);
  }

  suggestCategory(storeName, text) {
    const store = storeName.toLowerCase();
    const content = text.toLowerCase();

    if (store.includes('cvs') || store.includes('walgreens') || store.includes('pharmacy') ||
        content.includes('prescription') || content.includes('rx') || content.includes('medication')) {
      return 'Pharmacy';
    }

    if (store.includes('dental') || store.includes('dentist') || store.includes('orthodontic') ||
        content.includes('cleaning') || content.includes('filling') || content.includes('crown')) {
      return 'Dental';
    }

    if (store.includes('vision') || store.includes('optical') || store.includes('lenscrafters') ||
        store.includes('eyecare') || content.includes('contacts') || content.includes('glasses') ||
        content.includes('lens')) {
      return 'Vision';
    }

    if (content.includes('device') || content.includes('equipment') || content.includes('supply') ||
        content.includes('monitor') || content.includes('meter')) {
      return 'Medical Device';
    }

    if (store.includes('clinic') || store.includes('medical') || store.includes('doctor') ||
        store.includes('physician') || content.includes('consultation') || content.includes('visit') ||
        content.includes('exam')) {
      return 'Doctor Visit';
    }

    return 'Other';
  }

  isAmountLine(line) {
    return /\$[0-9]+\.?[0-9]*/.test(line) || /total|amount|balance/i.test(line);
  }

  isDateLine(line) {
    return /\d{1,2}[/-]\d{1,2}[/-]\d{2,4}/.test(line);
  }

  isMedicalStore(storeName) {
    const medical = ['cvs', 'walgreens', 'pharmacy', 'dental', 'vision', 'medical', 'clinic', 'hospital'];
    const name = storeName.toLowerCase();
    return medical.some(term => name.includes(term));
  }
}

module.exports = new OCRService();
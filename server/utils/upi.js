// UPI utilities.
// Backend is the source of truth for the amount - never accept an amount from
// the frontend for payment generation.

const crypto = require('crypto');

/**
 * Build a properly URL-encoded UPI deep-link URI.
 * @param {Object} opts
 * @param {string} opts.merchantUpiId   Merchant VPA, e.g. yourupi@bank
 * @param {string} opts.merchantName    Merchant display name
 * @param {number} opts.amount          Amount in INR (server-calculated)
 * @param {string} opts.transactionReference Unique order/transaction reference
 * @returns {string} upi://pay?... URI with all params URL-encoded
 */
function generateUpiUri({ merchantUpiId, merchantName, amount, transactionReference }) {
  if (!merchantUpiId) throw new Error('MERCHANT_UPI_ID is not configured');
  if (!merchantName) throw new Error('MERCHANT_NAME is not configured');
  if (typeof amount !== 'number' || !Number.isFinite(amount) || amount <= 0) {
    throw new Error('Invalid amount for UPI URI generation');
  }
  if (!transactionReference) throw new Error('Transaction reference is required');

  // Exact decimal formatting: 1249 -> "1249.00"
  const formattedAmount = amount.toFixed(2);

  const params = new URLSearchParams({
    pa: merchantUpiId,
    pn: merchantName,
    am: formattedAmount,
    cu: 'INR',
    tr: transactionReference,
    tn: `Shreeji & Shreeji Diwali Hamper - ${transactionReference}`,
  });

  return `upi://pay?${params.toString()}`;
}

/**
 * Generate a unique order/transaction reference, e.g. SJ2026AB12CD.
 * Used as both orderNumber and UPI `tr` reference so payments can be
 * matched to orders during manual verification.
 */
function generateOrderNumber() {
  const year = new Date().getFullYear();
  const rand = crypto.randomBytes(3).toString('hex').toUpperCase(); // 6 chars
  return `SJ${year}${rand}`;
}

module.exports = { generateUpiUri, generateOrderNumber };

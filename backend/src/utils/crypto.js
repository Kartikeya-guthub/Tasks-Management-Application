'use strict';

const crypto = require('crypto');

const ALGORITHM = 'aes-256-gcm';
const IV_LEN    = 12; // 96-bit IV recommended for GCM
const TAG_LEN   = 16;

function getKey() {
  const hex = process.env.FIELD_ENC_KEY;
  if (!hex || hex.length !== 64) {
    throw new Error('FIELD_ENC_KEY must be a 64-character hex string (32 bytes)');
  }
  return Buffer.from(hex, 'hex');
}

// Returns base64 string: iv (12 bytes) + authTag (16 bytes) + ciphertext
function encrypt(plaintext) {
  if (plaintext === null || plaintext === undefined) return null;
  const iv         = crypto.randomBytes(IV_LEN);
  const cipher     = crypto.createCipheriv(ALGORITHM, getKey(), iv);
  const encrypted  = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const tag        = cipher.getAuthTag();
  return Buffer.concat([iv, tag, encrypted]).toString('base64');
}

// Accepts base64 string produced by encrypt(), returns plaintext
function decrypt(ciphertext) {
  if (ciphertext === null || ciphertext === undefined) return null;
  try {
    const buf  = Buffer.from(ciphertext, 'base64');
    const iv   = buf.subarray(0, IV_LEN);
    const tag  = buf.subarray(IV_LEN, IV_LEN + TAG_LEN);
    const data = buf.subarray(IV_LEN + TAG_LEN);
    const decipher = crypto.createDecipheriv(ALGORITHM, getKey(), iv);
    decipher.setAuthTag(tag);
    return decipher.update(data) + decipher.final('utf8');
  } catch {
    // Decryption failure — return null rather than leak error details
    return null;
  }
}

module.exports = { encrypt, decrypt };

import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Load .env file from the root directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../../.env') });

/**
 * Parses a comma-separated string into an array, trimming whitespace.
 * @param {string} value 
 * @returns {string[]}
 */
const parseArray = (value) => {
  if (!value) return [];
  return value.split(',').map(item => item.trim()).filter(Boolean);
};

export const env = {
  PORT: process.env.PORT || 8080,
  WAHA_URL: (process.env.WAHA_URL || 'http://localhost:3000').replace(/\/+$/, ''),
  WAHA_SESSION: process.env.WAHA_SESSION || 'default',
  WAHA_API_KEY: process.env.WAHA_API_KEY || '12345',
  VOTE_DELAY_MIN: isNaN(parseInt(process.env.VOTE_DELAY_MIN, 10)) ? 3000 : parseInt(process.env.VOTE_DELAY_MIN, 10),
  VOTE_DELAY_MAX: isNaN(parseInt(process.env.VOTE_DELAY_MAX, 10)) ? 7000 : parseInt(process.env.VOTE_DELAY_MAX, 10),
  TARGET_GROUPS: parseArray(process.env.TARGET_GROUPS),
  DEFAULT_VOTE: process.env.DEFAULT_VOTE || null,
};

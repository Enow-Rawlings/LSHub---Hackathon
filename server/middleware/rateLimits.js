/**
 * Rate limit configurations for different route groups.
 * Using express-rate-limit to protect against brute force and abuse.
 */
const rateLimit = require('express-rate-limit');

// Auth: 10 requests per 15 minutes per IP
const authLimiter = rateLimit({
  windowMs:        15 * 60 * 1000,
  max:             10,
  standardHeaders: true,
  legacyHeaders:   false,
  message:         { error: 'Too many requests, please try again later' },
});

// Bot: 60 requests per minute per IP
const botLimiter = rateLimit({
  windowMs:        60 * 1000,
  max:             60,
  standardHeaders: true,
  legacyHeaders:   false,
  message:         { error: 'Too many requests, please try again later' },
});

// Search: 120 requests per minute per IP
const searchLimiter = rateLimit({
  windowMs:        60 * 1000,
  max:             120,
  standardHeaders: true,
  legacyHeaders:   false,
  message:         { error: 'Too many requests, please try again later' },
});

module.exports = { authLimiter, botLimiter, searchLimiter };

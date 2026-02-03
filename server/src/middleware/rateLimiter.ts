/**
 * Rate Limiting Middleware
 * Prevents API abuse and DDoS attacks
 */

import rateLimit from 'express-rate-limit';
import logger from '../utils/logger';

// General API rate limiter
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later',
  handler: (req, res) => {
    logger.warn('Rate limit exceeded', {
      event: 'rate_limit_exceeded',
      ip: req.ip,
      path: req.path
    });
    res.status(429).json({
      error: 'Too many requests'
    });
  },
  skip: (req) => {
    // Skip rate limiting for health check
    return req.path === '/api/health';
  },
  standardHeaders: true,
  legacyHeaders: false
});

// Strict rate limiter for auth endpoints
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5, // 5 attempts
  message: 'Too many authentication attempts, please try again later',
  skipSuccessfulRequests: true,
  handler: (req, res) => {
    logger.warn('Auth rate limit exceeded', {
      event: 'auth_rate_limit',
      ip: req.ip
    });
    res.status(429).json({ error: 'Too many authentication attempts' });
  },
  standardHeaders: true,
  legacyHeaders: false
});

// Create room rate limiter
export const createRoomLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 3, // 3 rooms per minute
  message: 'Too many rooms created, please wait before creating another',
  handler: (req, res) => {
    logger.warn('Create room rate limit exceeded', {
      event: 'create_room_rate_limit',
      ip: req.ip
    });
    res.status(429).json({ error: 'Too many rooms created' });
  },
  standardHeaders: true,
  legacyHeaders: false
});

export default { apiLimiter, authLimiter, createRoomLimiter };

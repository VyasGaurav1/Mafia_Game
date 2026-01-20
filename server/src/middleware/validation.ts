/**
 * Input Validation Middleware
 * Validates and sanitizes user inputs
 */

import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import logger from '../utils/logger';

// Validation schemas
export const schemas = {
  username: z
    .string()
    .trim()
    .min(2, 'Username must be at least 2 characters')
    .max(20, 'Username must not exceed 20 characters')
    .regex(/^[a-zA-Z0-9_-]+$/, 'Username can only contain letters, numbers, underscore, and hyphen'),

  roomCode: z
    .string()
    .trim()
    .length(6, 'Room code must be exactly 6 characters')
    .toUpperCase(),

  action: z
    .enum(['kill', 'protect', 'investigate', 'vote', 'chat']),

  message: z
    .string()
    .max(500, 'Message must not exceed 500 characters')
    .trim(),

  playerId: z
    .string()
    .regex(/^[0-9a-fA-F]{24}$/, 'Invalid player ID'),

  guestUser: z.object({
    username: z
      .string()
      .trim()
      .min(2, 'Username must be at least 2 characters')
      .max(20, 'Username must not exceed 20 characters')
      .regex(/^[a-zA-Z0-9_-]+$/, 'Invalid username format')
  }),

  roomValidation: z.object({
    code: z
      .string()
      .length(6, 'Room code must be exactly 6 characters')
  })
};

// Middleware factory
export function validateRequest(schema: z.ZodSchema) {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      const validated = schema.parse(req.body);
      req.body = validated;
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        logger.warn('Validation error', { 
          event: 'validation_error',
          errors: error.errors,
          path: req.path,
          method: req.method,
          ip: req.ip
        });
        return res.status(400).json({
          error: 'Validation failed',
          details: error.errors.map(e => ({
            path: e.path.join('.'),
            message: e.message
          }))
        });
      }
      next(error);
    }
  };
}

// Sanitization helper
export function sanitizeString(str: string): string {
  return str
    .trim()
    .slice(0, 500)
    .replace(/[<>]/g, '') // Remove potential HTML tags
    .normalize('NFKD');
}

export default { schemas, validateRequest, sanitizeString };

/**
 * Security Headers Middleware
 * Implements security best practices
 */

import { Request, Response, NextFunction } from 'express';
import helmet, { HelmetOptions } from 'helmet';
import config from '../config';

// Custom security headers
export const securityHeaders = (req: Request, res: Response, next: NextFunction) => {
  // Remove powered-by header
  res.removeHeader('X-Powered-By');
  
  // Add security headers
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  
  next();
};

// Enhanced helmet configuration based on environment
export const getHelmetConfig = (): HelmetOptions => {
  const corsOrigins = Array.isArray(config.cors.origin) ? config.cors.origin : [config.cors.origin];
  
  if (config.env === 'production') {
    return {
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          imgSrc: ["'self'", 'data:', 'https:'],
          connectSrc: ["'self'", ...corsOrigins],
          fontSrc: ["'self'"],
          objectSrc: ["'none'"],
          mediaSrc: ["'self'"],
          frameSrc: ["'none'"]
        }
      },
      hsts: {
        maxAge: 31536000, // 1 year
        includeSubDomains: true,
        preload: true
      },
      frameguard: { action: 'deny' },
      noSniff: true,
      xssFilter: true,
      referrerPolicy: { policy: 'strict-origin-when-cross-origin' }
    };
  }
  
  // Development - less strict CSP for hot reload
  return {
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", 'data:', 'https:'],
        connectSrc: ["'self'", ...corsOrigins, 'ws:', 'wss:'],
        fontSrc: ["'self'"],
        objectSrc: ["'none'"]
      }
    },
    frameguard: { action: 'deny' },
    noSniff: true
  };
};

export default { securityHeaders, getHelmetConfig };

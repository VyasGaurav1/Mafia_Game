/**
 * Configuration Validation
 * Ensures all required environment variables are set
 */

import logger from '../utils/logger';

interface ConfigError {
  variable: string;
  message: string;
}

export function validateEnvironment(): ConfigError[] {
  const errors: ConfigError[] = [];
  const env = process.env;

  // Required variables
  const required = [
    'NODE_ENV',
    'PORT',
    'MONGODB_URI',
    'JWT_SECRET'
  ];

  required.forEach(variable => {
    if (!env[variable]) {
      errors.push({
        variable,
        message: `Missing required environment variable: ${variable}`
      });
    }
  });

  // Production-specific validation
  if (env.NODE_ENV === 'production') {
    // JWT Secret strength check
    if (env.JWT_SECRET && env.JWT_SECRET.length < 32) {
      errors.push({
        variable: 'JWT_SECRET',
        message: 'JWT_SECRET must be at least 32 characters in production'
      });
    }
  }

  // Warn if using weak secrets in development
  if (env.NODE_ENV === 'development') {
    logger.warn('Development environment detected - using default secrets');
  }

  return errors;
}

export function throwIfErrors(errors: ConfigError[]): void {
  if (errors.length > 0) {
    logger.error('Configuration validation failed:', errors);
    throw new Error(`Configuration validation failed:\n${errors.map(e => `- ${e.message}`).join('\n')}`);
  }
}

export default { validateEnvironment, throwIfErrors };

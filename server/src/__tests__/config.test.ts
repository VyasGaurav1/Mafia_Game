/**
 * Configuration Validation Tests
 */

import { validateEnvironment } from '../config/validation';

describe('Configuration Validation', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('should pass validation with all required variables', () => {
    process.env.NODE_ENV = 'development';
    process.env.PORT = '3001';
    process.env.MONGODB_URI = 'mongodb://localhost:27017/test';
    process.env.JWT_SECRET = 'test-secret-key';

    const errors = validateEnvironment();
    expect(errors).toHaveLength(0);
  });

  it('should fail validation when missing required variables', () => {
    delete process.env.NODE_ENV;
    delete process.env.PORT;
    delete process.env.MONGODB_URI;
    delete process.env.JWT_SECRET;

    const errors = validateEnvironment();
    expect(errors.length).toBeGreaterThan(0);
    expect(errors.some(e => e.variable === 'NODE_ENV')).toBe(true);
    expect(errors.some(e => e.variable === 'JWT_SECRET')).toBe(true);
  });

  it('should fail production validation with weak secrets', () => {
    process.env.NODE_ENV = 'production';
    process.env.PORT = '3001';
    process.env.MONGODB_URI = 'mongodb://localhost:27017/test';
    process.env.JWT_SECRET = 'dev-secret';
    process.env.REDIS_PASSWORD = 'change_me';
    process.env.MONGO_PASSWORD = 'test';

    const errors = validateEnvironment();
    expect(errors.length).toBeGreaterThan(0);
  });

  it('should pass production validation with strong secrets', () => {
    process.env.NODE_ENV = 'production';
    process.env.PORT = '3001';
    process.env.MONGODB_URI = 'mongodb://localhost:27017/test';
    process.env.JWT_SECRET = 'a'.repeat(32);
    process.env.REDIS_PASSWORD = 'strong-redis-password-12345';
    process.env.MONGO_PASSWORD = 'strong-mongo-password-12345';

    const errors = validateEnvironment();
    expect(errors).toHaveLength(0);
  });
});

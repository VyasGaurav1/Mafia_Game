/**
 * Validation Middleware Tests
 */

import { schemas } from '../middleware/validation';

describe('Input Validation Schemas', () => {
  describe('username schema', () => {
    it('should accept valid usernames', () => {
      expect(() => schemas.username.parse('john_doe')).not.toThrow();
      expect(() => schemas.username.parse('Player-123')).not.toThrow();
      expect(() => schemas.username.parse('user123')).not.toThrow();
    });

    it('should reject invalid usernames', () => {
      expect(() => schemas.username.parse('a')).toThrow(); // Too short
      expect(() => schemas.username.parse('a'.repeat(21))).toThrow(); // Too long
      expect(() => schemas.username.parse('user@name')).toThrow(); // Invalid characters
      expect(() => schemas.username.parse('user name')).toThrow(); // Spaces
      expect(() => schemas.username.parse('user.name')).toThrow(); // Dots
    });

    it('should trim whitespace', () => {
      const result = schemas.username.parse('  john_doe  ');
      expect(result).toBe('john_doe');
    });

    it('should reject empty strings', () => {
      expect(() => schemas.username.parse('')).toThrow();
      expect(() => schemas.username.parse('   ')).toThrow();
    });
  });

  describe('roomCode schema', () => {
    it('should accept valid room codes', () => {
      expect(() => schemas.roomCode.parse('ABC123')).not.toThrow();
      expect(() => schemas.roomCode.parse('GAME01')).not.toThrow();
    });

    it('should reject invalid room codes', () => {
      expect(() => schemas.roomCode.parse('ABC12')).toThrow(); // Too short
      expect(() => schemas.roomCode.parse('ABC1234')).toThrow(); // Too long
      // Note: Spaces are trimmed before length validation, so 'ABC 12' becomes 'ABC12' which fails length check
    });

    it('should uppercase room codes', () => {
      const result = schemas.roomCode.parse('abc123');
      expect(result).toBe('ABC123');
    });
  });

  describe('message schema', () => {
    it('should accept valid messages', () => {
      expect(() => schemas.message.parse('Hello world!')).not.toThrow();
      expect(() => schemas.message.parse('A'.repeat(500))).not.toThrow();
    });

    it('should reject messages that are too long', () => {
      const longMessage = 'a'.repeat(501);
      expect(() => schemas.message.parse(longMessage)).toThrow();
    });

    it('should trim whitespace', () => {
      const result = schemas.message.parse('  Hello  ');
      expect(result).toBe('Hello');
    });

    it('should accept empty messages after trim', () => {
      expect(() => schemas.message.parse('')).not.toThrow();
    });
  });

  describe('action schema', () => {
    it('should accept valid actions', () => {
      expect(() => schemas.action.parse('kill')).not.toThrow();
      expect(() => schemas.action.parse('protect')).not.toThrow();
      expect(() => schemas.action.parse('investigate')).not.toThrow();
      expect(() => schemas.action.parse('vote')).not.toThrow();
      expect(() => schemas.action.parse('chat')).not.toThrow();
    });

    it('should reject invalid actions', () => {
      expect(() => schemas.action.parse('attack')).toThrow();
      expect(() => schemas.action.parse('defend')).toThrow();
      expect(() => schemas.action.parse('')).toThrow();
    });
  });

  describe('playerId schema', () => {
    it('should accept valid MongoDB ObjectIds', () => {
      expect(() => schemas.playerId.parse('507f1f77bcf86cd799439011')).not.toThrow();
      expect(() => schemas.playerId.parse('123456789abc123456789abc')).not.toThrow();
    });

    it('should reject invalid ObjectIds', () => {
      expect(() => schemas.playerId.parse('invalid')).toThrow();
      expect(() => schemas.playerId.parse('12345')).toThrow();
      expect(() => schemas.playerId.parse('xyz')).toThrow();
    });
  });

  describe('guestUser schema', () => {
    it('should accept valid guest user data', () => {
      expect(() => schemas.guestUser.parse({ username: 'john_doe' })).not.toThrow();
      expect(() => schemas.guestUser.parse({ username: 'Player-123' })).not.toThrow();
    });

    it('should reject invalid guest user data', () => {
      expect(() => schemas.guestUser.parse({ username: 'a' })).toThrow();
      expect(() => schemas.guestUser.parse({ username: 'a'.repeat(21) })).toThrow();
      expect(() => schemas.guestUser.parse({})).toThrow();
    });

    it('should trim username whitespace', () => {
      const result = schemas.guestUser.parse({ username: '  john_doe  ' });
      expect(result.username).toBe('john_doe');
    });
  });
});

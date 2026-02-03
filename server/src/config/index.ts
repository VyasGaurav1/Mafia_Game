/**
 * Configuration management for the Mafia game server
 * Environment-based configuration with validation
 */

import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

interface Config {
  env: string;
  port: number;
  mongodb: {
    uri: string;
    options: object;
  };
  redis: {
    url: string;
    enabled: boolean;
  };
  jwt: {
    secret: string;
    expiresIn: string;
  };
  cors: {
    origin: string | string[];
    credentials: boolean;
  };
  game: {
    minPlayers: number;
    maxPlayers: number;
  };
  logging: {
    level: string;
  };
}

const config: Config = {
  env: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '3001', 10),
  
  mongodb: {
    uri: process.env.MONGODB_URI || 'mongodb://localhost:27017/mafia-game',
    options: {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    }
  },
  
  redis: {
    url: process.env.REDIS_URL || 'redis://localhost:6379',
    enabled: true // Always enabled now for session storage
  },
  
  jwt: {
    secret: process.env.JWT_SECRET || 'dev-secret-change-in-production',
    expiresIn: '7d'
  },
  
  cors: {
    origin: process.env.CORS_ORIGIN?.split(',') || ['http://localhost:5173', 'http://localhost:3000'],
    credentials: true
  },
  
  game: {
    minPlayers: parseInt(process.env.MIN_PLAYERS || '3', 10),
    maxPlayers: parseInt(process.env.MAX_PLAYERS || '12', 10)
  },
  
  logging: {
    level: process.env.LOG_LEVEL || 'info'
  }
};

// Validation
function validateConfig(): void {
  if (config.env === 'production' && config.jwt.secret === 'dev-secret-change-in-production') {
    throw new Error('JWT_SECRET must be set in production environment');
  }
  
  if (config.game.minPlayers < 3) {
    throw new Error('Minimum players cannot be less than 3');
  }
  
  if (config.game.maxPlayers > 20) {
    throw new Error('Maximum players cannot exceed 20');
  }
}

validateConfig();

export default config;

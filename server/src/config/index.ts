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
  if (config.game.minPlayers < 3) {
    throw new Error('Minimum players cannot be less than 3');
  }
  
  if (config.game.maxPlayers > 20) {
    throw new Error('Maximum players cannot exceed 20');
  }
}

validateConfig();

export default config;

/**
 * Winston Logger Configuration
 * Structured logging with different transports for development and production
 */

import winston from 'winston';
import config from '../config';

const { combine, timestamp, printf, colorize, json, errors } = winston.format;

// Custom format for development
const devFormat = printf(({ level, message, timestamp, stack, ...metadata }) => {
  let msg = `${timestamp} [${level}]: ${message}`;
  
  if (Object.keys(metadata).length > 0) {
    msg += ` ${JSON.stringify(metadata)}`;
  }
  
  if (stack) {
    msg += `\n${stack}`;
  }
  
  return msg;
});

// Create logger instance
const logger = winston.createLogger({
  level: config.logging.level,
  format: combine(
    errors({ stack: true }),
    timestamp({ format: 'YYYY-MM-DD HH:mm:ss' })
  ),
  defaultMeta: { service: 'mafia-game' },
  transports: []
});

// Development configuration
if (config.env === 'development') {
  logger.add(new winston.transports.Console({
    format: combine(
      colorize(),
      devFormat
    )
  }));
} else {
  // Production configuration - JSON format for log aggregation
  logger.add(new winston.transports.Console({
    format: combine(json())
  }));
  
  // File transport for production error logs
  logger.add(new winston.transports.File({
    filename: 'logs/error.log',
    level: 'error',
    format: combine(json()),
    maxsize: 5242880, // 5MB
    maxFiles: 5
  }));
  
  // File transport for all logs
  logger.add(new winston.transports.File({
    filename: 'logs/combined.log',
    format: combine(json()),
    maxsize: 5242880, // 5MB
    maxFiles: 5
  }));
  
  // File transport for warnings
  logger.add(new winston.transports.File({
    filename: 'logs/warnings.log',
    level: 'warn',
    format: combine(json()),
    maxsize: 5242880, // 5MB
    maxFiles: 3
  }));
}

// Game-specific logging helpers
export const gameLogger = {
  roomCreated: (roomId: string, hostId: string) => {
    logger.info('Room created', { event: 'room_created', roomId, hostId });
  },
  
  playerJoined: (roomId: string, playerId: string, username: string) => {
    logger.info('Player joined room', { event: 'player_joined', roomId, playerId, username });
  },
  
  playerLeft: (roomId: string, playerId: string) => {
    logger.info('Player left room', { event: 'player_left', roomId, playerId });
  },
  
  gameStarted: (roomId: string, playerCount: number) => {
    logger.info('Game started', { event: 'game_started', roomId, playerCount });
  },
  
  phaseChanged: (roomId: string, phase: string, dayNumber: number) => {
    logger.info('Phase changed', { event: 'phase_changed', roomId, phase, dayNumber });
  },
  
  actionPerformed: (roomId: string, playerId: string, action: string, targetId?: string) => {
    logger.info('Action performed', { event: 'action_performed', roomId, playerId, action, targetId });
  },
  
  playerEliminated: (roomId: string, playerId: string, role: string, reason: string) => {
    logger.info('Player eliminated', { event: 'player_eliminated', roomId, playerId, role, reason });
  },
  
  gameEnded: (roomId: string, winner: string, dayNumber: number) => {
    logger.info('Game ended', { event: 'game_ended', roomId, winner, dayNumber });
  },
  
  securityEvent: (type: string, details: object) => {
    logger.warn('Security event', { event: 'security', type, ...details });
  }
};

export default logger;

/**
 * Mafia Game Server
 * Main entry point
 */

import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import path from 'path';

import config from './config';
import logger from './utils/logger';
import routes from './routes';
import { setupSocketHandlers } from './socket/handlers';
import { roomManager } from './services/RoomManager';
import { ClientToServerEvents, ServerToClientEvents } from './types';
import { validateEnvironment, throwIfErrors } from './config/validation';
import { apiLimiter } from './middleware/rateLimiter';
import { securityHeaders, getHelmetConfig } from './middleware/security';

// Validate environment before starting
const configErrors = validateEnvironment();
throwIfErrors(configErrors);

// Create Express app
const app = express();
const httpServer = createServer(app);

// Create Socket.IO server
const io = new Server<ClientToServerEvents, ServerToClientEvents>(httpServer, {
  cors: {
    origin: config.cors.origin,
    credentials: config.cors.credentials
  },
  pingTimeout: 60000,
  pingInterval: 25000
});

// Security Middleware (apply early)
app.use(helmet(getHelmetConfig()));
app.use(securityHeaders);

// CORS
app.use(cors({
  origin: config.cors.origin,
  credentials: config.cors.credentials
}));

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Rate limiting
app.use('/api', apiLimiter);

// Logging
if (config.env === 'development') {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined', {
    stream: {
      write: (message: string) => logger.info(message.trim())
    }
  }));
}

// API Routes
app.use('/api', routes);

// Serve static files from client build (production only)
if (config.env === 'production') {
  const publicPath = path.join(__dirname, '../public');
  app.use(express.static(publicPath));
  
  // Handle client-side routing - send all non-API requests to index.html
  app.get('*', (req, res) => {
    res.sendFile(path.join(publicPath, 'index.html'));
  });
}

// Setup Socket.IO handlers
setupSocketHandlers(io);

// Error handling middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  logger.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// Graceful shutdown
function setupGracefulShutdown(): void {
  const shutdown = async (signal: string) => {
    logger.info(`Received ${signal}. Starting graceful shutdown...`);

    // Stop accepting new connections
    httpServer.close(() => {
      logger.info('HTTP server closed');
    });

    // Close Socket.IO connections
    io.close(() => {
      logger.info('Socket.IO server closed');
    });

    // Cleanup room manager
    roomManager.destroy();

    process.exit(0);
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));

  process.on('uncaughtException', (error) => {
    logger.error('Uncaught Exception:', error);
    shutdown('uncaughtException');
  });

  process.on('unhandledRejection', (reason, promise) => {
    logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
  });
}

// Start server
async function startServer(): Promise<void> {
  setupGracefulShutdown();

  httpServer.listen(config.port, () => {
    logger.info(`
    ╔═══════════════════════════════════════════════════════╗
    ║                                                       ║
    ║   🎭 Mafia Game Server                                ║
    ║                                                       ║
    ║   Environment: ${config.env.padEnd(38)}║
    ║   Port: ${config.port.toString().padEnd(45)}║
    ║   Storage: In-Memory Only                             ║
    ║                                                       ║
    ╚═══════════════════════════════════════════════════════╝
    `);
  });
}

startServer().catch((error) => {
  logger.error('Failed to start server:', error);
  process.exit(1);
});

export { app, io, httpServer };

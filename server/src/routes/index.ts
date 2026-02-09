/**
 * Express Routes
 * REST API endpoints for game management
 */

import { Router, Request, Response } from 'express';
import { roomManager } from '../services/RoomManager';
import logger from '../utils/logger';
import { validateRequest, schemas } from '../middleware/validation';
import { authLimiter } from '../middleware/rateLimiter';
import authRoutes from './auth';

const router = Router();

// Mount auth routes
router.use('/auth', authRoutes);

/**
 * Health check endpoint
 */
router.get('/health', (req: Request, res: Response) => {
  res.json({ 
    status: 'ok',
    environment: process.env.NODE_ENV || 'development',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    storage: 'in-memory',
    version: '1.0.0'
  });
});

/**
 * Get public rooms list
 */
router.get('/rooms', async (req: Request, res: Response) => {
  try {
    const rooms = await roomManager.getPublicRooms();
    res.json({ rooms });
  } catch (error: any) {
    logger.error('Error fetching rooms:', error);
    res.status(500).json({ error: 'Failed to fetch rooms' });
  }
});

/**
 * Get room by code
 */
router.get('/rooms/:code', async (req: Request, res: Response) => {
  try {
    const room = roomManager.getRoom(req.params.code);
    
    if (!room) {
      return res.status(404).json({ error: 'Room not found' });
    }

    const publicRoom = roomManager.toPublicRoom(room);
    res.json({ room: publicRoom });
  } catch (error: any) {
    logger.error('Error fetching room:', error);
    res.status(500).json({ error: 'Failed to fetch room' });
  }
});

/**
 * Create guest user (simplified - in-memory only)
 */
router.post('/users/guest', authLimiter, validateRequest(schemas.guestUser), (req: Request, res: Response) => {
  try {
    const { username } = req.body;

    // Generate simple user response (no persistence)
    const user = {
      id: `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      username,
      avatar: `avatar_${Math.floor(Math.random() * 10) + 1}`,
      isGuest: true
    };

    res.json({ user });
  } catch (error: any) {
    logger.error('Error creating guest user:', error);
    res.status(500).json({ error: 'Failed to create user' });
  }
});

/**
 * Get user stats (not available in memory-only mode)
 */
router.get('/users/:id/stats', (_req: Request, res: Response) => {
  res.status(501).json({ 
    error: 'Stats not available in memory-only mode',
    message: 'User statistics require persistent storage'
  });
});

/**
 * Get game history (not available in memory-only mode)
 */
router.get('/games/history', (_req: Request, res: Response) => {
  res.status(501).json({ 
    error: 'History not available in memory-only mode',
    message: 'Game history requires persistent storage'
  });
});

/**
 * Validate room code
 */
router.post('/rooms/validate', validateRequest(schemas.roomValidation), (req: Request, res: Response) => {
  try {
    const { code } = req.body;
    const room = roomManager.getRoom(code.toUpperCase());
    
    if (!room) {
      return res.json({ valid: false, error: 'Room not found' });
    }

    res.json({ valid: true });
  } catch (error: any) {
    logger.error('Error validating room:', error);
    res.status(500).json({ valid: false, error: 'Validation failed' });
  }
});

export default router;

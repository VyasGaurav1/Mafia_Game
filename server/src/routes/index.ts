/**
 * Express Routes
 * REST API endpoints for game management
 */

import { Router, Request, Response } from 'express';
import { roomManager } from '../services/RoomManager';
import { User } from '../models/User';
import { Room } from '../models/Room';
import { GameState } from '../models/GameState';
import logger from '../utils/logger';
import { v4 as uuidv4 } from 'uuid';
import { validateRequest, schemas } from '../middleware/validation';
import { authLimiter } from '../middleware/rateLimiter';
import mongoose from 'mongoose';

const router = Router();

/**
 * Health check endpoint
 */
router.get('/health', async (req: Request, res: Response) => {
  try {
    // Check database connection
    const dbStatus = mongoose.connection.readyState === 1 ? 'connected' : 'disconnected';
    
    res.json({ 
      status: 'ok',
      environment: process.env.NODE_ENV || 'development',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      database: dbStatus,
      version: '1.0.0'
    });
  } catch (error) {
    res.status(503).json({
      status: 'error',
      message: 'Service unavailable'
    });
  }
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
 * Create guest user
 */
router.post('/users/guest', authLimiter, validateRequest(schemas.guestUser), async (req: Request, res: Response) => {
  try {
    const { username } = req.body;

    // Check if username is taken
    const existing = await User.findOne({ username });
    if (existing) {
      return res.status(409).json({ error: 'Username already taken' });
    }

    const user = new User({
      username,
      isGuest: true,
      avatar: `avatar_${Math.floor(Math.random() * 10) + 1}`
    });

    await user.save();

    res.json({
      user: {
        id: user._id.toString(),
        username: user.username,
        avatar: user.avatar,
        isGuest: user.isGuest
      }
    });
  } catch (error: any) {
    logger.error('Error creating guest user:', error);
    res.status(500).json({ error: 'Failed to create user' });
  }
});

/**
 * Get user stats
 */
router.get('/users/:id/stats', async (req: Request, res: Response) => {
  try {
    const user = await User.findById(req.params.id);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ stats: user.stats });
  } catch (error: any) {
    logger.error('Error fetching user stats:', error);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

/**
 * Get game history
 */
router.get('/games/history', async (req: Request, res: Response) => {
  try {
    const { userId, limit = 10 } = req.query;
    
    const query: any = { endedAt: { $exists: true } };
    
    if (userId) {
      query['alivePlayers'] = userId;
    }

    const games = await GameState.find(query)
      .sort({ endedAt: -1 })
      .limit(Number(limit))
      .select('roomCode dayNumber winner winningTeam startedAt endedAt');

    res.json({ games });
  } catch (error: any) {
    logger.error('Error fetching game history:', error);
    res.status(500).json({ error: 'Failed to fetch history' });
  }
});

/**
 * Validate room code
 */
router.post('/rooms/validate', validateRequest(schemas.roomValidation), async (req: Request, res: Response) => {
  try {
    const { code } = req.body;

    const room = roomManager.getRoom(code.toUpperCase());
    
    if (!room) {
      const dbRoom = await Room.findOne({ code: code.toUpperCase(), isActive: true });
      if (!dbRoom) {
        return res.json({ valid: false, error: 'Room not found' });
      }
    }

    res.json({ valid: true });
  } catch (error: any) {
    logger.error('Error validating room:', error);
    res.status(500).json({ valid: false, error: 'Validation failed' });
  }
});

export default router;

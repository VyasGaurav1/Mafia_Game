/**
 * Authentication Routes
 * REST API endpoints for user authentication
 */

import { Router, Request, Response, NextFunction } from 'express';
import { authService, JWTPayload } from '../services/AuthService';
import { friendsService } from '../services/FriendsService';
import { statsService } from '../services/StatsService';
import { moderationService } from '../services/ModerationService';
import { User } from '../models/UserModel';
import { authLimiter } from '../middleware/rateLimiter';
import logger from '../utils/logger';

const router = Router();

// Extend Request to include user
declare global {
  namespace Express {
    interface Request {
      user?: JWTPayload;
    }
  }
}

/**
 * Authentication middleware
 */
export function authMiddleware(required = true) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      if (required) {
        return res.status(401).json({ error: 'Authentication required' });
      }
      return next();
    }

    const token = authHeader.split(' ')[1];
    const payload = authService.verifyToken(token);

    if (!payload) {
      if (required) {
        return res.status(401).json({ error: 'Invalid or expired token' });
      }
      return next();
    }

    req.user = payload;
    next();
  };
}

/**
 * Register with email/password
 */
router.post('/register', authLimiter, async (req: Request, res: Response) => {
  try {
    const { username, email, password, displayName } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({ error: 'Username, email, and password are required' });
    }

    const { user, tokens } = await authService.register({
      username,
      email,
      password,
      displayName
    });

    res.status(201).json({
      user: user.toPublicProfile(),
      tokens
    });
  } catch (error: any) {
    logger.error('Registration error:', error.message);
    res.status(400).json({ error: error.message });
  }
});

/**
 * Login with email/password
 */
router.post('/login', authLimiter, async (req: Request, res: Response) => {
  try {
    const { emailOrUsername, password } = req.body;

    if (!emailOrUsername || !password) {
      return res.status(400).json({ error: 'Email/username and password are required' });
    }

    const { user, tokens } = await authService.login({
      emailOrUsername,
      password
    });

    res.json({
      user: user.toPublicProfile(),
      tokens
    });
  } catch (error: any) {
    logger.error('Login error:', error.message);
    res.status(401).json({ error: error.message });
  }
});

/**
 * Google OAuth login
 */
router.post('/google', authLimiter, async (req: Request, res: Response) => {
  try {
    const { idToken } = req.body;

    if (!idToken) {
      return res.status(400).json({ error: 'Google ID token is required' });
    }

    const { user, tokens, isNewUser } = await authService.googleAuth({ idToken });

    res.json({
      user: user.toPublicProfile(),
      tokens,
      isNewUser
    });
  } catch (error: any) {
    logger.error('Google auth error:', error.message);
    res.status(401).json({ error: error.message });
  }
});

/**
 * Create guest user
 */
router.post('/guest', authLimiter, async (req: Request, res: Response) => {
  try {
    const guestData = authService.createGuestUser();
    const token = authService.generateGuestToken(guestData);

    res.json({
      user: guestData,
      token
    });
  } catch (error: any) {
    logger.error('Guest creation error:', error.message);
    res.status(500).json({ error: 'Failed to create guest user' });
  }
});

/**
 * Refresh access token
 */
router.post('/refresh', async (req: Request, res: Response) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({ error: 'Refresh token is required' });
    }

    const tokens = await authService.refreshToken(refreshToken);

    res.json({ tokens });
  } catch (error: any) {
    logger.error('Token refresh error:', error.message);
    res.status(401).json({ error: error.message });
  }
});

/**
 * Logout
 */
router.post('/logout', authMiddleware(), async (req: Request, res: Response) => {
  try {
    await authService.logout(req.user!.oderId);
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: 'Logout failed' });
  }
});

/**
 * Get current user profile
 */
router.get('/me', authMiddleware(), async (req: Request, res: Response) => {
  try {
    if (req.user!.isGuest) {
      return res.json({
        user: {
          oderId: req.user!.oderId,
          username: req.user!.username,
          isGuest: true
        }
      });
    }

    const user = await authService.getUserByOderId(req.user!.oderId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ user: user.toPublicProfile() });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to get profile' });
  }
});

/**
 * Update profile
 */
router.patch('/me', authMiddleware(), async (req: Request, res: Response) => {
  try {
    if (req.user!.isGuest) {
      return res.status(403).json({ error: 'Guests cannot update profile' });
    }

    const { displayName, avatar } = req.body;
    const user = await authService.updateProfile(req.user!.oderId, { displayName, avatar });

    res.json({ user: user.toPublicProfile() });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * Change password
 */
router.post('/change-password', authMiddleware(), async (req: Request, res: Response) => {
  try {
    if (req.user!.isGuest) {
      return res.status(403).json({ error: 'Guests cannot change password' });
    }

    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Current and new password are required' });
    }

    await authService.changePassword(req.user!.oderId, currentPassword, newPassword);

    res.json({ success: true });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// ============================================
// FRIENDS ROUTES
// ============================================

/**
 * Search users
 */
router.get('/users/search', authMiddleware(), async (req: Request, res: Response) => {
  try {
    if (req.user!.isGuest) {
      return res.status(403).json({ error: 'Guests cannot search users' });
    }

    const query = req.query.q as string;
    if (!query || query.length < 2) {
      return res.json({ users: [] });
    }

    const users = await friendsService.searchUsers(query, req.user!.oderId);
    res.json({ users: users.map(u => u.toPublicProfile()) });
  } catch (error: any) {
    res.status(500).json({ error: 'Search failed' });
  }
});

/**
 * Get friends list
 */
router.get('/friends', authMiddleware(), async (req: Request, res: Response) => {
  try {
    if (req.user!.isGuest) {
      return res.status(403).json({ error: 'Guests cannot have friends' });
    }

    const friends = await friendsService.getFriendsList(req.user!.oderId);
    res.json({ friends: friends.map(f => (f as any).toFriendProfile()) });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to get friends' });
  }
});

/**
 * Get online friends
 */
router.get('/friends/online', authMiddleware(), async (req: Request, res: Response) => {
  try {
    if (req.user!.isGuest) {
      return res.status(403).json({ error: 'Guests cannot have friends' });
    }

    const friends = await friendsService.getOnlineFriends(req.user!.oderId);
    res.json({ friends: friends.map(f => (f as any).toFriendProfile()) });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to get online friends' });
  }
});

/**
 * Get pending friend requests
 */
router.get('/friends/requests', authMiddleware(), async (req: Request, res: Response) => {
  try {
    if (req.user!.isGuest) {
      return res.status(403).json({ error: 'Guests cannot have friends' });
    }

    const requests = await friendsService.getPendingRequests(req.user!.oderId);
    res.json({ requests });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to get friend requests' });
  }
});

/**
 * Send friend request
 */
router.post('/friends/request', authMiddleware(), async (req: Request, res: Response) => {
  try {
    if (req.user!.isGuest) {
      return res.status(403).json({ error: 'Guests cannot send friend requests' });
    }

    const { targetOderId } = req.body;
    if (!targetOderId) {
      return res.status(400).json({ error: 'Target user ID is required' });
    }

    const result = await friendsService.sendFriendRequest(req.user!.oderId, targetOderId);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to send friend request' });
  }
});

/**
 * Accept friend request
 */
router.post('/friends/accept', authMiddleware(), async (req: Request, res: Response) => {
  try {
    if (req.user!.isGuest) {
      return res.status(403).json({ error: 'Guests cannot accept friend requests' });
    }

    const { fromOderId } = req.body;
    if (!fromOderId) {
      return res.status(400).json({ error: 'From user ID is required' });
    }

    const result = await friendsService.acceptFriendRequest(req.user!.oderId, fromOderId);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to accept friend request' });
  }
});

/**
 * Reject friend request
 */
router.post('/friends/reject', authMiddleware(), async (req: Request, res: Response) => {
  try {
    if (req.user!.isGuest) {
      return res.status(403).json({ error: 'Guests cannot reject friend requests' });
    }

    const { fromOderId } = req.body;
    if (!fromOderId) {
      return res.status(400).json({ error: 'From user ID is required' });
    }

    const result = await friendsService.rejectFriendRequest(req.user!.oderId, fromOderId);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to reject friend request' });
  }
});

/**
 * Remove friend
 */
router.delete('/friends/:friendOderId', authMiddleware(), async (req: Request, res: Response) => {
  try {
    if (req.user!.isGuest) {
      return res.status(403).json({ error: 'Guests cannot remove friends' });
    }

    const result = await friendsService.removeFriend(req.user!.oderId, req.params.friendOderId);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to remove friend' });
  }
});

/**
 * Block user
 */
router.post('/block', authMiddleware(), async (req: Request, res: Response) => {
  try {
    if (req.user!.isGuest) {
      return res.status(403).json({ error: 'Guests cannot block users' });
    }

    const { targetOderId } = req.body;
    if (!targetOderId) {
      return res.status(400).json({ error: 'Target user ID is required' });
    }

    const result = await friendsService.blockUser(req.user!.oderId, targetOderId);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to block user' });
  }
});

/**
 * Unblock user
 */
router.post('/unblock', authMiddleware(), async (req: Request, res: Response) => {
  try {
    if (req.user!.isGuest) {
      return res.status(403).json({ error: 'Guests cannot unblock users' });
    }

    const { targetOderId } = req.body;
    if (!targetOderId) {
      return res.status(400).json({ error: 'Target user ID is required' });
    }

    const result = await friendsService.unblockUser(req.user!.oderId, targetOderId);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to unblock user' });
  }
});

// ============================================
// STATS ROUTES
// ============================================

/**
 * Get player stats
 */
router.get('/stats', authMiddleware(), async (req: Request, res: Response) => {
  try {
    if (req.user!.isGuest) {
      return res.status(403).json({ error: 'Guests do not have stats' });
    }

    const stats = await statsService.getPlayerStats(req.user!.oderId);
    if (!stats) {
      return res.status(404).json({ error: 'Stats not found' });
    }

    res.json({ stats });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to get stats' });
  }
});

/**
 * Get player stats by ID
 */
router.get('/stats/:oderId', authMiddleware(false), async (req: Request, res: Response) => {
  try {
    const stats = await statsService.getPlayerStats(req.params.oderId);
    if (!stats) {
      return res.status(404).json({ error: 'Stats not found' });
    }

    res.json({ stats });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to get stats' });
  }
});

/**
 * Get leaderboard
 */
router.get('/leaderboard', async (req: Request, res: Response) => {
  try {
    const sortBy = (req.query.sortBy as 'wins' | 'winRate' | 'gamesPlayed') || 'wins';
    const limit = Math.min(parseInt(req.query.limit as string) || 100, 100);

    const leaderboard = await statsService.getLeaderboard(sortBy, limit);
    res.json({ leaderboard });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to get leaderboard' });
  }
});

/**
 * Get game history
 */
router.get('/history', authMiddleware(), async (req: Request, res: Response) => {
  try {
    if (req.user!.isGuest) {
      return res.status(403).json({ error: 'Guests do not have history' });
    }

    const limit = Math.min(parseInt(req.query.limit as string) || 20, 50);
    const history = await statsService.getPlayerGameHistory(req.user!.oderId, limit);
    res.json({ history });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to get history' });
  }
});

// ============================================
// REPORT ROUTES
// ============================================

/**
 * Submit a report
 */
router.post('/report', authMiddleware(), async (req: Request, res: Response) => {
  try {
    const { reportedOderId, reason, description, gameId, roomCode } = req.body;

    if (!reportedOderId || !reason || !description) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const report = await moderationService.submitReport(
      req.user!.oderId,
      reportedOderId,
      reason,
      description,
      gameId,
      roomCode
    );

    res.json({ success: true, reportId: report.reportId });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to submit report' });
  }
});

export default router;

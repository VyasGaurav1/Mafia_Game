/**
 * Authentication Service
 * Handles user authentication, registration, and session management
 */

import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { OAuth2Client } from 'google-auth-library';
import { User, IUserDocument } from '../models/UserModel';
import logger from '../utils/logger';

// JWT configuration
const JWT_SECRET = process.env.JWT_SECRET || 'mafia-game-secret-key-change-in-production';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'mafia-refresh-secret-key-change-in-production';
const JWT_EXPIRES_IN = '7d';
const JWT_REFRESH_EXPIRES_IN = '30d';

// Google OAuth client
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || '';
const googleClient = GOOGLE_CLIENT_ID ? new OAuth2Client(GOOGLE_CLIENT_ID) : null;

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface JWTPayload {
  oderId: string;
  username: string;
  isGuest: boolean;
  iat?: number;
  exp?: number;
}

export interface RegisterInput {
  username: string;
  email: string;
  password: string;
  displayName?: string;
}

export interface LoginInput {
  emailOrUsername: string;
  password: string;
}

export interface GoogleAuthInput {
  idToken: string;
}

export interface GuestUserData {
  oderId: string;
  username: string;
  displayName: string;
  isGuest: true;
  avatar: string;
}

class AuthService {
  private static instance: AuthService;
  private guestCounter = 0;

  private constructor() {}

  static getInstance(): AuthService {
    if (!AuthService.instance) {
      AuthService.instance = new AuthService();
    }
    return AuthService.instance;
  }

  /**
   * Generate JWT tokens
   */
  private generateTokens(payload: JWTPayload): AuthTokens {
    const accessToken = jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
    const refreshToken = jwt.sign(payload, JWT_REFRESH_SECRET, { expiresIn: JWT_REFRESH_EXPIRES_IN });
    return { accessToken, refreshToken };
  }

  /**
   * Verify and decode JWT token
   */
  verifyToken(token: string, isRefreshToken = false): JWTPayload | null {
    try {
      const secret = isRefreshToken ? JWT_REFRESH_SECRET : JWT_SECRET;
      const decoded = jwt.verify(token, secret) as JWTPayload;
      return decoded;
    } catch (error) {
      return null;
    }
  }

  /**
   * Register a new user with email/password
   */
  async register(input: RegisterInput): Promise<{ user: IUserDocument; tokens: AuthTokens }> {
    const { username, email, password, displayName } = input;

    // Check if username is taken
    const existingUsername = await User.findByUsername(username);
    if (existingUsername) {
      throw new Error('Username is already taken');
    }

    // Check if email is taken
    const existingEmail = await User.findByEmail(email);
    if (existingEmail) {
      throw new Error('Email is already registered');
    }

    // Validate username format
    if (!/^[a-zA-Z0-9_]{3,20}$/.test(username)) {
      throw new Error('Username must be 3-20 characters and contain only letters, numbers, and underscores');
    }

    // Validate password strength
    if (password.length < 6) {
      throw new Error('Password must be at least 6 characters');
    }

    // Create user
    const oderId = uuidv4();
    const user = new User({
      oderId,
      username: username.toLowerCase(),
      displayName: displayName || username,
      email: email.toLowerCase(),
      password,
      authProvider: { provider: 'local' },
      isGuest: false
    });

    await user.save();
    logger.info(`New user registered: ${username}`);

    const tokens = this.generateTokens({
      oderId: user.oderId,
      username: user.username,
      isGuest: false
    });

    return { user, tokens };
  }

  /**
   * Login with email/password
   */
  async login(input: LoginInput): Promise<{ user: IUserDocument; tokens: AuthTokens }> {
    const { emailOrUsername, password } = input;

    // Find user by email or username
    let user = await User.findByEmail(emailOrUsername);
    if (!user) {
      user = await User.findByUsername(emailOrUsername);
    }

    if (!user) {
      throw new Error('Invalid credentials');
    }

    // Check if user is banned
    if (user.isBanned) {
      if (user.banExpiresAt && user.banExpiresAt > new Date()) {
        throw new Error(`Account is banned until ${user.banExpiresAt.toISOString()}: ${user.banReason}`);
      } else if (!user.banExpiresAt) {
        throw new Error(`Account is permanently banned: ${user.banReason}`);
      }
      // Ban expired, unban user
      user.isBanned = false;
      user.banReason = undefined;
      user.banExpiresAt = undefined;
      await user.save();
    }

    // Load password for comparison
    const userWithPassword = await User.findById(user._id).select('+password');
    if (!userWithPassword?.password) {
      throw new Error('Invalid credentials - use Google login');
    }

    const isMatch = await userWithPassword.comparePassword(password);
    if (!isMatch) {
      throw new Error('Invalid credentials');
    }

    // Update last seen
    user.lastSeen = new Date();
    user.isOnline = true;
    await user.save();

    const tokens = this.generateTokens({
      oderId: user.oderId,
      username: user.username,
      isGuest: false
    });

    logger.info(`User logged in: ${user.username}`);
    return { user, tokens };
  }

  /**
   * Login/Register with Google OAuth
   */
  async googleAuth(input: GoogleAuthInput): Promise<{ user: IUserDocument; tokens: AuthTokens; isNewUser: boolean }> {
    if (!googleClient) {
      throw new Error('Google authentication is not configured');
    }

    const { idToken } = input;

    // Verify Google token
    const ticket = await googleClient.verifyIdToken({
      idToken,
      audience: GOOGLE_CLIENT_ID
    });

    const payload = ticket.getPayload();
    if (!payload) {
      throw new Error('Invalid Google token');
    }

    const { sub: googleId, email, name, picture } = payload;

    if (!email) {
      throw new Error('Email is required from Google account');
    }

    // Check if user exists with this Google ID or email
    let user = await User.findOne({
      $or: [
        { 'authProvider.providerId': googleId, 'authProvider.provider': 'google' },
        { email: email.toLowerCase() }
      ]
    });

    let isNewUser = false;

    if (!user) {
      // Create new user
      const username = await this.generateUniqueUsername(name || email.split('@')[0]);
      const oderId = uuidv4();

      user = new User({
        oderId,
        username,
        displayName: name || username,
        email: email.toLowerCase(),
        avatar: picture || 'default',
        authProvider: {
          provider: 'google',
          providerId: googleId
        },
        isGuest: false
      });

      await user.save();
      isNewUser = true;
      logger.info(`New user registered via Google: ${username}`);
    } else {
      // Update last seen and provider if needed
      user.lastSeen = new Date();
      user.isOnline = true;
      if (user.authProvider.provider !== 'google') {
        user.authProvider = { provider: 'google', providerId: googleId };
      }
      await user.save();
      logger.info(`User logged in via Google: ${user.username}`);
    }

    // Check if user is banned
    if (user.isBanned) {
      if (user.banExpiresAt && user.banExpiresAt > new Date()) {
        throw new Error(`Account is banned until ${user.banExpiresAt.toISOString()}: ${user.banReason}`);
      } else if (!user.banExpiresAt) {
        throw new Error(`Account is permanently banned: ${user.banReason}`);
      }
    }

    const tokens = this.generateTokens({
      oderId: user.oderId,
      username: user.username,
      isGuest: false
    });

    return { user, tokens, isNewUser };
  }

  /**
   * Generate a unique username
   */
  private async generateUniqueUsername(baseName: string): Promise<string> {
    let username = baseName.toLowerCase().replace(/[^a-z0-9_]/g, '').slice(0, 15);
    
    if (username.length < 3) {
      username = 'player' + username;
    }

    let exists = await User.findByUsername(username);
    let attempt = 0;

    while (exists && attempt < 100) {
      attempt++;
      const suffix = Math.floor(Math.random() * 10000);
      username = `${username.slice(0, 15)}${suffix}`;
      exists = await User.findByUsername(username);
    }

    return username;
  }

  /**
   * Refresh access token
   */
  async refreshToken(refreshToken: string): Promise<AuthTokens> {
    const payload = this.verifyToken(refreshToken, true);
    if (!payload) {
      throw new Error('Invalid refresh token');
    }

    // For guest users, just generate new tokens
    if (payload.isGuest) {
      return this.generateTokens(payload);
    }

    // For registered users, verify they still exist
    const user = await User.findByOderId(payload.oderId);
    if (!user) {
      throw new Error('User not found');
    }

    if (user.isBanned) {
      throw new Error('Account is banned');
    }

    return this.generateTokens({
      oderId: user.oderId,
      username: user.username,
      isGuest: false
    });
  }

  /**
   * Create a guest user (temporary, no persistence)
   */
  createGuestUser(): GuestUserData {
    this.guestCounter++;
    const guestId = `guest_${Date.now()}_${this.guestCounter}`;
    const randomNum = Math.floor(Math.random() * 10000);
    const guestNames = [
      'Player', 'Stranger', 'Visitor', 'Anonymous', 'Guest', 'Newcomer',
      'Shadow', 'Mystery', 'Unknown', 'Wanderer'
    ];
    const baseName = guestNames[Math.floor(Math.random() * guestNames.length)];
    
    return {
      oderId: guestId,
      username: `${baseName}${randomNum}`,
      displayName: `${baseName} ${randomNum}`,
      isGuest: true,
      avatar: `guest_${Math.floor(Math.random() * 10) + 1}`
    };
  }

  /**
   * Generate token for guest user (short-lived, no refresh)
   */
  generateGuestToken(guestData: GuestUserData): string {
    return jwt.sign(
      {
        oderId: guestData.oderId,
        username: guestData.username,
        isGuest: true
      },
      JWT_SECRET,
      { expiresIn: '24h' } // Guests get shorter sessions
    );
  }

  /**
   * Logout user
   */
  async logout(oderId: string): Promise<void> {
    const user = await User.findByOderId(oderId);
    if (user) {
      user.isOnline = false;
      user.lastSeen = new Date();
      await user.save();
    }
  }

  /**
   * Get user by oderId
   */
  async getUserByOderId(oderId: string): Promise<IUserDocument | null> {
    return User.findByOderId(oderId);
  }

  /**
   * Update user profile
   */
  async updateProfile(oderId: string, updates: { displayName?: string; avatar?: string }): Promise<IUserDocument> {
    const user = await User.findByOderId(oderId);
    if (!user) {
      throw new Error('User not found');
    }

    if (updates.displayName) {
      if (updates.displayName.length < 2 || updates.displayName.length > 30) {
        throw new Error('Display name must be 2-30 characters');
      }
      user.displayName = updates.displayName;
    }

    if (updates.avatar) {
      user.avatar = updates.avatar;
    }

    await user.save();
    return user;
  }

  /**
   * Change password
   */
  async changePassword(oderId: string, currentPassword: string, newPassword: string): Promise<void> {
    const user = await User.findByOderId(oderId);
    if (!user) {
      throw new Error('User not found');
    }

    if (user.authProvider.provider !== 'local') {
      throw new Error('Cannot change password for OAuth accounts');
    }

    const userWithPassword = await User.findById(user._id).select('+password');
    if (!userWithPassword?.password) {
      throw new Error('Password not set');
    }

    const isMatch = await userWithPassword.comparePassword(currentPassword);
    if (!isMatch) {
      throw new Error('Current password is incorrect');
    }

    if (newPassword.length < 6) {
      throw new Error('New password must be at least 6 characters');
    }

    user.password = newPassword;
    await user.save();
    logger.info(`Password changed for user: ${user.username}`);
  }
}

export const authService = AuthService.getInstance();
export default authService;

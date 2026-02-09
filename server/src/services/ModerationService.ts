/**
 * Moderation Service
 * Handles reporting, muting, banning, and chat moderation
 */

import { v4 as uuidv4 } from 'uuid';
import { User, IUserDocument } from '../models/UserModel';
import { Report, IReportDocument } from '../models/Report';
import { chatService } from './ChatService';
import logger from '../utils/logger';

// Spam detection config
const SPAM_THRESHOLD = 5; // Messages in window
const SPAM_WINDOW_MS = 10000; // 10 seconds
const FLOOD_THRESHOLD = 15; // Messages in window  
const FLOOD_WINDOW_MS = 60000; // 1 minute

// Profanity filter (basic - extend as needed)
const PROFANITY_PATTERNS = [
  /\bf+u+c+k+/gi,
  /\bs+h+i+t+/gi,
  /\ba+s+s+h+o+l+e+/gi,
  /\bb+i+t+c+h+/gi,
  /\bn+i+g+g+/gi,
  /\bc+u+n+t+/gi,
  /\bk+i+l+l+\s+y+o+u+r+s+e+l+f+/gi,
  /\bk+y+s+\b/gi
];

// Allowed game-related terms that might trigger filters
const ALLOWED_TERMS = [
  'kill', 'dead', 'death', 'eliminate', 'mafia', 'murder', 'die',
  'suspect', 'guilty', 'innocent', 'vote', 'lynch', 'accuse'
];

// Mute info
interface MuteInfo {
  oderId: string;
  roomCode: string;
  expiresAt: Date;
  reason: string;
}

// Message tracking for spam detection
interface MessageTrack {
  timestamps: number[];
  warnings: number;
}

class ModerationService {
  private static instance: ModerationService;
  
  // In-memory tracking
  private messageTracking: Map<string, MessageTrack> = new Map();
  private tempMutes: Map<string, MuteInfo[]> = new Map();
  private roomMutes: Map<string, Set<string>> = new Map(); // roomCode -> muted oderIds

  private constructor() {}

  static getInstance(): ModerationService {
    if (!ModerationService.instance) {
      ModerationService.instance = new ModerationService();
    }
    return ModerationService.instance;
  }

  /**
   * Check if a message should be allowed
   * Returns: { allowed: boolean; filtered: string; reason?: string }
   */
  checkMessage(
    oderId: string,
    roomCode: string,
    content: string
  ): { allowed: boolean; filtered: string; reason?: string } {
    // Check if user is muted
    if (this.isUserMuted(oderId, roomCode)) {
      return { allowed: false, filtered: content, reason: 'You are muted' };
    }

    // Check for spam/flooding
    const spamCheck = this.checkSpam(oderId);
    if (!spamCheck.allowed) {
      return { allowed: false, filtered: content, reason: spamCheck.reason };
    }

    // Filter profanity (but allow game-related terms)
    const filteredContent = this.filterProfanity(content);

    // Check for severe violations
    const severeCheck = this.checkSevereViolations(content);
    if (severeCheck.violation) {
      // Auto-report severe violations
      this.autoReport(oderId, roomCode, severeCheck.type!, content);
      return { allowed: false, filtered: filteredContent, reason: 'Message blocked' };
    }

    // Track message for spam detection
    this.trackMessage(oderId);

    return { allowed: true, filtered: filteredContent };
  }

  /**
   * Check for spam patterns
   */
  private checkSpam(oderId: string): { allowed: boolean; reason?: string } {
    const track = this.messageTracking.get(oderId) || { timestamps: [], warnings: 0 };
    const now = Date.now();
    
    // Clean old timestamps
    track.timestamps = track.timestamps.filter(t => now - t < FLOOD_WINDOW_MS);

    // Check flood (too many messages overall)
    if (track.timestamps.length >= FLOOD_THRESHOLD) {
      return { allowed: false, reason: 'Slow down! You are sending messages too quickly.' };
    }

    // Check spam (rapid messages)
    const recentMessages = track.timestamps.filter(t => now - t < SPAM_WINDOW_MS);
    if (recentMessages.length >= SPAM_THRESHOLD) {
      track.warnings++;
      this.messageTracking.set(oderId, track);
      
      if (track.warnings >= 3) {
        return { allowed: false, reason: 'You have been temporarily muted for spam.' };
      }
      return { allowed: false, reason: 'Please slow down.' };
    }

    return { allowed: true };
  }

  /**
   * Track a message timestamp
   */
  private trackMessage(oderId: string): void {
    const track = this.messageTracking.get(oderId) || { timestamps: [], warnings: 0 };
    track.timestamps.push(Date.now());
    
    // Decay warnings over time
    if (track.warnings > 0 && track.timestamps.length === 1) {
      track.warnings = Math.max(0, track.warnings - 1);
    }
    
    this.messageTracking.set(oderId, track);
  }

  /**
   * Filter profanity from message
   */
  private filterProfanity(content: string): string {
    let filtered = content;

    for (const pattern of PROFANITY_PATTERNS) {
      filtered = filtered.replace(pattern, (match) => {
        // Check if it's an allowed game term
        const lower = match.toLowerCase();
        if (ALLOWED_TERMS.some(term => lower.includes(term))) {
          return match;
        }
        return '*'.repeat(match.length);
      });
    }

    return filtered;
  }

  /**
   * Check for severe violations that warrant immediate action
   */
  private checkSevereViolations(content: string): { violation: boolean; type?: string } {
    const lower = content.toLowerCase();

    // Check for death threats (excluding game context)
    const threatPatterns = [
      /i\s+will\s+find\s+you/i,
      /real\s+life/i,
      /where\s+you\s+live/i,
      /dox+/i,
      /your\s+address/i
    ];

    for (const pattern of threatPatterns) {
      if (pattern.test(content)) {
        return { violation: true, type: 'THREAT' };
      }
    }

    // Check for hate speech
    const hatePatterns = [
      /\bn+i+g+g+/gi,
      /\bf+a+g+/gi,
      /\br+e+t+a+r+d+/gi
    ];

    for (const pattern of hatePatterns) {
      if (pattern.test(content)) {
        return { violation: true, type: 'HATE_SPEECH' };
      }
    }

    return { violation: false };
  }

  /**
   * Auto-report severe violations
   */
  private async autoReport(
    oderId: string,
    roomCode: string,
    type: string,
    content: string
  ): Promise<void> {
    try {
      const report = new Report({
        reportId: `auto_${uuidv4()}`,
        reporterOderId: 'SYSTEM',
        reporterUsername: 'Auto-Moderation',
        reportedOderId: oderId,
        reportedUsername: 'Unknown',
        reason: type === 'THREAT' ? 'HARASSMENT' : 'OTHER',
        description: `Auto-detected ${type}: "${content.slice(0, 200)}"`,
        roomCode,
        status: 'PENDING'
      });

      await report.save();
      logger.warn(`Auto-report created for ${type} by ${oderId}`);
    } catch (error) {
      logger.error('Error creating auto-report:', error);
    }
  }

  /**
   * Check if user is muted
   */
  isUserMuted(oderId: string, roomCode: string): boolean {
    // Check room-specific mutes
    const roomMuted = this.roomMutes.get(roomCode);
    if (roomMuted?.has(oderId)) return true;

    // Check temporary mutes
    const mutes = this.tempMutes.get(oderId);
    if (!mutes) return false;

    const now = new Date();
    const activeMute = mutes.find(m => 
      (m.roomCode === roomCode || m.roomCode === '*') && 
      m.expiresAt > now
    );

    return !!activeMute;
  }

  /**
   * Mute a user in a room
   */
  muteUser(
    oderId: string,
    roomCode: string,
    durationMs: number,
    reason: string
  ): void {
    const expiresAt = new Date(Date.now() + durationMs);
    
    const mutes = this.tempMutes.get(oderId) || [];
    mutes.push({ oderId, roomCode, expiresAt, reason });
    this.tempMutes.set(oderId, mutes);

    // Also add to room mutes for quick lookup
    if (!this.roomMutes.has(roomCode)) {
      this.roomMutes.set(roomCode, new Set());
    }
    this.roomMutes.get(roomCode)!.add(oderId);

    // Schedule unmute
    setTimeout(() => {
      this.unmuteUser(oderId, roomCode);
    }, durationMs);

    logger.info(`User ${oderId} muted in ${roomCode} for ${durationMs}ms: ${reason}`);
  }

  /**
   * Unmute a user
   */
  unmuteUser(oderId: string, roomCode: string): void {
    const mutes = this.tempMutes.get(oderId);
    if (mutes) {
      const filtered = mutes.filter(m => m.roomCode !== roomCode);
      if (filtered.length === 0) {
        this.tempMutes.delete(oderId);
      } else {
        this.tempMutes.set(oderId, filtered);
      }
    }

    const roomMuted = this.roomMutes.get(roomCode);
    if (roomMuted) {
      roomMuted.delete(oderId);
    }
  }

  /**
   * Submit a player report
   */
  async submitReport(
    reporterOderId: string,
    reportedOderId: string,
    reason: 'HARASSMENT' | 'CHEATING' | 'INAPPROPRIATE_NAME' | 'SPAM' | 'AFK_ABUSE' | 'OTHER',
    description: string,
    gameId?: string,
    roomCode?: string
  ): Promise<IReportDocument> {
    const reporter = await User.findByOderId(reporterOderId);
    const reported = await User.findByOderId(reportedOderId);

    const report = new Report({
      reportId: uuidv4(),
      reporterOderId,
      reporterUsername: reporter?.username || 'Unknown',
      reportedOderId,
      reportedUsername: reported?.username || 'Unknown',
      reason,
      description,
      gameId,
      roomCode,
      status: 'PENDING'
    });

    await report.save();
    
    logger.info(`Report submitted: ${reporter?.username} reported ${reported?.username} for ${reason}`);

    return report;
  }

  /**
   * Ban a user
   */
  async banUser(
    oderId: string,
    reason: string,
    durationMs?: number // undefined = permanent
  ): Promise<void> {
    const user = await User.findByOderId(oderId);
    if (!user) return;

    user.isBanned = true;
    user.banReason = reason;
    
    if (durationMs) {
      user.banExpiresAt = new Date(Date.now() + durationMs);
    }

    await user.save();
    
    logger.warn(`User banned: ${user.username} - ${reason} (${durationMs ? `${durationMs}ms` : 'permanent'})`);
  }

  /**
   * Unban a user
   */
  async unbanUser(oderId: string): Promise<void> {
    const user = await User.findByOderId(oderId);
    if (!user) return;

    user.isBanned = false;
    user.banReason = undefined;
    user.banExpiresAt = undefined;

    await user.save();
    
    logger.info(`User unbanned: ${user.username}`);
  }

  /**
   * Get pending reports
   */
  async getPendingReports(limit = 50): Promise<IReportDocument[]> {
    return Report.find({ status: 'PENDING' })
      .sort({ createdAt: -1 })
      .limit(limit);
  }

  /**
   * Get reports for a specific user
   */
  async getUserReports(oderId: string): Promise<IReportDocument[]> {
    return Report.find({ reportedOderId: oderId })
      .sort({ createdAt: -1 });
  }

  /**
   * Resolve a report
   */
  async resolveReport(
    reportId: string,
    resolvedBy: string,
    resolution: string,
    actionTaken: 'NONE' | 'WARNING' | 'MUTE' | 'BAN_TEMP' | 'BAN_PERM'
  ): Promise<void> {
    await Report.updateOne(
      { reportId },
      {
        status: actionTaken === 'NONE' ? 'DISMISSED' : 'ACTION_TAKEN',
        resolvedBy,
        resolution,
        actionTaken,
        resolvedAt: new Date()
      }
    );

    logger.info(`Report ${reportId} resolved with action: ${actionTaken}`);
  }

  /**
   * Clean up old tracking data
   */
  cleanup(): void {
    const now = Date.now();
    
    // Clean message tracking
    for (const [oderId, track] of this.messageTracking.entries()) {
      track.timestamps = track.timestamps.filter(t => now - t < FLOOD_WINDOW_MS);
      if (track.timestamps.length === 0) {
        this.messageTracking.delete(oderId);
      }
    }

    // Clean expired mutes
    for (const [oderId, mutes] of this.tempMutes.entries()) {
      const nowDate = new Date();
      const active = mutes.filter(m => m.expiresAt > nowDate);
      if (active.length === 0) {
        this.tempMutes.delete(oderId);
      } else {
        this.tempMutes.set(oderId, active);
      }
    }
  }

  /**
   * Clear room data (when room closes)
   */
  clearRoom(roomCode: string): void {
    this.roomMutes.delete(roomCode);
  }
}

export const moderationService = ModerationService.getInstance();
export default moderationService;

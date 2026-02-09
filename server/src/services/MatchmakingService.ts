/**
 * Matchmaking Service
 * Handles player queues, matchmaking logic, and game creation
 * 
 * Supports:
 * - Quick Play (random games)
 * - Public matchmaking
 * - Friends-only private games
 * - Guest matchmaking (isolated)
 * - Bot filling when needed
 */

import { v4 as uuidv4 } from 'uuid';
import { EventEmitter } from 'events';
import { botService, BotDifficulty } from './BotService';
import { roomManager } from './RoomManager';
import { IPlayer, RoomVisibility, IRoomSettings, DEFAULT_ROOM_SETTINGS } from '../types';
import logger from '../utils/logger';

// Matchmaking modes
export type MatchmakingMode = 'QUICK_PLAY' | 'PUBLIC' | 'FRIENDS_ONLY' | 'PRIVATE';

// Queue entry for a player
export interface QueueEntry {
  oderId: string;
  username: string;
  socketId: string;
  mode: MatchmakingMode;
  isGuest: boolean;
  matchmakingRating?: number;
  joinedAt: Date;
  friendIds?: string[]; // For friends-only mode
  preferredSettings?: Partial<IRoomSettings>;
}

// Match found result
export interface MatchResult {
  roomCode: string;
  players: QueueEntry[];
  bots: IPlayer[];
  mode: MatchmakingMode;
}

// Queue statistics
export interface QueueStats {
  quickPlayQueue: number;
  publicQueue: number;
  guestQueue: number;
  totalQueued: number;
  averageWaitTime: number;
}

// Configuration
const MIN_PLAYERS_TO_START = 3;
const MAX_PLAYERS = 12;
const QUEUE_TIMEOUT_MS = 60000; // 1 minute for guest mode
const MATCHMAKING_INTERVAL_MS = 2000; // Check every 2 seconds
const MAX_RATING_DIFF = 300; // For skill-based matching
const BOT_FILL_DELAY_MS = 30000; // Wait 30s before filling with bots (non-guest)

class MatchmakingService extends EventEmitter {
  private static instance: MatchmakingService;
  
  // Separate queues
  private quickPlayQueue: Map<string, QueueEntry> = new Map();
  private publicQueue: Map<string, QueueEntry> = new Map();
  private guestQueue: Map<string, QueueEntry> = new Map();
  
  // Timer for matchmaking checks
  private matchmakingTimer?: NodeJS.Timeout;
  
  // Track wait times
  private waitTimes: number[] = [];

  private constructor() {
    super();
    this.startMatchmakingLoop();
  }

  static getInstance(): MatchmakingService {
    if (!MatchmakingService.instance) {
      MatchmakingService.instance = new MatchmakingService();
    }
    return MatchmakingService.instance;
  }

  /**
   * Add a player to the matchmaking queue
   */
  joinQueue(entry: QueueEntry): { success: boolean; position: number; estimatedWait: number } {
    const queue = this.getQueueForMode(entry.mode, entry.isGuest);
    
    // Check if already in queue
    if (this.isInAnyQueue(entry.oderId)) {
      this.leaveQueue(entry.oderId);
    }

    queue.set(entry.oderId, {
      ...entry,
      joinedAt: new Date()
    });

    const position = queue.size;
    const estimatedWait = this.calculateEstimatedWait(queue.size);

    logger.info(`Player joined ${entry.mode} queue: ${entry.username} (position: ${position})`);
    
    this.emit('queue:joined', { 
      oderId: entry.oderId, 
      mode: entry.mode, 
      position,
      estimatedWait 
    });

    return { success: true, position, estimatedWait };
  }

  /**
   * Remove a player from all queues
   */
  leaveQueue(oderId: string): boolean {
    let removed = false;

    if (this.quickPlayQueue.delete(oderId)) removed = true;
    if (this.publicQueue.delete(oderId)) removed = true;
    if (this.guestQueue.delete(oderId)) removed = true;

    if (removed) {
      logger.info(`Player left matchmaking queue: ${oderId}`);
      this.emit('queue:left', { oderId });
    }

    return removed;
  }

  /**
   * Check if player is in any queue
   */
  isInAnyQueue(oderId: string): boolean {
    return this.quickPlayQueue.has(oderId) || 
           this.publicQueue.has(oderId) || 
           this.guestQueue.has(oderId);
  }

  /**
   * Get appropriate queue based on mode and guest status
   */
  private getQueueForMode(mode: MatchmakingMode, isGuest: boolean): Map<string, QueueEntry> {
    if (isGuest) {
      return this.guestQueue;
    }
    
    switch (mode) {
      case 'QUICK_PLAY':
        return this.quickPlayQueue;
      case 'PUBLIC':
        return this.publicQueue;
      default:
        return this.publicQueue;
    }
  }

  /**
   * Start the matchmaking loop
   */
  private startMatchmakingLoop(): void {
    this.matchmakingTimer = setInterval(() => {
      this.processQueues();
    }, MATCHMAKING_INTERVAL_MS);

    logger.info('Matchmaking service started');
  }

  /**
   * Process all queues and create matches
   */
  private async processQueues(): Promise<void> {
    try {
      // Process guest queue (with bot fill after timeout)
      await this.processGuestQueue();
      
      // Process quick play queue
      await this.processQuickPlayQueue();
      
      // Process public queue
      await this.processPublicQueue();
    } catch (error) {
      logger.error('Error processing matchmaking queues:', error);
    }
  }

  /**
   * Process guest queue - strict timeout rules
   */
  private async processGuestQueue(): Promise<void> {
    if (this.guestQueue.size === 0) return;

    const now = new Date();
    const entries = Array.from(this.guestQueue.values());
    
    // Sort by join time
    entries.sort((a, b) => a.joinedAt.getTime() - b.joinedAt.getTime());

    // Check for players who've waited long enough
    const timeoutEntries = entries.filter(e => 
      now.getTime() - e.joinedAt.getTime() >= QUEUE_TIMEOUT_MS
    );

    // If we have enough players, create a game
    if (entries.length >= MIN_PLAYERS_TO_START) {
      const match = entries.slice(0, MAX_PLAYERS);
      await this.createGuestMatch(match);
      return;
    }

    // If anyone has timed out, fill with bots and start
    if (timeoutEntries.length > 0 && entries.length > 0) {
      await this.createGuestMatch(entries, true);
    }
  }

  /**
   * Process quick play queue - looser matching
   */
  private async processQuickPlayQueue(): Promise<void> {
    if (this.quickPlayQueue.size === 0) return;

    const entries = Array.from(this.quickPlayQueue.values());
    
    // Quick play can start with 3+ players immediately
    if (entries.length >= MIN_PLAYERS_TO_START) {
      const match = entries.slice(0, MAX_PLAYERS);
      await this.createQuickPlayMatch(match);
      return;
    }

    // Check for long waits - fill with bots after 30s
    const now = new Date();
    const oldestEntry = entries.reduce((oldest, e) => 
      e.joinedAt.getTime() < oldest.joinedAt.getTime() ? e : oldest
    );
    
    if (now.getTime() - oldestEntry.joinedAt.getTime() >= BOT_FILL_DELAY_MS) {
      await this.createQuickPlayMatch(entries, true);
    }
  }

  /**
   * Process public queue - skill-based matching
   */
  private async processPublicQueue(): Promise<void> {
    if (this.publicQueue.size < MIN_PLAYERS_TO_START) return;

    const entries = Array.from(this.publicQueue.values());
    
    // Sort by rating for skill-based matching
    entries.sort((a, b) => (a.matchmakingRating || 1000) - (b.matchmakingRating || 1000));

    // Group players by similar skill
    const groups = this.groupBySkill(entries);
    
    for (const group of groups) {
      if (group.length >= MIN_PLAYERS_TO_START) {
        await this.createPublicMatch(group.slice(0, MAX_PLAYERS));
      }
    }
  }

  /**
   * Group players by similar skill rating
   */
  private groupBySkill(entries: QueueEntry[]): QueueEntry[][] {
    const groups: QueueEntry[][] = [];
    let currentGroup: QueueEntry[] = [];
    let baseRating = entries[0]?.matchmakingRating || 1000;

    for (const entry of entries) {
      const rating = entry.matchmakingRating || 1000;
      
      if (Math.abs(rating - baseRating) <= MAX_RATING_DIFF) {
        currentGroup.push(entry);
      } else {
        if (currentGroup.length > 0) {
          groups.push(currentGroup);
        }
        currentGroup = [entry];
        baseRating = rating;
      }
    }

    if (currentGroup.length > 0) {
      groups.push(currentGroup);
    }

    return groups;
  }

  /**
   * Create a guest match
   */
  private async createGuestMatch(players: QueueEntry[], fillWithBots = false): Promise<void> {
    const botsNeeded = fillWithBots ? Math.max(0, MIN_PLAYERS_TO_START - players.length) : 0;
    
    // Create bots
    const bots: IPlayer[] = [];
    for (let i = 0; i < botsNeeded; i++) {
      const difficulty: BotDifficulty = BotDifficulty.MEDIUM;
      bots.push(botService.createBot(difficulty));
    }

    // Remove players from queue
    players.forEach(p => this.guestQueue.delete(p.oderId));

    // Create the room
    const roomName = `Guest Game #${Math.floor(Math.random() * 10000)}`;
    const hostEntry = players[0];

    try {
      const room = await roomManager.createRoom(
        hostEntry.oderId,
        hostEntry.username,
        hostEntry.socketId,
        roomName,
        RoomVisibility.PRIVATE,
        { ...DEFAULT_ROOM_SETTINGS }
      );

      // Add other players
      for (let i = 1; i < players.length; i++) {
        await roomManager.joinRoom(
          room.code,
          players[i].oderId,
          players[i].username,
          players[i].socketId
        );
      }

      // Note: Bots will be added via enhanced socket handlers
      // We emit the match found event with bot info for separate handling

      const match: MatchResult = {
        roomCode: room.code,
        players,
        bots,
        mode: 'QUICK_PLAY'
      };

      // Record wait times
      const now = new Date();
      players.forEach(p => {
        this.waitTimes.push(now.getTime() - p.joinedAt.getTime());
      });
      if (this.waitTimes.length > 100) {
        this.waitTimes = this.waitTimes.slice(-100);
      }

      logger.info(`Guest match created: ${room.code} with ${players.length} players and ${bots.length} bots`);
      
      this.emit('match:created', match);
    } catch (error) {
      logger.error('Error creating guest match:', error);
      // Re-add players to queue on failure
      players.forEach(p => this.guestQueue.set(p.oderId, p));
    }
  }

  /**
   * Create a quick play match
   */
  private async createQuickPlayMatch(players: QueueEntry[], fillWithBots = false): Promise<void> {
    const targetSize = Math.min(MAX_PLAYERS, Math.max(MIN_PLAYERS_TO_START, players.length + 2));
    const botsNeeded = fillWithBots ? Math.max(0, targetSize - players.length) : 0;
    
    const bots: IPlayer[] = [];
    for (let i = 0; i < botsNeeded; i++) {
      const difficulties: BotDifficulty[] = [BotDifficulty.EASY, BotDifficulty.MEDIUM, BotDifficulty.HARD];
      const difficulty = difficulties[Math.floor(Math.random() * difficulties.length)];
      bots.push(botService.createBot(difficulty));
    }

    // Remove players from queue
    players.forEach(p => this.quickPlayQueue.delete(p.oderId));

    const roomName = `Quick Play #${Math.floor(Math.random() * 10000)}`;
    const hostEntry = players[0];

    try {
      const room = await roomManager.createRoom(
        hostEntry.oderId,
        hostEntry.username,
        hostEntry.socketId,
        roomName,
        RoomVisibility.PUBLIC,
        { ...DEFAULT_ROOM_SETTINGS }
      );

      for (let i = 1; i < players.length; i++) {
        await roomManager.joinRoom(
          room.code,
          players[i].oderId,
          players[i].username,
          players[i].socketId
        );
      }

      // Note: Bots will be added via enhanced socket handlers

      const match: MatchResult = {
        roomCode: room.code,
        players,
        bots,
        mode: 'QUICK_PLAY'
      };

      const now = new Date();
      players.forEach(p => {
        this.waitTimes.push(now.getTime() - p.joinedAt.getTime());
      });
      if (this.waitTimes.length > 100) {
        this.waitTimes = this.waitTimes.slice(-100);
      }

      logger.info(`Quick play match created: ${room.code} with ${players.length} players and ${bots.length} bots`);
      
      this.emit('match:created', match);
    } catch (error) {
      logger.error('Error creating quick play match:', error);
      players.forEach(p => this.quickPlayQueue.set(p.oderId, p));
    }
  }

  /**
   * Create a public match (skill-based)
   */
  private async createPublicMatch(players: QueueEntry[]): Promise<void> {
    players.forEach(p => this.publicQueue.delete(p.oderId));

    const avgRating = players.reduce((sum, p) => sum + (p.matchmakingRating || 1000), 0) / players.length;
    const tierName = this.getTierName(avgRating);
    const roomName = `${tierName} Match #${Math.floor(Math.random() * 10000)}`;
    const hostEntry = players[0];

    try {
      const room = await roomManager.createRoom(
        hostEntry.oderId,
        hostEntry.username,
        hostEntry.socketId,
        roomName,
        RoomVisibility.PUBLIC,
        { ...DEFAULT_ROOM_SETTINGS }
      );

      for (let i = 1; i < players.length; i++) {
        await roomManager.joinRoom(
          room.code,
          players[i].oderId,
          players[i].username,
          players[i].socketId
        );
      }

      const match: MatchResult = {
        roomCode: room.code,
        players,
        bots: [],
        mode: 'PUBLIC'
      };

      const now = new Date();
      players.forEach(p => {
        this.waitTimes.push(now.getTime() - p.joinedAt.getTime());
      });
      if (this.waitTimes.length > 100) {
        this.waitTimes = this.waitTimes.slice(-100);
      }

      logger.info(`Public match created: ${room.code} with ${players.length} players`);
      
      this.emit('match:created', match);
    } catch (error) {
      logger.error('Error creating public match:', error);
      players.forEach(p => this.publicQueue.set(p.oderId, p));
    }
  }

  /**
   * Get tier name from rating
   */
  private getTierName(rating: number): string {
    if (rating >= 2000) return 'Diamond';
    if (rating >= 1600) return 'Platinum';
    if (rating >= 1300) return 'Gold';
    if (rating >= 1100) return 'Silver';
    return 'Bronze';
  }

  /**
   * Calculate estimated wait time
   */
  private calculateEstimatedWait(queuePosition: number): number {
    if (this.waitTimes.length === 0) {
      return 30000; // Default 30 seconds
    }
    
    const avgWait = this.waitTimes.reduce((a, b) => a + b, 0) / this.waitTimes.length;
    return Math.min(avgWait * (queuePosition / MIN_PLAYERS_TO_START), QUEUE_TIMEOUT_MS);
  }

  /**
   * Get queue statistics
   */
  getQueueStats(): QueueStats {
    const avgWait = this.waitTimes.length > 0 
      ? this.waitTimes.reduce((a, b) => a + b, 0) / this.waitTimes.length 
      : 0;

    return {
      quickPlayQueue: this.quickPlayQueue.size,
      publicQueue: this.publicQueue.size,
      guestQueue: this.guestQueue.size,
      totalQueued: this.quickPlayQueue.size + this.publicQueue.size + this.guestQueue.size,
      averageWaitTime: avgWait
    };
  }

  /**
   * Get player's queue position
   */
  getQueuePosition(oderId: string): number | null {
    for (const [queue, name] of [
      [this.quickPlayQueue, 'quick'],
      [this.publicQueue, 'public'],
      [this.guestQueue, 'guest']
    ] as [Map<string, QueueEntry>, string][]) {
      const entries = Array.from(queue.values());
      const index = entries.findIndex(e => e.oderId === oderId);
      if (index !== -1) {
        return index + 1;
      }
    }
    return null;
  }

  /**
   * Handle player disconnect
   */
  handleDisconnect(oderId: string): void {
    this.leaveQueue(oderId);
  }

  /**
   * Create a friends-only room
   */
  async createFriendsOnlyRoom(
    hostOderId: string,
    hostUsername: string,
    hostSocketId: string,
    invitedFriends: string[],
    settings?: Partial<IRoomSettings>
  ): Promise<string> {
    const roomName = `${hostUsername}'s Private Game`;
    
    const room = await roomManager.createRoom(
      hostOderId,
      hostUsername,
      hostSocketId,
      roomName,
      RoomVisibility.PRIVATE,
      { ...DEFAULT_ROOM_SETTINGS, ...settings }
    );

    // Note: Invite list is tracked separately by the application layer

    logger.info(`Friends-only room created: ${room.code} by ${hostUsername}`);

    return room.code;
  }

  /**
   * Check if a user can join a friends-only room
   * Note: This is a simplified version - full implementation would need room metadata
   */
  canJoinFriendsRoom(roomCode: string, oderId: string): boolean {
    const room = roomManager.getRoom(roomCode);
    if (!room) return false;
    
    // Host can always join
    if (room.hostId === oderId) return true;
    
    // For now, allow anyone to join - actual invite checking would be done at a higher level
    return true;
  }

  /**
   * Shutdown service
   */
  destroy(): void {
    if (this.matchmakingTimer) {
      clearInterval(this.matchmakingTimer);
    }
    this.quickPlayQueue.clear();
    this.publicQueue.clear();
    this.guestQueue.clear();
    logger.info('Matchmaking service stopped');
  }
}

export const matchmakingService = MatchmakingService.getInstance();
export default matchmakingService;

/**
 * Enhanced Socket.IO Event Handlers
 * Integration layer for new services (auth, matchmaking, bots, friends, moderation)
 * 
 * This module provides helper functions that can be integrated with the main handlers
 */

import { Server, Socket } from 'socket.io';
import { roomManager } from '../services/RoomManager';
import { chatService } from '../services/ChatService';
import { authService } from '../services/AuthService';
import { matchmakingService, QueueEntry } from '../services/MatchmakingService';
import { friendsService } from '../services/FriendsService';
import { moderationService } from '../services/ModerationService';
import { botService, IBot, BotDifficulty } from '../services/BotService';
import { statsService } from '../services/StatsService';
import { IPlayerGameRecord } from '../models/GameRecord';
import {
  ServerToClientEvents,
  ClientToServerEvents,
  GamePhase,
  Role,
  Team,
  PlayerStatus,
  ActionType,
  WinCondition
} from '../types';
import logger from '../utils/logger';

// Extended authenticated socket
interface AuthenticatedSocket extends Socket<ClientToServerEvents, ServerToClientEvents> {
  oderId: string;
  username: string;
  currentRoom?: string;
  isGuest: boolean;
  isBot?: boolean;
}

// Bot tracking
const activeBots: Map<string, IBot[]> = new Map(); // roomCode -> bots in room

/**
 * Verify socket authentication
 */
export async function verifySocketAuth(socket: Socket): Promise<{ oderId: string; username: string; isGuest: boolean } | null> {
  const token = socket.handshake.auth.token;
  
  if (token) {
    const payload = authService.verifyToken(token);
    if (payload) {
      return {
        oderId: payload.oderId,
        username: payload.username,
        isGuest: payload.isGuest
      };
    }
  }
  
  // Fall back to guest/anonymous
  const guestData = authService.createGuestUser();
  return {
    oderId: guestData.oderId,
    username: guestData.username,
    isGuest: true
  };
}

/**
 * Check if a message passes moderation
 */
export function checkMessageModeration(
  oderId: string, 
  roomCode: string,
  content: string
): { allowed: boolean; filtered: string; reason?: string } {
  const result = moderationService.checkMessage(oderId, roomCode, content);
  return result;
}

/**
 * Add bots to a room
 */
export async function addBotsToRoom(
  io: Server,
  roomCode: string,
  count: number,
  difficulty: BotDifficulty = BotDifficulty.MEDIUM
): Promise<IBot[]> {
  const bots: IBot[] = [];
  
  for (let i = 0; i < count; i++) {
    const bot = botService.createBot(difficulty);
    bots.push(bot);
    
    // Add bot to room
    await roomManager.joinRoom(
      roomCode,
      bot.oderId,
      bot.username,
      `bot_${bot.oderId}` // Virtual socket ID
    );
    
    // Notify room of bot joining (they appear as regular players)
    io.to(roomCode).emit('room:playerJoined', {
      odId: bot.oderId,
      oderId: bot.oderId,
      username: bot.username,
      avatar: 'bot_default',
      status: PlayerStatus.ALIVE,
      isHost: false,
      isConnected: true
    });
  }
  
  // Track bots for this room
  activeBots.set(roomCode, [...(activeBots.get(roomCode) || []), ...bots]);
  
  return bots;
}

/**
 * Process bot turn for a specific phase
 */
export async function processBotTurn(
  io: Server,
  roomCode: string,
  phase: GamePhase,
  validTargets: string[]
): Promise<void> {
  const bots = activeBots.get(roomCode) || [];
  const gameEngine = roomManager.getGameEngine(roomCode);
  
  if (!gameEngine || bots.length === 0) return;
  
  const state = gameEngine.getState();
  if (!state) return;
  
  // Build game context for bot decisions
  const gameContext = {
    alivePlayers: state.alivePlayers as string[],
    deadPlayers: state.deadPlayers as string[],
    playerNames: new Map<string, string>(),
    dayNumber: state.dayNumber as number,
    recentKills: [] as string[],
    recentVotes: new Map<string, string>()
  };
  
  for (const bot of bots) {
    // Skip dead bots
    if (!state.alivePlayers.includes(bot.oderId)) continue;
    
    const botRole = state.roleAssignments.get(bot.oderId) as Role;
    if (!botRole) continue;
    
    // Get bot decision based on phase
    if (phase === GamePhase.VOTING) {
      const currentVotes = new Map<string, number>();
      const decision = await botService.decideVote(bot.oderId, validTargets, currentVotes, gameContext);
      if (decision.targetId) {
        // Add delay to simulate thinking
        setTimeout(async () => {
          await gameEngine.processVote(bot.oderId, decision.targetId!);
        }, decision.delay);
      }
    } else if (isNightPhase(phase)) {
      const decision = await botService.decideNightAction(bot.oderId, phase, validTargets, gameContext);
      if (decision.targetId) {
        const actionType = getActionTypeForPhase(phase);
        setTimeout(async () => {
          await gameEngine.processNightAction(bot.oderId, decision.targetId!, actionType);
        }, decision.delay);
      }
    }
  }
}

/**
 * Generate bot chat during day discussion
 */
export async function generateBotChat(
  io: Server,
  roomCode: string
): Promise<void> {
  const bots = activeBots.get(roomCode) || [];
  const gameEngine = roomManager.getGameEngine(roomCode);
  
  if (!gameEngine || bots.length === 0) return;
  
  const state = gameEngine.getState();
  if (!state) return;
  
  // Build game context
  const gameContext = {
    alivePlayers: state.alivePlayers,
    deadPlayers: state.deadPlayers,
    playerNames: new Map<string, string>(),
    dayNumber: state.dayNumber,
    recentKills: [] as string[],
    recentVotes: new Map<string, string>()
  };
  
  for (const bot of bots) {
    // Skip dead bots
    if (!state.alivePlayers.includes(bot.oderId)) continue;
    
    // 50% chance this bot speaks
    if (Math.random() > 0.5) continue;
    
    const messageResult = botService.generateChatMessage(
      bot.oderId, 
      state.currentPhase, 
      false, // isMafiaChat
      gameContext
    );
    
    if (messageResult.message) {
      // Random delay 5-30 seconds
      setTimeout(() => {
        const chatMsg = chatService.processMessage(
          roomCode,
          bot.oderId,
          bot.username,
          messageResult.message!,
          'player'
        );
        
        if (chatMsg) {
          io.to(roomCode).emit('day:chat', chatMsg);
        }
      }, messageResult.delay);
    }
  }
}

/**
 * Record game completion and update stats
 */
export async function handleGameEnd(
  roomCode: string,
  winCondition: WinCondition,
  winningTeam: Team
): Promise<void> {
  const room = roomManager.getRoom(roomCode);
  const gameEngine = roomManager.getGameEngine(roomCode);
  
  if (!room || !gameEngine) return;
  
  const state = gameEngine.getState();
  if (!state) return;
  
  const roomBots = activeBots.get(roomCode) || [];
  const botIds = new Set(roomBots.map(b => b.oderId));
  
  // Build player records for stats (exclude bots)
  const playerRecords: IPlayerGameRecord[] = room.players
    .filter(p => !botIds.has(p.oderId))
    .map(p => ({
      oderId: p.oderId,
      username: p.username,
      role: String(state.roleAssignments.get(p.oderId) || 'VILLAGER'),
      team: String(state.teamAssignments.get(p.oderId) || 'TOWN'),
      finalStatus: state.alivePlayers.includes(p.oderId) ? 'ALIVE' as const : 'DEAD' as const,
      isWinner: state.teamAssignments.get(p.oderId) === winningTeam,
      actions: []
    }));
  
  // Get winning player oderIds
  const winningPlayers = playerRecords
    .filter(p => p.isWinner)
    .map(p => p.oderId);
  
  // Record game and update stats
  try {
    await statsService.recordGame(
      `game_${roomCode}_${Date.now()}`, // gameId
      roomCode,
      room.name,
      winCondition,
      winningTeam,
      winningPlayers,
      playerRecords,
      room.settings || {},
      'PUBLIC', // gameMode
      state.dayNumber,
      Date.now() - room.createdAt.getTime(),
      roomBots.length > 0, // hadBots
      roomBots.length // botCount
    );
    
    logger.info(`Stats recorded for game ${roomCode}`);
  } catch (error) {
    logger.error('Error recording game stats:', error);
  }
  
  // Cleanup bots
  roomBots.forEach(bot => botService.removeBot(bot.oderId));
  activeBots.delete(roomCode);
}

/**
 * Setup matchmaking event listeners
 */
export function setupMatchmakingEventListeners(io: Server): void {
  matchmakingService.on('matchFound', (data: any) => {
    const { roomCode, players } = data;
    
    players.forEach((player: QueueEntry) => {
      io.to(player.socketId).emit('matchmaking:found' as any, {
        roomCode,
        players: players.map((p: QueueEntry) => ({ oderId: p.oderId, username: p.username }))
      });
    });
  });
}

// Helper functions

function isNightPhase(phase: GamePhase): boolean {
  return [
    GamePhase.NIGHT,
    GamePhase.MAFIA_ACTION,
    GamePhase.DETECTIVE_ACTION,
    GamePhase.DOCTOR_ACTION,
    GamePhase.DON_ACTION,
    GamePhase.VIGILANTE_ACTION
  ].includes(phase);
}

function getActionTypeForPhase(phase: GamePhase): ActionType {
  switch (phase) {
    case GamePhase.MAFIA_ACTION:
      return ActionType.MAFIA_KILL;
    case GamePhase.DETECTIVE_ACTION:
      return ActionType.DETECTIVE_INVESTIGATE;
    case GamePhase.DOCTOR_ACTION:
      return ActionType.DOCTOR_SAVE;
    case GamePhase.VIGILANTE_ACTION:
      return ActionType.VIGILANTE_KILL;
    case GamePhase.DON_ACTION:
      return ActionType.DON_INVESTIGATE;
    default:
      return ActionType.MAFIA_KILL;
  }
}

export { activeBots };


/**
 * Room Manager Service
 * Manages active game rooms and their lifecycle
 */

import { v4 as uuidv4 } from 'uuid';
import { Room, IRoomDocument } from '../models/Room';
import { GameStateMachine } from './GameStateMachine';
import { 
  RoomVisibility, 
  PlayerStatus, 
  IRoomSettings, 
  DEFAULT_ROOM_SETTINGS,
  IPlayerPublic,
  IRoomPublic,
  GamePhase
} from '../types';
import logger, { gameLogger } from '../utils/logger';

interface ActiveRoom {
  room: IRoomDocument;
  gameEngine: GameStateMachine | null;
  lastActivity: Date;
}

export class RoomManager {
  private activeRooms: Map<string, ActiveRoom> = new Map();
  private playerRoomMap: Map<string, string> = new Map(); // oderId -> roomId
  private cleanupInterval: NodeJS.Timeout;

  constructor() {
    // Cleanup inactive rooms every 5 minutes
    this.cleanupInterval = setInterval(() => this.cleanupInactiveRooms(), 300000);
  }

  /**
   * Create a new room
   */
  async createRoom(
    hostId: string,
    hostUsername: string,
    hostSocketId: string,
    name: string,
    visibility: RoomVisibility,
    settings?: Partial<IRoomSettings>
  ): Promise<IRoomDocument> {
    // Generate unique room code
    const code = await this.generateRoomCode();
    
    const room = new Room({
      code,
      name: name || `${hostUsername}'s Room`,
      visibility,
      hostId,
      players: [{
        oderId: hostId,
        odId: uuidv4(),
        username: hostUsername,
        socketId: hostSocketId,
        status: PlayerStatus.ALIVE,
        isHost: true,
        isConnected: true,
        joinedAt: new Date()
      }],
      settings: { ...DEFAULT_ROOM_SETTINGS, ...settings },
      isActive: true
    });

    await room.save();

    // Track active room
    this.activeRooms.set(room.code, {
      room,
      gameEngine: null,
      lastActivity: new Date()
    });

    this.playerRoomMap.set(hostId, room.code);

    gameLogger.roomCreated(room.code, hostId);

    return room;
  }

  /**
   * Join an existing room
   */
  async joinRoom(
    roomCode: string,
    oderId: string,
    username: string,
    socketId: string
  ): Promise<{ room: IRoomDocument; isReconnect: boolean }> {
    const activeRoom = this.activeRooms.get(roomCode);
    
    if (!activeRoom) {
      // Try to load from database
      const dbRoom = await Room.findOne({ code: roomCode, isActive: true });
      if (!dbRoom) {
        throw new Error('Room not found');
      }
      
      this.activeRooms.set(roomCode, {
        room: dbRoom,
        gameEngine: null,
        lastActivity: new Date()
      });
      
      return this.joinRoom(roomCode, oderId, username, socketId);
    }

    const room = activeRoom.room;

    // Check if player is reconnecting
    const existingPlayer = room.players.find(p => p.oderId === oderId);
    
    if (existingPlayer) {
      // Reconnection
      existingPlayer.socketId = socketId;
      existingPlayer.isConnected = true;
      await room.save();
      
      activeRoom.lastActivity = new Date();
      
      return { room, isReconnect: true };
    }

    // Check if room is full
    if (room.players.length >= room.maxPlayers) {
      throw new Error('Room is full');
    }

    // Check if game has started
    if (room.gameId) {
      throw new Error('Game already in progress');
    }

    // Add new player
    room.players.push({
      oderId,
      odId: uuidv4(),
      username,
      avatar: 'default',
      socketId,
      status: PlayerStatus.ALIVE,
      isHost: false,
      isConnected: true,
      joinedAt: new Date()
    });

    await room.save();

    this.playerRoomMap.set(oderId, roomCode);
    activeRoom.lastActivity = new Date();

    gameLogger.playerJoined(roomCode, oderId, username);

    return { room, isReconnect: false };
  }

  /**
   * Leave a room
   */
  async leaveRoom(roomCode: string, oderId: string): Promise<void> {
    const activeRoom = this.activeRooms.get(roomCode);
    if (!activeRoom) return;

    const room = activeRoom.room;
    const playerIndex = room.players.findIndex(p => p.oderId === oderId);
    
    if (playerIndex === -1) return;

    const player = room.players[playerIndex];
    const wasHost = player.isHost;

    // If game is in progress, mark as disconnected instead of removing
    if (room.gameId) {
      player.isConnected = false;
      await room.save();
    } else {
      // Remove player if game hasn't started
      room.players.splice(playerIndex, 1);

      // If host left, assign new host
      if (wasHost && room.players.length > 0) {
        room.players[0].isHost = true;
        room.hostId = room.players[0].oderId;
      }

      // If no players left, deactivate room
      if (room.players.length === 0) {
        room.isActive = false;
        this.activeRooms.delete(roomCode);
      }

      await room.save();
    }

    this.playerRoomMap.delete(oderId);
    gameLogger.playerLeft(roomCode, oderId);
  }

  /**
   * Kick a player from room (host only)
   */
  async kickPlayer(roomCode: string, hostId: string, targetId: string): Promise<void> {
    const activeRoom = this.activeRooms.get(roomCode);
    if (!activeRoom) throw new Error('Room not found');

    const room = activeRoom.room;

    // Verify host
    if (room.hostId !== hostId) {
      throw new Error('Only the host can kick players');
    }

    // Cannot kick yourself
    if (hostId === targetId) {
      throw new Error('Cannot kick yourself');
    }

    // Cannot kick during game
    if (room.gameId) {
      throw new Error('Cannot kick players during game');
    }

    const playerIndex = room.players.findIndex(p => p.oderId === targetId);
    if (playerIndex === -1) {
      throw new Error('Player not found');
    }

    room.players.splice(playerIndex, 1);
    await room.save();

    this.playerRoomMap.delete(targetId);
  }

  /**
   * Update room settings (host only)
   */
  async updateSettings(
    roomCode: string, 
    hostId: string, 
    settings: Partial<IRoomSettings>
  ): Promise<IRoomDocument> {
    const activeRoom = this.activeRooms.get(roomCode);
    if (!activeRoom) throw new Error('Room not found');

    const room = activeRoom.room;

    // Verify host
    if (room.hostId !== hostId) {
      throw new Error('Only the host can update settings');
    }

    // Cannot change settings during game
    if (room.gameId) {
      throw new Error('Cannot change settings during game');
    }

    // Merge settings
    room.settings = {
      ...room.settings,
      ...settings,
      timers: {
        ...room.settings.timers,
        ...(settings.timers || {})
      }
    };

    await room.save();
    return room;
  }

  /**
   * Start the game
   */
  async startGame(roomCode: string, hostId: string): Promise<GameStateMachine> {
    const activeRoom = this.activeRooms.get(roomCode);
    if (!activeRoom) throw new Error('Room not found');

    const room = activeRoom.room;

    // Verify host
    if (room.hostId !== hostId) {
      throw new Error('Only the host can start the game');
    }

    // Check player count
    const connectedPlayers = room.players.filter(p => p.isConnected);
    if (connectedPlayers.length < room.minPlayers) {
      throw new Error(`Need at least ${room.minPlayers} players to start`);
    }

    if (connectedPlayers.length > room.maxPlayers) {
      throw new Error(`Cannot have more than ${room.maxPlayers} players`);
    }

    // Create game engine
    const gameEngine = new GameStateMachine();
    await gameEngine.initializeGame(room);

    activeRoom.gameEngine = gameEngine;
    activeRoom.lastActivity = new Date();

    return gameEngine;
  }

  /**
   * Get room by code
   */
  getRoom(roomCode: string): IRoomDocument | null {
    const activeRoom = this.activeRooms.get(roomCode);
    return activeRoom?.room || null;
  }

  /**
   * Get game engine for a room
   */
  getGameEngine(roomCode: string): GameStateMachine | null {
    const activeRoom = this.activeRooms.get(roomCode);
    return activeRoom?.gameEngine || null;
  }

  /**
   * Get room code for a player
   */
  getRoomCodeForPlayer(oderId: string): string | undefined {
    return this.playerRoomMap.get(oderId);
  }

  /**
   * Get public room list
   */
  async getPublicRooms(): Promise<IRoomPublic[]> {
    const rooms: IRoomPublic[] = [];

    this.activeRooms.forEach((activeRoom) => {
      const room = activeRoom.room;
      if (room.visibility === RoomVisibility.PUBLIC && room.isActive && !room.gameId) {
        rooms.push(this.toPublicRoom(room));
      }
    });

    return rooms;
  }

  /**
   * Convert room to public format
   */
  toPublicRoom(room: IRoomDocument): IRoomPublic {
    return {
      id: room._id.toString(),
      code: room.code,
      name: room.name,
      visibility: room.visibility as RoomVisibility,
      hostId: room.hostId,
      players: room.players.map(p => this.toPublicPlayer(p, room)),
      maxPlayers: room.maxPlayers,
      minPlayers: room.minPlayers,
      settings: {
        ...room.settings,
        tieBreaker: room.settings.tieBreaker as 'no_elimination' | 'revote' | 'random'
      },
      isGameActive: !!room.gameId,
      currentPhase: room.gameId ? this.getGameEngine(room.code)?.getState()?.phase as GamePhase : undefined
    };
  }

  /**
   * Convert player to public format
   */
  toPublicPlayer(player: any, room: IRoomDocument): IPlayerPublic {
    const gameEngine = this.getGameEngine(room.code);
    const gameState = gameEngine?.getState();

    return {
      odId: player.odId,
      oderId: player.oderId,
      username: player.username,
      avatar: player.avatar,
      status: player.status,
      isHost: player.isHost,
      isConnected: player.isConnected,
      // Only reveal role in certain conditions
      role: gameState?.phase === GamePhase.GAME_OVER || player.status === PlayerStatus.DEAD 
        ? player.role 
        : undefined
    };
  }

  /**
   * Generate unique room code
   */
  private async generateRoomCode(): Promise<string> {
    const characters = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code: string;
    let exists = true;

    while (exists) {
      code = '';
      for (let i = 0; i < 6; i++) {
        code += characters.charAt(Math.floor(Math.random() * characters.length));
      }
      exists = this.activeRooms.has(code) || !!(await Room.exists({ code }));
    }

    return code!;
  }

  /**
   * Cleanup inactive rooms
   */
  private async cleanupInactiveRooms(): Promise<void> {
    const now = new Date();
    const timeout = 30 * 60 * 1000; // 30 minutes

    for (const [code, activeRoom] of this.activeRooms.entries()) {
      const timeSinceActivity = now.getTime() - activeRoom.lastActivity.getTime();
      
      if (timeSinceActivity > timeout && !activeRoom.room.gameId) {
        // Deactivate room
        activeRoom.room.isActive = false;
        await activeRoom.room.save();
        
        // Cleanup game engine if exists
        activeRoom.gameEngine?.destroy();
        
        // Remove from active rooms
        this.activeRooms.delete(code);
        
        // Remove player mappings
        activeRoom.room.players.forEach(p => {
          this.playerRoomMap.delete(p.oderId);
        });

        logger.info(`Cleaned up inactive room: ${code}`);
      }
    }
  }

  /**
   * Handle player disconnect
   */
  async handleDisconnect(socketId: string): Promise<{ roomCode: string; oderId: string } | null> {
    // Find the room with this socket
    for (const [code, activeRoom] of this.activeRooms.entries()) {
      const player = activeRoom.room.players.find(p => p.socketId === socketId);
      
      if (player) {
        player.isConnected = false;
        await activeRoom.room.save();
        
        return { roomCode: code, oderId: player.oderId };
      }
    }

    return null;
  }

  /**
   * Shutdown cleanup
   */
  destroy(): void {
    clearInterval(this.cleanupInterval);
    
    this.activeRooms.forEach((activeRoom) => {
      activeRoom.gameEngine?.destroy();
    });
    
    this.activeRooms.clear();
    this.playerRoomMap.clear();
  }
}

// Singleton instance
export const roomManager = new RoomManager();

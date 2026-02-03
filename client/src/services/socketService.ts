/**
 * Socket.IO Client Service
 * Manages real-time communication with the game server
 */

import { io, Socket } from 'socket.io-client';
import { useGameStore } from '@/store/gameStore';
import { 
  IRoom, 
  IPlayer, 
  IChatMessage, 
  INightResult
} from '@/types';

// Use current domain in production, localhost in development
const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 
  (window.location.hostname === 'localhost' ? 'http://localhost:3001' : window.location.origin);

class SocketService {
  private socket: Socket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;

  /**
   * Initialize socket connection
   */
  connect(oderId: string, username: string): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.socket?.connected) {
        resolve();
        return;
      }

      this.socket = io(SOCKET_URL, {
        auth: {
          oderId,
          username
        },
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionAttempts: this.maxReconnectAttempts,
        reconnectionDelay: 1000,
        timeout: 10000
      });

      this.socket.on('connect', () => {
        console.log('Socket connected:', this.socket?.id);
        this.reconnectAttempts = 0;
        this.setupEventListeners();
        resolve();
      });

      this.socket.on('connect_error', (error) => {
        console.error('Socket connection error:', error);
        this.reconnectAttempts++;
        if (this.reconnectAttempts >= this.maxReconnectAttempts) {
          reject(new Error('Failed to connect to server'));
        }
      });

      this.socket.on('disconnect', (reason) => {
        console.log('Socket disconnected:', reason);
        useGameStore.getState().setConnectionStatus('disconnected');
      });

      this.socket.on('reconnect', () => {
        console.log('Socket reconnected');
        useGameStore.getState().setConnectionStatus('connected');
        // Re-join room if was in one
        const room = useGameStore.getState().room;
        if (room) {
          this.reconnectToRoom(room.code, oderId);
        }
      });
    });
  }

  /**
   * Setup all event listeners
   */
  private setupEventListeners(): void {
    if (!this.socket) return;

    const store = useGameStore.getState();

    // Room events
    this.socket.on('room:updated', (room: IRoom) => {
      store.setRoom(room);
    });

    this.socket.on('room:playerJoined', (player: IPlayer) => {
      store.addPlayer(player);
    });

    this.socket.on('room:playerLeft', (playerId: string) => {
      store.removePlayer(playerId);
    });

    this.socket.on('room:playerKicked', (playerId: string) => {
      const currentUser = store.user;
      if (currentUser?.oderId === playerId) {
        store.clearGame();
        store.setError('You have been kicked from the room');
      } else {
        store.removePlayer(playerId);
      }
    });

    this.socket.on('room:error', ({ message }) => {
      store.setError(message);
    });

    // Game events
    this.socket.on('game:started', (gameState) => {
      store.setGameState(gameState);
    });

    this.socket.on('game:phaseChange', ({ phase, timer, dayNumber }) => {
      console.log('[Socket] Phase changed to:', phase, 'timer:', timer, 'dayNumber:', dayNumber);
      store.setPhase(phase);
      store.setTimer(timer);
      store.setDayNumber(dayNumber);
      
      // Clear votes when transitioning to voting phase to allow new votes
      if (phase === 'VOTING') {
        store.clearVotes();
      }
    });

    this.socket.on('game:roleReveal', ({ role, team, teammates }) => {
      console.log('[Socket] Role revealed:', role, 'team:', team, 'teammates:', teammates);
      store.setPlayerRole(role, team, teammates);
      
      // Also update the current user's role in the room players list
      const currentRoom = store.room;
      const currentUser = store.user;
      if (currentRoom && currentUser) {
        const updatedPlayers = currentRoom.players.map(p => 
          p.oderId === currentUser.oderId 
            ? { ...p, role, team } 
            : p
        );
        store.setRoom({ ...currentRoom, players: updatedPlayers });
      }
    });

    this.socket.on('game:stateUpdate', (state) => {
      store.setGameState(state);
    });

    this.socket.on('game:end', ({ winner, winningTeam, winningPlayers }) => {
      store.setGameEnd(winner, winningTeam, winningPlayers);
    });

    // Timer events
    this.socket.on('timer:update', ({ remaining, phase: _phase }) => {
      store.setTimer(remaining);
    });

    this.socket.on('timer:roleSpecific', ({ remaining, forRole }) => {
      store.setRoleTimer(remaining, forRole);
    });

    // Night events
    this.socket.on('night:actionRequired', ({ role, timer, validTargets }) => {
      console.log('[Socket] Night action required for role:', role, 'validTargets:', validTargets);
      store.setActionRequired(true, validTargets);
      store.setRoleTimer(timer, role);
    });

    this.socket.on('night:actionConfirmed', ({ actionType: _actionType }) => {
      console.log('[Socket] Night action confirmed:', _actionType);
      store.setActionRequired(false, []);
      store.setHasActed(true);
    });

    this.socket.on('night:result', (result: INightResult) => {
      store.setNightResult(result);
    });

    this.socket.on('night:detectiveResult', ({ targetId, isGuilty }) => {
      store.setInvestigationResult(targetId, isGuilty);
    });

    this.socket.on('night:donResult', ({ targetId, isDetective }) => {
      store.setDonResult(targetId, isDetective);
    });

    // Day/Chat events
    this.socket.on('day:chat', (message: IChatMessage) => {
      store.addChatMessage(message);
    });

    this.socket.on('mafia:chat', (message: IChatMessage) => {
      store.addMafiaMessage(message);
    });

    // Vote events
    this.socket.on('vote:started', ({ timer, candidates: _candidates }) => {
      store.setTimer(timer);
    });

    this.socket.on('vote:update', ({ votes, hasVoted }) => {
      store.setVotes(votes, hasVoted);
    });

    this.socket.on('vote:result', ({ eliminatedId, eliminatedRole, voteCounts }) => {
      store.setVoteResult(eliminatedId, eliminatedRole, voteCounts);
    });

    // Player events
    this.socket.on('player:eliminated', ({ playerId, role, reason }) => {
      store.eliminatePlayer(playerId, role, reason);
    });

    this.socket.on('player:disconnected', (playerId: string) => {
      store.setPlayerDisconnected(playerId);
    });

    this.socket.on('player:reconnected', (playerId: string) => {
      store.setPlayerReconnected(playerId);
    });

    // Mafia events
    this.socket.on('mafia:voteUpdate', (votes: Record<string, string>) => {
      store.setMafiaVotes(votes);
    });

    // Error events
    this.socket.on('error', ({ message, code: _code }) => {
      store.setError(message);
    });
  }

  /**
   * Create a new room
   */
  createRoom(name: string, visibility: 'PUBLIC' | 'PRIVATE', settings?: any): Promise<IRoom> {
    return new Promise((resolve, reject) => {
      if (!this.socket) {
        reject(new Error('Socket not connected'));
        return;
      }

      this.socket.emit('room:create', { name, visibility, settings }, (response: { success: boolean; room?: IRoom; error?: string }) => {
        if (response.success && response.room) {
          useGameStore.getState().setRoom(response.room);
          resolve(response.room);
        } else {
          reject(new Error(response.error || 'Failed to create room'));
        }
      });
    });
  }

  /**
   * Join an existing room
   */
  joinRoom(roomCode: string, userId: string, username: string): Promise<IRoom> {
    return new Promise((resolve, reject) => {
      if (!this.socket) {
        reject(new Error('Socket not connected'));
        return;
      }

      this.socket.emit('room:join', { roomCode, userId, username }, (response: { success: boolean; room?: IRoom; error?: string }) => {
        if (response.success && response.room) {
          useGameStore.getState().setRoom(response.room);
          resolve(response.room);
        } else {
          reject(new Error(response.error || 'Failed to join room'));
        }
      });
    });
  }

  /**
   * Leave current room
   */
  leaveRoom(roomId: string): void {
    if (!this.socket) return;
    this.socket.emit('room:leave', roomId);
    useGameStore.getState().clearGame();
  }

  /**
   * Kick a player (host only)
   */
  kickPlayer(roomId: string, targetId: string): void {
    if (!this.socket) return;
    this.socket.emit('room:kick', { roomId, targetId });
  }

  /**
   * Request a removal vote for a player
   */
  requestRemovalVote(roomId: string, targetId: string): void {
    if (!this.socket) return;
    this.socket.emit('vote:requestRemoval', { roomId, targetId });
  }

  /**
   * Update room settings (host only)
   */
  updateSettings(roomId: string, settings: any): void {
    if (!this.socket) return;
    this.socket.emit('room:updateSettings', { roomId, settings });
  }

  /**
   * Start the game (host only)
   */
  startGame(roomId: string): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.socket) {
        reject(new Error('Socket not connected'));
        return;
      }

      this.socket.emit('game:start', roomId, (response: { success: boolean; error?: string }) => {
        if (response.success) {
          resolve();
        } else {
          reject(new Error(response.error || 'Failed to start game'));
        }
      });
    });
  }

  /**
   * Perform a night action
   */
  performNightAction(roomId: string, targetId: string): void {
    if (!this.socket) return;
    this.socket.emit('night:action', { roomId, targetId });
  }

  /**
   * Send a day chat message
   */
  sendDayChat(roomId: string, content: string): void {
    if (!this.socket) return;
    this.socket.emit('day:chat', { roomId, content });
  }

  /**
   * Send a mafia chat message
   */
  sendMafiaChat(roomId: string, content: string): void {
    if (!this.socket) return;
    this.socket.emit('mafia:chat', { roomId, content });
  }

  /**
   * Cast a vote
   */
  castVote(roomId: string, targetId: string): void {
    if (!this.socket) return;
    this.socket.emit('vote:cast', { roomId, targetId });
  }

  /**
   * Reconnect to a room
   */
  reconnectToRoom(roomCode: string, oderId: string): void {
    if (!this.socket) return;
    this.socket.emit('player:reconnect', { roomId: roomCode, oderId });
  }

  /**
   * Disconnect socket
   */
  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  /**
   * Check if connected
   */
  isConnected(): boolean {
    return this.socket?.connected || false;
  }
}

// Singleton instance
export const socketService = new SocketService();

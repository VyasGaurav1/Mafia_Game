/**
 * Matchmaking Service - Client
 * Handles matchmaking queue and game finding
 */

import { socketService } from './socketService';

export type MatchType = 'quick' | 'public' | 'guest' | 'friends';

export interface QueueStatus {
  inQueue: boolean;
  queueType?: MatchType;
  position?: number;
  estimatedWait?: number;
}

export interface MatchFoundData {
  roomCode: string;
  players: Array<{ oderId: string; username: string }>;
}

type MatchFoundCallback = (data: MatchFoundData) => void;
type PositionUpdateCallback = (position: number) => void;
type CancelledCallback = (reason: string) => void;

class MatchmakingService {
  private onMatchFoundCallbacks: MatchFoundCallback[] = [];
  private onPositionUpdateCallbacks: PositionUpdateCallback[] = [];
  private onCancelledCallbacks: CancelledCallback[] = [];
  private currentQueueId: string | null = null;

  constructor() {
    this.setupEventListeners();
  }

  private setupEventListeners(): void {
    const socket = socketService.getSocket();
    if (!socket) return;

    socket.on('matchmaking:found' as any, (data: MatchFoundData) => {
      this.currentQueueId = null;
      this.onMatchFoundCallbacks.forEach(cb => cb(data));
    });

    socket.on('matchmaking:position' as any, (position: number) => {
      this.onPositionUpdateCallbacks.forEach(cb => cb(position));
    });

    socket.on('matchmaking:cancelled' as any, (reason: string) => {
      this.currentQueueId = null;
      this.onCancelledCallbacks.forEach(cb => cb(reason));
    });
  }

  /**
   * Join matchmaking queue
   */
  async joinQueue(type: MatchType, friendIds?: string[]): Promise<{ queueId: string; position: number }> {
    return new Promise((resolve, reject) => {
      const socket = socketService.getSocket();
      if (!socket) {
        reject(new Error('Not connected'));
        return;
      }

      socket.emit('matchmaking:join' as any, { type, friendIds }, (result: any) => {
        if (result.success) {
          this.currentQueueId = result.queueId;
          resolve({ queueId: result.queueId, position: result.position });
        } else {
          reject(new Error(result.error || 'Failed to join queue'));
        }
      });
    });
  }

  /**
   * Leave matchmaking queue
   */
  async leaveQueue(): Promise<void> {
    return new Promise((resolve) => {
      const socket = socketService.getSocket();
      if (!socket) {
        resolve();
        return;
      }

      socket.emit('matchmaking:leave' as any, (_result: any) => {
        this.currentQueueId = null;
        resolve();
      });
    });
  }

  /**
   * Get current queue status
   */
  async getStatus(): Promise<QueueStatus> {
    return new Promise((resolve, _reject) => {
      const socket = socketService.getSocket();
      if (!socket) {
        resolve({ inQueue: false });
        return;
      }

      socket.emit('matchmaking:status' as any, (result: any) => {
        resolve({
          inQueue: result.inQueue,
          queueType: result.queueType,
          position: result.position
        });
      });
    });
  }

  /**
   * Create a private room for friends
   */
  async createPrivateRoom(invitedFriends: string[]): Promise<string> {
    return new Promise((resolve, reject) => {
      const socket = socketService.getSocket();
      if (!socket) {
        reject(new Error('Not connected'));
        return;
      }

      socket.emit('matchmaking:createPrivate' as any, { invitedFriends }, (result: any) => {
        if (result.success) {
          resolve(result.roomCode);
        } else {
          reject(new Error(result.error || 'Failed to create private room'));
        }
      });
    });
  }

  /**
   * Check if currently in queue
   */
  isInQueue(): boolean {
    return this.currentQueueId !== null;
  }

  /**
   * Subscribe to match found events
   */
  onMatchFound(callback: MatchFoundCallback): () => void {
    this.onMatchFoundCallbacks.push(callback);
    return () => {
      this.onMatchFoundCallbacks = this.onMatchFoundCallbacks.filter(cb => cb !== callback);
    };
  }

  /**
   * Subscribe to position updates
   */
  onPositionUpdate(callback: PositionUpdateCallback): () => void {
    this.onPositionUpdateCallbacks.push(callback);
    return () => {
      this.onPositionUpdateCallbacks = this.onPositionUpdateCallbacks.filter(cb => cb !== callback);
    };
  }

  /**
   * Subscribe to cancelled events
   */
  onCancelled(callback: CancelledCallback): () => void {
    this.onCancelledCallbacks.push(callback);
    return () => {
      this.onCancelledCallbacks = this.onCancelledCallbacks.filter(cb => cb !== callback);
    };
  }

  /**
   * Reinitialize event listeners (call after socket reconnection)
   */
  reinitialize(): void {
    this.setupEventListeners();
  }
}

export const matchmakingService = new MatchmakingService();

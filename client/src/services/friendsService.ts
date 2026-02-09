/**
 * Friends Service - Client
 * Handles friends list, requests, and social features
 */

import { authService } from './authService';
import { socketService } from './socketService';

const API_BASE = import.meta.env.VITE_API_URL || '';

export interface Friend {
  oderId: string;
  username: string;
  displayName?: string;
  avatar?: string;
  status: 'online' | 'in-game' | 'offline';
  currentRoom?: string;
}

export interface FriendRequest {
  fromOderId: string;
  fromUsername: string;
  sentAt: Date;
}

export interface GameInvitation {
  fromUsername: string;
  fromOderId: string;
  roomCode: string;
  roomName: string;
}

type FriendStatusCallback = (data: { oderId: string; status: 'online' | 'in-game' | 'offline' }) => void;
type InvitationCallback = (invitation: GameInvitation) => void;

class FriendsService {
  private friendStatusCallbacks: FriendStatusCallback[] = [];
  private invitationCallbacks: InvitationCallback[] = [];

  constructor() {
    this.setupSocketListeners();
  }

  private setupSocketListeners(): void {
    const socket = socketService.getSocket();
    if (!socket) return;

    socket.on('friends:statusUpdate' as any, (data: { oderId: string; status: 'online' | 'in-game' | 'offline' }) => {
      this.friendStatusCallbacks.forEach(cb => cb(data));
    });

    socket.on('friends:invitation' as any, (invitation: GameInvitation) => {
      this.invitationCallbacks.forEach(cb => cb(invitation));
    });
  }

  /**
   * Search for users
   */
  async searchUsers(query: string): Promise<Friend[]> {
    if (query.length < 2) return [];

    const response = await authService.authenticatedFetch(
      `${API_BASE}/api/auth/users/search?q=${encodeURIComponent(query)}`
    );

    if (!response.ok) {
      throw new Error('Search failed');
    }

    const data = await response.json();
    return data.users;
  }

  /**
   * Get friends list
   */
  async getFriends(): Promise<Friend[]> {
    const response = await authService.authenticatedFetch(`${API_BASE}/api/auth/friends`);

    if (!response.ok) {
      throw new Error('Failed to get friends');
    }

    const data = await response.json();
    return data.friends;
  }

  /**
   * Get online friends
   */
  async getOnlineFriends(): Promise<Friend[]> {
    const response = await authService.authenticatedFetch(`${API_BASE}/api/auth/friends/online`);

    if (!response.ok) {
      throw new Error('Failed to get online friends');
    }

    const data = await response.json();
    return data.friends;
  }

  /**
   * Get online friends via socket (real-time)
   */
  async getOnlineFriendsSocket(): Promise<Friend[]> {
    return new Promise((resolve, reject) => {
      const socket = socketService.getSocket();
      if (!socket) {
        reject(new Error('Not connected'));
        return;
      }

      socket.emit('friends:online' as any, (result: any) => {
        if (result.success) {
          resolve(result.friends);
        } else {
          reject(new Error(result.error || 'Failed to get online friends'));
        }
      });
    });
  }

  /**
   * Get pending friend requests
   */
  async getPendingRequests(): Promise<FriendRequest[]> {
    const response = await authService.authenticatedFetch(`${API_BASE}/api/auth/friends/requests`);

    if (!response.ok) {
      throw new Error('Failed to get friend requests');
    }

    const data = await response.json();
    return data.requests;
  }

  /**
   * Send friend request
   */
  async sendFriendRequest(targetOderId: string): Promise<void> {
    const response = await authService.authenticatedFetch(`${API_BASE}/api/auth/friends/request`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ targetOderId })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to send friend request');
    }
  }

  /**
   * Accept friend request
   */
  async acceptFriendRequest(fromOderId: string): Promise<void> {
    const response = await authService.authenticatedFetch(`${API_BASE}/api/auth/friends/accept`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fromOderId })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to accept friend request');
    }
  }

  /**
   * Reject friend request
   */
  async rejectFriendRequest(fromOderId: string): Promise<void> {
    const response = await authService.authenticatedFetch(`${API_BASE}/api/auth/friends/reject`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fromOderId })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to reject friend request');
    }
  }

  /**
   * Remove friend
   */
  async removeFriend(friendOderId: string): Promise<void> {
    const response = await authService.authenticatedFetch(
      `${API_BASE}/api/auth/friends/${friendOderId}`,
      { method: 'DELETE' }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to remove friend');
    }
  }

  /**
   * Block user
   */
  async blockUser(targetOderId: string): Promise<void> {
    const response = await authService.authenticatedFetch(`${API_BASE}/api/auth/block`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ targetOderId })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to block user');
    }
  }

  /**
   * Unblock user
   */
  async unblockUser(targetOderId: string): Promise<void> {
    const response = await authService.authenticatedFetch(`${API_BASE}/api/auth/unblock`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ targetOderId })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to unblock user');
    }
  }

  /**
   * Invite friend to room
   */
  async inviteToRoom(friendOderId: string, roomCode: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const socket = socketService.getSocket();
      if (!socket) {
        reject(new Error('Not connected'));
        return;
      }

      socket.emit('friends:invite' as any, { friendOderId, roomCode }, (result: any) => {
        if (result.success) {
          resolve();
        } else {
          reject(new Error(result.error || 'Failed to send invitation'));
        }
      });
    });
  }

  /**
   * Update presence status
   */
  updatePresence(status: 'online' | 'in-game' | 'offline'): void {
    const socket = socketService.getSocket();
    if (socket) {
      socket.emit('presence:update' as any, status);
    }
  }

  /**
   * Subscribe to friend status updates
   */
  onFriendStatusUpdate(callback: FriendStatusCallback): () => void {
    this.friendStatusCallbacks.push(callback);
    return () => {
      this.friendStatusCallbacks = this.friendStatusCallbacks.filter(cb => cb !== callback);
    };
  }

  /**
   * Subscribe to game invitations
   */
  onInvitation(callback: InvitationCallback): () => void {
    this.invitationCallbacks.push(callback);
    return () => {
      this.invitationCallbacks = this.invitationCallbacks.filter(cb => cb !== callback);
    };
  }

  /**
   * Reinitialize event listeners (call after socket reconnection)
   */
  reinitialize(): void {
    this.setupSocketListeners();
  }
}

export const friendsService = new FriendsService();

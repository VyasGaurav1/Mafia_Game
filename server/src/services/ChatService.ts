/**
 * Chat Service
 * Handles chat message processing, filtering, and distribution
 */

import { IChatMessage } from '../types';
import { v4 as uuidv4 } from 'uuid';

// Profanity filter word list (basic - extend as needed)
const PROFANITY_LIST = [
  'fuck', 'shit', 'ass', 'bitch', 'damn', 'crap', 'bastard',
  'dick', 'pussy', 'cock', 'cunt', 'whore', 'slut', 'fag'
];

// Build regex for profanity detection
const profanityRegex = new RegExp(
  PROFANITY_LIST.map(word => `\\b${word}\\b`).join('|'),
  'gi'
);

export class ChatService {
  private messageHistory: Map<string, IChatMessage[]> = new Map();
  private mutedPlayers: Map<string, Set<string>> = new Map(); // roomId -> Set of muted oderIds
  private maxHistoryPerRoom = 200;

  /**
   * Process and store a chat message
   */
  processMessage(
    roomId: string,
    senderId: string,
    senderUsername: string,
    content: string,
    type: 'player' | 'system' | 'mafia' = 'player'
  ): IChatMessage | null {
    // Check if player is muted
    if (this.isPlayerMuted(roomId, senderId)) {
      return null;
    }

    // Validate content
    const sanitizedContent = this.sanitizeMessage(content);
    if (!sanitizedContent || sanitizedContent.length === 0) {
      return null;
    }

    // Apply profanity filter
    const filteredContent = this.filterProfanity(sanitizedContent);

    const message: IChatMessage = {
      id: uuidv4(),
      roomId,
      senderId,
      senderUsername,
      content: filteredContent,
      type,
      timestamp: new Date()
    };

    // Store in history
    this.addToHistory(roomId, message);

    return message;
  }

  /**
   * Create a system message
   */
  createSystemMessage(roomId: string, content: string): IChatMessage {
    const message: IChatMessage = {
      id: uuidv4(),
      roomId,
      senderId: 'system',
      senderUsername: 'Operator',
      content,
      type: 'system',
      timestamp: new Date()
    };

    this.addToHistory(roomId, message);
    return message;
  }

  /**
   * Sanitize message content
   */
  private sanitizeMessage(content: string): string {
    // Trim and limit length
    let sanitized = content.trim().slice(0, 500);
    
    // Remove excessive whitespace
    sanitized = sanitized.replace(/\s+/g, ' ');
    
    // Remove potentially dangerous characters
    sanitized = sanitized.replace(/[<>]/g, '');
    
    return sanitized;
  }

  /**
   * Filter profanity from message
   */
  private filterProfanity(content: string): string {
    return content.replace(profanityRegex, (match) => {
      return '*'.repeat(match.length);
    });
  }

  /**
   * Add message to room history
   */
  private addToHistory(roomId: string, message: IChatMessage): void {
    if (!this.messageHistory.has(roomId)) {
      this.messageHistory.set(roomId, []);
    }

    const history = this.messageHistory.get(roomId)!;
    history.push(message);

    // Trim history if too long
    if (history.length > this.maxHistoryPerRoom) {
      history.splice(0, history.length - this.maxHistoryPerRoom);
    }
  }

  /**
   * Get chat history for a room
   */
  getHistory(roomId: string, limit: number = 50): IChatMessage[] {
    const history = this.messageHistory.get(roomId) || [];
    return history.slice(-limit);
  }

  /**
   * Mute a player in a room
   */
  mutePlayer(roomId: string, oderId: string): void {
    if (!this.mutedPlayers.has(roomId)) {
      this.mutedPlayers.set(roomId, new Set());
    }
    this.mutedPlayers.get(roomId)!.add(oderId);
  }

  /**
   * Unmute a player in a room
   */
  unmutePlayer(roomId: string, oderId: string): void {
    this.mutedPlayers.get(roomId)?.delete(oderId);
  }

  /**
   * Check if a player is muted
   */
  isPlayerMuted(roomId: string, oderId: string): boolean {
    return this.mutedPlayers.get(roomId)?.has(oderId) || false;
  }

  /**
   * Clear room data
   */
  clearRoom(roomId: string): void {
    this.messageHistory.delete(roomId);
    this.mutedPlayers.delete(roomId);
  }
}

export const chatService = new ChatService();

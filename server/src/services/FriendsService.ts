/**
 * Friends Service
 * Handles friend requests, friend lists, invites, and social features
 */

import mongoose from 'mongoose';
import { User, IUserDocument, IFriendRequest } from '../models/UserModel';
import logger from '../utils/logger';

export interface FriendRequestResult {
  success: boolean;
  message: string;
  request?: IFriendRequest;
}

export interface FriendActionResult {
  success: boolean;
  message: string;
}

class FriendsService {
  private static instance: FriendsService;

  private constructor() {}

  static getInstance(): FriendsService {
    if (!FriendsService.instance) {
      FriendsService.instance = new FriendsService();
    }
    return FriendsService.instance;
  }

  /**
   * Search for users by username or display name
   */
  async searchUsers(query: string, currentUserOderId: string, limit = 20): Promise<IUserDocument[]> {
    if (!query || query.length < 2) {
      return [];
    }

    return User.searchUsers(query, currentUserOderId, limit);
  }

  /**
   * Send a friend request
   */
  async sendFriendRequest(fromOderId: string, toOderId: string): Promise<FriendRequestResult> {
    if (fromOderId === toOderId) {
      return { success: false, message: 'Cannot send friend request to yourself' };
    }

    const fromUser = await User.findByOderId(fromOderId);
    const toUser = await User.findByOderId(toOderId);

    if (!fromUser || !toUser) {
      return { success: false, message: 'User not found' };
    }

    if (fromUser.isGuest || toUser.isGuest) {
      return { success: false, message: 'Guest users cannot have friends' };
    }

    // Check if already friends
    if (fromUser.friends.some(f => f.toString() === toUser._id.toString())) {
      return { success: false, message: 'Already friends with this user' };
    }

    // Check if user is blocked
    if (toUser.blockedUsers.some(b => b.toString() === fromUser._id.toString())) {
      return { success: false, message: 'Cannot send friend request to this user' };
    }

    if (fromUser.blockedUsers.some(b => b.toString() === toUser._id.toString())) {
      return { success: false, message: 'You have blocked this user' };
    }

    // Check if request already exists
    const existingRequest = toUser.friendRequests.find(
      r => r.fromUserId.toString() === fromUser._id.toString() && r.status === 'PENDING'
    );

    if (existingRequest) {
      return { success: false, message: 'Friend request already sent' };
    }

    // Check if there's a pending request from the other user
    const reverseRequest = fromUser.friendRequests.find(
      r => r.fromUserId.toString() === toUser._id.toString() && r.status === 'PENDING'
    );

    if (reverseRequest) {
      // Auto-accept the reverse request
      return this.acceptFriendRequest(fromOderId, toOderId);
    }

    // Create the friend request
    const request: IFriendRequest = {
      fromUserId: fromUser._id,
      fromUsername: fromUser.username,
      status: 'PENDING',
      createdAt: new Date()
    };

    toUser.friendRequests.push(request);
    await toUser.save();

    logger.info(`Friend request sent: ${fromUser.username} -> ${toUser.username}`);

    return { success: true, message: 'Friend request sent', request };
  }

  /**
   * Accept a friend request
   */
  async acceptFriendRequest(userOderId: string, fromOderId: string): Promise<FriendActionResult> {
    const user = await User.findByOderId(userOderId);
    const fromUser = await User.findByOderId(fromOderId);

    if (!user || !fromUser) {
      return { success: false, message: 'User not found' };
    }

    // Find the pending request
    const requestIndex = user.friendRequests.findIndex(
      r => r.fromUserId.toString() === fromUser._id.toString() && r.status === 'PENDING'
    );

    if (requestIndex === -1) {
      return { success: false, message: 'Friend request not found' };
    }

    // Update request status
    user.friendRequests[requestIndex].status = 'ACCEPTED';

    // Add each other as friends
    if (!user.friends.some(f => f.toString() === fromUser._id.toString())) {
      user.friends.push(fromUser._id);
    }
    if (!fromUser.friends.some(f => f.toString() === user._id.toString())) {
      fromUser.friends.push(user._id);
    }

    await Promise.all([user.save(), fromUser.save()]);

    logger.info(`Friend request accepted: ${fromUser.username} <-> ${user.username}`);

    return { success: true, message: 'Friend request accepted' };
  }

  /**
   * Reject a friend request
   */
  async rejectFriendRequest(userOderId: string, fromOderId: string): Promise<FriendActionResult> {
    const user = await User.findByOderId(userOderId);
    const fromUser = await User.findByOderId(fromOderId);

    if (!user || !fromUser) {
      return { success: false, message: 'User not found' };
    }

    // Find the pending request
    const requestIndex = user.friendRequests.findIndex(
      r => r.fromUserId.toString() === fromUser._id.toString() && r.status === 'PENDING'
    );

    if (requestIndex === -1) {
      return { success: false, message: 'Friend request not found' };
    }

    // Update request status
    user.friendRequests[requestIndex].status = 'REJECTED';
    await user.save();

    logger.info(`Friend request rejected: ${fromUser.username} -> ${user.username}`);

    return { success: true, message: 'Friend request rejected' };
  }

  /**
   * Remove a friend
   */
  async removeFriend(userOderId: string, friendOderId: string): Promise<FriendActionResult> {
    const user = await User.findByOderId(userOderId);
    const friend = await User.findByOderId(friendOderId);

    if (!user || !friend) {
      return { success: false, message: 'User not found' };
    }

    // Remove from each other's friend lists
    user.friends = user.friends.filter(f => f.toString() !== friend._id.toString());
    friend.friends = friend.friends.filter(f => f.toString() !== user._id.toString());

    await Promise.all([user.save(), friend.save()]);

    logger.info(`Friendship removed: ${user.username} <-> ${friend.username}`);

    return { success: true, message: 'Friend removed' };
  }

  /**
   * Block a user
   */
  async blockUser(userOderId: string, targetOderId: string): Promise<FriendActionResult> {
    if (userOderId === targetOderId) {
      return { success: false, message: 'Cannot block yourself' };
    }

    const user = await User.findByOderId(userOderId);
    const target = await User.findByOderId(targetOderId);

    if (!user || !target) {
      return { success: false, message: 'User not found' };
    }

    // Remove from friends if they were friends
    user.friends = user.friends.filter(f => f.toString() !== target._id.toString());
    target.friends = target.friends.filter(f => f.toString() !== user._id.toString());

    // Remove any pending friend requests
    user.friendRequests = user.friendRequests.filter(
      r => r.fromUserId.toString() !== target._id.toString()
    );
    target.friendRequests = target.friendRequests.filter(
      r => r.fromUserId.toString() !== user._id.toString()
    );

    // Add to blocked list
    if (!user.blockedUsers.some(b => b.toString() === target._id.toString())) {
      user.blockedUsers.push(target._id);
    }

    await Promise.all([user.save(), target.save()]);

    logger.info(`User blocked: ${user.username} blocked ${target.username}`);

    return { success: true, message: 'User blocked' };
  }

  /**
   * Unblock a user
   */
  async unblockUser(userOderId: string, targetOderId: string): Promise<FriendActionResult> {
    const user = await User.findByOderId(userOderId);
    const target = await User.findByOderId(targetOderId);

    if (!user || !target) {
      return { success: false, message: 'User not found' };
    }

    user.blockedUsers = user.blockedUsers.filter(b => b.toString() !== target._id.toString());
    await user.save();

    logger.info(`User unblocked: ${user.username} unblocked ${target.username}`);

    return { success: true, message: 'User unblocked' };
  }

  /**
   * Get user's friend list
   */
  async getFriendsList(userOderId: string): Promise<IUserDocument[]> {
    const user = await User.findByOderId(userOderId);
    if (!user) return [];

    await user.populate('friends', '-password -email -friendRequests -blockedUsers');
    return user.friends as unknown as IUserDocument[];
  }

  /**
   * Get pending friend requests
   */
  async getPendingRequests(userOderId: string): Promise<IFriendRequest[]> {
    const user = await User.findByOderId(userOderId);
    if (!user) return [];

    return user.friendRequests.filter(r => r.status === 'PENDING');
  }

  /**
   * Get blocked users
   */
  async getBlockedUsers(userOderId: string): Promise<IUserDocument[]> {
    const user = await User.findByOderId(userOderId);
    if (!user) return [];

    await user.populate('blockedUsers', '-password -email -friendRequests -blockedUsers');
    return user.blockedUsers as unknown as IUserDocument[];
  }

  /**
   * Check if two users are friends
   */
  async areFriends(userOderId1: string, userOderId2: string): Promise<boolean> {
    const user1 = await User.findByOderId(userOderId1);
    const user2 = await User.findByOderId(userOderId2);

    if (!user1 || !user2) return false;

    return user1.friends.some(f => f.toString() === user2._id.toString());
  }

  /**
   * Check if a user is blocked
   */
  async isBlocked(userOderId: string, targetOderId: string): Promise<boolean> {
    const user = await User.findByOderId(userOderId);
    const target = await User.findByOderId(targetOderId);

    if (!user || !target) return false;

    return user.blockedUsers.some(b => b.toString() === target._id.toString());
  }

  /**
   * Get online friends
   */
  async getOnlineFriends(userOderId: string): Promise<IUserDocument[]> {
    const friends = await this.getFriendsList(userOderId);
    return friends.filter(f => f.isOnline);
  }

  /**
   * Set user online status
   */
  async setOnlineStatus(userOderId: string, isOnline: boolean): Promise<void> {
    const user = await User.findByOderId(userOderId);
    if (user) {
      user.isOnline = isOnline;
      user.lastSeen = new Date();
      await user.save();
    }
  }
}

export const friendsService = FriendsService.getInstance();
export default friendsService;

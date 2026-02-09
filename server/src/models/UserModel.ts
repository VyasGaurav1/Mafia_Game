/**
 * Enhanced User Model
 * Stores persistent user data, authentication, friends and statistics
 */

import mongoose, { Document, Schema, Model } from 'mongoose';
import bcrypt from 'bcryptjs';

// User stats interface
export interface IUserStats {
  gamesPlayed: number;
  gamesWon: number;
  gamesLost: number;
  gamesAsMafia: number;
  gamesAsTown: number;
  gamesAsNeutral: number;
  mafiaWins: number;
  townWins: number;
  detectiveSuccessRate: number;
  doctorSaves: number;
  timesEliminated: number;
  totalPlayTime: number; // in minutes
  longestStreak: number;
  currentStreak: number;
  lastPlayedAt?: Date;
}

// Role history entry
export interface IRoleHistoryEntry {
  role: string;
  team: string;
  gameId: string;
  result: 'WIN' | 'LOSS' | 'DRAW';
  playedAt: Date;
}

// Friend request interface
export interface IFriendRequest {
  fromUserId: mongoose.Types.ObjectId;
  fromUsername: string;
  status: 'PENDING' | 'ACCEPTED' | 'REJECTED';
  createdAt: Date;
}

// Auth provider interface
export interface IAuthProvider {
  provider: 'local' | 'google';
  providerId?: string;
}

// User document interface
export interface IUserDocument extends Document {
  _id: mongoose.Types.ObjectId;
  oderId: string; // Unique player ID used in-game
  username: string;
  displayName: string;
  email?: string;
  password?: string;
  avatar: string;
  authProvider: IAuthProvider;
  isGuest: boolean;
  isOnline: boolean;
  isBanned: boolean;
  banReason?: string;
  banExpiresAt?: Date;
  
  // Social
  friends: mongoose.Types.ObjectId[];
  friendRequests: IFriendRequest[];
  blockedUsers: mongoose.Types.ObjectId[];
  
  // Game stats
  stats: IUserStats;
  roleHistory: IRoleHistoryEntry[];
  
  // Matchmaking
  matchmakingRating: number; // Hidden MMR
  matchmakingTier: 'BRONZE' | 'SILVER' | 'GOLD' | 'PLATINUM' | 'DIAMOND';
  
  // Timestamps
  lastSeen: Date;
  createdAt: Date;
  updatedAt: Date;
  
  // Methods
  comparePassword(candidatePassword: string): Promise<boolean>;
  toPublicProfile(): IPublicProfile;
  toFriendProfile(): IFriendProfile;
}

// Public profile (visible to anyone)
export interface IPublicProfile {
  oderId: string;
  username: string;
  displayName: string;
  avatar: string;
  isOnline: boolean;
  stats: {
    gamesPlayed: number;
    gamesWon: number;
    winRate: number;
  };
  matchmakingTier: string;
}

// Friend profile (more details for friends)
export interface IFriendProfile extends IPublicProfile {
  lastSeen: Date;
  currentStreak: number;
}

// Static methods interface
interface IUserModel extends Model<IUserDocument> {
  findByEmail(email: string): Promise<IUserDocument | null>;
  findByUsername(username: string): Promise<IUserDocument | null>;
  findByOderId(oderId: string): Promise<IUserDocument | null>;
  searchUsers(query: string, excludeUserId?: string, limit?: number): Promise<IUserDocument[]>;
}

const userStatsSchema = new Schema<IUserStats>({
  gamesPlayed: { type: Number, default: 0 },
  gamesWon: { type: Number, default: 0 },
  gamesLost: { type: Number, default: 0 },
  gamesAsMafia: { type: Number, default: 0 },
  gamesAsTown: { type: Number, default: 0 },
  gamesAsNeutral: { type: Number, default: 0 },
  mafiaWins: { type: Number, default: 0 },
  townWins: { type: Number, default: 0 },
  detectiveSuccessRate: { type: Number, default: 0 },
  doctorSaves: { type: Number, default: 0 },
  timesEliminated: { type: Number, default: 0 },
  totalPlayTime: { type: Number, default: 0 },
  longestStreak: { type: Number, default: 0 },
  currentStreak: { type: Number, default: 0 },
  lastPlayedAt: { type: Date }
}, { _id: false });

const roleHistorySchema = new Schema<IRoleHistoryEntry>({
  role: { type: String, required: true },
  team: { type: String, required: true },
  gameId: { type: String, required: true },
  result: { type: String, enum: ['WIN', 'LOSS', 'DRAW'], required: true },
  playedAt: { type: Date, default: Date.now }
}, { _id: false });

const friendRequestSchema = new Schema<IFriendRequest>({
  fromUserId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  fromUsername: { type: String, required: true },
  status: { type: String, enum: ['PENDING', 'ACCEPTED', 'REJECTED'], default: 'PENDING' },
  createdAt: { type: Date, default: Date.now }
}, { _id: false });

const authProviderSchema = new Schema<IAuthProvider>({
  provider: { type: String, enum: ['local', 'google'], default: 'local' },
  providerId: { type: String }
}, { _id: false });

const userSchema = new Schema<IUserDocument>({
  oderId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true,
    minlength: 3,
    maxlength: 20,
    index: true
  },
  displayName: {
    type: String,
    required: true,
    trim: true,
    minlength: 2,
    maxlength: 30
  },
  email: {
    type: String,
    sparse: true,
    lowercase: true,
    trim: true,
    index: true
  },
  password: {
    type: String,
    minlength: 6,
    select: false
  },
  avatar: {
    type: String,
    default: 'default'
  },
  authProvider: {
    type: authProviderSchema,
    default: { provider: 'local' }
  },
  isGuest: {
    type: Boolean,
    default: false
  },
  isOnline: {
    type: Boolean,
    default: false
  },
  isBanned: {
    type: Boolean,
    default: false
  },
  banReason: { type: String },
  banExpiresAt: { type: Date },
  
  // Social
  friends: [{
    type: Schema.Types.ObjectId,
    ref: 'User'
  }],
  friendRequests: [friendRequestSchema],
  blockedUsers: [{
    type: Schema.Types.ObjectId,
    ref: 'User'
  }],
  
  // Stats
  stats: {
    type: userStatsSchema,
    default: () => ({})
  },
  roleHistory: {
    type: [roleHistorySchema],
    default: []
  },
  
  // Matchmaking  
  matchmakingRating: {
    type: Number,
    default: 1000 // Starting MMR
  },
  matchmakingTier: {
    type: String,
    enum: ['BRONZE', 'SILVER', 'GOLD', 'PLATINUM', 'DIAMOND'],
    default: 'BRONZE'
  },
  
  lastSeen: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Hash password before saving
userSchema.pre('save', async function(next) {
  if (!this.isModified('password') || !this.password) {
    return next();
  }
  
  try {
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error: any) {
    next(error);
  }
});

// Update matchmaking tier based on MMR
userSchema.pre('save', function(next) {
  if (this.isModified('matchmakingRating')) {
    if (this.matchmakingRating >= 2000) {
      this.matchmakingTier = 'DIAMOND';
    } else if (this.matchmakingRating >= 1600) {
      this.matchmakingTier = 'PLATINUM';
    } else if (this.matchmakingRating >= 1300) {
      this.matchmakingTier = 'GOLD';
    } else if (this.matchmakingRating >= 1100) {
      this.matchmakingTier = 'SILVER';
    } else {
      this.matchmakingTier = 'BRONZE';
    }
  }
  next();
});

// Instance methods
userSchema.methods.comparePassword = async function(candidatePassword: string): Promise<boolean> {
  if (!this.password) return false;
  return bcrypt.compare(candidatePassword, this.password);
};

userSchema.methods.toPublicProfile = function(): IPublicProfile {
  const winRate = this.stats.gamesPlayed > 0 
    ? Math.round((this.stats.gamesWon / this.stats.gamesPlayed) * 100) 
    : 0;
    
  return {
    oderId: this.oderId,
    username: this.username,
    displayName: this.displayName,
    avatar: this.avatar,
    isOnline: this.isOnline,
    stats: {
      gamesPlayed: this.stats.gamesPlayed,
      gamesWon: this.stats.gamesWon,
      winRate
    },
    matchmakingTier: this.matchmakingTier
  };
};

userSchema.methods.toFriendProfile = function(): IFriendProfile {
  const publicProfile = this.toPublicProfile();
  return {
    ...publicProfile,
    lastSeen: this.lastSeen,
    currentStreak: this.stats.currentStreak
  };
};

// Static methods
userSchema.statics.findByEmail = function(email: string) {
  return this.findOne({ email: email.toLowerCase() });
};

userSchema.statics.findByUsername = function(username: string) {
  return this.findOne({ username: username.toLowerCase() });
};

userSchema.statics.findByOderId = function(oderId: string) {
  return this.findOne({ oderId });
};

userSchema.statics.searchUsers = function(query: string, excludeUserId?: string, limit: number = 20) {
  const searchRegex = new RegExp(query, 'i');
  const conditions: any = {
    isGuest: false,
    $or: [
      { username: searchRegex },
      { displayName: searchRegex }
    ]
  };
  
  if (excludeUserId) {
    conditions.oderId = { $ne: excludeUserId };
  }
  
  return this.find(conditions).limit(limit).select('-password -email');
};

// Indexes
userSchema.index({ 'stats.gamesWon': -1 });
userSchema.index({ 'stats.gamesPlayed': -1 });
userSchema.index({ matchmakingRating: -1 });
userSchema.index({ username: 'text', displayName: 'text' });
userSchema.index({ friends: 1 });

export const User = mongoose.model<IUserDocument, IUserModel>('User', userSchema);
export default User;

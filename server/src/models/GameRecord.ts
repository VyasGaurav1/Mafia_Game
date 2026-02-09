/**
 * Game Record Model
 * Stores completed game records for history, analytics and replays
 */

import mongoose, { Document, Schema, Model } from 'mongoose';

// Player game record
export interface IPlayerGameRecord {
  oderId: string;
  username: string;
  role: string;
  team: string;
  finalStatus: 'ALIVE' | 'DEAD' | 'DISCONNECTED';
  isWinner: boolean;
  eliminatedDay?: number;
  eliminatedBy?: 'VOTE' | 'MAFIA' | 'VIGILANTE' | 'SERIAL_KILLER' | 'DISCONNECT';
  actions: IActionRecord[];
}

// Action record for replay
export interface IActionRecord {
  day: number;
  phase: string;
  actionType: string;
  targetId?: string;
  result?: string;
  timestamp: Date;
}

// Vote record
export interface IVoteRecord {
  day: number;
  voterId: string;
  targetId: string;
  timestamp: Date;
}

// Chat record (anonymized for replay)
export interface IChatRecord {
  day: number;
  phase: string;
  senderId: string;
  senderRole: string;
  messageType: 'PLAYER' | 'MAFIA' | 'SYSTEM';
  content: string;
  timestamp: Date;
}

// Game snapshot for debugging
export interface IGameSnapshot {
  phase: string;
  dayNumber: number;
  alivePlayers: string[];
  timestamp: Date;
  data: Record<string, any>;
}

export interface IGameRecordDocument extends Document {
  _id: mongoose.Types.ObjectId;
  gameId: string;
  roomCode: string;
  roomName: string;
  
  // Game outcome
  winner: string; // WinCondition
  winningTeam: string;
  winningPlayers: string[]; // oderIds
  
  // Players
  players: IPlayerGameRecord[];
  totalPlayers: number;
  
  // Game details
  totalDays: number;
  gameDuration: number; // in seconds
  gameMode: 'PUBLIC' | 'PRIVATE' | 'FRIENDS_ONLY' | 'QUICK_PLAY';
  hadBots: boolean;
  botCount: number;
  
  // Role distribution
  roleDistribution: Record<string, number>;
  
  // Records for replay/analytics
  votes: IVoteRecord[];
  chatLogs: IChatRecord[];
  snapshots: IGameSnapshot[];
  
  // Metadata
  settings: Record<string, any>;
  createdAt: Date;
  endedAt: Date;
}

interface IGameRecordModel extends Model<IGameRecordDocument> {
  getPlayerHistory(oderId: string, limit?: number): Promise<IGameRecordDocument[]>;
  getLeaderboard(sortBy: string, limit?: number): Promise<any[]>;
}

const playerGameRecordSchema = new Schema<IPlayerGameRecord>({
  oderId: { type: String, required: true },
  username: { type: String, required: true },
  role: { type: String, required: true },
  team: { type: String, required: true },
  finalStatus: { type: String, enum: ['ALIVE', 'DEAD', 'DISCONNECTED'], required: true },
  isWinner: { type: Boolean, required: true },
  eliminatedDay: { type: Number },
  eliminatedBy: { type: String, enum: ['VOTE', 'MAFIA', 'VIGILANTE', 'SERIAL_KILLER', 'DISCONNECT'] },
  actions: [{
    day: Number,
    phase: String,
    actionType: String,
    targetId: String,
    result: String,
    timestamp: Date
  }]
}, { _id: false });

const voteRecordSchema = new Schema<IVoteRecord>({
  day: { type: Number, required: true },
  voterId: { type: String, required: true },
  targetId: { type: String, required: true },
  timestamp: { type: Date, default: Date.now }
}, { _id: false });

const chatRecordSchema = new Schema<IChatRecord>({
  day: { type: Number, required: true },
  phase: { type: String, required: true },
  senderId: { type: String, required: true },
  senderRole: { type: String, required: true },
  messageType: { type: String, enum: ['PLAYER', 'MAFIA', 'SYSTEM'], required: true },
  content: { type: String, required: true },
  timestamp: { type: Date, default: Date.now }
}, { _id: false });

const gameSnapshotSchema = new Schema<IGameSnapshot>({
  phase: { type: String, required: true },
  dayNumber: { type: Number, required: true },
  alivePlayers: [{ type: String }],
  timestamp: { type: Date, default: Date.now },
  data: { type: Schema.Types.Mixed }
}, { _id: false });

const gameRecordSchema = new Schema<IGameRecordDocument>({
  gameId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  roomCode: { type: String, required: true },
  roomName: { type: String, required: true },
  
  winner: { type: String, required: true },
  winningTeam: { type: String, required: true },
  winningPlayers: [{ type: String }],
  
  players: [playerGameRecordSchema],
  totalPlayers: { type: Number, required: true },
  
  totalDays: { type: Number, required: true },
  gameDuration: { type: Number, required: true },
  gameMode: { 
    type: String, 
    enum: ['PUBLIC', 'PRIVATE', 'FRIENDS_ONLY', 'QUICK_PLAY'],
    default: 'PUBLIC'
  },
  hadBots: { type: Boolean, default: false },
  botCount: { type: Number, default: 0 },
  
  roleDistribution: { type: Map, of: Number },
  
  votes: [voteRecordSchema],
  chatLogs: {
    type: [chatRecordSchema],
    select: false // Don't load by default to save memory
  },
  snapshots: {
    type: [gameSnapshotSchema],
    select: false
  },
  
  settings: { type: Schema.Types.Mixed },
  endedAt: { type: Date, default: Date.now }
}, {
  timestamps: true
});

// Static methods
gameRecordSchema.statics.getPlayerHistory = function(oderId: string, limit: number = 20) {
  return this.find({ 'players.oderId': oderId })
    .sort({ endedAt: -1 })
    .limit(limit)
    .select('-chatLogs -snapshots');
};

gameRecordSchema.statics.getLeaderboard = async function(sortBy: string = 'wins', limit: number = 100) {
  const aggregation = await this.aggregate([
    { $unwind: '$players' },
    {
      $group: {
        _id: '$players.oderId',
        username: { $last: '$players.username' },
        gamesPlayed: { $sum: 1 },
        gamesWon: { $sum: { $cond: ['$players.isWinner', 1, 0] } },
        totalPlayTime: { $sum: '$gameDuration' }
      }
    },
    {
      $addFields: {
        winRate: { $cond: [{ $gt: ['$gamesPlayed', 0] }, { $divide: ['$gamesWon', '$gamesPlayed'] }, 0] }
      }
    },
    { $sort: sortBy === 'wins' ? { gamesWon: -1 } : { winRate: -1, gamesPlayed: -1 } },
    { $limit: limit }
  ]);
  return aggregation;
};

// Indexes
gameRecordSchema.index({ 'players.oderId': 1 });
gameRecordSchema.index({ endedAt: -1 });
gameRecordSchema.index({ winningTeam: 1 });
gameRecordSchema.index({ gameMode: 1 });

// TTL index - keep records for 1 year
gameRecordSchema.index({ createdAt: 1 }, { expireAfterSeconds: 365 * 24 * 60 * 60 });

export const GameRecord = mongoose.model<IGameRecordDocument, IGameRecordModel>('GameRecord', gameRecordSchema);
export default GameRecord;

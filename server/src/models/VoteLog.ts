/**
 * VoteLog Model
 * Tracks all voting actions for analysis and debugging
 */

import mongoose, { Document, Schema } from 'mongoose';

export interface IVoteLogDocument extends Document {
  roomId: string;
  gameId: string;
  dayNumber: number;
  voterId: string;
  voterUsername: string;
  targetId: string;
  targetUsername: string;
  voteType: 'day' | 'mafia_night';
  wasChanged: boolean;
  previousTargetId?: string;
  timestamp: Date;
}

const voteLogSchema = new Schema<IVoteLogDocument>({
  roomId: {
    type: String,
    required: true
  },
  gameId: {
    type: String,
    required: true
  },
  dayNumber: {
    type: Number,
    required: true
  },
  voterId: {
    type: String,
    required: true
  },
  voterUsername: {
    type: String,
    required: true
  },
  targetId: {
    type: String,
    required: true
  },
  targetUsername: {
    type: String,
    required: true
  },
  voteType: {
    type: String,
    enum: ['day', 'mafia_night'],
    required: true
  },
  wasChanged: {
    type: Boolean,
    default: false
  },
  previousTargetId: String,
  timestamp: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: false
});

// Indexes
voteLogSchema.index({ roomId: 1, gameId: 1 });
voteLogSchema.index({ voterId: 1 });
voteLogSchema.index({ gameId: 1, dayNumber: 1 });

export const VoteLog = mongoose.model<IVoteLogDocument>('VoteLog', voteLogSchema);

/**
 * ActionLog Model
 * Audit log for all game actions - used for debugging and anti-cheat
 */

import mongoose, { Document, Schema } from 'mongoose';
import { ActionType, GamePhase, Role } from '../types';

export interface IActionLogDocument extends Document {
  roomId: string;
  gameId: string;
  dayNumber: number;
  phase: string;
  playerId: string;
  playerRole: string;
  actionType: string;
  targetId?: string;
  targetRole?: string;
  result?: object;
  metadata?: object;
  timestamp: Date;
}

const actionLogSchema = new Schema<IActionLogDocument>({
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
  phase: {
    type: String,
    enum: Object.values(GamePhase),
    required: true
  },
  playerId: {
    type: String,
    required: true
  },
  playerRole: {
    type: String,
    enum: Object.values(Role),
    required: true
  },
  actionType: {
    type: String,
    enum: Object.values(ActionType),
    required: true
  },
  targetId: String,
  targetRole: String,
  result: Schema.Types.Mixed,
  metadata: Schema.Types.Mixed,
  timestamp: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: false
});

// Indexes for efficient querying
actionLogSchema.index({ roomId: 1, gameId: 1 });
actionLogSchema.index({ playerId: 1 });
actionLogSchema.index({ timestamp: -1 });
actionLogSchema.index({ gameId: 1, dayNumber: 1 });

export const ActionLog = mongoose.model<IActionLogDocument>('ActionLog', actionLogSchema);

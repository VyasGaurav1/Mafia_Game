/**
 * GameState Model
 * Stores the complete state of an active game
 */

import mongoose, { Document, Schema } from 'mongoose';
import { GamePhase, WinCondition, Team, Role } from '../types';

export interface IGameStateDocument extends Document {
  roomId: string;
  roomCode: string;
  phase: string;
  dayNumber: number;
  currentTimer: number;
  phaseStartTime: Date;
  
  // Role assignments (stored securely)
  roleAssignments: Map<string, string>; // oderId -> role
  teamAssignments: Map<string, string>; // oderId -> team
  
  // Night actions
  nightActions: {
    mafiaVotes: Map<string, string>;
    mafiaTarget?: string;
    detectiveTarget?: string;
    detectiveResult?: boolean;
    doctorTarget?: string;
    donTarget?: string;
    donResult?: boolean;
    vigilanteTarget?: string;
  };
  
  // Day voting
  votes: Map<string, string>; // voterId -> targetId
  
  // Player states
  alivePlayers: string[];
  deadPlayers: string[];
  lastDoctorSave: Map<string, string>; // oderId -> last saved target
  vigilanteKillUsed: Map<string, boolean>;
  
  // Results
  lastNightResult?: {
    killedPlayerId?: string;
    killedPlayerRole?: string;
    wasSaved: boolean;
    savedPlayerId?: string;
    deaths?: Array<{ playerId: string; role?: string; cause?: string }>;
    saves?: Array<{ playerId: string }>;
  };
  eliminatedToday?: string;
  
  // Game outcome
  winner?: string;
  winningTeam?: string;
  winningPlayers: string[];
  
  // Timestamps
  startedAt: Date;
  endedAt?: Date;
}

const gameStateSchema = new Schema<IGameStateDocument>({
  roomId: {
    type: String,
    required: true
  },
  roomCode: {
    type: String,
    required: true
  },
  phase: {
    type: String,
    enum: Object.values(GamePhase),
    default: GamePhase.ROLE_REVEAL
  },
  dayNumber: {
    type: Number,
    default: 0
  },
  currentTimer: {
    type: Number,
    default: 0
  },
  phaseStartTime: {
    type: Date,
    default: Date.now
  },
  
  roleAssignments: {
    type: Map,
    of: String,
    default: new Map()
  },
  teamAssignments: {
    type: Map,
    of: String,
    default: new Map()
  },
  
  nightActions: {
    mafiaVotes: { type: Map, of: String, default: new Map() },
    mafiaTarget: String,
    detectiveTarget: String,
    detectiveResult: Boolean,
    doctorTarget: String,
    donTarget: String,
    donResult: Boolean,
    vigilanteTarget: String
  },
  
  votes: {
    type: Map,
    of: String,
    default: new Map()
  },
  
  alivePlayers: [{ type: String }],
  deadPlayers: [{ type: String }],
  lastDoctorSave: {
    type: Map,
    of: String,
    default: new Map()
  },
  vigilanteKillUsed: {
    type: Map,
    of: Boolean,
    default: new Map()
  },
  
  lastNightResult: {
    killedPlayerId: String,
    killedPlayerRole: String,
    wasSaved: Boolean,
    savedPlayerId: String,
    deaths: [{
      playerId: String,
      role: String,
      cause: String
    }],
    saves: [{
      playerId: String
    }]
  },
  eliminatedToday: String,
  
  winner: {
    type: String,
    enum: Object.values(WinCondition)
  },
  winningTeam: {
    type: String,
    enum: Object.values(Team)
  },
  winningPlayers: [{ type: String }],
  
  startedAt: {
    type: Date,
    default: Date.now
  },
  endedAt: Date
}, {
  timestamps: true
});

// Indexes
gameStateSchema.index({ roomId: 1 });
gameStateSchema.index({ roomCode: 1 });
gameStateSchema.index({ startedAt: -1 });

export const GameState = mongoose.model<IGameStateDocument>('GameState', gameStateSchema);

/**
 * Room Model
 * Stores room configuration and player data
 */

import mongoose, { Document, Schema } from 'mongoose';
import { RoomVisibility, PlayerStatus, GamePhase, Role } from '../types';

export interface IRoomPlayer {
  oderId: string;
  odId: string;
  username: string;
  avatar: string;
  socketId: string;
  role?: string;
  team?: string;
  status: string;
  isHost: boolean;
  isConnected: boolean;
  joinedAt: Date;
}

export interface IRoomDocument extends Document {
  code: string;
  name: string;
  visibility: string;
  hostId: string;
  players: IRoomPlayer[];
  maxPlayers: number;
  minPlayers: number;
  settings: {
    enableDonMafia: boolean;
    enableGodfather: boolean;
    enableJester: boolean;
    enableVigilante: boolean;
    enableAdvancedRoles: boolean;
    enableNeutralRoles: boolean;
    timers: {
      roleReveal: number;
      mafiaAction: number;
      detectiveAction: number;
      doctorAction: number;
      donAction: number;
      vigilanteAction: number;
      nightTotal: number;
      dayDiscussion: number;
      voting: number;
      resolution: number;
    };
    allowSpectators: boolean;
    revealRolesOnDeath: boolean;
    tieBreaker: string;
  };
  gameId?: mongoose.Types.ObjectId;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const roomPlayerSchema = new Schema({
  oderId: { type: String, required: true },
  odId: { type: String, required: true },
  username: { type: String, required: true },
  avatar: { type: String, default: 'default' },
  socketId: { type: String, required: true },
  role: { type: String, enum: Object.values(Role) },
  team: { type: String },
  status: { 
    type: String, 
    enum: Object.values(PlayerStatus),
    default: PlayerStatus.ALIVE 
  },
  isHost: { type: Boolean, default: false },
  isConnected: { type: Boolean, default: true },
  joinedAt: { type: Date, default: Date.now }
}, { _id: false });

const roomSchema = new Schema<IRoomDocument>({
  code: {
    type: String,
    required: true,
    unique: true,
    uppercase: true,
    length: 6
  },
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 30
  },
  visibility: {
    type: String,
    enum: Object.values(RoomVisibility),
    default: RoomVisibility.PUBLIC
  },
  hostId: {
    type: String,
    required: true
  },
  players: [roomPlayerSchema],
  maxPlayers: {
    type: Number,
    default: 12,
    min: 3,
    max: 30
  },
  minPlayers: {
    type: Number,
    default: 3,
    min: 3
  },
  settings: {
    enableDonMafia: { type: Boolean, default: true },
    enableGodfather: { type: Boolean, default: false },
    enableJester: { type: Boolean, default: false },
    enableVigilante: { type: Boolean, default: false },
    enableAdvancedRoles: { type: Boolean, default: false },
    enableNeutralRoles: { type: Boolean, default: false },
    timers: {
      roleReveal: { type: Number, default: 10 },
      mafiaAction: { type: Number, default: 40 },
      detectiveAction: { type: Number, default: 25 },
      doctorAction: { type: Number, default: 25 },
      donAction: { type: Number, default: 25 },
      vigilanteAction: { type: Number, default: 20 },
      nightTotal: { type: Number, default: 90 },
      dayDiscussion: { type: Number, default: 120 },
      voting: { type: Number, default: 45 },
      resolution: { type: Number, default: 10 }
    },
    allowSpectators: { type: Boolean, default: true },
    revealRolesOnDeath: { type: Boolean, default: true },
    tieBreaker: { type: String, default: 'no_elimination' }
  },
  gameId: { type: Schema.Types.ObjectId, ref: 'GameState' },
  isActive: { type: Boolean, default: true }
}, {
  timestamps: true
});

// Indexes
roomSchema.index({ visibility: 1, isActive: 1 });
roomSchema.index({ 'players.oderId': 1 });
roomSchema.index({ createdAt: 1 }, { expireAfterSeconds: 86400 }); // Auto-delete after 24 hours

// Generate unique room code
roomSchema.statics.generateCode = async function(): Promise<string> {
  const characters = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code: string;
  let exists = true;
  
  while (exists) {
    code = '';
    for (let i = 0; i < 6; i++) {
      code += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    exists = await this.exists({ code });
  }
  
  return code!;
};

export const Room = mongoose.model<IRoomDocument>('Room', roomSchema);

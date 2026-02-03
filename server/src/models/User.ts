/**
 * User Model
 * Stores persistent user data and statistics
 */

import mongoose, { Document, Schema } from 'mongoose';
import bcrypt from 'bcryptjs';

export interface IUserDocument extends Document {
  username: string;
  email: string;
  password: string;
  avatar: string;
  stats: {
    gamesPlayed: number;
    gamesWon: number;
    gamesAsMafia: number;
    gamesAsTown: number;
    detectiveSuccessRate: number;
    doctorSaves: number;
  };
  isGuest: boolean;
  lastSeen: Date;
  createdAt: Date;
  updatedAt: Date;
  comparePassword(candidatePassword: string): Promise<boolean>;
}

const userSchema = new Schema<IUserDocument>({
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    minlength: 2,
    maxlength: 20
  },
  email: {
    type: String,
    sparse: true,
    lowercase: true,
    trim: true
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
  stats: {
    gamesPlayed: { type: Number, default: 0 },
    gamesWon: { type: Number, default: 0 },
    gamesAsMafia: { type: Number, default: 0 },
    gamesAsTown: { type: Number, default: 0 },
    detectiveSuccessRate: { type: Number, default: 0 },
    doctorSaves: { type: Number, default: 0 }
  },
  isGuest: {
    type: Boolean,
    default: true
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
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error: any) {
    next(error);
  }
});

// Compare password method
userSchema.methods.comparePassword = async function(candidatePassword: string): Promise<boolean> {
  if (!this.password) return false;
  return bcrypt.compare(candidatePassword, this.password);
};

// Indexes
userSchema.index({ 'stats.gamesWon': -1 });

export const User = mongoose.model<IUserDocument>('User', userSchema);

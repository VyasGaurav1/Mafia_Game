/**
 * Report Model
 * Stores player reports for moderation
 */

import mongoose, { Document, Schema } from 'mongoose';

export interface IReportDocument extends Document {
  _id: mongoose.Types.ObjectId;
  reportId: string;
  
  // Reporter info
  reporterOderId: string;
  reporterUsername: string;
  
  // Reported player info
  reportedOderId: string;
  reportedUsername: string;
  
  // Report details
  reason: 'HARASSMENT' | 'CHEATING' | 'INAPPROPRIATE_NAME' | 'SPAM' | 'AFK_ABUSE' | 'OTHER';
  description: string;
  gameId?: string;
  roomCode?: string;
  
  // Evidence
  chatLogSample?: string[];
  evidence?: string;
  
  // Resolution
  status: 'PENDING' | 'REVIEWED' | 'ACTION_TAKEN' | 'DISMISSED';
  resolvedBy?: string;
  resolution?: string;
  actionTaken?: 'NONE' | 'WARNING' | 'MUTE' | 'BAN_TEMP' | 'BAN_PERM';
  
  createdAt: Date;
  resolvedAt?: Date;
}

const reportSchema = new Schema<IReportDocument>({
  reportId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  
  reporterOderId: { type: String, required: true },
  reporterUsername: { type: String, required: true },
  
  reportedOderId: { type: String, required: true, index: true },
  reportedUsername: { type: String, required: true },
  
  reason: {
    type: String,
    enum: ['HARASSMENT', 'CHEATING', 'INAPPROPRIATE_NAME', 'SPAM', 'AFK_ABUSE', 'OTHER'],
    required: true
  },
  description: { type: String, required: true, maxlength: 1000 },
  gameId: { type: String },
  roomCode: { type: String },
  
  chatLogSample: [{ type: String }],
  evidence: { type: String, maxlength: 2000 },
  
  status: {
    type: String,
    enum: ['PENDING', 'REVIEWED', 'ACTION_TAKEN', 'DISMISSED'],
    default: 'PENDING',
    index: true
  },
  resolvedBy: { type: String },
  resolution: { type: String },
  actionTaken: {
    type: String,
    enum: ['NONE', 'WARNING', 'MUTE', 'BAN_TEMP', 'BAN_PERM']
  },
  
  resolvedAt: { type: Date }
}, {
  timestamps: true
});

// Index for finding reports by reported user
reportSchema.index({ reportedOderId: 1, createdAt: -1 });
reportSchema.index({ status: 1, createdAt: -1 });

export const Report = mongoose.model<IReportDocument>('Report', reportSchema);
export default Report;

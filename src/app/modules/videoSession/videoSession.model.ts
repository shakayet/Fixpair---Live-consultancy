import { Schema, model } from 'mongoose';
import { IVideoSession } from './videoSession.interface';

const videoSessionSchema = new Schema<IVideoSession>(
  {
    consultation: {
      type: Schema.Types.ObjectId,
      ref: 'Consultation',
      required: true,
    },
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    consultant: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    channelName: {
      type: String,
      required: true,
    },
    token: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      enum: ['pending', 'ongoing', 'ended'],
      default: 'pending',
    },
    startedAt: {
      type: Date,
    },
    endedAt: {
      type: Date,
    },
    duration: {
      type: Number,
    },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
    },
  },
);

// Indexes
videoSessionSchema.index({ consultation: 1 }, { unique: true });
videoSessionSchema.index({ user: 1 });
videoSessionSchema.index({ consultant: 1 });
videoSessionSchema.index({ channelName: 1 }, { unique: true });

export const VideoSession = model<IVideoSession>(
  'VideoSession',
  videoSessionSchema,
);

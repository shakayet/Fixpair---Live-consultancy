import { Schema, model } from 'mongoose';
import { ITranscript } from './transcription.interface';

const transcriptSchema = new Schema<ITranscript>(
  {
    consultation: {
      type: Schema.Types.ObjectId,
      ref: 'Consultation',
      required: true,
    },
    channelName: {
      type: String,
      required: true,
    },
    speakerUid: {
      type: Number,
      required: true,
    },
    speakerRole: {
      type: String,
      enum: ['user', 'consultant'],
      required: true,
    },
    text: {
      type: String,
      required: true,
    },
    language: {
      type: String,
      default: 'en',
    },
    timestamp: {
      type: Date,
      default: Date.now,
    },
    isFinal: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

export const Transcript = model<ITranscript>('Transcript', transcriptSchema);

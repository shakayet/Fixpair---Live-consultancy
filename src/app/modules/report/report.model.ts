import { Schema, model } from 'mongoose';
import { IReport } from './report.interface';

const reportSchema = new Schema<IReport>(
  {
    consultation: {
      type: Schema.Types.ObjectId,
      ref: 'Consultation',
      required: true,
      unique: true,
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
    conversation: [
      {
        sender: { type: String, enum: ['user', 'consultant'], required: true },
        text: { type: String, required: true },
        timestamp: { type: Date, default: Date.now },
      },
    ],
    notes: {
      type: String,
    },
    images: [
      {
        type: String,
      },
    ],
    links: [
      {
        type: String,
      },
    ],
    pdfUrl: {
      type: String,
    },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
    },
  }
);

reportSchema.index({ consultation: 1 });
reportSchema.index({ user: 1 });
reportSchema.index({ consultant: 1 });

export const Report = model<IReport>('Report', reportSchema);

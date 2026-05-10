import { Schema, model } from 'mongoose';
import { IReport } from './report.interface';

const reportSchema = new Schema<IReport>(
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
    conversation: {
      type: String,
      required: true,
    },
    duration: {
      type: Number,
      default: 0,
    },
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
  },
);

reportSchema.index({ consultation: 1 }, { unique: true });
reportSchema.index({ user: 1 });
reportSchema.index({ consultant: 1 });

export const Report = model<IReport>('Report', reportSchema);

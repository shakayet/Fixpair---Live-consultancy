import { Schema, model } from 'mongoose';
import { IPrivacy } from './privacy.interface';

const privacySchema = new Schema<IPrivacy>(
  {
    title: {
      type: String,
      required: true,
    },
    content: {
      type: String,
      required: true,
    },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
    },
  }
);

export const Privacy = model<IPrivacy>('Privacy', privacySchema);

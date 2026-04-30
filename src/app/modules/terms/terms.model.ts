import { Schema, model } from 'mongoose';
import { ITerms } from './terms.interface';

const termsSchema = new Schema<ITerms>(
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
  },
);

export const Terms = model<ITerms>('Terms', termsSchema);

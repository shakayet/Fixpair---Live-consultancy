import { Schema, model } from 'mongoose';
import { IFaq } from './faq.interface';

const faqSchema = new Schema<IFaq>(
  {
    question: {
      type: String,
      required: true,
    },
    answer: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      enum: ['active', 'inactive'],
      default: 'active',
    },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
    },
  },
);

faqSchema.index({ status: 1, createdAt: -1 });

export const Faq = model<IFaq>('Faq', faqSchema);

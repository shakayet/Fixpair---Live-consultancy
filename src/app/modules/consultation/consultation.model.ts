import { Schema, model, Types } from 'mongoose';

export type IConsultation = {
  user: Types.ObjectId;
  consultant: Types.ObjectId;
  status: 'pending' | 'accepted' | 'completed' | 'cancelled';
};

const consultationSchema = new Schema<IConsultation>(
  {
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
    status: {
      type: String,
      enum: ['pending', 'accepted', 'completed', 'cancelled'],
      default: 'pending',
    },
  },
  {
    timestamps: true,
  }
);

export const Consultation = model<IConsultation>('Consultation', consultationSchema);

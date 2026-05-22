import { Schema, model } from 'mongoose';
import { INotification } from './notification.interface';

const notificationSchema = new Schema<INotification>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    title: {
      type: String,
      required: true,
    },
    message: {
      type: String,
      required: true,
    },
    type: {
      type: String,
      enum: [
        'CONSULTATION_STATUS',
        'PAYMENT_SUCCESS',
        'CONSULTATION_REMINDER',
        'SYSTEM',
      ],
      required: true,
    },
    relatedBooking: {
      type: Schema.Types.ObjectId,
      ref: 'Consultation',
    },
    read: {
      type: Boolean,
      default: false,
    },
    metadata: {
      type: Schema.Types.Mixed,
    },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
    },
  },
);

notificationSchema.index({ user: 1, createdAt: -1 });

export const Notification = model<INotification>(
  'Notification',
  notificationSchema,
);

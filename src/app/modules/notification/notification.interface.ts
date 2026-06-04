/* eslint-disable @typescript-eslint/no-explicit-any */
import { Types } from 'mongoose';

export type INotification = {
  user: Types.ObjectId;
  title: string;
  message: string;
  type:
    | 'CONSULTATION_STATUS'
    | 'PAYMENT_SUCCESS'
    | 'CONSULTATION_REMINDER'
    | 'SYSTEM';
  relatedBooking?: Types.ObjectId;
  read: boolean;
  idempotencyKey?: string;
  metadata?: Record<string, any>;
  createdAt?: Date;
  updatedAt?: Date;
};

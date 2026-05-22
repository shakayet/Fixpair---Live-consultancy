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
  metadata?: Record<string, any>;
  createdAt?: Date;
  updatedAt?: Date;
};

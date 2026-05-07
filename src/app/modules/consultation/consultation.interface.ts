import { Types } from 'mongoose';

export type ISlot = {
  _id?: Types.ObjectId;
  date: Date;
  startTime: string; // HH:mm format
  endTime: string; // HH:mm format
  isBooked: boolean;
};

export type IConsultation = {
  user: Types.ObjectId;
  consultant: Types.ObjectId;
  bookingType: 'scheduled' | 'instant' | 'callback';
  slotId?: Types.ObjectId; // For scheduled bookings
  date?: Date;
  startTime?: string;
  endTime?: string;
  preferredWindow?: 'asap' | 'today' | 'tomorrow'; // For callback requests
  notes?: string;
  perMinuteRate: number;
  platformFee: number;
  totalAmount: number;
  authorizedAmount?: number;
  consumedAmount: number;
  remainingMinutes: number;
  billingStatus: 'pending' | 'authorized' | 'charging' | 'failed' | 'completed';
  terminationReason?: 'manual' | 'insufficient_funds' | 'force_terminated';
  status:
    | 'pending'
    | 'accepted'
    | 'rejected'
    | 'confirmed'
    | 'completed'
    | 'cancelled'
    | 'expired';
  paymentStatus: 'pending' | 'paid' | 'failed';
};

export type IAvailability = {
  consultant: Types.ObjectId;
  slots: ISlot[];
};

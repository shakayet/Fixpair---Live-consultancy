import { Types } from 'mongoose';

export type ISlot = {
  _id?: Types.ObjectId;
  date: Date;
  startTime: string; // HH:mm format
  endTime: string; // HH:mm format
  isBooked: boolean;
};

export type IConsultation = {
  user?: Types.ObjectId;
  consultant: Types.ObjectId;
  slotId?: Types.ObjectId; // Reference to the slot in the consultant's availability if we use a separate model, or just the date/time
  date: Date;
  startTime: string;
  endTime: string;
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled';
  paymentStatus: 'pending' | 'paid' | 'failed';
};

export type IAvailability = {
  consultant: Types.ObjectId;
  slots: ISlot[];
};

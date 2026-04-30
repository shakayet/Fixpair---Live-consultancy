import { Schema, model } from 'mongoose';
import { IAvailability, IConsultation } from './consultation.interface';

// Availability Schema (Consultant's time slots)
const availabilitySchema = new Schema<IAvailability>(
  {
    consultant: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    slots: [
      {
        date: { type: Date, required: true },
        startTime: { type: String, required: true },
        endTime: { type: String, required: true },
        isBooked: { type: Boolean, default: false },
      },
    ],
  },
  { timestamps: true },
);

availabilitySchema.index({ consultant: 1 }, { unique: true });
availabilitySchema.index({ 'slots.date': 1 });

export const Availability = model<IAvailability>(
  'Availability',
  availabilitySchema,
);

// Consultation/Booking Schema
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
    bookingType: {
      type: String,
      enum: ['scheduled', 'instant', 'callback'],
      required: true,
    },
    slotId: {
      type: Schema.Types.ObjectId,
      required: false,
    },
    date: {
      type: Date,
      required: false,
    },
    startTime: {
      type: String,
      required: false,
    },
    endTime: {
      type: String,
      required: false,
    },
    preferredWindow: {
      type: String,
      enum: ['asap', 'today', 'tomorrow'],
      required: false,
    },
    status: {
      type: String,
      enum: [
        'pending',
        'accepted',
        'rejected',
        'confirmed',
        'completed',
        'cancelled',
        'expired',
      ],
      default: 'pending',
    },
    paymentStatus: {
      type: String,
      enum: ['pending', 'paid', 'failed'],
      default: 'pending',
    },
  },
  { timestamps: true },
);

consultationSchema.index({ consultant: 1, date: 1 });
consultationSchema.index({ user: 1 });
consultationSchema.index({ slotId: 1 }, { unique: true }); // Prevent double booking of the same slotId

export const Consultation = model<IConsultation>(
  'Consultation',
  consultationSchema,
);

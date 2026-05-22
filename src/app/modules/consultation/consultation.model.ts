import { Schema, model } from 'mongoose';
import { IAvailability, IConsultation } from './consultation.interface';

// Availability Schema (Consultant's UNAVAILABLE time slots)
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
    notes: {
      type: String,
      default: null,
    },
    perMinuteRate: {
      type: Number,
      required: true,
    },
    platformFee: {
      type: Number,
      default: 5,
    },
    totalAmount: {
      type: Number,
      default: 0,
    },
    authorizedAmount: {
      type: Number,
      default: 0,
    },
    consumedAmount: {
      type: Number,
      default: 0,
    },
    remainingMinutes: {
      type: Number,
      default: 0,
    },
    billingStatus: {
      type: String,
      enum: ['pending', 'authorized', 'charging', 'failed', 'completed'],
      default: 'pending',
    },
    terminationReason: {
      type: String,
      enum: ['manual', 'insufficient_funds', 'force_terminated'],
      default: null,
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
    remindersSent: {
      twentyFourHour: { type: Boolean, default: false },
      oneHour: { type: Boolean, default: false },
    },
    cancelledAt: {
      type: Date,
      default: null,
    },
    cancelReason: {
      type: String,
      default: null,
    },
    cancelledBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
  },
  { timestamps: true },
);

consultationSchema.index({ consultant: 1, date: 1, startTime: 1, endTime: 1 });
consultationSchema.index({ user: 1, status: 1 });
consultationSchema.index({ status: 1, bookingType: 1 });
consultationSchema.index(
  { status: 1 },
  { partialFilterExpression: { status: 'pending' } },
);

export const Consultation = model<IConsultation>(
  'Consultation',
  consultationSchema,
);

import { Schema, model } from 'mongoose';
import { IAvailability, IConsultation } from './consultation.interface';

// Availability Schema (Consultant's time slots)
const availabilitySchema = new Schema<IAvailability>(
  {
    consultant: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
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
  { timestamps: true }
);

availabilitySchema.index({ consultant: 1 });
availabilitySchema.index({ 'slots.date': 1 });

export const Availability = model<IAvailability>('Availability', availabilitySchema);

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
    slotId: {
      type: Schema.Types.ObjectId,
      required: true,
    },
    date: {
      type: Date,
      required: true,
    },
    startTime: {
      type: String,
      required: true,
    },
    endTime: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      enum: ['pending', 'confirmed', 'completed', 'cancelled'],
      default: 'pending',
    },
    paymentStatus: {
      type: String,
      enum: ['pending', 'paid', 'failed'],
      default: 'pending',
    },
  },
  { timestamps: true }
);

consultationSchema.index({ consultant: 1, date: 1 });
consultationSchema.index({ user: 1 });
consultationSchema.index({ slotId: 1 }, { unique: true }); // Prevent double booking of the same slotId

export const Consultation = model<IConsultation>('Consultation', consultationSchema);

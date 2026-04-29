import { z } from 'zod';

const slotSchema = z.object({
  date: z.string({ required_error: 'Date is required' }),
  startTime: z.string({ required_error: 'Start time is required' }),
  endTime: z.string({ required_error: 'End time is required' }),
});

const setAvailabilityZodSchema = z.object({
  body: z.object({
    slots: z.array(slotSchema),
  }),
});

const createBookingZodSchema = z.object({
  body: z.object({
    consultantId: z.string({ required_error: 'Consultant ID is required' }),
    slotId: z.string({ required_error: 'Slot ID is required' }),
  }),
});

export const ConsultationValidation = {
  setAvailabilityZodSchema,
  createBookingZodSchema,
};

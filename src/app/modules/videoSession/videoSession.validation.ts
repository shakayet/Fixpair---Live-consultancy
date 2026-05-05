import { z } from 'zod';

const createSessionZodSchema = z.object({
  body: z.object({
    consultationId: z.string({
      required_error: 'Consultation ID is required',
    }),
  }),
});

const joinSessionZodSchema = z.object({
  body: z.object({
    sessionId: z.string({
      required_error: 'Session ID is required',
    }),
  }),
});

const endSessionZodSchema = z.object({
  body: z.object({
    sessionId: z.string({
      required_error: 'Session ID is required',
    }),
  }),
});

export const VideoSessionValidation = {
  createSessionZodSchema,
  joinSessionZodSchema,
  endSessionZodSchema,
};

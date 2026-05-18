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

const callActionZodSchema = z.object({
  body: z.object({
    sessionId: z.string({
      required_error: 'Session ID is required',
    }),
    action: z.enum(['REJECT', 'CANCEL'], {
      required_error: 'Action is required (REJECT or CANCEL)',
    }),
  }),
});

export const VideoSessionValidation = {
  createSessionZodSchema,
  joinSessionZodSchema,
  endSessionZodSchema,
  callActionZodSchema,
};

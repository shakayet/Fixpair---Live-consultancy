import { z } from 'zod';

const createPrivacyZodSchema = z.object({
  body: z.object({
    title: z.string({
      required_error: 'Title is required',
    }),
    content: z.string({
      required_error: 'Content is required',
    }),
  }),
});

const updatePrivacyZodSchema = z.object({
  body: z.object({
    title: z.string().optional(),
    content: z.string().optional(),
  }),
});

export const PrivacyValidation = {
  createPrivacyZodSchema,
  updatePrivacyZodSchema,
};

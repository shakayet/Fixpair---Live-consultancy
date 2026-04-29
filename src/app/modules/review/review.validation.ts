import { z } from 'zod';

const createReviewZodSchema = z.object({
  body: z.object({
    consultationId: z.string({
      required_error: 'Consultation ID is required',
    }),
    rating: z.number({
      required_error: 'Rating is required',
    }).min(1).max(5),
    comment: z.string({
      required_error: 'Comment is required',
    }),
  }),
});

const updateReviewZodSchema = z.object({
  body: z.object({
    rating: z.number().min(1).max(5).optional(),
    comment: z.string().optional(),
  }),
});

export const ReviewValidation = {
  createReviewZodSchema,
  updateReviewZodSchema,
};

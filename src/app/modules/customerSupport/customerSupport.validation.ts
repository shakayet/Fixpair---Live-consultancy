import { z } from 'zod';

const createOrUpdateCustomerSupportZodSchema = z.object({
  body: z.object({
    email: z
      .string({
        required_error: 'Email is required',
      })
      .email({
        message: 'Invalid email address',
      }),
    phoneNumber: z.string().optional(),
  }),
});

export const CustomerSupportValidation = {
  createOrUpdateCustomerSupportZodSchema,
};

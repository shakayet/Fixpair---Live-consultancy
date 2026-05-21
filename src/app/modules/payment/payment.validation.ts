import { z } from 'zod';

const getInvoiceZodSchema = z.object({
  params: z.object({
    consultationId: z.string({
      required_error: 'Consultation ID is required',
    }),
  }),
});

export const PaymentValidation = {
  getInvoiceZodSchema,
};

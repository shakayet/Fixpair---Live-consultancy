import { z } from 'zod';

const createReportZodSchema = z.object({
  body: z.object({
    consultationId: z.string({
      required_error: 'Consultation ID is required',
    }),
    notes: z.string().optional(),
    links: z.array(z.string()).optional(),
  }),
});

export const ReportValidation = {
  createReportZodSchema,
};

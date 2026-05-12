import { z } from 'zod';
import { USER_ROLES } from '../../../enums/user';

const createUserZodSchema = z.object({
  body: z.object({
    name: z.string({ required_error: 'Name is required' }),
    email: z.string({ required_error: 'Email is required' }),
    password: z.string({ required_error: 'Password is required' }),
    role: z.nativeEnum(USER_ROLES).optional(),
    consultancyType: z.enum(['lawyer', 'advisor', 'doctor']).optional(),
    experience: z.string().optional(),
    languages: z.array(z.string()).optional(),
    expertise: z.string().optional(),
    visitFee: z.number().optional(),
    activeStatus: z.boolean().optional(),
    profile: z.string().optional(),
  }),
});

const updateUserZodSchema = z.object({
  name: z.string().optional(),
  email: z.string().optional(),
  password: z.string().optional(),
  image: z.string().optional(),
  consultancyType: z.enum(['lawyer', 'advisor', 'doctor']).optional(),
  experience: z.string().optional(),
  languages: z.array(z.string()).optional(),
  expertise: z.string().optional(),
  visitFee: z.number().optional(),
  activeStatus: z.boolean().optional(),
});

export const UserValidation = {
  createUserZodSchema,
  updateUserZodSchema,
};

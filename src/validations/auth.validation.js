import { z } from 'zod';

export const signUpSchema = z.object({
    name: z.string().min(2).max(255).trim(),
    email: z.string().email().max(255).toLowerCase().trim(),
    password: z.string().min(6).max(128).trim(),
    role: z.enum(['admin', 'user']).default('user'),
});

export const signInSchema = z.object({
    email: z.string().email().toLowerCase().trim(),
    password: z.string().min(1),
});

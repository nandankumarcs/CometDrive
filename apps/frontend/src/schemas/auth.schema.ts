import { z } from 'zod';

// ─── Form Schemas ────────────────────────────────────────
export const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

export type LoginFormData = z.infer<typeof loginSchema>;

export const registerSchema = z
  .object({
    firstName: z.string().min(1, 'First name is required'),
    lastName: z.string().min(1, 'Last name is required'),
    password: z.string().min(8, 'Password must be at least 8 characters'),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

export type RegisterFormData = z.infer<typeof registerSchema>;

// ─── API Response Types ─────────────────────────────────
export interface AuthUser {
  id: number;
  uuid: string;
  email: string;
  first_name: string;
  last_name: string;
  role: string;
}

export interface LoginResponse {
  data: {
    accessToken: string;
    refreshToken: string;
    user: AuthUser;
  };
}

export type RegisterResponse = LoginResponse;

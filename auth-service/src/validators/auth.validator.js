// Input validation for the auth endpoints, built on Zod schemas instead of
// hand-rolled regex/length checks. Each schema's `safeParse` is used in the
// controller; firstValidationError() picks a single readable message out
// of a failed parse.
import { z } from 'zod';

const email = z
  .string({ required_error: 'email is required' })
  .trim()
  .min(1, 'email is required')
  .max(254, 'email is not a valid email address') // RFC 5321 limit
  .email('email is not a valid email address');

const username = z
  .string({ required_error: 'username is required' })
  .regex(
    /^[a-zA-Z0-9_-]{3,32}$/,
    'username must be 3-32 characters and contain only letters, numbers, underscores or hyphens'
  );

const password = z
  .string({ required_error: 'password is required' })
  .min(8, 'password must be at least 8 characters')
  .max(128, 'password must be at most 128 characters'); // avoid handing argon2 megabyte-long input

export const registerSchema = z.object({ email, username, password });

export const loginSchema = z.object({
  email: z
    .string({ required_error: 'email is required' })
    .trim()
    .min(1, 'email is required')
    .max(254, 'email is not a valid email address'),
  password: z.string({ required_error: 'password is required' }).min(1, 'password is required'),
});

export const refreshSchema = z.object({
  refreshToken: z
    .string({ required_error: 'refreshToken is required' })
    .min(1, 'refreshToken is required'),
});

export function firstValidationError(zodError) {
  return zodError.issues[0]?.message ?? 'invalid input';
}

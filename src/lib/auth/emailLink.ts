import { z } from 'zod';

export const emailPurposeSchema = z.enum(['invite', 'recovery']);
export type EmailPurpose = z.infer<typeof emailPurposeSchema>;

/** Accept one provider proof; never infer access from email metadata. */
export const emailProofSchema = z.discriminatedUnion('proof', [
  z
    .object({
      proof: z.literal('code'),
      purpose: emailPurposeSchema,
      code: z.string().min(1).max(2048),
    })
    .strict(),
  z
    .object({
      proof: z.literal('hash'),
      purpose: emailPurposeSchema,
      tokenHash: z.string().min(1).max(2048),
    })
    .strict(),
  z
    .object({
      proof: z.literal('session'),
      purpose: emailPurposeSchema,
      accessToken: z.string().min(1).max(8192),
      refreshToken: z.string().min(1).max(2048),
    })
    .strict(),
]);

export function authEmailRedirect(purpose: EmailPurpose): string {
  const configured =
    process.env.VERCEL_ENV === 'production' && process.env.VERCEL_PROJECT_PRODUCTION_URL
      ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
      : process.env.NEXT_PUBLIC_APP_URL;
  const origin = new URL(configured ?? '');
  if (
    !['http:', 'https:'].includes(origin.protocol) ||
    origin.username ||
    origin.password ||
    (process.env.VERCEL_ENV === 'production' && origin.protocol !== 'https:')
  ) {
    throw new Error('The application URL is not configured for authentication email.');
  }
  const url = new URL('/auth/confirm', origin.origin);
  url.searchParams.set('type', purpose);
  return url.toString();
}

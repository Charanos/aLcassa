import { z } from 'zod';

export const companyInput = z
  .object({
    name: z
      .string()
      .trim()
      .min(1, 'Enter a company name.')
      .max(200, 'Use a company name of 200 characters or fewer.'),
    contactEmail: z.string().trim().email('Enter a valid contact email.').max(320),
    timezone: z
      .string()
      .max(100)
      .refine((value) => {
        try {
          new Intl.DateTimeFormat('en', { timeZone: value });
          return true;
        } catch {
          return false;
        }
      }, 'Select a valid timezone.'),
    locale: z.enum(['en-KE', 'en-US', 'en-GB']),
    version: z.number().int().min(0),
  })
  .strict();

export type CompanyInput = z.infer<typeof companyInput>;

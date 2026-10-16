import { z } from 'zod';

export const fields = z
  .object({
    tone: z.string().max(1000),
    responseGuidelines: z.string().max(10000),
    businessInformation: z.string().max(10000),
    escalationInstructions: z.string().max(10000),
    prohibitedTopics: z.string().max(10000),
    customInstructions: z.string().max(10000),
  })
  .strict();
export const revision = z
  .object({
    currentVersionId: z.string().uuid().nullable(),
    updatedAt: z.string().datetime().nullable(),
    masterVersionId: z.string().uuid(),
    masterUpdatedAt: z.string().datetime(),
  })
  .strict();
export const publication = z
  .object({ fields, revision, changeNote: z.string().trim().min(8).max(500) })
  .strict();
export const restoration = z
  .object({ versionId: z.string().uuid(), revision, changeNote: z.string().trim().min(8).max(500) })
  .strict();

export const document = z
  .object({
    tone: z.string().optional(),
    responseGuidelines: z.string().optional(),
    businessInformation: z.string().optional(),
    escalationInstructions: z.string().optional(),
    prohibitedTopics: z.array(z.string()).optional(),
    customInstructions: z.string().optional(),
  })
  .strict();
export const sessionRulesResponse = z
  .object({
    data: z
      .object({
        master: z
          .object({
            id: z.string().uuid(),
            updatedAt: z.string().datetime(),
            versionId: z.string().uuid(),
            content: document,
            lockedFields: z.array(z.string()),
            versionNumber: z.number().int().positive(),
          })
          .strict(),
        current: z
          .object({
            id: z.string().uuid(),
            versionNumber: z.number().int().positive(),
            content: document,
            publishedAt: z.string().datetime().nullable(),
          })
          .strict()
          .nullable(),
        revision,
      })
      .strict(),
  })
  .strict();
export const versionResponse = z
  .object({
    data: z
      .object({ versionId: z.string().uuid(), versionNumber: z.number().int().positive() })
      .strict(),
  })
  .strict();
export const errorResponse = z
  .object({
    error: z
      .object({
        code: z.string(),
        message: z.string(),
        requestId: z.string(),
        details: z
          .array(z.object({ field: z.string(), code: z.string(), message: z.string() }).strict())
          .optional(),
      })
      .strict(),
  })
  .strict();

/** Merge generated Node rule schemas with the actual FastAPI OpenAPI document. */
import assert from 'node:assert/strict';
import { zodToJsonSchema } from 'zod-to-json-schema';
import { z } from 'zod';
import {
  publication,
  revision,
  sessionRulesResponse,
  versionResponse,
  errorResponse,
} from '../src/modules/aiRules/contracts';

type Operation = {
  responses: Record<string, { content?: Record<string, { schema: unknown }> }>;
  [key: string]: unknown;
};
export type MergedRulesContract = {
  openapi: string;
  info: { title: string; version: string };
  paths: Record<string, Record<string, Operation>>;
  components: { schemas: Record<string, unknown>; securitySchemes: Record<string, unknown> };
};
export function mergedRulesContract(service: MergedRulesContract): MergedRulesContract {
  assert.deepEqual(Object.keys(service.paths).sort(), [
    '/service/v1/ai-rules',
    '/service/v1/health',
    '/service/v1/ready',
    '/service/v1/tenant',
  ]);
  const schema = (value: z.ZodType<unknown>) => {
    const result = zodToJsonSchema(value, { $refStrategy: 'none' });
    delete result.$schema;
    return result;
  };
  const response = (name: string) => ({
    description: name,
    content: { 'application/json': { schema: { $ref: `#/components/schemas/${name}` } } },
  });
  const failures = Object.fromEntries(
    [401, 403, 404, 409, 422, 429, 500, 503].map((status) => [
      String(status),
      response('SessionError'),
    ]),
  );
  const secured = { security: [{ TenantSession: [] }] };
  return {
    openapi: '3.1.0',
    info: { title: 'aLcassa Phase One rules and service contract', version: '1.0.0' },
    paths: {
      ...service.paths,
      '/api/v1/ai-rules': {
        get: { ...secured, responses: { ...failures, '200': response('SessionRules') } },
      },
      '/api/v1/ai-rules/publish': {
        post: {
          ...secured,
          requestBody: {
            required: true,
            content: {
              'application/json': { schema: { $ref: '#/components/schemas/RulePublication' } },
            },
          },
          responses: { ...failures, '201': response('RuleVersion') },
        },
      },
      '/api/v1/ai-rules/rollback/{versionId}': {
        post: {
          ...secured,
          parameters: [
            {
              name: 'versionId',
              in: 'path',
              required: true,
              schema: { type: 'string', format: 'uuid' },
            },
          ],
          requestBody: {
            required: true,
            content: {
              'application/json': { schema: { $ref: '#/components/schemas/RuleRestoration' } },
            },
          },
          responses: { ...failures, '200': response('RuleVersion') },
        },
      },
    },
    components: {
      schemas: {
        ...service.components.schemas,
        SessionRules: schema(sessionRulesResponse),
        RulePublication: schema(publication),
        RuleRestoration: schema(
          z.object({ revision, changeNote: z.string().trim().min(8).max(500) }).strict(),
        ),
        RuleVersion: schema(versionResponse),
        SessionError: schema(errorResponse),
      },
      securitySchemes: {
        ...service.components.securitySchemes,
        TenantSession: {
          type: 'apiKey',
          in: 'cookie',
          name: 'aLcassa_tenant_session',
          description:
            'Provider identity plus live application session and membership; sandbox cookie names are environment-configurable.',
        },
      },
    },
  };
}

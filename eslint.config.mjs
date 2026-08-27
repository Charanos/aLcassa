// @ts-check
import { FlatCompat } from '@eslint/eslintrc';
import tseslint from 'typescript-eslint';

const compat = new FlatCompat({ baseDirectory: import.meta.dirname });

/**
 * The rules below are not style preferences. Four of them are the mechanical
 * enforcement of guarantees in 06 · Tenancy and Isolation, and a violation of
 * any of them is a security defect rather than a lint warning.
 *
 *   06 §7   the service role client is importable only inside modules/platform
 *   04 §3   modules talk to each other through index.ts, never into internal/
 *   06 §2   no application-level tenant filter, no tenantId read off a request
 *   06 §11  no console.*, because that is how customer data reaches a log
 */
export default tseslint.config(
  {
    ignores: [
      '.next/**',
      'node_modules/**',
      'project-docs/**',
      'design-docs/**',
      'src/db/migrations/**',
      // Third-party design-tool assets copied verbatim into public/, not
      // authored here and not meant to pass this project's rules.
      'public/design/**',
      // Next.js writes this file; it is never hand-edited and it predates
      // this config existing, so it is not a source file to lint.
      'next-env.d.ts',
      // Config files that intentionally sit outside tsconfig's `include`
      // (see tsconfig.json), so the typed lint rules below have no project
      // to resolve them against. They are plain JS/config, not app code.
      'eslint.config.mjs',
      'postcss.config.mjs',
    ],
  },

  ...compat.extends('next/core-web-vitals'),
  ...tseslint.configs.recommendedTypeChecked,

  {
    languageOptions: {
      parserOptions: { projectService: true, tsconfigRootDir: import.meta.dirname },
    },
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/ban-ts-comment': [
        'error',
        { 'ts-ignore': 'allow-with-description', minimumDescriptionLength: 10 },
      ],
      '@typescript-eslint/no-floating-promises': 'error',
      '@typescript-eslint/consistent-type-imports': ['error', { fixStyle: 'inline-type-imports' }],

      // 06 §11. Structured logging only. A console.log during debugging is the
      // documented route by which a customer record reaches a log line.
      'no-console': 'error',

      // 06 §7 · 05 I-05. The one thing in this system that bypasses RLS.
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['**/lib/db/serviceClient', '@/lib/db/serviceClient'],
              message:
                'The service role client may only be imported inside src/modules/platform. Use support mode to read tenant data. See 06 §7.',
            },
            {
              // The auth-side twin of the above. The Supabase secret key
              // (formerly service_role) bypasses RLS exactly as the Drizzle
              // service client does, so it carries the identical restriction.
              group: ['**/lib/auth/supabase/admin', '@/lib/auth/supabase/admin'],
              message:
                'The Supabase admin client bypasses Row Level Security and may only be imported inside src/modules/platform. If the caller has a session, use createSupabaseServerClient() and let the policies apply. See 06 §7.',
            },
            {
              group: ['@/modules/*/internal/*', '@/modules/*/repository', '@/modules/*/service'],
              message:
                'Import a module through its index.ts only. Internals are private. See 04 §3.',
            },
          ],
        },
      ],

      // 06 §2 rule 2 · 05 I-04.
      'no-restricted-syntax': [
        'error',
        {
          selector:
            'MemberExpression[object.name=/^(body|payload|query|params|searchParams|headers)$/][property.name=/^tenant_?[Ii]d$/]',
          message:
            'tenant_id is resolved server side from the session and the membership record. It is never read from a request. See 06 §2 rule 2.',
        },
        {
          selector:
            "CallExpression[callee.property.name='eq'][arguments.0.property.name='tenantId']",
          message:
            'Isolation is Row Level Security, not an application filter. If a query appears to need one, you have found a missing policy. See 06 §2 rule 1 and 11 §6 rule 1.',
        },
      ],
    },
  },

  // The one place the service role client may be imported. 06 §7.
  {
    files: [
      'src/modules/platform/**/*.ts',
      'src/lib/db/serviceClient.ts',
      // The file may of course import its own dependencies; the guard is on
      // everyone ELSE importing it.
      'src/lib/auth/supabase/admin.ts',
    ],
    rules: { 'no-restricted-imports': 'off' },
  },

  // Scripts and tests run outside the request pipeline.
  {
    files: ['scripts/**/*.ts', 'tests/**/*.ts', 'src/db/seed/**/*.ts'],
    rules: { 'no-console': 'off', 'no-restricted-imports': 'off' },
  },
);

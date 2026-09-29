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
      // A one-off token migration run during the landing-page revamp and kept
      // for reference. It is a standalone .mjs outside tsconfig, so the typed
      // rules cannot resolve it — and there is nothing to gain by linting a
      // script that has already done its single job.
      'migrate-tokens.mjs',
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

  /*
   * 03 §2 · 03 §19 · doc 21 F1 and F2. THE DESIGN SYSTEM, ENFORCED.
   *
   * ⚠ THESE THREE RULES EXIST BECAUSE THE SYSTEM WAS BEING BYPASSED ROUGHLY AS
   *   OFTEN AS IT WAS USED, AND NOTHING SAID SO.
   *
   * The audit in doc 21 counted 23 distinct radius spellings against a scale of
   * four, and 254 arbitrary type sizes against 281 uses of the named scale —
   * sixteen distinct sizes, nine of them inside a 4px band. None of that is a
   * mistake anybody made on purpose. Each one is a single reasonable-looking
   * bracket, written because reaching for a bracket is faster than opening
   * `tokens.css` to find out what the step is called.
   *
   * So the bracket is now the thing that fails. If the value you need is not in
   * the scale, the scale is missing a step — add it in `tokens.css`, where the
   * next person will find it, rather than inlining it here where they will not.
   */
  {
    files: ['src/components/**/*.tsx', 'src/app/**/*.tsx'],
    rules: {
      'no-restricted-syntax': [
        'error',
        {
          selector: 'Literal[value=/(?:^|\s)rounded-\[[^\]]*(?:px|rem)\]/]',
          message:
            'Arbitrary radius. Use rounded-bar | chip | panel | overlay | card | hero | slab | full. If none fits, add the step to tokens.css — see the RADIUS note there for why bracket values are how the scale came to have 23 spellings.',
        },
        {
          selector: 'Literal[value=/(?:^|\s)text-\[[0-9.]+px\]/]',
          message:
            'Arbitrary type size. Use the named scale (text-3xs … text-3xl) or a t-* role class. If none fits, add the step to tokens.css — see the TYPE SIZE note there.',
        },
        /*
         * ⚠ THE CLASS RULES ABOVE MISSED 175 MORE, because a size written as
         *   `fontSize: '13px'` or inside a `font:` shorthand is not a Tailwind
         *   class and no amount of scanning class names finds it. The first
         *   pass reported zero arbitrary values in the console and was right
         *   about class literals and wrong about the console.
         */
        {
          selector:
            'Property[key.name="fontSize"]:matches([value.value=/^[0-9.]+(px)?$/], [value.value>=0])',
          message:
            'Arbitrary type size. In CSS (a style prop) use var(--type-*). In a Recharts tick or label prop, do NOT use var() — it becomes an SVG attribute where var() does not resolve; read the token through useTokens() in console/Charts.tsx instead.',
        },
        /*
         * ⚠ THE RULE ABOVE CAUSED A REGRESSION BEFORE THIS ONE EXISTED.
         *
         * Its message used to say "use var(--type-*)", full stop, and a
         * codemod did exactly that inside Recharts `tick` props — which
         * Recharts writes onto `<text>` as presentation attributes, where
         * `var()` is not reliably resolved. Four chart axes lost their size.
         * A rule that only says what not to write teaches the nearest
         * alternative, whether or not it works in context.
         */
        {
          selector:
            'Property[key.name=/^(tick|label)$/] Property[key.name=/^(fontSize|fontFamily|fill|stroke)$/][value.value=/^var[(]/]',
          message:
            'var() inside a Recharts tick/label prop becomes an SVG presentation attribute and is not reliably resolved. Resolve the token first — see useTokens() in console/Charts.tsx.',
        },
        {
          selector:
            'Property[key.name="borderRadius"]:matches([value.value=/^[0-9.]+(px)?$/], [value.value>=0])',
          message:
            'Arbitrary radius in an inline style. Use var(--radius-bar | control | surface | modal | card | hero | slab).',
        },
        {
          selector: 'Property[key.name="font"][value.value=/[0-9.]+px/]',
          message:
            'Arbitrary size inside a font shorthand. Use var(--type-*) for the size part — font: "500 var(--type-chip)/1 var(--font-mono)".',
        },
        {
          selector: 'Property[key.name="fontWeight"][value.value>500]',
          message:
            '03 §5 caps font weight at 500. Emphasis comes from the size step or from colour, not from weight.',
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

/** Keep HTTP operations and private Server Actions distinct and detect undocumented additions. */
import assert from 'node:assert/strict';
import { readdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import ts from 'typescript';

async function files(directory: string): Promise<string[]> {
  const entries = await readdir(directory, { withFileTypes: true });
  return (
    await Promise.all(
      entries.map((entry) =>
        entry.isDirectory()
          ? files(join(directory, entry.name))
          : Promise.resolve([join(directory, entry.name)]),
      ),
    )
  ).flat();
}

async function main() {
  const verbs = new Set(['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS']);
  const routes: {
    path: string;
    method: string;
    source: string;
    boundary: string;
    roles: string[];
    scope: string | null;
  }[] = [];
  const actions: { name: string; source: string; transport: 'server-action' }[] = [];
  for (const filename of (await files('src/app')).sort()) {
    if (!/\.[jt]sx?$/.test(filename)) continue;
    const source = filename.replaceAll('\\', '/');
    const text = await readFile(filename, 'utf8');
    if (!source.endsWith('/route.ts') && !/^['"]use server['"];/.test(text)) continue;
    const ast = ts.createSourceFile(source, text, ts.ScriptTarget.Latest, true);
    const exported = (node: ts.Node) =>
      ts.canHaveModifiers(node) &&
      !!ts.getModifiers(node)?.some((modifier) => modifier.kind === ts.SyntaxKind.ExportKeyword);
    function http(name: string, initializer?: ts.Expression) {
      const path =
        '/' +
        source
          .replace(/^src\/app\//, '')
          .replace(/\/route.ts$/, '')
          .split('/')
          .filter((segment) => !segment.startsWith('('))
          .map((segment) => segment.replace(/^\[(.+)\]$/, '{$1}'))
          .join('/');
      let boundary = 'route-specific',
        roles: string[] = [],
        scope: string | null = null;
      if (
        initializer &&
        ts.isCallExpression(initializer) &&
        initializer.expression.getText(ast) === 'defineRoute'
      ) {
        const definition = initializer.arguments[0];
        if (definition && ts.isObjectLiteralExpression(definition))
          for (const property of definition.properties) {
            if (!ts.isPropertyAssignment(property)) continue;
            const key = property.name.getText(ast),
              value = property.initializer;
            if (key === 'door' && ts.isStringLiteral(value)) boundary = value.text;
            if (key === 'scope' && ts.isStringLiteral(value)) scope = value.text;
            if (key === 'roles' && ts.isArrayLiteralExpression(value))
              roles = value.elements.filter(ts.isStringLiteral).map((role) => role.text);
          }
      }
      routes.push({ path, method: name, source, boundary, roles, scope });
    }
    for (const node of ast.statements) {
      if (!exported(node)) continue;
      if (ts.isFunctionDeclaration(node) && node.name) {
        if (source.endsWith('/route.ts') && verbs.has(node.name.text)) http(node.name.text);
        else if (!source.endsWith('/route.ts'))
          actions.push({ name: node.name.text, source, transport: 'server-action' });
      }
      if (ts.isVariableStatement(node))
        for (const declaration of node.declarationList.declarations) {
          if (!ts.isIdentifier(declaration.name)) continue;
          const name = declaration.name.text;
          if (source.endsWith('/route.ts') && verbs.has(name)) http(name, declaration.initializer);
          else if (
            !source.endsWith('/route.ts') &&
            declaration.initializer &&
            (ts.isArrowFunction(declaration.initializer) ||
              ts.isFunctionExpression(declaration.initializer))
          )
            actions.push({ name, source, transport: 'server-action' });
        }
    }
  }
  routes.sort(
    (a, b) => a.path.localeCompare(b.path, 'en') || a.method.localeCompare(b.method, 'en'),
  );
  actions.sort(
    (a, b) => a.source.localeCompare(b.source, 'en') || a.name.localeCompare(b.name, 'en'),
  );
  assert.equal(new Set(routes.map((route) => `${route.method} ${route.path}`)).size, routes.length);
  assert(
    routes.some(
      (route) =>
        route.path === '/api/v1/credentials' &&
        route.method === 'POST' &&
        route.roles.includes('owner'),
    ),
  );
  assert(actions.some((action) => action.name === 'createCredential'));
  const manifest = {
    format: 1,
    boundary:
      'Source-derived operation inventory, not a response-schema or end-to-end conformance claim. Route-specific guards and service implementations require their respective contract tests.',
    application: { runtime: 'Next.js', http: routes, actions },
    service: {
      runtime: 'FastAPI',
      schema: '/service/openapi.json',
      http: [
        { method: 'GET', path: '/service/v1/health', scope: null },
        { method: 'GET', path: '/service/v1/ready', scope: null },
        { method: 'GET', path: '/service/v1/tenant', scope: 'tenant:read' },
        { method: 'GET', path: '/service/v1/ai-rules', scope: 'ai_rules:read' },
      ],
    },
    seams: {
      tables: ['kb_documents', 'kb_chunks', 'customer_records'],
      phaseOne: 'Schema and tenant isolation; no public CRUD endpoint is advertised.',
    },
  };
  const bytes = JSON.stringify(manifest, null, 2) + '\n';
  const destination = 'project-docs/api-surface-manifest.json';
  if (process.argv.includes('--check'))
    assert.equal(
      await readFile(destination, 'utf8'),
      bytes,
      'API surface changed. Regenerate the inventory and review the relevant contracts.',
    );
  else await writeFile(destination, bytes);
  console.log(
    `Contract inventory: ${routes.length} application HTTP operations, ${actions.length} Server Actions and four service reads. Schema conformance remains a separate gate.`,
  );
}
void main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : 'Contract inventory failed.');
  process.exitCode = 1;
});

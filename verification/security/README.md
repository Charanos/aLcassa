# Dependency security verification

On 7 October 2026 the refreshed dependency tree has no critical or moderate registry
findings. The raw audit still reports one high finding: **GHSA-vfj7-8cjw-p6xm /
CVE-2026-93687**, affecting `braces` through 3.0.3. The registry lists no patched
release. This finding must remain visible until upstream publishes a fix.

The source patch at `patches/braces@3.0.3.patch` limits combined brace/parenthesis
nesting to 100 containers while parsing, before recursive traversal. The compile,
expand and stringify walkers also reject excessive AST depth, including AST input
that bypasses parsing. Both pnpm configuration files declare the exact-version
patch. `.gitattributes` preserves its LF bytes on Windows and Linux.

`pnpm check:security` permits this specific advisory only after verifying the exact
installed version, patch declaration, patch SHA-256, every affected installed copy's
source hashes and adversarial regressions. Inputs with 4,000 nested braces or
parentheses must throw a controlled SyntaxError; mixed nesting, the 100/101 boundary
and directly supplied deep ASTs are checked as well. Normal alternatives, numeric
ranges, escaped braces and quoted literals must retain their behavior.

The raw audit and assessment are separate retained artifacts. No advisory is globally
ignored and the moderate-or-higher threshold remains in force. Unexpected advisories,
registry failure, incomplete totals, muted entries, drifted bytes and unapplied patches
fail verification. Security gate tests cover these failure paths. The local patch is
a maintained security change, not an upstream fix or a claim of comprehensive security
certification. Review and remove it when adopting a verified upstream remediation.

Sources: [the upstream issue](https://github.com/micromatch/braces/issues/70) and
[the GitHub advisory](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm).

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve, dirname, extname } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../../frontend/src');
const visited = new Set();

function inspectImports(path) {
  if (visited.has(path)) return;
  visited.add(path);
  const source = readFileSync(path, 'utf8');
  // Follow executable imports only; TypeScript `import type` never reaches JS.
  const regex = /import\s+(?!type\b)(?:(?:[\s\S]*?\bfrom\s+)?)["'](\.[^"']+)["']/g;
  for (const [, local] of source.matchAll(regex)) {
    const base = resolve(dirname(path), local);
    const target = extname(base) ? base : `${base}.tsx`;
    let resolved = target;
    try { readFileSync(resolved); } catch { resolved = `${base}.ts`; }
    assert.ok(!resolved.includes('/api/'), `API dependency in demo: ${resolved}`);
    assert.ok(!resolved.includes('/auth/'), `Authentication dependency in demo: ${resolved}`);
    inspectImports(resolved);
  }
}

test('standalone demo has no executable RPC/auth dependency', () => {
  inspectImports(resolve(root, 'demo/main.tsx'));
  assert.ok(visited.size > 10, 'Presentational components must be traversed');
});

test('fictional MAC addresses and documentation IP ranges are used', () => {
  const fixtures = readFileSync(resolve(root, 'demo/data.ts'), 'utf8');
  assert.match(fixtures, /02:00:00:00:00:01/);
  assert.match(fixtures, /198\.51\.100\.20/);
  assert.doesNotMatch(fixtures, /172\.16\.3\./);
});

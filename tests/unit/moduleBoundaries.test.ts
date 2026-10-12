import { readdirSync, readFileSync } from 'node:fs';
import { dirname, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { expect, it } from 'vitest';

it('keeps M1 module imports acyclic and contributors on the public data boundary', () => {
  const root = fileURLToPath(new URL('../../src/modules/', import.meta.url));
  const files: string[] = [];
  const walk = (directory: string) => {
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      if (entry.name === 'chords') continue; // Earlier chord pilot has its own contract.
      const path = resolve(directory, entry.name);
      if (entry.isDirectory()) walk(path);
      else if (path.endsWith('.ts')) files.push(path);
    }
  };
  walk(root);
  const graph = new Map(files.map((file) => [file, [] as string[]]));
  for (const file of files) {
    const requests = [
      ...readFileSync(file, 'utf8').matchAll(/(?:from\s*|import\s*)['"]([^'"]+)['"]/g),
    ].map((m) => m[1]);
    for (const request of requests) {
      expect(request.startsWith('.'), `${file} imports runtime dependency ${request}`).toBe(true);
      const dependency = resolve(dirname(file), request + '.ts');
      expect(graph.has(dependency), `${file} imports private host code ${request}`).toBe(true);
      if (
        file.includes(sep + 'examples' + sep) ||
        file.includes(sep + 'pedals' + sep) ||
        file.includes(sep + 'instruments' + sep) ||
        file.includes(sep + 'engines' + sep)
      )
        expect(dependency).toBe(resolve(root, 'index.ts'));
      graph.get(file)!.push(dependency);
    }
  }
  const visited = new Set<string>(),
    visiting = new Set<string>();
  const visit = (file: string) => {
    expect(visiting.has(file), `Module import cycle at ${file}`).toBe(false);
    if (visited.has(file)) return;
    visiting.add(file);
    for (const dependency of graph.get(file)!) visit(dependency);
    visiting.delete(file);
    visited.add(file);
  };
  files.forEach(visit);
});

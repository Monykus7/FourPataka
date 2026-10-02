import fs from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { codeFile, extractCode, extractDocument, hash } from './extract.mjs';

export const GRAPH_VERSION = 1;
export const CACHE = '.knowledge-cache';
const roots = ['src', 'desktop', 'tests', 'scripts', 'docs'];
export async function sourceFiles(root) {
  const files = [];
  async function visit(relative) {
    for (const entry of await fs.readdir(path.join(root, relative), { withFileTypes: true })) {
      if (entry.isSymbolicLink()) continue;
      const file = path.posix.join(relative, entry.name);
      if (entry.isDirectory()) await visit(file);
      else if (
        /\.(?:tsx?|[cm]?js|css|md|json)$/.test(file) &&
        file !== 'docs/knowledge/PROJECT_MAP.md'
      )
        files.push(file);
    }
  }
  for (const directory of roots) await visit(directory);
  for (const file of await fs.readdir(root))
    if (
      /\.md$/.test(file) ||
      [
        'package.json',
        'tsconfig.json',
        'vite.config.ts',
        'vitest.config.ts',
        'playwright.config.ts',
        'playwright.desktop.config.ts',
      ].includes(file)
    )
      files.push(file);
  return files.sort();
}
export const matchesPath = (file, pattern) =>
  pattern.endsWith('/') ? file.startsWith(pattern) : file === pattern;
export function validateFeatures(features) {
  const ids = new Set(features.map((f) => f.id));
  if (ids.size !== features.length) throw new Error('Duplicate feature ID.');
  for (const feature of features) {
    const seen = new Set([feature.id]);
    let parent = feature.parent;
    while (parent) {
      if (!ids.has(parent) || seen.has(parent))
        throw new Error(`Invalid or cyclic parent for ${feature.id}.`);
      seen.add(parent);
      parent = features.find((f) => f.id === parent).parent;
    }
  }
}
export function connectCode(nodes, records) {
  const edges = [];
  const files = new Set(Object.keys(records));
  const definitions = nodes.filter((n) => n.kind === 'symbol');
  const resolve = (file, source) => {
    if (!source.startsWith('.')) return null;
    const base = path.posix.normalize(path.posix.join(path.posix.dirname(file), source));
    return [
      base,
      ...['.ts', '.tsx', '.mjs', '.cjs', '.js', '.json', '/index.ts', '/index.tsx'].map(
        (suffix) => base + suffix,
      ),
    ].find((candidate) => files.has(candidate));
  };
  for (const [file, record] of Object.entries(records)) {
    const local = definitions.filter((n) => n.path === file);
    const imported = new Map();
    const importedFiles = new Set();
    for (const entry of record.imports ?? []) {
      const target = resolve(file, entry.source);
      if (!target) continue;
      importedFiles.add(target);
      edges.push({ from: `file:${file}`, to: `file:${target}`, kind: 'imports', weight: 3 });
      for (const binding of entry.bindings) {
        const candidates = definitions.filter(
          (n) =>
            n.path === target &&
            (binding.imported === 'default' ? n.defaultExport : n.shortName === binding.imported),
        );
        imported.set(binding.local, candidates.length === 1 ? candidates[0].id : `file:${target}`);
      }
    }
    for (const reference of record.references ?? []) {
      let target = imported.get(reference.name);
      let resolution = 'import';
      if (!target) {
        const candidates = local.filter(
          (n) => n.shortName === reference.name && n.id !== reference.owner,
        );
        if (candidates.length === 1) {
          target = candidates[0].id;
          resolution = 'local';
        }
      }
      if (!target) {
        const candidates = definitions.filter(
          (n) => importedFiles.has(n.path) && n.shortName === reference.name,
        );
        if (candidates.length === 1) {
          target = candidates[0].id;
          resolution = 'imported-member-heuristic';
        }
      }
      if (target && target !== reference.owner)
        edges.push({
          from: reference.owner,
          to: target,
          kind: 'references',
          resolution,
          line: reference.line,
          weight: Math.sqrt(reference.count),
        });
    }
  }
  return edges;
}

export async function buildGraph(root) {
  const cacheDir = path.join(root, CACHE);
  await fs.mkdir(cacheDir, { recursive: true });
  const files = await sourceFiles(root);
  const sources = await Promise.all(
    files.map(async (file) => ({ file, text: await fs.readFile(path.join(root, file), 'utf8') })),
  );
  const features = JSON.parse(
    sources.find((s) => s.file === 'docs/knowledge/features.json').text,
  ).features;
  validateFeatures(features);
  const parserFingerprint = hash(
    (await fs.readFile(new URL('./extract.mjs', import.meta.url), 'utf8')) +
      (await fs.readFile(path.join(root, 'package-lock.json'), 'utf8').catch(() => '')),
  );
  const fingerprint = hash(
    JSON.stringify({
      version: GRAPH_VERSION,
      parserFingerprint,
      sources: sources.map((s) => [s.file, hash(s.text)]),
    }),
  );
  let previous;
  try {
    previous = JSON.parse(await fs.readFile(path.join(cacheDir, 'graph.json'), 'utf8'));
  } catch {
    /* first build */
  }
  if (previous?.fingerprint === fingerprint) return previous;
  const records = {};
  const nodes = [];
  const edges = [];
  for (const { file, text } of sources) {
    const digest = hash(text);
    const old =
      previous?.version === GRAPH_VERSION &&
      previous.parserFingerprint === parserFingerprint &&
      previous.records[file];
    const record =
      old?.hash === digest
        ? old
        : {
            hash: digest,
            ...(codeFile(file) ? await extractCode(file, text) : {}),
            docs: file.endsWith('.md') ? extractDocument(file, text) : [],
          };
    records[file] = record;
    nodes.push({
      id: `file:${file}`,
      kind: 'file',
      name: file,
      path: file,
      line: 1,
      endLine: text.split('\n').length,
      hash: digest,
      summary: `${file}: ${(record.definitions ?? [])
        .slice(0, 12)
        .map((d) => d.name)
        .join(', ')}`,
      text: text.slice(0, 900),
    });
    const children = [...(record.definitions ?? []), ...record.docs];
    for (const child of children) {
      nodes.push(child);
      edges.push({ from: `file:${file}`, to: child.id, kind: 'contains', weight: 1 });
    }
    const stack = [];
    for (const doc of record.docs) {
      while (stack.length && stack.at(-1).level >= doc.level) stack.pop();
      if (stack.length)
        edges.push({ from: stack.at(-1).id, to: doc.id, kind: 'section', weight: 2 });
      stack.push(doc);
      const tags =
        /<!--\s*features:\s*([\w, -]+)\s*-->/
          .exec(doc.text)?.[1]
          ?.split(',')
          .map((s) => s.trim()) ?? [];
      for (const tag of tags)
        if (features.some((f) => f.id === tag))
          edges.push({ from: `feature:${tag}`, to: doc.id, kind: 'documents', weight: 3 });
    }
  }
  edges.push(...connectCode(nodes, records));
  for (const feature of features) {
    const members = nodes.filter(
      (n) => n.path && feature.paths.some((p) => matchesPath(n.path, p)),
    );
    nodes.push({
      id: `feature:${feature.id}`,
      kind: 'feature',
      name: feature.title,
      summary: feature.summary,
      path: 'docs/knowledge/features.json',
      line: 1,
      members: members.map((n) => n.id),
      parent: feature.parent ? `feature:${feature.parent}` : null,
    });
    if (feature.parent)
      edges.push({
        from: `feature:${feature.parent}`,
        to: `feature:${feature.id}`,
        kind: 'hierarchy',
        weight: 2,
      });
    for (const member of members)
      edges.push({
        from: `feature:${feature.id}`,
        to: member.id,
        kind: 'implements',
        weight: member.kind === 'file' ? 2 : 0.5,
      });
  }
  const graph = {
    version: GRAPH_VERSION,
    parserFingerprint,
    fingerprint,
    nodes,
    edges,
    records,
    features,
    parseErrors: files.filter((file) => records[file].parseErrors),
  };
  const temporary = path.join(cacheDir, `graph.${randomUUID()}.tmp.json`);
  await fs.writeFile(temporary, JSON.stringify(graph));
  await fs.rename(temporary, path.join(cacheDir, 'graph.json'));
  return graph;
}

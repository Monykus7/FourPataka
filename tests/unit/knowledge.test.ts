import { describe, expect, it } from 'vitest';
import { extractCode, extractDocument } from '../../scripts/knowledge/extract.mjs';
import { connectCode, validateFeatures, sourceFiles } from '../../scripts/knowledge/graph.mjs';
import { neighborhood, personalizedPageRank } from '../../scripts/knowledge/rank.mjs';
import { addSummaries, projectMap } from '../../scripts/knowledge/summaries.mjs';
import { packContext, tokenCount } from '../../scripts/knowledge/context.mjs';
import { cosine, lexicalSeeds } from '../../scripts/knowledge/semantic.mjs';
import { shouldRebuild } from '../../scripts/knowledge/watch.mjs';
import { buildGraph } from '../../scripts/knowledge/graph.mjs';
import fs from 'node:fs/promises';
import path from 'node:path';
describe('project knowledge extraction', () => {
  it('refreshes changed symbols and removes deleted files and their edges from the cache', async () => {
    const testRoot = path.resolve('.test-results');
    await fs.mkdir(testRoot, { recursive: true });
    const root = await fs.mkdtemp(path.join(testRoot, 'knowledge-fixture-'));
    try {
      await Promise.all(
        ['src', 'desktop', 'tests', 'scripts', 'docs/knowledge'].map((dir) =>
          fs.mkdir(path.join(root, dir), { recursive: true }),
        ),
      );
      await fs.writeFile(
        path.join(root, 'docs/knowledge/features.json'),
        JSON.stringify(
          { features: [{ id: 'root', title: 'Fixture', summary: 'A project.', paths: ['src/'] }] },
          null,
          2,
        ),
      );
      await fs.writeFile(
        path.join(root, 'src/helper.ts'),
        'export function before() { return 1; }',
      );
      await fs.writeFile(
        path.join(root, 'src/main.ts'),
        "import { before } from './helper';\nexport function run() { return before(); }",
      );
      await fs.mkdir(path.join(root, 'docs/.cursor'), { recursive: true });
      await fs.writeFile(
        path.join(root, 'AGENTS.md'),
        '# Local-only instructions\nPRIVATE_SENTINEL',
      );
      await fs.writeFile(path.join(root, 'docs/AGENTS.md'), '# Nested local instructions');
      await fs.writeFile(path.join(root, 'docs/.cursor/private.md'), '# Private editor rules');
      expect(await sourceFiles(root)).not.toContain('AGENTS.md');
      expect(await sourceFiles(root)).not.toContain('docs/AGENTS.md');
      expect(await sourceFiles(root)).not.toContain('docs/.cursor/private.md');
      const original = await buildGraph(root);
      expect(JSON.stringify(original)).not.toContain('PRIVATE_SENTINEL');
      expect(original.nodes.find((n) => n.id === 'feature:root').line).toBe(4);
      expect(original.nodes.some((n) => n.name === 'before')).toBe(true);
      expect((await buildGraph(root)).fingerprint).toBe(original.fingerprint);
      await fs.writeFile(path.join(root, 'src/helper.ts'), 'export function after() { return 2; }');
      const changed = await buildGraph(root);
      expect(changed.fingerprint).not.toBe(original.fingerprint);
      expect(changed.nodes.some((n) => n.name === 'before')).toBe(false);
      expect(changed.nodes.some((n) => n.name === 'after')).toBe(true);
      expect(projectMap(addSummaries(changed))).not.toBe(projectMap(addSummaries(original)));
      await fs.writeFile(path.join(root, 'src/helper.ts'), 'export function after() { return 3; }');
      const bodyOnly = await buildGraph(root);
      expect(bodyOnly.fingerprint).not.toBe(changed.fingerprint);
      expect(projectMap(addSummaries(bodyOnly))).toBe(projectMap(addSummaries(changed)));
      await fs.unlink(path.join(root, 'src/helper.ts'));
      const deleted = await buildGraph(root);
      expect(deleted.nodes.some((n) => n.path === 'src/helper.ts')).toBe(false);
      const ids = new Set(deleted.nodes.map((n) => n.id));
      expect(deleted.edges.every((e) => ids.has(e.from) && ids.has(e.to))).toBe(true);
    } finally {
      const relative = path.relative(testRoot, path.resolve(root));
      if (!relative.startsWith('..') && !path.isAbsolute(relative))
        await fs.rm(root, { recursive: true, force: true });
    }
  });
  it('watches working sources while ignoring its own outputs and private caches', () => {
    expect(shouldRebuild('src\\audio\\voice.ts')).toBe(true);
    expect(shouldRebuild('BUILD_PLAN.md')).toBe(true);
    expect(shouldRebuild('tsconfig.json')).toBe(true);
    expect(shouldRebuild('docs/knowledge/features.json')).toBe(true);
    expect(shouldRebuild('docs/knowledge/PROJECT_MAP.md')).toBe(false);
    expect(shouldRebuild('.knowledge-cache/graph.json')).toBe(false);
    expect(shouldRebuild('node_modules/module/file.js')).toBe(false);
    expect(shouldRebuild('.git/config')).toBe(false);
    expect(shouldRebuild('AGENTS.md')).toBe(false);
    expect(shouldRebuild('docs\\AGENTS.md')).toBe(false);
    expect(shouldRebuild('docs/.cursor/private.md')).toBe(false);
  });
  it('enforces the whole-context token budget with Unicode, citations and oversized queries', () => {
    const graph = {
      nodes: [
        {
          id: 'a',
          name: 'Waveform',
          path: 'src/wave.ts',
          line: 4,
          kind: 'symbol',
          signature: 'draw(phase: number)',
          summary: 'Σ sine 🎵 '.repeat(300),
        },
        {
          id: 'b',
          name: 'Sound',
          path: 'docs/sound.md',
          line: 1,
          kind: 'feature',
          summary: 'Fourier source.',
        },
      ],
    };
    for (const budget of [64, 128, 512]) {
      const context = packContext(
        graph,
        new Map([
          ['a', 0.8],
          ['b', 0.2],
        ]),
        [{ id: 'a', score: 1 }],
        'Edit the sine wave',
        budget,
      );
      expect(tokenCount(context.text)).toBe(context.tokenCount);
      expect(context.tokenCount).toBeLessThanOrEqual(budget);
    }
    expect(() => packContext(graph, new Map(), [], 'x '.repeat(200), 64)).toThrow('exceed');
  });
  it('labels lexical seed retrieval separately and compares semantic vectors by cosine', () => {
    const graph = {
      nodes: [
        { id: 'wave', name: 'waveformCoefficients', summary: 'sine projection' },
        { id: 'file', name: 'Project save', summary: 'JSON persistence' },
      ],
    };
    expect(lexicalSeeds(graph, 'waveform projection')[0].id).toBe('wave');
    expect(cosine([1, 0], [2, 0])).toBe(1);
    expect(cosine([1, 0], [0, 1])).toBe(0);
    expect(cosine([0, 0], [0, 1])).toBe(0);
    expect(() => cosine([1], [1, 0])).toThrow('dimensions');
  });
  it('keeps disconnected code out of a personalized neighborhood and conserves rank mass', () => {
    const graph = {
      nodes: ['a', 'b', 'c'].map((id) => ({ id })),
      edges: [{ from: 'a', to: 'b', weight: 2 }],
    };
    const seeds = [{ id: 'a', score: 1 }];
    const selected = neighborhood(graph, seeds);
    expect([...selected]).toEqual(['a', 'b']);
    const rank = personalizedPageRank(graph, seeds, selected);
    expect([...rank.values()].reduce((a, b) => a + b, 0)).toBeCloseTo(1);
    expect(rank.get('a')).toBeGreaterThan(rank.get('b'));
    expect(rank.has('c')).toBe(false);
  });
  it('builds dependency subcommunities with a real feature parent and source evidence', () => {
    const graph = {
      features: [{ id: 'f', title: 'Audio', summary: 'Aligned signal.', paths: [] }],
      nodes: [
        { id: 'feature:f', members: ['file:a.ts', 'file:b.ts'], summary: 'Aligned signal.' },
        { id: 'file:a.ts', kind: 'file', path: 'a.ts' },
        { id: 'file:b.ts', kind: 'file', path: 'b.ts' },
      ],
      edges: [{ from: 'file:a.ts', to: 'file:b.ts', kind: 'imports', weight: 3 }],
    };
    const enriched = addSummaries(graph);
    const communities = enriched.nodes.filter((n) => n.kind === 'community');
    expect(communities).toHaveLength(1);
    expect(communities[0].parent).toBe('feature:f');
    expect(communities[0].evidence).toEqual(['a.ts', 'b.ts']);
  });
  it('resolves aliased imports narrowly instead of guessing same-name symbols in unrelated files', async () => {
    const provider = await extractCode(
      'src/parser.ts',
      'export function parseScore() { return 1; }',
    );
    const other = await extractCode('src/other.ts', 'export function parseScore() { return 2; }');
    const consumer = await extractCode(
      'src/main.ts',
      "import { parseScore as compile } from './parser';\nexport function run() { return compile(); }",
    );
    const edges = connectCode(
      [...provider.definitions, ...other.definitions, ...consumer.definitions],
      { 'src/parser.ts': provider, 'src/other.ts': other, 'src/main.ts': consumer },
    );
    expect(
      edges.some(
        (e) => e.from === consumer.definitions[0].id && e.to === provider.definitions[0].id,
      ),
    ).toBe(true);
    expect(edges.some((e) => e.to === other.definitions[0].id)).toBe(false);
    expect(() =>
      validateFeatures([
        { id: 'a', parent: 'b' },
        { id: 'b', parent: 'a' },
      ]),
    ).toThrow('cyclic');
  });
  it('uses syntax definitions and import aliases, with class methods and exact source lines', async () => {
    const source = `import { parseScore as compile } from './parser';\n// Keep the playing revision.\nexport class Player {\n  play(text: string) { return compile(text); }\n}\nexport const jump = (value: number) => value + 1;`;
    const parsed = await extractCode('src/player.ts', source);
    expect(parsed.parseErrors).toBe(false);
    expect(parsed.definitions.map((d) => d.name)).toEqual(['Player', 'Player.play', 'jump']);
    expect(parsed.definitions[1].line).toBe(4);
    expect(parsed.definitions[0].summary).toContain('playing revision');
    expect(parsed.imports[0].bindings).toEqual([{ local: 'compile', imported: 'parseScore' }]);
    expect(
      parsed.references.some((r) => r.owner === parsed.definitions[1].id && r.name === 'compile'),
    ).toBe(true);
  });
  it('does not mistake headings inside fenced examples for document sections', () => {
    const sections = extractDocument(
      'BUILD_PLAN.md',
      '# Plan\n## Timing\nQuarter-note BPM.\n```text\n# fake\n```\n## Future\nDelay.',
    );
    expect(sections.map((s) => s.name)).toEqual(['Plan', 'Timing', 'Future']);
    expect(sections[1].kind).toBe('plan');
    expect(sections[1].summary).toBe('Quarter-note BPM.');
    expect(sections[2].line).toBe(7);
  });
});

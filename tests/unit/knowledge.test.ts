import { describe, expect, it } from 'vitest';
import { extractCode, extractDocument } from '../../scripts/knowledge/extract.mjs';
import { connectCode, validateFeatures } from '../../scripts/knowledge/graph.mjs';
import { neighborhood, personalizedPageRank } from '../../scripts/knowledge/rank.mjs';
import { addSummaries } from '../../scripts/knowledge/summaries.mjs';
describe('project knowledge extraction', () => {
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

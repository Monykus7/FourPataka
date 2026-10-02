import { describe, expect, it } from 'vitest';
import { extractCode, extractDocument } from '../../scripts/knowledge/extract.mjs';
describe('project knowledge extraction', () => {
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

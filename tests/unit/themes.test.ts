import { describe, expect, it } from 'vitest';
import { contrast, resolveTheme, themeTokens, THEMES } from '../../src/core/themes';

describe('bundled theme preferences', () => {
  it('offers three Happy Hues palettes, the original, and the exact custom colors', () => {
    expect(THEMES.filter((theme) => theme.source)).toHaveLength(3);
    expect(resolveTheme('earth').swatches).toEqual([
      '#9A7F62',
      '#5F6E73',
      '#697E60',
      '#D6D2C4',
      '#B7A99A',
    ]);
    expect(resolveTheme('unknown').id).toBe('original');
    expect(resolveTheme(null).id).toBe('original');
  });
  it('keeps text and accent labels readable on every panel surface', () => {
    for (const theme of THEMES) {
      const tokens = themeTokens(theme);
      for (const text of [
        '--text',
        '--text-muted',
        '--accent-ink',
        '--secondary-ink',
        '--tertiary-ink',
      ])
        for (const bg of ['--bg', '--surface-1', '--surface-2'])
          expect(
            contrast(tokens[text], tokens[bg]),
            `${theme.id} ${text} on ${bg}`,
          ).toBeGreaterThanOrEqual(4.5);
      expect(contrast(tokens['--accent-text'], tokens['--accent'])).toBeGreaterThanOrEqual(4.5);
    }
  });
});

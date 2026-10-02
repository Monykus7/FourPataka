export interface Theme {
  id: string;
  label: string;
  source?: string;
  background: string;
  text: string;
  muted: string;
  accent: string;
  secondary: string;
  tertiary: string;
  surfaces?: [string, string];
  swatches?: string[];
}

// Bundled locally: desktop themes work without a network connection.
// Happy Hues roles are adapted to studio surfaces, ink, and musical accents.
export const THEMES: Theme[] = [
  {
    id: 'original',
    label: 'Original',
    background: '#0f0e17',
    text: '#fffffe',
    muted: '#a7a9be',
    accent: '#ff8906',
    secondary: '#f25f4c',
    tertiary: '#e53170',
    surfaces: ['#171622', '#1f1d2b'],
  },
  {
    id: 'hues-12',
    label: 'Blue / pink · Happy Hues 12',
    source: 'https://www.happyhues.co/palettes/12',
    background: '#121629',
    text: '#fffffe',
    muted: '#b8c1ec',
    accent: '#eebbc3',
    secondary: '#b8c1ec',
    tertiary: '#eebbc3',
    surfaces: ['#232946', '#292f4b'],
  },
  {
    id: 'hues-10',
    label: 'Green / orange · Happy Hues 10',
    source: 'https://www.happyhues.co/palettes/10',
    background: '#004643',
    text: '#fffffe',
    muted: '#abd1c6',
    accent: '#f9bc60',
    secondary: '#abd1c6',
    tertiary: '#e16162',
  },
  {
    id: 'hues-6',
    label: 'Violet / coral · Happy Hues 6',
    source: 'https://www.happyhues.co/palettes/6',
    background: '#fffffe',
    text: '#2b2c34',
    muted: '#2b2c34',
    accent: '#6246ea',
    secondary: '#d1d1e9',
    tertiary: '#e45858',
  },
  {
    id: 'earth',
    label: 'Earth / sage',
    background: '#D6D2C4',
    text: '#293336',
    muted: '#5F6E73',
    accent: '#9A7F62',
    secondary: '#697E60',
    tertiary: '#5F6E73',
    surfaces: ['#ddd9ce', '#B7A99A'],
    swatches: ['#9A7F62', '#5F6E73', '#697E60', '#D6D2C4', '#B7A99A'],
  },
];

const rgb = (hex: string) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
const blend = (from: string, to: string, amount: number) =>
  '#' +
  rgb(from)
    .map((value, i) =>
      Math.round(value * (1 - amount) + rgb(to)[i] * amount)
        .toString(16)
        .padStart(2, '0'),
    )
    .join('');
const luminance = (hex: string) =>
  rgb(hex)
    .map((n) => {
      const value = n / 255;
      return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
    })
    .reduce((sum, value, i) => sum + value * [0.2126, 0.7152, 0.0722][i], 0);
export const contrast = (a: string, b: string) => {
  const values = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (values[0] + 0.05) / (values[1] + 0.05);
};
function readable(color: string, backgrounds: string[]) {
  const ink = luminance(backgrounds[0]) > 0.35 ? '#121629' : '#fffffe';
  for (let step = 0; step <= 100; step++) {
    const candidate = blend(color, ink, step / 100);
    if (backgrounds.every((bg) => contrast(candidate, bg) >= 4.5)) return candidate;
  }
  for (const fallback of ['#000000', '#ffffff'])
    if (backgrounds.every((bg) => contrast(fallback, bg) >= 4.5)) return fallback;
  return ink;
}
export function resolveTheme(id: unknown): Theme {
  return THEMES.find((theme) => theme.id === id) ?? THEMES[0];
}
export function themeTokens(theme: Theme): Record<string, string> {
  const [surface1, surface2] = theme.surfaces ?? [
    blend(theme.background, theme.text, 0.035),
    blend(theme.background, theme.text, 0.065),
  ];
  const backgrounds = [theme.background, surface1, surface2];
  return {
    '--bg': theme.background,
    '--surface-1': surface1,
    '--surface-2': surface2,
    '--border': blend(surface1, theme.text, 0.2),
    '--text': readable(theme.text, backgrounds),
    '--text-muted': readable(theme.muted, backgrounds),
    '--accent': theme.accent,
    '--accent-text':
      contrast('#121629', theme.accent) > contrast('#fffffe', theme.accent) ? '#121629' : '#fffffe',
    '--secondary': theme.secondary,
    '--tertiary': theme.tertiary,
    '--accent-ink': readable(theme.accent, backgrounds),
    '--secondary-ink': readable(theme.secondary, backgrounds),
    '--tertiary-ink': readable(theme.tertiary, backgrounds),
  };
}
export function applyTheme(id: unknown) {
  const theme = resolveTheme(id);
  const root = document.documentElement;
  root.dataset.theme = theme.id;
  root.style.colorScheme = luminance(theme.background) > 0.35 ? 'light' : 'dark';
  Object.entries(themeTokens(theme)).forEach(([key, value]) => root.style.setProperty(key, value));
}

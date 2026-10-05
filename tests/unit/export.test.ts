import { expect, it } from 'vitest';
import { prepareExport } from '../../src/audio/export';
import { createProject } from '../../src/core/project';
import { DEFAULT_WAV_OPTIONS } from '../../src/core/wav';
import { admitVoice, VOICE_LIMIT } from '../../src/audio/voiceLimit';
import type { Voice } from '../../src/audio/voice';

it('export rejects invalid, silent and oversized scores without allocating audio', () => {
  const project = createProject();
  project.scoreText = 'invalid';
  expect(() => prepareExport(project, DEFAULT_WAV_OPTIONS)).toThrow(/diagnostics/);
  project.scoreText = 'track one using sine {\n rest whole\n}';
  expect(() => prepareExport(project, DEFAULT_WAV_OPTIONS)).toThrow(/at least one note/);
  project.scoreText =
    'tempo 20\ntrack one using sine {\n A4 whole\n' + 'rest whole\n'.repeat(1000) + '}';
  expect(() => prepareExport(project, DEFAULT_WAV_OPTIONS)).toThrow(/memory limit/);
});
it('voice admission counts scheduled overlap and steals the oldest at the replacement time', () => {
  const calls: number[] = [];
  const voices = Array.from(
    { length: VOICE_LIMIT },
    () => ({ end: 2, steal: (time: number) => calls.push(time) }) as Voice,
  );
  expect(admitVoice(voices, 1)).toHaveLength(VOICE_LIMIT - 1);
  expect(calls).toEqual([1]);
  expect(admitVoice(voices, 2)).toEqual([]);
});

import { expect, it } from 'vitest';
import { defaultModuleSettings } from '../../src/modules';
import { tutorialLevel } from '../../src/modules/examples/tutorialLevel/index';
import { tutorialPluck } from '../../src/modules/examples/tutorialPluck/index';
import { pedalModules, instrumentModules } from '../../src/modules/assembly';

it('discovers both new contributions through assembly with independent validated defaults', () => {
  expect(pedalModules.get(tutorialLevel.id)?.label).toBe('Tutorial level');
  const first = defaultModuleSettings(tutorialLevel);
  first.output = -12;
  expect(defaultModuleSettings(tutorialLevel).output).toBe(0);
  const definition = instrumentModules.definitions.find((d) => d.id === tutorialPluck.id)!;
  expect(definition.scoreKey).toBe('tutorialPluck');
  const sound = definition.createSound();
  sound.harmonics[0] = 0;
  expect(definition.createSound().harmonics[0]).toBe(1);
});

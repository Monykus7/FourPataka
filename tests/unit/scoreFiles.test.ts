import { expect, it } from 'vitest';
import {
  addScoreFile,
  editScoreFile,
  indexScoreFiles,
  normalizeFileWorkspace,
  readFileWorkspace,
  removeScoreFile,
  renameScoreFile,
} from '../../src/core/scoreFiles';

const original = '// retained\r\ntempo 120\r\ntrack melody using sine {\r\n C4 quarter\r\n}\r\n';
it('promotes legacy music into one canonical file workspace without rewriting its body', () => {
  const source = addScoreFile(
    original,
    indexScoreFiles(original),
    'bridge',
    'bridge.fourier',
    'Demo',
  );
  const index = indexScoreFiles(source);
  expect(index.problem).toBeNull();
  expect(index.diagnostics).toEqual([]);
  expect(index.files.map((file) => [file.id, file.name, file.song])).toEqual([
    ['main', 'score.fourier', 'Demo'],
    ['bridge', 'bridge.fourier', 'Demo'],
  ]);
  expect(source.slice(index.files[0].from, index.files[0].to)).toBe('from song Demo\n' + original);
  const changed = editScoreFile(
    source,
    index,
    'bridge',
    'from song Demo\ntrack bass using sine {\n C2 whole\n}',
  );
  expect(changed).toContain(original);
  expect(() => editScoreFile(changed, index, 'main', 'lost')).toThrow('changed');
  expect(() => editScoreFile(source, index, 'bridge', '// @fourpataka-file {}')).toThrow(
    'All files',
  );
});
it('renames or removes a file without touching siblings and rejects ambiguous identities', () => {
  const source = addScoreFile(
    original,
    indexScoreFiles(original),
    'bridge',
    'bridge.fourier',
    'Demo',
  );
  const index = indexScoreFiles(source);
  const renamed = renameScoreFile(source, index, 'bridge', 'ending.fourier');
  expect(renamed).toContain(original);
  expect(indexScoreFiles(renamed).files[1].id).toBe('bridge');
  expect(removeScoreFile(source, index, 'bridge')).toBe(source.slice(0, index.files[1].markerFrom));
  expect(() => renameScoreFile(source, index, 'bridge', 'SCORE.FOURIER')).toThrow('already');
  expect(() => addScoreFile(source, index, 'x', '../x', 'Demo')).toThrow('name');
  expect(
    indexScoreFiles(
      source + '// @fourpataka-file {"id":"bridge","name":"duplicate"}\nfrom song Demo',
    ).problem,
  ).toContain('unique');
  expect(
    indexScoreFiles(source.replace('from song Demo\n\n', 'from song Other\n\n')).diagnostics[0]
      .message,
  ).toContain('One project');
});
it('persists only bounded presentation data and recovers deleted or malformed file views', () => {
  expect(readFileWorkspace({ openFiles: ['main'], activeFile: 'main', unknown: 42 })).toEqual({
    openFiles: ['main'],
    activeFile: 'main',
  });
  expect(() => readFileWorkspace({ openFiles: ['main', 'main'], activeFile: 'main' })).toThrow(
    'selection',
  );
  expect(() => readFileWorkspace({ openFiles: [], activeFile: 'missing' })).toThrow('selection');
  expect(
    normalizeFileWorkspace(original, { openFiles: ['gone', 'main'], activeFile: 'gone' }),
  ).toEqual({ openFiles: ['main'], activeFile: 'main' });
  expect(normalizeFileWorkspace(original, { openFiles: [], activeFile: null })).toEqual({
    openFiles: [],
    activeFile: null,
  });
  expect(
    normalizeFileWorkspace('// @fourpataka-file broken', {
      openFiles: ['main'],
      activeFile: 'main',
    }).activeFile,
  ).toBeNull();
});

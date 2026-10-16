import { readFile, stat } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { resolve } from 'node:path';
import { extractFile, listPackage } from '@electron/asar';

const root = process.cwd();
const forbidden =
  /(^|\/)(?:\.cursor|AGENTS\.md|\.knowledge-cache|\.test-results|node_modules|release|\.git)(\/|$)/i;
const tracked = execFileSync('git', ['-c', `safe.directory=${root}`, 'ls-files', '-z'], {
  encoding: 'utf8',
})
  .split('\0')
  .filter(Boolean);
const leaked = tracked.filter((file) => forbidden.test(file.replaceAll('\\', '/')));
if (leaked.length) throw new Error(`Private/generated files tracked: ${leaked.join(', ')}`);
const pkg = JSON.parse(await readFile(resolve(root, 'package.json'), 'utf8'));
if (pkg.license !== 'GPL-3.0-only') throw new Error('Owner-selected license differs');

if (process.argv[2]) {
  const directory = resolve(process.argv[2]);
  const archive = resolve(directory, 'resources/app.asar');
  const entries = listPackage(archive).map((file) => file.replaceAll('\\', '/'));
  if (entries.some((file) => forbidden.test(file)))
    throw new Error('Private/generated files in app.asar');
  // Compare the actual archive, not just electron-builder's configured allowlist.
  for (const [source, bundled] of [
    ['LICENSE', 'LICENSE'],
    ['THIRD_PARTY_NOTICES.md', 'THIRD_PARTY_NOTICES.md'],
    ['public/LICENSE.txt', 'dist/LICENSE.txt'],
    ['public/THIRD_PARTY_LICENSES.txt', 'dist/THIRD_PARTY_LICENSES.txt'],
  ]) {
    const expected = (await readFile(resolve(root, source), 'utf8')).replaceAll('\r\n', '\n');
    const actual = extractFile(archive, bundled).toString('utf8').replaceAll('\r\n', '\n');
    if (actual !== expected) throw new Error(`Missing or stale bundled notice: ${bundled}`);
  }
  for (const file of ['LICENSE.electron.txt', 'LICENSES.chromium.html']) {
    if ((await stat(resolve(directory, file))).size < 100)
      throw new Error(`Missing runtime notice: ${file}`);
  }
  console.log('Packaged notices and private-file exclusion verified.');
} else console.log('Source licensing and private-file exclusion verified.');

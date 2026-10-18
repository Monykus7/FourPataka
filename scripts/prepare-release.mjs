import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { createReadStream, mkdtempSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve, relative } from 'node:path';

// Review downloaded CI assets before publication; never build an uncommitted replacement.
const [commitArg, directoryArg] = process.argv.slice(2);
if (!commitArg || !directoryArg || process.argv.length !== 4 || commitArg.startsWith('-'))
  throw new Error('Usage: node scripts/prepare-release.mjs <commit> <downloaded-assets-directory>');
if (process.platform !== 'win32')
  throw new Error('Release preparation currently supports Windows only.');
const root = process.cwd(),
  directory = resolve(directoryArg);
const git = (...args) =>
  execFileSync('git', ['-c', `safe.directory=${root}`, ...args], {
    cwd: root,
    maxBuffer: 32 * 1024 * 1024,
  });
const commit = git('rev-parse', '--verify', `${commitArg}^{commit}`).toString().trim();
const pkg = JSON.parse(git('show', `${commit}:package.json`).toString());
const names = [`FourPataka-${pkg.version}-win-x64.exe`, `FourPataka-source-${commit}.zip`];
const sourceRoot = mkdtempSync(join(tmpdir(), 'fourpataka-source-review-'));
// PowerShell receives paths through environment variables, never interpolated shell code.
execFileSync(
  'powershell.exe',
  [
    '-NoProfile',
    '-NonInteractive',
    '-Command',
    'Add-Type -AssemblyName System.IO.Compression.FileSystem; [System.IO.Compression.ZipFile]::ExtractToDirectory($env:FOURPATAKA_REVIEW_ZIP,$env:FOURPATAKA_REVIEW_DEST)',
  ],
  {
    env: {
      ...process.env,
      FOURPATAKA_REVIEW_ZIP: join(directory, names[1]),
      FOURPATAKA_REVIEW_DEST: sourceRoot,
    },
  },
);
const expected = git('ls-tree', '-rz', '--name-only', commit)
  .toString()
  .split('\0')
  .filter(Boolean);
const actual = [];
const walk = (folder) => {
  for (const entry of readdirSync(folder, { withFileTypes: true })) {
    const path = join(folder, entry.name);
    if (entry.isDirectory()) walk(path);
    else actual.push(relative(sourceRoot, path).replaceAll('\\', '/'));
  }
};
walk(sourceRoot);
if (JSON.stringify(actual.sort()) !== JSON.stringify([...expected].sort()))
  throw new Error('Source archive file list differs from commit');
const forbidden =
  /(^|\/)(?:\.cursor|AGENTS\.md|\.knowledge-cache|\.test-results|node_modules|release|\.git)(\/|$)/i;
for (const path of expected) {
  if (forbidden.test(path)) throw new Error(`Private/generated archive path: ${path}`);
  const actualBytes = readFileSync(join(sourceRoot, path));
  const expectedBytes = git('cat-file', 'blob', `${commit}:${path}`);
  // Windows git archive may export checkout CRLF. Only valid UTF-8 text without
  // NUL bytes can use this equivalence; fonts and other binary data remain exact.
  const text = (bytes) => !bytes.includes(0) && Buffer.from(bytes.toString('utf8')).equals(bytes);
  const equivalent =
    actualBytes.equals(expectedBytes) ||
    (text(actualBytes) &&
      text(expectedBytes) &&
      actualBytes.toString('utf8').replaceAll('\r\n', '\n') ===
        expectedBytes.toString('utf8').replaceAll('\r\n', '\n'));
  if (!equivalent) throw new Error(`Source archive bytes differ: ${path}`);
}
const checksums = [];
for (const name of names) {
  const hash = createHash('sha256');
  for await (const chunk of createReadStream(join(directory, name))) hash.update(chunk);
  checksums.push(`${hash.digest('hex')}  ${name}`);
}
writeFileSync(join(directory, 'SHA256SUMS.txt'), checksums.join('\n') + '\n');
writeFileSync(
  join(directory, 'BUILDING.txt'),
  `FourPataka ${pkg.version}\nExact source: ${commit}\nLicense: GPL-3.0-only; see LICENSE in source and bundled notices.\n\nExtract the attached source ZIP, install Node24, and run:\n  npm ci\n  npm run build\nWindows portable:\n  npm run desktop:package\nNo Visual Studio or IR/sample downloads are required. The official Electron runtime is downloaded by desktop:setup. Build tools/dependencies are resolved by package-lock.json.\n\nSource archives do not include Git metadata. Clone the repository at this commit to run Git-based contributor:verify or distribution:check.\n\nThe attached Windows x64 portable is an unsigned prototype with a default icon. Other native OS targets, physical listening/device performance and screen-reader verification remain outside this release's tested support.\nChecksums identify the attached files; builds are not claimed byte-for-byte reproducible.\n`,
);
console.log(
  `Verified ${expected.length} source files against ${commit} (text checkout line endings normalized; binary bytes exact).\n${checksums.join('\n')}\nPrepared BUILDING.txt and SHA256SUMS.txt in ${directory}.\nSource review retained at ${sourceRoot}`,
);

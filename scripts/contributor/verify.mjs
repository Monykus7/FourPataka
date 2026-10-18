import { execFileSync, spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync, copyFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const ref = process.argv[2] ?? 'HEAD';
if (process.argv.length > 3 || ref.startsWith('-'))
  throw new Error('Usage: npm run contributor:verify -- [commit]');
const git = (...args) =>
  execFileSync('git', ['-c', `safe.directory=${root}`, ...args], {
    cwd: root,
    encoding: 'utf8',
  }).trim();
const commit = git('rev-parse', '--verify', `${ref}^{commit}`);
const evidence = mkdtempSync(join(tmpdir(), 'fourpataka-contributor-'));
const checkout = join(evidence, 'source');
mkdirSync(checkout);
git('archive', '--format=tar', `--output=${join(evidence, 'source.tar')}`, commit);
execFileSync('tar', ['-xf', join(evidence, 'source.tar'), '-C', checkout]);

// Export only committed source. No node_modules, Git metadata, private setup or model cache
// can make this tutorial pass by accident. Leave the export for failure inspection.
console.log(`Contributor source: ${commit}\nIsolated checkout: ${checkout}`);
const replace = (file, before, after) => {
  const path = join(checkout, file),
    source = readFileSync(path, 'utf8');
  if (!source.includes(before)) throw new Error(`Tutorial step drifted: ${file}: ${before}`);
  writeFileSync(path, source.replaceAll(before, after));
};
for (const [example, target] of [
  ['level', 'tutorialLevel'],
  ['mellowPluck', 'tutorialPluck'],
]) {
  const folder = `src/modules/examples/${target}`;
  mkdirSync(join(checkout, folder));
  copyFileSync(
    join(checkout, `src/modules/examples/${example}/index.ts`),
    join(checkout, folder, 'index.ts'),
  );
}
const level = 'src/modules/examples/tutorialLevel/index.ts';
replace(level, 'levelPedal', 'tutorialLevel');
replace(level, 'example:pedal/level', 'tutorial:pedal/level');
replace(level, "label: 'Level'", "label: 'Tutorial level'");
const pluck = 'src/modules/examples/tutorialPluck/index.ts';
replace(pluck, 'mellowPluck', 'tutorialPluck');
replace(pluck, 'example:instrument/mellow-pluck', 'tutorial:instrument/pluck');
replace(pluck, "libraryId: 'mellow-pluck'", "libraryId: 'tutorial-pluck'");
replace(pluck, "label: 'Mellow pluck'", "label: 'Tutorial pluck'");
replace(
  'src/modules/assembly.ts',
  'const definitions = [...builtIns, levelPedal];',
  'const definitions = [...builtIns, levelPedal, tutorialLevel];',
);
replace(
  'src/modules/assembly.ts',
  '[...builtInPresetDefinitions, mellowPluck]',
  '[...builtInPresetDefinitions, mellowPluck, tutorialPluck]',
);
const assembly = join(checkout, 'src/modules/assembly.ts');
writeFileSync(
  assembly,
  "import { tutorialLevel } from './examples/tutorialLevel/index';\nimport { tutorialPluck } from './examples/tutorialPluck/index';\n" +
    readFileSync(assembly, 'utf8'),
);
for (const [source, target] of [
  ['tutorial.test.ts', 'tests/unit/tutorial.test.ts'],
  ['tutorial.spec.ts', 'tests/browser/tutorial.spec.ts'],
]) {
  copyFileSync(join(root, 'scripts/contributor', source), join(checkout, target));
}
const run = (script, args = []) => {
  const result = spawnSync(process.execPath, [script, ...args], {
    cwd: checkout,
    stdio: 'inherit',
    env: process.env,
  });
  if (result.error) throw result.error;
  if (result.status !== 0)
    throw new Error(`Contributor step failed (${result.status}): ${args.join(' ')}`);
};
if (!process.env.npm_execpath) throw new Error('Run through npm run contributor:verify');
run(process.env.npm_execpath, ['ci']);
run('node_modules/vitest/vitest.mjs', [
  'run',
  'tests/unit/tutorial.test.ts',
  'tests/unit/moduleBoundaries.test.ts',
]);
run(process.env.npm_execpath, ['run', 'build']);
// A different port and no server reuse ensure this never tests the user's existing app.
writeFileSync(
  join(checkout, 'playwright.tutorial.config.ts'),
  `import base from './playwright.config';
export default { ...base, use: { ...base.use, baseURL: 'http://127.0.0.1:5187' }, webServer: { ...base.webServer, command: 'npm run dev -- --port 5187 --strictPort', url: 'http://127.0.0.1:5187', reuseExistingServer: false } };
`,
);
run('node_modules/playwright/cli.js', [
  'test',
  '--config',
  'playwright.tutorial.config.ts',
  'tests/browser/tutorial.spec.ts',
]);
writeFileSync(
  join(evidence, 'result.json'),
  JSON.stringify(
    {
      commit,
      checkedAt: new Date().toISOString(),
      node: process.version,
      platform: process.platform,
      result: 'passed',
      steps: [
        'npm ci',
        'copied pedal and preset with unique identities',
        'assembly-only registration',
        'public boundary and owned defaults',
        'production build',
        'UI discovery and analytic DSP at 44100/48000',
      ],
    },
    null,
    2,
  ),
);
console.log(`Contributor tutorial PASSED. Evidence: ${join(evidence, 'result.json')}`);

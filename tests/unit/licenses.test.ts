import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, expect, it } from 'vitest';
import { collectNotices, updateNotices } from '../../scripts/licenses.mjs';

const roots: string[] = [];
afterEach(async () => {
  await Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true })));
});
async function fixture(license = 'MIT') {
  const root = await mkdtemp(join(tmpdir(), 'fourpataka-notices-'));
  roots.push(root);
  const directory = 'node_modules/a/node_modules/b';
  await mkdir(join(root, directory), { recursive: true });
  await writeFile(join(root, 'LICENSE'), 'Project license\n');
  await writeFile(
    join(root, 'package-lock.json'),
    JSON.stringify({
      packages: {
        '': {},
        'node_modules/tool': { dev: true, license: 'unreviewed' },
        [directory]: { version: '1.0.0', license },
      },
    }),
  );
  await writeFile(
    join(root, directory, 'package.json'),
    JSON.stringify({ name: 'b', version: '1.0.0', license }),
  );
  await writeFile(
    join(root, directory, 'LICENSE'),
    'Copyright contributor\r\nPermission notice retained in full for this test.\r\n',
  );
  return { root, directory };
}
it('retains transitive notices, excludes development tools and detects stale output', async () => {
  const { root } = await fixture();
  const text = await collectNotices(root);
  expect(text).toContain('b@1.0.0 (MIT)');
  expect(text).toContain('Permission notice retained in full');
  expect(text).not.toContain('\r');
  expect(text).not.toContain('unreviewed');
  await updateNotices(root, false);
  await updateNotices(root, true);
  await writeFile(join(root, 'public/THIRD_PARTY_LICENSES.txt'), 'stale');
  await expect(updateNotices(root, true)).rejects.toThrow('stale');
});
it('requires explicit review of new license types', async () => {
  const { root } = await fixture('unknown');
  await expect(collectNotices(root)).rejects.toThrow('License review required');
});
it('rejects missing upstream texts and installed version drift', async () => {
  const { root, directory } = await fixture();
  await rm(join(root, directory, 'LICENSE'));
  await expect(collectNotices(root)).rejects.toThrow('Missing license text');
  const file = join(root, directory, 'package.json');
  const pkg = JSON.parse(await readFile(file, 'utf8'));
  await writeFile(file, JSON.stringify({ ...pkg, version: '2.0.0' }));
  await expect(collectNotices(root)).rejects.toThrow('differs from lockfile');
});

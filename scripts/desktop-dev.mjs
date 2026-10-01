import { spawn } from 'node:child_process';
import { resolve } from 'node:path';
import electron from 'electron';

const devUrl = 'http://127.0.0.1:5175';
const vite = spawn(
  process.execPath,
  [
    resolve('node_modules/vite/bin/vite.js'),
    '--host',
    '127.0.0.1',
    '--port',
    '5175',
    '--strictPort',
  ],
  { stdio: 'inherit', windowsHide: true },
);
let desktop;
let exiting = false;
const cleanup = () => {
  if (exiting) return;
  exiting = true;
  desktop?.kill();
  vite.kill();
};
process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);
process.on('exit', cleanup);
vite.on('exit', (code) => {
  if (!exiting) {
    cleanup();
    process.exitCode = code || 1;
  }
});
const started = Date.now();
while (!exiting) {
  try {
    if ((await fetch(devUrl)).ok) break;
  } catch {
    /* wait for the local dev server */
  }
  if (Date.now() - started > 30_000) {
    cleanup();
    throw new Error('FourPataka development server did not start in 30 seconds.');
  }
  await new Promise((resolve) => setTimeout(resolve, 250));
}
if (!exiting) {
  const environment = { ...process.env, FOURPATAKA_DEV_URL: devUrl };
  delete environment.ELECTRON_RUN_AS_NODE;
  desktop = spawn(electron, ['.'], { env: environment, stdio: 'inherit' });
  desktop.on('exit', (code) => {
    cleanup();
    process.exitCode = code || 0;
  });
}

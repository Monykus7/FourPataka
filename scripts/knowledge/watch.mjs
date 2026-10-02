import { watch } from 'node:fs';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildGraph } from './graph.mjs';
import { addSummaries, projectMap } from './summaries.mjs';

export function shouldRebuild(file) {
  const normalized = file.replaceAll('\\', '/');
  if (normalized === 'docs/knowledge/PROJECT_MAP.md') return false;
  return (
    /^(src|desktop|tests|scripts|docs)\/.+\.(tsx?|[cm]?js|css|md|json)$/.test(normalized) ||
    /^[^/]+\.md$/.test(normalized) ||
    /^(package(?:-lock)?\.json|tsconfig\.json|(?:vite\.config|vitest\.config|playwright(?:\.desktop)?\.config)\.ts)$/.test(
      normalized,
    )
  );
}
async function main() {
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
  let timer,
    running = false,
    dirty = false;
  async function refresh() {
    if (running) {
      dirty = true;
      return;
    }
    running = true;
    try {
      do {
        dirty = false;
        const graph = addSummaries(await buildGraph(root));
        await fs.writeFile(path.join(root, 'docs/knowledge/PROJECT_MAP.md'), projectMap(graph));
        console.log(`Knowledge map refreshed: ${graph.fingerprint.slice(0, 12)}`);
      } while (dirty);
    } catch (error) {
      console.error(error.message);
    } finally {
      running = false;
    }
  }
  await refresh();
  watch(root, { recursive: true }, (_event, filename) => {
    if (!filename || !shouldRebuild(filename)) return;
    clearTimeout(timer);
    timer = setTimeout(refresh, 500);
  });
  console.log('Watching project code, docs and plans. Ctrl+C stops the watcher.');
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url))
  void main();

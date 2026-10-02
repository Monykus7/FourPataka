import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildGraph } from './graph.mjs';
import { addSummaries, projectMap } from './summaries.mjs';
import { embedGraph, lexicalSeeds, semanticSeeds } from './semantic.mjs';
import { neighborhood, personalizedPageRank } from './rank.mjs';
import { packContext } from './context.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const [command = 'build', ...args] = process.argv.slice(2);
const option = (name, fallback) => {
  const at = args.indexOf(name);
  return at < 0 ? fallback : args[at + 1];
};
try {
  const graph = addSummaries(await buildGraph(root));
  const mapFile = path.join(root, 'docs/knowledge/PROJECT_MAP.md');
  if (command === 'build') {
    await fs.writeFile(mapFile, projectMap(graph));
    console.log(
      `Knowledge map updated: ${graph.nodes.length} nodes, ${graph.edges.length} links, ${graph.nodes.filter((n) => n.kind === 'community').length} dependency communities.`,
    );
  } else if (command === 'check') {
    const current = await fs.readFile(mapFile, 'utf8').catch(() => '');
    if (current !== projectMap(graph))
      throw new Error(
        'Knowledge map is stale. Run npm run knowledge:build and include the map with the change.',
      );
    console.log('Knowledge map matches the working files.');
  } else if (command === 'embed') {
    await embedGraph(graph, root, {
      download: args.includes('--download-model'),
      progress: (done, total) => console.error(`Embedding changed entries: ${done}/${total}`),
    });
    console.log('Local semantic embeddings are current.');
  } else if (command === 'query') {
    const task = args[0];
    if (!task || task.startsWith('--')) throw new Error('Supply a quoted task after query.');
    const mode = args.includes('--lexical') ? 'lexical' : 'semantic';
    const seeds =
      mode === 'lexical' ? lexicalSeeds(graph, task) : await semanticSeeds(graph, root, task);
    const selected = neighborhood(graph, seeds);
    const result = packContext(
      graph,
      personalizedPageRank(graph, seeds, selected),
      seeds,
      task,
      Number(option('--budget', '2048')),
      mode,
    );
    console.log(args.includes('--json') ? JSON.stringify(result, null, 2) : result.text);
    if (!args.includes('--json'))
      console.error(
        `${result.tokenCount}/${result.budget} ${result.tokenizer} tokens; ${seeds.length} seeds, ${result.selected.length} entries.`,
      );
  } else throw new Error('Use build, check, embed or query.');
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}

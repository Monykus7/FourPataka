import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildGraph } from './graph.mjs';
import { addSummaries } from './summaries.mjs';
import { semanticSeeds } from './semantic.mjs';
import { neighborhood, personalizedPageRank } from './rank.mjs';
import { packContext, tokenCount } from './context.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
// A cached model must work without even metadata requests leaving the process.
globalThis.fetch = async (url) => {
  throw new Error(`Offline verification forbids fetch: ${url}`);
};
const graph = addSummaries(await buildGraph(root));
for (const [task, feature] of [
  ['rotate the round pedal controls', 'pedals'],
  ['switch A and B while the same melody keeps playing', 'comparison'],
  ['change beats per measure from waltz to compound meter', 'timing'],
  ['place dots to reshape the source waveform', 'waveform'],
]) {
  const seeds = await semanticSeeds(graph, root, task);
  assert(
    seeds.some((s) => s.id === `feature:${feature}`),
    `Missing conceptual seed for ${task}`,
  );
  const rank = personalizedPageRank(graph, seeds, neighborhood(graph, seeds));
  for (const budget of [256, 1024, 2048]) {
    const context = packContext(graph, rank, seeds, task, budget);
    assert.equal(context.tokenCount, tokenCount(context.text));
    assert(context.tokenCount <= budget);
    assert(context.selected.includes(`feature:${feature}`), 'Feature summary missing from context');
  }
  console.log(`Offline semantic seeds and fixed budgets verified: ${feature}`);
}

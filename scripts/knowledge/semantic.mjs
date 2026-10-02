import fs from 'node:fs/promises';
import path from 'node:path';
import { hash } from './extract.mjs';
import { CACHE } from './graph.mjs';

export const MODEL = {
  id: 'Xenova/all-MiniLM-L6-v2',
  revision: '751bff37182d3f1213fa05d7196b954e230abad9',
  dtype: 'q8',
  pooling: 'mean',
  dimensions: 384,
};
const modelTag = hash(JSON.stringify({ ...MODEL, textVersion: 1 }));
const pipes = new Map();
export const semanticText = (node) =>
  `${node.name.replace(/([a-z])([A-Z])/g, '$1 $2')}\n${node.summary ?? ''}\n${node.signature ?? ''}\n${node.text?.slice(0, 600) ?? ''}`.slice(
    0,
    2500,
  );
export function cosine(a, b) {
  if (a.length !== b.length) throw new Error('Embedding dimensions differ.');
  let dot = 0,
    left = 0,
    right = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    left += a[i] ** 2;
    right += b[i] ** 2;
  }
  return left && right ? dot / Math.sqrt(left * right) : 0;
}
async function extractor(root, download) {
  const key = `${root}:${download}`;
  if (!pipes.has(key))
    pipes.set(
      key,
      (async () => {
        const { pipeline } = await import('@huggingface/transformers');
        return pipeline('feature-extraction', MODEL.id, {
          revision: MODEL.revision,
          dtype: MODEL.dtype,
          device: 'cpu',
          cache_dir: path.join(root, CACHE, 'models'),
          local_files_only: !download,
        });
      })(),
    );
  try {
    return await pipes.get(key);
  } catch (error) {
    pipes.delete(key);
    throw new Error(
      `Local semantic model unavailable. Run npm run knowledge:embed -- --download-model, or explicitly choose --lexical. ${error.message}`,
    );
  }
}
export async function embedGraph(graph, root, { download = false, progress = () => {} } = {}) {
  const file = path.join(root, CACHE, 'embeddings.json');
  let cached;
  try {
    cached = JSON.parse(await fs.readFile(file, 'utf8'));
  } catch {
    /* first embedding build */
  }
  const vectors = cached?.modelTag === modelTag ? cached.vectors : {};
  const texts = new Map(graph.nodes.map((node) => [hash(semanticText(node)), semanticText(node)]));
  const missing = [...texts].filter(([digest]) => !vectors[digest]);
  const run = await extractor(root, download);
  for (let i = 0; i < missing.length; i += 12) {
    const batch = missing.slice(i, i + 12);
    const tensor = await run(
      batch.map(([, text]) => text),
      { pooling: MODEL.pooling, normalize: true },
    );
    const rows = tensor.tolist();
    for (let j = 0; j < batch.length; j++) {
      if (rows[j].length !== MODEL.dimensions || rows[j].some((n) => !Number.isFinite(n)))
        throw new Error('Invalid semantic vector.');
      vectors[batch[j][0]] = rows[j];
    }
    progress(Math.min(i + 12, missing.length), missing.length);
  }
  const current = Object.fromEntries([...texts.keys()].map((key) => [key, vectors[key]]));
  await fs.writeFile(file, JSON.stringify({ modelTag, model: MODEL, vectors: current }));
  return new Map(graph.nodes.map((node) => [node.id, current[hash(semanticText(node))]]));
}
export async function semanticSeeds(graph, root, task, count = 8) {
  const vectors = await embedGraph(graph, root);
  const run = await extractor(root, false);
  const query = (await run(task, { pooling: MODEL.pooling, normalize: true })).tolist()[0];
  const ranked = graph.nodes
    .map((node) => ({ id: node.id, score: Math.max(0, cosine(query, vectors.get(node.id))) }))
    .sort((a, b) => b.score - a.score || a.id.localeCompare(b.id));
  // Reserve conceptual seeds as well as concrete sources; otherwise short code
  // fragments can crowd out the feature summaries needed for project-level tasks.
  const byId = new Map(graph.nodes.map((n) => [n.id, n]));
  const conceptual = ranked
    .filter((s) => byId.get(s.id).kind === 'feature' && byId.get(s.id).parent)
    .slice(0, Math.min(2, count));
  const chosen = new Set(conceptual.map((s) => s.id));
  return [
    ...conceptual,
    ...ranked.filter((s) => !chosen.has(s.id)).slice(0, count - conceptual.length),
  ];
}
const words = (text) =>
  text
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .toLowerCase()
    .match(/[a-z][a-z0-9_]+/g) ?? [];
export function lexicalSeeds(graph, task, count = 8) {
  const query = new Set(words(task));
  const corpus = graph.nodes.map((node) => ({
    id: node.id,
    words: new Set(words(semanticText(node))),
  }));
  const frequency = new Map();
  for (const document of corpus)
    for (const word of document.words) frequency.set(word, (frequency.get(word) ?? 0) + 1);
  return corpus
    .map((document) => ({
      id: document.id,
      score:
        [...query]
          .filter((word) => document.words.has(word))
          .reduce((sum, word) => sum + Math.log(1 + corpus.length / frequency.get(word)), 0) /
        Math.sqrt(document.words.size || 1),
    }))
    .filter((seed) => seed.score > 0)
    .sort((a, b) => b.score - a.score || a.id.localeCompare(b.id))
    .slice(0, count);
}

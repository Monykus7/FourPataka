import { getEncoding } from 'js-tiktoken';

export const TOKENIZER = 'cl100k_base';
const tokenizer = getEncoding(TOKENIZER);
export const tokenCount = (text) => tokenizer.encode(text, [], []).length;
export function packContext(graph, rank, seeds, task, budget = 2048, mode = 'semantic') {
  if (!Number.isInteger(budget) || budget < 32 || budget > 50000)
    throw new Error('Budget must be an integer between 32 and 50000 tokens.');
  let text = `# FourPataka context\nTask: ${task}\nRetrieval: ${mode}; tokenizer: ${TOKENIZER}. Read cited source before editing.\n`;
  if (tokenCount(text) > budget)
    throw new Error('Task and context header exceed the token budget.');
  const seedIds = new Set(seeds.map((s) => s.id));
  const candidates = graph.nodes
    .filter((node) => rank.has(node.id))
    .sort((a, b) => {
      const concept = (node) => (node.kind === 'feature' && seedIds.has(node.id) ? 1 : 0);
      if (concept(a) !== concept(b)) return concept(b) - concept(a);
      const boost = (node) => (seedIds.has(node.id) ? 1.3 : 1);
      return rank.get(b.id) * boost(b) - rank.get(a.id) * boost(a) || a.id.localeCompare(b.id);
    });
  const selected = [];
  const used = new Set();
  for (const node of candidates) {
    if (node.kind === 'community' && selected.includes(node.parent)) continue;
    const evidence = node.evidence?.slice(0, 6).join(', ');
    const citation = `${node.path}:${node.line ?? 1}${node.endLine ? `–${node.endLine}` : ''}`;
    const identity = `${node.path}:${node.line ?? 1}:${node.name}`;
    if (used.has(identity)) continue;
    const heading = `\n## ${node.kind}: ${node.name}\nSource: ${citation}\n`;
    const body =
      node.kind === 'symbol'
        ? `${node.signature}\n${node.summary ?? ''}`
        : `${node.summary ?? ''}${evidence ? `\nEvidence: ${evidence}` : ''}`;
    // Count the complete candidate output: BPE boundaries can change across joins.
    const variants = [body, body.slice(0, 400), node.signature ?? body.slice(0, 120)];
    const fit = variants.find((variant) => tokenCount(text + heading + variant + '\n') <= budget);
    if (fit === undefined) continue;
    text += heading + fit + '\n';
    selected.push(node.id);
    used.add(identity);
  }
  return {
    text,
    tokenCount: tokenCount(text),
    budget,
    tokenizer: TOKENIZER,
    mode,
    selected,
    seeds,
  };
}

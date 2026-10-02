import { codeFile } from './extract.mjs';

export function addSummaries(graph) {
  const nodes = [...graph.nodes];
  const edges = [...graph.edges];
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const dependencies = new Map();
  for (const edge of edges.filter((e) => e.kind === 'imports')) {
    for (const [a, b] of [
      [edge.from, edge.to],
      [edge.to, edge.from],
    ]) {
      if (!dependencies.has(a)) dependencies.set(a, new Set());
      dependencies.get(a).add(b);
    }
  }
  for (const feature of graph.features) {
    const parent = byId.get(`feature:${feature.id}`);
    const children = graph.features.filter((f) => f.parent === feature.id);
    const members = parent.members.map((id) => byId.get(id));
    const paths = [...new Set(members.map((n) => n.path))].sort();
    const summary = `${feature.summary}${children.length ? ` Subfeatures: ${children.map((f) => `${f.title}: ${f.summary}`).join(' ')}` : ''}`;
    const enriched = { ...parent, summary, conciseSummary: feature.summary, evidence: paths };
    nodes[nodes.findIndex((n) => n.id === parent.id)] = enriched;
    const remaining = new Set(
      members.filter((n) => n.kind === 'file' && codeFile(n.path)).map((n) => n.id),
    );
    let index = 0;
    while (remaining.size) {
      const seed = [...remaining].sort()[0];
      const queue = [seed],
        community = [];
      remaining.delete(seed);
      for (let i = 0; i < queue.length; i++) {
        community.push(byId.get(queue[i]));
        for (const neighbor of dependencies.get(queue[i]) ?? []) {
          if (remaining.delete(neighbor)) queue.push(neighbor);
        }
      }
      const symbols = members.filter(
        (n) => n.kind === 'symbol' && community.some((file) => file.path === n.path),
      );
      const id = `community:${feature.id}:${++index}`;
      nodes.push({
        id,
        kind: 'community',
        parent: parent.id,
        name: `${feature.title} / dependency group ${index}`,
        path: 'docs/knowledge/features.json',
        line: 1,
        summary: `${feature.summary} Connected sources: ${community.map((n) => n.path).join(', ')}. Definitions: ${symbols
          .slice(0, 10)
          .map((n) => n.name)
          .join(', ')}.`,
        evidence: community.map((n) => n.path),
        members: [...community, ...symbols].map((n) => n.id),
      });
      edges.push({ from: parent.id, to: id, kind: 'community', weight: 2 });
      for (const member of [...community, ...symbols])
        edges.push({
          from: id,
          to: member.id,
          kind: 'summarizes',
          weight: member.kind === 'file' ? 2 : 1,
        });
    }
  }
  return { ...graph, nodes, edges };
}

export function projectMap(graph) {
  const lines = [
    '# FourPataka project map',
    '',
    'Generated with `npm run knowledge:build`. Edit features.json and DECISIONS.md for behavioral summaries; source locations below are derived from the working files.',
    '',
    `Source fingerprint: \`${graph.fingerprint}\`.`,
    '',
    '## Retrieval path',
    '',
    'Task → local semantic seeds → graph neighborhood → personalized PageRank → fixed token budget → cited context.',
    '',
  ];
  const render = (feature, depth) => {
    const node = graph.nodes.find((n) => n.id === `feature:${feature.id}`);
    lines.push(`${'#'.repeat(Math.min(6, depth + 2))} ${feature.title}`, '', feature.summary, '');
    for (const community of graph.nodes.filter(
      (n) => n.kind === 'community' && n.parent === node.id,
    )) {
      lines.push(
        `- ${community.name}: ${community.evidence.map((file) => `[${file}](../../${file})`).join(', ')}`,
      );
    }
    if (node.evidence.length) {
      const symbols = graph.nodes
        .filter((n) => n.kind === 'symbol' && node.members.includes(n.id))
        .slice(0, 8);
      if (symbols.length)
        lines.push(
          '',
          `Key definitions: ${symbols.map((n) => `[${n.name}](../../${n.path}#L${n.line})`).join(', ')}.`,
          '',
        );
    }
    for (const child of graph.features.filter((f) => f.parent === feature.id))
      render(child, depth + 1);
  };
  for (const root of graph.features.filter((f) => !f.parent)) render(root, 0);
  lines.push(
    '',
    '## Parser coverage',
    '',
    graph.parseErrors.length
      ? `Tree-sitter reports partial syntax recovery in ${graph.parseErrors.map((f) => `\`${f}\``).join(', ')}. These files remain indexed; inspect exact source before changing recovered regions. TypeScript compilation is a separate correctness check.`
      : 'All indexed code parsed without syntax recovery.',
    '',
    '## Maintenance',
    '',
    'Update feature summaries and decisions with behavior changes. Regenerate this map, check freshness, and query the graph for a concrete task before starting the next change.',
    '',
  );
  return lines.join('\n');
}

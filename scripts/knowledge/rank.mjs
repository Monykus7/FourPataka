export function adjacency(graph) {
  const map = new Map(graph.nodes.map((n) => [n.id, new Map()]));
  for (const edge of graph.edges) {
    if (!map.has(edge.from) || !map.has(edge.to)) continue;
    // Reverse edges let an implementation lead back to its callers and feature summary,
    // but keep definition/import directions stronger than broad parent hubs.
    for (const [from, to, weight] of [
      [edge.from, edge.to, edge.weight],
      [edge.to, edge.from, edge.weight * 0.35],
    ])
      map.get(from).set(to, (map.get(from).get(to) ?? 0) + weight);
  }
  return map;
}
export function neighborhood(graph, seeds, { hops = 2, limit = 240 } = {}) {
  const links = adjacency(graph);
  const selected = new Set(seeds.filter((s) => links.has(s.id)).map((s) => s.id));
  let frontier = [...selected];
  for (let depth = 0; depth < hops && selected.size < limit; depth++) {
    const candidates = new Map();
    for (const id of frontier)
      for (const [neighbor, weight] of links.get(id))
        if (!selected.has(neighbor))
          candidates.set(neighbor, (candidates.get(neighbor) ?? 0) + weight);
    frontier = [...candidates]
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .slice(0, limit - selected.size)
      .map(([id]) => id);
    for (const id of frontier) selected.add(id);
  }
  return selected;
}
export function personalizedPageRank(
  graph,
  seeds,
  selected = new Set(graph.nodes.map((n) => n.id)),
) {
  const ids = [...selected];
  if (!ids.length) return new Map();
  const links = adjacency(graph);
  const seedWeights = new Map(
    seeds.filter((s) => selected.has(s.id)).map((s) => [s.id, Math.max(0, s.score)]),
  );
  const total = [...seedWeights.values()].reduce((sum, n) => sum + n, 0);
  const teleport = new Map(
    ids.map((id) => [id, total ? (seedWeights.get(id) ?? 0) / total : 1 / ids.length]),
  );
  const outgoing = new Map(
    ids.map((id) => [id, [...(links.get(id) ?? [])].filter(([to]) => selected.has(to))]),
  );
  let rank = new Map(teleport);
  for (let iteration = 0; iteration < 100; iteration++) {
    const next = new Map(ids.map((id) => [id, 0.15 * teleport.get(id)]));
    let dangling = 0;
    for (const id of ids) {
      const targets = outgoing.get(id);
      const weight = targets.reduce((sum, [, value]) => sum + value, 0);
      if (!weight) dangling += rank.get(id);
      else
        for (const [to, value] of targets)
          next.set(to, next.get(to) + (0.85 * rank.get(id) * value) / weight);
    }
    for (const id of ids) next.set(id, next.get(id) + 0.85 * dangling * teleport.get(id));
    const delta = ids.reduce((sum, id) => sum + Math.abs(next.get(id) - rank.get(id)), 0);
    rank = next;
    if (delta < 1e-10) break;
  }
  return rank;
}

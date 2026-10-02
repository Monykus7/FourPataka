# Maintaining and querying project knowledge

Run from the FourPataka folder after `npm ci`.

```sh
npm run knowledge:build
npm run knowledge:check
npm run knowledge:embed -- --download-model
npm run knowledge:query -- "keep a melody playing while switching A and B" --budget 2048
npm run knowledge:verify
```

`knowledge:build` refreshes the content-hashed graph and the tracked [project map](PROJECT_MAP.md). `knowledge:check` fails if that map differs from the working source. `knowledge:embed -- --download-model` downloads a pinned public MiniLM model and runs embeddings locally; subsequent queries and embedding updates use its local directory without network requests. `knowledge:verify` rejects every fetch and exercises four semantic tasks across three complete-context budgets.

For installations without model files, explicitly choose lexical seed selection:

```sh
npm run knowledge:query -- "time signature parser" --lexical --budget 1024
```

`--json` returns seeds, selected node IDs, tokenizer, budget, token count and the complete `text` context. The budget covers `text`, including its header, task, signatures and source citations. JSON metadata and CLI diagnostic messages are outside that context. The default budget is 2,048 `cl100k_base` tokens; a consumer with another tokenizer must account for its own vocabulary.

```sh
npm run knowledge:watch
```

The optional watcher refreshes the graph/map after edits to code, docs, plans or configuration. It excludes its own generated map, caches, Git files and dependencies to avoid refresh loops. It does not infer new behavioral decisions or rewrite editorial summaries. Stop it with Ctrl+C.

## With each feature change

1. Query the task and read the cited source; ranking helps navigation and does not establish correctness.
2. Update [features.json](features.json) for behavioral changes or a new feature/community. Parent IDs form an acyclic hierarchy; path membership can overlap where code spans concepts.
3. Update [DECISIONS.md](DECISIONS.md) when an invariant or tradeoff changes. Use `<!-- features: timing, notation -->` after the heading to link that section directly to features.
4. Comment dense implementation areas where the reasoning is otherwise hidden: phase, latency, source authority, snapshot ownership, bounds and gesture history. Explain why, including units; avoid narrating obvious statements.
5. Update BUILD_PLAN.md / IMPLEMENTATION_STATUS.md when roadmap gates change. Keep planned behavior distinct from implemented behavior.
6. Run build and freshness check, and include the generated map with the implementation commit. Semantic vectors refresh only for changed retrieval text at the next query/embedding run.

The hierarchy is editorial at project/domain/feature level; dependency subcommunities are connected components of the syntax-derived import graph within each feature. Summaries combine maintained behavior with generated file/symbol evidence. They are not automatically generated LLM prose or Leiden communities. Semantic seeds reserve both feature concepts and concrete sources before graph expansion and personalized PageRank.

`.knowledge-cache/` stores parser records, graph data, model files and vectors, and is ignored by Git. Parser/config versions and content hashes invalidate stale data; deleted files disappear on refresh. The index excludes dependencies, releases, model caches and generated output. Syntax recovery warnings appear in the map; Tree-sitter does not replace TypeScript validation or resolve dynamic JavaScript precisely.

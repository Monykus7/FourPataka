# FourPataka working conventions

## Project knowledge

- At task start, read `docs/knowledge/PROJECT_MAP.md` and query the task with `npm run knowledge:query -- "task" --budget 2048`. Read the cited source before editing. Explicitly use `--lexical` when the local model is unavailable; do not present lexical results as semantic search.
- Maintain `docs/knowledge/features.json` and `docs/knowledge/DECISIONS.md` with behavioral changes. Keep source authority, independent copies, phase/clock continuity, latency, units and remaining roadmap gates accurate.
- Update `BUILD_PLAN.md` and `IMPLEMENTATION_STATUS.md` when a feature or gate changes. Distinguish implemented behavior from planned work and historical verification.
- Before completing work, run `npm run knowledge:build` and `npm run knowledge:check`; include the regenerated map in the relevant commit. The optional `knowledge:watch` command updates derived documentation during edits.
- When modifying knowledge extraction/retrieval, run its unit checks and `npm run knowledge:verify` if model files are installed. The verifier disables network fetches and checks semantic seeds and whole-context budgets. Model setup is `npm run knowledge:embed -- --download-model`.
- Keep private graph/vector/model caches out of Git. Local embeddings must not upload repository text. Source citations and parser-recovery warnings remain visible; graph ranking is navigation, not proof of code correctness.

## Comments and validation

- Explain the reasoning in dense code where it is otherwise hidden: phase rotation, look-ahead alignment, snapshot ownership, interpolation, source spans, timing units and grouped history.
- Prefer short comments explaining why or an invariant. Update comments with behavior changes; avoid narrating obvious code.
- Run checks appropriate to the change. For app releases, verify the browser/native workflows and portable package. Preserve unrelated working edits and report actual validation limits.

## Version control and releases

- Aim for eight focused commits per implementation milestone, pushing useful checkpoints often to the configured primary remote/branch using the configured user identity.
- Keep unrelated changes out of those commits.
- After completing an x.x.0 application release, open the verified portable application. Documentation/tooling work alone does not require an application version bump.

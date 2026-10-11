# Contributing to FourPataka

FourPataka is preparing for community contributions through a [six-milestone modularity program](BUILD_PLAN.md#14-modularity-and-open-source-contributions). The application works today; the general category registries and public SDK described in [extension architecture](docs/extensions/ARCHITECTURE.md) remain planned. Chord API1 and the tested score-view source services are implemented; their guides identify the supported boundaries. Until those milestones ship, contributions are reviewed source changes using the existing integration points.

## Start from a working checkout

Use Node.js 22.12+ and npm; this project has been developed with Node 24. From the repository folder:

```sh
npm ci
npm run dev
```

Open the local URL printed by Vite. For the desktop development workflow, run `npm run desktop:dev`. Visual Studio is not required. See [README.md](README.md) for Chrome test setup, native execution limits and portable Windows packaging.

Read [knowledge usage](docs/knowledge/USAGE.md), [BUILD_PLAN.md](BUILD_PLAN.md), [IMPLEMENTATION_STATUS.md](IMPLEMENTATION_STATUS.md) and the relevant source before editing. The [project map](docs/knowledge/PROJECT_MAP.md) provides navigation; `npm run knowledge:query -- "your task" --budget 2048` retrieves local context. Use its explicitly labeled `--lexical` mode if a local embedding model is unavailable. Model setup is optional and should never upload repository text.

Start with the illustrated [module creation walkthrough](docs/extensions/MODULE_CREATION.md). It includes a bundled chord example, validation/ownership diagrams, real import paths and the distinction between working services and planned registries. The [score-view guide](docs/extensions/SCORE_VIEWS.md) covers the implemented single-file editor boundary.

## Choose the right contribution

- A new pedal: follow [pedal integration](docs/extensions/PEDALS.md). Current source changes span metadata, DSP, equipment and export; milestone M2 will replace those scattered integrations with one module registration.
- A new timbre in the current Fourier engine: follow [instrument presets](docs/extensions/INSTRUMENTS.md). A preset is data, not a new synthesis engine; preset modules arrive in M3 and engine modules in M4.
- An experiment, analysis panel, editor command or theme: follow [feature modules](docs/extensions/FEATURE_MODULES.md). Adding command documentation does not change the score grammar; parser changes require source-span and playback proofs.
- Saved-data or API changes: follow [compatibility](docs/extensions/COMPATIBILITY.md). Preserve existing projects and independent applied copies before introducing a new format.

The host owns musical state, score authority, clocks, routing, history and file operations. Contributors must document units and lifecycle behavior rather than introduce a second implementation of those services. Keep changes focused and explain reasoning in dense interpolation, phase, timing, ownership and source-span code.

## Verify and document the change

Use focused checks appropriate to what changed. These are existing commands, not a future SDK tool:

```sh
npm test
npm run build
npm run format:check
npx playwright test tests/browser/your-feature.spec.ts
```

Browser workflows need an installed supported browser; the checked-in configuration uses Chrome. Native workflows use `playwright.desktop.config.ts` and require a runnable Electron environment. Application releases also need the verified Windows portable package and affected native flows. Document skipped device/listening/screen-reader checks explicitly instead of treating automated tests as proof of them. Do not open a debugger to work around a restricted Electron process launch.

Update feature/behavior documentation in the same change: the extension recipe and module reference, `docs/knowledge/features.json`, `docs/knowledge/DECISIONS.md`, and roadmap/status when a gate changes. Run `npm run knowledge:build` and `npm run knowledge:check`, and commit the regenerated map. Keep graph/vector/model caches, local projects, test artifacts and release binaries out of Git. Inspect the staged diff before committing.

Make focused commits and push useful checkpoints to the configured primary branch/remote using your configured identity. The project currently aims for eight focused commits per implementation milestone; do not manufacture empty checkpoints. A contribution description should say what behavior changes, which module/API/data versions it affects, how old projects behave, and which checks actually passed. Include a small reproducible example when adding a feature.

## Documentation and example acceptance

Each supported module category must ship a clean-checkout tutorial, a small runnable module example, parameter/units and lifecycle reference, troubleshooting, migration guidance and contract tests. The chord examples use implemented API1 paths and the workspace guide describes tested source helpers. Other category recipes identify current host edits and planned contracts; proposed M1-M5 imports are not implemented public APIs. When a milestone lands, replace the planned recipe with its actual buildable commands and supported version, and verify the example in CI.

## Open-source readiness

An open-source license has not yet been added to this repository. Owner selection of a license, dependency/asset attribution, contributor licensing guidance, review expectations, conduct/security reporting guidance and CI/release responsibility are explicit milestones, not claims made by this guide. Resolve the licensing policy before inviting licensed third-party code or publishing an open-source release. This planning change does not select a license, publish a package, change repository visibility or install external modules.

The synthesis/notation pilot delivers the first narrow [chord-shape contribution API](docs/extensions/CHORD_SHAPES.md), including a bundled open-fifth example and shared parser/registry tests. This is available now; the general M1–M6 category APIs described above remain planned.

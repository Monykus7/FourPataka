# Contributing to FourPataka

FourPataka is licensed under [GPL-3.0-only](LICENSE). By submitting code, documentation or assets, you confirm you have the right to contribute them under that license, retaining compatible third-party notices. No copyright assignment or separate CLA is required. Identify borrowed material and its upstream license in your pull request; maintainers review compatibility before merging. Do not submit proprietary samples, project recordings or unlicensed fonts/images.

## Start from a working checkout

Use Node.js 22.12 or newer; Node 24 is the CI target. Run `npm ci`, then `npm run dev`. For Electron run `npm run desktop:dev`; Visual Studio is not required. Source integration uses reviewed TypeScript bundled at build time. There is no runtime plugin installer or executable module attachment in song files.

Start with [the task guide](docs/knowledge/TASK_GUIDE.md) and the relevant source. Unknown cross-feature tasks can use `npm run knowledge:query -- "your task" --budget 1024` (explicit `--lexical` if the optional local model is absent). Do not upload repository text for embeddings. Private caches and local agent/editor files stay untracked.

## Choose an implemented extension boundary

- Numeric metadata: [M1 contract](docs/extensions/MODULE_FOUNDATION.md), public `src/modules/index.ts` and explicit `src/modules/assembly.ts` registration.
- Pedals: [M2 playable DSP](docs/extensions/PEDAL_MODULES.md), with Level as a complete example. The host discovers controls, routing and live/WAV factories from registration.
- Fourier presets: [M3 data factories](docs/extensions/FOURIER_PRESETS.md), with Mellow pluck. Sounds are baked owned data; a new synthesis algorithm belongs to M4.
- Synthesis engines: [M4 lifecycle and application integration](docs/extensions/ENGINE_FOUNDATION.md), with Basic Tone, numeric controls, saved recovery and continuous comparison.
- Declarative panels/experiments/command cards: [M5 features](docs/extensions/FEATURE_MODULES.md), with Partial pair. Host actions are revision-guarded; cards document existing grammar rather than installing parser rules.
- Chord shapes: [the chord API1 guide](docs/extensions/CHORD_SHAPES.md), with open-fifth. [Virtual score files](docs/extensions/SCORE_FILES.md) document existing shared-source services, not an arbitrary editor plugin API.

Each guide provides real imports, registration, ownership diagrams and proof requirements. Import public contracts instead of private core/audio/React/native files. Built-ins use the same boundaries. Runtime loading, arbitrary UI adapters, grammar plugins and general theme/file adapters remain future proposals.

## Verify and document

Run focused tests while developing; before review run:

```sh
npm run licenses:check
npm run distribution:check
npm test
npm run build
npm run format:check
npm run knowledge:build
npm run knowledge:check
```

When dependencies change, regenerate `npm run licenses:build`, inspect the complete copyright/license diff and commit generated public notices. Missing or new license types require review; the checker is a drift guard, not a substitute for that review.

Browser tests use Chrome locally. Install it with `npx playwright install chrome`, or install Playwright Chromium with `npx playwright install chromium` and set `PLAYWRIGHT_BUNDLED_CHROMIUM=1`. Run the relevant `tests/browser/*.spec.ts`. CI explicitly selects bundled Chromium; it does not assume Chrome is installed on a clean runner.

On Windows, `npm run desktop:package` produces an unsigned portable plus `release/win-unpacked`. Run `npm run distribution:check -- release/win-unpacked`, then set `FOURPATAKA_TEST_EXECUTABLE` to that unpacked executable and run relevant tests with `npx playwright test --config playwright.desktop.config.ts`. Tests use isolated profiles; never use personal project data as fixtures. [Maintainer instructions](docs/MAINTAINING.md) detail clean-checkout CI and release gates.

Explain reasoning in dense timing, interpolation, phase, lifecycle, source-span and ownership code. Preserve canonical scoreText, independent library/track/A-B copies, clock continuity, Stop, units, latency and unavailable-data recovery. Add meaningful compatibility, live/WAV and source-authority proofs when those behaviors change. Record actual device/listening/screen-reader limits rather than claiming automated coverage.

Update the relevant tutorial, concise feature summaries and decisions; keep chronology in IMPLEMENTATION_STATUS.md. Regenerate the knowledge map. See [review template](.github/pull_request_template.md), [conduct](CODE_OF_CONDUCT.md) and [security reporting](SECURITY.md). Monykus7 owns merge, compatibility and release decisions; contributor CI does not publish packages or change repository visibility.

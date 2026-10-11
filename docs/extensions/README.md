# Contributor extension guides

The goal is an open-source FourPataka that people can extend with pedals, instruments and other features through documented module contracts. This is a major program of separately releasable milestones, not a single rewrite.

Status on 2026-10-05: plans/guides added; M1–M6 are all not started. The synthesis/notation pilot implements a narrow chord-shape API-v1 registry and bundled example ahead of general M1. General category registries, SDK, missing-module preservation and contributor CI remain future deliverables. Source contributions can use the existing integration recipes today; the proposed directories/interfaces are not available imports.

## Start here

Read [CONTRIBUTING.md](../../CONTRIBUTING.md) for the current setup, source contribution and verification workflow. The [authoritative milestone plan](../../BUILD_PLAN.md#14-modularity-and-open-source-contributions) defines dependencies and acceptance gates; [implementation status](../../IMPLEMENTATION_STATUS.md) distinguishes plans from delivered behavior.

- [Chord shapes](CHORD_SHAPES.md): implemented API-v1 registry, root-position symbols and runnable source example.
- [Architecture](ARCHITECTURE.md): current integration seams, proposed host/module boundaries, public contracts and bundled-source strategy.
- [Pedals](PEDALS.md): current source recipe, planned M2 module recipe, parameters, live/offline DSP, latency, tails and proof requirements.
- [Instruments](INSTRUMENTS.md): current Fourier preset recipe, planned M3 presets and separate M4 engine/capability contract.
- [Feature modules](FEATURE_MODULES.md): planned M5 panels, experiments, command metadata and host workflow services.
- [Compatibility](COMPATIBILITY.md): IDs/API/data/schema versions, migration, unavailable-module preservation, copy ownership and clock/resource lifecycle.

## Separately releasable milestones

1. **M1 — Contracts and compatibility foundation.** Typed definitions, validated assembly/registry, public import boundary, one built-in metadata slice and legacy fixtures. Next major implementation milestone.
2. **M2 — Pedal modules.** All four built-ins use contributor contracts; one independent utility example works through a folder and registration, with tutorial and live/WAV/native proofs.
3. **M3 — Fourier preset modules.** Registry-backed timbres with an independent example, documented units/schema and preserved applied copies. New synthesis engines are separate.
4. **M4 — Synthesis engines.** Host-scheduled voice lifecycle/capabilities, Fourier adaptation and a minimal independent engine with migration and live/offline proofs.
5. **M5 — Feature modules.** Optional views/experiments/command metadata through narrow host services, one migrated view and a tested feature example.
6. **M6 — Open-source readiness.** Owner-approved license/attribution, contributor/maintainer policies, supported APIs/examples and repeatable browser/native/package CI.

Default start is M1 → M2 → M3. Those milestones enable useful documented contributions without waiting for M4/M5; the first M6 contributor release can cover only the APIs that have passed their own gates. Resolve license selection early, before accepting third-party code or publishing an open-source release. Later music features use landed module boundaries. The existing stage 5 manual/device gates are still open; none is closed by planning.

## What will count as supported

For each delivered category, a contributor should be able to follow a clean-checkout tutorial, build a real example, register it once, run shared contract/migration/workflow checks, and understand the supported API/data versions and limitations. Built-ins must exercise the same interfaces. Tutorials, examples and public references are maintained in the same change as the contract, and examples run in CI.

The host remains responsible for score authority, independent copies, undo, clocks, voice scheduling, cable routing, latency alignment, hard Stop, export snapshots/budgets and native file privileges. Preset/extension data never installs executable code. Runtime plugin loading and a marketplace are separate future proposals.

Until a milestone ships, use its current-source recipe and label its public-contract guidance as planned. When it ships, replace proposed names with real imports/commands, record validation in IMPLEMENTATION_STATUS.md, and refresh the [project knowledge map](../knowledge/PROJECT_MAP.md).

## Illustrated contributor walkthroughs

- [Named sections](NAMED_SECTIONS.md): definition-only passages, calls, exact tail cuts/endings, source provenance, rename and shared audio diagrams (v0.27.0).

- [Instrument library](INSTRUMENT_LIBRARY.md): folder creation, drag/keyboard placement, legacy project migration, copy/history boundaries and source/data-flow diagrams.

- [Percussion presets](PERCUSSION_PRESETS.md): three current Fourier factories, conservative bundled additions on project load, shared short-hit comparison material, units/headroom and live/WAV ownership diagrams.

- [Module creation](MODULE_CREATION.md): tested chord-shape example, assembly and consumption, owned settings/runtime lifecycle, audio routing and compatibility diagrams.
- [Score workspace](SCORE_VIEWS.md): canonical source/track projections, guarded edit transactions, CRLF-aware spans, ownership operations and recovery diagrams. Shared-file track views ship in v0.24.0; the general M5 registration/capability API stays planned.

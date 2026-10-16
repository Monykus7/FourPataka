# Modular FourPataka architecture

Status: M1 numeric metadata, M2 playable pedals, M3 Fourier preset factories, M4 selectable/saved engines and M5 declarative features are implemented. Public contracts live in src/modules/index.ts; src/modules/assembly.ts explicitly registers reviewed definitions for host discovery. See [current contribution routes](../../CONTRIBUTING.md) and [M6 readiness/release gates](../MAINTAINING.md). The chord-shape pilot is a separate supported source boundary. The design sections below retain the original architecture proposal as historical rationale; category tutorials are authoritative for actual names and implemented limits.

## Intended contributor experience

A contributor should add a module directory, implement a documented contract, provide tests and examples, and register it in one explicit build assembly. Equipment discovery, controls, validation, owned copies, project files and live/WAV rendering should consume that registration without another pedal-kind switch or edits across unrelated views. Built-in modules must use exactly the same contracts as contributed modules.

Start with reviewed TypeScript modules bundled from source. An installed-package loader, marketplace, automatic downloads and executable project attachments are separate future proposals. A project file contains data and module requirements, never executable code. Bundled modules run within the application; they are not individually isolated from each other. The existing Electron renderer sandbox is not a sandbox for arbitrary extensions.

## Current implementation routes

- Public src/modules/index.ts exports contracts; src/modules/assembly.ts supplies pedalModules, instrumentModules, engineModules and featureModules.
- [Pedal tutorial](PEDAL_MODULES.md): factories, controls, saved recovery, latency/tails and live/WAV dispatch through registered metadata.
- [Preset tutorial](FOURIER_PRESETS.md): data factories, explicit discovery and baked independent sounds.
- [Engine tutorial](ENGINE_FOUNDATION.md): voice lifecycle, selectable settings, schema4 recovery and clock-preserving comparison.
- [Feature tutorial](FEATURE_MODULES.md): immutable snapshots, validated declarative views and revision-guarded actions with schema5 recovery.
- [Score files](SCORE_FILES.md): one canonical source and host transactions, not a general editor plugin API.

The host owns transport, project history, native dialogs, output routing and independent copies. Original proposed integration switches below are historical, not instructions to add new switches.

## Proposed boundaries

```mermaid
flowchart TD
  Assembly[Explicit bundled module assembly] --> Registry[Validated module registries]
  Registry --> Definitions[Pure definitions and versioned data validation]
  Registry --> Factories[Audio factories and lifecycle contracts]
  Registry --> Views[Controls, equipment and optional feature panels]
  Definitions --> State[Host project state, copies, history and migrations]
  State --> Session[Host clock, scheduling, routing and resource budgets]
  Factories --> Session
  Session --> Live[Live playback and comparison]
  Session --> Offline[Offline WAV rendering]
  Views --> Actions[Host-owned edit and focus actions]
  Actions --> State
```

Proposed organization, with names subject to the first contract review:

- `src/modules/contracts/`: typed definitions, parameter descriptors, audio lifecycle and module-data envelopes; no React or Electron dependency in data/audio contracts.
- `src/modules/registry.ts`: explicit, validated assembly with duplicate-ID/version failures and deterministic ordering.
- `src/modules/builtins/pedals/<id>/`: definition, DSP factory, focused tests and optional custom inspector.
- `src/modules/builtins/instruments/<id>/`: Fourier preset definitions first; new engine implementations only after milestone M4 (voice contracts).
- `src/modules/features/<id>/`: optional panels, experiments or commands through host actions; no alternate authority over score text.
- `src/audio/`, `src/core/` and desktop bridges: host services for timing, persistence, routing, export and trusted native operations.
- `examples/modules/`: small compiled contributor examples that exercise the real contracts. Example-only equipment is not automatically part of the default application.

Directory moves alone do not satisfy modularity. Avoid a circular dependency in which the registry imports host state while the host imports the registry. Pure definitions are the shared lower layer; factories and React adapters are separate consumers. Enforce these import boundaries with checks when implemented.

## Required contracts

Every definition needs a stable namespaced module/type ID, a module API version, an independent saved-data version, display metadata, defaults, pure validation/migration, capabilities and source/license attribution. Module IDs and score-library keys are different: existing `using`/`through` keys retain their current grammar and meaning.

Numeric parameter descriptors need key, label, default, minimum/maximum, step, unit, display/linear-or-log mapping, normalization and reset semantics. The same descriptor must govern compact dials, exact values, validation and documentation. Add nonnumeric parameter types only with corresponding import/control tests. Explicitly distinguish continuous updates from changes that rebuild topology.

Audio factories must work with live and offline contexts. Their contract must cover gain/mix/bypass, measured processing latency in seconds, conservative finite tail bounds, tail activity, updates, cleanup and resource estimates. The host supplies the session time origin, note start and deterministic seed where needed; modules must not schedule against wall-clock time. Declared capabilities must honestly distinguish in-place updates, warmed crossfades and replay-only changes.

Each module owns fresh runtime nodes, phase and buffers per applied instance. Serializable settings are independent data copies; modules never share mutable DSP state through the preset library. The host owns score revisions, voice admission, routing, latency alignment, hard Stop, project mix and monitor exclusion from export.

Definitions are immutable; factories return owned disposable instances. Runtime registration must fail clearly for duplicate IDs, incompatible APIs or invalid definitions before an affected audio graph starts. Unsupported saved modules have a separate preservation workflow in [compatibility](COMPATIBILITY.md); do not conflate malformed input with an unavailable implementation.

## Public surface and documentation

Use one documented public import entry point and version its contracts. Contributors should not import private host files. Keep source examples, API comments, units, contract checks and tutorials beside the implementation. A tutorial is complete only when it builds and passes from a clean checkout; it must identify its supported API version and work in browser and portable workflows where claimed.

The first supported contribution paths are [pedals](PEDALS.md) and [Fourier instruments](INSTRUMENTS.md). [Feature modules](FEATURE_MODULES.md) cover the later panel/experiment/command boundaries. [CONTRIBUTING.md](../../CONTRIBUTING.md) describes the working source contribution path available today.

## Proof of completion

Migrate all four built-in pedals through the same registry before declaring the pedal API usable. Add a small independent example using only the public contract and one assembly entry. Then do the equivalent for instrument presets, followed by the voice capability contract and optional feature modules. Verify schema-v1 projects, copy ownership, phase/clock continuity, measured latency, bypass/tails/Stop, source/history and shared live/offline output throughout.

Publication readiness additionally needs an owner-approved open-source license, attribution review, maintained contribution/review guidance and repeatable CI. No license is selected by this plan, and no publishing settings are changed. Milestones M1 (contracts), M2 (pedals), M3 (presets), M4 (engines), M5 (features) and M6 (open-source readiness) each have their own release, documentation and proof gates. M2/M3 enable useful contributions without waiting for all six. A visibly working module plus maintained contributor documentation is a milestone gate, not an optional polish task.

## Contributor assembly boundary

The chord path below is implemented. Pedal/preset/engine/feature registries remain M1–M5 designs; their acceptance is more than arranging files into folders. See the tested [module creation walkthrough](MODULE_CREATION.md).

```mermaid
flowchart TB
  Source[Reviewed contribution source] --> Contract[Versioned definition contract]
  Contract --> Validate[Immutable registry validation]
  Validate --> Assembly[One explicit build assembly]
  Assembly --> Consumers[Parser / completion / inspection / rendering]
  Project[Serializable project data] --> Consumers
  Consumers --> Result[Owned settings and compiled events]
  Project -. cannot install executable code .-> Source
```

Project JSON contains source and owned data, not executable module definitions. The dashed path represents a forbidden installation path, not an available capability. Definitions must not reach back into mutable host state. Every registry category needs compatibility fixtures, independently owned instances, disposal/resource/latency policy and a buildable contributor example before its public API can be advertised.

## Source-view boundary as an implemented reference

The v0.24.0 workspace uses a pure span index/projection and narrow host edit callback. It is a useful concrete architecture reference for future M5 source/outline features, without declaring a general loader complete. See [SCORE_VIEWS.md](SCORE_VIEWS.md) for revision and CRLF mappings and [the workspace plan](../SCORE_WORKSPACE_PLAN.md) for separate named-section/swing gates.

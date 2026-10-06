# Adding a pedal

Status: the current source integration below works through existing application code; the public module contract is planned for milestones M1/M2. There is no runtime pedal installer or public registration API yet. Read [architecture](ARCHITECTURE.md), [compatibility](COMPATIBILITY.md) and [CONTRIBUTING.md](../../CONTRIBUTING.md) first.

## Current source integration

1. Define the kind, defaults, label and numeric controls in [pedals.ts](../../src/core/pedals.ts). Update construction, validation, import and any topology/musical-settings comparisons affected by the new parameters. Defaults must pass the same validation as imported values.
2. Implement the processor in [effects.ts](../../src/audio/effects.ts). Cover both factory construction and parameter/bypass updates. Update `chainLatency` for any true processing latency; all graph latency/tail values are seconds, even when a control displays milliseconds.
3. Add equipment discovery and recognized drag kinds in [PedalBoardSurface.tsx](../../src/components/PedalBoardSurface.tsx). Existing serial cable routing and the eight-pedal board limit remain host behavior. A physical position does not determine audio order.
4. Check the generic compact dials and exact/sliding inspector in [PedalControls.tsx](../../src/components/PedalControls.tsx) and [Pedalboard.tsx](../../src/components/Pedalboard.tsx). Add custom labels/reset behavior only where needed, with keyboard alternatives and theme tokens.
5. Extend conservative export-tail estimation in [export.ts](../../src/audio/export.ts) where applicable. Live and WAV graphs must use the same factory through [scoreGraph.ts](../../src/audio/scoreGraph.ts), not a separate export approximation of the sound.
6. Add schema/copy, numeric/audio, equipment/keyboard and packaged-workflow proofs. Update the plan, status, module documentation and knowledge summaries together.

This list explains why registry work is required: adding a kind currently touches several host files. It is not the intended long-term contributor API.

## Planned M2 contribution recipe

Once M1 contracts are available, create one pedal directory containing its immutable definition, DSP factory, optional inspector, example settings and tests. Import only the public module contract, register it once in the explicit assembly, and let the host derive equipment, validation, generic controls and documentation from the definition. The exact filenames/import path and commands must be published with M2 rather than guessed here.

Supply the following:

- Stable namespaced type ID, supported API version, saved-data version, author/license attribution and parameter help.
- Defaults and descriptors with exact units, bounds, step, display mapping, normalization, reset and continuous-versus-topology classification. Conversion to Web Audio units happens once at the DSP boundary.
- A live/offline factory with input/output, update capability, processing latency, conservative tail bound/activity and complete disposal. Each instance gets its own nodes, feedback buffers and modulation phase.
- A declared wet/dry and trim policy. Neutral, bypass and zero/full mix behavior must be measured; do not assume every new effect should sound like dry at its defaults. Avoid hidden normalization or gain changes.
- A measured latency policy. Intentional musical delay/all-pass phase is distinct from processing latency that the host compensates across tracks and A/B paths.
- A finite bypass/tail/Stop policy, including whether bypass drains prior state and how long that can take. Hard Stop disposes all resources; no timer/feedback node can survive the owned instance.
- CPU/memory/state estimates and support limits for live/offline contexts and sample rates. Unsupported configurations fail explicitly before output rather than silently substituting another processor.

Do not access another track's mutable state or replace the host clock. Settings changes during score playback retain the frozen-revision/replay policy; supported live audition changes preserve the session clock and smooth parameters or use a host-managed warmed crossfade. New topology is not an in-place numeric update.

## Required contract proofs

- Construction/default/import/migration and duplicate/incompatible definition failures.
- Independent library, A/B, track and master copies through Apply/Apply to all, undo, autosave, native JSON and reload.
- Known-signal gain/mix, extrema stability, measured latency and dry/wet alignment at 44.1/48 kHz; intentional phase effects tested against their intended transfer function.
- Parameter changes, bypass, repeated play/Stop and tail cleanup, including silent gaps inside a feedback tail.
- Cable order, disconnected-output behavior, compact dials, exact values, keyboard placement and real mouse drag onto the first slot.
- Shared playback/WAV behavior, frozen exports, sample-rate agreement, tail-cap warning/end fade, clipping review and resource preflight.

The first independent example should be a small utility processor with easy numeric expectations. It must work through one module registration without new kind branches in host DSP, menus, validation or export. Keep example-only equipment out of the default build unless it is intentionally promoted.

Phaser, chorus and algorithmic reverb are future users of these contracts, not implementations delivered by this guide. Their modulation/stability/bypass and finite-tail requirements remain in [BUILD_PLAN.md section 7](../../BUILD_PLAN.md#7-planned-pedal-expansion--phaser-chorus-and-reverb).

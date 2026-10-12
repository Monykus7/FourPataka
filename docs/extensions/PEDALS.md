# Adding a pedal

Implemented v0.33.0: follow the [playable pedal tutorial](PEDAL_MODULES.md) and [public contract](../../src/modules/foundation/pedals.ts). All four original pedals and Level use one registry/factory boundary. Add a module folder and explicit assembly entry; equipment, controls, settings validation, audio and WAV estimates consume it. Existing source keys, ownership, phase/clock, routing and measured processor behavior remain host policies. There is no runtime package installer.

## Historical integration

Before M2, a new pedal needed host kind/default/control, DSP, drag-menu, import and export switches. Those steps are no longer the contributor recipe. Existing source integration points are documented in [architecture](ARCHITECTURE.md); use the actual public imports in the tutorial.

## M2 contribution requirements

Create a module folder with its definition/factory and tests, importing the public barrel. Register it in src/modules/assembly.ts. The [Level example](../../src/modules/examples/level/index.ts) is playable from Equipment; exact commands and lifecycle rules are in the tutorial. Custom inspector components remain future UI work; this release supplies descriptor-driven generic controls.

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

The independent Level example ships deliberately in Equipment with analytic gain/mix proofs. It needs no kind branches in host DSP, menus, validation or export.

Phaser, chorus and algorithmic reverb are future users of these contracts, not implementations delivered by this guide. Their modulation/stability/bypass and finite-tail requirements remain in [BUILD_PLAN.md section 7](../../BUILD_PLAN.md#7-pedalboard-and-audio-routing).

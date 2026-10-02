# Behavioral decisions

These summaries record why implementation details matter. Source code and tests remain the authority for exact behavior; pending roadmap work belongs in BUILD_PLAN.md.

## Phase and musical clock

<!-- features: synthesis, comparison -->

A replacement harmonic oscillator must enter at the phase the original voice would have reached at the same audio time. Otherwise live coefficient edits introduce an audible discontinuity. A/B switching changes sources and warmed processing branches while keeping the session start and scheduling cursor. Replay alone starts the phrase again. Existing crossfades are retargeted together so rapid edits cannot sum duplicate copies of shared partials.

Evidence: `src/audio/voice.ts`, `src/audio/engine.ts`, `tests/browser/comparison.spec.ts`.

## Source authority and quarter-note timing

<!-- features: notation, timing, tracks -->

Score text owns tempo, meter, events and instrument assignments. GUI controls edit parser spans and form one undo operation. Tempo and event durations stay in quarter-note units; meter changes bar guides, not scheduling speed. Playing text uses a frozen revision for the timeline and disables stale source highlights. Notes may cross measures and end in partial bars.

Evidence: `src/core/parser.ts`, `src/core/scoreTools.ts`, `src/core/meter.ts`, `src/App.tsx`, `tests/browser/meter.spec.ts`.

## Independent instances and live processing

<!-- features: storage, pedals, comparison -->

Saving a preset never overwrites already-applied track copies. Apply is an explicit copy operation. Each processing destination owns processor state. Compressor and overdrive dry paths match wet latency; otherwise mixing/bypass causes comb filtering or timing changes. Audition parameter changes are live; score parameter/topology changes wait for replay, while bypass remains live. EQ, delay/tail handling and score chain directives still need implementation.

Evidence: `src/core/project.ts`, `src/core/pedals.ts`, `src/audio/effects.ts`, `src/audio/engine.ts`, `tests/browser/pedals.spec.ts`.

## Waveform and rotary gestures

<!-- features: waveform, pedals, storage -->

An odd waveform half-cycle maps directly to the signed sine bank. Dot interpolation uses monotone segment tangents to avoid overshoot; endpoint zeros keep the periodic join continuous. Rotary motion uses shortest angular deltas so crossing the bottom seam does not jump. Gesture history groups are unique and remain grouped across pauses; a subsequent gesture is a separate undo step. Exact inputs provide precision without drawing or rotating.

Evidence: `src/core/waveform.ts`, `src/core/rotary.ts`, `src/components/RotaryDial.tsx`, `src/App.tsx`, `tests/browser/dials.spec.ts`.

## Local project and desktop boundary

<!-- features: storage, desktop, knowledge -->

Projects remain local. Browser and desktop storage are separate; JSON transfers the editable project. The Electron renderer has no Node access and uses a narrow, origin-checked native bridge. Knowledge embeddings run locally after model files download; repository content is never sent to inference services. Generated graph/vector caches are rebuildable and excluded from version control.

Evidence: `src/core/project.ts`, `desktop/main.cjs`, `desktop/preload.cjs`, `scripts/knowledge/`.

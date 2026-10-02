# Behavioral decisions

These summaries record why implementation details matter. Source code and tests remain the authority for exact behavior; pending roadmap work belongs in BUILD_PLAN.md.

## Delay feed and echo state

Delay uses a separate feed gain into a DelayNode/feedback loop. Pedal or whole-chain bypass closes that feed and restores dry unity, retaining the configured wet gain and stored echoes. Feedback is validated at 0–95%; it cannot sustain itself indefinitely. Each independent chain owns its own buffer. Echo time is intentional musical timing, so its graph latency is zero for track compensation. Tail metadata counts the first echo and feedback repeats until -60 dB; live delay edits refresh that estimate. The bypass indicator measures loop activity and bridges one delay interval of silence between echoes. Stop fades the session output before disposing all feedback nodes. Tempo sync remains later work.

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

Saving a preset never overwrites already-applied track copies. Apply is an explicit copy operation. Each processing destination owns processor state. Compressor and overdrive dry paths match wet latency; otherwise mixing/bypass causes comb filtering or timing changes. Audition parameter changes are live; score parameter/topology changes wait for replay, while bypass remains live. Delay/tail handling and score chain directives still need implementation.

Evidence: `src/core/project.ts`, `src/core/pedals.ts`, `src/audio/effects.ts`, `src/audio/engine.ts`, `tests/browser/pedals.spec.ts`.

## Three-band EQ identity and timing

<!-- features: pedals, comparison -->

EQ uses a 200 Hz low shelf, a variable 150…4000 Hz peaking mid with Q = 1, and a 4000 Hz high shelf. Gains start at zero, output at 0 dB, and mix at 100%. All filter frequencies stay below the context's Nyquist limit. Flat filters are identity at every linear dry/wet mix. Output trim affects only wet audio, while bypass selects untrimmed dry audio. Filter phase is frequency-dependent and is not look-ahead latency: EQ contributes zero to track scheduling compensation. A 100 ms filter decay allowance follows release; hard Stop disconnects the graph as before. Parameters use the existing 15 ms smoothing and independent processor ownership. Filter types follow the [Web Audio specification](https://www.w3.org/TR/webaudio-1.0/#BiquadFilterNode).

Reset to flat restores every EQ parameter together without replacing its ID, position or bypass state. The action creates its own undo entry, so Undo recovers the complete edited response rather than an individual knob.

Evidence: `src/core/pedals.ts`, `src/audio/effects.ts`, `tests/browser/eq.spec.ts`.

## Physical board placement and routing

<!-- features: pedals, storage, comparison -->

Board positions and explicit cables belong to each independent chain/preset copy. Legacy chains derive a prewired board with their original order. Null cable endpoints mean the board input/output terminals; they never collide with pedal IDs. One cable per jack and cycle validation enforce a serial signal path. Audio follows the complete input-to-output cable path, not pedal array order or visual position. Unconnected pedals do not run processors. An unplugged output is silent unless whole-board bypass is engaged. Position-only moves are nonmusical: they save and undo without pending replay. Repatching takes effect on replay during playback; A/B switches retain their existing continuous transition policy. This keeps the board interaction reusable during the broader frontend redesign. The surface/controller/inspector are separate components. Small dials stay on each pedal; exact values and sliders follow selection in the inspector. Placement previews move connected cables, commit once on release, and abandon collisions/canceled gestures without consuming undo. Removed pedals invalidate unfinished patches. Cable selection uses the visible stroke or keyboard focus. The equipment menu overlaps the first grid column, so native drags make it transparent to both painting and hit testing after the next animation frame. The source remains mounted until drop/cancellation. Hiding it synchronously in dragstart can cancel Chromium drag-image capture. Pending frames are canceled on drop, Escape, dragend or unmount; failed drops add no history. Regression gestures move beyond the native drag threshold before locating the now-exposed first slot.

Evidence: `src/core/board.ts`, `src/core/pedals.ts`, `src/audio/effects.ts`, `src/audio/engine.ts`, `src/components/PedalBoardSurface.tsx`, `src/components/PedalControls.tsx`, `tests/unit/board.test.ts`, `tests/browser/board.spec.ts`, `tests/browser/board-audio.spec.ts`.

## Waveform and rotary gestures

<!-- features: waveform, pedals, storage -->

An odd waveform half-cycle maps directly to the signed sine bank. Dot interpolation uses monotone segment tangents to avoid overshoot; endpoint zeros keep the periodic join continuous. Rotary motion uses shortest angular deltas so crossing the bottom seam does not jump. Gesture history groups are unique and remain grouped across pauses; a subsequent gesture is a separate undo step. Exact inputs provide precision without drawing or rotating.

Evidence: `src/core/waveform.ts`, `src/core/rotary.ts`, `src/components/RotaryDial.tsx`, `src/App.tsx`, `tests/browser/dials.spec.ts`.

## Local project and desktop boundary

<!-- features: storage, desktop, knowledge -->

Projects remain local. Browser and desktop storage are separate; JSON transfers the editable project. The Electron renderer has no Node access and uses a narrow, origin-checked native bridge. Knowledge embeddings run locally after model files download; repository content is never sent to inference services. Generated graph/vector caches are rebuildable and excluded from version control.

Evidence: `src/core/project.ts`, `desktop/main.cjs`, `desktop/preload.cjs`, `scripts/knowledge/`.

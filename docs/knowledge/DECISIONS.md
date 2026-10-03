# Behavioral decisions

These summaries record why implementation details matter. Source code and tests remain the authority for exact behavior; pending roadmap work belongs in BUILD_PLAN.md.

## Contextual command reference (v0.15.0)

<!-- features: command-reference, notation, tracks, storage -->

Eleven shared definitions describe syntax, rules, category and insertion scope while the parser remains playback authority. Reference snippets resolve current saved instrument/pedal keys and the next unique track key, rather than advertising unrelated built-ins. `using` replaces only the selected track's parsed instrument span; normal source reconciliation copies a changed preset independently and preserves unchanged settings. Pedal/global cards retain their narrow source edits and duplicate prevention. A reference instrument selection is UI state; it does not mutate the audition sound or a track until insertion.

Only compiled tracks are insertion targets, so an empty score cannot accidentally use a stale saved destination. Empty scores still accept globals/new tracks; invalid text and score playback block insertion but not documentation. Syntax/rules and unavailable reasons remain visible without hover, category/search filters match all query terms, and source commands remain separate from UI controls. Completion after `using` and `through` is restricted to the matching library and respects its preference. The native menu requests focus after the Compose DOM commit; hidden-window verification asserts DOM focus rather than unavailable OS window focus. This closes the functional command-reference item without claiming full accessibility or device validation.

Evidence: `src/core/commands.ts`, `src/core/commandReference.ts`, `src/core/scoreTools.ts`, `src/components/CommandReference.tsx`, `src/components/ScoreEditor.tsx`, `src/App.tsx`, `tests/unit/commandReference.test.ts`, `tests/browser/command-reference.spec.ts`, `tests/desktop/app.spec.ts`.

## Planned 32-harmonic bank boundary

<!-- features: harmonic-expansion, synthesis, waveform, comparison, storage -->

The requested H1–H32 expansion is deferred; the current implementation still validates 16 magnitudes and 16 polarities. The separate 32-voice cap is a polyphony limit, not harmonic capacity. The plan exposes an upper bank without making visibility an audio switch. Existing sounds migrate by zero-padding magnitudes and adding positive polarities, preserving their original coefficients, trim and point geometry without automatic re-projection. Newly generated mathematical presets and waveform edits may use the expanded bank; macros need an explicit scaling policy rather than an incidental change from array length.

Synthesis, projection, source inspection, solo, schema validation and independent saved copies must adopt the same capacity together. Nyquist exclusions remain pitch/sample-rate dependent, with saved upper coefficients retained. Continuous phase/clock, explicit gain reference, independent A/B/track ownership, undo, offline consistency and bounded performance are future gates. Piano/brass-inspired timbres are targets; time-varying partials, excitation/brightness and inharmonicity remain separate later work. This documentation adds no runtime controls and does not advance current release gates.

Plan authority: `BUILD_PLAN.md`, section 5 "Planned expansion — up to 32 harmonics" and stage 8; `IMPLEMENTATION_STATUS.md`, "Next roadmap work". Current integration points: `src/core/music.ts`, `src/core/project.ts`, `src/core/waveform.ts`, `src/audio/voice.ts`, `src/components/FourierWorkspace.tsx`, `src/components/SourceGraphs.tsx`.

## Planned instrument acoustics boundary

<!-- features: instrument-acoustics, synthesis, comparison, storage -->

The requested acoustics feature is deferred: a wet/dry algorithmic tiny chamber inside the Instrument builder, intended as an instrument-body approximation. It must work without impulse-response assets. The plan proposes short reflections with bounded damped feedback, and enable/reset, mix, size, decay and damping controls; the exact algorithm and ranges remain subject to an audio proof.

Acoustics settings will belong to instrument presets, track copies and A/B snapshots. A destination's voices feed its own chamber before its pedal chain; destinations and comparison branches must not share runtime buffers. Existing waveform/coefficient inspectors continue to describe the raw source. Legacy data defaults to acoustics off. Dry unity, measured latency distinct from reflection timing, continuous comparison, finite decay, Stop disposal, copy isolation and offline/export agreement are future release gates, not verified runtime behavior. The current implementation contains no chamber model or controls, and this planning change leaves the main-feature/WAV priorities intact.

Plan authority: `BUILD_PLAN.md`, section 5 "Planned instrument acoustics — tiny chamber" and stage 8; `IMPLEMENTATION_STATUS.md`, "Next roadmap work".

## Delay feed and echo state

<!-- features: pedals, comparison, storage -->

Delay uses a separate feed gain into a DelayNode/feedback loop. Pedal or whole-chain bypass closes that feed and restores dry unity, retaining the configured wet gain and stored echoes. Feedback is validated at 0–95%; it cannot sustain itself indefinitely. Each independent chain owns its own buffer. Echo time is intentional musical timing, so its graph latency is zero for track compensation. Tail metadata counts the first echo and feedback repeats until -60 dB; live delay edits refresh that estimate. The bypass indicator measures loop activity and bridges one delay interval of silence between echoes. Stop fades the session output before disposing all feedback nodes. Tempo sync remains later work.

Impulse proofs found a 128-frame cycle-breaker offset on Chromium repeats at 44.1 and 48 kHz. The first echo therefore runs outside the feedback cycle; the repeat DelayNode subtracts that quantum so both first and repeated echoes follow the displayed time. New-input gain, feedback and trim remain separate. Loop activity is sampled by the scheduler even when another tab is visible. Cleanup budgets never shrink below echoes captured at previous audition settings. Natural playback ends after release plus the finite processing allowance, while explicit Stop fades in 20 ms and disposes nodes after 35 ms. Different A/B topologies keep the musical clock and retain the established warmed-branch replacement policy; they do not share buffers.

Evidence: `src/core/pedals.ts`, `src/audio/effects.ts`, `src/audio/engine.ts`, `tests/browser/delay.spec.ts`, `tests/desktop/app.spec.ts`.

## Score chain assignments (v0.14.0)

<!-- features: pedals, notation, tracks, storage -->

Pedal templates have stable score keys distinct from their internal IDs and display labels. Built-ins use clean, cleanGlue and warmDrive. Schema-v1 projects without keys migrate deterministically from labels, suffixing collisions and reserving explicit keys first. Invalid or duplicate explicit keys reject import. Keys start with a letter, contain letters/digits/underscores and have at most 100 characters; new preset saving exposes this key separately from its label.

Score headers accept track <name> using <instrumentKey> through <pedalKey>; one global master through <pedalKey> assigns the mix chain. Unknown keys, duplicate master directives and misplaced commands diagnose visibly; invalid source preserves current independent copies and cannot play. Changing a valid assignment loads a deep copy of the selected template. Each instance retains its last reconciled assignmentKey, so unchanged text and library saving preserve local knobs, bypass, positions and cables. Removing a previously applied directive clears its chain; legacy scores that never had a directive preserve their manually configured boards. Undo restores source and processing together.

Compose selectors, Track Maker and command cards edit only parser spans; comments, note bodies and line endings survive. Pedalboard Load/Save as new/Apply update a destination's source assignment when its preset association changes and retain the exact applied sandbox copy. Reapplying the same preset retains the destination marker, stripping foreign source-history markers from copied sandbox chains; otherwise reconciliation could replace edited settings with a template. Merely saving a template does not reapply it. Compose selectors guard invalid or playing scores; typing remains available, with the existing frozen playback revision and pending routing until replay. Pedal-key autocomplete reads the local library and respects its preference switch. Runtime latency, independent processor state, live bypass and phase/clock policies remain the audio engine's responsibility.

Evidence: `src/core/parser.ts`, `src/core/project.ts`, `src/core/scoreTools.ts`, `src/core/pedals.ts`, `src/components/ChainAssignment.tsx`, `tests/browser/score-chains.spec.ts`, `tests/desktop/app.spec.ts`.

## Phase and musical clock

<!-- features: synthesis, comparison -->

A replacement harmonic oscillator must enter at the phase the original voice would have reached at the same audio time. Otherwise live coefficient edits introduce an audible discontinuity. A/B switching changes sources and warmed processing branches while keeping the session start and scheduling cursor. Replay alone starts the phrase again. Existing crossfades are retargeted together so rapid edits cannot sum duplicate copies of shared partials.

Evidence: `src/audio/voice.ts`, `src/audio/engine.ts`, `tests/browser/comparison.spec.ts`.

## Source authority and quarter-note timing

<!-- features: notation, timing, tracks -->

Score text owns tempo, meter, events, instrument assignments and pedal-template assignments. JSON additionally retains independently edited applied copies. GUI controls edit parser spans and form one undo operation. Tempo and event durations stay in quarter-note units; meter changes bar guides, not scheduling speed. Playing text uses a frozen revision for the timeline and disables stale source highlights. Notes may cross measures and end in partial bars.

Evidence: `src/core/parser.ts`, `src/core/scoreTools.ts`, `src/core/meter.ts`, `src/App.tsx`, `tests/browser/meter.spec.ts`.

## Compose working layout (v0.14.1)

<!-- features: composition, notation, appearance -->

Score and command reference share the top desktop row; timeline, independent track/master controls and selected-event inspection form the lower overview. DOM order follows that arrangement so keyboard and narrow-screen reading order remain score, reference, timeline, tracks and event inspector. Two-column reference cards and wrapping selectors fit the narrower help panel. The score panel is a flex column: its editor absorbs extra row height and the status bar stays at the bottom, removing the unused box below the former fixed editor. Desktop editor minimum grows from 430 to 520 pixels; narrow screens retain bounded editor scrolling. Size containment prevents a long CodeMirror document from contributing its full content height to the grid row, so long scores scroll locally rather than making the score panel arbitrarily tall. The lower panels use their own content height rather than stretching an empty timeline. Search, insertion, assignments, history, source authority and playback revisions keep their existing behavior.

Evidence: `src/App.tsx`, `src/styles.css`, `src/components/ScoreEditor.tsx`, `tests/browser/composition.spec.ts`, `tests/browser/meter.spec.ts`, `tests/browser/score-chains.spec.ts`.

## Independent instances and live processing

<!-- features: storage, pedals, comparison -->

Saving a preset never overwrites already-applied track copies. Apply is an explicit copy operation. Each processing destination owns processor state. Compressor and overdrive dry paths match wet latency; otherwise mixing/bypass causes comb filtering or timing changes. Audition parameter changes are live; score parameter/topology changes wait for replay, while bypass remains live. Delay feed/tail bypass is implemented; score chain directives preserve independent copies as described above.

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

## Harmonic sign and Soft bass source (v0.16.0)

<!-- features: synthesis, waveform, instrument-presets, storage, comparison -->

Polarity is an independently editable +1/−1 sine coefficient sign, not a strength slider or an arbitrary phase angle. Every harmonic has a visible sign toggle and the partial inspector provides an explicit Sign selector and signed coefficient. Zero-magnitude signs remain editable without producing audio. Each discrete sign action owns an undo entry, retains magnitudes/envelope/trim/undertones, updates only the active owned A/B sound and resets the macro baseline. Obsolete waveform-point geometry is discarded through the existing coefficient-consistency check. The audio engine already supports signed sine replacement with phase-aligned 20 ms crossfades, so live edits retain the clock and envelope; score sounds retain the existing frozen-playback policy.

Soft bass previously reused Triangle's exact coefficients with only envelope changes. Version 2 uses positive H1–H6 magnitudes [1, 0.22, 0.1, 0.045, 0.02, 0.009], higher magnitudes zero, attack 30 ms, release 350 ms and trim −12 dB. Triangle remains alternating-sign odd harmonics at 1/h². Neither source is audio-normalized. Library/editor thumbnails sample the actual signed harmonic bank; their decorative scale excludes trim, envelope and undertones and never changes sound data.

Only an exact untouched factory Soft bass v1 template with matching ID, key, label, version and sound fields upgrades to v2 on project loading/import. Customized/renamed/versioned templates remain intact. Applied tracks and A/B snapshots remain independently owned, preserving their previous waveform and applied version. A local-load notice explains that the updated library must be loaded and explicitly applied to change those sounds. Project schema remains v1; no harmonic capacity, acoustics, routing or latency changes are included.

Evidence: `src/core/music.ts`, `src/components/HarmonicPolarity.tsx`, `src/core/instrumentPresets.ts`, `src/core/project.ts`, `src/App.tsx`, `tests/unit/polarity.test.ts`, `tests/unit/instrumentPresets.test.ts`, `tests/browser/polarity.spec.ts`, `tests/browser/instrument-presets.spec.ts`, `tests/desktop/app.spec.ts`.

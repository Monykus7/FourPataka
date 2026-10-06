# Behavioral decisions

These summaries record why implementation details matter. Source code and tests remain the authority for exact behavior; pending roadmap work belongs in BUILD_PLAN.md.

## Planned phaser, chorus and reverb pedals

<!-- features: pedal-expansion, pedals, comparison, wav-export, instrument-acoustics -->

Phaser, chorus and algorithmic reverb are requested later pedalboard work, not current runtime kinds or menu equipment. Section 7 of BUILD_PLAN.md owns proposed controls/ranges, the phaser → chorus → reverb order and effect-specific proof gates. Keep the current stage 7 learning/measurement priority. Each effect must adopt the existing compact board/inspector, cable order, independent library/A-B/track/master settings, frozen score versus smooth live-audition behavior, import/history and shared live/offline graph policies together.

Phaser all-pass phase/notches and chorus's modulated short delay are intended musical effects, distinct from look-ahead alignment. Any actual algorithmic latency or feedback cycle-breaking delay must be measured and documented. Modulation uses a session-relative musical-time reference, retains LFO continuity for live edits and does not restart the underlying score clock. Runtime phase/buffers belong to each graph, not shared preset objects or serialized projects. Chorus initially has no feedback and clamps depth against base delay; balance its wet voices explicitly so their sum does not introduce a hidden gain boost.

The reverb pedal represents a selectable track/master space using generated reflections and a bounded damped feedback network without IR files. It is separate from the planned instrument-owned tiny chamber before track pedals; both may coexist. Define decay as a −60 dB target, validate stability at parameter/sample-rate extrema, and include pre-delay in finite tail estimates. Reverb bypass closes new wet input but preserves existing tails; chorus drains its short history and phaser feedback needs a measured bounded bypass policy. Hard Stop disposes every oscillator/feedback buffer, and replay starts fresh. Extend tail meters/cleanup/WAV caps and warnings, peak review and memory estimates when these ship. Old projects stay unchanged with no new effect enabled by migration. Listening, numeric identity/mix/continuity/tail/latency proofs and keyboard/native/save/copy/export checks are future gates, not evidence of completed implementation.

Plan authority: BUILD_PLAN.md section 7 and stage 8; IMPLEMENTATION_STATUS.md next roadmap work. Integration evidence: src/core/pedals.ts, src/audio/effects.ts, src/audio/scoreGraph.ts, src/audio/engine.ts, src/audio/export.ts, src/components/Pedalboard.tsx, src/components/PedalControls.tsx.

## Balanced timeline and track controls (v0.19.2)

<!-- features: composition, timing, tracks, keyboard-workflow, appearance -->

The desktop track-sounds panel now stretches to the timeline's own content height. Size containment excludes track controls from grid-row sizing, while a flexing named focusable scroller holds master/track assignments, levels, independent-copy loading and bypass/edit controls below a fixed heading. The timeline remains at its useful natural height. Narrow stacked layouts bound the track panel at 440 px and keep the same reading order. Space on the scroller uses native scrolling without global Play; child inputs retain their normal key handling. Invalid/empty scores retain existing owned copies and disable source assignments as before. Scrolling/focus/selection do not alter the source or history; actual edits retain the existing undo and copy policy. Audio phase/clock, processing latency, units and export behavior are unchanged.

Evidence: src/App.tsx, src/styles.css, tests/browser/timeline.spec.ts. Earlier v0.14.1 natural-height layout and v0.19.1 score/reference matching remain historical decisions; this patch changes only the lower track panel's sizing and scroll containment.

## Score-height command reference (v0.19.1)

<!-- features: command-reference, composition, appearance, keyboard-workflow -->

The expanded reference now matches the score panel's border-box height. On desktop, size containment prevents the catalog from determining the shared grid row height; the reference stretches alongside the score and its body absorbs remaining space beneath fixed search. When the panels stack, a scoped ResizeObserver mirrors the score's measured border box through a CSS variable, including status wrapping and diagnostics. Observation is removed when Compose unmounts. The desktop row does not use that mirrored height, avoiding a feedback loop that would prevent the score from shrinking after diagnostics disappear. A collapsed reference returns to its header height. Filtering and expanded rules never size the score; search, catalog scrolling/focus, source insertion, independent copies and all audio timing/latency policies retain existing behavior. This is a layout patch, with no roadmap gate change.

Evidence: src/App.tsx, src/styles.css, src/components/CommandReference.tsx, tests/browser/command-reference.spec.ts.

## Frozen project WAV export (v0.19.0)

<!-- features: wav-export, synthesis, pedals, tracks, storage, desktop -->

Score text is recompiled and reconciled against independent applied copies before the export snapshot is used. Neither saved library templates nor active A/B overrides replace those copies. Live and offline contexts share createScoreGraph, createVoice and createChain, including cable order, unplugged silence, bypass and measured compensation before the master bus. Project mix gain enters the offline graph; monitor gain has no export input. The shared admission policy evaluates overlap at the new note's scheduled audio time, not the scheduling thread's look-ahead clock. It keeps 32 admitted voices including releases and fades the oldest for 10 ms (oscillator stop after 15 ms); cancelAndHoldAtTime anchors its future envelope without using the present AudioParam.value. A separate owned-voice set retains retired/future voices until their audio end, so Stop disposes every source and silent voices do not depend on nonexistent oscillator callbacks.

PCM16 defaults to 48 kHz stereo, with mono and 44.1 kHz alternatives. End time includes full score/rest duration, maximum configured release, measured total graph latency, 100 ms filter settling, then a 5 s default echo budget adjustable 0–30 s. Routed, enabled delay decay estimates are conservative; a budget below that estimate warns of possible later echoes and applies a 20 ms cap fade. A final-window measurement separately reports signal present at the cap, because silent gaps alone cannot prove that no later repeat exists. Fresh bypassed-delay buffers contain no historic echoes; ordinary live bypass still closes only new input and Stop clears owned buffers.

Float peaks and above-range sample counts are measured before PCM encoding. An explicit −36…0 dB file level or opt-in −1 dBFS normalization is required to save when the resulting peak exceeds unity; project gains are never silently rewritten. Non-finite samples fail. Silence is neither amplified nor given a misleading finite dBFS value. Memory preflight accounts for float rendering, PCM/transfer copies, a fixed graph allowance and conservative per-scheduled-voice cost; estimated totals above 256 MiB fail before rendering. It is not a promise about browser/device RAM. Render/allocation/save errors remain visible. Native saving accepts only bounded, consistent PCM headers from the trusted top-level studio frame and lets the user choose the path. JSON carries editable settings; exporting WAV adds no musical history. Closing during rendering drops the result after the non-abortable OfflineAudioContext finishes; save cancellation keeps it available.

Evidence: src/audio/export.ts, src/audio/scoreGraph.ts, src/audio/voiceLimit.ts, src/audio/voice.ts, src/core/wav.ts, src/components/WavExport.tsx, desktop/wav.cjs, tests/unit/export.test.ts, tests/unit/wav.test.ts, tests/unit/nativeWav.test.ts, tests/browser/export-audio.spec.ts, tests/browser/export.spec.ts, tests/desktop/app.spec.ts. Other browser engines, assistive technology and physical listening remain manual gates.

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

## Local-save recovery authority (v0.17.0)

<!-- features: storage, local-recovery, desktop -->

The local store keeps the current project, one previous distinct autosave and one unreadable-save copy using the existing schema-v1 keys. Both 400 ms debounced saving and pagehide flushing use the same checkpoint boundary. A valid previous save is compared after import canonicalization, so key ordering, migration and unchanged reloads do not consume the older checkpoint. Original bytes are retained when a genuinely changed project replaces the current save. Damaged current bytes are archived without rotating a valid backup. If a checkpoint write fails, the current save stays intact and the existing save-failure/export UI remains available. These two recovery slots are not an unlimited version history.

Recovery inspection reads and validates each slot independently, including empty or malformed text. The UI captures raw bytes and parsed owned project copies once on opening. A later autosave must not change the selected item or exported contents. Preview names/counts/score come from the validated project; byte counts use UTF-8. Restore revalidates the captured source, stops audio and reuses the import transition as one undo operation. Independent A/B, instrument and applied pedal copies survive; preferences/monitor settings and runtime audio buffers are outside restored project state. Close, Escape, radio selection and export never add musical history. Native modal focus returns on close.

Startup damage still attempts the valid previous save when archiving throws. If both latest and backup are invalid, a fresh example opens while the available original copies remain inspectable/exportable. A persistent review notice supplements the temporary warning. If archival cannot write, recovery inspection exposes the still-stored damaged latest bytes directly, preferring them over an older unreadable archive. No additional storage write is required for that raw export. No save is automatically interpreted as an empty/new project merely because its bytes are an empty string. Unavailable storage is reported distinctly.

Damaged recovery text intentionally bypasses editable-project JSON validation for export only. The sandboxed native renderer has a separate origin-checked saveRecovery bridge accepting text up to 10,000,000 UTF-8 bytes and writing only through a native save dialog. Current-project saving retains its existing JSON validation and 2 MB limit. Canceling either export leaves project state unchanged. Browser raw downloads preserve the same original contents. Source score authority, audio routing/latency, frozen playback revisions, synthesis and project schema remain unchanged.

Evidence: `src/core/localSave.ts`, `src/core/project.ts`, `src/components/RecoveryDialog.tsx`, `src/App.tsx`, `desktop/main.cjs`, `desktop/preload.cjs`, `tests/unit/localSave.test.ts`, `tests/browser/recovery.spec.ts`, `tests/desktop/app.spec.ts`.

## Keyboard editing and inspection (v0.18.0)

<!-- features: keyboard-workflow, waveform, pedals, timing, tracks, storage, desktop -->

Keyboard Add dot splits the widest half-cycle anchor gap and evaluates the same shape-preserving Hermite curve used by the target preview at that midpoint. The inserted geometry is independently owned; endpoints remain fixed zero, spacing stays at least 0.005 and total anchors stay at most 32 (30 editable). Recomputing tangents after insertion can slightly refine the target and coefficients; this is a musical edit with its own undo entry, not an audio-neutral annotation. Envelope/trim/undertones retain their existing source ownership. Deleting a focused anchor transfers focus to its previous surviving neighbor after React commits. Space/Enter select it; handled keys do not also trigger the application's global playback shortcuts.

Equipment focus follows menu semantics: Up/Down wraps, Home/End jumps, disabled pedals on a full board are skipped and Tab leaves the menu. Escape abandons the current tool/preview without history, returns to Equipment and leaves playback running. Keyboard pedal selection focuses the first free slot; placement transfers focus to the new grip after its old slot becomes disabled. Patch cable selection focuses the board input terminal's output jack; existing output/input button pairs perform actual validated routing. Mouse drag sources remain mounted through Chromium's drag-image capture. Physical layout is nonmusical; routing during score playback retains replay policy, latency compensation and hard Stop/tail behavior.

Instrument saving and Track Maker have named modal headings, explicit initial field focus and native close before unmount/state cleanup, preserving trigger focus on cancellation and success. Track validation errors keep the modal open. Closing effects must not queue native close events during React Strict Mode's development setup/cleanup cycle, which could dismiss the newly reopened dialog.

Timeline inspection is UI state, not source text, transport seeking or musical history. One note per track is in Tab order; bounded Left/Right and Home/End focus/select events. Per-track native pickers expose event number, notes/rest, bar/beat and duration in quarter beats, with Previous/Next and a polite selected-event announcement. Displayed frozen playback revisions own these choices until Stop/replay; editing source while playing does not switch their events. Dense timeline marks keep positive width while the readable picker supplies the reliable mouse/keyboard target. Timing remains quarter-note based, including compound/custom meters. No synthesis, sample-rate, project-schema or audio graph changes are included.

The shared browser/portable demonstration walks actual Tab order instead of programmatically focusing/clicking its targets. It covers waveform edits, independent A/B copying/comparison, saved instrument and track creation, EQ placement/patching/exact values, source-authoritative chain application, play/replay/Stop, editable JSON and reload. This closes an automated main-workflow demonstration, not a comprehensive assistive-technology or physical-device/listening audit; those release gates remain explicit before stage 5 is declared complete.

Evidence: `src/core/waveform.ts`, `src/components/FourierWorkspace.tsx`, `src/components/PedalBoardSurface.tsx`, `src/components/TrackMaker.tsx`, `src/components/Timeline.tsx`, `src/App.tsx`, `tests/unit/waveform.test.ts`, `tests/helpers/keyboardWorkflow.ts`, `tests/browser/keyboard.spec.ts`, `tests/browser/board.spec.ts`, `tests/browser/fourier.spec.ts`, `tests/browser/timeline.spec.ts`, `tests/desktop/app.spec.ts`.

## Visible waveform help and compact command reference (v0.18.1)

<!-- features: waveform, command-reference, keyboard-workflow, composition, appearance -->

Keyboard functionality must be visible where it is used. In Dots mode, Add dot now sits beside the waveform tool choices. A readable guide directly above the graph uses key labels for Tab, position/amplitude arrows and Delete. Interior dots reference the guide's actual instructions as their accessible description, rather than the enclosing note's shorter accessible name. Exact values, pointer drawing/placement, projection, bounds, undo and independent copies retain existing behavior.

The command catalog no longer sizes the Compose row to every card and expanded rule. A flex panel caps its total height at 560 px desktop / 460 px narrow screen while leaving its search header outside the body scroller. The body retains all destination controls, command cards, reasons, rules and footer, with a named focusable scroll region and stable scrollbar space. Space on that region uses native scrolling without invoking global Play. Search/category changes reset its scroll synchronously after commit while preserving input focus. Changing contextual instrument/track/pedal selections preserves the same source-aware insertion and copy policy. Musical clocks, phase, latency, source text, project schema and roadmap gates do not change.

Evidence: `src/components/FourierWorkspace.tsx`, `src/components/CommandReference.tsx`, `src/paper.css`, `src/styles.css`, `tests/browser/fourier.spec.ts`, `tests/browser/command-reference.spec.ts`, `tests/helpers/keyboardWorkflow.ts`, `tests/desktop/app.spec.ts`.


## Blank command completion shells (v0.19.3)

<!-- features: notation, command-reference, composition -->

Autocomplete is a writing aid: command templates supply syntax and empty fields, never example pitches, octave, duration, track name, preset key or tempo/meter. Shared metadata now keeps a separate completion template and complete reference example. `chord` supplies `chord:()` with the caret inside, then Tab/Shift+Tab traverses notes, optional default octave and duration. `voicing` skips the default-octave field. Track completion supplies empty name/instrument/body fields and surrounding braces. Existing `chord:` is part of the replacement span so accepting a completion cannot duplicate its prefix/colon. Other command arguments and note/comment text start empty. Completion help explains field navigation. Explicit meter, duration and saved-library options still insert the value the user chose; turning autocomplete off disables both command shells and those suggestions.

Shells intentionally start incomplete. The parser continues to report missing arguments/empty chords, and Play remains disabled until source is valid; completing a shell does not infer notes or silently change playback semantics. Reference cards retain complete examples and their source-aware insertion policy. Completion uses the existing authoritative editor changes and grouped musical history; independent copies, frozen playing revisions, phase/clock continuity, latency, storage schema and remaining roadmap gates are unchanged. Chord-symbol macros remain planned.

Evidence: `src/core/commands.ts`, `src/components/ScoreEditor.tsx`, `tests/helpers/autocomplete.ts`, `tests/browser/autocomplete.spec.ts`, `tests/desktop/app.spec.ts`.


## Modular contributor program priority (planned, 2026-10-05)

<!-- features: modularity, project, pedals, synthesis, storage, notation, desktop -->

The user requests open-source extensibility as a major objective. The user also requests splitting modularity into multiple milestones. The next major foundation is M1 of a six-milestone modular contributor program before further feature expansions; stage 7 learning/measurement remains the next music-feature item behind that foundation. Deliver independently gated M1 contracts/compatibility, M2 pedals, M3 instrument presets, M4 synthesis engines, M5 feature modules and M6 open-source readiness. M2/M3 should enable useful documented contributions without waiting for every module category. Implement source-reviewed bundled module registries first, not runtime installation or code embedded in project files. Built-in pedals and Fourier presets must use the same public contracts as contributors. New synthesis engines and feature panels/commands follow explicit later contract gates. Design and integration recipes are in docs/extensions/ARCHITECTURE.md and the extension guide set; these describe planned contracts, not a working SDK.

The host retains score authority, independent library/A-B/track/master data copies, grouped history, frozen playback revisions, session-relative clock/phase, voice admission, latency compensation, tails/Stop, export limits and native privileges. Modules declare defaults/units/ranges, topology/update capability, seconds-based processing latency, bounded tails and resource estimates, and use shared live/offline factories. API version, saved-data version, module/type IDs and score preset keys remain separate. Schema migration and missing-module preservation must precede saving new module data; unavailable sound is never silently replaced. Source distribution starts with explicit build registration and maintained examples/docs/tests; it does not provide per-module isolation. Owner-approved license/attribution and CI readiness remain planned gates, with no license, publishing or runtime changes in this task.

Current integration evidence: src/core/pedals.ts, src/audio/effects.ts, src/audio/export.ts, src/audio/scoreGraph.ts, src/core/project.ts, src/core/instrumentPresets.ts, src/core/music.ts, src/audio/voice.ts, src/components/PedalBoardSurface.tsx, src/components/PedalControls.tsx, src/App.tsx.

## Registered chord-shape pilot (implemented v0.20.0)

<!-- features: notation, modularity -->

Chord API v1 defines immutable namespaced IDs, exact case-sensitive aliases and bounded ascending degree/semitone pairs. Explicit reviewed assembly registers built-ins and an open-fifth example. The parser expands symbols once into ordinary note events, retaining symbol identity/source spans. Default root octave is 4; @octave overrides it. Compound degrees preserve musical spelling when representable by the existing single-accidental pitch grammar; double accidentals use equivalent pitches. Unknown shapes and out-of-range voicings produce diagnostics rather than substitute sounds. This does not implement a general plugin loader or complete the broader modularity milestones.

## 32-partial source and schema-2 ownership

<!-- features: harmonic-expansion, waveform, comparison, instrument-presets, project -->

The Fourier bank and projection default are 32. Fresh mathematical presets evaluate their formulas through H32. PeriodicWave allocation follows the current bank; phase-aligned updates and voice admission are unchanged. Nyquist filtering retains saved coefficients. Waveform dot amplitudes now permit ±32; the independent 30-editable-anchor cap is unchanged. Mini-spectrum spacing fits all 32 bars. Lower H1–H16 controls remain primary, with a layout-only expandable upper bank and visible active count.

Schema 2 is the current project format. Schema 1 validates exactly 16 values and pads each independent sound with 16 zeros and positive signs; points/envelope/trim/undertones/source remain unchanged. The recognizable old Soft bass template is compared against its padded historical coefficients; owned applied copies do not upgrade. Autosave/recovery storage keys retain their historical v1 names so old saves remain discoverable. Macro brightness keeps its H16 denominator 15, preserving lower-bank response and extending the same slope above H16. No hidden normalization or new latency is introduced. General module compatibility and tiny-room acoustics remain planned.


## Articulation and rational rhythm (v0.21.0 implementation)

<!-- features: rhythm, notation, timing, comparison, wav-export -->

Written duration remains the source clock in quarter-note beats. Parser positions accumulate reduced rational fractions for dotted and N:M events, converting to public numeric beats only at the compiled-event boundary. Each event declares its own tuplet modifier; no implicit group, quantization, meter-dependent tempo or change to chord expansion. Saved schema 2 needs no migration because score text owns this syntax.

Staccato gates half the written duration and caps release to min(instrument release, 30 ms, one-quarter event seconds). User-selected legato extends the gate by min(30 ms, 10% event seconds) only into a following sounding event on that track; attacks remain independent. Rests, track ends and selected-phrase boundaries stop the overlap. A comparison clip after an expired staccato gate is silent. Shared timing drives live, comparison and WAV voices. Sounding extent accounts for overlaps separately from written progress so a tiny final note cannot truncate a prior overlapping voice; all existing finite release/effect tails, voice admission, phase rotation, latency compensation and Stop cleanup remain.

Global `time 7/8 at 8` changes meter at a zero-based quarter-beat offset. Sort/validate at most 64 changes against preceding-meter bar boundaries; duplicates and off-boundary changes are diagnostics. Meter affects guides and bar numbers, not note spacing or tempo. Running score snapshots freeze the complete map. Compose additions and Track Maker rows write authoritative source in one undo operation, preserving owned sound/pedal copies. Grid thinning retains each meter change while bounding ordinary labels and pulses. General module contracts, nested/group tuplets, ties/slurs/envelope carry, glide and per-track meters remain planned.


## Compose rhythm demonstration (v0.21.1)

<!-- features: rhythm, composition, storage -->

Fresh projects start with a seven-bar, two-track, 25-quarter-beat demo at 116 BPM. Both tracks align at 4/4→7/8→3/4→4/4 changes at beats 8/15/21. Comments identify triplet and 5:4 runs, dots, short notes, staccato/legato, explicit voicing and registered chord-symbol examples. No new parser/audio grammar or schema is introduced.

Existing saved scores remain authoritative. Compose's explicit Load demo score operation replaces source in one undo step, disabled during score playback; it preserves customized library entries, A/B and matching owned track sounds. Missing demo keys are restored from factories; restored IDs cannot collide with renamed user entries. Undo restores exact previous text and data; reload persists the selected score. Demo sound therefore follows the user's retained preset/copy settings, not a hidden factory reset. Default-level offline output must remain finite and unclipped.


## Bracketed articulation and tuplets (v0.22.0 implementation)

<!-- features: rhythm, notation, timing, comparison, composition -->

A source-span lexer splits articulation/tuplet openers and closing square-bracket tokens from line-oriented events, retaining original offsets and line numbers before comments/CRLF trimming. Blocks belong inside tracks, may nest up to 64 levels and diagnose unmatched/missing brackets at their original source. Track/EOF recovery clears scopes; a broken block cannot leak to the next track. Event and chord-symbol spans exclude brackets. Normal event lines still occupy one line; openers/closers can sit beside an event.

Innermost articulation scopes determine inherited staccato/legato on sounding events; rests remain silent and break connected gates. Parser-private scope identity prevents legato leaking past ] or into a nested articulation scope; an enclosing tuplet does not change that identity. Independent attacks and previous bounded gate/release behavior remain. Legacy explicit suffixes are accepted for saved projects and override inherited articulation locally, without escaping the enclosing scope. No source migration or saved-format change is needed.

Every tuplet scope multiplies exact rational duration by M/N; nested scales and legacy per-event ratios multiply. All notes/chords/rests inside inherit the scale, mixed durations are legal, and group cardinality is not inferred/enforced. Track Maker writes adjacent matching settings as groups with articulation outermost, allowing a connected phrase to cross tuplet-ratio changes. Reference and autocomplete write new blank block shells. `eighth` aliases `8th`. Bare named-quality symbols (Gmaj7, Fm@3) use the existing registry/default octave/hover expansion; numeric-looking pitch tokens remain pitches, so C9 stays an octave error and numeric chord qualities require chord:.

The editable bundled demo remains EXAMPLE_SCORE in src/core/project.ts, now using grouped articulation/tuplets with unchanged 25-quarter-beat aligned tracks and meter map. Existing saved songs are retained until explicit undoable Load demo. Shared voice factories, phase/A-B clock, owned copies, measured latency, WAV resource bounds and finite tails/Stop remain. True shared-envelope slurs, glide, general modularity and manual device/listening gates stay open.

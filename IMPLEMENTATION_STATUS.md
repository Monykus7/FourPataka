# FourPataka implementation status

Updated: 2026-10-05. Latest verified release: v0.19.3. Earlier milestone entries retain their historical verification results.

## Milestone checkpoints

New implementation milestones aim for eight focused version-control commits, per the latest request. Earlier milestones used a minimum of four. Commits use the configured Monykus7 identity and are pushed to `https://github.com/Monykus7/FourPataka.git` as checkpoints are completed.

### Audio foundation (roadmap stage 0)

1. React/TypeScript/Vite scaffold and application identity.
2. Pitch math, finite Fourier presets, polarity, effective coefficients, and unit proofs.
3. Web Audio voices, envelope, bounded scheduling, monitor/mix separation, and cleanup.
4. Browser audio proofs for absolute gain, triangle signs, undertone enable, Nyquist, short attack/note-off, repeated audition, and Stop.

The numeric source/cleanup gate passes in installed desktop Chrome. Listening for perceptual clicks, real device latency, and practical mobile polyphony still requires physical device checks. Default cap: 32 simultaneous note voices, including releasing voices; up to five additional undertone oscillators per voice, allocated only when active/nonzero.

### Playable project and editor (roadmap stage 1)

1. Parser, exact beats, parallel track source maps, grammar diagnostics, and command example tests.
2. Independent project/preset state, parser-aware application, versioned autosave/import schema, and isolation tests.
3. Grouped history and whole-operation undo/redo tests.
4. CodeMirror integration, highlighting, completion preference, diagnostics, and running source decorations.

The browser workflow creates a sound, saves it, applies it to a score, plays it, refreshes it, and imports/exports JSON. Library edits leave applied track copies intact. Invalid imports preserve the current project; valid imports can be undone.

### Instrument tools and connected studio (selected stage 2 tools, plus early composition/learning views)

1. Source waveform/spectrum and linked partial selection.
2. Connected workbench, A/B sounds, solo, macros, composition/timeline, transport, storage, and experiments.
3. Responsive palette, accessible inputs/switches, numeric/keyboard controls, and reduced motion.
4. Browser workflow verification, screenshot review, and implementation/run documentation.

Both A/B sides replay the same note/chord/selected score phrase from the beginning, with a fresh source path. Pedal snapshots follow the pedalboard implementation. Macros are calculated from a captured baseline; reset recovers it, and manual coefficient edits capture a fresh baseline. Experiment loading is undoable.

### Navigation and visual design follow-up

1. Bundled local fonts and generated material asset.
2. Two primary views with a smaller secondary Learn link.
3. Visual styling followed by the requested return to the original dark palette, flat panels, and very faint panel texture.
4. Browser navigation, mobile overflow, and screenshot verification. Later copy cleanup removes slogans and roadmap labels from the interface.

### Composition tools follow-up

1. Parser closing-brace source spans and score-tool helpers with unit verification.
2. Visual note/chord/rest track maker with validated preview and whole-operation undo.
3. Command-reference insertion with selected-track targeting and nonduplicating global directives.
4. Browser validation, undo/redo, insertion, and playback guard checks.

### Desktop application foundation

1. Electron shell, local asset protocol, sandboxed renderer, and narrow preload bridge.
2. Native JSON project dialogs and application menus/shortcuts.
3. Development runner and portable Windows x64 packaging.
4. Automated startup, audio, menu, native project, and isolation checks, with run documentation.

The portable Windows executable is generated under `release/` and ignored by Git. Desktop and browser autosaves are separate; JSON carries projects between them. The desktop release is a personal prototype, with no updater or code signing yet.

### Phrase comparison and linked instrument tools (stage 2 completion)

1. Shared musical-material model, phrase clipping/isolation, persistence, and old-project migration.
2. Frozen phrase scheduling and phase-aligned live voice updates, with rendered-audio proofs.
3. Connected note/chord/phrase controls, both copy directions, replay/progress, and keyboard-accessible spectrum links with waveform contributions.
4. Rapid-edit/undertone/solo proofs, complete regression checks, Windows v0.3.0 packaging, and usage documentation.

A/B switching replays from the start; editing a coefficient keeps the running envelope and musical clock. Phrase selection is independent of both sound snapshots. Graphs display the first sounding note as a labeled reference, rather than pretending to show all simultaneous pitches. Score playback and phrase musical material remain frozen until replay.

## Verification

- `npm test`: 67 tests pass across pitch/coefficient math, notation grammar, independent copies, import validation, undo, source-preserving score tools, phrase clipping/isolation, and backward-compatible comparison material.
- `npm run test:browser`: all 18 tests pass. These cover phrase replay, persistence, live-edit clock continuity, keyboard microscope links, phase-aligned edit boundaries, rapid overlapping crossfades, and live undertone/solo changes alongside the earlier audio/studio workflows.
- `npm run test:desktop`: 2 tests pass against the packaged v0.3.0 executable at `release/win-unpacked/FourPataka.exe`, covering local asset startup, renderer isolation, note/phrase audio, A/B selection, menu tools, native JSON round trip, cancellation, and oversized save rejection. Tests use hidden windows and disposable project storage; visual checks use browser screenshots because hidden Electron window screenshots proved unreliable. Windows sandbox execution required running these checks outside the agent sandbox; the application renderer itself remains sandboxed.
- `npm run desktop:package`: creates `release/FourPataka-0.3.0-win-x64.exe` with bundled assets and no server dependency. ZIP compression keeps personal build iterations shorter.
- `npm run build`: TypeScript and production bundle pass. The score editor is loaded as a separate chunk.
- Screenshot inspection: instrument and Compose at 1440 px, instrument at 390 px. At narrow widths the mixer scrolls within its panel without causing page overflow.
- Keyboard smoke check: harmonic range arrows; undo; visible focus; dialog controls. Broader screen-reader and real touch-device checks remain pending.

## Next roadmap work

Compose layout follow-up is implemented and verified in v0.14.1: command reference now sits beside the score; timeline and independent track/master controls sit below. The editor fills its panel through the status bar and has a larger desktop minimum. Fourteen affected browser workflows pass; desktop/tablet/390 px geometry and screenshots confirm reading order, bounded editor scrolling and no page overflow. The v0.18.1 UI correction below adds a compact reference scroller with search kept outside it, plus visible waveform keyboard guidance. These layout corrections do not advance a music-feature roadmap gate.

The physical pedalboard implements equipment-menu placement, a four-column/two-row Velcro grid, compact dials, a selected-pedal inspector and real mouse/keyboard patch routing. Positions and cables are saved independently in presets and A/B/track/master copies. Placement is nonmusical; routing changes during playback wait for replay. Delay is implemented in the v0.13.0 work below; the surrounding frontend overhaul remains separate work.

Stage 2's phrase comparison and linked source microscope behavior pass the automated functional gate. Physical listening for clicks and real-device checks remain pending. Stage 3 now has compressor/overdrive/EQ/delay, independent track/master routing, pedal-aware A/B snapshots and chain-aware score directives in v0.14.0. Automated routing/copy/tail behavior is covered. The complete contextual command-reference item is implemented in the v0.15.0 work below. The local-save recovery functional item is implemented in v0.17.0. The v0.18.0 work below adds keyboard source/board/timeline editing and an end-to-end Tab-order demonstration. Complete the remaining manual screen-reader, physical-listening and real-device/browser gates before declaring stage 5 fully closed. WAV export is implemented in v0.19.0; the stage 7 learning/measurement panel is the next main feature. Preserve compressor alignment, delay bypass/tail policy, topology revision policy, and hard Stop cleanup. Chord-symbol macros and the wider frontend overhaul remain later work.

Phaser, chorus and algorithmic reverb pedals are planned, not implemented. Section 7 of BUILD_PLAN.md defines proposed controls and a phaser → chorus → reverb sequence for later stage 8 pedal expansion, with explicit modulation phase, bounded feedback, latency, bypass/tails/Stop, independent-copy, keyboard/native and WAV proof gates. Reverb needs no IR files and remains a separate track/master space effect from the instrument builder's tiny chamber. Current stage 7 learning/measurement remains the next main feature; adding these plans does not close a gate.

Chord-symbol macros such as `chord:Cmaj13#11`, with hover/focus expanded-note previews, are in the later music IDE backlog. Main comparison and pedal features have priority.

Instrument-builder acoustics is now planned, not implemented: an optional algorithmic "tiny room" representing the instrument's chamber, without IR files. Proposed controls are enable/reset, wet/dry, chamber size, decay and damping/body tone. Settings will belong to instrument presets and independent track/A/B copies, with the chamber before track pedals. Section 5 of `BUILD_PLAN.md` defines future dry-identity, stable feedback, continuous comparison, finite tails/Stop, persistence and offline/export gates. This stage 8 follow-up does not advance current release gates; current audio behavior is unchanged.

Up to 32 signed harmonics is also planned, not implemented. The current application still has a 16-harmonic bank and a separate 32-voice polyphony limit. The later Instrument update will expose H17–H32 in a second bank, preserve existing coefficients by zero-padding legacy sounds, and update waveform projection, presets/macros, synthesis, inspection and storage together. Nyquist filtering still limits playable upper harmonics by pitch/sample rate. Piano/brass-inspired sounds motivate the expansion, while per-partial envelopes, dynamic brightness, inharmonicity and chamber acoustics remain separate realism work. Section 5 defines future compatibility, continuity, copy, projection and performance gates; current main-feature/WAV priorities are unchanged.

Stage 4/5 completion still needs deeper accessibility work and end-to-end browser/device verification; the recovery inspection/export/restore workflow is implemented in v0.17.0. Stage 6 WAV/offline export is implemented in v0.19.0. The current source descriptors/experiments are an early subset of stage 7, not its complete output measurement panel.

### Contextual command reference (v0.15.0)

Eleven shared command definitions now include syntax, restrictions, placement scope and groups. The reference shows selected saved instrument/pedal keys and a unique new-track preview, supports category and multi-term syntax/rule/key search, and exposes keyboard-readable details plus explicit destinations and disabled-action reasons. The new `using` card updates a track's instrument key while retaining comments, notes and pedal routing; reconciliation owns the independent preset copy. Empty scores allow project directives and first-track creation without offering unusable track actions. Playback/diagnostic guards still allow documentation reading. Instrument and pedal completions show only their own library keys, with shared syntax/rules in completion help. Native menu navigation focuses command search after React commits, independent of animation-frame throttling. Controls remain visibly separate from score commands.

Validation: 131 unit checks and all 81 browser workflows pass, including five new reference workflows. Five focused browser checks also pass after the final footer correction. All nine native workflows have passing coverage across the full run and a final four-workflow rerun of reference/save/reload, EQ/version/save, equipment drag/patch and local-assets/isolation/audio/menus. The old hard-coded package-version assertion now reads the JSON manifest with the required Node import attribute. Production TypeScript/bundle, formatting, knowledge build/check and Windows portable packaging pass. Desktop geometry at 1440 px and narrow-screen overflow at 390 px are verified. `release/FourPataka-0.15.0-win-x64.exe` was opened visibly; its extracted app.asar SHA-256 matches the final native-tested bundle. Physical listening and broader real-device/accessibility gates remain pending. Other stage 4/5 gates remain open. No harmonic capacity, acoustics or audio-routing changes are included.

### Interactive Fourier workspace (v0.4.0)

1. Sampled half-cycle Fourier projection with signed-coefficient recovery and numeric unit proofs.
2. Switchable waveform/harmonics workspace, drawn-target overlay, and reconstructed source curve.
3. Live A/B integration, compact reciprocal previews, independent saved sound copies, and grouped stroke history.
4. Browser and packaged Windows regression checks, usage documentation, and v0.4.0 portable build.

The waveform editor intentionally fits the existing 16 signed sine coefficients. Users draw a half-cycle; odd reflection supplies the second half. It excludes arbitrary phase/cosine terms, DC offset, undertones, trim, envelope, and Nyquist filtering from the editable curve. The playback engine still applies these existing source/output rules separately. Source waveform and spectrum microscope views remain available below.

Validation: 69 unit tests, 19 browser tests, and 2 packaged desktop tests; production build and formatting checks pass. Browser coverage verifies drawing changes coefficients, one-stroke undo/redo, A/B isolation, autosave/reload, switching, and narrow-screen layout. Desktop coverage also draws a waveform before exercising audio and native project dialogs. Packaged output: `release/FourPataka-0.4.0-win-x64.exe`.

### Point waveform editor and reset (v0.5.0)

1. Shape-preserving cubic interpolation for 3–32 half-cycle anchors, optional saved point geometry, and harmonic-only sine reset.
2. Default Dots mode with click-to-add, draggable anchors, exact position/amplitude inputs, keyboard arrows/Delete, removal, plus the existing Draw tool. Coral target, pink dots, and signed/alternating harmonic accents extend the original palette.
3. Browser and numeric regression proofs for interpolation, grouped drags, reset/undo, A/B, refresh, narrow layouts, geometry import validation, and stale-geometry cleanup after harmonic edits.
4. Usage documentation and v0.5.0 portable desktop packaging and verification.

The point curve is sampled, then projected onto the first sixteen signed sine harmonics. This is a finite sine-series approximation, rather than a polynomial transform of degree sixteen. Half-cycle zero endpoints and odd reflection still match the current synthesis model. Geometry is an optional Sound field within project schema version 1; older files remain valid. Reset preserves undertones, attack/release, and trim. Editable target curves and coefficients remain separate so truncation/limiting differences are visible.

Validation: 73 unit tests, 20 browser tests, and 2 packaged desktop tests pass, with production build and formatting checks. Windows output: `release/FourPataka-0.5.0-win-x64.exe`.

### First pedalboard slice (v0.6.0, roadmap stage 3 in progress)

1. Independent processing state for A/B audition, per-track and master instances; chain library and backward-compatible project migration.
2. Compressor/overdrive factories with runtime impulse latency calibration, identity-ratio path, matched oversampling dry/wet branches, smooth parameters/bypass, track compensation, and Stop disposal.
3. Ordered visible pedal modules with drag/keyboard reorder, numeric sliders, presets, Apply/Apply associated destinations, Compose bypass controls, A/B chain copies, and live processed signal views.
4. Browser/native regression proofs, usage notes, Windows v0.6.0 packaging, and automatic application launch after the verified release.

This completes the first two-effect feature slice, not all of stage 3. EQ, delay/feedback and delay-specific feed/tail bypass, score `through`/master chain directives, and the full tail gate remain next. Chord-symbol macros remain queued after core pedal work. Track/master graphs are independent; settings are copied without sharing processor state. Score parameters are frozen while bypass stays live. Order/preset/topology edits are pending until replay. Runtime latency calibration covers the native compressor and overdrive oversampling at the current sample rate. The audio proof checks 48/44.1 kHz compressor unity, linear dry/wet blend, overdrive bypass peaks above 1, isolated graphs, hard Stop, opposite-source cancellation through compensated track paths, frozen score parameters, and live bypass. Native testing covers pedal loading/audio/processed waveform as well as waveform editing and native project dialogs.

Validation: 76 unit tests, 25 browser checks (24 in the full run, followed by the corrected standalone two-track timing fixture), 2 packaged desktop checks, production build and formatting checks pass. Output: `release/FourPataka-0.6.0-win-x64.exe`. The portable app launches after release verification and checkpoint push, per the user's continuing instruction.


### Continuous comparison follow-up (v0.7.0)

1. Stable audition source bus and aligned, warmed A/B chain crossfades.
2. Live comparison-track selector, temporary score sound overrides, and continuous A/B UI.
3. Browser audio proofs for rapid switching, future notes, selected-track isolation, target restoration, and Stop cleanup.
4. Updated behavior contract and usage documentation.

All eight comparison browser checks pass. A/B switching now keeps the current position; explicit replay restarts it. This supersedes the restart behavior recorded in earlier milestone entries. Score text and saved track instances remain frozen during playback; only an explicitly selected comparison track receives a temporary sound override.

### Theme presets and release verification (v0.7.0)

1. Bundled Happy Hues 12 (blue/pink/dark), 10 (green/orange), and 6 (violet/coral), plus the supplied Earth / sage palette and original theme.
2. Saved local theme selector, five-color swatches, palette-aware score editor, graphs, pedal accents, transport, and mobile controls.
3. Contrast checks and browser/native proofs for theme persistence, unchanged undo history, continued audio, and exact custom colors.
4. Usage/source documentation and verified Windows v0.7.0 packaging.

Themes use tertiary colors for waveform dots, processed spectra, overdrive accents, harmonic highlights, timeline events, and score durations. Text shades adapt to maintain 4.5:1 contrast on each studio surface. Original remains the default; preferences are separate from projects and survive imports without affecting musical undo.

Validation: 78 unit tests, 30 browser tests, and 2 packaged desktop tests pass. Production build and formatting pass. Output: `release/FourPataka-0.7.0-win-x64.exe`. This release has four continuous-comparison checkpoints and four theme/release checkpoints, pushed using the configured Monykus7 identity. The verified portable application is launched after the release checkpoint.

The main feature roadmap remains at stage 3 in progress: EQ, delay, delay-tail policies, and score chain directives are still next. These comparison and theme improvements do not complete those remaining gates.

### Dedicated cable-connected pedalboard (v0.8.0)

1. Equal primary Instrument/Pedalboard/Compose navigation, secondary Learn, direct Compose track/master editing links, and native Ctrl+3 menu navigation.
2. Serial input/output terminals, jack sockets and patch cables following real pedal order; dial indicators with exact values/sliders, status LEDs, and keyboard-accessible bypass footswitches.
3. Cable/order, empty/maximum chains, keyboard bypass/undo, destination isolation, tab playback continuity, responsive layouts, and native menu regression coverage. Pending status is scoped to the selected path, with cable animation paused for edited connections awaiting replay. Playback tests use longer phrases and readiness checks to tolerate slower UI execution.
4. Usage/build-plan documentation and Windows v0.8.0 packaging and release checks.

The dedicated view preserves the existing independent audition A/B, track and master chains, preset Save/Save as new/Apply actions, and processed output graphs. Cables represent serial connections managed by the pedal order; adding/removing/reordering modules updates the visual path. Desktop racks scroll internally for longer chains. Narrow screens stack modules with vertical cables. Source synthesis remains in Instrument, and view changes keep the running audio session.

This UI milestone does not complete roadmap stage 3: EQ, delay/tail behavior and score chain directives remain next.

Validation for v0.8.0: 78 unit tests, all 32 browser tests, and 2 packaged desktop tests pass. The initial browser run exposed short-playback fixture assumptions and one overall UI timeout; longer phrases, audio readiness polling and a bounded 60-second browser test timeout resolve these without changing musical playback behavior. Desktop tests use a bounded 90-second timeout and verify the Pedalboard menu, connected cable view, processed audio, continuous A/B, saved themes and native project dialogs. Production build, formatting, and desktop packaging pass. Output: `release/FourPataka-0.8.0-win-x64.exe`. Four focused checkpoints are pushed using the configured Monykus7 identity, and the verified portable app is launched after the release checkpoint.

### Composition timing and source controls (v0.9.0)

1. Project meter model, parser diagnostics, and quarter-note timing proofs.
2. Exact source spans and validated tempo/time directive edits retaining whitespace/comments.
3. Meter-aware timeline bars/pulses, partial measures and bounded grid density.
4. Common/custom time-signature and tempo controls, combined undo, frozen transport timing.
5. Per-track instrument assignments preserving independent copies, mix levels and pedal chains.
6. Track maker meter preview, button-based event reordering, time-signature completion and reference values.
7. Browser/native regression coverage for timing, source authority, undo/reload, invalid meter, frozen playback and narrow layouts.
8. Documentation, v0.9.0 release metadata, portable packaging verification and application launch.

Meters are global per project: numerator 1–32, denominator 1/2/4/8/16. Tempo and all scheduled event durations remain quarter-note units. Old scores retain default 4/4 without project-schema migration. Notes crossing bars and incomplete final bars remain valid. UI timing changes are one source-authoritative undo step; invalid scores and score playback guard timing and assignment controls. Event inspection reads the current compiled revision, including the frozen playing revision.

This advances stage 4 composition tools. Stage 3 still needs EQ, delay/tail policies and chain-aware score directives; the pedal-aware command catalog depends on those. Chord-symbol macros and WAV export remain later work.

Validation for v0.9.0: 100 unit tests, all 36 browser tests, and 3 packaged desktop tests pass. TypeScript/production build and formatting pass. Browser checks cover custom 11/16, 6/8 bar positions, source comments, timing undo/redo, persistence, instrument assignments, invalid meter guards, frozen playback timing, meter completion/preferences and mobile event reordering. Desktop checks target the freshly packaged Windows executable and cover the new Compose controls alongside audio, menu actions, renderer isolation and native project file operations. Desktop and 390 px browser layouts were visually checked. Output: `release/FourPataka-0.9.0-win-x64.exe`. Eight focused commits are pushed under Monykus7; the verified portable application is launched after the release checkpoint.

### Interactive pedal dials (v0.10.0)

1. Continuous angular motion, center dead zone, parameter bounds and step rounding with unit proofs.
2. Captured circular mouse/touch gestures without an initial value jump.
3. Accessible slider roles/values, screen-reader instructions and precise/coarse keyboard controls.
4. Live pedal parameter integration, synchronized indicator/slider/exact input, visible focus, touch scroll suppression and whole-gesture undo.
5. Browser proof of outside-dial capture, angle-seam continuity, endpoints, immediate reversal and separate gesture history.
6. Real Chromium touch input, canceled-gesture cleanup, A/B isolation and persisted values at 390 px.
7. Packaged desktop dial checks, usage instructions and stronger ink fallback for the existing local Earth surface edit. The pre-existing palette mapping edit remains separate from this milestone.
8. Verified v0.10.0 metadata, Windows portable packaging, eight pushed checkpoints and application launch.

Pedal circles now turn clockwise/counterclockwise and use the same parameter update path as the existing sliders. One drag is one undo step, including pauses exceeding ordinary edit grouping. New gestures create separate history groups. Pointer cancellation/lost capture clears the drag. Grabbing at the center waits for a stable angle. Arrow keys step once; Page Up/Down step ten times; Home/End select bounds. Numeric inputs and linear sliders remain available. Score parameter edits still take effect on replay; audition parameters stay live.

Validation for v0.10.0: 106 unit tests, all 40 browser tests and 4 packaged desktop tests pass. The initial unit run found the existing local Earth surface contrast regression; stronger fallback ink fixes it, with a custom-surface proof and both theme browser checks repeated successfully. Circular drag checks cover no initial jump, pointer capture outside the circle, angular seam crossings, clamped limits, immediate reversal, pauses within one undo gesture, keyboard precision, touch cancellation, scrolling, persistence and independent A/B values. Native checks run against the freshly packaged executable. Production build, formatting and portable packaging pass. Output: `release/FourPataka-0.10.0-win-x64.exe`. Eight focused checkpoints are pushed under Monykus7 and the verified portable app is launched after the release checkpoint. The pre-existing Earth palette mapping edit remains uncommitted; its colors are preserved in this local build.

### Maintained local project knowledge (development tooling, application remains v0.10.0)

1. Architecture, feature hierarchy, source-linked decisions and retrieval behavior contract.
2. Tree-sitter WASM extraction of symbols, imports, references and Markdown sections.
3. Code/document/plan edges, content-hashed parser caches and deleted-source cleanup.
4. Hierarchical feature/dependency summaries, bounded neighborhoods and personalized PageRank.
5. Pinned local MiniLM embeddings for semantic seeds and exact complete-context token packing.
6. Build/check/query/watch commands, incremental vectors and offline semantic verification.
7. Dense-code comments explaining phase rotation, interpolation, latency alignment, snapshot ownership and whole-gesture history.
8. Persistent maintenance rules, precise feature citations, cache-refresh tests and the generated project map.

The [project map](docs/knowledge/PROJECT_MAP.md) connects implemented features and remaining work to source files and representative symbols. Project/domain/feature summaries are maintained editorially; dependency communities are generated from connected imports within each feature. This uses GraphRAG-style hierarchy without claiming automatic Leiden clustering or LLM-generated summaries. Semantic retrieval reserves both feature concepts and concrete sources before graph ranking. The requested budget includes all emitted context text, task, signatures and citations using `cl100k_base`.

`npm run knowledge:build` regenerates documentation; `knowledge:check` detects stale maps. The optional watcher updates derived artifacts during editing. Root `AGENTS.md` and the compatible editor rule require summaries, decisions and the map to stay current with future changes. Model/vector/graph caches remain ignored, inference runs locally, and repository text is not uploaded. The public model download is explicit and pinned. See [usage](docs/knowledge/USAGE.md) and [architecture](docs/knowledge/ARCHITECTURE.md). Syntax-recovery warnings remain visible in the map and do not replace TypeScript validation.

Validation: all 9 knowledge unit checks pass, including changed/deleted source caches, alias resolution, PageRank mass, hierarchy, Unicode token budgets and watcher exclusions. Offline semantic verification passes for pedals, comparison, timing and waveform tasks at 256/1,024/2,048-token budgets with every network fetch blocked. Production TypeScript/Vite build and formatting pass. The full unit run has 114 passes and one Earth theme contrast failure caused by the separate, uncommitted palette edit; that edit is preserved outside these tooling checkpoints. Browser/native application tests were not repeated for documentation/tooling and comment-only app changes. Eight focused checkpoints use the configured Monykus7 identity and primary remote branch; this is not an application release.

### Three-band EQ (v0.11.0)

1. Flat EQ defaults, shared ranges, validated imports and independent copied state.
2. Three-filter audio factory, actual frequency-response proofs, neutral dry/wet/bypass and latency metadata.
3. Connected pedal module, rotary/numeric controls, cable names, palette accents and keyboard ordering.
4. One-operation flat reset retaining identity, position and bypass state.
5. Saved presets, independent A/B/track/master copies, associated Apply and a full mobile rack.
6. Live audition, continuous A/B, frozen/replayed score values, mixed-chain alignment and real analyser Stop cleanup.
7. v0.11.0 metadata and packaged EQ/native-save regression coverage.
8. Full browser/native verification, portable packaging, maintained documentation, eighth pushed checkpoint and automatic application launch.

The selected next feature is EQ, released before delay. Low/mid/high gains support −12…+12 dB with 0.5 dB steps; mid center supports 150…4000 Hz. Fixed shelves are 200 Hz / 4 kHz and mid Q is 1. Output trim and linear mix follow the existing pedal contract. The effect starts flat; Reset to flat restores all parameters as one undo operation and retains its ID, placement and bypass. EQ works in the cable rack, saved chain presets and independent audition A/B, track and master instances. Live audition, frozen score parameters, live bypass, pending topology edits and continuous A/B retain their existing semantics.

EQ uses fresh BiquadFilterNodes for each instance, clamps frequencies below Nyquist, adds no scheduling/look-ahead latency, smooths parameter changes and allows 100 ms of filter decay after note release. Tests cover flat gain/mix identity, actual low/mid/high response at 48/44.1 kHz, linear blend, bypass, 8 kHz bounded frequencies, independent stereo graphs, mixed compressor/EQ track compensation, frozen versus replayed parameters, live A/B clock continuity and real analyser silence after Stop. UI checks cover rotary keyboard values, numeric bounds, ordering/undo, complete flat reset, independent presets, persistence and the eight-module 390 px rack.

Validation for v0.11.0: all 48 browser checks and 5 packaged desktop checks pass. This includes all eight EQ checks, the previous waveform/composition/pedal regression suite, native EQ keyboard/reset/save/persistence and bundled version verification. Unit checks have 115 passes and the same one pre-existing Earth surface contrast failure (3.381:1 against the 4.5:1 gate); the user's separate palette edit remains untouched and uncommitted, and is present in this local build. Production TypeScript/Vite build, formatting and portable packaging pass. Desktop and 390 px EQ layouts were visually inspected. The maintained semantic graph retrieves the new EQ feature and decision within its requested 1,024-token budget; map freshness passes. Output: `release/FourPataka-0.11.0-win-x64.exe`. Eight focused checkpoints are pushed under Monykus7 and the verified portable app is launched after the release checkpoint. The roadmap remains stage 3 in progress: delay/feed-tail bypass and score chain directives follow; chord macros and WAV export remain later work.


### Physical grid pedalboard (v0.12.0)

1. Persistent four-column/two-row positions, explicit serial patch cables and validated legacy migration.
2. Audio graph construction from complete cable routes; unplugged output silence and live whole-board bypass.
3. Equipment-menu selection/drag placement, compact pedals, Velcro grid, small dials and selected-pedal exact controls.
4. Captured placement previews with attached cables, empty-slot snapping, cancellation, removal cleanup and one-step undo.
5. Existing EQ, rotary/touch, preset-copy, bypass, destination and playback checks adapted to equipment and real jacks.
6. Actual routed-ID audition proofs, placement/off-path edit isolation, pending repatching, saved board preset/A/B/master independence and usage documentation.
7. v0.12.0 metadata, native drag placement/mouse patching and project-save board round trips.
8. Complete browser and packaged desktop verification, maintained knowledge, eighth pushed checkpoint and automatic portable launch.

The board is a serial patching surface with up to eight pedals. Equipment selection does not immediately add a pedal. Placement and movement affect saved positions; cables determine audio order. Mouse drag or click/keyboard jack pairs replace occupied connections; cable selection/disconnection is undoable and feedback loops are rejected. Existing chains load prewired. Removing a pedal leaves its former route unplugged. During playback, repatching waits for replay, while placement remains live without a musical change; explicit A/B retains continuous warmed transitions. Compact dials share the inspector's exact values/sliders and existing grouped history. Surface, controller, controls and styles remain separate for the coming frontend overhaul.

Validation for v0.12.0: all 119 unit checks and all 56 browser checks pass. All six packaged desktop checks are verified against the new Windows executable: four passed in the complete run, and the two native mouse checks passed after centering their coordinate targets above the fixed transport in Windows' constrained work-area viewport. Native coverage includes actual equipment drag/drop and captured cable patching, precise rotary control, EQ reset, saved positions/cables, local renderer isolation, native dialogs, audio, comparison and composition. TypeScript/production build, formatting and portable packaging pass. Desktop and 390 px layouts were visually reviewed. Local semantic retrieval returns the updated board concept and source citations within its 1,024-token budget; map freshness passes. The separate local Earth palette edit is preserved outside these commits; the current working palette passes unit contrast checks. Output: `release/FourPataka-0.12.0-win-x64.exe`. Eight focused commits use Monykus7 and are pushed to the primary master branch. Delay and its tail/bypass policy follow, then chain score directives; chord-symbol macros, WAV export and the broader frontend overhaul remain planned.


### Equipment drag placement correction (v0.12.1)

The user reported equipment dragging failing. The open menu covered the first slot and intercepted its drop. The earlier native proof targeted the second slot and missed this overlap. The menu now stops painting and hit testing after the next animation frame, retaining the native drag source until completion. Delaying the hide allows Chromium to capture a valid drag image. Drop, cancellation, Escape and unmount clear any pending frame and temporary tool state. Real mouse gestures cover each pedal kind in the first slot, canceled drags and occupied-slot rejection followed by a valid drag.

Validation: all 119 unit checks, 21 focused browser checks (board, EQ and pedalboard), and all six packaged desktop checks pass. The native equipment gesture targets the first slot and patches its audio path with the mouse. TypeScript/production build, formatting, portable packaging and knowledge-map freshness pass. The full browser suite was verified for v0.12.0; this patch reran the affected workflows. Output: `release/FourPataka-0.12.1-win-x64.exe`. The separate local Earth palette edit remains outside the patch commits.

### Delay and echo-tail lifecycle (v0.13.0)

Delay joins Equipment placement, compact rotary dials, exact/sliders inspection, patch cables, preset saving and independent A/B/track/master copies. Controls: time 20–2000 ms, feedback 0–95%, output −24…+12 dB, mix 0–100%. Defaults: 300 ms / 30% / 0 dB / 35%. Echo time adds no track compensation latency. Separate first-echo and compensated feedback paths maintain repeated timing in Chromium at 44.1/48 kHz, including the shortest time and highest feedback.

Pedal and whole-chain bypass close only the new delay feed, pass new notes dry and retain stored echoes. Loop activity and a one-interval hold drive Tail active indicators on the board, pedal and inspector. Playback includes the finite -60 dB echo allowance after release; live audition edits extend that allowance without truncating older echoes. Score parameters/topology remain frozen until replay; bypass stays live. Stop fades output in 20 ms and disposes all feedback buffers after the fade. Replaying begins fresh. Tempo sync remains planned.

Validation: all 120 unit checks, all 70 browser checks and all seven packaged desktop checks pass. Eight delay browser proofs cover echo cadence, feedback/mix, isolated buffers, both bypass modes, frozen score settings, live cleanup budgets, Stop/replay, independent saved copies, mobile controls and undo; board coverage includes first-slot delay dragging. The native delay workflow covers drag placement, patching, dials, native file save/reload and whole-chain tail status. Its long 95% feedback tail remains observable through native automation delays; hidden test windows disable renderer background throttling for this timing-sensitive proof. The complete packaged suite also verifies EQ, rotary gestures, Compose, isolated local assets, audio and native dialogs. Desktop and 390 px screenshots were reviewed. TypeScript/production build, formatting, Windows portable packaging and knowledge-map freshness pass. Semantic retrieval returns the delay behavior and source citations within its 1,024-token budget. Output: `release/FourPataka-0.13.0-win-x64.exe`. Eight focused checkpoints use Monykus7 and are pushed to the primary master branch. Chain score directives follow this release; chord macros, WAV export and the wider frontend overhaul remain planned.

### Score chain assignments (v0.14.0)

1. Stable pedal score keys and deterministic schema-v1 legacy migration.
2. Parser track `through` and global `master through` directives, diagnostics and exact key spans.
3. Source reconciliation that deep-copies changed assignments and preserves unchanged independent settings.
4. Narrow source edits for track/master assignments, insertion and Track Maker.
5. Compose selectors, separate new-preset score keys and contextual pedal-key autocomplete.
6. Browser/native persistence, undo, command, diagnostic and numeric audio routing proofs.
7. v0.14.0 metadata, current roadmap and maintained feature documentation.
8. Reapplication ownership fix: copied sandbox source markers never replace the destination's reconciliation history.
9. Final verification record and isolated browser/native test output directories.

`track <name> using <instrumentKey> through <pedalKey>` and one global `master through <pedalKey>` apply saved chain templates. Built-in keys: clean, cleanGlue and warmDrive. New templates expose a unique score key. Unknown keys and duplicate/misplaced directives diagnose visibly and block Play without destroying existing settings. Compose selectors, Track Maker and reference cards update source while preserving comments and note bodies. Valid assignment changes load independent copies; unchanged reparsing and library saving retain edited knobs, bypass, positions and cables. Removing a previously applied directive clears its chain; legacy unassigned boards survive. Pedalboard application synchronizes changed preset associations while preserving exact sandbox settings. Reapplying the same preset keeps destination-owned source history. Score text remains editable during playback; the frozen revision keeps its clock/routing until replay. Runtime latency, bypass and tail policies remain unchanged.

Validation: all 127 unit checks and all 76 browser checks pass. All eight packaged desktop workflows are verified: six passed in the full run, and EQ/native-dialog checks passed in a focused rerun after isolating browser output cleanup from native profiles. The final rebuilt package additionally passes the native score-chain save/reload workflow. Earlier shared-output cleanup interrupted active native profiles; browser traces now use `.test-results/browser` and cannot remove `.test-results/desktop`. A restricted Windows development-Electron launch failed its install-folder ACL check; native verification uses the normal Windows process environment, with renderer sandboxing retained. Visual Studio is not required and is kept out of the verification workflow. TypeScript/production build, formatting and portable packaging pass. Desktop and 390 px chain layouts were visually reviewed. Local semantic retrieval returns current chain/copy behavior and source citations within 1,008/1,024 tokens; knowledge build/freshness checks pass. Output: `release/FourPataka-0.14.0-win-x64.exe`. Nine focused checkpoints use Monykus7 and are pushed to primary master. Stage 3's automated functional coverage is complete; broader stage 4/5 reference, accessibility, recovery and demonstration gates, physical listening and real-device/browser checks remain. WAV export follows those gates; chord-symbol macros and the frontend overhaul remain later work.



### Compose layout correction (v0.14.1)

The score and command reference now occupy the top desktop row. Timeline and independent track/master controls sit side by side below, with event inspection after them. DOM order gives narrow screens and keyboard navigation the same sequence: score, reference, timeline, tracks, inspector. Reference cards use two columns; search and destination controls wrap within the sidebar. The desktop editor minimum grows from 430 to 520 px and absorbs extra panel height. The status bar stays at the panel bottom, removing the former empty box underneath it. Size containment keeps long score documents from expanding the grid; CodeMirror scrolls locally. Lower panels use their own content height, avoiding stretched empty timeline space. No musical behavior or roadmap gate changes.

Validation: 14 affected browser workflows pass; the 12 composition/meter/score-chain workflows were rerun after long-document containment and pass. Three packaged desktop checks cover native chain persistence, source-aware Compose controls with undo, local renderer isolation, audio and menu access; they pass against the final rebuilt v0.14.1 assets. Manual geometry and screenshot review cover desktop, 1024 px and 390 px layouts; 880 px also has no page overflow. A 100-event score stays within a locally scrolling editor, and keyboard selection opens the lower event inspector. Dense long-score timeline mouse targets remain composition-polish work. Production build, formatting, portable packaging and knowledge-map freshness pass. The broader unit/audio/browser suite was verified for v0.14.0; this patch reruns the affected workflows. Output: release/FourPataka-0.14.1-win-x64.exe. Six focused patch checkpoints are pushed under Monykus7; the updated portable application is opened for review.

### Harmonic sign controls and distinct Soft bass (v0.16.0)

1. Independent polarity update with coefficient, silent-partial and geometry invariants.
2. Visible +/− buttons, explicit inspector Sign selector, signed coefficient and separate undo.
3. Library/editor thumbnails sampled from actual signed source coefficients.
4. Rounded Soft bass source with quiet even/odd partials and a version-2 factory template.
5. Conservative untouched-factory library migration preserving owned track/A/B sounds.
6. Browser sign/audio/persistence/preset migration and native save/reload regression workflows.
7. v0.16.0 metadata, usage, behavioral decisions and regenerated knowledge map.
8. Packaged application verification, final release record, pushed checkpoint and portable launch.

The former inspector polarity field was read-only. Sign can now be changed directly under each harmonic or explicitly in the selected-partial inspector; magnitude remains independent, including at zero. Each sign edit is one undo operation and affects only the active sound. Existing phase-aligned live voice updates and frozen score playback policies remain in force. Source graphs display the signed coefficient and waveform. Library/editor thumbnails now represent actual signed banks instead of fallback sine icons.

Soft bass now uses positive H1–H6 magnitudes [1, 0.22, 0.1, 0.045, 0.02, 0.009], with higher partials zero, attack 30 ms, release 350 ms and trim −12 dB. Triangle keeps its alternating-sign odd-harmonic 1/h² approximation. Exactly unchanged factory v1 Soft bass library templates upgrade to v2 on loading/import. Customized templates, existing applied tracks and A/B copies retain their sounds. Load Soft bass from the library and Apply explicitly when updating a track. Sixteen harmonics remain implemented; 32 harmonics and instrument acoustics remain planned.

Validation for v0.16.0: all 138 unit checks pass. All 87 browser workflows have passing coverage: 83 passed in the full run, and all four remaining workflows passed in a focused rerun. Recovery/import assertions now target the toast because the signed-coefficient output also has an accessible status role; delay persistence polling waits for the first debounced write instead of throwing on absent storage. Meter completion passed unchanged on rerun after its initial click did not insert. All ten native workflows pass in the full run against the final packaged executable, including harmonic keyboard/sign/undo, independent preset state, Soft bass and native JSON save/reload. Production TypeScript/bundle, formatting, Windows portable packaging and knowledge build/freshness pass. The 1440 px and 390 px sign layouts were visually reviewed; narrow-screen page width remains 390 px. Semantic retrieval returns the new preset/sign/migration behavior within 1,006/1,024 tokens. Output: release/FourPataka-0.16.0-win-x64.exe. The portable application is visibly open and its extracted app.asar SHA-256 matches the bundle verified by native tests. Eight focused checkpoints use Monykus7 and are pushed to origin/master. Physical listening and broader real-device/accessibility gates remain pending. Stage 4/5 gates, WAV export, 32 harmonics and instrument acoustics retain their planned status.

### Local save recovery (v0.17.0)

1. Previous distinct checkpoint preservation across autosave and canonicalized reloads.
2. Independently validated immutable recovery snapshots and robust startup fallback.
3. Keyboard-accessible recovery inspection dialog and responsive preview.
4. Header/notice integration, captured-byte export and one-step stopped restore/undo.
5. Native recovery menu and bounded raw-file export with cancellation/size checks.
6. Browser recovery, exact downloads, captured-copy stability, preferences, reload and focus proofs.
7. v0.17.0 metadata, current roadmap gates, usage, decisions and regenerated knowledge map.
8. Storage-full fallback exposes unarchived latest damaged bytes without another write.
9. Browser/native portable verification, final record, pushed checkpoint and launch.

Recovery exposes the previous distinct autosave and unreadable-save copy with validation, name, UTF-8 size and score preview. Valid restoration stops audio and restores owned project state as one undo step; settings outside the project remain separate. Invalid copies cannot restore and can be exported with original contents. Capturing bytes on dialog opening prevents background autosave from changing an inspected/exported copy. Unchanged reloads preserve the previous checkpoint. Startup recovery still reads a valid backup when archiving fails; damage gets a persistent review notice. The native File menu/shortcut opens the panel, and a narrow origin-checked bridge exports raw text through the user's save dialog with a 10 MB bound. Current project JSON retains its 2 MB validation boundary.

Validation for v0.17.0: all 145 unit checks pass. All 92 browser workflows have passing coverage: the full 91-workflow suite passed before the archival-failure refinement, then all six affected recovery/persistence workflows passed against the final behavior, including the additional full-storage export case. All eleven native workflows passed against the first packaged v0.17.0 bundle. The final rebuilt portable bundle additionally passes recovery/exact native export/undo/reload, local assets/renderer isolation/audio/menus and native project dialogs with cancellation/size checks. Browser proofs cover captured-copy stability, original Unicode bytes, independent sounds/processing, separate preferences, stopped playback on restoration, Escape/focus, unchanged reload checkpoint preservation and the 390 px dialog. Desktop 1440 px and narrow-screen layouts were visually reviewed. Production TypeScript/bundle, formatting, knowledge build/freshness and portable packaging pass. Semantic retrieval returns recovery/checkpoint/source authority within 1,023/1,024 tokens. Output: release/FourPataka-0.17.0-win-x64.exe. The portable app is visibly open; its extracted app.asar SHA-256 matches the final native-tested bundle. Nine focused checkpoints use Monykus7 and are pushed to origin/master. Only the local-save recovery functional item closes: broader keyboard/accessibility, end-to-end demonstration and physical device/browser/listening gates remain open before WAV export. Thirty-two harmonics, instrument acoustics and chord-symbol macros remain later work.

### Keyboard studio workflow and dense timeline — v0.18.0

1. Keyboard Add dot samples the current target curve in the widest gap, retains endpoint/spacing/30-dot bounds and adds one independent undo step. Exact values and existing arrows/Delete edit anchors; deletion restores focus to the previous dot. Space/Enter selection no longer invokes global playback.
2. Equipment supports wrapping arrows, Home/End, disabled-item skipping and Tab exit. Keyboard selection focuses a free slot or board input output jack; placement focuses the new pedal. Escape/Cancel return to Equipment without stopping audio. Existing pointer drag-image capture remains intact.
3. Named save-instrument and Track Maker dialogs explicitly focus the first field and restore trigger focus on Escape, close and successful submission. Errors keep the form open.
4. Timeline offers readable per-track event pickers and Previous/Next. One note Tab stop per track supports bounded arrows and Home/End. Accessible timing descriptions and a selected-event announcement expose bars/beats/rests/duration without hovering. Dense marks retain positive width. Inspection uses the displayed frozen revision and never seeks, modifies source or adds musical history.
5. Shared browser/native demonstration traverses the actual Tab order through waveform editing, independent A/B, instrument saving, Track Maker, EQ placement/patching/exact values, source-aware chain application, play/replay/Stop, JSON saving and reload. Broader screen-reader, physical-device/browser and listening checks remain open; WAV export is the next main feature, with 32 harmonics/acoustics/chord symbols still later.

Validation for v0.18.0: all 146 unit checks pass. All 98 browser workflows have passing coverage: 95 passed in the full run, and both existing EQ audio proofs plus the dense timeline workflow passed in a focused rerun. The EQ proofs sampled silence during the concurrent browser/native run and pass unchanged separately. The long-score fixture now uses CodeMirror's Select All rather than DOM fill, which can replace only virtualized rendered lines; it verifies the authoritative saved document before checking frozen playback. All five affected timeline/meter workflows pass against that final fixture. The full browser run also passes the actual Tab-order demonstration and all new dot/menu/modal checks. All twelve native workflows pass in the full run against the packaged v0.18.0 executable, including the shared keyboard demonstration, native JSON, independent A/B/track/master processing, menus/audio and renderer isolation. Desktop 1440 px and narrow 390 px timeline layouts were visually reviewed without page overflow. Production TypeScript/bundle, formatting, knowledge build/freshness and portable packaging pass. Semantic retrieval returns the new keyboard/source/inspection decisions within 1,013/1,024 tokens. Output: release/FourPataka-0.18.0-win-x64.exe. The portable studio is visibly open and its extracted app.asar SHA-256 matches the final native-tested bundle. Eight focused checkpoints use Monykus7 and are pushed to origin/master. The automated main-workflow demonstration closes; broader assistive-technology, physical-device/browser and listening gates remain open before stage 5 is declared fully complete. WAV export is next main-feature work; 32 harmonics, acoustics and chord symbols remain later.

### Waveform discoverability and compact reference — v0.18.1

Add dot now sits beside Dots/Draw instead of below the graph. A visible key guide directly above the editable Dots graph shows Tab, Left/Right position, Up/Down amplitude and Delete; focused dots expose its actual instructions as their accessible description. Existing drawing, exact inputs, dot limits, reset, undo and independent copies remain intact.

Command reference caps its total height at 560 px desktop / 460 px narrow screen, around half or less of the expanded catalog's natural height. Search stays outside the named, focusable internal scroller containing destination controls, all cards/rules and the footer. Space scrolls the focused catalog without invoking global Play. Search/category filtering resets catalog scroll while retaining search focus. Source insertion, audio phase/clock/latency, project schema and roadmap gates retain their existing policies.

Validation for v0.18.1: sixteen affected browser workflows pass, including visible/accessibly described key guidance, waveform drawing/dots/reset/undo, bounded reference geometry at 1440/390 px, scrolling, fixed search, filtering, source-aware insertion, composition/meter and the full Tab-order demonstration. Three packaged native workflows pass: the actual Tab-order demonstration with native saving/reload, command-reference menu focus/source insertion/native JSON and local assets/renderer isolation/audio/menu tools. The packaged version is 0.18.1. Waveform guide and compact reference screenshots were visually reviewed at desktop and 390 px widths; the reference is at most 55% of its natural expanded height and neither layout introduces page overflow. Production TypeScript/bundle, formatting, knowledge build/freshness and Windows portable packaging pass. The broader audio/unit/native suites were previously verified for v0.18.0; this UI patch reruns affected workflows. Output: release/FourPataka-0.18.1-win-x64.exe. The portable studio is visibly open and its extracted app.asar SHA-256 matches the native-tested bundle. Four focused patch checkpoints use Monykus7 and are pushed to origin/master. No roadmap gate or musical behavior changes.


### WAV sharing — v0.19.0

Playback and offline export share the applied-score graph, source voices, effect factories, cable routing and measured track latency alignment. Export snapshots source and independently applied sound/processing copies; templates, monitor gain and temporary comparison overrides do not enter the file. Overlap is counted at scheduled note time in both contexts, with 32 admitted voices including releases and a 10 ms retirement fade; old oscillators stop after 15 ms. Retired/ended source nodes disconnect without cutting future scheduled envelopes.

The named, keyboard-accessible Export WAV dialog offers PCM16 at 44.1/48 kHz, mono/stereo (default 48 kHz stereo), a 5 s default tail budget bounded 0–30 s, peak review, −36…0 dB export level and explicit normalization to −1 dBFS. Above-range file levels block Save until adjusted. Score duration includes trailing rests, maximum configured release, measured track/master latency and 100 ms filter settling before the echo budget. Conservative routed-delay decay warns about possible later truncation; capped ends fade over 20 ms and report measured signal at the cap. Silence remains silence. Preflight rejects estimated memory above 256 MiB before large allocation; the estimate includes float/PCM/transfer copies and scheduled node allowance and is not a device RAM guarantee. Native saving validates bounded PCM headers and lengths after origin checks and before the destination dialog. Cancellation retains the ready render; closing while rendering discards its result when background rendering finishes. Export does not stop playback, change saved state or add undo history.

Validation for v0.19.0: all 152 unit checks pass across 21 suites. All 106 current browser workflows have passing coverage: 104 passed in the full regression run; after the final ownership fix, all seven source/cleanup/WAV audio proofs pass, including the two added master-order and retired/silent-voice proofs. Continuous phase editing and processed hard Stop also pass against the final engine. All thirteen native workflows pass in the full run against the final packaged 0.19.0 executable, covering WAV bytes/format/save cancellation/invalid-header rejection, the actual Tab-order demonstration, recovery, sign/preset behavior, independent chain copies, delay tails, EQ, physical equipment/cables/dials, Compose, assets/renderer isolation/audio/menus and JSON round trips. Production TypeScript/bundle, formatting, knowledge build/freshness and Windows portable packaging pass. Desktop and 390 px export dialogs were visually reviewed with bounded scrolling and readable controls. Output: release/FourPataka-0.19.0-win-x64.exe. The portable studio is visibly open; its extracted app.asar SHA-256 matches the native-tested bundle. Nine focused checkpoints use Monykus7 and are pushed to origin/master.

This closes the stage 6 automated WAV functional gate for the tested Chromium/Electron workflows: notes/rest duration, owned instruments, pedal order/master processing, latency compensation, release/echo budgets, explicit levels and monitor exclusion have audio/file proofs. It does not close the earlier stage 5 manual screen-reader, physical-listening or other browser/device gates. Stage 7 learning and richer measurement is the next main feature; 32 harmonics, tiny-chamber acoustics and chord-symbol macros remain later stage 8 work.


### Matched score/reference height — v0.19.1

Expanded command reference follows the score panel height on desktop and when stacked. CSS size containment prevents its catalog from enlarging the desktop row; a scoped border-box ResizeObserver mirrors the score height only for stacked rows. Search remains fixed over the flexing catalog scroller. Collapse returns the reference to its header height, and filtering/rule expansion cannot enlarge the score. Diagnostic changes, status wrapping and viewport resizing are reflected without a desktop height feedback loop. Audio, WAV export, source authority, independent copies, schema/history and roadmap gates keep their existing policies.

Validation for v0.19.1: all seventeen affected browser workflows pass. Five command-reference checks include equal heights at 1440/1000/390 px, score diagnostics, collapse/reopen, filtering, local scrolling, focus and source insertion; the other twelve cover composition, meter, responsive design, the actual Tab-order studio demonstration, named dialogs and WAV download/clipping/normalization controls. Three packaged native workflows pass against version 0.19.1: WAV rendering/saving/cancellation, the actual keyboard demonstration with native save/reload, and command-reference menu focus/insertion/native JSON saving. Desktop and 390 px panel screenshots were visually reviewed after the lazy editor loaded; panel bottoms match, search remains fixed and local scrolling is retained. Production TypeScript/bundle, formatting, knowledge build/freshness and portable packaging pass. v0.19.0's broader 152-unit/106-browser/13-native verification remains historical evidence; this UI patch reruns affected workflows without repeating unchanged DSP suites. Output: release/FourPataka-0.19.1-win-x64.exe. The portable app is visibly open and its extracted app.asar SHA-256 matches the native-tested bundle. Four focused patch checkpoints use Monykus7 and are pushed to origin/master. No musical or roadmap gate changes.


### Balanced timeline/track controls and future pedals — v0.19.2

Desktop Independent track sounds now follows the timeline's natural row height. A fixed heading sits above a named keyboard-focusable internal scroller containing all master/track assignments, levels, bypass/edit links and independent-copy controls. Size containment keeps those controls from enlarging the grid row. Stacked layouts cap the track panel at 440 px. Space on the scroll region scrolls instead of invoking Play; child controls retain their existing key handling. Empty/invalid scores preserve existing copies with source assignments disabled, as before. Timeline inspection, source authority, grouped history, audio phase/clock/latency, WAV behavior and roadmap gates retain existing policies.

Phaser, chorus and algorithmic reverb are added to the future pedal roadmap, not implemented. Section 7 records proposed controls, units/ranges, session-relative LFO continuity, intentional phase/delay versus compensation, stability, independent copies, bypass/tail/Stop and shared WAV/native/keyboard proof gates. Space reverb stays separate from the instrument builder's tiny chamber; neither needs IR assets. Stage 7 learning/measurement is still the next main feature.

Validation for v0.19.2: all eighteen affected browser workflows pass (seventeen in the regression run and the pedal edit-link workflow on rerun after replacing its obsolete direct-child selector). Coverage includes matching desktop heights, bounded 390 px scrolling, keyboard scrolling without Play, lower-track assignment/undo, unchanged saved settings, empty-score disabled copies, timeline inspection, timing, independent chains, pedal links and playback continuity across tabs. Three packaged native workflows pass against version 0.19.2: the full keyboard studio demonstration, independent score chains through native save/reload, and Compose source assignment/timing/undo with the new matching-height and keyboard-scroll checks. Desktop paired-panel and narrow scroller screenshots were visually reviewed. Production TypeScript/bundle, formatting, knowledge build/freshness and portable packaging pass. This patch does not repeat unchanged DSP/unit suites; v0.19.0 retains its historical 152-unit/106-browser/13-native verification. Output: release/FourPataka-0.19.2-win-x64.exe. The portable app is visibly open; its extracted app.asar SHA-256 matches the native-tested bundle. Four focused patch checkpoints use Monykus7 and are pushed to origin/master. Planned pedals remain unimplemented, and no musical or roadmap gate changes.


### Empty autocomplete shells — v0.19.3

Command autocomplete uses separate blank-field templates instead of reference-card examples. Chord completion inserts `chord:()` with the cursor inside, then fields for optional default octave and duration; voicing has notes/duration fields without a default octave. Existing typed `chord:` is included in the replacement span, avoiding duplicate prefixes. Track completion starts with blank name, instrument and event body, and other command arguments/note/comment fields are blank. Tab/Shift+Tab navigates fields. Explicit meter, duration and saved instrument/pedal choices keep inserting the selected value; autocomplete preference disables both shells and value suggestions. Reference examples, source authority, grouped history, parser diagnostics, independent copies and frozen audio/phase/clock/latency policies remain unchanged. Empty shells must be filled before Play; chord-symbol macros remain planned.

Validation for v0.19.3: all ten affected browser workflows pass, including five new shell workflows covering partial/colon chord completion, editable chord/voicing/track/note fields, Tab/Shift+Tab, all command shells, explicit meter/preset selections and the preference switch. Completed user chords preserve surrounding source and compile into the timeline; incomplete shells block Play. Contextual reference previews/source edits, reference/Track Maker chain insertion and instrument/pedal/meter completions also pass. All 33 existing parser, contextual-reference and source-edit unit checks pass. Two native workflows pass against packaged version 0.19.3: chord-shell field navigation to a playable score and Compose timing/instrument/undo. The empty chord shell and visible field markers were visually reviewed in the score panel. Production TypeScript/bundle, formatting, knowledge build/freshness and portable packaging pass. Output: release/FourPataka-0.19.3-win-x64.exe. The portable application is visibly open and its extracted app.asar SHA-256 matches the native-tested bundle. Four focused patch checkpoints use Monykus7 and are pushed to origin/master. Broader v0.19.0/v0.19.2 verification remains historical evidence; this patch does not repeat unchanged DSP or full suites. No musical or roadmap gate changes.

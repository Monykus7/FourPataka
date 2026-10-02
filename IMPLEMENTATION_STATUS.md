# FourPataka implementation status

Updated: 2026-10-02. Latest release: v0.12.0. Earlier milestone entries retain their historical verification results.

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

The physical pedalboard now implements equipment-menu placement, a four-column/two-row Velcro grid, compact dials, a selected-pedal inspector and real mouse/keyboard patch routing. Positions and cables are saved independently in presets and A/B/track/master copies. Placement is nonmusical; routing changes during playback wait for replay. The v0.12.0 package and automated release checks are verified. Delay follows this board update; the surrounding frontend overhaul remains separate work.

Stage 2's phrase comparison and linked source microscope behavior now pass the automated functional gate. Physical listening for clicks and real-device checks remain pending. Stage 3 has compressor/overdrive/EQ, independent track/master routing and pedal-aware A/B snapshots. Delay is next, followed by chain-aware score directives before its full functional gate. Preserve compressor alignment, delay bypass/tail policy, topology revision policy, and hard Stop cleanup. Enable `through` and master directives together with chain-key validation after the remaining effects.

Chord-symbol macros such as `chord:Cmaj13#11`, with hover/focus expanded-note previews, are in the later music IDE backlog. Main comparison and pedal features have priority.

Stage 4/5 completion still needs the full pedal-aware command reference, deeper accessibility work, save recovery UX, and browser/device verification. WAV/offline export follows stage 6. The current source descriptors/experiments are an early subset of stage 7, not its complete output measurement panel.

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


### Equipment drag placement correction (v0.12.1 verification in progress)

The user reported equipment dragging failing. The open menu covered the first slot and intercepted its drop. The earlier native proof targeted the second slot and missed this overlap. The menu now stops painting and hit testing after the next animation frame, retaining the native drag source until completion. Delaying the hide allows Chromium to capture a valid drag image. Drop, cancellation, Escape and unmount clear any pending frame and temporary tool state. Real mouse gestures cover each pedal kind in the first slot, canceled drags and occupied-slot rejection followed by a valid drag. Browser board/EQ checks and packaged verification are being completed before releasing the patch.

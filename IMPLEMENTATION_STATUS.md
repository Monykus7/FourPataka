# FourPataka implementation status

Updated: 2026-09-30. First playable foundation implemented in this folder.

## Milestone checkpoints

Each implementation milestone has at least four focused version-control commits. Commits use the configured Monykus7 identity and are pushed to `https://github.com/Monykus7/FourPataka.git` as checkpoints are completed.

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

Stage 2's phrase comparison and linked source microscope behavior now pass the automated functional gate. Physical listening for clicks and real-device checks remain pending. Next implement stage 3's effect factories and independent per-track/master routing, then extend A/B snapshots with pedal-chain settings. Preserve compressor alignment, delay bypass/tail policy, topology revision policy, and hard Stop cleanup. Add processing before enabling `through` or master directives.

Chord-symbol macros such as `chord:Cmaj13#11`, with hover/focus expanded-note previews, are in the later music IDE backlog. Main comparison and pedal features have priority.

Stage 4/5 completion still needs the full pedal-aware command reference, source-aware tempo controls, deeper accessibility work, save recovery UX, and browser/device verification. WAV/offline export follows stage 6. The current source descriptors/experiments are an early subset of stage 7, not its complete output measurement panel.

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

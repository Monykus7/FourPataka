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

Both A/B sides replay the same note/chord from the beginning, with a fresh source path. Phrase-based A/B and pedal snapshots remain ahead. Macros are calculated from a captured baseline; reset recovers it, and manual coefficient edits capture a fresh baseline. Experiment loading is undoable.

## Verification

- `npm test`: 42 tests pass across pitch/coefficient math, notation grammar, independent copies, import validation, and undo.
- `npm run test:browser`: 8 tests pass in desktop Chrome across numeric audio rendering and the main UI workflows.
- `npm run build`: TypeScript and production bundle pass. The score editor is loaded as a separate chunk.
- Screenshot inspection: instrument and Compose at 1440 px, instrument at 390 px. At narrow widths the mixer scrolls within its panel without causing page overflow.
- Keyboard smoke check: harmonic range arrows; undo; visible focus; dialog controls. Broader screen-reader and real touch-device checks remain pending.

## Next roadmap work

Finish stage 2's full comparison/linked microscope behavior, then implement stage 3's effect factories and independent per-track/master routing. In particular, preserve the plan's compressor alignment, delay bypass/tail policy, topology revision policy, and hard Stop cleanup. Add processing before enabling `through` or master directives.

Stage 4/5 completion still needs the full pedal-aware command reference, source-aware tempo controls, deeper accessibility work, save recovery UX, and browser/device verification. WAV/offline export follows stage 6. The current source descriptors/experiments are an early subset of stage 7, not its complete output measurement panel.

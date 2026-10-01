# FourPataka

Personal Fourier instrument and composition studio. React, TypeScript, CodeMirror 6, and Web Audio, with an Electron desktop application. Projects stay local.

## Run locally

Requires Node.js 22.12+ (developed with Node 24).

```sh
npm ci
npm run dev
```

Open http://127.0.0.1:5173. Sound starts only after **Listen**, **Solo**, or **Play**. The initial monitor volume is 35%; monitor volume is separate from instrument trim and the saved project mix.

```sh
npm test                # Pitch, parser, independent presets, import validation, history
npm run test:browser    # Chromium audio proofs and studio workflows
npm run test:desktop    # Electron startup, audio, menus, and native project dialogs
npm run build          # TypeScript checks and production bundle
npm run preview        # Serve the production build
```

Browser tests use a locally installed Google Chrome. Change `channel` in `playwright.config.ts` to `msedge` to run against installed Edge. Screenshots and failure traces are generated in `.test-results/` and are not committed.

## Windows application

The portable build is `release/FourPataka-0.6.0-win-x64.exe`. Open it directly; it bundles the studio, fonts, and assets and does not need a development server. It is currently an unsigned personal prototype with the default Electron icon. The portable wrapper uses ZIP compression for faster local build iterations. Build outputs are ignored by Git.

```sh
npm run desktop:dev       # Desktop window with Vite hot reload on port 5175
npm run build
npm run desktop:start     # Desktop window using the local production build
npm run desktop:package   # Build a portable Windows x64 executable in release/
```

The desktop app has native **Open project** and **Save project** dialogs. Its File, Edit, View, and Playback menus provide project controls, undo/redo, command reference, and the track maker. Shortcuts: Ctrl+O open, Ctrl+S save as, Ctrl+1 Instrument, Ctrl+2 Compose, Ctrl+K command reference, Ctrl+Shift+T track maker. The renderer is sandboxed and has no Node access.

Desktop autosave is independent of the browser's local save. To move an existing browser project, export JSON in the browser and open that file in the app. Both use the same versioned project format. The desktop session persists in Electron's user-data directory; the portable executable does not carry project data inside itself.

The desktop checks can also target the unpacked production executable by setting `FOURPATAKA_TEST_EXECUTABLE` to its absolute path before running `npm run test:desktop`.

## Compose tools

**Make a track** selects an instrument and assembles note, chord, and rest rows with pitch and duration controls. It validates the score preview before creating the track in one undo step. Command-reference cards insert directly into the selected track; tempo and time cards update existing directives without duplicating them. Both tools require a valid score and stopped score playback.

Instrument and Compose are the two primary views. Learn is a smaller secondary link. The interface keeps the original dark palette and orange accents, flat panels, concise headings, and a faint material texture inside panels.

## Compare sounds

In Instrument, the Comparison panel selects a note, Bb major chord, or a phrase from one score track. Phrase beat boundaries are numbered from 1: start 2 / end 4 means the two beats between those boundaries; an empty end uses the track end. Chords and rests remain intact, and notes crossing either boundary are clipped to that range.

**Compare / replay** and the transport replay button start the selected A/B sound from the beginning. Switching A/B while auditioning fades the previous path and starts fresh with the same musical material. Other track sounds do not enter the comparison. Material selection is saved outside the independent A/B snapshots. Both copy directions are available and undoable.

Coefficient, polarity, trim, undertone, and solo changes respond during audition without restarting the musical clock or envelope. Harmonic waveform replacements use phase-aligned 20 ms crossfades; numeric audio proofs cover the edit boundary and rapid consecutive edits. Score playback still freezes sound settings until the next Play. Score text edits during a phrase audition take effect on replay.

The source graphs use the first sounding note in the selected material as a labeled reference. Selecting a partial links its bar, spectrum mark, dashed waveform contribution, inspector, and solo. Spectrum marks support Enter/Space as well as clicking. A zero or unavailable partial contributes a flat line.

## The first playable slice

- H1–H16 with exact values, signed triangle coefficients, source waveform/spectrum, and a linked partial inspector.
- Five optional undertones, disabled independently of their saved magnitudes; partial solo bypasses the full source mix.
- Explicit output trim, shared attack/release envelope, Nyquist exclusion, chord audition, 32-voice cap, and a fading Stop.
- Independent A/B instrument snapshots with shared note/chord/phrase replay. Copying either side is a deep copy.
- Baseline-based coefficient macros with neutral/reset behavior and preserved polarity.
- Named instrument library with Save, Save as new, Apply, and scoped Apply to all. Apply updates the source assignment and the track's copied sound in one undo step.
- CodeMirror score editor, diagnostics, toggleable autocomplete, searchable command insertion, visual track maker, parallel tracks, event timeline, and source playback highlights.
- Stable playback revisions. Score edits while playing show **Playing previous version** and suspend stale line highlights.
- Versioned local autosave with previous-save recovery, JSON import/export, grouped undo/redo, keyboard controls, and narrow-screen layouts.
- Four editable experiments and clearly labeled steady-source descriptors.

Library changes do not overwrite track instances. The editor works on the selected A/B sound; **Apply** explicitly copies that sound to the chosen destination. **Load copy into editor** brings an independent track sound back into the workbench.

## Score notation

```text
tempo 120
time 4/4

track melody using brightReed {
  C5 quarter
  chord:(Bb D F)5 8th
  rest 8th
  G5 half
}

track bass using softBass {
  Bb2 half
  F2 half
}
```

Durations are `whole`, `half`, `quarter`, `8th`, and `16th`. Pitches use scientific notation (C4 is middle C, A4 is 440 Hz), with octaves 0–8. `(Bb D F)5` uses octave 5 for all three notes; use `(Bb4 D5 F5)` for explicit voicing. One event per line. `//` starts a comment.

## Current boundary

The instrument/comparison foundation and first pedalboard slice are implemented: compressor, overdrive, independent audition/track/master chains, presets, bypass, and live processed views. The remaining stage 3 work includes EQ, delay and its echo-tail policy, and score chain assignments. WAV export and the full measurement panel follow later. `through` and master pedal directives currently produce an explicit diagnostic instead of playing an unprocessed approximation of the planned score. Chord-symbol macros such as `chord:Cmaj13#11` and hover/focus note expansion are recorded for the later music IDE work.

The voice cap is a provisional conservative limit, not a mobile performance guarantee. Numeric audio proofs run in desktop Chromium; physical listening and real mobile/Safari/Firefox checks remain pending.

Local saves belong to the current browser/origin and can be removed by clearing browser data. JSON is the portable, editable project format. Preferences such as autocomplete and monitor volume are stored separately and are not replaced by import.

See [BUILD_PLAN.md](BUILD_PLAN.md) for the authoritative roadmap and [IMPLEMENTATION_STATUS.md](IMPLEMENTATION_STATUS.md) for verification and milestone checkpoints.

## Interactive Fourier workspace

In Instrument, use **Harmonics** or **Waveform** to choose the large editor. The other representation stays visible in a smaller preview. Harmonic controls retain their exact magnitudes and polarity controls in the partial inspector.

Choose **Dots** (default) or **Draw** in the waveform editor. Click in the left half to add a dot, drag an existing dot, or use its position/amplitude fields. Arrow keys adjust the focused dot and Delete removes it; the Remove dot button also works. Fixed zero endpoints plus up to 30 editable dots define a smooth, shape-preserving cubic curve. The curve passes through its anchors without overshooting their amplitudes. Draw mode retains freehand strokes. The right half is its odd reflection, matching the current signed sine-only synthesis model. A sampled Fourier sine projection recovers H1–H16; each coefficient is limited to ±1. The orange curve is the playable reconstruction and the coral dashed curve is the target, so sharp shapes may differ from their finite approximation. This editor shows one untrimmed harmonic cycle; undertones, trim, envelope, and Nyquist filtering remain separate.

Both editing tools update the current A/B sound and live audition. Each stroke or dot drag is one undo operation, even when moving slowly. **Reset waveform to sine** restores H1 = 1 and H2–H16 = 0, and resets polarity, while keeping trim, envelope, and undertones. The reset can be undone. Dot geometry travels with saved sounds and projects, A/B copies, and undo/redo. Harmonic or macro edits discard a stale dot layout and seed fresh anchors from the edited sound; level/envelope edits retain it. Save/apply and project autosave work as before. Drawing does not add arbitrary phase, cosine terms, or DC offset.



## Pedalboard

The Instrument view includes a pedalboard with an explicit **Editing destination**: Audition A/B, a named track, or Master. Add compressor/overdrive modules, set their numeric controls or sliders, bypass a pedal or the chain, and drag module titles to reorder (Move left/right are keyboard alternatives). A chain currently supports up to eight pedals.

**Load chain preset** creates an independent copy. **Save chain preset** updates its library template while applied instances retain their values. **Save chain as new** creates a named template. Apply the current chain to a track or master, or use **Apply chain to all associated** to update exactly the listed destinations. All musical edits and applications are undoable. A/B copies include the audition chain, and switching sides starts with a fresh graph.

Audition hears only its selected sound/chain. Score Play routes each track through its independent chain, then track level, master chain, mix gain, and monitor. Compose exposes whole-chain and per-pedal bypass switches for tracks/master. Pedal parameters are smoothed live during audition. Score parameters stay frozen until the next Play, while bypass remains live. Changes to order, added/removed modules, or loaded presets are queued until Play/replay; the pending label identifies this.

Compressor uses the native Web Audio processor with a 30 dB knee, measured look-ahead alignment, makeup/output control, and a linear dry/wet blend. Its 1:1 setting uses an aligned identity path to avoid native startup attenuation. Overdrive uses `tanh(drive × input)`, a low-pass tone filter, output trim, and 4× oversampling. The dry/bypass branch uses matching resampling filters. Runtime impulse probes calibrate compressor and oversampling latency at the active sample rate; score tracks are padded to match the slowest chain. A short filter-tail budget follows note release. Stop fades the whole session and disconnects voices/effects before a fresh start. See the [Web Audio processing specification](https://www.w3.org/TR/webaudio-1.0/#dynamicscompressornode-processing).

**After pedals** displays the selected live path before its track level or mix gain, with a waveform and FFT spectrum. The original source graphs still describe the instrument. These views require active Listen/Play.

Personal build workflow: make at least four focused commits per milestone, push each completed checkpoint using the configured identity, and launch the verified portable application after every completed x.x.0 release.

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

The portable build is `release/FourPataka-0.2.0-win-x64.exe`. Open it directly; it bundles the studio, fonts, and assets and does not need a development server. It is currently an unsigned personal prototype with the default Electron icon. Build outputs are ignored by Git.

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

## The first playable slice

- H1–H16 with exact values, signed triangle coefficients, source waveform/spectrum, and a linked partial inspector.
- Five optional undertones, disabled independently of their saved magnitudes; partial solo bypasses the full source mix.
- Explicit output trim, shared attack/release envelope, Nyquist exclusion, chord audition, 32-voice cap, and a fading Stop.
- Independent A/B instrument snapshots. A/B changes replay the same selected note/chord from its beginning. Copying either side is a deep copy.
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

This is the audio/project foundation and a first set of instrument tools, not the completed initial release. Pedal processing, pedal preset libraries, master routing, effect tails, processed signal views, phrase-based A/B, WAV export, and the full measurement panel are still ahead. `through` and master pedal directives currently produce an explicit diagnostic instead of playing an unprocessed approximation of the planned score.

Live timbre edits during audition currently crossfade into a fresh audition; they restart the note. Score playback freezes its sounds until the next Play. The voice cap is a provisional conservative limit, not a mobile performance guarantee. Numeric audio proofs run in desktop Chromium; physical listening and real mobile/Safari/Firefox checks remain pending.

Local saves belong to the current browser/origin and can be removed by clearing browser data. JSON is the portable, editable project format. Preferences such as autocomplete and monitor volume are stored separately and are not replaced by import.

See [BUILD_PLAN.md](BUILD_PLAN.md) for the authoritative roadmap and [IMPLEMENTATION_STATUS.md](IMPLEMENTATION_STATUS.md) for verification and milestone checkpoints.

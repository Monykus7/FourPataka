# FourPataka

A local-first Fourier music studio. Shape a timbre with sixteen harmonics, audition a note or chord, and write a phrase in readable notation. Built with React, TypeScript, Vite, CodeMirror 6, and Web Audio. No account or backend is required.

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
npm run build          # TypeScript checks and production bundle
npm run preview        # Serve the production build
```

Browser tests use a locally installed Google Chrome. Change `channel` in `playwright.config.ts` to `msedge` to run against installed Edge. Screenshots and failure traces are generated in `.test-results/` and are not committed.

## The first playable slice

- H1–H16 with exact values, signed triangle coefficients, source waveform/spectrum, and a linked partial inspector.
- Five optional undertones, disabled independently of their saved magnitudes; partial solo bypasses the full source mix.
- Explicit output trim, shared attack/release envelope, Nyquist exclusion, chord audition, 32-voice cap, and a fading Stop.
- Independent A/B instrument snapshots. A/B changes replay the same selected note/chord from its beginning. Copying either side is a deep copy.
- Baseline-based coefficient macros with neutral/reset behavior and preserved polarity.
- Named instrument library with Save, Save as new, Apply, and scoped Apply to all. Apply updates the source assignment and the track's copied sound in one undo step.
- CodeMirror score editor, diagnostics, toggleable autocomplete, searchable command reference, parallel tracks, event timeline, and source playback highlights.
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

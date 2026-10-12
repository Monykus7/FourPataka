# Task entry guide

FourPataka v0.32.0: browser/Electron studio with 32 signed harmonics, noise-hit drums, four serial pedals, named score files and WAV export. Current behavior is in [feature summaries](features.json); historical releases/checks are in [implementation status](../../IMPLEMENTATION_STATUS.md). Read only the relevant area of the [generated map](PROJECT_MAP.md).

## Routes

- Instrument factories/migrations: [instrumentPresets.ts](../../src/core/instrumentPresets.ts), [project.ts](../../src/core/project.ts); [percussion contract](../extensions/PERCUSSION_PRESETS.md).
- Waveform editing/signs: [FourierWorkspace.tsx](../../src/components/FourierWorkspace.tsx), [music.ts](../../src/core/music.ts), [waveform.ts](../../src/core/waveform.ts).
- Hit audio/phase: [voice.ts](../../src/audio/voice.ts), [percussionSource.ts](../../src/audio/percussionSource.ts), [pitchEnvelope.ts](../../src/audio/pitchEnvelope.ts).
- Score grammar/rhythm: [parser.ts](../../src/core/parser.ts), [scoreLexer.ts](../../src/core/scoreLexer.ts); [chord shapes](../extensions/CHORD_SHAPES.md).
- File tabs/track editing: [ScoreWorkspace.tsx](../../src/components/ScoreWorkspace.tsx), [scoreFiles.ts](../../src/core/scoreFiles.ts); [file contract](../extensions/SCORE_FILES.md).
- Module contracts: [public API](../../src/modules/index.ts), [assembly](../../src/modules/assembly.ts); [M1 guide](../extensions/MODULE_FOUNDATION.md). M2 pedal DSP/persistence is next.
- Pedals/routing: [Pedalboard.tsx](../../src/components/Pedalboard.tsx), [pedals.ts](../../src/core/pedals.ts), [effects.ts](../../src/audio/effects.ts).
- Saving/export: [localSave.ts](../../src/core/localSave.ts), [export.ts](../../src/audio/export.ts), [desktop bridge](../../desktop/main.cjs).
- Unknown relationships/tooling: [retrieval usage](USAGE.md), [graph architecture](ARCHITECTURE.md). Query once at1024 tokens; widen only when a specific dependency is missing. Direct docs/search are sufficient when they locate the source.

## Guardrails and finish

Canonical scoreText owns the song; files are views. Library, track and A/B sounds are independent copies. Source/preset changes must preserve appropriate clock/phase, units, latency and Stop. Preserve the authored demo in project.ts. M1 numeric metadata is implemented; complete modules M2–M6, swing, chamber and additional modulation/reverb pedals remain planned.

Use bounded searches/source ranges. Update affected summaries and decisions once, keeping chronology out of feature summaries. Run relevant checks; broaden only for unresolved risk. Application releases also require native/portable verification and opening the verified build. Documentation/tooling changes need no app release. Build/check knowledge before the relevant commit. Keep private agent files, graphs, vectors and models out of Git; push focused checkpoints without manufacturing extra work to fill a commit count.

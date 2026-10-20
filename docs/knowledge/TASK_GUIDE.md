# Task entry guide

FourPataka v0.41.0: browser/Electron studio with 32 signed harmonics, noise-hit drums, seven registered serial pedals, named score files and WAV export. Current behavior is in [feature summaries](features.json); historical releases/checks are in [implementation status](../../IMPLEMENTATION_STATUS.md). Read only the relevant area of the [generated map](PROJECT_MAP.md).

## Routes

- Modulated pedals: [chorus](../../src/modules/pedals/chorus.ts), [chorus diagrams](../extensions/CHORUS.md), [phaser diagrams](../extensions/PHASER.md); shared M2 lifecycle, timeOrigin, live/frozen WAV and independent copies. Chorus is verified in v0.41.0, including both hosted jobs on720a97f.

- Source/output analysis: [registered panel](../../src/modules/features/sourceOutputAnalysis/index.ts), [shared meter](../../src/audio/outputMeter.ts), [sample stats](../../src/audio/levels.ts), [contributor diagrams](../extensions/ANALYSIS.md). Stage7 is implemented in v0.39.0; source periodic models and live stereo levels have distinct scope.

- Swing/performed time: [performance timing](../../src/core/performanceTiming.ts), [contributor diagrams](../extensions/PERFORMANCE_TIMING.md), parser/comparison and shared audio consumers. v0.38.0 implements variable eighth/16th swing and global/track overrides.

- Contributor readiness/licensing/CI: [maintainer guide](../MAINTAINING.md), [contributing](../../CONTRIBUTING.md), [notice generator](../../scripts/licenses.mjs), [distribution check](../../scripts/check-distribution.mjs). M6 is complete: exercised clean-source tutorial, operational reporting/protection and the durable v0.39.0 contributor preview; run39085617326 verifies the release source.

- Instrument factories/migrations: [instrumentPresets.ts](../../src/core/instrumentPresets.ts), [project.ts](../../src/core/project.ts); [percussion contract](../extensions/PERCUSSION_PRESETS.md).
- Waveform editing/signs: [FourierWorkspace.tsx](../../src/components/FourierWorkspace.tsx), [music.ts](../../src/core/music.ts), [waveform.ts](../../src/core/waveform.ts).
- WAV-to-instrument analysis (planned): [BUILD_PLAN section24](../../BUILD_PLAN.md#24-wav-to-instrument-analysis--planned); feature `wav-instrument-analysis`. W1 static reconstruction, W2 evolving engines; M6 is complete; WAV analysis remains separately planned.
- Feature panels/settings/guarded actions: [feature contract](../../src/modules/foundation/features.ts), [host data](../../src/core/featureHost.ts), [renderer](../../src/components/FeaturePanels.tsx); [contributor guide](../extensions/FEATURE_MODULES.md).
- Engines/lifecycle: [engine contract](../../src/modules/foundation/engines.ts), [Fourier implementation](../../src/modules/foundation/fourierVoice.ts), [Basic Tone example](../../src/modules/examples/basicTone/index.ts); [engine tutorial](../extensions/ENGINE_FOUNDATION.md).
- Hit audio/phase: [voice.ts](../../src/audio/voice.ts), [percussionSource.ts](../../src/audio/percussionSource.ts), [pitchEnvelope.ts](../../src/audio/pitchEnvelope.ts).
- Score grammar/rhythm: [parser.ts](../../src/core/parser.ts), [scoreLexer.ts](../../src/core/scoreLexer.ts); [chord shapes](../extensions/CHORD_SHAPES.md).
- File tabs/track editing: [ScoreWorkspace.tsx](../../src/components/ScoreWorkspace.tsx), [scoreFiles.ts](../../src/core/scoreFiles.ts); [file contract](../extensions/SCORE_FILES.md).
- Module contracts: [public API](../../src/modules/index.ts), [assembly](../../src/modules/assembly.ts); [M1 guide](../extensions/MODULE_FOUNDATION.md). [M2 pedal DSP/recovery](../extensions/PEDAL_MODULES.md) is implemented; [M3 preset factories](../extensions/FOURIER_PRESETS.md) is implemented; [M4 engines/settings/recovery](../extensions/ENGINE_FOUNDATION.md) is implemented; [M5 features/host actions](../extensions/FEATURE_MODULES.md) is implemented; M6 is complete: exercised clean-source tutorial, operational reporting/protection and the durable v0.39.0 contributor preview; run39085617326 verifies the release source.
- Pedals/routing: [Pedalboard.tsx](../../src/components/Pedalboard.tsx), [pedals.ts](../../src/core/pedals.ts), [effects.ts](../../src/audio/effects.ts).
- Saving/export: [localSave.ts](../../src/core/localSave.ts), [export.ts](../../src/audio/export.ts), [desktop bridge](../../desktop/main.cjs).
- Unknown relationships/tooling: [retrieval usage](USAGE.md), [graph architecture](ARCHITECTURE.md). Query once at1024 tokens; widen only when a specific dependency is missing. Direct docs/search are sufficient when they locate the source.

## Guardrails and finish

Canonical scoreText owns the song; files are views. Library, track and A/B sounds are independent copies. Source/preset changes must preserve appropriate clock/phase, units, latency and Stop. Preserve the authored demo in project.ts. M1 metadata, M2 pedals and M3 presets are implemented; M6 contributor readiness is complete; chamber, WAV analysis and reverb remain planned; phaser ships in v0.40.0 and chorus ships in v0.41.0; both hosted jobs pass on720a97f.

Use bounded searches/source ranges. Update affected summaries and decisions once, keeping chronology out of feature summaries. Run relevant checks; broaden only for unresolved risk. Application releases also require native/portable verification and opening the verified build. Documentation/tooling changes need no app release. Build/check knowledge before the relevant commit. Keep private agent files, graphs, vectors and models out of Git; push focused checkpoints without manufacturing extra work to fill a commit count.

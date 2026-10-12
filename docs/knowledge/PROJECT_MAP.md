# FourPataka project map

Start with [TASK_GUIDE.md](TASK_GUIDE.md) for direct source routes. Read only the relevant feature section; query the graph when relationships are unclear.

Generated with `npm run knowledge:build`. Edit features.json and DECISIONS.md for behavioral summaries; source locations below are derived from the working files.

Full source fingerprints are kept in the local graph cache; this tracked map records feature summaries, dependency groups and source locations.

## Retrieval path

Task → local semantic seeds → graph neighborhood → personalized PageRank → fixed token budget → cited context.

## FourPataka

FourPataka v0.34.0 is a local browser/Electron music studio: 32 signed Fourier harmonics, waveform dots/drawing, synthesized drum hits, independent instrument copies, five registered serial pedals, a score IDE and frozen WAV export. Canonical scoreText owns named files/tracks; A/B changes retain the running clock. M1 numeric metadata and M2 playable pedal contracts/registry are implemented, including schema-3 unavailable-pedal recovery. M3 Fourier presets is implemented with baked-data factories and explicit discovery. M4 engines is next. M4-M6, swing, chamber acoustics, phaser/chorus/reverb and manual device/listening/screen-reader gates remain planned. Start with docs/knowledge/TASK_GUIDE.md; release history and verification live in IMPLEMENTATION_STATUS.md.

### Modular contributor program (M1-M3 implemented)

M1 numeric metadata and M2 playable pedal APIs are implemented. Four original factories and independent Level share reviewed explicit assembly, generic equipment/controls/defaults/validation, live/offline dispatch, seconds-based latency/tails and resource estimates. Schema 3 imports schemas 1/2, preserves unknown/incompatible raw module payloads in visible recovery placeholders and blocks affected routed paths. Source authority, independent library/track/A-B/master copies, ongoing clocks/phase, finite tails/Stop and frozen WAV remain host policies. Tested public examples, contributor diagrams and bounded version/ownership checks support these APIs. M3 Fourier presets adds pure data factories, all existing timbres, Mellow pluck and explicit conservative library discovery; saved sounds play without module source. M4 engines is next, followed by M5 features and M6 licensing/CI/publication. Runtime loading and owner license/manual listening/device gates remain open.

- Modular contributor program (M1-M3 implemented) / dependency group 1: [src/modules/assembly.ts](../../src/modules/assembly.ts), [src/modules/index.ts](../../src/modules/index.ts)

Key definitions: [builtIns](../../src/modules/assembly.ts#L10), [definitions](../../src/modules/assembly.ts#L11), [builtInIds](../../src/modules/assembly.ts#L12), [pedalModules](../../src/modules/assembly.ts#L14), [bundledModules](../../src/modules/assembly.ts#L15), [LEGACY_MODULE_IDS](../../src/modules/assembly.ts#L16), [instrumentModules](../../src/modules/assembly.ts#L20), [factoryPreviews](../../src/modules/assembly.ts#L25).

#### M1 numeric module contracts and compatibility baseline

Implemented v0.32.0: typed API-1 numeric metadata, explicit immutable validated registry, reserved/duplicate/category/version/finite-range failures, fresh owned settings and strict settings validation without step quantization. Public imports are acyclic and host-independent. EQ names/defaults/control ranges use registered metadata while legacy eq kinds, DSP and schema remain unchanged. Buildable level metadata example, illustrated tutorial/compatibility matrix and fixed schema-1 source/signed-partial/owned-EQ fixture support the boundary. M2 now extends this foundation with playable pedals and schema-3 unavailable-module recovery; other category contracts remain planned.

- M1 numeric module contracts and compatibility baseline / dependency group 1: [src/core/pedals.ts](../../src/core/pedals.ts), [src/modules/assembly.ts](../../src/modules/assembly.ts), [src/modules/index.ts](../../src/modules/index.ts), [tests/unit/moduleCompatibility.test.ts](../../tests/unit/moduleCompatibility.test.ts), [src/modules/pedals/eq.ts](../../src/modules/pedals/eq.ts), [src/modules/examples/levelMetadata.ts](../../src/modules/examples/levelMetadata.ts), [tests/unit/moduleRegistry.test.ts](../../tests/unit/moduleRegistry.test.ts)
- M1 numeric module contracts and compatibility baseline / dependency group 2: [src/modules/foundation/contracts.ts](../../src/modules/foundation/contracts.ts), [src/modules/foundation/registry.ts](../../src/modules/foundation/registry.ts)
- M1 numeric module contracts and compatibility baseline / dependency group 3: [tests/unit/moduleBoundaries.test.ts](../../tests/unit/moduleBoundaries.test.ts)

Key definitions: [PedalKind](../../src/core/pedals.ts#L11), [delayTail](../../src/core/pedals.ts#L12), [DELAY_DEFAULTS](../../src/core/pedals.ts#L13), [EQ_SHAPE](../../src/core/pedals.ts#L14), [EQ_DEFAULTS](../../src/core/pedals.ts#L15), [PEDAL_KINDS](../../src/core/pedals.ts#L16), [PEDAL_NAMES](../../src/core/pedals.ts#L17), [PEDAL_CONTROLS](../../src/core/pedals.ts#L20).

#### M2 playable pedal modules and contributor example

Implemented v0.33.0: pure public PedalModule/registry contracts, four built-in DSP factories and a playable Level module folder plus one assembly entry. Equipment/drag recognition, labels/defaults/control bounds/reset/help, saved settings, live/WAV dispatch, latency and tail/resource estimates derive from registration. Retain legacy built-in kinds/parameters and sample-rate behavior; score clocks, copies, routing and Stop stay host-owned. Schema 3 migrates 1/2, preserves bounded missing/incompatible raw instances in unavailable.original, allows JSON recovery/removal and blocks affected routed playback/WAV before allocating a partial graph. Compatible registration restores validated settings; no automatic module-data migrations/runtime loader. Contributor tutorial/diagrams, shared sample-rate/bypass/finite/disposal/analytic Level/WAV and native workflows provide proof. CPU workload/resource declarations are estimates; M6 license/CI/publication and phaser/chorus/reverb remain open.

- M2 playable pedal modules and contributor example / dependency group 1: [src/audio/effects.ts](../../src/audio/effects.ts), [src/core/pedals.ts](../../src/core/pedals.ts), [src/audio/export.ts](../../src/audio/export.ts), [src/audio/scoreGraph.ts](../../src/audio/scoreGraph.ts), [src/components/PedalBoardSurface.tsx](../../src/components/PedalBoardSurface.tsx), [src/components/PedalControls.tsx](../../src/components/PedalControls.tsx), [src/modules/assembly.ts](../../src/modules/assembly.ts), [src/modules/pedals/eq.ts](../../src/modules/pedals/eq.ts), [src/modules/pedals/compressor.ts](../../src/modules/pedals/compressor.ts), [src/modules/pedals/overdrive.ts](../../src/modules/pedals/overdrive.ts), [src/modules/examples/level/index.ts](../../src/modules/examples/level/index.ts), [src/modules/pedals/delay.ts](../../src/modules/pedals/delay.ts)
- M2 playable pedal modules and contributor example / dependency group 2: [src/modules/foundation/pedals.ts](../../src/modules/foundation/pedals.ts), [src/modules/foundation/processor.ts](../../src/modules/foundation/processor.ts), [src/modules/foundation/savedPedals.ts](../../src/modules/foundation/savedPedals.ts)
- M2 playable pedal modules and contributor example / dependency group 3: [tests/browser/pedal-modules.spec.ts](../../tests/browser/pedal-modules.spec.ts), [tests/helpers/pedalModules.ts](../../tests/helpers/pedalModules.ts)
- M2 playable pedal modules and contributor example / dependency group 4: [tests/unit/pedalModules.test.ts](../../tests/unit/pedalModules.test.ts)

Key definitions: [EffectGraph](../../src/audio/effects.ts#L11), [measureOversamplingLatency](../../src/audio/effects.ts#L20), [createEffect](../../src/audio/effects.ts#L35), [tail](../../src/audio/effects.ts#L66), [tailActive](../../src/audio/effects.ts#L69), [ChainGraph](../../src/audio/effects.ts#L79), [chainLatency](../../src/audio/effects.ts#L91), [chainResources](../../src/audio/effects.ts#L103).

#### M3 registry-backed Fourier presets

Implemented v0.34.0: public FourierSound/validation/shape helpers, validated deterministic preset definitions and immutable registry, nine existing factories and an independent Mellow pluck folder plus assembly entry. Separate module/API/data identity from editable library IDs/keys/template versions. Fresh factories return independent captured copies with 32 signed absolute coefficients, five undertones and existing envelope/trim/hit fields. All new projects discover registered templates; existing libraries receive missing keys only via explicit Add bundled presets with capacity/collision/occupied-key/undo guards. Existing conservative factory upgrades preserve customized/applied/A-B/folder/source data. Registry preview metadata feeds current hit previews without a per-preset App branch. Settings are baked in schema 3; missing preset code does not disable saved sounds, and no schema/voice/parser special case or automatic update is added. M4 engines and M6 licensing/CI/publication remain planned.

- M3 registry-backed Fourier presets / dependency group 1: [src/App.tsx](../../src/App.tsx), [src/modules/assembly.ts](../../src/modules/assembly.ts), [src/core/music.ts](../../src/core/music.ts), [src/core/project.ts](../../src/core/project.ts), [src/core/instrumentPresets.ts](../../src/core/instrumentPresets.ts), [src/modules/examples/mellowPluck/index.ts](../../src/modules/examples/mellowPluck/index.ts), [src/modules/instruments/catalogue.ts](../../src/modules/instruments/catalogue.ts)
- M3 registry-backed Fourier presets / dependency group 2: [src/modules/foundation/fourier.ts](../../src/modules/foundation/fourier.ts), [src/modules/foundation/presets.ts](../../src/modules/foundation/presets.ts)
- M3 registry-backed Fourier presets / dependency group 3: [tests/browser/preset-modules.spec.ts](../../tests/browser/preset-modules.spec.ts), [tests/helpers/presetModules.ts](../../tests/helpers/presetModules.ts)
- M3 registry-backed Fourier presets / dependency group 4: [tests/unit/presetModules.test.ts](../../tests/unit/presetModules.test.ts)

Key definitions: [ScoreWorkspace](../../src/App.tsx#L112), [View](../../src/App.tsx#L114), [readPreferences](../../src/App.tsx#L115), [MiniWave](../../src/App.tsx#L137), [RangeControl](../../src/App.tsx#L176), [App](../../src/App.tsx#L226), [measure](../../src/App.tsx#L279), [resetMacros](../../src/App.tsx#L367).

#### M4 synthesis engine capability contracts (planned)

Planned, not started; depends on M1/M3. Host-clock voice factory wraps Fourier first, then independent minimal engine example. Versioned settings, truthful Fourier inspector capabilities, deterministic live/offline factories, envelope/release/retirement/disposal, resource limits, migration and unavailable-engine handling. No new engine or 32-harmonic capability implemented by this plan. Tutorial, lifecycle and native/WAV/phase proofs required.

#### M5 feature modules and host workflow services (planned)

Planned, not started; depends on M1, reuses M2/M3 services, engine-specific panels also need M4. Extract narrow root workflow services and optional panel/experiment/command metadata registration, preserving host source edits/copies/history/revision/measurement/focus/files. Migrate one existing view and independent feature example without root switches/listener leaks; publish tested host API and settings guide. Metadata alone does not add score grammar.

#### M6 open-source contributor release readiness (planned)

Planned, not started; first pedal/preset contributor release requires M1-M3, publishes later engine/feature APIs only after their gates. Owner selects license early; attribution, contributor rights/conduct/security/review, maintainership, API deprecation/support, clean-checkout examples, repeatable browser/native/package CI and source/artifact notices are required. No license selected, publication/repository-visibility change or runtime module installation authorized by this documentation change.

### Sound and Fourier interaction

Editable source waveform, signed harmonic sine bank and phase-continuous comparison feed independent audio processing paths.

#### Sine-bank synthesis and voices

Thirty-two signed harmonics and optional undertones retain absolute amplitude. Oscillator replacements preserve the original voice phase; envelopes and a 32-voice cap bound playback. Monitor volume stays outside saved mix settings. Each harmonic has a +/− toggle and an explicit inspector Sign selector; signed coefficient previews, silent-value sign retention and separate undo agree with source/audio phase-continuous updates. Live/offline admission counts releasing overlaps at scheduled audio time, with a 10 ms oldest-voice retirement fade and 15 ms oscillator stop. Separate lifecycle ownership includes retired/future and silent voices until cleanup, so Stop disposes every source.

- Sine-bank synthesis and voices / dependency group 1: [src/audio/voice.ts](../../src/audio/voice.ts), [src/core/music.ts](../../src/core/music.ts), [src/audio/voiceLimit.ts](../../src/audio/voiceLimit.ts), [src/components/HarmonicPolarity.tsx](../../src/components/HarmonicPolarity.tsx), [src/components/SourceGraphs.tsx](../../src/components/SourceGraphs.tsx), [tests/unit/polarity.test.ts](../../tests/unit/polarity.test.ts)
- Sine-bank synthesis and voices / dependency group 2: [tests/browser/audio.spec.ts](../../tests/browser/audio.spec.ts)
- Sine-bank synthesis and voices / dependency group 3: [tests/browser/polarity.spec.ts](../../tests/browser/polarity.spec.ts)

Key definitions: [Voice](../../src/audio/voice.ts#L5), [Source](../../src/audio/voice.ts#L13), [TRANSITION](../../src/audio/voice.ts#L19), [holdParameter](../../src/audio/voice.ts#L22), [createVoice](../../src/audio/voice.ts#L31), [cleanup](../../src/audio/voice.ts#L55), [source](../../src/audio/voice.ts#L72), [setSources](../../src/audio/voice.ts#L113).

#### Instrument presets and source thumbnails

Library templates, applied tracks and A/B are independent Sound copies; Save never applies to tracks. Pure factories create fresh 32-partial banks. Soft bass v2 differs from signed Triangle. Kick v2 has a120 ms body,24-semitone/25 ms falling pitch and12 ms beater. Closed hi-hat v2 uses filtered noise and quiet metallic partials with45 ms decay. Snare v3 uses a quiet22 ms body, no pitch drop and dominant85 ms noise at700–7800 Hz,−9 dB trim. Optional percussion data validates noise0–1, filters20–16000 Hz, body decay0.01–2 s, noiseDecay0.005–2 s, pitch0–48 st/0.005–0.5 s; omitted lowpass defaults14000 Hz. Live/WAV share original-age voices, phase/cursor continuity and Stop. Only exact untouched legacy library factories migrate; owned/custom sounds remain until explicit Select/Apply. Missing bundled keys are added conservatively before parser discovery. Preview hit sets suggested pitch/gate and clears solo; complete-hit renders include noise/envelope/trim, while Fourier editing controls the body. See PERCUSSION_PRESETS.md for limits, migration and preview details. M3/M4 remain planned.

- Instrument presets and source thumbnails / dependency group 1: [src/App.tsx](../../src/App.tsx), [src/core/project.ts](../../src/core/project.ts), [src/core/localSave.ts](../../src/core/localSave.ts), [src/components/SourceGraphs.tsx](../../src/components/SourceGraphs.tsx), [src/components/HitPreview.tsx](../../src/components/HitPreview.tsx), [src/core/comparison.ts](../../src/core/comparison.ts), [src/core/instrumentPresets.ts](../../src/core/instrumentPresets.ts), [src/components/ComparisonPanel.tsx](../../src/components/ComparisonPanel.tsx), [tests/unit/comparison.test.ts](../../tests/unit/comparison.test.ts), [tests/unit/instrumentPresets.test.ts](../../tests/unit/instrumentPresets.test.ts), [tests/unit/localSave.test.ts](../../tests/unit/localSave.test.ts), [src/audio/hitPreview.ts](../../src/audio/hitPreview.ts), [src/audio/voice.ts](../../src/audio/voice.ts), [src/audio/percussionSource.ts](../../src/audio/percussionSource.ts), [src/audio/pitchEnvelope.ts](../../src/audio/pitchEnvelope.ts), [tests/unit/pitchEnvelope.test.ts](../../tests/unit/pitchEnvelope.test.ts)
- Instrument presets and source thumbnails / dependency group 2: [tests/browser/drums.spec.ts](../../tests/browser/drums.spec.ts), [tests/helpers/percussion.ts](../../tests/helpers/percussion.ts), [tests/browser/percussion.spec.ts](../../tests/browser/percussion.spec.ts), [tests/desktop/app.spec.ts](../../tests/desktop/app.spec.ts)
- Instrument presets and source thumbnails / dependency group 3: [tests/browser/instrument-presets.spec.ts](../../tests/browser/instrument-presets.spec.ts)

Key definitions: [ScoreWorkspace](../../src/App.tsx#L112), [View](../../src/App.tsx#L114), [readPreferences](../../src/App.tsx#L115), [MiniWave](../../src/App.tsx#L137), [RangeControl](../../src/App.tsx#L176), [App](../../src/App.tsx#L226), [measure](../../src/App.tsx#L279), [resetMacros](../../src/App.tsx#L367).

#### Instrument library folders

v0.26.0 adds collapsed single-level folders with counts and an Unfiled group. Recognized sine/square/saw/triangle factory IDs and keys seed Simple shapes in new and legacy projects; explicit empty organization is respected. Create/rename/remove (32 folders, unique names1–100) and internal preset-ID drag/drop or keyboard/touch selector moves are independent whole-operation history edits. Removing a folder unfiles its instruments; Save as new stays unfiled. Optional schema2/3 instrumentFolders and preset.folderId validate/whitelist IDs and references; metadata persists through local/JSON/native/recovery. Preset IDs/score keys/versions/Sound, source, applied/A-B copies and running audio phase/clock stay unchanged. Closed folder keys remain available to compiler/autocomplete/assignment/WAV; demo imports strip source-project folder references. Collapse is local view state, reset on reload, not musical history. Nested folders/manual ordering and general M3 preset registry remain outside this release. Window titles show runtime version to identify old builds.

- Instrument library folders / dependency group 1: [src/App.tsx](../../src/App.tsx), [src/core/project.ts](../../src/core/project.ts), [src/core/localSave.ts](../../src/core/localSave.ts), [src/components/InstrumentLibrary.tsx](../../src/components/InstrumentLibrary.tsx), [src/core/instrumentFolders.ts](../../src/core/instrumentFolders.ts), [tests/unit/instrumentFolders.test.ts](../../tests/unit/instrumentFolders.test.ts)
- Instrument library folders / dependency group 2: [tests/browser/instrument-folders.spec.ts](../../tests/browser/instrument-folders.spec.ts), [tests/helpers/instrumentLibrary.ts](../../tests/helpers/instrumentLibrary.ts), [tests/desktop/app.spec.ts](../../tests/desktop/app.spec.ts)

Key definitions: [ScoreWorkspace](../../src/App.tsx#L112), [View](../../src/App.tsx#L114), [readPreferences](../../src/App.tsx#L115), [MiniWave](../../src/App.tsx#L137), [RangeControl](../../src/App.tsx#L176), [App](../../src/App.tsx#L226), [measure](../../src/App.tsx#L279), [resetMacros](../../src/App.tsx#L367).

#### 32-harmonic Fourier bank

Implemented synthesis/notation pilot: signed absolute H1–H32 coefficients, primary H1–H16 plus collapsible H17–H32 controls. Waveform projection and shared live/WAV PeriodicWave include all 32; coefficients at or above Nyquist remain saved but do not sound. Current schema 3 imports schemas 1/2, with schema 1 migrated by zero-padding magnitudes and +1 signs independently across libraries, tracks and A/B; lower coefficients, waveform points, trim, source and macro brightness response remain intact. Storage keys remain stable. Fresh mathematical presets use 32; legacy applied sounds retain their old timbre. Broader engine modules/chamber acoustics remain planned.

- 32-harmonic Fourier bank / dependency group 1: [src/audio/voice.ts](../../src/audio/voice.ts), [src/core/music.ts](../../src/core/music.ts), [src/core/project.ts](../../src/core/project.ts), [src/core/waveform.ts](../../src/core/waveform.ts), [tests/unit/harmonicMigration.test.ts](../../tests/unit/harmonicMigration.test.ts), [src/core/instrumentPresets.ts](../../src/core/instrumentPresets.ts)
- 32-harmonic Fourier bank / dependency group 2: [tests/browser/synthesis-notation.spec.ts](../../tests/browser/synthesis-notation.spec.ts)

Key definitions: [Voice](../../src/audio/voice.ts#L5), [Source](../../src/audio/voice.ts#L13), [TRANSITION](../../src/audio/voice.ts#L19), [holdParameter](../../src/audio/voice.ts#L22), [createVoice](../../src/audio/voice.ts#L31), [cleanup](../../src/audio/voice.ts#L55), [source](../../src/audio/voice.ts#L72), [setSources](../../src/audio/voice.ts#L113).

#### Instrument acoustics (planned)

Deferred, not implemented: an Instrument-builder algorithmic tiny chamber representing instrument body acoustics, without impulse-response (IR) files. Proposed enable/reset, wet/dry, chamber size, decay and damping controls live in saved instrument settings and independent track/A/B copies. The planned chamber sits before track pedals while source inspectors retain raw Fourier authority. Audio-proof gates cover dry unity, bounded feedback, latency, continuous clock/phase, finite tails and Stop, legacy-off migration, copy isolation and offline/WAV agreement. Current main-feature and export priorities remain unchanged.

#### Waveform drawing and control points

Draw or place dots on an odd waveform half-cycle. Shape-preserving cubic interpolation avoids overshoot; projection produces signed sine coefficients. Reset restores a sine while preserving envelope and trim. Add dot samples the current Hermite target at the widest gap midpoint, preserves bounds and inserts an independent anchor (recomputed tangents may refine the curve). Thirty editable anchors remain the cap. Exact inputs and arrows edit dots; keyboard deletion focuses the previous surviving anchor. Space/Enter select without triggering global playback. v0.18.1 places Add dot beside Dots/Draw and a visible key guide above the graph; dot accessible descriptions expose the guide instructions.

- Waveform drawing and control points / dependency group 1: [src/components/FourierWorkspace.tsx](../../src/components/FourierWorkspace.tsx), [src/core/waveform.ts](../../src/core/waveform.ts), [tests/unit/waveform.test.ts](../../tests/unit/waveform.test.ts)
- Waveform drawing and control points / dependency group 2: [tests/browser/fourier.spec.ts](../../tests/browser/fourier.spec.ts)

Key definitions: [signature](../../src/components/FourierWorkspace.tsx#L14), [FourierWorkspace](../../src/components/FourierWorkspace.tsx#L15), [applyPoints](../../src/components/FourierWorkspace.tsx#L75), [movePoint](../../src/components/FourierWorkspace.tsx#L79), [removePoint](../../src/components/FourierWorkspace.tsx#L87), [draw](../../src/components/FourierWorkspace.tsx#L92), [start](../../src/components/FourierWorkspace.tsx#L123), [waveformCoefficients](../../src/core/waveform.ts#L4).

#### Continuous A/B comparison and scheduling

A/B changes keep the musical clock and active envelopes. Phrase clipping preserves chords/rests. Stable source buses and warmed aligned pedal branches avoid silence gaps. Score comparison temporarily overrides only the selected track; Stop/replay restores saved copies. Articulated phrase clips preserve staccato gates, silence clips beyond shortened gates, and break legato at phrase boundaries while keeping independent attacks.

- Continuous A/B comparison and scheduling / dependency group 1: [src/audio/engine.ts](../../src/audio/engine.ts), [src/core/comparison.ts](../../src/core/comparison.ts), [src/components/ComparisonPanel.tsx](../../src/components/ComparisonPanel.tsx)
- Continuous A/B comparison and scheduling / dependency group 2: [tests/browser/comparison.spec.ts](../../tests/browser/comparison.spec.ts)

Key definitions: [AuditionBranch](../../src/audio/engine.ts#L25), [Session](../../src/audio/engine.ts#L32), [AudioEngine](../../src/audio/engine.ts#L58), [AudioEngine.ready](../../src/audio/engine.ts#L72), [AudioEngine.setMonitor](../../src/audio/engine.ts#L97), [AudioEngine.setMix](../../src/audio/engine.ts#L101), [AudioEngine.begin](../../src/audio/engine.ts#L105), [AudioEngine.voice](../../src/audio/engine.ts#L138).

#### Pedalboard and processing

Compressor, overdrive, three-band EQ and delay use independent A/B, track and master boards. Equipment drag/drop places pedals on a4×2 Velcro grid; rotating dials and exact inspector inputs share grouped undo. Mouse/keyboard cables define a validated serial path; unconnected output is silent unless bypassed. Legacy boards load prewired. Delay time20–2000 ms, feedback≤95%, linear wet/dry mix and output trim; bypass closes its input but retains echoes and dry unity, while Stop disposes buffers. Delay adds no compensation latency. Routing edits wait for replay; audition parameters/bypass update live, score parameters freeze. Stable score keys drive through/master assignments into owned copies; saving the library does not apply. Keyboard equipment navigation, placement focus and Escape preserve playback/history. Phaser, chorus and reverb remain planned. Detailed lifecycle/latency and contributor gates live in the pedal guides. M2 v0.33.0 derives metadata and DSP dispatch from a public registry, adds Level in Equipment and schema-3 unavailable-pedal recovery; source/cable/ownership/clock policies remain unchanged. See the M2 tutorial.

- Pedalboard and processing / dependency group 1: [src/audio/effects.ts](../../src/audio/effects.ts), [src/core/pedals.ts](../../src/core/pedals.ts), [src/core/board.ts](../../src/core/board.ts), [src/components/ChainBypass.tsx](../../src/components/ChainBypass.tsx), [src/components/PedalBoardSurface.tsx](../../src/components/PedalBoardSurface.tsx), [src/components/PedalControls.tsx](../../src/components/PedalControls.tsx), [src/components/Pedalboard.tsx](../../src/components/Pedalboard.tsx), [tests/unit/board.test.ts](../../tests/unit/board.test.ts), [src/components/RotaryDial.tsx](../../src/components/RotaryDial.tsx), [src/core/rotary.ts](../../src/core/rotary.ts)
- Pedalboard and processing / dependency group 2: [src/components/ProcessedGraphs.tsx](../../src/components/ProcessedGraphs.tsx)
- Pedalboard and processing / dependency group 3: [src/components/SignalCable.tsx](../../src/components/SignalCable.tsx)
- Pedalboard and processing / dependency group 4: [tests/browser/board-audio.spec.ts](../../tests/browser/board-audio.spec.ts)
- Pedalboard and processing / dependency group 5: [tests/browser/board.spec.ts](../../tests/browser/board.spec.ts), [tests/helpers/board.ts](../../tests/helpers/board.ts), [tests/browser/delay.spec.ts](../../tests/browser/delay.spec.ts), [tests/browser/dials-touch.spec.ts](../../tests/browser/dials-touch.spec.ts), [tests/browser/dials.spec.ts](../../tests/browser/dials.spec.ts), [tests/browser/eq.spec.ts](../../tests/browser/eq.spec.ts), [tests/browser/pedalboard.spec.ts](../../tests/browser/pedalboard.spec.ts), [tests/browser/pedals.spec.ts](../../tests/browser/pedals.spec.ts)

Key definitions: [EffectGraph](../../src/audio/effects.ts#L11), [measureOversamplingLatency](../../src/audio/effects.ts#L20), [createEffect](../../src/audio/effects.ts#L35), [tail](../../src/audio/effects.ts#L66), [tailActive](../../src/audio/effects.ts#L69), [ChainGraph](../../src/audio/effects.ts#L79), [chainLatency](../../src/audio/effects.ts#L91), [chainResources](../../src/audio/effects.ts#L103).

##### Phaser, chorus and algorithmic reverb (planned)

Requested, planned and not implemented. Later stage 8 sequence proposes phaser (all-pass notches, rate/depth/center/stages/bounded feedback), chorus (short modulated delay voices, rate/base delay/depth, initially no feedback), then algorithmic reverb (generated reflections and bounded damped network, pre-delay/-60 dB decay/size/damping). All include explicit output/mix, compact dials/inspector, cable-defined order, independent library/A-B/track/master settings and shared playback/WAV factories. Modulation preserves session-relative clock/LFO continuity; intentional phase/delay is distinct from measured processing latency. Reverb is an IR-free track/master space effect separate from instrument-body chamber acoustics. Future gates include dry/mix gain, extrema stability, finite tails/cap warnings, bypass versus Stop, copy/import/undo/native/keyboard/export and physical listening. Old projects stay unchanged with effects absent. Current stage 7 learning/measurement priority remains.

### Composition studio

Score text owns composition. v0.23.0 removes the tempo/meter form: edit tempo, initial time and changes in the IDE. A persisted global preference places Command Reference or Timeline beside the score, moving the other below with independent track controls; layout changes do not edit project/history/audio. Tab/Shift+Tab indent/outdent even in snippets; F2/Shift+F2 move snippet fields, Ctrl+M toggles Tab focus navigation. Snapshot timing, independent copies and source-aware whole-operation commands remain. Lower track controls retain usable height when the reference is folded. Demo checks follow EXAMPLE_SCORE rather than fix its pitches or duration. v0.23.1 Show beside score has a directional arrow (right in columns, down when stacked). Shared-file track tabs are the explicitly selected next application milestone; swing remains a planned follow-up. v0.23.2 anchors the selector at the right edge of the header, above the action row. Named sections/repeats with beat-based alternate endings are a separate planned follow-on milestone. v0.24.0 implements single-source track tabs and ownership-preserving operations; named sections/alternate endings ship in v0.27.0; variable swing remains planned. General module registries and swing remain planned.

- Composition studio / dependency group 1: [src/App.tsx](../../src/App.tsx), [src/core/scoreWorkspace.ts](../../src/core/scoreWorkspace.ts), [src/components/ScoreWorkspace.tsx](../../src/components/ScoreWorkspace.tsx)
- Composition studio / dependency group 2: [tests/browser/timeline.spec.ts](../../tests/browser/timeline.spec.ts)

Key definitions: [ScoreWorkspace](../../src/App.tsx#L112), [View](../../src/App.tsx#L114), [readPreferences](../../src/App.tsx#L115), [MiniWave](../../src/App.tsx#L137), [RangeControl](../../src/App.tsx#L176), [App](../../src/App.tsx#L226), [measure](../../src/App.tsx#L279), [resetMacros](../../src/App.tsx#L367).

#### Score parsing and editor

Canonical UTF-16 spans connect notes, chords, rests, using/through/master assignments and diagnostics to source. Saved library keys drive completion and assignment validation; invalid directives preserve owned copies. API-v1 chord shapes expand ascending root-position intervals, root octave4 with @override; bundled open5/wide2 use the same registry. Hover/cursor previews expose expanded notes. Autocomplete inserts blank editable shells with Tab/Shift+Tab fields, while reference cards retain examples; unknown shapes and unfinished shells diagnose and block Play. Numeric-only chord qualities require chord:. Bracketed articulation/tuplets and legacy suffix notation coexist; see rhythm. Guarded source operations preserve comments, routing, sibling files, history and independent sounds. General module contracts remain planned.

- Score parsing and editor / dependency group 1: [src/components/ScoreEditor.tsx](../../src/components/ScoreEditor.tsx), [src/core/parser.ts](../../src/core/parser.ts), [src/modules/chords/index.ts](../../src/modules/chords/index.ts), [src/core/chordSymbols.ts](../../src/core/chordSymbols.ts), [tests/unit/chordShapes.test.ts](../../tests/unit/chordShapes.test.ts), [tests/unit/chordSymbols.test.ts](../../tests/unit/chordSymbols.test.ts), [tests/unit/parser.test.ts](../../tests/unit/parser.test.ts), [src/modules/chords/registry.ts](../../src/modules/chords/registry.ts), [src/modules/chords/builtins.ts](../../src/modules/chords/builtins.ts), [src/modules/chords/examples/openFifth.ts](../../src/modules/chords/examples/openFifth.ts), [src/modules/chords/examples/wideSecond.ts](../../src/modules/chords/examples/wideSecond.ts), [src/modules/chords/contracts.ts](../../src/modules/chords/contracts.ts)
- Score parsing and editor / dependency group 2: [src/core/commands.ts](../../src/core/commands.ts)
- Score parsing and editor / dependency group 3: [tests/browser/autocomplete.spec.ts](../../tests/browser/autocomplete.spec.ts), [tests/helpers/autocomplete.ts](../../tests/helpers/autocomplete.ts), [tests/browser/synthesis-notation.spec.ts](../../tests/browser/synthesis-notation.spec.ts), [tests/desktop/app.spec.ts](../../tests/desktop/app.spec.ts), [tests/helpers/synthesisNotation.ts](../../tests/helpers/synthesisNotation.ts)
- Score parsing and editor / dependency group 4: [tests/browser/composition.spec.ts](../../tests/browser/composition.spec.ts)
- Score parsing and editor / dependency group 5: [tests/browser/score-chains.spec.ts](../../tests/browser/score-chains.spec.ts)

Key definitions: [SymbolPreview](../../src/components/ScoreEditor.tsx#L41), [updateChords](../../src/components/ScoreEditor.tsx#L42), [chordField](../../src/components/ScoreEditor.tsx#L43), [chordTooltip](../../src/components/ScoreEditor.tsx#L52), [cursorChord](../../src/components/ScoreEditor.tsx#L67), [chordPreviews](../../src/components/ScoreEditor.tsx#L72), [activeLines](../../src/components/ScoreEditor.tsx#L86), [playbackField](../../src/components/ScoreEditor.tsx#L87).

#### Contextual command reference

Twenty contextual cards expose syntax, examples, saved keys and guarded insertion. Exact/partial command-name matches outrank incidental rule mentions; otherwise all search terms must match. Categories filter results. Using edits only the selected track instrument span; invalid/playing scores block insertion, while details remain searchable and keyboard-readable. Compiled track destinations prevent stale targets. Native menu focuses search after commit. The catalog scrolls internally, filters reset its scroll, and Space scrolls without Play. Expanded reference matches score height across desktop/stacked layouts; collapse restores header height. Compose can place Timeline or reference beside score with a right-side arrow control. Source authority, history and copy ownership remain unchanged.

- Contextual command reference / dependency group 1: [src/App.tsx](../../src/App.tsx), [src/components/CommandReference.tsx](../../src/components/CommandReference.tsx), [src/core/scoreTools.ts](../../src/core/scoreTools.ts), [src/core/commands.ts](../../src/core/commands.ts), [src/core/commandReference.ts](../../src/core/commandReference.ts), [tests/unit/commandReference.test.ts](../../tests/unit/commandReference.test.ts)
- Contextual command reference / dependency group 2: [tests/browser/command-reference.spec.ts](../../tests/browser/command-reference.spec.ts), [tests/helpers/referenceSearch.ts](../../tests/helpers/referenceSearch.ts)

Key definitions: [ScoreWorkspace](../../src/App.tsx#L112), [View](../../src/App.tsx#L114), [readPreferences](../../src/App.tsx#L115), [MiniWave](../../src/App.tsx#L137), [RangeControl](../../src/App.tsx#L176), [App](../../src/App.tsx#L226), [measure](../../src/App.tsx#L279), [resetMacros](../../src/App.tsx#L367).

#### Tempo, meter and timeline

Tempo always counts quarter notes. Meters support 1–32 over 1/2/4/8/16; notes may cross bars. Edit timing in the IDE; the form is removed. Numeric timing expressions use +,-,*,/ and parentheses with conventional precedence, never eval; changes are positive finite quarter-beat positions ≤1,000,000, capped at64 and distinct preceding-meter bar boundaries. Bar rests use the active map even when directives appear below tracks, advance a full bar at a boundary and are not rescaled by tuplets. Repeated bar rests recompute each pass using exact fractions. Timeline/transport use frozen playing revisions; source edits apply on replay. Dense timeline keyboard inspection does not seek or edit source.

- Tempo, meter and timeline / dependency group 1: [src/components/Timeline.tsx](../../src/components/Timeline.tsx), [src/core/meter.ts](../../src/core/meter.ts), [src/core/timeline.ts](../../src/core/timeline.ts), [src/core/scoreTiming.ts](../../src/core/scoreTiming.ts), [src/core/scoreTools.ts](../../src/core/scoreTools.ts), [tests/unit/meter.test.ts](../../tests/unit/meter.test.ts), [tests/unit/timeline.test.ts](../../tests/unit/timeline.test.ts), [src/core/beatExpression.ts](../../src/core/beatExpression.ts), [tests/unit/scoreTools.test.ts](../../tests/unit/scoreTools.test.ts)
- Tempo, meter and timeline / dependency group 2: [tests/browser/meter.spec.ts](../../tests/browser/meter.spec.ts)
- Tempo, meter and timeline / dependency group 3: [tests/browser/timeline.spec.ts](../../tests/browser/timeline.spec.ts)

Key definitions: [Timeline](../../src/components/Timeline.tsx#L5), [percent](../../src/components/Timeline.tsx#L21), [timing](../../src/components/Timeline.tsx#L23), [beatExpression](../../src/core/beatExpression.ts#L4), [multiply](../../src/core/beatExpression.ts#L10), [primary](../../src/core/beatExpression.ts#L12), [product](../../src/core/beatExpression.ts#L34), [sum](../../src/core/beatExpression.ts#L43).

#### Track creation and assignment

Track Maker validates note/chord/rest rows, reorders with buttons, previews project-meter length and optionally assigns a saved pedal key. Compose instrument/pedal selectors edit source spans in one undo operation. Changed chain assignments copy templates; unchanged reparsing and library saving preserve independently edited knobs, bypass and cables. Removing a previously applied source directive clears its chain; legacy unassigned boards survive. Track Maker is a named modal with explicit initial input focus and native-close focus restoration on Escape, close and successful submission. Validation errors retain the open dialog.

- Track creation and assignment / dependency group 1: [src/components/ChainAssignment.tsx](../../src/components/ChainAssignment.tsx)
- Track creation and assignment / dependency group 2: [src/components/TrackMaker.tsx](../../src/components/TrackMaker.tsx)
- Track creation and assignment / dependency group 3: [tests/browser/composition.spec.ts](../../tests/browser/composition.spec.ts)
- Track creation and assignment / dependency group 4: [tests/browser/score-chains.spec.ts](../../tests/browser/score-chains.spec.ts)

Key definitions: [ChainAssignment](../../src/components/ChainAssignment.tsx#L3), [Row](../../src/components/TrackMaker.tsx#L9), [expression](../../src/components/TrackMaker.tsx#L20), [groupedEvents](../../src/components/TrackMaker.tsx#L22), [closeRhythm](../../src/components/TrackMaker.tsx#L26), [TrackMaker](../../src/components/TrackMaker.tsx#L54), [update](../../src/components/TrackMaker.tsx#L91), [move](../../src/components/TrackMaker.tsx#L93).

#### Articulation, tuplets and score meter changes

staccato[...], legato[...], triplet[...] and tuplet:N:M[...] support64 nested scopes. Innermost articulation wins; rests break legato, and short overlaps retain separate attacks without crossing the closing scope. Tuplets multiply exact rational durations for every note/rest, including nested/legacy modifiers; N2–32/M1–32, no enforced event count. Dots and whole–64th durations, eighth alias and bare named-quality chords are supported. repeat N {...} plays N total times (default2,count1–128,depth16,event10000/token-visits100000); positional bar rests resolve on each pass. Source spans retain comments/CRLF and diagnostics. Shared live/comparison/WAV timing preserves clock/phase, latency, finite tails and Stop. The authored EXAMPLE_SCORE lives in src/core/project.ts and must be preserved; Load demo is explicit/undoable and restores missing factory keys conservatively. Variable swing, envelope carry/glide and per-track meters remain planned.

- Articulation, tuplets and score meter changes / dependency group 1: [src/audio/engine.ts](../../src/audio/engine.ts), [src/core/articulation.ts](../../src/core/articulation.ts), [src/audio/voice.ts](../../src/audio/voice.ts), [src/core/comparison.ts](../../src/core/comparison.ts), [src/core/parser.ts](../../src/core/parser.ts), [src/audio/export.ts](../../src/audio/export.ts), [src/core/scoreLexer.ts](../../src/core/scoreLexer.ts), [tests/unit/rhythmPlayback.test.ts](../../tests/unit/rhythmPlayback.test.ts), [src/components/ScoreEditor.tsx](../../src/components/ScoreEditor.tsx), [src/components/TrackMaker.tsx](../../src/components/TrackMaker.tsx), [src/core/rhythm.ts](../../src/core/rhythm.ts), [src/core/meter.ts](../../src/core/meter.ts), [tests/helpers/demo.ts](../../tests/helpers/demo.ts), [tests/unit/articulationBlocks.test.ts](../../tests/unit/articulationBlocks.test.ts), [tests/unit/beatExpression.test.ts](../../tests/unit/beatExpression.test.ts), [tests/unit/repeats.test.ts](../../tests/unit/repeats.test.ts), [tests/unit/scoreLexer.test.ts](../../tests/unit/scoreLexer.test.ts), [src/components/CompositionSettings.tsx](../../src/components/CompositionSettings.tsx), [src/core/timeline.ts](../../src/core/timeline.ts), [tests/browser/demo.spec.ts](../../tests/browser/demo.spec.ts)
- Articulation, tuplets and score meter changes / dependency group 2: [tests/browser/blocks.spec.ts](../../tests/browser/blocks.spec.ts), [tests/helpers/blocks.ts](../../tests/helpers/blocks.ts)
- Articulation, tuplets and score meter changes / dependency group 3: [tests/browser/ide.spec.ts](../../tests/browser/ide.spec.ts), [tests/helpers/ide.ts](../../tests/helpers/ide.ts)
- Articulation, tuplets and score meter changes / dependency group 4: [tests/browser/rhythm.spec.ts](../../tests/browser/rhythm.spec.ts), [tests/helpers/rhythm.ts](../../tests/helpers/rhythm.ts)

Key definitions: [AuditionBranch](../../src/audio/engine.ts#L25), [Session](../../src/audio/engine.ts#L32), [AudioEngine](../../src/audio/engine.ts#L58), [AudioEngine.ready](../../src/audio/engine.ts#L72), [AudioEngine.setMonitor](../../src/audio/engine.ts#L97), [AudioEngine.setMix](../../src/audio/engine.ts#L101), [AudioEngine.begin](../../src/audio/engine.ts#L105), [AudioEngine.voice](../../src/audio/engine.ts#L138).

#### Track operations in the named file editor

v0.30.0 removes automatic per-track and All score/Whole file subtabs. User-created named files show all contained tracks in one editor; names/IDs are independent of track keys. Track in file selects operation/command targets only. Add track to file preserves tab count/name/selection; guarded rename moves owned sound/chain/comparison identity across parts; removal preserves surviving-part ownership. Editor identity depends on file ID, so t, partial headers/groups and diagnostics do not switch files or remount a track editor. File-level CRLF/UTF-16 projections, canonical revision/paste guards and source/undo remain. Track forms capture revision/file ID. Legacy track draft/projection helpers remain tested source services, not active UI or public M5 SDK. Whole-song live/WAV/comparison uses frozen source and independent sounds, preserving phase/clock/latency. General M1–M6, swing and manual gates remain open.

- Track operations in the named file editor / dependency group 1: [src/App.tsx](../../src/App.tsx), [src/core/scoreWorkspace.ts](../../src/core/scoreWorkspace.ts), [src/components/ScoreWorkspace.tsx](../../src/components/ScoreWorkspace.tsx), [tests/unit/scoreWorkspace.test.ts](../../tests/unit/scoreWorkspace.test.ts), [src/components/ScoreEditor.tsx](../../src/components/ScoreEditor.tsx)
- Track operations in the named file editor / dependency group 2: [tests/browser/file-tabs.spec.ts](../../tests/browser/file-tabs.spec.ts), [tests/helpers/fileTabs.ts](../../tests/helpers/fileTabs.ts), [tests/desktop/app.spec.ts](../../tests/desktop/app.spec.ts), [tests/helpers/scoreWorkspace.ts](../../tests/helpers/scoreWorkspace.ts), [tests/browser/score-workspace.spec.ts](../../tests/browser/score-workspace.spec.ts)

Key definitions: [ScoreWorkspace](../../src/App.tsx#L112), [View](../../src/App.tsx#L114), [readPreferences](../../src/App.tsx#L115), [MiniWave](../../src/App.tsx#L137), [RangeControl](../../src/App.tsx#L176), [App](../../src/App.tsx#L226), [measure](../../src/App.tsx#L279), [resetMacros](../../src/App.tsx#L367).

#### Variable swing — planned

Planned variable eighth/sixteenth swing, with proposed long-subdivision share units (50% straight, about66.7% 2:1). Bounds/syntax/scope are provisional; no runtime swing command exists. Written rational beats and fixed pair/bar endpoints remain; shared performance timing for live/WAV/comparison must avoid drift and preserve frozen clocks, phase, latency, copies and finite tails. Tuplets/chords/rests/dots/articulation/repeats and odd-meter boundaries require explicit proof and manual listening.

#### Named sections and alternate endings

Implemented v0.27.0: section A declares track-local source without playing; explicit play A supports forward calls, repeats and invocation-local trim expressions with optional endings. Exact rational cuts shorten spanning notes/chords/rests without a new attack, recalculate staccato gates and retained legato scope, resolve positional bar rests before cutting and expose actual call duration. Definitions and other calls stay unchanged; nested metadata reflects parent clipping. Original UTF-16 definition/call spans, CRLF-safe guarded scoped rename/history, local completion, contextual command cards, declared/trimmed chord previews and frozen-source playback highlights share canonical scoreText. Unused definitions validate in scratch tracks at beat zero without output; undefined/duplicate/cyclic references and depth/call/event/token budgets diagnose. Live/WAV/comparison consume the whole performed score and owned copies, preserving phase/clock/latency and finite tails. General M1–M6, swing and manual gates remain planned.

- Named sections and alternate endings / dependency group 1: [src/components/ScoreEditor.tsx](../../src/components/ScoreEditor.tsx), [src/core/parser.ts](../../src/core/parser.ts), [src/core/scoreSections.ts](../../src/core/scoreSections.ts), [src/components/ScoreWorkspace.tsx](../../src/components/ScoreWorkspace.tsx), [src/components/Timeline.tsx](../../src/components/Timeline.tsx), [src/core/scoreTiming.ts](../../src/core/scoreTiming.ts), [src/core/scoreLexer.ts](../../src/core/scoreLexer.ts), [src/core/sectionTiming.ts](../../src/core/sectionTiming.ts), [src/core/scoreTools.ts](../../src/core/scoreTools.ts), [tests/unit/scoreSections.test.ts](../../tests/unit/scoreSections.test.ts), [tests/unit/sectionEndings.test.ts](../../tests/unit/sectionEndings.test.ts), [src/components/SectionNavigator.tsx](../../src/components/SectionNavigator.tsx), [src/core/commandReference.ts](../../src/core/commandReference.ts), [src/core/scoreWorkspace.ts](../../src/core/scoreWorkspace.ts), [src/core/commands.ts](../../src/core/commands.ts)
- Named sections and alternate endings / dependency group 2: [tests/browser/sections.spec.ts](../../tests/browser/sections.spec.ts), [tests/helpers/sections.ts](../../tests/helpers/sections.ts), [tests/desktop/app.spec.ts](../../tests/desktop/app.spec.ts)

Key definitions: [SymbolPreview](../../src/components/ScoreEditor.tsx#L41), [updateChords](../../src/components/ScoreEditor.tsx#L42), [chordField](../../src/components/ScoreEditor.tsx#L43), [chordTooltip](../../src/components/ScoreEditor.tsx#L52), [cursorChord](../../src/components/ScoreEditor.tsx#L67), [chordPreviews](../../src/components/ScoreEditor.tsx#L72), [activeLines](../../src/components/ScoreEditor.tsx#L86), [playbackField](../../src/components/ScoreEditor.tsx#L87).

#### Virtual song files and shared track parts

Implemented v0.28.0: named file tabs plus Files browser create/rename/delete/close/reopen around one canonical scoreText. Reserved comment boundaries own stable IDs/names and from song links enforce one song/project. Each file supports multiple tracks; matching keys continue exact clocks and share scoped sections/owned sound/chain in source order, while distinct tracks remain parallel. Consistent assignments update all parts; removing one keeps ownership and final explicit removal is undoable. Optional schema2/3 presentation state retains open/active files through JSON/local/recovery/native reopen without music buffers. Revision guards, CRLF projections, cross-file completion/navigation, filename/local-line provenance and selected-file Track Maker/reference retain source authority. Closing/switching does not mute music or enter musical history; frozen whole-song live/WAV/comparison retains phase/clock/seconds latency. At most32 files/128 logical tracks with song-wide expansion budgets. General M1–M6, swing and manual gates remain planned. v0.30.0 makes these the only editor tabs: independent names and multiple tracks per file, target dropdown without projection, no automatic tab changes while typing. Track creation preserves the existing file count and view; section Go navigates whole files.

- Virtual song files and shared track parts / dependency group 1: [src/App.tsx](../../src/App.tsx), [src/core/parser.ts](../../src/core/parser.ts), [src/core/project.ts](../../src/core/project.ts), [src/core/scoreFiles.ts](../../src/core/scoreFiles.ts), [src/core/scoreTools.ts](../../src/core/scoreTools.ts), [src/core/scoreWorkspace.ts](../../src/core/scoreWorkspace.ts), [src/components/ScoreEditor.tsx](../../src/components/ScoreEditor.tsx), [src/components/ScoreWorkspace.tsx](../../src/components/ScoreWorkspace.tsx), [src/core/scoreTiming.ts](../../src/core/scoreTiming.ts), [src/core/scoreLexer.ts](../../src/core/scoreLexer.ts), [src/core/scoreSections.ts](../../src/core/scoreSections.ts), [tests/unit/fileCompilation.test.ts](../../tests/unit/fileCompilation.test.ts), [tests/unit/fileEditing.test.ts](../../tests/unit/fileEditing.test.ts), [tests/unit/fileLimits.test.ts](../../tests/unit/fileLimits.test.ts), [tests/unit/filePersistence.test.ts](../../tests/unit/filePersistence.test.ts), [src/components/ScoreFileTabs.tsx](../../src/components/ScoreFileTabs.tsx), [tests/unit/scoreFiles.test.ts](../../tests/unit/scoreFiles.test.ts), [src/core/commandReference.ts](../../src/core/commandReference.ts), [src/core/commands.ts](../../src/core/commands.ts)
- Virtual song files and shared track parts / dependency group 2: [tests/browser/score-files.spec.ts](../../tests/browser/score-files.spec.ts), [tests/helpers/scoreFiles.ts](../../tests/helpers/scoreFiles.ts), [tests/desktop/app.spec.ts](../../tests/desktop/app.spec.ts)

Key definitions: [ScoreWorkspace](../../src/App.tsx#L112), [View](../../src/App.tsx#L114), [readPreferences](../../src/App.tsx#L115), [MiniWave](../../src/App.tsx#L137), [RangeControl](../../src/App.tsx#L176), [App](../../src/App.tsx#L226), [measure](../../src/App.tsx#L279), [resetMacros](../../src/App.tsx#L367).

### Project state and desktop studio

Versioned local project data, musical undo and sandboxed desktop workflows support personal use. Preferences stay separate from imported projects.

#### Independent copies, persistence and undo

Project schema v1 retains source text and deep-copied applied sounds/chains. Library edits never overwrite track instances. Validation preserves the current project on failed import. Grouped edits retain one undo entry per waveform stroke or rotary gesture. Only exactly unchanged factory Soft bass v1 library templates upgrade to v2; custom templates, existing applied track sounds and A/B snapshots remain unchanged. Debounced and pagehide saves retain the previous distinct checkpoint; semantically unchanged canonicalized reloads preserve it. Local recovery copies are captured by value for inspection/export and validated for stopped, undoable restoration.

- Independent copies, persistence and undo / dependency group 1: [src/core/history.ts](../../src/core/history.ts), [tests/unit/history.test.ts](../../tests/unit/history.test.ts)
- Independent copies, persistence and undo / dependency group 2: [src/core/localSave.ts](../../src/core/localSave.ts), [src/core/project.ts](../../src/core/project.ts), [tests/unit/localSave.test.ts](../../tests/unit/localSave.test.ts), [tests/unit/project.test.ts](../../tests/unit/project.test.ts)
- Independent copies, persistence and undo / dependency group 3: [tests/browser/persistence.spec.ts](../../tests/browser/persistence.spec.ts)
- Independent copies, persistence and undo / dependency group 4: [tests/browser/studio.spec.ts](../../tests/browser/studio.spec.ts)

Key definitions: [History](../../src/core/history.ts#L1), [commit](../../src/core/history.ts#L6), [undo](../../src/core/history.ts#L14), [redo](../../src/core/history.ts#L22), [LocalStore](../../src/core/localSave.ts#L10), [RecoveryCopy](../../src/core/localSave.ts#L15), [readRecoveryCopies](../../src/core/localSave.ts#L24), [loadProject](../../src/core/localSave.ts#L85).

#### Local save recovery inspection and restoration

A header Recovery dialog inspects one previous distinct autosave and one unreadable-save slot with project name, UTF-8 bytes, validation and score preview. Captured original bytes remain stable across autosaves and export unchanged. Valid restoration stops playback, replaces project state as one undo step and preserves independent track/A/B/pedal state and separate preferences. Invalid copies cannot restore but remain exportable. Escape/cancel/export leave history unchanged. Startup damage uses a valid backup even if archiving fails, or opens a fresh example when both fail. Persistent review notice, keyboard focus and narrow-screen layout support recovery. Native File menu opens the panel; trusted raw export is capped at 10 MB and uses a user-chosen path. If archival fails, damaged latest bytes are exposed directly for raw export without writing storage.

- Local save recovery inspection and restoration / dependency group 1: [desktop/main.cjs](../../desktop/main.cjs)
- Local save recovery inspection and restoration / dependency group 2: [desktop/preload.cjs](../../desktop/preload.cjs)
- Local save recovery inspection and restoration / dependency group 3: [src/App.tsx](../../src/App.tsx), [src/core/localSave.ts](../../src/core/localSave.ts), [src/components/RecoveryDialog.tsx](../../src/components/RecoveryDialog.tsx), [tests/unit/localSave.test.ts](../../tests/unit/localSave.test.ts)
- Local save recovery inspection and restoration / dependency group 4: [src/desktop.d.ts](../../src/desktop.d.ts)
- Local save recovery inspection and restoration / dependency group 5: [tests/browser/persistence.spec.ts](../../tests/browser/persistence.spec.ts)
- Local save recovery inspection and restoration / dependency group 6: [tests/browser/recovery.spec.ts](../../tests/browser/recovery.spec.ts)
- Local save recovery inspection and restoration / dependency group 7: [tests/desktop/app.spec.ts](../../tests/desktop/app.spec.ts)

Key definitions: [fs](../../desktop/main.cjs#L2), [path](../../desktop/main.cjs#L3), [window](../../desktop/main.cjs#L17), [developmentUrl](../../desktop/main.cjs#L18), [trustedUrl](../../desktop/main.cjs#L22), [assertStudio](../../desktop/main.cjs#L31), [action](../../desktop/main.cjs#L40), [createWindow](../../desktop/main.cjs#L44).

#### Themes and responsive layout

Instrument, Pedalboard and Compose are primary views; Learn is secondary. Five bundled themes use secondary/tertiary accents and contrast-adapted ink. Theme changes preserve playback and musical undo. Waveform keyboard guidance is directly visible above the Dots graph. Expanded command reference matches score height with fixed search over an internal catalog scroller. Containment preserves score-driven desktop row sizing; scoped border-box observation mirrors stacked height and disconnects on Compose exit.

- Themes and responsive layout / dependency group 1: [src/core/themes.ts](../../src/core/themes.ts), [tests/unit/themes.test.ts](../../tests/unit/themes.test.ts)
- Themes and responsive layout / dependency group 2: [tests/browser/design.spec.ts](../../tests/browser/design.spec.ts)
- Themes and responsive layout / dependency group 3: [tests/browser/themes.spec.ts](../../tests/browser/themes.spec.ts)

Key definitions: [Theme](../../src/core/themes.ts#L1), [THEMES](../../src/core/themes.ts#L17), [rgb](../../src/core/themes.ts#L77), [blend](../../src/core/themes.ts#L78), [luminance](../../src/core/themes.ts#L87), [contrast](../../src/core/themes.ts#L94), [readable](../../src/core/themes.ts#L98), [resolveTheme](../../src/core/themes.ts#L108).

#### Electron application and native files

Sandboxed renderer with no Node access loads local assets via a private protocol. A narrow preload bridge handles native JSON dialogs and menu actions. Portable Windows builds bundle assets; hidden isolated profiles support native tests. File menu/shortcut opens recovery; a separate origin-checked bridge exports bounded raw text through the native dialog without interpreting damaged JSON. The File WAV menu and separate trusted binary bridge validate bounded PCM headers/lengths before native saving; cancellation retains a ready render.

- Electron application and native files / dependency group 1: [desktop/main.cjs](../../desktop/main.cjs)
- Electron application and native files / dependency group 2: [desktop/preload.cjs](../../desktop/preload.cjs)
- Electron application and native files / dependency group 3: [desktop/wav.cjs](../../desktop/wav.cjs)
- Electron application and native files / dependency group 4: [scripts/desktop-dev.mjs](../../scripts/desktop-dev.mjs)
- Electron application and native files / dependency group 5: [tests/desktop/app.spec.ts](../../tests/desktop/app.spec.ts)

Key definitions: [fs](../../desktop/main.cjs#L2), [path](../../desktop/main.cjs#L3), [window](../../desktop/main.cjs#L17), [developmentUrl](../../desktop/main.cjs#L18), [trustedUrl](../../desktop/main.cjs#L22), [assertStudio](../../desktop/main.cjs#L31), [action](../../desktop/main.cjs#L40), [createWindow](../../desktop/main.cjs#L44).

#### Keyboard studio workflow and modal focus

v0.18.0 provides keyboard source-dot creation, equipment placement/patching, named editing dialogs and dense event inspection. Child-handled keys do not invoke global shortcuts. A shared browser/portable demonstration walks actual Tab order to edit/save a timbre, copy and compare A/B, create a track, place and cable an EQ, apply an owned chain through source text, play/replay/Stop, save editable JSON and reload independent settings. Automated functional evidence does not certify all assistive technology, physical-device or listening gates. Schema, synthesis, phase/clock continuity, audio latency and source authority retain existing policies.

- Keyboard studio workflow and modal focus / dependency group 1: [src/App.tsx](../../src/App.tsx), [src/components/Timeline.tsx](../../src/components/Timeline.tsx), [src/components/FourierWorkspace.tsx](../../src/components/FourierWorkspace.tsx), [src/components/TrackMaker.tsx](../../src/components/TrackMaker.tsx)
- Keyboard studio workflow and modal focus / dependency group 2: [src/components/PedalBoardSurface.tsx](../../src/components/PedalBoardSurface.tsx)
- Keyboard studio workflow and modal focus / dependency group 3: [tests/browser/board.spec.ts](../../tests/browser/board.spec.ts)
- Keyboard studio workflow and modal focus / dependency group 4: [tests/browser/fourier.spec.ts](../../tests/browser/fourier.spec.ts)
- Keyboard studio workflow and modal focus / dependency group 5: [tests/browser/keyboard.spec.ts](../../tests/browser/keyboard.spec.ts), [tests/helpers/keyboardWorkflow.ts](../../tests/helpers/keyboardWorkflow.ts), [tests/desktop/app.spec.ts](../../tests/desktop/app.spec.ts)
- Keyboard studio workflow and modal focus / dependency group 6: [tests/browser/timeline.spec.ts](../../tests/browser/timeline.spec.ts)

Key definitions: [ScoreWorkspace](../../src/App.tsx#L112), [View](../../src/App.tsx#L114), [readPreferences](../../src/App.tsx#L115), [MiniWave](../../src/App.tsx#L137), [RangeControl](../../src/App.tsx#L176), [App](../../src/App.tsx#L226), [measure](../../src/App.tsx#L279), [resetMacros](../../src/App.tsx#L367).

### Maintained project knowledge

Tree-sitter links, editorial feature hierarchy, dependency communities, local semantic seeds and personalized PageRank provide cited fixed-budget navigation. Current-state summaries replace release chronology; TASK_GUIDE.md routes routine tasks directly to source. Graph queries are optional when the relevant area is already known; start at1024 tokens and widen only for unresolved dependencies. Keep private instructions/caches/models out of Git and repository text local. Update affected summaries/decisions once, build/check before committing, and verify semantic seeds/budgets when retrieval changes. Graph structure is retained; extra clustering/LLM summaries are not needed.

- Maintained project knowledge / dependency group 1: [scripts/knowledge/cli.mjs](../../scripts/knowledge/cli.mjs), [scripts/knowledge/graph.mjs](../../scripts/knowledge/graph.mjs), [scripts/knowledge/summaries.mjs](../../scripts/knowledge/summaries.mjs), [scripts/knowledge/semantic.mjs](../../scripts/knowledge/semantic.mjs), [scripts/knowledge/rank.mjs](../../scripts/knowledge/rank.mjs), [scripts/knowledge/context.mjs](../../scripts/knowledge/context.mjs), [scripts/knowledge/extract.mjs](../../scripts/knowledge/extract.mjs), [scripts/knowledge/verify.mjs](../../scripts/knowledge/verify.mjs), [scripts/knowledge/watch.mjs](../../scripts/knowledge/watch.mjs), [tests/unit/knowledge.test.ts](../../tests/unit/knowledge.test.ts)

Key definitions: [root](../../scripts/knowledge/cli.mjs#L10), [option](../../scripts/knowledge/cli.mjs#L12), [TOKENIZER](../../scripts/knowledge/context.mjs#L3), [tokenizer](../../scripts/knowledge/context.mjs#L4), [tokenCount](../../scripts/knowledge/context.mjs#L5), [packContext](../../scripts/knowledge/context.mjs#L6), [concept](../../scripts/knowledge/context.mjs#L17), [boost](../../scripts/knowledge/context.mjs#L21).

### Project mix WAV export

v0.19.0 exports frozen source and applied independent sound/processing copies through shared voice/effect/score graph factories. Cable routing, track/master processing, bypass, levels and project mix are included; monitor and A/B overrides are excluded. PCM16 defaults to 48 kHz stereo with 44.1 kHz/mono alternatives. Duration keeps rests, max release, measured latency and 100 ms settling plus a default 5 s echo budget bounded 0–30 s. Conservative decay warns of possible cutoff, capped tails fade 20 ms and measured cap activity is reported. Peaks and clipping are shown; Save requires a safe explicit export level or opt-in -1 dBFS normalization. Non-finite audio fails and silence stays silent. A 256 MiB conservative memory preflight precedes allocation. Browser downloads and validated native saving preserve JSON, playback and history. Native cancellation retains the render; closing drops background results. The stage 6 automated functional gate passes in tested Chromium/Electron workflows; physical listening and other browser/device gates remain open. v0.21.0 shares articulation timing with live voices, caps staccato release and includes legato sounding extent even beyond a tiny final note; written rests, clocks and export resource/tail limits remain.

- Project mix WAV export / dependency group 1: [desktop/wav.cjs](../../desktop/wav.cjs)
- Project mix WAV export / dependency group 2: [src/audio/export.ts](../../src/audio/export.ts), [src/core/wav.ts](../../src/core/wav.ts), [src/audio/scoreGraph.ts](../../src/audio/scoreGraph.ts), [src/audio/voiceLimit.ts](../../src/audio/voiceLimit.ts), [src/components/WavExport.tsx](../../src/components/WavExport.tsx), [tests/unit/export.test.ts](../../tests/unit/export.test.ts), [tests/unit/nativeWav.test.ts](../../tests/unit/nativeWav.test.ts), [tests/unit/wav.test.ts](../../tests/unit/wav.test.ts)
- Project mix WAV export / dependency group 3: [tests/browser/export-audio.spec.ts](../../tests/browser/export-audio.spec.ts)
- Project mix WAV export / dependency group 4: [tests/browser/export.spec.ts](../../tests/browser/export.spec.ts)
- Project mix WAV export / dependency group 5: [tests/desktop/app.spec.ts](../../tests/desktop/app.spec.ts)

Key definitions: [LIMIT](../../desktop/wav.cjs#L1), [validateWav](../../desktop/wav.cjs#L2), [routedTail](../../src/audio/export.ts#L19), [prepareExport](../../src/audio/export.ts#L31), [renderWav](../../src/audio/export.ts#L97), [WavRender](../../src/audio/export.ts#L164), [createScoreGraph](../../src/audio/scoreGraph.ts#L7), [dispose](../../src/audio/scoreGraph.ts#L66).


## Parser coverage

Tree-sitter reports partial syntax recovery in `src/App.tsx`, `tests/desktop/app.spec.ts`. These files remain indexed; inspect exact source before changing recovered regions. TypeScript compilation is a separate correctness check.

## Maintenance

Keep feature summaries current and concise; put chronology in IMPLEMENTATION_STATUS.md. Update decisions with invariant changes. Regenerate/check before committing. Use TASK_GUIDE.md for known areas and optional focused graph queries for unfamiliar relationships.

# FourPataka project map

Generated with `npm run knowledge:build`. Edit features.json and DECISIONS.md for behavioral summaries; source locations below are derived from the working files.

Full source fingerprints are kept in the local graph cache; this tracked map records feature summaries, dependency groups and source locations.

## Retrieval path

Task → local semantic seeds → graph neighborhood → personalized PageRank → fixed token budget → cited context.

## FourPataka

Personal Fourier music studio. Source score text owns composition; independent sound and pedal copies preserve experiments. v0.14.0 connects saved pedal keys to track through and global master directives, Compose selectors, Track Maker and contextual autocomplete. Compact physical boards implement compressor, overdrive, EQ and delay with real serial cables. Delay bypass preserves echoes; Stop clears buffers. Broader release/device gates remain planned. v0.14.1 places command reference beside an enlarged score editor, with timeline and track controls below. v0.15.0 completes the contextual command-reference functional item; stage 4/5 recovery, broader accessibility and real-device gates remain. v0.16.0 adds working harmonic sign controls and a distinct Soft bass factory preset, with conservative library-only migration. v0.17.0 completes local-save recovery inspection/export/undoable restoration; broader accessibility/device and demonstration gates remain open. v0.18.0 adds keyboard dot insertion, focus-safe equipment/dialogs, dense timeline inspection and a full Tab-order studio demonstration; manual screen-reader, real-device and listening gates remain. v0.18.1 improves waveform keyboard discoverability and halves the command-reference panel with persistent search and internal scrolling; musical behavior and roadmap gates are unchanged. v0.19.0 implements frozen project WAV export with shared synthesis/routing, bounded release/echo tails, peak review and explicit level handling, memory preflight and browser/native saving. Stage 7 learning/measurement follows; stage 5 manual gates remain open. v0.19.1 makes the expanded reference match the score panel height across responsive layouts, with fixed search and local scrolling; no musical or gate change. v0.19.2 bounds track sound controls to the timeline row with a fixed heading and keyboard scrolling; phaser, chorus and algorithmic reverb are planned future pedals. v0.20.0 implements extensible chord symbols and a 32-harmonic bank ahead of general modularity. Following this pilot, the next foundation: the planned six-milestone modular open-source contributor program begins with M1 contracts/compatibility; learning/analysis remains the next music-feature item after initial boundaries. The subsequent rhythm release adds staccato/legato gates, dotted and N:M event durations, and global in-score meter changes; general modularity remains planned.

### Modular open-source contributor program (planned)

Major requested program, planned and not implemented, split into separately releasable M1 contracts/compatibility, M2 pedals, M3 presets, M4 engines, M5 features and M6 open-source readiness. The user-selected chord/32-harmonic pilot precedes M1; general M1 is the following foundation: source-reviewed bundled module registries and versioned contracts for pedals, Fourier instrument presets, later synthesis engines and feature panels/commands. Built-ins use contributor contracts; one folder plus explicit assembly registration replaces scattered switches. Preserve source authority, owned copies, session phase/clock, measured seconds-based latency, finite tails/Stop and shared live/WAV factories. Distinguish namespaced module IDs, score keys, API and data versions; retain unavailable-module data without silently changing sound. Contributor tutorials, runnable examples, contract checks, migration fixtures, owner-approved licensing/attributions and repeatable CI are acceptance gates. A narrow chord registry is implemented by the synthesis/notation pilot; general pedal/preset/engine/feature registries, runtime loader, missing-module preservation, SDK and publication remain planned.

#### M1 module contracts and compatibility baseline (planned)

Planned, not started; next major foundation milestone. Typed definitions, explicit validated registries, stable namespaced IDs separate from score keys, API/data versions, parameter units and import boundaries. Capture schema-v1/owned-copy/audio/WAV fixtures without changing saved format; route one existing pedal metadata through a thin registry slice and ship a buildable registration example.

#### M2 pedal modules and contributor example (planned)

Planned, not started; depends on M1. Move four built-in pedals through one contributor contract; derive equipment/drag controls/validation, latency and export tail/resource estimates from definitions. Prove an independent utility pedal needs one folder/assembly entry without host kind switches; deliver migration/unavailable-pedal support before saving new types, tested tutorial, live/WAV gain/continuity/tail/Stop/copy/native gates. Phaser/chorus/reverb remain separate later effects.

#### M3 modular Fourier instrument presets (planned)

Planned, not started; depends on M1, independently releasable from engines. Registry-backed factory timbres and one contributor preset through fresh pure factories; separate type identity and project preset keys/versions. Preserve customized libraries and applied A/B/track copies, signed absolute coefficients, previews, source assignments and phase-continuous shared live/WAV output. Tutorial/units/schema/upgrade tests required. The Fourier bank now supports 32 harmonics in schema 2; the preset-module API remains planned.

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

Key definitions: [Voice](../../src/audio/voice.ts#L3), [Source](../../src/audio/voice.ts#L11), [TRANSITION](../../src/audio/voice.ts#L16), [holdParameter](../../src/audio/voice.ts#L19), [createVoice](../../src/audio/voice.ts#L28), [source](../../src/audio/voice.ts#L59), [setSources](../../src/audio/voice.ts#L100), [end](../../src/audio/voice.ts#L142).

#### Instrument presets and source thumbnails

Soft bass v2 uses six positive partials [1, 0.22, 0.1, 0.045, 0.02, 0.009], attack 30 ms, release 350 ms and trim −12 dB; Triangle retains alternating odd signs. Library and editor thumbnails sample their actual signed harmonic bank, excluding undertones/trim/envelope. Decorative thumbnail scaling never normalizes audio. Only an untouched factory v1 library template upgrades; applied tracks and A/B remain owned copies until explicit loading/application.

- Instrument presets and source thumbnails / dependency group 1: [src/App.tsx](../../src/App.tsx), [src/core/project.ts](../../src/core/project.ts), [src/core/instrumentPresets.ts](../../src/core/instrumentPresets.ts), [tests/unit/instrumentPresets.test.ts](../../tests/unit/instrumentPresets.test.ts)
- Instrument presets and source thumbnails / dependency group 2: [tests/browser/instrument-presets.spec.ts](../../tests/browser/instrument-presets.spec.ts)
- Instrument presets and source thumbnails / dependency group 3: [tests/desktop/app.spec.ts](../../tests/desktop/app.spec.ts)

Key definitions: [ScoreEditor](../../src/App.tsx#L101), [View](../../src/App.tsx#L103), [readPreferences](../../src/App.tsx#L104), [MiniWave](../../src/App.tsx#L119), [RangeControl](../../src/App.tsx#L154), [App](../../src/App.tsx#L204), [measure](../../src/App.tsx#L253), [resetMacros](../../src/App.tsx#L328).

#### 32-harmonic Fourier bank

Implemented synthesis/notation pilot: signed absolute H1–H32 coefficients, primary H1–H16 plus collapsible H17–H32 controls. Waveform projection and shared live/WAV PeriodicWave include all 32; coefficients at or above Nyquist remain saved but do not sound. Schema 2 imports schema 1 by zero-padding magnitudes and +1 signs independently across libraries, tracks and A/B; lower coefficients, waveform points, trim, source and macro brightness response remain intact. Storage keys remain stable. Fresh mathematical presets use 32; legacy applied sounds retain their old timbre. Broader engine modules/chamber acoustics remain planned.

- 32-harmonic Fourier bank / dependency group 1: [src/audio/voice.ts](../../src/audio/voice.ts), [src/core/music.ts](../../src/core/music.ts), [src/core/instrumentPresets.ts](../../src/core/instrumentPresets.ts), [src/core/project.ts](../../src/core/project.ts), [src/core/waveform.ts](../../src/core/waveform.ts), [tests/unit/harmonicMigration.test.ts](../../tests/unit/harmonicMigration.test.ts)
- 32-harmonic Fourier bank / dependency group 2: [tests/browser/synthesis-notation.spec.ts](../../tests/browser/synthesis-notation.spec.ts)

Key definitions: [Voice](../../src/audio/voice.ts#L3), [Source](../../src/audio/voice.ts#L11), [TRANSITION](../../src/audio/voice.ts#L16), [holdParameter](../../src/audio/voice.ts#L19), [createVoice](../../src/audio/voice.ts#L28), [source](../../src/audio/voice.ts#L59), [setSources](../../src/audio/voice.ts#L100), [end](../../src/audio/voice.ts#L142).

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

Compressor, overdrive, three-band EQ and delay have independent audition A/B, track and master boards. Equipment is picked before placement on a 4 by 2 Velcro grid. During drags the menu clears the underlying slots after Chromium captures the drag image; canceled or rejected drops clear transient state without history. Small circular dials live on pedals; the selected-pedal inspector holds exact inputs, sliders and EQ flat reset. Captured placement drags snap and undo in one step without changing audio order. Mouse or keyboard jack connections define a validated serial path; unplugged output is silent unless the board is bypassed. Legacy chains load prewired. Delay time is 20–2000 ms with feedback capped at 95%, output trim and linear mix. Pedal/whole-chain bypass closes the delay feed, retains old echoes and restores dry unity. Measured tail indicators bridge echo gaps; finite decay budgets extend cleanup, while Stop disposes buffers. Delay adds no track compensation latency. Routing changes wait for replay during playback; audition parameters and bypass remain live, score parameters freeze. Stable library score keys support through/master assignments. Assignment changes load independent copies; unchanged source and library saving preserve local settings. Pedalboard application synchronizes the score while retaining the exact sandbox copy. Equipment uses arrow/Home/End focus with disabled-item skipping. Keyboard selection focuses the first free slot or input terminal output jack; placement transfers focus to the new grip. Escape returns to Equipment without stopping audio or adding history. Native drag-image capture behavior remains intact. Phaser, chorus and algorithmic reverb are planned later, not current equipment; their shared copy/modulation/bypass/tail/WAV gates belong to the later expansion.

- Pedalboard and processing / dependency group 1: [src/audio/effects.ts](../../src/audio/effects.ts), [src/core/pedals.ts](../../src/core/pedals.ts), [src/core/board.ts](../../src/core/board.ts), [src/components/ChainBypass.tsx](../../src/components/ChainBypass.tsx), [src/components/PedalBoardSurface.tsx](../../src/components/PedalBoardSurface.tsx), [src/components/PedalControls.tsx](../../src/components/PedalControls.tsx), [src/components/Pedalboard.tsx](../../src/components/Pedalboard.tsx), [tests/unit/board.test.ts](../../tests/unit/board.test.ts), [src/components/RotaryDial.tsx](../../src/components/RotaryDial.tsx), [src/core/rotary.ts](../../src/core/rotary.ts)
- Pedalboard and processing / dependency group 2: [src/components/ProcessedGraphs.tsx](../../src/components/ProcessedGraphs.tsx)
- Pedalboard and processing / dependency group 3: [src/components/SignalCable.tsx](../../src/components/SignalCable.tsx)
- Pedalboard and processing / dependency group 4: [tests/browser/board-audio.spec.ts](../../tests/browser/board-audio.spec.ts)
- Pedalboard and processing / dependency group 5: [tests/browser/board.spec.ts](../../tests/browser/board.spec.ts), [tests/helpers/board.ts](../../tests/helpers/board.ts), [tests/browser/delay.spec.ts](../../tests/browser/delay.spec.ts), [tests/browser/dials-touch.spec.ts](../../tests/browser/dials-touch.spec.ts), [tests/browser/dials.spec.ts](../../tests/browser/dials.spec.ts), [tests/browser/eq.spec.ts](../../tests/browser/eq.spec.ts), [tests/browser/pedalboard.spec.ts](../../tests/browser/pedalboard.spec.ts), [tests/browser/pedals.spec.ts](../../tests/browser/pedals.spec.ts)

Key definitions: [EffectGraph](../../src/audio/effects.ts#L12), [measureOversamplingLatency](../../src/audio/effects.ts#L21), [createEffect](../../src/audio/effects.ts#L38), [set](../../src/audio/effects.ts#L141), [update](../../src/audio/effects.ts#L145), [tail](../../src/audio/effects.ts#L192), [tailActive](../../src/audio/effects.ts#L201), [ChainGraph](../../src/audio/effects.ts#L214).

##### Phaser, chorus and algorithmic reverb (planned)

Requested, planned and not implemented. Later stage 8 sequence proposes phaser (all-pass notches, rate/depth/center/stages/bounded feedback), chorus (short modulated delay voices, rate/base delay/depth, initially no feedback), then algorithmic reverb (generated reflections and bounded damped network, pre-delay/-60 dB decay/size/damping). All include explicit output/mix, compact dials/inspector, cable-defined order, independent library/A-B/track/master settings and shared playback/WAV factories. Modulation preserves session-relative clock/LFO continuity; intentional phase/delay is distinct from measured processing latency. Reverb is an IR-free track/master space effect separate from instrument-body chamber acoustics. Future gates include dry/mix gain, extrema stability, finite tails/cap warnings, bypass versus Stop, copy/import/undo/native/keyboard/export and physical listening. Old projects stay unchanged with effects absent. Current stage 7 learning/measurement priority remains.

### Composition studio

Line-oriented score text is authoritative. The enlarged score editor fills its panel beside command reference. Timeline, independent track/master controls and event inspection sit below; narrow screens stack in DOM reading order. Parallel tracks start together; compiled timeline and transport retain the frozen playing revision. Text edits take effect on replay. v0.19.2 contains the track panel to the timeline-driven desktop row with a fixed heading and named scroll body; stacked track controls are bounded at 440 px. Source/history and independent-copy behavior are unchanged.

- Composition studio / dependency group 1: [src/App.tsx](../../src/App.tsx)
- Composition studio / dependency group 2: [tests/browser/timeline.spec.ts](../../tests/browser/timeline.spec.ts)

Key definitions: [ScoreEditor](../../src/App.tsx#L101), [View](../../src/App.tsx#L103), [readPreferences](../../src/App.tsx#L104), [MiniWave](../../src/App.tsx#L119), [RangeControl](../../src/App.tsx#L154), [App](../../src/App.tsx#L204), [measure](../../src/App.tsx#L253), [resetMacros](../../src/App.tsx#L328).

#### Score parsing and editor

Source offsets map diagnostics, explicit notes/chords/rests and instrument/pedal assignments back to text. Track through and one global master through directive validate local library keys. Eighteen shared command definitions supply contextual reference snippets, syntax/rules and source-aware insertion. Using/through completion restricts optional suggestions to the matching saved library. Unknown/duplicate directives diagnose visibly and preserve applied copies. Registered chord symbols now expand through bundled API-v1 shape definitions, default root octave 4 and @octave override, full ascending root-position intervals. Compiled source spans drive hover and keyboard cursor note previews without editing text. Unknown shapes diagnose; blank completion shells remain blank, suffix choices insert only selected aliases. A shipped open5 example and contributor guide exercise the same contract as built-ins. v0.19.3 command autocomplete inserts blank editable shells instead of reference examples: chord notes/octave/duration and track name/instrument/events use Tab/Shift+Tab fields. A typed chord: prefix is replaced once with chord:(). Explicit meter and saved library choices remain values; unfinished shells retain parser diagnostics and block Play. Reference cards keep complete examples; no source/history/copy/audio policy or roadmap gate change. Rhythm syntax adds 32nd/64th, dots, per-event triplet/N:M and staccato/legato; global meter changes retain source spans and diagnostics. See rhythm for implemented timing invariants.

- Score parsing and editor / dependency group 1: [src/components/ScoreEditor.tsx](../../src/components/ScoreEditor.tsx), [src/core/parser.ts](../../src/core/parser.ts), [src/modules/chords/index.ts](../../src/modules/chords/index.ts), [src/core/chordSymbols.ts](../../src/core/chordSymbols.ts), [tests/unit/chordSymbols.test.ts](../../tests/unit/chordSymbols.test.ts), [tests/unit/parser.test.ts](../../tests/unit/parser.test.ts), [src/modules/chords/registry.ts](../../src/modules/chords/registry.ts), [src/modules/chords/builtins.ts](../../src/modules/chords/builtins.ts), [src/modules/chords/examples/openFifth.ts](../../src/modules/chords/examples/openFifth.ts), [tests/unit/chordShapes.test.ts](../../tests/unit/chordShapes.test.ts), [src/modules/chords/contracts.ts](../../src/modules/chords/contracts.ts)
- Score parsing and editor / dependency group 2: [src/core/commands.ts](../../src/core/commands.ts)
- Score parsing and editor / dependency group 3: [tests/browser/autocomplete.spec.ts](../../tests/browser/autocomplete.spec.ts), [tests/helpers/autocomplete.ts](../../tests/helpers/autocomplete.ts), [tests/browser/synthesis-notation.spec.ts](../../tests/browser/synthesis-notation.spec.ts), [tests/desktop/app.spec.ts](../../tests/desktop/app.spec.ts), [tests/helpers/synthesisNotation.ts](../../tests/helpers/synthesisNotation.ts)
- Score parsing and editor / dependency group 4: [tests/browser/composition.spec.ts](../../tests/browser/composition.spec.ts)
- Score parsing and editor / dependency group 5: [tests/browser/score-chains.spec.ts](../../tests/browser/score-chains.spec.ts)

Key definitions: [SymbolPreview](../../src/components/ScoreEditor.tsx#L22), [updateChords](../../src/components/ScoreEditor.tsx#L23), [chordField](../../src/components/ScoreEditor.tsx#L24), [chordTooltip](../../src/components/ScoreEditor.tsx#L33), [cursorChord](../../src/components/ScoreEditor.tsx#L48), [chordPreviews](../../src/components/ScoreEditor.tsx#L53), [activeLines](../../src/components/ScoreEditor.tsx#L67), [playbackField](../../src/components/ScoreEditor.tsx#L68).

#### Contextual command reference

Twelve scoped cards show the selected instrument/pedal keys, unique new-track snippets, syntax/rules and insertion destinations. Search matches all terms across syntax, rules and selected keys; categories filter the catalog. Using edits only the selected track instrument span, preserving notes/comments/routing and independent copy semantics. Compiled tracks prevent stale destinations on an empty score; globals/first-track creation remain available. Invalid/playing scores block insertion while details stay readable by keyboard. Native menu focuses search after DOM commit. Functional reference work is implemented; local recovery follows in v0.17.0 and keyboard workflow polish in v0.18.0. Broader assistive-technology and real-device/listening gates remain. v0.19.1 matches expanded reference height to the score panel. Desktop size containment keeps the catalog from sizing the grid row; a scoped border-box observer mirrors score height in stacked layouts, including diagnostics. Collapse returns to header height. Search stays above the named focusable catalog scroller; Space scrolls without global Play, and filtering returns results to the top without stealing search focus. All cards, rules, destination controls and source insertion remain available.

- Contextual command reference / dependency group 1: [src/App.tsx](../../src/App.tsx), [src/components/CommandReference.tsx](../../src/components/CommandReference.tsx), [src/core/scoreTools.ts](../../src/core/scoreTools.ts), [src/core/commands.ts](../../src/core/commands.ts), [src/core/commandReference.ts](../../src/core/commandReference.ts), [tests/unit/commandReference.test.ts](../../tests/unit/commandReference.test.ts)
- Contextual command reference / dependency group 2: [tests/browser/command-reference.spec.ts](../../tests/browser/command-reference.spec.ts)

Key definitions: [ScoreEditor](../../src/App.tsx#L101), [View](../../src/App.tsx#L103), [readPreferences](../../src/App.tsx#L104), [MiniWave](../../src/App.tsx#L119), [RangeControl](../../src/App.tsx#L154), [App](../../src/App.tsx#L204), [measure](../../src/App.tsx#L253), [resetMacros](../../src/App.tsx#L328).

#### Tempo, meter and timeline

Tempo always counts quarter notes. Project meters support 1–32 over 1/2/4/8/16; 6/8 spans three quarter beats. Partial bars and crossing notes are valid. Timing edits preserve comments and form one undo step; invalid or playing scores guard those controls. Timeline pickers show event number, pitch/rest, bar/beat and quarter-beat duration with Previous/Next. One note Tab stop per track supports bounded arrows/Home/End. Live selection announcement and accessible descriptions expose timing without hovering. Dense marks retain positive width; readable selectors provide usable targets. Inspection reads the displayed frozen revision and does not seek, edit source or create musical history. The v0.21.0 global meter map changes on preceding-meter boundaries with continuous bar numbering, frozen playback timing and retained change labels under grid thinning. Reduced rational event accumulation avoids tuplet drift; written spacing and tempo do not depend on articulation gates.

- Tempo, meter and timeline / dependency group 1: [src/components/CompositionSettings.tsx](../../src/components/CompositionSettings.tsx), [src/core/meter.ts](../../src/core/meter.ts), [src/components/Timeline.tsx](../../src/components/Timeline.tsx), [src/core/scoreTools.ts](../../src/core/scoreTools.ts), [src/core/timeline.ts](../../src/core/timeline.ts), [tests/unit/meter.test.ts](../../tests/unit/meter.test.ts), [tests/unit/timeline.test.ts](../../tests/unit/timeline.test.ts), [tests/unit/scoreTools.test.ts](../../tests/unit/scoreTools.test.ts)
- Tempo, meter and timeline / dependency group 2: [tests/browser/meter.spec.ts](../../tests/browser/meter.spec.ts)
- Tempo, meter and timeline / dependency group 3: [tests/browser/timeline.spec.ts](../../tests/browser/timeline.spec.ts)

Key definitions: [CompositionSettings](../../src/components/CompositionSettings.tsx#L4), [Timeline](../../src/components/Timeline.tsx#L5), [percent](../../src/components/Timeline.tsx#L21), [timing](../../src/components/Timeline.tsx#L23), [TimeSignature](../../src/core/meter.ts#L1), [MeterChange](../../src/core/meter.ts#L5), [meterSegments](../../src/core/meter.ts#L12), [measurePositionAt](../../src/core/meter.ts#L22).

#### Track creation and assignment

Track Maker validates note/chord/rest rows, reorders with buttons, previews project-meter length and optionally assigns a saved pedal key. Compose instrument/pedal selectors edit source spans in one undo operation. Changed chain assignments copy templates; unchanged reparsing and library saving preserve independently edited knobs, bypass and cables. Removing a previously applied source directive clears its chain; legacy unassigned boards survive. Track Maker is a named modal with explicit initial input focus and native-close focus restoration on Escape, close and successful submission. Validation errors retain the open dialog.

- Track creation and assignment / dependency group 1: [src/components/ChainAssignment.tsx](../../src/components/ChainAssignment.tsx)
- Track creation and assignment / dependency group 2: [src/components/TrackMaker.tsx](../../src/components/TrackMaker.tsx)
- Track creation and assignment / dependency group 3: [tests/browser/composition.spec.ts](../../tests/browser/composition.spec.ts)
- Track creation and assignment / dependency group 4: [tests/browser/score-chains.spec.ts](../../tests/browser/score-chains.spec.ts)

Key definitions: [ChainAssignment](../../src/components/ChainAssignment.tsx#L3), [Row](../../src/components/TrackMaker.tsx#L9), [expression](../../src/components/TrackMaker.tsx#L20), [TrackMaker](../../src/components/TrackMaker.tsx#L22), [update](../../src/components/TrackMaker.tsx#L58), [move](../../src/components/TrackMaker.tsx#L60), [add](../../src/components/TrackMaker.tsx#L71), [source](../../tests/browser/score-chains.spec.ts#L3).

#### Articulation, tuplets and score meter changes

Implemented rhythm extension: exact rational quarter-beat accumulation supports whole through 64th, one/two dots, per-event triplet or tuplet:N:M (N 2–32, M 1–32). Optional staccato halves the gate and caps release at 30ms or a quarter of event seconds; optional legato overlaps the following sounding event by at most 30ms/10% duration with independent attacks. Rests and track/phrase ends break legato. Global time meter at beat directives (up to 64) change all tracks on preceding-meter bar boundaries, preserving tempo, written spacing, source spans and continuous bar numbering. Compose and Track Maker edit source in grouped history; editor modifier suggestions and 18 command cards document real grammar. Live, comparison and WAV share timing; sounding extent includes overlaps independently of the written clock, with bounded tails and Stop. No envelope carry, glide, nested/group tuplets, per-track meters, runtime grammar plugins or general M1 completion. v0.21.1 starter/demo score exercises seven synchronized bars, triplets, 5:4 tuplets, dots/double dots, 32nd/64th notes, staccato/legato, explicit voicings and chord symbols, with 4/4 to 7/8 to 3/4 to 4/4 at offsets 8/15/21. Load demo score is an explicit undoable source replacement; existing autosaves do not silently upgrade, customized libraries/owned sounds remain, and only missing demo instrument keys are restored with unique IDs.

- Articulation, tuplets and score meter changes / dependency group 1: [src/audio/engine.ts](../../src/audio/engine.ts), [src/core/articulation.ts](../../src/core/articulation.ts), [src/audio/voice.ts](../../src/audio/voice.ts), [src/core/comparison.ts](../../src/core/comparison.ts), [src/core/parser.ts](../../src/core/parser.ts), [src/audio/export.ts](../../src/audio/export.ts), [tests/unit/rhythmPlayback.test.ts](../../tests/unit/rhythmPlayback.test.ts), [src/components/ScoreEditor.tsx](../../src/components/ScoreEditor.tsx), [src/components/TrackMaker.tsx](../../src/components/TrackMaker.tsx), [src/core/rhythm.ts](../../src/core/rhythm.ts), [src/core/meter.ts](../../src/core/meter.ts), [src/components/CompositionSettings.tsx](../../src/components/CompositionSettings.tsx), [src/core/timeline.ts](../../src/core/timeline.ts)
- Articulation, tuplets and score meter changes / dependency group 2: [tests/browser/demo.spec.ts](../../tests/browser/demo.spec.ts), [tests/helpers/demo.ts](../../tests/helpers/demo.ts)
- Articulation, tuplets and score meter changes / dependency group 3: [tests/browser/rhythm.spec.ts](../../tests/browser/rhythm.spec.ts), [tests/helpers/rhythm.ts](../../tests/helpers/rhythm.ts)

Key definitions: [AuditionBranch](../../src/audio/engine.ts#L25), [Session](../../src/audio/engine.ts#L32), [AudioEngine](../../src/audio/engine.ts#L58), [AudioEngine.ready](../../src/audio/engine.ts#L72), [AudioEngine.setMonitor](../../src/audio/engine.ts#L97), [AudioEngine.setMix](../../src/audio/engine.ts#L101), [AudioEngine.begin](../../src/audio/engine.ts#L105), [AudioEngine.voice](../../src/audio/engine.ts#L138).

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

Key definitions: [ScoreEditor](../../src/App.tsx#L101), [View](../../src/App.tsx#L103), [readPreferences](../../src/App.tsx#L104), [MiniWave](../../src/App.tsx#L119), [RangeControl](../../src/App.tsx#L154), [App](../../src/App.tsx#L204), [measure](../../src/App.tsx#L253), [resetMacros](../../src/App.tsx#L328).

### Maintained project knowledge

Tree-sitter code links, source-linked docs/plans, feature and dependency summaries, local embedding seeds and personalized PageRank produce bounded context. Refresh hashes after changes and maintain behavioral summaries alongside implementation.

- Maintained project knowledge / dependency group 1: [scripts/knowledge/cli.mjs](../../scripts/knowledge/cli.mjs), [scripts/knowledge/graph.mjs](../../scripts/knowledge/graph.mjs), [scripts/knowledge/summaries.mjs](../../scripts/knowledge/summaries.mjs), [scripts/knowledge/semantic.mjs](../../scripts/knowledge/semantic.mjs), [scripts/knowledge/rank.mjs](../../scripts/knowledge/rank.mjs), [scripts/knowledge/context.mjs](../../scripts/knowledge/context.mjs), [scripts/knowledge/extract.mjs](../../scripts/knowledge/extract.mjs), [scripts/knowledge/verify.mjs](../../scripts/knowledge/verify.mjs), [scripts/knowledge/watch.mjs](../../scripts/knowledge/watch.mjs), [tests/unit/knowledge.test.ts](../../tests/unit/knowledge.test.ts)

Key definitions: [root](../../scripts/knowledge/cli.mjs#L10), [option](../../scripts/knowledge/cli.mjs#L12), [TOKENIZER](../../scripts/knowledge/context.mjs#L3), [tokenizer](../../scripts/knowledge/context.mjs#L4), [tokenCount](../../scripts/knowledge/context.mjs#L5), [packContext](../../scripts/knowledge/context.mjs#L6), [concept](../../scripts/knowledge/context.mjs#L17), [boost](../../scripts/knowledge/context.mjs#L21).

### Project mix WAV export

v0.19.0 exports frozen source and applied independent sound/processing copies through shared voice/effect/score graph factories. Cable routing, track/master processing, bypass, levels and project mix are included; monitor and A/B overrides are excluded. PCM16 defaults to 48 kHz stereo with 44.1 kHz/mono alternatives. Duration keeps rests, max release, measured latency and 100 ms settling plus a default 5 s echo budget bounded 0–30 s. Conservative decay warns of possible cutoff, capped tails fade 20 ms and measured cap activity is reported. Peaks and clipping are shown; Save requires a safe explicit export level or opt-in -1 dBFS normalization. Non-finite audio fails and silence stays silent. A 256 MiB conservative memory preflight precedes allocation. Browser downloads and validated native saving preserve JSON, playback and history. Native cancellation retains the render; closing drops background results. The stage 6 automated functional gate passes in tested Chromium/Electron workflows; physical listening and other browser/device gates remain open. v0.21.0 shares articulation timing with live voices, caps staccato release and includes legato sounding extent even beyond a tiny final note; written rests, clocks and export resource/tail limits remain.

- Project mix WAV export / dependency group 1: [desktop/wav.cjs](../../desktop/wav.cjs)
- Project mix WAV export / dependency group 2: [src/audio/export.ts](../../src/audio/export.ts), [src/core/wav.ts](../../src/core/wav.ts), [src/audio/scoreGraph.ts](../../src/audio/scoreGraph.ts), [src/audio/voiceLimit.ts](../../src/audio/voiceLimit.ts), [src/components/WavExport.tsx](../../src/components/WavExport.tsx), [tests/unit/export.test.ts](../../tests/unit/export.test.ts), [tests/unit/nativeWav.test.ts](../../tests/unit/nativeWav.test.ts), [tests/unit/wav.test.ts](../../tests/unit/wav.test.ts)
- Project mix WAV export / dependency group 3: [tests/browser/export-audio.spec.ts](../../tests/browser/export-audio.spec.ts)
- Project mix WAV export / dependency group 4: [tests/browser/export.spec.ts](../../tests/browser/export.spec.ts)
- Project mix WAV export / dependency group 5: [tests/desktop/app.spec.ts](../../tests/desktop/app.spec.ts)

Key definitions: [LIMIT](../../desktop/wav.cjs#L1), [validateWav](../../desktop/wav.cjs#L2), [routedTail](../../src/audio/export.ts#L12), [prepareExport](../../src/audio/export.ts#L24), [renderWav](../../src/audio/export.ts#L75), [WavRender](../../src/audio/export.ts#L142), [createScoreGraph](../../src/audio/scoreGraph.ts#L7), [dispose](../../src/audio/scoreGraph.ts#L56).


## Parser coverage

Tree-sitter reports partial syntax recovery in `src/App.tsx`, `src/core/music.ts`, `tests/desktop/app.spec.ts`. These files remain indexed; inspect exact source before changing recovered regions. TypeScript compilation is a separate correctness check.

## Maintenance

Update feature summaries and decisions with behavior changes. Regenerate this map, check freshness, and query the graph for a concrete task before starting the next change.

# FourPataka project map

Generated with `npm run knowledge:build`. Edit features.json and DECISIONS.md for behavioral summaries; source locations below are derived from the working files.

Full source fingerprints are kept in the local graph cache; this tracked map records feature summaries, dependency groups and source locations.

## Retrieval path

Task → local semantic seeds → graph neighborhood → personalized PageRank → fixed token budget → cited context.

## FourPataka

Personal Fourier music studio. Source score text owns composition; independent sound and pedal copies preserve experiments. v0.14.0 connects saved pedal keys to track through and global master directives, Compose selectors, Track Maker and contextual autocomplete. Compact physical boards implement compressor, overdrive, EQ and delay with real serial cables. Delay bypass preserves echoes; Stop clears buffers. WAV export, chord-symbol macros and broader release/device gates remain planned. v0.14.1 places command reference beside an enlarged score editor, with timeline and track controls below. v0.15.0 completes the contextual command-reference functional item; stage 4/5 recovery, broader accessibility and real-device gates remain. v0.16.0 adds working harmonic sign controls and a distinct Soft bass factory preset, with conservative library-only migration.

### Sound and Fourier interaction

Editable source waveform, signed harmonic sine bank and phase-continuous comparison feed independent audio processing paths.

#### Sine-bank synthesis and voices

Sixteen signed harmonics and optional undertones retain absolute amplitude. Oscillator replacements preserve the original voice phase; envelopes and a 32-voice cap bound playback. Monitor volume stays outside saved mix settings. Each harmonic has a +/− toggle and an explicit inspector Sign selector; signed coefficient previews, silent-value sign retention and separate undo agree with source/audio phase-continuous updates.

- Sine-bank synthesis and voices / dependency group 1: [src/audio/voice.ts](../../src/audio/voice.ts), [src/core/music.ts](../../src/core/music.ts), [src/components/HarmonicPolarity.tsx](../../src/components/HarmonicPolarity.tsx), [src/components/SourceGraphs.tsx](../../src/components/SourceGraphs.tsx), [tests/unit/polarity.test.ts](../../tests/unit/polarity.test.ts)
- Sine-bank synthesis and voices / dependency group 2: [tests/browser/audio.spec.ts](../../tests/browser/audio.spec.ts)
- Sine-bank synthesis and voices / dependency group 3: [tests/browser/polarity.spec.ts](../../tests/browser/polarity.spec.ts)

Key definitions: [Voice](../../src/audio/voice.ts#L3), [Source](../../src/audio/voice.ts#L10), [TRANSITION](../../src/audio/voice.ts#L15), [holdParameter](../../src/audio/voice.ts#L18), [createVoice](../../src/audio/voice.ts#L27), [source](../../src/audio/voice.ts#L57), [setSources](../../src/audio/voice.ts#L94), [end](../../src/audio/voice.ts#L136).

#### Instrument presets and source thumbnails

Soft bass v2 uses six positive partials [1, 0.22, 0.1, 0.045, 0.02, 0.009], attack 30 ms, release 350 ms and trim −12 dB; Triangle retains alternating odd signs. Library and editor thumbnails sample their actual signed harmonic bank, excluding undertones/trim/envelope. Decorative thumbnail scaling never normalizes audio. Only an untouched factory v1 library template upgrades; applied tracks and A/B remain owned copies until explicit loading/application.

- Instrument presets and source thumbnails / dependency group 1: [src/App.tsx](../../src/App.tsx), [src/core/project.ts](../../src/core/project.ts), [src/core/instrumentPresets.ts](../../src/core/instrumentPresets.ts), [tests/unit/instrumentPresets.test.ts](../../tests/unit/instrumentPresets.test.ts)
- Instrument presets and source thumbnails / dependency group 2: [tests/browser/instrument-presets.spec.ts](../../tests/browser/instrument-presets.spec.ts)
- Instrument presets and source thumbnails / dependency group 3: [tests/desktop/app.spec.ts](../../tests/desktop/app.spec.ts)

Key definitions: [ScoreEditor](../../src/App.tsx#L94), [View](../../src/App.tsx#L96), [readPreferences](../../src/App.tsx#L97), [MiniWave](../../src/App.tsx#L112), [RangeControl](../../src/App.tsx#L147), [App](../../src/App.tsx#L197), [resetMacros](../../src/App.tsx#L301), [changeSound](../../src/App.tsx#L305).

#### Up to 32 harmonics (planned)

Deferred, not implemented: expand the Instrument builder from 16 to 32 signed harmonics, distinct from the 32-voice polyphony cap. An expandable H17-H32 bank retains active coefficients when hidden. Legacy sounds zero-pad new magnitudes without changing existing coefficients or re-projecting point geometry. Synthesis, waveform projection, presets/macros, source graphs, solo and storage must agree; pitch-dependent Nyquist exclusions retain saved values. Future gates cover copy/migration fidelity, gain reference, phase/clock continuity, projection accuracy, polyphonic performance and offline agreement. Piano/brass-inspired timbres motivate separate later partial envelopes, dynamic brightness and inharmonicity; main-feature/WAV priorities remain unchanged.

#### Instrument acoustics (planned)

Deferred, not implemented: an Instrument-builder algorithmic tiny chamber representing instrument body acoustics, without impulse-response (IR) files. Proposed enable/reset, wet/dry, chamber size, decay and damping controls live in saved instrument settings and independent track/A/B copies. The planned chamber sits before track pedals while source inspectors retain raw Fourier authority. Audio-proof gates cover dry unity, bounded feedback, latency, continuous clock/phase, finite tails and Stop, legacy-off migration, copy isolation and offline/WAV agreement. Current main-feature and export priorities remain unchanged.

#### Waveform drawing and control points

Draw or place dots on an odd waveform half-cycle. Shape-preserving cubic interpolation avoids overshoot; projection produces signed sine coefficients. Reset restores a sine while preserving envelope and trim.

- Waveform drawing and control points / dependency group 1: [src/components/FourierWorkspace.tsx](../../src/components/FourierWorkspace.tsx), [src/core/waveform.ts](../../src/core/waveform.ts), [tests/unit/waveform.test.ts](../../tests/unit/waveform.test.ts)
- Waveform drawing and control points / dependency group 2: [tests/browser/fourier.spec.ts](../../tests/browser/fourier.spec.ts)

Key definitions: [signature](../../src/components/FourierWorkspace.tsx#L13), [FourierWorkspace](../../src/components/FourierWorkspace.tsx#L14), [applyPoints](../../src/components/FourierWorkspace.tsx#L65), [movePoint](../../src/components/FourierWorkspace.tsx#L69), [removePoint](../../src/components/FourierWorkspace.tsx#L77), [draw](../../src/components/FourierWorkspace.tsx#L82), [start](../../src/components/FourierWorkspace.tsx#L113), [waveformCoefficients](../../src/core/waveform.ts#L4).

#### Continuous A/B comparison and scheduling

A/B changes keep the musical clock and active envelopes. Phrase clipping preserves chords/rests. Stable source buses and warmed aligned pedal branches avoid silence gaps. Score comparison temporarily overrides only the selected track; Stop/replay restores saved copies.

- Continuous A/B comparison and scheduling / dependency group 1: [src/audio/engine.ts](../../src/audio/engine.ts), [src/core/comparison.ts](../../src/core/comparison.ts), [src/components/ComparisonPanel.tsx](../../src/components/ComparisonPanel.tsx)
- Continuous A/B comparison and scheduling / dependency group 2: [tests/browser/comparison.spec.ts](../../tests/browser/comparison.spec.ts)

Key definitions: [VOICE_LIMIT](../../src/audio/engine.ts#L22), [AuditionBranch](../../src/audio/engine.ts#L23), [Session](../../src/audio/engine.ts#L30), [AudioEngine](../../src/audio/engine.ts#L54), [AudioEngine.ready](../../src/audio/engine.ts#L68), [AudioEngine.setMonitor](../../src/audio/engine.ts#L93), [AudioEngine.setMix](../../src/audio/engine.ts#L97), [AudioEngine.begin](../../src/audio/engine.ts#L101).

#### Pedalboard and processing

Compressor, overdrive, three-band EQ and delay have independent audition A/B, track and master boards. Equipment is picked before placement on a 4 by 2 Velcro grid. During drags the menu clears the underlying slots after Chromium captures the drag image; canceled or rejected drops clear transient state without history. Small circular dials live on pedals; the selected-pedal inspector holds exact inputs, sliders and EQ flat reset. Captured placement drags snap and undo in one step without changing audio order. Mouse or keyboard jack connections define a validated serial path; unplugged output is silent unless the board is bypassed. Legacy chains load prewired. Delay time is 20–2000 ms with feedback capped at 95%, output trim and linear mix. Pedal/whole-chain bypass closes the delay feed, retains old echoes and restores dry unity. Measured tail indicators bridge echo gaps; finite decay budgets extend cleanup, while Stop disposes buffers. Delay adds no track compensation latency. Routing changes wait for replay during playback; audition parameters and bypass remain live, score parameters freeze. Stable library score keys support through/master assignments. Assignment changes load independent copies; unchanged source and library saving preserve local settings. Pedalboard application synchronizes the score while retaining the exact sandbox copy.

- Pedalboard and processing / dependency group 1: [src/audio/effects.ts](../../src/audio/effects.ts), [src/core/pedals.ts](../../src/core/pedals.ts), [src/core/board.ts](../../src/core/board.ts), [src/components/ChainBypass.tsx](../../src/components/ChainBypass.tsx), [src/components/PedalBoardSurface.tsx](../../src/components/PedalBoardSurface.tsx), [src/components/PedalControls.tsx](../../src/components/PedalControls.tsx), [src/components/Pedalboard.tsx](../../src/components/Pedalboard.tsx), [tests/unit/board.test.ts](../../tests/unit/board.test.ts), [src/components/RotaryDial.tsx](../../src/components/RotaryDial.tsx), [src/core/rotary.ts](../../src/core/rotary.ts)
- Pedalboard and processing / dependency group 2: [src/components/ProcessedGraphs.tsx](../../src/components/ProcessedGraphs.tsx)
- Pedalboard and processing / dependency group 3: [src/components/SignalCable.tsx](../../src/components/SignalCable.tsx)
- Pedalboard and processing / dependency group 4: [tests/browser/board-audio.spec.ts](../../tests/browser/board-audio.spec.ts)
- Pedalboard and processing / dependency group 5: [tests/browser/board.spec.ts](../../tests/browser/board.spec.ts), [tests/helpers/board.ts](../../tests/helpers/board.ts), [tests/browser/delay.spec.ts](../../tests/browser/delay.spec.ts), [tests/browser/dials-touch.spec.ts](../../tests/browser/dials-touch.spec.ts), [tests/browser/dials.spec.ts](../../tests/browser/dials.spec.ts), [tests/browser/eq.spec.ts](../../tests/browser/eq.spec.ts), [tests/browser/pedalboard.spec.ts](../../tests/browser/pedalboard.spec.ts), [tests/browser/pedals.spec.ts](../../tests/browser/pedals.spec.ts)

Key definitions: [EffectGraph](../../src/audio/effects.ts#L12), [measureOversamplingLatency](../../src/audio/effects.ts#L21), [createEffect](../../src/audio/effects.ts#L38), [set](../../src/audio/effects.ts#L141), [update](../../src/audio/effects.ts#L145), [tail](../../src/audio/effects.ts#L192), [tailActive](../../src/audio/effects.ts#L201), [ChainGraph](../../src/audio/effects.ts#L214).

### Composition studio

Line-oriented score text is authoritative. The enlarged score editor fills its panel beside command reference. Timeline, independent track/master controls and event inspection sit below; narrow screens stack in DOM reading order. Parallel tracks start together; compiled timeline and transport retain the frozen playing revision. Text edits take effect on replay.

- Composition studio / dependency group 1: [src/App.tsx](../../src/App.tsx)

Key definitions: [ScoreEditor](../../src/App.tsx#L94), [View](../../src/App.tsx#L96), [readPreferences](../../src/App.tsx#L97), [MiniWave](../../src/App.tsx#L112), [RangeControl](../../src/App.tsx#L147), [App](../../src/App.tsx#L197), [resetMacros](../../src/App.tsx#L301), [changeSound](../../src/App.tsx#L305).

#### Score parsing and editor

Source offsets map diagnostics, explicit notes/chords/rests and instrument/pedal assignments back to text. Track through and one global master through directive validate local library keys. Eleven shared command definitions supply contextual reference snippets, syntax/rules and source-aware insertion. Using/through completion restricts optional suggestions to the matching saved library. Unknown/duplicate directives diagnose visibly and preserve applied copies. Chord-symbol macros with hover/focus expansion remain later work.

- Score parsing and editor / dependency group 1: [src/components/ScoreEditor.tsx](../../src/components/ScoreEditor.tsx), [src/core/parser.ts](../../src/core/parser.ts), [tests/unit/parser.test.ts](../../tests/unit/parser.test.ts)
- Score parsing and editor / dependency group 2: [tests/browser/composition.spec.ts](../../tests/browser/composition.spec.ts)
- Score parsing and editor / dependency group 3: [tests/browser/score-chains.spec.ts](../../tests/browser/score-chains.spec.ts)

Key definitions: [activeLines](../../src/components/ScoreEditor.tsx#L12), [playbackField](../../src/components/ScoreEditor.tsx#L13), [scoreLanguage](../../src/components/ScoreEditor.tsx#L33), [token](../../src/components/ScoreEditor.tsx#L34), [theme](../../src/components/ScoreEditor.tsx#L49), [colors](../../src/components/ScoreEditor.tsx#L83), [Props](../../src/components/ScoreEditor.tsx#L91), [ScoreEditor](../../src/components/ScoreEditor.tsx#L102).

#### Contextual command reference

Eleven scoped cards show the selected instrument/pedal keys, unique new-track snippets, syntax/rules and insertion destinations. Search matches all terms across syntax, rules and selected keys; categories filter the catalog. Using edits only the selected track instrument span, preserving notes/comments/routing and independent copy semantics. Compiled tracks prevent stale destinations on an empty score; globals/first-track creation remain available. Invalid/playing scores block insertion while details stay readable by keyboard. Native menu focuses search after DOM commit. Functional reference work is implemented; broader stage 4/5 accessibility, recovery and device gates remain.

- Contextual command reference / dependency group 1: [src/components/CommandReference.tsx](../../src/components/CommandReference.tsx), [src/core/commands.ts](../../src/core/commands.ts), [src/core/commandReference.ts](../../src/core/commandReference.ts), [tests/unit/commandReference.test.ts](../../tests/unit/commandReference.test.ts), [src/core/scoreTools.ts](../../src/core/scoreTools.ts)
- Contextual command reference / dependency group 2: [tests/browser/command-reference.spec.ts](../../tests/browser/command-reference.spec.ts)

Key definitions: [Props](../../src/components/CommandReference.tsx#L12), [CommandReference](../../src/components/CommandReference.tsx#L25), [ReferenceContext](../../src/core/commandReference.ts#L3), [referenceSnippet](../../src/core/commandReference.ts#L12), [insertionReason](../../src/core/commandReference.ts#L27), [insertionDestination](../../src/core/commandReference.ts#L38), [matchesCommand](../../src/core/commandReference.ts#L44), [CommandGroup](../../src/core/commands.ts#L1).

#### Tempo, meter and timeline

Tempo always counts quarter notes. Project meters support 1–32 over 1/2/4/8/16; 6/8 spans three quarter beats. Partial bars and crossing notes are valid. Timing edits preserve comments and form one undo step; invalid or playing scores guard those controls.

- Tempo, meter and timeline / dependency group 1: [src/components/CompositionSettings.tsx](../../src/components/CompositionSettings.tsx), [src/core/meter.ts](../../src/core/meter.ts), [src/components/Timeline.tsx](../../src/components/Timeline.tsx), [src/core/timeline.ts](../../src/core/timeline.ts), [tests/unit/meter.test.ts](../../tests/unit/meter.test.ts), [tests/unit/timeline.test.ts](../../tests/unit/timeline.test.ts)
- Tempo, meter and timeline / dependency group 2: [src/core/scoreTools.ts](../../src/core/scoreTools.ts), [tests/unit/scoreTools.test.ts](../../tests/unit/scoreTools.test.ts)
- Tempo, meter and timeline / dependency group 3: [tests/browser/meter.spec.ts](../../tests/browser/meter.spec.ts)

Key definitions: [CompositionSettings](../../src/components/CompositionSettings.tsx#L4), [Timeline](../../src/components/Timeline.tsx#L5), [percent](../../src/components/Timeline.tsx#L21), [TimeSignature](../../src/core/meter.ts#L1), [DEFAULT_METER](../../src/core/meter.ts#L5), [COMMON_METERS](../../src/core/meter.ts#L6), [parseMeter](../../src/core/meter.ts#L7), [meterLabel](../../src/core/meter.ts#L17).

#### Track creation and assignment

Track Maker validates note/chord/rest rows, reorders with buttons, previews project-meter length and optionally assigns a saved pedal key. Compose instrument/pedal selectors edit source spans in one undo operation. Changed chain assignments copy templates; unchanged reparsing and library saving preserve independently edited knobs, bypass and cables. Removing a previously applied source directive clears its chain; legacy unassigned boards survive.

- Track creation and assignment / dependency group 1: [src/components/ChainAssignment.tsx](../../src/components/ChainAssignment.tsx)
- Track creation and assignment / dependency group 2: [src/components/TrackMaker.tsx](../../src/components/TrackMaker.tsx)
- Track creation and assignment / dependency group 3: [tests/browser/composition.spec.ts](../../tests/browser/composition.spec.ts)
- Track creation and assignment / dependency group 4: [tests/browser/score-chains.spec.ts](../../tests/browser/score-chains.spec.ts)

Key definitions: [ChainAssignment](../../src/components/ChainAssignment.tsx#L3), [Row](../../src/components/TrackMaker.tsx#L9), [expression](../../src/components/TrackMaker.tsx#L10), [TrackMaker](../../src/components/TrackMaker.tsx#L12), [update](../../src/components/TrackMaker.tsx#L46), [move](../../src/components/TrackMaker.tsx#L48), [add](../../src/components/TrackMaker.tsx#L57), [source](../../tests/browser/score-chains.spec.ts#L3).

### Project state and desktop studio

Versioned local project data, musical undo and sandboxed desktop workflows support personal use. Preferences stay separate from imported projects.

#### Independent copies, persistence and undo

Project schema v1 retains source text and deep-copied applied sounds/chains. Library edits never overwrite track instances. Validation preserves the current project on failed import. Grouped edits retain one undo entry per waveform stroke or rotary gesture. Only exactly unchanged factory Soft bass v1 library templates upgrade to v2; custom templates, existing applied track sounds and A/B snapshots remain unchanged.

- Independent copies, persistence and undo / dependency group 1: [src/core/history.ts](../../src/core/history.ts), [tests/unit/history.test.ts](../../tests/unit/history.test.ts)
- Independent copies, persistence and undo / dependency group 2: [src/core/project.ts](../../src/core/project.ts), [tests/unit/project.test.ts](../../tests/unit/project.test.ts)
- Independent copies, persistence and undo / dependency group 3: [tests/browser/persistence.spec.ts](../../tests/browser/persistence.spec.ts)
- Independent copies, persistence and undo / dependency group 4: [tests/browser/studio.spec.ts](../../tests/browser/studio.spec.ts)

Key definitions: [History](../../src/core/history.ts#L1), [commit](../../src/core/history.ts#L6), [undo](../../src/core/history.ts#L14), [redo](../../src/core/history.ts#L22), [InstrumentPreset](../../src/core/project.ts#L15), [TrackInstance](../../src/core/project.ts#L22), [Project](../../src/core/project.ts#L29), [STORAGE_KEY](../../src/core/project.ts#L42).

#### Themes and responsive layout

Instrument, Pedalboard and Compose are primary views; Learn is secondary. Five bundled themes use secondary/tertiary accents and contrast-adapted ink. Theme changes preserve playback and musical undo.

- Themes and responsive layout / dependency group 1: [src/core/themes.ts](../../src/core/themes.ts), [tests/unit/themes.test.ts](../../tests/unit/themes.test.ts)
- Themes and responsive layout / dependency group 2: [tests/browser/design.spec.ts](../../tests/browser/design.spec.ts)
- Themes and responsive layout / dependency group 3: [tests/browser/themes.spec.ts](../../tests/browser/themes.spec.ts)

Key definitions: [Theme](../../src/core/themes.ts#L1), [THEMES](../../src/core/themes.ts#L17), [rgb](../../src/core/themes.ts#L77), [blend](../../src/core/themes.ts#L78), [luminance](../../src/core/themes.ts#L87), [contrast](../../src/core/themes.ts#L94), [readable](../../src/core/themes.ts#L98), [resolveTheme](../../src/core/themes.ts#L108).

#### Electron application and native files

Sandboxed renderer with no Node access loads local assets via a private protocol. A narrow preload bridge handles native JSON dialogs and menu actions. Portable Windows builds bundle assets; hidden isolated profiles support native tests.

- Electron application and native files / dependency group 1: [desktop/main.cjs](../../desktop/main.cjs)
- Electron application and native files / dependency group 2: [desktop/preload.cjs](../../desktop/preload.cjs)
- Electron application and native files / dependency group 3: [scripts/desktop-dev.mjs](../../scripts/desktop-dev.mjs)
- Electron application and native files / dependency group 4: [tests/desktop/app.spec.ts](../../tests/desktop/app.spec.ts)

Key definitions: [fs](../../desktop/main.cjs#L2), [path](../../desktop/main.cjs#L3), [window](../../desktop/main.cjs#L16), [developmentUrl](../../desktop/main.cjs#L17), [trustedUrl](../../desktop/main.cjs#L21), [assertStudio](../../desktop/main.cjs#L30), [action](../../desktop/main.cjs#L39), [createWindow](../../desktop/main.cjs#L43).

### Maintained project knowledge

Tree-sitter code links, source-linked docs/plans, feature and dependency summaries, local embedding seeds and personalized PageRank produce bounded context. Refresh hashes after changes and maintain behavioral summaries alongside implementation.

- Maintained project knowledge / dependency group 1: [scripts/knowledge/cli.mjs](../../scripts/knowledge/cli.mjs), [scripts/knowledge/graph.mjs](../../scripts/knowledge/graph.mjs), [scripts/knowledge/summaries.mjs](../../scripts/knowledge/summaries.mjs), [scripts/knowledge/semantic.mjs](../../scripts/knowledge/semantic.mjs), [scripts/knowledge/rank.mjs](../../scripts/knowledge/rank.mjs), [scripts/knowledge/context.mjs](../../scripts/knowledge/context.mjs), [scripts/knowledge/extract.mjs](../../scripts/knowledge/extract.mjs), [scripts/knowledge/verify.mjs](../../scripts/knowledge/verify.mjs), [scripts/knowledge/watch.mjs](../../scripts/knowledge/watch.mjs), [tests/unit/knowledge.test.ts](../../tests/unit/knowledge.test.ts)

Key definitions: [root](../../scripts/knowledge/cli.mjs#L10), [option](../../scripts/knowledge/cli.mjs#L12), [TOKENIZER](../../scripts/knowledge/context.mjs#L3), [tokenizer](../../scripts/knowledge/context.mjs#L4), [tokenCount](../../scripts/knowledge/context.mjs#L5), [packContext](../../scripts/knowledge/context.mjs#L6), [concept](../../scripts/knowledge/context.mjs#L17), [boost](../../scripts/knowledge/context.mjs#L21).


## Parser coverage

Tree-sitter reports partial syntax recovery in `src/App.tsx`, `src/core/music.ts`, `tests/desktop/app.spec.ts`. These files remain indexed; inspect exact source before changing recovered regions. TypeScript compilation is a separate correctness check.

## Maintenance

Update feature summaries and decisions with behavior changes. Regenerate this map, check freshness, and query the graph for a concrete task before starting the next change.

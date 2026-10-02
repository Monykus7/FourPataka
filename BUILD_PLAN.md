# FourPataka — Fourier Music Studio build plan

Updated: 2026-10-02
Status: implementation started. The playable audio/project foundation, selected instrument tools, composition helpers, and Windows application foundation are implemented; see `IMPLEMENTATION_STATUS.md` for verification and remaining gates.

This is the authoritative project plan. It consolidates the expanded plan from `FOURIER_MUSIC_STUDIO_BUILD_PLAN.md`, the original conversation, the quality review, and the user's latest answers. The roadmap below replaces the earlier milestone lists.

## 1. Product and learning goal

Build a personal studio, available in the browser and as a desktop application, for shaping instruments with Fourier harmonics and optional undertones, processing them through a visible pedalboard, and composing with readable note and chord commands. Mathematical changes should be easy to hear and inspect.

The central loop is:

1. Edit the partials of a sound while auditioning a note.
2. Save the instrument.
3. Write and play a phrase with it.
4. Apply a pedal chain.
5. Compare two sound settings using the same musical material.

The Instrument view is the hero screen. Pedalboard and Compose make that sound useful for music. Learning tools explain the relationship among coefficients, waveforms, spectra, and what the listener hears.

A demonstration should begin with a sine, add odd harmonics and an optional quiet octave-below component, save the instrument, play a phrase with a B-flat chord, and compare clean and processed versions. Keep the visible controls, code highlight, and sound connected throughout.

## 2. Confirmed behavior choices

- Normal harmonics have priority. Undertones live in a collapsed, optional section and are enabled by a separate switch. Instrument presets save their values and enable state.
- Pedal chains are available per track and on the master mix.
- The score editor has a searchable command reference and toggleable autocomplete.
- A/B compares the selected instrument and its selected pedal chain at the current playback position. Explicit replay starts the note or phrase again.
- Tracks retain independent instrument and pedal settings. Saving a library preset does not overwrite those settings.
- Provide **Apply** and **Apply to all using this preset**. The latter updates every associated track instance and, for pedal presets, an associated master instance. Show the affected destinations and make the operation undoable.
- Stop quickly fades all sound, including effect tails. Delay bypass adds no new echoes but lets existing echoes finish.
- Instrument and Compose are the primary views; Learn is a smaller secondary link.
- Use concise functional information for personal use, without promotional taglines. Keep the original dark color scheme, minimal shadows, and restrained material detail rather than a full paper background.
- Build the Windows application alongside the browser interface, with native project controls, command insertion, and a visual track maker. Browser and desktop use the same portable project format.

Other defaults in this document are proposed implementation choices. They should be tuned in the audio proof without changing these confirmed behaviors.

## 3. Release boundary

### Initial release

Include the following by the end of stage 5:

- Instrument editor with H1–H16, optional subharmonics at f₀/2 through f₀/6, attack/release envelope, partial solo, and mathematical presets.
- Independent track settings and reusable instrument/pedal presets.
- A/B replay comparison, a partial inspector, and optional coefficient macros.
- A visible, reorderable pedalboard with compressor, overdrive, three-band EQ, and delay.
- Per-track and master routing, preset application, bypass, and output meters.
- CodeMirror 6 score editor, a small score language, diagnostics, command reference, and toggleable autocomplete.
- Parallel tracks, source highlighting, a timeline, and note/event inspection.
- Source and after-pedals waveform/spectrum views.
- Local saving, undo/redo, project JSON import/export, and a working example project.
- Keyboard controls, readable contrast, reduced-motion support, and layouts for narrower screens.

### Following releases

Stage 6 adds WAV export. Stage 7 adds guided experiments and the richer analysis panel. Both are part of this plan and have implementation gates below.

Keep repeat blocks, dotted notes, tuplets, time-varying instrument changes, volume/pan commands, phase controls, per-harmonic envelopes, noise, morphing, modulation, inharmonicity, microphone/upload analysis, spectrograms, MIDI, and staff engraving in the later backlog.

Accounts, collaboration, and a backend are unnecessary for the planned local studio.

## 4. Project state, presets, and persistence

### Authoritative data

Store the editable score text in the project. Parsing produces diagnostics, source spans, and a compiled event timeline; these are derived data.

The project model contains:

- `schemaVersion`, project ID, and project name.
- `scoreText`.
- Instrument and pedal preset libraries.
- Independent track instrument/chain instances and a master chain instance.
- A/B snapshots and comparison setup.
- Project mix levels and saved bypass states.

An instrument state contains harmonic magnitudes, harmonic polarity, subharmonic magnitudes, the undertone enable flag, attack/release settings, and an explicit output trim. A pedal chain state contains ordered pedal instances, parameters, and per-pedal bypass states.

UI preferences such as autocomplete, collapsed sections, and panel sizes are stored separately from the musical data. Importing a project should not unexpectedly replace the user's global editor preferences.

### Preset application

A saved preset is a reusable template. Applying it copies its settings into the selected track or master instance. Runtime AudioNodes are always separate for each destination.

Record the originating preset ID and applied version on an instance. A modified instance is visibly labeled **Custom**. A newer library version can be offered for application; it is never silently substituted.

Saving edits to a library preset updates that library entry. It does not change an already-applied track copy or an A/B snapshot. **Save as new** creates a distinct preset.

**Apply to all using this preset** updates only instances associated with that preset. Unrelated instruments and chains are excluded. Treat the whole operation as one undo step.

### Names used in scores

Use unique, case-sensitive score keys such as `brightReed` or `warmDrive`. Keys match `[A-Za-z][A-Za-z0-9_]*` and remain immutable after creation. A display label may contain spaces and can be renamed freely. Creating a different score key uses Save as new.

Internal stable IDs support storage and application. The parser resolves score keys to these IDs.

When score text creates a new track or changes its `using`/`through` assignment, copy the referenced preset into that destination. Re-parsing an unchanged assignment must preserve its independent settings. Removed tracks release their runtime nodes; retain their editable settings in undo history.

### Local save and import

Introduce autosave with the first usable project model. Use a small versioned local store and debounce frequent slider/editor changes. Musical edits and text edits must survive refresh.

JSON export includes score text, referenced presets, independent track/master settings, bypass states, and A/B snapshots. Score text by itself is a notation excerpt; JSON is the portable editable project.

Validate imported schema versions, identifiers, array lengths, finite numeric values, parameter ranges, and references before replacing the current project. A failed import leaves the current project intact. Unknown future schema versions receive a clear error; migrations for older supported versions are explicit.

Undo/redo covers musical settings, preset application, macros, pedal order, and score edits. A continuous drag is one undo operation.

## 5. Instrument synthesis

### Harmonics and mathematical presets

H1 is the reference note at f₀. H2–H16 are its overtones at 2f₀–16f₀. Show sixteen tall bars with magnitudes from 0 to 1.

For an instrument without phase controls, the source model is:

```text
x(t) = Σ[h = 1…16] p[h] × a[h] × sin(2π h f₀ t)
     + enabled × Σ[d = 2…6] u[d] × sin(2π (f₀/d) t)
```

Here `a[h]` and `u[d]` are magnitudes, and `p[h]` is +1 or −1. Polarity is saved metadata, visible in the inspector. This permits a triangle preset's alternating odd-harmonic signs without requiring a phase-control interface. Magnitude edits and macros preserve polarity.

Seed presets with relative Fourier coefficients:

- Sine: H1 only.
- Square approximation: odd harmonic magnitudes proportional to 1/h.
- Saw approximation: harmonic magnitudes proportional to 1/h.
- Triangle approximation: odd magnitudes proportional to 1/h², with alternating polarity.

These are finite approximations. Avoid promising that sixteen terms reproduce an ideal discontinuous waveform or a real acoustic instrument. Instrument-inspired examples can be labeled as approximations.

### Undertones

Use five independent sine components at f₀/2, f₀/3, f₀/4, f₀/5, and f₀/6. A new instrument starts with these magnitudes at zero and the bank disabled. Enabling the bank preserves its slider values.

For A4 at 440 Hz, the first three frequencies are 220, about 146.67, and 110 Hz. These components are below the reference note and are not harmonics of f₀. Their inclusion can change the perceived pitch.

Keep the bank collapsed by default. Provide a labeled enable switch, exact frequency/magnitude values, solo, and a Sub weight macro. Components below the ordinary audible range should be identified in the inspector.

Use an actual-frequency source spectrum. When undertones are active, show a longer time window than one f₀ cycle. Label the waveform window in milliseconds.

### Gain and frequency limits

Disable automatic `PeriodicWave` normalization and apply one explicit output trim to the combined harmonic/subharmonic voice. Coefficient magnitudes therefore retain a defined reference; output loudness is controlled visibly.

The source inspector reports coefficient level as `20 log10(magnitude)` relative to magnitude 1, before trim/envelope. Zero is shown as muted/−∞. It is not labeled as measured output dBFS.

Apply the same effective coefficient model to synthesis and source visualization. Components at or above half the context sample rate are excluded from the playable waveform and visibly marked unavailable at the selected pitch. Keep their saved values so changing pitch restores them.

Keep project mix gain separate from listening/monitor volume. Monitor volume does not affect saved coefficients or WAV export. Start at a modest audition level and show measured output peaks; do not silently compensate every coefficient edit.

### Voices and envelopes

One note voice contains one harmonic `PeriodicWave` oscillator, any enabled nonzero subharmonic oscillators, and a shared gain envelope. Start its components at the same scheduled time.

Attack rises from zero. Hold until the notated note end, then release; release may overlap the next event. If a note is shorter than the selected attack, handle note-off from the reached envelope level without a jump.

Bound polyphony, counting voices that are releasing. Allocate undertone oscillators only for nonzero enabled components. Fade a stolen voice and clean up all of its nodes. The audio proof determines a documented desktop/mobile voice limit.

A rest schedules no new notes. Release envelopes and effect tails can remain audible during a rest.

## 6. A/B comparison and harmonic macros

### A/B snapshots

A and B are independent value snapshots of the selected instrument, selected pedal chain, their trims, and relevant bypass states. Copying A to B is a deep copy. Editing either side cannot mutate the other or its library template.

Keep the audition note/chord or selected score phrase outside these sound snapshots. That musical material remains the same for both comparisons.

Switching A/B keeps the musical clock and current voice envelopes running. Waveforms crossfade in phase, and different audition chains warm up and crossfade through aligned paths. Explicit replay starts from the phrase beginning with fresh processing state. During score playback, an explicit comparison-track selector targets a temporary A/B sound override, preserving other tracks and saved sound copies. Changing targets restores the previous track; Stop and the next Play clear the override.

Master processing is held outside this selected-sound A/B setup. The master Pedalboard can separately audition the full mix, but whole-project A/B is deferred.

Offer **Copy A → B**, **Copy B → A**, and an explicit Compare/Replay action. Show the selected state near the relevant transport. Retain A/B in the project, including JSON export.

Volume differences remain audible by default. Optional loudness-matched listening can be introduced later and must be labeled as a listening aid.

### Macros

Keep individual bars visible as macros change them. Use a stable coefficient baseline; calculate each macro result from that baseline rather than repeatedly multiplying the latest result.

Proposed fixed transform order:

1. Harmonic falloff.
2. Brightness tilt.
3. Odd/even weighting.
4. Undertone weighting.

Use these initial formulas for baseline harmonic magnitude b[h]:

```text
Falloff p: 0…2, neutral 0           → factor h^(−p)
Brightness v: −1…1, neutral 0      → factor 2^(v × (h−1)/15)
Odd/even e: −1…1, neutral 0        → odd factor (1+e), even factor (1−e)
Sub weight w: 0…2, neutral 1       → subharmonic factor w

a[h] = clamp(b[h] × falloff × brightness × odd/even factor, 0, 1)
u[d] = clamp(baselineSub[d] × w, 0, 1)
```

Preserve polarity separately. Multiplicative macros do not create a partial whose baseline magnitude is zero, and Sub weight never enables a disabled bank. Attack is an envelope control, not a coefficient transform.

Within a macro session, returning controls to neutral restores the captured baseline. Provide Reset macros. A manual bar edit commits the visible coefficients as the new baseline and resets macro controls to neutral without changing the audible result.

Save the resulting coefficients as the sound definition. Macro baseline/control metadata may be retained for continued editing, but playback and export must not apply the transforms a second time.

## 7. Pedalboard and audio routing

### Visible pedalboard

Use compact pedal modules with names, small knobs and clear bypass switches. Exact values and sliders belong to the selected-pedal inspector. Show cable direction and signal-path order independently of visual placement.

The physical board replaces direct Add buttons and the tall serial rack. Select pedals or patch cables from an equipment menu, place small pedals on a four-column/two-row snap grid with Velcro strips, drag handles to reposition, and patch output jacks to input jacks using the mouse. Keep small dials on each pedal and exact controls in a selected-pedal inspector. Placement does not determine effect order; explicit cables do. Initially support one serial path with no splits or feedback loops. Incomplete output connections produce silence unless the whole board is bypassed. Old chains retain their order as prewired boards. Store placement/cables in project and preset copies; visual movement stays live without a replay requirement. Keep the board surface and inspector modular for the planned wider frontend overhaul.

Save whole-chain presets containing effect order, knob values, and individual pedal states. In Compose, show the assigned chain and a compact bypass control for every track and for the master.

A header must identify the editing destination: library preset, a particular track's independent instance, or master instance. Avoid an ambiguous editor that silently changes a different destination.

### Effects and controls

- **Compressor:** threshold in dB, ratio, attack/release in ms, output/makeup gain in dB, and mix percentage. Set knee to a documented default initially; an advanced knee control can follow.
- **Overdrive:** drive in dB, tone cutoff in Hz, output level in dB, and mix percentage. Use a documented soft-clipping curve and oversampling.
- **Three-band EQ:** low gain, mid frequency, mid gain, and high gain. Use fixed, documented shelf frequencies and mid bandwidth initially.
- **Delay:** time in ms, feedback percentage, and mix percentage. Bound feedback strictly below 100%; use a conservative default. Tempo-synchronized times are a later extension.

EQ v0.11.0 uses low/mid/high gains of −12…+12 dB, an adjustable 150…4000 Hz mid center, fixed 200 Hz low/4000 Hz high shelves, and mid Q = 1. It starts flat, offers output/mix and a one-step flat reset, and uses the existing independent chains and live-audition/frozen-score policy. EQ is released before implementing delay, as requested on 2026-10-02.

Use numeric entry and keyboard adjustment alongside knobs. Clamp parameter ranges consistently in UI, import validation, and audio factories. An unchanged/identity effect at any mix setting should not introduce an unexplained gain boost.

Initial parameter ranges: compressor threshold −60…0 dB, ratio 1…20, attack 0…100 ms, release 10…2000 ms; overdrive drive 0…24 dB and tone 80…16000 Hz; EQ gains −12…+12 dB and mid frequency 150…4000 Hz; delay time 20…2000 ms and feedback 0…95%. Pedal output trim uses −24…+12 dB where offered. Mix is 0…100%. Clamp frequency controls below the context's Nyquist limit. Audible defaults and trim values are checked in the audio proof.

Use a linear dry/wet blend initially: dry gain = 1−mix, wet gain = mix, with mix expressed as 0…1. Compressor latency alignment remains necessary before blending. Delay's wet path deliberately carries its echo timing.

### Routing

```text
Track voices → note envelopes → track pedal chain → track level
                                                    ↓
                                    all tracks mixed together
                                                    ↓
                                  master pedal chain → mix gain
                                                    ↓
                           output meter → monitor gain → speakers
```

Use a fresh node graph for each track/master instance. Shared presets share settings, not delay buffers or compressor state.

Implement the ordinary harmonic source using `PeriodicWave`, undertones using additional sine oscillators, compressor using `DynamicsCompressorNode`, overdrive using `WaveShaperNode`, EQ using `BiquadFilterNode`, and delay using `DelayNode` plus bounded feedback gain. [Web Audio specification](https://www.w3.org/TR/webaudio-1.0/).

The native compressor has fixed look-ahead latency. Align its dry branch with its wet branch for parallel compression and keep bypass latency consistent. Compensate differing track processing paths where needed, and validate any additional latency from oversampling in the audio proof. Each effect factory records its relevant latency and tail behavior. [Compressor processing](https://www.w3.org/TR/webaudio-1.0/#dynamicscompressornode-processing).

Use smoothing for AudioParam changes. Changing a waveform/curve or replacing nodes may require a controlled crossfade; those properties do not all support AudioParam automation.

### Live changes, bypass, and Stop

During audition, source and pedal parameters respond immediately with smoothing. During score playback, musical edits are retained for the next Play; live bypass and monitor volume remain available.

Reordering pedals, applying another preset, or changing graph topology takes effect on the next Play. Label pending changes. Rebuilding a graph fades and releases the old graph first.

Delay bypass closes the feed into the delay's wet path while keeping the feedback/tail path alive. Existing echoes decay; new notes pass dry. Show a small tail-active state until the remaining echoes finish. Whole-chain bypass uses the same no-new-input/tails-finish policy for delays.

Stop fades the output over about 20 ms, cancels scheduled playback, and clears running voices and delay state after the fade. The next Play begins with fresh effect state. Start/restart must not leave stale notes or echoes behind.

## 8. Score language and editor

### Example project

Ship the starter project with `brightReed`, `softBass`, `warmDrive`, and `cleanGlue` defined.

```text
tempo 120
time 4/4
master through cleanGlue

track melody using brightReed through warmDrive {
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

Both tracks contain four quarter-note beats. Tracks begin together; events within each track play sequentially. A shorter track stops scheduling notes when its events finish.

### Complete initial command catalog

- `tempo <bpm>` — quarter-note beats per minute. Default 120 if omitted; accept 20…300 BPM.
- `time <numerator>/<denominator>` — project measure grid, default 4/4. Accept 1–32 beats over 1, 2, 4, 8, or 16. Tempo and event durations remain in quarter-note units; a 6/8 bar spans three quarter beats. Meter changes within a track are unsupported.
- `master through <pedalKey>` — optional master chain assignment.
- `track <trackKey> using <instrumentKey> [through <pedalKey>] { … }` — a named sequential track, optionally with a pedal chain.
- `C5 quarter` — note name, optional sharp/flat, required octave, and duration.
- `chord:(Bb D F)5 8th` — simultaneous notes using a trailing default octave.
- `chord:(Bb4 D5 F5) quarter` — a chord whose notes all have explicit octaves.
- `rest half` — advance this track without starting a note.
- `// comment` — ignored text to the end of the line.

Accept `whole`, `half`, `quarter`, `8th`, and `16th`; these represent 4, 2, 1, 1/2, and 1/4 quarter-note beats. At 120 BPM, a quarter is 0.5 seconds.

Use scientific pitch notation: C4 is middle C and A4 is 440 Hz. Use 12-tone equal temperament. Compute pitches from MIDI-style note numbers with `f = 440 × 2^((m − 69)/12)`. Initially accept octaves 0…8 and resolved note numbers 12…119 (C0…B8); accidentals must also resolve within that range. Validate these rules in one pitch module.

Within a chord, an explicit note octave overrides the trailing default. Any note without an octave requires that default. No octave inheritance occurs outside a chord.

`(Bb D F)5` means Bb5, D5, and F5; it does not automatically construct ascending root-position voicing. Use `(Bb4 D5 F5)` for that explicit voicing.

### Grammar and diagnostics

Use one event per line. Allow whitespace around punctuation, blank lines, and end-of-line comments. Keep global directives outside tracks. Reject duplicate global directives, duplicate track keys, unknown preset keys, empty/malformed chords, invalid pitches, and unsupported duration words.

Build an explicit lexer/parser with source offsets and structured diagnostics. Never execute score text as JavaScript.

Measures are visual guides. Notes may cross a measure boundary, and an incomplete final measure is allowed. Do not reject a valid phrase simply because it ends before a full bar.

The Commands panel lists the complete catalog, valid values, descriptions, and pasteable snippets. Shared command metadata powers reference text, snippets, and completion suggestions; grammar behavior is checked against those examples.

List Play, Stop, Audition, Save preset, Apply, Apply to all, and bypass under Controls. They are UI actions rather than score commands.

### CodeMirror 6

Use CodeMirror 6 for syntax highlighting, diagnostics, hover documentation, search/navigation, preset suggestions, autocomplete, and playback decorations. The application parser owns playback semantics. Editor highlighting must accept the same lexical rules rather than quietly introducing a second score language. [CodeMirror language support](https://codemirror.net/examples/lang-package/), [autocomplete](https://codemirror.net/examples/autocompletion/).

Autocomplete has an explicit on/off preference. Turning it off disables suggestions while keeping the command reference available.

The timeline is initially a view of compiled events. Selecting an event inspects it; editing notes by dragging or writing notation from a piano roll is deferred.

### Source authority and playback revisions

Play compiles a stable snapshot of valid score text and the currently applied sound instances. Use that revision for scheduling and timeline playback.

Edits during playback affect the next Play. If the text revision changes, show **Playing previous version** and suspend source-line playback decorations until replay; the compiled timeline continues to show the running revision. Never highlight unrelated lines using stale offsets.

Tempo, time-signature, and assignment controls in the UI perform narrow parser-aware edits to the relevant source directive. Do not maintain a second independent tempo value. Disable those source-editing controls while the score is invalid or currently playing.

## 9. Visual feedback, analysis, and experiments

### Source and output views

Source views use the effective coefficients for the selected pitch, including polarity, undertone enable state, frequency limits, and the chosen trim reference. Label whether a waveform is the steady source shape or a live enveloped signal.

After-pedals views use AnalyserNode taps at the selected track and master output. These show the resulting signal, not the instrument's unchanged coefficient bars. Label position in the signal path, frequency in Hz, amplitude/level units, and waveform time in ms.

FFT bins have finite frequency resolution and windowing/smoothing. Do not present every live bin peak as an exact partial frequency. [AnalyserNode processing](https://www.w3.org/TR/webaudio-1.0/#fft-windowing-and-smoothing-over-time).

### Spectral microscope

Selecting or soloing a partial links its bar, waveform contribution, source spectrum mark, and inspector. Show:

```text
H5
5 × 261.63 Hz = 1308.15 Hz
Magnitude: 0.32
Coefficient level: −9.9 dB relative to magnitude 1
Polarity: normal
```

For an undertone, show its divisor and frequency, such as `261.63 / 3 = 87.21 Hz`. Nearest equal-tempered pitch is optional context.

Solo initially auditions the selected partial through the source path, with effects bypassed and a visible Solo label. Returning to the instrument restores its state. Processed-partial solo can be added as an explicitly labeled option.

### Analysis panel

Keep the panel collapsed and distinguish steady source-model descriptors from live output measurements.

Initial descriptors can include:

- **Power-weighted source centroid:** Σ(frequency × magnitude²) / Σ(magnitude²), using only effective components.
- **Odd/even harmonic power shares:** sums of squared magnitudes; explicitly include H1 in the odd group and display its contribution separately where useful.
- **Subharmonic power share:** enabled subharmonic squared magnitudes divided by total effective component power.
- **Dominant source component:** frequency of the largest component, rather than the highest frequency present.

Later include mean-square source power, live RMS in dBFS, peak level, and crest factor. Use a 100 ms live measurement window initially: average the per-channel mean-square values, take their square root for RMS, and report 20 log10(RMS) relative to full-scale amplitude 1. Peak is the largest absolute sample on any measured channel; crest factor is 20 log10(peak/RMS). Measure channels separately rather than allowing a stereo downmix to hide cancellation. For steady sine components, mean-square source power before trim is one half of the sum of squared magnitudes; it is not a generic value for an enveloped, processed recording.

Analyser frequency values are in dB: use 10^(dB/20) for relative amplitude and 10^(dB/10) for relative power. These windowed/smoothed values are suitable for relative spectral descriptors; derive absolute RMS/output level from time-domain samples. An approximate peak-bin frequency is labeled as an estimate.

For silence, show a silence state and omit undefined centroid/crest-factor values. Describe spectral concentration with factual wording rather than treating words such as warm or harsh as measured quantities.

### Guided experiments

Use a small drawer with editable starting states and one or two instructions per experiment:

- Build a square approximation using odd harmonics.
- Compare odd and even harmonic groups.
- Mute H1 to explore the missing fundamental.
- Add f₀/2 or f₀/3 and compare with the undertone bank bypassed.

Loading an experiment is undoable and preserves the prior project state. Phase experiments follow when phase controls exist. Experiments never lock controls or require completing a wizard.

## 10. Visual design and accessibility

### Palette and semantic tokens

Preserve the proposed dark palette with restrained accents:

```css
--bg: #0f0e17;
--surface-1: #171622;
--surface-2: #1f1d2b;
--border: #2d2a3d;
--text: #fffffe;
--text-muted: #a7a9be;
--accent: #ff8906;
--accent-text: #0f0e17;
--secondary: #f25f4c;
--tertiary: #e53170;
```

Use orange for harmonic emphasis and primary actions, pink for undertone marks, and the secondary color for comparison traces. Pair color with labels or line styles.

Orange buttons use dark text: this pairing has about 8.06:1 contrast. Near-white text on the orange has only about 2.38:1. Small textual labels on accent backgrounds need an independently checked foreground; graph colors are not automatically valid text colors. Normal text targets at least 4.5:1 contrast. [W3C contrast guidance](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html).

Use a distinct, labeled clipping/error treatment. Do not reuse comparison or undertone color as the only error indicator.

### Global shell

Keep project identity, Play, Stop, parsed tempo, master mix level, monitor level, and output meter visible. A/B appears in comparison context rather than looking like a second project-wide transport.

Instrument, Pedalboard, and Compose have equal primary navigation tabs. Learn stays a smaller secondary link. The inspector adapts to the current partial, pedal, or event.

### Instrument

Give H1–H16 tall vertical bars and substantial space. Place waveform and source spectrum alongside them. Keep audition pitch and Audition visible, undertones below the main mixer, and attack/release plus optional analysis accessible.

Support exact numeric input and keyboard adjustment. Clearly identify whether edits affect a library preset, a track instance, or snapshot A/B.

### Pedalboard

Give Pedalboard its own primary workspace. Equipment-menu placement and compact pedals occupy a four-column/two-row Velcro grid. Mouse/keyboard jack patching defines the serial audio path; visual movement keeps the processing order. Use small dials and bypass switches on pedals, with exact values/sliders in the selected inspector. Keep preset Save, Save as new, Apply, and Apply to all in the editing context. Narrow screens scroll the grid within its own panel.

Show both current order and any pending order change. Keep dry/wet and tail state understandable without requiring hover.

### Compose

Use an editor-focused split, initially around 60/40 for score and timeline/inspection. Show event highlights in both representations, command help near the editor, and compact track/master chain assignments.

At narrower widths, stack the editor and timeline, make the inspector a drawer, and wrap pedal modules into an explicitly ordered list. Do not shrink sixteen labels and multiple knobs into unreadable controls.

### Components and interaction

Use accessible low-level primitives for sliders, menus, dialogs, tooltips, and tabs, with the custom palette. Every knob has a textual value and keyboard operation. Reordering has button/keyboard alternatives.

Maintain visible focus, avoid color-only states, and honor reduced-motion preferences. Preserve useful timing information while reducing decorative animation. Throttle analyser painting separately from audio scheduling.

## 11. Audio scheduling and export

### Timing

Convert durations to exact beat values, then seconds using the compiled tempo. Schedule against AudioContext time with a small look-ahead queue; UI timers and animation frames are not the musical clock.

Render the playhead from the running audio revision and account for relevant processing/output latency. Check synchronization on the supported browser/device targets.

Create/resume one shared live AudioContext from a user Play or Audition gesture. Reuse it across screens; release voice/effect nodes after use. [Web Audio scheduling](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API/Advanced_techniques), [autoplay guidance](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API/Best_practices).

### WAV export

Build live and offline graphs from the same compiled score and independent sound instances. Do not maintain a second synthesis implementation for export.

Export the project mix, including track/master pedals, mix gain, release envelopes, and bypass states. Exclude listening/monitor gain and the selected A/B audition sandbox.

Use an OfflineAudioContext and an explicit WAV encoder. Start with PCM WAV and a documented sample-rate/channel choice. Aim for comparable musical output; do not promise identical binary files across browsers. [OfflineAudioContext](https://developer.mozilla.org/en-US/docs/Web/API/OfflineAudioContext).

Render beyond the final note to include the maximum configured release and graph latency, then an additional delay-tail budget. Default that budget to 5 seconds and allow 0…30 seconds. Show when the chosen cap truncates audible echoes and apply a short fade at that cap. Bypassed delay tails and hard Stop are distinct behaviors; ordinary end-of-score export preserves tails within the selected budget.

Inspect rendered peaks before encoding. If the render exceeds the encoding range, report clipping and offer an explicit lower export level or a user-chosen normalization option. Never silently replace the project's gain structure.

Estimate memory use before rendering long scores and give a clear limit/error where necessary. JSON remains the editable format; WAV is the listening/share format.

## 12. One implementation roadmap

Each stage leaves a usable result. Use these stages as dependency checkpoints, not fixed calendar promises.

### Stage 0 — audio proof

Implement one note, a chord, ordinary partials, one optional undertone, a basic envelope, and a source preview.

Gate: labeled frequencies are correct; the optional bank truly disables; finite square/triangle presets have the right coefficients/signs; gain and frequency-limit behavior is deliberate; audition and Stop produce no unexplained clicks. Record practical polyphony and device constraints.

### Stage 1 — playable vertical slice and storage

Implement the project model, autosave, minimal JSON import/export, named instruments, one track, the small parser, and basic CodeMirror integration.

Gate: create a timbre, save it, write a phrase, and play it without developer tools. Refresh and JSON re-import preserve the sound and score text. Changing a library preset leaves an existing track instance intact.

### Stage 2 — comparison and instrument tools

Add A/B replay, deep-copy snapshots, the linked partial inspector, solo, full optional undertone bank, macro baseline/reset behavior, and musical undo/redo.

Gate: editing B leaves A unchanged; A/B switches preserve the phrase position and explicit replay restarts it; score comparison changes only its selected track; neutral/reset macros recover their baseline; manual edits establish a new baseline without an audible jump.

### Stage 3 — visible pedalboard and routing

Add compressor/overdrive first, then EQ/delay, ordered preset chains, independent track/master instances, Apply/Apply to all, bypass, and source/output taps.

Gate: changing one track's chain leaves another independent instance unchanged; Apply to all updates only associated instances; compressor parallel paths are aligned; delay bypass preserves old echoes while adding none; Stop clears every tail.

### Stage 4 — composition studio

Add parallel tracks, master directives, the complete command reference, toggleable autocomplete, diagnostics, timeline/event inspector, and playback-revision handling.

Gate: tracks begin together and route correctly; all reference snippets parse; invalid text points to the relevant span; editing running score text never produces incorrect source highlights; UI tempo changes update the source directive.

### Stage 5 — initial-release polish

Finish keyboard operation, layouts, gain meters, local save recovery, import validation, example presets/projects, and browser/device verification.

Gate: the main demonstration works end to end; no required control depends on hover or dragging; text contrast passes; stop/replay and save/reload restore independent settings and bypass states correctly.

### Stage 6 — WAV sharing

Add offline rendering, WAV encoding, tail limits, level handling, and export size checks.

Gate: exported notes, duration, applied instruments, effect order, and master processing correspond to playback; releases/echoes are retained within the chosen tail limit; monitor volume does not affect export.

### Stage 7 — learning and analysis

Add guided experiments and the secondary analysis panel with clearly defined source/output metrics.

Gate: loading an experiment is undoable; metric units/reference/window are visible; silence produces no misleading numeric values; computed descriptors agree with simple known test signals.

### Stage 8 and later — advanced synthesis and notation

Consider phase, per-partial envelopes, noise, modulation, morphing, repeat, volume/pan, tuplets, inharmonicity, recorded-audio analysis, spectrograms, MIDI, and staff notation.

Music IDE follow-up requested after the main features: chord-symbol macros such as `chord:Cmaj13#11`, with their expanded notes shown on hover and keyboard focus. Implement the voicing/octave policy, supported symbol grammar, expansion diagnostics, and equivalent explicit-note playback together. Prioritize comparison and pedal routing first.

For repeat and other expansions, retain source mappings from generated events to useful score locations. Add features according to how clearly they connect sound, Fourier structure, and composition.

## 13. Implementation organization and verification

Use React + TypeScript + Vite for the app, CodeMirror 6 for the editor, SVG for coefficient views/timeline, and browser Web Audio for synthesis, processing, and analysis. No backend is needed for these stages. [Vite guide](https://vite.dev/guide/), [React TypeScript guide](https://react.dev/learn/typescript).

Keep separate modules for:

- Pitch/duration math, preset definitions, and coefficient transforms.
- Lexer/parser, diagnostics, command metadata, and compiled source mappings.
- Project state, preset application, snapshots, undo, and schema migrations.
- Audio source/effect factories, scheduling, latency/tail metadata, and cleanup.
- Offline graph construction and WAV encoding.
- Views, editor extensions, inspector, and preference storage.

Use focused verification for meaningful risks:

- Pitch/octave/chord rules, timing, malformed notation, and command examples.
- Snapshot isolation, independent preset copies, Apply to all scope, and undo.
- Macro baseline/reset and polarity preservation.
- Known signal frequencies, gain reference, bypass identity, and latency alignment.
- Scheduling cleanup, delay tails, hard Stop, and repeated playback.
- JSON round-trip and validation failures that preserve the current project.
- Offline/live model agreement, release/tail duration, and export level handling.
- Keyboard operation, readable layout, and the chosen palette's contrast.

The first implementation work remains the audio proof. After its gate passes, proceed through this single roadmap.

Personal version-control workflow: aim for eight focused commits per milestone, push each completed checkpoint using the configured author identity, and launch the verified portable application after every completed x.x.0 release.

Maintain the local [project knowledge map](docs/knowledge/PROJECT_MAP.md) alongside implementation work. Tree-sitter symbols and document/plan sections link into an editorial feature hierarchy with dependency communities. Local semantic seeds, graph neighborhoods, personalized PageRank and a complete-context token budget provide task context. Keep behavioral summaries and decisions current, explain dense code invariants, and regenerate/check the map before completing changes; see [knowledge usage](docs/knowledge/USAGE.md) and `AGENTS.md`.

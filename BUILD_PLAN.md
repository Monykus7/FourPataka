# FourPataka — Fourier Music Studio build plan

Updated: 2026-10-03
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
- Add instrument acoustics later inside the Instrument builder: a wet/dry algorithmic "tiny room" representing the instrument's chamber. It must work without impulse-response (IR) files.
- Expand the Instrument builder to support up to 32 signed harmonics in a later update, preserving existing 16-harmonic sounds and making piano/brass-inspired timbres a design target.

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

The v0.19.1 layout follow-up makes the expanded command reference match the score panel height while retaining fixed search and local catalog scrolling; no roadmap gate changes.

Stage 6 WAV export is implemented in v0.19.0; release/device verification remains explicit below. Stage 7 adds guided experiments and the richer analysis panel. Both are part of this plan and have implementation gates below.

Instrument-builder acoustics is a requested later feature, detailed in section 5 and queued under stage 8. It does not block the current stage 4/5 completion gates or WAV export.

The 32-harmonic bank expansion is also queued under stage 8, ahead of richer instrument-realism controls. The initial H1–H16 release boundary remains historical/current scope; it is not the planned long-term limit.

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

Planned extension: acoustics settings belong to the instrument state and follow its preset, independent track copies, A/B snapshots, Apply, Apply to all, undo, autosave and JSON round-trip rules. Older projects and mathematical presets must migrate with acoustics disabled to preserve their existing sound. Runtime reflection/feedback buffers are never saved or shared between destinations.

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

Implemented in v0.14.0: stable pedal keys, track `through`, one global `master through`, narrow source edits from Compose/Track Maker/reference cards, and pedal-key completion. Changed assignments deep-copy the template; unchanged assignments preserve local knobs, bypass and board wiring. Removing a previously applied directive clears that chain, while old scores without directives retain manual boards. Schema-v1 legacy keys migrate deterministically. Pedalboard application synchronizes changed preset associations into source without discarding the exact applied sandbox copy. Invalid source preserves settings and blocks Play. Typed edits remain pending until replay with clock continuity.

### Local save and import

Introduce autosave with the first usable project model. Use a small versioned local store and debounce frequent slider/editor changes. Musical edits and text edits must survive refresh.

Implemented in v0.17.0: a Recovery panel inspects one previous distinct autosave and one unreadable-save slot, retaining original contents. Unchanged/canonicalized reloads do not rotate the previous checkpoint. Valid copies restore as one stopped, undoable project replacement with independent sound/pedal state; preferences stay separate. Invalid copies remain exportable as raw text and cannot be restored. Native raw export uses an origin-checked file-dialog bridge with a 10 MB UTF-8 limit. Recovery captures bytes on opening; Escape/cancel/export do not create musical history. Startup archival failure does not prevent reading a valid backup; persistent notices direct the user to review available copies. If archiving fails because storage is full, the still-stored damaged latest save remains directly inspectable/exportable without another write. This closes the local-save recovery functional item, while broader stage 5 accessibility/device and end-to-end demonstration gates remain.

JSON export includes score text, referenced presets, independent track/master settings, bypass states, and A/B snapshots. Score text by itself is a notation excerpt; JSON is the portable editable project.

Validate imported schema versions, identifiers, array lengths, finite numeric values, parameter ranges, and references before replacing the current project. A failed import leaves the current project intact. Unknown future schema versions receive a clear error; migrations for older supported versions are explicit.

Undo/redo covers musical settings, preset application, macros, pedal order, and score edits. A continuous drag is one undo operation.

## 5. Instrument synthesis

### Harmonics and mathematical presets

Current implementation: H1 is the reference note at f₀. H2–H16 are its overtones at 2f₀–16f₀. Show sixteen tall bars with magnitudes from 0 to 1. The planned expansion below extends this bank to H32.

For an instrument without phase controls, the source model is:

```text
x(t) = Σ[h = 1…16] p[h] × a[h] × sin(2π h f₀ t)
     + enabled × Σ[d = 2…6] u[d] × sin(2π (f₀/d) t)
```

Here `a[h]` and `u[d]` are magnitudes, and `p[h]` is +1 or −1. Polarity is independently editable using + / − buttons under the harmonic bars and a Sign selector in the partial inspector. The inspector shows the signed coefficient. Zero-magnitude harmonics remain editable and silent; each sign action is separately undoable. This permits a triangle preset's alternating odd-harmonic signs without requiring a phase-control interface. Magnitude edits and macros preserve polarity.

Seed presets with relative Fourier coefficients:

- Sine: H1 only.
- Square approximation: odd harmonic magnitudes proportional to 1/h.
- Saw approximation: harmonic magnitudes proportional to 1/h.
- Triangle approximation: odd magnitudes proportional to 1/h², with alternating polarity.
- Soft bass: positive H1–H6 magnitudes of 1, 0.22, 0.1, 0.045, 0.02 and 0.009, with higher harmonics zero, attack 30 ms, release 350 ms and output trim −12 dB. Its rounded source is distinct from Triangle. Library and active-sound thumbnails draw the actual signed bank; only their decorative drawing scale is normalized.

For v0.16.0, only an exactly recognized, untouched version-1 factory Soft bass library template upgrades to version 2. Renamed, customized and saved templates remain unchanged. Existing applied tracks and A/B snapshots retain their independent sound and version. Load the updated library preset and Apply explicitly to change those copies.

These are finite approximations. Avoid promising that sixteen terms reproduce an ideal discontinuous waveform or a real acoustic instrument. Instrument-inspired examples can be labeled as approximations.

### Planned expansion — up to 32 harmonics

Status: requested, deferred, and not implemented. Extend the signed sine bank to H1–H32, with H32 at 32f₀. The source sum above will run to 32 when this feature ships; it remains 16 in the current v0.17.0 release. Thirty-two harmonics per voice is distinct from the current 32 simultaneous-voice limit.

Keep H1–H16 easy to reach and expose H17–H32 as an expandable second bank with exact values, polarity, keyboard adjustment and partial solo. Collapsing a bank is only a layout preference: it must not mute or discard coefficients, and nonzero upper harmonics must remain visibly indicated. Use responsive banks rather than squeezing 32 controls into the existing row.

Migrate every existing instrument template, applied track copy and A/B snapshot by preserving its first 16 magnitudes/polarities exactly and appending 16 zero magnitudes with positive polarity. Preserve trim, envelopes, undertones and waveform-point geometry. Loading or migrating old point geometry must not re-project it into a different sound. New waveform drawing/point edits should project into the expanded bank, with adequate sampling and tests of H17 and H32 recovery. Reset to sine clears all higher harmonics together.

Update synthesis coefficient allocation, mathematical preset generation, coefficient macros/baselines, source waveform/spectrum ranges, microscope selection and labels, project validation/migrations, persistence and future offline rendering together. Keep existing saved mathematical presets unchanged through migration; freshly selected expanded presets can use their documented coefficient formulas through H32. Define macro scaling explicitly so extending the array does not silently alter an old sound or an old macro baseline.

Continue excluding components at or above half the active context sample rate from playback and effective source inspection, while retaining their saved coefficients and marking them unavailable. The upper bank will therefore have fewer playable harmonics at high pitches. Preserve explicit trim and disabled automatic normalization; extra coefficients must not trigger hidden loudness compensation.

Future implementation gate: old projects reproduce their original sound after migration; H17/H32 edits, polarity, solo, waveform projection and graphs agree below Nyquist; out-of-band components do not alias; all 32 values survive preset application, independent copies, A/B, undo and JSON round-trip. Verify continuous live edits/comparison, polyphonic resource/performance bounds, narrow-screen/keyboard operation and browser/portable/offline consistency.

Piano and brass are instrument-inspired targets, not guaranteed by the harmonic-count increase. Keep per-partial attack/decay, excitation/dynamic brightness and piano-string inharmonicity as separate later synthesis work alongside chamber acoustics. Piano string stiffness and brass brightness variation motivate those follow-ups: [piano inharmonicity study](https://doi.org/10.1051/aacus/2021002), [Julius O. Smith's FM brass discussion](https://www.dsprelated.com/freebooks/sasp/FM_Brass.html).

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

### Planned instrument acoustics — tiny chamber

Status: requested, deferred, and not implemented. Add a compact Acoustics section inside the Instrument builder to give the synthesized signal an instrument-inspired body/chamber response. The goal is a small resonant chamber rather than a large performance-room ambience; label it as an approximation, not a physically accurate instrument simulation.

Use algorithmic reverb built from generated short reflections and a bounded, damped feedback network. No IR files, convolution library, recording upload or asset download should be required. Select the exact network and parameter ranges in a listening/numeric audio proof before committing to an implementation.

Initial controls:

- Enable acoustics, default off, with a one-step reset to dry/default chamber settings.
- Wet/dry blend, 0–100%, with exact numeric and keyboard controls. Start with a documented linear blend; 0% wet must reproduce the existing dry signal at unity relative to the chamber input.
- Chamber size/reflection spacing, emphasizing short instrument-body responses.
- Decay and damping/body tone, with documented units and bounded ranges. More elaborate material, resonance and chamber presets can follow the initial proof.

Proposed signal path: combined instrument voices after their envelopes and source trim → instrument chamber with dry/wet blend → track pedal chain → track level. Audition uses the same instrument stage before its selected pedal chain. A chamber instance is shared by that destination's polyphonic voices, with independent processor state for other tracks and A/B branches. The master pedalboard remains downstream of the track mix.

Keep drawn waveform, harmonic coefficients and source inspectors authoritative for the unprocessed source. Any chamber-output measurement must identify its tap explicitly, so users can distinguish source synthesis from body coloration. Source editing and chamber editing remain separate undoable operations.

Future implementation gate:

- Dry identity and unchanged legacy playback; no hidden normalization or gain boost. Measure output/headroom and verify silence and parameter extremes at supported sample rates.
- Stable bounded feedback, finite documented tail allowance, smooth live audition controls, and bounded processor/resource ownership across chords and repeated playback.
- Continuous A/B switches preserve musical position and oscillator phase while transitioning independent chamber state. Reflection timing is intentional coloration; measure any processing latency separately and preserve existing track alignment.
- Rests and note releases allow chamber decay; Stop fades and disposes chamber state with the rest of the session. Enable/bypass transitions need an explicit, tested feed/tail policy.
- Preset application, snapshot isolation, grouped undo, autosave, import validation and migrations cover every chamber setting. Playing-score edits follow the existing frozen-revision/replay policy.
- Browser and portable desktop workflows agree; offline/WAV rendering uses the same chamber model and includes its finite tails when this feature ships.

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

The physical board replaces direct Add buttons and the tall serial rack. Select pedals or patch cables from an equipment menu, place small pedals on a four-column/two-row snap grid with Velcro strips, drag handles to reposition, and patch output jacks to input jacks using the mouse. Keep small dials on each pedal and exact controls in a selected-pedal inspector. Placement does not determine effect order; explicit cables do. Initially support one serial path with no splits or feedback loops. Incomplete output connections produce silence unless the whole board is bypassed. Old chains retain their order as prewired boards. Store placement/cables in project and preset copies; visual movement stays live without a replay requirement. The physical board is implemented in v0.12.0. Drag placement clears the overlapping equipment menu after native drag-image capture, with cancellation cleanup and first-column drop coverage. Keep the board surface and inspector modular for the planned wider frontend overhaul.

Save whole-chain presets containing effect order, knob values, and individual pedal states. In Compose, show the assigned chain and a compact bypass control for every track and for the master.

A header must identify the editing destination: library preset, a particular track's independent instance, or master instance. Avoid an ambiguous editor that silently changes a different destination.

### Effects and controls

- **Compressor:** threshold in dB, ratio, attack/release in ms, output/makeup gain in dB, and mix percentage. Set knee to a documented default initially; an advanced knee control can follow.
- **Overdrive:** drive in dB, tone cutoff in Hz, output level in dB, and mix percentage. Use a documented soft-clipping curve and oversampling.
- **Three-band EQ:** low gain, mid frequency, mid gain, and high gain. Use fixed, documented shelf frequencies and mid bandwidth initially.
- **Delay:** time in ms, feedback percentage, and mix percentage. Bound feedback strictly below 100%; use a conservative default. Tempo-synchronized times are a later extension.

EQ v0.11.0 uses low/mid/high gains of −12…+12 dB, an adjustable 150…4000 Hz mid center, fixed 200 Hz low/4000 Hz high shelves, and mid Q = 1. It starts flat, offers output/mix and a one-step flat reset, and uses the existing independent chains and live-audition/frozen-score policy. EQ is released before implementing delay, as requested on 2026-10-02.

Delay v0.13.0 implements time 20–2000 ms, feedback 0–95%, output −24…+12 dB and linear mix. Defaults are 300 ms / 30% feedback / 0 dB / 35% mix. Independent buffers retain echoes under pedal/whole-chain feed bypass, measured tail indicators bridge gaps, and Stop clears all state. A separate first-echo path and compensated feedback loop preserve cadence in Chromium at 44.1/48 kHz. Echo time contributes zero scheduling latency; a finite -60 dB tail estimate extends playback beyond the last release and refreshes for live audition edits. Score parameters remain frozen. Chain score directives arrive in v0.14.0; tempo sync remains future work.

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

Implemented for v0.15.0: eleven scoped cards including track-header `using` and `through`, contextual instrument/pedal keys and unique new-track previews, category filtering, rule/syntax/key search, keyboard-readable details, visible insertion destinations and unavailable-action reasons. Instrument assignment edits only its parsed key span; global cards update rather than duplicate directives. Empty scores allow globals/first-track creation while track-dependent cards are disabled. Invalid or playing scores block insertion, with documentation still readable. Contextual `using`/`through` completion restricts suggestions to the correct library, and the native Command reference menu focuses search after the view commits. UI controls are documented separately from notation. This closes the command-reference functional item; broader stage 4/5 accessibility, recovery and real-device gates remain.

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

Use an editor-focused split, around 60/40 for score and command reference. The editor fills its panel down to the status bar; do not leave unused panel space underneath a fixed-height editor. Below that row, show timeline and independent track/master controls side by side. Event inspection belongs with this lower overview. The v0.14.1 layout implements this arrangement and enlarges the desktop editing area.

The v0.18.1 correction caps command reference at 560 px on desktop and 460 px on narrow screens, approximately half or less of its expanded catalog height. Search remains above the internally scrolling catalog; filtering resets catalog scroll without moving search focus. Keyboard focus, Space/Page navigation, all cards/rules and contextual insertion remain available. The score retains its independently scrollable editing area.

At narrower widths, stack score, command reference, timeline and track controls in that reading order. Keep timeline/board scrolling local and controls readable. A drawer inspector remains planned; the implemented event inspector stays in the lower overview. Do not shrink sixteen labels and multiple knobs into unreadable controls.

### Components and interaction

Use accessible low-level primitives for sliders, menus, dialogs, tooltips, and tabs, with the custom palette. Every knob has a textual value and keyboard operation. Reordering has button/keyboard alternatives.

Implemented for v0.18.0: Add dot inserts an anchor on the current target curve in its widest gap, with exact inputs and deletion focus recovery. Equipment supports arrow/Home/End navigation, skips unavailable items, and transfers keyboard selection to a free slot or board jack; placement focuses the new pedal. Named instrument/track dialogs focus their first field and return to their trigger. Each timeline track offers a readable event picker and Previous/Next, with one note Tab stop and arrow/Home/End inspection. Inspection uses the displayed frozen score revision and never seeks playback or edits source/history. Broader screen-reader, physical-device and listening verification remains open.

Waveform discoverability improves in v0.18.1: Add dot sits beside Dots/Draw, and an always-visible guide above the editable Dots graph shows Tab, position/amplitude arrows and Delete. Focused dots expose the same instructions as accessible descriptions. This is UI polish, without a new musical-feature or release gate.

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

Automated functional coverage includes these behaviors and score chain directives as of v0.14.0. Physical listening and real mobile/browser verification remain open; this does not close the later release-polish gates.

### Stage 4 — composition studio

Add parallel tracks, master directives, the complete command reference, toggleable autocomplete, diagnostics, timeline/event inspector, and playback-revision handling.

Gate: tracks begin together and route correctly; all reference snippets parse; invalid text points to the relevant span; editing running score text never produces incorrect source highlights; UI tempo changes update the source directive.

The complete contextual command-reference catalog and source insertion are implemented for v0.15.0. Verification details belong in `IMPLEMENTATION_STATUS.md`; this item does not close the broader stage 5 release gate.

### Stage 5 — initial-release polish

Finish keyboard operation, layouts, gain meters, local save recovery, import validation, example presets/projects, and browser/device verification.

Local-save recovery inspection, export and undoable restoration are implemented in v0.17.0. Verification is recorded in IMPLEMENTATION_STATUS.md; this does not close the complete stage 5 release gate.

The v0.18.0 keyboard workflow covers source editing, independent A/B, saved instruments, Track Maker, physical EQ placement/patching, source-authoritative application, play/replay/Stop, editable JSON and reload. Automated browser/portable evidence is recorded separately from remaining manual screen-reader, real-device/browser and physical-listening gates. WAV export remains the next main feature after these release-polish checks.

Gate: the main demonstration works end to end; no required control depends on hover or dragging; text contrast passes; stop/replay and save/reload restore independent settings and bypass states correctly.

### Stage 6 — WAV sharing

Add offline rendering, WAV encoding, tail limits, level handling, and export size checks.

Gate: exported notes, duration, applied instruments, effect order, and master processing correspond to playback; releases/echoes are retained within the chosen tail limit; monitor volume does not affect export.

Implemented in v0.19.0: shared score/voice/effect factories, frozen applied copies, PCM16 mono/stereo at 44.1/48 kHz (default 48 kHz stereo), a 5 s default echo budget adjustable 0–30 s, maximum release plus measured graph latency and 100 ms filter settling, conservative truncation warnings with a 20 ms end fade, peak/clipping review, explicit −36…0 dB export level or opt-in −1 dBFS normalization, and a 256 MiB estimated-memory preflight. Browser downloads and origin-checked native WAV saving preserve editable JSON and project history. The stage 6 automated functional gate passes in Chromium and the packaged Electron app; full release checks and actual validation limits are recorded in IMPLEMENTATION_STATUS.md. Physical listening and other browser/device checks remain open; this does not close the outstanding stage 5 manual gates.

### Stage 7 — learning and analysis

Add guided experiments and the secondary analysis panel with clearly defined source/output metrics.

Gate: loading an experiment is undoable; metric units/reference/window are visible; silence produces no misleading numeric values; computed descriptors agree with simple known test signals.

### Stage 8 and later — advanced synthesis and notation

Requested instrument-builder follow-up: expand the current 16-harmonic bank to support up to 32 harmonics, with the migration, projection, inspection, Nyquist and copy/performance gates in section 5. Establish the expanded bank before later per-partial envelopes and instrument-realism presets; it does not delay current main-feature completion or WAV export.

Requested instrument-builder follow-up: the deferred tiny-chamber acoustics feature in section 5, with algorithmic reverb, wet/dry control and instrument-owned saved settings. Implement its audio proof and copy/clock/tail/export gates together; no IR assets are required. Keep it after the current main-feature completion and WAV export work.

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

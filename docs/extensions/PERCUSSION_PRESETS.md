# Percussion presets and noise hits

The v0.25.0 source includes three editable percussion-inspired timbres: **Kick** (`kick`), **Closed hi-hat** (`hiHat`), and **Snare** (`snare`). v0.30.0 replaces the Kick and Snare factories with decaying drum bodies, falling pitch and filtered-noise transients. v0.29.0 replaces the factory Closed hi-hat with quiet metallic partials plus a filtered noise burst and automatic hit decay. This is a bundled preset contribution, not completion of the planned M3 module API or M4 synthesis engines.

## Use them

New projects include the three presets. Since v0.25.1, loading an existing local session, importing JSON or restoring recovery also adds missing bundled percussion before parsing. No separate setup action is required: they appear in Instrument and their score keys are available to the IDE. Occupied keys/custom presets, owned A/B/track sounds and source text remain intact; colliding IDs receive a suffix. If all missing templates cannot fit within 128 slots, the valid project still opens unchanged. **Add percussion presets** remains a strict manual fallback and reports the capacity limit instead of partially adding a set. The original v0.25.0 required this separate action, which left existing sessions without the feature until it ran.

Select a preset, choose **Use hit preview**, then **Listen**. The preview changes the shared comparison material's pitch and gate length, leaving the score and owned track sounds intact. The gate length selector in Comparison works for any note/chord audition; A and B use the same duration. Selecting another preset or switching A/B does not automatically change the material or restart its clock. Explicitly changing material/replaying starts a new audition.

- **Kick v2:** C2 preview, 250 ms gate, 5 ms attack, 240 ms release, −12 dB trim. A low Fourier body decays with a 120 ms e-fold time. A24-semitone initial rise falls toward the written pitch with 25 ms frequency decay; noise level 0.12 above 3000 Hz decays in 12 ms for the beater. Try C1–C2.
- **Closed hi-hat v2:** C4 preview, 31.25 ms gate, 5 ms attack, 35 ms release, −12 dB trim. Filtered white noise (level 0.85, high-pass 6500 Hz, low-pass 14000 Hz) supplies the sizzle; six H13/H17/H19/H23/H29/H31 partials at 8% of the old magnitudes supply a quiet metallic edge. A45 ms e-fold decay shortens the hit even with a long written note.
- **Snare v2:** G3 preview, 250 ms gate, 5 ms attack, 180 ms release, −12 dB trim. Four low partials provide a 45 ms body, with a 4-semitone initial rise and 18 ms pitch decay. Filtered noise level 0.8 above 1200 Hz decays independently over 90 ms, forming the rattle. Try D3–G3.

The original v1 Kick and Snare were sustained periodic approximations. Current v2 factories decay during held notes. Note-off/release and articulation still bound the voice, so extremely short or staccato notes can choke a drum; use the 250 ms hit preview to hear its full shape. Hi-hat v2 is unchanged. All these timbres are editable synthesized drums; inharmonic membrane/cymbal models and broader engine contracts remain planned.

```text
tempo 120
time 4/4
track kickTrack using kick {
  staccato[
    C2 16th
    rest 8th
    C2 16th
  ]
}
track snareTrack using snare {
  rest 8th
  staccato[
    D3 16th
  ]
  rest 16th
}
track hatTrack using hiHat {
  repeat 4 {
    staccato[
      C4 16th
    ]
  }
}
```

This example is a separate test fixture; the owner's bundled demo is preserved.

## Extend the working source

See [instrumentPresets.ts](../../src/core/instrumentPresets.ts) for the pure factories and `PERCUSSION_PRESETS` metadata. Each call starts from a fresh mathematical preset and returns fresh magnitude/sign/undertone arrays. Never mutate an exported singleton `Sound`. A catalog entry has a unique ID/key, label, template version, factory, suggested pitch, quarter-beat gate and concise hint. This narrow bundled catalog is not a public runtime registry.

`createPercussionPresets()` creates owned templates. [project.ts](../../src/core/project.ts) uses it for new projects and the strict `withPercussionPresets()` action. Validated project import calls that action when the missing set fits, before ordinary parser/reconciliation; local startup, JSON import and recovery share this path. Import never rejects an otherwise valid project for lacking factory capacity. Autosave canonicalization preserves the previous distinct recovery checkpoint rather than replacing it for a bundled-only addition. A/B snapshots and tracks deep-copy the selected library sound, and saving a newer library version still requires explicit Apply to change a track. Score `using` keys come from that project's library; the parser has no percussion-specific branch.

```mermaid
flowchart TD
  Factory[Pure Sound factory] --> Catalog[Bundled catalog metadata]
  Catalog --> New[New project templates]
  Catalog --> Import[Validated project load or explicit Add action]
  Saved[Existing project library] --> Import
  Import --> Check[Preserve occupied keys; resolve IDs; check capacity]
  Check --> Library[Independent library templates]
  New --> Library
  Library --> AB[Explicit load into active A/B snapshot]
  Library --> Track[Assignment or explicit Apply into owned track]
  AB --> Voice[Shared Fourier voice factory]
  Track --> Voice
  Voice --> Live[Live output]
  Voice --> WAV[Frozen WAV output]
```

The comparison gate is optional `comparisonMaterial.noteBeats` in schema 2, bounded to 1/64–32 **quarter-note beats**. Omitted means the original 3.2 beats. Note/chord preview tempo remains 120 BPM, so seconds = beats × 0.5. Phrase comparison ignores this field and uses the score's timing. The UI displays milliseconds; factory metadata keeps the underlying beat unit. That preview gate behavior is unchanged. v0.29.0 separately adds optional `Sound.percussion` hit data as described below; ordinary sounds without it keep the original envelope.

```mermaid
flowchart LR
  Pitch[Preview pitch] --> Frequency[Fundamental in Hz]
  Beats[Shared noteBeats] --> Seconds[Quarter beats times 0.5 seconds]
  Frequency --> Source[Signed periodic source; Nyquist exclusion]
  Seconds --> Gate[Note-off time]
  Source --> Envelope[Attack then held level then release]
  Gate --> Envelope
  Envelope --> Trim[Saved output trim in dB]
  Trim --> Pedals[Destination pedals and project mix]
```

## Noise-hit source contract (v0.29.0)

`Sound.percussion` is optional data inside the existing schema2 sound. Omitting it preserves sustained Fourier behavior. When present, all three fields are required and validated before import:

- `noise`: linear white-noise level, 0–1. Zero retains decay on the Fourier body without audible noise.
- `highpass`: high-pass cutoff in Hz, 20–16000. Runtime clamps it below Nyquist at the context's sample rate. A fixed 14000 Hz low-pass is similarly clamped; both filters use Q 0.707.
- `decay`: exponential e-fold time in seconds, 0.01–2. The builder displays milliseconds. At 45 ms, hit gain reaches about 37% after 45 ms and about 1.2% after 200 ms, before the ordinary attack/gate/release envelope.

The instrument builder's **Percussive hit** toggle exposes these three controls for any sound. Disabling removes optional hit data; undo restores it. Noise is not represented by editable Fourier dots, harmonics or the steady source graph. Those graphs explicitly identify the Fourier component; playback/output monitoring includes both paths. Harmonic solo excludes noise. Saving a library template does not change applied tracks; use Apply or Apply to all using this preset.

```mermaid
flowchart LR
  Fourier[Signed Fourier body and undertones] --> Hit[Original-note-age hit decay]
  Noise[Deterministic white-noise buffer] --> HP[High-pass and fixed low-pass]
  HP --> Level[Saved noise level]
  Level --> Hit
  Hit --> Gate[Existing attack gate release]
  Gate --> Trim[Instrument trim]
  Trim --> Routing[Owned pedals and shared live or WAV mix]
```

Implementation lives in [percussionSource.ts](../../src/audio/percussionSource.ts), created once per [voice.ts](../../src/audio/voice.ts) voice. It adds no score-key special case or transport. A deterministic xorshift buffer contains one second of bounded uniform white noise per context, cached weakly; each voice owns its source/filter/gain nodes. Live and offline rendering use the same factory and seed. Repeated renders at the same sample rate are reproducible. No repository text, audio asset or network request is involved.

The noise cursor starts at the original note age if enabled later. Filter/level changes smooth over about 20 ms; hit gain changes join the decay appropriate to that original age, also over 20 ms. They do not restart the note attack or host clock. The existing Fourier phase rotation is unchanged. Ordinary envelope note-off/release still determines the finite voice end, and articulation's release limit still applies. Noise stops with the voice, including stealing, hard Stop and disposal; a noise-only voice also disconnects on completion. Noise adds no alignment latency or effect tail beyond the existing envelope. This is a synthesis layer, separate from the planned chamber and reverb pedal.

To contribute another hit today, return fresh data from a reviewed preset factory and add its catalog metadata. For example, this independent source factory needs no parser changes:

```ts
import { mathematicalPreset, type Sound } from '../../core/music';

export function brushedHit(): Sound {
  const base = mathematicalPreset('sine');
  return {
    ...base,
    harmonics: base.harmonics.map(() => 0),
    percussion: { noise: 0.55, highpass: 1800, decay: 0.12 },
    attack: 0.005,
    release: 0.04,
    trim: -18,
  };
}
```

This import is real when contributing under `src/modules/my-hit/`; catalog registration remains an explicit source change. M3/M4 public registries, unknown-engine preservation and contributor engine CI remain planned. Schema2 stays additive; old builds may ignore hit data, so they cannot reproduce the new timbre. Do not promise audio equivalence when rolling back.

On load, only the recognizable untouched `hi-hat`/`hiHat`/`Closed hi-hat` v1 factory upgrades to v2. Detection compares every legacy sound field and rejects extra/custom fields. Labels, IDs, versions or edited values prevent replacement. Existing applied v1 sounds and A/B remain owned snapshots. Select **Closed hi-hat** to load the new library sound and explicitly **Apply** to update a saved hat track. New assignments use v2 immediately. The owner's demo source remains unchanged.

```mermaid
flowchart TD
  Import[Validated saved project] --> Recognize{Exact untouched v1 library hat?}
  Recognize -->|Yes| Upgrade[Fresh v2 library template]
  Recognize -->|No| Keep[Preserve custom template]
  Import --> Owned[Preserve applied tracks and A/B]
  Upgrade --> Load[Explicit select into active A/B]
  Load --> Apply[Explicit undoable Apply]
  Apply --> Track[New independent track sound]
```

Regression checks cover deterministic renders, low cycle correlation versus the old pitched hat, early/late RMS decay, noise-only output and silent solo, short-note tails, mid-note enabling/editing, Stop, validated import bounds, conservative migration, saved controls/undo and explicit copy application. Numeric tests establish behavior; perceptual realism remains a listening check.

## Verification recipe

Run `npm test -- tests/unit/instrumentPresets.test.ts tests/unit/comparison.test.ts`, then `npx playwright test tests/browser/percussion.spec.ts`. The native workflow is `npx playwright test --config playwright.desktop.config.ts --grep "packaged percussion"` against a freshly built/package-verified application.

Tests validate schema bounds, fresh banks, distinct spectral roles, and automatic availability for old sessions, parser/IDE key discovery and conservative additions (including collision/capacity behavior). The sum of magnitudes times trim bounds the Fourier component only. Noise hits also need rendered headroom checks: bundled short-hit output is finite, nonzero and below 0.65 peak at 44.1/48 kHz. This is factory evidence, not automatic normalization or a guarantee about arbitrary edited/polyphonic mixes. Offline voices verify finite nonzero output and silent tails at 44.1/48 kHz. Browser/native flows cover previews, source assignment, persistence and JSON; WAV verifies the frozen owned sounds and upper bank through the shared factory. Audible realism and physical-device response remain listening checks.

For broader module contracts and ownership diagrams, continue with [the instrument guide](INSTRUMENTS.md), [module creation](MODULE_CREATION.md), and [compatibility](COMPATIBILITY.md).


## Independent drum decay and falling pitch (v0.30.0)

Two optional fields extend `Sound.percussion` without changing old sounds:

- `noiseDecay`: separate noise e-fold seconds, 0.005–2. Omission inherits body `decay`, preserving the v0.29.0 hi-hat. Noise decay and body decay share the same note-off/release envelope and explicit trim.
- `pitch`: `{ amount, decay }`, with initial upward `amount` in semitones (0–48) and frequency e-fold `decay` in seconds (0.005–0.5). Omission preserves the written pitch. The builder shows Pitch drop in semitones and both decay controls in milliseconds. Zero Pitch drop removes pitch data.

At note age t, frequency is `f0 * (1 + (2 ** (amount / 12) - 1) * exp(-t / decay))`. This exponential is in frequency, not in semitones. Every harmonic/undertone follows the same voice-local ratio. New voices conservatively exclude partials above Nyquist at their sweep peak, preserving saved coefficients. Steady graphs describe the Fourier component at the written pitch; output monitoring includes the actual sweep/noise/decays.

```mermaid
flowchart LR
  Note[Written frequency and original note clock] --> Pitch[Falling frequency ratio]
  Pitch --> Body[Signed Fourier body]
  Body --> BD[Body decay]
  White[Deterministic noise] --> Filter[High-pass and low-pass]
  Filter --> ND[Independent noise decay and level]
  BD --> Gate[Shared attack note-off release]
  ND --> Gate
  Gate --> Trim[Instrument trim and owned routing]
  Trim --> Output[Shared live playback and frozen WAV]
```

[pitchEnvelope.ts](../../src/audio/pitchEnvelope.ts) owns a bounded piecewise trajectory: a 20 ms transition joins the current frequency and accumulated phase, then decays from the original note age. Its phase integral follows per-frame oscillator frequency accumulation, using a geometric sum for exponentials and sampled linear integration for transitions. [voice.ts](../../src/audio/voice.ts) rotates replacement PeriodicWave coefficients by that integral and schedules the same curve on active/retiring sources. No second transport or envelope attack is introduced. Frequency and phase join continuously when pitch settings change, including an unfinished previous transition.

[percussionSource.ts](../../src/audio/percussionSource.ts) now owns separate body/noise gain envelopes. Unchanged settings do not reschedule a decay. Changed settings analytically anchor the current gain before smoothing to the original-note-age target, preventing ramps from interpolating from the attack. Runtime sources/filter/envelope state remain voice-owned, sample-rate-aware, deterministic and fully disposable. Stop/stealing, release limits, routing latency and frozen export snapshots retain the existing policies.

Factories v2 replace only exact untouched v1 Kick/Snare library templates. Edited templates, applied tracks and A/B remain independent copies. Select Kick/Snare and explicitly Apply to refresh an existing track. New assignments use v2 immediately; the owner's demo source is unchanged. Numerical checks measure a falling pitch, phase agreement during waveform edits, noise/body separation, different decay ratios, finite bounded headroom and silent tails at 44.1/48 kHz, plus units/import/copy/control/native persistence. Manual perceptual realism and device gates remain separate.

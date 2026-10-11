# Adding instruments and synthesis engines

Status: Fourier presets can be contributed through current source changes. Preset registration is planned for M3; an extensible synthesis-engine contract is separately planned for M4. Neither is an implemented public module API. See [architecture](ARCHITECTURE.md), [compatibility](COMPATIBILITY.md) and [the milestone plan](../../BUILD_PLAN.md#14-modularity-and-open-source-contributions).

## Current Fourier preset contribution

The [percussion preset walkthrough](PERCUSSION_PRESETS.md) is a working source example with fresh factories, safe bundled availability for existing projects, short-hit preview units, gain/copy tests and routing diagrams. It adds bundled Fourier timbres without declaring the planned M3 registry implemented.

1. Construct a fresh `Sound` using [music.ts](../../src/core/music.ts), with a timbre factory where appropriate in [instrumentPresets.ts](../../src/core/instrumentPresets.ts). Existing mathematical presets are useful starting points; do not mutate a shared template.
2. Supply exactly 32 harmonic magnitudes, 32 signs and five undertone magnitudes today. Magnitudes are 0–1; signs are +1/-1 even for silent partials. Undertones have a separate enable flag. Attack/release are seconds and output trim is dB.
3. Validate against `validateSound` in [project.ts](../../src/core/project.ts): attack 0.005–2 s, release 0.01–3 s and trim -36–0 dB. Optional waveform points must pass their own validator. These are current limits, not a future module schema.
4. Add the factory template to `createProject` with unique ID, score key, label, version and fresh sound data. `using` keys start with a letter and contain letters, digits or underscores; do not put a namespaced module ID in score text.
5. Check thumbnail/source inspection, saving, copying, Apply/Apply to all, Track Maker, command reference, completion and live/WAV playback. Saving a template does not reapply it to existing tracks.
6. Document gain/reference choices and add numerical and copy/import/keyboard proofs. Updating a factory preset must not overwrite customized templates, A/B or owned track sounds. The current conservative Soft bass upgrade is an example of this ownership policy.

The current engine uses signed sine coefficients, optional undertones, a shared envelope and explicit trim. Nyquist exclusions depend on pitch and sample rate; preserve saved coefficients even when a partial cannot currently play. Source thumbnails may scale for display, but audio does not normalize coefficients automatically. The bank now supports 32 harmonics in project schema 2; schema-1 imports are zero-padded. Tiny-chamber acoustics and other engines remain planned.

## Planned M3 preset module recipe

Declare immutable preset metadata and a pure factory for new settings using the supported Fourier schema. Register through the instrument-preset registry once; the host derives library discovery, previews and score-key suggestions. Keep module/type identity separate from a project's independently editable preset ID, score key and template version.

A newly shipped factory template is available for new projects or an explicit library import/update. Merely starting a new application version must not replace user data. The host deep-copies factory settings into library, A/B and applied track state. Any recognized untouched-template upgrade needs a documented migration fixture and never updates an applied copy implicitly.

Gate M3 with a runnable independent timbre example using only the public preset contract. It must save, reload, compare continuously and render through the existing Fourier engine without new special cases in `App.tsx`, the parser or synthesis. Document the exact supported harmonic/undertone schema, units, key rules and preset upgrade policy with that example.

## Planned M4 synthesis-engine recipe

A new engine is a larger contribution than a preset. Implement only after the host exposes a versioned voice factory/capability contract. It must provide:

- Serializable validated settings, a data version and pure migration, with fresh runtime state per voice/instance.
- Host-clock note scheduling in seconds, frequency in Hz, note start/duration, release/end metadata and deterministic seeds where randomness is used.
- Note-off, retirement/voice-stealing fade and full disposal for active, releasing, future-scheduled, silent and replaced sources. The host retains its voice-admission/resource policies.
- Honest update capabilities: phase-continuous live changes where supported; otherwise a warmed crossfade or replay-only change. Never claim that restarting an oscillator preserves the original phase.
- Shared live/offline factories, preflight resource estimates and declared supported contexts/sample rates. AudioWorklet or other assets, if needed, must be packaged locally and have an offline implementation/proof or explicitly block unsupported export.
- Inspector capabilities. Fourier coefficient/dot/solo controls only appear for engines that support that mathematical representation. An arbitrary sampler/noise engine must not report its data as editable sine coefficients.
- Defined trim/envelope/source taps and optional body-acoustics placement before track pedals, without moving monitor gain into project export or silently changing old Fourier sounds.

Do not move score scheduling, project mutations, routing or native file access into an engine. Browser and portable applications share the same saved settings and factories.

## Required proofs and docs

Preset gates cover valid defaults, pitch/reference gain, signed coefficients and Nyquist boundaries, exact import/export, undo, factory upgrade conservatism and independent copy/application scope. Browser/native flows cover audible audition, continuous A/B on the same phrase clock, library save, source assignment, Stop/replay and owned WAV output.

Engine gates additionally cover reference pitches and sample rates, polyphonic performance/resource limits, deterministic offline behavior, phase and envelope continuity, retirement/cleanup, finite release/tails, source/output inspection capabilities and missing-engine preservation. Publish a clean-checkout engine tutorial and a runnable minimal engine example with the exact supported API and data versions. Physical-listening and real-device evidence remains distinct from automated checks.

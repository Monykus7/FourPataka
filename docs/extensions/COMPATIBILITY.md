# Module identity, project compatibility and lifecycle

Status: required contracts for M1 and subsequent module milestones, planned and not implemented. Current imports accept project schema 1, validate the known pedal kinds and fixed Fourier `Sound`, and reject unsupported schemas/kinds. The preservation workflow below is a new milestone requirement, not current behavior.

## Keep identities and versions separate

- Module/type IDs identify registered implementations. Reserve built-in IDs and require namespacing for contributed types; duplicate definitions fail at assembly validation. Never derive identity from a display label.
- Instance IDs identify owned pedals or voices; library preset IDs identify templates. Sharing a type ID never means sharing mutable settings or runtime state.
- Score keys remain project-local instrument/pedal preset references accepted by the existing notation grammar. Renaming a label or installing a module must not rename those keys or rewrite source.
- Host module API versions describe code contracts and supported capabilities. Package/application version alone is not an API compatibility claim.
- Module saved-data versions describe a settings payload. A factory preset/template version is another separate value; updating it does not reapply it to tracks.
- Project schema version describes the outer document format. Bump/migrate that schema when the stored structure changes, even if a module's parameter names stay the same.

Record required implementation/data versions in future project envelopes. JSON contains validated data only, with bounded size/depth/array/string limits; it never contains an executable module or an import URL. Runtime nodes, oscillator/LFO phase, analyser buffers, worklet state and timers stay out of saved data.

## Migration sequence

M1 captures legacy fixtures and defines the future envelope/compatibility contract without changing current project files. The milestone that first persists registered module data must implement and prove the schema migration before enabling that format. Keep legacy built-in IDs/kinds and score-key associations mapped deliberately; do not infer them from labels.

Import should parse and bound the outer document, identify compatible/missing/incompatible module requirements, apply pure validated data migrations on a fresh copy, then commit atomically through the host. Migration failure leaves the open project and original import untouched, with a useful module/version/path diagnostic. Preserve an original recovery/export copy before changing a saved format; transformations never mutate the caller's object or auto-write over the sole old-format copy.

Fixtures must cover schema-v1 sounds/signs/undertones, customized factory templates, A/B copies, applied track/master chains, cables/positions, source comments/line endings/keys, levels/bypass and unrecognized future payloads. Existing unchanged-assignment reconciliation and conservative factory upgrades remain authoritative.

Older application versions may reject a new schema; do not claim backwards readability without a tested downgrade writer. Document supported host/module/data versions and rollback/export options with every release. Breaking public contract changes require an explicit migration/deprecation policy before adoption; M6 will publish the support window rather than promise indefinite compatibility here.

## Missing or incompatible modules

The planned behavior is to preserve bounded, structurally valid unknown module envelopes unchanged in memory and saved JSON, display an unavailable-module placeholder with ID/version/reason, and allow inspection/recovery/export of the original data. Missing code is different from malformed data: invalid or oversized documents still fail validation safely.

Do not silently remove a pedal, substitute a sine, treat an unknown engine as a Fourier preset or change routing. Playback/comparison/WAV for an affected destination is explicitly blocked until the required module is available or the user makes an explicit undoable removal/replacement. Host Stop and raw project recovery remain available. An unused unavailable library item can be preserved without blocking an unrelated supported destination; track these requirements per destination rather than disable everything indiscriminately.

Installing/registering a compatible implementation later should recover the preserved settings after validation, without changing source keys or replacing independent copies. Re-saving known settings cannot discard unknown fields/envelopes needed for a later version. Test unavailable, incompatible API, newer data, malformed payload, removed module, re-enabled module and round-trip preservation separately.

## Ownership and timing invariants

Definitions/default factories never hand out shared mutable settings. Library, A/B, each track and master receive independent serializable data. Every live/offline graph gets its own nodes, feedback memory and state; runtime resources are owned until disposal, including future, silent, releasing and retired sources.

The host freezes score revisions and export snapshots. Parameter updates declare whether they smooth in place, crossfade warmed instances or wait for replay. Session/note origins and Web Audio time in seconds govern phase and scheduling; wall-clock timers cannot define note or LFO phase. Randomized synthesis uses supplied reproducible seeds for offline agreement.

Processing latency and finite tail bounds use seconds. Controls may expose ms/Hz/dB/% with explicit boundary conversions. Musical delay/phase is not automatically latency compensation. The host aligns tracks/A-B using declared/calibrated processing delay, composes serial tail budgets, performs clipping/resource preflight and keeps monitor level out of WAV.

Dispose must be idempotent and clear nodes, callbacks, meters, worklets, buffers and deferred work. Bypass follows the declared dry/feed/tail policy; hard Stop cancels and releases all owned audio state, and fresh replay does not resurrect old tails.

## Host boundary and testing

The initial implementation bundles reviewed source with explicit registration. It provides an architectural API boundary, not isolation from malicious module code. Keep Electron sandbox/context isolation and origin-checked narrow preload operations; module project data does not request native capabilities or installation. A future runtime loader needs its own design, permissions/update/compatibility work and release gate.

Registry/contract checks must reject invalid descriptors/defaults, duplicate IDs and unsupported versions. Shared module harnesses must cover copy isolation, sample rates, live/offline parity, continuous-clock updates, measured latency, bypass/tails/Stop, repeated construction/disposal and per-instance CPU/memory estimates. Migration and unavailable-module fixtures are required before saved module types ship. Run the contributor examples in the same checks so documentation cannot describe an untested interface.

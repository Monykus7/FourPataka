# Adding other feature modules

Status: reviewed source contributions are possible today. An optional panel/experiment/command registry is planned for M5 after the core module contracts; it is not an implemented feature loader. Read [architecture](ARCHITECTURE.md) and [CONTRIBUTING.md](../../CONTRIBUTING.md).

## Current extension points

The application already separates some pure definitions from UI. [themes.ts](../../src/core/themes.ts) holds palette definitions. [commands.ts](../../src/core/commands.ts) supplies command groups, syntax, rules, reference examples and blank autocomplete templates. [commandReference.ts](../../src/core/commandReference.ts) and [scoreTools.ts](../../src/core/scoreTools.ts) derive contextual snippets and edit parser-owned spans. [App.tsx](../../src/App.tsx) still owns view composition, experiment actions and much of the workflow/state coordination.

Add data-only definitions in their existing catalogs when appropriate, and validate the corresponding consumers. Do not add a command card and assume that its syntax now plays: [parser.ts](../../src/core/parser.ts) owns score semantics, offsets and diagnostics. Notation changes must update parsing, source mappings, reference/completion, editing and compiled playback together.

## Planned M5 contribution recipe

Provide one feature definition and an optional React adapter through a documented host-services boundary. Register once; discovery and view composition must not require adding a branch to the root application for each module. Extract domain workflow hooks incrementally rather than move a monolithic root file wholesale into a generic plugin engine.

Initial feature categories:

- Analysis panels consume declared source/processed taps and publish measurement units, reference gain, sample window and update cadence. The host owns analyser lifetime, input selection and audio scheduling. Silence/unsupported taps must be represented explicitly.
- Learning experiments request an undoable host action to load described settings/material. They do not mutate shared presets or reapply templates invisibly. Document which state changes, including source text where relevant.
- Command/reference contributions declare ID, syntax, rules, examples, blank completion fields, scope and insertion behavior. Metadata-only cards can describe existing semantics. New grammar needs an explicitly reviewed parser/compiler extension contract with deterministic precedence and span recovery; arbitrary parser replacement is not the initial API.
- Themes/appearance modules use semantic host tokens, contrast checks and scoped styles. They must support the available palettes, narrow layouts and reduced-motion preferences without changing musical history.
- Import/export format handlers are a later capability of this boundary. They need bounded validation and host-managed file dialogs; they cannot obtain generic filesystem or Electron access through a view module.

A module's saved musical settings belong in versioned project data. UI-only preferences remain separate; merely importing a project does not replace global preferences. Register declared settings only after compatibility/migration support exists. Unknown feature data must be preserved, even when its panel cannot be shown.

## Host services to expose

The exact API is an M5 deliverable. Required semantics include read-only snapshots/selectors; explicit undoable actions; source-span editing against the current valid revision; active/frozen playback revision awareness; owned instrument/chain operations; measurement tap subscriptions with cleanup; focus/dialog registration; and narrow file/menu requests implemented by the host.

Do not expose a general state setter, the root mutable project object or a second transport. An explicit action should describe its destination and copy scope, commit one meaningful history operation and preserve phase/clock/latency policies. UI selection, focus and measurement refresh are not musical edits.

View registration needs stable identity, placement/discovery order, accessible name, lifecycle cleanup and supported capabilities. Custom controls need exact values and keyboard alternatives; dragging/hover cannot be their only operation. The host controls primary/secondary navigation prominence and retains meaningful native menu focus behavior.

## Gate and documentation

M5 must migrate one existing analysis/learning view through the contract and supply a small independent feature example. Demonstrate add/register/remove with no new root-view switch, import-cycle boundary violations or residual listeners/timers. Removal must not damage the project or leave its audio resources active.

Verify undo/reload, source authority, independent copies, empty/invalid/playing-source guards, measurement references, fixed-clock playback, keyboard focus/dialog cleanup, narrow scrolling, theme contrast and native menu behavior where supported. If a command adds notation, include malformed-input, generated-event source-span and live/WAV equivalence proofs.

Publish a clean-checkout tutorial, public host-service reference, capability/placement rules, settings migration recipe and runnable example with its supported API version. New runtime code cannot be loaded from a project document; installation/loading remains outside this milestone.

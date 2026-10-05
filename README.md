# FourPataka

Personal Fourier instrument and composition studio. React, TypeScript, CodeMirror 6, and Web Audio, with an Electron desktop application. Projects stay local.

## Run locally

Requires Node.js 22.12+ (developed with Node 24).

```sh
npm ci
npm run dev
```

Open http://127.0.0.1:5173. Sound starts only after **Listen**, **Solo**, or **Play**. The initial monitor volume is 35%; monitor volume is separate from instrument trim and the saved project mix.

```sh
npm test                # Pitch, parser, independent presets, import validation, history
npm run test:browser    # Chromium audio proofs and studio workflows
npm run test:desktop    # Electron startup, audio, menus, and native project dialogs
npm run build          # TypeScript checks and production bundle
npm run preview        # Serve the production build
```

Browser tests use a locally installed Google Chrome. Change `channel` in `playwright.config.ts` to `msedge` to run against installed Edge. Screenshots and failure traces are generated in `.test-results/` and are not committed.

Browser test cleanup is confined to `.test-results/browser`; native profiles/traces use `.test-results/desktop`. Visual Studio is not required. Native checks launch Electron directly in the normal Windows process environment. If an agent's restricted process context fails Electron's install-folder sandbox ACL check, use the normal execution environment rather than repeating that crashing launch or opening a debugger; keep the application's renderer sandbox enabled.

## Windows application

The portable build is `release/FourPataka-0.18.1-win-x64.exe`. Open it directly; it bundles the studio, fonts, and assets and does not need a development server. It is currently an unsigned personal prototype with the default Electron icon. The portable wrapper uses ZIP compression for faster local build iterations. Build outputs are ignored by Git.

```sh
npm run desktop:dev       # Desktop window with Vite hot reload on port 5175
npm run build
npm run desktop:start     # Desktop window using the local production build
npm run desktop:package   # Build a portable Windows x64 executable in release/
```

The desktop app has native **Open project** and **Save project** dialogs. Its File, Edit, View, and Playback menus provide project controls, undo/redo, command reference, and the track maker. Shortcuts: Ctrl+O open, Ctrl+S save as, Ctrl+1 Instrument, Ctrl+2 Compose, Ctrl+K command reference, Ctrl+Shift+T track maker. The renderer is sandboxed and has no Node access.

Desktop autosave is independent of the browser's local save. To move an existing browser project, export JSON in the browser and open that file in the app. Both use the same versioned project format. The desktop session persists in Electron's user-data directory; the portable executable does not carry project data inside itself.

The desktop checks can also target the unpacked production executable by setting `FOURPATAKA_TEST_EXECUTABLE` to its absolute path before running `npm run test:desktop`.

## Compose tools

The enlarged score editor and command reference sit side by side. The editor fills the panel down to its status bar. Timeline and independent track sounds sit below; narrow screens stack score, reference, timeline and tracks in that order. Search and command insertion remain next to the editor on desktop.

Below the score, the Independent track sounds panel matches the timeline height on desktop. Its heading stays visible while master/track assignments, levels, bypass and copy controls scroll inside the panel. Stacked layouts bound this panel at 440 px. Tab through its controls or focus the Track sound controls region and use Space/Page Down to scroll.

Expanded command reference matches the score panel height, side by side on desktop and when stacked on narrow screens. Search stays fixed above its scrollable catalog. Scroll or Tab through all commands and expanded rules; Space scrolls the focused catalog. Search and category changes return results to the top.

Timeline event pickers show notes/rests, bar, beat and duration, even in a dense score. Previous/Next step through a track. Each track has one note Tab stop; Left/Right moves between its events and Home/End jumps to its endpoints. Selection inspects the displayed score revision without changing playback position.

In Instrument → Waveform → Dots, **Add dot** beside Dots/Draw splits the widest gap on the target curve. A visible keyboard guide above the graph shows Tab to focus a dot, Left/Right for position, Up/Down for amplitude and Delete to remove it. Exact Position/Amplitude inputs remain below the graph. Equipment menus support Up/Down and Home/End; Enter chooses a tool, then Enter on a free slot places a pedal. Keyboard cable selection starts at the board input jack; activate output/input jack pairs to connect the path. Escape cancels the board tool and returns to Equipment while playback continues. Instrument and Track Maker dialogs have named headings and return focus when closed.

**Tempo / Time signature** edit score directives, preserving comments and whitespace, in one undo step. Select a common meter or edit **Beats per bar** and **Beat unit** for a custom meter. **Instrument** selectors assign a fresh independent preset copy to a track while keeping its level and pedals. Timing and assignments require stopped score playback and valid text; the first track can be created in an empty score.

**Make a track** selects an instrument and assembles note, chord, and rest rows with pitch and duration controls. It shows phrase length in the project meter, supports event reordering with up/down buttons, and validates the score preview before creating the track in one undo step. Command-reference cards insert directly into the selected track; tempo and time cards update existing directives without duplicating them. Both tools require a valid score and stopped score playback.

**Command reference** shows eleven cards with their insertion destination and exact example. Select an instrument for `using` or a new track, and a pedal chain for `through` or `master`; examples follow these choices. Filter by category or search command names, syntax, rules and selected keys. Expand each card's **syntax and rules** by mouse or keyboard. `using` changes only the selected track's instrument assignment; `through` updates its header, while `master` updates the full mix. Empty scores allow globals and the first track; unavailable actions explain their requirements. Documentation remains readable during playback or diagnostics. Instrument completion after `using` and pedal completion after `through` offer the appropriate saved keys and respect the autocomplete switch. The native command-reference menu focuses search. Playback/preset/bypass controls are listed separately from score notation.

Instrument, Pedalboard, and Compose are the three primary views. Learn is a smaller secondary link. The interface keeps flat panels, concise headings, and a faint material texture inside panels, with five selectable themes.

## Local save recovery

Use **Recovery** in the header to inspect the previous autosave and any unreadable save. The panel shows each copy's name, UTF-8 byte count, validation result and score preview. Choose a valid copy and **Restore selected copy**; playback stops, independent instrument/A/B/pedal settings return together, and Undo restores the session you had open. Preferences and monitor volume stay separate. Escape or Close leaves the session unchanged and returns focus.

**Export selected copy** keeps the original contents, including a damaged save that cannot be restored. Browser export downloads JSON text; desktop export uses the native file dialog and supports raw copies up to 10 MB. File → Local save recovery (Ctrl+Shift+O) opens the same panel in the app. Canceling export changes no project data.

There is one previous distinct autosave and one unreadable-save slot. Reopening an unchanged project preserves the previous copy. The panel captures its copies when opened, so later autosaves do not change the item being inspected/exported. A damaged startup save loads a valid backup when available and shows a persistent review notice; otherwise a fresh example opens while damaged copies remain accessible. If archiving fails because storage is full, the still-stored damaged latest save remains directly inspectable/exportable without another write. Clearing browser/app storage removes these copies, so JSON files remain the portable backup.

## Compare sounds

In Instrument, the Comparison panel selects a note, Bb major chord, or a phrase from one score track. Phrase beat boundaries are numbered from 1: start 2 / end 4 means the two beats between those boundaries; an empty end uses the track end. Chords and rests remain intact, and notes crossing either boundary are clipped to that range.

**Compare / replay** and the transport replay button start the selected A/B sound from the beginning. Switching A/B keeps the running phrase position, note envelope, and oscillator phase. Different audition pedal chains warm up and crossfade through aligned paths. During score playback, select a **Live comparison track** and switch A/B to replace that track's running and future sounds. Changing the target restores the previous track's original sound. Saved track copies remain unchanged; Stop and the next Play clear the temporary comparison. Material selection is saved outside the independent A/B snapshots. Both copy directions are available and undoable.

Coefficient, polarity, trim, undertone, and solo changes respond during audition without restarting the musical clock or envelope. Harmonic waveform replacements use phase-aligned 20 ms crossfades; numeric audio proofs cover the edit boundary and rapid consecutive edits. Score playback freezes saved sound settings until the next Play, with an explicit temporary A/B override on the comparison track. Score text edits during a phrase audition take effect on replay.

The source graphs use the first sounding note in the selected material as a labeled reference. Selecting a partial links its bar, spectrum mark, dashed waveform contribution, inspector, and solo. Spectrum marks support Enter/Space as well as clicking. A zero or unavailable partial contributes a flat line.

## The first playable slice

- H1–H16 with exact values, signed triangle coefficients, source waveform/spectrum, and a linked partial inspector.
- Five optional undertones, disabled independently of their saved magnitudes; partial solo bypasses the full source mix.
- Explicit output trim, shared attack/release envelope, Nyquist exclusion, chord audition, 32-voice cap, and a fading Stop.
- Independent A/B instrument snapshots with shared note/chord/phrase replay. Copying either side is a deep copy.
- Baseline-based coefficient macros with neutral/reset behavior and preserved polarity.
- Named instrument library with Save, Save as new, Apply, and scoped Apply to all. Apply updates the source assignment and the track's copied sound in one undo step.
- CodeMirror score editor, diagnostics, toggleable autocomplete, searchable command insertion, visual track maker, parallel tracks, event timeline, and source playback highlights.
- Stable playback revisions. Score edits while playing show **Playing previous version** and suspend stale line highlights.
- Versioned local autosave with previous-save recovery, JSON import/export, grouped undo/redo, keyboard controls, and narrow-screen layouts.
- Four editable experiments and clearly labeled steady-source descriptors.

Library changes do not overwrite track instances. The editor works on the selected A/B sound; **Apply** explicitly copies that sound to the chosen destination. **Load copy into editor** brings an independent track sound back into the workbench.

Soft bass now uses a rounded source with quiet even and odd harmonics; Triangle retains its alternating odd-harmonic coefficients. Untouched factory Soft bass templates in old projects upgrade in the library. Existing tracks, A/B snapshots and customized presets keep their sounds. **Load Soft bass from the library**, then Apply when you want to update a track.

## Score notation

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

Durations are `whole`, `half`, `quarter`, `8th`, and `16th`. Pitches use scientific notation (C4 is middle C, A4 is 440 Hz), with octaves 0–8. `(Bb D F)5` uses octave 5 for all three notes; use `(Bb4 D5 F5)` for explicit voicing. One event per line. `//` starts a comment.

`time <numerator>/<denominator>` sets one meter for the whole project: 1–32 beats per bar, with a beat unit of 1, 2, 4, 8, or 16. Omitted meter defaults to 4/4 for existing projects. Common choices include 3/4, 5/4, 6/8, 7/8 and 12/8. Tempo always counts quarter notes; 6/8 has six eighth-note beats per bar (three quarter notes). Changing meter changes guides and bar/beat positions without changing note durations. Partial final bars and notes crossing bar lines are valid. The timeline and transport retain the running tempo and meter until Stop/replay when score text is edited. Long timelines thin their grid labels to keep rendering bounded.

`through <pedalKey>` copies a saved pedal chain to a track; `master through <pedalKey>` copies one to the full mix. Built-in keys are `clean`, `cleanGlue` and `warmDrive`. Compose selectors, Track Maker and command cards update these assignments in the source; autocomplete offers your saved keys after `through`. New chain presets expose a unique score key separately from their display name. Unknown keys and duplicate master directives block playback with diagnostics.

Changing an assignment loads a fresh independent copy. Later score edits and library saving retain its local knobs, bypass, placement and cables. Removing a previously assigned directive clears that chain. Older projects without directives keep their manually configured boards. Pedalboard application synchronizes assignments when the destination's preset changes and preserves the exact applied copy. JSON carries those edited copies; score text alone carries their template assignments. Running playback keeps its current routing and clock until replay.

## WAV export

Choose **Export WAV** in the toolbar, or **File → Export WAV** (Ctrl+Shift+E) in the desktop app. The panel captures a fixed project snapshot. Choose 48 or 44.1 kHz and stereo or mono; the file uses 16-bit PCM. Current sources are mono, so the stereo mix has matching channels. Render first, review the measured peak, then **Save WAV** to download or choose a native destination.

Export includes applied track sounds, track levels, cable-defined track/master pedals, bypass states and project mix gain. It excludes monitor volume and temporary A/B comparisons, keeps playback running independently, and does not change saved settings or undo history. Invalid scores and scores with no notes must be fixed first. JSON remains the editable project format.

Duration preserves score rests, the maximum release, measured graph latency and 100 ms filter settling, followed by an echo-tail budget: default 5 seconds, adjustable 0–30. A conservative decay estimate warns when later echoes may be cut; capped tails receive a 20 ms end fade, and measured audio at the cap is reported. This estimate is not a claim that every repeat is audible. Bypassed delays start with empty buffers in this fresh project render; live bypass can still retain previously captured echoes.

Clipping never triggers automatic gain compensation. Choose a lower export level (−36…0 dB) or explicitly enable normalization to −1 dBFS before saving an over-range render. Export level affects only the file. A conservative 256 MiB memory estimate includes audio, PCM/transfer copies and scheduled voices; shorten large scores or choose mono/44.1 kHz/a shorter tail when the preflight rejects them. Allocation failures are also reported. Musical output should agree across supported contexts, but browser engines need not create byte-identical WAVs. The shared 32-voice admission policy counts overlap at scheduled note time, including releases, and retires the oldest with a short fade.

## Current boundary

The instrument/comparison foundation and pedalboard are implemented: compressor, overdrive, three-band EQ, delay, independent audition/track/master chains, presets, bypass, live processed views and score chain assignments. Stage 3's automated functional behavior is covered; broader composition/polish and real-device gates remain. WAV export is implemented in v0.19.0; the full measurement panel follows next. Chord-symbol macros such as `chord:Cmaj13#11` and hover/focus note expansion are recorded for the later music IDE work.

The voice cap is a provisional conservative limit, not a mobile performance guarantee. Numeric audio proofs run in desktop Chromium; physical listening and real mobile/Safari/Firefox checks remain pending.

Local saves belong to the current browser/origin and can be removed by clearing browser data. JSON is the portable, editable project format. Preferences such as autocomplete and monitor volume are stored separately and are not replaced by import.

See [BUILD_PLAN.md](BUILD_PLAN.md) for the authoritative roadmap and [IMPLEMENTATION_STATUS.md](IMPLEMENTATION_STATUS.md) for verification and milestone checkpoints.

## Interactive Fourier workspace

In Instrument, use **Harmonics** or **Waveform** to choose the large editor. The other representation stays visible in a smaller preview. Use the **+ / −** button beneath each harmonic to flip its sign. The selected partial inspector also offers an explicit **Sign** selector and signed coefficient. Sign is independent of magnitude: a zero-strength harmonic stays silent and remembers its sign for later edits. Each sign change is separately undoable.

Choose **Dots** (default) or **Draw** in the waveform editor. Click in the left half to add a dot, drag an existing dot, or use its position/amplitude fields. Arrow keys adjust the focused dot and Delete removes it; the Remove dot button also works. Fixed zero endpoints plus up to 30 editable dots define a smooth, shape-preserving cubic curve. The curve passes through its anchors without overshooting their amplitudes. Draw mode retains freehand strokes. The right half is its odd reflection, matching the current signed sine-only synthesis model. A sampled Fourier sine projection recovers H1–H16; each coefficient is limited to ±1. The orange curve is the playable reconstruction and the coral dashed curve is the target, so sharp shapes may differ from their finite approximation. This editor shows one untrimmed harmonic cycle; undertones, trim, envelope, and Nyquist filtering remain separate.

Both editing tools update the current A/B sound and live audition. Each stroke or dot drag is one undo operation, even when moving slowly. **Reset waveform to sine** restores H1 = 1 and H2–H16 = 0, and resets polarity, while keeping trim, envelope, and undertones. The reset can be undone. Dot geometry travels with saved sounds and projects, A/B copies, and undo/redo. Harmonic or macro edits discard a stale dot layout and seed fresh anchors from the edited sound; level/envelope edits retain it. Save/apply and project autosave work as before. Drawing does not add arbitrary phase, cosine terms, or DC offset.



## Pedalboard

The dedicated **Pedalboard** tab has an explicit **Editing destination**: Audition A/B, a named track, or Master. Open **Equipment**, pick a pedal, then click an empty Velcro slot; you can also drag equipment from the menu onto a slot. Up to eight compact pedals fit on the four-column/two-row board. Drag a pedal's handle to reposition it, or focus the handle and use arrow keys. Placement snaps to an empty slot and creates one undo step. The grid scrolls within its own panel on narrow screens.

Choose **Patch cable**, then drag an output jack to an input jack, or click the two jacks in sequence. Keyboard Enter/Space also works. Occupied jacks are repatched, and loops are rejected. Select a visible cable and choose **Disconnect cable** to remove it. **Escape** cancels placement, movement or an unfinished cable. Audio follows the complete input-to-output cable path; loose pedals remain unprocessed, and an unplugged output is silent unless the entire board is bypassed. Existing chains load prewired in their original order.

Small rotary dials and bypass switches stay on each pedal. Select a pedal to use exact values and sliders in its inspector. Moving pedals changes their placement; repatching changes their processing order. Positions and cables travel with presets, independent A/B/track/master copies, project save/load and undo.

**Delay** offers time (20–2000 ms), feedback (0–95%), output trim and mix. It starts at 300 ms, 30% feedback and 35% mix. Pedal or whole-chain bypass stops feeding new echoes, passes new notes dry and lets stored echoes finish. The board and pedal show **Tail active** while measured echoes remain. **Stop** fades and clears all buffers; replay starts fresh. Audition edits are live; score settings wait for replay. Echo time remains deliberate musical timing and never pads other tracks. Long times and high feedback can keep playback active after the last note while echoes decay. Tempo sync remains planned.

**Equipment → Three-band EQ** selects a flat three-band equalizer: low/mid/high gains −12…+12 dB, adjustable mid frequency 150…4000 Hz, output trim and mix. **Reset to flat** restores all EQ defaults in one undo step while retaining its identity, position and bypass state. Low/high shelves are fixed at 200 Hz / 4 kHz and mid Q is 1. Frequencies are clamped below Nyquist at the current sample rate. EQ adds no scheduling latency; its filter phase is part of the tone change. Start with modest boosts and use output trim to leave headroom.

Compose's **Edit pedals** links open the selected track/master chain directly. **Listen to chain** auditions A/B; **Play score through chain** starts the score for a track/master destination. Live output graphs remain below the board. Desktop **View → Pedalboard** uses Ctrl+3; switching tabs keeps playback running.

**Load chain preset** creates an independent copy. **Save chain preset** updates its library template while applied instances retain their values. **Save chain as new** creates a named template. Apply the current chain to a track or master, or use **Apply chain to all associated** to update exactly the listed destinations. All musical edits and applications are undoable. A/B copies include the audition chain; switching sides keeps the clock running and crossfades a warmed, aligned graph when its topology differs. Score comparison changes the source sound through the selected track's existing chain.

Audition hears only its selected sound/chain. Score Play routes each track through its independent chain, then track level, master chain, mix gain, and monitor. Compose exposes whole-chain and per-pedal bypass switches for tracks/master. Pedal parameters are smoothed live during audition. Score parameters stay frozen until the next Play, while bypass remains live. Changes to the connected cable path or loaded routing are queued until Play/replay; the pending label identifies this. Moving pedals and changing loose pedals do not require replay. Explicit A/B switching during audition activates that side's complete chain at the current position. An eight-pedal latency budget keeps both audition paths aligned (typically about 48 ms before device latency).

Compressor uses the native Web Audio processor with a 30 dB knee, measured look-ahead alignment, makeup/output control, and a linear dry/wet blend. Its 1:1 setting uses an aligned identity path to avoid native startup attenuation. Overdrive uses `tanh(drive × input)`, a low-pass tone filter, output trim, and 4× oversampling. The dry/bypass branch uses matching resampling filters. Runtime impulse probes calibrate compressor and oversampling latency at the active sample rate; score tracks are padded to match the slowest chain. A short filter-tail budget follows note release. Stop fades the whole session and disconnects voices/effects before a fresh start. See the [Web Audio processing specification](https://www.w3.org/TR/webaudio-1.0/#dynamicscompressornode-processing).

**After pedals** displays the selected live path before its track level or mix gain, with a waveform and FFT spectrum. The original source graphs still describe the instrument. These views require active Listen/Play.

Personal build workflow: aim for eight focused commits per milestone, push each completed checkpoint using the configured identity, and launch the verified portable application after every completed x.x.0 release.

**Pedal dials** turn by dragging around the circle: clockwise increases the parameter; counterclockwise decreases it. Grabbing a dial keeps its current value. The dial follows a 270-degree sweep, stops at the parameter limits and stays linked to its slider and exact input. A whole mouse/touch drag is one undo step. Focus a dial and use arrow keys for one parameter step, Page Up/Down for ten, or Home/End for its limits.

## Themes

Choose **Theme** below Learn: Original, Blue / pink, Green / orange, Violet / coral, or Earth / sage. The three Happy Hues presets use [palette 12](https://www.happyhues.co/palettes/12), [palette 10](https://www.happyhues.co/palettes/10), and [palette 6](https://www.happyhues.co/palettes/6), adapted to studio surfaces and controls. Earth / sage includes the supplied `#9A7F62`, `#5F6E73`, `#697E60`, `#D6D2C4`, and `#B7A99A` colors. Secondary and tertiary accents appear in harmonics, waveform dots/targets, pedals, processed spectra, timeline events, and score syntax. Text uses adjusted shades where needed for contrast while accents and swatches retain the palette colors.

Themes are bundled for offline desktop use and saved as a local preference alongside monitor volume and autocomplete. Theme changes do not change projects, enter musical undo history, or restart playback. JSON project imports keep your theme preference.

## Project knowledge

[Project map](docs/knowledge/PROJECT_MAP.md) links code symbols, behavioral decisions and roadmap features. [Usage](docs/knowledge/USAGE.md) describes local semantic retrieval, personalized PageRank and fixed context token budgets. Run `npm run knowledge:build` and `npm run knowledge:check` after changes; update feature summaries and decisions alongside implementation. `npm run knowledge:watch` can refresh derived documentation during a working session.


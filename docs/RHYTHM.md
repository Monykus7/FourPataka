# Rhythm and articulation

Durations use quarter-note beats at the score tempo: `whole` = 4, `half` = 2, `quarter` = 1, `8th` = 1/2, `16th` = 1/4, `32nd` = 1/8, `64th` = 1/16. One trailing dot multiplies by 3/2, two by 7/4. Notes, explicit chords, chord symbols and rests accept these durations.

`triplet` multiplies one event by 2/3; `tuplet:N:M` multiplies it by M/N. N is 2–32 and M is 1–32. Mark every event belonging to a tuplet: three `8th triplet` events total one quarter beat. These are per-event modifiers, not automatic groups or nested tuplets. Dot scaling happens before tuplet scaling; positions accumulate as exact fractions.

```text
tempo 120
time 4/4
time 7/8 at 4
track lead using sine {
 C4 quarter staccato
 D4 quarter legato
 E4 half
 C4 8th triplet
 D4 8th triplet
 E4 8th triplet
 chord:Cmaj7 16th tuplet:5:4 legato
 G4 quarter.
 rest 8th
}
```

Optional articulation follows the duration and any tuplet modifier. `staccato` sounds half the written duration, with release capped at 30 ms or one-quarter event seconds (and never above the instrument's release). `legato` overlaps into the next sounding event by up to 30 ms or 10% event seconds. Every note keeps its attack. A rest, track end or comparison-phrase boundary ends the overlap. Normal notes retain existing gates and releases. Articulation never changes event spacing, meter or tempo, and cannot be attached to rests. Live playback, comparison and WAV export use the same gate calculation.

`time 7/8 at 4` changes the global meter at quarter-beat offset 4, starting bar 2 after one 4/4 bar. Positions are zero-based and must be boundaries in the preceding meter. After this change the next boundaries are 7.5, 11, 14.5, etc. All tracks share the map; continuous bar numbers are shown in the timeline and transport. Changes must be distinct, positive, finite, at most 1,000,000 beats, with at most 64 directives. The initial meter still defaults to 4/4; supported numerators are 1–32 over 1, 2, 4, 8 or 16. Tempo continues to count quarter notes.

Compose exposes signature and quarter-beat-position controls for adding a change. Edit or remove a change in source. Track Maker exposes dots, triplets, custom N:M tuplets and articulation per row, with a validated preview. These actions retain whole-operation undo. Source edits during playback apply on the next Play; the current session retains its original timing map. Command reference and autocomplete show the implemented forms, with empty N:M fields for writing custom values.

Ties, true slurs with shared envelopes, pitch glide, nested/group tuplets, additive beat grouping, per-track meters and runtime grammar extensions are future work. The existing reviewed chord-shape API remains available; this rhythm release does not complete the broader modularity program.

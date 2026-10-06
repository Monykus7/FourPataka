# Rhythm and articulation

Use square brackets to apply a rhythm or articulation to multiple events inside a track. Each event still occupies its own line; a bracket can appear beside an event. Nested blocks are supported up to 64 levels.

```text
tempo 120
time 4/4
time 7/8 at 4
track lead using sine {
  staccato[
    F5 quarter
    Gmaj7 eighth
  ]
  legato[
    triplet[
      C5 eighth
      D5 eighth
      E5 eighth
    ]
    F5 quarter
  ]
  tuplet:5:4[
    C5 16th
    D5 16th
    E5 16th
    F5 16th
    G5 16th
  ]
}
```

`staccato[...]` gives every sounding event a half-length gate, with release capped at min(instrument release, 30 ms, one-quarter event seconds). `legato[...]` overlaps consecutive sounding events in the same articulation scope by min(30 ms, 10% event seconds). Each note retains its attack. Rests stay silent and break legato; the final note before `]` does not overlap into the next event outside its scope. A nested articulation overrides the outer one until its own `]`, then the outer one resumes. Comparison phrase boundaries also stop overlap. Gate changes never alter written spacing or tempo.

`triplet[...]` scales each enclosed duration by 2/3. Three eighth notes therefore fill one quarter beat. `tuplet:N:M[...]` scales by M/N, with N 2–32 and M 1–32; five sixteenths in a 5:4 group fill one quarter beat. The scale applies to chords and rests too. Groups can mix written durations; no exact event-count requirement is imposed. Nested tuplet scales multiply, and positions accumulate as reduced fractions rather than rounded increments.

Durations use quarter-note beats: `whole` = 4, `half` = 2, `quarter` = 1, `8th` or `eighth` = 1/2, `16th` = 1/4, `32nd` = 1/8, `64th` = 1/16. One trailing dot multiplies by 3/2, two by 7/4, before tuplet scaling.

Chord symbols support `chord:Cmaj7@3` and bare named qualities such as `Gmaj7` or `Fm@3`; root octave defaults to 4. Numeric-only names remain scientific pitches: G7 is a note, and C9 is an invalid octave. Write `chord:G7` or `chord:C9` for numeric chord qualities. Explicit chords such as `chord:(G4 B4 D5)` remain available. Hover or place the caret on a symbol to see its notes.

Existing saved scores using event suffixes (`C4 quarter staccato`, `C4 eighth triplet`, etc.) remain supported. Explicit articulation suffixes override inheritance locally; per-event tuplet ratios multiply with enclosing groups. New autocomplete, reference examples and Track Maker output use bracketed forms. Adjacent rows with matching settings form groups; select legato on both connected rows.

`time 7/8 at 4` changes the global meter at zero-based quarter-beat offset 4, starting bar 2 after one 4/4 bar. Changes must be distinct positive bar boundaries in the preceding meter, at most 1,000,000 beats and 64 directives. After this change the next boundaries are 7.5, 11, 14.5, etc. Numerators are 1–32 over 1, 2, 4, 8 or 16. Tempo continues to count quarter notes, and all tracks share continuous bar numbering. Source edits during playback apply on the next Play.

Edit the built-in song in **EXAMPLE_SCORE in [src/core/project.ts](../src/core/project.ts)**. Existing autosaves are preserved: choose Compose → Load demo score to replace source in one undo step after building. The demo uses two aligned tracks, nested groups and 4/4→7/8→3/4→4/4 meter changes.

Ties, shared-envelope slurs, pitch glide, additive beat grouping, per-track meters and runtime grammar extensions remain future work. General modularity milestones and physical listening/device checks remain open.

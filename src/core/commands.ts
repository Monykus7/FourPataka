export type CommandGroup = 'Timing' | 'Routing' | 'Structure' | 'Events';
export interface CommandDefinition {
  name: string;
  group: CommandGroup;
  scope: 'project' | 'track' | 'new-track';
  description: string;
  snippet: string;
  // Blank snippet fields belong to editing; reference snippets remain filled examples.
  completionTemplate: string;
  syntax: string;
  rules: string;
}

// Metadata describes the parser's language; it never supplies playback semantics.
export const COMMANDS: readonly CommandDefinition[] = [
  {
    name: 'tempo',
    group: 'Timing',
    scope: 'project',
    description: 'Quarter-note beats per minute · 20–300',
    snippet: 'tempo 120',
    completionTemplate: 'tempo ${}',
    syntax: 'tempo <bpm>',
    rules:
      'One global directive outside tracks. Default: 120 BPM. Changing meter does not change the quarter-note tempo.',
  },
  {
    name: 'time',
    group: 'Timing',
    scope: 'project',
    description: 'Project meter · 1–32 over 1, 2, 4, 8, or 16',
    snippet: 'time 4/4',
    completionTemplate: 'time ${}',
    syntax: 'time <numerator>/<denominator>',
    rules:
      'One initial global directive outside tracks. Default: 4/4. Scheduled changes use time <meter> at <quarterBeatOffset>. A 6/8 bar spans three quarter notes. Partial bars and notes crossing bar lines are valid.',
  },
  {
    name: 'meter-change',
    group: 'Timing',
    scope: 'project',
    description: 'Change the global meter at a score position',
    snippet: 'time 7/8 at 4',
    completionTemplate: 'time ${} at ${}',
    syntax: 'time <meter> at <quarterBeatOffset>',
    rules:
      'Outside track blocks; applies to every track. Position is zero-based quarter-note beats and must be a distinct bar boundary in the preceding meter. Bar numbers continue; tempo, event lengths and notes crossing the change stay intact. Up to 64 changes; the reference inserts at the next available boundary.',
  },
  {
    name: 'master',
    group: 'Routing',
    scope: 'project',
    description: 'Independent pedal chain on the full mix',
    snippet: 'master through cleanGlue',
    completionTemplate: 'master through ${}',
    syntax: 'master through <pedalKey>',
    rules:
      'One global directive outside tracks. Copies a saved chain onto the master mix after all tracks. Saving the library template does not overwrite the applied copy.',
  },
  {
    name: 'through',
    group: 'Routing',
    scope: 'track',
    description: 'Saved chain copied into the selected track',
    snippet: 'through warmDrive',
    completionTemplate: 'through ${}',
    syntax: 'track <trackKey> using <instrumentKey> through <pedalKey> { … }',
    rules:
      'Part of the track header, before the opening brace; never an event line. Changes only this track. Unchanged assignments preserve local pedal settings and cables.',
  },
  {
    name: 'using',
    group: 'Routing',
    scope: 'track',
    description: 'Saved instrument copied into the selected track',
    snippet: 'using brightReed',
    completionTemplate: 'using ${}',
    syntax: 'track <trackKey> using <instrumentKey> [through <pedalKey>] { … }',
    rules:
      'Required in each track header. Select an instrument by its case-sensitive score key. Changing the key copies that preset; saving a library preset does not overwrite existing track copies.',
  },
  {
    name: 'track',
    group: 'Structure',
    scope: 'new-track',
    description: 'Independent sound; all tracks start together',
    snippet: 'track lead using brightReed {\n  C5 quarter\n}',
    completionTemplate: 'track ${} using ${} {\n\t${}\n}',
    syntax: 'track <trackKey> using <instrumentKey> [through <pedalKey>] {\n  <events>\n}',
    rules:
      'Unique track keys start with a letter and use letters, digits or _. Put braces on their own header/end lines and one event per line. Tracks start together; events within each track are sequential.',
  },
  {
    name: 'note',
    group: 'Events',
    scope: 'track',
    description: 'Scientific pitch notation · C0–B8',
    snippet: 'C5 quarter',
    completionTemplate: '${} ${}',
    syntax: '<A–G>[#|b]<octave> <duration>',
    rules:
      'Octave is required. C4 is middle C; A4 is 440 Hz. Accidentals must resolve within C0–B8. Durations: whole = 4, half = 2, quarter = 1, 8th = 0.5, 16th = 0.25, 32nd = 0.125, 64th = 0.0625 quarter-note beats. Dots and tuplets scale these durations.',
  },
  {
    name: 'chord',
    group: 'Events',
    scope: 'track',
    description: 'Simultaneous notes with a default octave',
    snippet: 'chord:(Bb D F)5 8th',
    completionTemplate: 'chord:(${})${} ${}',
    syntax: 'chord:(<notes>)<defaultOctave> <duration>',
    rules:
      'All notes start together, up to 32 notes. The trailing octave applies to notes without one: (Bb D F)5 means Bb5 D5 F5, not an automatic ascending voicing. Explicit note octaves override it.',
  },
  {
    name: 'chord-symbol',
    group: 'Events',
    scope: 'track',
    description: 'Registered chord shape in ascending root position',
    snippet: 'chord:Cmaj13#11@4 quarter',
    completionTemplate: 'chord:${}@${} ${}',
    syntax: 'chord:<root><shape>[@<octave>] <duration>',
    rules:
      'Root A–G with optional # or b. Default root octave: 4; @3 overrides it. Full ascending compound intervals, without omissions or inversions. Hover or move the cursor into the symbol to inspect notes. Shape aliases are case-sensitive; contributors can register bundled shapes. Unknown shapes and pitches outside C0–B8 are errors.',
  },
  {
    name: 'voicing',
    group: 'Events',
    scope: 'track',
    description: 'Explicit octaves override the default',
    snippet: 'chord:(Bb4 D5 F5) quarter',
    completionTemplate: 'chord:(${}) ${}',
    syntax: 'chord:(<notes with octaves>) <duration>',
    rules:
      'Each note supplies its own octave, so no trailing octave is needed. Mixed explicit/default octaves are also accepted.',
  },
  {
    name: 'triplet',
    group: 'Events',
    scope: 'track',
    description: 'Three written values in the time of two',
    snippet: 'triplet[\n  C4 8th\n  D4 8th\n  E4 8th\n]',
    completionTemplate: 'triplet[\n	${}\n]',
    syntax: 'triplet[\n  <events>\n]',
    rules:
      'Each duration is multiplied by 2/3. Three eighth triplets occupy one quarter beat. Applies to notes, chords and rests; all events inside triplet[ ... ] share the scale. Nested tuplet scales multiply. Legacy per-event modifiers still load.',
  },
  {
    name: 'tuplet',
    group: 'Events',
    scope: 'track',
    description: 'N values in the time of M',
    snippet: 'tuplet:5:4[\n  C4 16th\n  D4 16th\n  E4 16th\n  F4 16th\n  G4 16th\n]',
    completionTemplate: 'tuplet:${}:${}[\n	${}\n]',
    syntax: 'tuplet:<N>:<M>[\n  <events>\n]',
    rules:
      'N is 2–32; M is 1–32. Multiply the written duration by M/N. All events between [ and ] share the scale, including rests and mixed durations. Nested tuplet ratios multiply; group event count is not inferred or enforced. Timing accumulates as fractions before scheduling.',
  },
  {
    name: 'dotted',
    group: 'Events',
    scope: 'track',
    description: 'Extend a written duration',
    snippet: 'C4 quarter.',
    completionTemplate: '${} ${}.',
    syntax: '<event> <duration>[.|..] [tuplet] [optional legacy modifier]',
    rules:
      'One dot multiplies duration by 3/2; two dots by 7/4. Durations include whole, half, quarter, 8th, 16th, 32nd and 64th. Dot scaling precedes tuplet scaling.',
  },
  {
    name: 'staccato',
    group: 'Events',
    scope: 'track',
    description: 'Short gate without changing event spacing',
    snippet: 'staccato[\n  C4 quarter\n  D4 quarter\n]',
    completionTemplate: 'staccato[\n	${}\n]',
    syntax: 'staccato[\n  <events>\n]',
    rules:
      'Gate is half the event length. Release is capped at 30 ms or one quarter of the event length, whichever is shorter; the next event keeps its written onset. Every sounding event inside staccato[ ... ] inherits it. Rests remain silent; ] restores the outer scope. Applies equally to score, phrase comparison and WAV.',
  },
  {
    name: 'legato',
    group: 'Events',
    scope: 'track',
    description: 'Connect to the next sounding event',
    snippet: 'legato[\n  C4 quarter\n  D4 quarter\n]',
    completionTemplate: 'legato[\n	${}\n]',
    syntax: 'legato[\n  <events>\n]',
    rules:
      'Extends the gate into the next sounding event by up to 30 ms or 10% of this event length. Each note keeps its own attack. Only connects events in the same legato[ ... ] scope. No overlap into a rest, beyond ], or beyond a track/phrase ending. This is connected articulation; envelope-carrying slurs and portamento remain future work.',
  },
  {
    name: 'rest',
    group: 'Events',
    scope: 'track',
    description: 'Advance time without starting a note',
    snippet: 'rest half',
    completionTemplate: 'rest ${}',
    syntax: 'rest <duration>',
    rules:
      'Advances this track only. Releases and effect tails can continue. Durations stay in quarter-note units regardless of meter.',
  },
  {
    name: 'comment',
    group: 'Structure',
    scope: 'track',
    description: 'Ignored until the end of the line',
    snippet: '// Comment',
    completionTemplate: '// ${}',
    syntax: '// <text>',
    rules:
      'May appear alone or after a directive, header or event. Insertion adds a comment inside the selected track without advancing its musical time.',
  },
];

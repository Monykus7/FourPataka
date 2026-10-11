import { indentWithTab } from '@codemirror/commands';
import { useEffect, useRef } from 'react';
import { basicSetup } from 'codemirror';
import {
  Annotation,
  Compartment,
  EditorState,
  StateEffect,
  StateField,
  Prec,
} from '@codemirror/state';
import {
  Decoration,
  EditorView,
  keymap,
  hoverTooltip,
  showTooltip,
  type Tooltip,
  type DecorationSet,
} from '@codemirror/view';
import {
  autocompletion,
  snippetCompletion,
  nextSnippetField,
  prevSnippetField,
} from '@codemirror/autocomplete';
import {
  StreamLanguage,
  syntaxHighlighting,
  HighlightStyle,
  indentUnit,
} from '@codemirror/language';
import { setDiagnostics } from '@codemirror/lint';
import { tags } from '@lezer/highlight';
import { COMMANDS, type ScoreEvent, type Diagnostic } from '../core/parser';
import { CHORD_SHAPES } from '../modules/chords';
import { DURATIONS } from '../core/music';
import { COMMON_METERS } from '../core/meter';
import { sectionNamesAt } from '../core/scoreSections';

type SymbolPreview = NonNullable<ScoreEvent['chordSymbol']>;
const updateChords = StateEffect.define<SymbolPreview[]>();
const chordField = StateField.define<SymbolPreview[]>({
  create: () => [],
  update: (value, transaction) => {
    // Old source spans must never annotate a newly edited document.
    if (transaction.docChanged) value = [];
    for (const effect of transaction.effects) if (effect.is(updateChords)) value = effect.value;
    return value;
  },
});
const chordTooltip = (chord: SymbolPreview): Tooltip => ({
  pos: chord.from,
  end: chord.to,
  above: true,
  create: () => {
    const dom = document.createElement('div');
    dom.className = 'chord-expansion';
    dom.setAttribute('role', 'status');
    dom.textContent = `${chord.symbol} · ${chord.shapeLabel}: ${chord.notes.join(' · ')}`;
    dom.style.padding = '8px 12px';
    dom.style.maxWidth = 'min(480px, calc(100vw - 48px))';
    dom.style.whiteSpace = 'normal';
    return { dom };
  },
});
const cursorChord = (state: EditorState) =>
  state.field(chordField).find((chord) => {
    const selection = state.selection.main;
    return selection.from >= chord.from && selection.to <= chord.to;
  });
const chordPreviews = [
  chordField,
  showTooltip.compute(['selection', chordField], (state) => {
    const chord = cursorChord(state);
    return chord ? chordTooltip(chord) : null;
  }),
  hoverTooltip((view, position) => {
    const chord = view.state
      .field(chordField)
      .find((chord) => position >= chord.from && position <= chord.to);
    return chord && cursorChord(view.state) !== chord ? chordTooltip(chord) : null;
  }),
];

const activeLines = StateEffect.define<number[]>();
const playbackField = StateField.define<DecorationSet>({
  create: () => Decoration.none,
  update: (value, transaction) => {
    value = value.map(transaction.changes);
    for (const effect of transaction.effects)
      if (effect.is(activeLines)) {
        value = Decoration.set(
          effect.value
            .filter((n) => n >= 1 && n <= transaction.state.doc.lines)
            .sort((a, b) => a - b)
            .map((n) =>
              Decoration.line({ class: 'playing-line' }).range(transaction.state.doc.line(n).from),
            ),
          true,
        );
      }
    return value;
  },
  provide: (field) => EditorView.decorations.from(field),
});
const scoreLanguage = StreamLanguage.define({
  token(stream) {
    if (stream.eatSpace()) return null;
    if (stream.match('//')) {
      stream.skipToEnd();
      return 'comment';
    }
    if (
      stream.match(
        /\b(?:tempo|time|track|using|through|master|chord|rest|bar|till|end|of|repeat|section|play|trim|at|triplet|tuplet|staccato|legato)\b/,
      )
    )
      return 'keyword';
    if (stream.match(/\b(?:whole|half|quarter|eighth|8th|16th|32nd|64th)\b/)) return 'typeName';
    if (stream.match(/[A-G][#b]?[0-8]?\b/)) return 'atom';
    if (stream.match(/\d+(?:\.\d+)?/)) return 'number';
    if (stream.match(/[{}():\[\]]/)) return 'punctuation';
    stream.next();
    return null;
  },
});
const theme = EditorView.theme(
  {
    '&': { height: '100%', background: 'transparent', color: 'var(--text)', fontSize: '14px' },
    '.cm-scroller': { fontFamily: 'var(--font-mono)', lineHeight: '1.9', overflow: 'auto' },
    '.cm-content': { padding: '20px 0' },
    '.cm-gutters': {
      background: 'transparent',
      color: 'var(--text-muted)',
      border: 'none',
      paddingRight: '12px',
    },
    '.cm-activeLineGutter, .cm-activeLine': {
      background: 'color-mix(in srgb, var(--text) 3%, transparent)',
    },
    '.cm-cursor': { borderLeftColor: 'var(--accent)' },
    '&.cm-focused .cm-selectionBackground, .cm-selectionBackground': {
      background: 'color-mix(in srgb, var(--accent) 15%, transparent)',
    },
    '.cm-tooltip': {
      background: 'var(--surface-2)',
      color: 'var(--text)',
      border: '1px solid var(--border)',
    },
    '.cm-tooltip-autocomplete ul li[aria-selected]': {
      background: 'var(--accent)',
      color: 'var(--accent-text)',
    },
    '.playing-line': {
      background: 'color-mix(in srgb, var(--tertiary) 12%, transparent)',
      boxShadow: 'inset 3px 0 var(--accent)',
    },
  },
  { dark: true },
);
const colors = HighlightStyle.define([
  { tag: tags.keyword, color: 'var(--accent-ink)' },
  { tag: tags.typeName, color: 'var(--tertiary-ink)' },
  { tag: tags.atom, color: 'var(--secondary-ink)' },
  { tag: tags.number, color: 'var(--text)' },
  { tag: tags.comment, color: 'var(--text-muted)', fontStyle: 'italic' },
]);

export interface ScoreEditorPosition {
  anchor: number;
  head: number;
  scrollTop: number;
  scrollLeft: number;
}
const hostUpdate = Annotation.define<boolean>();
interface Props {
  value: string;
  onChange: (value: string) => void;
  diagnostics: Diagnostic[];
  chords: SymbolPreview[];
  autocomplete: boolean;
  presetKeys: string[];
  chainKeys: string[];
  lines: number[];
  onUndo: () => void;
  onRedo: () => void;
  initialPosition?: ScoreEditorPosition;
  navigation?: { id: number; from: number; to: number };
  onPosition?: (position: ScoreEditorPosition) => void;
}
export default function ScoreEditor({
  value,
  onChange,
  diagnostics,
  chords,
  autocomplete,
  presetKeys,
  chainKeys,
  lines,
  onUndo,
  onRedo,
  initialPosition,
  navigation,
  onPosition,
}: Props) {
  const container = useRef<HTMLDivElement>(null);
  const view = useRef<EditorView | null>(null);
  const callbacks = useRef({ onChange, onUndo, onRedo, onPosition });
  callbacks.current = { onChange, onUndo, onRedo, onPosition };
  const remember = (editor: EditorView) =>
    callbacks.current.onPosition?.({
      anchor: editor.state.selection.main.anchor,
      head: editor.state.selection.main.head,
      scrollTop: editor.scrollDOM.scrollTop,
      scrollLeft: editor.scrollDOM.scrollLeft,
    });
  const completion = useRef(new Compartment());
  const completionExtension = () =>
    autocompletion({
      activateOnTyping: autocomplete,
      override: autocomplete
        ? [
            (context) => {
              const line = context.state.doc.lineAt(context.pos);
              const section = /^\s*play\s+([A-Za-z0-9_]*)$/.exec(
                line.text.slice(0, context.pos - line.from),
              );
              if (section)
                return {
                  from: context.pos - section[1].length,
                  options: sectionNamesAt(context.state.doc.toString(), context.pos).map(
                    (label) => ({ label, type: 'variable', detail: 'Section in this track' }),
                  ),
                  validFor: /[A-Za-z0-9_]*/,
                };
              if (/^\s*play\s+\S+\s+trim\b/.test(line.text.slice(0, context.pos - line.from)))
                return null;
              const meter = /^\s*time\s+([\d/]*)$/.exec(
                line.text.slice(0, context.pos - line.from),
              );
              if (meter)
                return {
                  from: context.pos - meter[1].length,
                  options: COMMON_METERS.map((label) => ({
                    label,
                    type: 'constant',
                    detail: 'Project time signature',
                  })),
                  validFor: /[\d/]*/,
                };
              const chain = /\bthrough\s+([A-Za-z0-9_]*)$/.exec(
                line.text.slice(0, context.pos - line.from),
              );
              if (chain)
                return {
                  from: context.pos - chain[1].length,
                  options: chainKeys.map((label) => ({
                    label,
                    type: 'variable',
                    detail: 'Pedal chain preset',
                  })),
                  validFor: /[A-Za-z0-9_]*/,
                };
              const instrument = /\busing\s+([A-Za-z0-9_]*)$/.exec(
                line.text.slice(0, context.pos - line.from),
              );
              if (instrument)
                return {
                  from: context.pos - instrument[1].length,
                  options: presetKeys.map((label) => ({
                    label,
                    type: 'variable',
                    detail: 'Instrument preset',
                  })),
                  validFor: /[A-Za-z0-9_]*/,
                };
              const prefix = line.text.slice(0, context.pos - line.from);
              const modifier =
                /\s(?:whole|half|quarter|eighth|8th|16th|32nd|64th)\.{0,2}\s+(?:(triplet|tuplet:\d+:\d+)\s+)?([A-Za-z]*)$/.exec(
                  prefix,
                );
              // Group commands start a line; do not insert an opener after an event duration.
              if (modifier) return null;
              const symbol = /\bchord:\s*[A-G][#b]?([A-Za-z0-9#+-]*)$/.exec(
                line.text.slice(0, context.pos - line.from),
              );
              if (symbol)
                return {
                  from: context.pos - symbol[1].length,
                  options: CHORD_SHAPES.shapes.flatMap((shape) =>
                    shape.aliases
                      .filter(Boolean)
                      .map((label) => ({ label, type: 'constant', detail: shape.label })),
                  ),
                  validFor: /[A-Za-z0-9#+-]*/,
                };
              // Include an already typed colon in the replacement, rather than
              // inserting a second chord prefix after it.
              const chord = context.matchBefore(/\bchord:/);
              const word = chord ?? context.matchBefore(/[A-Za-z0-9_]+/);
              if (!word && !context.explicit) return null;
              const commands = COMMANDS.filter(
                (c) =>
                  (!chord ||
                    c.name === 'chord' ||
                    c.name === 'voicing' ||
                    c.name === 'chord-symbol') &&
                  (!['staccato', 'legato', 'triplet', 'tuplet'].includes(c.name) ||
                    /^\s*[A-Za-z]*$/.test(prefix)),
              ).map((c) =>
                snippetCompletion(c.completionTemplate, {
                  label: c.name,
                  detail: c.description,
                  info: `${c.syntax}\n${c.rules}\nFill blank fields; F2 / Shift+F2 moves between fields. Tab indents; Ctrl+M toggles Tab focus navigation.`,
                  type: 'keyword',
                }),
              );
              if (chord) return { from: chord.from, options: commands, filter: false };
              return {
                from: word?.from ?? context.pos,
                options: [
                  ...commands,
                  ...Object.keys(DURATIONS).map((label) => ({ label, type: 'type' })),
                  ...presetKeys.map((label) => ({
                    label,
                    type: 'variable',
                    detail: 'Instrument preset',
                  })),
                ],
              };
            },
          ]
        : [() => null],
    });
  useEffect(() => {
    view.current = new EditorView({
      parent: container.current!,
      state: EditorState.create({
        doc: value,
        selection: initialPosition
          ? {
              anchor: Math.min(initialPosition.anchor, value.length),
              head: Math.min(initialPosition.head, value.length),
            }
          : undefined,
        extensions: [
          EditorState.tabSize.of(2),
          indentUnit.of('  '),
          // Override snippet-field Tab navigation too: indentation always wins in the IDE.
          Prec.highest(
            keymap.of([
              indentWithTab,
              { key: 'F2', run: nextSnippetField },
              { key: 'Shift-F2', run: prevSnippetField },
            ]),
          ),
          keymap.of([
            {
              key: 'Mod-z',
              run: () => {
                callbacks.current.onUndo();
                return true;
              },
            },
            {
              key: 'Mod-Shift-z',
              run: () => {
                callbacks.current.onRedo();
                return true;
              },
            },
            {
              key: 'Mod-y',
              run: () => {
                callbacks.current.onRedo();
                return true;
              },
            },
          ]),
          basicSetup,
          scoreLanguage,
          syntaxHighlighting(colors),
          theme,
          playbackField,
          chordPreviews,
          completion.current.of(completionExtension()),
          EditorView.contentAttributes.of({ 'aria-label': 'Score editor', spellcheck: 'false' }),
          EditorView.updateListener.of((update) => {
            // A host projection/reload is not a new source gesture or history entry.
            if (update.docChanged && !update.transactions.some((t) => t.annotation(hostUpdate)))
              callbacks.current.onChange(update.state.doc.toString());
            if (update.selectionSet || update.docChanged) remember(update.view);
          }),
          EditorView.domEventHandlers({
            scroll: (_event, editor) => {
              remember(editor);
              return false;
            },
          }),
        ],
      }),
    });
    const editor = view.current;
    const frame = requestAnimationFrame(() => {
      if (initialPosition) {
        editor.scrollDOM.scrollTop = initialPosition.scrollTop;
        editor.scrollDOM.scrollLeft = initialPosition.scrollLeft;
      }
    });
    return () => {
      cancelAnimationFrame(frame);
      if (view.current) remember(view.current);
      view.current?.destroy();
      view.current = null;
    };
  }, []);
  useEffect(() => {
    if (!navigation || !view.current) return;
    const editor = view.current;
    editor.dispatch({
      selection: {
        anchor: Math.min(navigation.from, editor.state.doc.length),
        head: Math.min(navigation.to, editor.state.doc.length),
      },
      scrollIntoView: true,
    });
    editor.focus();
  }, [navigation?.id]);
  useEffect(() => {
    const editor = view.current;
    if (editor && editor.state.doc.toString() !== value)
      editor.dispatch({
        changes: { from: 0, to: editor.state.doc.length, insert: value },
        annotations: hostUpdate.of(true),
      });
  }, [value]);
  useEffect(() => {
    const editor = view.current;
    if (editor)
      editor.dispatch(
        setDiagnostics(
          editor.state,
          diagnostics.map((d) => ({
            from: Math.min(d.from, value.length),
            to: Math.min(d.to, value.length),
            severity: 'error',
            message: d.message,
          })),
        ),
      );
  }, [diagnostics, value]);
  useEffect(() => {
    view.current?.dispatch({ effects: updateChords.of(chords) });
  }, [chords, value]);
  useEffect(() => {
    view.current?.dispatch({ effects: completion.current.reconfigure(completionExtension()) });
  }, [autocomplete, presetKeys.join('|'), chainKeys.join('|')]);
  useEffect(() => {
    view.current?.dispatch({ effects: activeLines.of([...new Set(lines)]) });
  }, [lines.join(',')]);
  return <div className="score-editor" ref={container} />;
}

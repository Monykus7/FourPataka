import { useEffect, useRef } from 'react';
import { basicSetup } from 'codemirror';
import { Compartment, EditorState, StateEffect, StateField } from '@codemirror/state';
import { Decoration, EditorView, keymap, type DecorationSet } from '@codemirror/view';
import { autocompletion } from '@codemirror/autocomplete';
import { StreamLanguage, syntaxHighlighting, HighlightStyle } from '@codemirror/language';
import { setDiagnostics } from '@codemirror/lint';
import { tags } from '@lezer/highlight';
import { COMMANDS, type Diagnostic } from '../core/parser';

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
    if (stream.match(/\b(?:tempo|time|track|using|through|master|chord|rest)\b/)) return 'keyword';
    if (stream.match(/\b(?:whole|half|quarter|8th|16th)\b/)) return 'typeName';
    if (stream.match(/[A-G][#b]?[0-8]?\b/)) return 'atom';
    if (stream.match(/\d+(?:\.\d+)?/)) return 'number';
    if (stream.match(/[{}():]/)) return 'punctuation';
    stream.next();
    return null;
  },
});
const theme = EditorView.theme(
  {
    '&': { height: '100%', background: 'transparent', color: '#30283e', fontSize: '14px' },
    '.cm-scroller': { fontFamily: 'var(--font-mono)', lineHeight: '1.9', overflow: 'auto' },
    '.cm-content': { padding: '20px 0' },
    '.cm-gutters': {
      background: 'transparent',
      color: '#8a7889',
      border: 'none',
      paddingRight: '12px',
    },
    '.cm-activeLineGutter, .cm-activeLine': { background: '#8b6c9b09' },
    '.cm-cursor': { borderLeftColor: '#994626' },
    '&.cm-focused .cm-selectionBackground, .cm-selectionBackground': { background: '#ceb7de70' },
    '.cm-tooltip': { background: '#fff5e3', color: '#30283e', border: '1px solid #baa78c' },
    '.cm-tooltip-autocomplete ul li[aria-selected]': { background: '#e2c28b', color: '#30283e' },
    '.playing-line': { background: '#eac17333', boxShadow: 'inset 3px 0 #b86a34' },
  },
  { dark: false },
);
const colors = HighlightStyle.define([
  { tag: tags.keyword, color: '#9c4229' },
  { tag: tags.typeName, color: '#775091' },
  { tag: tags.atom, color: '#825729' },
  { tag: tags.number, color: '#476d54' },
  { tag: tags.comment, color: '#7d6e77', fontStyle: 'italic' },
]);

interface Props {
  value: string;
  onChange: (value: string) => void;
  diagnostics: Diagnostic[];
  autocomplete: boolean;
  presetKeys: string[];
  lines: number[];
  onUndo: () => void;
  onRedo: () => void;
}
export default function ScoreEditor({
  value,
  onChange,
  diagnostics,
  autocomplete,
  presetKeys,
  lines,
  onUndo,
  onRedo,
}: Props) {
  const container = useRef<HTMLDivElement>(null);
  const view = useRef<EditorView | null>(null);
  const callbacks = useRef({ onChange, onUndo, onRedo });
  callbacks.current = { onChange, onUndo, onRedo };
  const completion = useRef(new Compartment());
  const completionExtension = () =>
    autocompletion({
      activateOnTyping: autocomplete,
      override: autocomplete
        ? [
            (context) => {
              const word = context.matchBefore(/[A-Za-z0-9_]+/);
              if (!word && !context.explicit) return null;
              return {
                from: word?.from ?? context.pos,
                options: [
                  ...COMMANDS.map((c) => ({
                    label: c.name,
                    detail: c.description,
                    apply: c.snippet,
                    type: 'keyword',
                  })),
                  ...Object.keys({ whole: 1, half: 1, quarter: 1, '8th': 1, '16th': 1 }).map(
                    (label) => ({ label, type: 'type' }),
                  ),
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
        extensions: [
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
          completion.current.of(completionExtension()),
          EditorView.contentAttributes.of({ 'aria-label': 'Score editor', spellcheck: 'false' }),
          EditorView.updateListener.of((update) => {
            if (update.docChanged) callbacks.current.onChange(update.state.doc.toString());
          }),
        ],
      }),
    });
    return () => {
      view.current?.destroy();
      view.current = null;
    };
  }, []);
  useEffect(() => {
    const editor = view.current;
    if (editor && editor.state.doc.toString() !== value)
      editor.dispatch({ changes: { from: 0, to: editor.state.doc.length, insert: value } });
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
    view.current?.dispatch({ effects: completion.current.reconfigure(completionExtension()) });
  }, [autocomplete, presetKeys.join('|')]);
  useEffect(() => {
    view.current?.dispatch({ effects: activeLines.of([...new Set(lines)]) });
  }, [lines.join(',')]);
  return <div className="score-editor" ref={container} />;
}

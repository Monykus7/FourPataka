import { useEffect, useRef } from 'react';
import { basicSetup } from 'codemirror';
import { Compartment, EditorState, StateEffect, StateField } from '@codemirror/state';
import { Decoration, EditorView, keymap, type DecorationSet } from '@codemirror/view';
import { autocompletion } from '@codemirror/autocomplete';
import { StreamLanguage, syntaxHighlighting, HighlightStyle } from '@codemirror/language';
import { setDiagnostics } from '@codemirror/lint';
import { tags } from '@lezer/highlight';
import { COMMANDS, type Diagnostic } from '../core/parser';
import { COMMON_METERS } from '../core/meter';

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

interface Props {
  value: string;
  onChange: (value: string) => void;
  diagnostics: Diagnostic[];
  autocomplete: boolean;
  presetKeys: string[];
  chainKeys: string[];
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
  chainKeys,
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
              const line = context.state.doc.lineAt(context.pos);
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
              const word = context.matchBefore(/[A-Za-z0-9_]+/);
              if (!word && !context.explicit) return null;
              return {
                from: word?.from ?? context.pos,
                options: [
                  ...COMMANDS.map((c) => ({
                    label: c.name,
                    detail: c.description,
                    info: `${c.syntax}\n${c.rules}`,
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
  }, [autocomplete, presetKeys.join('|'), chainKeys.join('|')]);
  useEffect(() => {
    view.current?.dispatch({ effects: activeLines.of([...new Set(lines)]) });
  }, [lines.join(',')]);
  return <div className="score-editor" ref={container} />;
}

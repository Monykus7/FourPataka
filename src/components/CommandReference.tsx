import { useLayoutEffect, useRef, useState } from 'react';
import { ChevronDown, ChevronRight, Plus, Search } from 'lucide-react';
import { COMMANDS, type CommandDefinition, type CommandGroup } from '../core/commands';
import {
  insertionDestination,
  insertionReason,
  matchesCommand,
  referenceSnippet,
  type ReferenceContext,
} from '../core/commandReference';

interface Props {
  open: boolean;
  onOpen: (open: boolean) => void;
  context: ReferenceContext;
  tracks: string[];
  instruments: { key: string; label: string }[];
  chains: { key: string; label: string }[];
  onTrack: (key: string) => void;
  onInstrument: (key: string) => void;
  onChain: (key: string) => void;
  onInsert: (command: CommandDefinition) => void;
}

export default function CommandReference({
  open,
  onOpen,
  context,
  tracks,
  instruments,
  chains,
  onTrack,
  onInstrument,
  onChain,
  onInsert,
}: Props) {
  const [search, setSearch] = useState('');
  const [group, setGroup] = useState<CommandGroup | ''>('');
  const catalog = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    catalog.current?.scrollTo(0, 0);
  }, [search, group]);
  const cards = COMMANDS.filter(
    (command) =>
      (!group || command.group === group) &&
      matchesCommand(command, referenceSnippet(command, context), search),
  );
  return (
    <section className="panel commands-panel" aria-label="Command reference">
      <div className="commands-header">
        <button
          className="disclosure-button"
          onClick={() => onOpen(!open)}
          aria-expanded={open}
          aria-controls="command-reference-body"
        >
          {open ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
          <h3>Command reference</h3>
          <span className="tag">{COMMANDS.length} COMMANDS</span>
        </button>
        <label className="search-box">
          <Search size={14} />
          <input
            aria-label="Search commands"
            placeholder="Find syntax, keys, rules…"
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              onOpen(true);
            }}
          />
        </label>
      </div>
      {open && (
        <div
          id="command-reference-body"
          className="command-reference-scroll"
          ref={catalog}
          role="region"
          aria-label="Command catalog"
          tabIndex={0}
          onKeyDown={(event) => {
            // Space scrolls this focused catalog; it must not invoke global Play.
            if (event.key === ' ') event.stopPropagation();
          }}
        >
          <div className="command-destination">
            <label>
              Track
              <select
                aria-label="Command insertion track"
                value={context.targetKey}
                onChange={(event) => onTrack(event.target.value)}
                disabled={!tracks.length}
              >
                {!tracks.length && <option value="">Create a track first</option>}
                {tracks.map((key) => (
                  <option key={key} value={key}>
                    {key}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Instrument
              <select
                aria-label="Command instrument"
                value={context.instrumentKey}
                onChange={(event) => onInstrument(event.target.value)}
                disabled={!instruments.length}
              >
                {!instruments.length && <option value="">No saved instruments</option>}
                {instruments.map((preset) => (
                  <option key={preset.key} value={preset.key}>
                    {preset.label} · {preset.key}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Pedal chain
              <select
                aria-label="Command pedal chain"
                value={context.chainKey}
                onChange={(event) => onChain(event.target.value)}
                disabled={!chains.length}
              >
                {!chains.length && <option value="">No saved chains</option>}
                {chains.map((preset) => (
                  <option key={preset.key} value={preset.key}>
                    {preset.label} · {preset.key}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Show
              <select
                aria-label="Command category"
                value={group}
                onChange={(event) => setGroup(event.target.value as CommandGroup | '')}
              >
                <option value="">All commands</option>
                {(['Timing', 'Routing', 'Structure', 'Events'] as const).map((value) => (
                  <option key={value}>{value}</option>
                ))}
              </select>
            </label>
            <span>
              {context.playing
                ? 'Stop score playback to insert commands.'
                : context.invalid
                  ? 'Fix score diagnostics before inserting commands.'
                  : 'Cards show the destination and the exact snippet to insert.'}
            </span>
          </div>
          <p className="command-count" role="status">
            {cards.length} of {COMMANDS.length} commands
          </p>
          <div className="command-grid">
            {cards.map((command) => {
              const snippet = referenceSnippet(command, context);
              const reason = insertionReason(command, context);
              return (
                <article className="command-card" key={command.name}>
                  <button
                    className="command-item"
                    aria-label={`Insert ${command.name} command`}
                    disabled={!!reason}
                    aria-describedby={`command-help-${command.name}`}
                    onClick={() => onInsert(command)}
                  >
                    <span className="command-scope">{insertionDestination(command, context)}</span>
                    <div>
                      <code>{snippet}</code>
                      <Plus size={13} />
                    </div>
                    <p>{command.description}</p>
                  </button>
                  <div id={`command-help-${command.name}`} className="command-help">
                    {reason && <p className="command-unavailable">{reason}</p>}
                    <details>
                      <summary>{command.name} syntax and rules</summary>
                      <code>{command.syntax}</code>
                      <p>{command.rules}</p>
                    </details>
                  </div>
                </article>
              );
            })}
          </div>
          {!cards.length && (
            <p className="command-empty">No matching commands. Try another search or category.</p>
          )}
          <div className="commands-footer">
            Durations: whole = 4 · half = 2 · quarter = 1 · 8th = ½ · 16th = ¼ quarter-note beats.
            Global directives belong outside tracks; using/through belong in track headers.
            <details className="command-controls">
              <summary>Controls (not score commands)</summary>
              <p>
                Play score starts the score; Listen auditions the instrument. Stop all sound clears
                voices and effect tails.
              </p>
              <p>
                Save preset updates a library template. Apply copies settings to a destination;
                Apply to all updates associated copies in one undo step.
              </p>
              <p>
                Pedal and board bypass are controls on their independent chains. Save project /
                Export JSON preserve the editable project; monitor volume changes listening level
                only.
              </p>
            </details>
          </div>
        </div>
      )}
    </section>
  );
}

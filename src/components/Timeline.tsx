import { measurePositionAt, meterLabel } from '../core/meter';
import type { CompiledScore, ScoreEvent } from '../core/parser';
import { timelineGrid } from '../core/timeline';

export default function Timeline({
  score,
  beat,
  playing,
  activeEvents,
  selectedEvent,
  onSelect,
}: {
  score: CompiledScore;
  beat: number;
  playing: boolean;
  activeEvents: ScoreEvent[];
  selectedEvent: ScoreEvent | null;
  onSelect: (event: ScoreEvent) => void;
}) {
  const grid = timelineGrid(score.beats, score.meter, score.meterChanges);
  const percent = (value: number) => `${(value / grid.extent) * 100}%`;
  const inspected = score.events.find((event) => event.id === selectedEvent?.id);
  const timing = (event: ScoreEvent) => {
    const position = measurePositionAt(event.beat, score.meter, score.meterChanges);
    return `Bar ${position.bar} · beat ${position.beat} · ${event.duration.toLocaleString(undefined, { maximumFractionDigits: 6 })} quarter beats${event.tuplet ? ` · ${event.tuplet.notes}:${event.tuplet.inTimeOf}` : ''}${event.articulation ? ` · ${event.articulation}` : ''}${event.sectionCalls?.length ? ` · section ${event.sectionCalls.map((call) => call.name + (event.sectionEndingOf?.includes(call.id) ? ' ending' : '')).join(' → ')}` : ''}`;
  };
  return (
    <section className="panel timeline-panel" aria-label="Timeline">
      <div className="panel-header">
        <h2>Timeline</h2>
        <span className="tag">
          {meterLabel(measurePositionAt(beat, score.meter, score.meterChanges).meter)}
        </span>
      </div>
      <div className="timeline">
        <div className="timeline-ruler">
          {grid.bars.map(({ bar, beat, meter }) => (
            <span key={bar} style={{ left: percent(beat) }}>
              BAR {bar}
              {meter ? ` · ${meterLabel(meter)}` : ''}
            </span>
          ))}
        </div>
        {score.tracks.map((track) => {
          const index = track.events.findIndex((event) => event.id === selectedEvent?.id);
          return (
            <div className="timeline-track" key={track.key}>
              <div className="timeline-track-name">
                {track.key}
                <span>{track.instrumentKey}</span>
              </div>
              <div className="timeline-navigation">
                <button
                  className="text-button"
                  aria-label={`Previous ${track.key} event`}
                  disabled={index <= 0}
                  onClick={() => onSelect(track.events[index - 1])}
                >
                  ←
                </button>
                <select
                  aria-label={`Inspect ${track.key} event`}
                  value={index < 0 ? '' : track.events[index].id}
                  disabled={!track.events.length}
                  onChange={(e) => {
                    const event = track.events.find((event) => event.id === e.target.value);
                    if (event) onSelect(event);
                  }}
                >
                  <option value="" disabled>
                    Choose event · {track.events.length} total
                  </option>
                  {track.events.map((event, i) => (
                    <option key={event.id} value={event.id}>
                      {i + 1}. {event.notes.join(' ') || 'rest'} · {timing(event)}
                    </option>
                  ))}
                </select>
                <button
                  className="text-button"
                  aria-label={`Next ${track.key} event`}
                  disabled={!track.events.length || index === track.events.length - 1}
                  onClick={() => onSelect(track.events[index + 1])}
                >
                  →
                </button>
              </div>
              <div
                className="timeline-lane"
                role="group"
                aria-label={`${track.key} timeline events`}
                aria-describedby="timeline-help"
              >
                {grid.pulses.map((pulse) => (
                  <span className="beat-line" key={pulse} style={{ left: percent(pulse) }} />
                ))}
                {grid.bars.map(({ bar, beat }) => (
                  <span
                    className="beat-line bar-line"
                    key={`bar:${bar}`}
                    data-bar={bar}
                    style={{ left: percent(beat) }}
                  />
                ))}
                {track.events.map((event, i) => {
                  return (
                    <button
                      key={event.id}
                      tabIndex={i === Math.max(0, index) ? 0 : -1}
                      aria-pressed={event.id === selectedEvent?.id}
                      aria-label={`${event.track} ${event.notes.join(' ') || 'rest'}, beat ${event.beat + 1}`}
                      aria-description={`Event ${i + 1} of ${track.events.length}. ${timing(event)}`}
                      title={timing(event)}
                      className={`timeline-event ${event.notes.length ? '' : 'rest-event'} ${activeEvents.some((a) => a.id === event.id) ? 'playing' : ''} ${selectedEvent?.id === event.id ? 'selected' : ''}`}
                      style={{
                        left: percent(event.beat),
                        width: `max(1px, calc(${percent(event.duration)} - 3px))`,
                      }}
                      onFocus={() => onSelect(event)}
                      onKeyDown={(e) => {
                        const next =
                          e.key === 'Home'
                            ? 0
                            : e.key === 'End'
                              ? track.events.length - 1
                              : e.key === 'ArrowLeft'
                                ? Math.max(0, i - 1)
                                : e.key === 'ArrowRight'
                                  ? Math.min(track.events.length - 1, i + 1)
                                  : null;
                        if (next === null) return;
                        e.preventDefault();
                        // One Tab stop per track keeps long scores traversable;
                        // focus selects the event without seeking or changing playback.
                        e.currentTarget.parentElement
                          ?.querySelectorAll<HTMLButtonElement>('.timeline-event')
                          [next]?.focus();
                      }}
                      onClick={() => onSelect(event)}
                    >
                      {event.notes.join(' · ') || 'rest'}
                    </button>
                  );
                })}
                {playing && (
                  <span
                    className="playhead"
                    style={{ left: percent(Math.min(grid.extent, beat)) }}
                  />
                )}
              </div>
            </div>
          );
        })}
      </div>
      <p
        className="timeline-selection"
        role="status"
        aria-label="Selected timeline event"
        aria-atomic="true"
      >
        {inspected
          ? `${inspected.track} · ${inspected.notes.join(' ') || 'rest'} · ${timing(inspected)}`
          : 'No event selected'}
      </p>
      <p className="footnote" id="timeline-help">
        Choose an event for pitch and timing. On a focused note: ←/→ steps, Home/End jumps. Bar
        lines are guides; notes may cross them.
      </p>
    </section>
  );
}

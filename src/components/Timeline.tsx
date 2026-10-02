import { measurePosition, meterLabel } from '../core/meter';
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
  const grid = timelineGrid(score.beats, score.meter);
  const percent = (value: number) => `${(value / grid.extent) * 100}%`;
  return (
    <section className="panel timeline-panel">
      <div className="panel-header">
        <h2>Timeline</h2>
        <span className="tag">{meterLabel(score.meter)}</span>
      </div>
      <div className="timeline">
        <div className="timeline-ruler">
          {grid.bars.map(({ bar, beat }) => (
            <span key={bar} style={{ left: percent(beat) }}>
              BAR {bar}
            </span>
          ))}
        </div>
        {score.tracks.map((track) => (
          <div className="timeline-track" key={track.key}>
            <div className="timeline-track-name">
              {track.key}
              <span>{track.instrumentKey}</span>
            </div>
            <div className="timeline-lane">
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
              {track.events.map((event) => {
                const position = measurePosition(event.beat, score.meter);
                return (
                  <button
                    key={event.id}
                    aria-label={`${event.track} ${event.notes.join(' ') || 'rest'}, beat ${event.beat + 1}`}
                    title={`Bar ${position.bar} · beat ${position.beat} · ${event.duration} quarter beats`}
                    className={`timeline-event ${event.notes.length ? '' : 'rest-event'} ${activeEvents.some((a) => a.id === event.id) ? 'playing' : ''} ${selectedEvent?.id === event.id ? 'selected' : ''}`}
                    style={{
                      left: percent(event.beat),
                      width: `calc(${percent(event.duration)} - 3px)`,
                    }}
                    onClick={() => onSelect(event)}
                  >
                    {event.notes.join(' · ') || 'rest'}
                  </button>
                );
              })}
              {playing && (
                <span className="playhead" style={{ left: percent(Math.min(grid.extent, beat)) }} />
              )}
            </div>
          </div>
        ))}
      </div>
      <p className="footnote">
        Select an event to inspect its pitch and timing. Bar lines are guides; notes may cross them.
      </p>
    </section>
  );
}

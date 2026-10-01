import { ArrowLeftRight, RotateCcw } from 'lucide-react';
import type { ComparisonMaterial, AuditionPhrase } from '../core/comparison';
import type { CompiledScore } from '../core/parser';

export default function ComparisonPanel({
  material,
  score,
  phrase,
  error,
  active,
  elapsed,
  playingScore,
  scoreTrack,
  onScoreTrack,
  onChange,
  onCopy,
  onReplay,
}: {
  material: ComparisonMaterial;
  score: CompiledScore;
  phrase: AuditionPhrase | null;
  error: string | null;
  active: 'A' | 'B';
  elapsed: number;
  playingScore: boolean;
  scoreTrack: string;
  onScoreTrack: (key: string) => void;
  onChange: (next: ComparisonMaterial) => void;
  onCopy: (from: 'A' | 'B', to: 'A' | 'B') => void;
  onReplay: () => void;
}) {
  return (
    <section className="panel comparison-panel" aria-label="A/B phrase comparison">
      <div className="section-title">
        <h3>Comparison</h3>
        <span className="tag">SNAPSHOT {active}</span>
      </div>
      {playingScore && (
        <label className="score-comparison-target">
          Live comparison track
          <select
            aria-label="Live comparison track"
            value={scoreTrack}
            onChange={(e) => onScoreTrack(e.target.value)}
          >
            {score.tracks.map((track) => (
              <option key={track.key} value={track.key}>
                {track.key}
              </option>
            ))}
          </select>
          <span>Switch A/B to hear this track with the selected waveform.</span>
        </label>
      )}
      <div className="comparison-controls">
        <label>
          Material
          <select
            aria-label="Comparison material"
            value={material.kind}
            onChange={(e) =>
              onChange({ ...material, kind: e.target.value as ComparisonMaterial['kind'] })
            }
          >
            <option value="note">Note</option>
            <option value="chord">Bb major chord</option>
            <option value="phrase">Score phrase</option>
          </select>
        </label>
        {material.kind === 'note' && (
          <label>
            Pitch
            <select
              aria-label="Comparison note"
              value={material.note}
              onChange={(e) => onChange({ ...material, note: e.target.value })}
            >
              {Array.from(
                new Set(['C2', 'C3', 'C4', 'A4', 'C5', 'C6', 'C7', 'C8', material.note]),
              ).map((n) => (
                <option key={n}>{n}</option>
              ))}
            </select>
          </label>
        )}
        {material.kind === 'phrase' && (
          <>
            <label>
              Track
              <select
                aria-label="Comparison phrase track"
                value={material.trackKey}
                onChange={(e) =>
                  onChange({ ...material, trackKey: e.target.value, fromBeat: 0, toBeat: null })
                }
              >
                {!score.tracks.some((t) => t.key === material.trackKey) && (
                  <option value={material.trackKey}>{material.trackKey} (unavailable)</option>
                )}
                {score.tracks.map((t) => (
                  <option key={t.key} value={t.key}>
                    {t.key}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Start beat
              <input
                aria-label="Comparison phrase start beat"
                type="number"
                min="1"
                max="1000001"
                step="0.25"
                value={material.fromBeat + 1}
                onChange={(e) => {
                  const beat = Number(e.target.value) - 1;
                  if (
                    e.target.value &&
                    Number.isFinite(beat) &&
                    beat >= 0 &&
                    beat <= 1_000_000 &&
                    beat < (material.toBeat ?? Infinity)
                  )
                    onChange({ ...material, fromBeat: beat });
                }}
              />
            </label>
            <label>
              End boundary
              <input
                aria-label="Comparison phrase end boundary"
                type="number"
                min={material.fromBeat + 1.25}
                max="1000001"
                step="0.25"
                placeholder="Track end"
                value={material.toBeat === null ? '' : material.toBeat + 1}
                onChange={(e) => {
                  const beat = e.target.value === '' ? null : Number(e.target.value) - 1;
                  if (
                    beat === null ||
                    (Number.isFinite(beat) && beat <= 1_000_000 && beat > material.fromBeat)
                  )
                    onChange({ ...material, toBeat: beat });
                }}
              />
            </label>
          </>
        )}
        <button className="secondary-button" onClick={onReplay} disabled={!!error}>
          <RotateCcw size={13} />
          Compare / replay
        </button>
      </div>
      <div className="comparison-summary">
        <span>
          {error ??
            (material.kind === 'phrase'
              ? `${material.trackKey} · ${phrase?.beats} beats · ${phrase?.tempo} BPM · ${phrase?.events.filter((e) => e.notes.length).length} events`
              : material.kind === 'chord'
                ? 'Bb4 · D5 · F5'
                : material.note)}
        </span>
        <div>
          <button className="text-button" onClick={() => onCopy('A', 'B')}>
            <ArrowLeftRight size={12} />
            Copy A to B
          </button>
          <button className="text-button" onClick={() => onCopy('B', 'A')}>
            <ArrowLeftRight size={12} />
            Copy B to A
          </button>
        </div>
      </div>
      <progress
        aria-label="Comparison phrase progress"
        max={phrase ? (phrase.beats * 60) / phrase.tempo : 1}
        value={phrase ? Math.min(elapsed, (phrase.beats * 60) / phrase.tempo) : 0}
      />
      <p className="footnote">
        A/B switches sound at the current position. During score playback it changes only the
        selected comparison track; saved track sounds stay unchanged. Replay starts from the
        beginning. Beat boundaries are numbered from 1; an empty end uses the track end.
      </p>
    </section>
  );
}

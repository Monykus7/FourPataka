import { useEffect, useRef, useState } from 'react';
import { matchedGains, renderWavReconstruction } from '../audio/wavReview';
import { WAV_IMPORT_LIMITS, type WavChannel } from '../core/wavImport';
import type { WavAnalysisOptions } from '../core/wavNote';
import type { WavReview, WavReviewRequest, WavWorkerMessage } from '../core/wavReview';
import type { InstrumentFolder } from '../core/project';
import type { FourierSound } from '../modules/foundation/fourier';
import { WavFitPlots, WavWaveforms } from './WavReviewPlots';
import './WavImportDialog.css';

const emptyFields = {
  cropStart: '',
  cropEnd: '',
  bodyStart: '',
  bodyEnd: '',
  onset: '',
  noteOff: '',
  frequency: '',
};
type Field = keyof typeof emptyFields;
const seconds = (value: number) => value.toFixed(3);
const maybeNumber = (value: string) => (value === '' ? undefined : Number(value));

function noteName(frequency: number) {
  const midi = Math.round(69 + 12 * Math.log2(frequency / 440));
  return `${['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'][midi % 12]}${Math.floor(midi / 12) - 1}`;
}

function DraftNumber({
  label,
  value,
  min,
  max,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (value: number) => void;
}) {
  return (
    <label>
      {label}
      <input
        type="number"
        min={min}
        max={max}
        step="any"
        defaultValue={Number(value.toFixed(5))}
        onChange={(e) => {
          const next = e.currentTarget.valueAsNumber;
          if (Number.isFinite(next) && next >= min && next <= max) onChange(next);
        }}
        onBlur={(e) => {
          if (!e.currentTarget.validity.valid || !e.currentTarget.value)
            e.currentTarget.value = String(Number(value.toFixed(5)));
        }}
      />
    </label>
  );
}

export default function WavImportDialog({
  folders,
  keys,
  monitor,
  onCreate,
  onClose,
}: {
  folders: InstrumentFolder[];
  keys: string[];
  monitor: number;
  onCreate: (label: string, key: string, sound: FourierSound, folderId?: string) => void;
  onClose: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const worker = useRef<Worker | null>(null);
  const audio = useRef<AudioContext | null>(null);
  const source = useRef<AudioBufferSourceNode | null>(null);
  const previewRequest = useRef(0);
  const [file, setFile] = useState<File>();
  const [fields, setFields] = useState(emptyFields);
  const [channel, setChannel] = useState<WavChannel>('mix');
  const [review, setReview] = useState<WavReview>();
  const [sound, setSound] = useState<FourierSound>();
  const [revision, setRevision] = useState(0);
  const [dirty, setDirty] = useState(false);
  const [progress, setProgress] = useState('');
  const [error, setError] = useState('');
  const [audioError, setAudioError] = useState('');
  const [preview, setPreview] = useState('');
  const [preparing, setPreparing] = useState(false);
  const [match, setMatch] = useState(true);
  const [label, setLabel] = useState('');
  const [key, setKey] = useState('');
  const [folder, setFolder] = useState('');
  const [createError, setCreateError] = useState('');

  useEffect(() => {
    const element = dialog.current!;
    element.showModal();
    return () => {
      worker.current?.terminate();
      worker.current = null;
      previewRequest.current++;
      source.current?.stop();
      source.current?.disconnect();
      source.current = null;
      if (audio.current) void audio.current.close().catch(() => {});
      audio.current = null;
      element.close();
    };
  }, []);

  const stopPreview = () => {
    previewRequest.current++;
    source.current?.stop();
    source.current?.disconnect();
    source.current = null;
    setPreview('');
  };
  const cancelAnalysis = () => {
    worker.current?.terminate();
    worker.current = null;
    setProgress('');
    setDirty(true);
  };
  const analyze = (input: File, options: WavAnalysisOptions) => {
    cancelAnalysis();
    stopPreview();
    setSound(undefined);
    setError('');
    setAudioError('');
    if (input.size > WAV_IMPORT_LIMITS.bytes) {
      setError('Choose a WAV file up to 32 MiB.');
      return;
    }
    try {
      const task = new Worker(new URL('../workers/wavReview.worker.ts', import.meta.url), {
        type: 'module',
      });
      worker.current = task;
      const finish = () => {
        task.terminate();
        worker.current = null;
        setProgress('');
      };
      task.onmessage = ({ data }: MessageEvent<WavWorkerMessage>) => {
        if (worker.current !== task) return;
        if (data.stage === 'progress') {
          setProgress(data.text);
          return;
        }
        finish();
        if (data.stage === 'error') {
          setError(data.text);
          return;
        }
        setReview(data.review);
        setSound(data.review.fit?.sound);
        setError(data.review.error ?? '');
        setDirty(false);
        setRevision((value) => value + 1);
      };
      task.onerror = () => {
        if (worker.current !== task) return;
        finish();
        setError('The WAV analysis worker could not start or finish.');
      };
      setProgress('Starting analysis…');
      task.postMessage({ file: input, options } satisfies WavReviewRequest);
    } catch (failure) {
      cancelAnalysis();
      setError((failure as Error).message);
    }
  };
  const openFile = (input: File) => {
    setFile(input);
    setReview(undefined);
    setFields(emptyFields);
    setChannel('mix');
    setCreateError('');
    const name =
      input.name
        .replace(/\.wav$/i, '')
        .trim()
        .slice(0, 100) || 'Imported WAV';
    const slug = name.replace(/[^A-Za-z0-9_]+/g, '_').replace(/^_+|_+$/g, '');
    const base = (/^[A-Za-z]/.test(slug) ? slug : `wav_${slug}`).slice(0, 94);
    let next = base,
      suffix = 2;
    while (keys.includes(next)) next = `${base}_${suffix++}`;
    setLabel(name);
    setKey(next);
    analyze(input, { channel: 'mix' });
  };
  const reanalyze = () => {
    if (!file) return;
    const cropStart = maybeNumber(fields.cropStart) ?? 0;
    const cropEnd = maybeNumber(fields.cropEnd);
    const bodyStart = maybeNumber(fields.bodyStart);
    const bodyEnd = maybeNumber(fields.bodyEnd);
    if ((bodyStart === undefined) !== (bodyEnd === undefined)) {
      setError('Enter both body times, or leave both blank for automatic detection.');
      return;
    }
    const crop = review
      ? {
          start: cropStart,
          end: cropEnd ?? Math.min(review.duration, cropStart + WAV_IMPORT_LIMITS.cropSeconds),
        }
      : undefined;
    analyze(file, {
      channel,
      crop,
      body:
        bodyStart !== undefined && bodyEnd !== undefined
          ? { start: bodyStart, end: bodyEnd }
          : undefined,
      onset: maybeNumber(fields.onset),
      noteOff: maybeNumber(fields.noteOff),
      frequency: maybeNumber(fields.frequency),
    });
  };
  const editAnalysis = () => {
    stopPreview();
    setDirty(true);
    setError('');
  };
  const editSound = (next: FourierSound) => {
    stopPreview();
    setSound(next);
  };
  const listen = async (kind: 'original' | 'reconstruction') => {
    if (!review || dirty || preparing) return;
    stopPreview();
    setAudioError('');
    const request = previewRequest.current;
    setPreparing(true);
    try {
      const context = audio.current ?? (audio.current = new AudioContext());
      await context.resume();
      if (request !== previewRequest.current) return;
      const rendered =
        sound && (match || kind === 'reconstruction')
          ? await renderWavReconstruction(review, sound)
          : undefined;
      if (request !== previewRequest.current) return;
      const samples = kind === 'original' ? review.samples : rendered!;
      const gain = match
        ? matchedGains(review.samples, rendered)[kind]
        : matchedGains(samples).original;
      const buffer = context.createBuffer(1, samples.length, review.sampleRate);
      buffer.getChannelData(0).set(samples);
      const node = context.createBufferSource();
      const volume = context.createGain();
      volume.gain.value = gain * monitor;
      node.buffer = buffer;
      node.connect(volume).connect(context.destination);
      node.onended = () => {
        volume.disconnect();
        node.disconnect();
        if (source.current === node) {
          source.current = null;
          setPreview('');
        }
      };
      node.start();
      source.current = node;
      setPreview(kind === 'original' ? 'Playing original' : 'Playing reconstruction');
    } catch (failure) {
      if (request === previewRequest.current) setAudioError((failure as Error).message);
    } finally {
      setPreparing(false);
    }
  };
  const close = () => {
    dialog.current?.close();
    onClose();
  };
  const add = () => {
    if (!sound || dirty) return;
    try {
      if (!sound.harmonics.some((value) => value > 0))
        throw new Error('Keep at least one audible harmonic.');
      onCreate(label, key, sound, folder || undefined);
      close();
    } catch (failure) {
      setCreateError((failure as Error).message);
    }
  };
  const field = (id: Field, title: string, placeholder = 'Auto') => (
    <label>
      {title}
      <input
        type="number"
        min="0"
        step="any"
        value={fields[id]}
        placeholder={placeholder}
        onChange={(e) => {
          setFields({ ...fields, [id]: e.currentTarget.value });
          editAnalysis();
        }}
      />
    </label>
  );
  const fit = review?.fit;
  const timing = review?.timing;
  return (
    <dialog
      ref={dialog}
      className="preset-dialog wav-dialog"
      aria-labelledby="wav-import-title"
      onCancel={(e) => {
        e.preventDefault();
        close();
      }}
    >
      <header>
        <h2 id="wav-import-title">WAV to instrument</h2>
        <button type="button" className="secondary-button" onClick={close}>
          Close
        </button>
      </header>
      <label>
        WAV recording
        <input
          type="file"
          accept=".wav,audio/wav,audio/x-wav"
          onChange={(e) => {
            const input = e.currentTarget.files?.[0];
            if (input) openFile(input);
          }}
        />
      </label>
      <p className="muted">
        Choose a recording with one isolated pitched note. Mono or stereo, up to 30 seconds and 32
        MiB.
      </p>
      {progress && (
        <div className="wav-row">
          <span role="status">{progress}</span>
          <button type="button" className="secondary-button" onClick={cancelAnalysis}>
            Cancel analysis
          </button>
        </div>
      )}
      {review && (
        <>
          <p className="muted">
            {seconds(review.duration)} s · {review.sampleRate / 1000} kHz ·{' '}
            {review.stereo ? 'Stereo' : 'Mono'}
          </p>
          <WavWaveforms review={review} />
          <fieldset disabled={!!progress}>
            <legend>Analysis settings</legend>
            <div className="wav-fields">
              {field('cropStart', 'Crop start (s)', '0')}
              {field('cropEnd', 'Crop end (s)', 'Up to 8 s')}
              <label>
                Channel
                <select
                  disabled={!review.stereo}
                  value={channel}
                  onChange={(e) => {
                    setChannel(e.currentTarget.value as WavChannel);
                    editAnalysis();
                  }}
                >
                  <option value="mix">{review.stereo ? 'Mono mix' : 'Mono'}</option>
                  <option value="left">Left</option>
                  <option value="right">Right</option>
                </select>
              </label>
            </div>
            <p className="muted">
              Onset, body and note-off times are relative to the crop. Leave a field blank to use
              automatic timing or leave note-off unknown.
            </p>
            <div className="wav-fields">
              {field('onset', 'Onset (s)', timing ? seconds(timing.onset) : 'Auto')}
              {field('bodyStart', 'Body start (s)', timing ? seconds(timing.body.start) : 'Auto')}
              {field('bodyEnd', 'Body end (s)', timing ? seconds(timing.body.end) : 'Auto')}
              {field('noteOff', 'Note-off (s)', 'Unknown')}
              {field('frequency', 'Reference pitch (Hz)', fit ? fit.frequency.toFixed(2) : 'Auto')}
            </div>
            <button type="button" className="secondary-button" onClick={reanalyze}>
              Analyze selection
            </button>
          </fieldset>
        </>
      )}
      {file && !review && !progress && (
        <button type="button" className="secondary-button" onClick={reanalyze}>
          Analyze selection
        </button>
      )}
      {error && <p role="alert">{error}</p>}
      {!dirty && review && (
        <section aria-label="Review results">
          {timing && (
            <p className="muted">
              Onset {seconds(timing.onset)} s · attack end {seconds(timing.attackEnd)} s · audible
              end {seconds(timing.end)} s
              {timing.decay !== null && ` · exponential decay ${seconds(timing.decay)} s`}
            </p>
          )}
          {fit && (
            <p>
              <strong>
                {fit.frequency.toFixed(2)} Hz · {noteName(fit.frequency)}
              </strong>
              {' · '}
              {Math.round(fit.explainedEnergy * 100)}% of body energy captured by the signed fit
              {' · '}
              {Math.round(fit.harmonicEnergy * 100)}% in the measured harmonic series
              {fit.periodicity !== null &&
                ` · ${Math.round(fit.periodicity * 100)}% repeatability at the estimated pitch`}
            </p>
          )}
          {[...review.warnings, ...(fit?.warnings ?? [])].map((warning) => (
            <p className="muted" key={warning}>
              {warning}
            </p>
          ))}
          {sound && <WavFitPlots review={review} sound={sound} />}
          <div className="wav-row">
            <button
              type="button"
              className="secondary-button"
              disabled={preparing}
              onClick={() => void listen('original')}
            >
              Play original
            </button>
            <button
              type="button"
              className="secondary-button"
              disabled={preparing || !sound}
              onClick={() => void listen('reconstruction')}
            >
              Play reconstruction
            </button>
            <button
              type="button"
              className="secondary-button"
              disabled={!preview && !preparing}
              onClick={stopPreview}
            >
              Stop preview
            </button>
            <label className="wav-checkbox">
              <input
                type="checkbox"
                checked={match}
                onChange={(e) => {
                  stopPreview();
                  setMatch(e.currentTarget.checked);
                }}
              />{' '}
              Match RMS
            </label>
            <span role="status">{preparing ? 'Preparing preview…' : preview}</span>
          </div>
          {audioError && <p role="alert">{audioError}</p>}
          {sound && (
            <div key={revision} className="wav-draft">
              <div className="wav-fields">
                <DraftNumber
                  label="Attack (s)"
                  value={sound.attack}
                  min={0.005}
                  max={2}
                  onChange={(attack) => editSound({ ...sound, attack })}
                />
                <DraftNumber
                  label="Release (s)"
                  value={sound.release}
                  min={0.01}
                  max={3}
                  onChange={(release) => editSound({ ...sound, release })}
                />
                <DraftNumber
                  label="Trim (dB)"
                  value={sound.trim}
                  min={-36}
                  max={0}
                  onChange={(trim) => editSound({ ...sound, trim })}
                />
                {sound.percussion && (
                  <DraftNumber
                    label="Hit decay (s)"
                    value={sound.percussion.decay}
                    min={0.01}
                    max={2}
                    onChange={(decay) =>
                      editSound({ ...sound, percussion: { ...sound.percussion!, decay } })
                    }
                  />
                )}
              </div>
              <details>
                <summary>Signed harmonic coefficients</summary>
                <div className="wav-fields wav-partials">
                  {sound.harmonics.map((magnitude, i) => (
                    <DraftNumber
                      key={i}
                      label={`H${i + 1}`}
                      min={-1}
                      max={1}
                      value={magnitude * sound.polarity[i]}
                      onChange={(coefficient) =>
                        editSound({
                          ...sound,
                          harmonics: sound.harmonics.map((value, h) =>
                            h === i ? Math.abs(coefficient) : value,
                          ),
                          polarity: sound.polarity.map((value, h) =>
                            h === i ? (coefficient < 0 ? -1 : 1) : value,
                          ),
                        })
                      }
                    />
                  ))}
                </div>
              </details>
              <div className="wav-fields">
                <label>
                  Instrument name
                  <input
                    value={label}
                    maxLength={100}
                    onChange={(e) => setLabel(e.currentTarget.value)}
                  />
                </label>
                <label>
                  Score key
                  <input
                    value={key}
                    maxLength={100}
                    onChange={(e) => setKey(e.currentTarget.value)}
                  />
                </label>
                <label>
                  Destination folder
                  <select value={folder} onChange={(e) => setFolder(e.currentTarget.value)}>
                    <option value="">Unfiled</option>
                    {folders.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.label}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              {createError && <p role="alert">{createError}</p>}
              <button type="button" className="primary-button" onClick={add}>
                Create instrument
              </button>
            </div>
          )}
        </section>
      )}
      {dirty && review && !progress && (
        <p className="muted" role="status">
          Analyze the current selection to review or create an instrument.
        </p>
      )}
    </dialog>
  );
}

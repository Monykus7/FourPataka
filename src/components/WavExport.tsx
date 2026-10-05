import { useEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';
import type { Project } from '../core/project';
import { DEFAULT_WAV_OPTIONS, encodeWav, wavGain, type WavOptions } from '../core/wav';
import { prepareExport, renderWav, type WavRender } from '../audio/export';
import '../export.css';

export default function WavExport({ project, onClose }: { project: Project; onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const mounted = useRef(true);
  const [options, setOptions] = useState<WavOptions>({ ...DEFAULT_WAV_OPTIONS });
  const [result, setResult] = useState<WavRender | null>(null);
  const [busy, setBusy] = useState<'render' | 'save' | null>(null);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [level, setLevel] = useState(0);
  const [normalize, setNormalize] = useState(false);
  useEffect(() => {
    mounted.current = true;
    if (!dialog.current?.open) dialog.current?.showModal();
    dialog.current?.querySelector<HTMLSelectElement>('select')?.focus();
    return () => {
      mounted.current = false;
    };
  }, []);
  let plan: ReturnType<typeof prepareExport> | null = null;
  let preflightError = '';
  try {
    plan = prepareExport(project, options);
  } catch (e) {
    preflightError = (e as Error).message;
  }
  const gain = wavGain(result?.peak ?? 0, level, normalize);
  const clipping = !!result && result.peak * gain > 1;
  const update = (next: WavOptions) => {
    setOptions(next);
    setResult(null);
    setError('');
    setMessage('');
  };
  const render = async () => {
    setBusy('render');
    setResult(null);
    setError('');
    setMessage('Rendering project mix…');
    try {
      const rendered = await renderWav(project, options);
      if (!mounted.current) return;
      setResult(rendered);
      setMessage('Render ready. Review the level, then save WAV.');
    } catch (e) {
      if (mounted.current) {
        setError((e as Error).message);
        setMessage('');
      }
    } finally {
      if (mounted.current) setBusy(null);
    }
  };
  const save = async () => {
    if (!result || clipping) return;
    setBusy('save');
    setError('');
    try {
      const channels = Array.from({ length: result.buffer.numberOfChannels }, (_, i) =>
        result.buffer.getChannelData(i),
      );
      const pcm = encodeWav(channels, result.buffer.sampleRate, gain);
      if (window.fourpatakaDesktop?.saveWav) {
        const saved = await window.fourpatakaDesktop.saveWav(pcm, project.name);
        setMessage(
          saved.canceled ? 'Save canceled. The render is still ready.' : `Saved ${saved.name}.`,
        );
      } else {
        const url = URL.createObjectURL(new Blob([pcm], { type: 'audio/wav' }));
        const anchor = document.createElement('a');
        anchor.href = url;
        anchor.download = `${project.name.replace(/[^a-z0-9_-]/gi, '-') || 'FourPataka'}.wav`;
        anchor.click();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
        setMessage('WAV downloaded.');
      }
    } catch (e) {
      setError(`Save failed: ${(e as Error).message}`);
    } finally {
      setBusy(null);
    }
  };
  return (
    <dialog
      ref={dialog}
      className="wav-dialog"
      aria-labelledby="wav-title"
      onClose={onClose}
      onCancel={(event) => {
        if (busy === 'save') event.preventDefault();
      }}
    >
      <header className="panel-header">
        <h2 id="wav-title">Export WAV</h2>
        <button
          className="icon-button"
          aria-label="Close WAV export"
          disabled={busy === 'save'}
          onClick={() => dialog.current?.close()}
        >
          <X size={18} />
        </button>
      </header>
      <p>
        <strong>{project.name}</strong> · Project mix with applied instruments and track/master
        pedals.
      </p>
      <p className="footnote">
        Monitor volume and A/B comparisons are excluded. This snapshot stays fixed while the export
        panel is open.
      </p>
      <fieldset className="wav-options" disabled={!!busy}>
        <legend>PCM WAV · 16 bit</legend>
        <label>
          Sample rate
          <select
            value={options.sampleRate}
            onChange={(e) =>
              update({ ...options, sampleRate: Number(e.target.value) as WavOptions['sampleRate'] })
            }
          >
            <option value={48000}>48 kHz</option>
            <option value={44100}>44.1 kHz</option>
          </select>
        </label>
        <label>
          Channels
          <select
            value={options.channels}
            onChange={(e) =>
              update({ ...options, channels: Number(e.target.value) as WavOptions['channels'] })
            }
          >
            <option value={2}>Stereo</option>
            <option value={1}>Mono</option>
          </select>
        </label>
        <label>
          Echo tail limit (seconds)
          <input
            type="number"
            min={0}
            max={30}
            step={0.5}
            value={options.tailSeconds}
            onChange={(e) => update({ ...options, tailSeconds: Number(e.target.value) })}
          />
        </label>
      </fieldset>
      {plan && (
        <p className="wav-estimate">
          About {plan.seconds.toFixed(2)} s · {(plan.wavBytes / 1048576).toFixed(1)} MiB WAV ·{' '}
          {(plan.memoryBytes / 1048576).toFixed(1)} MiB estimated memory (limit 256 MiB). Includes
          releases, latency and filter settling before the echo budget.
        </p>
      )}
      {plan?.capped && (
        <p className="wav-warning">
          Tail limit may cut off later echoes (estimated decay {plan.estimatedTail.toFixed(1)} s). A
          20 ms fade is applied at the end.
        </p>
      )}
      {preflightError && (
        <p role="alert" className="form-error">
          {preflightError}
        </p>
      )}
      {result && (
        <section className="wav-level" aria-label="Rendered export level">
          <p>
            Rendered peak:{' '}
            <strong>{result.peak ? (20 * Math.log10(result.peak)).toFixed(2) : '−∞'} dBFS</strong> ·{' '}
            {result.clipped.toLocaleString()} samples above PCM range.
          </p>
          {result.capped && result.endPeak > 0.001 && (
            <p className="wav-warning">Audio was present at the tail cap before the fade.</p>
          )}
          <label>
            Export level (dB)
            <input
              type="number"
              min={-36}
              max={0}
              step={0.5}
              disabled={!!busy || normalize}
              value={level}
              onChange={(e) => setLevel(Math.max(-36, Math.min(0, Number(e.target.value))))}
            />
          </label>
          <label className="wav-normalize">
            <input
              type="checkbox"
              checked={normalize}
              disabled={!!busy}
              onChange={(e) => setNormalize(e.target.checked)}
            />
            Normalize to −1 dBFS
          </label>
          <p className="footnote">
            Export level changes only this file. Normalization is optional and replaces the export
            level.
          </p>
          {clipping && (
            <p role="alert" className="wav-warning">
              This level would clip. Lower the export level or enable normalization before saving.
            </p>
          )}
          <p>
            File peak:{' '}
            {result.peak * gain ? (20 * Math.log10(result.peak * gain)).toFixed(2) : '−∞'} dBFS
          </p>
        </section>
      )}
      <p role="status" aria-live="polite">
        {message}
      </p>
      {error && (
        <p role="alert" className="form-error">
          {error}
        </p>
      )}
      <footer className="wav-actions">
        <button
          className="subtle-button"
          disabled={!!busy || !!preflightError}
          onClick={() => void render()}
        >
          {busy === 'render' ? 'Rendering…' : result ? 'Render again' : 'Render WAV'}
        </button>
        <button
          className="primary-button"
          disabled={!!busy || !result || clipping}
          onClick={() => void save()}
        >
          {busy === 'save' ? 'Saving…' : 'Save WAV'}
        </button>
      </footer>
    </dialog>
  );
}

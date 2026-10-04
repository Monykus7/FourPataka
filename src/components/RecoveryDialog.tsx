import { useEffect, useRef, useState } from 'react';
import { ArrowDownToLine, RotateCcw, X } from 'lucide-react';
import type { RecoveryCopy } from '../core/localSave';
import '../recovery.css';

export default function RecoveryDialog({
  copies,
  storageError,
  onRestore,
  onExport,
  onClose,
}: {
  copies: RecoveryCopy[];
  storageError: string | null;
  onRestore: (copy: RecoveryCopy) => void;
  onExport: (copy: RecoveryCopy) => Promise<string | null>;
  onClose: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [selected, setSelected] = useState(copies[0]?.key ?? 'previous');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const copy = copies.find((item) => item.key === selected);
  useEffect(() => {
    if (!dialog.current?.open) dialog.current?.showModal();
  }, []);
  const close = () => dialog.current?.close();
  return (
    <dialog
      ref={dialog}
      className="recovery-dialog"
      aria-labelledby="recovery-title"
      onClose={onClose}
    >
      <header className="panel-header">
        <h2 id="recovery-title">Local save recovery</h2>
        <button className="icon-button" aria-label="Close recovery" onClick={close}>
          <X size={18} />
        </button>
      </header>
      <p className="footnote">
        Copies below are captured when this panel opens. Restoring stops playback and can be undone.
        Export keeps the original saved contents.
      </p>
      {storageError && (
        <p role="alert" className="form-error">
          {storageError}
        </p>
      )}
      {!copies.length && !storageError && (
        <p>No recovery copies are available yet. Export JSON to keep a separate project file.</p>
      )}
      {copies.length > 0 && (
        <fieldset className="recovery-copies">
          <legend>Saved copies</legend>
          {copies.map((item) => (
            <label key={item.key}>
              <input
                type="radio"
                name="recovery-copy"
                value={item.key}
                checked={selected === item.key}
                disabled={busy}
                onChange={() => {
                  setSelected(item.key);
                  setMessage(null);
                  setError(null);
                }}
              />
              <span>
                <strong>{item.label}</strong>
                <small>
                  {item.project?.name ?? 'Cannot be opened'} · {item.bytes.toLocaleString()} bytes
                </small>
              </span>
              <span className="tag">{item.project ? 'Valid project' : 'Unreadable'}</span>
            </label>
          ))}
        </fieldset>
      )}
      {copy && (
        <section className="recovery-preview" aria-label="Recovery preview">
          {copy.project ? (
            <>
              <h3>{copy.project.name}</h3>
              <p>
                {copy.project.tracks.length} tracks · {copy.project.instruments.length} instruments
                · independent sounds and pedal settings included
              </p>
              <pre aria-label="Recovery score preview">
                {copy.project.scoreText || '(Empty score)'}
              </pre>
            </>
          ) : (
            <>
              <h3>This copy cannot be restored</h3>
              <p>{copy.error}</p>
              <p>Export the original contents to keep this copy for inspection.</p>
            </>
          )}
        </section>
      )}
      {message && <p role="status">{message}</p>}
      {error && (
        <p role="alert" className="form-error">
          {error}
        </p>
      )}
      <footer className="recovery-actions">
        <button className="subtle-button" onClick={close}>
          Close
        </button>
        <button
          className="subtle-button"
          disabled={!copy || busy}
          onClick={async () => {
            if (!copy) return;
            setBusy(true);
            setError(null);
            setMessage(null);
            try {
              setMessage(await onExport(copy));
            } catch (e) {
              setError(`Export failed: ${(e as Error).message}`);
            } finally {
              setBusy(false);
            }
          }}
        >
          <ArrowDownToLine size={15} />
          {busy ? 'Exporting…' : 'Export selected copy'}
        </button>
        <button
          className="primary-button"
          disabled={!copy?.project || busy}
          onClick={() => {
            if (!copy?.project) return;
            try {
              onRestore(copy);
              close();
            } catch (e) {
              setError(`Restore failed: ${(e as Error).message}`);
            }
          }}
        >
          <RotateCcw size={15} />
          Restore selected copy
        </button>
      </footer>
    </dialog>
  );
}

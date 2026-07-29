interface ConfirmDialogProps {
  open: boolean;
  eyebrow?: string;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  busy?: boolean;
  showCancel?: boolean;
  tone?: 'danger' | 'primary';
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmDialog({
  open,
  eyebrow = 'Please confirm',
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  busy = false,
  showCancel = true,
  tone = 'danger',
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  if (!open) return null;

  return (
    <div className="app-dialog-backdrop" role="presentation" onMouseDown={busy ? undefined : onCancel}>
      <section
        className="app-confirm-dialog"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="app-confirm-title"
        aria-describedby="app-confirm-message"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className={`app-confirm-icon ${tone}`} aria-hidden="true">
          {tone === 'danger' ? '!' : '✓'}
        </div>
        <p className="app-dialog-eyebrow">{eyebrow}</p>
        <h2 id="app-confirm-title">{title}</h2>
        <p id="app-confirm-message" className="app-confirm-message">{message}</p>
        <div className="app-confirm-actions">
          {showCancel && (
            <button type="button" className="approved-secondary-button" onClick={onCancel} disabled={busy}>
              {cancelLabel}
            </button>
          )}
          <button
            type="button"
            className={tone === 'danger' ? 'app-danger-button' : 'approved-primary-button'}
            onClick={onConfirm}
            disabled={busy}
            autoFocus
          >
            {busy ? 'Working…' : confirmLabel}
          </button>
        </div>
      </section>
    </div>
  );
}

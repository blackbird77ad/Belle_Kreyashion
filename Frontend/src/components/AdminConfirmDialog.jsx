import { AlertTriangle, Loader2, X } from 'lucide-react';

export default function AdminConfirmDialog({
  open,
  title = 'Confirm deletion',
  message = 'This action cannot be undone.',
  confirmText = 'Delete permanently',
  busy = false,
  onCancel,
  onConfirm,
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm" onClick={() => !busy && onCancel?.()}>
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="admin-delete-dialog-title"
        className="w-full max-w-md rounded-3xl bg-white p-5 shadow-2xl sm:p-6"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex min-w-0 items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-red-50 text-red-600">
              <AlertTriangle size={20} />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-red-500">Permanent action</p>
              <h2 id="admin-delete-dialog-title" className="mt-1 text-lg font-extrabold text-black">{title}</h2>
            </div>
          </div>
          <button
            type="button"
            onClick={onCancel}
            disabled={busy}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-gray-200 text-gray-400 hover:border-black hover:text-black disabled:opacity-40"
            aria-label="Cancel deletion"
          >
            <X size={16} />
          </button>
        </div>

        <p className="mt-5 text-sm leading-relaxed text-gray-600">{message}</p>
        <p className="mt-3 rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-xs font-bold text-red-700">
          Nothing will be deleted until you click the red confirmation button below.
        </p>

        <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onCancel}
            disabled={busy}
            className="rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-bold text-gray-700 hover:border-black disabled:opacity-40"
          >
            Cancel, keep it
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={busy}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-extrabold text-white hover:bg-red-700 disabled:opacity-50"
          >
            {busy && <Loader2 size={15} className="animate-spin" />}
            {busy ? 'Deleting...' : confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}

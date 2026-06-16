import { CheckCircle2, CircleAlert, X } from "lucide-react";

export type ToastState = { id: number; message: string; kind: "success" | "error" | "info" };

export function ToastArea({ toasts, dismiss }: { toasts: ToastState[]; dismiss: (id: number) => void }) {
  return (
    <div className="toast-area" aria-live="polite">
      {toasts.map((toast) => (
        <div key={toast.id} className={`toast toast-${toast.kind}`}>
          {toast.kind === "success" ? <CheckCircle2 size={18} /> : <CircleAlert size={18} />}
          <span>{toast.message}</span>
          <button aria-label="Tutup notifikasi" onClick={() => dismiss(toast.id)}><X size={16} /></button>
        </div>
      ))}
    </div>
  );
}

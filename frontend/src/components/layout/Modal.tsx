import type { PropsWithChildren } from "react";

import { X } from "lucide-react";

type ModalProps = PropsWithChildren<{
  open: boolean;
  title: string;
  onClose: () => void;
}>;

export function Modal({ open, title, onClose, children }: ModalProps) {
  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/25 px-4 py-6 backdrop-blur-sm">
      <div className="glass-panel-strong w-full max-w-2xl px-6 py-6">
        <div className="mb-5 flex items-center justify-between">
          <h3 className="text-xl font-semibold tracking-tight text-slate-900">{title}</h3>
          <button type="button" onClick={onClose} aria-label="Закрыть окно" className="glass-button h-10 w-10 rounded-2xl p-0">
            <X className="h-4 w-4" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

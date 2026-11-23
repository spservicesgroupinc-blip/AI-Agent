import React from 'react';
import type { ToastItem } from '../types';

interface ToastStackProps {
  toasts: ToastItem[];
}

export const ToastStack: React.FC<ToastStackProps> = ({ toasts }) => {
  if (toasts.length === 0) return null;

  return (
    <div
      id="toastContainer"
      role="status"
      aria-live="polite"
      className="pointer-events-none fixed top-[70px] right-4 z-50 flex max-w-[calc(100vw-32px)] flex-col items-end gap-2 sm:top-[76px] sm:right-6"
    >
      {toasts.slice(-2).map((toast) => {
        const cls =
          toast.type === 'error'
            ? 'bg-[var(--error-solid)] text-white'
            : toast.type === 'success'
            ? 'bg-emerald-700 text-white'
            : 'border border-[var(--line)] bg-[var(--surface)] text-[var(--foreground)]';
        return (
          <div
            key={toast.id}
            className={`pointer-events-auto rounded-lg px-3.5 py-2 text-xs font-semibold shadow-lg transition ${cls}`}
          >
            {toast.message}
          </div>
        );
      })}
    </div>
  );
};

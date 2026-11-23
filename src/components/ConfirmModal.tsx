import React, { useEffect, useRef } from 'react';

interface ConfirmModalProps {
  open: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({ open, onCancel, onConfirm }) => {
  const cancelBtnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    setTimeout(() => cancelBtnRef.current?.focus(), 40);
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, onCancel]);

  if (!open) return null;

  return (
    <div
      id="confirmModal"
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirmTitle"
      aria-describedby="confirmBody"
      className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/55 p-4 backdrop-blur-[1px]"
      onClick={(e) => {
        if (e.target === e.currentTarget) onCancel();
      }}
    >
      <div className="w-full max-w-sm rounded-[18px] border border-[var(--line)] bg-[var(--canvas)] p-5 text-[var(--foreground)] shadow-2xl">
        <h3 id="confirmTitle" className="text-base font-semibold text-[var(--foreground)]">
          Start a New Chat?
        </h3>
        <p id="confirmBody" className="mt-1.5 text-xs leading-relaxed text-[var(--muted)]">
          This clears the visible conversation and starts a fresh session ID. Your emails, calendar
          events, tasks, and Drive files remain untouched.
        </p>
        <div className="mt-5 flex justify-end gap-2">
          <button
            ref={cancelBtnRef}
            id="confirmCancelBtn"
            type="button"
            onClick={onCancel}
            className="min-h-[40px] rounded-lg border border-[var(--line)] px-4 py-2 text-xs font-semibold text-[var(--foreground)] transition hover:bg-[var(--surface)]"
          >
            Cancel
          </button>
          <button
            id="confirmOkBtn"
            type="button"
            onClick={onConfirm}
            className="min-h-[40px] rounded-lg bg-[var(--brand-solid)] px-4 py-2 text-xs font-semibold text-white transition hover:bg-[var(--brand-hover)]"
          >
            Start New Chat
          </button>
        </div>
      </div>
    </div>
  );
};

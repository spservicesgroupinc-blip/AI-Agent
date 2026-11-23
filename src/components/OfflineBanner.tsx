import React from 'react';
import { WifiOff, RefreshCw, X } from 'lucide-react';

interface OfflineBannerProps {
  isOnline: boolean;
  queuedCount: number;
  needRefresh: boolean;
  onUpdateSW: () => void;
  onDismissRefresh: () => void;
  onFlushQueue: () => void;
}

export const OfflineBanner: React.FC<OfflineBannerProps> = ({
  isOnline,
  queuedCount,
  needRefresh,
  onUpdateSW,
  onDismissRefresh,
  onFlushQueue,
}) => {
  if (isOnline && !needRefresh && queuedCount === 0) {
    return null;
  }

  return (
    <div className="shrink-0 border-b border-[var(--line)] bg-[var(--surface)] px-4 py-2 text-xs sm:px-6">
      <div className="mx-auto flex max-w-[760px] flex-wrap items-center justify-between gap-2">
        {!isOnline ? (
          <div className="flex items-center gap-2 text-[var(--foreground)]" role="status" aria-live="polite">
            <WifiOff className="h-3.5 w-3.5 shrink-0 text-amber-500" />
            <span>
              Offline mode — cached workspace active. Requests will be queued until you reconnect.
            </span>
          </div>
        ) : queuedCount > 0 ? (
          <div className="flex w-full items-center justify-between gap-3" role="status" aria-live="polite">
            <span className="text-[var(--foreground)] tabular-nums">
              Back online — {queuedCount} queued {queuedCount === 1 ? 'request' : 'requests'} ready to send.
            </span>
            <button
              type="button"
              onClick={onFlushQueue}
              className="inline-flex min-h-[32px] items-center rounded-lg bg-[var(--brand-solid)] px-3 py-1 text-xs font-semibold text-white whitespace-nowrap shrink-0 transition hover:bg-[var(--brand-hover)]"
            >
              Send queued
            </button>
          </div>
        ) : null}

        {needRefresh && (
          <div className="flex w-full items-center justify-between gap-3" role="status" aria-live="polite">
            <div className="flex items-center gap-2 text-[var(--foreground)]">
              <RefreshCw className="h-3.5 w-3.5 shrink-0 text-[var(--brand)]" />
              <span>A newer version of Personal Assistant is ready.</span>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={onUpdateSW}
                className="inline-flex min-h-[32px] items-center rounded-lg bg-[var(--brand-solid)] px-3 py-1 text-xs font-semibold text-white whitespace-nowrap transition hover:bg-[var(--brand-hover)]"
              >
                Reload
              </button>
              <button
                type="button"
                onClick={onDismissRefresh}
                aria-label="Dismiss update notification"
                className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-[var(--muted)] hover:bg-[var(--hover)] hover:text-[var(--foreground)]"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

import React from 'react';
import { RefreshCw, AlertTriangle } from 'lucide-react';
import { BrandMark } from './BrandMark';

interface ErrorBoundaryState {
  hasError: boolean;
}

export class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  ErrorBoundaryState
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch() {
    // Error boundary prevents blank white/black screens on mobile standalone launches
  }

  handleReload = () => {
    window.location.reload();
  };

  handleResetAndReload = () => {
    try {
      window.localStorage.removeItem('ro_pa_messages_v1');
      window.localStorage.removeItem('ro_pa_docs_v1');
      window.localStorage.removeItem('ro_pa_outbox_v1');
    } catch {
      // Ignore storage failures
    }
    window.location.reload();
  };

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    return (
      <div className="safe-top safe-bottom flex h-full w-full flex-col items-center justify-center bg-[var(--canvas)] px-6 text-center text-[var(--foreground)]">
        <BrandMark size={44} label="RelayOps" className="mb-5" />
        <div className="w-full max-w-sm rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-5 shadow-xl">
          <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--error-bg)] text-[var(--error-accent)]">
            <AlertTriangle className="h-5 w-5" />
          </div>
          <h1 className="text-base font-semibold text-[var(--foreground)]">
            Something went wrong
          </h1>
          <p className="mt-1.5 text-xs leading-relaxed text-[var(--muted)]">
            The app hit an unexpected display error. Reload to resume your workspace cleanly.
          </p>
          <div className="mt-4 flex flex-col gap-2">
            <button
              type="button"
              onClick={this.handleReload}
              className="inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl bg-[var(--brand-solid)] px-4 py-2.5 text-xs font-semibold text-white transition hover:bg-[var(--brand-hover)]"
            >
              <RefreshCw className="h-4 w-4" />
              <span>Reload App</span>
            </button>
            <button
              type="button"
              onClick={this.handleResetAndReload}
              className="min-h-[44px] w-full rounded-xl border border-[var(--line)] bg-[var(--canvas)] px-4 py-2.5 text-xs font-medium text-[var(--muted)] transition hover:text-[var(--foreground)]"
            >
              Clear Cached Session &amp; Reload
            </button>
          </div>
        </div>
      </div>
    );
  }
}

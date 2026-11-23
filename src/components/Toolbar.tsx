import React from 'react';
import {
  PanelLeft,
  ExternalLink,
  Sun,
  Moon,
  Settings,
  SquarePen,
} from 'lucide-react';
import { PWAInstallButton } from './PWAInstallButton';
import type { PWAInstallState } from '../hooks/usePWAInstall';
import type { ConnectionStatus, ThemeMode, ViewMode } from '../types';

interface ToolbarProps {
  sidebarOpen: boolean;
  isMobile: boolean;
  onToggleSidebar: () => void;
  connectionStatus: ConnectionStatus;
  viewMode: ViewMode;
  onToggleViewMode: () => void;
  theme: ThemeMode;
  onToggleTheme: () => void;
  onOpenSettings: () => void;
  onNewChat: () => void;
  onToast: (message: string, type: 'info' | 'success' | 'error') => void;
  pwaInstall: PWAInstallState;
}

export const Toolbar: React.FC<ToolbarProps> = ({
  sidebarOpen,
  isMobile,
  onToggleSidebar,
  connectionStatus,
  viewMode,
  onToggleViewMode,
  theme,
  onToggleTheme,
  onOpenSettings,
  onNewChat,
  onToast,
  pwaInstall,
}) => {
  const dotColor =
    connectionStatus.kind === 'error'
      ? 'bg-[var(--error-solid)]'
      : connectionStatus.kind === 'working'
      ? 'bg-amber-500 animate-pulse'
      : connectionStatus.kind === 'offline'
      ? 'bg-amber-500'
      : connectionStatus.kind === 'ready'
      ? 'bg-emerald-500'
      : 'bg-[var(--subtle)]';

  return (
    <header className="safe-top safe-x flex min-h-[60px] shrink-0 items-center justify-between gap-2 px-3 sm:min-h-[72px] sm:gap-3 sm:px-6">
      <div className="flex min-w-0 items-center gap-1.5 sm:gap-2">
        <button
          id="mobileSidebarBtn"
          type="button"
          onClick={onToggleSidebar}
          aria-label="Toggle sidebar"
          aria-controls="sidebar"
          aria-expanded={sidebarOpen}
          className="inline-flex h-10 w-10 min-h-[44px] min-w-[44px] shrink-0 items-center justify-center rounded-lg text-[var(--muted)] transition hover:bg-[var(--surface)] hover:text-[var(--foreground)] sm:h-9 sm:w-9 sm:min-h-[36px] sm:min-w-[36px]"
        >
          <PanelLeft className="h-5 w-5" />
        </button>

        <div className="ml-0.5 flex min-w-0 items-baseline gap-2.5 sm:ml-1">
          <h1 className="truncate text-[16px] font-semibold tracking-[-0.02em] text-[var(--foreground)] whitespace-nowrap sm:text-[18px]">
            Personal Assistant
          </h1>
          <span className="hidden text-xs text-[var(--subtle)] whitespace-nowrap lg:inline">
            Gmail · Calendar · Tasks · Drive · Research
          </span>
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-0.5 sm:gap-1.5">
        {/* Real live connection state */}
        <button
          id="statusBadge"
          type="button"
          onClick={onOpenSettings}
          title="Open connection settings"
          className="mr-2 hidden items-center gap-2 rounded-lg px-2 py-1 text-[11.5px] text-[var(--subtle)] whitespace-nowrap transition hover:bg-[var(--surface)] hover:text-[var(--foreground)] md:flex"
        >
          <span id="statusDot" className={`h-1.5 w-1.5 rounded-full ${dotColor}`} aria-hidden="true" />
          <span id="statusText" role="status" aria-live="polite">
            {connectionStatus.label}
          </span>
        </button>

        {/* In-app PWA install trigger visible on desktop and when banner is dismissed on mobile */}
        {(!isMobile || pwaInstall.bannerDismissed) && (
          <PWAInstallButton
            pwaInstall={pwaInstall}
            variant="toolbar"
            isMobileViewport={isMobile}
            onInstalledToast={(m) => onToast(m, 'success')}
          />
        )}

        <button
          id="toggleModeBtn"
          type="button"
          onClick={onToggleViewMode}
          title={viewMode === 'chat' ? 'Connection help' : 'Close connection help'}
          aria-label={viewMode === 'chat' ? 'Connection help' : 'Close connection help'}
          className="hidden h-9 w-9 min-h-[36px] shrink-0 items-center justify-center rounded-lg text-[var(--muted)] transition hover:bg-[var(--surface)] hover:text-[var(--foreground)] md:inline-flex"
        >
          <ExternalLink className="h-[17px] w-[17px]" />
        </button>

        <button
          id="themeToggleBtn"
          type="button"
          onClick={onToggleTheme}
          aria-pressed={theme === 'dark'}
          aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
          title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
          className="inline-flex h-10 w-10 min-h-[44px] min-w-[44px] shrink-0 items-center justify-center rounded-lg text-[var(--muted)] transition hover:bg-[var(--surface)] hover:text-[var(--foreground)] sm:h-9 sm:w-9 sm:min-h-[36px] sm:min-w-[36px]"
        >
          {theme === 'dark' ? <Sun className="h-[19px] w-[19px]" /> : <Moon className="h-[19px] w-[19px]" />}
        </button>

        <button
          id="openSettingsBtn"
          type="button"
          onClick={onOpenSettings}
          aria-label="Connection settings"
          title="Connection settings"
          className="inline-flex h-10 w-10 min-h-[44px] min-w-[44px] shrink-0 items-center justify-center rounded-lg text-[var(--muted)] transition hover:bg-[var(--surface)] hover:text-[var(--foreground)] sm:h-9 sm:w-9 sm:min-h-[36px] sm:min-w-[36px]"
        >
          <Settings className="h-[19px] w-[19px]" />
        </button>

        <button
          id="toolbarNewChatBtn"
          type="button"
          onClick={onNewChat}
          aria-label="Start a new chat"
          title="Start a new chat"
          className="hidden h-9 w-9 min-h-[36px] shrink-0 items-center justify-center rounded-lg text-[var(--muted)] transition hover:bg-[var(--surface)] hover:text-[var(--foreground)] sm:inline-flex"
        >
          <SquarePen className="h-[19px] w-[19px]" />
        </button>
      </div>
    </header>
  );
};

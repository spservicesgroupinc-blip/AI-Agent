import React, { useState, useEffect } from 'react';
import {
  Download,
  Share,
  PlusSquare,
  X,
  CheckCircle2,
  MoreVertical,
  Smartphone,
} from 'lucide-react';
import { BrandMark } from './BrandMark';
import type { PWAInstallState } from '../hooks/usePWAInstall';

interface PWAInstallButtonProps {
  pwaInstall: PWAInstallState;
  variant?: 'toolbar' | 'sidebar' | 'settings' | 'banner';
  isMobileViewport?: boolean;
  onInstalledToast?: (msg: string) => void;
}

export const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({
  pwaInstall,
  variant = 'toolbar',
  isMobileViewport = false,
  onInstalledToast,
}) => {
  const {
    isInstallable,
    isInstalled,
    isIOS,
    isAndroid,
    isMobileDevice,
    platform,
    bannerDismissed,
    dismissBanner,
    install,
  } = pwaInstall;
  const [showGuide, setShowGuide] = useState(false);

  useEffect(() => {
    if (!showGuide) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setShowGuide(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [showGuide]);

  const handleInstallClick = async () => {
    if (isInstallable) {
      const accepted = await install();
      if (accepted && onInstalledToast) {
        onInstalledToast('RelayOps added to your home screen.');
      }
      return;
    }
    setShowGuide(true);
  };

  if (isInstalled) {
    if (variant === 'settings') {
      return (
        <div className="flex items-center gap-2 text-xs text-[var(--muted)]">
          <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />
          <span>Installed and running in standalone app mode.</span>
        </div>
      );
    }
    return null;
  }

  // Smartphone home-screen install banner: visible on mobile viewports / phone devices until installed or dismissed
  if (variant === 'banner') {
    if (bannerDismissed || (!isMobileViewport && !isMobileDevice && !isInstallable)) {
      return null;
    }
    // On desktop, keep the toolbar button instead of showing a banner
    if (!isMobileViewport && !isMobileDevice) {
      return null;
    }
  }

  // Toolbar & sidebar: show whenever natively installable, on any mobile device/viewport, or on iOS
  if (
    (variant === 'toolbar' || variant === 'sidebar') &&
    !isInstallable &&
    !isIOS &&
    !isAndroid &&
    !isMobileViewport
  ) {
    return null;
  }

  const buttonLabel = isInstallable
    ? 'Install App'
    : isIOS
    ? 'Add to Home'
    : isAndroid || isMobileViewport
    ? 'Add to Home'
    : 'How to install';

  return (
    <>
      {variant === 'banner' && (
        <div
          role="region"
          aria-label="Install app on your phone"
          className="shrink-0 border-b border-[var(--line)] bg-[var(--sidebar)] px-3 py-2.5 sm:px-6"
        >
          <div className="mx-auto flex max-w-[760px] items-center justify-between gap-2.5">
            <div className="flex min-w-0 items-center gap-2.5">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-[var(--line)] bg-[var(--surface)]">
                <BrandMark size={22} label="RelayOps" />
              </div>
              <div className="min-w-0">
                <p className="truncate text-xs font-semibold text-[var(--foreground)]">
                  Add RelayOps to Home Screen
                </p>
                <p className="truncate text-[11px] text-[var(--muted)]">
                  {isInstallable
                    ? '1-tap full-screen app with offline queue'
                    : isIOS
                    ? 'Full-screen iPhone app via Safari Share'
                    : 'Launch full-screen right from your phone'}
                </p>
              </div>
            </div>

            <div className="flex shrink-0 items-center gap-1">
              <button
                id="mobileInstallBannerBtn"
                type="button"
                onClick={handleInstallClick}
                className="inline-flex min-h-[38px] items-center gap-1.5 rounded-lg bg-[var(--brand-solid)] px-3 py-1.5 text-xs font-semibold text-white whitespace-nowrap transition hover:bg-[var(--brand-hover)] active:scale-[0.98]"
              >
                <Download className="h-3.5 w-3.5 shrink-0" />
                <span>{isInstallable ? 'Install' : 'Add'}</span>
              </button>
              <button
                type="button"
                onClick={dismissBanner}
                aria-label="Dismiss home screen install banner"
                className="inline-flex h-9 w-9 min-h-[38px] min-w-[38px] items-center justify-center rounded-lg text-[var(--muted)] transition hover:bg-[var(--surface)] hover:text-[var(--foreground)]"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {variant === 'toolbar' && (
        <button
          id="toolbarInstallBtn"
          type="button"
          onClick={handleInstallClick}
          className="inline-flex h-9 min-h-[36px] shrink-0 items-center gap-1.5 rounded-lg border border-[var(--line)] bg-[var(--surface)] px-2.5 text-xs font-semibold text-[var(--foreground)] whitespace-nowrap transition hover:bg-[var(--hover)] sm:px-3"
          aria-label={buttonLabel}
        >
          <Download className="h-3.5 w-3.5 shrink-0 text-[var(--brand)]" />
          <span className="hidden sm:inline">{buttonLabel}</span>
          <span className="sm:hidden">Install</span>
        </button>
      )}

      {variant === 'sidebar' && (
        <button
          type="button"
          onClick={handleInstallClick}
          className="flex min-h-[44px] w-full items-center gap-2.5 rounded-lg border border-[var(--line)] bg-[var(--surface)] px-3 py-2 text-xs font-semibold text-[var(--foreground)] whitespace-nowrap transition hover:bg-[var(--hover)]"
        >
          <Download className="h-4 w-4 shrink-0 text-[var(--brand)]" />
          <span>{buttonLabel}</span>
        </button>
      )}

      {variant === 'settings' && (
        <button
          type="button"
          onClick={handleInstallClick}
          className="inline-flex min-h-[42px] items-center gap-2 rounded-lg bg-[var(--brand-solid)] px-3.5 py-2 text-xs font-semibold text-white whitespace-nowrap transition hover:bg-[var(--brand-hover)]"
        >
          <Download className="h-3.5 w-3.5 shrink-0" />
          <span>{buttonLabel}</span>
        </button>
      )}

      {showGuide && (
        <div
          id="pwaInstallGuideModal"
          role="dialog"
          aria-modal="true"
          aria-labelledby="pwaInstallGuideTitle"
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-3 backdrop-blur-[1px] sm:items-center sm:p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowGuide(false);
          }}
        >
          <div className="safe-bottom w-full max-w-sm rounded-2xl border border-[var(--line)] bg-[var(--canvas)] p-5 text-[var(--foreground)] shadow-2xl">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[var(--line)] bg-[var(--surface)]">
                  <BrandMark size={24} label="RelayOps" />
                </div>
                <div>
                  <h3 id="pwaInstallGuideTitle" className="text-base font-semibold leading-tight">
                    {isIOS
                      ? 'Add to iPhone / iPad'
                      : isAndroid
                      ? 'Install on Android'
                      : 'Install RelayOps App'}
                  </h3>
                  <p className="mt-0.5 text-xs text-[var(--muted)]">
                    Full-screen home screen app with offline queue.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowGuide(false)}
                aria-label="Close install instructions"
                className="inline-flex h-10 w-10 min-h-[44px] min-w-[44px] shrink-0 items-center justify-center rounded-lg text-[var(--muted)] hover:bg-[var(--surface)] hover:text-[var(--foreground)]"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {platform === 'ios-safari' ? (
              <ol className="mt-4 space-y-3 rounded-xl border border-[var(--line)] bg-[var(--sidebar)] p-3.5 text-xs leading-relaxed text-[var(--muted)]">
                <li className="flex items-start gap-2.5">
                  <Share className="mt-0.5 h-4 w-4 shrink-0 text-[var(--brand)]" />
                  <span>
                    1. Tap the <strong className="text-[var(--foreground)]">Share</strong> icon at
                    the bottom of Safari.
                  </span>
                </li>
                <li className="flex items-start gap-2.5">
                  <PlusSquare className="mt-0.5 h-4 w-4 shrink-0 text-[var(--brand)]" />
                  <span>
                    2. Scroll down and tap{' '}
                    <strong className="text-[var(--foreground)]">Add to Home Screen</strong>.
                  </span>
                </li>
                <li className="flex items-start gap-2.5">
                  <Smartphone className="mt-0.5 h-4 w-4 shrink-0 text-[var(--brand)]" />
                  <span>
                    3. Tap <strong className="text-[var(--foreground)]">Add</strong> in the top
                    right—RelayOps now opens like a native app.
                  </span>
                </li>
              </ol>
            ) : platform === 'ios-other' ? (
              <ol className="mt-4 space-y-3 rounded-xl border border-[var(--line)] bg-[var(--sidebar)] p-3.5 text-xs leading-relaxed text-[var(--muted)]">
                <li className="flex items-start gap-2.5">
                  <Share className="mt-0.5 h-4 w-4 shrink-0 text-[var(--brand)]" />
                  <span>
                    1. Tap the <strong className="text-[var(--foreground)]">Share</strong> button in
                    your browser bar (or open this link in{' '}
                    <strong className="text-[var(--foreground)]">Safari</strong>).
                  </span>
                </li>
                <li className="flex items-start gap-2.5">
                  <PlusSquare className="mt-0.5 h-4 w-4 shrink-0 text-[var(--brand)]" />
                  <span>
                    2. Choose{' '}
                    <strong className="text-[var(--foreground)]">Add to Home Screen</strong> and tap{' '}
                    <strong className="text-[var(--foreground)]">Add</strong>.
                  </span>
                </li>
              </ol>
            ) : isAndroid || isMobileViewport ? (
              <ol className="mt-4 space-y-3 rounded-xl border border-[var(--line)] bg-[var(--sidebar)] p-3.5 text-xs leading-relaxed text-[var(--muted)]">
                <li className="flex items-start gap-2.5">
                  <MoreVertical className="mt-0.5 h-4 w-4 shrink-0 text-[var(--brand)]" />
                  <span>
                    1. Tap the <strong className="text-[var(--foreground)]">⋮ menu</strong> in
                    Chrome (or open in Chrome outside an embedded viewer).
                  </span>
                </li>
                <li className="flex items-start gap-2.5">
                  <PlusSquare className="mt-0.5 h-4 w-4 shrink-0 text-[var(--brand)]" />
                  <span>
                    2. Tap <strong className="text-[var(--foreground)]">Install app</strong> or{' '}
                    <strong className="text-[var(--foreground)]">Add to Home screen</strong>.
                  </span>
                </li>
                <li className="flex items-start gap-2.5">
                  <Smartphone className="mt-0.5 h-4 w-4 shrink-0 text-[var(--brand)]" />
                  <span>
                    3. Confirm <strong className="text-[var(--foreground)]">Install</strong> to add
                    the RelayOps icon directly to your home screen.
                  </span>
                </li>
              </ol>
            ) : (
              <ol className="mt-4 space-y-2.5 rounded-xl border border-[var(--line)] bg-[var(--sidebar)] p-3.5 text-xs leading-relaxed text-[var(--muted)]">
                <li>
                  1. Open this app directly in Chrome, Edge, or Safari (outside an embedded preview).
                </li>
                <li>
                  2. Click the <strong className="text-[var(--foreground)]">Install</strong> icon in
                  the address bar, or open the browser menu and select{' '}
                  <strong className="text-[var(--foreground)]">Install RelayOps</strong>.
                </li>
              </ol>
            )}

            <button
              type="button"
              onClick={() => setShowGuide(false)}
              className="mt-4 min-h-[44px] w-full rounded-xl bg-[var(--brand-solid)] px-4 py-2.5 text-xs font-semibold text-white transition hover:bg-[var(--brand-hover)]"
            >
              Got it
            </button>
          </div>
        </div>
      )}
    </>
  );
};

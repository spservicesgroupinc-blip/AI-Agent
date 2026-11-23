import { useEffect, useState, useCallback } from 'react';
import {
  detectPwaPlatform,
  isBannerDismissedRecently,
  type PwaPlatform,
} from '../utils/pwaHelpers';
import { safeGetStorage, safeSetStorage } from '../utils/storage';

const BANNER_DISMISSED_KEY = 'ro_pwa_banner_dismissed_at_v1';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

declare global {
  interface Window {
    __deferredPwaPrompt?: BeforeInstallPromptEvent | null;
  }
}

export interface PWAInstallState {
  isInstallable: boolean;
  isInstalled: boolean;
  isIOS: boolean;
  isAndroid: boolean;
  isMobileDevice: boolean;
  platform: PwaPlatform;
  bannerDismissed: boolean;
  dismissBanner: () => void;
  install: () => Promise<boolean>;
}

function readStandalone(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    window.matchMedia('(display-mode: minimal-ui)').matches ||
    (window.navigator as unknown as { standalone?: boolean }).standalone === true
  );
}

export function usePWAInstall(): PWAInstallState {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(() => {
    if (typeof window === 'undefined') return null;
    return window.__deferredPwaPrompt ?? null;
  });
  const [isInstalled, setIsInstalled] = useState<boolean>(readStandalone);
  const [platformInfo, setPlatformInfo] = useState(() => {
    if (typeof window === 'undefined') {
      return detectPwaPlatform('');
    }
    return detectPwaPlatform(
      window.navigator.userAgent,
      window.navigator.platform,
      window.navigator.maxTouchPoints
    );
  });
  const [bannerDismissed, setBannerDismissed] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    const raw = safeGetStorage(window.localStorage, BANNER_DISMISSED_KEY, '');
    return isBannerDismissedRecently(raw);
  });

  useEffect(() => {
    const standaloneMedia = window.matchMedia('(display-mode: standalone)');
    const syncStandalone = () => setIsInstalled(readStandalone());

    syncStandalone();
    setPlatformInfo(
      detectPwaPlatform(
        window.navigator.userAgent,
        window.navigator.platform,
        window.navigator.maxTouchPoints
      )
    );

    if (window.__deferredPwaPrompt) {
      setDeferredPrompt(window.__deferredPwaPrompt);
    }

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      const promptEvent = e as BeforeInstallPromptEvent;
      window.__deferredPwaPrompt = promptEvent;
      setDeferredPrompt(promptEvent);
    };

    const handleAppInstalled = () => {
      window.__deferredPwaPrompt = null;
      setIsInstalled(true);
      setDeferredPrompt(null);
    };

    standaloneMedia.addEventListener('change', syncStandalone);
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      standaloneMedia.removeEventListener('change', syncStandalone);
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const install = useCallback(async (): Promise<boolean> => {
    const activePrompt = deferredPrompt || window.__deferredPwaPrompt;
    if (!activePrompt) return false;
    try {
      await activePrompt.prompt();
      const { outcome } = await activePrompt.userChoice;
      if (outcome === 'accepted') {
        window.__deferredPwaPrompt = null;
        setIsInstalled(true);
        setDeferredPrompt(null);
        return true;
      }
    } catch {
      // Prompt may already have been consumed; fall back gracefully
      window.__deferredPwaPrompt = null;
      setDeferredPrompt(null);
    }
    return false;
  }, [deferredPrompt]);

  const dismissBanner = useCallback(() => {
    setBannerDismissed(true);
    safeSetStorage(window.localStorage, BANNER_DISMISSED_KEY, String(Date.now()));
  }, []);

  return {
    isInstallable: Boolean(deferredPrompt),
    isInstalled,
    isIOS: platformInfo.isIOS,
    isAndroid: platformInfo.isAndroid,
    isMobileDevice: platformInfo.isMobile,
    platform: platformInfo.platform,
    bannerDismissed,
    dismissBanner,
    install,
  };
}

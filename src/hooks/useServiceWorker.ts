import { useEffect, useRef, useState, useCallback } from 'react';
import { registerSW } from 'virtual:pwa-register';

export function useServiceWorker() {
  const [offlineReady, setOfflineReady] = useState(false);
  const [needRefresh, setNeedRefresh] = useState(false);
  const [swRegistered, setSwRegistered] = useState(false);
  const updateSWRef = useRef<((reloadPage?: boolean) => Promise<void>) | null>(null);
  const registrationRef = useRef<ServiceWorkerRegistration | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;

    try {
      const updateSW = registerSW({
        immediate: true,
        onRegisteredSW(_swUrl, registration) {
          setSwRegistered(true);
          if (registration) {
            registrationRef.current = registration;
          }
        },
        onOfflineReady() {
          setOfflineReady(true);
          setSwRegistered(true);
        },
        onNeedRefresh() {
          setNeedRefresh(true);
        },
        onRegisterError() {
          // Graceful fallback in restricted environments
        },
      });
      updateSWRef.current = updateSW;
    } catch {
      // Ignore registration failure in restricted environments
    }

    // Check for fresh app builds whenever the installed phone app resumes to foreground
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && registrationRef.current) {
        registrationRef.current.update().catch(() => {
          // Ignore offline update check failures
        });
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  const updateServiceWorker = useCallback(async () => {
    if (updateSWRef.current) {
      await updateSWRef.current(true);
    } else {
      window.location.reload();
    }
  }, []);

  const dismissOfflineReady = useCallback(() => setOfflineReady(false), []);
  const dismissNeedRefresh = useCallback(() => setNeedRefresh(false), []);

  return {
    swRegistered,
    offlineReady,
    needRefresh,
    updateServiceWorker,
    dismissOfflineReady,
    dismissNeedRefresh,
  };
}

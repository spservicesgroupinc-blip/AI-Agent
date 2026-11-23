export type PwaPlatform = 'ios-safari' | 'ios-other' | 'android' | 'desktop';

export interface PwaPlatformInfo {
  platform: PwaPlatform;
  isIOS: boolean;
  isAndroid: boolean;
  isMobile: boolean;
}

export function detectPwaPlatform(
  userAgent: string,
  platform = '',
  maxTouchPoints = 0
): PwaPlatformInfo {
  const ua = String(userAgent || '');
  const isIPadDesktopMode = platform === 'MacIntel' && maxTouchPoints > 1;
  const isIOS = /iphone|ipad|ipod/i.test(ua) || isIPadDesktopMode;
  const isAndroid = /android/i.test(ua);

  if (isIOS) {
    // Non-Safari browsers on iOS include CriOS (Chrome), FxiOS (Firefox), EdgiOS (Edge), OPiOS, GSA
    const isNonSafariIOS = /CriOS|FxiOS|EdgiOS|OPiOS|GSA|FBAN|FBAV|Instagram|Line\//i.test(ua);
    return {
      platform: isNonSafariIOS ? 'ios-other' : 'ios-safari',
      isIOS: true,
      isAndroid: false,
      isMobile: true,
    };
  }

  if (isAndroid) {
    return {
      platform: 'android',
      isIOS: false,
      isAndroid: true,
      isMobile: true,
    };
  }

  return {
    platform: 'desktop',
    isIOS: false,
    isAndroid: false,
    isMobile: /mobile|tablet/i.test(ua),
  };
}

export type ShortcutAction = 'new-task' | 'schedule' | 'research' | null;

export function parseShortcutAction(search: string): ShortcutAction {
  try {
    const params = new URLSearchParams(search);
    const action = params.get('action');
    if (action === 'new-task' || action === 'schedule' || action === 'research') {
      return action;
    }
    return null;
  } catch {
    return null;
  }
}

export function isBannerDismissedRecently(
  dismissedAtRaw: string,
  nowMs: number = Date.now(),
  cooldownMs: number = 1000 * 60 * 60 * 24 * 7
): boolean {
  const ts = Number(dismissedAtRaw);
  if (!Number.isFinite(ts) || ts <= 0) return false;
  return nowMs - ts < cooldownMs;
}

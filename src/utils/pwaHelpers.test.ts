import test from 'node:test';
import assert from 'node:assert/strict';
import {
  detectPwaPlatform,
  isBannerDismissedRecently,
  parseShortcutAction,
} from './pwaHelpers.ts';

test('detectPwaPlatform identifies iOS Safari, iOS Chrome/in-app, iPadOS, Android, and Desktop', () => {
  const iphoneSafari = detectPwaPlatform(
    'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1'
  );
  assert.equal(iphoneSafari.platform, 'ios-safari');
  assert.equal(iphoneSafari.isIOS, true);
  assert.equal(iphoneSafari.isMobile, true);

  const iphoneChrome = detectPwaPlatform(
    'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/130.0.0.0 Mobile/15E148 Safari/604.1'
  );
  assert.equal(iphoneChrome.platform, 'ios-other');
  assert.equal(iphoneChrome.isIOS, true);

  const ipadDesktopUa = detectPwaPlatform(
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Safari/605.1.15',
    'MacIntel',
    5
  );
  assert.equal(ipadDesktopUa.platform, 'ios-safari');
  assert.equal(ipadDesktopUa.isIOS, true);

  const androidChrome = detectPwaPlatform(
    'Mozilla/5.0 (Linux; Android 15; Pixel 9) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36'
  );
  assert.equal(androidChrome.platform, 'android');
  assert.equal(androidChrome.isAndroid, true);
  assert.equal(androidChrome.isMobile, true);

  const desktop = detectPwaPlatform(
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36'
  );
  assert.equal(desktop.platform, 'desktop');
  assert.equal(desktop.isMobile, false);
});

test('parseShortcutAction handles all PWA manifest shortcuts safely', () => {
  assert.equal(parseShortcutAction('?action=new-task'), 'new-task');
  assert.equal(parseShortcutAction('?action=schedule'), 'schedule');
  assert.equal(parseShortcutAction('?action=research'), 'research');
  assert.equal(parseShortcutAction('?action=unknown'), null);
  assert.equal(parseShortcutAction(''), null);
});

test('isBannerDismissedRecently respects 7-day cooldown window', () => {
  const now = 1_750_000_000_000;
  const oneDayAgo = String(now - 1000 * 60 * 60 * 24);
  const tenDaysAgo = String(now - 1000 * 60 * 60 * 24 * 10);

  assert.equal(isBannerDismissedRecently('', now), false);
  assert.equal(isBannerDismissedRecently('invalid', now), false);
  assert.equal(isBannerDismissedRecently(oneDayAgo, now), true);
  assert.equal(isBannerDismissedRecently(tenDaysAgo, now), false);
});

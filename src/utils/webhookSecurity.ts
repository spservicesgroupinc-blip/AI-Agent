import net from 'node:net';

export const PRODUCTION_WEBHOOK_URL =
  'https://spservicesincrr.app.n8n.cloud/webhook/personal-assistant-chat';

const DEFAULT_ALLOWED_HOST = new URL(PRODUCTION_WEBHOOK_URL).hostname.toLowerCase();

function isPrivateOrLoopbackIp(ip: string): boolean {
  const normalized = ip.toLowerCase().replace(/^\[|\]$/g, '');
  if (
    normalized === '::1' ||
    normalized === '::' ||
    normalized.startsWith('fe80:') ||
    normalized.startsWith('fc') ||
    normalized.startsWith('fd')
  ) {
    return true;
  }
  const v4 = normalized.startsWith('::ffff:') ? normalized.slice(7) : normalized;
  const parts = v4.split('.').map(Number);
  if (parts.length !== 4 || parts.some((n) => Number.isNaN(n) || n < 0 || n > 255)) {
    return false;
  }
  const [a, b] = parts;
  if (a === 10) return true;
  if (a === 127) return true;
  if (a === 0) return true;
  if (a === 169 && b === 254) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 192 && b === 168) return true;
  if (a === 100 && b >= 64 && b <= 127) return true;
  return false;
}

export function isPublicWebhookHost(hostname: string): boolean {
  const host = hostname.trim().toLowerCase().replace(/^\[|\]$/g, '');
  if (!host || !host.includes('.')) return false;

  // Block loopback, local, internal hostnames, and raw IP literals
  if (
    host === 'localhost' ||
    host.endsWith('.localhost') ||
    host.endsWith('.local') ||
    host.endsWith('.internal') ||
    net.isIP(host) !== 0 ||
    isPrivateOrLoopbackIp(host)
  ) {
    return false;
  }

  return true;
}

export function isAllowedWebhookHost(
  hostname: string,
  extraAllowedHosts: string[] = []
): boolean {
  const host = hostname.trim().toLowerCase().replace(/^\[|\]$/g, '');
  if (!isPublicWebhookHost(host)) {
    return false;
  }

  if (host === DEFAULT_ALLOWED_HOST || host.endsWith('.app.n8n.cloud')) {
    return true;
  }

  for (const allowed of extraAllowedHosts) {
    const clean = allowed.trim().toLowerCase();
    if (!clean) continue;
    if (host === clean || (clean.startsWith('*.') && host.endsWith(clean.slice(1)))) {
      return true;
    }
  }

  return false;
}

export type ProxyUrlValidationResult =
  | { ok: true; url: string }
  | { ok: false; error: string };

export function validateServerSecretWebhookUrl(rawUrl: string): ProxyUrlValidationResult {
  const trimmed = String(rawUrl || '').trim();
  if (!trimmed) {
    return { ok: false, error: 'N8N_WEBHOOK_URL secret is empty.' };
  }

  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    return { ok: false, error: 'The N8N_WEBHOOK_URL secret is not a valid URL.' };
  }

  if (parsed.protocol !== 'https:') {
    return { ok: false, error: 'The N8N_WEBHOOK_URL secret must use HTTPS.' };
  }

  if (parsed.username || parsed.password) {
    return {
      ok: false,
      error: 'The N8N_WEBHOOK_URL secret cannot contain embedded credentials.',
    };
  }

  if (!isPublicWebhookHost(parsed.hostname)) {
    return {
      ok: false,
      error: 'The N8N_WEBHOOK_URL secret must point to a public HTTPS hostname.',
    };
  }

  return { ok: true, url: parsed.toString() };
}

export function validateProxyWebhookUrl(
  rawUrl: string,
  extraAllowedHosts: string[] = []
): ProxyUrlValidationResult {
  const trimmed = String(rawUrl || '').trim();
  if (!trimmed) {
    return { ok: true, url: PRODUCTION_WEBHOOK_URL };
  }

  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    return { ok: false, error: 'Invalid webhook URL format.' };
  }

  if (parsed.protocol !== 'https:') {
    return { ok: false, error: 'Webhook URL must use HTTPS.' };
  }

  if (parsed.username || parsed.password) {
    return { ok: false, error: 'Embedded credentials in webhook URL are not allowed.' };
  }

  if (!isAllowedWebhookHost(parsed.hostname, extraAllowedHosts)) {
    return {
      ok: false,
      error:
        'Webhook host is not in the allowed n8n host list. Use an *.app.n8n.cloud URL or configure N8N_WEBHOOK_URL / ALLOWED_WEBHOOK_HOSTS on the server.',
    };
  }

  return { ok: true, url: parsed.toString() };
}

export type ResolvedWebhookResult =
  | { ok: true; url: string; source: 'override' | 'secret' | 'default' }
  | { ok: false; error: string; status: 400 | 500 };

export function resolveTargetWebhookUrl(
  requestedOverride: string,
  envSecretUrl: string | undefined,
  extraAllowedHosts: string[] = []
): ResolvedWebhookResult {
  const override = String(requestedOverride || '').trim();
  const secretRaw = String(envSecretUrl || '').trim();

  let secretHost: string | null = null;
  if (secretRaw) {
    const secretCheck = validateServerSecretWebhookUrl(secretRaw);
    if (secretCheck.ok) {
      secretHost = new URL(secretCheck.url).hostname.toLowerCase();
    }
  }

  if (override) {
    const allowedHosts = secretHost ? [...extraAllowedHosts, secretHost] : extraAllowedHosts;
    const overrideCheck = validateProxyWebhookUrl(override, allowedHosts);
    if (!overrideCheck.ok) {
      return { ok: false, error: overrideCheck.error, status: 400 };
    }
    return { ok: true, url: overrideCheck.url, source: 'override' };
  }

  if (secretRaw) {
    const secretCheck = validateServerSecretWebhookUrl(secretRaw);
    if (!secretCheck.ok) {
      return { ok: false, error: secretCheck.error, status: 500 };
    }
    return { ok: true, url: secretCheck.url, source: 'secret' };
  }

  return { ok: true, url: PRODUCTION_WEBHOOK_URL, source: 'default' };
}

export interface ServerWebhookInfo {
  usingServerSecret: boolean;
  webhookHost: string | null;
  isInvalidSecret: boolean;
}

export function getServerWebhookInfo(envSecretUrl: string | undefined): ServerWebhookInfo {
  const secretRaw = String(envSecretUrl || '').trim();
  if (!secretRaw) {
    return {
      usingServerSecret: false,
      webhookHost: DEFAULT_ALLOWED_HOST,
      isInvalidSecret: false,
    };
  }

  const check = validateServerSecretWebhookUrl(secretRaw);
  if (!check.ok) {
    return {
      usingServerSecret: true,
      webhookHost: null,
      isInvalidSecret: true,
    };
  }

  return {
    usingServerSecret: true,
    webhookHost: new URL(check.url).hostname.toLowerCase(),
    isInvalidSecret: false,
  };
}

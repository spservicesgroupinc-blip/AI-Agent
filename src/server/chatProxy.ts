import {
  getServerWebhookInfo,
  resolveTargetWebhookUrl,
  type ServerWebhookInfo,
} from '../utils/webhookSecurity.ts';

export const MAX_CHAT_PAYLOAD_BYTES = 64 * 1024;

export interface ConfigHandlerResult {
  status: number;
  body: ServerWebhookInfo;
}

export interface ChatHandlerResult {
  status: number;
  contentType: string;
  body: string;
}

export function getExtraAllowedHosts(env: Record<string, string | undefined>): string[] {
  return String(env.ALLOWED_WEBHOOK_HOSTS || '')
    .split(',')
    .map((h) => h.trim())
    .filter(Boolean);
}

export function handleConfigRequest(
  env: Record<string, string | undefined>
): ConfigHandlerResult {
  return {
    status: 200,
    body: getServerWebhookInfo(env.N8N_WEBHOOK_URL),
  };
}

export async function handleChatRequest(
  rawBody: unknown,
  env: Record<string, string | undefined>,
  options: { timeoutMs?: number; fetchImpl?: typeof fetch } = {}
): Promise<ChatHandlerResult> {
  const timeoutMs = options.timeoutMs ?? 120000;
  const fetchFn = options.fetchImpl ?? fetch;

  if (!rawBody || typeof rawBody !== 'object' || Array.isArray(rawBody)) {
    return {
      status: 400,
      contentType: 'application/json; charset=utf-8',
      body: JSON.stringify({ error: 'Invalid JSON request body.' }),
    };
  }

  const body = rawBody as Record<string, unknown>;
  const sessionId = typeof body.sessionId === 'string' ? body.sessionId.trim() : '';
  const message = typeof body.message === 'string' ? body.message.trim() : '';
  const requestedUrl = typeof body.webhookUrl === 'string' ? body.webhookUrl.trim() : '';
  const authUser = typeof body.authUser === 'string' ? body.authUser.trim() : '';
  const authPass = typeof body.authPass === 'string' ? body.authPass : '';
  const timezone = typeof body.timezone === 'string' ? body.timezone.trim().slice(0, 80) : '';
  const companyName =
    typeof body.companyName === 'string' ? body.companyName.trim().slice(0, 120) : '';

  if (!sessionId || sessionId.length > 128) {
    return {
      status: 400,
      contentType: 'application/json; charset=utf-8',
      body: JSON.stringify({ error: 'A valid sessionId is required.' }),
    };
  }
  if (!message || message.length > 16000) {
    return {
      status: 400,
      contentType: 'application/json; charset=utf-8',
      body: JSON.stringify({ error: 'A non-empty message (up to 16,000 chars) is required.' }),
    };
  }

  const target = resolveTargetWebhookUrl(
    requestedUrl,
    env.N8N_WEBHOOK_URL,
    getExtraAllowedHosts(env)
  );
  if (!target.ok) {
    return {
      status: target.status,
      contentType: 'application/json; charset=utf-8',
      body: JSON.stringify({ error: target.error }),
    };
  }

  try {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (authUser) {
      headers.Authorization =
        'Basic ' + Buffer.from(`${authUser}:${authPass}`, 'utf8').toString('base64');
    }

    const upstream = await fetchFn(target.url, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        sessionId,
        message,
        ...(timezone ? { timezone } : {}),
        ...(companyName ? { companyName } : {}),
      }),
      redirect: 'error',
      signal: AbortSignal.timeout(timeoutMs),
    });

    const rawText = await upstream.text();
    const upstreamType = upstream.headers.get('content-type') || 'application/json; charset=utf-8';

    return {
      status: upstream.status,
      contentType: upstreamType.includes('application/json')
        ? 'application/json; charset=utf-8'
        : upstreamType,
      body: rawText,
    };
  } catch (err) {
    const errMsg =
      err instanceof Error && err.name === 'TimeoutError'
        ? `The backend webhook timed out after ${Math.round(timeoutMs / 1000)} seconds.`
        : 'Could not reach the backend webhook endpoint.';
    return {
      status: 502,
      contentType: 'application/json; charset=utf-8',
      body: JSON.stringify({ error: errMsg }),
    };
  }
}

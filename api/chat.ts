import { MAX_CHAT_PAYLOAD_BYTES, handleChatRequest } from '../src/server/chatProxy.ts';

const RESPONSE_BASE_HEADERS = {
  'X-Relay-Proxy': '1',
  'Cache-Control': 'no-store',
};

export async function POST(request: Request): Promise<Response> {
  const contentLength = Number(request.headers.get('content-length') || '0');
  if (Number.isFinite(contentLength) && contentLength > MAX_CHAT_PAYLOAD_BYTES) {
    return new Response(JSON.stringify({ error: 'Request payload too large.' }), {
      status: 413,
      headers: {
        ...RESPONSE_BASE_HEADERS,
        'Content-Type': 'application/json; charset=utf-8',
      },
    });
  }

  let rawText: string;
  try {
    rawText = await request.text();
  } catch {
    return new Response(JSON.stringify({ error: 'Failed to read request body.' }), {
      status: 400,
      headers: {
        ...RESPONSE_BASE_HEADERS,
        'Content-Type': 'application/json; charset=utf-8',
      },
    });
  }

  if (Buffer.byteLength(rawText, 'utf8') > MAX_CHAT_PAYLOAD_BYTES) {
    return new Response(JSON.stringify({ error: 'Request payload too large.' }), {
      status: 413,
      headers: {
        ...RESPONSE_BASE_HEADERS,
        'Content-Type': 'application/json; charset=utf-8',
      },
    });
  }

  let parsedBody: unknown;
  try {
    parsedBody = JSON.parse(rawText);
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON request body.' }), {
      status: 400,
      headers: {
        ...RESPONSE_BASE_HEADERS,
        'Content-Type': 'application/json; charset=utf-8',
      },
    });
  }

  // Leave a 5-second safety margin inside Vercel's 60s function limit
  const result = await handleChatRequest(parsedBody, process.env, { timeoutMs: 55000 });
  return new Response(result.body, {
    status: result.status,
    headers: {
      ...RESPONSE_BASE_HEADERS,
      'Content-Type': result.contentType,
    },
  });
}

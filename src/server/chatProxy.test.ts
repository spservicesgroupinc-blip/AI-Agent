import test from 'node:test';
import assert from 'node:assert/strict';
import { handleChatRequest, handleConfigRequest } from './chatProxy.ts';
import { GET as vercelConfigGet } from '../../api/config.ts';
import { POST as vercelChatPost } from '../../api/chat.ts';

test('handleConfigRequest returns safe non-secret server metadata', () => {
  const res = handleConfigRequest({
    N8N_WEBHOOK_URL: 'https://n8n.myclient.com/webhook/secret-token-xyz',
  });
  assert.equal(res.status, 200);
  assert.deepEqual(res.body, {
    usingServerSecret: true,
    webhookHost: 'n8n.myclient.com',
    isInvalidSecret: false,
  });
});

test('handleChatRequest routes through N8N_WEBHOOK_URL and forwards optional timezone/companyName', async () => {
  let fetchedUrl = '';
  let fetchedBody = '';
  const mockFetch: typeof fetch = async (input, init) => {
    fetchedUrl = String(input);
    fetchedBody = String(init?.body || '');
    return new Response(JSON.stringify({ reply: 'All clear', sessionId: 'sess-1' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  };

  const res = await handleChatRequest(
    {
      sessionId: 'sess-1',
      message: 'Check schedule',
      timezone: 'America/Indiana/Indianapolis',
      companyName: 'TruChoice Roofing',
    },
    { N8N_WEBHOOK_URL: 'https://n8n.truchoice.com/webhook/assistant' },
    { fetchImpl: mockFetch }
  );

  assert.equal(res.status, 200);
  assert.equal(fetchedUrl, 'https://n8n.truchoice.com/webhook/assistant');
  assert.deepEqual(JSON.parse(fetchedBody), {
    sessionId: 'sess-1',
    message: 'Check schedule',
    timezone: 'America/Indiana/Indianapolis',
    companyName: 'TruChoice Roofing',
  });
  assert.deepEqual(JSON.parse(res.body), { reply: 'All clear', sessionId: 'sess-1' });
});

test('handleChatRequest rejects missing fields and invalid private URLs cleanly', async () => {
  const missingMsg = await handleChatRequest({ sessionId: 'sess-1', message: '   ' }, {});
  assert.equal(missingMsg.status, 400);

  const privateOverride = await handleChatRequest(
    {
      sessionId: 'sess-1',
      message: 'hi',
      webhookUrl: 'https://127.0.0.1/webhook/chat',
    },
    {}
  );
  assert.equal(privateOverride.status, 400);

  const badSecret = await handleChatRequest(
    { sessionId: 'sess-1', message: 'hi' },
    { N8N_WEBHOOK_URL: 'http://localhost:5678/webhook/chat' }
  );
  assert.equal(badSecret.status, 500);
});

test('Vercel api/config and api/chat handlers return X-Relay-Proxy and validate payloads', async () => {
  const cfgRes = vercelConfigGet();
  assert.equal(cfgRes.status, 200);
  assert.equal(cfgRes.headers.get('x-relay-proxy'), '1');
  assert.equal(cfgRes.headers.get('cache-control'), 'no-store');
  const cfgJson = (await cfgRes.json()) as { usingServerSecret: boolean };
  assert.equal(typeof cfgJson.usingServerSecret, 'boolean');

  const invalidJsonReq = new Request('https://example.vercel.app/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: '{broken',
  });
  const badRes = await vercelChatPost(invalidJsonReq);
  assert.equal(badRes.status, 400);
  assert.equal(badRes.headers.get('x-relay-proxy'), '1');

  const oversizedReq = new Request('https://example.vercel.app/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sessionId: 's', message: 'x'.repeat(70000) }),
  });
  const tooLargeRes = await vercelChatPost(oversizedReq);
  assert.equal(tooLargeRes.status, 413);
});

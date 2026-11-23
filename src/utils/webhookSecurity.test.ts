import test from 'node:test';
import assert from 'node:assert/strict';
import {
  PRODUCTION_WEBHOOK_URL,
  getServerWebhookInfo,
  resolveTargetWebhookUrl,
  validateProxyWebhookUrl,
} from './webhookSecurity.ts';

test('validateProxyWebhookUrl accepts production and n8n cloud HTTPS webhooks', () => {
  const empty = validateProxyWebhookUrl('');
  assert.deepEqual(empty, { ok: true, url: PRODUCTION_WEBHOOK_URL });

  const prod = validateProxyWebhookUrl(PRODUCTION_WEBHOOK_URL);
  assert.deepEqual(prod, { ok: true, url: PRODUCTION_WEBHOOK_URL });

  const otherCloud = validateProxyWebhookUrl('https://tenant.app.n8n.cloud/webhook/assistant');
  assert.equal(otherCloud.ok, true);

  const customAllowed = validateProxyWebhookUrl('https://n8n.myagency.com/webhook/chat', [
    'n8n.myagency.com',
  ]);
  assert.equal(customAllowed.ok, true);
});

test('validateProxyWebhookUrl blocks non-HTTPS, loopback, private IPs, and unapproved hosts', () => {
  assert.equal(validateProxyWebhookUrl('http://spservicesincrr.app.n8n.cloud/webhook/chat').ok, false);
  assert.equal(validateProxyWebhookUrl('https://localhost/webhook/chat').ok, false);
  assert.equal(validateProxyWebhookUrl('https://127.0.0.1/webhook/chat').ok, false);
  assert.equal(validateProxyWebhookUrl('https://169.254.169.254/latest/meta-data/').ok, false);
  assert.equal(validateProxyWebhookUrl('https://10.0.0.5/webhook/chat').ok, false);
  assert.equal(validateProxyWebhookUrl('https://192.168.1.10/webhook/chat').ok, false);
  assert.equal(validateProxyWebhookUrl('https://evil.example.com/hook').ok, false);
  assert.equal(
    validateProxyWebhookUrl('https://user:pass@spservicesincrr.app.n8n.cloud/webhook/chat').ok,
    false
  );
});

test('resolveTargetWebhookUrl uses N8N_WEBHOOK_URL secret by default, including custom public domains', () => {
  const customSecret = 'https://n8n.relayops.io/webhook/live-assistant';
  const res = resolveTargetWebhookUrl('', customSecret);
  assert.deepEqual(res, {
    ok: true,
    url: customSecret,
    source: 'secret',
  });

  // Falls back to PRODUCTION_WEBHOOK_URL when secret and override are unset
  const fallback = resolveTargetWebhookUrl('', '');
  assert.deepEqual(fallback, {
    ok: true,
    url: PRODUCTION_WEBHOOK_URL,
    source: 'default',
  });
});

test('resolveTargetWebhookUrl rejects malformed or internal N8N_WEBHOOK_URL secrets with 500', () => {
  const httpSecret = resolveTargetWebhookUrl('', 'http://n8n.relayops.io/webhook/chat');
  assert.equal(httpSecret.ok, false);
  if (!httpSecret.ok) assert.equal(httpSecret.status, 500);

  const privateSecret = resolveTargetWebhookUrl('', 'https://127.0.0.1/webhook/chat');
  assert.equal(privateSecret.ok, false);
  if (!privateSecret.ok) assert.equal(privateSecret.status, 500);

  const singleLabelSecret = resolveTargetWebhookUrl('', 'https://metadata/computeMetadata/v1');
  assert.equal(singleLabelSecret.ok, false);
  if (!singleLabelSecret.ok) assert.equal(singleLabelSecret.status, 500);
});

test('resolveTargetWebhookUrl enforces allowlist on client overrides while permitting secret host', () => {
  const secret = 'https://n8n.relayops.io/webhook/live-assistant';
  const sameHostOverride = resolveTargetWebhookUrl(
    'https://n8n.relayops.io/webhook/staging-assistant',
    secret
  );
  assert.deepEqual(sameHostOverride, {
    ok: true,
    url: 'https://n8n.relayops.io/webhook/staging-assistant',
    source: 'override',
  });

  const unapprovedOverride = resolveTargetWebhookUrl('https://evil.example.com/hook', secret);
  assert.equal(unapprovedOverride.ok, false);
  if (!unapprovedOverride.ok) assert.equal(unapprovedOverride.status, 400);
});

test('getServerWebhookInfo returns only safe hostname metadata and never leaks paths', () => {
  const defaultInfo = getServerWebhookInfo('');
  assert.deepEqual(defaultInfo, {
    usingServerSecret: false,
    webhookHost: 'spservicesincrr.app.n8n.cloud',
    isInvalidSecret: false,
  });

  const secretInfo = getServerWebhookInfo(
    'https://hooks.clientdomain.com/webhook/super-secret-token-123?key=abc'
  );
  assert.deepEqual(secretInfo, {
    usingServerSecret: true,
    webhookHost: 'hooks.clientdomain.com',
    isInvalidSecret: false,
  });
  assert.equal(JSON.stringify(secretInfo).includes('super-secret-token-123'), false);

  const invalidInfo = getServerWebhookInfo('http://localhost:5678/webhook/test');
  assert.deepEqual(invalidInfo, {
    usingServerSecret: true,
    webhookHost: null,
    isInvalidSecret: true,
  });
});

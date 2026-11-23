import test from 'node:test';
import assert from 'node:assert/strict';
import {
  DEFAULT_WEBHOOK_URL,
  buildQuickTaskPrompt,
  extractDocsFromText,
  extractReplyText,
  extractResourceLinks,
  getCompanyInitials,
  parseInlineTokens,
  parseMarkdownBlocks,
  parseWebhookResponse,
  validateWebhookUrl,
} from './chatLogic';

test('buildQuickTaskPrompt formats task requests with optional due date and notes', () => {
  const full = buildQuickTaskPrompt({
    title: 'Send Q4 budget review',
    dueDate: '2026-11-28',
    notes: 'Include revised forecast',
  });
  assert.equal(full.ok, true);
  if (full.ok) {
    assert.equal(
      full.prompt,
      'Add a task: "Send Q4 budget review" due 2026-11-28 with notes: Include revised forecast'
    );
  }

  const minimal = buildQuickTaskPrompt({
    title: 'Call vendor',
    dueDate: '',
    notes: '',
  });
  assert.equal(minimal.ok, true);
  if (minimal.ok) {
    assert.equal(minimal.prompt, 'Add a task: "Call vendor"');
  }
});

test('buildQuickTaskPrompt validates missing task title', () => {
  const empty = buildQuickTaskPrompt({
    title: '   ',
    dueDate: '2026-11-28',
    notes: '',
  });
  assert.equal(empty.ok, false);
  if (!empty.ok) assert.equal(empty.field, 'title');
});

test('parseWebhookResponse handles reply, output fallback, double-encoded JSON, plain text, HTML rejection, and errors', () => {
  const primary = parseWebhookResponse('{"reply":"Draft saved in Gmail","sessionId":"sess-42"}');
  assert.deepEqual(primary, {
    ok: true,
    reply: 'Draft saved in Gmail',
    sessionId: 'sess-42',
  });

  const fallback = parseWebhookResponse('{"output":"Fallback output text","sessionId":"sess-99"}');
  assert.deepEqual(fallback, {
    ok: true,
    reply: 'Fallback output text',
    sessionId: 'sess-99',
  });

  const arrayResp = parseWebhookResponse('[{"reply":"Array wrapped reply"}]');
  assert.deepEqual(arrayResp, {
    ok: true,
    reply: 'Array wrapped reply',
    sessionId: undefined,
  });

  const doubleEncoded = parseWebhookResponse(
    JSON.stringify(JSON.stringify({ reply: 'Unwrapped reply', sessionId: 'sess-7' }))
  );
  assert.deepEqual(doubleEncoded, {
    ok: true,
    reply: 'Unwrapped reply',
    sessionId: 'sess-7',
  });

  const rawNewlines = parseWebhookResponse('{"reply":"Line 1\nLine 2","sessionId":"sess-nl"}');
  assert.deepEqual(rawNewlines, {
    ok: true,
    reply: 'Line 1\nLine 2',
    sessionId: 'sess-nl',
  });

  const plainText = parseWebhookResponse('Plain assistant text response');
  assert.deepEqual(plainText, {
    ok: true,
    reply: 'Plain assistant text response',
  });

  const htmlPage = parseWebhookResponse('<!doctype html><html><body>SPA</body></html>');
  assert.equal(htmlPage.ok, false);
  if (!htmlPage.ok) {
    assert.match(htmlPage.error, /HTML/i);
  }

  const malformedJson = parseWebhookResponse('{"reply": broken');
  assert.equal(malformedJson.ok, false);

  const missingFields = parseWebhookResponse('{"status":"ok"}');
  assert.equal(missingFields.ok, false);
  if (!missingFields.ok) {
    assert.match(missingFields.error, /reply|output/i);
  }

  const emptyResp = parseWebhookResponse('   ');
  assert.equal(emptyResp.ok, false);

  assert.equal(extractReplyText('{"reply":"Hello from webhook"}'), 'Hello from webhook');
});

test('extractResourceLinks and extractDocsFromText classify Drive, Sheets, Docs, Gmail, Calendar, and Web research links', () => {
  const input = [
    '## Drive & Research Results',
    '- [Q4 Proposal](https://drive.google.com/file/d/abc123/view)',
    '- [Tasks Tracker](https://docs.google.com/spreadsheets/d/xyz789/edit)',
    '- [Meeting Notes](https://docs.google.com/document/d/doc456/edit)',
    '- Draft: https://mail.google.com/mail/u/0/#drafts',
    '- Calendar: https://calendar.google.com/calendar/event?eid=123',
    '- Source: [Tavily Pricing](https://www.tavily.com/pricing)',
    '- Bare source: https://docs.n8n.io/workflows/chat/',
  ].join('\n');

  const links = extractResourceLinks(input);
  assert.deepEqual(links.driveUrls, ['https://drive.google.com/file/d/abc123/view']);
  assert.deepEqual(links.sheetUrls, ['https://docs.google.com/spreadsheets/d/xyz789/edit']);
  assert.deepEqual(links.docUrls, ['https://docs.google.com/document/d/doc456/edit']);
  assert.deepEqual(links.gmailUrls, ['https://mail.google.com/mail/u/0/#drafts']);
  assert.deepEqual(links.calendarUrls, ['https://calendar.google.com/calendar/event?eid=123']);
  assert.deepEqual(links.webSources, [
    {
      url: 'https://www.tavily.com/pricing',
      host: 'tavily.com',
      label: 'Tavily Pricing',
    },
    {
      url: 'https://docs.n8n.io/workflows/chat/',
      host: 'docs.n8n.io',
      label: 'docs.n8n.io',
    },
  ]);

  const firstPass = extractDocsFromText(input, [], '9:45 AM');
  assert.equal(firstPass.addedCount, 6);
  assert.equal(firstPass.docs.length, 6);
  assert.equal(firstPass.docs.some((d) => d.label === 'Q4 Proposal' && d.type === 'Drive'), true);
  assert.equal(firstPass.docs.some((d) => d.label === 'Tasks Tracker' && d.type === 'Sheet'), true);
  assert.equal(firstPass.docs.some((d) => d.label === 'Meeting Notes' && d.type === 'Doc'), true);
  assert.equal(firstPass.docs.some((d) => d.label === 'Tavily Pricing' && d.type === 'Web'), true);
  assert.equal(firstPass.docs.some((d) => d.label === 'docs.n8n.io' && d.type === 'Web'), true);

  const secondPass = extractDocsFromText(input, firstPass.docs, '9:46 AM');
  assert.equal(secondPass.addedCount, 0);
  assert.equal(secondPass.docs.length, 6);
});

test('parseMarkdownBlocks and parseInlineTokens render safely without javascript: links', () => {
  const blocks = parseMarkdownBlocks(
    '# Summary\n- **Total**: `+$2,500.00`\n- [Open File](https://drive.google.com/file/d/1/view)\n---\n1. First step\n2. Second step\nCheck [bad](javascript:alert(1))'
  );
  assert.equal(blocks.length, 5);
  assert.equal(blocks[0].type, 'heading');
  assert.equal(blocks[1].type, 'list');
  assert.equal(blocks[2].type, 'divider');
  assert.equal(blocks[3].type, 'ordered-list');
  assert.equal(blocks[4].type, 'paragraph');

  const inline = parseInlineTokens('See [bad](javascript:alert(1)) and **safe**');
  assert.equal(inline.some((t) => t.type === 'link'), false);
  assert.equal(inline.some((t) => t.type === 'bold' && t.value === 'safe'), true);
});

test('validateWebhookUrl accepts production endpoint and rejects unsafe protocols', () => {
  assert.equal(
    DEFAULT_WEBHOOK_URL,
    'https://spservicesincrr.app.n8n.cloud/webhook/personal-assistant-chat'
  );
  assert.equal(validateWebhookUrl(DEFAULT_WEBHOOK_URL), true);
  assert.equal(validateWebhookUrl('https://example.com/webhook/chat'), true);
  assert.equal(validateWebhookUrl('http://localhost:5678/webhook/test'), true);
  assert.equal(validateWebhookUrl('javascript:alert(1)'), false);
  assert.equal(validateWebhookUrl('not-a-url'), false);
  assert.equal(validateWebhookUrl(''), false);
});

test('getCompanyInitials derives crisp 2-letter emblems for any client company', () => {
  assert.equal(getCompanyInitials('Northstar Builders'), 'NB');
  assert.equal(getCompanyInitials('Apex'), 'AP');
  assert.equal(getCompanyInitials('   '), 'PA');
});

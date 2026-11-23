import type { QuickTaskInput, SessionDoc } from '../types';

export const DEFAULT_WEBHOOK_URL =
  'https://spservicesincrr.app.n8n.cloud/webhook/personal-assistant-chat';

export const STORAGE_KEYS = {
  WEBHOOK: 'ro_pa_webhook_url_v1',
  SESSION_ID: 'ro_pa_session_id_v1',
  MESSAGES: 'ro_pa_messages_v1',
  DOCS: 'ro_pa_docs_v1',
  OUTBOX: 'ro_pa_outbox_v1',
  THEME: 'ro_chat_theme_v1',
  COMPANY_NAME: 'ro_pa_company_name_v1',
  WORKSPACE_SUBTITLE: 'ro_pa_workspace_subtitle_v1',
  AUTH_USER: 'ro_pa_auth_user_v1',
  AUTH_PASS: 'ro_pa_auth_pass_v1',
} as const;

export const WORKING_STEPS = [
  'Sending request to assistant...',
  'Checking Gmail, Calendar, Tasks, Drive, and web sources...',
  'Synthesizing findings and links...',
] as const;

export function getCompanyInitials(companyName: string): string {
  const words = companyName
    .trim()
    .split(/[\s+\-_/]+/)
    .filter(Boolean);
  if (words.length === 0) return 'PA';
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[1][0]).toUpperCase();
}

export function generateSessionId(): string {
  return 'ro-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 8);
}

export function generateId(prefix = 'id'): string {
  return prefix + '-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 7);
}

export function nowTimeLabel(date: Date = new Date()): string {
  return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

export function validateWebhookUrl(url: string): boolean {
  const trimmed = url.trim();
  if (!/^https?:\/\//i.test(trimmed)) return false;
  try {
    const parsed = new URL(trimmed);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

export function isSafeHttpUrl(url: string): boolean {
  return validateWebhookUrl(url);
}

export type QuickTaskBuildResult =
  | { ok: true; prompt: string }
  | { ok: false; field: 'title'; error: string };

export function buildQuickTaskPrompt(input: QuickTaskInput): QuickTaskBuildResult {
  const title = input.title.trim();
  const dueDate = input.dueDate.trim();
  const notes = input.notes.trim();

  if (!title) {
    return { ok: false, field: 'title', error: 'Enter a task title first.' };
  }

  const parts: string[] = [`Add a task: "${title}"`];
  if (dueDate) {
    parts.push(`due ${dueDate}`);
  }
  if (notes) {
    parts.push(`with notes: ${notes}`);
  }

  return { ok: true, prompt: parts.join(' ') };
}

export type WebhookParseResult =
  | { ok: true; reply: string; sessionId?: string }
  | { ok: false; error: string };

function tryParseJsonLoose(text: string): { ok: true; value: unknown } | { ok: false } {
  try {
    return { ok: true, value: JSON.parse(text) };
  } catch {
    // Handle n8n templates that interpolate raw newlines/tabs inside JSON strings
    const sanitized = text.replace(/\r\n/g, '\\n').replace(/\n/g, '\\n').replace(/\t/g, '\\t');
    try {
      return { ok: true, value: JSON.parse(sanitized) };
    } catch {
      return { ok: false };
    }
  }
}

function isHtmlPayload(text: string): boolean {
  const lower = text.trimStart().slice(0, 120).toLowerCase();
  return (
    lower.startsWith('<!doctype html') ||
    lower.startsWith('<html') ||
    lower.startsWith('<head') ||
    lower.startsWith('<body') ||
    lower.startsWith('<!doctype')
  );
}

/**
 * Parses backend webhook responses expecting:
 *   { "reply": "<assistant-response-text>", "sessionId": "<session-id-string>" }
 * Fallback: if `reply` is missing, checks `output`, handles double-encoded JSON or
 * plain-text responses, and returns a clean error for empty, HTML, or missing-field responses.
 */
export function parseWebhookResponse(rawBody: string): WebhookParseResult {
  const trimmed = String(rawBody || '').trim();
  if (!trimmed) {
    return { ok: false, error: 'The backend webhook returned an empty response.' };
  }

  if (isHtmlPayload(trimmed)) {
    return {
      ok: false,
      error:
        'Received an HTML page instead of a webhook response. Verify the webhook URL in Settings and make sure the n8n workflow is active.',
    };
  }

  const parsedAttempt = tryParseJsonLoose(trimmed);
  if (parsedAttempt.ok) {
    let parsed: unknown = parsedAttempt.value;

    // Unwrap double-encoded JSON string (e.g. n8n Respond to Webhook returning a JSON string)
    if (typeof parsed === 'string') {
      const innerTrimmed = parsed.trim();
      if (!innerTrimmed) {
        return { ok: false, error: 'The backend webhook returned an empty response.' };
      }
      const innerAttempt = tryParseJsonLoose(innerTrimmed);
      if (innerAttempt.ok && innerAttempt.value && typeof innerAttempt.value === 'object') {
        parsed = innerAttempt.value;
      } else if (!isHtmlPayload(innerTrimmed)) {
        return { ok: true, reply: innerTrimmed };
      } else {
        return {
          ok: false,
          error: 'Received an HTML page instead of a webhook response.',
        };
      }
    }

    const record =
      Array.isArray(parsed) && parsed.length > 0 && parsed[0] && typeof parsed[0] === 'object'
        ? (parsed[0] as Record<string, unknown>)
        : parsed && typeof parsed === 'object' && !Array.isArray(parsed)
        ? (parsed as Record<string, unknown>)
        : null;

    if (!record) {
      return {
        ok: false,
        error: 'The backend webhook returned an unexpected JSON structure.',
      };
    }

    const returnedSessionId =
      typeof record.sessionId === 'string' && record.sessionId.trim()
        ? record.sessionId.trim()
        : undefined;

    for (const key of ['reply', 'output', 'text', 'message', 'response'] as const) {
      const val = record[key];
      if (typeof val === 'string' && val.trim()) {
        return { ok: true, reply: val, sessionId: returnedSessionId };
      }
    }

    if (typeof record.error === 'string' && record.error.trim()) {
      return { ok: false, error: record.error.trim() };
    }

    return {
      ok: false,
      error: 'The backend webhook response did not include a "reply" or "output" field.',
    };
  }

  // If the response starts with `{` or `[` it looks like malformed JSON
  if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
    return {
      ok: false,
      error: 'The backend webhook returned malformed JSON.',
    };
  }

  // Otherwise accept a clean plain-text reply from an n8n Text Respond node
  return { ok: true, reply: trimmed };
}

/**
 * Convenience helper that extracts reply text or returns the clean fallback error message.
 */
export function extractReplyText(rawBody: string): string {
  const result = parseWebhookResponse(rawBody);
  return result.ok ? result.reply : result.error;
}

export interface WebSourceLink {
  url: string;
  label: string;
  host: string;
}

export interface ResourceLinks {
  driveUrls: string[];
  sheetUrls: string[];
  docUrls: string[];
  gmailUrls: string[];
  calendarUrls: string[];
  webSources: WebSourceLink[];
}

function getCleanHostname(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./i, '');
  } catch {
    return url;
  }
}

function deriveLabelFromMarkdownOrUrl(text: string, url: string, fallback: string): string {
  // Look for markdown link label matching this URL: [Label](url)
  const escaped = url.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const mdMatch = text.match(new RegExp(`\\[([^\\]]{1,80})\\]\\(${escaped}\\)`));
  if (mdMatch && mdMatch[1].trim() && !/^https?:\/\//i.test(mdMatch[1].trim())) {
    return mdMatch[1].trim();
  }
  return fallback;
}

function cleanExtractedUrl(rawUrl: string): string {
  return rawUrl.replace(/[.,;:!?)]+$/, '');
}

export function extractResourceLinks(rawText: string): ResourceLinks {
  const text = String(rawText || '');
  const driveUrls: string[] = [];
  const sheetUrls: string[] = [];
  const docUrls: string[] = [];
  const gmailUrls: string[] = [];
  const calendarUrls: string[] = [];
  const webSources: WebSourceLink[] = [];

  const allUrls = text.match(/https?:\/\/[^\s)\]>'"]+/g) || [];
  for (const rawUrl of allUrls) {
    const clean = cleanExtractedUrl(rawUrl);
    if (!isSafeHttpUrl(clean)) continue;
    if (
      clean.includes('drive.google.com/file/d/') ||
      clean.includes('drive.google.com/open?id=') ||
      clean.includes('drive.google.com/drive/folders/')
    ) {
      if (!driveUrls.includes(clean)) driveUrls.push(clean);
    } else if (clean.includes('docs.google.com/spreadsheets/d/')) {
      if (!sheetUrls.includes(clean)) sheetUrls.push(clean);
    } else if (
      clean.includes('docs.google.com/document/d/') ||
      clean.includes('docs.google.com/presentation/d/')
    ) {
      if (!docUrls.includes(clean)) docUrls.push(clean);
    } else if (clean.includes('mail.google.com')) {
      if (!gmailUrls.includes(clean)) gmailUrls.push(clean);
    } else if (clean.includes('calendar.google.com')) {
      if (!calendarUrls.includes(clean)) calendarUrls.push(clean);
    } else if (!webSources.some((s) => s.url === clean)) {
      const host = getCleanHostname(clean);
      webSources.push({
        url: clean,
        host,
        label: deriveLabelFromMarkdownOrUrl(text, clean, host),
      });
    }
  }

  return { driveUrls, sheetUrls, docUrls, gmailUrls, calendarUrls, webSources };
}

export function extractDocsFromText(
  text: string,
  existingDocs: SessionDoc[],
  timeLabel: string
): { docs: SessionDoc[]; addedCount: number } {
  const rawText = String(text || '');
  const urls = rawText.match(/https?:\/\/[^\s)\]>'"]+/g) || [];

  const nextDocs = [...existingDocs];
  let addedCount = 0;

  for (const raw of urls) {
    const clean = cleanExtractedUrl(raw);
    if (!isSafeHttpUrl(clean)) continue;

    let type: SessionDoc['type'] | null = null;
    let defaultLabel = 'Shared File';

    if (
      clean.includes('drive.google.com/file/d/') ||
      clean.includes('drive.google.com/open?id=') ||
      clean.includes('drive.google.com/drive/folders/')
    ) {
      type = 'Drive';
      defaultLabel = 'Google Drive File';
    } else if (clean.includes('docs.google.com/spreadsheets/d/')) {
      type = 'Sheet';
      defaultLabel = 'Google Sheet';
    } else if (clean.includes('docs.google.com/document/d/')) {
      type = 'Doc';
      defaultLabel = 'Google Doc';
    } else if (clean.includes('docs.google.com/presentation/d/')) {
      type = 'Slides';
      defaultLabel = 'Google Slides';
    } else if (clean.includes('calendar.google.com')) {
      type = 'Calendar';
      defaultLabel = 'Calendar Event';
    } else if (!clean.includes('mail.google.com')) {
      type = 'Web';
      defaultLabel = getCleanHostname(clean);
    }

    if (!type) continue;

    if (!nextDocs.some((d) => d.url === clean)) {
      nextDocs.unshift({
        type,
        url: clean,
        label: deriveLabelFromMarkdownOrUrl(rawText, clean, defaultLabel),
        time: timeLabel,
      });
      addedCount++;
    }
  }

  return {
    docs: nextDocs.slice(0, 20),
    addedCount,
  };
}

export type InlineToken =
  | { type: 'text'; value: string }
  | { type: 'bold'; value: string }
  | { type: 'code'; value: string }
  | { type: 'link'; label: string; url: string };

export type MarkdownBlock =
  | { type: 'heading'; tokens: InlineToken[] }
  | { type: 'list'; items: InlineToken[][] }
  | { type: 'ordered-list'; items: InlineToken[][] }
  | { type: 'divider' }
  | { type: 'paragraph'; tokens: InlineToken[] };

export function parseInlineTokens(line: string): InlineToken[] {
  const tokens: InlineToken[] = [];
  // Matches markdown links, bare http(s) URLs, inline code, or **bold**
  const pattern =
    /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)|(https?:\/\/[^\s<]+)|`([^`]+)`|\*\*([^*]+)\*\*/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(line)) !== null) {
    if (match.index > lastIndex) {
      tokens.push({ type: 'text', value: line.slice(lastIndex, match.index) });
    }

    if (match[1] !== undefined && match[2] !== undefined) {
      const cleanUrl = match[2].replace(/[.,;]+$/, '');
      if (isSafeHttpUrl(cleanUrl)) {
        tokens.push({ type: 'link', label: match[1], url: cleanUrl });
      } else {
        tokens.push({ type: 'text', value: match[0] });
      }
    } else if (match[3] !== undefined) {
      const rawUrl = match[3];
      const cleanUrl = rawUrl.replace(/[.,;]+$/, '');
      const suffix = rawUrl.slice(cleanUrl.length);
      if (isSafeHttpUrl(cleanUrl)) {
        tokens.push({ type: 'link', label: cleanUrl, url: cleanUrl });
      } else {
        tokens.push({ type: 'text', value: cleanUrl });
      }
      if (suffix) {
        tokens.push({ type: 'text', value: suffix });
      }
    } else if (match[4] !== undefined) {
      tokens.push({ type: 'code', value: match[4] });
    } else if (match[5] !== undefined) {
      tokens.push({ type: 'bold', value: match[5] });
    }

    lastIndex = pattern.lastIndex;
  }

  if (lastIndex < line.length) {
    tokens.push({ type: 'text', value: line.slice(lastIndex) });
  }

  return tokens;
}

export function parseMarkdownBlocks(rawText: string): MarkdownBlock[] {
  const lines = String(rawText || '').split(/\r?\n/);
  const blocks: MarkdownBlock[] = [];
  let currentList: InlineToken[][] | null = null;
  let currentOrderedList: InlineToken[][] | null = null;

  const flushLists = () => {
    if (currentList && currentList.length > 0) {
      blocks.push({ type: 'list', items: currentList });
    }
    currentList = null;
    if (currentOrderedList && currentOrderedList.length > 0) {
      blocks.push({ type: 'ordered-list', items: currentOrderedList });
    }
    currentOrderedList = null;
  };

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) {
      flushLists();
      continue;
    }

    if (/^[-*_]{3,}$/.test(trimmed)) {
      flushLists();
      blocks.push({ type: 'divider' });
      continue;
    }

    const hMatch = trimmed.match(/^#{1,4}\s+(.+)$/);
    if (hMatch) {
      flushLists();
      blocks.push({ type: 'heading', tokens: parseInlineTokens(hMatch[1]) });
      continue;
    }

    const liMatch = trimmed.match(/^[-*•]\s+(.+)$/);
    if (liMatch) {
      if (currentOrderedList) {
        blocks.push({ type: 'ordered-list', items: currentOrderedList });
        currentOrderedList = null;
      }
      if (!currentList) currentList = [];
      currentList.push(parseInlineTokens(liMatch[1]));
      continue;
    }

    const olMatch = trimmed.match(/^\d+[.)]\s+(.+)$/);
    if (olMatch) {
      if (currentList) {
        blocks.push({ type: 'list', items: currentList });
        currentList = null;
      }
      if (!currentOrderedList) currentOrderedList = [];
      currentOrderedList.push(parseInlineTokens(olMatch[1]));
      continue;
    }

    flushLists();
    blocks.push({ type: 'paragraph', tokens: parseInlineTokens(trimmed) });
  }

  flushLists();
  return blocks;
}

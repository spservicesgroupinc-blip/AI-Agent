import React from 'react';
import {
  FileText,
  Table2,
  Mail,
  Calendar,
  HardDrive,
  Globe,
  BookOpen,
  AlertCircle,
} from 'lucide-react';
import { BrandMark } from './BrandMark';
import type { ChatMessage } from '../types';
import {
  extractResourceLinks,
  parseMarkdownBlocks,
  type InlineToken,
} from '../utils/chatLogic';

interface MessageItemProps {
  message: ChatMessage;
  onReadWebpage: (url: string) => void;
  onOpenSettings: () => void;
  onOpenConnectionHelp: () => void;
}

const renderInlineTokens = (tokens: InlineToken[]) =>
  tokens.map((token, idx) => {
    if (token.type === 'bold') {
      return (
        <strong key={idx} className="font-semibold text-[var(--foreground)]">
          {token.value}
        </strong>
      );
    }
    if (token.type === 'code') {
      return (
        <code
          key={idx}
          className="rounded-md bg-[var(--surface)] px-1.5 py-0.5 font-mono text-[12.5px] text-[var(--foreground)]"
        >
          {token.value}
        </code>
      );
    }
    if (token.type === 'link') {
      return (
        <a
          key={idx}
          href={token.url}
          target="_blank"
          rel="noopener noreferrer"
          className="font-medium text-[var(--brand)] underline decoration-[var(--brand)]/40 underline-offset-2 break-all transition hover:opacity-85"
        >
          {token.label}
        </a>
      );
    }
    return <React.Fragment key={idx}>{token.value}</React.Fragment>;
  });

export const MessageItem: React.FC<MessageItemProps> = ({
  message,
  onReadWebpage,
  onOpenSettings,
  onOpenConnectionHelp,
}) => {
  if (message.role === 'user') {
    return (
      <div data-role="user" className="flex w-full flex-col items-end">
        <div className="max-w-[85%] rounded-[22px] bg-[var(--surface)] px-5 py-3 text-[14.5px] leading-relaxed text-[var(--foreground)] break-words whitespace-pre-wrap sm:max-w-[75%]">
          {message.text}
        </div>
        {message.time && (
          <span className="mt-1.5 px-1 text-[11px] font-medium tabular-nums text-[var(--subtle)]">
            {message.time}
          </span>
        )}
      </div>
    );
  }

  if (message.role === 'error') {
    return (
      <div data-role="error" className="flex w-full items-start gap-3">
        <div
          aria-hidden="true"
          className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[var(--error-bg)] text-[var(--error-accent)]"
        >
          <AlertCircle className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1 rounded-xl border border-[var(--error-border)] bg-[var(--error-bg)] p-4 text-xs leading-relaxed text-[var(--error-text)]">
          <div className="text-sm font-semibold text-[var(--error-accent)]">
            {message.errorTitle || 'Connection Error'}
          </div>
          <p className="mt-1 opacity-90">{message.text}</p>
          {message.showActions && (
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={onOpenSettings}
                className="min-h-[36px] rounded-lg border border-[var(--line)] bg-[var(--canvas)] px-3.5 py-1.5 text-xs font-semibold text-[var(--foreground)] whitespace-nowrap transition hover:bg-[var(--surface)]"
              >
                Open Settings
              </button>
              <button
                type="button"
                onClick={onOpenConnectionHelp}
                className="min-h-[36px] rounded-lg bg-[var(--brand-solid)] px-3.5 py-1.5 text-xs font-semibold text-white whitespace-nowrap transition hover:bg-[var(--brand-hover)]"
              >
                Connection help
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  const blocks = parseMarkdownBlocks(message.text);
  const { driveUrls, sheetUrls, docUrls, gmailUrls, calendarUrls, webSources } =
    extractResourceLinks(message.text);
  const hasResourceButtons =
    driveUrls.length > 0 ||
    sheetUrls.length > 0 ||
    docUrls.length > 0 ||
    gmailUrls.length > 0 ||
    calendarUrls.length > 0;

  return (
    <div data-role="assistant" className="flex w-full items-start gap-3 sm:gap-3.5">
      <div className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center text-[var(--foreground)]">
        <BrandMark size={22} label="Personal assistant" />
      </div>

      <div className="min-w-0 max-w-[calc(100%-44px)] flex-1">
        <div className="space-y-2 text-[15px] leading-[1.78] text-[var(--foreground)] break-words">
          {blocks.map((block, idx) => {
            if (block.type === 'heading') {
              return (
                <h2
                  key={idx}
                  className="pt-1 text-[16px] font-semibold tracking-[-0.015em] text-[var(--foreground)]"
                >
                  {renderInlineTokens(block.tokens)}
                </h2>
              );
            }
            if (block.type === 'divider') {
              return <hr key={idx} className="my-2 border-0 border-t border-[var(--line)]" />;
            }
            if (block.type === 'list') {
              return (
                <ul key={idx} className="list-disc space-y-1 pl-5 text-[14.5px]">
                  {block.items.map((itemTokens, i) => (
                    <li key={i}>{renderInlineTokens(itemTokens)}</li>
                  ))}
                </ul>
              );
            }
            if (block.type === 'ordered-list') {
              return (
                <ol key={idx} className="list-decimal space-y-1 pl-5 text-[14.5px]">
                  {block.items.map((itemTokens, i) => (
                    <li key={i}>{renderInlineTokens(itemTokens)}</li>
                  ))}
                </ol>
              );
            }
            return <p key={idx}>{renderInlineTokens(block.tokens)}</p>;
          })}
        </div>

        {hasResourceButtons && (
          <div className="mt-4 flex flex-wrap gap-2 border-t border-[var(--line)] pt-3.5">
            {driveUrls.map((url, i) => (
              <a
                key={url}
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex min-h-[38px] items-center gap-1.5 rounded-lg bg-[var(--brand-solid)] px-3.5 py-2 text-xs font-semibold text-white whitespace-nowrap transition hover:bg-[var(--brand-hover)]"
              >
                <HardDrive className="h-3.5 w-3.5 shrink-0" />
                <span>Open in Drive{driveUrls.length > 1 ? ` #${i + 1}` : ''}</span>
              </a>
            ))}
            {docUrls.map((url, i) => (
              <a
                key={url}
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex min-h-[38px] items-center gap-1.5 rounded-lg border border-[var(--line)] bg-[var(--surface)] px-3.5 py-2 text-xs font-semibold text-[var(--foreground)] whitespace-nowrap transition hover:bg-[var(--hover)]"
              >
                <FileText className="h-3.5 w-3.5 shrink-0" />
                <span>Open Doc{docUrls.length > 1 ? ` #${i + 1}` : ''}</span>
              </a>
            ))}
            {sheetUrls.map((url, i) => (
              <a
                key={url}
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex min-h-[38px] items-center gap-1.5 rounded-lg border border-[var(--line)] bg-[var(--surface)] px-3.5 py-2 text-xs font-semibold text-[var(--foreground)] whitespace-nowrap transition hover:bg-[var(--hover)]"
              >
                <Table2 className="h-3.5 w-3.5 shrink-0" />
                <span>Open Sheet{sheetUrls.length > 1 ? ` #${i + 1}` : ''}</span>
              </a>
            ))}
            {gmailUrls.map((url) => (
              <a
                key={url}
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex min-h-[38px] items-center gap-1.5 rounded-lg border border-[var(--line)] bg-transparent px-3.5 py-2 text-xs font-semibold text-[var(--foreground)] whitespace-nowrap transition hover:bg-[var(--surface)]"
              >
                <Mail className="h-3.5 w-3.5 shrink-0" />
                <span>Open Gmail</span>
              </a>
            ))}
            {calendarUrls.map((url) => (
              <a
                key={url}
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex min-h-[38px] items-center gap-1.5 rounded-lg border border-[var(--line)] bg-transparent px-3.5 py-2 text-xs font-semibold text-[var(--foreground)] whitespace-nowrap transition hover:bg-[var(--surface)]"
              >
                <Calendar className="h-3.5 w-3.5 shrink-0" />
                <span>Open Calendar</span>
              </a>
            ))}
          </div>
        )}

        {webSources.length > 0 && (
          <div className="mt-4 border-t border-[var(--line)] pt-3.5">
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.06em] text-[var(--subtle)]">
              Sources ({webSources.length})
            </p>
            <div className="flex flex-wrap gap-2">
              {webSources.slice(0, 8).map((source) => (
                <div
                  key={source.url}
                  className="inline-flex max-w-full items-center overflow-hidden rounded-lg border border-[var(--line)] bg-[var(--surface)] text-xs"
                >
                  <a
                    href={source.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    title={source.url}
                    className="inline-flex min-h-[34px] min-w-0 items-center gap-1.5 px-2.5 py-1.5 font-medium text-[var(--foreground)] transition hover:bg-[var(--hover)]"
                  >
                    <Globe className="h-3.5 w-3.5 shrink-0 text-[var(--muted)]" />
                    <span className="max-w-[190px] truncate">{source.label}</span>
                  </a>
                  <button
                    type="button"
                    onClick={() => onReadWebpage(source.url)}
                    title={`Extract and summarize full page: ${source.host}`}
                    aria-label={`Read full webpage from ${source.label}`}
                    className="inline-flex min-h-[34px] shrink-0 items-center gap-1 border-l border-[var(--line)] px-2 py-1.5 text-[11px] font-medium text-[var(--muted)] transition hover:bg-[var(--hover)] hover:text-[var(--foreground)]"
                  >
                    <BookOpen className="h-3 w-3 shrink-0" />
                    <span>Read</span>
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {message.time && (
          <span className="mt-2 inline-block text-[11px] font-medium tabular-nums text-[var(--subtle)]">
            {message.time}
          </span>
        )}
      </div>
    </div>
  );
};

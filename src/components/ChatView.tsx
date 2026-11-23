import React, { useEffect, useRef } from 'react';
import {
  ArrowUp,
  Mail,
  Calendar,
  ListTodo,
  HardDrive,
  Globe,
  SquarePen,
  Clock,
  Send,
  Trash2,
} from 'lucide-react';
import { BrandMark } from './BrandMark';
import { MessageItem } from './MessageItem';
import type { ChatMessage, QueuedPrompt } from '../types';

interface ChatViewProps {
  messages: ChatMessage[];
  outbox: QueuedPrompt[];
  inputValue: string;
  onInputChange: (val: string) => void;
  inputRef: React.RefObject<HTMLTextAreaElement | null>;
  busy: boolean;
  workingStepText: string;
  isOnline: boolean;
  companyName: string;
  onSend: (overrideText?: string) => void;
  onPrefill: (text: string) => void;
  onReadWebpage: (url: string) => void;
  onOpenSettings: () => void;
  onOpenConnectionHelp: () => void;
  onSendQueuedItem: (id: string) => void;
  onRemoveQueuedItem: (id: string) => void;
}

export const ChatView: React.FC<ChatViewProps> = ({
  messages,
  outbox,
  inputValue,
  onInputChange,
  inputRef,
  busy,
  workingStepText,
  isOnline,
  companyName,
  onSend,
  onPrefill,
  onReadWebpage,
  onOpenSettings,
  onOpenConnectionHelp,
  onSendQueuedItem,
  onRemoveQueuedItem,
}) => {
  const feedRef = useRef<HTMLDivElement>(null);
  const isWelcomeState = messages.length === 0 && outbox.length === 0 && !busy;

  useEffect(() => {
    const feed = feedRef.current;
    if (feed && !isWelcomeState) {
      feed.scrollTop = feed.scrollHeight;
    }
  }, [messages, outbox, busy, workingStepText, isWelcomeState]);

  useEffect(() => {
    const el = inputRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 144) + 'px';
  }, [inputValue, inputRef]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      onSend();
    }
  };

  return (
    <main id="customChatView" className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-[var(--canvas)]">
      <div
        className={`flex min-h-0 flex-1 flex-col overflow-hidden ${
          isWelcomeState ? 'justify-center pb-[clamp(0px,8vh,88px)]' : ''
        }`}
      >
        <div
          ref={feedRef}
          id="chatFeed"
          className={`chat-feed-scroll overflow-y-auto px-4 sm:px-8 ${
            isWelcomeState ? 'flex-initial py-6' : 'min-h-0 flex-1 py-6'
          }`}
        >
          <div
            id="chatMessages"
            role="log"
            aria-label="Assistant conversation"
            aria-live="polite"
            className="mx-auto flex w-full max-w-[760px] flex-col gap-7"
          >
            {isWelcomeState ? (
              <div data-welcome="true" className="flex flex-col items-center text-center">
                <BrandMark size={52} label="RelayOps" className="mb-5 text-[var(--foreground)]" />
                <p className="mb-2.5 text-[11px] font-semibold tracking-[0.14em] text-[var(--subtle)] uppercase">
                  {companyName ? `RelayOps · ${companyName}` : 'RelayOps'}
                </p>
                <h2 className="mb-3 max-w-xl text-[26px] font-semibold leading-[1.24] tracking-[-0.03em] text-[var(--foreground)] text-balance sm:text-[32px]">
                  How can I help today?
                </h2>
                <p className="max-w-lg text-[14px] leading-[1.7] text-[var(--muted)]">
                  Manage Gmail, check your calendar, track tasks, search Google Drive, and run live
                  online research.
                </p>
              </div>
            ) : (
              <>
                {messages.map((msg) => (
                  <MessageItem
                    key={msg.id}
                    message={msg}
                    onReadWebpage={onReadWebpage}
                    onOpenSettings={onOpenSettings}
                    onOpenConnectionHelp={onOpenConnectionHelp}
                  />
                ))}

                {outbox.map((item) => (
                  <div
                    key={item.id}
                    data-testid="queued-message"
                    className="flex w-full flex-col items-end"
                  >
                    <div className="max-w-[85%] rounded-[22px] border border-dashed border-[var(--control-line)] bg-[var(--surface)]/70 px-5 py-3 text-[14px] leading-relaxed text-[var(--foreground)] sm:max-w-[75%]">
                      <div className="mb-1.5 flex items-center gap-1.5 text-[11px] font-semibold text-amber-500">
                        <Clock className="h-3.5 w-3.5" />
                        <span>Queued while offline · {item.createdAt}</span>
                      </div>
                      <p className="whitespace-pre-wrap break-words">{item.text}</p>
                      <div className="mt-2.5 flex flex-wrap items-center gap-2">
                        {isOnline && (
                          <button
                            type="button"
                            onClick={() => onSendQueuedItem(item.id)}
                            disabled={busy}
                            className="inline-flex min-h-[32px] items-center gap-1.5 rounded-lg bg-[var(--brand-solid)] px-3 py-1 text-xs font-semibold text-white transition hover:bg-[var(--brand-hover)] disabled:opacity-50"
                          >
                            <Send className="h-3 w-3" />
                            Send now
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => onRemoveQueuedItem(item.id)}
                          className="inline-flex min-h-[32px] items-center gap-1 rounded-lg border border-[var(--line)] px-2.5 py-1 text-xs font-medium text-[var(--muted)] transition hover:bg-[var(--hover)] hover:text-[var(--foreground)]"
                        >
                          <Trash2 className="h-3 w-3" />
                          Remove
                        </button>
                      </div>
                    </div>
                  </div>
                ))}

                {busy && (
                  <div id="workingIndicator" className="flex w-full items-center gap-3.5">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center">
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-[var(--line)] border-t-[var(--brand)]" />
                    </div>
                    <span id="workingStepText" className="text-xs font-medium text-[var(--muted)]">
                      {workingStepText}
                    </span>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* Composer Area */}
        <div className="safe-bottom shrink-0 px-3 pt-2 sm:px-8 sm:pt-3">
          <div className="mx-auto w-full max-w-[760px]">
            <div className="rounded-[24px] border border-transparent bg-[var(--surface)] px-3.5 pt-3.5 pb-3 transition focus-within:border-[var(--control-line)] sm:rounded-[26px] sm:px-4">
              <label htmlFor="chatInput" className="sr-only">
                Message the personal assistant
              </label>
              <textarea
                ref={inputRef}
                id="chatInput"
                rows={2}
                value={inputValue}
                onChange={(e) => onInputChange(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={
                  isOnline ? 'Message Personal Assistant' : 'Type a request to queue offline'
                }
                className="block max-h-36 min-h-[50px] w-full resize-none border-0 bg-transparent px-1 pb-2.5 text-base leading-[1.6] text-[var(--foreground)] placeholder:text-[var(--muted)] outline-none"
              />

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => onPrefill('Create a Gmail draft to ')}
                  className="inline-flex min-h-[38px] items-center gap-1.5 rounded-full border border-[var(--line)] bg-transparent px-3 py-1.5 text-xs font-medium text-[var(--muted)] whitespace-nowrap transition hover:bg-[var(--hover)] hover:text-[var(--foreground)]"
                >
                  <SquarePen className="h-3.5 w-3.5 shrink-0" />
                  <span>Draft email</span>
                </button>
                <button
                  type="button"
                  onClick={() => onPrefill('Research online: ')}
                  className="inline-flex min-h-[38px] items-center gap-1.5 rounded-full border border-[var(--line)] bg-transparent px-3 py-1.5 text-xs font-medium text-[var(--muted)] whitespace-nowrap transition hover:bg-[var(--hover)] hover:text-[var(--foreground)]"
                >
                  <Globe className="h-3.5 w-3.5 shrink-0" />
                  <span>Research web</span>
                </button>
                <span className="hidden text-[11px] text-[var(--subtle)] md:inline">
                  Gmail · Calendar · Tasks · Drive · Research
                </span>

                <button
                  id="sendBtn"
                  type="button"
                  onClick={() => onSend()}
                  disabled={busy || !inputValue.trim()}
                  aria-label={isOnline ? 'Send message' : 'Queue message offline'}
                  className="ml-auto inline-flex h-10 w-10 min-h-[40px] shrink-0 items-center justify-center rounded-full bg-[var(--foreground)] text-[var(--canvas)] transition hover:opacity-85 disabled:opacity-35 sm:h-9 sm:w-9 sm:min-h-[36px]"
                >
                  <ArrowUp className="h-[18px] w-[18px]" />
                </button>
              </div>
            </div>

            {isWelcomeState && (
              <div className="flex flex-wrap justify-center gap-2 pt-4 pb-1 sm:gap-2.5 sm:pt-5">
                <button
                  type="button"
                  onClick={() =>
                    onSend('Search my unread emails from the last 2 days and summarize them')
                  }
                  className="inline-flex min-h-[40px] items-center gap-2 rounded-full border border-[var(--line)] bg-transparent px-3.5 py-2 text-xs font-medium text-[var(--muted)] whitespace-nowrap transition hover:bg-[var(--surface)] hover:text-[var(--foreground)]"
                >
                  <Mail className="h-3.5 w-3.5 shrink-0" />
                  <span>Unread emails</span>
                </button>
                <button
                  type="button"
                  onClick={() => onSend('Check my calendar events for today')}
                  className="inline-flex min-h-[40px] items-center gap-2 rounded-full border border-[var(--line)] bg-transparent px-3.5 py-2 text-xs font-medium text-[var(--muted)] whitespace-nowrap transition hover:bg-[var(--surface)] hover:text-[var(--foreground)]"
                >
                  <Calendar className="h-3.5 w-3.5 shrink-0" />
                  <span>Today’s calendar</span>
                </button>
                <button
                  type="button"
                  onClick={() => onSend('List all of my open tasks')}
                  className="inline-flex min-h-[40px] items-center gap-2 rounded-full border border-[var(--line)] bg-transparent px-3.5 py-2 text-xs font-medium text-[var(--muted)] whitespace-nowrap transition hover:bg-[var(--surface)] hover:text-[var(--foreground)]"
                >
                  <ListTodo className="h-3.5 w-3.5 shrink-0" />
                  <span>Open tasks</span>
                </button>
                <button
                  type="button"
                  onClick={() => onPrefill('Search Google Drive for ')}
                  className="inline-flex min-h-[40px] items-center gap-2 rounded-full border border-[var(--line)] bg-transparent px-3.5 py-2 text-xs font-medium text-[var(--muted)] whitespace-nowrap transition hover:bg-[var(--surface)] hover:text-[var(--foreground)]"
                >
                  <HardDrive className="h-3.5 w-3.5 shrink-0" />
                  <span>Search Drive</span>
                </button>
                <button
                  type="button"
                  onClick={() => onPrefill('Research online: ')}
                  className="inline-flex min-h-[40px] items-center gap-2 rounded-full border border-[var(--line)] bg-transparent px-3.5 py-2 text-xs font-medium text-[var(--muted)] whitespace-nowrap transition hover:bg-[var(--surface)] hover:text-[var(--foreground)]"
                >
                  <Globe className="h-3.5 w-3.5 shrink-0" />
                  <span>Web research</span>
                </button>
              </div>
            )}

            <p className="mt-3 text-center text-[11px] text-[var(--subtle)]">
              Emails are saved as Gmail drafts by default unless you explicitly ask to send.
            </p>
          </div>
        </div>
      </div>
    </main>
  );
};

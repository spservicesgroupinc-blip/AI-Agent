import React, { useRef, useState, useEffect } from 'react';
import {
  SquarePen,
  Sparkles,
  ChevronRight,
  X,
  Clock,
  Send,
  Trash2,
  Building2,
  CheckSquare,
  Mail,
  Calendar,
  ListTodo,
  HardDrive,
  Globe,
  BookOpen,
} from 'lucide-react';
import { BrandMark } from './BrandMark';
import { PWAInstallButton } from './PWAInstallButton';
import type { PWAInstallState } from '../hooks/usePWAInstall';
import type { QuickTaskInput, QueuedPrompt, SessionDoc } from '../types';
import { buildQuickTaskPrompt, getCompanyInitials } from '../utils/chatLogic';

interface SidebarProps {
  isOpen: boolean;
  isMobile: boolean;
  builderOpen: boolean;
  onBuilderOpenChange: (open: boolean) => void;
  focusTaskSignal: number;
  docs: SessionDoc[];
  outbox: QueuedPrompt[];
  isOnline: boolean;
  busy: boolean;
  sessionId: string;
  companyName: string;
  workspaceSubtitle: string;
  onClose: () => void;
  onNewChat: () => void;
  onOpenSettings: () => void;
  onSendPrompt: (text: string) => void;
  onPrefillPrompt: (text: string) => void;
  onSendQueuedItem: (id: string) => void;
  onRemoveQueuedItem: (id: string) => void;
  onToast: (message: string, type: 'info' | 'success' | 'error') => void;
  pwaInstall: PWAInstallState;
}

export const Sidebar: React.FC<SidebarProps> = ({
  isOpen,
  isMobile,
  builderOpen,
  onBuilderOpenChange,
  focusTaskSignal,
  docs,
  outbox,
  isOnline,
  busy,
  sessionId,
  companyName,
  workspaceSubtitle,
  onClose,
  onNewChat,
  onOpenSettings,
  onSendPrompt,
  onPrefillPrompt,
  onSendQueuedItem,
  onRemoveQueuedItem,
  onToast,
  pwaInstall,
}) => {
  const [form, setForm] = useState<QuickTaskInput>({
    title: '',
    dueDate: '',
    notes: '',
  });

  const titleInputRef = useRef<HTMLInputElement>(null);
  const closeBtnRef = useRef<HTMLButtonElement>(null);
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    if (focusTaskSignal > 0 && builderOpen) {
      setTimeout(() => titleInputRef.current?.focus(), 60);
    }
  }, [focusTaskSignal, builderOpen]);

  useEffect(() => {
    if (isMobile && isOpen) {
      setTimeout(() => closeBtnRef.current?.focus(), 50);
    }
  }, [isMobile, isOpen]);

  const handleTouchStart = (e: React.TouchEvent) => {
    if (!isMobile || !isOpen) return;
    const t = e.touches[0];
    if (t) touchStartRef.current = { x: t.clientX, y: t.clientY };
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!isMobile || !isOpen || !touchStartRef.current) return;
    const t = e.changedTouches[0];
    if (t) {
      const dx = t.clientX - touchStartRef.current.x;
      const dy = Math.abs(t.clientY - touchStartRef.current.y);
      if (dx < -56 && dy < 70) {
        onClose();
      }
    }
    touchStartRef.current = null;
  };

  const handleQuickTaskSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) {
      onToast('Please wait for the current request to finish.', 'info');
      return;
    }

    const result = buildQuickTaskPrompt(form);
    if (!result.ok) {
      onToast(result.error, 'error');
      titleInputRef.current?.focus();
      return;
    }

    if (isMobile) onClose();
    onSendPrompt(result.prompt);
    setForm({ title: '', dueDate: '', notes: '' });
  };

  return (
    <aside
      id="sidebar"
      aria-label="Assistant tools"
      aria-hidden={!isOpen}
      inert={!isOpen ? true : undefined}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      className={[
        'z-40 flex h-full min-h-0 flex-col overflow-hidden bg-[var(--sidebar)] text-[var(--foreground)]',
        isMobile
          ? `fixed inset-y-0 left-0 w-[280px] max-w-[85vw] safe-top safe-bottom transition-transform duration-200 ease-out ${
              isOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full'
            }`
          : 'w-[264px] shrink-0 border-r border-[var(--line)]/60',
      ].join(' ')}
    >
      {/* Brand header */}
      <div className="flex min-h-[76px] items-center justify-between px-5 pt-5 pb-4">
        <div className="flex items-center gap-3 text-[var(--foreground)]">
          <BrandMark size={32} label="RelayOps" />
          <div className="min-w-0">
            <p className="text-[16px] font-bold tracking-[-0.025em] leading-tight text-[var(--foreground)]">
              RelayOps
            </p>
            <p className="mt-0.5 text-[10.5px] font-medium text-[var(--muted)]">
              Business Automation
            </p>
          </div>
        </div>
        {isMobile && (
          <button
            ref={closeBtnRef}
            id="closeSidebarBtn"
            type="button"
            onClick={onClose}
            aria-label="Close sidebar"
            className="inline-flex h-10 w-10 min-h-[44px] min-w-[44px] items-center justify-center rounded-lg text-[var(--muted)] transition hover:bg-[var(--surface)] hover:text-[var(--foreground)]"
          >
            <X className="h-5 w-5" />
          </button>
        )}
      </div>

      {/* Scrollable tool area */}
      <div className="sidebar-scroll flex-1 overflow-y-auto px-3 pb-5">
        <button
          id="newChatBtn"
          type="button"
          onClick={() => {
            if (isMobile) onClose();
            onNewChat();
          }}
          aria-label="Start a new chat"
          className="mb-6 flex h-11 min-h-[44px] w-full items-center gap-3 rounded-lg px-3 text-sm font-medium text-[var(--foreground)] transition hover:bg-[var(--hover)]"
        >
          <SquarePen className="h-[18px] w-[18px] shrink-0 text-[var(--muted)]" />
          <span>New chat</span>
        </button>

        {/* Workspace */}
        <p className="mx-3 mb-2 text-xs font-medium text-[var(--subtle)]">Workspace</p>
        <div className="flex items-center gap-3 rounded-lg bg-[var(--surface)] px-3 py-2.5 text-sm font-medium text-[var(--foreground)]">
          <Sparkles className="h-[18px] w-[18px] shrink-0 text-[var(--brand)]" />
          <span className="truncate">Personal Assistant</span>
        </div>

        {/* Quick Task Builder Disclosure (maps directly to n8n Tasks Tool: add_task) */}
        <details
          open={builderOpen}
          onToggle={(e) => onBuilderOpenChange((e.currentTarget as HTMLDetailsElement).open)}
          className="mt-1"
        >
          <summary className="details-no-marker flex min-h-[42px] list-none items-center gap-3 rounded-lg px-3 py-2.5 text-[13px] font-medium text-[var(--foreground)] transition hover:bg-[var(--surface)]">
            <CheckSquare className="h-[18px] w-[18px] shrink-0 text-[var(--muted)]" />
            <span>Add a task</span>
            <ChevronRight
              className={`ml-auto h-4 w-4 shrink-0 text-[var(--muted)] transition-transform duration-150 ${
                builderOpen ? 'rotate-90' : ''
              }`}
            />
          </summary>

          <div className="mt-1.5 mb-4 rounded-xl border border-[var(--line)] bg-[var(--canvas)] p-3">
            <form id="quickTaskForm" onSubmit={handleQuickTaskSubmit} className="space-y-2.5" noValidate>
              <div>
                <label
                  htmlFor="qtTitle"
                  className="mb-1 block text-xs font-medium text-[var(--muted)]"
                >
                  Task Title
                </label>
                <input
                  ref={titleInputRef}
                  id="qtTitle"
                  type="text"
                  value={form.title}
                  onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                  placeholder="Enter task title"
                  className="min-h-[40px] w-full rounded-lg border border-[var(--control-line)] bg-[var(--sidebar)] px-3 py-2 text-base font-medium text-[var(--foreground)] placeholder:text-[var(--subtle)] transition focus:border-[var(--brand)] sm:text-[13px]"
                />
              </div>

              <div>
                <label
                  htmlFor="qtDueDate"
                  className="mb-1 block text-xs font-medium text-[var(--muted)]"
                >
                  Due Date (optional)
                </label>
                <input
                  id="qtDueDate"
                  type="date"
                  value={form.dueDate}
                  onChange={(e) => setForm((f) => ({ ...f, dueDate: e.target.value }))}
                  className="min-h-[40px] w-full rounded-lg border border-[var(--control-line)] bg-[var(--sidebar)] px-3 py-2 text-base font-medium text-[var(--foreground)] transition focus:border-[var(--brand)] sm:text-[13px]"
                />
              </div>

              <div>
                <label
                  htmlFor="qtNotes"
                  className="mb-1 block text-xs font-medium text-[var(--muted)]"
                >
                  Notes (optional)
                </label>
                <input
                  id="qtNotes"
                  type="text"
                  value={form.notes}
                  onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                  placeholder="Add details or context"
                  className="min-h-[40px] w-full rounded-lg border border-[var(--control-line)] bg-[var(--sidebar)] px-3 py-2 text-base font-medium text-[var(--foreground)] placeholder:text-[var(--subtle)] transition focus:border-[var(--brand)] sm:text-[13px]"
                />
              </div>

              <button
                type="submit"
                disabled={busy}
                className="min-h-[42px] w-full rounded-lg bg-[var(--brand-solid)] px-3 py-2.5 text-xs font-semibold text-white transition hover:bg-[var(--brand-hover)] active:scale-[0.99] disabled:opacity-50"
              >
                {isOnline ? 'Add task' : 'Queue task offline'}
              </button>
            </form>
          </div>
        </details>

        {/* Quick Actions (aligned to Gmail, Calendar, Tasks, and Drive tools in n8n) */}
        <section className="mt-6" aria-labelledby="quickActionsHeading">
          <h2 id="quickActionsHeading" className="mx-3 mb-2 text-xs font-medium text-[var(--subtle)]">
            Quick actions
          </h2>
          <div className="flex flex-col gap-0.5">
            <button
              type="button"
              onClick={() => {
                if (isMobile) onClose();
                onSendPrompt('Search my unread emails from the last 2 days and summarize them');
              }}
              className="flex min-h-[40px] w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-[12.5px] font-medium text-[var(--foreground)] transition hover:bg-[var(--surface)]"
            >
              <Mail className="h-4 w-4 shrink-0 text-[var(--muted)]" />
              <span>Check Unread Emails</span>
            </button>
            <button
              type="button"
              onClick={() => {
                if (isMobile) onClose();
                onSendPrompt('Check my calendar events for today and highlight any conflicts');
              }}
              className="flex min-h-[40px] w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-[12.5px] font-medium text-[var(--foreground)] transition hover:bg-[var(--surface)]"
            >
              <Calendar className="h-4 w-4 shrink-0 text-[var(--muted)]" />
              <span>Today’s Schedule</span>
            </button>
            <button
              type="button"
              onClick={() => {
                if (isMobile) onClose();
                onSendPrompt('List all of my open tasks');
              }}
              className="flex min-h-[40px] w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-[12.5px] font-medium text-[var(--foreground)] transition hover:bg-[var(--surface)]"
            >
              <ListTodo className="h-4 w-4 shrink-0 text-[var(--muted)]" />
              <span>Open Tasks</span>
            </button>
            <button
              type="button"
              onClick={() => {
                if (isMobile) onClose();
                onPrefillPrompt('Search Google Drive for ');
              }}
              className="flex min-h-[40px] w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-[12.5px] font-medium text-[var(--foreground)] transition hover:bg-[var(--surface)]"
            >
              <HardDrive className="h-4 w-4 shrink-0 text-[var(--muted)]" />
              <span>Search Google Drive</span>
            </button>
            <button
              type="button"
              onClick={() => {
                if (isMobile) onClose();
                onPrefillPrompt('Create a Gmail draft to ');
              }}
              className="flex min-h-[40px] w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-[12.5px] font-medium text-[var(--foreground)] transition hover:bg-[var(--surface)]"
            >
              <SquarePen className="h-4 w-4 shrink-0 text-[var(--muted)]" />
              <span>Draft an Email</span>
            </button>
            <button
              type="button"
              onClick={() => {
                if (isMobile) onClose();
                onPrefillPrompt('Research online: ');
              }}
              className="flex min-h-[40px] w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-[12.5px] font-medium text-[var(--foreground)] transition hover:bg-[var(--surface)]"
            >
              <Globe className="h-4 w-4 shrink-0 text-[var(--muted)]" />
              <span>Web Research</span>
            </button>
            <button
              type="button"
              onClick={() => {
                if (isMobile) onClose();
                onPrefillPrompt('Read and summarize this webpage: https://');
              }}
              className="flex min-h-[40px] w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-[12.5px] font-medium text-[var(--foreground)] transition hover:bg-[var(--surface)]"
            >
              <BookOpen className="h-4 w-4 shrink-0 text-[var(--muted)]" />
              <span>Read a Webpage</span>
            </button>
          </div>
        </section>

        {/* Offline Queue (when items exist) */}
        {outbox.length > 0 && (
          <section className="mt-6" aria-labelledby="outboxHeading">
            <div className="mx-3 mb-2 flex items-center justify-between">
              <h2 id="outboxHeading" className="text-xs font-medium text-[var(--subtle)]">
                Offline queue
              </h2>
              <span className="text-xs font-medium tabular-nums text-[var(--muted)]">
                {outbox.length}
              </span>
            </div>
            <div className="space-y-1.5 px-1">
              {outbox.map((item) => (
                <div
                  key={item.id}
                  className="rounded-lg border border-[var(--line)] bg-[var(--canvas)] p-2.5 text-xs"
                >
                  <p className="line-clamp-2 text-[var(--foreground)]">{item.text}</p>
                  <div className="mt-2 flex items-center justify-between gap-2 text-[11px] text-[var(--subtle)]">
                    <span className="inline-flex items-center gap-1 tabular-nums">
                      <Clock className="h-3 w-3" />
                      {item.createdAt}
                    </span>
                    <div className="flex items-center gap-1">
                      {isOnline && (
                        <button
                          type="button"
                          onClick={() => onSendQueuedItem(item.id)}
                          disabled={busy}
                          aria-label={`Send queued request: ${item.text.slice(0, 30)}`}
                          className="inline-flex h-7 items-center gap-1 rounded px-2 text-[11px] font-semibold text-[var(--brand)] hover:bg-[var(--surface)] disabled:opacity-50"
                        >
                          <Send className="h-3 w-3" />
                          Send
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => onRemoveQueuedItem(item.id)}
                        aria-label={`Remove queued request: ${item.text.slice(0, 30)}`}
                        className="inline-flex h-7 w-7 items-center justify-center rounded text-[var(--muted)] hover:bg-[var(--surface)] hover:text-[var(--foreground)]"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Shared Files & Web Research Sources in Session */}
        <section className="mt-6" aria-labelledby="documentsHeading">
          <div className="mx-3 mb-2 flex items-center justify-between">
            <h2 id="documentsHeading" className="text-xs font-medium text-[var(--subtle)]">
              Files &amp; sources
            </h2>
            <span
              id="docCountBadge"
              data-testid="doc-count"
              className="text-xs font-semibold tabular-nums text-[var(--muted)]"
            >
              {docs.length}
            </span>
          </div>
          <div id="sessionDocsList" className="space-y-1">
            {docs.length === 0 ? (
              <p className="px-3 py-1 text-xs leading-relaxed text-[var(--subtle)]">
                Google Drive files and web research sources shared by the assistant will appear here.
              </p>
            ) : (
              docs.map((doc) => (
                <a
                  key={doc.url}
                  href={doc.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between gap-2 rounded-lg px-3 py-2 text-xs text-[var(--foreground)] transition hover:bg-[var(--surface)]"
                >
                  <div className="min-w-0">
                    <div className="truncate font-medium">{doc.label}</div>
                    <div className="mt-0.5 flex items-center gap-1.5 text-[11px] text-[var(--subtle)] tabular-nums">
                      <span>{doc.type}</span>
                      <span aria-hidden="true">·</span>
                      <span>{doc.time}</span>
                    </div>
                  </div>
                </a>
              ))
            )}
          </div>
        </section>
      </div>

      {/* Install prompt (sidebar slot on iOS / installable devices) + Office Footer */}
      <div className="border-t border-[var(--line)] px-4 py-3.5">
        <div className="mb-2.5 empty:hidden">
          <PWAInstallButton
            pwaInstall={pwaInstall}
            variant="sidebar"
            isMobileViewport={isMobile}
            onInstalledToast={(m) => onToast(m, 'success')}
          />
        </div>
        {companyName ? (
          <button
            type="button"
            onClick={() => {
              if (isMobile) onClose();
              onOpenSettings();
            }}
            className="flex w-full items-center gap-2.5 rounded-lg p-1 text-left text-[13px] transition hover:bg-[var(--surface)]"
            aria-label={`Edit workspace profile for ${companyName}`}
          >
            <span
              aria-hidden="true"
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--brand-solid)] text-[11px] font-bold text-white"
            >
              {getCompanyInitials(companyName)}
            </span>
            <div className="min-w-0">
              <p className="truncate font-semibold leading-tight text-[var(--foreground)]">
                {companyName}
              </p>
              {workspaceSubtitle && (
                <span className="block truncate text-[11px] text-[var(--subtle)]">
                  {workspaceSubtitle}
                </span>
              )}
            </div>
          </button>
        ) : (
          <button
            type="button"
            onClick={() => {
              if (isMobile) onClose();
              onOpenSettings();
            }}
            className="flex min-h-[40px] w-full items-center gap-2.5 rounded-lg px-2 py-1.5 text-left text-xs transition hover:bg-[var(--surface)]"
          >
            <span
              aria-hidden="true"
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-[var(--line)] bg-[var(--surface)] text-[var(--muted)]"
            >
              <Building2 className="h-4 w-4" />
            </span>
            <div className="min-w-0">
              <p className="truncate font-medium text-[var(--foreground)]">Set up company</p>
              <span className="block truncate text-[11px] text-[var(--subtle)]">
                Configure profile &amp; webhook
              </span>
            </div>
          </button>
        )}
      </div>

      <span id="sessionIdDisplay" className="sr-only" aria-label="Chat session ID">
        {sessionId}
      </span>
    </aside>
  );
};

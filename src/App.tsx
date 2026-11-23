import { useCallback, useEffect, useRef, useState } from 'react';
import { Sidebar } from './components/Sidebar';
import { Toolbar } from './components/Toolbar';
import { OfflineBanner } from './components/OfflineBanner';
import { ChatView } from './components/ChatView';
import { ConnectionHelpView } from './components/ConnectionHelpView';
import { SettingsModal } from './components/SettingsModal';
import { ConfirmModal } from './components/ConfirmModal';
import { ToastStack } from './components/ToastStack';
import { PWAInstallButton } from './components/PWAInstallButton';
import { useOnlineStatus } from './hooks/useOnlineStatus';
import { usePWAInstall } from './hooks/usePWAInstall';
import { useServiceWorker } from './hooks/useServiceWorker';
import {
  DEFAULT_WEBHOOK_URL,
  STORAGE_KEYS,
  WORKING_STEPS,
  extractDocsFromText,
  generateId,
  generateSessionId,
  nowTimeLabel,
  parseWebhookResponse,
} from './utils/chatLogic';
import { parseShortcutAction } from './utils/pwaHelpers';
import { safeGetStorage, safeParseJson, safeSetStorage } from './utils/storage';
import type {
  ChatMessage,
  ConnectionStatus,
  QueuedPrompt,
  ServerWebhookConfig,
  SessionDoc,
  ThemeMode,
  ToastItem,
  ViewMode,
} from './types';

function readInitialTheme(): ThemeMode {
  if (typeof window === 'undefined') return 'dark';
  return safeGetStorage(window.localStorage, STORAGE_KEYS.THEME, 'dark') === 'light'
    ? 'light'
    : 'dark';
}

function readInitialSessionId(): string {
  if (typeof window === 'undefined') return generateSessionId();
  const existing = safeGetStorage(window.localStorage, STORAGE_KEYS.SESSION_ID, '');
  if (existing) return existing;
  const fresh = generateSessionId();
  safeSetStorage(window.localStorage, STORAGE_KEYS.SESSION_ID, fresh);
  return fresh;
}

export default function App() {
  const isOnline = useOnlineStatus();
  const pwaInstall = usePWAInstall();
  const sw = useServiceWorker();

  const [theme, setTheme] = useState<ThemeMode>(readInitialTheme);
  const [isMobile, setIsMobile] = useState<boolean>(() =>
    typeof window !== 'undefined' ? window.matchMedia('(max-width: 899px)').matches : false
  );
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(() =>
    typeof window !== 'undefined' ? !window.matchMedia('(max-width: 899px)').matches : true
  );
  const [builderOpen, setBuilderOpen] = useState<boolean>(false);
  const [focusTaskSignal, setFocusTaskSignal] = useState<number>(0);
  const [viewMode, setViewMode] = useState<ViewMode>('chat');

  // Optional per-browser webhook override. Blank by default so the server's
  // N8N_WEBHOOK_URL secret controls the active production endpoint automatically.
  const [webhookUrl, setWebhookUrl] = useState<string>(() => {
    if (typeof window === 'undefined') return '';
    const saved = safeGetStorage(window.localStorage, STORAGE_KEYS.WEBHOOK, '').trim();
    if (
      !saved ||
      saved === DEFAULT_WEBHOOK_URL ||
      saved.includes('/webhook-test/personal-assistant-chat')
    ) {
      if (saved) {
        safeSetStorage(window.localStorage, STORAGE_KEYS.WEBHOOK, '');
      }
      return '';
    }
    return saved;
  });
  const [serverConfig, setServerConfig] = useState<ServerWebhookConfig>({
    loaded: false,
    proxyAvailable: false,
    usingServerSecret: false,
    webhookHost: null,
    isInvalidSecret: false,
  });
  const [authUser, setAuthUser] = useState<string>(() =>
    typeof window !== 'undefined'
      ? safeGetStorage(window.sessionStorage, STORAGE_KEYS.AUTH_USER, '')
      : ''
  );
  const [authPass, setAuthPass] = useState<string>(() =>
    typeof window !== 'undefined'
      ? safeGetStorage(window.sessionStorage, STORAGE_KEYS.AUTH_PASS, '')
      : ''
  );
  const [companyName, setCompanyName] = useState<string>(() =>
    typeof window !== 'undefined'
      ? safeGetStorage(window.localStorage, STORAGE_KEYS.COMPANY_NAME, '')
      : ''
  );
  const [workspaceSubtitle, setWorkspaceSubtitle] = useState<string>(() =>
    typeof window !== 'undefined'
      ? safeGetStorage(window.localStorage, STORAGE_KEYS.WORKSPACE_SUBTITLE, '')
      : ''
  );
  const [sessionId, setSessionId] = useState<string>(readInitialSessionId);

  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    if (typeof window === 'undefined') return [];
    const saved = safeParseJson<ChatMessage[]>(
      safeGetStorage(window.localStorage, STORAGE_KEYS.MESSAGES, '[]'),
      []
    );
    if (!Array.isArray(saved)) return [];
    return saved
      .slice(-60)
      .map((m, idx) => ({
        id: m.id || `restored-${idx}`,
        role: m.role === 'user' || m.role === 'error' ? m.role : 'assistant',
        text: String(m.text || ''),
        time: String(m.time || ''),
        errorTitle: m.errorTitle,
        showActions: m.showActions,
      }));
  });

  const [docs, setDocs] = useState<SessionDoc[]>(() => {
    if (typeof window === 'undefined') return [];
    const saved = safeParseJson<SessionDoc[]>(
      safeGetStorage(window.localStorage, STORAGE_KEYS.DOCS, '[]'),
      []
    );
    return Array.isArray(saved) ? saved.slice(0, 20) : [];
  });

  const [outbox, setOutbox] = useState<QueuedPrompt[]>(() => {
    if (typeof window === 'undefined') return [];
    const saved = safeParseJson<QueuedPrompt[]>(
      safeGetStorage(window.localStorage, STORAGE_KEYS.OUTBOX, '[]'),
      []
    );
    return Array.isArray(saved) ? saved.slice(0, 20) : [];
  });

  const [inputValue, setInputValue] = useState<string>('');
  const [busy, setBusy] = useState<boolean>(false);
  const [workingStepIdx, setWorkingStepIdx] = useState<number>(0);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>({
    kind: 'idle',
    label: 'Ready to connect',
  });

  const [settingsOpen, setSettingsOpen] = useState<boolean>(false);
  const [confirmOpen, setConfirmOpen] = useState<boolean>(false);
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const chatInputRef = useRef<HTMLTextAreaElement>(null);

  const showToast = useCallback((message: string, type: 'info' | 'success' | 'error' = 'info') => {
    const id = generateId('toast');
    setToasts((prev) => [...prev.slice(-3), { id, message, type }]);
    window.setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3200);
  }, []);

  // Sync theme to documentElement + meta theme-color
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    document.documentElement.classList.toggle('dark', theme === 'dark');
    safeSetStorage(window.localStorage, STORAGE_KEYS.THEME, theme);
    const metaTheme = document.querySelector('meta[name="theme-color"]');
    if (metaTheme) {
      metaTheme.setAttribute('content', theme === 'dark' ? '#181818' : '#ffffff');
    }
  }, [theme]);

  // Responsive breakpoint listener
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 899px)');
    const handleChange = () => {
      const mobile = mq.matches;
      setIsMobile(mobile);
      setSidebarOpen(!mobile);
    };
    mq.addEventListener('change', handleChange);
    return () => mq.removeEventListener('change', handleChange);
  }, []);

  // Sync dynamic visual viewport height so iOS/Android soft keyboards resize cleanly without clipping
  useEffect(() => {
    const syncViewportHeight = () => {
      const vv = window.visualViewport;
      const height = vv ? Math.round(vv.height) : window.innerHeight;
      if (height > 0) {
        document.documentElement.style.setProperty('--app-height', `${height}px`);
      }
    };

    syncViewportHeight();
    const vv = window.visualViewport;
    vv?.addEventListener('resize', syncViewportHeight);
    window.addEventListener('resize', syncViewportHeight);
    window.addEventListener('orientationchange', syncViewportHeight);
    return () => {
      vv?.removeEventListener('resize', syncViewportHeight);
      window.removeEventListener('resize', syncViewportHeight);
      window.removeEventListener('orientationchange', syncViewportHeight);
    };
  }, []);

  // Handle PWA manifest shortcut URL query actions (?action=new-task | ?action=schedule | ?action=research)
  useEffect(() => {
    const action = parseShortcutAction(window.location.search);
    if (action === 'new-task') {
      setSidebarOpen(true);
      setBuilderOpen(true);
      setFocusTaskSignal((n) => n + 1);
    } else if (action === 'schedule') {
      setViewMode('chat');
      setInputValue('Check my calendar events for today');
      setTimeout(() => chatInputRef.current?.focus(), 60);
    } else if (action === 'research') {
      setViewMode('chat');
      setInputValue('Research online: ');
      setTimeout(() => {
        const el = chatInputRef.current;
        if (el) {
          el.focus();
          el.setSelectionRange(17, 17);
        }
      }, 60);
    }
  }, []);

  // Notify once when app is cached for offline use
  useEffect(() => {
    if (sw.offlineReady) {
      showToast('App cached for offline use.', 'success');
      sw.dismissOfflineReady();
    }
  }, [sw, showToast]);

  // Persist messages, docs, outbox
  useEffect(() => {
    const persistable = messages.filter((m) => m.role !== 'error').slice(-60);
    safeSetStorage(window.localStorage, STORAGE_KEYS.MESSAGES, JSON.stringify(persistable));
  }, [messages]);

  useEffect(() => {
    safeSetStorage(window.localStorage, STORAGE_KEYS.DOCS, JSON.stringify(docs.slice(0, 20)));
  }, [docs]);

  useEffect(() => {
    safeSetStorage(window.localStorage, STORAGE_KEYS.OUTBOX, JSON.stringify(outbox.slice(0, 20)));
  }, [outbox]);

  // Cycle working status text while busy
  useEffect(() => {
    if (!busy) {
      setWorkingStepIdx(0);
      return;
    }
    const timer = window.setInterval(() => {
      setWorkingStepIdx((prev) => Math.min(prev + 1, WORKING_STEPS.length - 1));
    }, 2600);
    return () => window.clearInterval(timer);
  }, [busy]);

  // Close mobile drawer on Escape
  useEffect(() => {
    if (!isMobile || !sidebarOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !settingsOpen && !confirmOpen) {
        setSidebarOpen(false);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isMobile, sidebarOpen, settingsOpen, confirmOpen]);

  // Fetch non-secret server webhook status on mount and when opening Settings
  useEffect(() => {
    let active = true;
    fetch('/api/config', { cache: 'no-store' })
      .then(async (res) => {
        const isRelay = res.headers.get('x-relay-proxy') === '1';
        const contentType = (res.headers.get('content-type') || '').toLowerCase();
        if (!isRelay || !res.ok || !contentType.includes('application/json')) {
          if (active) {
            setServerConfig({
              loaded: true,
              proxyAvailable: false,
              usingServerSecret: false,
              webhookHost: null,
              isInvalidSecret: false,
            });
          }
          return;
        }
        const data = (await res.json()) as {
          usingServerSecret?: boolean;
          webhookHost?: string | null;
          isInvalidSecret?: boolean;
        };
        if (active) {
          setServerConfig({
            loaded: true,
            proxyAvailable: true,
            usingServerSecret: Boolean(data.usingServerSecret),
            webhookHost: typeof data.webhookHost === 'string' ? data.webhookHost : null,
            isInvalidSecret: Boolean(data.isInvalidSecret),
          });
        }
      })
      .catch(() => {
        if (active) {
          setServerConfig((prev) => ({ ...prev, loaded: true, proxyAvailable: false }));
        }
      });

    return () => {
      active = false;
    };
  }, [settingsOpen]);

  const effectiveConnectionStatus: ConnectionStatus = !isOnline
    ? { kind: 'offline', label: 'Offline' }
    : !webhookUrl && serverConfig.isInvalidSecret
    ? { kind: 'error', label: 'Invalid Secret URL' }
    : connectionStatus;

  const sendToWebhook = useCallback(
    async (text: string) => {
      const userMsg: ChatMessage = {
        id: generateId('msg'),
        role: 'user',
        text,
        time: nowTimeLabel(),
      };
      setMessages((prev) => [...prev, userMsg]);
      setBusy(true);
      setConnectionStatus({ kind: 'working', label: 'Working…' });

      try {
        const browserTimezone = (() => {
          try {
            return Intl.DateTimeFormat().resolvedOptions().timeZone || '';
          } catch {
            return '';
          }
        })();
        const trimmedCompany = companyName.trim();
        const directTargetUrl = webhookUrl || DEFAULT_WEBHOOK_URL;
        const directFetch = async () => {
          const directHeaders: Record<string, string> = {
            'Content-Type': 'application/json',
          };
          if (authUser) {
            directHeaders.Authorization = 'Basic ' + btoa(authUser + ':' + authPass);
          }
          return fetch(directTargetUrl, {
            method: 'POST',
            headers: directHeaders,
            body: JSON.stringify({
              sessionId,
              message: text,
              ...(browserTimezone ? { timezone: browserTimezone } : {}),
              ...(trimmedCompany ? { companyName: trimmedCompany } : {}),
            }),
          });
        };

        let response: Response;
        try {
          const proxyResponse = await fetch('/api/chat', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              ...(webhookUrl ? { webhookUrl } : {}),
              sessionId,
              message: text,
              ...(browserTimezone ? { timezone: browserTimezone } : {}),
              ...(trimmedCompany ? { companyName: trimmedCompany } : {}),
              ...(authUser ? { authUser, authPass } : {}),
            }),
          });

          const isRelay = proxyResponse.headers.get('x-relay-proxy') === '1';
          const contentType = (proxyResponse.headers.get('content-type') || '').toLowerCase();
          const shouldFallbackDirect =
            !isRelay ||
            contentType.includes('text/html') ||
            (proxyResponse.status === 400 && Boolean(webhookUrl));

          if (shouldFallbackDirect) {
            response = await directFetch();
          } else {
            response = proxyResponse;
          }
        } catch {
          // If the same-origin /api/chat relay is unavailable, fall back directly to webhook URL
          response = await directFetch();
        }

        const rawBody = await response.text();

        if (!response.ok) {
          if (response.status === 401 || response.status === 403) {
            setConnectionStatus({ kind: 'error', label: 'Auth Required' });
            setMessages((prev) => [
              ...prev,
              {
                id: generateId('err'),
                role: 'error',
                errorTitle: `Authentication Required (HTTP ${response.status})`,
                text: 'Your backend webhook has authentication enabled. Open Settings below to enter your Basic Auth username and password.',
                time: nowTimeLabel(),
                showActions: true,
              },
            ]);
            return;
          }

          if (response.status === 404) {
            setConnectionStatus({ kind: 'error', label: 'Webhook unavailable' });
            setMessages((prev) => [
              ...prev,
              {
                id: generateId('err'),
                role: 'error',
                errorTitle: 'Webhook unavailable (HTTP 404)',
                text: 'n8n returned 404 for this webhook URL. Confirm your workflow is active in n8n and that your N8N_WEBHOOK_URL secret (or custom override in Settings) matches the active production /webhook/ URL.',
                time: nowTimeLabel(),
                showActions: true,
              },
            ]);
            return;
          }

          let serverErrDetail = rawBody.slice(0, 220);
          try {
            const parsedErr = JSON.parse(rawBody) as { error?: unknown };
            if (typeof parsedErr?.error === 'string' && parsedErr.error.trim()) {
              serverErrDetail = parsedErr.error.trim();
            }
          } catch {
            // Keep raw excerpt if response is not JSON
          }

          throw new Error(`HTTP ${response.status}: ${serverErrDetail}`);
        }

        const parsed = parseWebhookResponse(rawBody);
        const time = nowTimeLabel();

        if (!parsed.ok) {
          setConnectionStatus({ kind: 'error', label: 'Invalid Response' });
          setMessages((prev) => [
            ...prev,
            {
              id: generateId('err'),
              role: 'error',
              errorTitle: 'Unexpected Webhook Response',
              text: parsed.error,
              time,
              showActions: true,
            },
          ]);
          return;
        }

        if (parsed.sessionId && parsed.sessionId !== sessionId) {
          setSessionId(parsed.sessionId);
          safeSetStorage(window.localStorage, STORAGE_KEYS.SESSION_ID, parsed.sessionId);
        }

        setConnectionStatus({ kind: 'ready', label: 'Connected' });

        setMessages((prev) => [
          ...prev,
          {
            id: generateId('msg'),
            role: 'assistant',
            text: parsed.reply,
            time,
          },
        ]);

        setDocs((prevDocs) => {
          const { docs: nextDocs } = extractDocsFromText(parsed.reply, prevDocs, time);
          return nextDocs;
        });
      } catch (err) {
        setConnectionStatus({ kind: 'error', label: 'Connection Blocked' });
        const msg = err instanceof Error ? err.message : String(err);
        const isCorsLike = /failed to fetch|networkerror|load failed|cors/i.test(msg);

        setMessages((prev) => [
          ...prev,
          {
            id: generateId('err'),
            role: 'error',
            errorTitle: isCorsLike ? 'Could not connect to webhook' : 'Could Not Reach Backend Webhook',
            text: isCorsLike
              ? 'The browser could not reach the webhook endpoint. Confirm the workflow is listening or active in n8n, verify the URL in Settings, and ensure CORS headers allow requests from this origin. Use Connection help for setup steps.'
              : msg,
            time: nowTimeLabel(),
            showActions: true,
          },
        ]);
      } finally {
        setBusy(false);
      }
    },
    [authPass, authUser, companyName, sessionId, webhookUrl]
  );

  const handleSend = useCallback(
    (overrideText?: string) => {
      if (busy) return;
      const text = overrideText !== undefined ? String(overrideText).trim() : inputValue.trim();
      if (!text) return;

      if (overrideText === undefined) {
        setInputValue('');
      }
      setViewMode('chat');

      if (!isOnline) {
        const queued: QueuedPrompt = {
          id: generateId('queue'),
          text,
          createdAt: nowTimeLabel(),
        };
        setOutbox((prev) => [...prev, queued]);
        showToast('Saved to offline queue. Send when back online.', 'info');
        return;
      }

      void sendToWebhook(text);
    },
    [busy, inputValue, isOnline, sendToWebhook, showToast]
  );

  const handleSendQueuedItem = useCallback(
    (id: string) => {
      if (busy || !isOnline) return;
      const item = outbox.find((q) => q.id === id);
      if (!item) return;
      setOutbox((prev) => prev.filter((q) => q.id !== id));
      setViewMode('chat');
      void sendToWebhook(item.text);
    },
    [busy, isOnline, outbox, sendToWebhook]
  );

  const handleFlushQueue = useCallback(async () => {
    if (busy || !isOnline || outbox.length === 0) return;
    const [first, ...rest] = outbox;
    setOutbox(rest);
    setViewMode('chat');
    await sendToWebhook(first.text);
  }, [busy, isOnline, outbox, sendToWebhook]);

  const handleRemoveQueuedItem = useCallback(
    (id: string) => {
      setOutbox((prev) => prev.filter((q) => q.id !== id));
      showToast('Removed from offline queue.', 'info');
    },
    [showToast]
  );

  const handlePrefill = useCallback((text: string) => {
    setViewMode('chat');
    setInputValue(text);
    setTimeout(() => {
      const el = chatInputRef.current;
      if (el) {
        el.focus();
        el.setSelectionRange(text.length, text.length);
      }
    }, 30);
  }, []);

  const handleSaveSettings = useCallback(
    (config: {
      webhookUrl: string;
      authUser: string;
      authPass: string;
      companyName: string;
      workspaceSubtitle: string;
    }) => {
      setWebhookUrl(config.webhookUrl);
      setAuthUser(config.authUser);
      setAuthPass(config.authPass);
      setCompanyName(config.companyName);
      setWorkspaceSubtitle(config.workspaceSubtitle);
      safeSetStorage(window.localStorage, STORAGE_KEYS.WEBHOOK, config.webhookUrl);
      safeSetStorage(window.sessionStorage, STORAGE_KEYS.AUTH_USER, config.authUser);
      safeSetStorage(window.sessionStorage, STORAGE_KEYS.AUTH_PASS, config.authPass);
      safeSetStorage(window.localStorage, STORAGE_KEYS.COMPANY_NAME, config.companyName);
      safeSetStorage(
        window.localStorage,
        STORAGE_KEYS.WORKSPACE_SUBTITLE,
        config.workspaceSubtitle
      );
      setSettingsOpen(false);
      showToast('Workspace settings saved.', 'success');
    },
    [showToast]
  );

  const handleConfirmNewChat = useCallback(() => {
    const freshSession = generateSessionId();
    setSessionId(freshSession);
    safeSetStorage(window.localStorage, STORAGE_KEYS.SESSION_ID, freshSession);
    setMessages([]);
    setConfirmOpen(false);
    setViewMode('chat');
    showToast('Started a fresh chat session.', 'info');
  }, [showToast]);

  return (
    <div
      id="chatLayout"
      className={[
        'grid h-full w-full overflow-hidden bg-[var(--canvas)] text-[var(--foreground)] transition-[grid-template-columns] duration-200 ease-out',
        isMobile
          ? 'grid-cols-[minmax(0,1fr)]'
          : sidebarOpen
          ? 'grid-cols-[264px_minmax(0,1fr)]'
          : 'grid-cols-[0px_minmax(0,1fr)]',
      ].join(' ')}
    >
      {/* Mobile Sidebar Backdrop */}
      {isMobile && sidebarOpen && (
        <div
          id="sidebarBackdrop"
          onClick={() => setSidebarOpen(false)}
          className="fixed inset-0 z-30 bg-black/55 backdrop-blur-[1px]"
          aria-hidden="true"
        />
      )}

      <Sidebar
        isOpen={sidebarOpen}
        isMobile={isMobile}
        builderOpen={builderOpen}
        onBuilderOpenChange={setBuilderOpen}
        focusTaskSignal={focusTaskSignal}
        docs={docs}
        outbox={outbox}
        isOnline={isOnline}
        busy={busy}
        sessionId={sessionId}
        companyName={companyName}
        workspaceSubtitle={workspaceSubtitle}
        onClose={() => setSidebarOpen(false)}
        onNewChat={() => setConfirmOpen(true)}
        onOpenSettings={() => setSettingsOpen(true)}
        onSendPrompt={(prompt) => handleSend(prompt)}
        onPrefillPrompt={handlePrefill}
        onSendQueuedItem={handleSendQueuedItem}
        onRemoveQueuedItem={handleRemoveQueuedItem}
        onToast={showToast}
        pwaInstall={pwaInstall}
      />

      <div
        className="flex min-h-0 min-w-0 flex-col overflow-hidden bg-[var(--canvas)]"
        inert={isMobile && sidebarOpen ? true : undefined}
      >
        <Toolbar
          sidebarOpen={sidebarOpen}
          isMobile={isMobile}
          onToggleSidebar={() => setSidebarOpen((prev) => !prev)}
          connectionStatus={effectiveConnectionStatus}
          viewMode={viewMode}
          onToggleViewMode={() => setViewMode((v) => (v === 'chat' ? 'help' : 'chat'))}
          theme={theme}
          onToggleTheme={() => setTheme((t) => (t === 'dark' ? 'light' : 'dark'))}
          onOpenSettings={() => setSettingsOpen(true)}
          onNewChat={() => setConfirmOpen(true)}
          onToast={showToast}
          pwaInstall={pwaInstall}
        />

        <PWAInstallButton
          pwaInstall={pwaInstall}
          variant="banner"
          isMobileViewport={isMobile}
          onInstalledToast={(m) => showToast(m, 'success')}
        />

        <OfflineBanner
          isOnline={isOnline}
          queuedCount={outbox.length}
          needRefresh={sw.needRefresh}
          onUpdateSW={sw.updateServiceWorker}
          onDismissRefresh={sw.dismissNeedRefresh}
          onFlushQueue={handleFlushQueue}
        />

        {viewMode === 'chat' ? (
          <ChatView
            messages={messages}
            outbox={outbox}
            inputValue={inputValue}
            onInputChange={setInputValue}
            inputRef={chatInputRef}
            busy={busy}
            workingStepText={WORKING_STEPS[workingStepIdx]}
            isOnline={isOnline}
            companyName={companyName}
            onSend={handleSend}
            onPrefill={handlePrefill}
            onReadWebpage={(url) =>
              handleSend(`Read and summarize the full details from this webpage: ${url}`)
            }
            onOpenSettings={() => setSettingsOpen(true)}
            onOpenConnectionHelp={() => setViewMode('help')}
            onSendQueuedItem={handleSendQueuedItem}
            onRemoveQueuedItem={handleRemoveQueuedItem}
          />
        ) : (
          <ConnectionHelpView onBack={() => setViewMode('chat')} />
        )}
      </div>

      <SettingsModal
        open={settingsOpen}
        webhookUrl={webhookUrl}
        serverConfig={serverConfig}
        authUser={authUser}
        authPass={authPass}
        companyName={companyName}
        workspaceSubtitle={workspaceSubtitle}
        sessionId={sessionId}
        swRegistered={sw.swRegistered}
        isOnline={isOnline}
        onSave={handleSaveSettings}
        onClose={() => setSettingsOpen(false)}
        onOpenConnectionHelp={() => setViewMode('help')}
        onToast={showToast}
        pwaInstall={pwaInstall}
      />

      <ConfirmModal
        open={confirmOpen}
        onCancel={() => setConfirmOpen(false)}
        onConfirm={handleConfirmNewChat}
      />

      <ToastStack toasts={toasts} />
    </div>
  );
}

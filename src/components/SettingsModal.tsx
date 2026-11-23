import React, { useEffect, useRef, useState } from 'react';
import { X, Copy, Check, Smartphone, Building2, KeyRound } from 'lucide-react';
import { validateWebhookUrl } from '../utils/chatLogic';
import { PWAInstallButton } from './PWAInstallButton';
import type { PWAInstallState } from '../hooks/usePWAInstall';
import type { ServerWebhookConfig } from '../types';

interface SettingsModalProps {
  open: boolean;
  webhookUrl: string;
  serverConfig: ServerWebhookConfig;
  authUser: string;
  authPass: string;
  companyName: string;
  workspaceSubtitle: string;
  sessionId: string;
  swRegistered: boolean;
  isOnline: boolean;
  onSave: (config: {
    webhookUrl: string;
    authUser: string;
    authPass: string;
    companyName: string;
    workspaceSubtitle: string;
  }) => void;
  onClose: () => void;
  onOpenConnectionHelp: () => void;
  onToast: (message: string, type: 'info' | 'success' | 'error') => void;
  pwaInstall: PWAInstallState;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  open,
  webhookUrl,
  serverConfig,
  authUser,
  authPass,
  companyName,
  workspaceSubtitle,
  sessionId,
  swRegistered,
  isOnline,
  onSave,
  onClose,
  onOpenConnectionHelp,
  onToast,
  pwaInstall,
}) => {
  const [urlValue, setUrlValue] = useState(webhookUrl);
  const [userValue, setUserValue] = useState(authUser);
  const [passValue, setPassValue] = useState(authPass);
  const [companyValue, setCompanyValue] = useState(companyName);
  const [subtitleValue, setSubtitleValue] = useState(workspaceSubtitle);
  const [copiedSession, setCopiedSession] = useState(false);
  const urlInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setUrlValue(webhookUrl);
      setUserValue(authUser);
      setPassValue(authPass);
      setCompanyValue(companyName);
      setSubtitleValue(workspaceSubtitle);
      setTimeout(() => urlInputRef.current?.focus(), 40);
    }
  }, [open, webhookUrl, authUser, authPass, companyName, workspaceSubtitle]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedUrl = urlValue.trim();
    if (trimmedUrl && !validateWebhookUrl(trimmedUrl)) {
      onToast('Webhook URL must start with http:// or https://', 'error');
      urlInputRef.current?.focus();
      return;
    }
    onSave({
      webhookUrl: trimmedUrl,
      authUser: userValue.trim(),
      authPass: passValue,
      companyName: companyValue.trim(),
      workspaceSubtitle: subtitleValue.trim(),
    });
  };

  const handleCopySession = async () => {
    try {
      await navigator.clipboard.writeText(sessionId);
      setCopiedSession(true);
      setTimeout(() => setCopiedSession(false), 1800);
    } catch {
      onToast('Could not copy session ID.', 'error');
    }
  };

  return (
    <div
      id="settingsModal"
      role="dialog"
      aria-modal="true"
      aria-labelledby="settingsTitle"
      className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/55 p-4 backdrop-blur-[1px]"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="max-h-[calc(100dvh-32px)] w-full max-w-lg overflow-y-auto rounded-[18px] border border-[var(--line)] bg-[var(--canvas)] p-5 text-[var(--foreground)] shadow-2xl">
        <div className="mb-4 flex items-center justify-between border-b border-[var(--line)] pb-3">
          <div>
            <h2 id="settingsTitle" className="text-base font-semibold text-[var(--foreground)]">
              Workspace &amp; connection settings
            </h2>
            <p className="mt-0.5 text-xs text-[var(--muted)]">
              Configure your client workspace and n8n chat webhook endpoint.
            </p>
          </div>
          <button
            id="closeSettingsBtn"
            type="button"
            onClick={onClose}
            aria-label="Close connection settings"
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-[var(--muted)] transition hover:bg-[var(--surface)] hover:text-[var(--foreground)]"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form id="settingsForm" onSubmit={handleSubmit} className="space-y-4" noValidate>
          {/* Multi-Company Client Profile */}
          <div className="rounded-xl border border-[var(--line)] bg-[var(--sidebar)] p-3.5">
            <div className="mb-2.5 flex items-center gap-2">
              <Building2 className="h-4 w-4 text-[var(--muted)]" />
              <p className="text-xs font-semibold text-[var(--foreground)]">
                Client Workspace Profile
              </p>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label
                  htmlFor="cfgCompanyName"
                  className="mb-1 block text-[11.5px] font-medium text-[var(--muted)]"
                >
                  Company / Client Name
                </label>
                <input
                  id="cfgCompanyName"
                  type="text"
                  value={companyValue}
                  onChange={(e) => setCompanyValue(e.target.value)}
                  placeholder="Enter company name"
                  className="min-h-[40px] w-full rounded-lg border border-[var(--control-line)] bg-[var(--surface)] px-3 py-2 text-base text-[var(--foreground)] placeholder:text-[var(--subtle)] transition focus:border-[var(--brand)] sm:text-xs"
                />
              </div>
              <div>
                <label
                  htmlFor="cfgWorkspaceSubtitle"
                  className="mb-1 block text-[11.5px] font-medium text-[var(--muted)]"
                >
                  Division / Office
                </label>
                <input
                  id="cfgWorkspaceSubtitle"
                  type="text"
                  value={subtitleValue}
                  onChange={(e) => setSubtitleValue(e.target.value)}
                  placeholder="Optional division or branch"
                  className="min-h-[40px] w-full rounded-lg border border-[var(--control-line)] bg-[var(--surface)] px-3 py-2 text-base text-[var(--foreground)] placeholder:text-[var(--subtle)] transition focus:border-[var(--brand)] sm:text-xs"
                />
              </div>
            </div>
          </div>

          {/* Server Secret & Optional Browser Override */}
          <div className="space-y-3 rounded-xl border border-[var(--line)] bg-[var(--sidebar)] p-3.5">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2">
                <KeyRound className="h-4 w-4 text-[var(--muted)]" />
                <p className="text-xs font-semibold text-[var(--foreground)]">
                  Backend Webhook Endpoint
                </p>
              </div>
              {serverConfig.webhookHost && !urlValue.trim() && (
                <span className="truncate font-mono text-[11px] text-[var(--subtle)]">
                  {serverConfig.webhookHost}
                </span>
              )}
            </div>

            <div className="rounded-lg border border-[var(--line)] bg-[var(--surface)] px-3 py-2.5 text-xs">
              {serverConfig.isInvalidSecret ? (
                <p className="font-medium text-amber-500">
                  The <code className="font-mono">N8N_WEBHOOK_URL</code> secret is invalid. Update
                  it to a valid HTTPS URL in the Secrets panel.
                </p>
              ) : serverConfig.usingServerSecret ? (
                <div>
                  <p className="font-medium text-[var(--foreground)]">
                    Active via <code className="font-mono text-[11px]">N8N_WEBHOOK_URL</code> secret
                  </p>
                  <p className="mt-0.5 text-[11.5px] leading-relaxed text-[var(--muted)]">
                    Update <code className="font-mono text-[11px]">N8N_WEBHOOK_URL</code> in Secrets
                    anytime your n8n webhook URL changes—no code edits required.
                  </p>
                </div>
              ) : (
                <div>
                  <p className="font-medium text-[var(--foreground)]">
                    Using built-in production endpoint
                  </p>
                  <p className="mt-0.5 text-[11.5px] leading-relaxed text-[var(--muted)]">
                    Add <code className="font-mono text-[11px]">N8N_WEBHOOK_URL</code> in the
                    Secrets panel to swap your production webhook URL anytime without code edits.
                  </p>
                </div>
              )}
            </div>

            <div>
              <label
                htmlFor="cfgWebhookUrl"
                className="mb-1.5 block text-[11.5px] font-medium text-[var(--muted)]"
              >
                Custom Browser Override (optional)
              </label>
              <input
                ref={urlInputRef}
                id="cfgWebhookUrl"
                type="url"
                value={urlValue}
                onChange={(e) => setUrlValue(e.target.value)}
                placeholder="Leave blank to use N8N_WEBHOOK_URL secret"
                className="min-h-[44px] w-full rounded-lg border border-[var(--control-line)] bg-[var(--surface)] px-3.5 py-2.5 font-mono text-base text-[var(--foreground)] placeholder:text-[var(--subtle)] transition focus:border-[var(--brand)] sm:min-h-[42px] sm:text-xs"
              />
              {urlValue.trim() && (
                <p className="mt-1.5 text-[11px] text-[var(--muted)]">
                  Browser override is active for this device. Clear it to follow the{' '}
                  <code className="font-mono">N8N_WEBHOOK_URL</code> secret.
                </p>
              )}
            </div>
          </div>

          <div className="rounded-xl border border-[var(--line)] bg-[var(--sidebar)] p-3.5">
            <p className="mb-2.5 text-xs font-semibold text-[var(--foreground)]">
              Optional Basic Auth (only if enabled in n8n)
            </p>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label
                  htmlFor="cfgAuthUser"
                  className="mb-1 block text-[11.5px] font-medium text-[var(--muted)]"
                >
                  Username
                </label>
                <input
                  id="cfgAuthUser"
                  type="text"
                  autoComplete="username"
                  value={userValue}
                  onChange={(e) => setUserValue(e.target.value)}
                  placeholder="Leave blank if public"
                  className="min-h-[40px] w-full rounded-lg border border-[var(--control-line)] bg-[var(--surface)] px-3 py-2 text-base text-[var(--foreground)] placeholder:text-[var(--subtle)] transition focus:border-[var(--brand)] sm:text-xs"
                />
              </div>
              <div>
                <label
                  htmlFor="cfgAuthPass"
                  className="mb-1 block text-[11.5px] font-medium text-[var(--muted)]"
                >
                  Password
                </label>
                <input
                  id="cfgAuthPass"
                  type="password"
                  autoComplete="current-password"
                  value={passValue}
                  onChange={(e) => setPassValue(e.target.value)}
                  placeholder="Stored in session only"
                  className="min-h-[40px] w-full rounded-lg border border-[var(--control-line)] bg-[var(--surface)] px-3 py-2 text-base text-[var(--foreground)] placeholder:text-[var(--subtle)] transition focus:border-[var(--brand)] sm:text-xs"
                />
              </div>
            </div>
          </div>

          {/* PWA & Offline App Info */}
          <div className="rounded-xl border border-[var(--line)] bg-[var(--sidebar)] p-3.5">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Smartphone className="h-4 w-4 text-[var(--muted)]" />
                <p className="text-xs font-semibold text-[var(--foreground)]">
                  App Installation &amp; Offline Support
                </p>
              </div>
              <span className="text-[11px] font-medium text-[var(--subtle)]">
                {isOnline ? 'Online' : 'Offline'} · {swRegistered ? 'Cached' : 'Standard'}
              </span>
            </div>

            <div className="mt-2.5 flex flex-wrap items-center justify-between gap-3">
              <PWAInstallButton
                pwaInstall={pwaInstall}
                variant="settings"
                onInstalledToast={(m) => onToast(m, 'success')}
              />

              <button
                type="button"
                onClick={handleCopySession}
                className="inline-flex min-h-[36px] items-center gap-1.5 rounded-lg border border-[var(--line)] bg-[var(--surface)] px-2.5 py-1.5 font-mono text-[11px] text-[var(--muted)] transition hover:text-[var(--foreground)]"
                title="Copy current chat session ID"
              >
                {copiedSession ? (
                  <>
                    <Check className="h-3.5 w-3.5 text-emerald-500" />
                    <span>Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="h-3.5 w-3.5" />
                    <span>{sessionId}</span>
                  </>
                )}
              </button>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 pt-2">
            <div className="flex items-center gap-2">
              {urlValue.trim() !== '' && (
                <button
                  id="resetUrlBtn"
                  type="button"
                  onClick={() => setUrlValue('')}
                  className="min-h-[40px] rounded-lg border border-[var(--line)] px-3 py-2 text-xs font-medium text-[var(--muted)] transition hover:bg-[var(--surface)] hover:text-[var(--foreground)]"
                >
                  Use Server Secret
                </button>
              )}
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenConnectionHelp();
                }}
                className="min-h-[40px] rounded-lg px-2.5 py-2 text-xs font-medium text-[var(--muted)] underline underline-offset-4 transition hover:text-[var(--foreground)]"
              >
                Setup guide
              </button>
            </div>

            <div className="flex items-center gap-2">
              <button
                id="cancelSettingsBtn"
                type="button"
                onClick={onClose}
                className="min-h-[40px] rounded-lg border border-[var(--line)] px-4 py-2 text-xs font-semibold text-[var(--foreground)] transition hover:bg-[var(--surface)]"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="min-h-[40px] rounded-lg bg-[var(--brand-solid)] px-4 py-2 text-xs font-semibold text-white transition hover:bg-[var(--brand-hover)]"
              >
                Save Settings
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

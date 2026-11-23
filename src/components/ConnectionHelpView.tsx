import React, { useEffect, useRef } from 'react';
import { ExternalLink } from 'lucide-react';

interface ConnectionHelpViewProps {
  onBack: () => void;
}

export const ConnectionHelpView: React.FC<ConnectionHelpViewProps> = ({ onBack }) => {
  const titleRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    titleRef.current?.focus();
  }, []);

  return (
    <section
      id="hostedFrameView"
      aria-labelledby="connectionHelpTitle"
      className="flex min-h-0 min-w-0 flex-1 flex-col overflow-y-auto bg-[var(--canvas)] text-[var(--foreground)]"
    >
      <div className="flex items-center justify-between border-b border-[var(--line)] bg-[var(--surface)] px-5 py-3 text-xs sm:px-6">
        <span className="font-medium text-[var(--muted)]">Connection help</span>
        <button
          id="backToCustomBtn"
          type="button"
          onClick={onBack}
          className="min-h-[36px] rounded-lg border border-[var(--line)] bg-[var(--canvas)] px-3.5 py-1.5 text-xs font-semibold text-[var(--foreground)] transition hover:bg-[var(--hover)]"
        >
          Back to assistant
        </button>
      </div>

      <div className="mx-auto w-full max-w-[760px] px-5 pt-7 pb-12 text-sm leading-[1.78] sm:px-6">
        <h2
          ref={titleRef}
          id="connectionHelpTitle"
          tabIndex={-1}
          className="mb-4 text-2xl font-semibold tracking-[-0.025em] text-[var(--foreground)] outline-none"
        >
          Connect this portal to your n8n webhook
        </h2>

        <p className="my-4 text-[var(--muted)]">
          This app sends chat messages via{' '}
          <code className="rounded bg-[var(--surface)] px-1.5 py-0.5 font-mono text-xs text-[var(--foreground)]">
            POST
          </code>{' '}
          with{' '}
          <code className="rounded bg-[var(--surface)] px-1.5 py-0.5 font-mono text-xs text-[var(--foreground)]">
            Content-Type: application/json
          </code>{' '}
          directly to your configured n8n webhook endpoint.
        </p>

        <ol className="list-decimal space-y-3 pl-6 text-[var(--muted)]">
          <li>
            Configure your n8n{' '}
            <strong className="font-semibold text-[var(--foreground)]">Webhook</strong> node to
            accept{' '}
            <code className="rounded bg-[var(--surface)] px-1.5 py-0.5 font-mono text-xs text-[var(--foreground)]">
              POST
            </code>{' '}
            JSON payloads containing{' '}
            <code className="rounded bg-[var(--surface)] px-1.5 py-0.5 font-mono text-xs text-[var(--foreground)]">
              {`{ "sessionId": "...", "message": "..." }`}
            </code>
            .
          </li>
          <li>
            Return a JSON response from{' '}
            <strong className="font-semibold text-[var(--foreground)]">Respond to Webhook</strong>{' '}
            containing{' '}
            <code className="rounded bg-[var(--surface)] px-1.5 py-0.5 font-mono text-xs text-[var(--foreground)]">
              {`{ "reply": "...", "sessionId": "..." }`}
            </code>{' '}
            (the app also falls back to{' '}
            <code className="rounded bg-[var(--surface)] px-1.5 py-0.5 font-mono text-xs text-[var(--foreground)]">
              output
            </code>{' '}
            if{' '}
            <code className="rounded bg-[var(--surface)] px-1.5 py-0.5 font-mono text-xs text-[var(--foreground)]">
              reply
            </code>{' '}
            is omitted).
          </li>
          <li>
            In the Webhook node options, set{' '}
            <strong className="font-semibold text-[var(--foreground)]">
              Allowed Origins (CORS)
            </strong>{' '}
            to{' '}
            <code className="rounded bg-[var(--surface)] px-1.5 py-0.5 font-mono text-xs text-[var(--foreground)]">
              *
            </code>{' '}
            (or this PWA’s hosted origin) so browser and installed PWA requests succeed.
          </li>
          <li>
            Set or update the{' '}
            <code className="rounded bg-[var(--surface)] px-1.5 py-0.5 font-mono text-xs text-[var(--foreground)]">
              N8N_WEBHOOK_URL
            </code>{' '}
            secret whenever your production{' '}
            <code className="rounded bg-[var(--surface)] px-1.5 py-0.5 font-mono text-xs text-[var(--foreground)]">
              /webhook/
            </code>{' '}
            URL changes. Leave the optional override field blank in{' '}
            <strong className="font-semibold text-[var(--foreground)]">Connection settings</strong>{' '}
            so every browser session uses your latest secret automatically.
          </li>
          <li>
            If testing with a temporary{' '}
            <code className="rounded bg-[var(--surface)] px-1.5 py-0.5 font-mono text-xs text-[var(--foreground)]">
              /webhook-test/
            </code>{' '}
            URL, paste it into the optional browser override in{' '}
            <strong className="font-semibold text-[var(--foreground)]">Connection settings</strong>{' '}
            and click <strong className="font-semibold text-[var(--foreground)]">Execute workflow</strong>{' '}
            in n8n before sending a message.
          </li>
        </ol>

        <p className="my-4 text-[var(--muted)]">
          A{' '}
          <strong className="font-semibold text-[var(--foreground)]">
            404 “webhook is not registered”
          </strong>{' '}
          response means n8n is not currently listening at that URL. A browser network error can
          also come from CORS, a server error, or a network problem.
        </p>

        <a
          href="https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.webhook/"
          target="_blank"
          rel="noopener noreferrer"
          className="mt-2 inline-flex items-center gap-1.5 font-medium text-[var(--foreground)] underline underline-offset-4 transition hover:text-[var(--brand)]"
        >
          <span>n8n Webhook node documentation</span>
          <ExternalLink className="h-3.5 w-3.5" />
        </a>
      </div>
    </section>
  );
};

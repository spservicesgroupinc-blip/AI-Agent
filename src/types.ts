export type ThemeMode = 'dark' | 'light';

export type ViewMode = 'chat' | 'help';

export type ConnectionKind = 'idle' | 'ready' | 'working' | 'error' | 'offline';

export interface ConnectionStatus {
  kind: ConnectionKind;
  label: string;
}

export interface ServerWebhookConfig {
  loaded: boolean;
  proxyAvailable: boolean;
  usingServerSecret: boolean;
  webhookHost: string | null;
  isInvalidSecret: boolean;
}


export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'error';
  text: string;
  time: string;
  errorTitle?: string;
  showActions?: boolean;
}

export interface SessionDoc {
  type: 'Drive' | 'Doc' | 'Sheet' | 'Slides' | 'Calendar' | 'Web';
  url: string;
  label: string;
  time: string;
}

export interface QueuedPrompt {
  id: string;
  text: string;
  createdAt: string;
}

export interface QuickTaskInput {
  title: string;
  dueDate: string;
  notes: string;
}

export interface ToastItem {
  id: string;
  message: string;
  type: 'info' | 'success' | 'error';
}

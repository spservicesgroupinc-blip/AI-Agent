export function safeGetStorage(store: Storage | undefined, key: string, fallback: string): string {
  if (!store) return fallback;
  try {
    const val = store.getItem(key);
    return val !== null ? val : fallback;
  } catch {
    return fallback;
  }
}

export function safeSetStorage(store: Storage | undefined, key: string, value: string): void {
  if (!store) return;
  try {
    store.setItem(key, value);
  } catch {
    // Ignore storage quota or sandbox restrictions
  }
}

export function safeParseJson<T>(raw: string, fallback: T): T {
  try {
    const parsed = JSON.parse(raw);
    return parsed as T;
  } catch {
    return fallback;
  }
}

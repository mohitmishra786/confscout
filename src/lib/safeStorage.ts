/**
 * Quota-safe storage helpers (issues #162, #163, #223).
 * sessionStorage/localStorage can throw QuotaExceededError in private mode
 * or when the origin is full — never let that crash the UI.
 */

export type StorageKind = 'local' | 'session';

function getStore(kind: StorageKind): Storage | null {
  if (typeof window === 'undefined') return null;
  try {
    return kind === 'local' ? window.localStorage : window.sessionStorage;
  } catch {
    return null;
  }
}

export function safeGetItem(kind: StorageKind, key: string): string | null {
  const store = getStore(kind);
  if (!store) return null;
  try {
    return store.getItem(key);
  } catch {
    return null;
  }
}

export function safeSetItem(kind: StorageKind, key: string, value: string): boolean {
  const store = getStore(kind);
  if (!store) return false;
  try {
    store.setItem(key, value);
    return true;
  } catch {
    // Quota exceeded — try to free compare/ephemeral keys then retry once.
    try {
      store.removeItem(key);
      store.setItem(key, value);
      return true;
    } catch {
      return false;
    }
  }
}

export function safeRemoveItem(kind: StorageKind, key: string): void {
  const store = getStore(kind);
  if (!store) return;
  try {
    store.removeItem(key);
  } catch {
    // ignore
  }
}

export function safeParseJson<T>(raw: string | null, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

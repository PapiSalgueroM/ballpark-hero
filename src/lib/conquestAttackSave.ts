import { parseAttackSave, type AttackState } from '@/lib/conquestAttack';

export const ATTACK_SAVE_KEY = 'dukb-conquest-attack-soccer-v1';
const ATTACK_LOCK_KEY = `${ATTACK_SAVE_KEY}-write`;

export interface AttackStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export interface AttackLockManager {
  request<T>(name: string, work: () => T | PromiseLike<T>): Promise<T>;
}

export type AttackSaveLoad =
  | { kind: 'empty'; raw: null }
  | { kind: 'saved'; raw: string; state: AttackState }
  | { kind: 'damaged'; raw: string }
  | { kind: 'blocked'; raw: null };

export interface AttackCommitResult {
  status: 'saved' | 'conflict' | 'unavailable';
  raw?: string;
}

function browserStorage(): AttackStorage | null {
  try {
    return typeof window === 'undefined' ? null : window.localStorage;
  } catch {
    return null;
  }
}

function browserLocks(): AttackLockManager | null {
  if (typeof navigator === 'undefined' || !navigator.locks) return null;
  return navigator.locks as unknown as AttackLockManager;
}

export function loadAttackSave(_dataVersion: string, storage: AttackStorage | null = browserStorage()): AttackSaveLoad {
  if (!storage) return { kind: 'blocked', raw: null };
  try {
    const raw = storage.getItem(ATTACK_SAVE_KEY);
    if (raw === null) return { kind: 'empty', raw: null };
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      return { kind: 'damaged', raw };
    }
    const state = parseAttackSave(parsed);
    if (!state) return { kind: 'damaged', raw };
    return { kind: 'saved', raw, state };
  } catch {
    return { kind: 'blocked', raw: null };
  }
}

export async function commitAttackSave(
  expectedRaw: string | null,
  next: AttackState,
  dependencies: { storage?: AttackStorage | null; locks?: AttackLockManager | null } = {},
): Promise<AttackCommitResult> {
  const storage = dependencies.storage === undefined ? browserStorage() : dependencies.storage;
  const locks = dependencies.locks === undefined ? browserLocks() : dependencies.locks;
  if (!storage || !locks || !parseAttackSave(next)) return { status: 'unavailable' };
  const nextRaw = JSON.stringify(next);
  try {
    return await locks.request(ATTACK_LOCK_KEY, () => {
      let current: string | null;
      try {
        current = storage.getItem(ATTACK_SAVE_KEY);
      } catch {
        return { status: 'unavailable' } as const;
      }
      if (current !== expectedRaw) return { status: 'conflict' } as const;
      try {
        storage.setItem(ATTACK_SAVE_KEY, nextRaw);
        if (storage.getItem(ATTACK_SAVE_KEY) !== nextRaw) return { status: 'conflict' } as const;
      } catch {
        return { status: 'unavailable' } as const;
      }
      return { status: 'saved', raw: nextRaw } as const;
    });
  } catch {
    return { status: 'unavailable' };
  }
}

export type ProgressHydrationStatus = 'idle' | 'pending' | 'ready' | 'failed';

export interface ProgressHydrationSnapshot {
  userId: string;
  generation: number;
  status: ProgressHydrationStatus;
  promise: Promise<boolean> | null;
}

let currentHydration: ProgressHydrationSnapshot | null = null;
let hydrationGeneration = 0;

/**
 * Starts a fresh hydration generation only when the signed-in identity
 * changes. A settled decision stays attached to that identity so duplicate
 * auth callbacks cannot restore the same remote snapshot over a newer play.
 */
export function resetProgressHydration(userId: string | null): void {
  hydrationGeneration += 1;
  currentHydration = userId
    ? { userId, generation: hydrationGeneration, status: 'idle', promise: null }
    : null;
}

/**
 * Runs the initial profile-progress read once for this identity generation.
 * Failure remains distinguishable from success so gameplay can stay local
 * without writing a blank snapshot over remote history that was not read.
 */
export function ensureProgressHydration(
  userId: string,
  hydrate: () => Promise<boolean>,
): Promise<boolean> {
  if (!currentHydration || currentHydration.userId !== userId) {
    resetProgressHydration(userId);
  }

  const existing = currentHydration as ProgressHydrationSnapshot;
  if (existing.status === 'ready') return Promise.resolve(true);
  if (existing.status === 'failed') return Promise.resolve(false);
  if (existing.status === 'pending' && existing.promise) return existing.promise;

  const task: ProgressHydrationSnapshot = {
    userId,
    generation: existing.generation,
    status: 'pending',
    promise: null,
  };
  const promise = Promise.resolve()
    .then(hydrate)
    .then(result => result === true, () => false)
    .then(success => {
      if (currentHydration === task) {
        currentHydration = {
          userId,
          generation: task.generation,
          status: success ? 'ready' : 'failed',
          promise: null,
        };
      }
      return success;
    });

  task.promise = promise;
  currentHydration = task;
  return promise;
}

/** Captures the hydration decision that existed when a play happened. */
export function getProgressHydrationSnapshot(): ProgressHydrationSnapshot | null {
  return currentHydration ? { ...currentHydration } : null;
}

/** True only while a captured play still belongs to the active auth generation. */
export function isCurrentProgressHydration(snapshot: ProgressHydrationSnapshot): boolean {
  return currentHydration?.userId === snapshot.userId
    && currentHydration.generation === snapshot.generation;
}

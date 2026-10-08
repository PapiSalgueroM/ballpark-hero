import { useEffect, useRef, useState } from 'react';

type Task = { callback: () => void; due: number; repeat: number; timer: ReturnType<typeof setTimeout> | null };

/** A practice clock counts only playing time. Pausing preserves every pending
 * delay, including the remainder of the current interval tick. */
export function usePracticeClock(active: boolean) {
  const [paused, setPaused] = useState(false);
  const activeRef = useRef(active);
  activeRef.current = active;
  const api = useRef<ReturnType<typeof createClock> | null>(null);
  if (!api.current) api.current = createClock(setPaused);
  const clock = api.current;

  useEffect(() => {
    clock.mount();
    const blur = () => { if (activeRef.current) clock.pause(); };
    const visibility = () => { if (document.hidden) blur(); };
    window.addEventListener('blur', blur);
    document.addEventListener('visibilitychange', visibility);
    return () => {
      window.removeEventListener('blur', blur);
      document.removeEventListener('visibilitychange', visibility);
      clock.unmount();
    };
  }, [clock]);
  useEffect(() => { if (!active) clock.reset(); }, [active, clock]);

  return { ...clock, paused };
}

function createClock(setPaused: (paused: boolean) => void) {
  const tasks = new Map<number, Task>();
  let nextId = 1;
  let mounted = true;
  let stoppedAt: number | null = null;
  let excluded = 0;
  const now = () => (stoppedAt ?? Date.now()) - excluded;
  const isPaused = () => stoppedAt !== null;
  const arm = (id: number, task: Task) => {
    if (!mounted || isPaused()) return;
    task.timer = setTimeout(() => {
      if (!mounted || isPaused() || tasks.get(id) !== task) return;
      task.timer = null;
      if (task.repeat) task.due += task.repeat;
      else tasks.delete(id);
      task.callback();
      if (task.repeat && tasks.get(id) === task) arm(id, task);
    }, Math.max(0, task.due - now()));
  };
  const schedule = (callback: () => void, delay: number, repeat: number) => {
    const id = nextId++;
    if (!mounted) return id;
    const task: Task = { callback, due: now() + delay, repeat, timer: null };
    tasks.set(id, task);
    arm(id, task);
    return id;
  };
  const clear = (id: number | null) => {
    if (id === null) return;
    const task = tasks.get(id);
    if (task?.timer != null) clearTimeout(task.timer);
    tasks.delete(id);
  };
  const clearAll = () => { for (const id of tasks.keys()) clear(id); };
  const pause = () => {
    if (!mounted || isPaused()) return;
    stoppedAt = Date.now();
    for (const task of tasks.values()) {
      if (task.timer !== null) clearTimeout(task.timer);
      task.timer = null;
    }
    setPaused(true);
  };
  const resume = () => {
    if (!mounted || stoppedAt === null || document.hidden) return;
    excluded += Date.now() - stoppedAt;
    stoppedAt = null;
    for (const [id, task] of tasks) arm(id, task);
    setPaused(false);
  };
  const reset = () => {
    clearAll();
    stoppedAt = null;
    excluded = 0;
    if (mounted) setPaused(false);
  };
  return {
    now, isPaused, pause, resume, reset, clear, clearAll,
    timeout: (callback: () => void, delay: number) => schedule(callback, delay, 0),
    interval: (callback: () => void, delay: number) => schedule(callback, delay, delay),
    mount: () => { mounted = true; },
    unmount: () => { mounted = false; clearAll(); },
  };
}

export type PracticeClock = ReturnType<typeof usePracticeClock>;

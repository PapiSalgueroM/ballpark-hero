/* ─── Round 1132: a sound plan that runs once ───
   A screen that wants sound says what should be heard when it appears:
   useSoundPlan(key, play => { play('tap', { delay: 0.6 }); ... }).

   - The plan runs once for a key: again only when the key changes, never on a
     plain re-render. A null key plays nothing.
   - Every mounted hook owns one scope, and the player it hands the plan is
     sound() bound to that scope. So a binder cannot forget it, and leaving the
     screen (or a new key) hushes THIS plan alone: a whistle another screen
     asked for carries on.
   - The first effect has no dependency list on purpose. The guard on
     playedKey is the whole once rule, kept on a named property so a harness
     can break exactly that comparison and hear the plan repeat.
   - The unmount effect resets the key, so a strict mode double mount plays
     once: the first plan is hushed before it sounds.
   - stillMotion() answers at the moment a plan runs, never at render, so it
     changes no markup and no server render. */
import { useEffect, useRef } from 'react';
import { hush, sound, type SoundMoment } from '@/lib/sound';

/** True when the visitor asked the system for less motion: a plan then plays its still form. */
export const stillMotion = (): boolean =>
  typeof window !== 'undefined' && typeof window.matchMedia === 'function'
  && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/** What a plan is handed: sound(), bound to the scope of the hook that runs it. */
export type PlanPlayer = (moment: SoundMoment, opts?: { delay?: number }) => void;

export function useSoundPlan(key: string | null, plan: (play: PlanPlayer) => void): void {
  const mem = useRef<{ playedKey: string | null; scope: object }>({ playedKey: null, scope: {} });
  useEffect(() => {
    if (key === null || mem.current.playedKey === key) return;
    const m = mem.current;
    /* a new key while the old plan is still sounding: the old one goes first */
    if (m.playedKey !== null) hush(m.scope);
    m.playedKey = key;
    plan((moment, opts) => sound(moment, { delay: opts?.delay, scope: m.scope }));
  });
  useEffect(() => {
    const m = mem.current;
    return () => { m.playedKey = null; hush(m.scope); };
  }, []);
}

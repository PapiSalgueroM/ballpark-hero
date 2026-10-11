import { useRef, useState } from 'react';
import {
  acceptFormulaOffer, advanceFormulaCareer, createFormulaCareer, negotiateFormulaOffer,
  parseFormulaCareer, qualifyFormulaCareer, raceFormulaCareer, retireFormulaCareer,
  type FormulaApproach, type FormulaFocus, type FormulaState,
} from '@/lib/formulaCareer';
import { recordCompletion } from '@/lib/completions';

export const FORMULA_SAVE_KEY = 'dukb-formula-career-v1';
const COMPLETION_KEY = 'dukb-formula-career-completion-v1';

function readCareer() {
  try {
    const raw = localStorage.getItem(FORMULA_SAVE_KEY);
    if (!raw) return { career: null, recovery: false, error: '' };
    const career = parseFormulaCareer(raw);
    return { career, recovery: !career, error: career ? '' : 'This save could not be read. It stays on this device until you choose a new career.' };
  } catch {
    return { career: null, recovery: false, error: 'Browser storage is unavailable. Your career needs a working local save.' };
  }
}

export function useFormulaCareer() {
  const [initial] = useState(readCareer);
  const [career, setCareer] = useState<FormulaState | null>(initial.career);
  const [error, setError] = useState(initial.error);
  const current = useRef(initial.career);

  const commit = (next: FormulaState): boolean => {
    const previous = current.current;
    if (next === previous) return false;
    try {
      localStorage.setItem(FORMULA_SAVE_KEY, JSON.stringify(next));
    } catch {
      setError('Your career could not be saved. Nothing advanced. Free some browser storage and try again.');
      return false;
    }
    current.current = next;
    setCareer(next);
    setError('');
    if (next.completionEvent && next.completionEvent !== previous?.completionEvent) {
      try {
        if (localStorage.getItem(COMPLETION_KEY) !== next.completionEvent) {
          localStorage.setItem(COMPLETION_KEY, next.completionEvent);
          recordCompletion('/f1-career', undefined, next.drivers.find(driver => driver.id === 'player')!.name);
        }
      } catch {
        setError('Your career is saved, but this completed play could not be recorded.');
      }
    }
    return true;
  };

  const act = (action: (state: FormulaState) => FormulaState) => {
    const previous = current.current;
    return previous ? commit(action(previous)) : false;
  };

  const start = (name: string, replace = false, expected?: FormulaState) => {
    if (current.current && (!replace || current.current !== expected)) return false;
    const clean = name.trim();
    if (!clean || clean.length > 28) {
      setError('Choose a driver name from 1 to 28 characters.');
      return false;
    }
    try {
      const seed = crypto.getRandomValues(new Uint32Array(1))[0];
      return commit(createFormulaCareer(clean, seed));
    } catch {
      setError('A new saved career could not be created in this browser. Your previous save stays untouched.');
      return false;
    }
  };

  return {
    career, error, recovery: !career && initial.recovery, start,
    qualify: (id: string, focus: FormulaFocus, approach: FormulaApproach) =>
      act(state => qualifyFormulaCareer(state, id, focus, approach)),
    race: (id: string) => act(state => raceFormulaCareer(state, id)),
    advance: (id: string) => act(state => advanceFormulaCareer(state, id)),
    negotiate: (id: string) => act(state => negotiateFormulaOffer(state, id)),
    accept: (id: string) => act(state => acceptFormulaOffer(state, id)),
    retire: () => act(retireFormulaCareer),
  };
}

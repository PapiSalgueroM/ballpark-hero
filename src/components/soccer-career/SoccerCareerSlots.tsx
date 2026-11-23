import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import type { ContinueSave } from '@/data/continueSaves';
import type { CareerState } from '@/lib/soccerCareerEngine';
import { isSoccerCareerSave, parseSoccerCareerSave } from '@/lib/soccerCareerSave';
import { getStorageTrouble } from '@/lib/safeStorage';

type SlotSummary =
  | { kind: 'saved'; playerName: string; club: string; age: number }
  | { kind: 'empty' | 'unreadable' | 'unavailable' };

function readSlot(saveKey: string): SlotSummary {
  if (getStorageTrouble() === 'blocked') return { kind: 'unavailable' };
  let raw: string | null;
  try {
    raw = localStorage.getItem(saveKey);
  } catch {
    return { kind: 'unavailable' };
  }
  if (raw === null) return { kind: 'empty' };
  try {
    const parsed = parseSoccerCareerSave(raw);
    if (isSoccerCareerSave(parsed)) {
      const { playerName, currentClub, age } = parsed as CareerState;
      return { kind: 'saved', playerName, club: currentClub, age };
    }
  } catch {
    // Keep the slot visible so its recovery screen can inspect the saved bytes.
  }
  return { kind: 'unreadable' };
}

const SLOT_LABELS = {
  empty: 'Empty slot',
  unreadable: 'Unreadable career',
  unavailable: 'Storage unavailable',
} as const;

export default function SoccerCareerSlots({ slots, backPath }: { slots: readonly ContinueSave[]; backPath: string }) {
  const [summaries, setSummaries] = useState(() => slots.map(slot => readSlot(slot.saveKey)));
  useEffect(() => {
    const refresh = () => setSummaries(slots.map(slot => readSlot(slot.saveKey)));
    const onStorage = ({ key }: StorageEvent) => {
      if (key === null || slots.some(slot => slot.saveKey === key)) refresh();
    };
    window.addEventListener('storage', onStorage);
    window.addEventListener('focus', refresh);
    return () => {
      window.removeEventListener('storage', onStorage);
      window.removeEventListener('focus', refresh);
    };
  }, [slots]);

  return (
    <section aria-labelledby="soccer-career-slots" className="space-y-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h1 id="soccer-career-slots" className="text-xl font-bold">Career saves</h1>
          <p className="text-sm text-muted-foreground">Keep up to {slots.length} careers in this browser.</p>
        </div>
        <Button asChild variant="ghost" size="lg" className="shrink-0 px-3">
          <Link to={backPath}>Back</Link>
        </Button>
      </div>
      <ul className="grid gap-3 sm:grid-cols-3">
        {slots.map(({ path, saveKey }, index) => {
          const slot = summaries[index];
          const number = index + 1;
          const action = slot.kind === 'saved' ? `Resume slot ${number}`
            : slot.kind === 'empty' ? `New career in slot ${number}` : `Review slot ${number}`;
          return (
            <li key={saveKey} className="flex min-w-0 flex-col gap-2 rounded-xl border border-border bg-card p-3">
              <h2 className="text-xs font-semibold text-muted-foreground">Slot {number}</h2>
              <div>
                <p className="break-words font-bold">{slot.kind === 'saved' ? slot.playerName.trim() || 'Unnamed player' : SLOT_LABELS[slot.kind]}</p>
                {slot.kind === 'saved' && <p className="break-words text-sm text-muted-foreground">{slot.club} · Age {slot.age}</p>}
              </div>
              {slot.kind !== 'unavailable' && (
                <Button asChild variant={slot.kind === 'saved' ? 'default' : 'outline'} className="mt-auto h-auto min-h-11 w-full whitespace-normal px-3 text-center">
                  <Link to={path}>{action}</Link>
                </Button>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}

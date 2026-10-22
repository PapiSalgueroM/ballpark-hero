/* Round 1522: Round 505's carry, out of useClubManager.ts so the tactics tab and the live sheet's reshape share
 * one rule. Its own small module, not the engine, so the engine (and the two dailies that load it) carry none of
 * it: the hook and clubManagerTactics.ts import it. It imports the engine at run time, which does not import it. */
import { autoPickXI, dutyLineOf, dutyOptions, pitchLineOf } from '@/lib/clubManager';
import type { CMPlayer, Duty, Formation, FormationSlot } from '@/lib/clubManager';

/**
 * Round 505's carry: the tactics tab and the live sheet move an eleven to a new shape
 * by one rule: every man to the first free slot wearing his old slot's label, then one on his old duty line, then
 * the same band of the pitch, then any that is left, his duty riding along wherever the new slot's line offers it.
 * Whatever is still empty is filled by autoPickXI over `squad` minus the men placed (the live sheet hands it an
 * eleven, so nothing is ever empty there). Pure, no draw. useClubManager's carryAcross is this with the tab's lists.
 */
export function carryShape(oldIds: (string | null)[], oldDuties: (Duty | null)[], from: Formation, to: Formation, squad: CMPlayer[]): { xiIds: (string | null)[]; xiDuties: (Duty | null)[] } {
  const xiIds: (string | null)[] = to.slots.map(() => null);
  const xiDuties: (Duty | null)[] = to.slots.map(() => null);
  const taken = new Set<number>();
  const placed = new Set<string>();
  const place = (i: number, j: number, id: string) => {
    taken.add(j);
    placed.add(id);
    xiIds[j] = id;
    const d = oldDuties[i] ?? null;
    xiDuties[j] = d && dutyOptions(to.slots[j]).includes(d) ? d : null;
  };
  const freeSlot = (ok: (t: FormationSlot) => boolean): number => to.slots.findIndex((t, k) => !taken.has(k) && ok(t));
  const picked = from.slots
    .map((sl, i) => ({ sl, i, id: oldIds[i] }))
    .filter((x): x is { sl: FormationSlot; i: number; id: string } => !!x.id && squad.some(p => p.id === x.id));
  const unmatched: typeof picked = [];
  for (const x of picked) {
    if (placed.has(x.id)) continue;
    const j = freeSlot(t => t.label === x.sl.label);
    if (j < 0) { unmatched.push(x); continue; }
    place(x.i, j, x.id);
  }
  for (const x of unmatched) {
    if (placed.has(x.id)) continue;
    const dutyLine = dutyLineOf(x.sl);
    const pitchLine = pitchLineOf(x.sl);
    let j = freeSlot(t => dutyLineOf(t) === dutyLine);
    if (j < 0) j = freeSlot(t => pitchLineOf(t) === pitchLine);
    if (j < 0) j = freeSlot(() => true);
    if (j < 0) break;
    place(x.i, j, x.id);
  }
  const empty = to.slots.map((_, j) => j).filter(j => xiIds[j] === null);
  if (empty.length) {
    const used = new Set(xiIds.filter((id): id is string => !!id));
    const picks = autoPickXI(squad.filter(p => !used.has(p.id)), { name: to.name, slots: empty.map(j => to.slots[j]) });
    empty.forEach((j, k) => { xiIds[j] = picks[k] ?? null; });
  }
  return { xiIds, xiDuties };
}

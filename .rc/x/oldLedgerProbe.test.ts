// Reviewer probe (Round 1600, read lens), never committed. PHASE=write: start a seeded Everton career, buy three
// men from Arsenal, Chelsea or Liverpool, save it, dump localStorage to LEDGER_FILE. PHASE=read: load that dump with
// this tree's loadCareer and ask whether each bought man is listed again at the club that sold him (the seller
// resurrection the world roster ledger exists to prevent), on load and one season on. Fails on any resurrection.
import { describe, expect, it, vi } from 'vitest';
import fs from 'node:fs';
import { buildMarket, buyPlayer, loadCareer, oppRosterFor, saveCareer, startCareer, startNextSeason } from '@/lib/clubManager';
import { readWorldRoster } from '@/lib/clubManagerWorldRoster';

const FILE = process.env.LEDGER_FILE ?? '/tmp/ledger.json';
const PHASE = process.env.PHASE ?? 'write';

function withRoll<T>(value: number, action: () => T): T {
  const random = vi.spyOn(Math, 'random').mockReturnValue(value);
  try { return action(); } finally { random.mockRestore(); }
}

function sellerCheck(c: any, names: [string, string, number][], when: string): string[] {
  const back: string[] = [];
  for (const [name, club] of names) {
    const atSeller = oppRosterFor(c, club).filter((p: any) => p.n === name).map((p: any) => `${p.a}/${p.r}`);
    const inSquad = c.squad.filter((p: any) => p.name === name).map((p: any) => `${p.age}/${p.rating}`);
    console.log(`PROBE ${when} ${name} sold by ${club}: at seller ${JSON.stringify(atSeller)}, in my squad ${JSON.stringify(inSquad)}`);
    if (atSeller.length) back.push(name);
  }
  console.log(`PROBE ${when} RESURRECTED ${back.length} of ${names.length}`);
  /* Every ledger record: is the man still listed at the club he came from, and is he at his owner? */
  const recs = readWorldRoster(c)?.records ?? [];
  let both = 0;
  for (const r of recs as any[]) {
    const nm = r.origin.name;
    const atOrigin = r.origin.club === c.clubName ? c.squad.filter((p: any) => p.name === nm).length
      : oppRosterFor(c, r.origin.club).filter((p: any) => p.n === nm).length;
    const atOwner = !r.owner ? 0 : r.owner === c.clubName ? c.squad.filter((p: any) => p.name === nm).length
      : oppRosterFor(c, r.owner).filter((p: any) => p.n === nm).length;
    const twice = r.origin.club !== r.owner && atOrigin > 0 && (atOwner > 0 || r.status !== 'owned');
    if (twice) both++;
    console.log(`PROBE ${when} REC ${nm} ${r.status} from ${r.origin.club} (born ${r.origin.birthYear}) to ${r.owner}: at origin ${atOrigin}, at owner ${atOwner}${twice ? ' STILL AT ORIGIN' : ''}`);
  }
  console.log(`PROBE ${when} RECORDS ${recs.length}, still listed at the club they left ${both}`);
  if (both) back.push(`records:${both}`);
  return back;
}

describe('old ledger probe', () => {
  it(`phase ${PHASE}`, () => {
    if (PHASE === 'write') {
      const c0: any = withRoll(0.6, () => startCareer('Everton'));
      let s: any = { ...c0, budget: 9999, wageCap: 9999, transferWindow: 'summer' };
      const offers = buildMarket(s).filter((p: any) => ['Arsenal', 'Chelsea', 'Liverpool'].includes(p.club)
        && p.age < 29 && p.position !== 'GK');
      console.log(`PROBE write offers ${offers.length}, window ${s.transferWindow}, squad ${s.squad.length}`);
      const names: [string, string, number][] = [];
      for (const o of offers) {
        if (names.length >= 3) break;
        const next = buyPlayer(s, o);
        if (next) { s = next; names.push([o.name, o.club, o.age]); }
      }
      console.log(`PROBE write bought ${JSON.stringify(names)}, ledger records ${readWorldRoster(s)?.records.length}, seed ${s.worldSeed}`);
      expect(names.length).toBeGreaterThan(0);
      sellerCheck(s, names, 'write-same-tree');
      localStorage.clear();
      expect(saveCareer(s)).toBe(true);
      const dump: Record<string, string | null> = {};
      for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i)!; dump[k] = localStorage.getItem(k); }
      fs.writeFileSync(FILE, JSON.stringify({ names, dump }));
      return;
    }
    const { names, dump } = JSON.parse(fs.readFileSync(FILE, 'utf8'));
    localStorage.clear();
    for (const [k, v] of Object.entries(dump)) if (v !== null) localStorage.setItem(k, v as string);
    const loaded: any = withRoll(0.6, () => loadCareer());
    expect(loaded).not.toBeNull();
    console.log(`PROBE read ledger records ${readWorldRoster(loaded)?.records.length}, seed ${loaded.worldSeed}`);
    const back0 = sellerCheck(loaded, names, 'on-load');
    let back1: string[] = [];
    try {
      const next: any = withRoll(0.6, () => startNextSeason(loaded));
      console.log(`PROBE next season ${next.season}, ledger records ${readWorldRoster(next)?.records.length}`);
      back1 = sellerCheck(next, names, 'season-two');
    } catch (e) { console.log(`PROBE next season threw ${(e as Error).message}`); }
    expect([...back0, ...back1]).toEqual([]);
  });
});

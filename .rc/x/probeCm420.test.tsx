/* Reviewer probe 2, PR 420: why do young shortlist targets go "Unavailable in the current market" after a season? */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { finishSeason, marketForScreen, playNextEntry, startCareer, startNextSeason, type CareerState } from '@/lib/clubManager';
import { addRecruitment, recruitmentOf, resolveRecruitmentTarget } from '@/lib/clubManagerRecruitment';

let seed = 0;
beforeEach(() => {
  seed = 4242;
  vi.spyOn(Math, 'random').mockImplementation(() => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; });
});
afterEach(() => { vi.restoreAllMocks(); localStorage.clear(); });
const log = (...a: unknown[]) => console.log('PROBE2', ...a);

function classify(c: CareerState, label: string) {
  const r = recruitmentOf(c), m = marketForScreen(c);
  if (!r) { log(label, 'shortlist LOST'); return { ok: 0, total: 0, movedFindable: 0 }; }
  let ok = 0, movedFindable = 0;
  for (const t of r.targets) {
    const p = resolveRecruitmentTarget(c, t, m);
    if (p) { ok++; continue; }
    const byName = m.filter(x => x.name === t.name);
    const sameKey = t.worldRosterKey ? m.filter(x => x.worldRosterKey === t.worldRosterKey) : [];
    const mine = c.squad.some(x => x.name === t.name);
    if (byName.length) movedFindable++;
    log(label, 'UNRESOLVED', JSON.stringify({ name: t.name, savedAt: t.club, pos: t.position, cohort: t.cohort, key: t.worldRosterKey ?? null,
      nowListed: byName.map(x => ({ club: x.club, pos: x.position, cohort: (c.startYear + c.season - 1) - x.age, key: x.worldRosterKey ?? null })),
      sameKeyListed: sameKey.length, inMySquad: mine, gone: c.goneNames.includes(t.name), retired: (c.retiredNames ?? []).includes(t.name) }));
  }
  log(label, 'resolved', ok, 'of', r.targets.length, 'unresolved but listed in the market by name', movedFindable);
  return { ok, total: r.targets.length, movedFindable };
}

describe('PR 420 shortlist across a season', () => {
  it('counts targets aged 19 to 27 that a season later are listed in the market but shown as unavailable', () => {
    let listedButLost = 0, total = 0;
    for (const club of ['Everton', 'Brentford', 'Chelsea', 'Real Madrid']) {
      let c = startCareer(club); const m = marketForScreen(c);
      const pool = m.filter(p => p.age >= 19 && p.age <= 27);
      const step = Math.max(1, Math.floor(pool.length / 12));
      for (let i = 0; i < 12; i++) { const n = addRecruitment(c, pool[i * step]); if (n) c = n; }
      log(club, 'saved', recruitmentOf(c)?.targets.length, 'with key', recruitmentOf(c)?.targets.filter(t => t.worldRosterKey).length);
      let s = c, steps = 0, mid = false;
      while (steps++ < 160) {
        const r = playNextEntry(s, { skipHalftime: true }); s = r.state;
        if (!mid && s.transferWindow === null && s.week > 6) { classify(s, club + ' after summer window'); mid = true; }
        if (r.kind === 'seasonOver') break;
      }
      const next = startNextSeason(finishSeason(s).state);
      const res = classify(next, club + ' season 2');
      listedButLost += res.movedFindable; total += res.total;
    }
    log('TOTAL listed by name but shown unavailable', listedButLost, 'of', total);
    expect(total).toBeGreaterThan(0);
  });
});

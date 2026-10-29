import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { FALLBACK_CLUBS, manualRetire } from '@/lib/soccerCareerEngine';
import type { CareerState, ClubData } from '@/lib/soccerCareerEngine';
import { adjustClubsForYear } from '@/lib/careerEras';
import { coachingStartChoices, startCoachingAppointment } from '@/lib/soccerCareerCoachingStart';

const ERA_FOR: Record<number, string> = { 2007: '1990-94', 2012: '1995-99', 2017: '2000-04', 2022: '2005-09', 2025: '2010-14', 2030: '2015-19' };
function base(): CareerState {
  const packet = JSON.parse(readFileSync(resolve(process.cwd(), 'scripts/data/careerLeagueWorldSaves1100.json'), 'utf8'));
  const saved = packet.saves.find((e: { id: string }) => e.id === 'ere');
  const input = structuredClone(saved.state) as CareerState;
  input.phase = 'playing'; input.retired = false; input.age = 34;
  const s = manualRetire(input);
  s.phase = 'retirement_ceremony'; s.postRetirementChoice = null; s.managerState = null;
  s.lifeFlags = { ...(s.lifeFlags ?? {}), coachingBadges: 3 };
  return s;
}
/* A career whose last playing season is lastYear: shift every season so the last one lands there. */
function retiredIn(b: CareerState, lastYear: number, name: string): CareerState {
  const s = structuredClone(b);
  const shift = lastYear - s.seasons[s.seasons.length - 1].year;
  s.seasons = s.seasons.map(x => ({ ...x, year: x.year + shift }));
  s.playerName = name; s.era = ERA_FOR[lastYear] ?? s.era;
  return s;
}
const N = 400;
describe('vfbs sc418 era probe', () => {
  it('measures chooser clubs the era filter drops', () => {
    const b = base();
    const lines: string[] = [];
    // Control 1: the era filter really drops tier 3+ clubs in 2013 (the detector can fire).
    const raw3 = FALLBACK_CLUBS.filter(c => c.tier >= 3);
    const kept2013 = new Set(adjustClubsForYear(FALLBACK_CLUBS, 2013).map(c => c.name));
    const dropped2013 = raw3.filter(c => !kept2013.has(c.name));
    lines.push(`C1 tier3+ raw=${raw3.length} droppedByEraIn2013=${dropped2013.length} mumbaiDropped=${!kept2013.has('Mumbai City')} mumbaiInPool=${FALLBACK_CLUBS.some(c => c.name === 'Mumbai City' && c.tier >= 3)}`);
    expect(dropped2013.length).toBeGreaterThan(0);
    for (const lastYear of [2007, 2012, 2017, 2022, 2025, 2030]) {
      const firstJob = lastYear + 1;
      const kept = new Set(adjustClubsForYear(FALLBACK_CLUBS, firstJob).map(c => c.name));
      let setsBad = 0, offered = 0, offeredBad = 0, setsBadFiltered = 0, typed = 0;
      const tally = new Map<string, number>();
      for (let i = 0; i < N; i++) {
        const s = retiredIn(b, lastYear, `Probe Player ${i}`);
        const q = coachingStartChoices(s, FALLBACK_CLUBS);
        offered += q.length;
        const bad = q.filter(x => !kept.has(x.clubName));
        offeredBad += bad.length;
        if (bad.length) setsBad++;
        for (const x of bad) tally.set(x.clubName, (tally.get(x.clubName) ?? 0) + 1);
        if (q.some(x => ['Mumbai City', 'Auckland FC', 'Al Duhail', 'Atlanta United'].includes(x.clubName) && !kept.has(x.clubName))) typed++;
        // Control 2: the same chooser fed the era filtered pool never offers a dropped club.
        const qf = coachingStartChoices(s, adjustClubsForYear(FALLBACK_CLUBS, firstJob));
        if (qf.some(x => !kept.has(x.clubName))) setsBadFiltered++;
      }
      const top = [...tally.entries()].sort((a, c) => c[1] - a[1]).slice(0, 4).map(([k, v]) => `${k}:${v}`).join(',');
      lines.push(`L1 firstJob=${firstJob} sets=${N} setsWithEraDroppedClub=${setsBad} offered=${offered} offeredDropped=${offeredBad} typedFoundingSets=${typed} filteredPoolBadSets=${setsBadFiltered} top=${top}`);
      expect(setsBadFiltered).toBe(0);
    }
    // End to end: a 2013 first job where the chooser names Mumbai City (founded 2014), and picking it starts the manager career there.
    let shown = '';
    let found: CareerState | null = null;
    for (let i = 0; i < 20000 && !found; i++) {
      const s = retiredIn(b, 2012, `Probe Player ${i}`);
      const q = coachingStartChoices(s, FALLBACK_CLUBS);
      const m = q.find(x => x.clubName === 'Mumbai City');
      if (m) {
        shown = q.map(x => `${x.clubName} ${x.country} Club level ${x.level}`).join(' | ');
        const after = startCoachingAppointment(s, FALLBACK_CLUBS, m);
        found = after;
        lines.push(`E2E name="Probe Player ${i}" chooser="${shown}" phase=${after.phase} managerClub=${after.managerState?.club} tier=${after.managerState?.clubTier} firstManagerSeason=${s.seasons[s.seasons.length - 1].year + 1} eraPoolHasIt=${adjustClubsForYear(FALLBACK_CLUBS, 2013).some(c => c.name === 'Mumbai City')}`);
      }
    }
    lines.push(`E2E found=${!!found}`);
    // Old random path baseline: share of the tier 3+ pool it can pick that the era filter drops in 2013.
    lines.push(`OLD randomPathPool=${raw3.length} droppedIn2013=${dropped2013.length} in2008=${raw3.filter(c => !new Set(adjustClubsForYear(FALLBACK_CLUBS, 2008).map(x => x.name)).has(c.name)).length}`);
    for (const l of lines) console.log('VFBS ' + l);
    expect(found).not.toBeNull();
  }, 600000);
});

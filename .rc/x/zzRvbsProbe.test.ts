import { it, expect } from 'vitest';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import * as E from '@/lib/soccerCareerEngine';
import type { CareerState } from '@/lib/soccerCareerEngine';
import { adjustClubsForYear } from '@/lib/careerEras';
import { coachingStartChoices } from '@/lib/soccerCareerCoachingStart';
import { advanceReviewedManagerSeason, setManagerJobReview, quoteManagerJob, resolveManagerJob } from '@/lib/soccerCareerManagerJobReview';
import { allOfferClubs } from '@/lib/managerJobMarket';

const OUT = process.env.RC_OUT || '/tmp';
const clubs = E.FALLBACK_CLUBS;
function seed(n: number) { let a = n >>> 0; Math.random = () => { a += 0x6D2B79F5; let t = a; t = Math.imul(t ^ t >>> 15, t | 1); t ^= t + Math.imul(t ^ t >>> 7, t | 61); return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
function base(): CareerState {
  const packet = JSON.parse(readFileSync(resolve(process.cwd(), 'scripts/data/careerLeagueWorldSaves1100.json'), 'utf8'));
  const input = structuredClone(packet.saves.find((s: { id: string }) => s.id === 'ere').state) as CareerState;
  input.phase = 'playing'; input.retired = false; input.age = 34;
  const s = E.manualRetire(input);
  s.phase = 'retirement_ceremony'; s.postRetirementChoice = null; s.managerState = null;
  s.lifeFlags = { ...(s.lifeFlags ?? {}), coachingBadges: 3 };
  return s;
}
const count = (name: string) => clubs.filter(c => c.name === name).length;

it('L1 chooser offers clubs the era table says did not exist', () => {
  const real = Math.random; seed(1);
  const b = base(), lines: string[] = [];
  for (const Y of [2007, 2012, 2017, 2022, 2025, 2030]) {
    let sets = 0, setsWithMissing = 0, offered = 0, missing = 0, tierShift = 0; const examples = new Set<string>();
    const alive = new Map(adjustClubsForYear(clubs, Y + 1).map(c => [c.id, c]));
    const pool = clubs.filter(c => c.tier >= 3), poolMissing = pool.filter(c => !alive.has(c.id)).length;
    for (let k = 0; k < 400; k++) {
      const st = { ...b, playerName: 'Probe ' + k, seasons: b.seasons.map((r, i) => i === b.seasons.length - 1 ? { ...r, year: Y } : r) } as CareerState;
      const q = coachingStartChoices(st, clubs); sets++; offered += q.length;
      const miss = q.filter(x => !alive.has(x.clubId)); missing += miss.length; if (miss.length) setsWithMissing++;
      if (examples.size < 4) miss.forEach(x => examples.add(x.clubName));
      tierShift += q.filter(x => alive.has(x.clubId) && alive.get(x.clubId)!.tier !== x.level).length;
    }
    lines.push(`L1 retireYear=${Y} sets=${sets} setsWithNonexistentClub=${setsWithMissing} offered=${offered} nonexistent=${missing} eraTierDiffers=${tierShift} randomPathPoolNonexistent=${poolMissing}/${pool.length} e.g. ${[...examples].join(' | ')}`);
  }
  Math.random = real;
  console.log(lines.join('\n')); writeFileSync(resolve(OUT, 'L1.txt'), lines.join('\n'));
});

it('L2 review bypass: market and duplicate names', async () => {
  await E.loadManagerMarket();
  const market = allOfferClubs().filter(c => c.tier >= 2);
  const notUnique = market.filter(c => count(c.name) !== 1);
  const dupDest = clubs.filter(c => c.tier <= 2 && count(c.name) !== 1);
  const dupSrc = clubs.filter(c => c.tier >= 2 && count(c.name) !== 1);
  const lines = [`L2 marketClubsTier2plus=${market.length} notUniqueInCareerList=${notUnique.length} e.g. ${notUnique.slice(0, 8).map(c => c.name + ' t' + c.tier).join(' | ')}`,
    `L2 careerDestTier1or2DupNames=${dupDest.length} ${dupDest.map(c => c.name).join(' | ')}`, `L2 careerSrcTier2plusDupNames=${dupSrc.length} ${dupSrc.map(c => c.name).join(' | ')}`];
  const real = Math.random;
  let advances = 0, poachAuto = 0, intercepted = 0, bypass = 0, bypassMarketSrc = 0, natLeak = 0, natAll = 0; const ex: string[] = [];
  for (let c = 0; c < 600; c++) {
    seed(1000 + c);
    let s = E.choosePostRetirement(base(), 'manager', clubs);
    s = setManagerJobReview(s, clubs, true);
    for (let n = 0; n < 30 && s.phase === 'manager_season'; n++) {
      const before = s.managerState!;
      if (before.unemployed) { s = E.advanceManagerSeason(s, clubs); if (s.managerState!.offers?.length) { s = E.acceptManagerOffer(s, 0); s = setManagerJobReview(s, clubs, true); } continue; }
      const r = advanceReviewedManagerSeason(s, clubs); advances++;
      const q = quoteManagerJob(r, clubs);
      if (q) {
        intercepted++;
        const p = (r as any).managerJobReview.pending;
        if (r.managerState!.nationalTeamOffer && !before.nationalTeamOffer) { natAll++; if (p.from.clubTier > 2) natLeak++; }
        s = resolveManagerJob(r, clubs, q, n % 2 ? 'accept' : 'stay');
      } else {
        if (r.managerState!.departure === 'poached' && r.managerState!.club !== before.club) {
          bypass++; if (count(before.club) !== 1) bypassMarketSrc++;
          if (ex.length < 6) ex.push(`${before.club}(t${before.clubTier},inList=${count(before.club)})->${r.managerState!.club}`);
        }
        s = r;
      }
    }
  }
  Math.random = real;
  lines.push(`L2 sim careers=600 employedAdvances=${advances} intercepted=${intercepted} bypassedWhileReviewOn=${bypass} bypassSourceNotUnique=${bypassMarketSrc} e.g. ${ex.join(' | ')}`);
  lines.push(`L3 natCallsOnInterceptedSeasons=${natAll} fromTier3or4=${natLeak}`);
  console.log(lines.join('\n')); writeFileSync(resolve(OUT, 'L2.txt'), lines.join('\n'));
  expect(advances).toBeGreaterThan(0);
}, 600000);

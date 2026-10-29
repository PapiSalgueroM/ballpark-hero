import { it, expect } from 'vitest';
import * as E from '@/lib/soccerCareerEngine';
import type { CareerState } from '@/lib/soccerCareerEngine';
import { advanceReviewedManagerSeason, readManagerJobReview, setManagerJobReview } from '@/lib/soccerCareerManagerJobReview';
import { manager, seeded } from './helpers/managerJobReviewFixtures';

const clubs = E.FALLBACK_CLUBS;
const inList = (name: string) => clubs.filter(c => c.name === name).length;
const out: string[] = [];
const log = (s: string) => { out.push(s); console.log(s); };

/* The engine's own path: sacked, a season out (refreshManagerOffers draws from
   the market), accept an offer whose club name is not in the career list. */
function marketJob(seedFrom: number): { state: CareerState; seed: number; club: string; tier: number } | null {
  const base = manager();
  for (let seed = seedFrom; seed < seedFrom + 400; seed++) {
    const sacked: CareerState = structuredClone(base);
    sacked.managerState = { ...sacked.managerState!, unemployed: true, departure: 'sacked', offers: [] };
    const out1 = seeded(seed, () => E.advanceManagerSeason(sacked, clubs)).value;
    const offers = out1.managerState?.offers ?? [];
    const idx = offers.findIndex(o => inList(o.club) === 0 && o.tier >= 2 && o.tier <= 4);
    if (idx < 0) continue;
    const took = E.acceptManagerOffer(out1, idx);
    return { state: took, seed, club: offers[idx].club, tier: offers[idx].tier };
  }
  return null;
}

function poachSeeds(state: CareerState, label: string) {
  let poaches = 0, intercepted = 0, auto = 0; const ex: string[] = [];
  for (let seed = 1; seed <= 3000; seed++) {
    const engine = seeded(seed, () => E.advanceManagerSeason(structuredClone(state), clubs)).value;
    const b = state.managerState!, a = engine.managerState!;
    if (a.unemployed || a.departure !== 'poached' || a.club === b.club) continue;
    poaches++;
    const reviewed = seeded(seed, () => advanceReviewedManagerSeason(structuredClone(state), clubs)).value;
    const rs = reviewed.managerState!;
    const pend = readManagerJobReview(reviewed, clubs)?.pending;
    if (pend) intercepted++;
    else if (rs.club === a.club && rs.departure === 'poached') {
      auto++;
      if (ex.length < 3) ex.push(`seed${seed} ${b.club}(t${b.clubTier},inList=${inList(b.club)})->${rs.club}(t${rs.clubTier}) event="${String(reviewed.events[reviewed.events.length - 1]).slice(0, 160)}"`);
    }
  }
  log(`${label} poaches=${poaches} intercepted=${intercepted} autoMovedWhileReviewOn=${auto} ${ex.join(' || ')}`);
  return { poaches, intercepted, auto };
}

it('BS-sc419-1 market job bypasses review', async () => {
  await E.loadManagerMarket();
  // Control: the PR fixture club (Malmo FF, in the list) is intercepted.
  const control = setManagerJobReview(manager(), clubs, true);
  log(`C0 controlClub=${control.managerState!.club} inList=${inList(control.managerState!.club)} reviewOn=${readManagerJobReview(control, clubs)?.enabled === true}`);
  const c = poachSeeds(control, 'C1 control');
  expect(c.poaches).toBeGreaterThan(0);
  expect(c.intercepted).toBe(c.poaches);

  let found = 0, totalAuto = 0, totalPoach = 0, from = 1;
  for (let k = 0; k < 6; k++) {
    const job = marketJob(from);
    if (!job) break;
    from = job.seed + 1;
    const on = setManagerJobReview(job.state, clubs, true);
    const enabled = readManagerJobReview(on, clubs)?.enabled === true;
    log(`M${k} offerSeed=${job.seed} took=${job.club} t${job.tier} inList=${inList(job.club)} clubNow=${on.managerState!.club} season=${on.managerState!.season} reviewOnPanel=${enabled} panelText="${enabled ? 'On: choose whether to take an earned job move.' : 'Off'}"`);
    const r = poachSeeds(on, `M${k} market`);
    found++; totalAuto += r.auto; totalPoach += r.poaches;
  }
  log(`SUMMARY marketJobs=${found} poaches=${totalPoach} autoMovedWhileReviewOn=${totalAuto}`);
  console.log('PROBE_OUT\n' + out.join('\n'));
  expect(found).toBeGreaterThan(0);
}, 600000);

/* Round 1218. A fleet of managed Club Manager matches with reviews asked for, counted.
 *
 * scripts/simCmVar.mjs plays it for its bands section, and scripts/measureCmVarEngine.mjs plays it to measure
 * what the generator needs (reviewable goals a match, awards a match per unit of rate). One walk, two readers,
 * so the measure and the band cannot be taken on two different fleets.
 *
 * The engine is bundled with esbuild. A caller can hand in another rates module (the generated one is
 * src/data/clubManagerVarRates.ts): that is how a probe rate, a control's old constant or the fixture rates of
 * the mechanics outcomes reach the engine without a source file being touched.
 */
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { build } from 'esbuild';

const require = createRequire(import.meta.url);
let seq = 0;

/** Bundle src/lib/clubManager.ts. ratesSource, when given, stands in for @/data/clubManagerVarRates. */
export async function bundleCm(root, folder, { ratesSource = null, engineSource = null } = {}) {
  seq += 1;
  const fwd = p => p.replaceAll('\\', '/');
  const out = path.join(folder, `fleet-${seq}.cjs`);
  const alias = { '@': fwd(path.join(root, 'src')) };
  let entry = path.join(root, 'src/lib/clubManager.ts');
  if (ratesSource !== null) {
    const leaf = path.join(folder, `fleet-${seq}-rates.ts`);
    fs.writeFileSync(leaf, ratesSource);
    alias['@/data/clubManagerVarRates'] = fwd(leaf);
  }
  if (engineSource !== null) {
    entry = path.join(folder, `fleet-${seq}-engine.ts`);
    fs.writeFileSync(entry, engineSource);
    alias['@/lib/clubManager'] = fwd(entry);
  }
  await build({ entryPoints: [entry], bundle: true, platform: 'node', format: 'cjs', outfile: out, logLevel: 'silent', alias });
  return require(out);
}

const realRandom = Math.random, realNow = Date.now;
/** One seeded stretch of engine code, on a fixed clock. */
export function seeded(seed, fn) {
  let a = seed >>> 0;
  Math.random = () => { a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  Date.now = () => 1791547200000;
  try { return fn(); } finally { Math.random = realRandom; Date.now = realNow; }
}

/** Five clubs from each league whose row says yes, so the fleet is the football the rule applies to. */
export const FLEET_CLUBS = [
  'Everton', 'Arsenal', 'Brighton', 'Fulham', 'Newcastle',
  'Real Madrid', 'Sevilla', 'Villarreal', 'Getafe', 'Osasuna',
  'Napoli', 'Roma', 'Torino', 'Bologna', 'Udinese',
  'Bayern Munich', 'Freiburg', 'Mainz', 'Augsburg', 'Union Berlin',
];

const empty = () => ({ matches: 0, goals: 0, reviewableGoals: 0, fouls: 0, penalties: 0, ruledOut: 0, goalConfirmed: 0, penaltyConfirmed: 0, penaltyAwarded: 0, awardedScored: 0, matchesWithReview: 0, goalsOff: 0, resultMoved: 0 });
/** Walk every club one season per seed, reviews asked for at every kickoff. Returns the counts by the
 *  report's own competition (league, cup, uclGroup, uclKo), and the league counts seed by seed. */
export function playFleet(cm, { seeds, clubs = FLEET_CLUBS, perClub = 60, reviews = true, paired = false }) {
  const out = { byKind: { league: empty(), cup: empty(), uclGroup: empty(), uclKo: empty() }, careers: 0, seeds: seeds.length, perSeed: [] };
  for (const seed of seeds) {
    const mine = empty();
    clubs.forEach((club, c) => {
      let state = seeded(seed * 1000 + c, () => cm.startCareer(club));
      out.careers += 1;
      let played = 0;
      for (let i = 0; i < 400 && played < perClub; i++) {
        const res = seeded(seed * 100003 + c * 7919 + i, () => cm.playNextEntry(state, { skipHalftime: true, noCoach: true, ...(reviews ? { varReviews: true } : {}) }));
        if (res.kind === 'seasonOver' || res.state?.sacked) break;
        /* paired: the same match from the same save and seed with no review asked for, so the goal gap is the
           reviews' own doing and not two different samples. */
        const off = paired && res.kind === 'match' && res.report ? seeded(seed * 100003 + c * 7919 + i, () => cm.playNextEntry(state, { skipHalftime: true, noCoach: true })).report : null;
        state = res.state;
        if (res.kind !== 'match' || !res.report) continue;
        played += 1;
        const r = res.report, play = r.detail?.play ?? [];
        const rv = play.filter(e => e.kind === 'var');
        const scorers = [...(r.myScorers ?? []), ...(r.oppScorers ?? [])];
        const count = t => {
          t.matches += 1;
          t.goals += r.homeGoals + r.awayGoals;
          if (off) { t.goalsOff += off.homeGoals + off.awayGoals; if (Math.sign(off.homeGoals - off.awayGoals) !== Math.sign(r.homeGoals - r.awayGoals)) t.resultMoved += 1; }
          t.reviewableGoals += scorers.filter(g => !g.penalty && !g.freeKick).length;
          t.fouls += play.filter(e => e.kind === 'foul').length;
          t.penalties += play.filter(e => e.kind === 'shot' && e.penalty).length;
          for (const e of rv) {
            const d = e.review ?? {};
            if (d.incident === 'goal' && d.decision === 'disallowed') t.ruledOut += 1;
            if (d.incident === 'goal' && d.decision === 'confirmed') t.goalConfirmed += 1;
            if (d.incident === 'penalty' && d.decision === 'confirmed') t.penaltyConfirmed += 1;
            if (d.incident === 'penalty' && d.decision === 'awarded') t.penaltyAwarded += 1;
          }
          t.awardedScored += play.filter(e => e.kind === 'shot' && e.goal && e.review?.decision === 'awarded').length;
          if (rv.length) t.matchesWithReview += 1;
        };
        count(out.byKind[r.competition]);
        if (r.competition === 'league') count(mine);
      }
    });
    out.perSeed.push(mine);
  }
  return out;
}

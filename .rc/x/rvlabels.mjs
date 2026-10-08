/* Reviewer probe (never committed): what the Week by week TABLE actually names, league by league.
     node .rc/x/rvlabels.mjs
   For every club of every sized league a player is signed there (the harness's own buildPlayerSave way),
   plays up to six seasons, and every table season is derived exactly as the page derives it. Counted from
   the LABELS the page renders (not from ctx): rows unnamed, whether the champions are unnamed, and which
   real club of the league is left out. The harness's own measure (1 + rivals + named + champion) is printed beside it. */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { bundleCareerSources } from '../../scripts/lib/careerClubPool.mjs';
import { careerStep, seedRandom } from '../../scripts/lib/careerStep.mjs';

const ROOT = process.cwd();
globalThis.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {}, clear: () => {} };
const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'rvlabels-'));
const M = await bundleCareerSources({ root: ROOT, tmpDir, extra: { league: 'lib/soccerCareerLeague.ts', season: 'lib/season/soccer.ts', core: 'lib/season/core.ts', pool: 'data/soccerCareerClubPool.ts' } });
const { engine: E, league: LG, season: SE, core: C } = M;
const POOL = E.FALLBACK_CLUBS;
const LADDER = M.pool.CAREER_LEAGUE_LADDER;
const abil = o => ({ pace: o, shooting: o, passing: o, dribbling: o, defending: o, physical: o, reflexes: o });
const leagues = Object.keys(LADDER).filter(l => LG.leagueSizeFor(l, 2030));
const out = {};
let derivedNull = 0;
for (const lg of leagues) {
  const t = (out[lg] = { seasons: 0, table: 0, unnamedRows: 0, champUnnamed: 0, nonTitle: 0, missing: {}, harnessFull: 0, pageFull: 0, why: {}, posOff: 0 });
  const clubs = LADDER[lg].flat();
  for (let ci = 0; ci < clubs.length; ci += 1) {
    const row0 = POOL.find(c => c.name === clubs[ci] && c.league === lg);
    if (!row0) continue;
    seedRandom(0x1a6e15 + ci * 7919 + lg.length * 131);
    let s = E.initCareer(`Label ${ci}`, row0.country, ['ST', 'CM', 'CB', 'GK'][ci % 4], '2025', abil(70), 70, 2025, POOL, null, 86);
    let guard = 0;
    while (s.phase !== 'contract_offer' && !s.retired && guard++ < 80) s = careerStep(E, s, POOL);
    if (s.phase !== 'contract_offer') continue;
    s = E.acceptOffer(s, { club: row0, contractYears: 6, wage: 20000, transferFee: 0 });
    let rows = s.seasons.length, played = 0;
    guard = 0;
    while (!s.retired && guard++ < 90 && played < 6) {
      s = s.phase === 'transfer_window' ? E.stayAtClub(s, POOL) : careerStep(E, s, POOL);
      if (s.seasons.length <= rows) continue;
      rows = s.seasons.length;
      const r = s.seasons[rows - 1];
      if (r.type !== 'playing' || r.club !== row0.name || r.year < 2026 || !(r.apps > 0) || r.injurySevere) continue;
      played += 1;
      t.seasons += 1;
      const keep = Math.random;
      Math.random = () => { throw new Error('Math.random while reading a season'); };
      try {
        const ctx = SE.buildSoccerSeasonCtx(s, POOL, r);
        if (ctx.mode !== 'table') { t.why[ctx.why] = (t.why[ctx.why] ?? 0) + 1; continue; }
        const d = C.deriveSeason(SE.SOCCER, r, ctx);
        if (!d) { derivedNull += 1; continue; }
        t.table += 1;
        const size = LG.readLeagueFinish(r).size;
        const final = C.tableAt(d, d.games.length);
        const labels = d.labels;
        const unnamed = labels.filter(l => !l.named).length;
        t.unnamedRows += unnamed;
        if (unnamed === 0) t.pageFull += 1;
        const names = new Set([...ctx.rivals, ...ctx.named, ...(ctx.champion ? [ctx.champion] : [])]);
        names.delete(r.club);
        if (Math.min(size, 1 + names.size) === size) t.harnessFull += 1;
        const mine = final.findIndex(x => x.slot === 0) + 1;
        if (mine !== r.leagueFinish) t.posOff += 1;
        if (!r.leagueTitle) { t.nonTitle += 1; if (!labels[final[0].slot].named) t.champUnnamed += 1; }
        const shown = new Set(labels.filter(l => l.named).map(l => l.name));
        for (const n of clubs) if (!shown.has(n)) t.missing[n] = (t.missing[n] ?? 0) + 1;
      } finally { Math.random = keep; }
    }
  }
}
console.log('league | seasons | table seasons | page: every row named | harness measure says every row named | non title table seasons | champions unnamed | mean unnamed rows | his row off the saved finish | results reasons');
let worst = 0;
for (const [lg, t] of Object.entries(out)) {
  const miss = Object.entries(t.missing).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([n, k]) => `${n} ${k}`).join(', ');
  console.log(`${lg} | ${t.seasons} | ${t.table} | ${t.pageFull} | ${t.harnessFull} | ${t.nonTitle} | ${t.champUnnamed} | ${t.table ? (t.unnamedRows / t.table).toFixed(2) : '-'} | ${t.posOff} | ${JSON.stringify(t.why)}`);
  if (miss) console.log(`   real clubs of the league most often missing from its table: ${miss}`);
  worst += t.champUnnamed;
}
console.log(`derive answered null on ${derivedNull} table seasons`);
console.log(`rvlabels: ${worst} table seasons crown "another club"`);
process.exit(0);

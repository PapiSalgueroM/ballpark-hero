/* Reviewer's old save probe for Round 1100 (never committed). Runs on the runner from the repo root:
     node .rc/x/rvsaves.mjs <baseRef>          (origin/main or origin/release-al-int)
   Builds saves with the BASE tree's engine (git archive into ./.rvbase), then reads and plays them
   on the branch: repairCareer parity, what every saved row prints, three more seasons, the dugout
   words, and the absolute band against the base over a random cross. Prints counts and examples. */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { bundleCareerSources } from '../../scripts/lib/careerClubPool.mjs';
import { careerStep, seedRandom } from '../../scripts/lib/careerStep.mjs';

const REF = process.argv[2] || 'origin/main';
const ROOT = process.cwd();
const BASE = path.join(ROOT, '.rvbase', REF.replace(/[^a-z0-9]+/gi, '-'));
fs.mkdirSync(BASE, { recursive: true });
execSync(`git archive ${REF} src | tar -x -C "${BASE}"`, { stdio: 'inherit' });
globalThis.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {}, clear: () => {} };
const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'rvsaves-'));
const EXTRA = { league: 'lib/soccerCareerLeague.ts', season: 'lib/season/soccer.ts' };
const B = await bundleCareerSources({ root: BASE, tmpDir, extra: EXTRA });
const H = await bundleCareerSources({ root: ROOT, tmpDir, extra: EXTRA });
const BP = B.engine.FALLBACK_CLUBS, HP = H.engine.FALLBACK_CLUBS;
console.log(`base ${REF}: ${BP.length} clubs; branch: ${HP.length} clubs`);
let bad = 0;
const flag = msg => { bad += 1; console.log(`FINDING ${msg}`); };
const clone = x => JSON.parse(JSON.stringify(x));
const abil = o => ({ pace: o, shooting: o, passing: o, dribbling: o, defending: o, physical: o, reflexes: o });

/* ── 1. saves made by the base engine ── */
const NATIONS = ['England', 'Spain', 'Germany', 'Italy', 'France', 'Netherlands', 'Portugal', 'Turkey', 'Belgium', 'Scotland', 'Brazil', 'Argentina', 'Mexico', 'USA', 'Saudi Arabia', 'Japan', 'Nigeria', 'Austria', 'Australia', 'Croatia'];
const STARTS = [2025, 2025, 2025, 2012, 1998];
const saves = [];
for (let ni = 0; ni < NATIONS.length; ni += 1) {
  for (let c = 0; c < 30; c += 1) {
    const start = STARTS[c % STARTS.length];
    seedRandom(0x51ab + ni * 7919 + c * 104729);
    const ovr = 48 + (c % 26);
    let s;
    try { s = B.engine.initCareer(`Old ${ni}.${c}`, NATIONS[ni], ['ST', 'CM', 'CB', 'GK'][c % 4], String(start), abil(ovr), ovr, start, BP, null); } catch (e) { console.log(`base initCareer threw for ${NATIONS[ni]} ${start}: ${String(e).slice(0, 120)}`); continue; }
    let guard = 0, taken = 0;
    while (!s.retired && guard++ < 150 && taken < 3) {
      s = careerStep(B.engine, s, BP);
      const rows = s.seasons.filter(r => r.type === 'playing');
      if (s.phase === 'playing' && rows.length >= 3 + taken * 4 && rows[rows.length - 1].year >= 2026) { saves.push({ id: `${NATIONS[ni]}.${c}.${taken}`, state: clone(s) }); taken += 1; }
    }
  }
}
console.log(`1. ${saves.length} playing saves built by the base engine (${new Set(saves.map(x => x.state.currentLeague)).size} leagues)`);

/* ── 2. repairCareer parity, and the load guard ── */
let repairDiff = 0, guardNo = 0;
for (const sv of saves) {
  seedRandom(77); const a = JSON.stringify(B.engine.repairCareer(clone(sv.state)));
  seedRandom(77); const b = JSON.stringify(H.engine.repairCareer(clone(sv.state)));
  if (a !== b) { repairDiff += 1; if (repairDiff <= 3) { let i = 0; while (a[i] === b[i]) i += 1; flag(`repairCareer differs on ${sv.id} at byte ${i}: base "...${a.slice(Math.max(0, i - 60), i + 60)}" branch "...${b.slice(Math.max(0, i - 60), i + 60)}"`); } }
  if (H.save.isSoccerCareerSave && !H.save.isSoccerCareerSave(sv.state)) guardNo += 1;
}
console.log(`2. repairCareer: ${saves.length - repairDiff} of ${saves.length} saves serialise the same on the branch; the load guard refuses ${guardNo}`);
if (guardNo) flag(`the branch's load guard refuses ${guardNo} base saves`);

/* ── 3. what every saved row prints, base beside branch ── */
const readRow = (M, P, state, r) => {
  const keep = Math.random; Math.random = () => { throw new Error('Math.random while reading a row'); };
  try {
    const today = P.find(c => c.name === r.club)?.league ?? '';
    const fin = M.league.readLeagueFinish(r);
    const fl = M.league.finishLeague({ name: r.club, league: today }, r.year, fin?.size ?? null);
    const ctx = M.season.buildSoccerSeasonCtx(state, P, r);
    return { fin: fin ? `${fin.finish}/${fin.size}` : '-', league: fl ? fl.name : '-', mode: ctx.mode, why: ctx.why ?? '', games: ctx.games, named: new Set([...(ctx.rivals ?? []), ...(ctx.named ?? [])]).size };
  } catch (e) { return { threw: String(e).slice(0, 160) }; } finally { Math.random = keep; }
};
const moved = {};
let rowsRead = 0, threw = 0;
for (const sv of saves) {
  for (const r of sv.state.seasons.filter(x => x.type === 'playing')) {
    rowsRead += 1;
    const a = readRow(B, BP, sv.state, r), b = readRow(H, HP, sv.state, r);
    if (b.threw) { threw += 1; if (threw <= 3) flag(`the branch THROWS reading ${sv.id} ${r.club} ${r.year}: ${b.threw}`); continue; }
    if (a.threw) continue;
    const era = r.year >= 2026 ? '2026+' : 'past';
    for (const f of ['fin', 'league', 'mode', 'why', 'games']) {
      if (a[f] === b[f]) continue;
      const today = HP.find(c => c.name === r.club)?.league ?? '(not in list)';
      const k = `${era} | ${f}: ${a[f]} -> ${b[f]} | ${today}`;
      (moved[k] ??= { n: 0, eg: `${sv.id} ${r.club} ${r.year} saved finish ${a.fin}` }).n += 1;
    }
    if (b.named < a.named) (moved[`${era} | named rows FELL | ${HP.find(c => c.name === r.club)?.league}`] ??= { n: 0, eg: `${sv.id} ${r.club} ${r.year} ${a.named} -> ${b.named}` }).n += 1;
  }
}
console.log(`3. ${rowsRead} saved playing rows read on both trees; rows the branch reads differently (${Object.keys(moved).length} kinds):`);
for (const [k, v] of Object.entries(moved).sort((x, y) => y[1].n - x[1].n).slice(0, 60)) console.log(`   ${String(v.n).padStart(5)} x ${k}   e.g. ${v.eg}`);
for (const [k, v] of Object.entries(moved)) {
  if (/\| (fin|league): /.test(k)) flag(`a saved row prints another finish or league on the branch: ${v.n} x ${k} (${v.eg})`);
  if (/mode: results -> table/.test(k) && k.startsWith('2026+')) flag(`a saved 2026+ row opens a table it did not have: ${v.n} x ${k} (${v.eg})`);
}

/* ── 4. every save plays three more seasons on the branch ── */
let played = 0, crashed = 0, newRows = 0, sizedRows = 0, sizedNoFinish = 0, outOfRange = 0;
const perLeague = {};
for (const sv of saves) {
  seedRandom(0x9e37 + played);
  let s = H.engine.repairCareer(clone(sv.state));
  const before = s.seasons.length;
  try {
    let guard = 0, target = s.seasons.filter(r => r.type === 'playing').length + 3;
    while (!s.retired && guard++ < 60 && s.seasons.filter(r => r.type === 'playing').length < target) s = careerStep(H.engine, s, HP);
    played += 1;
    for (const r of s.seasons.slice(before).filter(x => x.type === 'playing' && x.apps > 0 && !x.injurySevere)) {
      newRows += 1;
      const lg = HP.find(c => c.name === r.club)?.league ?? '';
      const size = H.league.leagueSizeFor(lg, r.year);
      if (size) {
        sizedRows += 1;
        const t = (perLeague[lg] ??= { rows: 0, fin: 0, sum: 0 });
        t.rows += 1;
        if (typeof r.leagueFinish === 'number') { t.fin += 1; t.sum += r.leagueFinish / (r.leagueSize || size); if (r.leagueFinish < 1 || r.leagueFinish > (r.leagueSize || 0)) outOfRange += 1; } else sizedNoFinish += 1;
      }
    }
  } catch (e) { crashed += 1; if (crashed <= 3) flag(`the branch THROWS playing on from ${sv.id}: ${String(e && e.stack ? e.stack : e).slice(0, 300)}`); }
}
console.log(`4. ${played} of ${saves.length} saves played three more seasons on the branch (${crashed} threw); ${newRows} new rows, ${sizedRows} in a league sized today, ${sizedNoFinish} of those with no finish, ${outOfRange} outside 1..size`);
console.log(`   new rows by league (rows, with a finish, mean finish share): ${Object.entries(perLeague).map(([l, t]) => `${l} ${t.rows}/${t.fin}/${t.fin ? (t.sum / t.fin).toFixed(2) : '-'}`).join('; ')}`);
if (outOfRange) flag(`${outOfRange} new rows hold a finish outside their table`);

/* ── 5. old dugout saves ── */
const seasonRow = (year, tier) => ({ year, age: 28, club: 'Club', clubCountry: 'England', clubTier: tier, apps: 34, goals: 10, assists: 5, cleanSheets: 0, yellowCards: 2, redCards: 0, rating: 7.1, leagueTitle: false, domesticCup: false, championsLeague: false, worldCup: false, ballonDor: false, ballonDorRank: null, type: 'playing', intApps: 0, intGoals: 0, intAssists: 0, intRating: 0, tournament: null, tournamentResult: null });
const dugoutState = (club, tier, lastYear, league) => ({ nationality: 'England', peakOverall: 80, intStats: { caps: 10 }, seasons: Array.from({ length: 12 }, (_, i) => seasonRow(lastYear - 11 + i, 2)), events: [], awards: [], phase: 'manager_season', overall: 80, age: 40, managerState: { club, clubTier: tier, season: 0, trophies: 0, promotions: 0, seasonResults: [], nationalTeamOffer: false, managingNationalTeam: false, ...(league ? { league } : {}) } });
const words = {};
let dug = 0, dugThrew = 0, sizeBad = 0;
const HAND = B.engine.HAND_CLUBS;
for (let i = 0; i < HAND.length; i += 1) {
  for (const last of [2029, 2009]) {
    const club = HAND[i];
    seedRandom(0xd06 + i * 31 + last);
    let s = dugoutState(club.name, club.tier, last, club.league);
    try { s = B.engine.advanceManagerSeason(s, BP); s = B.engine.advanceManagerSeason(s, BP); } catch { continue; }
    dug += 1;
    for (const r of s.managerState.seasonResults ?? []) {
      const a = B.league.dugoutTableWords(r), b = H.league.dugoutTableWords(r);
      for (const f of ['header', 'note', 'orderNote']) if (a[f] !== b[f]) (words[`${r.league ?? '(no league)'} | ${f}: "${a[f]}" -> "${b[f]}"`] ??= { n: 0 }).n += 1;
    }
    try {
      seedRandom(0xd07 + i);
      let t = H.engine.repairCareer(clone(s));
      for (let y = 0; y < 3; y += 1) t = H.engine.advanceManagerSeason(t, HP);
      for (const r of (t.managerState.seasonResults ?? []).slice(-3)) {
        const pos = (r.table ?? []).find(x => x.you)?.pos;
        if (r.leagueSize && pos && pos > r.leagueSize) { sizeBad += 1; if (sizeBad <= 3) flag(`dugout row ${club.name} ${r.year}: position ${pos} in a table of ${r.leagueSize}`); }
      }
    } catch (e) { dugThrew += 1; if (dugThrew <= 3) flag(`the branch THROWS on a base dugout save at ${club.name} (${last}): ${String(e && e.stack ? e.stack : e).slice(0, 300)}`); }
  }
}
console.log(`5. ${dug} dugout saves built by the base (two seasons each), three more on the branch: ${dugThrew} threw, ${sizeBad} rows below their own table; saved rows whose words changed:`);
for (const [k, v] of Object.entries(words).sort((x, y) => y[1].n - x[1].n).slice(0, 30)) console.log(`   ${String(v.n).padStart(4)} x ${k.slice(0, 330)}`);

/* ── 6. the absolute band: base beside branch over a random cross ── */
seedRandom(0xabc);
const FIVE = ['Premier League', 'La Liga', 'Serie A', 'Bundesliga', 'Ligue 1'];
const labels = [...new Set(HP.map(c => c.league))];
let cross = 0, crossDiff = 0, five = 0, past = 0;
const firstDiff = [];
for (let i = 0; i < 300000; i += 1) {
  const inFive = Math.random() < 0.5;
  const league = inFive ? FIVE[Math.floor(Math.random() * 5)] : labels[Math.floor(Math.random() * labels.length)];
  const year = inFive ? 1990 + Math.floor(Math.random() * 60) : 1990 + Math.floor(Math.random() * 36);
  const clubs = HP.filter(c => c.league === league);
  const club = clubs[Math.floor(Math.random() * clubs.length)].name;
  const rating = Math.round((5.5 + Math.random() * 3.5) * 10) / 10;
  const input = { league, year, tier: 1 + Math.floor(Math.random() * 5), elite: Math.random() < 0.15, rating, leagueTitle: Math.random() < 0.06, seedKey: `P${i}|${club}|${year}|${Math.floor(Math.random() * 39)}|${Math.floor(Math.random() * 30)}|${Math.floor(Math.random() * 20)}|${rating}` };
  const a = JSON.stringify(B.league.drawLeagueFinish(input)), b = JSON.stringify(H.league.drawLeagueFinish(input));
  cross += 1; if (inFive) five += 1; else past += 1;
  if (a !== b) { crossDiff += 1; if (firstDiff.length < 4) firstDiff.push(`${JSON.stringify(input)} base ${a} branch ${b}`); }
}
console.log(`6. absolute band: ${cross} random inputs (${five} in the five big leagues in any year, ${past} in any league before 2026 with a real club of that league in an engine shaped key): ${crossDiff} differ`);
for (const d of firstDiff) console.log(`   ${d}`);
if (crossDiff) flag(`${crossDiff} of ${cross} default path finishes differ from ${REF}`);
console.log(`rvsaves ${REF}: ${bad} findings`);
process.exit(bad ? 1 : 0);

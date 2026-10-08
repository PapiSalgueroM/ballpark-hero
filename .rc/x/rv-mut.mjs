/* Reviewer's mutation runner (runs on the GitHub runner, never committed).
   node .rc/x/rv-mut.mjs <id>: makes a detached worktree of HEAD under .mut/<id>, applies ONE small edit there,
   runs the named harnesses in it and prints which of them went red. The checkout itself is never edited. */
import fs from 'node:fs';
import path from 'node:path';
import { execSync, spawnSync } from 'node:child_process';

const RU_ROW = "cup: 'Russian Cup', europe: null, drop: 2, ladder: 'top', season: 'autumnSpring'";
const G = ['gathered', 'node scripts/simClubManagerGathered.mjs'];
const N = ['newleagues-russia', 'CM_NEW_ROWS=russia node scripts/simClubManagerNewLeagues.mjs'];
const R = ['leaguerules', 'node scripts/simCmLeagueRules.mjs'];
const C = ['simClubManager', 'node scripts/simClubManager.mjs'];
const I = ['identity-vitest', 'node_modules/.bin/vitest run src/test/cmWorldIdentity1052.test.ts'];
const MUTS = {
  /* the new squads spread FIRST, so the old world's keys no longer keep their place */
  joinorder: { edits: [['src/data/clubManagerWorldRosters.ts', 'return { ...out, ...CM_ALEAGUE_ROSTERS, ...CM_RUSSIA_ROSTERS };', 'return { ...CM_RUSSIA_ROSTERS, ...out, ...CM_ALEAGUE_ROSTERS };']], run: [I, G, R, C] },
  /* the Russian nationality map is never read */
  natdrop: { edits: [['src/data/playerNationalities.ts', 'CM_ALEAGUE_NATIONALITIES[name] ?? CM_RUSSIA_NATIONALITIES[name] ?? null;', 'CM_ALEAGUE_NATIONALITIES[name] ?? null;']], run: [G, ['nationalities', 'node scripts/simNationalities.mjs'], ['internationals', 'node scripts/simCmInternationals.mjs'], N] },
  /* a stale size in the dugout's table */
  dugout: { edits: [['src/lib/soccerCareerLeague.ts', '"Russian Premier League": [{ from: 2026, size: 16 }],', '"Russian Premier League": [{ from: 2026, size: 18 }],']], run: [N, ['leagueseasons', 'node scripts/simCareerLeagueSeasons.mjs'], ['league-vitest', 'node_modules/.bin/vitest run src/lib/soccerCareerLeague.test.ts'], ['jobmarket', 'node scripts/simJobMarket.mjs']] },
  /* the sixteen clubs join the dailies on a day already played */
  daily: { edits: [['src/data/dailyClubPool.json', '"leagueName":"Russian Premier League","from":"2026-11-07"}', '"leagueName":"Russian Premier League","from":"2026-10-01"}', 'all']], run: [['dailypool', 'node scripts/simDailyClubPool.mjs'], ['hotseat', 'node scripts/simManagerHotSeat.mjs'], ['deadline', 'node scripts/simDeadlineDay.mjs']] },
  /* the wrong ladder copied from a playoff league's row */
  ladder: { edits: [['src/lib/clubManager.ts', RU_ROW, RU_ROW.replace("ladder: 'top'", "ladder: 'playoffs'")]], run: [N, C, ['boardasks', 'node scripts/simBoardAsks.mjs'], R] },
  /* the wrong calendar copied from the Brazil row */
  season: { edits: [['src/lib/clubManager.ts', RU_ROW, RU_ROW.replace("season: 'autumnSpring'", "season: 'calendarYear'")]], run: [N, C, R] },
  /* the generated league is left off the list the picker's date line and count print from */
  genlist: { edits: [['src/data/clubManagerWorldRosters.ts', "  { label: CM_RUSSIA_META.label, players: CM_RUSSIA_META.players, read: CM_RUSSIA_META.read, readTo: CM_RUSSIA_META.readTo },\n", '']], run: [['clublist', 'node scripts/simClubManagerClubList.mjs'], G, ['aleague', 'node scripts/simClubManagerALeague.mjs'], ['vitest-cm', 'node_modules/.bin/vitest run src/test/clubManagerSave.test.tsx src/test/clubManagerSlots.test.tsx']] },
  /* euros read as dollars at the generator's call site, and the file regenerated from it */
  eurusd: { edits: [['scripts/lib/gatheredLeague.mjs', 'usd = usdOfEur(row.valueEur);', 'usd = row.valueEur;']], pre: 'node scripts/genClubManagerGathered.mjs russia2026', run: [G, ['gen-check', 'node scripts/genClubManagerGathered.mjs russia2026 --check'], N] },
  /* the squads never reach the engine */
  nojoin: { edits: [['src/data/clubManagerWorldRosters.ts', 'return { ...out, ...CM_ALEAGUE_ROSTERS, ...CM_RUSSIA_ROSTERS };', 'return { ...out, ...CM_ALEAGUE_ROSTERS };']], run: [G, N, C] },
  /* one drop too few */
  drop1: { edits: [['src/lib/clubManager.ts', RU_ROW, RU_ROW.replace('drop: 2', 'drop: 1')]], run: [N, C, R] },
};

const id = process.argv[2];
const M = MUTS[id];
if (!M) { console.log(`no mutation ${id}; known: ${Object.keys(MUTS).join(', ')}`); process.exit(2); }
const ROOT = process.cwd();
const WT = path.join(ROOT, '.mut', id);
fs.mkdirSync(path.join(ROOT, '.mut'), { recursive: true });
execSync(`git worktree add --detach "${WT}" HEAD`, { stdio: 'pipe' });
fs.symlinkSync(path.join(ROOT, 'node_modules'), path.join(WT, 'node_modules'), 'dir');
for (const [file, find, repl, all] of M.edits) {
  const p = path.join(WT, file);
  const src = fs.readFileSync(p, 'utf8');
  const n = src.split(find).length - 1;
  if (n === 0 || (!all && n !== 1)) { console.log(`MUT ${id}: REFUSED, the anchor is in ${file} ${n} times`); process.exit(2); }
  fs.writeFileSync(p, src.split(find).join(repl));
  console.log(`edited ${file}: ${n} place(s)`);
}
const sh = (label, cmd) => {
  const r = spawnSync('bash', ['-c', cmd], { cwd: WT, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024, timeout: 30 * 60 * 1000, env: { ...process.env, TEMP: path.join(WT, '.t-' + label), TMP: path.join(WT, '.t-' + label), TMPDIR: path.join(WT, '.t-' + label) } });
  const text = ((r.stdout || '') + '\n' + (r.stderr || '')).replace(/\x1b\[[0-9;]*m/g, '');
  const lines = text.split('\n').filter(l => l.trim());
  const fails = lines.filter(l => /FAIL|✗|AssertionError|Error:/.test(l)).slice(0, 6).map(l => l.trim().slice(0, 230));
  return { label, code: r.status, last: (lines[lines.length - 1] || '').slice(0, 200), fails };
};
if (M.pre) { fs.mkdirSync(path.join(WT, '.t-pre'), { recursive: true }); const p = sh('pre', M.pre); console.log(`pre: exit ${p.code} | ${p.last}`); }
const caught = []; const blind = [];
for (const [label, cmd] of M.run) {
  fs.mkdirSync(path.join(WT, '.t-' + label), { recursive: true });
  const r = sh(label, cmd);
  console.log(`${label}: exit ${r.code} | ${r.last}`);
  for (const f of r.fails) console.log(`     ${f}`);
  (r.code === 0 ? blind : caught).push(label);
}
console.log(`MUT ${id}: red in [${caught.join(', ')}] green in [${blind.join(', ')}]`);

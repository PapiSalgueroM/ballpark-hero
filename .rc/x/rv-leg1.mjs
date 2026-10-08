/* Reviewer's independent leg 1 (runs on the GitHub runner, never committed): take the whole of Round 1052 out of the
   world in a detached worktree of HEAD (the three engine rows, the join, the nationality fallback, the two name bank
   edits), put the merge base's own recorded harnesses and digest back, and run them. Green means the round with its
   rows out plays exactly as the base did: every seeded save the digest holds, the derby board, the world pins. */
import fs from 'node:fs';
import path from 'node:path';
import { execSync, spawnSync } from 'node:child_process';
const BASE = process.argv[2] || '5ba578262a84df7ace8a12a58e2c439302b1373d';
const ROOT = process.cwd();
const WT = path.join(ROOT, '.mut', 'leg1');
fs.mkdirSync(path.join(ROOT, '.mut'), { recursive: true });
execSync(`git worktree add --detach "${WT}" HEAD`, { stdio: 'pipe' });
fs.symlinkSync(path.join(ROOT, 'node_modules'), path.join(WT, 'node_modules'), 'dir');
const P = f => path.join(WT, f);
const once = (file, find, repl) => { const s = fs.readFileSync(P(file), 'utf8'); const n = s.split(find).length - 1; if (n !== 1) { console.log(`LEG1 REFUSED: ${JSON.stringify(find.slice(0, 50))} is in ${file} ${n} times`); process.exit(2); } fs.writeFileSync(P(file), s.replace(find, repl)); };
const cut = (file, start, end) => { const s = fs.readFileSync(P(file), 'utf8'); const a = s.indexOf(start); const z = a < 0 ? -1 : s.indexOf(end, a); if (a < 0 || z < 0 || s.indexOf(start, a + 1) >= 0) { console.log(`LEG1 REFUSED: ${JSON.stringify(start)} is not in ${file} exactly once`); process.exit(2); } fs.writeFileSync(P(file), s.slice(0, a) + s.slice(z + end.length)); };
cut('src/lib/clubManager.ts', "\n  russia: {\n", '\n  },');
cut('src/lib/clubManager.ts', "\n  {\n    id: 'russia',", '\n  },');
cut('src/lib/clubManager.ts', "\n  { id: 'russia', name: ", ' },');
once('src/lib/clubManager.ts', "'Brennan', 'Brankov', 'Delgado'", "'Brennan', 'Kovac', 'Delgado'");
once('src/lib/clubManagerEras.ts', "  'Ismael Silva',\n", '');
once('src/data/clubManagerWorldRosters.ts', '...CM_ALEAGUE_ROSTERS, ...CM_RUSSIA_ROSTERS };', '...CM_ALEAGUE_ROSTERS };');
once('src/data/clubManagerWorldRosters.ts', '...CM_ALEAGUE_PARTIAL, ...CM_RUSSIA_PARTIAL];', '...CM_ALEAGUE_PARTIAL];');
once('src/data/playerNationalities.ts', ' ?? CM_RUSSIA_NATIONALITIES[name] ?? null;', ' ?? null;');
for (const f of ['scripts/simCmLeagueRules.mjs', 'scripts/data/cmLeagueRulesDigest.json', 'scripts/simCareerDerbies.mjs', 'scripts/simClubManager.mjs', 'scripts/simClubManagerSaveSize.mjs']) {
  fs.writeFileSync(P(f), execSync(`git show ${BASE}:${f}`, { cwd: ROOT, maxBuffer: 64 * 1024 * 1024 }));
}
console.log(`round taken out of the world in ${WT}; the merge base's harnesses and digest (${BASE.slice(0, 8)}) put back`);
const green = []; const red = [];
for (const [label, cmd] of [['leaguerules-base', 'node scripts/simCmLeagueRules.mjs'], ['derbies-base', 'node scripts/simCareerDerbies.mjs'], ['simClubManager-base', 'node scripts/simClubManager.mjs'], ['savesize-base', 'node scripts/simClubManagerSaveSize.mjs']]) {
  const t = path.join(WT, '.t-' + label); fs.mkdirSync(t, { recursive: true });
  const r = spawnSync('bash', ['-c', cmd], { cwd: WT, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024, timeout: 30 * 60 * 1000, env: { ...process.env, TEMP: t, TMP: t, TMPDIR: t } });
  const lines = ((r.stdout || '') + '\n' + (r.stderr || '')).replace(/\x1b\[[0-9;]*m/g, '').split('\n').filter(l => l.trim());
  console.log(`${label}: exit ${r.status} | ${(lines[lines.length - 1] || '').slice(0, 220)}`);
  for (const l of lines.filter(x => /FAIL|RED|differs|moved/.test(x)).slice(0, 8)) console.log('     ' + l.trim().slice(0, 240));
  (r.status === 0 ? green : red).push(label);
}
console.log(`LEG1: green [${green.join(', ')}] red [${red.join(', ')}]`);

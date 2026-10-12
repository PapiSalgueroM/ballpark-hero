// Not committed. Fixer's mutation proof for Round 1310 (runner only, from the repo root).
// Every mutant the run-1310 review found surviving, plus the two guards this fix added, is written as a NEW file
// scripts/.mut-fence.mjs (the tracked fence is never edited) and run as the main fence plus every control.
// SURVIVES means main exit 0 and every control exit 1 with FIRED; anything else is KILLED, and the lines that
// broke are printed. The script exits 1 if any mutant SURVIVES or any mutant string is missing.
import fs from 'node:fs';
import { spawnSync } from 'node:child_process';

const FENCE = 'scripts/simCmLeagueBookFacts.mjs';
const MUT = 'scripts/.mut-fence.mjs';
const src = fs.readFileSync(FENCE, 'utf8');
const CONTROLS = ['', 'wiki', 'bannedhost', 'figure', 'onesource', 'disagree', 'receipt', 'srcname', 'dash', 'length',
  'samehost', 'pausedrow', 'staleowed', 'keeperowed', 'seasontoken', 'boundary', 'wikimirror', 'badurl'];

const MUTANTS = {
  hostclause: ["publishers.length >= 2 && hosts.size >= 2 ? 'USED'", "publishers.length >= 2 ? 'USED'"],
  bothclauses: ["publishers.length >= 2 && hosts.size >= 2 ? 'USED'", "publishers.length >= 1 ? 'USED'"],
  seasonstrip: [".join(' | ').replace(SEASON_TOKEN, ' ');", ".join(' | ');"],
  pausedskip: ['if (seasons.length > 1 && season === PAUSED) continue;', ''],
  boundary: ['ok(new RegExp(`(^|[^0-9])${value}([^0-9]|$)`).test(printed)', 'ok(printed.includes(String(value))'],
  stale: ["if (c.state === 'USED') ok(!named(comp, season, CORE)", "if (c.state === 'USED') ok(true || !named(comp, season, CORE)"],
  keeperowed: ['else ok(named(comp, season, KEEPER)', 'else ok(true || named(comp, season, KEEPER)'],
  matchrule: ['f.matchesPerClub : 2 * (f.clubs - 1);', 'f.matchesPerClub : 2 * f.clubs;'],
  wikiold: ["const isWiki = url => /wiki|fandom/.test(hostOf(url) ?? '');", "const isWiki = url => /wikipedia|wikimedia|fandom/.test(hostOf(url) ?? '') || /^wiki\\./.test(hostOf(url) ?? '');"],
  hostthrows: ["const hostOf = url => { try { return new URL(url).host.toLowerCase().replace(/^www\\./, ''); } catch { return null; } };", "const hostOf = url => new URL(url).host.toLowerCase().replace(/^www\\./, '');"],
};

const run = (file, control) => {
  const env = { ...process.env };
  if (control) env.CM_FACTS_CONTROL = control; else delete env.CM_FACTS_CONTROL;
  const r = spawnSync('node', [file], { env, encoding: 'utf8' });
  const lines = ((r.stdout || '') + (r.stderr || '')).trim().split('\n');
  return { code: r.status, last: lines.at(-1) || '' };
};

let bad = 0;
const base = CONTROLS.map(c => ({ c: c || 'main', ...run(FENCE, c) }));
const baseOk = base[0].code === 0 && base.slice(1).every(x => x.code === 1 && /FIRED/.test(x.last));
console.log(`UNMUTATED fence: ${baseOk ? 'main 0 and every control FIRED' : 'NOT CLEAN'} | ` + base.map(x => `${x.c}=${x.code}`).join(' '));
if (!baseOk) bad += 1;
for (const [name, [from, to]] of Object.entries(MUTANTS)) {
  if (!src.includes(from)) { console.log(`MUTANT ${name}: ABORT, the string to mutate is not in the fence`); bad += 1; continue; }
  fs.writeFileSync(MUT, src.replace(from, to));
  const res = CONTROLS.map(c => ({ c: c || 'main', ...run(MUT, c) }));
  const broke = res.filter(x => !(x.c === 'main' ? x.code === 0 : x.code === 1 && /FIRED/.test(x.last)));
  if (broke.length === 0) bad += 1;
  console.log(`MUTANT ${name}: ${broke.length ? 'KILLED by ' + broke.map(x => x.c).join(', ') : 'SURVIVES (every line green)'}`);
  for (const x of broke) console.log(`   ${x.c} exit=${x.code}: ${x.last.slice(0, 180)}`);
}
fs.rmSync(MUT, { force: true });
console.log(bad ? `mutfix: ${bad} mutant(s) survive or abort` : `mutfix: every mutant killed`);
process.exit(bad ? 1 : 0);

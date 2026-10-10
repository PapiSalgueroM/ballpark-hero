/* Reviewer's probe for Round 1300 (runner only): is everything the game derived BEFORE this round what it derives
   AFTER it, on saves made by the base's own code and on old saves of a committed fixture?
   usage: node .rc/x/review-run-probe.mjs <root of the tree to bundle> <out file>
   It bundles that tree's real bindings, plays the fleet with HEAD's loop (scripts/lib/usSeasonFleet.mjs, handed the
   bundle), and writes one line a season: the save's sha, the derived season's sha, the playoff list as JSON's sha,
   and the sha of the list for doctored twins of the line (counts and results an old or odd save could hold).
   Two trees whose files are equal derive the same thing. When the tree holds the deriver it is also run on every
   line and its answers are counted (never part of the compared file). */
import os from 'node:os';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync, existsSync, unlinkSync } from 'node:fs';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { build } from 'esbuild';
import { usSeasonFleet } from '../../scripts/lib/usSeasonFleet.mjs';

const ROOT = path.resolve(process.argv[2]);
const OUTFILE = process.argv[3];
const CAREERS = Number(process.env.CAREERS ?? 40);
const SEEDSETS = [0, 1, 2, 3, 4];
const hasDeriver = existsSync(path.join(ROOT, 'src/lib/season/usPlayoffs.ts'));
const sha = s => createHash('sha1').update(String(s)).digest('hex').slice(0, 16);

const SPORT_DEFS = {
  nba: { binding: 'NBA_CAREER_SPORT', bindName: 'NBA_SEASON', positions: ['PG', 'SG', 'SF', 'PF', 'C'], eras: ['now', 'y2004'], targetedFrom: { era: 'y2004', year: 2016 } },
  nfl: { binding: 'NFL_CAREER_SPORT', bindName: 'NFL_SEASON', positions: ['QB', 'RB', 'WR', 'TE', 'LB', 'CB', 'EDGE', 'K'], eras: ['now', 'y2005'], targetedFrom: { era: 'y2005', year: 2018 } },
};
const entry = [
  "export { NBA_CAREER_SPORT } from './src/lib/nbaCareerSport.ts';",
  "export { NFL_CAREER_SPORT } from './src/lib/nflCareerSport.ts';",
  "export { NBA_SEASON } from './src/lib/season/nba.ts';",
  "export { NFL_SEASON } from './src/lib/season/nfl.ts';",
  "export { buildUsSeason, usPlayoffPath } from './src/lib/season/us.ts';",
  "export { deriveSeasonOrWhy } from './src/lib/season/core.ts';",
  "export { applyFaSigning } from './src/lib/usCareerFreeAgency.ts';",
  ...(hasDeriver ? ["export { usPostseasonOrWhy } from './src/lib/season/usPlayoffs.ts';"] : []),
].join('\n');
const OUT = path.join(os.tmpdir(), `review-probe-${process.pid}.mjs`);
await build({
  stdin: { contents: entry, resolveDir: ROOT, loader: 'ts' },
  bundle: true, format: 'esm', platform: 'node', outfile: OUT, absWorkingDir: ROOT,
  logLevel: 'error', alias: { '@': './src' }, jsx: 'automatic',
  banner: { js: "import { createRequire as __usRequire } from 'node:module'; const require = __usRequire(import.meta.url);" },
});
const store = new Map();
globalThis.localStorage ??= { getItem: k => (store.has(k) ? store.get(k) : null), setItem: (k, v) => { store.set(k, String(v)); }, removeItem: k => { store.delete(k); }, clear: () => store.clear() };
const M = await import(pathToFileURL(OUT).href);
try { unlinkSync(OUT); } catch { /* a copy */ }

const lines = [];
const tally = {};
const bump = (k) => { tally[k] = (tally[k] ?? 0) + 1; };
const COUNTS = [undefined, null, 0, 1, 2, 3, 4, 5.5, 7, 8, 11, 16, 28, 29, '7', Number.NaN];

/** One saved line through everything the game derived before this round, and (head only) the deriver. */
function look(tag, slug, career, row) {
  const d = SPORT_DEFS[slug];
  const SB = M[d.binding];
  const bind = M[d.bindName];
  let derived = 'nobuild'; let list = 'nobuild'; let twins = 'nobuild';
  let b;
  try { b = M.buildUsSeason(bind, career, row, SB.teamLabelOf); } catch (e) { b = { ok: false, why: `THROW ${String(e).slice(0, 80)}` }; bump(`${slug} build THROW`); }
  if (b.ok) {
    derived = sha(JSON.stringify(M.deriveSeasonOrWhy(b.sport, row, b.ctx)));
    list = JSON.stringify(M.usPlayoffPath(bind, row, b.ctx, b.key));
    const t = [];
    for (const v of COUNTS) t.push(JSON.stringify(M.usPlayoffPath(bind, { ...row, poGames: v }, b.ctx, b.key)));
    for (const res of [...bind.results, 'No such result', undefined]) for (const v of [undefined, 1, 4, 9, 20]) t.push(JSON.stringify(M.usPlayoffPath(bind, { ...row, teamResult: res, poGames: v }, b.ctx, b.key)));
    twins = sha(t.join('|'));
    if (hasDeriver) {
      const group = tag.split(' ')[0];
      let p;
      try { p = M.usPostseasonOrWhy(bind, row, b.ctx, b.key); } catch (e) { p = `THROW ${String(e).slice(0, 80)}`; }
      const kind = typeof p === 'string' ? p.split(':')[0] : 'LAID OUT';
      bump(`${group} ${slug} ${list === 'null' ? 'no list' : 'a list'}: ${kind}`);
      /* the doctored twins through the deriver too: nothing may throw, and what is laid out has the twin's count */
      for (const v of COUNTS) {
        let q;
        try { q = M.usPostseasonOrWhy(bind, { ...row, poGames: v }, b.ctx, b.key); } catch (e) { q = `THROW ${String(e).slice(0, 80)}`; }
        if (typeof q === 'string' && q.startsWith('THROW')) bump(`${group} ${slug} BAD twin THROW ${q.slice(0, 70)}`);
        else if (typeof q !== 'string' && q.season.games.length !== v) bump(`${group} ${slug} BAD twin count ${String(v)} laid out as ${q.season.games.length} games`);
        else bump(`${group} ${slug} twin ${typeof q === 'string' ? 'refused' : 'laid out'}`);
      }
    }
  } else if (hasDeriver) bump(`${tag.split(' ')[0]} ${slug} not opened (${String(b.why).slice(0, 40)})`);
  lines.push([tag, slug, sha(JSON.stringify(career)), derived, sha(list), twins].join(' '));
}

/* 1: the fleet, played by this tree's own engines */
const { playCareer } = usSeasonFleet(M, SPORT_DEFS);
const trap = { count: 0 };
const TARGETED = Math.max(4, Math.round(CAREERS / 5));
for (const slug of ['nba', 'nfl']) for (const seedset of SEEDSETS) {
  const observe = (c, line, who) => {
    const career = JSON.parse(JSON.stringify(c));
    look(`fleet ${seedset}.${who.targeted ? 'late' : 'week'}.${who.i}.${career.seasons.length}`, slug, career, career.seasons[career.seasons.length - 1]);
  };
  for (let i = 0; i < CAREERS; i += 1) playCareer(slug, i, seedset, false, observe, trap);
  for (let i = 0; i < TARGETED; i += 1) playCareer(slug, i, seedset, true, observe, trap);
}
const fleetLines = lines.length;

/* 2: the old saves of a committed fixture (src/test/fixtures/careerHallV1.json, read from HEAD's tree in both runs):
      every line of every NBA and NFL career in it, as the save holds it */
const HALL = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../src/test/fixtures/careerHallV1.json');
if (existsSync(HALL)) {
  const hall = JSON.parse(readFileSync(HALL, 'utf8'));
  for (const slug of ['nba', 'nfl']) for (const item of hall.sports[slug] ?? []) {
    const career = item.save;
    if (!career || !Array.isArray(career.seasons)) continue;
    career.seasons.forEach((row, k) => look(`hall ${item.id}.${k}`, slug, career, row));
  }
}
writeFileSync(OUTFILE, `${lines.join('\n')}\n`);
console.log(`PROBE ${ROOT}: ${fleetLines} fleet lines, ${lines.length - fleetLines} old save lines, deriver ${hasDeriver ? 'present' : 'absent'}, Math.random calls while observing ${trap.count}`);
for (const k of Object.keys(tally).sort()) console.log(`  ${String(tally[k]).padStart(6)}  ${k}`);
console.log(`PROBE sha ${sha(lines.join('\n'))} lines ${lines.length}`);

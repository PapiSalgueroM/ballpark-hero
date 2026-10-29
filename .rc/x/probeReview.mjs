/* Review probe for Round 1569 (never committed). Runs the four real bindings in the same loop as
   scripts/simUsCareerReports.mjs and counts what that harness does not hold:
   missedLast  a no offer talk NOT called the last season, whose season then ended the career
               (the card's words promised free agency, and none came);
   lastCalls   no offer talks called the last season (sound or not);
   creditDrop  a credit note ("held up your end") on a loss whose clutch drop was 7 or more;
   creditTitle a credit note on a title season;
   critStrong  a critical note on a level of 70 or more. */
import os from 'node:os';
import path from 'node:path';
import { build } from 'esbuild';
import { readFileSync, unlinkSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

const ROOT = process.cwd();
const CAREERS = Number(process.argv[2] || 300);
const SEED = Number(process.env.SIM_SEED || 1569);
const SPORTS = ['nfl', 'nba', 'mlb', 'nhl'];
const CALLS = {
  'nflMyCareer.ts': ["clutchNote(clutch, depth, 'nfl', pf)", 'pf'],
  'nbaMyCareer.ts': ["clutchNote(clutch, depth, 'nba', poForm)", 'poForm'],
  'mlbMyCareer.ts': ["clutchNote(clutch, depth, 'mlb', pf)", 'pf'],
  'nhlMyCareer.ts': ["clutchNote(clutch, poDepth, 'nhl', poForm)", 'poForm'],
};
const fired = new Set();
const plugin = { name: 'probe', setup(b) {
  b.onLoad({ filter: /MyCareer\.ts$/ }, args => {
    let src = readFileSync(args.path, 'utf8');
    const base = path.basename(args.path);
    if (CALLS[base]) {
      const [call, level] = CALLS[base];
      if (!src.includes(call)) throw new Error(`the call ${call} is not in ${base}`);
      src = src.replace(call, `(globalThis.__po = { clutch, level: ${level} }, ${call})`);
      fired.add(base);
    }
    return { contents: src, loader: 'ts' };
  });
} };
const OUT = path.join(os.tmpdir(), `probe-review-${process.pid}.mjs`);
await build({
  stdin: {
    contents: SPORTS.map(s => `export { ${s.toUpperCase()}_CAREER_SPORT } from './src/lib/${s}CareerSport.ts';`).join('\n')
      + "\nexport { applyFaSigning } from './src/lib/usCareerFreeAgency.ts';\nexport { extensionDue } from './src/lib/usCareerExtension.ts';"
      + "\nexport { seasonAheadIsLast, noOfferWhy } from './src/lib/usCareerNoOffer.ts';\n",
    resolveDir: ROOT, loader: 'ts',
  },
  bundle: true, format: 'esm', platform: 'node', outfile: OUT, absWorkingDir: ROOT, logLevel: 'error',
  alias: { '@': './src' }, plugins: [plugin], jsx: 'automatic',
  banner: { js: "import { createRequire as __r } from 'node:module'; const require = __r(import.meta.url);" },
});
const store = new Map();
globalThis.localStorage ??= { getItem: k => (store.has(k) ? store.get(k) : null), setItem: (k, v) => { store.set(k, String(v)); }, removeItem: k => { store.delete(k); }, clear: () => store.clear() };
const M = await import(pathToFileURL(OUT).href);
try { unlinkSync(OUT); } catch { /* */ }
if (fired.size !== 4) { console.log(`probe ABORT: ${fired.size} of 4 patches`); process.exit(2); }
function mulberry32(a) { return () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const TITLE = { nfl: 'WON THE SUPER BOWL', nba: 'WON THE NBA FINALS', mlb: 'WON THE WORLD SERIES', nhl: 'WON THE STANLEY CUP' };
const CREDIT = '\u{1F4AA}', CRIT = '\u{1F39E}';
const examples = [];
for (const slug of SPORTS) {
  const S = M[`${slug.toUpperCase()}_CAREER_SPORT`];
  const t = { careers: 0, noOffer: 0, lastCalls: 0, missedLast: 0, endedAfterNoOffer: 0, creditDrop: 0, creditTitle: 0, critStrong: 0, credit: 0, lossesStrong: 0, titles: 0, seasonsAtEnd: {} };
  for (let k = 0; k < CAREERS; k++) {
    const rng = mulberry32(SEED * 1000 + k + slug.length * 7919);
    const pos = S.create.positions[k % S.create.positions.length];
    const arch = S.create.archetypes[pos][Math.floor(rng() * S.create.archetypes[pos].length)];
    const c = S.startCareer('Probe', pos, arch, rng, null, 'now');
    let tq = S.rollTeamQuality(null, rng); S.assignRole(c, tq, rng); t.careers++;
    for (let guard = 0; guard < 30 && !c.retired; guard++) {
      let noOffer = false, calledLast = false, before = null;
      if (M.extensionDue(c)) {
        const talk = S.buildExtension(c, rng);
        if (!talk.offer) { noOffer = true; t.noOffer++; calledLast = M.seasonAheadIsLast(c, S.shouldRetire); if (calledLast) t.lastCalls++; before = { age: c.age, ovr: c.ovr, seasons: c.seasons.length }; }
        else { c.contractYears = 1 + talk.offer.years; c.salary = talk.offer.salary; }
      } else if (c.contractYears <= 0) {
        const w = S.buildFaWindow(c, tq, rng);
        const live = w.offers.filter(o => !o.gone);
        M.applyFaSigning(c, live[0]); tq = live[0].quality;
      }
      S.campBattle(c, tq, rng);
      globalThis.__po = null;
      const { line, notes } = S.simSeason(c, tq, rng);
      const po = globalThis.__po;
      S.progress(c, rng);
      const ended = S.shouldRetire(c);
      if (noOffer && ended) { t.endedAfterNoOffer++; if (!calledLast) { t.missedLast++; if (examples.filter(e => e.slug === slug).length < 3) examples.push({ slug, k, pos, before, after: { age: c.age, ovr: c.ovr, seasons: c.seasons.length } }); } }
      if (po) {
        const won = line.teamResult === TITLE[slug];
        const credit = notes.find(n => n.startsWith(CREDIT)), crit = notes.find(n => n.startsWith(CRIT));
        if (won) t.titles++;
        if (credit) { t.credit++; if (won) t.creditTitle++; if (po.clutch <= -7) t.creditDrop++; }
        if (crit && po.level >= 70) t.critStrong++;
        if (!won && po.level >= 76) t.lossesStrong++;
      }
      if (ended) { c.retired = true; t.seasonsAtEnd[c.seasons.length] = (t.seasonsAtEnd[c.seasons.length] ?? 0) + 1; break; }
      tq = S.rollTeamQuality(tq, rng);
    }
  }
  console.log(`${slug}: ${JSON.stringify(t)}`);
}
for (const e of examples) console.log(`  missed last: ${e.slug} career ${e.k} ${e.pos} before ${JSON.stringify(e.before)} after ${JSON.stringify(e.after)}`);
console.log(`probeReview DONE: ${CAREERS} careers a sport, seed ${SEED}`);

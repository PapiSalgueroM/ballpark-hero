/* Round 1569 harness: the US My Career player reports of 2026-10-26, held on the engine, all four sports.

   Report C (NFL, after a playoff loss: "my team and i played great it was just a hard game"). The playoff note
   in src/lib/careerVariance.ts judged the clutch roll alone, so a strong January line was mocked. It now reads
   the January level, the form every stat of the playoff line is drawn from, against the shared market's bands
   (76 and up a player the market calls with real interest, under 70 the prove-it deal). This harness runs a
   seeded fleet through the four real bindings in the board's own order and reads the level at each call site
   (a build patch that only records it), then holds the OUTCOME against the rule:
     C1  no critical note on a January level of 70 or more (the old rule put one on 11 to 29 strong lines and
         16 to 46 middling ones a sport, 150 careers each);
     C2  every postseason lost on a level of 76 or more, without the riser line, carries the credit note;
     C3  every critical note sits on a level under 70 and a clutch drop of 7 or more, and criticism still exists:
         at least CRIT_FLOOR a sport (measured below);
     C4  none of the four old lines can appear, and no note says "everyone saw it", "disappeared", "talk shows".
   Report B (NBA, "20 szn no offer"). The market is never empty (the incumbent always offers and never walks);
   the empty screen was the extension talk with no offer. This harness holds:
     B1  the market: every window a late career opens has at least one live offer;
     B2  seasonAheadIsLast (src/lib/usCareerNoOffer.ts) is sound: every talk it calls the last is followed by
         the end of the career after that season, in every sport;
     B3  noOfferWhy names a reason and the market price for every talk with no offer, with no dash in it.
   Controls (each must turn the run red, and each checks the source it changes exists first):
     SIM_REPORTS_CONTROL=blind     criticism on the clutch roll alone again (the old rule)      -> C1
     SIM_REPORTS_CONTROL=nocredit  the credit branch taken out                                   -> C2
     SIM_REPORTS_CONTROL=alwayslast seasonAheadIsLast answers true for every talk                -> B2
   Measured on a GitHub runner (rc r1569-s2, head e208e288, seeds 1569, 1, 2, 3 at 150 careers a sport, so
   16 counts): critical notes 37 to 60 a sport (NFL 44 to 51, NBA 37 to 45, MLB 49 to 60, NHL 39 to 49);
   credit notes on every one of 380 to 938 strong losses a sport; last season calls 0 to 4 a sport, every one
   followed by the end of the career; no offer talks 196 to 279 a sport; market windows 510 to 664 a sport,
   none empty. Controls on seed 1569: blind 266 findings, nocredit 2,643, alwayslast 968. The rules C1, C2,
   C3 (the level part) and B1 to B3 are exact, so they carry no band; the one band is CRIT_FLOOR, about half
   the smallest measured count, so the gate cannot pass by deleting criticism. Each seed runs in 2 to 3 s.
   Run: node scripts/simUsCareerReports.mjs [careers per sport] (SIM_SEED picks the fleet). */
import os from 'node:os';
import path from 'node:path';
import { build } from 'esbuild';
import { readFileSync, unlinkSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

const ROOT = process.cwd();
const CONTROL = process.env.SIM_REPORTS_CONTROL || '';
if (!['', 'blind', 'nocredit', 'alwayslast'].includes(CONTROL)) { console.error(`unknown SIM_REPORTS_CONTROL ${CONTROL}`); process.exit(2); }
const CAREERS = Number(process.argv[2] || 150);
const SEED = Number(process.env.SIM_SEED || 1569);
/* The smallest critical count a sport may show: about half the smallest of 16 measured counts (37). */
const CRIT_FLOOR = 18;
const SPORTS = ['nfl', 'nba', 'mlb', 'nhl'];
const CALLS = {
  'nflMyCareer.ts': ["clutchNote(clutch, depth, 'nfl', pf)", 'pf'],
  'nbaMyCareer.ts': ["clutchNote(clutch, depth, 'nba', poForm)", 'poForm'],
  'mlbMyCareer.ts': ["clutchNote(clutch, depth, 'mlb', pf)", 'pf'],
  'nhlMyCareer.ts': ["clutchNote(clutch, poDepth, 'nhl', poForm)", 'poForm'],
};
const SWAPS = {
  blind: ['careerVariance.ts', 'if (swing <= -7 && level < JANUARY_POOR) {', 'if (swing <= -7) {'],
  nocredit: ['careerVariance.ts', 'if (depth < 4 && level >= JANUARY_STRONG) {', 'if (false) {'],
  alwayslast: ['usCareerNoOffer.ts', 'return shouldRetire(ahead);', 'return true || shouldRetire(ahead);'],
};
const fired = new Set();
const plugin = {
  name: 'reports1569', setup(b) {
    b.onLoad({ filter: /(MyCareer|careerVariance|usCareerNoOffer)\.ts$/ }, args => {
      let src = readFileSync(args.path, 'utf8');
      const base = path.basename(args.path);
      if (CALLS[base]) {
        const [call, level] = CALLS[base];
        if (!src.includes(call)) throw new Error(`the call ${call} is not in ${base}`);
        src = src.replace(call, `(globalThis.__po = { clutch, level: ${level} }, ${call})`);
        fired.add(base);
      }
      const swap = SWAPS[CONTROL];
      if (swap && swap[0] === base) {
        if (!src.includes(swap[1])) throw new Error(`control ${CONTROL}: "${swap[1]}" is not in ${base}`);
        src = src.replace(swap[1], swap[2]);
        fired.add(`control:${CONTROL}`);
      }
      return { contents: src, loader: 'ts' };
    });
  },
};
const OUT = path.join(os.tmpdir(), `us-reports-${CONTROL || 'base'}-${process.pid}.mjs`);
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
try { unlinkSync(OUT); } catch { /* a copy */ }
const want = 4 + (CONTROL ? 1 : 0);
if (fired.size !== want) { console.log(`ABORT: ${fired.size} of ${want} patches reached their file (${[...fired].join(', ')})`); process.exit(2); }

function mulberry32(a) { return () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const TITLE = { nfl: 'WON THE SUPER BOWL', nba: 'WON THE NBA FINALS', mlb: 'WON THE WORLD SERIES', nhl: 'WON THE STANLEY CUP' };
const OLD_LINES = ['not the same player in January', 'disappeared when it mattered', 'could not buy a hit in October', 'went quiet in the playoffs'];
const BANNED = /everyone saw it|disappeared|talk shows|could not buy|The room noticed/;
const DASH = new RegExp(`[${String.fromCharCode(0x2013)}${String.fromCharCode(0x2014)}]`);
const CRIT = '\u{1F39E}️', CREDIT = '\u{1F4AA}', RISER = '\u{1F9CA}';
const fails = [];
const fail = (section, msg) => { if (fails.filter(f => f.startsWith(section)).length < 4) console.log(`  FAIL ${section}: ${msg}`); fails.push(`${section}: ${msg}`); };
const table = [];
for (const slug of SPORTS) {
  const S = M[`${slug.toUpperCase()}_CAREER_SPORT`];
  const t = { playoffs: 0, lost: 0, strongLost: 0, credit: 0, crit: 0, lastCalls: 0, lastSound: 0, noOffer: 0, windows: 0 };
  for (let k = 0; k < CAREERS; k++) {
    const rng = mulberry32(SEED * 1000 + k + slug.length * 7919);
    const pos = S.create.positions[k % S.create.positions.length];
    const arch = S.create.archetypes[pos][Math.floor(rng() * S.create.archetypes[pos].length)];
    const c = S.startCareer('Report Fleet', pos, arch, rng, null, 'now');
    let tq = S.rollTeamQuality(null, rng); S.assignRole(c, tq, rng);
    for (let guard = 0; guard < 30 && !c.retired; guard++) {
      let calledLast = null;
      if (M.extensionDue(c)) {
        const talk = S.buildExtension(c, rng);
        if (!talk.offer) {
          t.noOffer++;
          calledLast = M.seasonAheadIsLast(c, S.shouldRetire);
          const why = M.noOfferWhy({ age: c.age, ovr: c.ovr, pos: c.pos, cliffAge: S.extPushArgs(c, () => 0).cliffAge, market: talk.market });
          if (!/^No offer, and here is why: .+\. The open market prices you around \$[\d.]+M a year\.$/.test(why) || DASH.test(why)) fail('B3', `${slug}: "${why}"`);
        } else { c.contractYears = 1 + talk.offer.years; c.salary = talk.offer.salary; }
      } else if (c.contractYears <= 0) {
        const w = S.buildFaWindow(c, tq, rng); t.windows++;
        const live = w.offers.filter(o => !o.gone);
        if (!live.length) { fail('B1', `${slug} career ${k}: a market with no live offer at age ${c.age}`); break; }
        M.applyFaSigning(c, live[0]); tq = live[0].quality;
      }
      S.campBattle(c, tq, rng);
      globalThis.__po = null;
      const { line, notes } = S.simSeason(c, tq, rng);
      const po = globalThis.__po;
      S.progress(c, rng);
      const ended = S.shouldRetire(c);
      if (calledLast) { t.lastCalls++; if (ended) t.lastSound++; else fail('B2', `${slug} career ${k}: called the last season at age ${c.age - 1}, and the career went on`); }
      for (const n of notes) {
        if (OLD_LINES.some(o => n.includes(o)) || BANNED.test(n)) fail('C4', `${slug}: "${n}"`);
        if (DASH.test(n)) fail('C4', `${slug}: a dash in "${n}"`);
      }
      if (po) {
        t.playoffs++;
        const lost = line.teamResult !== TITLE[slug];
        const crit = notes.find(n => n.startsWith(CRIT)), credit = notes.find(n => n.startsWith(CREDIT)), riser = notes.find(n => n.startsWith(RISER));
        if (lost) t.lost++;
        if (crit) { t.crit++; if (po.level >= 70) fail('C1', `${slug} ${pos}: criticism on a January level of ${po.level.toFixed(1)}`); if (po.level >= 70 || po.clutch > -7) fail('C3', `${slug}: criticism at level ${po.level.toFixed(1)}, clutch ${po.clutch.toFixed(1)}`); }
        if (lost && po.level >= 76 && !riser) { t.strongLost++; if (credit) t.credit++; else fail('C2', `${slug} ${pos}: lost on a January level of ${po.level.toFixed(1)} with no credit`); }
        const kind = crit ? 'crit' : credit ? 'credit' : 'none';
        if (lost && po.clutch <= -7 && !table.some(r => r.slug === slug && r.kind === kind)) {
          const old = slug === 'nfl' ? 'You were not the same player in January and everyone saw it.' : slug === 'nba' ? 'You disappeared when it mattered. The talk shows had a field day.' : slug === 'mlb' ? 'You could not buy a hit in October. It will follow you all winter.' : 'You went quiet in the playoffs. The room noticed.';
          table.push({ slug, kind, pos, k, result: line.teamResult, level: po.level.toFixed(1), clutch: po.clutch.toFixed(1), before: old, after: crit ?? credit ?? '(no line)' });
        }
      }
      if (ended) { c.retired = true; break; }
      tq = S.rollTeamQuality(tq, rng);
    }
  }
  if (t.crit < CRIT_FLOOR) fail('C3', `${slug}: only ${t.crit} critical notes, the floor is ${CRIT_FLOOR}`);
  console.log(`${slug}: ${JSON.stringify(t)}`);
}
console.log('Before and after, fixed seeded postseasons (the same games; before is the old rule\'s line):');
for (const r of table) console.log(`  ${r.slug} ${r.pos} career ${r.k} | ${r.result} | level ${r.level}, clutch ${r.clutch} | before: ${r.before} | after: ${r.after}`);
const sections = ['B1', 'B2', 'B3', 'C1', 'C2', 'C3', 'C4'];
console.log(sections.map(s => `${s} ${fails.some(f => f.startsWith(s)) ? 'FAIL' : 'ok'}`).join(', '));
console.log(`simUsCareerReports ${fails.length ? 'FAIL' : 'PASS'}: ${fails.length} findings, ${CAREERS} careers a sport, seed ${SEED}${CONTROL ? `, CONTROL ${CONTROL}` : ''}`);
process.exit(fails.length ? 1 : 0);

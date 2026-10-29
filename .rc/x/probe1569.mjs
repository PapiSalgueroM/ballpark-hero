/* Round 1569 diagnosis probe (never committed). Runs seeded careers through the four real bindings in the
   board's own order (camp, season, progress, retire check, extension or market before a season) and prints:
   C) every playoff note the engine wrote after a postseason that did not end in a title, with the January
      level the line was drawn from (read by a patch at the call site), and
   B) what the late career contract screens held: extension offers, market windows, and what came next.
   Usage: node .rc/x/probe1569.mjs [careers per sport] */
import os from 'node:os';
import path from 'node:path';
import { build } from 'esbuild';
import { readFileSync, unlinkSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

const ROOT = process.cwd();
const CAREERS = Number(process.argv[2] || 150);
const OUT = path.join(os.tmpdir(), `probe1569-${process.pid}.mjs`);
const CALLS = [
  ['nflMyCareer.ts', "clutchNote(clutch, depth, 'nfl')", 'pf'],
  ['nbaMyCareer.ts', "clutchNote(clutch, depth, 'nba')", 'poForm'],
  ['mlbMyCareer.ts', "clutchNote(clutch, depth, 'mlb')", 'pf'],
  ['nhlMyCareer.ts', "clutchNote(clutch, poDepth, 'nhl')", 'poForm'],
];
const fired = new Set();
const patch = {
  name: 'probe', setup(b) {
    b.onLoad({ filter: /(nfl|nba|mlb|nhl)MyCareer\.ts$/ }, args => {
      let src = readFileSync(args.path, 'utf8');
      for (const [file, call, level] of CALLS) {
        if (!args.path.endsWith(file)) continue;
        if (!src.includes(call)) throw new Error(`probe: ${call} not in ${file}`);
        src = src.replace(call, `(globalThis.__po = { clutch, level: ${level} }, ${call})`);
        fired.add(file);
      }
      return { contents: src, loader: 'ts' };
    });
  },
};
await build({
  stdin: { contents: ['nfl', 'nba', 'mlb', 'nhl'].map(s => `export { ${s.toUpperCase()}_CAREER_SPORT } from './src/lib/${s}CareerSport.ts';`).join('\n')
    + "\nexport { applyFaSigning } from './src/lib/usCareerFreeAgency.ts';\nexport { extensionDue } from './src/lib/usCareerExtension.ts';\n", resolveDir: ROOT, loader: 'ts' },
  bundle: true, format: 'esm', platform: 'node', outfile: OUT, absWorkingDir: ROOT, logLevel: 'error',
  alias: { '@': './src' }, plugins: [patch], jsx: 'automatic',
  banner: { js: "import { createRequire as __r } from 'node:module'; const require = __r(import.meta.url);" },
});
const store = new Map();
globalThis.localStorage ??= { getItem: k => (store.has(k) ? store.get(k) : null), setItem: (k, v) => { store.set(k, String(v)); }, removeItem: k => { store.delete(k); }, clear: () => store.clear() };
const M = await import(pathToFileURL(OUT).href);
try { unlinkSync(OUT); } catch { /* copy */ }
if (fired.size !== 4) { console.log(`patched ${fired.size} of 4 call sites, refusing`); process.exit(2); }

function mulberry32(a) { return () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const TITLE = { nfl: 'WON THE SUPER BOWL', nba: 'WON THE NBA FINALS', mlb: 'WON THE WORLD SERIES', nhl: 'WON THE STANLEY CUP' };
const blameRows = [], late = [];
for (const slug of ['nfl', 'nba', 'mlb', 'nhl']) {
  const S = M[`${slug.toUpperCase()}_CAREER_SPORT`];
  const tally = { playoffs: 0, lost: 0, blame: 0, blameStrong: 0, blameMid: 0, credit: 0, lostStrongNoLine: 0 };
  for (let k = 0; k < CAREERS; k++) {
    const rng = mulberry32(1569 * 1000 + k + slug.length * 7919);
    const positions = S.create.positions; const pos = positions[k % positions.length];
    const arch = S.create.archetypes[pos][Math.floor(rng() * S.create.archetypes[pos].length)];
    const c = S.startCareer('Probe Player', pos, arch, rng, null, 'now');
    let tq = S.rollTeamQuality(null, rng); S.assignRole(c, tq, rng);
    for (let guard = 0; guard < 30 && !c.retired; guard++) {
      if (M.extensionDue(c)) {
        const t = S.buildExtension(c, rng);
        const row = { slug, k, season: c.seasons.length + 1, age: c.age, ovr: c.ovr, kind: 'extension', offer: !!t.offer, note: t.note };
        if (t.offer) { c.contractYears = 1 + t.offer.years; c.salary = t.offer.salary; }
        if (c.seasons.length >= 15) late.push(row);
      } else if (c.contractYears <= 0) {
        const w = S.buildFaWindow(c, tq, rng);
        const live = w.offers.filter(o => !o.gone);
        if (c.seasons.length >= 15) late.push({ slug, k, season: c.seasons.length + 1, age: c.age, ovr: c.ovr, kind: 'market', offers: w.offers.length, live: live.length, note: w.note });
        if (!live.length) break;
        M.applyFaSigning(c, live[0]); tq = live[0].quality;
      }
      S.campBattle(c, tq, rng);
      globalThis.__po = null;
      const { line, notes } = S.simSeason(c, tq, rng);
      const po = globalThis.__po;
      S.progress(c, rng);
      const ended = S.shouldRetire(c);
      const last = late.length && late[late.length - 1].slug === slug && late[late.length - 1].k === k && late[late.length - 1].season === c.seasons.length ? late[late.length - 1] : null;
      if (last) last.next = ended ? `career ended after it (age ${c.age}, OVR ${c.ovr}, ${c.seasons.length} seasons)` : 'played on';
      if (po) {
        tally.playoffs++;
        const lost = line.teamResult !== TITLE[slug];
        const sad = notes.find(n => n.startsWith('\u{1F62C}'));
        const happy = notes.find(n => n.startsWith('\u{1F9CA}'));
        if (lost) tally.lost++;
        if (lost && happy) tally.credit++;
        if (lost && !sad && !happy && po.level >= 76) tally.lostStrongNoLine++;
        if (sad) {
          tally.blame++;
          if (po.level >= 76) tally.blameStrong++; else if (po.level >= 70) tally.blameMid++;
          if (blameRows.filter(r => r.slug === slug).length < 4 && po.level >= 76) blameRows.push({ slug, pos, ovr: line.ovr, result: line.teamResult, january: notes.find(n => n.startsWith('\u{1F4CA}')), level: Math.round(po.level * 10) / 10, clutch: Math.round(po.clutch * 10) / 10, shown: sad });
        }
      }
      if (ended) { c.retired = true; break; }
      tq = S.rollTeamQuality(tq, rng);
    }
  }
  console.log(`C ${slug}: ${JSON.stringify(tally)}`);
}
console.log('C before table (blame line on a January level of 76 or more):');
for (const r of blameRows) console.log(`  ${r.slug} ${r.pos} OVR ${r.ovr} | ${r.result} | ${r.january} | level ${r.level}, clutch ${r.clutch} | shown: ${r.shown}`);
const nullExt = late.filter(r => r.kind === 'extension' && !r.offer);
console.log(`B late screens (season 16 on): ${late.length}; extensions ${late.filter(r => r.kind === 'extension').length}, with no offer ${nullExt.length}, of those the career ended after the very season played: ${nullExt.filter(r => /ended/.test(r.next ?? '')).length}`);
console.log(`B market windows late: ${late.filter(r => r.kind === 'market').length}, with zero live offers: ${late.filter(r => r.kind === 'market' && r.live === 0).length}, min offers ${Math.min(...late.filter(r => r.kind === 'market').map(r => r.offers))}`);
for (const r of nullExt.filter(r => r.slug === 'nba').slice(0, 6)) console.log(`  nba career ${r.k}: season ${r.season}, age ${r.age}, OVR ${r.ovr}: "${r.note}" then ${r.next}`);
console.log('probe1569 DONE');

/* Reviewer (run lens), Round 1319: OLD SAVES. Saves made by the BASE's engine (48cb9d4b, checked out at
   /tmp/rvbase by the request line) at every phase of every road, loaded by the HEAD's loader with and
   without the descriptor, must load JSON equal to what the base's loader gave, carry no `combine` or
   `played` key, and every next step the scouts' path offers from them (a season, every option of a
   card, each of the three showcase buttons, the draft) must give JSON equal state on base and head.
   A negative control (RVSAVES_CONTROL=1) gives the head's loaded state an extra key, which must be seen.
   Usage (runner, repo root = head): node .rc/x/rvsaves.mjs /tmp/rvbase */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import * as esbuild from 'esbuild';

const ROOT = process.cwd();
const BASEDIR = process.argv[2];
const N = Number(process.env.RVSAVES_N || 1200);
const CONTROL = process.env.RVSAVES_CONTROL === '1';
if (!BASEDIR || !fs.existsSync(path.join(BASEDIR, 'src/lib/careerPreDraft.ts'))) { console.error('no base tree'); process.exit(2); }

async function bundle(root, tag) {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), `rvsaves-${tag}-`));
  const lib = f => path.join(root, 'src/lib', f).replace(/\\/g, '/');
  const entry = path.join(tmp, 'entry.ts');
  fs.writeFileSync(entry, [
    `export * from '${lib('careerPreDraft.ts')}';`,
    `export { keyedRng } from '${lib('keyedRng.ts')}';`,
    `export { nflPreDraftDescriptor } from '${lib('nflCareerPreDraft.ts')}';`,
    `export { nbaPreDraftDescriptor } from '${lib('nbaCareerPreDraft.ts')}';`,
    `export { mlbPreDraftDescriptor } from '${lib('mlbCareerPreDraft.ts')}';`,
    `export { nhlPreDraftDescriptor } from '${lib('nhlCareerPreDraft.ts')}';`,
  ].join('\n'));
  const out = path.join(tmp, 'bundle.mjs');
  await esbuild.build({ entryPoints: [entry], bundle: true, format: 'esm', platform: 'node', outfile: out, logLevel: 'error',
    alias: { '@': path.join(root, 'src') }, nodePaths: [path.join(ROOT, 'node_modules')] });
  const text = fs.readFileSync(out, 'utf8');
  if (/supabase\.co/.test(text)) { console.error(`${tag} bundle reaches the live host, refusing`); process.exit(2); }
  return import(pathToFileURL(out).href);
}
const H = await bundle(ROOT, 'head');
const B = await bundle(BASEDIR, 'base');
if (typeof H.preDraftCombineOpen !== 'function' || typeof B.preDraftCombineOpen === 'function') { console.error('head and base bundles are not what they claim'); process.exit(2); }

const ERAS = { nfl: ['now', 'y2005'], nba: ['now', 'y2004'], mlb: ['now', 'y2004'], nhl: ['now', 'y2006'] };
const POS = { nfl: ['QB', 'RB', 'WR', 'TE', 'LB', 'CB', 'EDGE', 'K', undefined], nba: ['PG', 'SG', 'SF', 'PF', 'C', undefined],
  mlb: ['SP', 'RP', 'C', '1B', 'SS', 'CF', 'DH', undefined], nhl: ['C', 'LW', 'RW', 'D', 'G', undefined] };
const J = x => JSON.stringify(x);
let saves = 0, steps = 0, bad = 0, controlSeen = 0;
const issues = [];
const note = m => { bad += 1; if (issues.length < 12) issues.push(m); };
for (const sport of Object.keys(ERAS)) for (const era of ERAS[sport]) {
  const bd = B[`${sport}PreDraftDescriptor`](era), hd = H[`${sport}PreDraftDescriptor`](era);
  const { stations, ...hdData } = hd;
  if (J(hdData) !== J(bd)) note(`${sport}:${era} the descriptors' data differ beyond stations`);
  if (typeof stations !== 'function') note(`${sport}:${era} head has no stations`);
  for (let i = 0; i < N; i += 1) {
    const pick = B.keyedRng ? B.keyedRng(`rv|${sport}|${era}|${i}`) : null;
    const r = k => (pick ? pick() : ((i * 7919 + k * 104729) % 1000) / 1000);
    const route = bd.routes[Math.floor(r(1) * bd.routes.length)];
    const rating = 40 + Math.floor(r(2) * 50);
    const pos = POS[sport][Math.floor(r(3) * POS[sport].length)];
    const startIn = { seed: `rv-${sport}-${era}-${i}`, routeId: route.id, rating, pot: Math.min(99, rating + Math.floor(r(4) * 20)), ...(pos === undefined ? {} : { pos }) };
    let s = B.preDraftStart(bd, startIn);
    if (J(H.preDraftStart(hd, startIn)) !== J(s)) note(`${sport}:${era}:${i} preDraftStart differs`);
    const states = [s];
    for (let g = 0; g < 20 && s.phase !== 'showcase'; g += 1) {
      if (s.phase === 'season') s = B.preDraftPlaySeason(bd, s);
      else { const card = B.preDraftChoicePool(bd).find(c => c.id === s.pendingChoice); s = B.preDraftChoose(bd, s, Math.floor(r(10 + g) * card.options.length)); }
      states.push(s);
    }
    for (const a of ['allout', 'steady', 'skip']) { const sh = B.preDraftShowcase(bd, s, a); states.push(sh, B.preDraftRunDraft(bd, sh)); }
    for (const st of states) {
      const disk = J(st);
      for (const withDesc of [true, false]) {
        saves += 1;
        const bl = B.loadPreDraft(JSON.parse(disk), withDesc ? bd : undefined);
        let hl = H.loadPreDraft(JSON.parse(disk), withDesc ? hd : undefined);
        if (CONTROL && hl) { hl = { ...hl, combine: { approach: 'allout' } }; }
        if (J(hl) !== J(bl)) { if (CONTROL) controlSeen += 1; else note(`${sport}:${era}:${i} ${st.phase} load ${withDesc ? 'with' : 'without'} the descriptor differs`); continue; }
        if (hl && ('combine' in hl || (hl.showcase && 'played' in hl.showcase))) note(`${sport}:${era}:${i} a new key on an old save`);
        if (!withDesc || !hl) continue;
        const next = [];
        if (hl.phase === 'season') next.push([H.preDraftPlaySeason(hd, hl), B.preDraftPlaySeason(bd, bl)]);
        if (hl.phase === 'choice') { const card = B.preDraftChoicePool(bd).find(c => c.id === bl.pendingChoice); for (let k = 0; k < card.options.length; k += 1) next.push([H.preDraftChoose(hd, hl, k), B.preDraftChoose(bd, bl, k)]); }
        if (hl.phase === 'showcase') for (const a of ['allout', 'steady', 'skip']) { const hs = H.preDraftShowcase(hd, hl, a), bs = B.preDraftShowcase(bd, bl, a); next.push([hs, bs], [H.preDraftRunDraft(hd, hs), B.preDraftRunDraft(bd, bs)]); }
        if (hl.phase === 'draft') next.push([H.preDraftRunDraft(hd, hl), B.preDraftRunDraft(bd, bl)]);
        for (const [x, y] of next) { steps += 1; if (J(x) !== J(y)) note(`${sport}:${era}:${i} a step from ${hl.phase} differs on head`); }
      }
    }
  }
}
if (CONTROL) {
  console.log(`RVSAVES control: ${controlSeen} of ${saves} loads seen to differ`);
  if (controlSeen > 0) { console.log('RVSAVES control FIRED'); process.exit(1); }
  console.log('RVSAVES control did not fire'); process.exit(2);
}
for (const m of issues) console.log('  FAIL: ' + m);
console.log(`RVSAVES ${bad ? 'RED' : 'GREEN'}: ${saves} base saves loaded on head (8 pairs x ${N} roads, every phase, with and without the descriptor), ${steps} next steps compared, ${bad} differences`);
process.exit(bad ? 1 : 0);

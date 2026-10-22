/* Review run 1525 (runner only): saves made by the BASE tree (41368514, checked out at /tmp/base) load and play on
   this branch. Each career is played on the base engine for a seeded number of steps, written with the base's own
   serializer, read back with this branch's parser, checked with isSoccerCareerSave, repaired with repairCareer and
   played to retirement on this branch's engine. Every playing season after the switch is also stepped by BOTH real
   trees from one copied state and one seed, and the Math.random count and the season row at the end of the awards
   block must agree (the brief's main stream promise, proven against the real base tree, not the inverse). */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { build } from 'esbuild';

const ROOT = process.cwd();
const BASE_ROOT = process.env.BASE_ROOT || '/tmp/base';
const N = Number(process.env.SAVE_PROBE_N || 120);
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'save-probe-'));
globalThis.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };
let draws = 0;
const mulberry = seed => { let s = seed | 0; return () => { s = (s + 0x6d2b79f5) | 0; let t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; };
const seedRandom = seed => { const r = mulberry(seed); draws = 0; Math.random = () => { draws += 1; return r(); }; };

async function bundle(root, name) {
  const entry = path.join(TMP, `${name}-entry.ts`);
  const lib = m => path.join(root, 'src/lib', m).split(path.sep).join('/');
  fs.writeFileSync(entry, `export * as E from '${lib('soccerCareerEngine')}';\nexport * as A from '${lib('soccerCareerAttributes')}';\nexport * as V from '${lib('soccerCareerSave')}';\n`);
  const out = path.join(TMP, `${name}.mjs`);
  await build({ entryPoints: [entry], bundle: true, format: 'esm', platform: 'node', outfile: out, logLevel: 'error', alias: { '@': path.join(root, 'src') }, absWorkingDir: root });
  let text = fs.readFileSync(out, 'utf8');
  const END = 'const totalGoals = ';
  if (text.split(END).length !== 2) { console.log(`ABORT: ${name}: the line after the awards block is not there once`); process.exit(1); }
  const at = text.indexOf(END);
  const m = /^const totalGoals = (\w+)\.seasons\.reduce\(\(sum, ss\) => sum \+ ss\.goals, 0\) \+ (\w+)\.goals;/.exec(text.slice(at, at + 200));
  if (!m) { console.log(`ABORT: ${name}: the season variable was not found`); process.exit(1); }
  text = `${text.slice(0, at)}if (globalThis.__awardsEnd) globalThis.__awardsEnd(${m[2]});\n  ${text.slice(at)}`;
  fs.writeFileSync(out, text);
  return import(pathToFileURL(out).href);
}

const H = await bundle(ROOT, 'head');
const B = await bundle(BASE_ROOT, 'base');
const { careerStep } = await import(pathToFileURL(path.join(ROOT, 'scripts/lib/careerStep.mjs')).href);
const step = (S, c) => {
  if (c.phase === 'retirement_suggestion') return S.E.declineRetirementSuggestion(c, S.E.FALLBACK_CLUBS);
  if (['retirement_ceremony', 'post_retirement', 'retired'].includes(c.phase)) return { ...c, retired: true };
  return careerStep(S.E, c, S.E.FALLBACK_CLUBS);
};
const deepCopy = v => (Array.isArray(v) ? v.map(deepCopy) : v && typeof v === 'object' ? Object.fromEntries(Object.entries(v).map(([k, x]) => [k, deepCopy(x)])) : v);
const POS = ['ST', 'CM', 'CB', 'GK', 'LW', 'CAM', 'CDM', 'RB', 'RW', 'LB'];
const KEYS = ['pace', 'shooting', 'passing', 'dribbling', 'defending', 'physical', 'reflexes'];
const ERAS = [['2020-24', 2020], ['2010-14', 2010], ['2000-04', 2000], ['1990-94', 1990], ['2005-09', 2005], ['1995-99', 1995]];
const WINDOWS = { 'Golden Glove': [2004, 9999], 'UEFA Player of the Year': [2010, 2022], 'Puskás Award': [2008, 9999] };

let loaded = 0, refused = 0, thrown = 0, prefixLost = 0, outside = 0, seasonsAfter = 0, lockSeasons = 0, drawParts = 0, rowParts = 0, hookParts = 0, awardsDiffer = 0;
const errs = [];
for (let i = 0; i < N; i += 1) {
  const pos = POS[i % POS.length];
  const [era, start] = ERAS[Math.floor(i / POS.length) % ERAS.length];
  const ovr = 62 + (Math.floor(i / 60) % 4) * 4;
  const off = B.A.POSITION_OFFSETS[pos];
  const stats = Object.fromEntries(KEYS.map((k, j) => [k, Math.max(25, Math.min(99, ovr + off[j]))]));
  seedRandom(9001 + i * 37);
  let c = B.E.initCareer(`Old Save ${i}`, i % 2 ? 'England' : 'Spain', pos, era, stats, ovr, start, B.E.FALLBACK_CLUBS, null, Math.min(94, ovr + 20));
  const steps = 10 + (i * 7) % 40;
  try { for (let k = 0; k < steps && !c.retired; k += 1) c = step(B, c); } catch (e) { errs.push(`base play ${i}: ${String(e).slice(0, 120)}`); continue; }
  if (c.retired) continue;
  const raw = B.V.serializeSoccerCareerSave(c);
  let parsed;
  try { parsed = H.V.parseSoccerCareerSave(raw); } catch (e) { refused += 1; errs.push(`parse ${i}: ${String(e).slice(0, 120)}`); continue; }
  if (!H.V.isSoccerCareerSave(parsed)) { refused += 1; errs.push(`refused ${i} at phase ${c.phase}`); continue; }
  loaded += 1;
  let h = H.E.repairCareer(parsed);
  const oldAwards = JSON.stringify(c.awards);
  const switchSeasons = c.seasons.length;
  try {
    for (let k = 0; k < 1500 && !h.retired; k += 1) {
      if (h.phase === 'playing') {
        const seed = 77000000 + i * 1000 + k;
        const both = [H, B].map(S => {
          seedRandom(seed);
          let at = null;
          globalThis.__awardsEnd = season => { at = { d: draws, row: JSON.stringify(season) }; };
          const out = step(S, deepCopy(h));
          globalThis.__awardsEnd = null;
          return { at, out };
        });
        if ((both[0].at === null) !== (both[1].at === null)) hookParts += 1;
        else if (both[0].at) {
          lockSeasons += 1;
          if (both[0].at.d !== both[1].at.d) drawParts += 1;
          if (both[0].at.row !== both[1].at.row) rowParts += 1;
          if (JSON.stringify(both[0].out.awards) !== JSON.stringify(both[1].out.awards)) awardsDiffer += 1;
        }
        h = both[0].out;
      } else {
        seedRandom(88000000 + i * 1000 + k);
        h = step(H, h);
      }
    }
  } catch (e) { thrown += 1; errs.push(`head play ${i}: ${String(e.stack || e).slice(0, 200)}`); continue; }
  if (!JSON.stringify(h.awards).startsWith(oldAwards.slice(0, -1))) prefixLost += 1;
  seasonsAfter += h.seasons.length - switchSeasons;
  for (const a of h.awards.slice(c.awards.length)) { const w = WINDOWS[a.name]; if (w && (a.year < w[0] || a.year > w[1])) outside += 1; }
}
console.log(`${N} careers: ${loaded} base saves loaded on the branch, ${refused} refused, ${thrown} threw while playing on, ${prefixLost} lost an old award, ${seasonsAfter} seasons played after the switch, ${outside} named awards outside their years`);
console.log(`lockstep from the loaded saves against the REAL base tree: ${lockSeasons} seasons, draws parted ${drawParts}, rows parted ${rowParts}, block in one tree only ${hookParts}, awards lists differ after the season ${awardsDiffer}`);
for (const e of errs.slice(0, 12)) console.log(`   ${e}`);
const bad = refused + thrown + prefixLost + outside + drawParts + rowParts + hookParts > 0 || loaded < N / 2 || lockSeasons < 200;
console.log(bad ? 'saveProbe: RED' : 'saveProbe: green');
process.exit(bad ? 1 : 0);

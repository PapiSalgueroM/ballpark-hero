/* QA audit (qa-sc): does every Soccer Career random event choice do what its card promises?
   Reads the engine's own catalog, applies each choice to a mid career state many times, and
   compares the printed consequence ("Popularity +10, Social media +50k") with what moved. */
import fs from 'node:fs';
import path from 'node:path';
import { build } from 'esbuild';
import { pathToFileURL } from 'node:url';
const ROOT = process.cwd();
const TMP = process.env.TMPDIR || '/tmp';
const OUT = process.env.RC_OUT || TMP;
fs.writeFileSync(`${TMP}/e.entry.mjs`, `globalThis.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };\nexport * as engine from '${ROOT}/src/lib/soccerCareerEngine.ts';\n`);
await build({ entryPoints: [`${TMP}/e.entry.mjs`], bundle: true, format: 'esm', platform: 'node', outfile: `${TMP}/e.bundle.mjs`, logLevel: 'error', alias: { '@': `${ROOT}/src` }, loader: { '.css': 'empty', '.png': 'empty', '.svg': 'empty', '.jpg': 'empty', '.webp': 'empty' } });
const { engine: E } = await import(pathToFileURL(`${TMP}/e.bundle.mjs`).href);
const clubs = E.FALLBACK_CLUBS;
const stats = { pace: 75, shooting: 78, passing: 72, dribbling: 76, defending: 40, physical: 70, reflexes: 20 };
function base(pos = 'ST') {
  const s = E.initCareer('Audit Player', 'England', pos, '2025', stats, 74, 2025, clubs, null, 88);
  Object.assign(s, { age: 26, overall: 86, popularity: 50, morale: 50, netWorth: 80, socialMediaFollowers: 20, internationalCareer: true, phase: 'random_events', hasRelationship: false, sponsorDeal: null, isLeader: false });
  return s;
}
const FIELD = [
  [/^popularity|^fame|^reputation/i, ['popularity']],
  [/social media|followers/i, ['socialMediaFollowers']],
  [/market value|value/i, ['marketValue']],
  [/^morale|happiness/i, ['morale']],
  [/net worth|money|cash|^€|savings|wealth/i, ['netWorth']],
  [/^wage/i, ['weeklyWage']],
  [/^pace/i, ['pace']], [/^shooting/i, ['shooting']], [/^passing/i, ['passing']], [/^dribbling/i, ['dribbling']],
  [/^defending/i, ['defending']], [/^physical/i, ['physical']], [/^reflexes/i, ['reflexes']],
  [/^all stats|^overall|^all attributes/i, ['overall', 'pace', 'shooting', 'passing', 'dribbling', 'defending', 'physical']],
];
const num = v => typeof v === 'number' ? v : 0;
function moved(before, after, keys) {
  let dir = 0;
  for (const k of keys) {
    const d = num(after[k]) - num(before[k]);
    const b = num(after.statBoostNextSeason?.[k]) - num(before.statBoostNextSeason?.[k]);
    if (d > 0 || b > 0) dir |= 1;
    if (d < 0 || b < 0) dir |= 2;
  }
  return dir;
}
const rows = [], unmapped = new Map(), checked = { claims: 0, kept: 0 };
const s0 = base();
const all = E.getAllEvents(s0);
console.log(`catalog: ${all.length} events, ${all.reduce((a, e) => a + e.choices.length, 0)} choices`);
for (const ev of all) {
  ev.choices.forEach((ch, ci) => {
    const claims = String(ch.consequence || '').split(/[,;·]| and /).map(t => t.trim()).filter(Boolean);
    for (const c of claims) {
      const m = c.match(/^(.*?)\s*([+-])\s*(€)?\s*([\d.]+)\s*(k|K|M|m|%)?/);
      if (!m) { if (/\d/.test(c)) unmapped.set(c, (unmapped.get(c) || 0) + 1); continue; }
      const name = m[1].trim() || (m[3] ? '€' : '');
      const map = FIELD.find(([re]) => re.test(name));
      if (!map) { unmapped.set(name || c, (unmapped.get(name || c) || 0) + 1); continue; }
      const want = m[2] === '+' ? 1 : 2;
      const deferred = /next season|next year|over time|later/i.test(ch.consequence);
      let seen = 0, runs = 0, err = null;
      for (let k = 0; k < 30; k++) {
        const st = JSON.parse(JSON.stringify(s0));
        const before = JSON.parse(JSON.stringify(st));
        try { const fresh = E.getAllEvents(st).find(e => e.id === ev.id); const after = (fresh?.choices[ci] ?? ch).apply(st); runs++; if (moved(before, after, map[1]) & want) seen++; }
        catch (e) { err = String(e).slice(0, 120); }
      }
      checked.claims++;
      if (seen > 0) checked.kept++;
      else rows.push({ id: ev.id, title: ev.title, choice: ch.label, claim: c, consequence: ch.consequence, runs, seen, deferred, err });
    }
  });
}
console.log(`claims checked: ${checked.claims}, kept at least once in 30 tries: ${checked.kept}, never kept: ${rows.length}`);
for (const r of rows.slice(0, 60)) console.log(`  NOT KEPT  #${r.id} "${r.title}" / "${r.choice}": claims "${r.claim}" (card: ${r.consequence})${r.deferred ? ' [deferred wording]' : ''}${r.err ? ' ERR ' + r.err : ''}`);
console.log(`unmapped claim names (not checked): ${[...unmapped.entries()].sort((a, b) => b[1] - a[1]).slice(0, 25).map(([k, v]) => `${k} x${v}`).join(' | ')}`);
fs.writeFileSync(path.join(OUT, 'evaudit.json'), JSON.stringify({ count: all.length, checked, rows, unmapped: [...unmapped.entries()] }, null, 1));

/* The draw: generateRandomEvents shuffles with sort(() => Math.random() - 0.5). How even is it? */
const n = all.length, firstK = 4, trials = 40000, hits = new Array(n).fill(0);
for (let t = 0; t < trials; t++) {
  const arr = [...Array(n).keys()].sort(() => Math.random() - 0.5);
  for (let i = 0; i < firstK; i++) hits[arr[i]]++;
}
const expect = trials * firstK / n;
const ratio = hits.map(h => h / expect);
const byPos = k => ratio.slice(k[0], k[1]).reduce((a, b) => a + b, 0) / (k[1] - k[0]);
console.log(`shuffle bias over ${n} items, first ${firstK} picks, ${trials} trials: catalog first tenth x${byPos([0, Math.ceil(n / 10)]).toFixed(2)}, middle x${byPos([Math.floor(n * 0.45), Math.floor(n * 0.55)]).toFixed(2)}, last tenth x${byPos([Math.floor(n * 0.9), n]).toFixed(2)}, max item x${Math.max(...ratio).toFixed(2)}, min item x${Math.min(...ratio).toFixed(2)}`);
console.log('EVAUDIT DONE');

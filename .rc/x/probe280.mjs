// Review probe (read lens, Round 1532): what a keeping pace club's goal bonus is the first time
// it has a full ground of at least 280 in division 0, against the guide's "With 280 in the ground a
// goal pays a 70 dollar bonus before any streak". Read only: bundles the real lib into a temp folder.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
const ROOT = process.cwd();
const B = await import(pathToFileURL(path.join(ROOT, 'scripts/lib/tycoonBots.mjs')).href);
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'probe280-'));
const entry = path.join(tmp, 'entry.ts');
fs.writeFileSync(entry, `export * from '${path.join(ROOT, 'src/lib/stadiumTycoon.ts').split(path.sep).join('/')}';\n`);
const T = await B.bundleTs(ROOT, entry, tmp, 'live');
const DT = B.readDt(ROOT);
function buyRound(s) {
  for (let i = 0; i < 6; i += 1) s = T.tap(s);
  for (let guard = 0; guard < 25; guard += 1) {
    const full = T.attendance(s) >= T.capacity(s) - 5;
    const options = T.TRACKS.filter(tr => T.canBuy(s, tr.id)).sort((a, b) =>
      T.costOf(s, a.id) * (full && a.id === 'stands' ? 0.55 : 1) - T.costOf(s, b.id) * (full && b.id === 'stands' ? 0.55 : 1));
    if (!options.length) break;
    s = T.buy(s, options[0].id);
  }
  return s;
}
const rows = [];
for (let seed = 1; seed <= 20; seed += 1) {
  const roll = B.mulberry(seed);
  let s = T.newTycoon(0);
  const everyTwo = Math.round(2 / DT);
  for (let step = 0; step < Math.round((40 * 60) / DT); step += 1) {
    s = T.tick(s, DT, roll).state;
    const att = T.attendance(s);
    if (att >= 280 && att >= T.capacity(s) && T.divisionIndex(s) === 0) {
      const calm = { ...s, streak: 0 };
      rows.push({ seed, min: +(((step + 1) * DT) / 60).toFixed(2), att, goal: T.goalBonus(calm), tickets: T.levelOf(s, 'tickets'), snacks: T.levelOf(s, 'snacks'), shop: T.levelOf(s, 'shop'), parking: T.levelOf(s, 'parking'), lights: T.levelOf(s, 'lights'), ach: (s.ach || []).length });
      break;
    }
    if ((step + 1) % everyTwo === 0) s = buyRound(s);
  }
}
for (const r of rows) console.log(JSON.stringify(r));
const g = rows.map(r => r.goal).sort((a, b) => a - b);
console.log(`probe280: ${rows.length} of 20 seeds reached a full ground of 280+ in division 0; goal bonus before any streak min ${g[0]} median ${g[Math.floor(g.length / 2)]} max ${g[g.length - 1]} (guide says 70)`);

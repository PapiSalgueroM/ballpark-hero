// Reviewer probe for Round 1324: a weighted pack dealing two cards a week must never deal one card twice in a week.
// Exit 0 when no week holds one card twice, 1 otherwise. Runs from the repo root on the runner.
import { build } from 'esbuild';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
const ROOT = process.cwd();
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'rvwt-'));
const out = path.join(tmp, 'b.mjs');
await build({ entryPoints: [path.join(ROOT, 'src/lib/gmInbox.ts')], bundle: true, format: 'esm', platform: 'node', outfile: out, logLevel: 'error', alias: { '@': path.join(ROOT, 'src') } });
const E = await import(pathToFileURL(out).href);
const card = (id, extra = {}) => ({ id, beat: 'a', from: 'Your assistant', emoji: 'x', text: `${id}.`,
  choices: [{ label: 'Leave it', reply: 'Fine.', karma: 0 }, { label: 'Push', reply: 'Push.', karma: 2 }], ...extra });
const pack = { seat: 'fx', label: 'fx', calendar: [{ id: 'a', label: 'A', emoji: 'A' }], span: { a: 10 }, facts: {}, targets: {},
  meters: { trust: 'T', fans: 'F', money: 'M', morale: 'R' }, money: { prefix: '$', suffix: 'M' },
  perWeek: 2, cooldown: 0, chance: 1, events: [card('light', { weight: 1 }), card('heavy', { weight: 3 }), card('mid', { weight: 2 })] };
const seat = E.bindGmInbox(pack, { moodOf: s => s.trust, setMood: (s, v) => { s.trust = v; }, addPopularity: () => {}, addCash: () => {}, yearOf: s => s.year });
let a = 12345;
const rng = () => { a = (a * 1103515245 + 12345) % 2147483648; return a / 2147483648; };
const s = { trust: 50, morale: 50, year: 2030 };
let twice = 0; let deals = 0; const ex = [];
for (let clock = 0; clock < 500; clock++) {
  const got = E.gmInboxWeek(s, seat, 'a', {}, clock, rng);
  deals += got.length;
  const ids = got.map(m => m.defId);
  if (new Set(ids).size < ids.length) { twice++; if (ex.length < 4) ex.push(`week ${clock}: ${got.map(m => m.id).join(', ')}`); }
  for (const m of s.phoneInbox.filter(m => m.answered === undefined)) E.answerGmInbox(s, m.id, 0, seat);
}
for (const x of ex) console.log(`   ${x}`);
console.log(`rv1324wt: ${deals} deals over 500 weeks (weights 1, 3 and 2, two a week), ${twice} weeks dealt one card twice`);
process.exit(twice ? 1 : 0);

// Reviewer probe for Round 1324: the rest book and the expiry tick on a FALLING clock (a seat that hands in the week
// of the season). The brief (3.3 step 1, 3.3.3, 3.3.6) says both are rebased from the future like the cooldown book.
// Exit 0 when the engine rebases both, 1 when either is not rebased. Runs from the repo root.
import { build } from 'esbuild';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
const ROOT = process.cwd();
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'rvfall-'));
const out = path.join(tmp, 'b.mjs');
await build({ entryPoints: [path.join(ROOT, 'src/lib/gmInbox.ts')], bundle: true, format: 'esm', platform: 'node', outfile: out, logLevel: 'error', alias: { '@': path.join(ROOT, 'src') } });
const E = await import(pathToFileURL(out).href);
const card = (id, extra = {}) => ({ id, beat: 'a', from: 'Your assistant', emoji: 'x', text: `${id}.`,
  choices: [{ label: 'Leave it', reply: 'Fine.', karma: 0 }, { label: 'Push', reply: 'Push.', karma: 2 }], ...extra });
const pack = (events, extra = {}) => ({ seat: 'fx', label: 'fx', calendar: [{ id: 'a', label: 'A', emoji: 'A' }], span: { a: 10 },
  facts: {}, targets: { star: 'Your star' }, meters: { trust: 'T', fans: 'F', money: 'M', morale: 'R' }, money: { prefix: '$', suffix: 'M' },
  perWeek: 1, cooldown: 0, chance: 1, events, ...extra });
const B = { moodOf: s => s.trust, setMood: (s, v) => { s.trust = v; }, addPopularity: () => {}, addCash: () => {}, yearOf: s => s.year };
let bad = 0;
// R: one card about the star, rest 4, cooldown 0, answered every week. Season 1 weeks 0..9, season 2 weeks 0..9.
{
  const p = pack([card('r', { subject: 'star' })], { subjectRest: 4 });
  const seat = E.bindGmInbox(p, B);
  const s = { trust: 50, morale: 50, year: 2030 };
  const dealt = [];
  for (let season = 0; season < 2; season++) for (let w = 0; w < 10; w++) {
    s.year = 2030 + season;
    const got = E.gmInboxWeek(s, seat, 'a', {}, w, () => 0);
    for (const m of got) { dealt.push(`${season}:${w}`); E.answerGmInbox(s, m.id, 0, seat); }
  }
  const s2 = dealt.filter(d => d.startsWith('1:'));
  console.log(`R rest on a falling clock: dealt ${dealt.join(' ')}; season 2 deals ${s2.length}; book at the end ${JSON.stringify(s.gmInboxRest)}`);
  if (s2.length < 2) { bad++; console.log('R FAIL: the rest book entry from the end of season 1 sits in the future and holds the subject through season 2'); }
}
// E: one expiring card (expires 2), never answered. Dealt in season 1; season 2 weeks 0..9 must settle it.
{
  const p = pack([card('x', { expires: 2, cooldown: 100 })], { cooldown: 100 });
  const seat = E.bindGmInbox(p, B);
  const s = { trust: 50, morale: 50, year: 2030 };
  const log = [];
  E.gmInboxWeek(s, seat, 'a', {}, 9, () => 0); // dealt in the last week (9) of season 1
  log.push(`0:9:${s.phoneInbox[0].answered === undefined ? 'open' : 'x'}`);
  s.year = 2031;
  for (let w = 0; w < 10; w++) { // season 2: the clock falls to 0
    E.gmInboxWeek(s, seat, 'a', {}, w, () => 0);
    const m = s.phoneInbox[0];
    log.push(`1:${w}:${m.answered === undefined ? 'open' : (m.auto ? 'auto' : 'ans')}`);
  }
  const settled = log.findIndex(l => l.endsWith('auto'));
  console.log(`E expiry on a falling clock: ${log.join(' ')}`);
  const at = settled < 0 ? 'never' : log[settled];
  console.log(`E settled at ${at} (rebased like the book: 1:2)`);
  if (at !== '1:2:auto') { bad++; console.log('E FAIL: an open card dealt late in a season is not settled two weeks into the next'); }
}
console.log(bad ? `rv1324fall: ${bad} failure(s)` : 'rv1324fall: green (both rebased)');
process.exit(bad ? 1 : 0);

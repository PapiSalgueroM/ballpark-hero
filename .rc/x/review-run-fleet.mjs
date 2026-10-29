// Review of Round 1579 (runner lens): an independent fleet, never committed. The base commit 5f9303bf8 is checked
// out at BASE_DIR (git worktree add) and bundled whole (its src/lib/sportsMillionaire.ts over its own bank), the head
// likewise from the repo root. On fleets the harness does not use (other seeds, other dates, another stream per swap):
//   L  every ladder the base deals, the head deals JSON identical (Unlimited and the daily, LEGACY dates too);
//   A  the head's swap is never a text already on the ladder, other than the one on screen handed back;
//   H  the head's swap hands back the question on screen (counted, reported);
//   I  where the base's swap is fresh, the head's swap is JSON identical to it;
//   D  the head's swap keeps the difficulty on screen;
//   S  an old save: a daily record written by the base's saveDailyRecord loads unchanged through the head's
//      loadDailyRecord, and the head writes the same bytes.
// FLEET_CONTROL=base runs the base's swap in the head's seat, so A must go red (exit 1, "control base fired").
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const ROOT = process.cwd();
const BASE_DIR = process.env.BASE_DIR || '/tmp/base';
const CONTROL = process.env.FLEET_CONTROL || '';
if (CONTROL && CONTROL !== 'base') { console.log(`fleet: could not run: FLEET_CONTROL=${CONTROL} unknown`); process.exit(2); }
const SCALE = Number(process.env.FLEET_SCALE || 1);
const { build } = await import('esbuild');
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'review-run-fleet-'));
const STUB = path.join(tmp, 'client.ts');
fs.writeFileSync(STUB, "export const SUPABASE_URL = 'fixture'; export const SUPABASE_PUBLISHABLE_KEY = 'fixture';\nexport const supabase: any = { from() { throw new Error('the fleet never reaches the database'); } };\n");
async function side(dir, name) {
  const fwd = p => p.split(path.sep).join('/');
  const entry = path.join(tmp, `${name}-entry.ts`);
  fs.writeFileSync(entry, `export * as SM from '${fwd(path.join(dir, 'src/lib/sportsMillionaire.ts'))}';\nexport * as BANK from '${fwd(path.join(dir, 'src/lib/triviaQuestionBank.ts'))}';\n`);
  const outfile = path.join(tmp, `${name}.mjs`);
  await build({ entryPoints: [entry], bundle: true, format: 'esm', platform: 'node', outfile, logLevel: 'error', absWorkingDir: dir,
    alias: { '@/integrations/supabase/client': STUB, '@': path.join(dir, 'src') } });
  return import(pathToFileURL(outfile).href);
}
const store = new Map();
globalThis.localStorage = {
  getItem: k => (store.has(k) ? store.get(k) : null), setItem: (k, v) => { store.set(k, String(v)); },
  removeItem: k => { store.delete(k); }, key: i => [...store.keys()][i] ?? null, get length() { return store.size; }, clear: () => store.clear(),
};
const B = await side(BASE_DIR, 'base');
const H = await side(ROOT, 'head');
console.log(`fleet: base ${BASE_DIR}, head ${ROOT}, scale ${SCALE}${CONTROL ? `, CONTROL ${CONTROL}` : ''}`);

/* the harness's fixture (scripts/simTriviaBank.mjs "the fixture"), rebuilt from the same committed files */
const read = p => fs.readFileSync(path.join(ROOT, p), 'utf8');
const alpha = JSON.parse(read('scripts/data/alphabetSprintPool.json')).rows;
const auction = new Map(JSON.parse(read('scripts/data/auctionMarketRows.json')).map(r => [r.player_name, r.position]));
const stock = JSON.parse(read('scripts/data/stockMarketPools.json'));
const stockPos = new Map();
for (const season of Object.keys(stock.pools).sort()) for (const r of stock.pools[season]) if (r[1]) stockPos.set(r[0], r[1]);
const realPositions = [...auction.values(), ...stockPos.values()].filter(Boolean);
const fnv = s => { let h = 0x811c9dc5; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; } return h >>> 0; };
const market = alpha.filter(r => r.player_name && r.market_value_usd)
  .map(r => ({ player_name: r.player_name, position: auction.get(r.player_name) ?? stockPos.get(r.player_name) ?? realPositions[fnv(r.player_name) % realPositions.length], nationality: r.nationality, club: r.club, market_value_usd: Number(r.market_value_usd) }))
  .sort((a, b) => b.market_value_usd - a.market_value_usd || (a.player_name < b.player_name ? -1 : a.player_name > b.player_name ? 1 : 0));
const ballonDor = JSON.parse(read('scripts/data/ballonDorVerified2026-09.json')).rows
  .map(r => ({ year: r.year, rank: r.rank, player_name: r.player_name, nationality: r.nationality, club: r.club, award_type: r.award_type }))
  .sort((a, b) => b.year - a.year || a.rank - b.rank || (a.player_name < b.player_name ? -1 : 1));
const clubs = [...new Set(market.map(r => r.club).filter(Boolean))].slice(0, 20);
const shirtNumbers = Array.from({ length: 40 }, (_, i) => ({ player_name: `Shirt Fixture ${i + 1}`, club: clubs[i % clubs.length], league: 'Fixture League', nationality: 'Fixtureland', kit_number: i + 1 }));
const POOL = { market, ballonDor, shirtNumbers };
const DEGRADED = { market, ballonDor: [], shirtNumbers: [] };
const PLANTED = { market: market.map((r, i) => ({ ...r, position: i % 2 === 0 ? 'Central Midfield' : 'Centre-Back' })), ballonDor: [], shirtNumbers: [] };

function mulberry32(seed) {
  let a = seed >>> 0;
  return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
const addDays = (d, n) => { const t = new Date(`${d}T12:00:00Z`); t.setUTCDate(t.getUTCDate() + n); return t.toISOString().slice(0, 10); };
let failures = 0;
const fail = m => { failures += 1; console.log(`  FAIL: ${m}`); };

/* S: an old save, written by the base and read by the head */
{
  const records = [
    { currentIndex: 0, lastCorrectIndex: -1, finalAmount: 0, walkedAway: true },
    { currentIndex: 7, lastCorrectIndex: 6, finalAmount: 1000, walkedAway: false },
    { currentIndex: 14, lastCorrectIndex: 14, finalAmount: 1000000, walkedAway: false },
  ];
  for (const [n, rec] of records.entries()) {
    const day = addDays('2026-10-25', n);
    store.clear();
    B.SM.saveDailyRecord(day, rec);
    const written = JSON.stringify([...store.entries()]);
    const back = H.SM.loadDailyRecord(day);
    store.clear();
    H.SM.saveDailyRecord(day, rec);
    const headWritten = JSON.stringify([...store.entries()]);
    const ok = JSON.stringify(back) === JSON.stringify(rec) && written === headWritten;
    console.log(`S ${day}: base wrote ${written.length} bytes, head read ${JSON.stringify(back)}, head writes the same bytes: ${written === headWritten}`);
    if (!ok) fail(`S an old save did not survive: ${written} read back as ${JSON.stringify(back)}`);
  }
  store.clear();
}

const isWorth = t => /worth the most|worth more right now/i.test(t);
const headSwap = CONTROL === 'base' ? B.SM.swapQuestion : H.SM.swapQuestion;
const FLEETS = [
  ['real unlimited', POOL, 'unlimited', 1001, 1000 + Math.round(2000 * SCALE)],
  ['degraded unlimited', DEGRADED, 'unlimited', 1001, 1000 + Math.round(600 * SCALE)],
  ['planted unlimited', PLANTED, 'unlimited', 1001, 1000 + Math.round(600 * SCALE)],
  ['real daily', POOL, 'daily', 250, 249 + Math.round(800 * SCALE)],
  ['real LEGACY daily', POOL, 'legacy', 1, 54],
];
const seeded = Math.random;
for (const [name, P, kind, from, to] of FLEETS) {
  const s = { ladders: 0, ladderDiff: 0, short: 0, swaps: 0, baseRepeats: 0, baseBack: 0, headRepeats: 0, headBack: 0, fresh: 0, identical: 0, diff: 0, secondWorth: 0 };
  for (let k = from; k <= to; k++) {
    const day = kind === 'daily' ? addDays(H.BANK.ONE_ANSWER_FROM, k) : kind === 'legacy' ? addDays(H.BANK.ONE_ANSWER_FROM, -k) : '';
    const bl = kind === 'unlimited' ? B.BANK.generateQuestionLadder(P, 15, mulberry32(k)) : B.BANK.generateDailyLadder(P, day, 15);
    const hl = kind === 'unlimited' ? H.BANK.generateQuestionLadder(P, 15, mulberry32(k)) : H.BANK.generateDailyLadder(P, day, 15);
    s.ladders += 1;
    if (JSON.stringify(bl) !== JSON.stringify(hl)) { s.ladderDiff += 1; if (s.ladderDiff <= 3) fail(`L ${name} ${day || `seed ${k}`}: the head dealt another ladder`); }
    if (hl.length !== 15) { s.short += 1; continue; }
    const texts = new Set(hl.map(q => q.question));
    const hasWorth = hl.some(q => isWorth(q.question));
    for (let i = 0; i < 15; i++) {
      const current = hl[i];
      const stream = fnv(`review-run|${name}|${k}|${i}`);
      let was, now;
      try {
        Math.random = mulberry32(stream); was = B.SM.swapQuestion(P, current);
        Math.random = mulberry32(stream); now = headSwap(P, current, hl);
      } finally { Math.random = seeded; }
      s.swaps += 1;
      const wasBack = was.question === current.question;
      const wasFresh = !wasBack && !texts.has(was.question);
      if (wasBack) s.baseBack += 1; else if (!wasFresh) s.baseRepeats += 1;
      const nowBack = now.question === current.question;
      if (nowBack) s.headBack += 1;
      else if (texts.has(now.question)) { s.headRepeats += 1; if (s.headRepeats <= 2) fail(`A ${name} ${day || `seed ${k}`} rung ${i + 1}: the swap dealt "${now.question}", already on the ladder`); }
      if (wasFresh) { s.fresh += 1; if (JSON.stringify(was) === JSON.stringify(now)) s.identical += 1; else { s.diff += 1; if (s.diff <= 2) fail(`I ${name} ${day || `seed ${k}`} rung ${i + 1}: the base was fresh and the head dealt another`); } }
      if (now.difficulty !== current.difficulty) fail(`D ${name} ${day || `seed ${k}`} rung ${i + 1}: difficulty moved`);
      if (!nowBack && hasWorth && isWorth(now.question) && !isWorth(current.question)) s.secondWorth += 1;
    }
  }
  console.log(`${name}: ${s.ladders} ladders (${s.short} short, ${s.ladderDiff} dealt differently), ${s.swaps} swaps; base repeats ${s.baseRepeats} (${(100 * s.baseRepeats / Math.max(1, s.swaps)).toFixed(1)}%), base back ${s.baseBack}; head repeats ${s.headRepeats}, head back ${s.headBack}; fresh ${s.fresh}, identical ${s.identical}; a second worth question ${s.secondWorth}`);
  if (s.headRepeats) fail(`A ${name}: ${s.headRepeats} head swaps repeated a ladder text`);
  if (s.diff) fail(`I ${name}: ${s.diff} fresh swaps moved`);
  if (s.ladderDiff) fail(`L ${name}: ${s.ladderDiff} ladders dealt differently`);
  if (kind !== 'legacy' && s.baseRepeats < 50 * SCALE) fail(`${name}: the base repeated only ${s.baseRepeats}, so this fleet may be blind`);
}
if (CONTROL) {
  const fired = failures > 0;
  console.log(fired ? `fleet: control ${CONTROL} fired (${failures} failure(s))` : `fleet: control ${CONTROL} did NOT fire`);
  process.exit(fired ? 1 : 3);
}
console.log(failures ? `fleet: ${failures} failure(s)` : 'fleet: all checks passed');
process.exit(failures ? 1 : 0);

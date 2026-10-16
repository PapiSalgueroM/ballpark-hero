// Reviewer probe for Round 1339 (runner only): saves made by the BASE engine (a worktree of origin/main) are
// opened by HEAD (this tree) and by BASE. Seeded saves: HEAD's market and the next 30 entries must be byte equal.
// Unseeded saves (fixture A, B, C, the 4 committed old saves, Hot Seat handovers made on BASE): HEAD's market must
// be BASE's minus the managed club's rows, in order. Then an old career's job move (joinClubNow) on both arms.
//   node .rc/x/oldsave1339.mjs /tmp/base
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { createRequire } from 'node:module';
import { build } from 'esbuild';

const ROOT = process.cwd();
const BASE_ROOT = process.argv[2];
if (!BASE_ROOT || !fs.existsSync(path.join(BASE_ROOT, 'src/lib/clubManager.ts'))) { console.log('oldsave1339: cannot run, no base tree'); process.exit(2); }
const lf = t => t.split('\r\n').join('\n');
const fails = [], notes = [];
const fail = m => { fails.push(m); console.log(`  FAIL ${m}`); };
const note = m => { notes.push(m); console.log(`  ${m}`); };

async function engine(label, root) {
  const plugin = { name: 'src-from', setup(b) {
    b.onLoad({ filter: /\.(ts|tsx|json)$/ }, args => {
      const rel = path.relative(ROOT, args.path).split(path.sep).join('/');
      if (!rel.startsWith('src/')) return null;
      const file = path.join(root, rel);
      return { contents: lf(fs.readFileSync(file, 'utf8')), loader: path.extname(args.path).slice(1), resolveDir: path.dirname(args.path) };
    });
  } };
  const source = ['cm:clubManager', 'eras:clubManagerEras', 'hs:managerHotSeat', 'cal:clubManagerCalendar']
    .map(x => { const [k, f] = x.split(':'); return `export * as ${k} from './src/lib/${f}';`; }).join('\n');
  const out = await build({ stdin: { contents: source, resolveDir: ROOT, sourcefile: `probe-${label}.ts`, loader: 'ts' },
    bundle: true, write: false, format: 'cjs', platform: 'node', target: 'node20', plugins: [plugin], logLevel: 'silent' });
  const script = new vm.Script(out.outputFiles[0].text, { filename: `probe-${label}.cjs` });
  return async function fresh() {
    const module = { exports: {} }; const store = new Map(); const NOW = 1791633600000;
    class HeldDate extends Date { constructor(...a) { super(...(a.length ? a : [NOW])); } static now() { return NOW; } }
    const ctx = vm.createContext({ module, exports: module.exports, require: createRequire(path.join(ROOT, 'package.json')),
      console, process, Buffer, Math, Date: HeldDate, URL, URLSearchParams, TextEncoder, TextDecoder, structuredClone,
      setTimeout, clearTimeout, setInterval, clearInterval, fetch: () => Promise.reject(new Error('no network')),
      localStorage: { getItem: k => store.get(k) ?? null, setItem: (k, v) => store.set(k, String(v)), removeItem: k => store.delete(k), clear: () => store.clear() } });
    script.runInContext(ctx);
    await module.exports.eras.ensureAllEraRosters();
    return { ...module.exports, store };
  };
}
function tape(seed, action) {
  let state = seed >>> 0; const original = Math.random;
  Math.random = () => { state = (state + 0x6d2b79f5) >>> 0; let v = state; v = Math.imul(v ^ v >>> 15, v | 1); v ^= v + Math.imul(v ^ v >>> 7, v | 61); return ((v ^ v >>> 14) >>> 0) / 4294967296; };
  try { return action(); } finally { Math.random = original; }
}
const PLAY = { skipHalftime: true, noCoach: true };
// Control: PROBE_HEAD_ROOT=<base tree> builds the head arm from the base too; T2 and T3 must then go red.
const HEAD_SRC = process.env.PROBE_HEAD_ROOT || ROOT;
const HEADF = await engine('head', HEAD_SRC), BASEF = await engine('base', BASE_ROOT);
const headText = lf(fs.readFileSync(path.join(HEAD_SRC, 'src/lib/clubManager.ts'), 'utf8')), baseText = lf(fs.readFileSync(path.join(BASE_ROOT, 'src/lib/clubManager.ts'), 'utf8'));
console.log(`oldsave1339: head clubManager.ts ${headText.length} chars, base ${baseText.length} chars, differ ${headText !== baseText}`);
async function open(F, raw) { const M = await F(); M.store.set(M.cm.SAVE_KEY, raw); return { M, s: M.cm.loadCareer() }; }
const saveOf = (M, s) => { M.store.clear(); if (!M.cm.saveCareer(s)) throw new Error('save refused'); return M.store.get(M.cm.SAVE_KEY); };
function playOn(M, s, seed, n) { for (let i = 0; i < n; i += 1) { const r = tape(seed + i * 7919, () => M.cm.playNextEntry(s, PLAY)); s = r.state; if (r.kind === 'seasonOver') break; } return s; }

/* T1: seeded saves made on BASE, opened on both. */
const t1 = Date.now();
const SEEDED = [['Real Madrid', 'now'], ['Arsenal', 'now'], ['Orenburg', 'now'], ['Bayern Munich', 'now'], ['Manchester United', 'era2005'], ['Barcelona', 'era2010'], ['Tottenham', 'era2015'], ['Roma', 'era2020']];
let seededSaves = 0, seededBuys = 0, seededBids = 0;
for (const [club, era] of SEEDED) for (const seed of [0x5eed1, 0x5eed2]) {
  const B = await BASEF();
  let s;
  try { s = tape(seed, () => B.cm.startCareer(club, era)); } catch (e) { note(`seeded ${club} ${era}: base would not start (${e.message.slice(0, 80)})`); continue; }
  if (s.worldSeed === undefined) { fail(`seeded ${club} ${era}: the base start carries no seed`); continue; }
  const raws = [saveOf(B, s)];
  const mine = new Set(s.squad.map(p => p.name));
  const mp = B.cm.buildMarket(s).find(p => p.position !== 'GK' && p.age < 29 && p.rating < 80 && !mine.has(p.name));
  const bought = mp && tape(seed + 1, () => B.cm.buyPlayer({ ...s, budget: Math.max(s.budget, (mp.price ?? 0) + 50), wageCap: 9999 }, mp));
  if (bought) { s = bought; seededBuys += 1; }
  s = tape(seed + 2, () => { const n = { ...s }; B.cm.generateIncomingBids(n); return n; });
  const bid = (s.incomingBids ?? []).find(b => b.status === 'open' && !b.loan);
  if (bid) { const t = tape(seed + 3, () => B.cm.acceptBid(s, bid.playerId)); if (t) { s = t; seededBids += 1; } }
  s = playOn(B, s, seed + 10, 40);
  raws.push(saveOf(B, s));
  s = playOn(B, s, seed + 20, 220);
  s = tape(seed + 30, () => B.cm.finishSeason(s).state);
  s = tape(seed + 31, () => B.cm.startNextSeason(s));
  raws.push(saveOf(B, s));
  for (const [i, raw] of raws.entries()) {
    seededSaves += 1;
    const h = await open(HEADF, raw), b = await open(BASEF, raw);
    if (JSON.stringify(h.M.cm.buildMarket(h.s)) !== JSON.stringify(b.M.cm.buildMarket(b.s))) fail(`seeded ${club} ${era} seed ${seed.toString(16)} save ${i}: the market differs`);
    const nh = playOn(h.M, h.s, seed + 40 + i, 30), nb = playOn(b.M, b.s, seed + 40 + i, 30);
    if (saveOf(h.M, nh) !== saveOf(b.M, nb)) fail(`seeded ${club} ${era} seed ${seed.toString(16)} save ${i}: 30 entries on, the saved bytes differ`);
    if (JSON.stringify(h.M.cm.buildMarket(nh)) !== JSON.stringify(b.M.cm.buildMarket(nb))) fail(`seeded ${club} ${era} seed ${seed.toString(16)} save ${i}: 30 entries on, the market differs`);
  }
}
note(`T1 seeded: ${seededSaves} base made saves (${seededBuys} buys, ${seededBids} accepted bids), market and 30 entries compared, ${Math.round((Date.now() - t1) / 1000)}s`);

/* T2: unseeded saves (the fixture, the committed old saves, Hot Seat handovers made on BASE), opened on both. */
const t2 = Date.now();
const FX = JSON.parse(fs.readFileSync(path.join(ROOT, 'scripts/data/cmPreAzMarketFixture.json'), 'utf8'));
const unseeded = Object.entries(FX.saves).map(([k, raw]) => ({ name: `fixture ${k}`, raw }));
for (const f of ['cmOldSave1052Fixture', 'cmSecondTierOldSaveFixture', 'cmBookSaveEvertonFixture', 'cmBookSaveHerthaFixture']) unseeded.push({ name: f, raw: fs.readFileSync(path.join(ROOT, `scripts/data/${f}.json`), 'utf8') });
for (const date of ['2026-10-10', '2026-10-21', '2026-11-03', '2026-12-01', '2027-01-15', '2027-02-02']) {
  const B = await BASEF();
  try {
    const setup = B.hs.dailyHotSeat(date);
    let run = tape(0x4a, () => B.hs.startHotSeat({ club: setup.club, seed: setup.seed, daily: date }));
    run = tape(0x4b, () => { let r = run; for (let g = 0; !r.verdict && g < 60; g += 1) r = B.hs.pendingPress(r) ? B.hs.answerHotSeatPress(r, 0) : B.hs.playHotSeatMatch(r, 'balanced', null); return r; });
    if (!run.verdict) { note(`hot seat ${date}: no verdict in 60 steps`); continue; }
    unseeded.push({ name: `hot seat ${date} (${setup.club})`, raw: saveOf(B, B.hs.handoverState(run)) });
  } catch (e) { note(`hot seat ${date}: ${e.message.slice(0, 100)}`); }
}
let removedTotal = 0, diffAfter = 0;
for (const u of unseeded) {
  const h = await open(HEADF, u.raw), b = await open(BASEF, u.raw);
  if (!h.s || !b.s) { fail(`${u.name}: an arm would not open it`); continue; }
  const club = h.s.clubName;
  const mh = h.M.cm.buildMarket(h.s), mb = b.M.cm.buildMarket(b.s);
  const ownH = mh.filter(m => m.club === club).length, ownB = mb.filter(m => m.club === club);
  if (ownH) fail(`${u.name}: the head lists ${ownH} men at ${club}`);
  if (JSON.stringify(mb.filter(m => m.club !== club)) !== JSON.stringify(mh)) fail(`${u.name}: the head's market is not the base's minus ${club}'s rows`);
  removedTotal += ownB.length;
  const in120 = mb.slice(0, 120).filter(m => m.club === club).length;
  const nh = playOn(h.M, h.s, 0x77, 30), nb = playOn(b.M, b.s, 0x77, 30);
  const same = saveOf(h.M, nh) === saveOf(b.M, nb);
  if (!same) diffAfter += 1;
  const after = h.M.cm.buildMarket(nh).filter(m => m.club === nh.clubName).length;
  if (after) fail(`${u.name}: 30 entries on, the head lists ${after} men at ${nh.clubName}`);
  const squad = new Set(nh.squad.map(p => p.name)), before = new Set(h.s.squad.map(p => p.name));
  const badFeed = (nh.transferLog ?? []).slice((h.s.transferLog ?? []).length).filter(t => t.from === club && !before.has(t.name) && !squad.has(t.name));
  if (badFeed.length) fail(`${u.name}: the head's feed signed ${badFeed.length} men from ${club} who were never in the squad (${badFeed[0].name})`);
  note(`${u.name} (${club}, season ${h.s.season}, seed ${h.s.worldSeed === undefined ? 'none' : 'yes'}): base lists ${ownB.length} at own club (${in120} in first 120${ownB.length ? `, best index ${mb.findIndex(m => m.club === club)}` : ''}), head 0; 30 entries on: ${same ? 'equal' : 'DIFFERENT (by design when a draw met one of them)'}`);
}
note(`T2 unseeded: ${unseeded.length} saves, ${removedTotal} own club rows removed, ${diffAfter} played differently in 30 entries, ${Math.round((Date.now() - t2) / 1000)}s`);

/* T3: an old career's job move (joinClubNow) from Real Madrid, on both arms. */
const MOVES = [];
for (const k of ['A', 'B']) for (const to of ['Barcelona', 'Manchester City', 'Bayern Munich']) MOVES.push([k, FX.saves[k], to]);
for (const f of ['cmOldSave1052Fixture', 'cmBookSaveEvertonFixture']) for (const to of ['Real Madrid', 'Orenburg']) MOVES.push([f, fs.readFileSync(path.join(ROOT, `scripts/data/${f}.json`), 'utf8'), to]);
for (const [k, raw, to] of MOVES) {
  const h = await open(HEADF, raw), b = await open(BASEF, raw);
  const from = h.s.clubName;
  const prep = s => ({ ...s, jobHunt: { open: { club: to, league: '', tier: 1, season: s.season, week: s.week, matchesLeft: 0, roll: 0, status: 'accepted' }, cooldowns: [], sentSeason: s.season, sent: 1, summerMove: null } });
  let jh, jb;
  try { jh = tape(0x88, () => h.M.cal.joinClubNow(prep(h.s))); jb = tape(0x88, () => b.M.cal.joinClubNow(prep(b.s))); } catch (e) { note(`job move ${k} to ${to}: threw ${e.message.slice(0, 100)}`); continue; }
  if (!jh || !jb) { note(`job move ${k} to ${to}: refused (head ${!!jh}, base ${!!jb})`); continue; }
  const mh = h.M.cm.buildMarket(jh), mb = b.M.cm.buildMarket(jb);
  const at = (m, c) => m.filter(x => x.club === c).length;
  if (at(mh, to)) fail(`job move ${k} ${from} to ${to}: the head lists ${at(mh, to)} men at the new club`);
  if (!at(mh, from)) fail(`job move ${k} ${from} to ${to}: the head lists nobody at the club he left`);
  const squad = new Set(jh.squad.map(p => p.name));
  const feedH = (jh.transferLog ?? []).filter(t => t.from === to && !squad.has(t.name)).length, feedB = (jb.transferLog ?? []).filter(t => t.from === to && !new Set(jb.squad.map(p => p.name)).has(t.name)).length;
  note(`job move ${k} ${from} to ${to}: seed ${jh.worldSeed === undefined ? 'none' : 'yes'}; rows at the new club head ${at(mh, to)} base ${at(mb, to)} (best base index ${mb.findIndex(x => x.club === to)}); rows at ${from} head ${at(mh, from)} base ${at(mb, from)}; feed lines from ${to} for a non squad man head ${feedH} base ${feedB}; asks equal ${JSON.stringify(jh.boardObjectives) === JSON.stringify(jb.boardObjectives)}`);
}
/* T4 (MEASURED, PROBE_T4=1): what else an old career shows differently at its next summer, beyond the market rows:
   the board's asks, the feed's AI signings, and which other men have left the market. */
if (process.env.PROBE_T4 === '1') {
  const t4 = Date.now();
  const list = [['fixture A', FX.saves.A], ['fixture B', FX.saves.B]];
  for (const f of ['cmOldSave1052Fixture', 'cmSecondTierOldSaveFixture', 'cmBookSaveEvertonFixture', 'cmBookSaveHerthaFixture']) list.push([f, fs.readFileSync(path.join(ROOT, `scripts/data/${f}.json`), 'utf8')]);
  for (const [name, raw] of list) for (const seed of [0x51, 0x52]) {
    const arms = [];
    for (const F of [HEADF, BASEF]) {
      const { M, s: s0 } = await open(F, raw);
      let s = playOn(M, s0, seed, 400);
      s = tape(seed + 1, () => M.cm.finishSeason(s).state);
      s = tape(seed + 2, () => M.cm.startNextSeason(s));
      const asks = (s.boardObjectives ?? []).map(o => JSON.stringify(o));
      arms.push({ s, asks, heads: s.aiHeadlines ?? [], gone: s.goneNames ?? [], market: M.cm.buildMarket(s) });
    }
    const [h, b] = arms;
    const askDiff = h.asks.filter(a => !b.asks.includes(a)).length + b.asks.filter(a => !h.asks.includes(a)).length;
    const club = h.s.clubName;
    const otherH = h.market.map(m => m.name), otherB = b.market.filter(m => m.club !== club).map(m => m.name);
    const notOnH = otherB.filter(n => !otherH.includes(n)).length, notOnB = otherH.filter(n => !otherB.includes(n)).length;
    note(`T4 ${name} seed ${seed}: next summer season ${h.s.season}; board asks differ ${askDiff} (head ${h.asks.length}, base ${b.asks.length})${askDiff ? `: head ${h.asks.find(a => !b.asks.includes(a))?.slice(0, 160)} | base ${b.asks.find(a => !h.asks.includes(a))?.slice(0, 160)}` : ''}; AI headlines equal ${JSON.stringify(h.heads) === JSON.stringify(b.heads)}; rival rows on base not on head ${notOnH}, on head not on base ${notOnB}`);
  }
  note(`T4: ${Math.round((Date.now() - t4) / 1000)}s`);
}
console.log(fails.length ? `oldsave1339: ${fails.length} FAILURE(S)` : 'oldsave1339: green');
process.exit(fails.length ? 1 : 0);

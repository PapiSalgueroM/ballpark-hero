/* Release AZ, the lead's ruling Y1: a Club Manager save with no world seed plays exactly as it did.
 *
 * WHY. Round 1250 (the other lane's PR224, merge e of Release AZ) keeps the men a manager buys, sells or releases
 * where they went, in a ledger on the save, and gives every NEW career a world seed. The ledger was written for
 * every career, seeded or not, and a readable ledger alone turns on the same branches the seed does (every rival
 * roster and the market through the ledger, the club strengths drawn at a rollover, the rating ceiling of my own
 * squad). So a save from before the release kept its world only until its first deal. The ruling: a career with
 * no seed never writes a ledger (one guard at the top of recordActualRosterTransfer in src/lib/clubManager.ts).
 *
 * WHAT IT HOLDS, against the source of the first parent of merge e (BASE below, Release AX as published), with
 * both engines handed the same save bytes and the same random stream, and every step compared on the whole state,
 * the number and values of the draws it took, and the bytes a save writes:
 *   (a) quiet: old saves with no deal, played into the season, saved and reloaded, played to its end, finished
 *       (the summer before a rollover), saved and reloaded;
 *   (b) deals: old saves with every deal the recorder sees, each followed by a save and a reload: a release, a
 *       buy, a part exchange (the swap), a sale through acceptBid, a loan with its option exercised, then the
 *       season played out, the rollover (its exits and its loan returns), and the next season begun;
 *   on every era, three clubs an era (two picked from the era's first two leagues, and the club with the
 *   thinnest projected roster of the era), three seeds a club; plus the committed save of Round 1052
 *   (scripts/data/cmOldSave1052Fixture.json) and three Manager Hot Seat days handed over to Club Manager by the
 *   base engine, each through both plans;
 *   (c) fresh, the inverse: new careers started by both engines with scripts/lib/cmWorldSeed1250.mjs composed
 *       into this tree's engine (the seed block of startCareer out), through plan (b), byte equal to BASE.
 *
 *
 * ROUND 1508 (the lead's decision 3 of brief 1508, from Round 1344's ruling 5): a career with no seed now joins the
 * living world at its first summer on this engine (adoptLivingWorld, first thing in startNextSeason: an empty ledger
 * and still no seed). So an old save stays byte equal to BASE up to that summer, and only up to it: from the
 * rollover on, this tree's journey is held to the ledger branch's invariants instead of to BASE:
 *   adopted  a readable ledger and no seed, at every step from the rollover on (a save and a reload included);
 *   moved    every deal of this season between two other clubs is placed: exactly one owned record at the buyer,
 *            his key listed at the buyer and at no other club, and no other club still listing a man of his origin;
 *   market   the market (buildMarket and the screen's marketForScreen) lists nobody at my own club, and the screen
 *            never lists a moved man at the club that sold him;
 *   mine     the deal plan goes on after the rollover with deals of mine (a release, a buy, a sale through
 *            acceptBid, each saved and reloaded): each leaves exactly one ledger record with its owner and status, a
 *            man I bought is listed at no club of the world, and a man I sold is one no AI club can take (aiDealPlayer
 *            answers null, Round 1344's ruling 3).
 * The fresh section's inverse (scripts/lib/cmWorldSeed1250.mjs) cuts the adoption line too, so there a new career
 * made unseeded still plays byte equal to BASE all the way, the new deals of mine included.
 *
 * CONTROLS, each must go red where it says and nowhere else (exit 1, last line says FIRED):
 *   CM_UNSEEDED_CONTROL=guard      takes the guard out: the deal fleet (b) goes red, the quiet fleet (a) stays
 *                                  green (the fresh section is not run)
 *   CM_UNSEEDED_CONTROL=noinverse  runs only the fresh section, without the inverse: it goes red
 *   CM_UNSEEDED_CONTROL=early      (Round 1508) adopts one summer early, as the save opens: the comparison with BASE
 *                                  before the summer goes red (quiet and deals; the fresh section is not run)
 *   CM_UNSEEDED_CONTROL=never      (Round 1508) never adopts (startNextSeason's line out): the moved check goes red
 *                                  after the rollover while the comparison before it stays green (deals only)
 * CM_UNSEEDED_FLEET=quick plays one seed a club and no fixtures (for trying it out; never a gate line).
 * Exit 0 green, 1 red or a control that fired, 2 could not run, 3 a control that did not fire.
 *
 *   node scripts/simCmUnseededWorld.mjs
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';
import { withoutWorldSeed } from './lib/cmWorldSeed1250.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
/* The first parent of merge e of Release AZ: Release AX as published (origin/main b6eb78e7).
   Release BC's join: on a head where main has moved past Release AX (Round 1311 since Release BB, and every Club
   Manager round after it), that base differs from this tree by more than AZ (rBCg-m1a read 98 failures, all 1311's
   awards; against Release BB the final head read 110, all Round 1326's words), so the gate hands the harness this
   tree with only AZ's merge taken out: CM_UNSEEDED_BASE=$(node scripts/lib/treeWithoutMerge.mjs 5ec5a724 36cc9ffe)
   (5ec5a724 is the merge that brought AZ onto Release BB, 36cc9ffe its first parent). Unset, the base is b6eb78e7. */
const BASE = process.env.CM_UNSEEDED_BASE || 'b6eb78e799b12c851e4e8e583e9e926aed117f1c';
const ENGINE = 'src/lib/clubManager.ts';
const GUARD = '  if (!livingWorldOf(state)) return state;\n';
/* Round 1508: the adoption, and where the early control puts a second one (the load, before the first summer). */
const ADOPT = '  career = adoptLivingWorld(career);\n';
const LOAD_REPAIR = '    repairAiMoves(parsed);\n';
const CONTROL = process.env.CM_UNSEEDED_CONTROL || '';
const QUICK = process.env.CM_UNSEEDED_FLEET === 'quick';
const cannot = why => { console.log(`simCmUnseededWorld: cannot run: ${why}`); process.exit(2); };
if (CONTROL && !['guard', 'noinverse', 'early', 'never'].includes(CONTROL)) cannot(`unknown control ${CONTROL}`);
/** One anchor that must stand exactly once in the engine, replaced (a control's edit fails closed). */
const once = (name, from, to) => text => {
  const n = text.split(from).length - 1;
  if (n !== 1) cannot(`control ${name}: its anchor is in ${ENGINE} ${n} times, it must be exactly once: ${from.trim()}`);
  return text.replace(from, () => to);
};
try { execFileSync('git', ['cat-file', '-e', `${BASE}^{commit}`], { cwd: ROOT, stdio: 'ignore' }); } catch { cannot(`the base commit ${BASE.slice(0, 8)} is not in this clone (fetch its history)`); }

const sha = v => createHash('sha256').update(typeof v === 'string' ? v : JSON.stringify(v)).digest('hex').slice(0, 16);
const lf = s => s.split('\r\n').join('\n');
const clone = v => JSON.parse(JSON.stringify(v));

/* One engine, bundled once and run in a fresh context per journey (module state such as registered league
   memberships must not leak from one save into the next). `edit` changes this tree's clubManager.ts. */
async function engine(label, { base = false, edit = null } = {}) {
  let edited = false;
  const plugin = {
    name: 'unseeded-source',
    setup(b) {
      b.onLoad({ filter: /\.(ts|tsx|json)$/ }, args => {
        const rel = path.relative(ROOT, args.path).split(path.sep).join('/');
        if (!rel.startsWith('src/')) return null;
        let text = base
          ? lf(execFileSync('git', ['show', `${BASE}:${rel}`], { cwd: ROOT, encoding: 'utf8', maxBuffer: 1 << 26 }))
          : lf(fs.readFileSync(args.path, 'utf8'));
        if (edit && rel === ENGINE) { text = edit(text); edited = true; }
        return { contents: text, loader: path.extname(args.path).slice(1), resolveDir: path.dirname(args.path) };
      });
    },
  };
  /* Round 1508: this tree's arms also hand back the ledger's reader, for the checks after the adoption (BASE, from
     before Release AZ, has no such file). */
  const entry = "export * as cm from './src/lib/clubManager';\nexport * as eras from './src/lib/clubManagerEras';\nexport * as hs from './src/lib/managerHotSeat';\n"
    + (base ? '' : "export * as ledger from './src/lib/clubManagerWorldRoster';\n");
  const out = await build({ stdin: { contents: entry, resolveDir: ROOT, sourcefile: `unseeded-${label}.ts`, loader: 'ts' },
    bundle: true, write: false, format: 'cjs', platform: 'node', target: 'node20', plugins: [plugin], logLevel: 'silent' });
  if (edit && !edited) cannot(`the ${label} engine was to be edited and ${ENGINE} was never loaded`);
  const script = new vm.Script(out.outputFiles[0].text, { filename: `unseeded-${label}.cjs` });
  return {
    label,
    async fresh() {
      const module = { exports: {} };
      const store = new Map();
      const NOW = 1791633600000;
      class HeldDate extends Date {
        constructor(...a) { super(...(a.length ? a : [NOW])); }
        static now() { return NOW; }
      }
      const ctx = vm.createContext({ module, exports: module.exports, require: createRequire(path.join(ROOT, 'package.json')),
        console, process, Buffer, Math, Date: HeldDate, URL, URLSearchParams, TextEncoder, TextDecoder, structuredClone,
        setTimeout, clearTimeout, setInterval, clearInterval, fetch: () => Promise.reject(new Error('no network here')),
        localStorage: { getItem: k => store.get(k) ?? null, setItem: (k, v) => store.set(k, String(v)), removeItem: k => store.delete(k), clear: () => store.clear() } });
      script.runInContext(ctx);
      await module.exports.eras.ensureAllEraRosters();
      return { ...module.exports, store };
    },
  };
}

/* The random stream: a counter generator, the same on both engines, every draw kept. */
function tape(seed, action) {
  let state = seed >>> 0; const draws = [];
  const original = Math.random;
  Math.random = () => {
    state = (state + 0x6d2b79f5) >>> 0; let v = state;
    v = Math.imul(v ^ v >>> 15, v | 1); v ^= v + Math.imul(v ^ v >>> 7, v | 61);
    const d = ((v ^ v >>> 14) >>> 0) / 4294967296; draws.push(d); return d;
  };
  try { return { value: action(), draws }; } finally { Math.random = original; }
}

/* Where two states first part: the first top level key whose value differs, and forty characters either side of
   the first character that differs in it. */
function firstDifference(a, b) {
  const A = JSON.parse(a), B = JSON.parse(b);
  for (const key of [...new Set([...Object.keys(A), ...Object.keys(B)])]) {
    const x = JSON.stringify(A[key]) ?? 'absent', y = JSON.stringify(B[key]) ?? 'absent';
    if (x === y) continue;
    let i = 0; while (i < x.length && x[i] === y[i]) i += 1;
    return `${key}: base ...${x.slice(Math.max(0, i - 40), i + 40)}... this tree ...${y.slice(Math.max(0, i - 40), i + 40)}...`;
  }
  return 'the key order differs';
}

/* ---------- Round 1508: the ledger branch's invariants, held on this tree's journey from the rollover on ---------- */
/** A deal between two other clubs (PR269's rule, as scripts/simCmWorldMoves.mjs reads it). */
const aiLine = mine => line => !!line && typeof line.name === 'string' && !line.loan && line.from !== mine && line.to !== mine
  && line.from !== 'a free transfer' && line.to !== 'a free transfer';
/** Every club of the career's world but mine, and every club the ledger names as an owner. */
function worldClubs(M, s) {
  const era = s.eraId ?? 'now';
  const names = M.eras.isHistoricEra(era)
    ? M.cm.eraLeaguesFor(era).flatMap(l => l.clubs)
    : M.cm.REAL_LEAGUES.flatMap(l => M.cm.playableClubs(l.id).map(c => c.name));
  const out = new Set(names);
  for (const record of M.ledger.readWorldRoster(s)?.records ?? []) if (record.owner) out.add(record.owner);
  out.delete(s.clubName);
  return [...out];
}
const newLiving = () => ({ states: 0, lines: 0, records: 0, joined: 0, mine: { release: 0, buy: 0, sale: 0 }, counts: {}, fails: [] });
/** One state of an adopted career, held to the invariants above. `deal` is the deal of mine the step made, if any. */
function livingCheck(M, s, label, note, deal, lv) {
  const bad = (check, line) => { lv.counts[check] = (lv.counts[check] ?? 0) + 1; lv.fails.push(`[${check}] at ${label}: ${line}`); };
  lv.states += 1;
  if (note === 'the save was refused' || note === 'the reload was refused') bad('adopted', note);
  const held = M.ledger.readWorldRoster(s);
  if (M.cm.worldSeedOf(s) !== undefined) bad('adopted', 'the career carries a world seed');
  if (!held) bad('adopted', 'the career holds no readable ledger');
  const records = held?.records ?? [], year = M.cm.worldYear(s), mine = s.clubName;
  const at = new Map(), origin = new Map();
  const add = (map, key, club) => { const list = map.get(key); if (list) list.push(club); else map.set(key, [club]); };
  for (const club of worldClubs(M, s)) {
    for (const p of M.cm.worldRosterFor(s, club)) {
      if (p.worldRosterKey) add(at, p.worldRosterKey, club);
      add(origin, `${p.n}|${year - p.a}|${p.p}`, club);
    }
  }
  /* moved: every deal of this season between two other clubs has its man owned at the buyer */
  const lines = (s.transferLog ?? []).filter(l => l && l.season === s.season).filter(aiLine(mine));
  for (const line of lines) {
    lv.lines += 1;
    const recs = records.filter(r => r.status === 'owned' && r.owner === line.to && r.player.name === line.name);
    if (recs.length !== 1) bad('moved', `${line.name} (${line.from} to ${line.to}): ${recs.length ? `${recs.length} owned records at the buyer` : `the ledger holds no record of him at ${line.to}`}`);
  }
  /* every owned record at its owner and nowhere else (mine: at no club of the world) */
  for (const r of records) {
    if (r.status !== 'owned') continue;
    lv.records += 1;
    const check = r.owner === mine ? 'mine' : 'moved';
    const where = at.get(r.key) ?? [];
    const want = r.owner === mine ? [] : [r.owner];
    if (where.length !== want.length || where.some(c => !want.includes(c))) bad(check, `${r.player.name}, owned by ${r.owner}, is listed at ${where.join(' and ') || 'no club'}`);
    const twins = (origin.get(`${r.origin.name}|${r.origin.birthYear}|${r.origin.position}`) ?? []).filter(c => c !== r.owner);
    if (twins.length) bad(check, `a man of ${r.player.name}'s origin (${r.origin.club}, born ${r.origin.birthYear}) is still listed at ${twins.join(' and ')}`);
  }
  /* market: nobody at my own club; a moved man never on the screen at the club that sold him */
  const market = M.cm.buildMarket(s), screen = M.cm.marketForScreen(s);
  const ownRows = market.filter(p => p.club === mine).length + screen.filter(p => p.club === mine).length;
  if (ownRows) bad('market', `${ownRows} rows of the market list a man at my own club ${mine}`);
  const atSeller = new Set(lines.map(l => `${l.name}|${l.from}`));
  for (const p of screen) {
    if (atSeller.has(`${p.name}|${p.club}`)) bad('market', `the screen lists ${p.name} at ${p.club}, the club that sold him this season`);
    if (p.joinedThisSeason) lv.joined += 1;
  }
  /* mine: no man of my squad is listed at any club of the world (the adoption records the men I signed before it),
     and a man of my squad who carries a ledger key is owned by me there */
  for (const p of s.squad) {
    if (p.onLoan || p.academyGrad || p.isYouth) continue;
    const keyed = p.worldRosterKey ? records.find(r => r.key === p.worldRosterKey) : null;
    if (keyed && (keyed.owner !== mine || keyed.status !== 'owned')) bad('mine', `${p.name} of my squad carries the key of a record ${keyed.status} by ${keyed.owner ?? 'nobody'} (from ${keyed.origin.club})`);
    const clubs = origin.get(`${p.name}|${year - p.age}|${p.position}`) ?? [];
    if (clubs.length) bad('mine', `${p.name} of my squad is also listed at ${clubs.join(' and ')}`);
  }
  /* mine: the deal this step made left exactly one record, and a man I sold is one no AI club can take */
  if (deal) {
    lv.mine[deal.kind] += 1;
    const recs = records.filter(r => r.player.name === deal.name && r.status === deal.status && r.owner === deal.owner);
    const named = records.filter(r => r.player.name === deal.name || r.origin.name === deal.name).map(r => `${r.status} ${r.owner ?? 'nobody'} from ${r.origin.club}`);
    if (recs.length !== 1) bad('mine', `my ${deal.kind} of ${deal.name} (${deal.why ?? ''}) left ${recs.length} ledger records (${deal.status}, owner ${deal.owner}); records naming him: ${named.join(', ') || 'none'}`);
    if (deal.kind === 'sale' && recs.length === 1) {
      const listed = M.cm.worldRosterFor(s, deal.owner).find(p => p.worldRosterKey === recs[0].key);
      if (!listed) bad('mine', `${deal.name}, sold to ${deal.owner}, is not listed there`);
      else if (M.cm.aiDealPlayer(s, { name: listed.n, club: deal.owner, position: listed.p, age: listed.a, rating: listed.r, price: 1, value: listed.v,
        worldRosterKey: listed.worldRosterKey, worldRosterSince: listed.since, potential: listed.potential }) !== null) bad('mine', `an AI club could take ${deal.name}, a man I sold to ${deal.owner}`);
    }
  }
}

/* One journey of one save through one plan on one engine. Every step draws from its own stretch of the stream.
   Round 1331, the bridge for a kit pinned to an old engine: since that round a match plays its league and season's
   substitution rule and the press at the whistle reads the next fixture, which the pinned base does not know. This
   tree's journeys (bridge) hand every step but a save the career with matchRules 'base', which is the old engine
   for subs and press by construction (scripts/simCmSubs.mjs section legacy proves it byte for byte), and take the
   key off every state before it is compared or saved. */
async function journey(E, input, plan, seed, bridge = false, living = null) {
  const M = await E.fresh();
  const steps = [];
  let s = null; let k = 0;
  /* Round 1508: from the rollover on (the first summer on this engine) a step is `after` the adoption. */
  let after = false;
  const step = (label, fn) => {
    k += 1;
    const r = tape((seed + k * 7919) >>> 0, () => fn(bridge && s && label !== 'save-and-reload' ? { ...s, matchRules: 'base' } : s));
    const got = r.value ?? {};
    if (bridge && got.state && 'matchRules' in got.state) { got.state = { ...got.state }; delete got.state.matchRules; }
    if (got.state) s = got.state;
    if (label === 'rollover') after = true;
    steps.push({ label, note: got.note ?? '', json: JSON.stringify(s), draws: r.draws.length, drawSha: sha(r.draws), saved: got.saved ?? null, after });
    if (living && after) livingCheck(M, s, label, got.note ?? '', got.deal ?? null, living);
  };
  const reload = () => step('save-and-reload', cur => {
    M.store.clear();
    if (!M.cm.saveCareer(cur)) return { note: 'the save was refused' };
    const saved = sha([...M.store.entries()].sort());
    const loaded = M.cm.loadCareer();
    return { state: loaded, saved, note: loaded ? '' : 'the reload was refused' };
  });
  const play = (n, label) => { for (let i = 0; i < n; i += 1) step(`${label}-${i + 1}`, cur => ({ state: M.cm.playNextEntry(cur, { skipHalftime: true, noCoach: true }).state })); };
  const toEnd = label => {
    for (let i = 0; i < 220; i += 1) {
      let over = false;
      step(`${label}-${i + 1}`, cur => { const r = M.cm.playNextEntry(cur, { skipHalftime: true, noCoach: true }); over = r.kind === 'seasonOver'; return { state: r.state }; });
      if (over) return;
    }
    throw new Error('a season did not end in 220 entries');
  };
  if (input.start) step('start', () => ({ state: M.cm.startCareer(input.start[0], input.start[1]) }));
  else step('load', () => { M.store.clear(); M.store.set(M.cm.SAVE_KEY, input.raw); return { state: M.cm.loadCareer() }; });
  if (!s) throw new Error(`${input.name}: the save did not open`);
  if (plan === 'quiet') {
    play(8, 'early'); reload(); toEnd('rest');
    step('finish', cur => ({ state: M.cm.finishSeason(cur).state })); reload();
    return steps;
  }
  const outfield = cur => cur.squad.filter(p => !p.onLoan && p.position !== 'GK');
  const names = cur => new Set(cur.squad.map(p => p.name));
  step('open-window', cur => ({ state: { ...cur, budget: 9999, wageCap: 9999, transferWindow: 'summer' } }));
  step('release', cur => {
    const man = [...outfield(cur)].sort((a, b) => a.rating - b.rating || a.id.localeCompare(b.id))[0];
    const next = man && M.cm.releasePlayer(cur, man.id);
    return next ? { state: next, note: 'done' } : { note: 'refused' };
  });
  reload();
  step('buy', cur => {
    const mine = names(cur);
    const mp = M.cm.buildMarket(cur).find(p => p.position !== 'GK' && p.age < 29 && p.rating < 80 && !mine.has(p.name));
    const next = mp && M.cm.buyPlayer(cur, mp);
    return next ? { state: next, note: 'done' } : { note: 'refused' };
  });
  reload();
  step('swap', cur => {
    const mine = names(cur);
    const mp = M.cm.buildMarket(cur).filter(p => p.position !== 'GK' && p.age < 30 && !mine.has(p.name))[3];
    const open = mp && M.cm.startNegotiation(cur, mp);
    if (!open?.negotiation) return { note: 'refused' };
    const man = [...outfield(open)].sort((a, b) => b.rating - a.rating || a.id.localeCompare(b.id))[3];
    const cash = Math.max(0.1, Math.round((open.negotiation.theirAsk - M.cm.sellValue(man) * 0.85) * 10) / 10);
    const offered = M.cm.makeOffer(open, cash, { swapId: man.id });
    if (offered?.negotiation?.phase !== 'terms' || !offered.negotiation.terms) return { note: 'refused' };
    const settled = M.cm.offerTerms(offered, offered.negotiation.terms.want);
    const done = settled?.negotiation?.status === 'agreed' && !settled.squad.some(p => p.id === man.id);
    return done ? { state: settled, note: 'done' } : { note: 'refused' };
  });
  reload();
  step('sale', cur => {
    const man = [...outfield(cur)].sort((a, b) => b.rating - a.rating || a.id.localeCompare(b.id))[1];
    const buyer = M.cm.buildMarket(cur).find(p => p.club !== cur.clubName)?.club;
    if (!man || !buyer) return { note: 'refused' };
    const bid = { playerId: man.id, playerName: man.name, club: buyer, offer: 30, status: 'open' };
    const next = M.cm.acceptBid({ ...cur, incomingBids: [...(cur.incomingBids ?? []), bid] }, man.id);
    return next ? { state: next, note: 'done' } : { note: 'refused' };
  });
  reload();
  step('loan-option', cur => {
    const mine = names(cur);
    const mp = M.cm.buildMarket(cur).find(p => p.age <= 23 && p.rating <= 84 && (p.value ?? p.price) <= 25 && p.position !== 'GK' && !mine.has(p.name));
    const loaned = mp && M.cm.loanIn(cur, mp);
    const man = loaned && loaned.squad.find(p => p.name === mp.name);
    const bought = man && M.cm.exerciseLoanOption(loaned, man.id);
    return bought ? { state: bought, note: 'done' } : loaned ? { state: loaned, note: 'loan only' } : { note: 'refused' };
  });
  reload();
  play(6, 'with-deals'); toEnd('rest');
  step('finish', cur => ({ state: M.cm.finishSeason(cur).state }));
  step('rollover', cur => ({ state: M.cm.startNextSeason(cur) }));
  reload();
  /* Round 1508: deals of mine after the first summer, each saved and reloaded: on this tree the adopted career's
     ledger takes them (the mine check); in the fresh section (the inverse) they are compared with BASE like the rest. */
  step('open-window-2', cur => ({ state: { ...cur, budget: 9999, wageCap: 9999, transferWindow: 'summer' } }));
  step('release-2', cur => {
    const man = [...outfield(cur)].sort((a, b) => a.rating - b.rating || a.id.localeCompare(b.id))[0];
    const next = man && M.cm.releasePlayer(cur, man.id);
    return next ? { state: next, note: 'done', deal: { kind: 'release', name: man.name, owner: null, status: 'released', why: `key ${man.worldRosterKey ? 'yes' : 'no'}, age ${man.age}, ${man.position}` } } : { note: 'refused' };
  });
  reload();
  step('buy-2', cur => {
    const mine = names(cur);
    const mp = M.cm.buildMarket(cur).find(p => p.position !== 'GK' && p.age < 29 && p.rating < 80 && !mine.has(p.name));
    const next = mp && M.cm.buyPlayer(cur, mp);
    return next ? { state: next, note: 'done', deal: { kind: 'buy', name: mp.name, owner: cur.clubName, status: 'owned', why: `from ${mp.club}, age ${mp.age}, ${mp.position}` } } : { note: 'refused' };
  });
  reload();
  step('sale-2', cur => {
    const man = [...outfield(cur)].sort((a, b) => b.rating - a.rating || a.id.localeCompare(b.id))[1];
    const buyer = M.cm.buildMarket(cur).find(p => p.club !== cur.clubName)?.club;
    if (!man || !buyer) return { note: 'refused' };
    const bid = { playerId: man.id, playerName: man.name, club: buyer, offer: 30, status: 'open' };
    /* The summer's own bids for him come off first: acceptBid takes the first bid for the man, and the sale is to
       be to `buyer` (r1508-s3 read eight of them as deals of mine with no record: they had gone to the earlier bid). */
    const next = M.cm.acceptBid({ ...cur, incomingBids: [...(cur.incomingBids ?? []).filter(b => b.playerId !== man.id), bid] }, man.id);
    return next ? { state: next, note: 'done', deal: { kind: 'sale', name: man.name, owner: buyer, status: 'owned', why: `key ${man.worldRosterKey ? 'yes' : 'no'}, age ${man.age}, ${man.position}` } } : { note: 'refused' };
  });
  reload();
  play(4, 'next-season'); reload();
  return steps;
}

/* Two journeys of one save, base and this tree, compared step by step. Round 1508: with `adopts`, only the steps
   before the rollover are compared (the first summer on this engine adopts the career), and this tree's steps from
   the rollover on are held to the invariants instead (acc.living). */
async function pair(sectionName, A, B, input, plan, seed, acc, adopts = false) {
  let a, b;
  const tag = `${sectionName} ${input.name} (${plan}, seed ${seed})`;
  const lv = adopts ? newLiving() : null;
  try { a = await journey(A, input, plan, seed); } catch (e) { cannot(`${input.name} (${plan}) on the base engine: ${e.message}`); }
  try { b = await journey(B, input, plan, seed, true, lv); } catch (e) { b = null; acc.fails.push(`${tag}: this tree threw: ${e.message}`); }
  acc.journeys += 1;
  for (const x of a) if (x.note) acc.notes[`${x.label} ${x.note}`] = (acc.notes[`${x.label} ${x.note}`] ?? 0) + 1;
  if (!b) return;
  if (lv) {
    const L = acc.living;
    L.journeys += 1; L.states += lv.states; L.lines += lv.lines; L.records += lv.records; L.joined += lv.joined;
    for (const kind of Object.keys(lv.mine)) L.mine[kind] += lv.mine[kind];
    for (const [check, n] of Object.entries(lv.counts)) L.counts[check] = (L.counts[check] ?? 0) + n;
    if (lv.fails.length) L.fails.push(`${tag}: ${lv.fails.length} red after the rollover, first ${lv.fails[0]}`.slice(0, 600));
  }
  const compared = adopts ? b.filter(y => !y.after).length : Math.max(a.length, b.length);
  acc.steps += compared;
  for (let i = 0; i < compared; i += 1) {
    const x = a[i], y = b[i];
    if (!x || !y || x.label !== y.label || x.after !== y.after) { acc.fails.push(`${tag}: the steps part at ${i} (${x?.label} against ${y?.label})`); return; }
    const why = [];
    if (x.json !== y.json) why.push(`the state differs, ${firstDifference(x.json, y.json)}`);
    if (x.draws !== y.draws || x.drawSha !== y.drawSha) why.push(`the draws differ (${x.draws} against ${y.draws})`);
    if (x.saved !== y.saved) why.push('the saved bytes differ');
    if (x.note !== y.note) why.push(`the step went otherwise (${x.note} against ${y.note})`);
    if (why.length) { acc.fails.push(`${sectionName} ${input.name} (${plan}, seed ${seed}) at step ${i} ${x.label}: ${why.join('; ')}`.slice(0, 600)); return; }
  }
  /* Before the adoption (or all the way, where nothing adopts) the save carries no ledger and no seed. */
  for (const y of b) if ((!adopts || !y.after) && /"worldRoster":|"worldSeed":/.test(y.json)) { acc.fails.push(`${sectionName} ${input.name} (${plan}): this tree's save carries a ledger or a seed at ${y.label}`); return; }
}
const newAcc = () => ({ journeys: 0, steps: 0, fails: [], notes: {},
  living: { journeys: 0, states: 0, lines: 0, records: 0, joined: 0, mine: { release: 0, buy: 0, sale: 0 }, counts: {}, fails: [] } });

const ERAS = ['now', 'era2020', 'era2015', 'era2010', 'era2005'];
const SEEDS = QUICK ? [0x5eed01] : [0x5eed01, 0x5eed02, 0x5eed03];
const HOT_DATES = QUICK ? [] : ['2026-10-10', '2026-10-27', '2027-01-19'];

const baseEngine = await engine('base', { base: true });
const sections = CONTROL === 'noinverse' ? ['fresh'] : CONTROL === 'guard' || CONTROL === 'early' ? ['quiet', 'deals']
  : CONTROL === 'never' ? ['deals'] : ['quiet', 'deals', 'fresh'];
const thisTree = CONTROL === 'guard'
  ? await engine('noguard', { edit: text => { const n = text.split(GUARD).length - 1; if (n !== 1) cannot(`control guard: the guard is in ${ENGINE} ${n} times, it must be exactly once`); return text.replace(GUARD, ''); } })
  : CONTROL === 'early' ? await engine('early', { edit: once('early', LOAD_REPAIR, `${LOAD_REPAIR}    Object.assign(parsed, adoptLivingWorld(parsed));\n`) })
  : CONTROL === 'never' ? await engine('never', { edit: once('never', ADOPT, '') })
  : await engine('tree');
const inverse = CONTROL === 'noinverse' ? await engine('tree') : await engine('inverse', { edit: withoutWorldSeed });

/* The fleet, picked from the base engine's own tables and printed, so a data update that moves a club shows. */
const M0 = await baseEngine.fresh();
const fleet = [];
for (const era of ERAS) {
  const leagues = era === 'now' ? M0.cm.REAL_LEAGUES : M0.cm.ERA_LEAGUES[era];
  if (!leagues?.length) cannot(`the era ${era} has no leagues`);
  const all = [...new Set(leagues.flatMap(l => l.clubs))];
  const size = c => M0.eras.projectedRoster(c, 0, era).length;
  const thin = [...all].sort((x, y) => size(x) - size(y) || x.localeCompare(y))[0];
  const picks = [leagues[0].clubs[3], leagues[1]?.clubs[5] ?? leagues[0].clubs[6], thin];
  console.log(`  ${era}: ${picks[0]}, ${picks[1]}, and the thinnest roster of the era ${thin} (${size(thin)} projected men)`);
  for (const club of picks) for (const seed of SEEDS) fleet.push({ era, club, seed });
}
const oldSaves = [];
for (const f of fleet) {
  const M = await baseEngine.fresh();
  const s = tape(f.seed, () => M.cm.startCareer(f.club, f.era)).value;
  M.store.clear(); assert.ok(M.cm.saveCareer(s));
  oldSaves.push({ name: `${f.club} (${f.era})`, raw: M.store.get(M.cm.SAVE_KEY), seed: f.seed });
}
if (!QUICK) {
  oldSaves.push({ name: 'the committed save of Round 1052 (Sevilla)', raw: fs.readFileSync(path.join(ROOT, 'scripts/data/cmOldSave1052Fixture.json'), 'utf8'), seed: 0x7001 });
  for (const date of HOT_DATES) {
    const M = await baseEngine.fresh();
    const s = tape(0x4807, () => {
      const setup = M.hs.dailyHotSeat(date);
      let run = M.hs.startHotSeat({ club: setup.club, seed: setup.seed, daily: date });
      for (let g = 0; !run.verdict && g < 60; g += 1) run = M.hs.pendingPress(run) ? M.hs.answerHotSeatPress(run, 0) : M.hs.playHotSeatMatch(run, 'balanced', null);
      return M.hs.handoverState(run);
    }).value;
    M.store.clear(); assert.ok(M.cm.saveCareer(s));
    oldSaves.push({ name: `the Hot Seat day of ${date} handed over (${s.clubName})`, raw: M.store.get(M.cm.SAVE_KEY), seed: 0x4807 });
  }
}

const results = {};
for (const section of sections) {
  const acc = newAcc(); results[section] = acc;
  const t0 = Date.now();
  if (section === 'fresh') {
    for (const f of fleet.filter(x => x.seed === SEEDS[0])) await pair(section, baseEngine, inverse, { name: `${f.club} (${f.era}) started fresh`, start: [f.club, f.era] }, 'deals', f.seed, acc);
  } else {
    for (const save of oldSaves) await pair(section, baseEngine, thisTree, save, section, save.seed, acc, section === 'deals');
  }
  console.log(`${section}: ${acc.journeys} saves, ${acc.steps} steps compared${section === 'deals' ? ' (up to the rollover)' : ''}, ${acc.fails.length} red, ${Math.round((Date.now() - t0) / 1000)}s`);
  if (Object.keys(acc.notes).length) console.log(`  deals on the base engine: ${Object.entries(acc.notes).sort().map(([k, v]) => `${k} ${v}`).join(', ')}`);
  for (const f of acc.fails.slice(0, 8)) console.log(`  FAIL ${f}`);
  if (acc.fails.length > 8) console.log(`  ... and ${acc.fails.length - 8} more`);
  const L = acc.living;
  if (L.journeys) {
    console.log(`  after the rollover (Round 1508, this tree only): ${L.journeys} adopted careers, ${L.states} states checked, ${L.lines} deal lines between two other clubs placed, ${L.records} owned records held at one club, ${L.joined} joined rows on the screen; deals of mine: ${L.mine.release} releases, ${L.mine.buy} buys, ${L.mine.sale} sales; red by check: ${JSON.stringify(L.counts)}`);
    for (const f of L.fails.slice(0, 20)) console.log(`  FAIL after the rollover: ${f}`);
    if (L.fails.length > 20) console.log(`  ... and ${L.fails.length - 20} more`);
  }
}

/* The deal fleet must have made every deal the recorder sees at least once, or it proves nothing about them. */
if (results.deals || results.fresh) {
  for (const [name, acc] of Object.entries(results).filter(([n]) => n !== 'quiet')) {
    const missing = ['release done', 'buy done', 'swap done', 'sale done', 'loan-option done'].filter(k => !acc.notes[k]);
    if (missing.length) cannot(`the ${name} fleet never completed: ${missing.join(', ')} (pick other men for that step)`);
  }
}

const red = s => (results[s]?.fails.length ?? 0) > 0;
if (CONTROL === 'guard') {
  const fired = red('deals') && !red('quiet');
  console.log(fired
    ? `simCmUnseededWorld: CONTROL guard FIRED: with the guard out the deal fleet went red (${results.deals.fails.length} saves) and the quiet fleet stayed green`
    : `simCmUnseededWorld: CONTROL guard DID NOT FIRE as it must: deals red ${red('deals')}, quiet red ${red('quiet')}`);
  process.exit(fired ? 1 : 3);
}
if (CONTROL === 'noinverse') {
  console.log(red('fresh')
    ? `simCmUnseededWorld: CONTROL noinverse FIRED: without the inverse the fresh careers differ from the base (${results.fresh.fails.length} of ${results.fresh.journeys})`
    : 'simCmUnseededWorld: CONTROL noinverse DID NOT FIRE: new careers on this tree equal the base without the inverse');
  process.exit(red('fresh') ? 1 : 3);
}
if (CONTROL === 'early') {
  const fired = red('quiet') && red('deals');
  console.log(fired
    ? `simCmUnseededWorld: CONTROL early FIRED: adopted as the save opens, the comparison with BASE before the first summer went red (quiet ${results.quiet.fails.length}, deals ${results.deals.fails.length} saves)`
    : `simCmUnseededWorld: CONTROL early DID NOT FIRE as it must: quiet red ${red('quiet')}, deals red ${red('deals')}`);
  process.exit(fired ? 1 : 3);
}
if (CONTROL === 'never') {
  const moved = results.deals.living.counts.moved ?? 0;
  const fired = moved > 0 && !red('deals');
  console.log(fired
    ? `simCmUnseededWorld: CONTROL never FIRED: never adopted, the moved check went red ${moved} times after the rollover while the comparison before it stayed green`
    : `simCmUnseededWorld: CONTROL never DID NOT FIRE as it must: moved red ${moved}, the comparison before the rollover red ${red('deals')}`);
  process.exit(fired ? 1 : 3);
}
/* Round 1508: the checks after the rollover must have had something to hold. */
const L = results.deals.living;
if (!L.journeys || !L.lines || !L.mine.release || !L.mine.buy || !L.mine.sale) cannot(`after the rollover the deal fleet checked ${L.journeys} careers, ${L.lines} deal lines, ${L.mine.release} releases, ${L.mine.buy} buys and ${L.mine.sale} sales of mine: none of them may be 0`);
const total = sections.reduce((n, s) => n + results[s].fails.length + results[s].living.fails.length, 0);
console.log(total === 0
  ? `simCmUnseededWorld: green. ${results.quiet.journeys} old saves with no deal play byte equal to ${BASE.slice(0, 8)} (state, draws and saved bytes at every step), ${results.deals.journeys} with every deal play byte equal to it up to their first summer and hold the living world's invariants after it, and ${results.fresh.journeys} new careers with the seed block out play byte equal all the way`
  : `simCmUnseededWorld: ${total} FAILURE(S)`);
process.exit(total === 0 ? 0 : 1);

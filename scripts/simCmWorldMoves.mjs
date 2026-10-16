/* Round 1344: Club Manager, a man two other clubs trade turns up at his new club and stays there.
 *
 * WHY. A player report on /club-manager, forwarded by the owner on 2026-10-16: "Bug: in manager mode, if a player
 * transfers to another club they get deleted from the database until next season, where they end up at their
 * former team." The other lane proved it (PR269, Round 1367). Three places close a deal between two clubs that are
 * not yours: the window news (generateHeadlines, at a career's start, every January and every summer), a rival who
 * closes while you dither (makeOffer) and a rival who takes the man when you walk away (walkAway). All three write a
 * news line and put the man on goneNames, and nothing else: he leaves the market, the world roster keeps him at the
 * seller, and goneNames is emptied every summer, so next season he is on sale at his old club again.
 *
 * STEP 1 OF THE ROUND (this file as committed at step 1). No product code yet. Sections 0, 1 and 6, plus the shape
 * measurement (section 9) the lead rules on before any product step:
 *   0. anchors: every edit this harness can make stands exactly once in the source it is made to. At step 1 that is
 *      the seedless control's guard and, with CM_WORLD_MOVES_HEAD=probe, the nine edits of
 *      scripts/lib/cmAiRecordProbe1344.mjs. The anchors of code that does not exist yet (the bridge, the record,
 *      flush, January, summer, lock and list controls) are added with that code.
 *   1. ownership: seeded careers (2026-27, 2015-16 and 2005-06 worlds, a big club, a mid table club and a thin
 *      squad's club each, seeds 1 to 5, six seasons), saved and loaded after every window and every rollover. At
 *      every window: (i) every deal line between two other clubs is placed by the ledger at its buyer, who lists
 *      him, and the seller does not; (ii) the one club rule over every club of the world: a key is listed at most
 *      once, an owned record's man is listed at his owner and nowhere else, no other club lists a man matching his
 *      origin, and no man of my squad is listed at any club; (iii) every man moved in the run is at his buyer at
 *      every later rollover, or the ledger says he retired; (iv) printed per window type: deals, refusals,
 *      records, the ledger's stored length. EXPECTED RED ON THIS TREE AT STEP 1: it measures the bug.
 *   6. legacy: careers with no world seed (startCareer with PR269's legacy world, and fresh careers with the seed,
 *      the ledger and the squad's ledger keys stripped the way simClubManagerSaveSize strips them, and the legacy
 *      career with three deals of mine at its start: a release, a buy and a sale through acceptBid), the same nine
 *      clubs, seeds 0 to 4, two seasons with their January windows, a save and a reload after every window,
 *      deal and rollover, against BASE: every state, saved byte and Math.random draw equal. At step 1 the head IS
 *      the base, so this is green by construction and is not evidence; it proves the machinery and its control.
 *      The deals are what let the control fire: a quiet unseeded career calls no ledger writer at all (the first
 *      run, remote check r1344-wm, had no deals and the seedless control did not fire).
 *   9. shape (only when asked): the world's shape over fifteen seasons at the 2026-27 trio, BASE against the head,
 *      per tier (each league's top five and bottom five by XI average, the clubs that sold and the clubs that
 *      bought in an AI deal line): the XI average, the roster length minus the projection's slot count and the
 *      mean age at seasons 1, 5, 10 and 15; plus AI deals a window, the ledger's records and stored length, the
 *      market's size and the January entry's time. Each run writes its per career numbers as JSON; --combine
 *      reads the files of every run and prints the paired statistic (head minus BASE on the same seeds, the mean
 *      of the per seed differences and its standard error) beside BASE against BASE on a second seed set.
 *
 * MEASURED AT STEP 1 (GitHub runners, 2026-10-16; the head is the base plus scripts only):
 *   section 0: every probe anchor and the seedless anchor stand once (r1344-wm3 and earlier).
 *   section 1 on this tree, seeds 1 to 5, six seasons: RED in all three worlds (r1344-wm, r1344-wm3: 1,461, 1,398
 *     and 1,405 failures; in 2026-27 (i) 812, (ii) 0, (iii) 649). Every AI deal line of every window is unplaced:
 *     opening 75, January 402, summer 335 in 2026-27. With CM_WORLD_MOVES_HEAD=probe: GREEN in all three worlds,
 *     0 unplaced, so the section measures the recording and nothing else.
 *   section 6: green in all three worlds (45 careers each, 220 saves, 40 deals of mine); CONTROL=seedless on 2026-27
 *     seeds 0 to 1: FIRED, 18 failures (the head wrote a ledger with no seed, saved strings differ).
 *   section 9: seeds 1 to 10 against BASE, BASE against BASE on seeds 11 to 20 (r1344-shape); the table is in the
 *     round's notes, docs/audits/ROUND-1344-NOTES.md. Nothing in section 9 is asserted at step 1: the lead rules.
 *
 * ENV. CM_WORLD_MOVES_SECTIONS (default 0,1,6), CM_WORLD_MOVES_SEEDS (a list or a range, 1-10; default per section),
 * CM_WORLD_MOVES_ERAS (default now,era2015,era2005), CM_WORLD_MOVES_HEAD=probe (the measurement probe composed into
 * this tree's engine; never product code), CM_WORLD_MOVES_BASE (default the commit the branch started from),
 * CM_WORLD_MOVES_SHAPE_ARMS (default base,head), CM_WORLD_MOVES_SEASONS (section 9, default 15), CM_WORLD_MOVES_OUT
 * (section 9's JSON folder, default $RC_OUT or the temp folder).
 * CONTROLS, each must go red on its own section (exit 1, the last line says FIRED):
 *   CM_WORLD_MOVES_CONTROL=seedless   the guard of recordActualRosterTransfer out of the head: section 6 red
 * Exit 0 green, 1 red or a control that fired, 2 could not run, 3 a control that did not fire.
 *
 *   node scripts/simCmWorldMoves.mjs
 *   CM_WORLD_MOVES_SECTIONS=9 CM_WORLD_MOVES_HEAD=probe CM_WORLD_MOVES_SEEDS=1-5 node scripts/simCmWorldMoves.mjs
 *   node scripts/simCmWorldMoves.mjs --combine a.json b.json ...
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import vm from 'node:vm';
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ENGINE = 'src/lib/clubManager.ts';
const cannot = why => { console.log(`simCmWorldMoves: cannot run: ${why}`); process.exit(2); };
const lf = s => s.split('\r\n').join('\n');
const sha = v => createHash('sha256').update(typeof v === 'string' ? v : JSON.stringify(v)).digest('hex').slice(0, 16);
const range = (text, fallback) => {
  if (!text) return fallback;
  const out = [];
  for (const part of text.split(',')) {
    const [a, b] = part.split('-').map(Number);
    if (!Number.isInteger(a) || (b !== undefined && !Number.isInteger(b))) cannot(`not a seed list: ${text}`);
    for (let i = a; i <= (b ?? a); i += 1) out.push(i);
  }
  return out;
};

const COMBINE = process.argv[2] === '--combine';   // handled at the end of the file, once every helper exists

/* The commit this branch started from (origin/main at the claim, Release BG live; src equal to bd3b6244). */
const BASE = process.env.CM_WORLD_MOVES_BASE || 'd4f2c6f688d656205722ba52bbdb33f03490966a';
const SECTIONS = new Set(range(process.env.CM_WORLD_MOVES_SECTIONS, [0, 1, 6]));
const ERAS = (process.env.CM_WORLD_MOVES_ERAS || 'now,era2015,era2005').split(',');
const HEAD_PROBE = process.env.CM_WORLD_MOVES_HEAD === 'probe';
if (process.env.CM_WORLD_MOVES_HEAD && !HEAD_PROBE) cannot(`CM_WORLD_MOVES_HEAD=${process.env.CM_WORLD_MOVES_HEAD} is not known (probe)`);
const CONTROL = process.env.CM_WORLD_MOVES_CONTROL || '';
/* Each control: the section it must turn red, and its edits of this tree's engine, [anchor, replacement]. */
const CONTROLS = {
  seedless: { section: 6, edits: [['  if (worldSeedOf(state) === undefined) return state;\n', '']] },
};
if (CONTROL && !CONTROLS[CONTROL]) cannot(`unknown control ${CONTROL} (${Object.keys(CONTROLS).join(', ')})`);
/* A control runs its own section and the anchors only, unless the sections are named. */
if (CONTROL && !process.env.CM_WORLD_MOVES_SECTIONS) { SECTIONS.clear(); SECTIONS.add(0); }
if (CONTROL) SECTIONS.add(CONTROLS[CONTROL].section);
/* The careers of sections 1 and 6: a big club, a mid table club and a thin squad's club in each world. Aberdeen's
   2026-27 squad is CM_PARTIAL; Carpi and Treviso were the promoted sides with the thinnest bakes of their eras. */
const CLUBS = {
  now: ['Real Madrid', 'Everton', 'Aberdeen'],
  era2015: ['Bayern Munich', 'Stoke City', 'Carpi'],
  era2005: ['Chelsea', 'Bolton Wanderers', 'Treviso'],
};
for (const era of ERAS) if (!CLUBS[era]) cannot(`no careers named for the world ${era}`);
const OPT = { skipHalftime: true, noCoach: true };
try { execFileSync('git', ['cat-file', '-e', `${BASE}^{commit}`], { cwd: ROOT, stdio: 'ignore' }); } catch { cannot(`the base commit ${BASE.slice(0, 8)} is not in this clone (fetch its history)`); }

/* ---------- the engines ---------- */
let esbuild;
try { esbuild = await import('esbuild'); } catch { cannot('esbuild is not installed'); }
const { withAiRecording, probeAnchorCounts } = await import('./lib/cmAiRecordProbe1344.mjs');
/* Section 0's ledger: every edit made, by name, and how often it was made. */
const made = new Map();
function editOf(edits, name) {
  return text => {
    let out = text;
    for (const [from, to] of edits) {
      const n = out.split(from).length - 1;
      if (n !== 1) cannot(`${name}: its anchor is in ${ENGINE} ${n} times, it must be exactly once: ${from.trim().slice(0, 80)}`);
      out = out.replace(from, () => to);
      made.set(`${name}: ${from.trim().slice(0, 60)}`, (made.get(`${name}: ${from.trim().slice(0, 60)}`) ?? 0) + 1);
    }
    return out;
  };
}
/** One engine bundled once; each career runs in a fresh context, so module state never leaks between careers.
    `base` reads every source file from BASE; `edit` rewrites the engine file. */
async function engine(label, { base = false, edit = null } = {}) {
  let edited = false;
  const plugin = {
    name: `world-moves-${label}`,
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
  const entry = "export * as cm from './src/lib/clubManager';\nexport * as eras from './src/lib/clubManagerEras';\nexport * as ledger from './src/lib/clubManagerWorldRoster';\n";
  const out = await esbuild.build({ stdin: { contents: entry, resolveDir: ROOT, sourcefile: `world-moves-${label}.ts`, loader: 'ts' },
    bundle: true, write: false, format: 'cjs', platform: 'node', target: 'node20', plugins: [plugin], logLevel: 'silent' });
  if (edit && !edited) cannot(`the ${label} engine was to be edited and ${ENGINE} was never loaded`);
  const script = new vm.Script(out.outputFiles[0].text, { filename: `world-moves-${label}.cjs` });
  return {
    label,
    async fresh() {
      const module = { exports: {} }, store = new Map(), NOW = 1791633600000;
      class HeldDate extends Date { constructor(...a) { super(...(a.length ? a : [NOW])); } static now() { return NOW; } }
      const ctx = vm.createContext({ module, exports: module.exports, require: createRequire(path.join(ROOT, 'package.json')),
        console, process, Buffer, Math, Date: HeldDate, URL, URLSearchParams, TextEncoder, TextDecoder, structuredClone, performance,
        setTimeout, clearTimeout, setInterval, clearInterval, fetch: () => Promise.reject(new Error('no network here')),
        localStorage: { getItem: k => store.get(k) ?? null, setItem: (k, v) => store.set(k, String(v)), removeItem: k => store.delete(k), clear: () => store.clear() } });
      script.runInContext(ctx);
      await module.exports.eras.ensureAllEraRosters();
      return { ...module.exports, store };
    },
  };
}

/* ---------- shared pieces ---------- */
function stream(seed) {
  let s = seed >>> 0;
  return () => { s = (s + 0x6d2b79f5) >>> 0; let v = s; v = Math.imul(v ^ v >>> 15, v | 1); v ^= v + Math.imul(v ^ v >>> 7, v | 61); return ((v ^ v >>> 14) >>> 0) / 4294967296; };
}
const mix = (...parts) => parseInt(sha(parts.join('|')).slice(0, 8), 16) >>> 0;
/** fn under Math.random on its own stream, every draw kept (section 6 compares their number and values). */
function tape(seed, fn) {
  const next = stream(seed), draws = [], keep = Math.random;
  Math.random = () => { const d = next(); draws.push(d); return d; };
  try { return { value: fn(), draws }; } finally { Math.random = keep; }
}
const failures = {}, shown = {};
const fail = (section, line) => {
  (failures[section] ??= []).push(line);
  shown[section] = (shown[section] ?? 0) + 1;
  if (shown[section] <= 8) console.log(`  FAIL section ${section}: ${line}`);
};
/** Section 1's failures counted by check: (i) placed at the buyer, (ii) the one club rule, (iii) still there later. */
const checks = {};
const fail1 = (check, line) => { checks[check] = (checks[check] ?? 0) + 1; fail(1, line); };
/** The lines one step added to the transfer log. The log keeps its last 80, so the oldest may have gone. */
function addedLines(before, after) {
  const b = (before ?? []).map(x => JSON.stringify(x)), a = (after ?? []).map(x => JSON.stringify(x));
  for (let added = 0; added <= a.length; added += 1) {
    const kept = a.length - added;
    if (kept > b.length) continue;
    let same = true;
    for (let i = 0; i < kept && same; i += 1) same = a[i] === b[b.length - kept + i];
    if (same) return (after ?? []).slice(kept);
  }
  return [...(after ?? [])];
}
/** PR269's rule for a deal between two other clubs: a new line, not a loan, neither club mine. */
const aiLine = mine => line => !line.loan && line.from !== mine && line.to !== mine && line.from !== 'a free transfer' && line.to !== 'a free transfer';
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
const madeUp = p => p.generated === true || p.academyGrad === true || p.isYouth === true;
/** Where the ledger and the world put one deal line's man: his owned record at the buyer, listed there, not at the seller. */
function placement(M, s, line) {
  const records = (M.ledger.readWorldRoster(s)?.records ?? []).filter(r => r.status === 'owned' && r.owner === line.to && r.player.name === line.name);
  if (records.length !== 1) return records.length ? `${records.length} owned records of him at ${line.to}` : `the ledger holds no record of him at ${line.to}`;
  const record = records[0], year = M.cm.worldYear(s);
  if (!M.cm.worldRosterFor(s, line.to).some(p => p.worldRosterKey === record.key)) return `${line.to} does not list him`;
  const sameMan = p => p.worldRosterKey === record.key || p.n === record.origin.name && year - p.a === record.origin.birthYear && p.p === record.origin.position;
  if (M.cm.worldRosterFor(s, line.from).some(sameMan)) return `${line.from} still lists him`;
  return null;
}
/** Section 1 (ii), the one club rule over every club of the world. Returns how many men were checked. */
function oneClubRule(M, s, label) {
  const year = M.cm.worldYear(s), at = new Map(), origin = new Map();
  const add = (map, key, club) => { const list = map.get(key); if (list) list.push(club); else map.set(key, [club]); };
  for (const club of worldClubs(M, s)) {
    for (const p of M.cm.worldRosterFor(s, club)) {
      if (p.worldRosterKey) add(at, p.worldRosterKey, club);
      add(origin, `${p.n}|${year - p.a}|${p.p}`, club);
    }
  }
  for (const [key, clubs] of at) if (clubs.length > 1) fail1('ii', `${label}:the key ${key} is listed at ${clubs.join(' and ')}`);
  for (const r of M.ledger.readWorldRoster(s)?.records ?? []) {
    if (r.status !== 'owned' || r.owner === s.clubName) continue;
    const where = at.get(r.key) ?? [];
    if (where.length !== 1 || where[0] !== r.owner) fail1('ii', `${label}:${r.player.name}, owned by ${r.owner}, is listed at ${where.join(' and ') || 'no club'}`);
    const twins = (origin.get(`${r.origin.name}|${r.origin.birthYear}|${r.origin.position}`) ?? []).filter(c => c !== r.owner);
    if (twins.length) fail1('ii', `${label}:a man matching ${r.origin.name}'s origin (${r.origin.club}, born ${r.origin.birthYear}) is still listed at ${twins.join(' and ')}`);
  }
  let mine = 0;
  for (const p of s.squad) {
    if (madeUp(p) || p.onLoan) continue;
    mine += 1;
    const clubs = origin.get(`${p.name}|${year - p.age}|${p.position}`) ?? [];
    if (clubs.length) fail1('ii', `${label}:${p.name} of my squad is also listed at ${clubs.join(' and ')}`);
  }
  return at.size + mine;
}

/* ---------- section 1, ownership ---------- */
const S1_SEASONS = 6;
const tally = {};   // per window type: deals, refused, records, stored, windows
let s1Careers = 0, s1Checked = 0, s1Tracked = 0, s1Rollovers = 0, s1Sacked = 0;
async function ownershipCareer(E, era, club, seed) {
  const M = await E.fresh(), keep = Math.random;
  Math.random = stream(mix('own', era, club, seed));
  const tag = `${club} (${era}, seed ${seed})`;
  const moved = new Map();   // name -> { to, since }
  const reload = (st, label) => {
    M.store.clear();
    if (!M.cm.saveCareer(st)) { fail(1, `${tag} ${label}: the save was refused`); return st; }
    const back = M.cm.loadCareer();
    if (!back) { fail(1, `${tag} ${label}: the save did not load`); return st; }
    return back;
  };
  const atWindow = (kind, label, s, before) => {
    const lines = addedLines(before, s.transferLog).filter(aiLine(s.clubName));
    const held = M.ledger.readWorldRoster(s);
    const row = tally[kind] ??= { windows: 0, deals: 0, refused: 0, records: 0, stored: 0 };
    row.windows += 1; row.deals += lines.length; row.records += held?.records.length ?? 0;
    row.stored += s.worldRoster === undefined ? 0 : JSON.stringify(s.worldRoster).length;
    for (const line of lines) {
      const why = placement(M, s, line);
      if (why) { row.refused += 1; fail1('i',`${tag} ${label}: ${line.to} signed ${line.name} from ${line.from}, but ${why}`); }
      moved.set(line.name, { to: line.to, since: label });
    }
    s1Checked += oneClubRule(M, s, `${tag} ${label}`);
  };
  const atRollover = (s, label, before) => {
    const resold = new Set(addedLines(before, s.transferLog).filter(aiLine(s.clubName)).map(line => line.name));
    s1Rollovers += 1;
    const records = M.ledger.readWorldRoster(s)?.records ?? [];
    for (const [name, man] of moved) {
      if (resold.has(name)) continue;   // moved again in this summer's window: section (i) places him there
      s1Tracked += 1;
      if (records.some(r => r.status === 'retired' && r.origin.name === name)) { moved.delete(name); continue; }
      const record = records.find(r => r.status === 'owned' && r.owner === man.to && r.player.name === name);
      if (!record) { fail1('iii', `${tag} ${label}: ${name}, moved to ${man.to} at ${man.since},has no owned record there`); moved.delete(name); continue; }
      if (!M.cm.worldRosterFor(s, man.to).some(p => p.worldRosterKey === record.key)) { fail1('iii', `${tag} ${label}: ${name}, moved to ${man.to} at ${man.since},is not listed there`); moved.delete(name); }
    }
  };
  try {
    let s = M.cm.startCareer(club, era);
    if (M.cm.worldSeedOf(s) === undefined) cannot(`${tag}: a new career carries no worldSeed`);
    s1Careers += 1;
    s = reload(s, 'the opening window');
    atWindow('opening', 'the opening window', s, []);
    for (let season = 1; season <= S1_SEASONS; season += 1) {
      for (let guard = 0; guard < 400; guard += 1) {
        if (s.boardConfidence < 35) s = { ...s, boardConfidence: 55 };
        const before = s.transferLog, r = M.cm.playNextEntry(s, OPT);
        s = r.state;
        if (r.kind === 'window') { s = reload(s, `January of season ${season}`); atWindow('january', `January of season ${season}`, s, before); }
        if (r.kind === 'seasonOver' || s.sacked) break;
      }
      if (s.sacked) { s1Sacked += 1; console.log(`  ${tag}: sacked in season ${season}, the run stops there`); break; }
      s = M.cm.finishSeason(s).state;
      if (season === S1_SEASONS) break;
      const before = s.transferLog;
      s = reload(M.cm.startNextSeason(s), `the summer before season ${season + 1}`);
      atRollover(s, `the rollover to season ${season + 1}`, before);
      atWindow('summer', `the summer before season ${season + 1}`, s, before);
    }
  } finally { Math.random = keep; }
}

/* ---------- section 6, legacy ---------- */
const LEGACY_SEASONS = 2;
const LEGACY_WORLD = { yearsOn: 0, uclField: null, keepLeagueOverrides: false };
/** One unseeded career on one engine: the hash of every saved string in order, and every Math.random draw. */
async function legacyCareer(E, era, club, seed, kind) {
  const M = await E.fresh(), saved = [];
  const run = tape(mix('legacy', kind, era, club, seed), () => {
    const keepSaved = s => {
      M.store.clear();
      if (!M.cm.saveCareer(s)) { saved.push('refused'); return s; }
      saved.push(sha(M.store.get(M.cm.SAVE_KEY) ?? ''));
      return M.cm.loadCareer() ?? s;
    };
    let s = kind !== 'stripped' ? M.cm.startCareer(club, era, undefined, undefined, LEGACY_WORLD) : M.cm.startCareer(club, era);
    if (kind === 'stripped') {
      s = JSON.parse(JSON.stringify(s));
      delete s.worldSeed; delete s.worldRoster;
      for (const p of s.squad) { delete p.worldRosterKey; delete p.worldRosterSince; }
    }
    if (M.cm.worldSeedOf(s) !== undefined || s.worldRoster !== undefined) return { error: 'the career still carries a seed or a ledger' };
    s = keepSaved(s);
    let dealt = 0;
    if (kind === 'deals') {
      /* Deals of mine in an unseeded career, the way simCmUnseededWorld's deal fleet makes them (a release, a buy,
         a sale through acceptBid), each saved and reloaded: every writer of the ledger is called, and with no seed
         none may write. Without them the seedless control cannot fire: a quiet unseeded career calls no writer. */
      s = { ...s, budget: 9999, wageCap: 9999, transferWindow: 'summer' };
      const outfield = cur => cur.squad.filter(p => !p.onLoan && p.position !== 'GK');
      const low = [...outfield(s)].sort((a, b) => a.rating - b.rating || a.id.localeCompare(b.id))[0];
      const released = low && M.cm.releasePlayer(s, low.id);
      if (released) { s = keepSaved(released); dealt += 1; }
      const mine = new Set(s.squad.map(p => p.name));
      const mp = M.cm.buildMarket(s).find(p => p.position !== 'GK' && p.age < 29 && p.rating < 80 && !mine.has(p.name));
      const bought = mp && M.cm.buyPlayer(s, mp);
      if (bought) { s = keepSaved(bought); dealt += 1; }
      const man = [...outfield(s)].sort((a, b) => b.rating - a.rating || a.id.localeCompare(b.id))[1];
      const buyer = M.cm.buildMarket(s).find(p => p.club !== s.clubName)?.club;
      const bid = man && buyer ? { playerId: man.id, playerName: man.name, club: buyer, offer: 30, status: 'open' } : null;
      const sold = bid && M.cm.acceptBid({ ...s, incomingBids: [...(s.incomingBids ?? []), bid] }, man.id);
      if (sold) { s = keepSaved(sold); dealt += 1; }
    }
    for (let season = 1; season <= LEGACY_SEASONS; season += 1) {
      for (let guard = 0; guard < 400; guard += 1) {
        if (s.boardConfidence < 35) s = { ...s, boardConfidence: 55 };
        const r = M.cm.playNextEntry(s, OPT);
        s = r.state;
        if (r.kind === 'window') s = keepSaved(s);
        if (r.kind === 'seasonOver' || s.sacked) break;
      }
      if (s.sacked) break;
      s = M.cm.finishSeason(s).state;
      if (season === LEGACY_SEASONS) break;
      s = keepSaved(M.cm.startNextSeason(s));
    }
    return { state: sha(s), ledger: s.worldRoster !== undefined, dealt };
  });
  return { saved, draws: run.draws.length, drawHash: sha(run.draws.join(',')), ...run.value };
}
let s6Careers = 0, s6Saves = 0, s6Draws = 0, s6Deals = 0;
async function legacySection(B, H) {
  const seeds = range(process.env.CM_WORLD_MOVES_SEEDS, [0, 1, 2, 3, 4]);
  for (const era of ERAS) for (const club of CLUBS[era]) for (const seed of seeds) for (const kind of ['legacy', 'stripped', 'deals']) {
    const tag = `${club} (${era}, seed ${seed}, ${kind})`;
    const [b, h] = [await legacyCareer(B, era, club, seed, kind), await legacyCareer(H, era, club, seed, kind)];
    s6Careers += 1; s6Saves += h.saved.length; s6Draws += h.draws; s6Deals += h.dealt ?? 0;
    /* A career that cannot be set up measures nothing, so it stops the run (exit 2) rather than turning the section
       red: otherwise the seedless control could "fire" on a broken fleet (it did once, remote check r1344-wm2). */
    if (b.error || h.error) cannot(`section 6, ${tag}: ${b.error ?? h.error}`);
    if (h.ledger) fail(6, `${tag}: the head's career wrote a world ledger with no seed`);
    if (b.saved.length !== h.saved.length) fail(6, `${tag}: BASE saved ${b.saved.length} times, the head ${h.saved.length}`);
    const first = b.saved.findIndex((x, i) => x !== h.saved[i]);
    if (first >= 0) fail(6, `${tag}: saved string ${first + 1} of ${b.saved.length} differs from BASE's`);
    if (b.draws !== h.draws || b.drawHash !== h.drawHash) fail(6, `${tag}: Math.random draws ${h.draws} against BASE's ${b.draws} (values ${h.drawHash === b.drawHash ? 'equal' : 'differ'})`);
    if (b.state !== h.state) fail(6, `${tag}: the last state differs from BASE's`);
  }
}

/* ---------- section 9, shape ---------- */
const SHAPE_SEASONS = Number(process.env.CM_WORLD_MOVES_SEASONS || 15);
const SHAPE_AT = [1, 5, 10, 15].filter(t => t <= SHAPE_SEASONS);
/** Each league's top five and bottom five clubs by the bake's own XI (year 0, no seed: the same in both arms). */
function shapeTiers(M, s) {
  const era = s.eraId ?? 'now', top = [], bottom = [];
  const leagues = M.eras.isHistoricEra(era)
    ? M.cm.eraLeaguesFor(era).map(l => l.clubs)
    : M.cm.REAL_LEAGUES.map(l => M.cm.playableClubs(l.id).map(c => c.name));
  for (const clubs of leagues) {
    const rated = clubs.filter(c => c !== s.clubName).map(c => [c, M.eras.projectedXIAvg(c, 0, era) ?? 0]).sort((a, b) => b[1] - a[1]);
    if (rated.length < 10) continue;
    top.push(...rated.slice(0, 5).map(r => r[0]));
    bottom.push(...rated.slice(-5).map(r => r[0]));
  }
  return { top, bottom };
}
/** The XI average, the roster length minus the projection's slot count and the mean age over a set of clubs. */
function tierNumbers(M, s, clubs) {
  const years = M.cm.yearsOn(s), era = s.eraId ?? 'now', seed = M.cm.worldSeedOf(s);
  let xi = 0, surplus = 0, age = 0, n = 0;
  for (const club of clubs) {
    if (club === s.clubName) continue;
    const roster = M.cm.worldRosterFor(s, club);
    if (!roster.length) continue;
    xi += M.cm.worldRosterXIAvg(s, club) ?? 0;
    surplus += roster.length - M.eras.projectedRoster(club, years, era, seed).length;
    age += roster.reduce((sum, p) => sum + p.a, 0) / roster.length;
    n += 1;
  }
  return n ? { clubs: n, xi: xi / n, surplus: surplus / n, age: age / n } : { clubs: 0, xi: null, surplus: null, age: null };
}
async function shapeCareer(E, arm, era, club, seed) {
  const M = await E.fresh(), keep = Math.random;
  Math.random = stream(mix('shape', era, club, seed));
  const out = { arm, era, club, seed, seasons: SHAPE_SEASONS, at: {}, windows: [], sacked: null };
  const sold = new Set(), bought = new Set();
  const look = (s, kind, before, ms) => {
    const lines = addedLines(before, s.transferLog).filter(aiLine(s.clubName));
    for (const line of lines) { sold.add(line.from); bought.add(line.to); }
    const held = M.ledger.readWorldRoster(s);
    out.windows.push({ season: s.season, kind, deals: lines.length, records: held?.records.length ?? 0,
      stored: s.worldRoster === undefined ? 0 : JSON.stringify(s.worldRoster).length, market: M.cm.buildMarket(s).length, ms });
  };
  const measure = (s, t) => {
    const tiers = shapeTiers(M, s);
    out.at[t] = { top: tierNumbers(M, s, tiers.top), bottom: tierNumbers(M, s, tiers.bottom),
      sold: tierNumbers(M, s, [...sold]), bought: tierNumbers(M, s, [...bought]) };
  };
  try {
    let s = M.cm.startCareer(club, era);
    look(s, 'opening', [], null);
    if (SHAPE_AT.includes(1)) measure(s, 1);
    for (let season = 1; season <= SHAPE_SEASONS; season += 1) {
      for (let guard = 0; guard < 400; guard += 1) {
        if (s.boardConfidence < 35) s = { ...s, boardConfidence: 55 };
        const before = s.transferLog, t0 = performance.now(), r = M.cm.playNextEntry(s, OPT), ms = performance.now() - t0;
        s = r.state;
        if (r.kind === 'window') look(s, 'january', before, Math.round(ms * 10) / 10);
        if (r.kind === 'seasonOver' || s.sacked) break;
      }
      if (s.sacked) { out.sacked = season; break; }
      s = M.cm.finishSeason(s).state;
      if (season === SHAPE_SEASONS) break;
      const before = s.transferLog;
      s = M.cm.startNextSeason(s);
      look(s, 'summer', before, null);
      if (SHAPE_AT.includes(season + 1)) measure(s, season + 1);
    }
  } finally { Math.random = keep; }
  return out;
}
async function shapeSection(engines) {
  const seeds = range(process.env.CM_WORLD_MOVES_SEEDS, [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
  const arms = (process.env.CM_WORLD_MOVES_SHAPE_ARMS || 'base,head').split(',');
  const dir = process.env.CM_WORLD_MOVES_OUT || process.env.RC_OUT || os.tmpdir();
  fs.mkdirSync(dir, { recursive: true });
  for (const arm of arms) {
    if (!engines[arm]) cannot(`no engine for the shape arm ${arm}`);
    const rows = [];
    for (const seed of seeds) for (const club of CLUBS.now) {
      const row = await shapeCareer(engines[arm], arm === 'head' && HEAD_PROBE ? 'probe' : arm, 'now', club, seed);
      rows.push(row);
      const w = row.windows, deals = w.reduce((a, x) => a + x.deals, 0), last = w[w.length - 1];
      const t10 = row.at[10]?.top;
      console.log(`  shape ${row.arm} ${club} seed ${seed}: ${deals} AI deals in ${w.length} windows, ledger ${last.records} records ${last.stored} units, market ${last.market}${row.sacked ? `, sacked in season ${row.sacked}` : ''}${t10 ? `; season 10 top five XI ${t10.xi.toFixed(2)}, surplus ${t10.surplus.toFixed(2)}` : ''}`);
    }
    const file = path.join(dir, `shape-${arm === 'head' && HEAD_PROBE ? 'probe' : arm}-${seeds[0]}-${seeds[seeds.length - 1]}.json`);
    fs.writeFileSync(file, JSON.stringify(rows));
    console.log(`  shape: ${rows.length} careers written to ${file}`);
  }
}

/* ---------- --combine: the paired statistic over the shape files of every run ---------- */
const stat = xs => {
  const n = xs.length, mean = xs.reduce((a, b) => a + b, 0) / (n || 1);
  const sd = n > 1 ? Math.sqrt(xs.reduce((a, b) => a + (b - mean) ** 2, 0) / (n - 1)) : NaN;
  return { n, mean, se: sd / Math.sqrt(n) };
};
const sgn = v => `${v >= 0 ? '+' : ''}${v.toFixed(3)}`;
function combine(files) {
  const rows = files.flatMap(f => JSON.parse(fs.readFileSync(f, 'utf8')));
  const head = rows.filter(r => r.arm !== 'base'), base = rows.filter(r => r.arm === 'base');
  const armName = head[0]?.arm ?? 'head';
  const setA = [...new Set(head.map(r => r.seed))].sort((a, b) => a - b);
  const setB = [...new Set(base.map(r => r.seed))].filter(x => !setA.includes(x)).sort((a, b) => a - b);
  /** One number per seed: the mean over the careers of that seed (a sacked career's missing season is left out). */
  const perSeed = (list, seeds, get) => seeds.map(seed => {
    const xs = list.filter(r => r.seed === seed).map(get).filter(v => typeof v === 'number' && Number.isFinite(v));
    return xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null;
  });
  const diffs = (a, b) => a.map((x, i) => (x === null || b[i] === null ? null : x - b[i])).filter(v => v !== null);
  console.log(`simCmWorldMoves --combine: ${armName} seeds ${setA.join(',')} (${head.length} careers) against BASE on the same seeds; BASE against BASE pairs seeds ${setA.join(',')} with ${setB.join(',') || 'none'} by order`);
  console.log('  the statistic: the mean over seeds of the paired per seed difference (each seed the mean of its careers), its standard error, and z = (arm minus BASE less BASE minus BASE) over the root of both squared errors');
  const report = (label, get) => {
    const a = perSeed(base, setA, get), h = perSeed(head, setA, get), b = perSeed(base, setB, get);
    const d = stat(diffs(h, a)), nul = stat(diffs(b.slice(0, setA.length), a.slice(0, setB.length)));
    const z = (d.mean - (nul.n ? nul.mean : 0)) / Math.sqrt(d.se ** 2 + (nul.n > 1 ? nul.se ** 2 : 0));
    const baseMean = stat(a.filter(v => v !== null)).mean;
    console.log(`  ${label.padEnd(26)} BASE ${baseMean.toFixed(3)} | ${armName} minus BASE ${sgn(d.mean)} (se ${d.se.toFixed(3)}, n ${d.n}) | BASE minus BASE ${nul.n ? `${sgn(nul.mean)} (se ${nul.se.toFixed(3)}, n ${nul.n})` : 'not run'} | z ${Number.isFinite(z) ? z.toFixed(1) : 'n/a'}`);
  };
  for (const t of [5, 10, 15]) for (const tier of ['top', 'bottom', 'sold', 'bought']) for (const m of ['xi', 'surplus', 'age']) {
    report(`${tier} ${m} season ${t}`, r => r.at?.[t]?.[tier]?.[m]);
  }
  const win = (kind, field) => r => { const w = r.windows.filter(x => x.kind === kind); return w.length ? w.reduce((a, x) => a + (x[field] ?? 0), 0) / w.length : null; };
  for (const kind of ['opening', 'january', 'summer']) report(`AI deals a window, ${kind}`, win(kind, 'deals'));
  for (const t of [5, 10, 15]) {
    const atSummer = field => r => r.windows.find(x => x.kind === (t === 1 ? 'opening' : 'summer') && x.season === t)?.[field] ?? null;
    report(`ledger records season ${t}`, atSummer('records'));
    report(`ledger units season ${t}`, atSummer('stored'));
    report(`market size season ${t}`, atSummer('market'));
  }
  report('January entry ms', win('january', 'ms'));
}

/* ---------- the run ---------- */
if (COMBINE) { combine(process.argv.slice(3)); process.exit(0); }
const treeSource = lf(fs.readFileSync(path.join(ROOT, ENGINE), 'utf8'));
if (SECTIONS.has(0)) {
  console.log('0) anchors: every edit this harness can make stands exactly once in the source it is made to');
  for (const [label, n] of probeAnchorCounts(treeSource)) {
    console.log(`   probe "${label}": ${n}`);
    if (n !== 1) fail(0, `the probe's anchor "${label}" stands ${n} times in ${ENGINE}`);
  }
  for (const [name, c] of Object.entries(CONTROLS)) for (const [from] of c.edits) {
    const n = treeSource.split(from).length - 1;
    console.log(`   control ${name}: ${n}`);
    if (n !== 1) fail(0, `the anchor of the control ${name} stands ${n} times in ${ENGINE}`);
  }
}
const headEdits = [HEAD_PROBE ? withAiRecording : null, CONTROL ? editOf(CONTROLS[CONTROL].edits, CONTROL) : null].filter(Boolean);
const needBase = SECTIONS.has(6) || SECTIONS.has(9) && (process.env.CM_WORLD_MOVES_SHAPE_ARMS || 'base,head').split(',').includes('base');
const H = await engine(HEAD_PROBE ? 'probe' : 'head', { edit: headEdits.length ? text => headEdits.reduce((t, f) => f(t), text) : null });
const B = needBase ? await engine('base', { base: true }) : null;
if (made.size) for (const [what, n] of made) console.log(`   control edit made ${n} time(s): ${what}`);

if (SECTIONS.has(1)) {
  const seeds = range(process.env.CM_WORLD_MOVES_SEEDS, [1, 2, 3, 4, 5]);
  console.log(`1) ownership: seeded careers, ${S1_SEASONS} seasons, seeds ${seeds.join(',')}, the ${H.label} engine`);
  for (const era of ERAS) for (const club of CLUBS[era]) for (const seed of seeds) await ownershipCareer(H, era, club, seed);
  for (const [kind, row] of Object.entries(tally)) {
    console.log(`   ${kind.padEnd(8)} ${row.windows} windows, ${row.deals} AI deal lines, ${row.refused} not placed at the buyer, ledger ${(row.records / row.windows).toFixed(1)} records and ${Math.round(row.stored / row.windows)} units a window on average`);
  }
  console.log(`   ${s1Careers} careers (${s1Sacked} sacked early), ${s1Checked} listings checked by the one club rule, ${s1Tracked} moved men followed over ${s1Rollovers} rollovers`);
  console.log(`   failures by check: (i) ${checks.i ?? 0}, (ii) ${checks.ii ?? 0}, (iii) ${checks.iii ?? 0}`);
  if (!s1Careers || !Object.values(tally).some(r => r.deals)) fail(1,'no AI deal line was seen, so nothing was measured');
}
if (SECTIONS.has(6)) {
  console.log('6) legacy: unseeded careers, BASE against the head, every saved string and Math.random draw');
  await legacySection(B, H);
  console.log(`   ${s6Careers} careers, ${s6Saves} saves, ${s6Draws} draws and ${s6Deals} deals of mine on the head`);
  if (!s6Careers || !s6Saves) cannot('section 6: no career was played');
  if (!s6Deals) cannot('section 6: no deal of mine was made, so no ledger writer was called');
}
if (SECTIONS.has(9)) {
  console.log(`9) shape: ${SHAPE_SEASONS} seasons at ${CLUBS.now.join(', ')} (the JSON goes to --combine)`);
  await shapeSection({ base: B, head: H });
}

const red = Object.keys(failures).map(Number).sort((a, b) => a - b);
for (const section of red) if (failures[section].length > 8) console.log(`  section ${section}: ${failures[section].length - 8} more failures not shown`);
if (CONTROL) {
  const target = CONTROLS[CONTROL].section;
  if (failures[target]?.length) { console.log(`simCmWorldMoves: control ${CONTROL} FIRED: section ${target} red (${failures[target].length})`); process.exit(1); }
  console.log(`simCmWorldMoves: control ${CONTROL} DID NOT FIRE: section ${target} stayed green`);
  process.exit(3);
}
if (red.length) { console.log(`simCmWorldMoves: RED, sections ${red.map(s => `${s} (${failures[s].length})`).join(', ')}`); process.exit(1); }
console.log(`simCmWorldMoves: green, sections ${[...SECTIONS].sort((a, b) => a - b).join(', ')} held`);

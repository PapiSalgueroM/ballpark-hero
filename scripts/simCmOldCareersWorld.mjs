/* Round 1508: Club Manager careers started before the 13 October update join the living world at their next summer.
 *
 * WHY. The player report behind Round 1344 ("if a player transfers to another club they get deleted from the database
 * until next season, where they end up at their former team") was fixed there for careers with a world seed, which
 * every career started since Release BC (13 October) has. The reporter's career is most likely older. This round
 * gives a career with no seed an empty ledger and still no seed at its next summer (adoptLivingWorld, first thing in
 * startNextSeason), and from then on every deal is recorded as in a seeded career.
 *
 * SECTIONS:
 *   1. fixtures (the lead's decision 4): the two old saves of scripts/data/cmOldCareersWorldFixture.json (pre: written
 *      by the engine from before Release AZ; mid: an old career carried on and saved by an engine between AZ and BC),
 *      each played on BASE and on this tree on one tape, saved and reloaded at every window and every eighth entry,
 *      to the end of its season, finished, rolled over (its first summer here), saved and reloaded, and played on
 *      through the next January window, saved and reloaded after it. Before the rollover every saved string, every
 *      draw and the state equal BASE's. From the rollover on, this tree's career must be adopted (a readable ledger,
 *      no seed); every deal of the season between two other clubs is owned at its buyer, listed there, and not
 *      listed at the club that sold him; the market (buildMarket and the screen) lists nobody at my club and the
 *      screen no moved man at his seller; every save loads, and the loaded career saves to the same bytes again.
 *   2. seeded (decision 5): careers with a seed, new on this tree (the 2026-27, 2015-16 and 2005-06 worlds of Round
 *      1344's fleet, seeds 1 and 2), with three deals of mine at the start (a release, a buy, a sale through
 *      acceptBid), played two seasons with their January windows, saved and reloaded after every window, deal and
 *      rollover: every saved string, draw and the last state equal BASE's. The round must not move them.
 *   Hot Seat and Deadline Day never reach a summer and never hold a ledger: scripts/simDailyDeals.mjs holds them.
 *
 * BASE: CM_OLD_WORLD_BASE, else the merge base of HEAD and origin/main when that holds the round's base 3a147a7c
 * (Round 1344's head, which the branch started from), else 3a147a7c: the tree without this round either way.
 * CONTROLS, each must turn its own section red (exit 1, the last line says FIRED):
 *   CM_OLD_WORLD_CONTROL=never   the adoption line out of startNextSeason: section 1's moved check red, while the
 *                                comparison before the summer stays green
 *   CM_OLD_WORLD_CONTROL=early   adopted as the save opens: section 1's comparison before the summer red
 *   CM_OLD_WORLD_CONTROL=bridge  Round 1344's recording out (scripts/lib/cmNoAiMoves1344.mjs): section 2 red, which
 *                                proves the seeded fleet meets AI deals at all
 * CM_OLD_WORLD_SECTIONS (default 1,2). Exit 0 green, 1 red or a control that fired, 2 could not run, 3 a control
 * that did not fire.
 *
 *   node scripts/simCmOldCareersWorld.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';
import { withoutAiMoves, BRIDGE_FILES } from './lib/cmNoAiMoves1344.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ENGINE = 'src/lib/clubManager.ts';
const ROUND_BASE = '3a147a7cb4a13e5a931f32eac8b8a7bd65ed10cb';
const FIXTURE = path.join(ROOT, 'scripts/data/cmOldCareersWorldFixture.json');
const ADOPT = '  career = adoptLivingWorld(career);\n';
const LOAD_REPAIR = '    repairAiMoves(parsed);\n';
const CONTROL = process.env.CM_OLD_WORLD_CONTROL || '';
const cannot = why => { console.log(`simCmOldCareersWorld: cannot run: ${why}`); process.exit(2); };
if (CONTROL && !['never', 'early', 'bridge'].includes(CONTROL)) cannot(`unknown control ${CONTROL}`);
const SECTIONS = new Set((process.env.CM_OLD_WORLD_SECTIONS || (CONTROL === 'bridge' ? '2' : CONTROL ? '1' : '1,2')).split(',').map(Number));
const git = (...a) => execFileSync('git', a, { cwd: ROOT, encoding: 'utf8', maxBuffer: 1 << 26 }).trim();
let BASE = process.env.CM_OLD_WORLD_BASE || '';
if (!BASE) {
  let mb = '';
  try { mb = git('merge-base', 'HEAD', 'origin/main'); } catch { mb = ''; }
  let holds = false;
  try { if (mb) { git('merge-base', '--is-ancestor', ROUND_BASE, mb); holds = true; } } catch { holds = false; }
  BASE = holds ? mb : ROUND_BASE;
}
try { BASE = git('rev-parse', `${BASE}^{commit}`); } catch { cannot(`the base ${BASE.slice(0, 8)} is not in this clone (fetch its history)`); }
const sha = v => createHash('sha256').update(typeof v === 'string' ? v : JSON.stringify(v)).digest('hex').slice(0, 16);
const lf = s => s.split('\r\n').join('\n');
const once = (name, from, to) => text => {
  const n = text.split(from).length - 1;
  if (n !== 1) cannot(`control ${name}: its anchor is in ${ENGINE} ${n} times, it must be exactly once: ${from.trim()}`);
  return text.replace(from, () => to);
};

/* One engine bundled once; each journey runs in a fresh context, so module state never leaks between saves. */
async function engine(label, { base = false, edit = null, bridge = false } = {}) {
  let edited = false; const bridged = new Set();
  const plugin = {
    name: `old-world-${label}`,
    setup(b) {
      b.onLoad({ filter: /\.(ts|tsx|json)$/ }, args => {
        const rel = path.relative(ROOT, args.path).split(path.sep).join('/');
        if (!rel.startsWith('src/')) return null;
        let text = base ? lf(execFileSync('git', ['show', `${BASE}:${rel}`], { cwd: ROOT, encoding: 'utf8', maxBuffer: 1 << 26 }))
          : lf(fs.readFileSync(args.path, 'utf8'));
        if (edit && rel === ENGINE) { text = edit(text); edited = true; }
        if (bridge) { const out = withoutAiMoves(text, rel); if (out !== text) { text = out; bridged.add(rel); } }
        return { contents: text, loader: path.extname(args.path).slice(1), resolveDir: path.dirname(args.path) };
      });
    },
  };
  const entry = "export * as cm from './src/lib/clubManager';\nexport * as eras from './src/lib/clubManagerEras';\nexport * as ledger from './src/lib/clubManagerWorldRoster';\n";
  const out = await build({ stdin: { contents: entry, resolveDir: ROOT, sourcefile: `old-world-${label}.ts`, loader: 'ts' },
    bundle: true, write: false, format: 'cjs', platform: 'node', target: 'node20', plugins: [plugin], logLevel: 'silent' });
  if (edit && !edited) cannot(`the ${label} engine was to be edited and ${ENGINE} was never loaded`);
  if (bridge && bridged.size !== BRIDGE_FILES.length) cannot(`the ${label} engine was to carry the bridge and only ${[...bridged].join(', ') || 'no file'} took it`);
  const script = new vm.Script(out.outputFiles[0].text, { filename: `old-world-${label}.cjs` });
  return async () => {
    const module = { exports: {} }, store = new Map(), NOW = 1791633600000;
    class HeldDate extends Date { constructor(...a) { super(...(a.length ? a : [NOW])); } static now() { return NOW; } }
    const ctx = vm.createContext({ module, exports: module.exports, require: createRequire(path.join(ROOT, 'package.json')),
      console, process, Buffer, Math, Date: HeldDate, URL, URLSearchParams, TextEncoder, TextDecoder, structuredClone, performance,
      setTimeout, clearTimeout, setInterval, clearInterval, fetch: () => Promise.reject(new Error('no network here')),
      localStorage: { getItem: k => store.get(k) ?? null, setItem: (k, v) => store.set(k, String(v)), removeItem: k => store.delete(k), clear: () => store.clear() } });
    script.runInContext(ctx);
    await module.exports.eras.ensureAllEraRosters();
    return { ...module.exports, store };
  };
}

/* The counter generator, every draw kept (the step's draws are compared by number and value). */
function tape(seed, action) {
  let state = seed >>> 0; const draws = []; const original = Math.random;
  Math.random = () => {
    state = (state + 0x6d2b79f5) >>> 0; let v = state;
    v = Math.imul(v ^ v >>> 15, v | 1); v ^= v + Math.imul(v ^ v >>> 7, v | 61);
    const d = ((v ^ v >>> 14) >>> 0) / 4294967296; draws.push(d); return d;
  };
  try { return { value: action(), draws }; } finally { Math.random = original; }
}
const PLAY = { skipHalftime: true, noCoach: true };
const failures = {};
const fail = (section, line) => { (failures[section] ??= []).push(line); if (failures[section].length <= 8) console.log(`  FAIL section ${section}: ${line}`.slice(0, 700)); };
const counts = {};
const bad = (check, line) => { counts[check] = (counts[check] ?? 0) + 1; fail(1, `[${check}] ${line}`); };

/* ---------- section 1, the old saves across their first summer here ---------- */
/** A deal between two other clubs (PR269's rule, as scripts/simCmWorldMoves.mjs reads it). */
const aiLine = mine => line => !!line && typeof line.name === 'string' && !line.loan && line.from !== mine && line.to !== mine
  && line.from !== 'a free transfer' && line.to !== 'a free transfer';
/** One journey of one old save: every step on its own stretch of the tape; `after` from the rollover on. */
function oldJourney(M, raw, seed) {
  const steps = []; let s = null, k = 0, after = false;
  const step = (label, fn) => {
    k += 1;
    const r = tape((seed + k * 7919) >>> 0, () => fn(s));
    const got = r.value ?? {};
    if (got.state) s = got.state;
    if (label === 'rollover') after = true;
    steps.push({ label, after, json: JSON.stringify(s), draws: r.draws.length, drawSha: sha(r.draws), saved: got.saved ?? null, note: got.note ?? '', again: got.again ?? null, kind: got.kind ?? null, state: after ? s : null });
    return got;
  };
  const reload = label => step(`save-and-reload ${label}`, cur => {
    M.store.clear();
    if (!M.cm.saveCareer(cur)) return { note: 'the save was refused' };
    const savedRaw = M.store.get(M.cm.SAVE_KEY);
    const loaded = M.cm.loadCareer();
    if (!loaded) return { note: 'the reload was refused', saved: sha(savedRaw) };
    /* The loaded career saves, loads and saves again to the same bytes (the load settles; a second round changes
       nothing). The career carried on is the first load. */
    const roundTrip = () => { const l = M.cm.loadCareer(); M.store.clear(); return l && M.cm.saveCareer(l) ? M.store.get(M.cm.SAVE_KEY) : null; };
    M.store.clear();
    const second = M.cm.saveCareer(loaded) ? M.store.get(M.cm.SAVE_KEY) : null;
    const third = second === null ? null : roundTrip();
    return { state: loaded, saved: sha(savedRaw), again: second !== null && second === third ? 'same' : 'differs' };
  });
  step('load', () => { M.store.clear(); M.store.set(M.cm.SAVE_KEY, raw); return { state: M.cm.loadCareer() }; });
  if (!s) throw new Error('the save did not open');
  let entries = 0;
  for (let i = 0; i < 260; i += 1) {
    const got = step(`entry-${i + 1}`, cur => { const r = M.cm.playNextEntry(cur, PLAY); return { state: r.state, kind: r.kind }; });
    entries += 1;
    if (got.kind === 'seasonOver') break;
    if (s.sacked) throw new Error('the manager was sacked before the summer');
    if (got.kind === 'window' || entries % 8 === 0) reload(`at entry ${entries}`);
    if (i === 259) throw new Error('the season did not end in 260 entries');
  }
  step('finish', cur => ({ state: M.cm.finishSeason(cur).state }));
  reload('before the summer');
  step('rollover', cur => ({ state: M.cm.startNextSeason(cur) }));
  reload('after the summer');
  for (let i = 0; i < 260; i += 1) {
    const got = step(`next-${i + 1}`, cur => { const r = M.cm.playNextEntry(cur, PLAY); return { state: r.state, kind: r.kind }; });
    if (got.kind === 'window') { reload('after January'); break; }
    if (got.kind === 'seasonOver' || s.sacked) throw new Error(`the next season ended (or the manager was sacked) before its January window (season ${s.season} week ${s.week} of ${s.calendar?.length}, ${got.kind}, sacked ${!!s.sacked}, wilderness ${!!s.wilderness}, board ${s.boardConfidence})`);
    if (i === 259) throw new Error('no January window in 260 entries');
  }
  return steps;
}
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
const s1 = { saves: 0, compared: 0, after: 0, checkpoints: 0, summer: 0, january: 0, placed: 0, joined: 0, ledgerBytes: [] };
/** The invariants of an adopted career at one checkpoint after the rollover. */
function livingAt(M, s, tag) {
  s1.checkpoints += 1;
  const held = M.ledger.readWorldRoster(s), records = held?.records ?? [], year = M.cm.worldYear(s), mine = s.clubName;
  const listed = new Map();
  for (const club of worldClubs(M, s)) for (const p of M.cm.worldRosterFor(s, club)) {
    const keys = [`${p.n}|${year - p.a}|${p.p}`, ...(p.worldRosterKey ? [`key|${p.worldRosterKey}`] : [])];
    for (const key of keys) { const list = listed.get(key); if (list) list.push(club); else listed.set(key, [club]); }
  }
  const lines = (s.transferLog ?? []).filter(l => l && l.season === s.season).filter(aiLine(mine));
  for (const line of lines) {
    const recs = records.filter(r => r.status === 'owned' && r.owner === line.to && r.player.name === line.name);
    if (recs.length !== 1) { bad('moved', `${tag}: ${line.name} (${line.from} to ${line.to}): ${recs.length} owned records at the buyer`); continue; }
    const r = recs[0];
    const at = listed.get(`key|${r.key}`) ?? [];
    if (at.length !== 1 || at[0] !== line.to) bad('moved', `${tag}: ${line.name} is listed at ${at.join(' and ') || 'no club'}, not at ${line.to} alone`);
    const twins = (listed.get(`${r.origin.name}|${r.origin.birthYear}|${r.origin.position}`) ?? []).filter(c => c !== line.to);
    if (twins.length) bad('moved', `${tag}: a man of ${line.name}'s origin is still listed at ${twins.join(' and ')}`);
    else s1.placed += 1;
  }
  const market = M.cm.buildMarket(s), screen = M.cm.marketForScreen(s);
  const own = market.filter(p => p.club === mine).length + screen.filter(p => p.club === mine).length;
  if (own) bad('market', `${tag}: ${own} market rows list a man at my own club ${mine}`);
  const atSeller = new Set(lines.map(l => `${l.name}|${l.from}`));
  for (const p of screen) {
    if (atSeller.has(`${p.name}|${p.club}`)) bad('market', `${tag}: the screen lists ${p.name} at ${p.club}, the club that sold him this season`);
    if (p.joinedThisSeason) s1.joined += 1;
  }
  return lines.length;
}
async function fixtureSection(B, H) {
  if (!fs.existsSync(FIXTURE)) cannot(`the fixture ${path.relative(ROOT, FIXTURE)} is missing (scripts/genCmOldCareersWorldFixture.mjs writes it)`);
  const file = JSON.parse(fs.readFileSync(FIXTURE, 'utf8'));
  const names = Object.keys(file.saves ?? {});
  if (names.length < 2) cannot('the fixture holds fewer than two saves');
  for (const [n, name] of names.entries()) {
    const raw = file.saves[name], parsed = JSON.parse(raw);
    if ('worldSeed' in parsed || 'worldRoster' in parsed) cannot(`fixture ${name} carries a seed or a ledger: it is not an old career's`);
    /* A tape on which BASE keeps its manager through the next January (the board can sack him at a season's end, and
       a sacked career meets no January): the first of six, each tried in order and printed when passed over. */
    let a, b, seed = 0;
    const passed = [];
    for (let t = 0; t < 6 && !a; t += 1) {
      seed = (0x1508f0 + n * 977 + t * 101) >>> 0;
      try { a = oldJourney(await B(), raw, seed); } catch (e) { passed.push(`tape ${t}: ${e.message}`); }
    }
    if (!a) cannot(`fixture ${name} on BASE, six tapes: ${passed.join('; ')}`);
    if (passed.length) console.log(`  fixture ${name}: ${passed.length} tape(s) passed over (${passed.join('; ')})`);
    const HM = await H();
    try { b = oldJourney(HM, raw, seed); } catch (e) { fail(1, `fixture ${name}: this tree threw: ${e.message}`); continue; }
    s1.saves += 1;
    const tag = `${name} (${parsed.clubName}, ${parsed.eraId ?? 'now'})`;
    /* Before the rollover: equal to BASE, step by step. */
    const before = a.filter(x => !x.after).length;
    if (b.filter(x => !x.after).length !== before) { bad('equal', `${tag}: BASE took ${before} steps to the summer, this tree ${b.filter(x => !x.after).length}`); continue; }
    for (let i = 0; i < before; i += 1) {
      const x = a[i], y = b[i];
      const why = [];
      if (x.label !== y.label) why.push(`the steps part (${x.label} against ${y.label})`);
      if (x.json !== y.json) why.push('the state differs');
      if (x.draws !== y.draws || x.drawSha !== y.drawSha) why.push(`the draws differ (${x.draws} against ${y.draws})`);
      if (x.saved !== y.saved) why.push('the saved bytes differ');
      if (x.note !== y.note) why.push(`the step went otherwise (${x.note} against ${y.note})`);
      s1.compared += 1;
      if (why.length) { bad('equal', `${tag} before the summer, at step ${i} ${x.label}: ${why.join('; ')}`); break; }
    }
    /* From the rollover on: this tree's career in the living world. */
    let phase = 'summer';
    for (const y of b.filter(x => x.after)) {
      s1.after += 1;
      if (y.note) bad('adopted', `${tag} at ${y.label}: ${y.note}`);
      if (y.again === 'differs') bad('adopted', `${tag} at ${y.label}: the loaded career does not save, load and save again to the same bytes`);
      if (HM.cm.worldSeedOf(y.state) !== undefined) bad('adopted', `${tag} at ${y.label}: it carries a seed`);
      if (!HM.ledger.readWorldRoster(y.state)) bad('adopted', `${tag} at ${y.label}: it holds no readable ledger`);
      if (y.kind === 'window') phase = 'january';
      const checkpoint = y.label === 'rollover' || y.label.startsWith('save-and-reload') || y.kind === 'window';
      if (!checkpoint) continue;
      const n = livingAt(HM, y.state, `${tag} at ${y.label}`);
      if (y.label === 'rollover') s1.summer += n;
      if (y.kind === 'window') s1.january += n - s1.lastSummer;
      if (y.label === 'rollover') s1.lastSummer = n;
    }
    if (phase !== 'january') bad('adopted', `${tag}: no January window was reached after the summer`);
    const last = b[b.length - 1].state;
    s1.ledgerBytes.push(`${name}: ${JSON.stringify(last.worldRoster ?? null).length} bytes of ledger after January (${HM.ledger.readWorldRoster(last)?.records.length ?? 0} records)`);
    const adoptBytes = JSON.stringify(HM.cm.adoptLivingWorld(JSON.parse(b[0].json))).length - b[0].json.length;
    s1.ledgerBytes.push(`${name}: the adoption adds ${adoptBytes} bytes to the state (an empty ledger)`);
    console.log(`  ${tag}: ${before} steps equal to BASE before the summer, ${b.length - before} after it`);
  }
}

/* ---------- section 2, careers with a seed do not move ---------- */
const CLUBS = { now: ['Real Madrid', 'Everton', 'Aberdeen'], era2015: ['Bayern Munich', 'Stoke City', 'Carpi'], era2005: ['Chelsea', 'Bolton Wanderers', 'Treviso'] };
const s2 = { careers: 0, saves: 0, draws: 0, deals: 0, windows: 0 };
/** One seeded career on one engine: every saved string's hash, the draws, and the last state. */
function seededCareer(M, era, club, seed) {
  const saved = [];
  const run = tape(seed, () => {
    const keep = s => {
      M.store.clear();
      if (!M.cm.saveCareer(s)) { saved.push('refused'); return s; }
      saved.push(sha(M.store.get(M.cm.SAVE_KEY) ?? ''));
      return M.cm.loadCareer() ?? s;
    };
    let s = keep(M.cm.startCareer(club, era));
    if (M.cm.worldSeedOf(s) === undefined) return { error: 'a new career has no seed' };
    s = { ...s, budget: 9999, wageCap: 9999, transferWindow: 'summer' };
    let dealt = 0, windows = 0;
    const outfield = cur => cur.squad.filter(p => !p.onLoan && p.position !== 'GK');
    const low = [...outfield(s)].sort((x, y) => x.rating - y.rating || x.id.localeCompare(y.id))[0];
    const released = low && M.cm.releasePlayer(s, low.id);
    if (released) { s = keep(released); dealt += 1; }
    const mine = new Set(s.squad.map(p => p.name));
    const mp = M.cm.buildMarket(s).find(p => p.position !== 'GK' && p.age < 29 && p.rating < 80 && !mine.has(p.name));
    const bought = mp && M.cm.buyPlayer(s, mp);
    if (bought) { s = keep(bought); dealt += 1; }
    const man = [...outfield(s)].sort((x, y) => y.rating - x.rating || x.id.localeCompare(y.id))[1];
    const buyer = M.cm.buildMarket(s).find(p => p.club !== s.clubName)?.club;
    const sold = man && buyer && M.cm.acceptBid({ ...s, incomingBids: [...(s.incomingBids ?? []), { playerId: man.id, playerName: man.name, club: buyer, offer: 30, status: 'open' }] }, man.id);
    if (sold) { s = keep(sold); dealt += 1; }
    for (let season = 1; season <= 2; season += 1) {
      for (let guard = 0; guard < 400; guard += 1) {
        const r = M.cm.playNextEntry(s, PLAY);
        s = r.state;
        if (r.kind === 'window') { s = keep(s); windows += 1; }
        if (r.kind === 'seasonOver' || s.sacked) break;
      }
      if (s.sacked) break;
      s = M.cm.finishSeason(s).state;
      if (season === 2) break;
      s = keep(M.cm.startNextSeason(s));
    }
    return { state: sha(s), dealt, windows };
  });
  return { saved, draws: run.draws.length, drawHash: sha(run.draws), ...run.value };
}
async function seededSection(B, H) {
  for (const era of Object.keys(CLUBS)) for (const club of CLUBS[era]) for (const seed of [1, 2]) {
    const tag = `${club} (${era}, seed ${seed})`;
    const tapeSeed = parseInt(sha(`seeded|${era}|${club}|${seed}`).slice(0, 8), 16) >>> 0;
    const b = seededCareer(await B(), era, club, tapeSeed), h = seededCareer(await H(), era, club, tapeSeed);
    if (b.error || h.error) cannot(`section 2, ${tag}: ${b.error ?? h.error}`);
    s2.careers += 1; s2.saves += h.saved.length; s2.draws += h.draws; s2.deals += h.dealt; s2.windows += h.windows;
    const first = b.saved.findIndex((x, i) => x !== h.saved[i]);
    if (b.saved.length !== h.saved.length || first >= 0) fail(2, `${tag}: saved string ${first + 1} of ${b.saved.length} differs from BASE's (the head saved ${h.saved.length} times)`);
    else if (b.draws !== h.draws || b.drawHash !== h.drawHash) fail(2, `${tag}: Math.random draws ${h.draws} against BASE's ${b.draws}`);
    else if (b.state !== h.state) fail(2, `${tag}: the last state differs from BASE's`);
  }
}

/* ---------- the run ---------- */
const t0 = Date.now();
console.log(`simCmOldCareersWorld: BASE ${BASE.slice(0, 8)}${process.env.CM_OLD_WORLD_BASE ? ' (CM_OLD_WORLD_BASE)' : ''}, sections ${[...SECTIONS].join(', ')}${CONTROL ? `, control ${CONTROL}` : ''}`);
const baseEngine = await engine('base', { base: true });
const head = CONTROL === 'never' ? await engine('never', { edit: once('never', ADOPT, '') })
  : CONTROL === 'early' ? await engine('early', { edit: once('early', LOAD_REPAIR, `${LOAD_REPAIR}    Object.assign(parsed, adoptLivingWorld(parsed));\n`) })
  : CONTROL === 'bridge' ? await engine('bridge', { bridge: true })
  : await engine('head');
if (SECTIONS.has(1)) {
  s1.lastSummer = 0;
  await fixtureSection(baseEngine, head);
  console.log(`section 1: ${s1.saves} old saves, ${s1.compared} steps equal to BASE before the summer, ${s1.after} steps after it at ${s1.checkpoints} checkpoints; deals between two other clubs placed at their buyers: ${s1.summer} in the summer, ${s1.january} in January (${s1.placed} placements checked); ${s1.joined} joined rows on the screen; red by check ${JSON.stringify(counts)}`);
  for (const line of s1.ledgerBytes) console.log(`  ${line}`);
  if (!CONTROL && (!s1.saves || !s1.summer || !s1.january)) cannot(`section 1 measured nothing: ${s1.saves} saves, ${s1.summer} summer deals, ${s1.january} January deals`);
}
if (SECTIONS.has(2)) {
  await seededSection(baseEngine, head);
  console.log(`section 2: ${s2.careers} seeded careers, ${s2.saves} saves, ${s2.draws} draws, ${s2.windows} January windows and ${s2.deals} deals of mine on the head, ${(failures[2] ?? []).length} red`);
  if (!s2.careers || !s2.deals || !s2.windows) cannot('section 2 measured nothing');
}
const seconds = Math.round((Date.now() - t0) / 1000);
const red = n => (failures[n] ?? []).length;
if (CONTROL === 'never') {
  const fired = (counts.moved ?? 0) > 0 && !(counts.equal ?? 0);
  console.log(fired ? `simCmOldCareersWorld: control never FIRED: section 1's moved check red ${counts.moved} times, the comparison before the summer green (${seconds}s)`
    : `simCmOldCareersWorld: control never DID NOT FIRE: moved ${counts.moved ?? 0}, equal ${counts.equal ?? 0}`);
  process.exit(fired ? 1 : 3);
}
if (CONTROL === 'early') {
  const fired = (counts.equal ?? 0) > 0;
  console.log(fired ? `simCmOldCareersWorld: control early FIRED: section 1's comparison before the summer red ${counts.equal} times (${seconds}s)`
    : 'simCmOldCareersWorld: control early DID NOT FIRE: the comparison before the summer stayed green');
  process.exit(fired ? 1 : 3);
}
if (CONTROL === 'bridge') {
  console.log(red(2) ? `simCmOldCareersWorld: control bridge FIRED: section 2 red on ${red(2)} of ${s2.careers} seeded careers (${seconds}s)`
    : 'simCmOldCareersWorld: control bridge DID NOT FIRE: with the recording out the seeded careers still equal BASE');
  process.exit(red(2) ? 1 : 3);
}
const total = red(1) + red(2);
console.log(total ? `simCmOldCareersWorld: RED, ${total} failure(s) (section 1 ${red(1)}, section 2 ${red(2)}) (${seconds}s)`
  : `simCmOldCareersWorld: green, sections ${[...SECTIONS].join(', ')} held (${seconds}s)`);
process.exit(total ? 1 : 0);

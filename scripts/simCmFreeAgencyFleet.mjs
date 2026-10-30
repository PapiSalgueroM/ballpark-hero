/* Round 1597: Club Manager free agency, part one. Nobody vanishes.
 *
 * WHY. The owner, 2026-10-30: "if u dont resign a player in time then they just dissapear from the game." Until this
 * round a man whose deal ran out at my club went onto the free agent list and was deleted from it at his second
 * summer, with no line in the news (decayFreeAgents), and a man the summer trim let go was never written to it at
 * all. No AI club ever signs from the list, the market drops him, and the ledger's record of him is pruned once his
 * old club's projection stops listing him. He was simply gone.
 *
 * WHAT IT PLAYS. A fleet of seeded careers across the big five, two smaller leagues and the 2015 era, each played
 * SEASONS seasons (default 8) under two policies: renew nobody, and renew the best eleven in the last year of their
 * deals. Each summer before the season the weakest outfield man is released while the squad is over 22, so the
 * release door is walked too. The board is nudged up from under 35, the budget kept at 400 or more and the cap
 * lifted, so the run measures the list and not a sacking.
 *
 * WHAT IT HOLDS:
 *   section 1 CONSERVATION  every man who left my squad at a summer (his deal ran out, the club trimmed him, he
 *                           retired, a loan club bought him) or whom I released is, at every later summer, in at
 *                           least one of: my squad or out on loan from me, the free agent list, retiredNames, an AI
 *                           club's squad through the world ledger. Lost must be 0.
 *   section 2 RETIREMENT    men on the list do retire (the list is not a home for life): at least RETIRE_FLOOR
 *                           retirements off the list over the fleet, and every one of them is named on the new
 *                           season's first screen (freeAgentsRetired), nobody else.
 *
 * MEASURED on a GitHub runner (remote check r1597-s2a, 12 careers, 8 seasons each, three world seeds):
 *   main 14a9af704   626 men left a squad, 404 of them LOST (gone from every place by a later summer, 22 to 45 a
 *                    career), 0 retired off the list; list size at season 9 median 16, median age 22.
 *   this round       629 men left, lost 0, twice 0, 133 retired off the list (3 to 18 a career); list size at
 *                    season 9 median 43 (25 to 56; the renew nobody careers the biggest), median age 25.
 *   controls (r1597-s2b): deletepool 171 lost in 5 seasons; noretire 0 retirements; nodedupe 46 names twice.
 *   The old save fixture (written on main by this file's CM_FA_WRITE_OLD mode, remote check r1597-s2a): by the end
 *   of season 5 main had lost 12, 15 and 11 men at Everton, Ajax and Southampton 2015, of whom 4, 4 and 5 were
 *   still held by the ledger as released: those come back, the rest left no record and are not rebuilt.
 *   section 3 NOBODY TWICE  no tracked man is in two of those places at once, and no name is on the list twice.
 *   section 4 OLD SAVE      saves written by main (14a9af704) at the end of season 5, in a fixture: loading one
 *                           changes nothing on the list, its next summer puts back every man its ledger still holds
 *                           as released and nobody holds (recovered equals recoverable, at least one), keeps every
 *                           man it already listed, and the pass never runs twice.
 *
 * CONTROLS (CM_FA_CONTROL=name), each must turn its own section red (exit 1, the last line says FIRED):
 *   deletepool  decayFreeAgents deletes every man two summers after he arrived again (the old bug)   -> section 1
 *   noretire    nobody on the list ever retires                                                      -> section 2
 *   nodedupe    the old save pass forgets who is already on the list, so it lists him again          -> section 3
 *   norecover   the old save pass puts nobody back                                                    -> section 4
 * Exit 0 green, 1 red or a control that fired, 2 could not run, 3 a control that did not fire.
 *
 * MODES (not checks): CM_FA_WRITE_OLD=<file> plays the fixture careers on whatever engine this file sits beside and
 * writes the fixture (run it on main to make scripts/fixtures/cmFreeAgencyOldSaves.json). CM_FA_SEASON_ONE=1 prints
 * a hash of every fleet career's save at the end of season one, to diff against main's (this round acts at a
 * summer only). CM_FA_SKIP_OLD=1 runs sections 1 to 3 without the fixture (the baseline run on main).
 *
 *   node scripts/simCmFreeAgencyFleet.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import crypto from 'node:crypto';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CONTROL = process.env.CM_FA_CONTROL || '';
const WRITE_OLD = process.env.CM_FA_WRITE_OLD || '';
const SEASON_ONE = process.env.CM_FA_SEASON_ONE === '1';
const SKIP_OLD = process.env.CM_FA_SKIP_OLD === '1';
const FIXTURE = path.join(ROOT, 'scripts', 'fixtures', 'cmFreeAgencyOldSaves.json');
const cannot = why => { console.log(`simCmFreeAgencyFleet: cannot run: ${why}`); process.exit(2); };
const CORE = 'src/lib/clubManager.ts';
const lf = s => s.split('\r\n').join('\n');
const EDITS = {
  deletepool: [[CORE, '    .filter(f => !gone.has(f.name) && (!isJourneyman(f) || nextSeason - f.since < 2))\n',
    '    .filter(f => !gone.has(f.name) && nextSeason - f.since < 2)\n']],
  noretire: [
    [CORE, '    if (random() < retireChance(man.age, man.rating, man.position)) { retired.push({ name: f.name, age: man.age, rating: man.rating }); continue; }\n', ''],
    [CORE, '      if (r.status === \'retired\') { retired.push({ name: f.name, age: r.player.age, rating: r.player.rating }); continue; }\n', ''],
  ],
  nodedupe: [[CORE, '    ...career.freeAgents.map(f => f.name),\n    ...(career.retiredNames ?? []),\n  ]);\n',
    '    ...(career.retiredNames ?? []),\n  ]);\n']],
  norecover: [[CORE, '  return back.length ? { ...done, freeAgents: [...career.freeAgents, ...back] } : done;\n', '  return done;\n']],
};
if (CONTROL && !EDITS[CONTROL]) cannot(`unknown control ${CONTROL}`);
const applied = new Set();
const plugin = {
  name: 'fa-fleet-source',
  setup(b) {
    b.onLoad({ filter: /\.(ts|tsx|json)$/ }, args => {
      const rel = path.relative(ROOT, args.path).split(path.sep).join('/');
      if (!rel.startsWith('src/')) return null;
      let text = lf(fs.readFileSync(args.path, 'utf8'));
      for (const [file, from, to] of EDITS[CONTROL] ?? []) {
        if (file !== rel) continue;
        const n = text.split(from).length - 1;
        if (n !== 1) cannot(`control ${CONTROL}: its anchor is in ${file} ${n} times, it must be exactly once: ${from.trim().slice(0, 80)}`);
        text = text.replace(from, () => to); applied.add(from);
      }
      return { contents: text, loader: path.extname(args.path).slice(1), resolveDir: path.dirname(args.path) };
    });
  },
};
const entry = "export * as cm from './src/lib/clubManager';\nexport * as eras from './src/lib/clubManagerEras';\nexport * as ledger from './src/lib/clubManagerWorldRoster';\n";
const out = await build({ stdin: { contents: entry, resolveDir: ROOT, sourcefile: 'fa-fleet.ts', loader: 'ts' },
  bundle: true, write: false, format: 'cjs', platform: 'node', target: 'node20', plugins: [plugin], logLevel: 'silent' });
if (CONTROL && applied.size !== EDITS[CONTROL].length) cannot(`control ${CONTROL}: ${applied.size} of its ${EDITS[CONTROL].length} edits were made`);
const module = { exports: {} }; const store = new Map(); const NOW = 1791633600000;
class HeldDate extends Date { constructor(...a) { super(...(a.length ? a : [NOW])); } static now() { return NOW; } }
const require = createRequire(path.join(ROOT, 'package.json'));
const ctx = vm.createContext({ module, exports: module.exports, require,
  console, process, Buffer, Math, Date: HeldDate, URL, URLSearchParams, TextEncoder, TextDecoder, structuredClone, performance,
  setTimeout, clearTimeout, setInterval, clearInterval, fetch: () => Promise.reject(new Error('no network here')),
  localStorage: { getItem: k => store.get(k) ?? null, setItem: (k, v) => store.set(k, String(v)), removeItem: k => store.delete(k), clear: () => store.clear() } });
new vm.Script(out.outputFiles[0].text, { filename: 'fa-fleet.cjs' }).runInContext(ctx);
const { cm, eras, ledger } = module.exports;
await eras.ensureAllEraRosters();
const lz = require('lz-string');

/* ---------- playing ---------- */
const SEASONS = Number(process.env.CM_FA_SEASONS || 8);
const OPT = { skipHalftime: true, noCoach: true };
function stream(seed) { let s = seed >>> 0; return () => { s = (s + 0x6d2b79f5) >>> 0; let v = s; v = Math.imul(v ^ v >>> 15, v | 1); v ^= v + Math.imul(v ^ v >>> 7, v | 61); return ((v ^ v >>> 14) >>> 0) / 4294967296; }; }
const median = a => a.length ? [...a].sort((x, y) => x - y)[Math.floor(a.length / 2)] : NaN;
const isJourneyman = f => f.reason === 'unattached' && f.generated === true;
const nameCount = (list, name) => list.reduce((n, x) => n + (x === name ? 1 : 0), 0);
const CLUBS = [['Everton', 'now'], ['Villarreal', 'now'], ['Freiburg', 'now'], ['Ajax', 'now'], ['Braga', 'now'], ['Southampton', 'era2015']];
const POLICIES = ['none', 'eleven'];
const SEEDS = [0x1597a1, 0x1597b2, 0x1597c3];
const OLD_CAREERS = [['Everton', 'now', 0x01d1], ['Ajax', 'now', 0x01d2], ['Southampton', 'era2015', 0x01d3]];
const OLD_AT = 5;

function playSeason(s) {
  for (let i = 0; i < 400; i += 1) {
    if (s.boardConfidence < 35) s = { ...s, boardConfidence: 55 };
    const r = cm.playNextEntry(s, OPT); s = r.state;
    if (r.kind === 'seasonOver' || s.sacked) break;
  }
  return s;
}
/* Before the season: money kept up, the cap lifted, and the weakest outfield man released while the squad is over 22. */
function preseason(s, track) {
  s = { ...s, budget: Math.max(s.budget, 400), wageCap: 99999 };
  if (s.squad.length <= 22) return s;
  const weakest = [...s.squad].filter(p => !p.onLoan && p.position !== 'GK').sort((a, b) => a.rating - b.rating || a.id.localeCompare(b.id))[0];
  const next = weakest && cm.releasePlayer(s, weakest.id);
  if (next) { track(weakest, 'released by me', s); return next; }
  return s;
}
/* After the season: the best eleven in the last year of their deals are renewed (the 'eleven' policy). */
function renewBestEleven(s) {
  const best = new Set([...s.squad].filter(p => !p.onLoan).sort((a, b) => b.rating - a.rating || a.id.localeCompare(b.id)).slice(0, 11).map(p => p.id));
  for (const p of cm.expiringPlayers(s)) if (best.has(p.id)) s = cm.renewContract({ ...s, budget: Math.max(s.budget, 400) }, p.id) ?? s;
  return s;
}
/* Where a man is: my squad (or out on loan from me), the list, retiredNames, an AI club through the ledger. */
function placesOf(s, man, records) {
  const squad = s.squad.some(p => p.name === man.name) || (s.loanedOut ?? []).some(l => l.player.name === man.name) ? 1 : 0;
  const pool = nameCount((s.freeAgents ?? []).map(f => f.name), man.name);
  const retired = (s.retiredNames ?? []).includes(man.name) ? 1 : 0;
  const rec = records.find(r => r.player.name === man.name && r.origin.birthYear === man.birth && r.status === 'owned' && r.owner && r.owner !== s.clubName);
  const ai = rec && cm.worldRosterFor(s, rec.owner).some(p => p.n === man.name) ? 1 : 0;
  return { squad, pool, retired, ai, total: squad + pool + retired + ai };
}

const failures = { 1: [], 2: [], 3: [], 4: [] };
const fail = (section, line) => { failures[section].push(line); if (failures[section].length <= 8) console.log(`  FAIL section ${section}: ${line}`); };
const totals = { careers: 0, tracked: 0, checks: 0, lost: 0, twice: 0, poolRetired: 0, unseen: 0 };
const endAges = [], endSizes = [];

/* One career. atSeasonEnd(s, season, tracked) may stop it (return true) after a season's finishSeason, before its summer. */
function runCareer(club, eraId, seed, policy, seasons, atSeasonEnd) {
  Math.random = stream(seed);
  let s = cm.startCareer(club, eraId);
  if (s.worldSeed === undefined) cannot(`${club}: a new career carries no worldSeed`);
  const tracked = new Map();
  const track = (p, how, st) => { if (!tracked.has(p.name)) tracked.set(p.name, { name: p.name, birth: cm.worldYear(st) - p.age, how, done: false }); };
  const row = { club, eraId, policy, tracked: 0, lost: 0, twice: 0, retiredOff: 0 };
  for (let season = 1; season <= seasons; season += 1) {
    s = preseason(s, track);
    s = playSeason(s);
    if (s.sacked) { console.log(`  ${club} ${policy}: sacked in season ${season}, the run stops there`); break; }
    s = cm.finishSeason(s).state;
    if (policy === 'eleven') s = renewBestEleven(s);
    if (atSeasonEnd && atSeasonEnd(s, season, tracked)) return { s, tracked, row };
    const before = s;
    const leaving = [...before.squad.filter(p => !p.onLoan), ...(before.loanedOut ?? []).map(l => l.player)];
    s = cm.startNextSeason(s);
    const stay = new Set([...s.squad.map(p => p.name), ...(s.loanedOut ?? []).map(l => l.player.name)]);
    for (const p of leaving) if (!stay.has(p.name)) track(p, 'left at a summer', before);
    /* Section 2: who retired off the list this summer, and whether the news said so. */
    const wasRetired = new Set(before.retiredNames ?? []);
    const offList = (before.freeAgents ?? []).filter(f => !isJourneyman(f) && !wasRetired.has(f.name) && (s.retiredNames ?? []).includes(f.name));
    row.retiredOff += offList.length;
    const said = new Set((s.freeAgentsRetired ?? []).map(r => r.name));
    const unsaid = offList.filter(f => !said.has(f.name));
    if (unsaid.length || said.size !== offList.length) {
      totals.unseen += 1; fail(2, `${club} ${policy} summer ${season}: ${offList.length} retired off the list, the new season's first screen names ${said.size} of them (${unsaid.map(f => f.name).slice(0, 3).join(', ')} unsaid)`);
    }
    /* Sections 1 and 3: every man tracked so far, at this summer. */
    const records = ledger.readWorldRoster(s)?.records ?? [];
    for (const man of tracked.values()) {
      if (man.done) continue;
      const at = placesOf(s, man, records); totals.checks += 1;
      if (at.total === 0) { row.lost += 1; man.done = true; fail(1, `${club} ${eraId} ${policy}, summer into season ${season + 1}: ${man.name} (${man.how}) is in no squad, not on the list and not retired`); continue; }
      if (at.total > 1 || at.pool > 1) { row.twice += 1; fail(3, `${club} ${policy}, season ${season + 1}: ${man.name} is in ${JSON.stringify(at)}`); }
      if (at.retired) man.done = true;
    }
    const names = (s.freeAgents ?? []).map(f => f.name);
    const dup = names.filter((n, i) => names.indexOf(n) !== i);
    if (dup.length) { row.twice += dup.length; fail(3, `${club} ${policy}, season ${season + 1}: on the list twice: ${[...new Set(dup)].join(', ')}`); }
  }
  row.tracked = tracked.size;
  return { s, tracked, row };
}

/* ---------- mode: write the old save fixture (run on main) ---------- */
if (WRITE_OLD) {
  const saves = [];
  for (const [club, eraId, seed] of OLD_CAREERS) {
    let captured = null;
    runCareer(club, eraId, seed, 'none', OLD_AT, (s, season, tracked) => {
      if (season !== OLD_AT) return false;
      const records = ledger.readWorldRoster(s)?.records ?? [];
      const gone = [...tracked.values()].filter(m => placesOf(s, m, records).total === 0).map(m => m.name);
      const recoverable = gone.filter(n => records.some(r => r.player.name === n && r.status === 'released' && r.owner === null));
      captured = { club, eraId, seed, season, lostOnMain: gone, recoverableOnMain: recoverable, save: lz.compressToBase64(JSON.stringify(s)) };
      return true;
    });
    if (!captured) cannot(`${club}: the fixture career did not reach the end of season ${OLD_AT}`);
    console.log(`  fixture ${club} ${eraId}: ${captured.lostOnMain.length} men gone from the game by the end of season ${OLD_AT}, ${captured.recoverableOnMain.length} of them still held by the ledger as released`);
    saves.push(captured);
  }
  fs.mkdirSync(path.dirname(path.resolve(WRITE_OLD)), { recursive: true });
  fs.writeFileSync(WRITE_OLD, JSON.stringify({ base: process.env.CM_FA_BASE || 'unknown', season: OLD_AT, saves }, null, 1) + '\n');
  console.log(`simCmFreeAgencyFleet: wrote ${saves.length} saves to ${WRITE_OLD}`);
  process.exit(0);
}

/* ---------- mode: season one hashes (diff against main's) ---------- */
if (SEASON_ONE) {
  CLUBS.forEach(([club, eraId], i) => POLICIES.forEach((policy, j) => {
    runCareer(club, eraId, SEEDS[i % SEEDS.length] + j * 0x101 + i, policy, 1, s => {
      console.log(`  ${club} ${eraId} ${policy}: ${crypto.createHash('sha256').update(JSON.stringify(s)).digest('hex').slice(0, 20)}`);
      return true;
    });
  }));
  console.log('simCmFreeAgencyFleet: season one hashes printed');
  process.exit(0);
}

/* ---------- sections 1 to 3: the fleet ---------- */
CLUBS.forEach(([club, eraId], i) => POLICIES.forEach((policy, j) => {
  const { s, row } = runCareer(club, eraId, SEEDS[i % SEEDS.length] + j * 0x101 + i, policy, SEASONS);
  totals.careers += 1; totals.tracked += row.tracked; totals.lost += row.lost; totals.twice += row.twice; totals.poolRetired += row.retiredOff;
  const real = (s.freeAgents ?? []).filter(f => !isJourneyman(f));
  const age = median(real.map(f => f.age));
  if (real.length) endAges.push(age);
  endSizes.push(real.length);
  console.log(`  ${club} ${eraId} ${policy}: ${row.tracked} men left, lost ${row.lost}, twice ${row.twice}, ${row.retiredOff} retired off the list; at season ${s.season} ${real.length} on the list besides the journeymen, median age ${age}`);
}));

/* ---------- section 4: saves written by main ---------- */
let recoverableTotal = 0, recoveredTotal = 0;
if (!SKIP_OLD) {
  if (!fs.existsSync(FIXTURE)) cannot(`no fixture at ${FIXTURE}: write it on main with CM_FA_WRITE_OLD`);
  const fixture = JSON.parse(fs.readFileSync(FIXTURE, 'utf8'));
  for (const entry of fixture.saves) {
    const saved = JSON.parse(lz.decompressFromBase64(entry.save));
    store.clear(); store.set(cm.SAVE_KEY, JSON.stringify(saved));
    const loaded = cm.loadCareer();
    if (!loaded) { fail(4, `${entry.club}: the old save does not load`); continue; }
    if (loaded.freeAgencyV2 !== undefined) fail(4, `${entry.club}: loading the old save marked it recovered before any summer`);
    if (JSON.stringify(loaded.freeAgents) !== JSON.stringify(saved.freeAgents)) fail(4, `${entry.club}: loading the old save changed its free agent list`);
    const records = ledger.readWorldRoster(loaded)?.records ?? [];
    const here = new Set([...loaded.squad.map(p => p.name), ...(loaded.loanedOut ?? []).map(l => l.player.name),
      ...(loaded.freeAgents ?? []).map(f => f.name), ...(loaded.retiredNames ?? [])]);
    const recoverable = [...new Set(records.filter(r => r.status === 'released' && r.owner === null && !here.has(r.player.name)).map(r => r.player.name))];
    Math.random = stream(entry.seed + 0x77);
    const next = cm.startNextSeason(loaded);
    const there = new Set([...next.squad.map(p => p.name), ...(next.freeAgents ?? []).map(f => f.name), ...(next.retiredNames ?? [])]);
    const back = recoverable.filter(n => there.has(n));
    recoverableTotal += recoverable.length; recoveredTotal += back.length;
    for (const n of recoverable) if (!there.has(n)) fail(4, `${entry.club}: ${n}, held by the ledger as released and listed nowhere, did not come back at the next summer`);
    for (const f of (saved.freeAgents ?? []).filter(x => !isJourneyman(x))) if (!there.has(f.name)) fail(4, `${entry.club}: ${f.name}, on the old save's list, is gone after its next summer`);
    const names = (next.freeAgents ?? []).map(f => f.name);
    const dup = names.filter((n, k) => names.indexOf(n) !== k);
    if (dup.length) fail(3, `${entry.club} old save: on the list twice after its summer: ${[...new Set(dup)].join(', ')}`);
    if (next.freeAgencyV2 !== true) fail(4, `${entry.club}: the summer did not mark the save as recovered`);
    if (cm.recoverPooledReleases(next) !== next) fail(4, `${entry.club}: the recovery would run a second time`);
    console.log(`  old save ${entry.club} ${entry.eraId} (written on ${fixture.base}, end of season ${entry.season}): main had lost ${entry.lostOnMain.length} men, ${entry.recoverableOnMain.length} of them recoverable; recoverable here ${recoverable.length}, back after the summer ${back.length}`);
  }
  if (recoverableTotal < 1) fail(4, 'the fixture holds nobody to recover, so the pass cannot be shown to work');
}

/* ---------- the verdict ---------- */
/* Floors, a tenth of what the fleet made on its first measured run (629 men left, 133 retired off the list, r1597-s2a),
   so a run that stops dealing cannot pass by having nothing to check. */
const TRACK_FLOOR = 60, RETIRE_FLOOR = 13;
if (totals.tracked < TRACK_FLOOR) fail(1, `only ${totals.tracked} men left a squad over the fleet, under ${TRACK_FLOOR}`);
if (totals.poolRetired < RETIRE_FLOOR) fail(2, `only ${totals.poolRetired} men retired off the list over the fleet, under ${RETIRE_FLOOR}`);
console.log(`simCmFreeAgencyFleet: ${totals.careers} careers to season ${SEASONS + 1}; ${totals.tracked} men left a squad, ${totals.checks} summer checks; lost ${totals.lost}, twice ${totals.twice}; ${totals.poolRetired} retired off the list (${totals.unseen} summers unseen); list size at the end median ${median(endSizes)}, its median age median ${median(endAges)}${SKIP_OLD ? '; old saves skipped' : `; old saves recoverable ${recoverableTotal}, recovered ${recoveredTotal}`}`);
const red = Object.entries(failures).filter(([, list]) => list.length).map(([k, list]) => `${k} (${list.length})`);
const TARGET = { deletepool: '1', noretire: '2', nodedupe: '3', norecover: '4' }[CONTROL];
if (CONTROL) {
  if (failures[TARGET].length) { console.log(`simCmFreeAgencyFleet: CONTROL ${CONTROL} FIRED: section ${TARGET} red${red.length > 1 ? ` (red: ${red.join(', ')})` : ''}`); process.exit(1); }
  console.log(`simCmFreeAgencyFleet: CONTROL ${CONTROL} DID NOT FIRE: section ${TARGET} stayed green (red: ${red.join(', ') || 'none'})`); process.exit(3);
}
if (red.length) { console.log(`simCmFreeAgencyFleet: RED, sections ${red.join(', ')}`); process.exit(1); }
console.log(`simCmFreeAgencyFleet: green, all ${SKIP_OLD ? 'three' : 'four'} sections held`);

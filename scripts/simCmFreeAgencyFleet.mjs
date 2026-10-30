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
 * ADDED BY THE REVIEW FIX (both reviews of Round 1597 found rules no section above could see: mutations of the trim
 * push, of the ledger match and of the summer's year were green on every section, r1597-run-mutA and mutB, and a man
 * out on loan in his last year walked unseen, r1597-run-loan):
 *   section 5 TRIM          four more careers (TRIM_CAREERS) take 16 made up surplus men before season one's summer,
 *                           so the summer trim has to fire; every man it trims is on the free agent list after that
 *                           summer (and section 1 follows him at every later one). At least TRIM_FLOOR trimmed.
 *                           Closing check fix: and he is listed as a man of mine (fromMyClub, marked trimmed), never
 *                           barred as a man I released, so the desk answers 'justLeft' that season (FA-1 rule 4).
 *   section 6 LEDGER        FA-1 rule 2, over every summer of every career: a list man the ledger holds (exactly one
 *                           released or retired record with no owner, by name, birth year and position) carries that
 *                           record's age and rating and is not on the list if it says retired; and every man still on
 *                           the list a summer later is exactly one year older. Floors HELD_FLOOR and AGED_FLOOR.
 *   section 7 UNSEEN        FA-2 over every summer: nobody whose deal ran out leaves without having been in
 *                           expiringDeals (what the review's checkpoint and the hub line read), a man out on loan
 *                           included; the trim careers lend their best final year man before seasons one and two,
 *                           and at Ajax and Freiburg renew him on loan at the season's end: he must not walk.
 *   MEASURED (remote check r1597-fx3, head 843e19bef): 762 men left a squad over the 16 careers, lost 0; the trim
 *   let 12 go (Everton 3, Ajax 5, Freiburg 4, Southampton 2015 none: its walkers alone brought it to 30), all 12
 *   listed as released and not mine; 684 ledger held list men all agreed with their records, 1,860 list men seen a
 *   summer on were all exactly a year older; 4 men out on loan in their last year left at a summer, every one of
 *   them listed first, and the 4 renewed on loan came home. The probe the review used found the same: 12 trimmed,
 *   12 listed; ledger agreement 80 of 80 (r1597-run-trim2). Controls, each exit 1 and FIRED for its own section:
 *   notrimpool 12 trimmed men unlisted (and section 1 lost 12); ledgeroff "Christian Nørgaard is on the list and his
 *   ledger record says retired"; staleseason "Jordan Pickford was 32 on the list a summer ago and is 32 now";
 *   noloanrow 4 lent men's deals ran out unlisted; norenewloan 3 of the 4 men renewed on loan walked (refused).
 *
 * CONTROLS (CM_FA_CONTROL=name), each must turn its own section red (exit 1, the last line says FIRED):
 *   deletepool  decayFreeAgents deletes every man two summers after he arrived again (the old bug)   -> section 1
 *   noretire    nobody on the list ever retires                                                      -> section 2
 *   nodedupe    the old save pass forgets who is already on the list, so it lists him again          -> section 3
 *   norecover   the old save pass puts nobody back                                                    -> section 4
 *   notrimpool  the trim's men are written to a throwaway array, never the list (main's bug)          -> section 5
 *   trimstranger the trim writes its men without fromMyClub or the trimmed mark (the build as reviewed) -> section 5
 *   trimbar     releasedByYou ignores the trimmed mark, so a trimmed man is barred for ever          -> section 5
 *   ledgeroff   summerFreeAgents' ledger match is a birth year off, so the ledger path never runs    -> section 6
 *   staleseason summerFreeAgents reads the ledger at this year, so a ledger held man skips a year    -> section 6
 *   noloanrow   expiringDeals forgets the men out on loan (the round as first built)                 -> section 7
 *   norenewloan a renewal looks in the squad only, so a man out on loan cannot be kept              -> section 7
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
import zlib from 'node:zlib';
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
  /* Review fix (r1597-run-mutA and mutB): the three one token edits every section above passed. */
  notrimpool: [[CORE, '      walkedFree619.push(...squad.filter(p => cut.has(p.id)).map(p => ({\n',
    '      ([] as FreeAgent[]).push(...squad.filter(p => cut.has(p.id)).map(p => ({\n']],
  /* Closing check fix (FA-1 rule 4): the trim's men as a stranger (the build as reviewed), or barred for ever. */
  trimstranger: [[CORE, '        founderSaleRatio: p.founderSaleRatio, reason: \'released\' as const, fromMyClub: true as const, trimmed: true as const,\n',
    '        founderSaleRatio: p.founderSaleRatio, reason: \'released\' as const,\n']],
  trimbar: [[CORE, '  return fa.fromMyClub === true && fa.reason === \'released\' && fa.trimmed !== true;\n',
    '  return fa.fromMyClub === true && fa.reason === \'released\';\n']],
  ledgeroff: [[CORE, '&& r.origin.birthYear === year - f.age && r.player.position === f.position);\n',
    '&& r.origin.birthYear === year - f.age - 1 && r.player.position === f.position);\n']],
  staleseason: [[CORE, '  const nextSeason = career.season + 1, year = worldYear(career);\n', '  const nextSeason = career.season, year = worldYear(career);\n']],
  /* Review fix (r1597-run-loan): the deal of a man out on loan, unseen and unrenewable. */
  noloanrow: [[CORE, '    ...(career.loanedOut ?? []).filter(l => (l.player.contractYears ?? 9) <= 1).map(l => ({ player: l.player, loanClub: l.club })),\n', '']],
  norenewloan: [[CORE, '  return career.squad.find(x => x.id === playerId) ?? (career.loanedOut ?? []).find(l => l.player.id === playerId)?.player;\n',
    '  return career.squad.find(x => x.id === playerId);\n']],
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
/* The fixture's saves are gzip in hex: base64 text can spell a banned word by chance (simNoRivalNames found one in
   the first fixture), hex has no letter past f. */
const pack = s => zlib.gzipSync(Buffer.from(JSON.stringify(s), 'utf8'), { level: 9 }).toString('hex');
const unpack = hex => JSON.parse(zlib.gunzipSync(Buffer.from(hex, 'hex')).toString('utf8'));

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

const failures = { 1: [], 2: [], 3: [], 4: [], 5: [], 6: [], 7: [] };
const fail = (section, line) => { failures[section].push(line); if (failures[section].length <= 8) console.log(`  FAIL section ${section}: ${line}`); };
const totals = { careers: 0, tracked: 0, checks: 0, lost: 0, twice: 0, poolRetired: 0, unseen: 0,
  ledgerHeld: 0, aged: 0, trimmed: 0, trimMine: 0, lentFinal: 0, lentWalked: 0, lentRenewed: 0 };
const endAges = [], endSizes = [];

/* One career. atSeasonEnd(s, season, tracked) may stop it (return true) after a season's finishSeason, before its summer.
   hooks (sections 5 and 7's careers only): preseason(s, season) and beforeSummer(s, season) return the state to play
   on; afterSummer(before, s, season) reads the summer. */
function runCareer(club, eraId, seed, policy, seasons, atSeasonEnd, hooks = {}) {
  Math.random = stream(seed);
  let s = cm.startCareer(club, eraId);
  if (s.worldSeed === undefined) cannot(`${club}: a new career carries no worldSeed`);
  const tracked = new Map();
  const track = (p, how, st) => { if (!tracked.has(p.name)) tracked.set(p.name, { name: p.name, birth: cm.worldYear(st) - p.age, how, done: false }); };
  const row = { club, eraId, policy, tracked: 0, lost: 0, twice: 0, retiredOff: 0 };
  for (let season = 1; season <= seasons; season += 1) {
    s = preseason(s, track);
    if (hooks.preseason) s = hooks.preseason(s, season);
    s = playSeason(s);
    if (s.sacked) { console.log(`  ${club} ${policy}: sacked in season ${season}, the run stops there`); break; }
    s = cm.finishSeason(s).state;
    if (policy === 'eleven') s = renewBestEleven(s);
    if (atSeasonEnd && atSeasonEnd(s, season, tracked)) return { s, tracked, row };
    if (hooks.beforeSummer) s = hooks.beforeSummer(s, season);
    const before = s;
    const leaving = [...before.squad.filter(p => !p.onLoan), ...(before.loanedOut ?? []).map(l => l.player)];
    s = cm.startNextSeason(s);
    const stay = new Set([...s.squad.map(p => p.name), ...(s.loanedOut ?? []).map(l => l.player.name)]);
    for (const p of leaving) if (!stay.has(p.name)) track(p, 'left at a summer', before);
    if (hooks.afterSummer) hooks.afterSummer(before, s, season);
    /* Section 7: nobody whose deal ran out left at the summer without the season review having listed him first
       (expiringDeals is what the review's checkpoint and the hub line read), a man out on loan included. */
    const asked = new Set(cm.expiringDeals(before).map(d => d.player.id));
    for (const p of leaving) {
      if ((p.contractYears ?? 9) > 1 || stay.has(p.name) || (s.retiredNames ?? []).includes(p.name)) continue;
      if (!asked.has(p.id)) fail(7, `${club} ${policy}, summer into season ${season + 1}: ${p.name}'s deal ran out and the season review never listed him${(before.loanedOut ?? []).some(l => l.player.id === p.id) ? ' (he was out on loan)' : ''}`);
    }
    for (const l of before.loanedOut ?? []) {
      if ((l.player.contractYears ?? 9) > 1) continue;
      totals.lentFinal += 1;
      if (!stay.has(l.player.name)) totals.lentWalked += 1;
    }
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
    /* Section 6: FA-1 rule 2. A list man the ledger holds (exactly one released or retired record with no owner, by
       name, birth year and position: summerFreeAgents' own match) carries that record's age and rating, and is not
       on the list if it says retired; and every man still on the list a summer on is exactly a year older. */
    const year = cm.worldYear(s);
    const lastList = new Map((before.freeAgents ?? []).filter(f => !isJourneyman(f)).map(f => [f.name, f]));
    for (const f of (s.freeAgents ?? []).filter(x => !isJourneyman(x))) {
      const held = records.filter(r => r.owner === null && (r.status === 'released' || r.status === 'retired')
        && r.origin.name === f.name && r.origin.birthYear === year - f.age && r.player.position === f.position);
      if (held.length === 1) {
        totals.ledgerHeld += 1;
        if (held[0].status === 'retired') fail(6, `${club} ${policy}, season ${season + 1}: ${f.name} is on the list and his ledger record says retired`);
        else if (held[0].player.age !== f.age || held[0].player.rating !== f.rating) fail(6, `${club} ${policy}, season ${season + 1}: ${f.name} is ${f.age}, rated ${f.rating} on the list and ${held[0].player.age}, rated ${held[0].player.rating} on his ledger record`);
      }
      const was = lastList.get(f.name);
      if (was) { totals.aged += 1; if (f.age !== was.age + 1) fail(6, `${club} ${policy}, season ${season + 1}: ${f.name} was ${was.age} on the list a summer ago and is ${f.age} now`); }
    }
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
      captured = { club, eraId, seed, season, lostOnMain: gone, recoverableOnMain: recoverable, save: pack(s) };
      return true;
    });
    if (!captured) cannot(`${club}: the fixture career did not reach the end of season ${OLD_AT}`);
    console.log(`  fixture ${club} ${eraId}: ${captured.lostOnMain.length} men gone from the game by the end of season ${OLD_AT}, ${captured.recoverableOnMain.length} of them still held by the ledger as released`);
    saves.push(captured);
  }
  fs.mkdirSync(path.dirname(path.resolve(WRITE_OLD)), { recursive: true });
  fs.writeFileSync(WRITE_OLD, JSON.stringify({ base: process.env.CM_FA_BASE || 'unknown', season: OLD_AT, saves, encoding: 'gzip-hex' }, null, 1) + '\n');
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

/* ---------- sections 5 and 7: the summer trim and the men out on loan ---------- */
/* The main fleet's preseason keeps squads at 22, far under the trim's 30, so the trim never fired in it (the review's
   probe counted 0 in 12 careers by 8 seasons), and it never lends a man out. These careers do both: before season
   one's summer the squad takes 16 made up surplus men (rated like its weakest outfield man, potential no higher,
   three years on their deals), so the summer has to trim it back to SQUAD_LIMIT; and before seasons one and two
   the best man in his last year whom loanOutRefusal allows is lent out. At Ajax and Freiburg that man is renewed at
   the season's end (where he is, on loan); at Everton and Southampton he is not, and walks. Sections 1, 3, 6 and 7
   read these summers too. The trimmed men are tracked by section 1 at every later summer. */
const TRIM_CAREERS = [['Everton', 'now', 0x71, false], ['Ajax', 'now', 0x72, true], ['Southampton', 'era2015', 0x73, false], ['Freiburg', 'now', 0x74, true]];
const renewedLent = [];
for (const [club, eraId, seed, renewLent] of TRIM_CAREERS) {
  const lentNames = new Set();
  const hooks = {
    preseason: (s, season) => {
      if (season > 2) return s;
      const man = cm.expiringPlayers(s).find(p => p.position !== 'GK' && cm.loanOutRefusal(s, p.id) === null);
      const lent = man && cm.loanOutPlayer(s, man.id);
      if (lent) lentNames.add(man.name);
      return lent || s;
    },
    beforeSummer: (s, season) => {
      if (renewLent) {
        for (const l of s.loanedOut ?? []) {
          if (!lentNames.has(l.player.name) || (l.player.contractYears ?? 9) > 1) continue;
          const next = cm.renewContract({ ...s, budget: Math.max(s.budget, 400) }, l.player.id);
          renewedLent.push({ club, name: l.player.name, season, renewed: !!next });
          if (next) s = next;
        }
      }
      if (season !== 1) return s;
      const weak = [...s.squad].filter(p => !p.onLoan && p.position !== 'GK').sort((a, b) => a.rating - b.rating || a.id.localeCompare(b.id))[0];
      const clones = Array.from({ length: 16 }, (_, i) => ({ ...weak, id: `fleet-trim-${seed}-${i}`, name: `Fleet Trim ${seed}${i}`, age: 21,
        contractYears: 3, generated: true, worldRosterKey: undefined, isYouth: false, academyGrad: false, potential: weak.rating }));
      return { ...s, squad: [...s.squad, ...clones] };
    },
    afterSummer: (before, s, season) => {
      for (const r of renewedLent.filter(x => x.club === club && x.season === season)) {
        totals.lentRenewed += 1;
        if ((s.freeAgents ?? []).some(f => f.name === r.name)) fail(7, `${club}: ${r.name}, out on loan and renewed at the end of season ${season}, walked onto the free agent list at the summer${r.renewed ? '' : ' (the renewal was refused)'}`);
      }
      if (season !== 1) return;
      const after = new Set([...s.squad.map(p => p.name), ...(s.loanedOut ?? []).map(l => l.player.name), ...(s.retiredNames ?? [])]);
      const trimmed = before.squad.filter(p => !p.onLoan && (p.contractYears ?? 9) > 1 && !after.has(p.name));
      totals.trimmed += trimmed.length;
      const reasons = {};
      for (const p of trimmed) {
        const f = (s.freeAgents ?? []).find(x => x.name === p.name);
        if (!f) { fail(5, `${club}: ${p.name}, trimmed at the summer (squad ${before.squad.length}, limit ${cm.SQUAD_LIMIT}), is not on the free agent list`); continue; }
        reasons[`${f.reason}${f.fromMyClub ? ' mine' : ''}`] = (reasons[`${f.reason}${f.fromMyClub ? ' mine' : ''}`] ?? 0) + 1;
        /* Closing check fix (FA-1 rule 4): he left my club, so he is mine (the season away, no stranger's rule), and
           the club cut him, not me, so he is never barred as a man I released. In the season he left that is exactly
           the engine's 'justLeft' answer, which neither a stranger nor a barred man gets. */
        const block = cm.freeAgentBlock(s, f);
        if (!f.fromMyClub || !f.trimmed || cm.releasedByYou(f) || cm.releasedByYouNames(s).has(p.name) || block !== 'justLeft') {
          fail(5, `${club}: ${p.name}, trimmed at the summer, is listed ${f.reason}${f.fromMyClub ? ', mine' : ', not mine'}${f.trimmed ? ', trimmed' : ''} and the desk answers ${block ?? 'Sign'} (want 'justLeft', never barred)`);
        } else totals.trimMine += 1;
      }
      console.log(`  trim ${club} ${eraId}: squad ${before.squad.length} into the summer, ${s.squad.length} after; ${trimmed.length} trimmed, listed as ${JSON.stringify(reasons)}; lent out ${[...lentNames].join(', ') || 'nobody'}`);
    },
  };
  const { row } = runCareer(club, eraId, seed, 'none', 3, null, hooks);
  totals.tracked += row.tracked; totals.lost += row.lost; totals.twice += row.twice; totals.poolRetired += row.retiredOff;
}

/* ---------- section 4: saves written by main ---------- */
let recoverableTotal = 0, recoveredTotal = 0;
if (!SKIP_OLD) {
  if (!fs.existsSync(FIXTURE)) cannot(`no fixture at ${FIXTURE}: write it on main with CM_FA_WRITE_OLD`);
  const fixture = JSON.parse(fs.readFileSync(FIXTURE, 'utf8'));
  for (const entry of fixture.saves) {
    const saved = unpack(entry.save);
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
/* Sections 5 to 7's floors, so a run that stops trimming, stops reaching the ledger or stops lending cannot pass by
   having nothing to check: a tenth of the first measured run for the ledger counts (684 held, 1,860 a summer on),
   a third for the 12 trimmed and half for the 4 and 4 men out on loan (remote check r1597-fx3). */
const TRIM_FLOOR = 4, HELD_FLOOR = 68, AGED_FLOOR = 186, LENT_FLOOR = 2, RENEWED_LENT_FLOOR = 2;
if (totals.trimmed < TRIM_FLOOR) fail(5, `only ${totals.trimmed} men were trimmed at a summer, under ${TRIM_FLOOR}`);
if (totals.ledgerHeld < HELD_FLOOR) fail(6, `only ${totals.ledgerHeld} list men were held by the ledger at a summer, under ${HELD_FLOOR}`);
if (totals.aged < AGED_FLOOR) fail(6, `only ${totals.aged} list men were seen a summer on, under ${AGED_FLOOR}`);
if (totals.lentFinal < LENT_FLOOR) fail(7, `only ${totals.lentFinal} men were out on loan in their last year at a summer, under ${LENT_FLOOR}`);
if (totals.lentRenewed < RENEWED_LENT_FLOOR) fail(7, `only ${totals.lentRenewed} men out on loan were renewed, under ${RENEWED_LENT_FLOOR}`);
console.log(`simCmFreeAgencyFleet: ${totals.careers} careers to season ${SEASONS + 1}, ${TRIM_CAREERS.length} trim and loan careers to season 4; ${totals.tracked} men left a squad, ${totals.checks} summer checks; lost ${totals.lost}, twice ${totals.twice}; ${totals.poolRetired} retired off the list (${totals.unseen} summers unseen); list size at the end median ${median(endSizes)}, its median age median ${median(endAges)}; trimmed ${totals.trimmed} (mine and never barred ${totals.trimMine}); ledger held list men ${totals.ledgerHeld}, a summer on ${totals.aged}; out on loan in the last year ${totals.lentFinal} (left ${totals.lentWalked}, renewed ${totals.lentRenewed})${SKIP_OLD ? '; old saves skipped' : `; old saves recoverable ${recoverableTotal}, recovered ${recoveredTotal}`}`);
const red = Object.entries(failures).filter(([, list]) => list.length).map(([k, list]) => `${k} (${list.length})`);
const TARGET = { deletepool: '1', noretire: '2', nodedupe: '3', norecover: '4', notrimpool: '5', trimstranger: '5', trimbar: '5', ledgeroff: '6', staleseason: '6', noloanrow: '7', norenewloan: '7' }[CONTROL];
if (CONTROL) {
  if (failures[TARGET].length) { console.log(`simCmFreeAgencyFleet: CONTROL ${CONTROL} FIRED: section ${TARGET} red${red.length > 1 ? ` (red: ${red.join(', ')})` : ''}`); process.exit(1); }
  console.log(`simCmFreeAgencyFleet: CONTROL ${CONTROL} DID NOT FIRE: section ${TARGET} stayed green (red: ${red.join(', ') || 'none'})`); process.exit(3);
}
if (red.length) { console.log(`simCmFreeAgencyFleet: RED, sections ${red.join(', ')}`); process.exit(1); }
console.log(`simCmFreeAgencyFleet: green, all ${SKIP_OLD ? 'six' : 'seven'} sections held`);

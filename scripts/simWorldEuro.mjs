/* Round 1509. The world's Europa League, followed from the Cups panel every season of today's world beside the
 * Champions League, and the one access rule that fills it and grades the board's European rungs.
 *
 *   scripts/data/cmEuroAccess.json   who is in it: the access rows, the cup route and its pass down, the holder
 *                                     routes, the real 2025-26 cup winners, the shape and the nights, with pages
 *   src/lib/euroAccess.ts             the constants those rows give, and (from step 3) the rule itself
 *
 * SECTIONS (WORLD_EURO_ONLY=0,1 runs some of them; the default is all that are built):
 *   0  the ledger. A verified row stands on two publishers on two hosts, none a wiki; a figure is printed by two
 *      of them, each in a line about that figure; a row that is not verified carries no constant; one access row
 *      for every modern European league, its game numbers equal to the league's LEAGUE_RULES row; one cup row for
 *      every one of them, its club a club of the game's world of that nation (or null, said); the receipt holds
 *      the ledger's hash; no dash of the two banned kinds. Then the constants: every constant of euroAccess.ts
 *      equals its row, EURO_ACCESS_PARTIAL names exactly the rows that are not verified or whose real access is
 *      not the game's, the legs and the months are what both publishers print.
 *   Step 4 binds the rule to Club Manager (clubManager.ts's worldUelField and the keyed binding block) and the
 *   sections below drive the real engine (scripts/lib/worldUclFleet.mjs: a fresh vm per save, the clock held, a
 *   counter stream), over Round 1502's two fleets (today's world and one club of each era, watchers and
 *   participants, both coach modes where a section says so) and seeds 1 to 5 (WORLD_EURO_SEEDS).
 *   1  complete and legal, every season of every fleet: today's world follows a Europa League every season, 36
 *      different clubs, none of them in the Champions League the season really plays, never my club, each with
 *      its route (`via`), and the field and my club's own route (`earned`) are exactly what the rule gives when
 *      worked out here again from the engine's own inputs (an oracle beside the engine); an era save follows
 *      none; at the season's end every night played, every league phase pair once, eight games a club, every
 *      tie's aggregate its legs, one winner and one runner-up.
 *   2  SELF RELATIVE: the engine against itself with this round's four opens taken out (the start, the rollover,
 *      the job move's carry, the load repair, each asserted present once): watchers AND participants, both coach
 *      modes, equal on every key but worldComps.uel, every draw equal by count and value, the Europa League
 *      evaluated on the live state after every step of the head arm (the critic's 9(b)).
 *   4  in step and stable: after every step the nights done never fall, a night counts only once the week is
 *      past it and shows no score before, a night shown never changes, a reload evaluates the same and keeps
 *      the same slice; the nights' dates rise; a mid season move to a club outside the field keeps every night
 *      shown, and one to an entrant follows the rule (a fresh field in season one, none later).
 *   6  the dailies: no Hot Seat or Deadline Day state, the handover included, carries worldComps; startCareer's
 *      time per daily date on this tree and on the base (WORLD_EURO_BASE), printed (ruling 1l: over 10 ms more
 *      a date, the dailies take the one options object).
 *   7  measured and printed, never asserted on a max: routes, passes down, the fill, my club's earned routes,
 *      titles by strength quartile, goals, extra time and shootouts, the slice's bytes, the nights' months.
 *
 * Exit 0 green, 1 red or a control that fired, 2 could not run, 3 a control that did not fire.
 * A control is WORLD_EURO_CONTROL=<name>; it runs its own section only and must turn its own check red and
 * nothing that is not its own (the last line says FIRED, DID NOT FIRE CLEANLY or ABORTED).
 *   section 0, the data twisted in memory: onesource (A2 keeps one publisher) wiki (K1's second page is a wiki)
 *              thinused (A6, one publisher, carries a constant) receipt (the hash of another file)
 *   section 1, the engine edited in the bundle: twocomps (the field is not kept apart from the Champions League)
 *              meinfield (my club is not kept out) earned (my club's route worked out with it kept out)
 *   section 2: stream (the Europa League's matches draw from Math.random) form (its evaluation writes the clubs'
 *              form) leak (its open writes a key outside worldComps)
 *   section 4: live (the evaluation reads today's strengths, not the snapshot) ahead (a night counts a week
 *              early) noseen (the job move's carry forgets the nights it had shown)
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { build } from 'esbuild';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const text = file => fs.readFileSync(path.join(ROOT, file), 'utf8').replaceAll('\r\n', '\n');
const CONTROL = process.env.WORLD_EURO_CONTROL || '';
const ONLY = (process.env.WORLD_EURO_ONLY || '').split(',').filter(Boolean).map(Number);
const cannot = why => { console.log(`simWorldEuro: cannot run: ${why}`); process.exit(2); };

/* Each control: its section, the failure it MUST cause, and (third) every failure it MAY cause. */
const CONTROLS = {
  onesource: [0, /^A2 is verified and stands on fewer than two publishers/, /^A2/],
  wiki: [0, /^K1: .* is a wiki/, /^K1/],
  thinused: [0, /^A6 is not verified and carries/, /^A6/],
  receipt: [0, /does not carry the hash/],
  twocomps: [1, /^1 both: /, /^1 /],
  meinfield: [1, /^1 (mine|none): /, /^1 /],
  earned: [1, /^1 earned: /, /^1 /],
  stream: [2, /^2 .*the draws differ/, /^2 /],
  form: [2, /^2 .*the state differs/, /^2 /],
  leak: [2, /^2 .*the state differs/, /^2 /],
  live: [4, /^4 changed: /, /^4 /],
  ahead: [4, /^4 early: /, /^4 /],
  noseen: [4, /^4 falls: /, /^4 /],
};
/* The engine edits of sections 1 to 4, each line asserted to stand exactly once (worldUclFleet's engineOf). */
const CM = 'src/lib/clubManager.ts';
const CAL = 'src/lib/clubManagerCalendar.ts';
const CAREER_EDITS = {
  twocomps: [{ file: CM, from: '  const input = { tables: euro, cups, uclEntrants: uclEntrantsOf(state),', to: '  const input = { tables: euro, cups, uclEntrants: [] as string[],' }],
  meinfield: [{ file: CM, from: '  const field = euroFieldFromTables({ ...input, exclude: out });', to: '  const field = euroFieldFromTables({ ...input, exclude: out.slice(1) });' }],
  earned: [{ file: CM, from: '  const mine = euroFieldFromTables({ ...input, exclude: out.filter(c => c !== state.clubName), noFill: [state.clubName] });', to: '  const mine = euroFieldFromTables({ ...input, exclude: out, noFill: [state.clubName] });' }],
  stream: [{ file: CM, from: '  const out = evaluateWorldComp(slice, k, worldCompBind(state, comp, slice.f));', to: "  const bound = worldCompBind(state, comp, slice.f);\n  const out = evaluateWorldComp(slice, k, comp === 'uel' ? { ...bound, sim: (h, a, scale) => simScore(h, a, 0.2, -0.08, scale) } : bound);" }],
  form: [{ file: CM, from: '  memo.set(key, out);\n  return out;\n}', to: "  if (comp === 'uel') for (const n of out.nights) for (const fx of n.fixtures) if (fx.hg !== undefined) noteForm(state, fx.home, fx.away, fx.hg, fx.ag as number);\n  memo.set(key, out);\n  return out;\n}" }],
  leak: [{ file: CM, from: "  if (slice && comp === 'uel' && tagged.earned) slice.earned = tagged.earned;", to: "  if (slice && comp === 'uel' && tagged.earned) slice.earned = tagged.earned;\n  if (slice && comp === 'uel') (state as unknown as Record<string, unknown>).uelLeak = slice.clubs.length;" }],
  live: [{ file: CM, from: '  const out = evaluateWorldComp(slice, k, worldCompBind(state, comp, slice.f));', to: "  const out = evaluateWorldComp(comp === 'uel' ? { ...slice, str: slice.clubs.map(c => worldUclStrength(state, c)) } : slice, k, worldCompBind(state, comp, slice.f));" }],
  ahead: [{ file: CM, from: '  else while (n < places.length && state.week > places[n].at) n += 1;', to: "  else while (n < places.length && (comp === 'uel' ? state.week >= places[n].at : state.week > places[n].at)) n += 1;" }],
  noseen: [{ file: CM, from: '      setWorldComp(joined, comp, { ...slice, ...(seen > 0 ? { seen } : {}) });', to: "      setWorldComp(joined, comp, comp === 'uel' ? { ...slice, seen: undefined } : { ...slice, ...(seen > 0 ? { seen } : {}) });" }],
};
/* Section 2's other arm: this round's four opens taken out. */
const UEL_OFF = [
  { file: CM, from: "    openWorldComp(state, 'uel', worldCompField(state, 'uel', null), null);\n", to: '' },
  { file: CM, from: "    openWorldComp(state, 'uel', worldCompField(state, 'uel', tables, null, watchCup), null);\n", to: "    setWorldComp(state, 'uel', null);\n" },
  { file: CAL, from: "  carryWorldComp(career, joined, 'uel');\n", to: '' },
  { file: CM, from: "    repairWorldComp(parsed, 'uel');\n", to: '' },
];
if (CONTROL && !Object.hasOwn(CONTROLS, CONTROL)) cannot(`unknown control ${CONTROL}`);
const runs = n => (CONTROL ? CONTROLS[CONTROL][0] === n : ONLY.length === 0 || ONLY.includes(n));

const fails = [];
let checks = 0;
let changed = false;
const ok = (cond, msg) => { checks += 1; if (!cond) fails.push(msg); };
const EN = String.fromCharCode(0x2013);
const EM = String.fromCharCode(0x2014);
const noDash = (name, s) => ok(!s.includes(EN) && !s.includes(EM), `${name} holds a dash of a banned kind`);
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

const LEDGER_FILE = 'scripts/data/cmEuroAccess.json';
const RECEIPT_FILE = 'scripts/data/cmEuroAccess.receipt.json';
const MODULE_FILE = 'src/lib/euroAccess.ts';
const ledger = JSON.parse(text(LEDGER_FILE));
const row = id => ledger.rows.find(r => r.id === id);

/** Bundle the given entry files (repo paths) into one module and import it. */
async function bundle(name, entries, plugins = []) {
  const work = fs.mkdtempSync(path.join(os.tmpdir(), `world-euro-${name}-`));
  const entry = path.join(work, 'entry.ts');
  const P = f => JSON.stringify(path.join(ROOT, f).split(path.sep).join('/'));
  fs.writeFileSync(entry, Object.entries(entries).map(([as, f]) => `export * as ${as} from ${P(f)};`).join('\n'));
  const out = path.join(work, 'bundle.mjs');
  await build({ entryPoints: [entry], bundle: true, platform: 'node', format: 'esm', outfile: out, logLevel: 'error', alias: { '@': path.join(ROOT, 'src') }, plugins });
  return import(pathToFileURL(out).href);
}

/* ── Section 0: the ledger ─────────────────────────────────────────────────────────────────────────── */
const isWiki = url => /wikipedia|wikimedia|fandom|wiki\.|grokipedia|wikiwand/i.test(new URL(url).host);
const domainOf = url => { const h = new URL(url).host; return h.split('.').slice(/\.co\.uk$/.test(h) ? -3 : -2).join('.'); };
/* UEFA's regulations and uefa.com are one publisher on two hosts: counted once. */
const publisherOf = url => (/(^|\.)uefa\.com$/.test(new URL(url).host) ? 'uefa' : domainOf(url));
const ORDINALS = ['', 'first', 'second', 'third', 'fourth', 'fifth', 'sixth', 'seventh', 'eighth'];
/** A place `n` printed in a line: the access list's code (N5) or the word (Fifth in Italy). */
const printsPlace = (line, n) => new RegExp(`(^|[^A-Za-z0-9])N${n}([^0-9]|$)`).test(line) || new RegExp(`\\b${ORDINALS[n]}\\b`, 'i').test(line);
const MONTHS = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december'];
/** The nights a date line holds, as months in order: "18 & 25 February" is two Februaries, "29 April & 6 May"
 *  an April and a May, "September 16/17, 2026" one September (one matchday on two evenings). */
function monthsOf(line) {
  const after = line.replace(/^[^:]*:/, '');
  const parts = after.split('&');
  const named = parts.map(p => { const m = MONTHS.findIndex(name => new RegExp(`\\b${name}\\b`, 'i').test(p)); return m >= 0 ? m + 1 : null; });
  return named.map((m, i) => m ?? named.slice(i + 1).find(x => x !== null) ?? null);
}

function section0() {
  /* The controls of this section change the data in memory, the way a wrong edit of the file would. */
  if (CONTROL === 'onesource') { const r = row('A2'); changed = r.sources.length > 1; r.sources.length = 1; }
  if (CONTROL === 'wiki') { const s = row('K1').sources[1]; changed = !isWiki(s.url); s.url = 'https://en.wikipedia.org/wiki/2026_FA_Cup_final'; }
  if (CONTROL === 'thinused') { const r = row('A6'); changed = r.status !== 'verified' && r.usedBy.length === 0; r.usedBy = ['EURO_SLOTS.eredivisie.uel']; }

  /* 0.1 Every row is a reading somebody can open, and a verified row stands on two publishers. */
  const ids = new Set();
  for (const r of ledger.rows) {
    ok(!ids.has(r.id), `${r.id} is in the ledger twice`); ids.add(r.id);
    ok(['verified', 'onePublisher', 'toVerify'].includes(r.status), `${r.id}: status ${r.status} is not one of the three`);
    ok(Array.isArray(r.usedBy), `${r.id}: no usedBy list`);
    for (const s of r.sources) {
      ok(/^https:\/\//.test(s.url), `${r.id}: ${s.url} is not https`);
      ok(!isWiki(s.url), `${r.id}: ${s.url} is a wiki`);
      ok(typeof s.publisher === 'string' && s.publisher.length > 2, `${r.id}: a source names no publisher`);
      ok(typeof s.published === 'string' && (/^\d{4}-\d{2}-\d{2}$/.test(s.published) || s.published === 'undated'), `${r.id}, ${s.publisher}: no date and not marked undated`);
      ok(Array.isArray(s.literal) && s.literal.length > 0 && s.literal.every(l => l.length > 5), `${r.id}, ${s.publisher}: no literal`);
    }
    const publishers = new Set(r.sources.map(s => publisherOf(s.url)));
    if (r.status === 'verified') ok(publishers.size >= 2, `${r.id} is verified and stands on fewer than two publishers`);
    else ok(r.usedBy.length === 0, `${r.id} is not verified and carries ${r.usedBy.join(', ')}`);
    if (r.status === 'toVerify') ok(typeof r.standIn === 'string' && r.standIn.length > 20, `${r.id} is not read and names no stand in`);
    /* A place a row states is printed by two publishers, each in a line about it. */
    if (r.figures?.uelPlace !== undefined) {
      const by = new Set(r.sources.filter(s => s.literal.some(l => printsPlace(l, r.figures.uelPlace))).map(s => publisherOf(s.url)));
      ok(by.size >= 2, `${r.id}: the Europa League place ${r.figures.uelPlace} is not printed by two publishers`);
    }
  }
  /* 0.2 The cup rows: each source names the winner. */
  for (const r of ledger.rows.filter(x => x.kind === 'cup')) {
    const tokens = String(r.winner).split(/[\s.]+/).filter(t => t.length >= 2 && !/^(FC|St)$/.test(t));
    for (const s of r.sources) ok(s.literal.some(l => tokens.some(t => l.includes(t))), `${r.id}, ${s.publisher}: no line names ${r.winner}`);
  }
  /* 0.3 The receipt vouches for this file, and no dash of the two banned kinds. */
  const receipt = JSON.parse(text(RECEIPT_FILE));
  const hash = createHash('sha256').update(text(LEDGER_FILE) + (CONTROL === 'receipt' ? ' ' : '')).digest('hex');
  if (CONTROL === 'receipt') changed = true;
  ok(receipt.sha256 === hash && receipt.dataFile === LEDGER_FILE, `the receipt does not carry the hash of ${LEDGER_FILE} (${hash})`);
  ok(receipt.checkedBy === 'scripts/simWorldEuro.mjs', 'the receipt names another checker');
  noDash(LEDGER_FILE, text(LEDGER_FILE)); noDash(RECEIPT_FILE, text(RECEIPT_FILE)); noDash(MODULE_FILE, text(MODULE_FILE));
  const count = s => ledger.rows.filter(r => r.status === s).map(r => r.id).join(' ');
  console.log(`  0 ledger: verified ${count('verified')} | one publisher ${count('onePublisher')} | to verify ${count('toVerify')}`);
}

/* ── Section 0, second half: the constants state what the ledger states ────────────────────────────── */
const range = (a, b) => Array.from({ length: Math.max(0, b - a + 1) }, (_, i) => a + i);
/** An access row agrees when the real 2026/27 access is the game's row: its Champions League places (qualifying
 *  routes counted as in), exactly its Europa League league places, and the cup winner. */
const agrees = r => r.real.cupWinner === true && r.real.uclAsIn === r.game.ucl && same(r.real.uelLeague, range(r.game.ucl + 1, r.game.uel));

async function section0Engine() {
  const M = await bundle('engine', { e: MODULE_FILE, cm: CM, w: 'src/lib/worldCompetition.ts' });
  const { e, cm, w } = M;
  const european = cm.REAL_LEAGUES.filter(l => l.euro).map(l => l.id);
  const nationOf = id => cm.LEAGUE_RULES[id]?.nationId;
  /* 0.4 One access row per modern European league, its game numbers the league's own LEAGUE_RULES row. */
  const access = ledger.rows.filter(r => r.kind === 'access');
  ok(same([...access.map(r => r.league)].sort(), [...european].sort()), `the access rows cover ${access.map(r => r.league).join(' ')}, the European leagues are ${european.join(' ')}`);
  for (const r of access) {
    const slots = cm.EURO_SLOTS[r.league];
    ok(!!slots && slots.ucl === r.game.ucl && slots.uel === r.game.uel, `${r.id}: the game's places ${JSON.stringify(r.game)} are not ${r.league}'s LEAGUE_RULES row ${JSON.stringify(slots)}`);
    if (!agrees(r) || r.status !== 'verified') ok(r.usedBy.length === 0, `${r.id}: its real access is not the game's and it carries ${r.usedBy.join(', ')}`);
  }
  /* 0.5 EURO_ACCESS_PARTIAL names exactly the rows not verified and the access rows that do not agree. */
  const owed = ledger.rows.filter(r => r.status !== 'verified' || (r.kind === 'access' && !agrees(r))).map(r => r.id);
  const partial = [...e.EURO_ACCESS_PARTIAL];
  for (const id of owed) ok(partial.includes(id), `EURO_ACCESS_PARTIAL does not name ${id}`);
  for (const id of partial) ok(owed.includes(id), `EURO_ACCESS_PARTIAL names ${id}, which is verified and agrees or is not in the ledger`);
  /* 0.6 Every usedBy is a real constant. */
  for (const r of ledger.rows) for (const u of r.usedBy) {
    const [name, key, sub] = u.split('.');
    const where = name === 'EURO_SLOTS' ? cm : e;
    const v = where[name];
    ok(v !== undefined && (key === undefined || (v && Object.hasOwn(v, key))) && (sub === undefined || Object.hasOwn(v[key], sub)), `${r.id}: usedBy ${u} is not a constant`);
  }
  /* 0.7 The cup rows: one per European league, each club the game's own string of a club of that nation's world. */
  const clubsOfNation = id => new Set(cm.REAL_LEAGUES.filter(l => nationOf(l.id) === nationOf(id)).flatMap(l => l.clubs));
  const cups = ledger.rows.filter(r => r.kind === 'cup' && r.id !== 'K16');
  ok(same([...cups.map(r => r.league)].sort(), [...european].sort()), `the cup rows cover ${cups.map(r => r.league).join(' ')}`);
  ok(same(Object.keys(e.SEASON_ONE_CUP_WINNERS).sort(), [...european].sort()), 'SEASON_ONE_CUP_WINNERS is not keyed by the European leagues');
  for (const r of cups) {
    ok(e.SEASON_ONE_CUP_WINNERS[r.league] === r.club, `SEASON_ONE_CUP_WINNERS.${r.league} is ${e.SEASON_ONE_CUP_WINNERS[r.league]} and ${r.id} says ${r.club}`);
    if (r.club === null) ok(typeof r.note === 'string' && r.note.length > 20, `${r.id}: a winner outside the game's world without a note`);
    else ok(clubsOfNation(r.league).has(r.club), `${r.id}: ${r.club} is not a club of ${nationOf(r.league)} in the game's world`);
    if (r.club !== null) ok(r.status === 'verified', `${r.id} is ${r.status} and season one plays it`);
  }
  const k16 = row('K16');
  ok(e.SEASON_ONE_UECL_HOLDER === k16.club && cm.REAL_LEAGUES.some(l => l.clubs.includes(k16.club)), `SEASON_ONE_UECL_HOLDER is ${e.SEASON_ONE_UECL_HOLDER}, K16 says ${k16.club}`);
  /* 0.8 The routes, the legs and the months. */
  const routes = { cupWinnerEnters: 'Q2', cupPassDown: 'Q3', uelHolderToUcl: 'Q4', ueclHolderToUel: 'C0' };
  for (const [k, id] of Object.entries(routes)) ok(e.EURO_ACCESS_RULES[k] === true && row(id).status === 'verified', `EURO_ACCESS_RULES.${k} is ${e.EURO_ACCESS_RULES[k]} and ${id} is ${row(id).status}`);
  ok(same({ ...e.UEL_LEGS }, { PO: 2, R16: 2, QF: 2, SF: 2, F: 1 }), `UEL_LEGS is ${JSON.stringify(e.UEL_LEGS)}`);
  const ROUND_LINE = { PO: /play-off/i, R16: /round of 16/i, QF: /quarter/i, SF: /semi/i, F: /^final/i };
  for (const s of row('U-legs').sources) {
    for (const [round, re] of Object.entries(ROUND_LINE)) {
      const nights = s.literal.filter(l => re.test(l)).flatMap(monthsOf).length;
      ok(nights === e.UEL_LEGS[round], `U-legs, ${s.publisher}: ${round} prints ${nights} nights and UEL_LEGS says ${e.UEL_LEGS[round]}`);
    }
  }
  const u7 = row('U7');
  ok(same([...e.UEL_NIGHT_MONTHS], u7.figures.months), `UEL_NIGHT_MONTHS is not U7's months`);
  for (const s of u7.sources) ok(same(s.literal.flatMap(monthsOf), u7.figures.months), `U7, ${s.publisher}: its lines give the months ${JSON.stringify(s.literal.flatMap(monthsOf))}`);
  const seasonOrder = m => (m + 4) % 12;
  ok(u7.figures.months.every((m, i, a) => i === 0 || seasonOrder(m) >= seasonOrder(a[i - 1])), 'U7 months are not in season order');
  ok(u7.figures.months.length === w.LEAGUE_PHASE_NIGHT_ORDER.length, 'U7 does not give a month for each of the seventeen nights');
  const marks = w.LEAGUE_PHASE_NIGHT_MARKS;
  ok(e.UEL_FINAL_MARK > marks[marks.length - 2] && e.UEL_FINAL_MARK < 1, `UEL_FINAL_MARK ${e.UEL_FINAL_MARK} is not after the semi-finals' second leg mark and before the season's end`);
  /* 0.9 No European league of today's world is Russian or Ukrainian (the critic's 9(g) for the league phase): the
     Russian league the world carries has no European row (UEFA's suspension), so none of its clubs is ever in. */
  const nations = new Set(cm.REAL_LEAGUES.filter(l => l.euro).map(l => nationOf(l.id)));
  ok(!nations.has('russia') && !nations.has('ukraine'), 'a European league of today\'s world is Russian or Ukrainian');
  ok(cm.REAL_LEAGUES.filter(l => nationOf(l.id) === 'russia' || nationOf(l.id) === 'ukraine').every(l => !l.euro && cm.LEAGUE_RULES[l.id].europe === null), 'a Russian or Ukrainian league of today\'s world has a European row');
  console.log(`  0 constants: partial ${partial.join(' ')}; cup winners ${Object.values(e.SEASON_ONE_CUP_WINNERS).map(c => c ?? 'none').join(', ')}; nations ${[...nations].join(' ')}`);
}

/* ── Sections 1 to 7 (step 4): the watched Europa League in Club Manager ──────────────────────────────── */
const SEEDS = (process.env.WORLD_EURO_SEEDS || '1,2,3,4,5').split(',').map(Number);
const counts = {};
const bump = (k, n = 1) => { counts[k] = (counts[k] ?? 0) + n; };
const careerEdits = () => CAREER_EDITS[CONTROL] ?? [];
const byPlain = (a, b) => (a < b ? -1 : a > b ? 1 : 0);
const ROUTES = 'LCPHF';
let fleetLib = null;
const lib = async () => (fleetLib ??= await import(pathToFileURL(path.join(ROOT, 'scripts', 'lib', 'worldUclFleet.mjs')).href));
let pure = null;
/** The rule and the 2025-26 tables, bundled on their own: the oracle beside the engine. */
const oracleLib = async () => (pure ??= await bundle('oracle', { ea: MODULE_FILE, ft: 'src/data/clubManagerFinalTables2025_26.ts' }));

/** The field and my club's route the rule gives at an open, worked out here from the engine's own inputs. */
function oracleField(M, O, st, pre) {
  const excluded = [st.clubName, st.customClub?.replacedClub].filter(Boolean);
  const nation = id => M.cm.LEAGUE_RULES[id]?.nationId;
  let src, cups = {}, holder = null;
  if (!pre) {
    if (st.season !== 1) return null;
    src = M.cm.REAL_LEAGUES.filter(l => l.euro).map(league => ({ league, clubs: O.ft.CM_FINAL_TABLES_PARTIAL.includes(league.id) ? [] : (O.ft.CM_FINAL_TABLES_2025_26.leagues[league.id]?.table ?? []) }));
    for (const t of src) cups[nation(t.league.id)] = O.ea.SEASON_ONE_CUP_WINNERS[t.league.id] ?? null;
    holder = O.ea.SEASON_ONE_UECL_HOLDER;
  } else {
    src = pre.tables;
    if (!src) return null;
    for (const t of src) if (t.league.euro) cups[nation(t.league.id)] = null;
    const cup = pre.cup;
    if (Object.prototype.hasOwnProperty.call(cups, cup.nationId)) cups[cup.nationId] = cup.winner;
  }
  const tables = src.filter(t => t.league.euro).map(t => ({ leagueId: t.league.id, nationId: nation(t.league.id), clubs: t.clubs,
    uclPlaces: M.cm.uclPlacesIn(t.league), uelLast: M.cm.EURO_SLOTS[t.league.id]?.uel ?? M.cm.uclPlacesIn(t.league) }));
  const input = { tables, cups, uclEntrants: M.cm.uclEntrantsOf(st), ueclHolder: holder, size: 36 };
  const field = O.ea.euroFieldFromTables({ ...input, exclude: excluded });
  const mine = O.ea.euroFieldFromTables({ ...input, exclude: excluded.slice(1), noFill: [st.clubName] });
  return { field, earned: mine.via[st.clubName] ?? null };
}

/** One journey of one save through `seasons` seasons on one engine, every step on its own stretch of the stream
 *  (worldUclFleet's tape), with a reload at entry 20 and, with `join`, a mid season move at entry 25. */
async function journey(E, f, { seasons, mode = 'nocoach', join = null, evalEach = false, onStep, onSeasonEnd }) {
  const { tape } = await lib();
  const M = await E.fresh();
  const opts = mode === 'coach' ? { skipHalftime: true } : { skipHalftime: true, noCoach: true };
  const steps = [];
  let s = null; let k = 0;
  const step = (label, fn) => {
    k += 1;
    const r = tape((f.seed * 0x9e3779b1 + k * 7919) >>> 0, () => {
      const out = fn(s);
      if (evalEach && out?.state) { M.cm.evalWorldComp(out.state, 'uel'); M.cm.worldCompNightsDone(out.state, 'uel'); }
      return out;
    });
    const got = r.value ?? {};
    if (got.state) s = got.state;
    steps.push({ label, s, draws: r.draws.length, drawSha: createHash('sha256').update(JSON.stringify(r.draws)).digest('hex').slice(0, 16), saved: got.saved ?? null });
    onStep?.(M, s, label, got);
  };
  const reload = cur => {
    M.store.clear();
    if (!M.cm.saveCareer(cur)) return { saved: 'refused' };
    return { state: M.cm.loadCareer(), saved: createHash('sha256').update(JSON.stringify([...M.store.entries()].sort())).digest('hex').slice(0, 16), reload: cur };
  };
  step('start', () => ({ state: f.custom ? M.cm.startCareer(f.club, f.era, f.custom) : M.cm.startCareer(f.club, f.era), open: true }));
  for (let season = 1; season <= seasons; season += 1) {
    let over = false;
    for (let i = 0; i < 260 && !over; i += 1) {
      step(`s${season}-e${i + 1}`, cur => { const r = M.cm.playNextEntry(cur, opts); over = r.kind === 'seasonOver'; return { state: r.state }; });
      if (i === 20) step(`s${season}-reload`, reload);
      if (join && join.season === season && i === 25) {
        const to = join.pick(M, s);
        if (to) {
          step(`s${season}-join`, cur => { const joined = joinTo(M, cur, to.club, to.leagueId); return joined ? { state: joined, joined: cur, entrant: to.entrant } : {}; });
          step(`s${season}-join-reload`, cur => ({ ...reload(cur), afterJoin: true }));
        }
      }
    }
    if (!over) throw new Error(`season ${season} did not end in 260 entries`);
    step(`s${season}-finish`, cur => ({ state: M.cm.finishSeason(cur).state }));
    onSeasonEnd?.(M, s, season);
    /* The rule's inputs are read off the finished season BEFORE the rollover registers next season's leagues (the
       engine reads them there too): read after it, a relegated club's own table is the world's copy. */
    if (season < seasons) step(`s${season}-rollover`, cur => { const pre = { tables: M.cm.uclFinalTables(cur), cup: M.cm.euroCupOf(cur) }; return { state: M.cm.startNextSeason(cur), prev: cur, pre, open: true }; });
  }
  return steps;
}
function joinTo(M, st, club, leagueId) {
  const open = { club, league: leagueId, tier: 3, season: st.season, week: st.week, matchesLeft: 0, roll: 0, status: 'accepted' };
  return M.cal.joinClubNow({ ...st, jobHunt: { open, cooldowns: [], sentSeason: st.season, sent: 1, summerMove: null } });
}
/** A move to the bottom club of another league of today's world, outside the followed field, or to an entrant. */
function outsideTarget(M, st) {
  const sl = st.worldComps?.uel;
  const leagues = M.cm.REAL_LEAGUES.filter(l => l.euro);
  const mine = leagues.find(l => l.clubs.includes(st.clubName));
  const free = l => l !== mine && !(sl?.clubs ?? []).includes(l.clubs[l.clubs.length - 1]);
  /* A league of another size where there is one, so the new calendar can sit behind the old (the carry's seen). */
  const other = leagues.find(l => free(l) && mine && l.clubs.length !== mine.clubs.length) ?? leagues.find(free);
  return other ? { club: other.clubs[other.clubs.length - 1], leagueId: other.id, entrant: false } : null;
}
/** The bottom club of another league of today's world, of another size where there is one. */
function plainTarget(M, st) {
  const leagues = M.cm.REAL_LEAGUES.filter(l => l.euro);
  const mine = leagues.find(l => l.clubs.includes(st.clubName));
  const other = leagues.find(l => l !== mine && mine && l.clubs.length !== mine.clubs.length) ?? leagues.find(l => l !== mine);
  return other ? { club: other.clubs[other.clubs.length - 1], leagueId: other.id, entrant: false } : null;
}
function entrantTarget(M, st) {
  const sl = st.worldComps?.uel;
  if (!sl) return null;
  for (const club of [...sl.clubs].sort(byPlain)) {
    const lg = M.cm.REAL_LEAGUES.find(l => l.clubs.includes(club));
    if (lg && club !== st.clubName && !(st.uclField ?? []).includes(club)) return { club, leagueId: lg.id, entrant: true };
  }
  return null;
}

const sortedCopy = a => [...a].sort(byPlain);
const dateKeyOf = d => d.y * 10000 + d.m * 100 + d.d;
const weekday = d => new Date(Date.UTC(d.y, d.m - 1, d.d)).getUTCDay();
const measured = { routes: {}, earned: {}, titles: [0, 0, 0, 0], goals: 0, games: 0, aet: 0, pens: 0, bytes: [], months: { same: 0, near: 0, far: 0 }, thursdays: 0, nights: 0 };

/** Sections 1 and 4 (and 7's numbers): one pass of every fleet, the engine edited by a control when one asks. */
async function europaPass() {
  const { engineOf, pickFleet } = await lib();
  const O = await oracleLib();
  O_MONTHS = [...O.ea.UEL_NIGHT_MONTHS];
  const E = await engineOf(ROOT, 'head', { edits: careerEdits() }, cannot);
  if (careerEdits().length) changed = true;
  const fleet = pickFleet(await E.fresh(), 'all', cannot);
  const t0 = Date.now();
  let journeys = 0;
  for (const f of fleet) for (const seed of SEEDS) {
    const now = f.era === 'now';
    const seasons = !now ? 1 : f.kind === 'participant' ? 2 : 3;
    const join = now && f.kind === 'watcher' && !f.custom
      ? (seed === SEEDS[0] ? { season: 1, pick: outsideTarget } : seed === SEEDS[1] ? { season: 1, pick: entrantTarget } : seed === SEEDS[2] ? { season: 2, pick: outsideTarget } : seed === SEEDS[3] ? { season: 2, pick: entrantTarget } : null) : null;
    const name = `${f.kind} ${f.club} (${f.era}) seed ${seed}`;
    let prevDone = 0, sliceKey = '', shown = new Map();
    const onStep = (M, s, label, got) => {
      if (!s) return;
      const sl = s.worldComps?.uel;
      if (!now) { ok(!sl, `1 era: ${name} at ${label}: an era save follows a Europa League`); return; }
      /* 1: legal at every step. */
      if (sl) {
        ok(sl.s === s.season && sl.f === 'l36', `1 shape: ${name} at ${label}: season ${sl.s} format ${sl.f}`);
        ok(sl.clubs.length === 36 && new Set(sl.clubs).size === 36, `1 size: ${name} at ${label}: ${sl.clubs.length} entrants`);
        const ucl = new Set(M.cm.uclEntrantsOf(s));
        const both = sl.clubs.filter(c => ucl.has(c));
        ok(both.length === 0, `1 both: ${name} at ${label}: ${both.slice(0, 3).join(', ')} in both competitions`);
        ok(!sl.clubs.includes(s.clubName), `1 mine: ${name} at ${label}: ${s.clubName} is an entrant`);
        ok(typeof sl.via === 'string' && sl.via.length === 36 && [...sl.via].every(c => ROUTES.includes(c)), `1 via: ${name} at ${label}: ${sl.via}`);
      }
      /* 1: an open is the rule's own answer (the oracle). A join opens only when it does not carry. */
      const carried = got?.joined && !!sl && !!got.joined.worldComps?.uel && got.joined.worldComps.uel.seed === sl.seed && same(got.joined.worldComps.uel.clubs, sl.clubs);
      if (got?.open || (got?.joined && !carried)) {
        const o = got?.joined && s.season > 1 ? null : oracleField(M, O, s, got?.pre ?? null);
        if (!o || o.field.clubs.length !== 36) ok(!sl, `1 none: ${name} at ${label}: a Europa League opened where the rule has no field`);
        else {
          ok(!!sl, `1 none: ${name} at ${label}: no Europa League opened where the rule has a field`);
          if (sl) {
            ok(same(sortedCopy(sl.clubs), sortedCopy(o.field.clubs)), `1 field: ${name} at ${label}: the field is not the rule's`);
            ok(sl.clubs.every((c, i) => sl.via[i] === o.field.via[c]), `1 via: ${name} at ${label}: a route is not the rule's`);
            ok((sl.earned ?? null) === o.earned, `1 earned: ${name} at ${label}: the slice says ${sl.earned ?? 'none'}, the rule ${o.earned ?? 'none'}`);
            for (const c of sl.via) measured.routes[c] = (measured.routes[c] ?? 0) + 1;
            measured.earned[sl.earned ?? 'none'] = (measured.earned[sl.earned ?? 'none'] ?? 0) + 1;
            measured.bytes.push(JSON.stringify({ uel: sl }).length);
            datesOf(M, s, name, label);
          }
        }
        bump(`1 opens ${got?.open ? (got.prev ? 'rollover' : 'start') : 'join'}`);
        /* The cup the rollover hands on has a winner, whoever went out early (ruling 1f); a season with no cup
           of its own passes the cup's place down, counted. */
        if (got?.prev) {
          const cup = got.pre?.cup ?? M.cm.euroCupOf(got.prev);
          if (got.prev.cupBracket?.length) ok(!!cup.winner, `1 cup: ${name} at ${label}: the season's cup final crowned nobody`);
          else bump('1 rollovers whose season had no cup bracket (its place passed down)');
          if (cup.winner && cup.winner !== got.prev.clubName) bump('1 rollovers whose cup another club won');
          if (cup.winner === got.prev.clubName) bump('1 rollovers whose cup my club won');
        }
      }
      if (got?.joined) {
        const before = got.joined.worldComps?.uel;
        bump(`4 joins ${got.entrant ? 'to an entrant' : 'outside the field'} ${carried ? 'carried' : sl ? 'opened' : 'with none'}`);
        if (!got.entrant && before && before.s === s.season) ok(carried, `4 join: ${name} at ${label}: a move outside the field did not carry the Europa League`);
        if (got.entrant) ok(!carried, `4 join: ${name} at ${label}: a move to an entrant carried the competition it is in`);
        if (got.entrant && s.season > 1) ok(!sl, `4 join: ${name} at ${label}: a move to an entrant in season ${s.season} opened one`);
      }
      if (!sl) { sliceKey = ''; return; }
      /* 4: in step and stable. */
      const key = `${sl.s}|${sl.seed}`;
      if (key !== sliceKey) { sliceKey = key; prevDone = 0; shown = new Map(); }
      const done = M.cm.worldCompNightsDone(s, 'uel');
      ok(done >= prevDone, `4 falls: ${name} at ${label}: ${done} nights done after ${prevDone}`);
      prevDone = done;
      const places = M.cm.worldCompNights(s, 'uel') ?? [];
      if (!sl.seen) for (let i = 0; i < done; i += 1) {
        if (!(s.week >= s.calendar.length || s.week > places[i].at)) { ok(false, `4 early: ${name} at ${label}: night ${i + 1} counts with the week at ${s.week} and the night at ${places[i].at}`); break; }
      }
      const r = M.cm.evalWorldComp(s, 'uel');
      if (!r) { ok(false, `4 eval: ${name} at ${label}: the slice evaluates to nothing`); return; }
      r.nights.forEach((n, i) => {
        const scored = n.fixtures.some(x => x.hg !== undefined);
        if (i >= done) { if (scored) ok(false, `4 score: ${name} at ${label}: night ${n.id} shows a score before it is played`); return; }
        const json = JSON.stringify(n.fixtures);
        if (shown.has(i)) { if (shown.get(i) !== json) ok(false, `4 changed: ${name} at ${label}: night ${n.id} shown again otherwise`); } else shown.set(i, json);
      });
      if (got?.reload) {
        ok(JSON.stringify(s.worldComps?.uel ?? null) === JSON.stringify(got.reload.worldComps?.uel ?? null), `4 reload: ${name} at ${label}: the reloaded save follows another Europa League`);
        ok(JSON.stringify(M.cm.evalWorldComp(s, 'uel')) === JSON.stringify(M.cm.evalWorldComp(got.reload, 'uel')), `4 reload: ${name} at ${label}: the reloaded save evaluates otherwise`);
      }
    };
    const onSeasonEnd = (M, s, season) => { if (now) seasonEnd(M, s, `${name} season ${season}`); };
    try { await journey(E, { ...f, seed }, { seasons, join, onStep, onSeasonEnd }); } catch (e) { ok(false, `1 threw: ${name}: ${e.message}`); }
    journeys += 1;
  }
  console.log(`  1 and 4: ${journeys} journeys, ${((Date.now() - t0) / 1000).toFixed(0)} s`);
}

/** The nights' dates on the save's calendar: rising, and the day after the Champions League's rule (Thursday). */
function datesOf(M, s, name, label) {
  const dates = M.cal.worldCompNightDates(s, 'uel');
  if (!dates) { ok(false, `4 dates: ${name} at ${label}: no dates`); return; }
  ok(dates.every((d, i) => i === 0 || dateKeyOf(d) > dateKeyOf(dates[i - 1])), `4 dates: ${name} at ${label}: the nights' dates do not rise`);
  const real = O_MONTHS ?? [];
  dates.forEach((d, i) => {
    measured.nights += 1;
    if (weekday(d) === 4) measured.thursdays += 1;
    const gap = Math.abs(((d.m - (real[i] ?? d.m)) + 12) % 12);
    if (gap === 0) measured.months.same += 1; else if (gap === 1 || gap === 11) measured.months.near += 1; else measured.months.far += 1;
  });
}
let O_MONTHS = null;

/** A finished season of the Europa League: every night played, the league phase whole, the ties their legs. */
function seasonEnd(M, s, name) {
  const sl = s.worldComps?.uel;
  if (!sl) { bump('1 seasons that ended with no Europa League'); return; }
  const r = M.cm.evalWorldComp(s, 'uel');
  ok(M.cm.worldCompNightsDone(s, 'uel') === 17 && r?.done === true, `1 end: ${name}: ${r?.nightsDone} nights played at the end`);
  if (!r) return;
  const pairs = new Set();
  for (const n of r.nights.slice(0, 8)) for (const x of n.fixtures) {
    pairs.add([x.home, x.away].sort(byPlain).join('|'));
    measured.goals += (x.hg ?? 0) + (x.ag ?? 0); measured.games += 1;
  }
  ok(pairs.size === 144, `1 pairs: ${name}: ${pairs.size} league phase pairs, 144 expected`);
  ok((r.table ?? []).length === 36 && r.table.every(x => x.w + x.d + x.l === 8), `1 table: ${name}: a club did not play eight`);
  const per = { PO: 8, R16: 8, QF: 4, SF: 2, F: 1 };
  for (const [round, n] of Object.entries(per)) ok(r.ties.filter(t => t.round === round).length === n, `1 ties: ${name}: ${round} has ${r.ties.filter(t => t.round === round).length} ties`);
  for (const t of r.ties) {
    const agg = t.leg2 ? [t.leg1[0] + t.leg2[0], t.leg1[1] + t.leg2[1]] : t.agg;
    ok(!!t.agg && same(agg, t.agg), `1 aggregate: ${name}: ${t.round} ${t.home} v ${t.away} ${JSON.stringify(t.agg)} is not its legs`);
    if (t.agg && t.agg[0] !== t.agg[1]) ok(t.winner === (t.agg[0] > t.agg[1] ? t.home : t.away), `1 winner: ${name}: ${t.round} ${t.home} v ${t.away} won by the side with fewer`);
    else ok(!!t.pens, `1 winner: ${name}: ${t.round} ${t.home} v ${t.away} level with no shootout`);
    if (t.aet) measured.aet += 1;
    if (t.pens) measured.pens += 1;
  }
  const w = M.w.worldCompWinner(r);
  ok(!!w && sl.clubs.includes(w.winner) && sl.clubs.includes(w.runnerUp) && w.winner !== w.runnerUp, `1 winner: ${name}: no single winner and runner-up`);
  ok(M.cm.worldCompWinnerOf(s, 'uel') === w?.winner, `1 winner: ${name}: worldCompWinnerOf says ${M.cm.worldCompWinnerOf(s, 'uel')}`);
  if (w) {
    const rank = [...sl.clubs].sort((a, b) => sl.str[sl.clubs.indexOf(b)] - sl.str[sl.clubs.indexOf(a)] || byPlain(a, b)).indexOf(w.winner);
    measured.titles[Math.min(3, Math.floor(rank / 9))] += 1;
  }
}

/** A state with its Europa League taken out, the object with it when it is left empty (proofWorldUclFleet's
 *  dotted strip): what the other arm must equal. */
const withoutUel = st => {
  if (!st || !st.worldComps?.uel) return JSON.stringify(st ?? null);
  const shown = { ...st, worldComps: { ...st.worldComps } };
  delete shown.worldComps.uel;
  if (!Object.keys(shown.worldComps).length) delete shown.worldComps;
  return JSON.stringify(shown);
};

/** Section 2: the engine against itself with this round's four opens taken out. */
async function selfRelative() {
  const { engineOf, pickFleet } = await lib();
  const head = await engineOf(ROOT, 'head2', { edits: careerEdits() }, cannot);
  const off = await engineOf(ROOT, 'off', { edits: UEL_OFF }, cannot);
  if (careerEdits().length) changed = true;
  const fleet = pickFleet(await head.fresh(), 'all', cannot);
  const t0 = Date.now();
  let journeys = 0, steps = 0, carried = 0;
  for (const f of fleet) for (const mode of ['nocoach', 'coach']) for (const seed of SEEDS) {
    const seasons = f.era !== 'now' ? 1 : f.kind === 'participant' ? 2 : 3;
    /* The same move in both arms: chosen without looking at the Europa League. */
    const join = f.era === 'now' && f.kind === 'watcher' && seed === SEEDS[0] && !f.custom ? { season: 1, pick: plainTarget } : null;
    const a = await journey(off, { ...f, seed }, { seasons, mode, join });
    const b = await journey(head, { ...f, seed }, { seasons, mode, join, evalEach: true });
    journeys += 1; steps += a.length;
    if (b.some(y => y.s?.worldComps?.uel)) carried += 1;
    const name = `${f.kind} ${f.club} (${f.era}) ${mode} seed ${seed}`;
    for (let i = 0; i < Math.max(a.length, b.length); i += 1) {
      const x = a[i], y = b[i];
      if (!x || !y || x.label !== y.label) { ok(false, `2 ${name}: the steps part at ${i}`); break; }
      const why = [];
      if (x.s?.worldComps?.uel) why.push('the arm without the opens carries a Europa League');
      if (withoutUel(x.s) !== withoutUel(y.s)) why.push('the state differs');
      if (x.draws !== y.draws || x.drawSha !== y.drawSha) why.push(`the draws differ (${x.draws} against ${y.draws})`);
      if (!y.s?.worldComps?.uel && x.saved !== y.saved) why.push('the saved bytes differ');
      if (why.length) { ok(false, `2 ${name} at ${x.label}: ${why.join('; ')}`); break; }
    }
  }
  ok(carried > 0, '2 no journey of the head arm ever carried a Europa League, so the section compared nothing');
  checks += steps;
  console.log(`  2 self relative: ${journeys} journeys, ${steps} steps each arm, ${carried} journeys carried one, ${((Date.now() - t0) / 1000).toFixed(0)} s`);
}

/** Section 6: the dailies take the Europa League off with everything else, and what it costs them. */
async function dailies() {
  const { engineOf, tape } = await lib();
  const E = await engineOf(ROOT, 'daily', { edits: careerEdits() }, cannot);
  const baseRef = process.env.WORLD_EURO_BASE || '';
  const B = baseRef ? await engineOf(ROOT, 'dailybase', { base: baseRef }, cannot) : null;
  const time = async (Eng, club) => {
    const ms = [];
    for (let i = 0; i < 3; i += 1) { const M = await Eng.fresh(); const t = performance.now(); tape(0x1509 + i, () => M.cm.startCareer(club)); ms.push(performance.now() - t); }
    return ms.sort((p, q) => p - q)[1];
  };
  let days = 0, following = 0;
  const cost = [];
  for (let d = 0; d < 10; d += 1) {
    const date = new Date(Date.UTC(2026, 9, 17 + d)).toISOString().slice(0, 10);
    const M = await E.fresh();
    const setup = M.hs.dailyHotSeat(date);
    const run = tape(0x1509 + d, () => M.hs.startHotSeat({ club: setup.club, seed: setup.seed, daily: date })).value;
    ok(!('worldComps' in run.state), `6 daily: the Hot Seat of ${date} (${setup.club}) carries worldComps`);
    const hand = M.hs.handoverState ? tape(0x1509, () => M.hs.handoverState(run)).value : null;
    if (hand) ok(!('worldComps' in hand), `6 daily: the Hot Seat of ${date} hands over a career that carries worldComps`);
    const dd = M.dd.startDeadlineDay(M.dd.dailyDeadlineDay(date));
    ok(!('worldComps' in dd.state), `6 daily: the Deadline Day of ${date} carries worldComps`);
    if (tape(0x1509, () => M.cm.startCareer(setup.club)).value.worldComps?.uel) following += 1;
    days += 2;
    if (B) cost.push({ date, club: setup.club, head: await time(E, setup.club), base: await time(B, setup.club) });
  }
  console.log(`  6 dailies: ${days} days, ${following} of the Hot Seat clubs follow a Europa League before the strip`);
  for (const c of cost) console.log(`  6 startCareer ${c.date} ${c.club}: head ${c.head.toFixed(1)} ms, base ${c.base.toFixed(1)} ms, ${(c.head - c.base).toFixed(1)} ms more`);
  if (cost.length) {
    const more = cost.map(c => c.head - c.base).sort((p, q) => p - q);
    console.log(`  6 startCareer, the median a date costs more on this tree: ${more[Math.floor(more.length / 2)].toFixed(1)} ms (ruling 1l: over 10 ms, the dailies take the options object)`);
  }
}

/** Section 7: measured and printed, never asserted on a max. */
function printMeasured() {
  const m = measured;
  console.log(`  7 routes over every open: ${Object.entries(m.routes).sort().map(([k, v]) => `${k} ${v}`).join(', ')}`);
  console.log(`  7 my club's earned route at an open: ${Object.entries(m.earned).sort().map(([k, v]) => `${k} ${v}`).join(', ')}`);
  console.log(`  7 titles by strength quartile (strongest first): ${m.titles.join(', ')}`);
  console.log(`  7 goals a league phase match: ${(m.goals / Math.max(1, m.games)).toFixed(2)} over ${m.games}; ties after extra time ${m.aet}, shootouts ${m.pens}`);
  const b = [...m.bytes].sort((p, q) => p - q);
  if (b.length) console.log(`  7 the slice's bytes: ${b[0]} to ${b[b.length - 1]} over ${b.length} opens`);
  console.log(`  7 the nights' months against 2026/27's (U7): ${m.months.same} the same month, ${m.months.near} a month off, ${m.months.far} further; ${m.thursdays} of ${m.nights} on a Thursday`);
  for (const [k, v] of Object.entries(counts).sort()) console.log(`  ${k}: ${v}`);
}

/* ── Run ───────────────────────────────────────────────────────────────────────────────────────────── */
try {
  if (runs(0)) { section0(); await section0Engine(); }
  if (runs(1) || runs(4) || runs(7)) await europaPass();
  if (runs(2)) await selfRelative();
  if (runs(6)) await dailies();
  if (runs(1) || runs(4) || runs(7)) printMeasured();
} catch (err) {
  console.log(`simWorldEuro: cannot run: ${err && err.stack ? err.stack.split('\n').slice(0, 3).join(' | ') : err}`);
  process.exit(2);
}
for (const f of fails.slice(0, 40)) console.log(`FAIL ${f}`);
if (CONTROL) {
  const [, must, may = must] = CONTROLS[CONTROL];
  const own = fails.some(f => must.test(f));
  const stray = fails.filter(f => !may.test(f));
  if (!changed) { console.log(`simWorldEuro: control ${CONTROL} ABORTED: it changed nothing`); process.exit(2); }
  if (own && stray.length === 0) { console.log(`simWorldEuro: control ${CONTROL} FIRED (${fails.length} failures, all its own)`); process.exit(1); }
  console.log(`simWorldEuro: control ${CONTROL} DID NOT FIRE CLEANLY (own ${own}, stray ${stray.length}: ${stray.slice(0, 3).join(' / ')})`);
  process.exit(3);
}
console.log(`simWorldEuro: ${fails.length === 0 ? 'green' : 'RED'}, ${checks} checks, ${fails.length} failures`);
process.exit(fails.length === 0 ? 0 : 1);

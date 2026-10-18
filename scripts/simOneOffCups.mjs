/* Round 1510. Club Manager's domestic super cups: every season opens with its country's super cup in its era's
 * format wherever the ledger proves it (England's FA Community Shield first), followed from the Cups panel by a
 * club that is not in it and played from a manager's second summer by one that earned a place.
 *
 *   scripts/data/cmOneOffFormats.json   the rows and the season one editions, each fact on two families
 *   src/data/cmOneOffRows.ts             the values the game plays, held to the ledger by section 0
 *
 * SECTIONS (ONE_OFF_ONLY=0,1 runs some of them; the default is all that are built):
 *   0  the ledger. Every fact of a verified row stands on an official page and a press page on two hosts, none a
 *      wiki, each with a line about that fact; a row that is not verified carries no constant and is named in
 *      CM_ONE_OFF_PARTIAL; the receipt holds the ledger's hash; no dash of the two banned kinds; every tuple of
 *      cmOneOffRows.ts equals its ledger row; the ship blocker (England 2026 and its season one edition) stands;
 *      every season one club is a club of that country in the game's world, and the edition's clubs are the ones
 *      the game's own verified 2025-26 data names (the champions of CM_FINAL_TABLES_2025_26, the cup winners of
 *      Round 1509's SEASON_ONE_CUP_WINNERS).
 *   The sections below drive the real engine (scripts/lib/worldUclFleet.mjs: a fresh vm per save, the clock held, a
 *   counter stream) over the fleet fleetOf prints: today's world's English clubs (the only verified row: Arsenal and
 *   Manchester City, season one's entrants; Chelsea, Everton, Liverpool, a Championship club and a created club,
 *   watchers; Chelsea and Everton move mid season), clubs of countries with no row (Real Madrid, who move to Chelsea
 *   at the first rollover, Bayern Munich, a Liga MX club) and an era club (its row partial). Seeds 1 to 5
 *   (ONE_OFF_SEEDS), three seasons (ONE_OFF_SEASONS), the coach and noCoach (ONE_OFF_COACH), ONE_OFF_FLEET a club
 *   name filter. Section 1 runs a second fleet with the season's cup forced to its league champions (a double).
 *   1  once a season, the right clubs, the right format: every step holds exactly the country's row for the format
 *      year (none where the game has no row); season one's clubs are the edition's, a stub 'seasonOne' when my club
 *      is one of them, and no season one slice (or slice carried onto my new club with a night ahead) holds my club;
 *      every later season's are the rule over the FINISHED season's top flight and cup final, read here off the save
 *      before the rollover (the double rule and its mark, a move abroad 'moved', an unfinished season, no final);
 *      every finished cup one winner, extra time only on an 'et' row, penalties only after a level match.
 *   2  the calendar and the books of a participant (the season's cup handed to my club at the read, so every
 *      season two is mine), its first season with nights held to its twin (from that night the two arms part):
 *      its nights are the row's at the one placer's slots, `{ oneOff, dsc, n }` in order; with
 *      them taken out the calendar is its twin's (the same engine with the insertion off) entry for entry, and every
 *      other entry's DATE is the twin's; dates rise, a night three days or more from its neighbours, at most three
 *      matches in seven days to it; the season charges the twin's number of wage weeks; the summer window closes
 *      after the same entry as the twin's. Wages are printed: the staff desk's weekly events are keyed on the week
 *      index, which a night before them moves by one.
 *   3  SELF RELATIVE: the engine against itself with this round's three opens taken out (startCareer's, the
 *      rollover's, the move's carry, each asserted present once): every fleet save, both coach modes, equal at every
 *      step in every key but worldComps.dsc, every draw equal by count and value, evalOneOff called on the live state
 *      after every step of the head arm. A participant's season is compared with its nights taken out of the
 *      calendar, up to the step whose week passes its first night (from there it moves because it played).
 *   4  honours and the record (the match half): on the participant fleet with the final forced WON and forced LOST
 *      (two plugin arms): the won arm holds exactly one minor trophy, the cup's name and season, the lost arm none;
 *      the won season's history row holds the name; the result log holds the game in both; and, per weighing reader
 *      at the unit level, one state with and without a minor trophy reads the same (the nation's standing, the job
 *      market's count, the sponsor's offers, the season's grade and offers, the XP, the kitty, the wage cap, the
 *      fans' trophy term).
 *   5  the save: at most the three keys worldComps knows, the slice of the season in play, no minor trophy before the
 *      match half; the bytes of a slice and of a stub printed.
 *   6  the dailies: no Hot Seat or Deadline Day state, and no career a Hot Seat hands over, carries a super cup.
 *   7  measured and printed, nothing asserted: season one's stubs, shootouts, the stronger side's share, the help's
 *      worked example (Chelsea's season one: the clubs and the night's date).
 *
 * Exit 0 green, 1 red or a control that fired, 2 could not run or a control that changed nothing, 3 a control
 * that ran and did not fire. A control is ONE_OFF_CONTROL=<name>; it runs its own section only and must turn its
 * own check red and nothing that is not its own (the last line says FIRED, DID NOT FIRE or ABORTED).
 *   section 0, the data twisted in memory: onesource (eng-2026's decider keeps one family) wiki (a press page is a
 *              wiki) thinused (eng-2015, not verified, carries a constant) receipt (the hash of another text)
 *              notinworld (a season one club that is not a club of the game's world)
 *   section 1, the engine edited in the bundle: wrongyear (the row read by worldYearOf, not the format year)
 *              nodouble (the double rule skipped: the forced fleet) afterswap (the read after next season's
 *              memberships: a promoted manager) etall (extra time on a straight to penalties row) seasononeplay
 *              (season one's stub for my club taken out)
 *   section 2: tick (a skipped night ticks a week) adjacent (every night of a forced four club cup in the first
 *              gap: two midweeks in a row, a later date moves) countdown (a played night counts a window week)
 *              calweeks (the calendar's myMatchWeeks counts a night: its deadline is not the engine's)
 *   section 3: stream (a followed match draws Math.random) form (the evaluation writes the clubs' form)
 *              participant (a watcher given nights too)
 *   section 4: weighs (the minor filter taken out of weighedTrophies) notrophy (a won final pushes no trophy)
 *   section 5: keep (the rollover keeps last season's slice under a second key)
 *   A control whose case the fleet does not hold (no level match for etall, no promoted manager for afterswap)
 *   exits 3. Not controls here, with the reason: `ahead`, `noseen` and `othersemi` need a night that is not the
 *   opening one, and the only verified row is an 'open' cup, played before the season's first entry on every
 *   calendar (so it is never early, a move can never take it back, and it has no semi final). The placer's and
 *   the evaluation's rules for those places stand on the unit files (worldNights.test.ts, worldOneOffs.test.ts).
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { build } from 'esbuild';
import { CREATED, engineOf, tape } from './lib/worldUclFleet.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const text = file => fs.readFileSync(path.join(ROOT, file), 'utf8').replaceAll('\r\n', '\n');
const CONTROL = process.env.ONE_OFF_CONTROL || '';
const ONLY = (process.env.ONE_OFF_ONLY || '').split(',').filter(Boolean).map(Number);
const cannot = why => { console.log(`simOneOffCups: cannot run: ${why}`); process.exit(2); };

/* Each control: its section, the failure it MUST cause, and (third) every failure it MAY cause. */
const CONTROLS = {
  onesource: [0, /^eng-2026 decider stands on /, /^eng-2026 decider/],
  wiki: [0, /^SM-0814: .* is a wiki/, /^SM-0814/],
  thinused: [0, /^eng-2015 is not verified and carries/, /^eng-2015/],
  receipt: [0, /does not carry the hash/],
  notinworld: [0, /^eng-2026-s1: .* is not a club of england/, /^eng-2026-s1/],
};
const runs = n => (CONTROL ? CONTROLS[CONTROL][0] === n : ONLY.length === 0 || ONLY.includes(n));

const fails = [];
let checks = 0;
let fired = 0;
const ok = (cond, msg) => { checks += 1; if (!cond) fails.push(msg); };
const EN = String.fromCharCode(0x2013);
const EM = String.fromCharCode(0x2014);
const noDash = (name, s) => ok(!s.includes(EN) && !s.includes(EM), `${name} holds a dash of a banned kind`);
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

const LEDGER_FILE = 'scripts/data/cmOneOffFormats.json';
const RECEIPT_FILE = 'scripts/data/cmOneOffFormats.receipt.json';
const ROWS_FILE = 'src/data/cmOneOffRows.ts';
const CM = 'src/lib/clubManager.ts';
const ledger = JSON.parse(text(LEDGER_FILE));
const row = id => ledger.rows.find(r => r.id === id);

/** Bundle the given entry files (repo paths) into one module and import it. */
async function bundle(name, entries, plugins = []) {
  const work = fs.mkdtempSync(path.join(os.tmpdir(), `one-off-${name}-`));
  const entry = path.join(work, 'entry.ts');
  const P = f => JSON.stringify(path.join(ROOT, f).split(path.sep).join('/'));
  fs.writeFileSync(entry, Object.entries(entries).map(([as, f]) => `export * as ${as} from ${P(f)};`).join('\n'));
  const out = path.join(work, 'bundle.mjs');
  await build({ entryPoints: [entry], bundle: true, platform: 'node', format: 'esm', outfile: out, logLevel: 'error', alias: { '@': path.join(ROOT, 'src') }, plugins });
  return import(pathToFileURL(out).href);
}

/* ── Section 0: the ledger ── */
const isWiki = url => /wikipedia|wikimedia|fandom|wiki\.|grokipedia|wikiwand/i.test(new URL(url).host);
const publisherOf = url => { const h = new URL(url).host; return h.split('.').slice(/\.co\.(uk|za)$/.test(h) ? -3 : -2).join('.'); };
const FACTS = { format: ['name', 'shape', 'decider', 'entry', 'double', 'place', 'venue'], edition: ['clubs', 'ground'] };

function section0() {
  /* The controls of this section change the data in memory, the way a wrong edit of the file would. */
  if (CONTROL === 'onesource') { const f = row('eng-2026').facts.decider; fired += f.by.length > 1 ? 1 : 0; f.by = f.by.slice(0, 1); }
  if (CONTROL === 'wiki') { const s = ledger.sources['SM-0814']; fired += isWiki(s.url) ? 0 : 1; s.url = 'https://en.wikipedia.org/wiki/2026_FA_Community_Shield'; }
  if (CONTROL === 'thinused') { const r = row('eng-2015'); fired += r.status !== 'verified' && r.usedBy.length === 0 ? 1 : 0; r.usedBy = ['CM_ONE_OFF_ROWS.eng-2015']; }

  /* 0.1 Every source is a page somebody can open, of one family, with a date and a line. */
  for (const [id, s] of Object.entries(ledger.sources)) {
    ok(/^https:\/\//.test(s.url), `${id}: ${s.url} is not https`);
    ok(!isWiki(s.url), `${id}: ${s.url} is a wiki`);
    ok(s.family === 'official' || s.family === 'press', `${id}: family ${s.family} is neither official nor press`);
    ok(typeof s.publisher === 'string' && s.publisher.length > 2, `${id}: names no publisher`);
    ok(/^\d{4}-\d{2}-\d{2}$/.test(s.published) || s.published === 'undated', `${id}: no date and not marked undated`);
    ok(Array.isArray(s.literal) && s.literal.length > 0 && s.literal.every(l => l.length > 5 && l.split(' ').length <= 20), `${id}: no literal, or one over twenty words`);
  }
  /* 0.2 A verified fact stands on both families on two hosts, each with a line about it; a row that is not
     verified carries nothing. */
  const ids = new Set();
  for (const r of ledger.rows) {
    ok(!ids.has(r.id), `${r.id} is in the ledger twice`); ids.add(r.id);
    ok(r.status === 'verified' || r.status === 'toVerify', `${r.id}: status ${r.status} is neither verified nor toVerify`);
    ok(Array.isArray(r.usedBy), `${r.id}: no usedBy list`);
    if (r.status !== 'verified') {
      ok(r.usedBy.length === 0, `${r.id} is not verified and carries ${r.usedBy.join(', ')}`);
      ok(typeof r.standIn === 'string' && r.standIn.length > 20, `${r.id} is not verified and says nothing of what stands in`);
      continue;
    }
    for (const name of FACTS[r.kind] ?? []) {
      const f = r.facts?.[name];
      if (!f) { ok(false, `${r.id} ${name} is not in the row`); continue; }
      const srcs = (f.by ?? []).map(k => ({ k, s: ledger.sources[k] }));
      ok(srcs.every(x => !!x.s), `${r.id} ${name} names a source the ledger does not hold`);
      const good = srcs.filter(x => x.s);
      const fams = new Set(good.map(x => x.s.family));
      const pubs = new Set(good.map(x => publisherOf(x.s.url)));
      ok(fams.has('official') && fams.has('press') && pubs.size >= 2, `${r.id} ${name} stands on ${[...fams].join(' and ') || 'nothing'} (${pubs.size} hosts), not an official and a press page on two hosts`);
      const token = new RegExp(f.token ?? '^$', 'i');
      for (const x of good) ok(x.s.literal.some(l => token.test(l)), `${r.id} ${name}: ${x.k} has no line about it (${f.token})`);
    }
  }
  /* 0.3 The receipt vouches for this file, and no dash of the two banned kinds. */
  const receipt = JSON.parse(text(RECEIPT_FILE));
  const hash = createHash('sha256').update(text(LEDGER_FILE) + (CONTROL === 'receipt' ? ' ' : '')).digest('hex');
  if (CONTROL === 'receipt') fired += 1;
  ok(receipt.sha256 === hash && receipt.dataFile === LEDGER_FILE, `the receipt does not carry the hash of ${LEDGER_FILE} (${hash})`);
  ok(receipt.checkedBy === 'scripts/simOneOffCups.mjs', 'the receipt names another checker');
  noDash(LEDGER_FILE, text(LEDGER_FILE)); noDash(RECEIPT_FILE, text(RECEIPT_FILE)); noDash(ROWS_FILE, text(ROWS_FILE));
  const count = s => ledger.rows.filter(r => r.status === s).map(r => r.id).join(' ');
  console.log(`  0 ledger: verified ${count('verified')} | to verify ${count('toVerify')} | ${Object.keys(ledger.sources).length} pages`);
}

/* ── Section 0, second half: the constants state what the ledger states ── */
async function section0Engine() {
  const M = await bundle('rows', { r: ROWS_FILE, cm: CM, ft: 'src/data/clubManagerFinalTables2025_26.ts', e: 'src/lib/euroAccess.ts' });
  const { r: R, cm, ft, e } = M;
  const seasonOne = R.CM_ONE_OFF_SEASON_ONE.map(t => [...t]);
  if (CONTROL === 'notinworld') { fired += 1; seasonOne[0][2] = ['Arsenal', 'Torreense']; }
  /* 0.4 Every tuple is its verified ledger row, every verified row has its tuple, and the partial list is exactly
     the rows that are not verified. */
  const formats = ledger.rows.filter(x => x.kind === 'format');
  for (const t of R.CM_ONE_OFF_ROWS) {
    const [id, nation, year, name, shape, decider, entry, dbl, place, venue, away, pairing] = t;
    const r = row(id);
    if (!r || r.status !== 'verified') { ok(false, `${id}: a tuple with no verified ledger row`); continue; }
    const f = r.facts;
    ok(r.nation === nation && r.year === year, `${id}: the tuple is ${nation} ${year}, the ledger ${r.nation} ${r.year}`);
    ok(same([name, shape, decider, entry, dbl, place, venue], ['name', 'shape', 'decider', 'entry', 'double', 'place', 'venue'].map(k => f[k].value)), `${id}: the tuple ${JSON.stringify(t)} is not its ledger row`);
    ok(id === `${({ spain: 'esp' })[nation] ?? nation.slice(0, 3)}-${year}`, `${id}: the id is not the nation and year`);
    ok((away === 1) === (f.awayGoals?.value === true) && same(pairing ?? null, f.pairing?.value ?? null), `${id}: away goals or the pairing are not the ledger's`);
    ok(r.usedBy.includes(`CM_ONE_OFF_ROWS.${id}`), `${id}: the ledger does not say the tuple uses it`);
    ok(shape !== 'four' || (Array.isArray(pairing) && same([...pairing].sort(), [0, 1, 2, 3])), `${id}: a four with no pairing of the four entrants`);
  }
  for (const r of formats.filter(x => x.status === 'verified')) ok(R.CM_ONE_OFF_ROWS.some(t => t[0] === r.id), `${r.id}: verified, and no tuple plays it`);
  ok(same([...R.CM_ONE_OFF_PARTIAL].sort(), formats.filter(x => x.status !== 'verified').map(x => x.id).sort()), `CM_ONE_OFF_PARTIAL is ${R.CM_ONE_OFF_PARTIAL.join(' ')}, the rows not verified are ${formats.filter(x => x.status !== 'verified').map(x => x.id).join(' ')}`);
  ok(new Set(R.CM_ONE_OFF_ROWS.map(t => `${t[1]}|${t[2]}`)).size === R.CM_ONE_OFF_ROWS.length, 'two tuples for one country and year');
  /* The ship blocker: England 2026 and its season one edition. */
  ok(R.CM_ONE_OFF_ROWS.some(t => t[0] === 'eng-2026') && row('eng-2026-s1')?.status === 'verified', 'the ship blocker: England 2026 or its season one edition is not verified');
  /* 0.5 The season one editions: each its verified ledger row, its clubs clubs of that country in the game's world,
     and exactly the clubs the game's own verified 2025-26 data names by the row's rule. */
  const nationOf = id => cm.LEAGUE_RULES[id]?.nationId;
  for (const [rid, season, clubs, ground] of seasonOne) {
    const ed = ledger.rows.find(x => x.kind === 'edition' && x.row === rid);
    const t = R.CM_ONE_OFF_ROWS.find(x => x[0] === rid);
    if (!ed || ed.status !== 'verified' || !t) { ok(false, `${rid}: a season one edition with no verified ledger row or no tuple`); continue; }
    ok(ed.season === season && same([...clubs], ed.facts.clubs.value) && (ground ?? null) === (ed.facts.ground?.value ?? null), `${ed.id}: the constant ${JSON.stringify([rid, season, clubs, ground])} is not its ledger row`);
    ok(ed.usedBy.includes(`CM_ONE_OFF_SEASON_ONE.${rid}`), `${ed.id}: the ledger does not say the constant uses it`);
    const year = t[2];
    const world = year === 2026 ? cm.REAL_LEAGUES : null;
    if (!world) { ok(false, `${ed.id}: no world of ${year} to check its clubs against`); continue; }
    const leagues = world.filter(l => nationOf(l.id) === t[1]);
    const inWorld = new Set(leagues.flatMap(l => l.clubs));
    for (const c of clubs) ok(inWorld.has(c), `${ed.id}: ${c} is not a club of ${t[1]} in the game's world`);
    ok(new Set(clubs).size === clubs.length && clubs.length === (t[4] === 'four' ? 4 : 2), `${ed.id}: not ${t[4] === 'four' ? 4 : 2} different clubs`);
    /* The game's own 2025-26 data: the top flight's champions and runners up, and Round 1509's cup winners. */
    const top = leagues.find(l => cm.LEAGUE_RULES[l.id].ladder === 'top');
    const table = ft.CM_FINAL_TABLES_2025_26.leagues[top?.id]?.table ?? [];
    const cupWinner = e.SEASON_ONE_CUP_WINNERS[top?.id] ?? null;
    if (t[6] === 'champCup') {
      const second = cupWinner && cupWinner !== table[0] ? cupWinner : table[1];
      ok(same([...clubs], [table[0], second]), `${ed.id}: the game's 2025-26 data names ${table[0]} and ${second}, the edition ${clubs.join(' and ')}`);
    } else ok(false, `${ed.id}: entry ${t[6]} has no season one cross check yet`);
  }
  console.log(`  0 constants: ${R.CM_ONE_OFF_ROWS.length} rows (${R.CM_ONE_OFF_ROWS.map(t => t[0]).join(' ')}), ${seasonOne.length} season one editions, partial ${R.CM_ONE_OFF_PARTIAL.join(' ')}`);
}


/* ── The engine sections (S3 on): the fleets, the journeys, the oracle ── */
const ONE = 'src/lib/worldOneOffs.ts';
const CAL = 'src/lib/clubManagerCalendar.ts';
const SEEDS = (process.env.ONE_OFF_SEEDS || '1,2,3,4,5').split(',').filter(Boolean).map(Number);
const SEASONS = Number(process.env.ONE_OFF_SEASONS || 3);
const COACH = process.env.ONE_OFF_COACH || 'both';
const FLEET_ONLY = process.env.ONE_OFF_FLEET || '';
/* This round's three opens, each asserted to stand exactly once (engineOf refuses otherwise): section 3's other arm
   takes them out, which is the engine before the round. */
const OPENS = [
  { file: CM, from: '  openOneOffsOnStart(state, world);\n', to: '' },
  { file: CM, from: "    openOneOff(state, oneOffFrom.nation === oneOffNationOf(state) ? { tables, seasonOne: false } : { tables: null, seasonOne: false, skip: 'moved' });\n", to: '    setOneOffSlice(state, null);\n' },
  { file: CAL, from: '  carryOneOffs(career, joined);\n', to: '' },
];
/* The forced double fleet: the season's cup is handed to its league champions at the read, so every season two
   is a double and the rule's other club plays (the dsc read only: nothing else of the season moves). */
const FORCE_DOUBLE = { file: CM, from: '  const oneOffFrom = oneOffTablesOf(career);\n', to: '  const oneOffFrom = (t => ({ ...t, cupWinner: t.table?.[0] ?? t.cupWinner }))(oneOffTablesOf(career));\n' };
const ENGINE_EDITS = {
  wrongyear: [{ file: CM, from: '  return oneOffRowFor(oneOffNationOf(state), uclSeasonYear(state.eraId));', to: '  return oneOffRowFor(oneOffNationOf(state), worldYearOf(state as CareerState));' }],
  nodouble: [{ file: ONE, from: "    if (!c || out.includes(c)) { c = isCup && row.double === 'cupRunnerUp' ? t.cupRunnerUp : nextLeague(); doubled = true; }", to: '    if (!c) { c = nextLeague(); doubled = true; }' }],
  afterswap: [{ file: CM, from: '  const oneOffFrom = oneOffTablesOf(career);\n  registerLeagueOverrides(pr.overrides);', to: '  registerLeagueOverrides(pr.overrides);\n  const oneOffFrom = oneOffTablesOf(career);' }],
  etall: [{ file: ONE, from: "deciderScale: row.decider === 'et' ? bind.deciderScale : 1, etScale: bind.etScale, extraTime: row.decider === 'et' };", to: "deciderScale: row.decider === 'et' ? bind.deciderScale : 1, etScale: bind.etScale, extraTime: true };" }],
  seasononeplay: [{ file: CM, from: "    if (mine && from.seasonOne) { stub('seasonOne'); return; }\n", to: '' }],
  stream: [{ file: ONE, from: '    const rand = keyedRng(keyOf(fx));\n    const t: SettleableTie', to: '    const rand = Math.random;\n    const t: SettleableTie' }],
  form: [{ file: CM, from: '  const out = evaluateOneOff(slice, row, k, oneOffBind(state));\n  memo.set(k, out);', to: '  const out = evaluateOneOff(slice, row, k, oneOffBind(state));\n  if (out) for (const f of out.fixtures) if (f.hg !== undefined) noteForm(state, f.home, f.away, f.hg, f.ag as number);\n  memo.set(k, out);' }],
  keep: [{ file: CM, from: '  if (slice) next.dsc = slice;\n  else delete next.dsc;', to: '  if (slice) { if (next.dsc) (next as Record<string, unknown>).dscOld = next.dsc; next.dsc = slice; }\n  else delete next.dsc;' }],
};
Object.assign(CONTROLS, {
  wrongyear: [1, /^1 row: /, /^1 /],
  nodouble: [1, /^1 entrants: .*forced/, /^1 /],
  afterswap: [1, /^1 entrants: /, /^1 /],
  etall: [1, /^1 extra time: /, /^1 /],
  seasononeplay: [1, /^1 season one: /, /^1 /],
  stream: [3, /^3 .*the draws differ/, /^3 /],
  form: [3, /^3 .*the state differs/, /^3 /],
  keep: [5, /^5 slices: /, /^5 /],
});
const editsFor = (extra = []) => [...(ENGINE_EDITS[CONTROL] ?? []), ...extra];
const counts = {};
const bump = (k, n = 1) => { counts[k] = (counts[k] ?? 0) + n; };

/** The fleet, by the engine's own answer: today's world's English clubs (the only verified row), the clubs of
 *  countries the game has no row for, an era club, a created club, and two moves. Printed. */
function fleetOf(M) {
  const champ = M.cm.REAL_LEAGUES.find(l => l.id === 'championship');
  const mx = M.cm.REAL_LEAGUES.find(l => /mx/i.test(l.id));
  if (!champ || !mx) cannot('no Championship or Liga MX league in REAL_LEAGUES');
  const created = { ...CREATED, leagueId: 'championship' };
  const list = [
    { club: 'Arsenal', era: 'now', why: 'season one champions' }, { club: 'Manchester City', era: 'now', why: 'season one cup winners' },
    { club: 'Chelsea', era: 'now', why: 'watcher', join: 'Manchester City' }, { club: 'Everton', era: 'now', why: 'watcher', join: champ.clubs[champ.clubs.length - 1] },
    { club: 'Liverpool', era: 'now', why: 'watcher' }, { club: champ.clubs[0], era: 'now', why: 'second tier watcher' },
    { club: created.name, era: 'now', custom: created, why: 'created club in the Championship' },
    { club: 'Real Madrid', era: 'now', why: 'no row (Spain)', move: 'Chelsea' }, { club: 'Bayern Munich', era: 'now', why: 'no row (Germany)' },
    { club: mx.clubs[0], era: 'now', why: 'no row (Mexico, no cup)' }, { club: 'Arsenal', era: 'era2005', why: 'era row partial' },
  ];
  return list.filter(f => !FLEET_ONLY || f.club.includes(FLEET_ONLY));
}

/** One journey: startCareer, every playNextEntry, finishSeason, startNextSeason, through `seasons`, with a reload in
 *  every season, a mid season move where the fleet row asks (season one, entry 25) and a summer move where it asks
 *  (the first rollover). Every step on its own stretch of the counter stream; `onStep` sees every state. */
async function journey(E, f, seed, mode, { evalEach = false, record = null, mark = null, onStep, onRollover } = {}) {
  const M = await E.fresh();
  const opts = mode === 'coach' ? { skipHalftime: true } : { skipHalftime: true, noCoach: true };
  const steps = [];
  let s = null;
  let k = 0;
  const step = (label, fn) => {
    k += 1;
    const r = tape((seed * 0x9e3779b1 + k * 7919) >>> 0, () => {
      const out = fn(s);
      if (evalEach && out?.state) { M.cm.evalOneOff(out.state); M.cm.oneOffNightsDone(out.state); }
      return out;
    });
    const got = r.value ?? {};
    if (got.state) s = got.state;
    steps.push({ label, m: mark && s ? mark(s) : false, h: record && s ? createHash('sha256').update(record(s)).digest('hex').slice(0, 16) : null, draws: r.draws.length, drawSha: createHash('sha256').update(JSON.stringify(r.draws)).digest('hex').slice(0, 16) });
    onStep?.(M, s, label, got);
  };
  step('start', () => ({ state: f.custom ? M.cm.startCareer(f.club, f.era, f.custom) : M.cm.startCareer(f.club, f.era) }));
  const reload = cur => { M.store.clear(); if (!M.cm.saveCareer(cur)) return {}; return { state: M.cm.loadCareer() }; };
  for (let season = 1; season <= SEASONS; season += 1) {
    let over = false;
    for (let i = 0; i < 260 && !over; i += 1) {
      step(`s${season}-e${i + 1}`, cur => { const r = M.cm.playNextEntry(cur, opts); over = r.kind === 'seasonOver'; return { state: r.state }; });
      if (i === 20) step(`s${season}-reload`, reload);
      if (season === 1 && i === 25 && f.join) {
        const lg = M.cm.REAL_LEAGUES.find(l => l.clubs.includes(f.join));
        step('s1-join', cur => {
          const open = { club: f.join, league: lg.id, tier: 3, season: cur.season, week: cur.week, matchesLeft: 0, roll: 0, status: 'accepted' };
          const joined = M.cal.joinClubNow({ ...cur, jobHunt: { open, cooldowns: [], sentSeason: cur.season, sent: 1, summerMove: null } });
          return joined ? { state: joined, joined: cur } : {};
        });
      }
    }
    if (!over) throw new Error(`season ${season} did not end in 260 entries`);
    step(`s${season}-finish`, cur => ({ state: M.cm.finishSeason(cur).state }));
    if (season < SEASONS) {
      /* The oracle reads the finished season BEFORE the rollover registers next season's memberships. */
      const expected = onRollover ? onRollover.before(M, s) : null;
      step(`s${season}-rollover`, cur => ({ state: season === 1 && f.move ? M.cm.startNextSeason(cur, f.move) : M.cm.startNextSeason(cur) }));
      onRollover?.after(M, expected, s, season);
    }
  }
  return steps;
}

const ONE_OFF_IDS = new Set();
const rowIdOf = (nation, year) => `${nation === 'spain' ? 'esp' : nation.slice(0, 3)}-${year}`;
/** The row a save should play, worked out here: its country's id for the format year (an era save's start year, or
 *  2026 for today's world), and whether cmOneOffRows.ts has it. */
function expectedRow(M, R, s) {
  const nation = M.cm.leagueRulesOf(M.cm.careerLeagueOf(s).id).nationId;
  const year = s.eraId && M.eras.isHistoricEra(s.eraId) ? s.startYear : 2026;
  const id = rowIdOf(nation, year);
  const t = R.CM_ONE_OFF_ROWS.find(x => x[0] === id) ?? null;
  return { id, nation, row: t ? { id, name: t[3], shape: t[4], decider: t[5] } : null };
}
/** The oracle of the next season's entrants, read off the finished season before the rollover: the top flight's
 *  final order and the cup final, by the row's rule (the champions, the cup winners, the runners up on a double). */
function oracleOf(M, prev, forced) {
  const lg = M.cm.careerLeagueOf(prev);
  const nation = M.cm.leagueRulesOf(lg.id).nationId;
  const top = M.cm.worldLeagueDefs(prev).find(l => { const r = M.cm.leagueRulesOf(l.id); return r.nationId === nation && r.ladder === 'top'; });
  const finished = Array.isArray(prev.calendar) && prev.week >= prev.calendar.length;
  const rows = !top ? [] : top.id === lg.id ? M.cm.sortedLeagueTable(prev) : (prev.world?.[top.id] ? M.cm.sortedWorldTable(prev, top.id, prev.world[top.id].table) : []);
  const table = rows.map(r => r.club);
  const f = prev.cupBracket?.find(t => t.round === 'F');
  const cupWinner = forced ? table[0] ?? null : f?.winner ?? null;
  const champ = table[0] ?? null;
  const doubled = !!cupWinner && cupWinner === champ;
  return { nation, finished, champ, cupWinner, doubled, clubs: champ && cupWinner ? [champ, doubled ? table[1] : cupWinner] : null, promoted: lg.id !== top?.id, leagueId: lg.id };
}

/** Sections 1, 5 and 7: every fleet save, both coach modes, every seed; with `forced` the double fleet. */
async function fleetPass(forced) {
  const label = forced ? 'forced' : 'fleet';
  const E = await engineOf(ROOT, label, { edits: editsFor(forced ? [FORCE_DOUBLE] : []) }, cannot);
  const R = (await bundle('rows1', { r: ROWS_FILE })).r;
  const probe = await E.fresh();
  const fleet = fleetOf(probe);
  console.log(`  1 ${label}: ${fleet.map(f => `${f.club} (${f.era}, ${f.why})`).join('; ')}`);
  for (const f of fleet) {
    for (const seed of SEEDS) {
      for (const mode of COACH === 'both' ? ['coach', 'nocoach'] : [COACH]) {
        const tag = `${f.club} (${f.era}) seed ${seed} ${mode}${forced ? ' forced' : ''}`;
        let joined = false;
        await journey(E, f, seed, mode, {
          onStep: (M, s, stepLabel, got) => {
            if (!s) return;
            if (/-rollover$/.test(stepLabel)) joined = false;
            if (got.joined) joined = true;
            const want = expectedRow(M, R, s);
            const dsc = s.worldComps?.dsc;
            /* 1: the right row, every step. */
            if (want.row) ok(!!dsc && dsc.row === want.id && dsc.s === s.season, `1 row: ${tag} at ${stepLabel}: ${dsc ? `holds ${dsc.row} of season ${dsc.s}` : 'holds no super cup'}, its country plays ${want.id}`);
            else ok(!dsc, `1 row: ${tag} at ${stepLabel}: holds ${dsc?.row} but ${want.id} is no row of the game`);
            /* 5: one slice at most, of the season in play, and nothing else beside the keys the save knows. */
            const keys = Object.keys(s.worldComps ?? {});
            ok(keys.every(k => k === 'ucl' || k === 'uel' || k === 'dsc'), `5 slices: ${tag} at ${stepLabel}: worldComps holds ${keys.join(' ')}`);
            ok((s.trophies ?? []).filter(t => t.minor).every(t => t.name === (want.row?.name ?? "") && t.season <= s.season), `5 trophies: ${tag} at ${stepLabel}: a minor trophy that is not its country's super cup`);
            if (!dsc) return;
            ONE_OFF_IDS.add(dsc.row);
            /* 1: season one, and after a move, never a slice that simulates my club. */
            /* Season one's cup is in my tenure even at week 0 (a career starts in the summer window); after a move, a
               night already played before I arrived is history, one still ahead is not. */
            const ahead = M.cm.oneOffNightsDone(s) < (dsc.clubs?.length === 4 ? 2 : 1);
            if (dsc.clubs?.includes(s.clubName) && ((s.season === 1 && !joined) || (joined && ahead))) ok(false, `1 season one: ${tag} at ${stepLabel}: a ${joined ? 'carried' : 'season one'} slice holds my club ${s.clubName}, so the game would play it without me`);
            if (s.season === 1 && !joined && !dsc.skip) {
              const ed = R.CM_ONE_OFF_SEASON_ONE.find(e => e[0] === dsc.row);
              ok(!!ed && same(dsc.clubs, [...ed[2]]), `1 season one: ${tag}: the clubs ${dsc.clubs?.join(' and ')} are not the edition's`);
            }
            if (s.season === 1 && !joined && dsc.skip) ok(dsc.skip === 'seasonOne', `1 season one: ${tag}: a stub ${dsc.skip}`);
            if (stepLabel === 'start') bump(`7 season one ${dsc.skip ? `stub ${dsc.skip}` : 'followed'}`);
            if (/-finish$/.test(stepLabel) && !dsc.skip) {
              const res = M.cm.evalOneOff(s);
              const all = M.cm.evalOneOff(s, Infinity);
              ok(!!res && res.done && same(res, all), `1 winner: ${tag} at ${stepLabel}: the season is over and the cup is not (${res?.nightsDone} of ${res?.nights} nights)`);
              ok(!!res?.winner && dsc.clubs.includes(res.winner) && res.runnerUp !== res.winner && dsc.clubs.includes(res.runnerUp), `1 winner: ${tag}: no single winner among the clubs`);
              for (const fx of res?.fixtures ?? []) {
                ok(want.row.decider === 'et' || !fx.aet, `1 extra time: ${tag}: extra time on a straight to penalties cup`);
                ok(!fx.pens || fx.hg === fx.ag, `1 penalties: ${tag}: a shootout after ${fx.hg}-${fx.ag}`);
                if (want.row.decider === 'pens' && fx.hg === fx.ag) bump('1 level matches on a pens row (the etall control needs one)');
                if (fx.pens) bump('7 settled on penalties'); else bump('7 settled in 90 minutes');
                const sh = dsc.str[dsc.clubs.indexOf(fx.home)], sa = dsc.str[dsc.clubs.indexOf(fx.away)];
                if (sh !== sa) bump(fx.winner === (sh > sa ? fx.home : fx.away) ? '7 won by the stronger side' : '7 won by the weaker side');
              }
              /* Won by my club and played by my club: a cup carried onto my new club after a move is not mine. */
              const mineWon = res?.winner === s.clubName && Object.keys(dsc.mine ?? {}).length > 0;
              ok((s.trophies ?? []).filter(t => t.minor && t.season === s.season).length === (mineWon ? 1 : 0), `5 trophies: ${tag} at ${stepLabel}: ${mineWon ? "my club won the cup and" : "my club did not win it and"} the cabinet holds ${(s.trophies ?? []).filter(t => t.minor && t.season === s.season).length} of this season`);
              if (mineWon) bump("4 super cups my club won (section 1 fleet)");
              bump(`5 bytes of a followed ${want.row.shape} slice`, JSON.stringify(dsc).length);
              bump(`5 followed ${want.row.shape} slices measured`);
              if (s.season === 1 && f.club === 'Chelsea' && seed === SEEDS[0] && mode === 'nocoach') {
                const places = M.cm.oneOffNightPlaces(s);
                const dates = M.cal.entryDatesOf(s);
                const d = places?.[0]?.at === 0 ? M.cal.addDays(dates[0], -3) : null;
                console.log(`  7 the help's example (Chelsea season one): ${dsc.clubs.join(' v ')}, night slot ${places?.[0]?.at}, ${d ? `${d.y}-${d.m}-${d.d}` : 'no date'}, first league date ${dates[0].y}-${dates[0].m}-${dates[0].d}`);
              }
            }
            if (dsc.skip) bump(`5 bytes of a stub`, JSON.stringify(dsc).length), bump('5 stubs measured');
          },
          onRollover: {
            before: (M, prev) => oracleOf(M, prev, forced),
            after: (M, want, s, season) => {
              const dsc = s.worldComps?.dsc;
              const row = expectedRow(M, R, s);
              const t = `${tag} season ${season + 1}`;
              if (want.promoted) bump('1 rollovers of a manager outside the top flight');
              if (M.cm.careerLeagueOf(s).id !== want.leagueId) bump('1 rollovers into another league (the afterswap control reads these)');
              if (!row.row) { ok(!dsc, `1 entrants: ${t}: a super cup where the game has no row`); return; }
              if (want.nation !== row.nation) { ok(dsc?.skip === 'moved', `1 entrants: ${t}: a move from ${want.nation} holds ${dsc?.skip ?? dsc?.clubs?.join(' ')}, not the moved stub`); bump('1 moved stubs'); return; }
              if (!want.finished) { ok(dsc?.skip === 'unfinished', `1 entrants: ${t}: an unfinished season holds ${dsc?.skip ?? 'a slice'}`); return; }
              if (!want.clubs) { ok(dsc?.skip === 'noFinal', `1 entrants: ${t}: a season with no cup final holds ${dsc?.skip ?? 'a slice'}`); return; }
              const mine = want.clubs.includes(s.clubName);
              if (mine) { bump('1 participants (my club earned a place: played from the match half)'); ok(!!dsc && !dsc.skip && same(dsc.clubs, want.clubs), `1 entrants: ${t}${forced ? ' forced' : ''}: my club's cup holds ${dsc?.skip ?? dsc?.clubs?.join(' and ')}, the rule says ${want.clubs.join(' and ')}`); return; }
              ok(!!dsc && !dsc.skip && same(dsc.clubs, want.clubs), `1 entrants: ${t}${forced ? ' forced' : ''}: ${dsc?.skip ?? dsc?.clubs?.join(' and ')}, the rule says ${want.clubs.join(' and ')}${want.doubled ? ' (a double)' : ''}`);
              ok(!!dsc && (!!dsc.dbl) === want.doubled, `1 entrants: ${t}${forced ? ' forced' : ''}: the double mark is ${!!dsc?.dbl}, the season ${want.doubled ? 'was' : 'was not'} a double`);
              bump(want.doubled ? '1 doubles (the runners up took the cup place)' : '1 plain fields (champions v cup winners)');
            },
          },
        });
      }
    }
  }
}

/** A state's bytes with the super cup's own key taken out (and the map with it when it is left empty). */
const withoutDsc = st => {
  if (!st.worldComps || !('dsc' in st.worldComps)) return JSON.stringify(st);
  const w = { ...st.worldComps };
  delete w.dsc;
  const c = { ...st };
  if (Object.keys(w).length) c.worldComps = w; else delete c.worldComps;
  return JSON.stringify(c);
};

/** Section 3, SELF RELATIVE: the engine against itself with this round's three opens taken out (each asserted to
 *  stand once), every fleet save, both coach modes: equal at every step in every key but worldComps.dsc, every draw
 *  equal by count and value, the super cup evaluated on the live state after every step of the head arm. */
async function selfRelative() {
  const head = await engineOf(ROOT, 'head', { edits: editsFor() }, cannot);
  const off = await engineOf(ROOT, 'off', { edits: OPENS }, cannot);
  const probe = await head.fresh();
  let journeys = 0, stepsSeen = 0, carried = 0;
  for (const f of fleetOf(probe)) {
    for (const seed of SEEDS) {
      for (const mode of COACH === 'both' ? ['coach', 'nocoach'] : [COACH]) {
        const tag = `${f.club} (${f.era}) seed ${seed} ${mode}`;
        /* A participant's season holds its nights: compared with them taken out of the calendar, and only until the
           week passes the first of them (from there it moves because it played, the match half's attribution). */
        const headRecord = st => ((st.calendar ?? []).some(e => e.night) ? withoutDsc({ ...st, calendar: st.calendar.filter(e => !e.night) }) : withoutDsc(st));
        const pastNight = st => !!st.worldComps?.dsc?.clubs?.includes(st.clubName) && (st.calendar ?? []).some((e, i) => e.night && i < st.week);
        const a = await journey(head, f, seed, mode, { evalEach: true, record: headRecord, mark: pastNight, onStep: (M, s) => { if (s?.worldComps?.dsc) carried += 1; } });
        const b = await journey(off, f, seed, mode, { record: st => JSON.stringify(st) });
        journeys += 1;
        stepsSeen += a.length;
        let compared = 0;
        for (let i = 0; i < Math.min(a.length, b.length); i += 1) {
          const x = a[i], y = b[i];
          if (x.m) { bump('3 participant journeys compared up to their first night'); break; }
          if (x.draws !== y.draws || x.drawSha !== y.drawSha) { ok(false, `3 ${tag} at ${x.label}: the draws differ (${x.draws} against ${y.draws})`); break; }
          if (x.h !== y.h) { ok(false, `3 ${tag} at ${x.label}: the state differs in a key other than worldComps.dsc`); break; }
          ok(true, '');
          compared += 1;
        }
        if (compared === Math.min(a.length, b.length)) ok(a.length === b.length, `3 ${tag}: ${a.length} steps against ${b.length}`);
      }
    }
  }
  console.log(`  3 self relative: ${journeys} journeys, ${stepsSeen} steps each arm, ${carried} steps carrying a super cup`);
}

/** Section 6: the dailies' state shape. No Hot Seat or Deadline Day state carries worldComps or a night, and the
 *  career a Hot Seat run hands to Club Manager carries none either. */
async function dailies() {
  const E = await engineOf(ROOT, 'daily', { edits: editsFor() }, cannot);
  let days = 0;
  const night = st => (st.calendar ?? []).some(e => e.night || e.type === 'oneOff');
  for (let d = 0; d < 10; d += 1) {
    const date = new Date(Date.UTC(2026, 9, 17 + d)).toISOString().slice(0, 10);
    const M = await E.fresh();
    const setup = M.hs.dailyHotSeat(date);
    const run = tape(0x1510 + d, () => M.hs.startHotSeat({ club: setup.club, seed: setup.seed, daily: date })).value;
    ok(!('worldComps' in run.state) && !night(run.state), `6 daily: the Hot Seat of ${date} (${setup.club}) carries worldComps or a night`);
    const handed = tape(0x2510 + d, () => M.hs.handoverState(run)).value;
    ok(!handed.worldComps?.dsc && !night(handed), `6 daily: the career handed over from the Hot Seat of ${date} carries a super cup or a night`);
    const dd = M.dd.startDeadlineDay(M.dd.dailyDeadlineDay(date));
    ok(!('worldComps' in dd.state) && !night(dd.state), `6 daily: the Deadline Day of ${date} carries worldComps or a night`);
    days += 2;
  }
  console.log(`  6 dailies: ${days} daily states and 10 handovers, none with a super cup`);
}


/* ── Section 2: the calendar and the books of a participant ── */
/* The participant fleet: the season's cup handed to my own club at the read, so every season two is played. */
const FORCE_MINE = { file: CM, from: '  const oneOffFrom = oneOffTablesOf(career);\n', to: '  const oneOffFrom = (t => ({ ...t, cupWinner: career.clubName }))(oneOffTablesOf(career));\n' };
const INSERT_OFF = { file: CM, from: '    if (mine) insertOneOffNights(state, slots as number[]);\n', to: '' };
Object.assign(ENGINE_EDITS, {
  /* The guard taken out, on nights the participant does not play (its arm answering no), so each is skipped and
     the skip ticks: an 'open' one match night is always played in the match half, so only a skip reaches it. */
  tick: [
    { file: CM, from: '      if (!entry.night) tickWeek(state, null);\n', to: '      tickWeek(state, null);\n' },
    { file: CM, from: "    case 'oneOff': return oneOffMyFixture(state, entry) !== null;", to: "    case 'oneOff': return false;" },
  ],
  countdown: [{ file: CM, from: '  if (state.transferWindow !== null && !entry.night) {', to: '  if (state.transferWindow !== null) {' }],
  calweeks: [
    { file: CAL, from: "    if (r.week < state.week && r.competition !== 'oneOff') weeks.add(r.week);", to: '    if (r.week < state.week) weeks.add(r.week);' },
    { file: CAL, from: "    if (entry.type === 'window' || entry.night) continue;", to: "    if (entry.type === 'window') continue;" },
  ],
  /* Section 3: a watcher given nights too. */
  participant: [{ file: CM, from: '    if (mine) insertOneOffNights(state, slots as number[]);\n', to: '    insertOneOffNights(state, placeNights(state.calendar, entryDatesOf(state), oneOffNightsOf(row), oneOffRedate(state)) as number[]);\n' }],
  /* A naive placing on a forced four club new year cup: every night of the cup in the first gap the search found,
     two midweeks in a row (the rule "never two midweeks in one gap" forgotten). The engine's own leagues give no
     season where the first gap of a search is not free, so the naive slot is made to differ this way. */
  adjacent: [
    { file: CM, from: '  const order = slots.map((at, n) => ({ at, n })).sort((a, b) => b.at - a.at || b.n - a.n);', to: '  const order = slots.map((_, n) => ({ at: slots[0], n })).sort((a, b) => b.at - a.at || b.n - a.n);' },
    { file: ROWS_FILE, from: "'FA Community Shield', 'one', 'pens', 'champCup', 'leagueRunnerUp', 'open', 'n'],", to: "'FA Community Shield', 'four', 'pens', 'top2cup2', 'nextLeague', 'newYear', 'n', 0, [0, 3, 2, 1]]," },
  ],
});
Object.assign(CONTROLS, {
  tick: [2, /^2 books: /, /^2 /],
  countdown: [2, /^2 window: /, /^2 /],
  calweeks: [2, /^2 window: /, /^2 /],
  participant: [3, /^3 .*the state differs/, /^3 /],
  adjacent: [2, /^2 dates: /, /^2 /],
});
const nightIdx = cal => cal.map((e, i) => (e.night ? i : -1)).filter(i => i >= 0);
const fits = [];
/** The mean fitness of the save's picked eleven. */
const fitOf = s => { const xi = (s.xiIds ?? []).map(id => s.squad.find(p => p.id === id)).filter(Boolean); return xi.length ? xi.reduce((n, p) => n + p.fitness, 0) / xi.length : null; };
const iso = d => `${d.y}-${String(d.m).padStart(2, '0')}-${String(d.d).padStart(2, '0')}`;

async function calendarSection() {
  const head = await engineOf(ROOT, 'cal-head', { edits: editsFor([FORCE_MINE]) }, cannot);
  const twin = await engineOf(ROOT, 'cal-twin', { edits: [...(CONTROL === 'adjacent' ? ENGINE_EDITS.adjacent.filter(e => e.file === ROWS_FILE) : []), FORCE_MINE, INSERT_OFF] }, cannot);
  const W = await bundle('nights', { n: 'src/lib/worldNights.ts', o: ONE });
  const probe = await head.fresh();
  const fleet = fleetOf(probe).filter(f => ['Chelsea', 'Everton', 'Arsenal', 'Birmingham City'].includes(f.club) && f.era === 'now').map(f => ({ ...f, join: undefined }));
  let seasons = 0, nights = 0, maxIn7 = 0, gapMin = 99;
  for (const f of fleet) {
    for (const seed of SEEDS) {
      for (const mode of COACH === 'both' ? ['coach', 'nocoach'] : [COACH]) {
        const tag = `${f.club} seed ${seed} ${mode}`;
        const pick = () => {
          const out = { after: [], end: [], closes: [], actual: [], predicted: [], fit0: null, fit1: null };
          let window = null;
          return { out, hooks: {
            onStep: (M, s, label) => {
              if (!s) return;
              if (window === 'summer' && s.transferWindow === null) {
                const played = s.calendar.slice(0, s.week).filter(e => !e.night);
                const last = played[played.length - 1];
                out.closes.push(`${s.season}:${last?.type}:${last?.round}:${played.length}`);
                out.actual.push({ season: s.season, w: s.week - 1 });
              }
              window = s.transferWindow;
              if (label === 's2-e1') out.fit1 = fitOf(s);
              if (/-finish$/.test(label)) out.end.push({ season: s.season, weeks: s.books?.season?.weeks ?? null, pw: s.books?.season?.playerWages ?? null, sw: s.books?.season?.staffWages ?? null });
              if (/-rollover$/.test(label)) {
                const dates = M.cal.entryDatesOf(s);
                out.after.push({ season: s.season, cal: s.calendar, dates: dates.map(iso), plan: !!M.cal.seasonPlanOf(s), dsc: s.worldComps?.dsc ?? null, mine: s.clubName });
                out.predicted.push({ season: s.season, w: M.cal.windowSpans(s).find(w => w.kind === 'summer')?.deadlineWeek ?? null });
                if (out.fit0 === null) out.fit0 = fitOf(s);
              }
            },
          } };
        };
        const a = pick();
        await journey(head, f, seed, mode, a.hooks);
        const b = pick();
        await journey(twin, f, seed, mode, b.hooks);
        let firstNight = null;
        for (let i = 0; i < a.out.after.length; i += 1) {
          const x = a.out.after[i], y = b.out.after[i];
          if (!y) { ok(false, `2 ${tag}: the twin has no season ${x.season}`); continue; }
          seasons += 1;
          const idx = nightIdx(x.cal);
          const mine = x.dsc && !x.dsc.skip && x.dsc.clubs?.includes(x.mine);
          ok(!mine === (idx.length === 0), `2 nights: ${tag} season ${x.season}: ${idx.length} nights on the calendar of a club ${mine ? 'in' : 'not in'} its super cup`);
          if (!mine) continue;
          /* Only the first season with nights is held to the twin: from its first night the two arms part (the week
             keyed events above, and so a different season), so a later season is a different season, not a comparison. */
          if (firstNight !== null) { bump('2 later participant seasons (not held to the twin: the arms have parted)'); continue; }
          firstNight = x.season;
          nights += idx.length;
          const rowT = W.o.oneOffRowById(x.dsc.row);
          const want = W.n.placeNights(y.cal, y.dates.map(d => { const [yy, mm, dd] = d.split('-').map(Number); return { y: yy, m: mm, d: dd }; }), W.o.oneOffNightsOf(rowT));
          const placed = idx.map((at, k) => at - k);
          ok(same(placed, want), `2 slots: ${tag} season ${x.season}: the nights sit before entries ${placed.join(',')}, the placer gives ${want.join(',')}`);
          ok(idx.every((at, n) => x.cal[at].type === 'oneOff' && x.cal[at].night.k === 'dsc' && x.cal[at].night.n === n), `2 nights: ${tag} season ${x.season}: a night entry is not { oneOff, dsc, n } in order`);
          const stripped = x.cal.filter(e => !e.night);
          ok(same(stripped, y.cal), `2 calendar: ${tag} season ${x.season}: with the nights taken out the calendar is not the twin's`);
          const others = x.dates.filter((_, i2) => !idx.includes(i2));
          ok(same(others, y.dates), `2 dates: ${tag} season ${x.season}${x.plan ? ' (a late season)' : ''}: an entry's date moved (first: ${others.find((d, k) => d !== y.dates[k])})`);
          const days = x.dates.map(d => Date.parse(`${d}T00:00:00Z`) / 86400000);
          ok(days.every((d, k) => k === 0 || d > days[k - 1]), `2 dates: ${tag} season ${x.season}: dates do not rise`);
          for (const at of idx) {
            const before = at > 0 ? days[at] - days[at - 1] : 99, after = at + 1 < days.length ? days[at + 1] - days[at] : 99;
            gapMin = Math.min(gapMin, before, after);
            ok(before >= 3 && after >= 3, `2 dates: ${tag} season ${x.season}: a night ${before} and ${after} days from its neighbours`);
            const inWeek = days.filter(d => d > days[at] - 7 && d <= days[at]).length;
            maxIn7 = Math.max(maxIn7, inWeek);
            ok(inWeek <= 3, `2 dates: ${tag} season ${x.season}: ${inWeek} matches in the seven days to a night`);
          }
        }
        /* The critic's correction 2: a night is no wage week, so the season charges the twin's number of weeks. The
           wages themselves are printed, not asserted: the staff desk's and the scouts' weekly events are keyed on
           the week index, which a night before them moves by one, so a poach can land a week apart (measured on
           the first smoke, Chelsea season two: staff wages 7.952 against 8.084, weeks 54 and 54). */
        const upTo = e => firstNight === null || e.season <= firstNight;
        const wk = list => list.filter(upTo).map(e => [e.season, e.weeks]);
        ok(same(wk(a.out.end), wk(b.out.end)), `2 books: ${tag}: the season charged ${wk(a.out.end).map(e => e[1]).join(' ')} weeks, the twin with no nights ${wk(b.out.end).map(e => e[1]).join(' ')}`);
        if (!same(a.out.end, b.out.end)) bump('2 participant journeys whose wages differ from the twin by a week keyed event (printed, not asserted)');
        const cl = list => list.filter(c => firstNight === null || Number(c.split(':')[0]) <= firstNight);
        ok(same(cl(a.out.closes), cl(b.out.closes)), `2 window: ${tag}: the summer window closes after ${cl(a.out.closes).join(' ')}, the twin after ${cl(b.out.closes).join(' ')}`);
        /* The deadline the calendar draws (windowSpans, over myMatchWeeks) is the match the engine closes it on. */
        for (const p of a.out.predicted) {
          const act = a.out.actual.find(x => x.season === p.season);
          ok(!!act && act.w === p.w, `2 window: ${tag} season ${p.season}: the calendar draws the deadline at entry ${p.w}, the engine closes the window after entry ${act?.w}`);
        }
        if (a.out.fit1 !== null && b.out.fit0 !== null) fits.push([a.out.fit1, b.out.fit0, a.out.fit0]);
      }
    }
  }
  if (CONTROL === 'adjacent' && !fails.some(x => /^2 dates: /.test(x))) { console.log('simOneOffCups: control adjacent DID NOT FIRE: no forced new year season where the naive slot and the search differ'); process.exit(3); }
  console.log(`  2 calendar: ${seasons} participant seasons beside their twins, ${nights} nights; the closest neighbour of a night ${gapMin} days, at most ${maxIn7} matches in seven days to a night`);
  /* Section 7's fitness line, printed and asserted nothing (no band has been measured yet): the eleven's mean
     fitness going into the league opener after a night, beside the twin's going into the same opener with none. */
  const mean = k => (fits.length ? (fits.reduce((n, f) => n + f[k], 0) / fits.length).toFixed(1) : 'none');
  console.log(`  7 fitness into the league opener: ${mean(0)} after the super cup night, ${mean(1)} in the twin with no night, ${mean(2)} at the rollover (${fits.length} seasons)`);
}

/* ── Section 4: honours and the record, and what weighs ── */
const WON_ARM = { file: CM, from: '  const won = shootoutWon !== null ? shootoutWon : mine > theirs;\n', to: '  const won = true;\n' };
const LOST_ARM = { file: CM, from: '  const won = shootoutWon !== null ? shootoutWon : mine > theirs;\n', to: '  const won = false;\n' };
Object.assign(ENGINE_EDITS, {
  weighs: [{ file: CM, from: '  return list.filter(t => !t.minor);', to: '  return [...list];' }],
  notrophy: [{ file: CM, from: "  state.trophies.push({ name: got.row.name, emoji: '🛡️', season: state.season, minor: true });\n", to: '' }],
});
Object.assign(CONTROLS, {
  weighs: [4, /^4 weighs: /, /^4 /],
  notrophy: [4, /^4 trophy: /, /^4 /],
});

/** The weighing readers on one state: what each answers, as one comparable value apiece. */
function readersOf(M, MT, st, seed) {
  const fin = tape(seed, () => M.cm.finishSeason(JSON.parse(JSON.stringify(st)))).value;
  const next = tape(seed + 1, () => M.cm.startNextSeason(JSON.parse(JSON.stringify(fin.state)))).value;
  return {
    nationStanding: M.cm.nationStanding(st),
    managerTrophies: M.cm.wildernessProfile(st).managerTrophies,
    sponsorOffers: JSON.stringify(M.cm.sponsorOffers(st)),
    grade: fin.summary.verdictGrade,
    offers: JSON.stringify(fin.summary.offers.map(o => o.club ?? o)),
    xp: JSON.stringify(next.managerXp ?? null),
    kitty: next.budget,
    wageCap: next.wageCap,
    fans: JSON.stringify(MT.mt.fanTerms(st).trophies),
  };
}

async function honours() {
  const won = await engineOf(ROOT, 'won', { edits: editsFor([FORCE_MINE, WON_ARM]) }, cannot);
  const lost = await engineOf(ROOT, 'lost', { edits: [FORCE_MINE, LOST_ARM] }, cannot);
  const MT = await bundle('meters', { mt: 'src/lib/clubManagerMeters.ts' });
  const probe = await won.fresh();
  const fleet = fleetOf(probe).filter(f => ['Chelsea', 'Everton'].includes(f.club) && f.era === 'now').map(f => ({ ...f, join: undefined }));
  let arms = 0, readers = 0;
  for (const f of fleet) {
    for (const seed of SEEDS.slice(0, 3)) {
      const tag = `${f.club} seed ${seed}`;
      /* Season two's last state before finishSeason, from each arm (three seasons so two is a played cup). */
      const pre = { won: null, lost: null };
      for (const [name, E] of [['won', won], ['lost', lost]]) {
        const g = { out: {} };
        await journey(E, f, seed, 'nocoach', { onStep: (M, s, label) => {
          if (label === 's2-finish' && s) g.out.fin = s;
          if (/^s2-e/.test(label) && s) { g.out.pre = s; g.out.M = M; }
        } });
        pre[name] = g.out;
      }
      for (const name of ['won', 'lost']) {
        const x = pre[name];
        if (!x.fin) { ok(false, `4 trophy: ${tag} ${name}: no season two`); continue; }
        arms += 1;
        const minors = x.fin.trophies.filter(t => t.minor);
        const dsc = x.fin.worldComps?.dsc;
        const rowName = 'FA Community Shield';
        const played = !!dsc && !dsc.skip && dsc.clubs?.includes(x.fin.clubName) && Object.keys(dsc.mine ?? {}).length > 0;
        ok(played, `4 trophy: ${tag} ${name}: season two's super cup was not played by my club (${dsc?.skip ?? JSON.stringify(dsc?.mine ?? null)})`);
        if (name === 'won') ok(minors.length === 1 && minors[0].name === rowName && minors[0].season === 2 && minors[0].minor === true, `4 trophy: ${tag} won: ${minors.length} minor trophies (${JSON.stringify(minors)}), not exactly the ${rowName} of season 2`);
        else ok(minors.length === 0, `4 trophy: ${tag} lost: a minor trophy after a final lost`);
        const hist = (x.fin.history ?? []).find(h => h.season === 2);
        if (name === 'won') ok(!!hist && hist.trophies.includes(rowName), `4 history: ${tag} won: season two's history row holds ${JSON.stringify(hist?.trophies)}, not the ${rowName}`);
        const log = (x.fin.resultLog ?? []).filter(r => r.competition === 'oneOff');
        ok(log.length === 1, `4 record: ${tag} ${name}: ${log.length} super cup games in the result log`);
        /* Unit level, per reader: one state with and without the minor trophy reads the same. */
        if (name === 'won' && x.pre && x.M) {
          const withIt = JSON.parse(JSON.stringify(x.pre));
          withIt.trophies = [...withIt.trophies, { name: rowName, emoji: '🛡️', season: withIt.season, minor: true }];
          const a = readersOf(x.M, MT, x.pre, 0x4510 + seed), b = readersOf(x.M, MT, withIt, 0x4510 + seed);
          for (const k of Object.keys(a)) { readers += 1; ok(a[k] === b[k], `4 weighs: ${tag}: ${k} reads ${a[k]} without a minor trophy and ${b[k]} with one`); }
        }
      }
    }
  }
  console.log(`  4 honours: ${arms} arms (won and lost), ${readers} weighing readers compared with and without a minor trophy`);
}
/* ── Run ── */
if (CONTROL && !Object.hasOwn(CONTROLS, CONTROL)) cannot(`unknown control ${CONTROL}`);
const t0 = Date.now();
try {
  if (runs(0)) { section0(); await section0Engine(); }
  if (runs(1) || runs(5) || runs(7)) {
    await fleetPass(false);
    if (!CONTROL || CONTROL === 'nodouble') await fleetPass(true);
  }
  if (runs(2)) await calendarSection();
  if (runs(4)) await honours();
  if (runs(3)) await selfRelative();
  if (runs(6)) await dailies();
  for (const [k, v] of Object.entries(counts).sort()) console.log(`  ${k}: ${v}`);
  if (runs(1)) console.log(`  1 rows seen: ${[...ONE_OFF_IDS].join(' ') || 'none'}`);
} catch (e) {
  console.log(`simOneOffCups: cannot run: ${e && e.stack ? e.stack.split('\n').slice(0, 3).join(' | ') : e}`);
  process.exit(2);
}
/* A control must have its case in the fleet: a count it reads at least one, else it could pass empty (exit 3). */
const NEEDS = { afterswap: '1 rollovers into another league (the afterswap control reads these)', etall: '1 level matches on a pens row (the etall control needs one)', nodouble: '1 doubles (the runners up took the cup place)' };
if (CONTROL && NEEDS[CONTROL] && !(counts[NEEDS[CONTROL]] > 0) && CONTROL !== 'nodouble') { console.log(`simOneOffCups: control ${CONTROL} DID NOT FIRE: its case is not in the fleet (${NEEDS[CONTROL]}: 0)`); process.exit(3); }
const secs = Math.round((Date.now() - t0) / 1000);
if (CONTROL) {
  const [, must, may = must] = CONTROLS[CONTROL];
  const own = fails.some(f => must.test(f));
  const stray = fails.filter(f => !may.test(f));
  if (CONTROLS[CONTROL][0] === 0 && !fired) { console.log(`simOneOffCups: control ${CONTROL} ABORTED: it changed nothing (fired 0)`); process.exit(2); }
  if (own && stray.length === 0) { console.log(`simOneOffCups: control ${CONTROL} FIRED (${fails.length} failures, all its own: ${fails[0].slice(0, 160)})`); process.exit(1); }
  if (!own) { console.log(`simOneOffCups: control ${CONTROL} DID NOT FIRE (${fails.length} failures: ${fails.slice(0, 3).join(' / ')})`); process.exit(3); }
  console.log(`simOneOffCups: control ${CONTROL} DID NOT FIRE CLEANLY (stray ${stray.length}: ${stray.slice(0, 3).join(' / ')})`);
  process.exit(3);
}
for (const f of fails.slice(0, 40)) console.log(`  FAIL ${f}`);
console.log(fails.length ? `simOneOffCups: ${fails.length} FAILURES of ${checks} checks (${secs} s)` : `simOneOffCups: green, ${checks} checks (${secs} s)`);
process.exit(fails.length ? 1 : 0);

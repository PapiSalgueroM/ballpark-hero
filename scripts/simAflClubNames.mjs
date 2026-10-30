/**
 * Round 1572 harness: Aussie Rules Manager plays the 18 real AFL clubs by name,
 * and a career already under way keeps its own clubs.
 *
 * Sections (each added in the step that builds what it checks):
 *   0 sources: src/data/aflClubs2026.ts holds 18 clubs in 2026 ladder order, every
 *     full and short form distinct, every printed string and every ladder place
 *     from two distinct non wiki publishers (AFL.com.au and the club sites are one,
 *     the AFL), and it equals its receipts in scripts/data/aflClubNames2026.json
 *     string for string and source for source, each receipt line printing its
 *     string, and each ladder line naming its own club in the cell after its
 *     place (the full form, the short form, or the name that one source prints for
 *     it, the ledger's printedOnLadderAs). Controls typo ('Gold Coast Suns' loses
 *     its s), onesource (Sydney Swans keeps one source), and swap34 and swap1112
 *     (review of 2026-10-29: the clubs at a band edge, Brisbane Lions and
 *     Hawthorn, then St Kilda and GWS Giants, trade names and name receipts in
 *     BOTH files, in memory, while each place keeps its ladder lines); independent
 *     section 2a (critic corrections 3, 4). Residual, left on purpose by the lead:
 *     a NAME receipt line is still matched as a substring, so a string mistyped
 *     the same way in both files as a fragment of what the page printed ("Gold
 *     Coast Sun") passes; that takes a deliberate edit of two files (sabotage).
 *   1 on the list and nothing else: the harness recomputes the ladder bands from
 *     CLUBS' tier counts and each real club's slot from the LEDGER's ladder, and
 *     compares id by id (full, short, style, tier) with clubIdentities('afl2026');
 *     the readers of a real save print only two sourced strings; the invented set
 *     and the readers of a save with no set equal CLUBS; '' and 'club-18' print as
 *     themselves (critic 6). Control ladder (k counted from the end of its band).
 *   2a identity: a career started with no club set is byte for byte the base
 *     record (scripts/data/aussieV2SaveFixture1572.json, taken on the untouched
 *     engine by scripts/recordAussieV2SaveFixture1572.mjs) at every checkpoint.
 *   2b identity: a real set career equals the base's MASKED hash at every
 *     checkpoint (club names, clubName and clubSet hidden), carries clubSet
 *     'afl2026', names every club in its set and loads. Control simdrift (the
 *     real set's derived style becomes 'control'): 2b red, 2a green.
 *   3 old saves: every recipe of the record replays to the base's raw hash, loads,
 *     round trips byte for byte, opens the league board, and plays 60 more bot
 *     actions to the base's hash, with no clubSet key anywhere; clubFull and
 *     clubShort print its own invented names for all 18 ids and the hub's Next
 *     match says "v <invented place>" (critic 2); its real twin (built here) loads
 *     and masks to the same game, and four wrong ways to write a set are refused.
 *     Controls oldsave (the validator demands the field) and mixed (clubShort
 *     reads the real set whatever the save says).
 *   4 screens: runs src/test/aussieRulesClubNames.test.tsx through vitest (found
 *     by walk up, so it runs from a worktree): (i) the menu's 18 names under the
 *     five 2026 band headings (reported as 4i); (ii) a real career at prepare,
 *     after a match, finals week 1, season over and the draft after one pick, every
 *     club string pulled from where it sits (header, hub, score card, scoring
 *     events, results, ladder, finals, honour board, premiers line, draft card) is
 *     on the two sourced list, full form on the header and score card, short form
 *     elsewhere, and no panel's text holds an invented place; (iii) the same for a
 *     career with no set, the other way round. Control screen (a vitest swap
 *     through NO_DOUBLE_SWAP: the ladder row prints the raw id): (ii) fails on an
 *     assertion while (i) passes. Test (iv) switches an old career from its Club
 *     panel, cancels once, confirms once, and finds the save is switchClubSet of the
 *     one before, with the ladder's order and numbers unchanged.
 *   5 the switch: for every recipe, switchClubSet gives a save that loads, round
 *     trips, masks to the base save, is byte for byte the real twin (createLeague's
 *     key order, critic advice 12), switches once only, leaves its input untouched,
 *     and plays 60 more bot actions to the base continuation's masked hash. Control
 *     switchlost (the switch forgets clubName): 5 red, 3 green.
 *
 * Every section prints its counts, so a pass on empty input cannot happen. The
 * run ends on one summary line and exits 1 on any failure.
 *
 * Controls: AFL_NAMES_CONTROL=<name> patches the BUNDLE (an esbuild onLoad hook,
 * never the source on disk; swap34 and swap1112 instead trade two rows in memory
 * and refuse unless both clubs sit once at the same place in both files), refuses to run unless its anchor occurs exactly once
 * and the patched text differs (exit 2), then runs only its target section and one
 * independent section. It ends on "RED as intended" and exits 1 when the target is
 * red and the independent section green; anything else exits 3 (DID NOT FIRE).
 *
 * AFL_NAMES_LONG=1 runs the whole 72 career fleet in section 2 (the default runs
 * seeds 1, 12 and 24 by the three clubs, critic advice 10).
 */
import fs from 'node:fs';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { bundle, fleetCareer, FLEET_CLUBS, FLEET_SEEDS, lf, maskedHash, MORE, play, rawHash, SHORT_SEEDS, sha } from './lib/aflClubNames1572.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CONTROL = process.env.AFL_NAMES_CONTROL || '';
const LONG = process.env.AFL_NAMES_LONG === '1';
const started = Date.now();

const LEAGUE = 'src/lib/aussieRulesLeague.ts', DATA = 'src/data/aflClubs2026.ts', BOARD = 'src/components/aussie-rules-manager/AussieRulesLeagueBoard.tsx';
/* [file, anchor, replacement, target section, independent section] */
const CONTROLS = {
  /* Critic corrections 3 and 4: anchors that occur once, and an independent section that never reads the real names (2a, no set; section 3 builds real twins since step 3). */
  typo: [DATA, "'Gold Coast Suns'", "'Gold Coast Sun'", '0', '2a'],
  onesource: [DATA, "full: 'Sydney Swans', short: 'Sydney', ladder2026: 2, fullSources: ['afl', 'austadiums']", "full: 'Sydney Swans', short: 'Sydney', ladder2026: 2, fullSources: ['afl']", '0', '2a'],
  /* Review of 2026-10-29 (read M2, run 4): the two clubs at a band edge trade names and name receipts in BOTH files, in
     memory (sixth field 'memory': no bundle patch), while each place keeps its ladder lines. The second field names the pair. */
  swap34: [DATA, 'Brisbane Lions|Hawthorn', '', '0', '2a', 'memory'],
  swap1112: [DATA, 'St Kilda|GWS Giants', '', '0', '2a', 'memory'],
  /* Critic advice 13: a wrong but well formed mapping (k counted from the end of its band), read by section 1's id by id comparison. */
  ladder: [LEAGUE, 'const k = row.ladder2026 - low - 1;', 'const k = high - row.ladder2026;', '1', '2a'],
  /* The real set's derived style drifts; createLeagueWorld reads it, so 2b's masked hashes move while 2a (no set) holds. */
  simdrift: [LEAGUE, 'style: slot.style, tier: slot.tier });', "style: 'control' as Tactic, tier: slot.tier });", '2b', '2a'],
  /* The validator demands the field, so every old save is refused (section 3's loads). */
  oldsave: [LEAGUE, 'const keys = !named ? TOP_KEYS :', 'const keys = false ? TOP_KEYS :', '3', '0'],
  /* Critic correction 2: clubShort reads the real set whatever the save says; section 3 reads clubShort over 18 ids and the hub's Next match sub. */
  mixed: [LEAGUE, 'identityIn(setOf(state), id)?.short', "identityIn('afl2026', id)?.short", '3', '0'],
  /* A vitest control (sixth field): the board's ladder row prints the raw id. Test (ii) must fail on an assertion, test (i) pass. */
  screen: [BOARD, '{index + 1}. {clubShort(state, row.clubId)}', '{index + 1}. {row.clubId}', '4', '4i', 'vitest'],
  /* Step 5: the switch forgets clubName, so a switched save keeps its invented clubName and is refused (section 5). */
  switchlost: [LEAGUE, "...state, clubName, clubSet: 'afl2026',", "...state, clubSet: 'afl2026',", '5', '3'],
};
if (CONTROL && !CONTROLS[CONTROL]) { console.error(`unknown control ${CONTROL}`); process.exit(2); }
const SECTIONS = ['0', '1', '2a', '2b', '3', '4', '4i', '5'];
const ONLY = process.env.AFL_NAMES_ONLY || ''; // e.g. "0,1,2a,2b,3" while iterating; a gate run never sets it
const RUN = CONTROL ? new Set([CONTROLS[CONTROL][3], CONTROLS[CONTROL][4]]) : ONLY ? new Set(ONLY.split(',')) : new Set(SECTIONS);

const { L } = await bundle(ROOT, {
  entries: ["export * from './src/lib/aussieRulesLeague.ts';", "export * as AFL from './src/data/aflClubs2026.ts';"],
  patch: CONTROL && !CONTROLS[CONTROL][5] ? CONTROLS[CONTROL].slice(0, 3) : null,
});
const RECORD = JSON.parse(fs.readFileSync(path.join(ROOT, 'scripts/data/aussieV2SaveFixture1572.json'), 'utf8'));
const LEDGER = JSON.parse(fs.readFileSync(path.join(ROOT, 'scripts/data/aflClubNames2026.json'), 'utf8'));

const failures = new Map();
let section = -1, checks = 0;
const fail = m => { failures.set(section, (failures.get(section) || 0) + 1); console.error(`  FAIL [${section}]: ${m}`); };
const check = (cond, m) => { checks += 1; if (cond) console.log(`  ok: ${m}`); else fail(m); };
const head = (n, title) => { section = n; failures.set(n, failures.get(n) || 0); console.log(`\n${n}. ${title}`); };
const guard = (n, fn) => { section = n; failures.set(n, failures.get(n) || 0); try { fn(); } catch (e) { fail(`threw: ${String(e && e.stack || e).split('\n').slice(0, 3).join(' | ')}`); } };

/* ---------- 0. sources ---------- */
const DASHES = [String.fromCharCode(0x2013), String.fromCharCode(0x2014)];
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
/* Controls swap34 and swap1112: a consistent mistake in both files that every other check of section 0 passes. Refuses
   (exit 2) unless both names sit once at the same place in each list and the trade really moves them. */
const IDENTITY = ['full', 'short', 'fullSources', 'shortSources'];
function swapControl(rows, clubs) {
  const spec = CONTROL ? CONTROLS[CONTROL] : null;
  if (!spec || spec[5] !== 'memory') return [rows, clubs];
  const [a, b] = spec[1].split('|');
  const at = (list, name) => list.filter(x => x.full === name).length === 1 ? list.findIndex(x => x.full === name) : -1;
  const ia = at(rows, a), ib = at(rows, b);
  if (ia < 0 || ib < 0 || at(clubs, a) !== ia || at(clubs, b) !== ib) { console.error(`control ${CONTROL} cannot run: ${a} and ${b} do not each sit once at the same place in both files`); process.exit(2); }
  const pick = x => Object.fromEntries(IDENTITY.map(key => [key, x[key]]));
  const trade = (list, take) => list.map((x, k) => k === ia ? take(x, list[ib]) : k === ib ? take(x, list[ia]) : x);
  const outRows = trade(rows, (self, other) => ({ ...self, ...pick(other) }));
  const outClubs = trade(clubs, (self, other) => ({ ...self, ...pick(other), printedOnLadderAs: other.printedOnLadderAs, receipts: { ...self.receipts, full: other.receipts.full, short: other.receipts.short } }));
  if (outRows[ia].full !== b || outClubs[ib].full !== a || outClubs[ia].receipts.ladder !== clubs[ia].receipts.ladder || outClubs[ia].receipts.full !== clubs[ib].receipts.full) { console.error(`control ${CONTROL} changed nothing`); process.exit(2); }
  console.log(`  control ${CONTROL}: ${a} (place ${rows[ia].ladder2026}) and ${b} (place ${rows[ib].ladder2026}) trade names and name receipts in both files; each place keeps its ladder lines`);
  return [outRows, outClubs];
}
if (RUN.has('0')) guard('0', () => {
  head('0', 'sources: 18 clubs, every printed string from two independent non wiki publishers, the data file equals its receipts');
  const sources = L.AFL.AFL_CLUB_SOURCES;
  const [rows, clubs] = swapControl(L.AFL.AFL_CLUBS_2026, LEDGER.clubs);
  const publisher = new Map(sources.map(s => [s.id, s.publisher]));
  check(rows.length === 18 && clubs.length === 18, `${rows.length} clubs in the data file, ${clubs.length} in the ledger (18 expected)`);
  check(same(rows.map(r => r.ladder2026), Array.from({ length: 18 }, (_, i) => i + 1)), 'ladder places are 1 to 18 once each, in ladder order');
  const strings = rows.flatMap((r, i) => [[r.full, i], [r.short, i]]);
  const clash = strings.filter(([s, i]) => strings.some(([t, j]) => j !== i && s.toLowerCase() === t.toLowerCase()));
  check(clash.length === 0, `no club's full or short form equals another club's (${strings.length} strings${clash.length ? `, clash: ${clash.map(c => c[0]).join(', ')}` : ''})`);
  const badStrings = strings.filter(([s]) => !s || s !== s.trim() || DASHES.some(d => s.includes(d)) || /\s{2}/.test(s));
  check(badStrings.length === 0, `every string is trimmed, single spaced and dash free (${badStrings.length} bad)`);
  const thin = [];
  for (const r of rows) for (const [what, ids] of [['full', r.fullSources], ['short', r.shortSources], ['ladder', r.ladderSources]]) {
    const pubs = new Set(ids.map(id => publisher.get(id)));
    if (ids.some(id => !publisher.has(id)) || pubs.size < 2) thin.push(`${r.full} ${what} (${ids.join(', ')})`);
  }
  check(thin.length === 0, `every full form, short form and ladder place has two or more distinct publishers (${rows.length * 3} checked${thin.length ? `; thin: ${thin.join('; ')}` : ''})`);
  const wiki = [...sources.map(s => s.publisher), ...LEDGER.sources.flatMap(s => [s.publisher, s.url])].filter(text => /wiki/i.test(text));
  check(wiki.length === 0, `no publisher or address is a wiki (${sources.length + LEDGER.sources.length} read)`);
  const aflHosts = LEDGER.sources.filter(s => /(^|\.)afl\.com\.au$/.test(new URL(s.url).hostname) || /club site/i.test(s.publisher));
  check(aflHosts.length > 0 && aflHosts.every(s => publisher.get(s.id) === 'AFL'), `AFL.com.au and the club sites count as the one publisher AFL (${aflHosts.length} such source)`);
  const date = L.AFL.AFL_CLUBS_VERIFIED_ON;
  check(/^\d{4}-\d{2}-\d{2}$/.test(date) && !Number.isNaN(Date.parse(date)) && date === LEDGER.verifiedOn && LEDGER.sources.every(s => s.readOn === date), `the read date ${date} is a date and matches the ledger and every source's read date`);
  check(same(sources.map(s => [s.id, s.publisher]), LEDGER.sources.map(s => [s.id, s.publisher.startsWith('AFL (') ? 'AFL' : s.publisher])), `the data file's ${sources.length} sources are the ledger's, id for id and publisher for publisher`);
  let agree = 0, lines = 0, lineBad = [];
  rows.forEach((r, i) => {
    const l = clubs[i];
    if (l && l.full === r.full && l.short === r.short && l.ladder2026 === r.ladder2026 && same(l.fullSources, r.fullSources) && same(l.shortSources, r.shortSources) && same(l.ladderSources, r.ladderSources)
      && same(l.receipts.full.map(x => x.source), r.fullSources) && same(l.receipts.short.map(x => x.source), r.shortSources) && same(l.receipts.ladder.map(x => x.source), r.ladderSources)) agree += 1;
    else fail(`row ${i + 1} (${r.full}) differs from its receipts in the ledger`);
    if (!l) return;
    for (const [what, text] of [['full', r.full], ['short', r.short]]) for (const x of l.receipts[what]) { lines += 1; if (!x.line.toLowerCase().includes(text.toLowerCase())) lineBad.push(`${r.full} ${what} ${x.source}`); }
    for (const x of l.receipts.ladder) { lines += 1; if (!x.line.startsWith(`${r.ladder2026} `)) lineBad.push(`${r.full} ladder ${x.source}`); }
  });
  check(agree === 18, `${agree} of 18 rows equal the ledger string for string and source for source`);
  check(lines >= 108 && lineBad.length === 0, `every one of ${lines} receipt lines prints its string (or starts with its ladder place)${lineBad.length ? `; not: ${lineBad.join('; ')}` : ''}`);
  /* Review of 2026-10-29 (read M2, run 4): a ladder line names ITS club in the cell right after its place (Zero Hanger puts a
     "- " movement mark between some), as the full form, the short form or the name that one source prints for it. */
  let cells = 0;
  const cellBad = [];
  rows.forEach((r, i) => {
    const l = clubs[i];
    if (!l) return;
    for (const x of l.receipts.ladder) {
      cells += 1;
      const names = [r.full, r.short, ...(l.printedOnLadderAs || []).filter(a => a.source === x.source).map(a => a.name)].map(n => n.toLowerCase());
      const lead = [`${r.ladder2026} - `, `${r.ladder2026} `].find(p => x.line.startsWith(p));
      const cell = lead ? x.line.slice(lead.length).toLowerCase() : '';
      if (!names.some(n => cell.startsWith(`${n} `))) cellBad.push(`${r.full} ladder ${x.source} ("${x.line.slice(0, 30)}")`);
    }
  });
  check(cells >= 36 && cellBad.length === 0, `every one of ${cells} ladder receipt lines names its own club in the cell after its place${cellBad.length ? `; not: ${cellBad.join('; ')}` : ''}`);
  const forms = new Map(rows.flatMap(r => [[r.full.toLowerCase(), r.full], [r.short.toLowerCase(), r.full]]));
  const aliases = clubs.flatMap((l, i) => (l.printedOnLadderAs || []).map(a => [rows[i], a]));
  const aliasBad = aliases.filter(([r, a]) => !r || !r.ladderSources.includes(a.source) || (forms.has(a.name.toLowerCase()) && forms.get(a.name.toLowerCase()) !== r.full)).map(([r, a]) => `${r ? r.full : '?'} ${a.source} ${a.name}`);
  check(aliasBad.length === 0, `each of ${aliases.length} names a ladder source prints for a club is one of that club's ladder sources and no other club's form${aliasBad.length ? `; bad: ${aliasBad.join('; ')}` : ''}`);
});


/* ---------- 1. on the list and nothing else ---------- */
/* The slot mapping recomputed here from CLUBS and the LEDGER (not the data file), so the engine cannot grade itself. */
function expectedReal() {
  const counts = [];
  for (const club of L.CLUBS) counts[club.tier] = (counts[club.tier] || 0) + 1;
  const out = new Map();
  for (const row of LEDGER.clubs) {
    let low = 0, tier = 1;
    while (row.ladder2026 > low + (counts[tier] || 0)) { low += counts[tier] || 0; tier += 1; }
    const slot = L.CLUBS.filter(club => club.tier === tier)[row.ladder2026 - low - 1];
    out.set(slot.id, { id: slot.id, full: row.full, short: row.short, style: slot.style, tier });
  }
  return out;
}
if (RUN.has('1')) guard('1', () => {
  head('1', 'on the list and nothing else: the real set is the ledger, slot by slot; the invented set is CLUBS');
  const want = expectedReal();
  const real = L.clubIdentities('afl2026'), invented = L.clubIdentities('fictional');
  const ids = L.CLUBS.map(club => club.id);
  check(want.size === 18 && real.length === 18 && new Set(real.map(x => x.id)).size === 18 && new Set(real.map(x => x.full)).size === 18, `the 18 ids map onto the 18 AFL clubs one to one (${want.size} recomputed, ${real.length} from the engine)`);
  let slotOk = 0;
  for (const id of ids) {
    const got = real.find(x => x.id === id), exp = want.get(id);
    if (got && exp && same([got.full, got.short, got.style, got.tier], [exp.full, exp.short, exp.style, exp.tier])) slotOk += 1;
    else fail(`${id}: the engine says ${got ? `${got.full} / ${got.short} / ${got.style} / ${got.tier}` : 'nothing'}, the ledger's ladder gives ${exp ? `${exp.full} / ${exp.short} / ${exp.style} / ${exp.tier}` : 'nothing'}`);
  }
  check(slotOk === 18, `${slotOk} of 18 ids carry the full, short, style and tier the 2026 ladder band gives (${ids.map(id => `${id} ${want.get(id)?.full}`).join(', ')})`);
  const realSave = { clubSet: 'afl2026' }, oldSave = {};
  const readers = ids.filter(id => L.clubFull(realSave, id) === want.get(id).full && L.clubShort(realSave, id) === want.get(id).short).length;
  check(readers === 18, `clubFull and clubShort of a real set save print the ledger's strings for all 18 ids (${readers})`);
  const verified = new Set(LEDGER.clubs.flatMap(c => [c.full, c.short]));
  const strays = ids.flatMap(id => [L.clubFull(realSave, id), L.clubShort(realSave, id)]).filter(text => !verified.has(text));
  check(strays.length === 0, `no real set reader prints a string that is not on the two sourced list (${strays.length})`);
  const fict = ids.filter((id, i) => { const c = L.CLUBS[i]; const x = invented[i]; return x.id === id && x.full === `${c.place} ${c.nickname}` && x.short === c.place && x.style === c.style && x.tier === c.tier
    && L.clubFull(oldSave, id) === `${c.place} ${c.nickname}` && L.clubShort(oldSave, id) === c.place; }).length;
  check(fict === 18, `the invented set and the readers of a save with no set equal CLUBS exactly (${fict} of 18)`);
  const fallback = ['', 'club-18'].every(id => [realSave, oldSave].every(s => L.clubFull(s, id) === id && L.clubShort(s, id) === id));
  check(fallback, "an empty or unknown id ('' and 'club-18') prints as itself in both sets, never undefined and never a throw");
});

/* ---------- 2. identity ---------- */
function fleetSection(set) {
  const seeds = LONG ? FLEET_SEEDS : SHORT_SEEDS;
  const want = set ? expectedReal() : null;
  let careers = 0, points = 0, equal = 0, marked = 0, named = 0, loads = 0;
  const t0 = Date.now();
  for (const seed of seeds) for (const club of FLEET_CLUBS) {
    const base = RECORD.fleet.find(row => row.seed === seed && row.club === club);
    const run = fleetCareer(L, seed, club, set, s => ({ clubSet: s.clubSet, clubName: s.clubName, names: s.clubs.every(c => c.name === (want ? want.get(c.id).full : L.clubFull({}, c.id))), loads: !!L.readLeagueSave(JSON.stringify(s)) }));
    careers += 1;
    if (!base) { fail(`no base row for seed ${seed} ${club}`); continue; }
    if (run.length !== base.points.length) { fail(`seed ${seed} ${club}: ${run.length} checkpoints, base ${base.points.length}`); continue; }
    run.forEach((point, i) => {
      points += 1;
      const b = base.points[i];
      const hit = set ? point.at === b.at && point.masked === b.masked : point.at === b.at && point.raw === b.raw && point.masked === b.masked;
      if (hit) equal += 1; else fail(`seed ${seed} ${club} checkpoint ${i} (season ${point.season} ${point.phase}, ${point.at} actions) differs from the base`);
      if (set ? point.clubSet === set : point.clubSet === undefined) marked += 1;
      if (point.names && point.clubName === (want ? want.get(club).full : L.clubFull({}, club))) named += 1;
      if (point.loads) loads += 1;
    });
  }
  const label = set ? '(b) real set' : '(a) no set';
  check(careers === seeds.length * FLEET_CLUBS.length && points >= careers * 3, `${label}: ${careers} careers, ${points} checkpoints (${LONG ? 'LONG, the whole fleet of 72' : 'default, seeds ' + seeds.join(', ') + ' by ' + FLEET_CLUBS.join(', ')}) in ${((Date.now() - t0) / 1000).toFixed(1)} s`);
  check(equal === points, set ? `${label}: ${equal} of ${points} checkpoints equal the base's MASKED hash (the same game with other names on it)` : `${label}: ${equal} of ${points} checkpoints equal the base's raw and masked hashes`);
  check(marked === points, set ? `${label}: ${marked} of ${points} checkpoints carry clubSet 'afl2026'` : `${label}: ${marked} of ${points} checkpoints carry no clubSet key`);
  check(named === points, `${label}: ${named} of ${points} checkpoints name every club and the player's club in their own set`);
  check(loads === points, `${label}: ${loads} of ${points} checkpoints load through readLeagueSave`);
}
if (RUN.has('2a')) guard('2a', () => {
  head('2a', 'identity (a): a career with no club set is the base record, checkpoint for checkpoint');
  check(RECORD.fleet.length === FLEET_SEEDS.length * FLEET_CLUBS.length, `the record holds ${RECORD.fleet.length} fleet careers (72 expected)`);
  fleetSection(undefined);
});
if (RUN.has('2b')) guard('2b', () => {
  head('2b', 'identity (b): a real club career is the base career once names, clubName and clubSet are masked');
  fleetSection('afl2026');
});

/* ---------- 3. old saves ---------- */
/* The same save under the real names, keys in createLeague's order (clubSet right after clubName). */
function realTwin(state, want) {
  const { version, seed, myClub, clubName: _invented, ...rest } = state;
  return { version, seed, myClub, clubName: want.get(myClub).full, clubSet: 'afl2026', ...rest, clubs: state.clubs.map(c => ({ ...c, name: want.get(c.id).full })) };
}
/* Replays every recipe of one group by its recorded action count, from createLeague with no set. */
function replayGroup(seed, club, recs, visit) {
  let s = L.createLeague(seed, club), at = 0;
  for (const rec of [...recs].sort((a, b) => a.at - b.at)) { s = play(L, s, rec.at - at); at = rec.at; visit(rec, s); }
}
if (RUN.has('3')) guard('3', () => {
  head('3', 'old saves: every base save loads, round trips, opens the league and plays on to the base');
  check(RECORD.recipes.length === 16, `the record holds ${RECORD.recipes.length} save recipes (16 expected)`);
  const groups = new Map();
  for (const rec of RECORD.recipes) { const key = `${rec.seed}|${rec.club}`; if (!groups.has(key)) groups.set(key, []); groups.get(key).push(rec); }
  let raw = 0, loads = 0, round = 0, board = 0, after = 0, clean = 0, readers = 0, hubbed = 0, hubOk = 0, twins = 0, refused = 0;
  const want = expectedReal();
  for (const recs of groups.values()) replayGroup(recs[0].seed, recs[0].club, recs, (rec, state) => {
    const text = JSON.stringify(state);
    if (sha(text) === rec.raw) raw += 1; else fail(`${rec.name}: the save string is not the base's`);
    const loaded = L.readLeagueSave(text);
    if (loaded) loads += 1; else { fail(`${rec.name}: readLeagueSave refused a base save`); return; }
    if (JSON.stringify(loaded) === text) round += 1; else fail(`${rec.name}: the loaded save does not round trip`);
    if (L.chooseBoard(text, null) === 'league') board += 1; else fail(`${rec.name}: chooseBoard did not open the league`);
    const more = play(L, loaded, MORE);
    if (rawHash(more) === rec.after.raw && maskedHash(more) === rec.after.masked) after += 1; else fail(`${rec.name}: ${MORE} more actions do not reach the base's hash`);
    if (!text.includes('"clubSet"') && !JSON.stringify(more).includes('"clubSet"')) clean += 1; else fail(`${rec.name}: a clubSet key appeared in a save with no set`);
    /* Critic correction 2: an old career keeps its own names on every reader and on the hub. */
    const own = L.CLUBS.every(c => L.clubFull(loaded, c.id) === `${c.place} ${c.nickname}` && L.clubShort(loaded, c.id) === c.place);
    if (own) readers += 1; else fail(`${rec.name}: clubFull or clubShort of an old save does not print its own invented names`);
    if (loaded.match) {
      hubbed += 1;
      const other = loaded.match.homeId === loaded.myClub ? loaded.match.awayId : loaded.match.homeId;
      const tile = L.hubTiles(loaded).find(t => t.key === 'match');
      if (tile && tile.sub === `v ${L.CLUBS.find(c => c.id === other).place}`) hubOk += 1; else fail(`${rec.name}: the hub's Next match reads "${tile && tile.sub}"`);
    }
    /* The real twin of this save (built here, not by the engine) loads; each wrong way to write a set is refused. */
    const twin = realTwin(loaded, want);
    const twinText = JSON.stringify(twin);
    const twinLoaded = L.readLeagueSave(twinText);
    if (twinLoaded && JSON.stringify(twinLoaded) === twinText && maskedHash(twinLoaded) === maskedHash(loaded)) twins += 1; else fail(`${rec.name}: the real twin of this save is refused or not the same game`);
    const anchor = `"clubName":${JSON.stringify(loaded.clubName)},`;
    if (!text.includes(anchor)) { fail(`${rec.name}: no clubName to insert after`); return; }
    const wrong = [
      ['clubSet fictional', text.replace(anchor, `${anchor}"clubSet":"fictional",`)],
      ['clubSet afl2026 over invented names', text.replace(anchor, `${anchor}"clubSet":"afl2026",`)],
      ['a real save with one club renamed to an invented name', JSON.stringify({ ...twin, clubs: twin.clubs.map(c => c.id !== twin.myClub && c.id === twin.clubs.find(x => x.id !== twin.myClub).id ? { ...c, name: L.clubFull({}, c.id) } : c) })],
      ['a real save whose own club keeps its invented name', JSON.stringify({ ...twin, clubName: loaded.clubName })],
    ];
    for (const [what, bad] of wrong) { if (bad !== text && bad !== twinText && L.readLeagueSave(bad) === null) refused += 1; else fail(`${rec.name}: ${what} was not refused`); }
  });
  const n = RECORD.recipes.length;
  check(raw === n, `${raw} of ${n} recipes replay to the base's raw save string`);
  check(loads === n && round === n, `${loads} of ${n} load and ${round} round trip byte for byte`);
  check(board === n, `${board} of ${n} open the league board`);
  check(after === n, `${after} of ${n} play ${MORE} more bot actions to the base's raw and masked hash`);
  check(clean === n, `${clean} of ${n} never carry a clubSet key`);
  check(readers === n, `${readers} of ${n} print their own invented names through clubFull and clubShort for all 18 ids`);
  check(hubbed >= 8 && hubOk === hubbed, `${hubOk} of ${hubbed} saves with a match show "v <invented place>" on the hub's Next match`);
  check(twins === n, `${twins} of ${n} real twins (the same save under the real names, built by this harness) load, round trip and mask to the same game`);
  check(refused === n * 4, `${refused} of ${n * 4} wrong ways to write a set are refused (clubSet fictional, afl2026 over invented names, one club renamed, an invented clubName)`);
});

/* ---------- 4. screens (vitest) ---------- */
/* Runs src/test/aussieRulesClubNames.test.tsx the simAussieRulesLeagueBoard way. Test (i) reports under 4i, every other test under 4. */
const TEST_FILE = 'src/test/aussieRulesClubNames.test.tsx';
const TESTS = {
  menu: '(i) a new career picks from the 18 AFL clubs by name, under the five 2026 ladder bands',
  real: '(ii) a real club career prints only two sourced club names on every panel',
  fake: '(iii) a career with no club set prints only its own invented names',
  switch: '(iv) the Club panel switches an old career to the real names, after one cancel',
};
if (RUN.has('4') || RUN.has('4i')) guard('4', () => {
  head('4', `screens: ${TEST_FILE} through vitest${CONTROL ? ` (control ${CONTROL})` : ''}`);
  failures.set('4i', failures.get('4i') || 0);
  const failIn = (sec, m) => { failures.set(sec, (failures.get(sec) || 0) + 1); console.error(`  FAIL [${sec}]: ${m}`); };
  const vitestBin = [ROOT, path.resolve(ROOT, '../../..')].map(dir => path.join(dir, 'node_modules/vitest/vitest.mjs')).find(file => fs.existsSync(file));
  if (!vitestBin) { fail('vitest is not installed'); return; }
  const env = { ...process.env, NO_COLOR: '1', FORCE_COLOR: '0', DEBUG_PRINT_LIMIT: '1200' };
  delete env.NO_DOUBLE_SWAP;
  const args = [vitestBin, 'run', TEST_FILE, '--reporter=verbose', '--testTimeout=300000', '--hookTimeout=120000'];
  let folder = null;
  const spec = CONTROL ? CONTROLS[CONTROL] : null;
  if (spec) {
    const source = lf(fs.readFileSync(path.join(ROOT, spec[0]), 'utf8'));
    const count = source.split(spec[1]).length - 1;
    if (count !== 1) { console.error(`control ${CONTROL} cannot run: its anchor occurs ${count} times in ${spec[0]}`); process.exit(2); }
    const changed = source.replace(spec[1], spec[2])
      .replace("'./AussieRulesManagerBoard.module.css'", "'@/components/aussie-rules-manager/AussieRulesManagerBoard.module.css'")
      .replace("'./AussieRulesLeagueBoard.module.css'", "'@/components/aussie-rules-manager/AussieRulesLeagueBoard.module.css'");
    if (source.replace(spec[1], spec[2]) === source) { console.error(`control ${CONTROL} changed nothing`); process.exit(2); }
    fs.mkdirSync(path.join(ROOT, '.sim-control'), { recursive: true });
    folder = fs.mkdtempSync(path.join(ROOT, '.sim-control/afl-club-names-'));
    const copy = path.join(folder, path.basename(spec[0]));
    fs.writeFileSync(copy, changed);
    env.NO_DOUBLE_SWAP = JSON.stringify({ ['@/' + spec[0].replace(/^src\//, '').replace(/\.tsx?$/, '')]: copy });
    args.push('-t', `${TESTS.real.replace(/[()]/g, '.')}|${TESTS.menu.replace(/[()]/g, '.')}`);
  }
  const t0 = Date.now();
  const run = spawnSync(process.execPath, args, { cwd: ROOT, env, encoding: 'utf8', timeout: 1200000 });
  if (folder) fs.rmSync(folder, { recursive: true, force: true });
  const output = `${run.stdout || ''}\n${run.stderr || ''}`;
  const lines = output.split('\n');
  for (const line of lines.filter(l => /set pulled:/.test(l))) console.log(`  ${line.trim()}`);
  if (run.error || !output.includes('aussieRulesClubNames.test.tsx') || /Failed to resolve|Cannot find module|Unhandled Errors/.test(output)) { fail(`vitest did not run cleanly: ${String(run.error || '')} ${output.slice(-1500)}`); return; }
  const failed = name => lines.some(l => (l.includes('FAIL ') || l.includes('×')) && l.includes(name));
  const passed = name => !failed(name) && lines.some(l => l.includes('✓') && l.includes(name));
  console.log(`  vitest exit ${run.status} in ${((Date.now() - t0) / 1000).toFixed(1)} s`);
  if (spec) {
    if (failed(TESTS.real) && /AssertionError|expect\(/.test(output)) failIn('4', `${TESTS.real} failed on an assertion`); else console.log(`  ok: (control) ${TESTS.real} did not fail`);
    if (passed(TESTS.menu)) console.log(`  ok: ${TESTS.menu} passed`); else failIn('4i', `${TESTS.menu} did not pass`);
    return;
  }
  const names = Object.values(TESTS);
  check(run.status === 0 && new RegExp(`Tests\\s+${names.length} passed`).test(output), `all ${names.length} screen tests passed (vitest exit ${run.status})`);
  for (const [key, name] of Object.entries(TESTS)) { if (passed(name)) console.log(`  ok: ${name}`); else { if (key === 'menu') failIn('4i', `${name} failed`); else fail(`${name} failed`); } }
  if (run.status !== 0) console.error(output.slice(-3000));
});

/* ---------- 5. the switch ---------- */
if (RUN.has('5')) guard('5', () => {
  head('5', 'the switch: every base save switches to the real names losslessly, once, and plays on as the same game');
  const want = expectedReal();
  const groups = new Map();
  for (const rec of RECORD.recipes) { const key = `${rec.seed}|${rec.club}`; if (!groups.has(key)) groups.set(key, []); groups.get(key).push(rec); }
  let valid = 0, masked = 0, twin = 0, once = 0, more = 0, untouched = 0, realKept = 0;
  for (const recs of groups.values()) replayGroup(recs[0].seed, recs[0].club, recs, (rec, state) => {
    const text = JSON.stringify(state);
    const loaded = L.readLeagueSave(text);
    if (!loaded) { fail(`${rec.name}: the base save does not load`); return; }
    const switched = L.switchClubSet(loaded);
    const out = JSON.stringify(switched);
    const back = L.readLeagueSave(out);
    if (back && JSON.stringify(back) === out && switched.clubSet === 'afl2026' && switched.clubName === want.get(switched.myClub).full) valid += 1; else fail(`${rec.name}: the switched save is refused or misnamed`);
    if (maskedHash(switched) === rec.masked) masked += 1; else fail(`${rec.name}: the switch changed something besides the names`);
    if (out === JSON.stringify(realTwin(loaded, want))) twin += 1; else fail(`${rec.name}: the switched save is not byte for byte the real twin (key order or a name)`);
    if (L.switchClubSet(switched) === switched && JSON.stringify(L.switchClubSet(back ?? switched)) === out) once += 1; else fail(`${rec.name}: switching twice is not switching once`);
    if (maskedHash(play(L, back ?? switched, MORE)) === rec.after.masked) more += 1; else fail(`${rec.name}: ${MORE} more actions after the switch leave the base's game`);
    if (JSON.stringify(loaded) === text) untouched += 1; else fail(`${rec.name}: the switch changed the state it was given`);
    const real = L.readLeagueSave(out);
    if (real && L.switchClubSet(real) === real) realKept += 1; else fail(`${rec.name}: a real career is switched again`);
  });
  const n = RECORD.recipes.length;
  check(valid === n, `${valid} of ${n} switched saves load, round trip, carry clubSet 'afl2026' and the real name of the player's club`);
  check(masked === n, `${masked} of ${n} switched saves equal the base save once names are masked (nothing else changed)`);
  check(twin === n, `${twin} of ${n} switched saves are byte for byte the real twin built by this harness (createLeague's key order)`);
  check(once === n && realKept === n, `${once} of ${n} switch once only, and ${realKept} of ${n} real careers come back as they are`);
  check(more === n, `${more} of ${n} play ${MORE} more bot actions after the switch to the base continuation's masked hash`);
  check(untouched === n, `${untouched} of ${n} leave the state they were given untouched`);
});

/* ---------- summary ---------- */
const secs = ((Date.now() - started) / 1000).toFixed(1);
const red = [...failures.entries()].filter(([, n]) => n > 0).map(([n]) => n);
if (CONTROL) {
  const [, , , target, independent] = CONTROLS[CONTROL];
  const fired = red.includes(target) && !red.includes(independent) && failures.has(independent);
  console.log(`\nsimAflClubNames control ${CONTROL}: target section ${target} ${red.includes(target) ? 'RED' : 'green'}, independent section ${independent} ${red.includes(independent) ? 'RED' : 'green'}, ${secs} s. ${fired ? 'RED as intended' : 'DID NOT FIRE'}`);
  process.exit(fired ? 1 : 3);
}
const total = [...failures.values()].reduce((a, b) => a + b, 0);
console.log(`\nsimAflClubNames: ${checks} checks, ${total} failures, sections ${[...RUN].sort().join(',')}${red.length ? `, red: ${red.join(',')}` : ''}, ${secs} s`);
process.exit(total ? 1 : 0);

/**
 * Round 1010b: the season ledger (scripts/data/careerSeason2025.json) is
 * honest, complete for its wave, and exactly what the migration and the bake
 * carry. Season agnostic: it reads the season from the ledger.
 *
 *   1. LEDGER SHAPE. Every season string is the plain hyphen form; a spell at
 *      a calendar league club (MLS, Brazil, Argentina, Japan, by the club's
 *      flag) is the calendar year, any other the split season, and nothing is
 *      the year after the season; every club resolves to a flag (an unknown
 *      club is never European, transferPathModes.ts); club, goals and
 *      appearances on two distinct non-wiki hosts; assists non-null and market
 *      value non-zero only on two hosts; a changed field's new value on two
 *      hosts unless it is null (n/a); every ended man on two hosts; no held
 *      man gets a row; no long dash anywhere in the file; every goals,
 *      appearances and assists number (added or changed) is the total its
 *      sources' recorded readings state (readingOf), so a typo regenerated
 *      into the migration and the bake still goes red here.
 *   2. COVERAGE, the outcome that would have caught the tpa-762 report: the
 *      men whose last row is still the season before, neither ended nor held,
 *      are exactly COVERAGE_BASELINE, a list frozen in this file by name (a
 *      ratchet, like RAW_RANDOM_BASELINE in simPrerender section 16): nobody
 *      joins it, and a wave that accounts for a man removes him from it in
 *      the same commit. The generator refuses to write a count above the
 *      committed one. Every man the ledger adds must now end at its season.
 *      Measured 2026-10-05: 95 before wave 1 (94 men and the twin), 80 after
 *      it; 23 men stop a season earlier (printed, a later round's).
 *   3. THE MIGRATION AND THE BAKE ARE THE LEDGER: the committed migration,
 *      bake and ledger equal what scripts/genCareerSeasonAdditions.mjs
 *      generates from the ledger now, and the migration's inserts and updates,
 *      read back independently, are the ledger's rows and counts.
 *   4. THE BAKE CARRIES THE LEDGER: correctionProblems (the bake's own guard)
 *      finds nothing, and the bake hashes to the ledger's postBake.
 *   5. IDENTITY: no two pool players carry the same club and season key set.
 *      Measured: 1 pair before wave 1 (Alisson, Alisson Becker), 0 after.
 *   6. CAREER QUIZ: the shift the ledger records for the removal is the shift
 *      measured now (each of the next 60 days from the planned apply changes;
 *      42 of those answers were dealt in the 90 days before; 0 without it).
 *   7. REHEARSAL in PGlite, never on production: the pool before the ledger
 *      and the puzzles live after Round 784 are loaded, the migration runs,
 *      the tables read back equal to the pool after the ledger, and a second
 *      run stops at its row count guard. The tables are built as the repo
 *      records production (unique player_name, smallint sort orders, the
 *      Transfer Path pair checks, nullable assists as the generated types read
 *      it). Measured 2026-10-05 with PGlite 0.5.8 (Postgres 18.3): green, 252
 *      players and 3634 seasons. Where PGlite is not installed (it is in no manifest,
 *      and a builder lane never runs npm install) the section is RED unless
 *      the ledger's `rehearsal` record carries the sha256 of this exact
 *      migration text, written by a passing run with --record-rehearsal. The
 *      controls set that one finding aside and say so.
 *
 * NEGATIVE CONTROLS (SIM_SEASON_ADD_CONTROL), each asserting its rewrite
 * changed something before it runs, each turning only its own section red:
 *   onesource  the first added row keeps one host            (section 1)
 *   dash       a season joined by U+2013, built in code       (section 1)
 *   calendar   an MLS spell written split style               (section 1)
 *   unflagged  a row at a club with no flag                   (section 1)
 *   uncovered  one added row removed in memory, must be named (section 2)
 *   reads      Salah's 2025-2026 goals typed 21, read 12      (section 1)
 *   twin       Alisson cloned as Alisson Becker               (section 5)
 *   rehearse      Salah's 2024-2025 update writes 33 goals    (section 7)
 *   rehearsehint  tpa-762's active entry written as 3 steps  (section 7)
 * The two rehearsal controls rewrite only the SQL handed to PGlite and refuse
 * to run where PGlite is not resolvable, since they would prove nothing there.
 *
 * Reads no network and no database. Run: node scripts/simCareerSeasonAdditions.mjs
 */
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { CORRECTION_LEDGERS, correctionProblems, removedNames } from './bakeCareerPlayers.mjs';
import { BAKE_OUT, MIGRATION_OUT, PLANNED_APPLY, bakeStampOf, expectedBake, generate, identicalKeySets } from './genCareerSeasonAdditions.mjs';
import { CALENDAR_SEASON, LEDGER_FILE, SPLIT_SEASON, applyLedger, bakeHash, careerQuizShift, clone, coverage, formatLedger, hostsFor, loadSiteModules, readingProblems } from './lib/careerSeasonLedger.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CONTROL = process.env.SIM_SEASON_ADD_CONTROL || '';
const OWN = { onesource: 1, dash: 1, calendar: 1, unflagged: 1, reads: 1, uncovered: 2, twin: 5, rehearse: 7, rehearsehint: 7 };
/* what the two rehearsal controls rewrite in the migration text, in memory only */
const REHEARSE_CONTROLS = {
  rehearse: ['update public.career_seasons set goals = 34, assists = 23, appearances = 52', 'update public.career_seasons set goals = 33, assists = 23, appearances = 52'],
  rehearsehint: ["('tpa-762', 'Alisson', 'Mikel Oyarzabal', 'active', null::smallint, null::text, 2, ", "('tpa-762', 'Alisson', 'Mikel Oyarzabal', 'active', null::smallint, null::text, 3, "],
};
if (CONTROL && !OWN[CONTROL]) { console.error(`SIM_SEASON_ADD_CONTROL=${CONTROL} is not a control this harness knows: ${Object.keys(OWN).join(', ')}`); process.exit(1); }
/*
 * THE COVERAGE RATCHET (section 2). The men of the pool who still stop at the
 * ledger's previous season, neither added, ended nor held, frozen HERE, where
 * scripts/genCareerSeasonAdditions.mjs cannot rewrite it (the ledger's own
 * coverage block is regenerated on every run, so it can only record, never
 * guard). Like RAW_RANDOM_BASELINE in simPrerender section 16: nobody may join
 * the list, and a man a wave accounts for leaves it in the same commit.
 * Wave 1 (2026-10-05): 80 men, from 95 before the ledger (94 and the twin).
 */
const COVERAGE_BASELINE = new Set([
  "Achraf Hakimi", "Alejandro Garnacho", "Alphonso Davies", "André Onana", "Angel Di María",
  "Antoine Griezmann", "Arda Güler", "Bernardo Silva", "Bradley Barcola", "Bruno Fernandes",
  "Bukayo Saka", "Casemiro", "Ciro Immobile", "Cole Palmer", "Cristian Pulisic",
  "Cristiano Ronaldo", "Darwin Núñez", "Declan Rice", "Dusan Vlahović", "Ederson", "Endrick",
  "Enzo Fernández", "Erling Haaland", "Estêvão", "Federico Valverde", "Gavi",
  "Gianluigi Donnarumma", "Hakim Ziyech", "Harry Kane", "Jadon Sancho", "Jamal Musiala",
  "Jan Oblak", "João Cancelo", "João Félix", "Jonathan David", "Joshua Kimmich", "Jude Bellingham",
  "Karim Benzema", "Kevin De Bruyne", "Khvicha Kvaratskhelia", "Kobbie Mainoo", "Kyle Walker",
  "Kylian Mbappé", "Lamine Yamal", "Leroy Sané", "Luka Modrić", "Marcus Rashford", "Marquinhos",
  "Martin Ødegaard", "Mats Hummels", "Mikel Oyarzabal", "Moisés Caicedo", "Moussa Diaby",
  "N'Golo Kanté", "Nico Williams", "Ousmane Dembélé", "Pau Cubarsí", "Paulo Dybala", "Pedri",
  "Phil Foden", "Pierre-Emerick Aubameyang", "Rafael Leão", "Raheem Sterling", "Rasmus Højlund",
  "Riyad Mahrez", "Robert Lewandowski", "Rodri", "Rodrygo", "Romelu Lukaku", "Rúben Dias",
  "Sandro Tonali", "Son Heung-min", "Thibaut Courtois", "Trent Alexander-Arnold", "Victor Osimhen",
  "Viktor Gyökeres", "Vinícius Júnior", "Warren Zaïre-Emery", "Xavi Simons", "Yassine Bounou"
]);
/* the flags of the calendar year leagues the pool writes as one year */
const CALENDAR_COUNTRIES = new Set(['us', 'ca', 'br', 'ar', 'jp']);
const failures = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0 };
let section = 0;
let notRehearsed = false;
const fail = m => { failures[section] += 1; if (failures[section] <= 20) console.error('  FAIL: ' + m); };
const abort = m => { console.error(m); process.exit(1); };
const read = rel => fs.readFileSync(path.join(ROOT, rel), 'utf8');
const norm = s => s.replaceAll('\r\n', '\n');

const ledger = JSON.parse(read(LEDGER_FILE));
const site = await loadSiteModules(ROOT);
const bake = clone(site.careerPlayers);
let gen;
try { gen = await generate(ledger); } catch (e) { abort('the ledger does not generate, nothing was checked: ' + e.message); }
const { pre, post } = gen;
const isoOf = club => site.flagEmojiToIso(site.flagForClub(club));

section = 1;
console.log('1) the ledger shape: seasons, clubs, sources');
{
  const L = clone(ledger);
  const first = L.added[0];
  if (CONTROL === 'onesource') {
    const host = 'footballdatabase.eu', before = first.sources.length;
    first.sources = first.sources.filter(s => !s.url.includes(host) && !s.url.includes('soccerbase.com'));
    if (first.sources.length === before) abort('onesource control changed nothing');
    console.log(`   NEGATIVE CONTROL ON: ${first.player} keeps only one host`);
  }
  if (CONTROL === 'dash') {
    const before = first.season;
    first.season = '2025' + String.fromCharCode(0x2013) + '2026';
    if (first.season === before) abort('dash control changed nothing');
    console.log(`   NEGATIVE CONTROL ON: ${first.player}'s season is joined by U+2013`);
  }
  if (CONTROL === 'reads') {
    const salah = L.added.find(r => r.player === 'Mohamed Salah');
    if (!salah || salah.goals !== 12) abort('reads control cannot run: Salah 2025-2026 does not carry 12 goals');
    salah.goals = 21;
    console.log('   NEGATIVE CONTROL ON: Salah\'s 2025-2026 goals are typed 21 while his sources read 12');
  }
  if (CONTROL === 'calendar' || CONTROL === 'unflagged') {
    const before = L.added.length;
    L.added.push({ ...clone(first), club: CONTROL === 'calendar' ? 'LAFC' : 'Atlantis FC', season: ledger.season });
    if (L.added.length !== before + 1) abort(`${CONTROL} control changed nothing`);
    console.log(`   NEGATIVE CONTROL ON: ${first.player} gets a ${ledger.season} spell at ${L.added[L.added.length - 1].club}`);
  }
  const seasonStart = Number(String(L.season).slice(0, 4));
  if (!SPLIT_SEASON.test(L.season) || Number(L.season.slice(5)) !== seasonStart + 1) fail(`the ledger season ${JSON.stringify(L.season)} is not a plain split season`);
  if (!SPLIT_SEASON.test(L.previousSeason) || Number(L.previousSeason.slice(0, 4)) !== seasonStart - 1) fail(`the previous season ${JSON.stringify(L.previousSeason)} is not the season before`);
  const held = new Set((L.held ?? []).map(h => h.player));
  let rows = 0;
  for (const r of L.added) {
    rows += 1;
    const who = `${r.player} ${r.season} ${r.club}`;
    const iso = isoOf(r.club);
    if (!iso) fail(`${who}: the club resolves to no flag, so the Europe rule cannot place it`);
    const want = iso && CALENDAR_COUNTRIES.has(iso) ? String(seasonStart) : L.season;
    if (r.season !== want) fail(`${who}: written ${JSON.stringify(r.season)}, the convention for a ${iso || 'flagless'} club is ${want}`);
    if (!SPLIT_SEASON.test(r.season) && !CALENDAR_SEASON.test(r.season)) fail(`${who}: the season is not a plain hyphen season`);
    if (r.season === String(seasonStart + 1)) fail(`${who}: nothing is ever written ${seasonStart + 1}`);
    if (held.has(r.player)) fail(`${who}: ${r.player} is held and gets no row`);
    for (const f of ['club', 'goals', 'appearances']) {
      const hosts = hostsFor(r.sources, f);
      if (hosts.size < 2) fail(`${who}: ${f} carried by ${hosts.size} non-wiki host(s)`);
    }
    if (r.assists !== null && hostsFor(r.sources, 'assists').size < 2) fail(`${who}: assists ${r.assists} without two hosts (write null)`);
    if (r.marketValue !== 0 && hostsFor(r.sources, 'marketValue').size < 2) fail(`${who}: market value ${r.marketValue} without two hosts (write 0)`);
    /* each number is the one its sources were read as, not only a sourced field */
    for (const f of ['goals', 'appearances', ...(r.assists === null ? [] : ['assists'])]) for (const pr of readingProblems(r.sources, f, r[f])) fail(`${who}: ${pr}`);
    if (!Number.isInteger(r.goals) || !Number.isInteger(r.appearances) || r.goals < 0 || r.appearances < 1) fail(`${who}: goals and appearances must be real counts`);
  }
  for (const c of L.changed ?? []) {
    const who = `${c.player} ${c.season} ${c.club} ${c.field}`;
    if (c.to !== null && hostsFor(c.sources, c.field).size < 2) fail(`${who}: the new value ${c.to} is carried by fewer than two hosts`);
    if (c.to === null && c.field !== 'assists') fail(`${who}: only assists may be written n/a`);
    if (c.from === c.to) fail(`${who}: a change that changes nothing`);
    if (c.to !== null) for (const pr of readingProblems(c.sources, c.field, c.to)) fail(`${who}: ${pr}`);
  }
  for (const e of L.ended ?? []) if (hostsFor(e.sources, 'ended').size < 2) fail(`${e.player}: ended on fewer than two hosts`);
  for (const h of L.held ?? []) if (!h.reason || !pre.some(p => p.name === h.player)) fail(`${h.player}: held without a reason or not in the pool`);
  for (const r of L.removed ?? []) if (!r.keptAs || !r.copy || r.copy.name !== r.player) fail(`${r.player}: removed without the man he is kept as or a copy of his entry`);
  const text = JSON.stringify(L);
  if (/[\u2013\u2014]/.test(text)) fail('the ledger carries a long dash');
  console.log(`   ${rows} added rows, ${(L.changed ?? []).length} changed fields, ${(L.ended ?? []).length} ended, ${(L.held ?? []).length} held, ${(L.removed ?? []).length} removed; every season, club and source holds`);
}

/* the pool after the ledger is the committed bake when that bake is current;
   section 4 proves it, sections 2 and 5 read it */
section = 2;
console.log(`2) coverage: men still stopping at ${ledger.previousSeason}`);
{
  const L = clone(ledger);
  let pool = post;
  if (CONTROL === 'uncovered') {
    const i = L.added.findIndex(r => r.player === 'Mohamed Salah');
    if (i < 0) abort('uncovered control cannot run: Salah has no added row');
    const [gone] = L.added.splice(i, 1);
    pool = clone(post);
    const p = pool.find(x => x.name === gone.player);
    const before = p.career.length;
    p.career = p.career.filter(s => !(s.season === gone.season && s.club === gone.club));
    if (p.career.length !== before - 1) abort('uncovered control changed nothing');
    console.log(`   NEGATIVE CONTROL ON: ${gone.player}'s ${gone.season} row is removed in memory`);
  }
  const cover = coverage(pool, L);
  /* the ratchet is COVERAGE_BASELINE above, by name, so a man who falls out
     while another is accounted for cannot hide behind an equal count */
  const joined = cover.unaccounted.filter(n => !COVERAGE_BASELINE.has(n));
  if (joined.length) fail(`${joined.length} man (men) stop at ${ledger.previousSeason} unaccounted and are not on COVERAGE_BASELINE, which only shrinks: ${joined.join(', ')}`);
  const now = new Set(cover.unaccounted);
  const left = [...COVERAGE_BASELINE].filter(n => !now.has(n));
  if (left.length) fail(`${left.join(', ')} no longer stop(s) at ${ledger.previousSeason} unaccounted, so remove them from COVERAGE_BASELINE in this file in the same commit; the list must only shrink`);
  if (ledger.coverage?.baseline !== cover.unaccounted.length) fail(`the ledger records a coverage count of ${ledger.coverage?.baseline}, measured ${cover.unaccounted.length}`);
  for (const m of cover.notCovered) fail(m);
  const before = coverage(pre, { ...L, added: [], ended: [], held: [] }).unaccounted.length;
  if (!(COVERAGE_BASELINE.size < before)) fail(`COVERAGE_BASELINE holds ${COVERAGE_BASELINE.size} men, not below the ${before} the pool had before the ledger; each wave must lower it`);
  console.log(`   ${cover.unaccounted.length} unaccounted (COVERAGE_BASELINE ${COVERAGE_BASELINE.size}, ${before} before the ledger); accounted: ${cover.accounted.added} added, ${cover.accounted.ended} ended, ${cover.accounted.held} held`);
  console.log(`   held for the relabel round: ${(L.held ?? []).map(h => h.player).join(', ') || 'none'}`);
  console.log(`   ${cover.olderStops} men stop at the season before that (counted, not failed: a later round's)`);
}

section = 3;
console.log('3) the committed migration, bake and ledger are what the ledger generates, and the SQL reads back as the ledger');
{
  /* the bake is rendered with its own date stamp: the lead's re-bake after
     the apply rewrites only that, and every row must still be the ledger's */
  const bakeAbs = path.join(ROOT, BAKE_OUT);
  const bakeText = fs.existsSync(bakeAbs) ? fs.readFileSync(bakeAbs, 'utf8') : '';
  for (const [rel, want] of [[MIGRATION_OUT, gen.migration], [BAKE_OUT, expectedBake(gen.post, bakeText, gen.ledger.postBake.stamp)], [LEDGER_FILE, formatLedger(gen.ledger)]]) {
    const abs = path.join(ROOT, rel);
    if (!fs.existsSync(abs)) { fail(`${rel} is missing`); continue; }
    if (norm(fs.readFileSync(abs, 'utf8')) !== norm(want)) fail(`${rel} differs from what node scripts/genCareerSeasonAdditions.mjs generates now; rerun it`);
  }
  if (bakeText && !bakeStampOf(bakeText)) fail(`${BAKE_OUT} carries no generated marker with a date`);
  const sql = norm(read(MIGRATION_OUT));
  const code = sql.replace(/^\s*--.*$/gm, '');
  const un = s => s.replace(/''/g, "'");
  const num = s => (s === 'null::integer' ? null : Number(s));
  const inserts = [...code.matchAll(/^\s*\('([0-9a-f-]{36})', '((?:[^']|'')+)', '((?:[^']|'')+)', (\d+), (null::integer|\d+), (\d+), (\d+), next_order \+ 1\);$/gm)]
    .map(m => `${m[1]}|${un(m[2])}|${un(m[3])}|${m[4]}|${num(m[5])}|${m[6]}|${m[7]}`).sort();
  const wantInserts = ledger.added.map(r => `${r.playerId}|${r.season}|${r.club}|${r.goals}|${r.assists}|${r.appearances}|${r.marketValue}`).sort();
  if (JSON.stringify(inserts) !== JSON.stringify(wantInserts)) fail(`the migration inserts ${inserts.length} rows that are not exactly the ledger's ${wantInserts.length}`);
  if ((code.match(/select max\(sort_order\) into next_order/g) ?? []).length !== ledger.added.length) fail('each insert must read its sort order as the max plus one');
  /* the changed rows: the old tuple from the pool before, the new one from the ledger's own fields */
  const rowsByKey = new Map();
  for (const c of ledger.changed) {
    const key = `${c.playerId}|${c.season}|${c.club}`;
    if (!rowsByKey.has(key)) {
      const old = pre.find(p => p.name === c.player).career.find(s => s.season === c.season && s.club === c.club);
      rowsByKey.set(key, { old, next: { ...old } });
    }
    rowsByKey.get(key).next[c.field] = c.to;
  }
  const wantUpdates = [...rowsByKey].map(([key, { old, next }]) => `${key}|${old.goals}|${old.assists}|${old.appearances}|${old.marketValue}->${next.goals}|${next.assists}|${next.appearances}`).sort();
  const updates = [...code.matchAll(/^\s*update public\.career_seasons set goals = (\d+), assists = (null::integer|\d+), appearances = (\d+)\n\s*where player_id = '([0-9a-f-]{36})' and season = '((?:[^']|'')+)' and club = '((?:[^']|'')+)' and goals = (\d+) and assists is not distinct from (null::integer|\d+) and appearances = (\d+) and market_value = (\d+);$/gm)]
    .map(m => `${m[4]}|${un(m[5])}|${un(m[6])}|${m[7]}|${num(m[8])}|${m[9]}|${m[10]}->${m[1]}|${num(m[2])}|${m[3]}`).sort();
  if (JSON.stringify(updates) !== JSON.stringify(wantUpdates)) fail(`the migration updates ${updates.length} rows, the ledger changes ${wantUpdates.length}, or an old or new value differs`);
  const after = applyLedger(pre, ledger);
  const seasons = ps => ps.reduce((n, p) => n + p.career.length, 0);
  const counts = [
    [`expected ${pre.length} career_players rows before`, `if n <> ${pre.length} then`],
    [`expected ${seasons(pre)} career_seasons rows before`, `if n <> ${seasons(pre)} then`],
    [`expected ${after.length} career_players rows after`, `if n <> ${after.length} then`],
    [`expected ${seasons(after)} career_seasons rows after`, `if n <> ${seasons(after)} then`],
  ];
  for (const [msg, guard] of counts) if (!code.includes(guard) || !code.includes(msg)) fail(`the migration does not guard "${msg}"`);
  const deletes = [...code.matchAll(/delete from public\.career_players where id = '([0-9a-f-]{36})' and player_name = '((?:[^']|'')+)';/g)].map(m => `${m[1]}|${un(m[2])}`);
  const wantDeletes = (ledger.removed ?? []).map(r => `${r.playerId}|${r.player}`);
  if (JSON.stringify(deletes) !== JSON.stringify(wantDeletes)) fail(`the migration deletes ${JSON.stringify(deletes)}, the ledger removes ${JSON.stringify(wantDeletes)}`);
  /* statements only: the raise messages say "delete" too */
  if ((code.match(/\bdelete\s+from\b/gi) ?? []).length !== wantDeletes.length) fail('the migration carries a delete the ledger does not record');
  if (!/^do \$migration\$$/m.test(code) || !/^\$migration\$;$/m.test(code)) fail('the migration is not one do-block');
  console.log(`   ${inserts.length} inserts, ${updates.length} guarded row updates, ${deletes.length} delete; ${pre.length} to ${after.length} players and ${seasons(pre)} to ${seasons(after)} seasons guarded; files equal the generator's`);
}

section = 4;
console.log('4) the committed bake carries the ledger');
{
  const ledgers = CORRECTION_LEDGERS.map(({ file }) => JSON.parse(read(file)));
  const removed = removedNames(ledgers);
  for (const p of correctionProblems(bake, ledger, removed)) fail(p);
  if (bakeHash(bake) !== ledger.postBake?.sha256) fail(`the bake hashes to ${bakeHash(bake)}, the ledger's postBake is ${ledger.postBake?.sha256}`);
  if (!CORRECTION_LEDGERS.some(l => l.file === LEDGER_FILE)) fail(`${LEDGER_FILE} is not among the bake's CORRECTION_LEDGERS, so a re-bake before the migration would undo it`);
  console.log(`   ${bake.length} players, ${bake.reduce((n, p) => n + p.career.length, 0)} seasons, hash ${bakeHash(bake).slice(0, 12)} is the ledger's postBake; the bake's guard finds nothing missing`);
}

section = 5;
console.log('5) identity: no two players carry the same club and season keys');
{
  let pool = bake;
  if (CONTROL === 'twin') {
    const alisson = bake.find(p => p.name === 'Alisson');
    if (!alisson) abort('twin control cannot run: no Alisson');
    pool = [...bake, { ...clone(alisson), name: 'Alisson Becker' }];
    if (pool.length !== bake.length + 1) abort('twin control changed nothing');
    console.log('   NEGATIVE CONTROL ON: Alisson is cloned as Alisson Becker');
  }
  const pairs = identicalKeySets(pool);
  for (const [a, b] of pairs) fail(`${a} and ${b} carry identical club and season keys`);
  console.log(`   ${pairs.length} identical pair(s) on ${pool.length} players; ${identicalKeySets(pre).length} before the ledger`);
}

section = 6;
console.log('6) the Career Quiz shift the ledger records is the one measured now');
{
  const q = careerQuizShift(pre.map(p => p.name), bake.map(p => p.name), PLANNED_APPLY);
  const rec = ledger.careerQuiz ?? {};
  const pairs = [
    ['changedDaysOfNext60', q.changedDays], ['answersAlsoDealtInTheLast90Days', q.reDealtFromLastWindow],
    ['answersAlsoDealtInTheLast90DaysWithoutTheChange', q.reDealtFromLastWindowWithoutChange],
    ['daysRepeatingAManFromTheirOwnLast90Days', q.reDealt], ['daysRepeatingWithoutTheChange', q.reDealtWithoutChange],
  ];
  for (const [k, v] of pairs) if (rec[k] !== v) fail(`the ledger records ${k} ${rec[k]}, measured ${v}`);
  console.log(`   from ${q.start}: ${q.changedDays} of ${q.days} days change (${q.firstDay.before} becomes ${q.firstDay.after}); ${q.reDealtFromLastWindow} answers were dealt in the ${q.window} days before (${q.reDealtFromLastWindowWithoutChange} without the change); ${q.reDealt} days repeat a man from their own last ${q.window} days`);
}

section = 7;
console.log('7) rehearsal of the migration in PGlite (never on production)');
{
  /* an unrehearsed migration is red, never a quiet skip: either PGlite runs it
     here, or the ledger records a rehearsal of this exact migration text */
  const migrationSha = createHash('sha256').update(norm(read(MIGRATION_OUT))).digest('hex');
  const rec = ledger.rehearsal;
  let PGlite = null;
  try { ({ PGlite } = await import('@electric-sql/pglite')); } catch { PGlite = null; }
  if (!PGlite && REHEARSE_CONTROLS[CONTROL]) abort(`SIM_SEASON_ADD_CONTROL=${CONTROL} needs @electric-sql/pglite resolvable: without it section 7 reads the ledger's record and the control proves nothing`);
  if (!PGlite) {
    if (rec?.migrationSha256 === migrationSha) {
      console.log(`   PGlite is not installed here; the ledger records a rehearsal of this exact migration (sha256 ${migrationSha.slice(0, 12)}, ${rec.with}, ${rec.on})`);
    } else {
      notRehearsed = true;
      fail(`NOT REHEARSED: ${MIGRATION_OUT} (sha256 ${migrationSha.slice(0, 12)}) has no recorded PGlite rehearsal${rec?.migrationSha256 ? `; the ledger's record is of ${rec.migrationSha256.slice(0, 12)}, an older text` : ''}. With @electric-sql/pglite resolvable (installed outside the repo manifest, never on production), run node scripts/simCareerSeasonAdditions.mjs --record-rehearsal and commit the ledger`);
    }
  } else {
    const before = failures[7];
    const engine = await rehearse(PGlite);
    const passed = failures[7] === before;
    if (passed && process.argv.includes('--record-rehearsal') && !CONTROL) {
      const onDisk = JSON.parse(read(LEDGER_FILE));
      onDisk.rehearsal = { migrationSha256: migrationSha, with: engine ? `@electric-sql/pglite, ${engine}` : '@electric-sql/pglite', on: new Date().toISOString().slice(0, 10) };
      fs.writeFileSync(path.join(ROOT, LEDGER_FILE), formatLedger(onDisk));
      console.log(`   recorded the rehearsal of ${migrationSha.slice(0, 12)} in ${LEDGER_FILE}; commit it`);
    } else if (passed && rec?.migrationSha256 !== migrationSha) {
      console.log('   rehearsed green here, but the ledger records no rehearsal of this text: rerun with --record-rehearsal so a run without PGlite stays green');
    }
  }
}

/** Loads the pool before the ledger and the live-after-784 puzzles, runs the migration, reads the tables back. */
async function rehearse(PGlite) {
  const { liveAfter784 } = await import('./genCareerSeasonAdditions.mjs');
  const db = new PGlite();
  const engine = (await db.query('select version() as v')).rows[0].v.split(' on ')[0];
  /* the tables as the repo records production: 20260525000002_career_tables.sql,
     20260526000001_transfer_path_puzzles.sql and 20260905_round_460_transfer_path_mode_columns.sql,
     with assists nullable as src/integrations/supabase/types.ts reads it (the Round 784
     migration wrote null there). The unique name, the smallint sort orders and the
     pair checks are what a wrong migration would trip on, so they are all here. */
  await db.exec(`
    create table public.career_players (id uuid not null default gen_random_uuid() primary key, player_name text not null unique,
      nationality text not null, position text not null, created_at timestamptz not null default now());
    create index career_players_name_idx on public.career_players (player_name);
    create table public.career_seasons (id uuid not null default gen_random_uuid() primary key,
      player_id uuid not null references public.career_players(id) on delete cascade,
      season text not null, club text not null, goals integer not null default 0, assists integer default 0, appearances integer not null default 0,
      market_value integer not null default 0, sort_order smallint not null, created_at timestamptz not null default now());
    create index career_seasons_sort_order_idx on public.career_seasons (player_id, sort_order);
    create table public.transfer_path_puzzles (id uuid not null default gen_random_uuid() primary key, puzzle_id text not null unique,
      player_a text not null, player_b text not null, min_steps smallint not null, hint text not null, sort_order smallint not null,
      created_at timestamptz not null default now(), active_min_steps smallint, active_hint text, europe_min_steps smallint, europe_hint text,
      constraint transfer_path_puzzles_active_pair check ((active_min_steps is null) = (active_hint is null)),
      constraint transfer_path_puzzles_europe_pair check ((europe_min_steps is null) = (europe_hint is null)));
    alter table public.career_players enable row level security;
    alter table public.career_seasons enable row level security;
    alter table public.transfer_path_puzzles enable row level security;`);
  const ids = new Map();
  for (const l of [ledger.added, ledger.changed, ledger.ended, ledger.held, ledger.removed]) for (const r of l ?? []) if (r.playerId) ids.set(r.player, r.playerId);
  for (const r of ledger.removed ?? []) ids.set(r.keptAs, r.keptId);
  let k = 0;
  const idOf = name => ids.get(name) ?? ids.set(name, `00000000-0000-4000-8000-${String(++k).padStart(12, '0')}`).get(name);
  for (const p of pre) {
    await db.query('insert into public.career_players (id, player_name, nationality, position) values ($1, $2, $3, $4)', [idOf(p.name), p.name, p.nationality, p.position]);
    let order = 0;
    for (const s of p.career) await db.query('insert into public.career_seasons (player_id, season, club, goals, assists, appearances, market_value, sort_order) values ($1, $2, $3, $4, $5, $6, $7, $8)', [idOf(p.name), s.season, s.club, s.goals, s.assists, s.appearances, s.marketValue, order++]);
  }
  const live = liveAfter784(ROOT);
  let puzzleOrder = 0;
  for (const [id, p] of live) await db.query('insert into public.transfer_path_puzzles (puzzle_id, player_a, player_b, min_steps, hint, sort_order, active_min_steps, active_hint, europe_min_steps, europe_hint) values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)', [id, p.a, p.b, p.classic.minSteps, p.classic.hint, puzzleOrder++, p.active?.minSteps ?? null, p.active?.hint ?? null, p.europe?.minSteps ?? null, p.europe?.hint ?? null]);
  let sql = read(MIGRATION_OUT);
  if (REHEARSE_CONTROLS[CONTROL]) {
    const [from, to] = REHEARSE_CONTROLS[CONTROL];
    if (sql.split(from).length !== 2) abort(`control ${CONTROL}: the migration does not carry exactly one ${JSON.stringify(from)}, so the control would change nothing`);
    sql = sql.replace(from, to);
  }
  try { await db.exec(sql); } catch (e) { fail(`the migration raised on the pool before the ledger: ${e.message}`); return; }
  const players = (await db.query('select id, player_name, nationality, position from public.career_players order by player_name')).rows;
  const seasons = (await db.query('select player_id, season, club, goals, assists, appearances, market_value from public.career_seasons order by player_id, sort_order')).rows;
  const by = new Map();
  for (const s of seasons) (by.get(s.player_id) ?? by.set(s.player_id, []).get(s.player_id)).push({ season: s.season, club: s.club, goals: s.goals, assists: s.assists, appearances: s.appearances, marketValue: s.market_value });
  const after = players.map(p => ({ name: p.player_name, nationality: p.nationality, position: p.position, career: by.get(p.id) ?? [] }));
  /* PGlite's collation may order names differently from production's, so the
     players are compared by name, each career in its own order */
  const want = new Map(post.map(p => [p.name, JSON.stringify(p)]));
  if (after.length !== post.length) fail(`the rehearsed tables hold ${after.length} players, the pool after the ledger ${post.length}`);
  const differ = after.filter(p => want.get(p.name) !== JSON.stringify(p)).map(p => p.name);
  if (differ.length) fail(`the rehearsed tables differ from the pool after the ledger for ${differ.length} players: ${differ.slice(0, 5).join(', ')}`);
  const expected = new Map([...live].map(([id, p]) => [id, { a: p.a, b: p.b, classic: p.classic, europe: p.europe, active: p.active }]));
  for (const r of gen.renames) Object.assign(expected.get(r.id), { a: r.a, b: r.b });
  for (const r of gen.rewrites) expected.get(r.id)[r.rule] = r.next;
  const entry = (min, hint) => (min === null ? null : { minSteps: Number(min), hint });
  let puzzleDiffs = 0;
  const puzzleRows = (await db.query('select * from public.transfer_path_puzzles')).rows;
  if (puzzleRows.length !== expected.size) fail(`the rehearsed table holds ${puzzleRows.length} Transfer Path puzzles, the companion ${expected.size}`);
  for (const row of puzzleRows) {
    const e = expected.get(row.puzzle_id);
    const got = { a: row.player_a, b: row.player_b, classic: entry(row.min_steps, row.hint), europe: entry(row.europe_min_steps, row.europe_hint), active: entry(row.active_min_steps, row.active_hint) };
    if (!e || JSON.stringify(got) !== JSON.stringify(e)) puzzleDiffs += 1;
  }
  if (puzzleDiffs) fail(`${puzzleDiffs} rehearsed Transfer Path rows differ from the companion with the renames and rewrites applied`);
  /* a second run must stop at its first guard, the row count, and change nothing */
  let second = null;
  try { await db.exec(sql); } catch (e) { second = e.message; }
  if (second === null) fail('the migration ran a second time instead of failing closed');
  else if (!second.includes(`expected ${pre.length} career_players rows before this migration, found ${post.length}`)) fail(`a second run failed, but not at the row count guard: ${second.slice(0, 160)}`);
  const again = (await db.query('select count(*)::int as n from public.career_seasons')).rows[0].n;
  if (again !== seasons.length) fail(`the failed second run left ${again} season rows, not ${seasons.length}`);
  console.log(`   rehearsed: ${after.length} players and ${seasons.length} seasons read back equal to the bake, ${puzzleRows.length} puzzles equal to the companion with the renames and rewrites; a second run stops at the row count guard and changes nothing (${engine})`);
  return engine;
}

console.log('');
const total = Object.values(failures).reduce((a, b) => a + b, 0);
if (CONTROL) {
  const own = OWN[CONTROL];
  /* the one finding of an unrehearsed migration is not what a control tests, so it is set aside, and said */
  const setAside = notRehearsed && failures[7] === 1 ? 7 : 0;
  const others = Object.entries(failures).filter(([s]) => Number(s) !== own && Number(s) !== setAside).reduce((a, [, n]) => a + n, 0);
  if (failures[own] > 0 && others === 0) { console.log(`simCareerSeasonAdditions control (${CONTROL}): green. Section ${own} went red and every other section stayed green${setAside ? ' (section 7 set aside: the migration is not rehearsed here)' : ''}.`); process.exit(0); }
  console.error(`simCareerSeasonAdditions control (${CONTROL}): RED. Expected only section ${own} to fail, got ${JSON.stringify(failures)}.`);
  process.exit(1);
}
if (total > 0) { console.error(`simCareerSeasonAdditions: ${total} failure${total === 1 ? '' : 's'} ${JSON.stringify(failures)}`); process.exit(1); }
console.log('simCareerSeasonAdditions: green. The ledger is sourced, its wave is covered, and the migration and the bake carry exactly it.');

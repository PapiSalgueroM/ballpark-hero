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
 *     string. Controls typo ('Gold Coast Suns' loses its s) and onesource (Sydney
 *     Swans keeps one source); independent section 3 (critic corrections 3, 4).
 *   2 identity: (a) a career started with no club set is byte for byte the base
 *     record (scripts/data/aussieV2SaveFixture1572.json, taken on the untouched
 *     engine by scripts/recordAussieV2SaveFixture1572.mjs) at every checkpoint.
 *   3 old saves: every recipe of the record replays to the base's raw hash, loads,
 *     round trips byte for byte, opens the league board, and plays 60 more bot
 *     actions to the base's hash, with no clubSet key anywhere.
 *
 * Every section prints its counts, so a pass on empty input cannot happen. The
 * run ends on one summary line and exits 1 on any failure.
 *
 * Controls: AFL_NAMES_CONTROL=<name> patches the BUNDLE (an esbuild onLoad hook,
 * never the source on disk), refuses to run unless its anchor occurs exactly once
 * and the patched text differs (exit 2), then runs only its target section and one
 * independent section. It ends on "RED as intended" and exits 1 when the target is
 * red and the independent section green; anything else exits 3 (DID NOT FIRE).
 *
 * AFL_NAMES_LONG=1 runs the whole 72 career fleet in section 2 (the default runs
 * seeds 1, 12 and 24 by the three clubs, critic advice 10).
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { bundle, fleetCareer, FLEET_CLUBS, FLEET_SEEDS, maskedHash, MORE, play, rawHash, SHORT_SEEDS, sha } from './lib/aflClubNames1572.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CONTROL = process.env.AFL_NAMES_CONTROL || '';
const LONG = process.env.AFL_NAMES_LONG === '1';
const started = Date.now();

const LEAGUE = 'src/lib/aussieRulesLeague.ts', DATA = 'src/data/aflClubs2026.ts';
/* [file, anchor, replacement, target section, independent section] */
const CONTROLS = {
  /* Critic corrections 3 and 4: anchors that occur once, and section 3 as the independent section. */
  typo: [DATA, "'Gold Coast Suns'", "'Gold Coast Sun'", 0, 3],
  onesource: [DATA, "full: 'Sydney Swans', short: 'Sydney', ladder2026: 2, fullSources: ['afl', 'austadiums']", "full: 'Sydney Swans', short: 'Sydney', ladder2026: 2, fullSources: ['afl']", 0, 3],
};
if (CONTROL && !CONTROLS[CONTROL]) { console.error(`unknown control ${CONTROL}`); process.exit(2); }
const SECTIONS = [0, 2, 3];
const RUN = CONTROL ? new Set([CONTROLS[CONTROL][3], CONTROLS[CONTROL][4]]) : new Set(SECTIONS);

const { L } = await bundle(ROOT, {
  entries: ["export * from './src/lib/aussieRulesLeague.ts';", "export * as AFL from './src/data/aflClubs2026.ts';"],
  patch: CONTROL ? CONTROLS[CONTROL].slice(0, 3) : null,
});
const RECORD = JSON.parse(fs.readFileSync(path.join(ROOT, 'scripts/data/aussieV2SaveFixture1572.json'), 'utf8'));
const LEDGER = JSON.parse(fs.readFileSync(path.join(ROOT, 'scripts/data/aflClubNames2026.json'), 'utf8'));

const failures = new Map();
let section = -1, checks = 0;
const fail = m => { failures.set(section, (failures.get(section) || 0) + 1); console.error(`  FAIL [${section}]: ${m}`); };
const check = (cond, m) => { checks += 1; if (cond) console.log(`  ok: ${m}`); else fail(m); };
const head = (n, title) => { section = n; failures.set(n, failures.get(n) || 0); console.log(`\n${n}. ${title}`); };
const guard = (n, fn) => { try { fn(); } catch (e) { fail(`threw: ${String(e && e.stack || e).split('\n').slice(0, 3).join(' | ')}`); } };

/* ---------- 0. sources ---------- */
const DASHES = [String.fromCharCode(0x2013), String.fromCharCode(0x2014)];
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
if (RUN.has(0)) guard(0, () => {
  head(0, 'sources: 18 clubs, every printed string from two independent non wiki publishers, the data file equals its receipts');
  const rows = L.AFL.AFL_CLUBS_2026, sources = L.AFL.AFL_CLUB_SOURCES;
  const publisher = new Map(sources.map(s => [s.id, s.publisher]));
  check(rows.length === 18 && LEDGER.clubs.length === 18, `${rows.length} clubs in the data file, ${LEDGER.clubs.length} in the ledger (18 expected)`);
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
    const l = LEDGER.clubs[i];
    if (l && l.full === r.full && l.short === r.short && l.ladder2026 === r.ladder2026 && same(l.fullSources, r.fullSources) && same(l.shortSources, r.shortSources) && same(l.ladderSources, r.ladderSources)
      && same(l.receipts.full.map(x => x.source), r.fullSources) && same(l.receipts.short.map(x => x.source), r.shortSources) && same(l.receipts.ladder.map(x => x.source), r.ladderSources)) agree += 1;
    else fail(`row ${i + 1} (${r.full}) differs from its receipts in the ledger`);
    if (!l) return;
    for (const [what, text] of [['full', r.full], ['short', r.short]]) for (const x of l.receipts[what]) { lines += 1; if (!x.line.toLowerCase().includes(text.toLowerCase())) lineBad.push(`${r.full} ${what} ${x.source}`); }
    for (const x of l.receipts.ladder) { lines += 1; if (!x.line.startsWith(`${r.ladder2026} `)) lineBad.push(`${r.full} ladder ${x.source}`); }
  });
  check(agree === 18, `${agree} of 18 rows equal the ledger string for string and source for source`);
  check(lines >= 108 && lineBad.length === 0, `every one of ${lines} receipt lines prints its string (or starts with its ladder place)${lineBad.length ? `; not: ${lineBad.join('; ')}` : ''}`);
});

/* ---------- 2. identity ---------- */
if (RUN.has(2)) guard(2, () => {
  head(2, 'identity: a career with no club set is the base record, checkpoint for checkpoint');
  const seeds = LONG ? FLEET_SEEDS : SHORT_SEEDS;
  check(RECORD.fleet.length === FLEET_SEEDS.length * FLEET_CLUBS.length, `the record holds ${RECORD.fleet.length} fleet careers (72 expected)`);
  let careers = 0, points = 0, same = 0;
  const t0 = Date.now();
  for (const seed of seeds) for (const club of FLEET_CLUBS) {
    const base = RECORD.fleet.find(row => row.seed === seed && row.club === club);
    const run = fleetCareer(L, seed, club);
    careers += 1;
    if (!base) { fail(`no base row for seed ${seed} ${club}`); continue; }
    if (run.length !== base.points.length) { fail(`seed ${seed} ${club}: ${run.length} checkpoints, base ${base.points.length}`); continue; }
    run.forEach((point, i) => { points += 1; const b = base.points[i]; if (point.at === b.at && point.raw === b.raw && point.masked === b.masked) same += 1; else fail(`seed ${seed} ${club} checkpoint ${i} (season ${point.season} ${point.phase}, ${point.at} actions) differs from the base`); });
  }
  check(careers === seeds.length * FLEET_CLUBS.length && points >= careers * 3, `(a) ${careers} careers, ${points} checkpoints played with no set (${LONG ? 'LONG, the whole fleet' : 'default, seeds ' + seeds.join(', ')}) in ${((Date.now() - t0) / 1000).toFixed(1)} s`);
  check(same === points, `(a) ${same} of ${points} checkpoints equal the base's raw and masked hashes`);
});

/* ---------- 3. old saves ---------- */
/* Replays every recipe of one group by its recorded action count, from createLeague with no set. */
function replayGroup(seed, club, recs, visit) {
  let s = L.createLeague(seed, club), at = 0;
  for (const rec of [...recs].sort((a, b) => a.at - b.at)) { s = play(L, s, rec.at - at); at = rec.at; visit(rec, s); }
}
if (RUN.has(3)) guard(3, () => {
  head(3, 'old saves: every base save loads, round trips, opens the league and plays on to the base');
  check(RECORD.recipes.length === 16, `the record holds ${RECORD.recipes.length} save recipes (16 expected)`);
  const groups = new Map();
  for (const rec of RECORD.recipes) { const key = `${rec.seed}|${rec.club}`; if (!groups.has(key)) groups.set(key, []); groups.get(key).push(rec); }
  let raw = 0, loads = 0, round = 0, board = 0, after = 0, clean = 0;
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
  });
  const n = RECORD.recipes.length;
  check(raw === n, `${raw} of ${n} recipes replay to the base's raw save string`);
  check(loads === n && round === n, `${loads} of ${n} load and ${round} round trip byte for byte`);
  check(board === n, `${board} of ${n} open the league board`);
  check(after === n, `${after} of ${n} play ${MORE} more bot actions to the base's raw and masked hash`);
  check(clean === n, `${clean} of ${n} never carry a clubSet key`);
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

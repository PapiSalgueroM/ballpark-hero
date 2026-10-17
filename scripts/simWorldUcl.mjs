/* Round 1347. The world's Champions League, part one: the format ledger and the competition engine, which nothing
 * in the game calls yet (Round 1502 binds it to Club Manager, Round 1503 shows it).
 *
 *   scripts/data/cmWorldCompFormats.json   the group stage format of the four era seasons, each row with its pages
 *   src/lib/worldCompetition.ts             the engine: the eras' groups, the league phase (Round 1228's library,
 *                                           bound), the knockout ties, the nights, the evaluation of a saved slice
 *
 * SECTIONS (WORLD_UCL_ONLY=0 runs some of them; the default is all):
 *   0  the ledger. A verified row stands on two publishers on two hosts, none a wiki; a figure is printed by two
 *      of them, each in a line about that figure; a row that is not verified carries no constant; every era
 *      season has a verified group stage shape and a group draw row; the receipt holds the ledger's hash; no dash
 *      of the two banned kinds. Then the engine (from Round 1347's second step): every constant of
 *      worldCompetition.ts equals its row, WORLD_COMP_PARTIAL names exactly the rows that are not verified, and
 *      the league phase nights run in the real months' order (row N1).
 *   Round 1502 binds the engine to Club Manager (src/lib/clubManager.ts, the binding block beside initUclWorld)
 *   and sections 1 to 7 drive the real engine (scripts/lib/worldUclFleet.mjs: a fresh vm per save, the clock held,
 *   a counter stream). The watchers are picked by the engine's own answer (uclGroup null at the start): today's
 *   world Chelsea, Hoffenheim (the fill case), Everton, a Liga MX club and a created club, and one club of each era;
 *   the participants Real Madrid, Arsenal and one club of each era. Seeds 1 to 5 (WORLD_UCL_SEEDS).
 *   1  every watched season of the watcher fleet, three seasons each (a mid season move on two seeds, a summer
 *      move to a club with a direct place wherever the season allows one): a competition every season, its
 *      format the era's, the format's number of different entrants and never my club, every first stage fixture
 *      once, the eras' groups (one club a pot, the season's draw rules with the clashes the slice records, every
 *      pair twice) and round of 16 (a winner against a runner-up of another group), the league phase's stored
 *      slate equal to drawUclLeaguePhase's own, its play-offs, round of 16 and later rounds, every tie's legs
 *      and aggregate, a shootout only when level, away goals only to 2020, the tables' identities, exactly one
 *      winner; and every group season evaluated level both ways round the device's order (correction 1).
 *      Since the review of 2026-10-17 also: every first stage score replayed on simAiMatch itself over the
 *      snapshot with the fixture's keyed stream (the watched match is the participant's own AI match); where a
 *      season is opened, the save's holder first in the draw when it is in the field, and an era's one club from
 *      outside its 32 the stand in worked out here (the strongest era club outside them, printed); and a mid
 *      season move left with no competition only by the rule (today's world from season two); and a created club
 *      that finished top of its top flight, left in the summer, hands its watched place back to the club it
 *      replaced (the critic's advice 24).
 *   2  SELF RELATIVE: the engine against itself with the binding switched off (the open, the rollover, the
 *      join's carry and the load repair), both fleets, both coach modes: every key but a watching state's worldComps equal, every
 *      draw equal, no state in the Champions League carrying a slice, the evaluation called on the live state
 *      after every step of this arm.
 *   3  in step: after every step the nights done never fall, a night counts only once the week is past it and
 *      shows no score before, a night shown never changes (across a move that carried the slice too), a reload
 *      evaluates the same; the nights' dates rise with the legs of a tie a week apart, in the fleet and at every
 *      league size of every world. Since the review of 2026-10-17 also: when a night counts as played, read off
 *      the CALENDAR alone (a matchday is its uclGroup entry, an era's leg its uclKo entry, any other night follows
 *      the last entry dated on or before it), never off worldUclNights; one state evaluated at two night counts;
 *      on the third seed a move to an entrant of the watched competition that never carries it; a reload right
 *      after every move that finds the same competition; and the carries held to a floor per format.
 *   4  the save: at most one slice, always the season in play's, never listing my club; its bytes printed.
 *   5  the holder (step E5): today's world's watchers on the engine and on it with the holder line reverted
 *      (scripts/lib/worldUclHolder1502.mjs): a watched winner is in next season's field (and the watched one,
 *      unless it is my club now), a winner already in the field leaves its clubs alone, and the two engines part
 *      only at a rollover after a watched final, on the field. Prints the fields the holder changed.
 *   6  the dailies' state shape: no Hot Seat or Deadline Day state carries worldComps.
 *   7  measured and printed: titles by strength quartile (held to one band from measured headroom: the head
 *      144, 28, 4, 0 of 176 in r1502-run-a; the strongest quarter must win more than half and over four times the
 *      weakest's), goals a watched and a domestic match, extra time and shootouts, slates and draws that bent a
 *      rule.
 *
 * Exit 0 green, 1 red or a control that fired, 2 could not run, 3 a control that did not fire.
 * A control is WORLD_UCL_CONTROL=<name>; it runs its own section only and must turn its own check red and nothing
 * that is not its own (the last line says FIRED, DID NOT FIRE CLEANLY or ABORTED).
 *   section 0, the data twisted in memory: onesource wiki thinused figure receipt cover order (two of N1's
 *              months swapped); the engine edited in the bundle: const (the top two become three) partial
 *              (WORLD_COMP_PARTIAL forgets G8) ban (2015-16 draws Russian and Ukrainian clubs together)
 *   section 1, the engine edited in the bundle: dropnight (the last first stage night is not played) field32
 *              (today's world's field at 32) eraformat (an era plays the league phase) meinfill (season one's
 *              field keeps my club: Hoffenheim) meindirect (the rollover's field keeps my club: the summer move)
 *              nopens (a final level after extra time keeps no winner) agall (away goals in the league phase)
 *              locale (the groups ordered by the device's order again) swaphome and edgeswap (the watched
 *              match with its two strengths or its two edges swapped) standweak (the eras' stand in is the
 *              weakest club outside the 32) noholdertop (the holder never first in the draw) nocustomexit (a
 *              summer move away from a created club leaves the created club's name in the watched field)
 *   section 2: stream (the watched match draws from Math.random) participant (a club in the Champions League
 *              opens a watched one too) form (the evaluation writes the clubs' form)
 *   section 3: ahead (a night counts one week early) live (the evaluation reads today's strengths, not the
 *              snapshot: red across a move) noseen (a carried slice forgets the nights it had shown) marks (two
 *              league phase nights on one league round) mdearly (a matchday placed at the league entry before
 *              its European midweek) markearly (a mark night placed at its league round) carryentrant (a move
 *              to an entrant carries the competition) nofall (that move opens nothing, so a reload opens one)
 *              memokey (the evaluation's memo forgets the night count)
 *   section 4: keep (the rollover keeps last season's slice under a second key)
 *   section 5: noholder (the holder line reverted: the watched winner stays out of next season's field)
 *   section 7: titles (the strengths swapped: the band on the titles by quartile)
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { build } from 'esbuild';
import { engineOf, pickFleet, tape, CREATED, ERAS as ERAS_OF_FLEET } from './lib/worldUclFleet.mjs';
/* Step E5 (the watched winner as next season's holder) is its own commit so the lead can hold it out (the critic's
   advice 21): without it the holder library is gone and the holder is my own final's winner alone, so the
   library is read only when it is there and section 5 and the noholder control say E5 is not built. */
const HOLDER_LIB = path.join(path.dirname(fileURLToPath(import.meta.url)), 'lib', 'worldUclHolder1502.mjs');
const { HOLDER_EDIT = null, HOLDER_LINE = null } = fs.existsSync(HOLDER_LIB) ? await import(pathToFileURL(HOLDER_LIB).href) : {};
const hasE5 = () => !!HOLDER_LINE && text(CM).includes(HOLDER_LINE);

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const text = file => fs.readFileSync(path.join(ROOT, file), 'utf8').replaceAll('\r\n', '\n');
const CONTROL = process.env.WORLD_UCL_CONTROL || '';
const ONLY = (process.env.WORLD_UCL_ONLY || '').split(',').filter(Boolean).map(Number);
const cannot = why => { console.log(`simWorldUcl: cannot run: ${why}`); process.exit(2); };

/* Each control: its section, the failure it MUST cause, and (third) every failure it MAY cause. */
const CONTROLS = {
  onesource: [0, /^G3-2020 is verified and stands on fewer than two publishers/],
  wiki: [0, /^G1: .* is a wiki/],
  thinused: [0, /^G2-2005 is not verified and carries/],
  figure: [0, /^G1: groups 8 is not printed by two publishers/],
  receipt: [0, /does not carry the hash/],
  cover: [0, /^season 2010 has no verified G1 row/, /^season 2010 has no verified G1 row|^G1: /],
  /* The engine edited in the bundle (EDITS below), or the ledger twisted where the engine is compared. */
  const: [0, /^G8_SHAPE\.advance is 3 in worldCompetition\.ts and 2 in the ledger/],
  partial: [0, /^WORLD_COMP_PARTIAL does not name G8/],
  ban: [0, /^G8_BANNED_PAIRS\.2015 keeps nobody apart and G5-2015-groups/],
  order: [0, /^the league phase nights are not in the real months' order at MD3/],
};
const MODULE_FILE = 'src/lib/worldCompetition.ts';
const EDITS = {
  const: [MODULE_FILE, 'export const G8_SHAPE = { clubs: 32, groups: 8, groupSize: 4, games: 6, advance: 2 } as const;', 'export const G8_SHAPE = { clubs: 32, groups: 8, groupSize: 4, games: 6, advance: 3 } as const;'],
  partial: [MODULE_FILE, "'G5-2020-ko', 'G8'];", "'G5-2020-ko'];"],
  ban: [MODULE_FILE, "2005: [], 2010: [], 2015: [['Russia', 'Ukraine']], 2020: [['Russia', 'Ukraine']],", "2005: [], 2010: [], 2015: [], 2020: [['Russia', 'Ukraine']],"],
  /* Round 1502, section 1's device order check (the critic's correction 1): the watched groups sorted by the
     device's order again, in the module bundled into this realm, where String.prototype can be turned around. */
  locale: [MODULE_FILE, "bind.groupRule ?? 'h2hFull', results, byText),", "bind.groupRule ?? 'h2hFull', results),"],
};

/* Round 1502: the controls of sections 1 to 7, each an edit of the engine in the bundle only (CAREER_EDITS, every
   line asserted to stand exactly once), each turning its own section's sentence red. */
const CM = 'src/lib/clubManager.ts';
const CAL = 'src/lib/clubManagerCalendar.ts';
Object.assign(CONTROLS, {
  dropnight: [1, /^1 fixtures: /, /^1 (fixtures|table|knockout|tie|winner|group): /],
  field32: [1, /^1 no competition: .*\(now/, /^1 no competition: /],
  eraformat: [1, /^1 no competition: .*\(era20/, /^1 (no competition|format): /],
  meinfill: [1, /^1 no competition: Hoffenheim \(now\) season 1/, /^1 no competition: /],
  meindirect: [1, /^1 no competition: .*moved to/, /^1 no competition: /],
  nopens: [1, /^1 winner: /, /^1 (winner|tie|knockout): /],
  agall: [1, /^1 away goals: /, /^1 (away goals|tie|knockout|winner): /],
  locale: [1, /^1 locale: /],
  stream: [2, /^2 watcher .*the draws differ/, /^2 /],
  participant: [2, /^2 .*carries worldComps/, /^2 /],
  form: [2, /^2 watcher .*the state differs/, /^2 /],
  /* The critic's correction 8: among its reds a league phase MD1, the night the calendar's own European midweek is. */
  ahead: [3, /^3 early: [^:]*\(now\) seed \d+ at [^:]*: MD1 counts as played/, /^3 /],
  live: [3, /^3 join moved: /, /^3 /],
  noseen: [3, /^3 falls: /, /^3 /],
  marks: [3, /^3 dates: /],
  keep: [4, /^4 slices: /, /^4 /],
  noholder: [5, /^5 holder: .*is not in next season's field/, /^5 /],
});
const CAREER_EDITS = {
  dropnight: [{ file: MODULE_FILE, from: '  for (let md = 0; md < firstStage; md += 1) {', to: '  for (let md = 0; md < firstStage - 1; md += 1) {' }],
  field32: [
    { file: CM, from: '    ? uclFieldFromTables(tables, holder, UCL_LEAGUE.clubs, worldUclExcluded(state))', to: '    ? uclFieldFromTables(tables, holder, 32, worldUclExcluded(state))' },
    { file: CM, from: '    : state.season === 1 ? seasonOneUclField(state.eraId ?? DEFAULT_ERA_ID, UCL_LEAGUE.clubs, worldUclExcluded(state)) : null;', to: '    : state.season === 1 ? seasonOneUclField(state.eraId ?? DEFAULT_ERA_ID, 32, worldUclExcluded(state)) : null;' },
  ],
  eraformat: [{ file: CM, from: "  return uclSeasonYear(state.eraId) <= UCL_R16_LAST_YEAR ? 'g8' : 'l36';", to: "  return 'l36';" }],
  meinfill: [{ file: CM, from: '    : state.season === 1 ? seasonOneUclField(state.eraId ?? DEFAULT_ERA_ID, UCL_LEAGUE.clubs, worldUclExcluded(state)) : null;', to: '    : state.season === 1 ? seasonOneUclField(state.eraId ?? DEFAULT_ERA_ID, UCL_LEAGUE.clubs) : null;' }],
  meindirect: [{ file: CM, from: '    ? uclFieldFromTables(tables, holder, UCL_LEAGUE.clubs, worldUclExcluded(state))', to: '    ? uclFieldFromTables(tables, holder, UCL_LEAGUE.clubs)' }],
  nopens: [{ file: MODULE_FILE, from: '\n    t.pens = true;\n    t.winner = coin() < 0.5 ? t.home : t.away;\n', to: '\n    t.pens = true;\n' }],
  agall: [{ file: CM, from: '    awayGoals: uclAwayGoalsApply(state.eraId),\n    deciderScale: ET_DEFLATOR,', to: '    awayGoals: true,\n    deciderScale: ET_DEFLATOR,' }],
  stream: [{ file: CM, from: 'sim: (strH, strA, scale, rand) => simScore(strH, strA, 0.2, -0.08, scale, rand), tie };', to: 'sim: (strH, strA, scale, rand) => simScore(strH, strA, 0.2, -0.08, scale), tie };' }],
  participant: [
    { file: CM, from: '  if (world || state.uclGroup) return;\n  try {\n    openWorldUcl(', to: '  if (world) return;\n  try {\n    openWorldUcl(' },
    { file: CM, from: '  if (state.uclGroup || !field) return;', to: '  if (!field) return;' },
  ],
  form: [{ file: CM, from: '  memo.set(key, out);\n  return out;\n}', to: '  for (const n of out.nights) for (const fx of n.fixtures) if (fx.hg !== undefined) noteForm(state, fx.home, fx.away, fx.hg, fx.ag as number);\n  memo.set(key, out);\n  return out;\n}' }],
  ahead: [{ file: CM, from: '  else while (n < places.length && state.week > places[n].at) n += 1;', to: '  else while (n < places.length && state.week >= places[n].at) n += 1;' }],
  live: [{ file: CM, from: '  const out = evaluateWorldComp(slice, k, worldUclBind(state, slice.f));', to: '  const out = evaluateWorldComp({ ...slice, str: slice.clubs.map(c => worldUclStrength(state, c)) }, k, worldUclBind(state, slice.f));' }],
  noseen: [{ file: CM, from: '      joined.worldComps = { ucl: { ...slice, ...(seen > 0 ? { seen } : {}) } };', to: '      joined.worldComps = { ucl: { ...slice, seen: undefined } };' }],
  marks: [
    { file: MODULE_FILE, from: '    const r = Math.max(prev + 1, at(f));', to: '    const r = at(f);' },
    { file: MODULE_FILE, from: '0.79, 0.82, 0.87, 0.90, 1.0];', to: '0.79, 0.82, 0.87, 0.87, 1.0];' },
  ],
  noholder: HOLDER_EDIT ? [HOLDER_EDIT] : [],
  keep: [{ file: CM, from: '    openWorldUcl(state, worldUclField(state, tables, watchHolder), watchHolder);', to: '    openWorldUcl(state, worldUclField(state, tables, watchHolder), watchHolder);\n    (state as unknown as Record<string, unknown>).worldCompsKept = career.worldComps;' }],
};
/* The review of 2026-10-17 (results-g/review-run-1502.md and review-read-1502.md): each mutation it showed every
   section green under, now a control of the check that answers it. */
const BIND_LINE = 'const bind: WorldCompBind = { sim: (strH, strA, scale, rand) => simScore(strH, strA, 0.2, -0.08, scale, rand), tie };';
const FALL_LINE = '    /* Nothing to carry, or my new club is an entrant of the one it watched (it cannot watch itself play): the\n';
Object.assign(CONTROLS, {
  /* Correction 8's defect put into worldUclNights' own places: a matchday counted at the league entry before its
     European midweek, and a mark night at its league round before the entries of its own midweek. */
  mdearly: [3, /^3 calendar: [^:]*\(now\) seed \d+ at [^:]*: MD1 \(uclGroup, entry \d+\) counts as played early/, /^3 /],
  markearly: [3, /^3 calendar: [^:]*\(now\) seed \d+ at [^:]*: [A-Z0-9_]+ \(date, entry -?\d+\) counts as played early/, /^3 /],
  /* The carry rule's entrant half: the entrant filter dropped (the slice carried onto an entrant), and the
     fall through dropped (the move opens nothing, the load repair opens one: a reload changes the save). */
  carryentrant: [3, /^3 entrant: /, /^(3|4) /],
  nofall: [3, /^3 reload: .*\(right after the join\)/, /^3 /],
  /* The watched match: the two strengths swapped, the two edges swapped. */
  swaphome: [1, /^1 match: /, /^1 /],
  edgeswap: [1, /^1 match: /, /^1 /],
  titles: [7, /^7 titles: /, /^(7 titles|1 )/],
  /* The eras' stand in reversed (the weakest), the holder never put first in pot one, the memo's key without the
     night count. */
  standweak: [1, /^1 stand in: /, /^1 /],
  noholdertop: [1, /^1 holder: /, /^1 /],
  memokey: [3, /^3 memo: /, /^3 /],
  /* Advice 24: a summer move away from a created club hands its watched place to the created club's name. */
  nocustomexit: [1, /^1 created exit: /],
});
Object.assign(CAREER_EDITS, {
  mdearly: [{ file: CM, from: '      put(night, i < 0 ? prev.at : i, i < 0 ? prev.round : roundOf(i), i >= 0);', to: '      put(night, i < 0 ? prev.at : i - 1, i < 0 ? prev.round : roundOf(i), i >= 0);' }],
  markearly: [{ file: CM, from: '      put(night, r < rounds ? blockEnd(r) : cal.length - 1, r, false);\n      return;', to: '      put(night, r < rounds ? leagueAt[r] : cal.length - 1, r, false);\n      return;' }],
  carryentrant: [{ file: CM, from: ' && slice.s === joined.season && !names.some(c => slice.clubs.includes(c))) {', to: ' && slice.s === joined.season) {' }],
  nofall: [{ file: CM, from: FALL_LINE, to: `    if (slice && slice.s === career.season) return;\n${FALL_LINE}` }],
  swaphome: [{ file: CM, from: BIND_LINE, to: BIND_LINE.replace('simScore(strH, strA, 0.2', 'simScore(strA, strH, 0.2') }],
  edgeswap: [{ file: CM, from: BIND_LINE, to: BIND_LINE.replace('0.2, -0.08, scale', '-0.08, 0.2, scale') }],
  titles: [{ file: CM, from: BIND_LINE, to: BIND_LINE.replace('simScore(strH, strA, 0.2', 'simScore(strA, strH, 0.2') }],
  standweak: [{ file: CM, from: '    .sort((a, b) => b.xi - a.xi || plain(a.c, b.c))[0]?.c;', to: '    .sort((a, b) => a.xi - b.xi || plain(a.c, b.c))[0]?.c;' }],
  noholdertop: [{ file: CM, from: '  const top = holder && field.includes(holder) ? holder : undefined;', to: '  const top: string | undefined = undefined;' }],
  memokey: [{ file: CM, from: "  const key = `${state.eraId ?? ''}|${k}`;", to: "  const key = `${state.eraId ?? ''}`;" }],
  nocustomexit: [{ file: CM, from: '    const tables = moving && watchTables ? watchTables.map(t => ({ ...t, clubs: customExitUclField(career, t.clubs) })) : watchTables;', to: '    const tables = watchTables;' }],
});
if (CONTROL && !Object.hasOwn(CONTROLS, CONTROL)) cannot(`unknown control ${CONTROL}`);
const runs = n => (CONTROL ? CONTROLS[CONTROL][0] === n : ONLY.length === 0 || ONLY.includes(n));

const fails = [];
let checks = 0;
let changed = false;
const ok = (cond, msg) => { checks += 1; if (!cond) fails.push(msg); };
const EN = String.fromCharCode(0x2013);
const EM = String.fromCharCode(0x2014);
const noDash = (name, s) => ok(!s.includes(EN) && !s.includes(EM), `${name} holds a dash of a banned kind`);

const LEDGER_FILE = 'scripts/data/cmWorldCompFormats.json';
const RECEIPT_FILE = 'scripts/data/cmWorldCompFormats.receipt.json';
const ledger = JSON.parse(text(LEDGER_FILE));

/* ── Section 0: the ledger ─────────────────────────────────────────────────────────────────────────── */
const isWiki = url => /wikipedia|wikimedia|fandom|wiki\.|grokipedia|wikiwand/i.test(new URL(url).host);
const domainOf = url => { const h = new URL(url).host; return h.split('.').slice(/\.co\.uk$/.test(h) ? -3 : -2).join('.'); };
const WORDS = { one: 1, two: 2, three: 3, four: 4, six: 6, eight: 8 };
const printed = (s, n) => new RegExp(`(^|[^0-9])${n}([^0-9]|$)`).test(s)
  || Object.entries(WORDS).some(([w, v]) => v === n && new RegExp(`\\b${w}\\b`, 'i').test(s));
/* A figure counts for a publisher only when ONE of its quoted lines prints the number about that figure (the
   lesson of Round 1228's review: a "two" in a line about pots is not a cap of two). */
const FIGURE_WORDS = {
  clubs: /club|team|participant/i, groups: /group/i, groupSize: /group/i, games: /game|match/i,
  advance: /top two|through|advanc|qualif/i, legs: /leg|match/i, abolishedFrom: /away goals/i,
};
const printsFigure = (source, key, n) => source.literal.some(l => (FIGURE_WORDS[key] ?? /./).test(l) && printed(l, n));

function section0() {
  const row = id => ledger.rows.find(r => r.id === id);
  /* The controls of this section change the data in memory, the way a wrong edit of the file would. */
  if (CONTROL === 'onesource') { const r = row('G3-2020'); changed = r.sources.length > 1; r.sources.length = 1; }
  if (CONTROL === 'wiki') { const s = row('G1').sources[1]; changed = !isWiki(s.url); s.url = 'https://en.wikipedia.org/wiki/UEFA_Champions_League'; }
  if (CONTROL === 'thinused') { const r = row('G2-2005'); changed = r.status !== 'verified' && r.usedBy.length === 0; r.usedBy = ['G8_SHAPE.clubs']; }
  if (CONTROL === 'figure') { for (const s of row('G1').sources.slice(1)) { const was = s.literal.join('|'); s.literal = s.literal.map(l => l.replace(/\beight\b/gi, 'some')); changed ||= was !== s.literal.join('|'); } }
  if (CONTROL === 'cover') { const r = row('G1'); changed = r.seasons.includes(2010); r.seasons = r.seasons.filter(y => y !== 2010); }

  /* 0.1 Every row is a reading somebody can open, and a verified row stands on two publishers. */
  const ids = new Set();
  const seasonsKnown = new Set([...ledger.eraSeasons, 2026]);
  for (const r of ledger.rows) {
    ok(!ids.has(r.id), `${r.id} is in the ledger twice`); ids.add(r.id);
    ok(['verified', 'onePublisher', 'toVerify'].includes(r.status), `${r.id}: status ${r.status} is not one of the three`);
    ok(Array.isArray(r.usedBy), `${r.id}: no usedBy list`);
    ok(Array.isArray(r.seasons) && r.seasons.length > 0 && r.seasons.every(y => seasonsKnown.has(y)), `${r.id}: its seasons ${JSON.stringify(r.seasons)} are not era seasons`);
    for (const s of r.sources) {
      ok(/^https:\/\//.test(s.url), `${r.id}: ${s.url} is not https`);
      ok(!isWiki(s.url), `${r.id}: ${s.url} is a wiki`);
      ok(typeof s.publisher === 'string' && s.publisher.length > 2, `${r.id}: a source names no publisher`);
      ok(typeof s.published === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s.published), `${r.id}, ${s.publisher}: no date`);
      ok(Array.isArray(s.literal) && s.literal.length > 0 && s.literal.every(l => l.length > 5), `${r.id}, ${s.publisher}: no literal`);
    }
    const domains = new Set(r.sources.map(s => domainOf(s.url)));
    if (r.status === 'verified') ok(domains.size >= 2, `${r.id} is verified and stands on fewer than two publishers`);
    else ok(r.usedBy.length === 0, `${r.id} is not verified and carries ${r.usedBy.join(', ')}`);
    for (const [key, n] of Object.entries(r.figures ?? {})) {
      const by = new Set(r.sources.filter(s => printsFigure(s, key, n)).map(s => domainOf(s.url)));
      ok(by.size >= 2, `${r.id}: ${key} ${n} is not printed by two publishers`);
      if (Object.hasOwn(ledger.g8, key)) ok(ledger.g8[key] === n, `${r.id}: ${key} is ${n} and g8.${key} is ${ledger.g8[key]}`);
    }
  }
  /* 0.2 Every era season has a verified group stage shape and a row for its group draw's two rules. */
  const covering = (prefix, y) => ledger.rows.filter(r => (r.id === prefix || r.id.startsWith(`${prefix}-`)) && r.seasons.includes(y));
  for (const y of ledger.eraSeasons) {
    ok(covering('G1', y).some(r => r.status === 'verified'), `season ${y} has no verified G1 row`);
    ok(covering('G3', y).length === 1, `season ${y} has ${covering('G3', y).length} rows for the association rule of its group draw, one expected`);
    ok(covering('G5', y).filter(r => !/-ko$/.test(r.id)).length === 1, `season ${y} has no single row for the Russia and Ukraine rule of its group draw`);
  }
  ok(ledger.g8.clubs === ledger.g8.groups * ledger.g8.groupSize && ledger.g8.groupSize === ledger.g8.pots, 'g8 is not 32 clubs in eight groups of four, one from each pot');
  ok(ledger.g8.games === 2 * (ledger.g8.groupSize - 1), 'g8 games are not a double round robin of the group');
  /* 0.3 The receipt vouches for this file, and no dash of the two banned kinds. */
  const receipt = JSON.parse(text(RECEIPT_FILE));
  const hash = createHash('sha256').update(text(LEDGER_FILE) + (CONTROL === 'receipt' ? ' ' : '')).digest('hex');
  if (CONTROL === 'receipt') changed = true;
  ok(receipt.sha256 === hash && receipt.dataFile === LEDGER_FILE, `the receipt does not carry the hash of ${LEDGER_FILE} (${hash})`);
  ok(receipt.checkedBy === 'scripts/simWorldUcl.mjs', 'the receipt names another checker');
  noDash(LEDGER_FILE, text(LEDGER_FILE)); noDash(RECEIPT_FILE, text(RECEIPT_FILE));
  const count = s => ledger.rows.filter(r => r.status === s).map(r => r.id).join(' ');
  console.log(`  0 ledger: verified ${count('verified')} | one publisher ${count('onePublisher')} | to verify ${count('toVerify')}`);
}

/* ── Section 0, second half: the engine states what the ledger states ──────────────────────────────── */
const editPlugin = {
  name: 'world-ucl-control',
  setup(b) {
    const edit = EDITS[CONTROL];
    if (!edit) return;
    const [file, from, to] = edit;
    b.onLoad({ filter: new RegExp(`${file.split('/').pop().replace('.', '[.]')}$`) }, async args => {
      const source = (await fs.promises.readFile(args.path, 'utf8')).replaceAll('\r\n', '\n');
      const count = source.split(from).length - 1;
      if (count !== 1) cannot(`control ${CONTROL}: its line is in ${file} ${count} times, it must be exactly once`);
      changed = true;
      return { contents: source.replace(from, to), loader: 'ts' };
    });
  },
};
/** Bundle the given entry files (repo paths) into one module and import it. */
async function bundle(name, entries) {
  const work = fs.mkdtempSync(path.join(os.tmpdir(), `world-ucl-${name}-`));
  const entry = path.join(work, 'entry.ts');
  const P = f => JSON.stringify(path.join(ROOT, f).split(path.sep).join('/'));
  fs.writeFileSync(entry, Object.entries(entries).map(([as, f]) => `export * as ${as} from ${P(f)};`).join('\n'));
  const out = path.join(work, 'bundle.mjs');
  await build({ entryPoints: [entry], bundle: true, platform: 'node', format: 'esm', outfile: out, logLevel: 'error', alias: { '@': path.join(ROOT, 'src') }, plugins: [editPlugin] });
  return import(pathToFileURL(out).href);
}
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

async function section0Engine() {
  const w = (await bundle('engine', { w: MODULE_FILE })).w;
  const row = id => ledger.rows.find(r => r.id === id);
  if (CONTROL === 'order') { const m = row('N1').months; changed = m.MD2 <= m.MD3; m.MD2 = 11; }
  /* 0.4 Every constant equals its row. */
  const g1 = row('G1');
  for (const [key, n] of Object.entries(g1.figures)) ok(w.G8_SHAPE[key] === n, `G8_SHAPE.${key} is ${w.G8_SHAPE[key]} in worldCompetition.ts and ${n} in the ledger`);
  ok(Object.keys(w.G8_SHAPE).every(k => Object.hasOwn(g1.figures, k)), 'G8_SHAPE holds a number no G1 figure prints');
  for (const y of ledger.eraSeasons) {
    const g3 = ledger.rows.find(r => r.id.startsWith('G3') && r.seasons.includes(y));
    ok(w.G8_ASSOC_APART[y] === (g3?.status === 'verified'), `G8_ASSOC_APART.${y} is ${w.G8_ASSOC_APART[y]} and its row ${g3?.id} is ${g3?.status}`);
    const g5 = ledger.rows.find(r => r.id.startsWith('G5') && !/-ko$/.test(r.id) && r.seasons.includes(y));
    const bans = w.G8_BANNED_PAIRS[y] ?? [];
    const said = bans.length ? bans.map(p => p.join(' and ')).join(', ') : 'nobody';
    if (g5?.id === 'G5-ruling') ok(bans.length === 0, `G8_BANNED_PAIRS.${y} keeps ${said} apart before the July 2014 ruling (G5-ruling)`);
    else ok(g5?.status === 'verified' ? bans.length === 1 && same(bans[0], ['Russia', 'Ukraine']) : bans.length === 0, `G8_BANNED_PAIRS.${y} keeps ${said} apart and ${g5?.id} is ${g5?.status}`);
  }
  /* 0.5 WORLD_COMP_PARTIAL names exactly the rows that are not verified, and every usedBy is a real constant. */
  const notVerified = ledger.rows.filter(r => r.status !== 'verified').map(r => r.id);
  const partial = [...w.WORLD_COMP_PARTIAL];
  for (const id of notVerified) ok(partial.includes(id), `WORLD_COMP_PARTIAL does not name ${id}, which is ${row(id).status}`);
  for (const id of partial) ok(notVerified.includes(id), `WORLD_COMP_PARTIAL names ${id}, which is verified or not in the ledger`);
  for (const r of ledger.rows) for (const u of r.usedBy) {
    const [name, key] = u.split('.');
    ok(Object.hasOwn(w, name) && (key === undefined || Object.hasOwn(w[name], key)), `${r.id}: usedBy ${u} is not in worldCompetition.ts`);
  }
  /* 0.6 The nights: 13 and 17, the league phase's in the real months' order, its marks eleven rising fractions. */
  /* The module takes every round's legs from its binding; these are the participant's (uclLegsFor). */
  const legs = r => (r === 'F' ? 1 : 2);
  const order = w.nightsOf('l36', legs).map(n => n.id);
  ok(w.nightsOf('g8', legs).length === 13 && order.length === 17, `the nights are ${w.nightsOf('g8', legs).length} (g8) and ${order.length} (l36), 13 and 17 expected`);
  ok(same(order, [...w.LEAGUE_PHASE_NIGHT_ORDER]), 'LEAGUE_PHASE_NIGHT_ORDER is not the order nightsOf gives');
  const months = row('N1').months;
  ok(same(Object.keys(months), order), 'N1 does not give a month for each night in order');
  for (let i = 1; i < order.length; i += 1) if (months[order[i]] < months[order[i - 1]]) { ok(false, `the league phase nights are not in the real months' order at ${order[i]}`); break; }
  const marks = w.LEAGUE_PHASE_NIGHT_MARKS;
  ok(marks.length === order.length - 6 && marks.every((m, i) => m > 0 && m <= 1 && (i === 0 || m > marks[i - 1])), 'LEAGUE_PHASE_NIGHT_MARKS are not eleven rising fractions of the season');
  console.log(`  0 engine: G8_SHAPE ${JSON.stringify(w.G8_SHAPE)}; association rule ${ledger.eraSeasons.map(y => `${y} ${w.G8_ASSOC_APART[y]}`).join(', ')}; bans ${ledger.eraSeasons.map(y => `${y} ${(w.G8_BANNED_PAIRS[y] ?? []).length}`).join(', ')}; partial ${partial.join(' ')}`);
}

/* ── Sections 1 to 7 (Round 1502): the watched Champions League in Club Manager ─────────────────────── */
const SEEDS = (process.env.WORLD_UCL_SEEDS || '1,2,3,4,5').split(',').map(Number);
const counts = {};
const bump = (k, n = 1) => { counts[k] = (counts[k] ?? 0) + n; };
const careerEdits = () => CAREER_EDITS[CONTROL] ?? [];
const byPlain = (a, b) => (a < b ? -1 : a > b ? 1 : 0);
const OPEN_LINE = '  /* Round 1502: a club not in the Champions League watches it, opened after the seed it is keyed on. */\n  openWorldUclOnStart(state, world);\n';
const ROLL_LINE = '    openWorldUcl(state, worldUclField(state, tables, watchHolder), watchHolder);\n';
const CARRY_LINE = '  carryWorldUcl(career, joined);\n';
/* The binding switched off (section 2's other arm): the four calls that open, carry or repair a slice (the
   load repair since the review of 2026-10-17: with it in both arms a repair that drew or wrote elsewhere moved
   both alike). */
const REPAIR_LINE = '    repairWorldUcl(parsed);\n';
const BINDING_OFF = [
  { file: CM, from: OPEN_LINE, to: '' },
  { file: CM, from: ROLL_LINE, to: '    delete state.worldComps;\n' },
  { file: CAL, from: CARRY_LINE, to: '' },
  { file: CM, from: REPAIR_LINE, to: '' },
];
const yearOf = (M, st) => (M.eras.isHistoricEra(st.eraId) ? M.eras.eraById(st.eraId).startYear : 2026);
const formatFor = (M, st) => (yearOf(M, st) <= 2023 ? 'g8' : 'l36');

/** A mid season move to `club` of `leagueId`, accepted by hand (the join is what is checked, not the hunt). */
function joinTo(M, st, club, leagueId) {
  const open = { club, league: leagueId, tier: 3, season: st.season, week: st.week, matchesLeft: 0, roll: 0, status: 'accepted' };
  return M.cal.joinClubNow({ ...st, jobHunt: { open, cooldowns: [], sentSeason: st.season, sent: 1, summerMove: null } });
}
/** Where a watcher journey moves mid season: the bottom club of another league of its world (a different size
 *  where there is one, so the new calendar can sit behind the old), or null. */
function joinTarget(M, st) {
  const leagues = (M.eras.isHistoricEra(st.eraId) ? M.cm.ERA_LEAGUES[st.eraId] : M.cm.REAL_LEAGUES).filter(l => l.euro !== false);
  const mine = leagues.find(l => l.clubs.includes(st.clubName));
  const other = leagues.find(l => l !== mine && mine && l.clubs.length !== mine.clubs.length) ?? leagues.find(l => l !== mine);
  return other ? { club: other.clubs[other.clubs.length - 1], leagueId: other.id } : null;
}
/** The review of 2026-10-17 (the carry rule's entrant half): a move to a club of its world's leagues that is an
 *  entrant of the competition the journey watches and not in the participant's field, so the new club still
 *  watches it (today's world: the watched 36's clubs beyond the participant's 32). The first by name, or null. */
function entrantTarget(M, st) {
  const slice = st.worldComps?.ucl;
  if (!slice) return null;
  const inIt = new Set(st.uclField ?? []);
  const leagues = (M.eras.isHistoricEra(st.eraId) ? M.cm.ERA_LEAGUES[st.eraId] : M.cm.REAL_LEAGUES) ?? [];
  for (const club of [...slice.clubs].sort(byPlain)) {
    if (club === st.clubName || inIt.has(club)) continue;
    const lg = leagues.find(l => l.clubs.includes(club));
    if (lg) return { club, leagueId: lg.id };
  }
  return null;
}

/**
 * One journey of one save on one engine, through `seasons` seasons: startCareer, every playNextEntry to the end of
 * the season, finishSeason, startNextSeason (with `move` taking a summer move at the first rollover), and with
 * `join` a mid season move at entry 25 of season one. Every step on its own stretch of the stream; `onStep`
 * sees every state (and the label of the step), `onSeasonEnd` every finished season before its rollover.
 */
async function careerJourney(E, f, { seasons, mode = 'nocoach', join = false, move = null, evalEach = false, record = null, onStep, onSeasonEnd }) {
  const M = await E.fresh();
  const opts = mode === 'coach' ? { skipHalftime: true } : { skipHalftime: true, noCoach: true };
  const steps = [];
  let s = null; let k = 0;
  const step = (label, fn) => {
    k += 1;
    const r = tape((f.seed * 0x9e3779b1 + k * 7919) >>> 0, () => {
      const out = fn(s);
      if (evalEach && out?.state) { M.cm.evalWorldUcl(out.state); M.cm.worldUclNightsDone(out.state); }
      return out;
    });
    const got = r.value ?? {};
    if (got.state) s = got.state;
    steps.push({ label, json: record ? record(s) : null, inIt: !!s?.uclGroup, carries: !!s && 'worldComps' in s, draws: r.draws.length, drawSha: createHash('sha256').update(JSON.stringify(r.draws)).digest('hex').slice(0, 16), saved: got.saved ?? null });
    onStep?.(M, s, label, got);
  };
  step('start', () => ({ state: f.custom ? M.cm.startCareer(f.club, f.era, f.custom) : M.cm.startCareer(f.club, f.era) }));
  const reload = cur => {
    M.store.clear();
    if (!M.cm.saveCareer(cur)) return { saved: 'refused' };
    return { state: M.cm.loadCareer(), saved: createHash('sha256').update(JSON.stringify([...M.store.entries()].sort())).digest('hex').slice(0, 16), reload: cur };
  };
  /* `join` is true (season one, the bottom club of another league), a season number, or { season, to: 'entrant' }. */
  const joinSeason = join === true ? 1 : typeof join === 'number' ? join : join ? join.season : 0;
  for (let season = 1; season <= seasons; season += 1) {
    let over = false;
    for (let i = 0; i < 260 && !over; i += 1) {
      step(`s${season}-e${i + 1}`, cur => { const r = M.cm.playNextEntry(cur, opts); over = r.kind === 'seasonOver'; return { state: r.state }; });
      if (i === 20) step(`s${season}-reload`, reload);
      if (season === joinSeason && i === 25) {
        const to = join.to === 'entrant' ? entrantTarget(M, s) : joinTarget(M, s);
        if (to) {
          step(`s${season}-join`, cur => { const joined = joinTo(M, cur, to.club, to.leagueId); return joined ? { state: joined, joined: cur } : {}; });
          /* The review of 2026-10-17: a reload right after the move, so the move's answer and the load repair's
             must be the same competition (they were not when the move was to an entrant). */
          step(`s${season}-join-reload`, cur => ({ ...reload(cur), afterJoin: true }));
        }
      }
    }
    if (!over) throw new Error(`season ${season} did not end in 260 entries`);
    step(`s${season}-finish`, cur => ({ state: M.cm.finishSeason(cur).state }));
    onSeasonEnd?.(M, s, season);
    if (season < seasons) step(`s${season}-rollover`, cur => ({ state: season === 1 && move ? M.cm.startNextSeason(cur, move(M, cur)) : M.cm.startNextSeason(cur), prev: cur }));
  }
  return steps;
}

/** Section 1: one finished watched season, complete and legal. `tag` names the journey and season. */
function checkSeason(M, st, tag, measured) {
  const fmt = formatFor(M, st);
  const slice = st.worldComps?.ucl;
  if (!slice) { ok(false, `1 no competition: ${tag}`); bump('1 seasons with no competition'); return; }
  bump(`1 watched seasons ${slice.f}`);
  ok(slice.f === fmt, `1 format: ${tag} plays ${slice.f}, its era's year ${yearOf(M, st)} says ${fmt}`);
  const size = slice.f === 'g8' ? 32 : 36;
  ok(slice.s === st.season, `1 entrants: ${tag}: the slice is season ${slice.s}`);
  ok(slice.clubs.length === size && new Set(slice.clubs).size === size, `1 entrants: ${tag}: ${slice.clubs.length} entrants (${new Set(slice.clubs).size} different), ${size} expected`);
  ok(!slice.clubs.includes(st.clubName), `1 entrants: ${tag}: my club ${st.clubName} is an entrant`);
  const r = M.cm.evalWorldUcl(st, Infinity);
  if (!r) { ok(false, `1 no competition: ${tag} (the slice does not evaluate)`); return; }
  const firstStage = slice.f === 'g8' ? 6 : 8;
  const games = new Map(slice.clubs.map(c => [c, 0]));
  const seenPair = new Map();
  for (const n of r.nights.filter(x => x.stage === 'md')) for (const fx of n.fixtures) {
    ok(fx.hg !== undefined && fx.ag !== undefined, `1 fixtures: ${tag} ${n.id} ${fx.home} v ${fx.away} has no score at the season's end`);
    games.set(fx.home, (games.get(fx.home) ?? 0) + 1); games.set(fx.away, (games.get(fx.away) ?? 0) + 1);
    seenPair.set(`${fx.home}|${fx.away}`, (seenPair.get(`${fx.home}|${fx.away}`) ?? 0) + 1);
    if (fx.hg !== undefined) measured.goals.push(fx.hg + fx.ag);
  }
  for (const [c, n] of games) ok(n === firstStage, `1 fixtures: ${tag}: ${c} played ${n} first stage matches, ${firstStage} expected`);
  /* The watched match is the participant's own AI match over the snapshot (the review of 2026-10-17: the two
     strengths or the two edges swapped in worldUclBind turned the titles over and every section stayed green):
     every first stage score replayed on simAiMatch itself, the fixture's keyed stream standing in for its
     Math.random. */
  for (const n of r.nights.filter(x => x.stage === 'md')) for (const fx of n.fixtures) {
    if (fx.hg === undefined) continue;
    const want = replayMatch(M, measured.kr, slice, n.id, fx.home, fx.away);
    ok(want[0] === fx.hg && want[1] === fx.ag, `1 match: ${tag} ${n.id} ${fx.home} v ${fx.away} is ${fx.hg}-${fx.ag}, simAiMatch over the snapshot says ${want[0]}-${want[1]}`);
    bump('1 watched matches replayed on simAiMatch');
  }
  const rows = slice.f === 'g8' ? (r.groups ?? []).flatMap(g => g.rows) : (r.table ?? []);
  ok(rows.length === size, `1 table: ${tag}: ${rows.length} rows`);
  let gf = 0, ga = 0;
  for (const row of rows) {
    gf += row.gf; ga += row.ga;
    ok(row.pts === 3 * row.w + row.d && row.w + row.d + row.l === firstStage, `1 table: ${tag}: ${row.club} ${row.w}-${row.d}-${row.l} ${row.pts} pts`);
  }
  ok(gf === ga, `1 table: ${tag}: goals for ${gf} and against ${ga}`);
  if (slice.f === 'g8') {
    /* The critic's correction 19: the stand in for my club in its era's 32, counted. */
    const standIn = M.cm.worldUclEraField(st)?.standIn;
    if (standIn) { bump('1 era seasons with a stand in for my club'); ok(slice.clubs.includes(standIn), `1 entrants: ${tag}: the stand in ${standIn} is not in the field`); }
    checkGroups(M, st, slice, r, tag, seenPair, measured);
  }
  else checkLeaguePhase(M, st, slice, r, tag, measured);
  checkTies(M, st, slice, r, tag, measured);
  ok(r.done && !!r.winner, `1 winner: ${tag}: done ${r.done}, winner ${r.winner}`);
  const fin = r.ties.filter(t => t.round === 'F');
  ok(fin.length === 1 && fin[0].winner === r.winner && r.runnerUp === (fin[0].winner === fin[0].home ? fin[0].away : fin[0].home), `1 winner: ${tag}: ${fin.length} finals, winner ${r.winner}, runner up ${r.runnerUp}`);
  ok(M.cm.worldUclWinner(st) === r.winner, `1 winner: ${tag}: worldUclWinner says ${M.cm.worldUclWinner(st)}, the evaluation ${r.winner}`);
  if (r.winner) {
    const rank = [...slice.str].sort((a, b) => b - a).indexOf(slice.str[slice.clubs.indexOf(r.winner)]);
    bump(`7 titles by strength quartile ${Math.min(3, Math.floor(rank / (size / 4))) + 1}`);
  }
}

/** One watched first stage match played again on the participant's simAiMatch: a state whose strengths are the
 *  snapshot's, and the fixture's keyed stream (worldCompetition.ts: seed, night, home, away) as Math.random. */
function replayMatch(M, kr, slice, night, home, away) {
  const strOf = c => slice.str[slice.clubs.indexOf(c)];
  const original = Math.random;
  Math.random = kr(`${slice.seed}|${night}|${home}|${away}`);
  try { return M.cm.simAiMatch({ clubStrengths: { [home]: strOf(home), [away]: strOf(away) } }, home, away); }
  finally { Math.random = original; }
}

/** An era's stand in for my club, worked out here rather than by worldUclEraField: when my club (by either name,
 *  or the club a created club replaced) is one of the era's verified 32, the era league club outside the 32 with
 *  the best XI (eraXIAvg), the name as plain text on a tie (the critic's answer 13); else none. */
function standInOf(M, s) {
  const era = s.eraId;
  const pool = new Set((M.cm.ERA_UCL_FIELDS[era] ?? []).map(e => e.name));
  const mine = new Set([s.clubName, s.customClub?.replacedClub].filter(Boolean).flatMap(c => [c, M.cm.eraEuroName(era, c)]));
  if (![...mine].some(c => pool.has(c))) return null;
  let best = null;
  for (const c of (M.cm.ERA_LEAGUES[era] ?? []).flatMap(l => l.clubs)) {
    if (pool.has(c) || pool.has(M.cm.eraEuroName(era, c)) || mine.has(c)) continue;
    const xi = M.cm.eraXIAvg(era, c) ?? 0;
    if (!best || xi > best.xi || (xi === best.xi && c < best.c)) best = { c, xi };
  }
  return best?.c ?? null;
}

/** Section 1, where a watched season is opened (the start and every rollover; the review of 2026-10-17 left the
 *  holder out of pot one, and reversed the stand in, and both stayed green): the save's holder heads the draw
 *  when it is in the field and nobody does otherwise, and an era's field holds, from outside its 32, exactly the
 *  stand in standInOf names (printed per era). */
function openChecks(M, s, name, label, got, measured) {
  const slice = s?.worldComps?.ucl;
  if (!slice || !(label === 'start' || got?.prev)) return;
  const holderOf = c => (M.cm.uclHolderOf ? M.cm.uclHolderOf(c) : c.uclBracket?.find(t => t.round === 'F')?.winner ?? null);
  const holder = got?.prev ? holderOf(got.prev) : slice.f === 'l36' ? M.cm.CM_FINAL_TABLES_2025_26.holders : null;
  const want = holder && slice.clubs.includes(holder) ? holder : undefined;
  ok(slice.holder === want, `1 holder: ${name} at ${label}: the draw's holder is ${slice.holder ?? 'nobody'}, the save's holder ${holder ?? 'nobody'} ${want ? 'is' : 'is not'} in the field`);
  if (want) bump('1 opened seasons drawn with the holder first');
  if (slice.f !== 'g8') return;
  const stand = standInOf(M, s);
  const pool = new Set((M.cm.ERA_UCL_FIELDS[s.eraId] ?? []).map(e => e.name));
  const outside = slice.clubs.filter(c => !pool.has(c) && !pool.has(M.cm.eraEuroName(s.eraId, c)));
  ok(same(outside, stand ? [stand] : []), `1 stand in: ${name} at ${label}: the field holds ${outside.join(', ') || 'nobody'} from outside the era's 32, the strongest era club outside them is ${stand ?? 'not needed'}`);
  if (stand) measured.standIns.set(s.eraId, [...new Set([...(measured.standIns.get(s.eraId) ?? []), `${stand} for ${s.clubName}`])]);
}

/** Section 1, the eras' groups: one club of each pot a group, the season's draw rules, every pair twice, and a
 *  round of 16 of winners against runners-up from different groups. */
function checkGroups(M, st, slice, r, tag, seenPair) {
  const order = [...slice.clubs].sort((a, b) => Number(b === slice.holder) - Number(a === slice.holder)
    || slice.str[slice.clubs.indexOf(b)] - slice.str[slice.clubs.indexOf(a)] || byPlain(a, b));
  const potOf = c => Math.floor(order.indexOf(c) / 8);
  const rules = M.w.g8DrawRules(yearOf(M, st));
  const assoc = c => M.cm.uclClubCountry(st, c);
  const banned = (x, y) => x !== null && y !== null && rules.bans.some(([p, q]) => (p === x && q === y) || (p === y && q === x));
  let clashes = 0;
  ok((r.groups ?? []).length === 8, `1 group: ${tag}: ${(r.groups ?? []).length} groups`);
  for (let g = 0; g < 8; g += 1) {
    const four = slice.clubs.slice(g * 4, g * 4 + 4);
    ok(same([...four.map(potOf)].sort(), [0, 1, 2, 3]), `1 group: ${tag}: group ${g + 1} holds pots ${four.map(potOf).join(',')}`);
    for (let i = 0; i < 4; i += 1) for (let j = i + 1; j < 4; j += 1) {
      const [x, y] = [assoc(four[i]), assoc(four[j])];
      if ((rules.assocApart && x !== null && x === y) || banned(x, y)) clashes += 1;
      ok(seenPair.get(`${four[i]}|${four[j]}`) === 1 && seenPair.get(`${four[j]}|${four[i]}`) === 1, `1 group: ${tag}: ${four[i]} and ${four[j]} did not meet once at each ground`);
    }
  }
  ok(clashes === (slice.clashes ?? 0), `1 group: ${tag}: ${clashes} pairs drawn against the rules, the slice says ${slice.clashes ?? 0}`);
  if (clashes) bump('7 g8 draws with a clash');
  bump('7 g8 draws');
  const groupOf = new Map((r.groups ?? []).flatMap(gr => gr.rows.map(row => [row.club, gr.letter])));
  const winners = new Set((r.groups ?? []).map(gr => gr.rows[0].club));
  const runners = new Set((r.groups ?? []).map(gr => gr.rows[1].club));
  const r16 = r.ties.filter(t => t.round === 'R16');
  ok(r16.length === 8, `1 knockout: ${tag}: ${r16.length} round of 16 ties`);
  for (const t of r16) {
    ok((winners.has(t.home) && runners.has(t.away)) || (winners.has(t.away) && runners.has(t.home)), `1 knockout: ${tag}: ${t.home} v ${t.away} is not a winner against a runner-up`);
    ok(groupOf.get(t.home) !== groupOf.get(t.away), `1 knockout: ${tag}: ${t.home} v ${t.away} are of one group`);
    if (assoc(t.home) !== null && assoc(t.home) === assoc(t.away)) bump('7 g8 round of 16 ties of one association');
  }
}

/** Section 1, the league phase: the stored slate is drawUclLeaguePhase's own, the play-offs pair by
 *  PLAYOFF_PAIRS, the round of 16 meets the top eight, and every later round is nextRoundTie's. */
function checkLeaguePhase(M, st, slice, r, tag) {
  const strOf = c => slice.str[slice.clubs.indexOf(c)];
  const redrawn = M.lp.drawUclLeaguePhase({ field: slice.clubs, holder: slice.holder ?? null, seed: slice.seed, strengthOf: strOf, assocOf: c => M.cm.uclClubCountry(st, c) });
  ok(!!redrawn && same(redrawn.clubs, slice.clubs) && same(redrawn.fx, slice.fx) && redrawn.breaks === slice.breaks && redrawn.overCap === slice.overCap && !!redrawn.fallback === !!slice.fallback,
    `1 slate: ${tag}: the stored slate is not drawUclLeaguePhase's for its own field, holder and seed`);
  bump('7 l36 slates');
  if (slice.breaks) bump('7 l36 slates with an association break');
  if (slice.overCap) bump('7 l36 slates over the cap');
  if (slice.fallback) bump('7 l36 slates on the fallback');
  const pos = new Map((r.table ?? []).map((row, i) => [row.club, i + 1]));
  const po = r.ties.filter(t => t.round === 'PO');
  ok(po.length === 8, `1 knockout: ${tag}: ${po.length} play-off ties`);
  for (const t of po) {
    const [p, q] = [pos.get(t.home), pos.get(t.away)];
    ok(M.lp.PLAYOFF_PAIRS.some(([a, b]) => (a.includes(p) && b.includes(q)) || (a.includes(q) && b.includes(p))), `1 knockout: ${tag}: play-off ${t.home} (${p}) v ${t.away} (${q}) is not a PLAYOFF_PAIRS tie`);
  }
  const r16 = r.ties.filter(t => t.round === 'R16');
  ok(r16.length === 8 && same(r16.map(t => pos.get(t.away)).sort((a, b) => a - b), [1, 2, 3, 4, 5, 6, 7, 8]), `1 knockout: ${tag}: the round of 16 does not meet the top eight once each`);
  const poWinners = new Set(po.map(t => t.winner));
  for (const t of r16) ok(poWinners.has(t.home), `1 knockout: ${tag}: ${t.home} is in the round of 16 without winning a play-off`);
  for (const [round, prev] of [['QF', 'R16'], ['SF', 'QF'], ['F', 'SF']]) {
    const winners = r.ties.filter(t => t.round === prev).sort((a, b) => a.slot - b.slot).map(t => t.winner);
    const ties = r.ties.filter(t => t.round === round).sort((a, b) => a.slot - b.slot);
    ties.forEach((t, i) => { const want = M.lp.nextRoundTie(winners, i); ok(t.home === want.home && t.away === want.away, `1 knockout: ${tag}: ${round} ${i} is ${t.home} v ${t.away}, nextRoundTie says ${want.home} v ${want.away}`); });
  }
}

/** Section 1, every tie: its legs, the aggregate of its legs, a shootout only when level, away goals only
 *  where the era had them. */
function checkTies(M, st, slice, r, tag, measured) {
  const awayEra = yearOf(M, st) <= 2020;
  for (const t of r.ties) {
    const legs = M.cm.uclLegsFor(st.eraId, t.round === 'PO' ? 'R16' : t.round);
    /* A two legged tie shows both legs and their sum; a one match tie shows its score as the aggregate alone. */
    ok(legs === 2 ? !!t.leg1 && !!t.leg2 : !t.leg1 && !t.leg2, `1 tie: ${tag}: ${t.round} ${t.home} v ${t.away} shows legs ${!!t.leg1} ${!!t.leg2}, ${legs} expected`);
    if (!t.agg || (legs === 2 && !(t.leg1 && t.leg2))) { ok(false, `1 tie: ${tag}: ${t.round} ${t.home} v ${t.away} has no aggregate`); continue; }
    const agg = legs === 2 ? [t.leg1[0] + t.leg2[0], t.leg1[1] + t.leg2[1]] : t.agg;
    ok(same(t.agg, agg), `1 tie: ${tag}: ${t.round} ${t.home} v ${t.away} aggregate ${t.agg} is not its legs ${agg}`);
    if (t.pens) ok(t.aet === true && agg[0] === agg[1], `1 winner: ${tag}: ${t.round} ${t.home} v ${t.away} went to penalties at ${agg}, aet ${t.aet}`);
    ok(!!t.winner && (t.winner === t.home || t.winner === t.away), `1 winner: ${tag}: ${t.round} ${t.home} v ${t.away} has no winner`);
    if (!t.pens && !t.byAwayGoals) ok(agg[0] !== agg[1] && t.winner === (agg[0] > agg[1] ? t.home : t.away), `1 tie: ${tag}: ${t.round} ${t.home} v ${t.away} won by ${t.winner} at ${agg}`);
    if (t.byAwayGoals) ok(awayEra && agg[0] === agg[1], `1 away goals: ${tag}: ${t.round} ${t.home} v ${t.away} decided on away goals (era year ${yearOf(M, st)}, ${agg})`);
    measured.ties += 1; if (t.aet) measured.aet += 1; if (t.pens) measured.pens += 1;
  }
}

/** Section 3, the dates (the critic's correction 9): every night after the one before, the two legs of a tie at
 *  least seven days apart. */
const dayOf = d => Date.UTC(d.y, d.m - 1, d.d) / 86400000;
function checkDates(M, s, name, at) {
  const ds = M.cal.worldUclNightDates(s);
  const places = M.cm.worldUclNights(s);
  if (!ds || !places) return;
  bump(`3 date checks ${s.worldComps.ucl.f}`);
  for (let i = 1; i < ds.length; i += 1) {
    ok(dayOf(ds[i]) > dayOf(ds[i - 1]), `3 dates: ${name} ${at}: ${places[i].night.id} on ${ds[i].y}-${ds[i].m}-${ds[i].d} is not after ${places[i - 1].night.id}`);
    if (places[i].night.leg === 2) ok(dayOf(ds[i]) - dayOf(ds[i - 1]) >= 7, `3 dates: ${name} ${at}: the two legs of ${places[i].night.stage} are ${dayOf(ds[i]) - dayOf(ds[i - 1])} days apart`);
  }
}

/** Sections 3 and 4 on every state of one journey: in step, stable, one slice of the season in play. */
function stepTracker(name) {
  let season = 0, prevDone = 0, shown = new Map();
  const dates = (M, s, at) => checkDates(M, s, name, at);
  return (M, s, label, got) => {
    if (!s) return;
    const json = JSON.stringify(s);
    const slices = (json.match(/"v":1,"s":\d+,"f":"(g8|l36)"/g) ?? []).length;
    ok(slices <= 1, `4 slices: ${name} at ${label}: the save holds ${slices} slices`);
    const slice = s.worldComps?.ucl;
    if (slice) ok(slice.s === s.season, `4 stale: ${name} at ${label}: season ${s.season} carries the slice of season ${slice.s}`);
    if (s.uclGroup && slice) ok(false, `4 slices: ${name} at ${label}: a club in the Champions League carries a watched one`);
    /* My club is never an entrant of the competition it watches, at any step (the brief's design, decision 4). */
    if (slice) ok(!myNames(M, s).some(c => slice.clubs.includes(c)), `4 own: ${name} at ${label}: ${s.clubName} watches a competition that lists it among its entrants`);
    if (s.season !== season) {
      season = s.season; prevDone = 0; shown = new Map();
      if (slice) { counts[`4 slice bytes ${slice.f}`] = [...(counts[`4 slice bytes ${slice.f}`] ?? []), JSON.stringify(s.worldComps).length]; dates(M, s, label); }
    }
    if (got?.joined) {
      const before = got.joined.worldComps?.ucl;
      const carried = !!slice && !!before && before.seed === slice.seed && same(before.clubs, slice.clubs);
      /* The carry rule's entrant half (the critic's correction 10): a move to an entrant of the watched
         competition that leaves the new club watching never carries that competition. */
      if (before && !s.uclGroup && myNames(M, s).some(c => before.clubs.includes(c))) {
        bump(`3 joins to an entrant that still watches${slice ? ', a fresh slice opened' : ', no slice'}`);
        ok(!carried, `3 entrant: ${name} at ${label}: the move to ${s.clubName}, an entrant, carried the competition it is in`);
      }
      if (!slice) bump(before ? '3 joins that dropped the slice' : '3 joins with nothing to carry or open');
      else if (carried) {
        bump('3 joins that carried the slice');
        bump(`3 joins that carried the slice ${slice.f}`);
        const places = M.cm.worldUclNights(s);
        const raw = places.filter(p => s.week > p.at).length;
        if (raw < (slice.seen ?? 0)) bump('3 joins whose new calendar sat behind the old');
      } else { bump('3 joins that opened a fresh slice'); shown = new Map(); prevDone = 0; }
      if (slice) dates(M, s, label);
    }
    if (got?.reload) {
      ok(JSON.stringify(M.cm.evalWorldUcl(got.reload)) === JSON.stringify(M.cm.evalWorldUcl(s)), `3 reload: ${name} at ${label}: the reloaded save evaluates otherwise`);
      ok(JSON.stringify(got.reload.worldComps ?? null) === JSON.stringify(s.worldComps ?? null),
        `3 reload: ${name} at ${label}: the reloaded save watches another competition${got.afterJoin ? ' (right after the join)' : ''} (${got.reload.worldComps ? 'one' : 'none'} before, ${s.worldComps ? 'one' : 'none'} after)`);
      if (got.afterJoin) bump('3 reloads right after a join');
    }
    if (!slice || slice.s !== s.season) return;
    const done = M.cm.worldUclNightsDone(s);
    const places = M.cm.worldUclNights(s);
    const r = M.cm.evalWorldUcl(s);
    ok(done >= prevDone, `3 falls: ${name} at ${label}: nights done fell from ${prevDone} to ${done}`);
    prevDone = Math.max(prevDone, done);
    const over = s.week >= s.calendar.length;
    for (let i = 0; i < r.nights.length; i += 1) {
      const scored = r.nights[i].fixtures.some(fx => fx.hg !== undefined);
      if (i < done) ok(over || s.week > places[i].at || i < (slice.seen ?? 0), `3 early: ${name} at ${label}: ${places[i].night.id} counts as played at week ${s.week}, its week is ${places[i].at}`);
      else ok(!scored, `3 early: ${name} at ${label}: ${places[i].night.id} shows scores before it is played`);
      if (i < done) {
        const now = JSON.stringify(r.nights[i].fixtures);
        const key = places[i].night.id;
        if (shown.has(key)) ok(shown.get(key) === now, `${got?.joined ? '3 join moved' : '3 moved'}: ${name} at ${label}: ${key} changed after it was shown`);
        else shown.set(key, now);
      }
    }
    checkCalendar(M, s, name, label, done);
    /* One state evaluated at two night counts (the review of 2026-10-17: the memo's key must hold the count,
       which the screen of Round 1503 will lean on). */
    const back = done > 0 ? M.cm.evalWorldUcl(s, done - 1)?.nightsDone : null;
    if (done > 0) ok(back === done - 1, `3 memo: ${name} at ${label}: the evaluation at ${done - 1} nights answers ${back}`);
    bump('3 states checked');
  };
}

/** Both names my club goes by in its world (an era's field can know it by another). */
const myNames = (M, s) => [s.clubName, s.eraId ? M.cm.eraEuroName(s.eraId, s.clubName) : s.clubName];

/**
 * Section 3, when a night counts as played, from the CALENDAR alone, never from worldUclNights (the critic's
 * correction 8; the review of 2026-10-17 put correction 8's defect into worldUclNights' own places and the check
 * above, which reads them, stayed green). A first stage matchday on one of the calendar's six European midweeks IS
 * that uclGroup entry, and an era's knockout leg with a uclKo entry IS that entry: played once the week is past
 * its index, and dated with it. Any other night is played once the week is past the last calendar entry dated on
 * or before the night's own date. A night counted before that is early (red); an entry night not counted once
 * its entry is played is late (red); a dated night shown after its day is counted and printed.
 */
function checkCalendar(M, s, name, label, done) {
  const slice = s.worldComps.ucl;
  const places = M.cm.worldUclNights(s);
  const dates = M.cal.worldUclNightDates(s);
  const entry = M.cal.entryDatesOf(s);
  if (!places || !dates || !entry) { ok(false, `3 calendar: ${name} at ${label}: a watched season with no nights or no dates`); return; }
  const over = s.week >= s.calendar.length;
  const seen = slice.seen ?? 0;
  const ymd = d => `${d.y}-${d.m}-${d.d}`;
  places.forEach((p, i) => {
    const n = p.night;
    let idx = -1;
    let how = 'date';
    if (n.stage === 'md' && (n.md ?? 0) < 6) idx = s.calendar.findIndex(e => e.type === 'uclGroup' && e.round === n.md);
    else if (slice.f === 'g8') idx = s.calendar.findIndex(e => e.type === 'uclKo' && e.uclRound === n.stage && (e.uclLeg ?? 1) === (n.leg ?? 1));
    if (idx >= 0) {
      how = n.stage === 'md' ? 'uclGroup' : 'uclKo';
      ok(dayOf(dates[i]) === dayOf(entry[idx]), `3 calendar: ${name} at ${label}: ${n.id} is the ${how} entry ${idx} (${ymd(entry[idx])}) and is dated ${ymd(dates[i])}`);
    } else for (let j = 0; j < entry.length; j += 1) if (dayOf(entry[j]) <= dayOf(dates[i])) idx = j;
    const played = over || s.week > idx || i < seen;
    if (i < done && !played) ok(false, `3 calendar: ${name} at ${label}: ${n.id} (${how}, entry ${idx}) counts as played early, at week ${s.week}`);
    else if (i >= done && played && how !== 'date') ok(false, `3 calendar: ${name} at ${label}: ${n.id} (${how}, entry ${idx}) is not counted although its entry is played`);
    else {
      ok(true, '');
      if (i >= done && played) bump(`3 late dated ${slice.f} nights (shown after their day)`);
    }
    bump(`3 calendar checks ${slice.f} ${how}`);
  });
}

/** Sections 1, 3, 4 and 7: the watcher fleet through three seasons, a mid season move on two seeds, and a summer
 *  move to a club with a direct place wherever the season allows one (the critic's correction 2). */
async function watcherPass() {
  const E = await engineOf(ROOT, 'head', { edits: careerEdits() }, cannot);
  if (careerEdits().length) changed = true;
  const fleet = pickFleet(await E.fresh(), 'watchers', cannot);
  console.log(`  1 watchers: ${fleet.map(f => `${f.club} (${f.era})`).join(', ')}; seeds ${SEEDS.join(',')}`);
  const measured = { goals: [], domestic: [0, 0], ties: 0, aet: 0, pens: 0, g8: [], kr: (await bundle('kr', { kr: 'src/lib/keyedRng.ts' })).kr.keyedRng, standIns: new Map() };
  const t0 = Date.now();
  for (const f of fleet) for (const seed of SEEDS) {
    const name = `${f.club} (${f.era}) seed ${seed}`;
    let movedTo = null;
    /* Seasons a mid season move left without a watched competition by the rule, and only by it (the review of
       2026-10-17: an excuse for any move hid a carry that went missing): today's world from season two on, where
       no fixed data can open a field, after a move from a club that was in the competition (the critic's advice
       26) or to an entrant of the one it watched. Any other move left without one is red. */
    const movedWithout = new Set();
    const move = f.club === 'Everton' ? (M, cur) => {
      const places = M.cm.uclPlacesIn(M.cm.careerLeagueOf(cur));
      const table = M.cm.sortedLeagueTable(cur).map(row => row.club);
      if (table.indexOf(cur.clubName) < places) return undefined;
      movedTo = table.find(c => c !== cur.clubName) ?? null;
      return movedTo ?? undefined;
    } : null;
    const track = stepTracker(name);
    await careerJourney(E, { ...f, seed }, {
      /* Mid season moves in season one on the first seed and in season two on the second (the critic's correction
         10: a move after the first rollover, in an era save and in today's world, keeps the season's own slice). */
      /* And on the third seed today's world moves in season one to an entrant of the watched competition (the
         review of 2026-10-17: Liverpool, Lyon and the like, in the watched 36 and not in the participant's 32). */
      seasons: 3, move,
      join: seed === SEEDS[0] ? 1 : seed === SEEDS[1] ? 2 : seed === SEEDS[2] && f.era === 'now' && !f.custom ? { season: 1, to: 'entrant' } : false,
      onStep: (M, s, label, got) => {
        if (runs(3) || runs(4)) track(M, s, label, got);
        if (runs(1)) openChecks(M, s, name, label, got, measured);
        if (got?.joined && s && !s.uclGroup && !s.worldComps?.ucl) {
          const before = got.joined.worldComps?.ucl;
          const byRule = formatFor(M, s) === 'l36' && s.season >= 2 && (!before || before.s !== got.joined.season || myNames(M, s).some(c => before.clubs.includes(c)));
          if (byRule) movedWithout.add(s.season);
          else if (runs(1)) ok(false, `1 no competition: ${name}: the move to ${s.clubName} in season ${s.season} left no watched competition, and no rule says so`);
        }
        if (got?.prev && s?.season === 2 && movedTo) {
          const tables = M.cm.uclFinalTables(got.prev);
          const direct = tables ? M.cm.uclDirectQualifiersFromTables(tables, got.prev.uclBracket?.find(t => t.round === 'F')?.winner ?? null) : [];
          if (!s.uclGroup && direct.includes(s.clubName)) bump('1 seasons where exclude took out a direct entrant (a summer move)');
        }
      },
      onSeasonEnd: (M, st, n) => {
        if (st.uclGroup) { bump('1 seasons in the Champions League (not watched)'); return; }
        if (!st.worldComps?.ucl && movedWithout.has(n)) { bump('1 seasons a mid season move left with no competition, by the rule'); return; }
        const tag = `${f.club} (${f.era}) season ${n} seed ${seed}${st.clubName !== f.club ? ` now at ${st.clubName}` : ''}${n === 2 && movedTo ? ` moved to ${movedTo}` : ''}`;
        if (runs(1) || runs(7)) checkSeason(M, st, tag, measured);
        if (st.worldComps?.ucl?.f === 'g8' && measured.g8.length < 40) measured.g8.push({ slice: st.worldComps.ucl, rule: M.cm.uclGroupRule(st), tag });
        for (const lg of Object.values(st.world ?? {})) for (const row of lg.table ?? []) { measured.domestic[0] += row.gf; measured.domestic[1] += (row.w + row.d + row.l) / 2; }
      },
    });
  }
  if (runs(1)) console.log(`  1 stand ins: ${[...measured.standIns].map(([era, xs]) => `${era} ${xs.join(', ')}`).join('; ') || 'none'}`);
  if (runs(3)) {
    /* The joins are held to a floor, not only printed (the review of 2026-10-17): a carry of each format, and
       on three seeds or more a move to an entrant that still watches. */
    for (const fmt of ['g8', 'l36']) ok((counts[`3 joins that carried the slice ${fmt}`] ?? 0) > 0, `3 joins: no mid season move carried a ${fmt} slice, so the carry went unchecked`);
    const toEntrant = Object.entries(counts).filter(([k]) => k.startsWith('3 joins to an entrant')).reduce((a, [, v]) => a + v, 0);
    if (SEEDS.length >= 3) ok(toEntrant > 0, '3 entrant: no mid season move went to an entrant of the watched competition, so the carry rule went unchecked');
    ok((counts['3 reloads right after a join'] ?? 0) > 0, '3 reload: no save was reloaded right after a join');
  }
  if (runs(7)) {
    /* The titles by strength quartile, held to a band set from measured headroom: the head gave 144, 28, 4 and 0
       of 176 titles (r1502-run-a, five seeds), the two strengths swapped in the watched match 1, 22, 46 and 107
       (r1502-run-s). The strongest quarter must win more than half and more than four times the weakest's. */
    const q = [1, 2, 3, 4].map(i => counts[`7 titles by strength quartile ${i}`] ?? 0);
    const titles = q.reduce((a, b) => a + b, 0);
    if (titles >= 40) ok(2 * q[0] > titles && q[0] > 4 * q[3], `7 titles: the strongest quarter of the field won ${q[0]} of ${titles} titles and the weakest ${q[3]}`);
    else console.log(`  7 titles: ${titles} titles, fewer than the 40 the band needs, so it is not held`);
  }
  const mean = xs => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : NaN);
  console.log(`  1 and 3: ${fleet.length * SEEDS.length} journeys in ${((Date.now() - t0) / 1000).toFixed(0)} s`);
  console.log(`  7 goals a watched match ${mean(measured.goals).toFixed(3)} (${measured.goals.length} matches); a domestic league match ${(measured.domestic[0] / measured.domestic[1]).toFixed(3)}`);
  console.log(`  7 ties ${measured.ties}: to extra time ${(100 * measured.aet / measured.ties).toFixed(1)} percent, to penalties ${(100 * measured.pens / measured.ties).toFixed(1)} percent`);
  for (const fmt of ['g8', 'l36']) {
    const b = counts[`4 slice bytes ${fmt}`] ?? [];
    if (b.length) console.log(`  4 slice bytes ${fmt}: ${b.length} seasons, mean ${mean(b).toFixed(0)}, smallest ${Math.min(...b)}, largest ${Math.max(...b)}`);
  }
  return measured;
}

/** Section 2: the engine as it is against the same engine with the binding switched off, both fleets, both
 *  coach modes, every key but a watching state's worldComps equal and every draw equal, the evaluation called on
 *  the live state after every step of this arm (the critic's correction 6b). */
async function selfRelative() {
  /* From step E5 the holder line is reverted in BOTH arms, so this section compares the binding alone; what the
     holder moves is section 5's, by attribution. */
  const holder = hasE5() ? [HOLDER_EDIT] : [];
  const head = await engineOf(ROOT, 'head2', { edits: [...careerEdits(), ...holder] }, cannot);
  const off = await engineOf(ROOT, 'off', { edits: [...BINDING_OFF, ...holder] }, cannot);
  if (careerEdits().length) changed = true;
  const fleet = pickFleet(await head.fresh(), 'all', cannot);
  const record = st => (!st ? 'null' : JSON.stringify(!st.uclGroup && 'worldComps' in st ? { ...st, worldComps: undefined } : st));
  const t0 = Date.now();
  let journeys = 0, steps = 0, carried = 0;
  for (const f of fleet) for (const mode of ['nocoach', 'coach']) for (const seed of SEEDS) {
    const opts = { seasons: f.kind === 'participant' ? 2 : 3, mode, join: f.kind === 'watcher' && seed === SEEDS[0], record };
    const a = await careerJourney(off, { ...f, seed }, opts);
    const b = await careerJourney(head, { ...f, seed }, { ...opts, evalEach: true });
    journeys += 1; steps += a.length;
    if (b.some(y => y.carries)) carried += 1;
    const name = `${f.kind} ${f.club} (${f.era}) ${mode} seed ${seed}`;
    for (let i = 0; i < Math.max(a.length, b.length); i += 1) {
      const x = a[i], y = b[i];
      if (!x || !y || x.label !== y.label) { ok(false, `2 ${name}: the steps part at ${i}`); break; }
      const why = [];
      if (y.inIt && y.carries) why.push('a state in the Champions League carries worldComps');
      if (x.json !== y.json) why.push('the state differs');
      if (x.draws !== y.draws || x.drawSha !== y.drawSha) why.push(`the draws differ (${x.draws} against ${y.draws})`);
      if (y.inIt && x.saved !== y.saved) why.push('the saved bytes differ');
      if (why.length) { ok(false, `2 ${name} at ${x.label}: ${why.join('; ')}`); break; }
    }
  }
  ok(carried > 0, '2 no journey of this arm ever carried a watched Champions League, so the section compared nothing');
  checks += steps;
  console.log(`  2 self relative: ${journeys} journeys, ${steps} steps each arm, ${carried} journeys carried a slice, ${((Date.now() - t0) / 1000).toFixed(0)} s`);
}

/** Section 3, the dates at every league size the game's leagues have (correction 9), read off REAL_LEAGUES in
 *  today's world (the league phase) and ERA_LEAGUES in the eras (the groups). */
async function leagueSizes() {
  const E = await engineOf(ROOT, 'sizes', { edits: careerEdits() }, cannot);
  const M0 = await E.fresh();
  const seen = [];
  for (const [era, leagues] of [['now', M0.cm.REAL_LEAGUES], ...ERAS_OF_FLEET.map(e => [e, M0.cm.ERA_LEAGUES[e]])]) {
    const bySize = new Map();
    for (const lg of leagues ?? []) if (!bySize.has(lg.clubs.length)) bySize.set(lg.clubs.length, lg);
    for (const [size, lg] of [...bySize].sort((a, b) => a[0] - b[0])) {
      const M = await E.fresh();
      const club = lg.clubs[lg.clubs.length - 1];
      const st = tape(0x1502 + size, () => M.cm.startCareer(club, era)).value;
      if (!st.worldComps) { st.uclGroup = null; M.cm.openWorldUcl(st, M.cm.worldUclField(st, null), null); }
      ok(!!st.worldComps, `3 dates: ${era} league of ${size} (${club}): no watched competition opens`);
      if (st.worldComps) checkDates(M, st, `${era} league of ${size} (${club})`, 'season one');
      seen.push(`${era} ${size}`);
    }
  }
  console.log(`  3 league sizes: ${seen.join(', ')}`);
}

/** Section 3, the move probe (the critic's correction 11): a watcher's season one stopped just after each night it
 *  has passed, and a move from there to the bottom club of every other league of its world. The nights done must
 *  never fall across the move; how often the new club's calendar sat behind the old one is counted and printed
 *  (the case `seen` exists for, and the one the noseen control needs). */
async function joinProbe() {
  const E = await engineOf(ROOT, 'probe', { edits: careerEdits() }, cannot);
  if (careerEdits().length) changed = true;
  let joins = 0, behind = 0;
  for (const [club, era] of [['Chelsea', 'now'], ['Everton', 'now']]) {
    const M = await E.fresh();
    let s = tape(0x1502, () => M.cm.startCareer(club, era)).value;
    const leagues = M.cm.REAL_LEAGUES.filter(l => !l.clubs.includes(club));
    const sizes = new Map();
    for (const lg of leagues) if (!sizes.has(lg.clubs.length)) sizes.set(lg.clubs.length, lg);
    const places = M.cm.worldUclNights(s) ?? [];
    for (let n = 0; n < places.length && n < 10; n += 1) {
      while (s.week <= places[n].at && s.week < s.calendar.length) s = tape(0x2000 + s.week, () => M.cm.playNextEntry(s, { skipHalftime: true, noCoach: true })).value.state;
      if (s.week >= s.calendar.length) break;
      const before = M.cm.worldUclNightsDone(s);
      for (const lg of sizes.values()) {
        const joined = tape(0x3000 + n, () => joinTo(M, s, lg.clubs[lg.clubs.length - 1], lg.id)).value;
        if (!joined?.worldComps?.ucl) continue;
        joins += 1;
        const after = M.cm.worldUclNightsDone(joined);
        const raw = (M.cm.worldUclNights(joined) ?? []).filter(p => joined.week > p.at).length;
        if (raw < before) behind += 1;
        ok(after >= before, `3 falls: the probe, ${club} after ${places[n].night.id} to ${lg.id}: nights done fell from ${before} to ${after}`);
      }
    }
  }
  console.log(`  3 move probe: ${joins} moves that carried the slice, ${behind} of them onto a calendar behind the old one`);
  ok(joins > 0, '3 falls: the move probe carried no slice, so it checked nothing');
}

/** Section 1, the device order (the critic's correction 1): every watched group season evaluated with every match
 *  level, so only the names order the tables, plainly and with the device's order turned round: the same. */
async function localeCheck(slices) {
  const w = (await bundle('locale', { w: MODULE_FILE })).w;
  const level = rule => ({ sim: () => [0, 0], tie: () => ({ legs: 2, awayGoals: false, deciderScale: 1, etScale: 1 }), groupRule: rule });
  const flipped = run => {
    const original = String.prototype.localeCompare;
    String.prototype.localeCompare = function (other) { return -original.call(this, other); };
    try { return run(); } finally { String.prototype.localeCompare = original; }
  };
  for (const { slice, rule, tag } of slices) {
    const plain = JSON.stringify(w.evaluateWorldComp(slice, 6, level(rule)));
    ok(JSON.stringify(flipped(() => w.evaluateWorldComp(slice, 6, level(rule)))) === plain, `1 locale: ${tag}: the groups order otherwise on a device that orders names the other way`);
  }
  console.log(`  1 device order: ${slices.length} group seasons evaluated level both ways`);
}

/** Section 1, the critic's advice 24 (the review of 2026-10-17, its minor 6): a created club in the first pyramid's
 *  top flight finishes the season top of its table and the manager leaves it in the summer for the bottom club of
 *  another league, which watches. The created club's place in the watched field goes back to the club it
 *  replaced (customExitUclField, the participant's rule), never to the created club's own name. */
async function customExitProbe() {
  const E = await engineOf(ROOT, 'customexit', { edits: careerEdits() }, cannot);
  if (careerEdits().length) changed = true;
  const M = await E.fresh();
  const top = M.cm.PYRAMIDS?.[0]?.top;
  if (!top) cannot('no PYRAMIDS[0].top league for the created club');
  let s = tape(0x1502, () => M.cm.startCareer(CREATED.name, 'now', { ...CREATED, leagueId: top })).value;
  const replaced = s.customClub?.replacedClub;
  if (!replaced) cannot('the created club in the top flight replaced nobody');
  let over = false;
  for (let i = 0; i < 260 && !over; i += 1) {
    const r = tape(0x4000 + i, () => M.cm.playNextEntry(s, { skipHalftime: true, noCoach: true })).value;
    s = r.state; over = r.kind === 'seasonOver';
  }
  if (!over) cannot('the created club\'s season did not end in 260 entries');
  /* It finished top: its row's points put above everyone's, so its place is a direct one. */
  const best = Math.max(...s.table.map(r => r.pts));
  s = { ...s, table: s.table.map(r => (r.club === CREATED.name ? { ...r, pts: best + 30 } : r)) };
  s = tape(0x4400, () => M.cm.finishSeason(s).state).value;
  const tables = M.cm.uclFinalTables(s) ?? [];
  ok(tables.find(t => t.league.id === top)?.clubs[0] === CREATED.name, `1 created exit setup: ${CREATED.name} is not top of the final ${top} table, so the probe checks nothing`);
  /* The move: the last club of another European league's final table (it qualifies for nothing), not the club
     the created one replaced. */
  const other = tables.find(t => t.league.id !== top && t.clubs.length && !t.clubs.includes(replaced));
  const to = other ? { club: other.clubs[other.clubs.length - 1] } : null;
  if (!to) cannot('no club to move to from the created club');
  const next = tape(0x4800, () => M.cm.startNextSeason(s, to.club)).value;
  ok(next.clubName === to.club && !next.uclGroup, `1 created exit setup: the summer move to ${to.club} did not leave a watcher (at ${next.clubName}, uclGroup ${next.uclGroup === null ? 'null' : 'set'})`);
  const watched = next.worldComps?.ucl?.clubs ?? [];
  ok(watched.length > 0, `1 created exit setup: the move to ${to.club} opened no watched competition`);
  ok(!watched.includes(CREATED.name), `1 created exit: after leaving ${CREATED.name} for ${to.club}, the watched field still lists the created club`);
  ok(watched.includes(replaced), `1 created exit: after leaving ${CREATED.name} for ${to.club}, its place did not go back to ${replaced}, the club it replaced`);
  console.log(`  1 created club left in the summer: ${CREATED.name} (top of ${top}, in place of ${replaced}) to ${to.club}; the watched field holds ${watched.includes(replaced) ? replaced : 'not ' + replaced}`);
}

/**
 * Section 5 (step E5): the holder. Today's world's watchers through three seasons on the engine as it is and on
 * the same engine with the holder line reverted (scripts/lib/worldUclHolder1502.mjs). Every season that ends with
 * a watched winner hands it to next season's field (and to the watched field, unless it is my club now); where
 * the winner was already in the field, the field holds the same clubs; and the two engines part only at a
 * rollover after a watched final, on the field (the attribution: the line is the whole of the change).
 */
async function holderSection() {
  if (!hasE5()) { console.log('  5 the holder: not in this tree (step E5 not built)'); return; }
  const head = await engineOf(ROOT, 'holder', { edits: careerEdits() }, cannot);
  const ref = await engineOf(ROOT, 'holder-off', { edits: [HOLDER_EDIT] }, cannot);
  if (careerEdits().length) changed = true;
  const fleet = pickFleet(await head.fresh(), 'watchers', cannot).filter(f => f.era === 'now');
  let rollovers = 0, withWinner = 0, moved = 0, already = 0, reordered = 0;
  const movedClubs = [];
  for (const f of fleet) for (const seed of SEEDS) {
    const name = `${f.club} (${f.era}) seed ${seed}`;
    const rolls = [[], []];
    const watch = side => (M, s, label, got) => {
      if (got?.prev) rolls[side].push({ label, W: M.cm.worldUclWinner(got.prev), field: s.uclField ?? [], watched: s.worldComps?.ucl?.clubs ?? [], club: s.clubName, inIt: !!s.uclGroup });
    };
    const record = st => JSON.stringify(st);
    const a = await careerJourney(head, { ...f, seed }, { seasons: 3, record, onStep: watch(0) });
    const b = await careerJourney(ref, { ...f, seed }, { seasons: 3, record, onStep: watch(1) });
    rolls[0].forEach((ra, j) => {
      const rb = rolls[1][j];
      rollovers += 1;
      if (!ra.W || !rb) return;
      withWinner += 1;
      if (ra.field.length) ok(ra.field.includes(ra.W), `5 holder: ${name} ${ra.label}: the watched winner ${ra.W} is not in next season's field`);
      if (!ra.inIt && ra.W !== ra.club && ra.watched.length) ok(ra.watched.includes(ra.W), `5 holder: ${name} ${ra.label}: the watched winner ${ra.W} is not in next season's watched field`);
      if (rb.field.includes(ra.W)) {
        already += 1;
        ok(same([...ra.field].sort(), [...rb.field].sort()), `5 holder: ${name} ${ra.label}: ${ra.W} was in the field already and the field still changed its clubs`);
        if (!same(ra.field, rb.field)) reordered += 1;
      } else if (rb.field.length) { moved += 1; movedClubs.push(`${ra.W} in for ${rb.field.filter(c => !ra.field.includes(c)).join(' and ') || 'nobody'}`); }
    });
    const at = a.findIndex((x, i) => !b[i] || x.json !== b[i].json || x.drawSha !== b[i].drawSha);
    if (at < 0) continue;
    const label = a[at].label;
    ok(/rollover/.test(label) && !!rolls[0].find(r => r.label === label)?.W, `5 attribution: ${name}: the engine without the holder line parts at ${label}, not at a rollover after a watched final`);
    if (b[at]) {
      const A = JSON.parse(a[at].json), B = JSON.parse(b[at].json);
      const keys = Object.keys(A).filter(k => JSON.stringify(A[k]) !== JSON.stringify(B[k]));
      ok(keys.includes('uclField') || keys.includes('worldComps'), `5 attribution: ${name}: the two part at ${label} on ${keys.slice(0, 4).join(', ')} with the same fields`);
    }
  }
  ok(withWinner > 0, '5 holder: no watched season ended with a winner, so nothing was checked');
  console.log(`  5 the holder: ${rollovers} rollovers, ${withWinner} after a watched final, ${already} winners already in the field (${reordered} of those fields in another order), ${moved} fields the holder changed: ${movedClubs.slice(0, 8).join('; ') || 'none'}`);
}

/** Section 6: the dailies' state shape (scripts/simDailyDeals.mjs holds the deal). */
async function dailies() {
  const E = await engineOf(ROOT, 'daily', { edits: careerEdits() }, cannot);
  let watching = 0, days = 0;
  for (let d = 0; d < 10; d += 1) {
    const date = new Date(Date.UTC(2026, 9, 17 + d)).toISOString().slice(0, 10);
    const M = await E.fresh();
    const setup = M.hs.dailyHotSeat(date);
    const run = tape(0x1502 + d, () => M.hs.startHotSeat({ club: setup.club, seed: setup.seed, daily: date })).value;
    if (run.state.uclGroup === null) watching += 1;
    ok(!('worldComps' in run.state), `6 daily: the Hot Seat of ${date} (${setup.club}) carries worldComps`);
    const dd = M.dd.startDeadlineDay(M.dd.dailyDeadlineDay(date));
    if (dd.state.uclGroup === null) watching += 1;
    ok(!('worldComps' in dd.state), `6 daily: the Deadline Day of ${date} carries worldComps`);
    days += 2;
  }
  console.log(`  6 dailies: ${days} days, ${watching} of them a club that watches`);
}

/* ── Run ───────────────────────────────────────────────────────────────────────────────────────────── */
try {
  if (runs(0)) { section0(); await section0Engine(); }
  if ([1, 3, 4, 7].some(runs)) {
    const measured = await watcherPass();
    if (runs(1)) { await localeCheck(measured.g8); await customExitProbe(); }
    if (runs(3)) { await leagueSizes(); await joinProbe(); }
  }
  if (runs(2)) await selfRelative();
  if (runs(5)) await holderSection();
  if (runs(6)) await dailies();
  for (const [k, v] of Object.entries(counts).sort()) if (typeof v === 'number') console.log(`  ${k}: ${v}`);
} catch (e) {
  console.log(`simWorldUcl: cannot run: ${e && e.stack ? e.stack.split('\n').slice(0, 3).join(' | ') : e}`);
  process.exit(2);
}
for (const f of fails.slice(0, 40)) console.log(`FAIL ${f}`);
if (CONTROL) {
  const [, must, may = must] = CONTROLS[CONTROL];
  const own = fails.some(f => must.test(f));
  const stray = fails.filter(f => !may.test(f));
  if (!changed) { console.log(`simWorldUcl: control ${CONTROL} ABORTED: it changed nothing`); process.exit(2); }
  if (own && stray.length === 0) { console.log(`simWorldUcl: control ${CONTROL} FIRED (${fails.length} failures, all its own)`); process.exit(1); }
  console.log(`simWorldUcl: control ${CONTROL} DID NOT FIRE CLEANLY (own ${own}, stray ${stray.length}: ${stray.slice(0, 3).join(' / ')})`);
  process.exit(3);
}
console.log(`simWorldUcl: ${fails.length === 0 ? 'green' : 'RED'}, ${checks} checks, ${fails.length} failures`);
process.exit(fails.length === 0 ? 0 : 1);

/**
 * Round 1229 harness: Club Manager, the league keeps its book (part one, the book is kept).
 *
 * WHAT THE ROUND DID. Every rival goal of a league season is written down against a named man of that
 * club's eleven, by the weight my own squad is shared out by, with assists and clean sheets
 * (src/lib/clubManagerLeagueBook.ts, bound in src/lib/clubManager.ts under creditRaceGoals). Nothing reads
 * the book for a screen yet: the old scorer race is still written, draws and all, and still what the board
 * and the awards show. So the failure modes are: the book moves a result or a seeded draw; a club's rows
 * do not add up to its goals; a row is lost at the engine's JSON clone; a man is credited for a club he
 * has left; the deal does not follow the weight; a save that began its season without a book is given
 * one; a job joined in mid season loses its book; a daily game starts carrying one.
 *
 * WHAT IT PLAYS. A fleet of careers (club x seed x two whole seasons, summers included, every match a
 * quick sim) on one seeded stream each, three ways: the engine as committed (the candidate, watched after
 * every calendar entry), the same source with the book's lines taken out (BOOK_OFF below), and, when
 * BOOK_BASE names a worktree of the commit before the round, that commit's own source. Sections:
 *
 *   stream   the candidate's whole save but the book, and HOW MANY draws the stream gave, are byte equal
 *            to the engine with the book out at the end of every season and after every summer; and to
 *            the base commit's source (BOOK_BASE)
 *   law      after EVERY entry, for every rival club: goals on its rows + own goals + unnamed = its goals
 *            for in the table; assists never above row goals; the book is the same book after a JSON
 *            round trip and holds no null; the full reader accepts it. At each season's end the clean
 *            sheets on a club's keeper rows are the matches it conceded nothing in, counted by the
 *            harness from the table before and after every entry, never from the book; my men's league
 *            clean sheets fit the ones I kept. Every season opens with an empty book.
 *   names    every man credited in an entry is on that club's roster under that position and was not in
 *            my squad; and the PURCHASE: the best rival scorer is put into my squad at week 22 and
 *            twelve entries are played on: his row at the club he left must not move, and its law holds;
 *            and THE BOOK AGAINST THE REPORT of every league match of mine (reportAgainstBook): an own
 *            goal line is an own goal of the book, no man gains more than the report names him for, a
 *            line whose name is on that club's roster is on his row and only a name the roster does not
 *            hold is counted unnamed, no assist on a goal from the spot or a free kick, and every man
 *            given an assist was on their pitch when a goal he did not score went in
 *   shapes  (i) the deal follows the weight: of the goals clubs with an eleven score against each other,
 *            the share credited to forwards, midfielders and defenders against the share the harness
 *            computes from the same elevens and ITS OWN copy of the table, inside four binomial standard
 *            deviations, forwards above midfielders above defenders; (ii) the point of the round, paired
 *            on the same seasons of the same saves: the forwards and wingers in the top ten of the Goals
 *            board, book against old race, rise by at least PURPOSE_FLOOR; (iii) assists and own goals
 *            inside four binomial standard deviations of the rule's share of the run's own counts; (iv)
 *            every goal is its own roll: of the matches a club with an eleven scored two or more in
 *            against another club, how often every goal went to one man, against what the harness's own
 *            table says for that eleven and that score, inside four standard deviations
 *   oldsave  four saves with no book (the two committed fixtures, loaded through loadCareer, and two
 *            written in the run twenty entries into a season) finish their season on the candidate
 *            exactly as on the reference engines, entry by entry, with the same board and summary, and
 *            never gain a book; the season after opens one that obeys the law from its first round; a
 *            book that is a string, an array, a number, or last season's own reads as no book, is never
 *            written into, and the save plays the entries the same save with no book at all plays; a
 *            book with one holed row is refused whole by the reader and plays the same entries too, but
 *            the match week (a stamp and a type check, on purpose) still writes to it
 *   doors    the takeover from the picker at its three entries and the job joined today in season one
 *            and in season three: a whole book at the handover and the law after every entry to the end
 *   dailies  Manager Hot Seat (four dates, played to a verdict, handed over to Club Manager and played
 *            on) and Deadline Day (three dates): no state ever carries a book, and every state is byte
 *            equal to the reference engines' for the same date
 * Outside section stream "the reference engines" are the engine with the book out and, with BOOK_BASE,
 * the base commit; each pair is played on two FRESH copies of the bundles asked the same things in the
 * same order, because the engine numbers its youth players, press questions and messages as it goes.
 * And a save that is not the one a copy touched last is WOKEN first (wake below): the engine keeps one
 * save's league memberships registered at a time, the way loadCareer leaves them.
 *
 * NEGATIVE CONTROLS. BOOK_CONTROL=<name> patches the bundle's copy of the source (never a file on disk;
 * the anchor must occur exactly as often as stated or the run refuses) and the run then exits 1 with
 * FIRED only if the named section went red and no other did (two controls name the sections that go red
 * with theirs for the same reason, and say so on their last line):
 *   weight        a striker weighs 8, not 5 (needs BOOK_BASE)         -> stream, and shapes with it
 *   mathrandom    the scorer pick reads Math.random                  -> stream
 *   dropmine      my own league match is not noted                   -> law, and with it the three other
 *                 sections that check the law (names, oldsave, doors)
 *   byeweek       the results of a week I do not play (a league with an odd number of clubs) are not
 *                 noted                                              -> law (shapes may go with it: those
 *                 goals are then missing from the rows the shares are counted on)
 *   cleanside     the clean sheet goes to the side that did not score -> law
 *   bought        the book's eleven keeps a man now in my squad      -> names
 *   wrongman      a goal against me goes to the first outfield man on their pitch, whoever the report
 *                 named                                              -> names
 *   unnamed       the name lookup of my match finds nobody: every goal against me is counted unnamed
 *                                                                    -> names
 *   offbyone      their last line against me is never read           -> names
 *   penassistmine a penalty or a free kick against me is paid an assist -> names (shapes may go with it:
 *                 the same assists are in the share section shapes judges)
 *   assistbench   the assist in my match is dealt over their eleven and bench, not the men on the pitch
 *                 at that minute                                     -> names
 *   twoman       the deal is the old race's: 42 and 26 in a hundred to the two best rated forwards or
 *                 midfielders, the rest to nobody, and no taker      -> shapes
 *   flat          every outfield man weighs the same                 -> shapes
 *   penassist     a penalty or a free kick is paid an assist         -> shapes
 *   noog          no goal is ever an own goal                        -> shapes
 *   keyindex      the goal's own index is dropped from the deal key, so every goal of a side in one
 *                 match is the same roll: one man's brace every time  -> shapes
 *   redeal       loadCareer opens a book for a save that has none   -> oldsave
 *   seasonstamp   the season's number is put back into the stamp     -> doors
 *   strip         the Hot Seat's strip of the book is taken out      -> dailies
 *   stripdeadline Deadline Day's strip is taken out                  -> dailies
 *
 * MEASURED: see the block above PURPOSE_FLOOR.
 *
 * Exit: 0 green, 1 red (or a control that FIRED: read the last line), 2 could not run, 3 a control that
 * did not fire.
 *
 *   node scripts/simCmLeagueBook.mjs                      the default (small) fleet
 *   BOOK_FLEET=full node scripts/simCmLeagueBook.mjs      the whole fleet (the round's remote check)
 *   BOOK_BASE=<a worktree of the base commit> ...         adds the base commit as a reference
 *   BOOK_MEASURE=1 ...                                    also prints the boards with CM_BOOK_TAKER false
 *   SEEDSET=n                                             another set of seeds
 * Offline: bundles the engine from src, reads no network and no database.
 */
import './lib/offlineTransport.cjs';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { build } from 'esbuild';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const BASE = process.env.BOOK_BASE ? path.resolve(process.env.BOOK_BASE) : null;
const CONTROL = process.env.BOOK_CONTROL || '';
const FULL = process.env.BOOK_FLEET === 'full';
const SEEDSET = Number(process.env.SEEDSET ?? 0);
const SEASONS = Number(process.env.SEASONS ?? 2);
const T0 = Date.now();
const cannot = why => { console.error(`simCmLeagueBook: cannot run: ${why}`); process.exit(2); };

const ENGINE = 'src/lib/clubManager.ts';
const BOOK = 'src/lib/clubManagerLeagueBook.ts';
const WEIGHT = 'src/lib/clubManagerGoalWeight.ts';
const HOT = 'src/lib/managerHotSeat.ts';
const DEADLINE = 'src/lib/deadlineDay.ts';

/* The engine with the book taken out: no book is ever opened and no result is ever noted. Section stream
   plays every career on it too, on the same seeded stream. `n` is how many times the anchor must occur. */
const NOTE_MINE = 'noteBookMine(state, myLeagueId, entry.round, fx, live, xi, myGoals, oppGoals, oppScorers);';
const NOTE_RESULT = 'noteBookResult(state, myLeagueId, entry.round, h, a, hg, ag);';
/* The same call where playNextEntry plays a week I am not part of (a league with an odd number of clubs):
   it sits two spaces deeper than the week's close, so with its indent it occurs once. */
const NOTE_BYE = `          ${NOTE_RESULT}`;
const OPEN_LINE = '  state.leagueBook = openBook(bookStampOf(state, careerLeagueOf(state).id));';
const BOOK_OFF = [
  { file: ENGINE, from: OPEN_LINE, to: '  void openBook;' },
  { file: ENGINE, from: NOTE_MINE, to: '' },
  { file: ENGINE, from: NOTE_RESULT, to: '', n: 2 },
];
/* The line of noteBookMine that credits a report's line and decides whether its assist is dealt. */
const MINE_GATE = '    if (!creditGoal(book, opp, man) || !man || line.penalty || line.freeKick) return;';
const SCORER_PICK = ': pickWeighted(outfield, m => goalWeight(m.p, m.r), scorerRoll);';
const TWO_MAN = ": ((men, roll) => { const two = men.filter(m => !['CB', 'LB', 'RB', 'LWB', 'RWB'].includes(m.p)).sort((a, b) => b.r - a.r); return roll < 0.42 ? (two[0] ?? null) : roll < 0.68 ? (two[1] ?? null) : null; })(outfield, scorerRoll);";

/** name -> { patch: [{ file, from, to, n? }], red: the section that must go red, needs?: 'base', also?: sections
 *  that go red with it for the same reason and are allowed to (the law is checked in four sections, and the
 *  weight table is what the deal is judged against) } */
const CONTROLS = {
  weight: { patch: [{ file: WEIGHT, from: "pos === 'ST' || pos === 'CF' ? 5 :", to: "pos === 'ST' || pos === 'CF' ? 8 :" }], red: 'stream', needs: 'base', also: ['shapes'] },
  mathrandom: { patch: [{ file: BOOK, from: '    const scorerRoll = rng();', to: '    const scorerRoll = Math.random();' }], red: 'stream' },
  dropmine: { patch: [{ file: ENGINE, from: NOTE_MINE, to: '' }], red: 'law', also: ['names', 'oldsave', 'doors'] },
  byeweek: { patch: [{ file: ENGINE, from: NOTE_BYE, to: '' }], red: 'law', also: ['shapes'] },
  cleanside: { patch: [{ file: ENGINE, from: '  if (against === 0) creditCleanSheet(book, club, bookKeeper(xi), bookBacks(xi));', to: '  if (goals === 0) creditCleanSheet(book, club, bookKeeper(xi), bookBacks(xi));' }], red: 'law' },
  bought: { patch: [{ file: ENGINE, from: '  const notTheirs = mySquadNames(state);', to: '  const notTheirs = NO_NAMES;' }], red: 'names' },
  wrongman: { patch: [{ file: ENGINE, from: '    let man: OppXiLine | null = bookNamed(there, line.name) ?? bookNamed(theirs, line.name);', to: "    let man: OppXiLine | null = there.find(p => p.p !== 'GK') ?? bookNamed(theirs, line.name);" }], red: 'names' },
  unnamed: { patch: [{ file: ENGINE, from: MINE_GATE, to: `    man = null;\n${MINE_GATE}` }], red: 'names' },
  offbyone: { patch: [{ file: ENGINE, from: '  const lines = oppScorers.slice(0, oppGoals);', to: '  const lines = oppScorers.slice(0, Math.max(0, oppGoals - 1));' }], red: 'names' },
  penassistmine: { patch: [{ file: ENGINE, from: MINE_GATE, to: '    if (!creditGoal(book, opp, man) || !man) return;' }], red: 'names', also: ['shapes'] },
  assistbench: { patch: [{ file: ENGINE, from: '    const assist = dealAssist(`${key}|${i}`, man, there, rules);', to: '    const assist = dealAssist(`${key}|${i}`, man, theirs, rules);' }], red: 'names' },
  twoman: { patch: [{ file: BOOK, from: SCORER_PICK, to: TWO_MAN }, { file: BOOK, from: '  const taker = rules.taker ? takerOf(outfield) : null;', to: '  const taker = null;' }], red: 'shapes' },
  flat: { patch: [{ file: BOOK, from: SCORER_PICK, to: ': pickWeighted(outfield, () => 1, scorerRoll);' }], red: 'shapes' },
  penassist: { patch: [{ file: BOOK, from: "assistFrom(rng, kind === 'open' ? scorer : null, outfield, rules);", to: "assistFrom(rng, kind === 'og' ? null : scorer, outfield, rules);" }], red: 'shapes' },
  noog: { patch: [{ file: BOOK, from: ": ownGoalTagged(`${key}|${i}|og`, rules.ownGoalOneIn) ? 'og' : 'open';", to: ": 'open';" }], red: 'shapes' },
  keyindex: { patch: [{ file: BOOK, from: '    const rng = keyedRng(`${key}|${i}`);', to: '    const rng = keyedRng(key);' }], red: 'shapes' },
  redeal: { patch: [{ file: ENGINE, from: '    ensureRoles(parsed);', to: '    ensureRoles(parsed);\n    if (!parsed.leagueBook) openLeagueBook(parsed);' }], red: 'oldsave' },
  seasonstamp: { patch: [{ file: ENGINE, from: '`${leagueId}|${bookSalt(state.leagueClubs)}`;', to: '`${state.season}|${leagueId}|${bookSalt(state.leagueClubs)}`;' }], red: 'doors' },
  strip: { patch: [{ file: HOT, from: '  delete s.leagueBook;', to: '' }], red: 'dailies' },
  stripdeadline: { patch: [{ file: DEADLINE, from: '    delete state0.leagueBook;', to: '' }], red: 'dailies' },
};
if (CONTROL && !Object.hasOwn(CONTROLS, CONTROL)) cannot(`unknown control "${CONTROL}"`);
if (CONTROL && CONTROLS[CONTROL].needs === 'base' && !BASE) cannot(`control ${CONTROL} is judged against the base commit: set BOOK_BASE`);

/* The fleet: [club, era]. The clubs cover the league sizes (20, 18, 24 and 15) and both pair ledger cases.
   The last one is there for its league's ODD number of clubs: fifteen clubs means a week I do not play in
   which the rest of the round does, and the engine notes those results at a call of its own (the bye week
   of playNextEntry), which no league with an even number of clubs ever reaches. It is in the default
   fleet too, because the suite runs the default. */
const ALL_CLUBS = [
  ['Everton', 'now'], ['Arsenal', 'now'], ['Bayern Munich', 'now'], ['Southampton', 'now'],
  ['Hertha BSC', 'now'], ['Real Madrid', 'now'], ['Ajax', 'now'], ['Barcelona', 'era2010'],
  ['New England Revolution', 'now'],
];
const CLUBS = FULL ? ALL_CLUBS : [ALL_CLUBS[0], ALL_CLUBS[3], ALL_CLUBS[4], ALL_CLUBS[7], ALL_CLUBS[8]];
const SEEDS = FULL ? 3 : 1;
const seedOf = (clubIndex, k) => (0x1229 + SEEDSET * 7919 + clubIndex * 131 + k * 17) >>> 0;

/* Each run its own temp folder: two bundling harnesses at once must never share one. */
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'cm-book-'));
globalThis.localStorage ??= { getItem: () => null, setItem: () => {}, removeItem: () => {} };

/** The engine and its neighbours, bundled from `root` with exact text patches applied to the bundle's copy. */
async function engine(label, root, patches = []) {
  const entry = path.join(TMP, `${label}-entry.mjs`);
  const out = path.join(TMP, `${label}.bundle.mjs`);
  const P = f => JSON.stringify(path.join(root, f).replaceAll('\\', '/'));
  const has = f => fs.existsSync(path.join(root, f));
  fs.writeFileSync(entry, [
    `export * as cm from ${P('src/lib/clubManager.ts')};`,
    `export * as cal from ${P('src/lib/clubManagerCalendar.ts')};`,
    `export * as hs from ${P('src/lib/managerHotSeat.ts')};`,
    `export * as dd from ${P('src/lib/deadlineDay.ts')};`,
    has('src/lib/clubManagerLeagueBook.ts') ? `export * as book from ${P('src/lib/clubManagerLeagueBook.ts')};` : 'export const book = null;',
  ].join('\n') + '\n');
  const applied = new Set();
  await build({
    entryPoints: [entry], outfile: out, bundle: true, format: 'esm', platform: 'node', logLevel: 'error',
    absWorkingDir: root, alias: { '@': path.join(root, 'src') },
    loader: { '.css': 'empty', '.png': 'empty', '.svg': 'empty', '.jpg': 'empty', '.webp': 'empty' },
    plugins: [{ name: 'cm-book-control', setup(b) {
      b.onLoad({ filter: /\.ts$/ }, args => {
        const mine = patches.filter(p => path.resolve(root, p.file) === path.resolve(args.path));
        if (!mine.length) return undefined;
        let text = fs.readFileSync(args.path, 'utf8').replace(/\r\n/g, '\n');
        for (const p of mine) {
          const n = text.split(p.from).length - 1;
          if (n !== (p.n ?? 1)) throw new Error(`control anchor occurs ${n} times, not ${p.n ?? 1}, in ${p.file}: ${p.from}`);
          text = text.split(p.from).join(p.to);
          applied.add(p);
        }
        return { contents: text, loader: 'ts', resolveDir: path.dirname(args.path) };
      });
    } }],
  });
  if (applied.size !== patches.length) throw new Error(`${label}: ${patches.length - applied.size} patch(es) never met their file`);
  const mod = await import(pathToFileURL(out).href);
  await mod.cm.ensureAllEraRosters();
  /* A second copy of the same bundle, evaluated afresh: whatever a module keeps between calls starts again,
     so two engines asked the same things in the same order can be compared save for save. */
  let copies = 0;
  const again = async () => {
    const copy = await import(`${pathToFileURL(out).href}?copy=${++copies}`);
    await copy.cm.ensureAllEraRosters();
    return { cm: copy.cm, cal: copy.cal, hs: copy.hs, dd: copy.dd, book: copy.book, again };
  };
  return { cm: mod.cm, cal: mod.cal, hs: mod.hs, dd: mod.dd, book: mod.book, again };
}

/*
 * MEASURED on GitHub runners, 2026-10-10, five seed sets each (SEEDSET 0 to 4), the engine as at 4ab6e246
 * (remote checks r1229-g1, r1229-g3, r1229-g2, r1229-g6; docs/audits/ROUND-1229-NOTES.md has the boards).
 * The full fleet is 24 careers x 2 seasons (48 seasons, about 44,000 rival goals), the default 4 x 2.
 *   stream   96 of 96 faces equal with the book out on every set, and 96 of 96 equal to the base commit
 *            (980654fa, seed set 0). Controls: mathrandom moved 16 of 16 default faces, weight 11 of 16.
 *   shapes (i)   the three lines against the harness's own table, z: full fleets within -1.83 to 1.71,
 *            default fleets within -2.27 to 2.60 (gate 4). Controls: twoman, forwards at z -36 and no
 *            defender scoring at all; flat, forwards at z -37 and defenders at z +58.
 *   shapes (ii)  forwards and wingers in the top ten of the Goals board, book minus old race: full fleets
 *            3.85 4.02 4.40 4.19 4.00, default fleets 3.50 3.63 3.13 3.88 4.50. Under the twoman control
 *            (the book dealing as the old race did, no taker) the default fleets read 0.00 -1.00 -0.63
 *            -0.38 -0.38. PURPOSE_FLOOR 1.5 sits 1.63 under the lowest healthy fleet and 1.50 over the
 *            highest control, about three of either's standard deviations (0.5 and 0.4) from each.
 *   shapes (iii) assists a credited goal of a club with an eleven, against 0.614, z: full 0.70 -0.69 -2.93
 *            -0.47 -0.50, default 0.37 -1.25 -0.87 -0.34 0.53 (gate 4; control penassist z 11.4). Read
 *            over EVERY club the same fleets gave 0.601 to 0.610, all ten under the rule: a club with no
 *            eleven can have a goal against me on a row, with nobody on its pitch to set it up, and the
 *            first cut of this check counted those. Own goals of a club with an eleven against 2.75 in a
 *            hundred, z: full 0.16 -0.59 0.66 -1.10 -2.00, default 0.42 -1.12 1.12 -0.82 0.73 (gate 4;
 *            control noog z -12.0).
 *   law      45,366 checks over 2,185 entries on the full fleet, none red; with the video referee on, 268
 *            to 277 entries, 162 to 183 reviews in 228 league matches of mine, no report whose lines did
 *            not add up to its score. Controls: dropmine 3,434 failures, cleanside 96.
 *   names    about 80,000 credits on the full fleet, each on its club's roster and not in my squad; the
 *            purchase probe fires on 3 of 3 purchases under the bought control.
 *   oldsave, doors, dailies   exact comparisons, no band: redeal 4 failures, seasonstamp 32, strip 8,
 *            stripdeadline 6.
 * Wall time, full fleet with BOOK_BASE and BOOK_MEASURE: about 130 seconds; default fleet about 25.
 */
/** The gate of section shapes (ii): see MEASURED above. */
const PURPOSE_FLOOR = 1.5;
/** Section shapes (iv) is judged on at least this many matches: see MEASURED above. */
const MULTI_FLOOR = 400;

/* ---------- the seeded stream, counted ---------- */
function seeded(seed) {
  let a = seed >>> 0;
  let calls = 0;
  const draw = () => {
    calls += 1;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  draw.calls = () => calls;
  return draw;
}

/** The whole save but the book, as text: what "the engine's stream did not move" is judged on. */
const withoutBook = s => JSON.stringify(s, (k, v) => (k === 'leagueBook' ? undefined : v));
const sha = text => createHash('sha256').update(text).digest('hex').slice(0, 24);

/* ---------- the rule, typed out here once more ON PURPOSE ---------- */
/* The harness judges "the deal follows the weight" against its OWN copy of the table and the shares, never
   against the module it is judging: a control that flattens the module's weights must not flatten the
   expectation with it. */
const wBase = pos => (pos === 'ST' || pos === 'CF' ? 5 : pos === 'LW' || pos === 'RW' ? 3.6 : pos === 'CAM' ? 3
  : pos === 'LM' || pos === 'RM' ? 2.2 : pos === 'CM' ? 1.6 : pos === 'CDM' ? 0.9 : pos === 'GK' ? 0.02 : 0.55);
const W = man => wBase(man.p) * Math.pow(man.r / 70, 2);
const BACKS = new Set(['CB', 'LB', 'RB', 'LWB', 'RWB']);
const MIDS = new Set(['CDM', 'CM', 'CAM', 'LM', 'RM']);
const lineOf = pos => (pos === 'GK' ? 'GK' : BACKS.has(pos) ? 'DEF' : MIDS.has(pos) ? 'MID' : 'ATT');
const LINES = ['ATT', 'MID', 'DEF'];
const PEN = 0.08, FK = 0.04, OG_ONE_IN = 32, ASSIST = 0.7;
/** Of all goals a club with an eleven scores: an own goal, a set piece, open play. */
const P_OG = (1 - PEN - FK) / OG_ONE_IN;
const P_SET = PEN + FK;
const P_OPEN = 1 - P_SET - P_OG;
/** A credited goal (one on a row) has an assist this often: 0.7 of the open play ones. */
const P_ASSIST = ASSIST * P_OPEN / (P_OPEN + P_SET);
const sd = (n, p) => Math.sqrt(Math.max(0, n * p * (1 - p)));
const EMPTY = new Set();
/**
 * A save put down and picked up again. The engine keeps ONE save's world registered at a time (its league
 * memberships after promotions and relegations, its created club): startCareer, startNextSeason and loadCareer
 * register it, playNextEntry and every reader assume it. So a save that is not the one this copy of the engine
 * touched last is woken first, the way loadCareer wakes it. Without this the league of a save read after
 * another career had run could be another league (Everton, relegated in the career before), and its book,
 * stamped by its league, read as nobody's.
 */
const wake = (mod, s) => { mod.cm.registerCustomClub(s.customClub ?? null, s.eraId); mod.cm.registerLeagueOverrides(s.leagueOverrides ?? null); return s; };
const mean = xs => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);
const fmt = (x, d = 1) => (Number.isFinite(x) ? x.toFixed(d) : 'n/a');

/** The taker of an eleven as the harness reads the rule: the heaviest outfield man, the name as the tie break. */
function takerMan(xi) {
  let best = null;
  for (const m of xi) {
    if (m.p === 'GK') continue;
    if (!best || W(m) > W(best) || (W(m) === W(best) && m.n < best.n)) best = m;
  }
  return best;
}
const takerLine = xi => { const t = takerMan(xi); return t ? lineOf(t.p) : null; };

/**
 * How often ALL of `k` goals of this eleven in one match go to one man, when every goal is its own roll
 * (taker rule on): a man takes a goal with the open play share of his weight, plus the set piece share
 * when he is the taker, so k goals are all his with that chance to the power k, summed over the men.
 */
function allToOneMan(xi, k) {
  const outfield = xi.filter(m => m.p !== 'GK');
  const total = outfield.reduce((s, m) => s + W(m), 0);
  const taker = takerMan(xi);
  let p = 0;
  for (const m of outfield) p += Math.pow(P_OPEN * W(m) / total + (m === taker ? P_SET : 0), k);
  return p;
}

/** What one goal of this eleven is expected to be, by line of the man credited (taker rule on). */
function expectedByLine(xi) {
  const out = { ATT: 0, MID: 0, DEF: 0 };
  const outfield = xi.filter(m => m.p !== 'GK');
  const total = outfield.reduce((s, m) => s + W(m), 0);
  for (const m of outfield) out[lineOf(m.p)] += P_OPEN * W(m) / total;
  const t = takerLine(xi);
  if (t) out[t] += P_SET;
  return out;
}

/**
 * One career on one seeded stream: `seasons` whole seasons, every match a quick sim, summers included.
 * Hooks (all optional): start(cm) makes the first state; opened(s, seasonIndex) at each season start;
 * peek(s) before and entry(before, after, result, seasonIndex) after every calendar entry; seasonEnd(s,
 * seasonIndex) the moment before finishSeason. Returns the faces section stream reads: two a season.
 */
function playCareer(mod, club, eraId, seed, hooks = {}, seasons = SEASONS) {
  const { cm } = mod;
  const draw = seeded(seed);
  const realRandom = Math.random;
  const realNow = Date.now;
  Math.random = draw;
  Date.now = () => 1791302400000;
  const faces = [];
  try {
    let s = hooks.start ? hooks.start(cm) : cm.startCareer(club, eraId);
    hooks.opened?.(s, 0);
    for (let season = 0; season < seasons; season++) {
      let guard = 0;
      while (s.week < s.calendar.length && guard++ < 220) {
        const before = hooks.peek ? hooks.peek(s) : null;
        const r = cm.playNextEntry(s, hooks.play ?? { skipHalftime: true });
        hooks.entry?.(before, r.state, r, season);
        s = r.state;
        if (r.kind === 'seasonOver') break;
      }
      faces.push(`${sha(withoutBook(s))}|${draw.calls()}`);
      hooks.seasonEnd?.(s, season);
      if (hooks.stopAfterSeason?.(season)) break;
      const fin = cm.finishSeason(s);
      s = cm.startNextSeason(fin.state);
      faces.push(`${sha(withoutBook(s))}|${draw.calls()}`);
      hooks.opened?.(s, season + 1);
    }
  } finally {
    Math.random = realRandom;
    Date.now = realNow;
  }
  return faces;
}

/* ---------- the sections ---------- */
const SECTIONS = ['stream', 'law', 'names', 'shapes', 'oldsave', 'doors', 'dailies'];
const red = new Map(SECTIONS.map(s => [s, []]));
const checked = new Map(SECTIONS.map(s => [s, 0]));
const fail = (section, message) => { red.get(section).push(message); };
const tick = (section, n = 1) => checked.set(section, checked.get(section) + n);

/* What the fleet adds up, for the gates of section shapes and for the printed numbers. */
const newAcc = () => ({
  byLine: { ATT: 0, MID: 0, DEF: 0, GK: 0 }, rowGoals: 0, assists: 0, og: 0, u: 0, noXiClubWeeks: 0,
  aiObs: { ATT: 0, MID: 0, DEF: 0 }, aiExp: { ATT: 0, MID: 0, DEF: 0 }, aiGoals: 0,
  seasons: [], shortLines: 0, myLeagueMatches: 0, entries: 0, reviews: 0, xiRows: 0, xiAssists: 0, xiOg: 0,
  race: { ATT: 0, MID: 0, DEF: 0, GK: 0, rivalGoals: 0 }, thin: {},
  /* Matches a club with an eleven scored two or more in against another club: how many, in how many every
     goal went to one man, what the harness's own table expects of that, and the variance of that sum. */
  multi: { n: 0, one: 0, exp: 0, vr: 0 },
  /* The book against the report of my own league matches: matches judged, their goal lines, the lines whose
     name that club's roster holds and the lines it does not, set piece lines, assists, and the matches left
     out because the opponent played a second match inside the same entry. */
  report: { matches: 0, lines: 0, known: 0, offRoster: 0, setPieces: 0, assists: 0, twice: 0 },
  /* A league with an odd number of clubs: weeks I did not play in which the rest of the round did, club
     entries that held two matches of one club, and club seasons whose clean sheets the table could not tell. */
  byeWeeks: 0, twoInOne: 0, untold: 0,
});
const played = r => r.w + r.d + r.l;
const rivalsOf = s => s.leagueClubs.filter(c => c !== s.clubName);
const sumRows = (entry, i) => Object.values(entry?.m ?? {}).reduce((n, row) => n + row[i], 0);

/** The goals law for every rival club of a save, right now. Returns the book, or null when there is none. */
function lawNow(mod, s, label, where, section = 'law') {
  const book = mod.cm.leagueBookOf(s);
  tick(section);
  if (!book) { fail(section, `${label} ${where}: the save has no readable book`); return null; }
  const text = JSON.stringify(s.leagueBook);
  if (text.includes('null') || JSON.stringify(JSON.parse(text)) !== text) fail(section, `${label} ${where}: the book is not the same book after a JSON round trip`);
  const table = new Map(s.table.map(r => [r.club, r]));
  for (const club of rivalsOf(s)) {
    tick(section);
    const g = mod.book.bookClubGoals(book, club);
    const gf = table.get(club)?.gf ?? 0;
    if (g.rows + g.og + g.u !== gf) fail(section, `${label} ${where}: ${club} has ${g.rows} on rows + ${g.og} own goals + ${g.u} unnamed, the table says ${gf} for`);
    const entry = book.c[club];
    if (sumRows(entry, 1) > g.rows) fail(section, `${label} ${where}: ${club} has more assists (${sumRows(entry, 1)}) than goals on rows (${g.rows})`);
    if (Object.keys(entry?.m ?? {}).length > mod.book.BOOK_ROWS_PER_CLUB + 2) fail(section, `${label} ${where}: ${club} holds ${Object.keys(entry.m).length} rows`);
  }
  if (book.c[s.clubName]) fail(section, `${label} ${where}: my own club has an entry in the rivals' book`);
  return book;
}

/**
 * One league match of mine: what the book wrote down for my opponent, against the report of that match.
 * The engine credits the report's own lines there and deals nothing but the assist, so every one of these
 * is exact: an own goal line is an own goal of the book; no man gains more than the report names him for;
 * a line whose name is on that club's roster as the save sees it (and is not a man of mine) IS on his row,
 * so only a name the roster does not hold (a shirt number line) can be counted unnamed; the lines on no
 * row are the unnamed count; a goal from the spot or a direct free kick carries no assist; and every man
 * given an assist was on their pitch, by the report's own eleven, substitutions and red cards read the way
 * the engine reads them, when a goal he did not score himself went in.
 * `d` is what the book gained for that club in the entry: goalsBy and assistsBy (name -> count), og, u,
 * rows (how many rows the club holds now), mineBefore and mineNow (my squad's names either side).
 */
function reportAgainstBook(mod, acc, label, where, after, rep, opp, d) {
  const theirGoals = rep.home === after.clubName ? rep.awayGoals : rep.homeGoals;
  const lines = rep.oppScorers ?? [];
  /* A report whose lines do not add up to its score is counted (shortLines) and is not judged here. */
  if (lines.length !== theirGoals) return;
  acc.report.matches += 1;
  acc.report.lines += lines.length;
  tick('names');
  const ogLines = lines.filter(l => l.og).length;
  if (d.og !== ogLines) fail('names', `${label} ${where}: the report has ${ogLines} own goal lines for ${opp}, the book added ${d.og}`);
  const want = new Map();
  for (const l of lines) if (!l.og) want.set(l.name, (want.get(l.name) ?? 0) + 1);
  for (const [name, g] of d.goalsBy) {
    tick('names');
    if (g > (want.get(name) ?? 0)) fail('names', `${label} ${where}: the book gave ${g} to ${name} of ${opp}, the report names him for ${want.get(name) ?? 0}`);
  }
  const roster = mod.cm.oppRosterFor(after, opp, EMPTY);
  let offRow = 0;
  for (const [name, c] of want) {
    tick('names');
    const g = d.goalsBy.get(name) ?? 0;
    offRow += Math.max(0, c - g);
    const known = roster.some(p => p.n === name) && !d.mineBefore.has(name) && !d.mineNow.has(name);
    if (known) acc.report.known += c; else acc.report.offRoster += c;
    if (known && g < c && d.rows < mod.book.BOOK_ROWS_PER_CLUB) fail('names', `${label} ${where}: the report names ${name} of ${opp} for ${c}, he is on its roster, and his row gained ${g}`);
  }
  tick('names');
  if (offRow !== d.u) fail('names', `${label} ${where}: ${offRow} named lines of ${opp} are on no row, the book counted ${d.u} unnamed`);
  /* The assists. */
  const eligible = lines.filter(l => !l.og && !l.penalty && !l.freeKick);
  const setPieces = lines.filter(l => !l.og && (l.penalty || l.freeKick)).length;
  const assists = [...d.assistsBy.values()].reduce((n, x) => n + x, 0);
  acc.report.setPieces += setPieces;
  acc.report.assists += assists;
  tick('names');
  if (assists > eligible.length) fail('names', `${label} ${where}: ${assists} assists for ${opp} on ${eligible.length} goals that may carry one (${setPieces} from the spot or a free kick)`);
  /* Who was on their pitch at a minute, as the engine reads it (oppOnPitchAt and oppAt): a substitution
     counts from the minute AFTER it, a red card from its own minute. */
  const xi0 = (rep.detail?.oppXi ?? []).map(p => p.n);
  const subs = rep.detail?.oppSubs ?? [];
  const reds = (rep.detail?.oppCards ?? []).filter(c => c.kind === 'red');
  const onPitchAt = minute => {
    const names = [...xi0];
    for (const s of subs) {
      if (s.minute >= minute) continue;
      const i = names.indexOf(s.off);
      if (i >= 0) names[i] = s.on;
    }
    return names.filter(n => !reds.some(c => c.name === n && c.minute <= minute));
  };
  for (const [name, n] of d.assistsBy) {
    tick('names');
    const could = eligible.filter(l => l.name !== name && onPitchAt(l.minute).includes(name)).length;
    if (could < n) fail('names', `${label} ${where}: ${name} of ${opp} is given ${n} assist(s), and was on their pitch for ${could} goal(s) he could have set up`);
  }
}

/**
 * The hooks that watch one candidate career: the law after every entry, the clean sheets counted from the
 * TABLE (a club that played and whose goals against did not move kept one), who was credited and whether he
 * could have been, and the sums the shapes are judged on.
 */
function watcher(mod, label, acc, opts = {}) {
  const { cm } = mod;
  let keptByClub = new Map();
  /* Clubs whose clean sheets the table could not tell this season (see the entry hook). */
  let untold = new Set();
  let myKept = 0;
  let leagueId = '';
  const hooks = {
    opened(s, seasonIndex) {
      keptByClub = new Map();
      untold = new Set();
      myKept = 0;
      leagueId = cm.careerLeagueOf(s).id;
      tick('law');
      const book = cm.leagueBookOf(s);
      if (!book) fail('law', `${label}: no readable book at the start of season ${seasonIndex + 1}`);
      else if (Object.keys(book.c).length || book.my.length) fail('law', `${label}: the book of season ${seasonIndex + 1} did not open empty`);
    },
    peek(s) {
      return {
        table: new Map(s.table.map(r => [r.club, { p: played(r), gf: r.gf, ga: r.ga }])),
        mine: cm.mySquadNames(s),
        xi: new Map(rivalsOf(s).map(c => [c, cm.leagueBookEleven(s, c)])),
        book: s.leagueBook ? JSON.parse(JSON.stringify(s.leagueBook)) : null,
      };
    },
    entry(before, after, r, season) {
      acc.entries += 1;
      const where = `season ${season + 1} week ${after.week}`;
      const book = lawNow(mod, after, label, where);
      if (!book || !before.book) return;
      const mineNow = cm.mySquadNames(after);
      const rep = r.kind === 'match' && r.report.competition === 'league' ? r.report : null;
      const myOpp = rep ? (rep.home === after.clubName ? rep.away : rep.home) : null;
      if (myOpp) {
        acc.myLeagueMatches += 1;
        const theirs = r.report.home === after.clubName ? r.report.awayGoals : r.report.homeGoals;
        if (r.report.oppScorers.length !== theirs) acc.shortLines += 1;
        acc.reviews += (r.report.detail?.play ?? []).filter(e => e.kind === 'var').length;
        if (theirs === 0) myKept += 1;
      }
      /* League rounds played in this entry without me: the most matches a rival played, less my own. */
      const meWas = before.table.get(after.clubName);
      const meNow = after.table.find(row => row.club === after.clubName);
      let mostGames = 0;
      for (const club of rivalsOf(after)) {
        const was = before.table.get(club);
        const now = after.table.find(row => row.club === club);
        if (!was || !now || played(now) === was.p) continue;
        const xi = before.xi.get(club);
        const scored = now.gf - was.gf;
        /* Clean sheets by the TABLE, a match at a time. In a league with an even number of clubs one entry
           is one match of a club. With an odd number, one call can play a week I am not part of (the club
           meets somebody else) and then my own match against it: what it conceded to me is the report's
           number, the rest is the other match's. Two matches elsewhere in one entry with something
           conceded cannot be told apart from the table, so that club's count is not judged that season. */
        const games = played(now) - was.p;
        const vsMe = club === myOpp ? 1 : 0;
        const mineOnThem = vsMe ? (rep.home === after.clubName ? rep.homeGoals : rep.awayGoals) : 0;
        const elsewhere = games - vsMe;
        mostGames = Math.max(mostGames, games);
        if (games > 1) acc.twoInOne += 1;
        if (xi) {
          let kept = vsMe && mineOnThem === 0 ? 1 : 0;
          if (elsewhere > 0 && now.ga - was.ga - mineOnThem === 0) kept += elsewhere;
          else if (elsewhere > 1) untold.add(club);
          if (kept) keptByClub.set(club, (keptByClub.get(club) ?? 0) + kept);
        }
        const lg = (acc.thin[leagueId] ??= { weeks: 0, bare: 0, clubs: new Map(), rivals: new Set() });
        lg.weeks += 1;
        lg.rivals.add(club);
        if (!xi) {
          acc.noXiClubWeeks += 1;
          lg.bare += 1;
          if (!lg.clubs.has(club)) {
            /* Why it has none, once a club: how many men its roster holds as this save sees it, and how many keepers. */
            const men = cm.oppRosterFor(after, club, EMPTY);
            lg.clubs.set(club, `${club} ${men.length} men, ${men.filter(p => p.p === 'GK').length} keepers`);
          }
        }
        const entry = book.c[club] ?? { m: {}, og: 0, u: 0 };
        const prior = before.book.c[club] ?? { m: {}, og: 0, u: 0 };
        acc.og += entry.og - prior.og;
        if (xi) acc.xiOg += entry.og - prior.og;
        acc.u += entry.u - prior.u;
        let roster = null;
        const got = { ATT: 0, MID: 0, DEF: 0, GK: 0 };
        /* The most goals one row gained in this entry. */
        let mostOnOneRow = 0;
        /* My opponent of this entry: what its rows gained, by name, for the comparison with the report. */
        const gained = club === myOpp ? { goalsBy: new Map(), assistsBy: new Map() } : null;
        for (const [key, row] of Object.entries(entry.m)) {
          const old = prior.m[key] ?? [0, 0, 0, 0];
          if (row[0] === old[0] && row[1] === old[1] && row[2] === old[2]) continue;
          const bar = key.lastIndexOf('|');
          const name = key.slice(0, bar);
          const pos = key.slice(bar + 1);
          if (gained && row[0] !== old[0]) gained.goalsBy.set(name, (gained.goalsBy.get(name) ?? 0) + row[0] - old[0]);
          if (gained && row[1] !== old[1]) gained.assistsBy.set(name, (gained.assistsBy.get(name) ?? 0) + row[1] - old[1]);
          tick('names');
          /* He is on that club's roster as this save sees it, under that position ... */
          roster ??= cm.oppRosterFor(after, club, EMPTY);
          if (!roster.some(p => p.n === name && p.p === pos)) fail('names', `${label} ${where}: ${name} (${pos}) has a row at ${club} and is not on its roster`);
          /* ... and he was not one of mine when it was written. */
          if (before.mine.has(name) && mineNow.has(name)) fail('names', `${label} ${where}: ${name} is in my squad and was credited for ${club}`);
          got[lineOf(pos)] += row[0] - old[0];
          mostOnOneRow = Math.max(mostOnOneRow, row[0] - old[0]);
          acc.byLine[lineOf(pos)] += row[0] - old[0];
          acc.rowGoals += row[0] - old[0];
          acc.assists += row[1] - old[1];
          if (xi) { acc.xiRows += row[0] - old[0]; acc.xiAssists += row[1] - old[1]; }
        }
        /* My own league match: the book against the report. Only when that match was the opponent's one
           match of the entry (in a league with an odd number of clubs one entry can play my bye week, in
           which they met somebody else, and then my match against them: their rows then hold both). */
        if (gained && games === 1) {
          reportAgainstBook(mod, acc, label, where, after, rep, club, {
            ...gained, og: entry.og - prior.og, u: entry.u - prior.u, rows: Object.keys(entry.m).length, mineBefore: before.mine, mineNow,
          });
        } else if (gained) acc.report.twice += 1;
        /* A match between two other clubs, by a club with an eleven: the deal against the harness's own table. */
        if (club !== myOpp && xi && scored > 0) {
          const exp = expectedByLine(xi);
          for (const line of LINES) { acc.aiObs[line] += got[line]; acc.aiExp[line] += scored * exp[line]; }
          acc.aiGoals += scored;
          /* Every goal is its own roll: when the club scored two or more in this ONE match, did one man take
             them all, and how often should he by the harness's own table for this eleven and this score. */
          if (scored >= 2 && games === 1) {
            const p = allToOneMan(xi, scored);
            acc.multi.n += 1;
            acc.multi.exp += p;
            acc.multi.vr += p * (1 - p);
            if (mostOnOneRow === scored) acc.multi.one += 1;
          }
        }
      }
      if (meWas && meNow) acc.byeWeeks += Math.max(0, mostGames - (played(meNow) - meWas.p));
      opts.onEntry?.(after, r, season);
    },
    seasonEnd(s, season) {
      const where = `at the end of season ${season + 1}`;
      const book = lawNow(mod, s, label, where);
      if (!book) return;
      /* The clean sheets on a club's keeper rows are the matches it conceded nothing in, with an eleven named. */
      for (const club of rivalsOf(s)) {
        if (untold.has(club)) { acc.untold += 1; continue; }
        tick('law');
        const onKeepers = Object.entries(book.c[club]?.m ?? {}).filter(([key]) => key.endsWith('|GK')).reduce((n, [, row]) => n + row[2], 0);
        const kept = keptByClub.get(club) ?? 0;
        if (onKeepers !== kept) fail('law', `${label} ${where}: ${club} kept ${kept} clean sheets by the table, its keepers hold ${onKeepers}`);
      }
      /* Mine: a league clean sheet has at least one keeper of mine on it, and no man more than there were. */
      tick('law');
      const mineAll = book.my.reduce((n, pair) => n + pair[1], 0);
      const most = Math.max(0, ...book.my.map(pair => pair[1]));
      if (most > myKept) fail('law', `${label} ${where}: one of my men holds ${most} league clean sheets, I kept ${myKept}`);
      if (mineAll < myKept) fail('law', `${label} ${where}: my men hold ${mineAll} league clean sheets between them, I kept ${myKept}`);
      seasonBoards(mod, s, book, acc, myKept);
      opts.onSeasonEnd?.(s, season);
    },
  };
  return hooks;
}

const byGoals = (a, b) => b.goals - a.goals || (a.name < b.name ? -1 : a.name > b.name ? 1 : 0);

/**
 * The season's boards, read the moment before finishSeason. The Goals board the BOOK gives (rival rows minus
 * any man now in my squad, plus my men off their own league line) beside the board the OLD RACE gives for
 * the same season of the same save (scorerRace is still written, so the pair needs no second engine).
 * Also the numbers the lead rules on before the round that reads the book: the keepers' clean sheets, and
 * how the back four of a team of the season falls out under two rules.
 */
function seasonBoards(mod, s, book, acc, myKept) {
  const { cm } = mod;
  const mine = cm.mySquadNames(s);
  const rosters = new Map();
  const rosterOf = club => { if (!rosters.has(club)) rosters.set(club, cm.oppRosterFor(s, club, EMPTY)); return rosters.get(club); };
  const posOf = (club, name) => (rosterOf(club).find(p => p.n === name && p.p !== 'GK') ?? rosterOf(club).find(p => p.n === name))?.p ?? null;
  const rivalRows = mod.book.bookRows(book).filter(r => !mine.has(r.name));
  const myRows = s.squad.map(p => ({ club: s.clubName, name: p.name, pos: p.position, goals: p.comp?.league?.goals ?? 0, assists: p.comp?.league?.assists ?? 0, cleanSheets: mod.book.mineSheets(book, p.id), mine: true }));
  const all = [...rivalRows, ...myRows];
  const bookTop = all.filter(r => r.goals > 0).sort(byGoals).slice(0, 10);
  const raceTop = [
    ...(s.scorerRace ?? []).filter(e => !mine.has(e.name)).map(e => ({ name: e.name, club: e.club, goals: e.goals, pos: posOf(e.club, e.name) })),
    ...myRows,
  ].filter(r => r.goals > 0).sort(byGoals).slice(0, 10);
  const att = rows => rows.filter(r => r.pos && lineOf(r.pos) === 'ATT').length;
  /* What the old race made of the same season: how many of the rivals' goals it gave to anybody, and to whom. */
  for (const e of s.scorerRace ?? []) {
    if (mine.has(e.name)) continue;
    const pos = posOf(e.club, e.name);
    acc.race[pos ? lineOf(pos) : 'GK'] += e.goals;
  }
  acc.race.rivalGoals += s.table.filter(r => r.club !== s.clubName).reduce((n, r) => n + r.gf, 0);
  const table = cm.sortedLeagueTable(s).map(r => r.club);
  const place = club => { const i = table.indexOf(club); return i < 0 ? table.length : i; };
  const clubCs = new Map();
  for (const r of rivalRows) if (r.pos === 'GK') clubCs.set(r.club, (clubCs.get(r.club) ?? 0) + r.cleanSheets);
  clubCs.set(s.clubName, myKept);
  const backs = all.filter(r => lineOf(r.pos) === 'DEF');
  const mostOfOne = four => Math.max(0, ...[...four.reduce((m, r) => m.set(r.club, (m.get(r.club) ?? 0) + 1), new Map()).values()]);
  const drafted = [...backs].sort((a, b) => (b.cleanSheets + b.goals + b.assists) - (a.cleanSheets + a.goals + a.assists) || place(a.club) - place(b.club) || (a.name < b.name ? -1 : 1)).slice(0, 4);
  const byDeeds = [...backs].sort((a, b) => (b.goals + b.assists) - (a.goals + a.assists) || (clubCs.get(b.club) ?? 0) - (clubCs.get(a.club) ?? 0) || place(a.club) - place(b.club) || (a.name < b.name ? -1 : 1)).slice(0, 4);
  const keepers = all.filter(r => r.pos === 'GK').sort((a, b) => b.cleanSheets - a.cleanSheets);
  const sheetBoard = [...all].filter(r => r.cleanSheets > 0).sort((a, b) => b.cleanSheets - a.cleanSheets || (a.name < b.name ? -1 : 1)).slice(0, 10);
  acc.seasons.push({
    league: cm.careerLeagueOf(s).id, clubs: s.leagueClubs.length,
    bootBook: bookTop[0]?.goals ?? 0, bootRace: raceTop[0]?.goals ?? 0, bootLine: bookTop[0] ? lineOf(bookTop[0].pos) : null,
    bookAtt: att(bookTop), raceAtt: att(raceTop), bookTop: bookTop.length, raceTop: raceTop.length,
    assistTop: Math.max(0, ...all.map(r => r.assists)), keeperTop: keepers[0]?.cleanSheets ?? 0,
    sheetBoardClubs: new Set(sheetBoard.map(r => r.club)).size, sheetBoardKeepers: sheetBoard.filter(r => r.pos === 'GK').length,
    draftedOfOne: mostOfOne(drafted), deedsOfOne: mostOfOne(byDeeds), deedsBlank: byDeeds.filter(r => r.goals + r.assists === 0).length,
  });
}

/* ---------- the fleet ---------- */
const fleet = [];
CLUBS.forEach(([club, era], ci) => { for (let k = 0; k < SEEDS; k++) fleet.push({ club, era, seed: seedOf(ci, k) }); });

let candidate;
let nobook;
try {
  candidate = await engine('candidate', ROOT, CONTROL ? CONTROLS[CONTROL].patch : []);
  /* The weight control is the one that moves the match itself, so the arm with the book out carries it too:
     it is judged against the base commit, in section stream only. */
  nobook = await engine('nobook', ROOT, CONTROL === 'weight' ? [...BOOK_OFF, ...CONTROLS.weight.patch] : BOOK_OFF);
} catch (e) { cannot(String(e?.message ?? e)); }
if (!candidate.book) cannot('the league book module is not in this tree');
for (const pos of ['GK', 'CB', 'LB', 'RB', 'LWB', 'RWB', 'CDM', 'CM', 'CAM', 'LM', 'RM', 'LW', 'RW', 'CF', 'ST']) {
  if (candidate.cm.groupOf(pos) !== lineOf(pos)) cannot(`the harness reads ${pos} as ${lineOf(pos)}, the engine as ${candidate.cm.groupOf(pos)}`);
}

console.log(`simCmLeagueBook: ${fleet.length} careers x ${SEASONS} seasons (${FULL ? 'full' : 'default'} fleet, seed set ${SEEDSET})${CONTROL ? `, CONTROL ${CONTROL}` : ''}`);
const acc = newAcc();
/* A save from the middle of a season, kept for the purchase probe of section names. */
const midSaves = [];
let tCand = Date.now();
const candFaces = fleet.map((f, i) => playCareer(candidate, f.club, f.era, f.seed, watcher(candidate, `${f.club} (${f.era}, seed ${f.seed})`, acc, {
  onEntry(after, r, season) {
    if (season !== 0 || i >= 4 || after.week < 22 || after.sacked || midSaves.some(m => m.f === f)) return;
    midSaves.push({ f, state: JSON.parse(JSON.stringify(after)) });
  },
})));
tCand = Date.now() - tCand;

/* The law once more with the video referee on. In a match I play a review can chalk a goal off or award a
   penalty, and the score is counted off the lines that are left; the book credits those same lines. The
   engine plays reviews when asked (the switch a player sees is another round's), so it is asked here. */
const accVar = newAcc();
fleet.filter(f => f.era === 'now').slice(0, FULL ? 6 : 2).forEach(f => playCareer(candidate, f.club, f.era, (f.seed ^ 0x5a5a) >>> 0, {
  ...watcher(candidate, `${f.club} (reviews on, seed ${(f.seed ^ 0x5a5a) >>> 0})`, accVar), play: { skipHalftime: true, varReviews: true },
}, 1));
tick('law');
if (!accVar.reviews) fail('law', 'with the video referee on, no league match of mine had a review: the arm proved nothing');
/* And the week I do not play: only a league with an odd number of clubs has one, and the fleet must hold it. */
tick('law');
if (!acc.byeWeeks) fail('law', 'no career of the fleet had a week it did not play while the rest of its league round did: the note call of that week was never run');

/* ---------- section stream: the same careers with the book taken out, and on the base commit ---------- */
let tOff = Date.now();
const offFaces = fleet.map(f => playCareer(nobook, f.club, f.era, f.seed));
tOff = Date.now() - tOff;
const compareFaces = (name, faces) => {
  let same = 0;
  fleet.forEach((f, i) => faces[i].forEach((face, j) => {
    tick('stream');
    if (face === candFaces[i][j]) same += 1;
    else fail('stream', `${f.club} (${f.era}, seed ${f.seed}) ${j % 2 ? 'after the summer of' : 'at the end of'} season ${Math.floor(j / 2) + 1}: ${name} ${face}, candidate ${candFaces[i][j]}`);
  }));
  return same;
};
{
  const n = fleet.length * SEASONS * 2;
  console.log(`stream  ${compareFaces('book out', offFaces)} of ${n} faces (the whole save but the book, and the count of draws) equal with the book taken out`);
  console.log(`        wall time of the fleet: ${(tCand / 1000).toFixed(1)}s with the book and this harness watching every entry, ${(tOff / 1000).toFixed(1)}s with the book out and nothing watching`);
}
{
  /* What the book costs a season with nothing watching: the first careers of the fleet once more on two fresh
     copies, one after the other. Printed, never gated: a shared runner's clock is not a measuring instrument. */
  const sample = fleet.slice(0, 4);
  const timeOn = async mod => { const copy = await mod.again(); const t = Date.now(); sample.forEach(f => playCareer(copy, f.club, f.era, f.seed)); return Date.now() - t; };
  const off = await timeOn(nobook);
  const on = await timeOn(candidate);
  console.log(`        the book's own cost: ${sample.length} careers x ${SEASONS} seasons took ${on}ms with the book and ${off}ms with it out (${fmt(100 * (on - off) / Math.max(1, off))}% more)`);
}
let base = null;
if (BASE) {
  try { base = await engine('base', BASE); } catch (e) { cannot(`the base tree at ${BASE} did not build: ${String(e?.message ?? e)}`); }
  const n = fleet.length * SEASONS * 2;
  console.log(`stream  ${compareFaces('base', fleet.map(f => playCareer(base, f.club, f.era, f.seed)))} of ${n} faces equal to the source of the base commit`);
} else {
  console.log('stream  base arm NOT RUN: set BOOK_BASE to a worktree of the base commit');
}

/* Outside section stream the base commit is a second reference beside the arm with the book out. */
const refs = [['book out', nobook], ...(base && CONTROL !== 'weight' ? [['base', base]] : [])];

/* ---------- section shapes ---------- */
const purposeRise = mean(acc.seasons.map(x => x.bookAtt - x.raceAtt));
{
  /* (i) THE DEAL FOLLOWS THE WEIGHT: of the goals clubs with an eleven scored against each other, the share
     credited to each line against the share the harness works out from the same elevens and its own table. */
  const n = acc.aiGoals;
  for (const line of LINES) {
    tick('shapes');
    const p = acc.aiExp[line] / Math.max(1, n);
    const z = (acc.aiObs[line] - acc.aiExp[line]) / Math.max(1e-9, sd(n, p));
    if (Math.abs(z) > 4) fail('shapes', `${line}: ${acc.aiObs[line]} of ${n} goals between other clubs, the weight says ${fmt(acc.aiExp[line])} (z ${fmt(z, 2)})`);
  }
  tick('shapes');
  if (!(acc.aiObs.ATT > acc.aiObs.MID && acc.aiObs.MID > acc.aiObs.DEF)) fail('shapes', `forwards ${acc.aiObs.ATT}, midfielders ${acc.aiObs.MID}, defenders ${acc.aiObs.DEF}: not in that order`);
  /* (ii) THE POINT OF THE ROUND, paired on the same seasons of the same saves: of the top ten of the Goals
     board, how many more places forwards and wingers hold on the book's board than on the old race's. */
  tick('shapes');
  if (!(purposeRise >= PURPOSE_FLOOR)) fail('shapes', `forwards hold ${fmt(mean(acc.seasons.map(x => x.bookAtt)), 2)} of the top ten on the book's board and ${fmt(mean(acc.seasons.map(x => x.raceAtt)), 2)} on the old race's: a rise of ${fmt(purposeRise, 2)}, under ${PURPOSE_FLOOR}`);
  /* (iii) the assists and the own goals, each against the rule's own share of the run's own counts. Only the
     goals of a club that had an eleven that week are judged: a side with no eleven can still have a goal
     against ME on a row (the report names a man of its roster), and that goal has nobody to set it up, so
     counting it made every one of ten fleets read under the rule (0.606 a goal against 0.614). */
  tick('shapes');
  const za = (acc.xiAssists - P_ASSIST * acc.xiRows) / Math.max(1e-9, sd(acc.xiRows, P_ASSIST));
  if (Math.abs(za) > 4) fail('shapes', `${acc.xiAssists} assists on ${acc.xiRows} credited goals of clubs with an eleven, the rule says ${fmt(P_ASSIST * acc.xiRows)} (z ${fmt(za, 2)})`);
  tick('shapes');
  const named = acc.xiRows + acc.xiOg;
  const zo = (acc.xiOg - P_OG * named) / Math.max(1e-9, sd(named, P_OG));
  if (Math.abs(zo) > 4) fail('shapes', `${acc.xiOg} own goals in ${named} goals of clubs with an eleven, the rule says ${fmt(P_OG * named)} (z ${fmt(zo, 2)})`);
  if (acc.rowGoals < 1500) fail('shapes', `only ${acc.rowGoals} credited goals: too few to judge a share on`);
  /* (iv) EVERY GOAL IS ITS OWN ROLL. Of the matches a club with an eleven scored two or more in against
     another club, the count in which one man took every goal, against the sum of what the harness's own
     table gives each of those elevens and scores (a sum of unlike chances, so its own variance). With the
     goal's index out of the deal key every goal of a side is the same roll and nearly all of them are. */
  tick('shapes');
  const zm = (acc.multi.one - acc.multi.exp) / Math.max(1e-9, Math.sqrt(acc.multi.vr));
  if (Math.abs(zm) > 4) fail('shapes', `one man took every goal in ${acc.multi.one} of ${acc.multi.n} matches a club scored two or more in, the weight says ${fmt(acc.multi.exp)} (z ${fmt(zm, 2)})`);
  if (acc.multi.n < MULTI_FLOOR) fail('shapes', `only ${acc.multi.n} matches with two or more goals by a club with an eleven: too few to judge on (floor ${MULTI_FLOOR})`);
  const all = acc.byLine.ATT + acc.byLine.MID + acc.byLine.DEF + acc.byLine.GK;
  const pct = x => fmt(100 * x / Math.max(1, all));
  console.log(`shapes  credited rival goals ${all}: forwards ${pct(acc.byLine.ATT)}%, midfielders ${pct(acc.byLine.MID)}%, defenders ${pct(acc.byLine.DEF)}%, keepers ${acc.byLine.GK} goals`);
  console.log(`        between other clubs (${n} goals), dealt against the weight: ${LINES.map(l => `${l} ${acc.aiObs[l]} vs ${fmt(acc.aiExp[l])} (z ${fmt((acc.aiObs[l] - acc.aiExp[l]) / Math.max(1e-9, sd(n, acc.aiExp[l] / Math.max(1, n))), 2)})`).join(', ')}`);
  console.log(`        clubs with an eleven: assists ${acc.xiAssists} on ${acc.xiRows} credited goals = ${fmt(acc.xiAssists / Math.max(1, acc.xiRows), 3)} a goal (the rule ${fmt(P_ASSIST, 3)}, z ${fmt(za, 2)}); own goals ${acc.xiOg} of ${named} = ${fmt(100 * acc.xiOg / Math.max(1, named), 2)}% (the rule ${fmt(100 * P_OG, 2)}%, z ${fmt(zo, 2)}); every club: ${acc.assists} assists on ${acc.rowGoals} credited goals = ${fmt(acc.assists / Math.max(1, acc.rowGoals), 3)} a goal`);
  console.log(`        every goal its own roll: one man took every goal in ${acc.multi.one} of ${acc.multi.n} matches a club with an eleven scored two or more in = ${fmt(100 * acc.multi.one / Math.max(1, acc.multi.n))}% (the weight says ${fmt(100 * acc.multi.exp / Math.max(1, acc.multi.n))}%, z ${fmt(zm, 2)})`);
  console.log(`        unnamed goals ${acc.u} (club weeks with no named eleven: ${acc.noXiClubWeeks}); my league matches ${acc.myLeagueMatches}, reports whose lines did not add up to the score: ${acc.shortLines}`);
  for (const [league, t] of Object.entries(acc.thin)) {
    if (t.bare) console.log(`        no named eleven in ${league}: ${t.bare} of ${t.weeks} club weeks, ${t.clubs.size} of ${t.rivals.size} rival clubs seen (${[...t.clubs.values()].sort().slice(0, 6).join('; ')}${t.clubs.size > 6 ? '; ...' : ''})`);
  }
  console.log(`        top ten of the Goals board held by forwards and wingers: ${fmt(mean(acc.seasons.map(x => x.bookAtt)), 2)} on the book, ${fmt(mean(acc.seasons.map(x => x.raceAtt)), 2)} on the old race, rise ${fmt(purposeRise, 2)} (floor ${PURPOSE_FLOOR}) over ${acc.seasons.length} seasons`);
}

/* ---------- section names: the man I bought gains nothing more for the club he left ---------- */
{
  let probes = 0;
  const skipped = [];
  for (const { f, state } of midSaves) {
    const { cm } = candidate;
    const book = cm.leagueBookOf(wake(candidate, state));
    if (!book) { skipped.push(`${f.club}: no book`); continue; }
    const mine = cm.mySquadNames(state);
    const target = candidate.book.bookRows(book).filter(r => !mine.has(r.name) && r.pos !== 'GK').sort(byGoals)[0];
    const like = target && (state.squad.find(p => p.position === target.pos && !state.xiIds.includes(p.id)) ?? state.squad.find(p => !state.xiIds.includes(p.id)));
    if (!target || target.goals < 3 || !like) { skipped.push(`${f.club}: ${!target ? 'no rival row' : target.goals < 3 ? `the best rival is on ${target.goals}` : 'no reserve to copy'}`); continue; }
    probes += 1;
    const s0 = wake(candidate, JSON.parse(JSON.stringify(state)));
    /* He signs: a man of that name is in my squad from now on (a copy of one of my reserves under his name). */
    s0.squad.push({ ...JSON.parse(JSON.stringify(like)), id: 'p-probe-1229', name: target.name });
    const key = `${target.name}|${target.pos}`;
    const rowAt = st => JSON.stringify(st.leagueBook?.c?.[target.club]?.m?.[key] ?? null);
    const before = rowAt(s0);
    const realRandom = Math.random;
    const realNow = Date.now;
    Math.random = seeded(f.seed ^ 0x51229);
    Date.now = () => 1791302400000;
    try {
      let s = s0;
      let clubGoals = -(s.table.find(r => r.club === target.club)?.gf ?? 0);
      for (let k = 0; k < 12 && s.week < s.calendar.length; k++) {
        const r = cm.playNextEntry(s, { skipHalftime: true });
        s = r.state;
        if (r.kind === 'seasonOver') break;
      }
      clubGoals += s.table.find(r => r.club === target.club)?.gf ?? 0;
      tick('names');
      if (rowAt(s) !== before) fail('names', `${f.club}: I signed ${target.name} off ${target.club} at week 22 on ${before}; twelve entries on, his row there reads ${rowAt(s)} (${target.club} scored ${clubGoals} in them)`);
      lawNow(candidate, s, `${f.club} with ${target.name} signed`, 'twelve entries on', 'names');
    } finally {
      Math.random = realRandom;
      Date.now = realNow;
    }
  }
  tick('names');
  if (!probes) fail('names', 'no purchase was probed: no mid season save with a rival scorer on three goals');
  tick('names');
  if (!acc.report.matches || !acc.report.known || !acc.report.assists) fail('names', `the book was held against the report of ${acc.report.matches} league matches of mine, ${acc.report.known} lines naming a roster man, ${acc.report.assists} assists: nothing to judge on`);
  console.log(`names   ${checked.get('names')} checks; ${probes} purchases probed of ${midSaves.length} saves kept (the best scorer of the rivals signed at week 22, twelve entries played on)${skipped.length ? `; not probed: ${skipped.join('; ')}` : ''}`);
  console.log(`        the book against the report of ${acc.report.matches} league matches of mine: ${acc.report.lines} goal lines, ${acc.report.known} naming a man of that club's roster (each on his row), ${acc.report.offRoster} naming nobody its roster holds, ${acc.report.setPieces} from the spot or a free kick, ${acc.report.assists} assists (each by a man on their pitch); ${acc.report.twice} matches not judged, the opponent played twice in the entry`);
}

/* ---------- shared by the last three sections ---------- */
const store = new Map();
globalThis.localStorage = { getItem: k => store.get(k) ?? null, setItem: (k, v) => store.set(k, String(v)), removeItem: k => store.delete(k), clear: () => store.clear() };
/** Run `fn` on a seeded stream with the clock fixed; hands it the counter of draws. */
function onStream(seed, fn) {
  const draw = seeded(seed);
  const realRandom = Math.random;
  const realNow = Date.now;
  Math.random = draw;
  Date.now = () => 1791302400000;
  try { return fn(draw); } finally { Math.random = realRandom; Date.now = realNow; }
}
const whole = s => sha(JSON.stringify(s));

/* ---------- section oldsave: a save with no book finishes its season as it always did ---------- */
{
  /** A save played to the end of its season on one engine: a face after every entry, the board, the summary, the next season. */
  const finishOn = (mod, raw, seed, viaLoad) => onStream(seed, draw => {
    let s;
    if (viaLoad) { store.clear(); store.set(mod.cm.SAVE_KEY, raw); s = mod.cm.loadCareer(); } else s = wake(mod, JSON.parse(raw));
    if (!s) return null;
    const faces = [whole(s)];
    let sawBook = 'leagueBook' in s;
    let guard = 0;
    while (s.week < s.calendar.length && guard++ < 220) {
      const r = mod.cm.playNextEntry(s, { skipHalftime: true });
      s = r.state;
      faces.push(`${whole(s)}|${draw.calls()}`);
      if ('leagueBook' in s) sawBook = true;
      if (r.kind === 'seasonOver') break;
    }
    const board = JSON.stringify(mod.cm.goldenBootTable(s, 12));
    const fin = mod.cm.finishSeason(s);
    return { faces, sawBook, board, boot: JSON.stringify(fin.summary.goldenBoot ?? null), next: mod.cm.startNextSeason(fin.state) };
  });
  const saves = [
    { name: 'the committed save of Round 1052 (Sevilla)', raw: fs.readFileSync(path.join(ROOT, 'scripts/data/cmOldSave1052Fixture.json'), 'utf8'), viaLoad: true, seed: 0x7001 },
    { name: 'the committed second tier save (Valencia)', raw: fs.readFileSync(path.join(ROOT, 'scripts/data/cmSecondTierOldSaveFixture.json'), 'utf8'), viaLoad: true, seed: 0x7002 },
  ];
  /* And two written in this run by the reference engine itself: twenty entries into a season, then saved. */
  const writer = await refs[refs.length - 1][1].again();
  for (const [club, seed] of [['Everton', 0x7003], ['Southampton', 0x7004]]) {
    const raw = onStream(seed, () => {
      let s = writer.cm.startCareer(club);
      for (let k = 0; k < 20; k++) s = writer.cm.playNextEntry(s, { skipHalftime: true }).state;
      return JSON.stringify(s);
    });
    saves.push({ name: `${club}, twenty entries in, written by the ${refs[refs.length - 1][0]} engine`, raw, viaLoad: false, seed: seed + 16 });
  }
  const followUps = [];
  for (const [refName, ref] of refs) {
    const candCopy = await candidate.again();
    const refCopy = await ref.again();
    for (const save of saves) {
      if (JSON.parse(save.raw).leagueBook !== undefined) cannot(`${save.name} carries a league book: it is not an old save`);
      const a = finishOn(candCopy, save.raw, save.seed, save.viaLoad);
      const b = finishOn(refCopy, save.raw, save.seed, save.viaLoad);
      tick('oldsave');
      if (!a || !b) { fail('oldsave', `${save.name}: did not load (${a ? 'candidate ok' : 'candidate null'}, ${b ? `${refName} ok` : `${refName} null`})`); continue; }
      if (a.sawBook) fail('oldsave', `${save.name}: a league book appeared in a season that started without one`);
      const firstOff = a.faces.findIndex((face, i) => face !== b.faces[i]);
      tick('oldsave', a.faces.length);
      if (a.faces.length !== b.faces.length || firstOff >= 0) fail('oldsave', `${save.name}: the save differs from the ${refName} engine's from entry ${firstOff} of ${a.faces.length}`);
      tick('oldsave', 2);
      if (a.board !== b.board) fail('oldsave', `${save.name}: the golden boot board differs from the ${refName} engine's`);
      if (a.boot !== b.boot) fail('oldsave', `${save.name}: the summary's golden boot differs from the ${refName} engine's`);
      if (refName === refs[0][0]) followUps.push({ save, next: a.next });
    }
  }
  /* The season after: a book from its first round, and it obeys the law. */
  for (const { save, next } of followUps) {
    onStream(save.seed + 99, () => {
      let s = wake(candidate, next);
      const opened = candidate.cm.leagueBookOf(s);
      tick('oldsave');
      if (!opened || Object.keys(opened.c).length) fail('oldsave', `${save.name}: the next season did not open with an empty book`);
      for (let k = 0; k < 8 && s.week < s.calendar.length; k++) {
        s = candidate.cm.playNextEntry(s, { skipHalftime: true }).state;
        lawNow(candidate, s, save.name, `next season, entry ${k + 1}`, 'oldsave');
      }
    });
  }
  /* A book that cannot be read is no book: a string, an array, another league order's, last season's own. */
  {
    /* One copy makes the save. Then each damaged book, and the same save with NO book at all, is played four
       entries on a copy of the candidate evaluated afresh for it (the engine numbers its youth players, its
       press questions and its messages as it goes, so only two copies with the same past are comparable byte
       for byte). Both sides are the candidate, so this holds whatever a control does to the match stream. */
    const maker = await candidate.again();
    const makeOn = mod => onStream(0x7010, () => {
      let s = mod.cm.startCareer('Everton');
      let guard = 0;
      while (s.week < s.calendar.length && guard++ < 220) { const r = mod.cm.playNextEntry(s, { skipHalftime: true }); s = r.state; if (r.kind === 'seasonOver') break; }
      const last = s.leagueBook ? JSON.parse(JSON.stringify(s.leagueBook)) : null;
      let next = mod.cm.startNextSeason(mod.cm.finishSeason(s).state);
      for (let k = 0; k < 4; k++) next = mod.cm.playNextEntry(next, { skipHalftime: true }).state;
      return { last, next };
    });
    const made = makeOn(maker);
    const plain = JSON.parse(JSON.stringify(made.next));
    delete plain.leagueBook;
    if (!made.last || !made.next.leagueBook || made.last.s === made.next.leagueBook.s) cannot('last season and this one carry the same stamp, so a stale book cannot be told apart here');
    const good = JSON.stringify(made.next.leagueBook);
    const holed = JSON.parse(good.replace(/\[(\d+),(\d+),(\d+),(\d+)\]/, '[$1,$2,null,$4]'));
    /* The third entry: can the match week tell? It asks a stamp and a type and nothing more (the full walk
       on every result was measured at 60 percent of a season once), so a book with one holed row is still
       written to in a match week. The READER refuses it whole, which is what a screen will ask, and the
       engine never makes such a row itself: a row is four numbers from the moment it exists. */
    const damaged = [['a string', 'the book', true], ['an array', [made.next.leagueBook], true], ["last season's own", made.last, true], ['a row with a hole', holed, false], ['a number', 7, true]];
    const fourOn = (mod, from) => onStream(0x7011, () => { let s = wake(mod, from); for (let k = 0; k < 4; k++) s = mod.cm.playNextEntry(s, { skipHalftime: true }).state; return s; });
    for (const [what, value, weekSeesIt] of damaged) {
      const v = JSON.parse(JSON.stringify(made.next));
      v.leagueBook = value;
      const text = JSON.stringify(value);
      tick('oldsave', weekSeesIt ? 3 : 2);
      if (text === good) cannot(`the damage "${what}" changed nothing`);
      if (maker.cm.leagueBookOf(v) !== null) fail('oldsave', `a save whose book is ${what} reads as having a book`);
      const on = fourOn(await candidate.again(), v);
      /* A book the match week cannot read is played as the save with no book at all. The holed one it can
         read and does write to, so it is played beside the same save with its book whole: the rest of the
         save must not know the difference (and the two sides then deal alike, whatever a control does). */
      const off = fourOn(await candidate.again(), JSON.parse(JSON.stringify(weekSeesIt ? plain : made.next)));
      if (withoutBook(on) !== withoutBook(off)) fail('oldsave', `a save whose book is ${what} does not play the four entries the same save with no book plays`);
      if (weekSeesIt && JSON.stringify(on.leagueBook) !== text) fail('oldsave', `a save whose book is ${what} had it written into: ${String(JSON.stringify(on.leagueBook)).slice(0, 80)}`);
    }
  }
  console.log(`oldsave ${checked.get('oldsave')} checks: ${saves.length} saves with no book finished on the candidate and on ${refs.map(r => `the ${r[0]} engine`).join(' and ')}, the season after each, and five unreadable books`);
}

/* ---------- section doors: the two ways into a season that is already running ---------- */
{
  const { cm, cal } = candidate;
  /** From here to the end of the season, the law after every entry. */
  const playOut = (s, label) => {
    let guard = 0;
    while (s.week < s.calendar.length && guard++ < 220) {
      const r = cm.playNextEntry(s, { skipHalftime: true });
      s = r.state;
      if (r.kind === 'seasonOver') break;
      lawNow(candidate, s, label, `week ${s.week}`, 'doors');
    }
    return lawNow(candidate, s, label, 'at the end of the season', 'doors');
  };
  /* The takeover from the picker (startMidSeason), at each of its three entries: the run-in was played by
     this engine, so the job starts with a whole book. */
  Object.keys(cal.MIDSEASON_ENTRY).forEach((entry, i) => onStream(0x7100 + i, () => {
    const club = ['Everton', 'Bayern Munich', 'Southampton'][i % 3];
    const s = cal.startMidSeason(cm.startCareer(club), entry);
    const label = `the ${entry} takeover at ${club}`;
    const book = lawNow(candidate, s, label, 'at the handover', 'doors');
    tick('doors');
    if (book && !Object.keys(book.c).length) fail('doors', `${label}: the book is empty at week ${s.week}, the run-in was not written down`);
    playOut(s, label);
  }));
  /* The job you applied for, joined today (joinClubNow), in season one and in season three: the new club's
     run-in is played as a fresh season one career and then takes the number of the season you were in. */
  for (const [seasonsFirst, from, to] of [[0, 'Everton', 'Ajax'], [2, 'Bayern Munich', 'Arsenal']]) {
    /* The manager has to still be in the job when the letter comes: the first of four seeds that gets there. */
    const reach = seed => onStream(seed, () => {
      let s = cm.startCareer(from);
      for (let k = 0; k < seasonsFirst && !s.sacked; k++) {
        let guard = 0;
        while (s.week < s.calendar.length && guard++ < 220) { const r = cm.playNextEntry(s, { skipHalftime: true }); s = r.state; if (r.kind === 'seasonOver') break; }
        if (!s.sacked) s = cm.startNextSeason(cm.finishSeason(s).state);
      }
      for (let k = 0; k < 16 && !s.sacked; k++) s = cm.playNextEntry(s, { skipHalftime: true }).state;
      return s.sacked || s.clubName !== from || s.season !== seasonsFirst + 1 ? null : JSON.stringify(s);
    });
    let raw = null;
    let seed = 0x7200 + seasonsFirst * 16;
    for (let tries = 0; tries < 4 && !raw; tries++) raw = reach(seed += 1);
    tick('doors');
    if (!raw) { fail('doors', `no career at ${from} reached week 16 of season ${seasonsFirst + 1} in the job on four seeds`); continue; }
    onStream(seed + 0x100, () => {
      const s = wake(candidate, JSON.parse(raw));
      const label = `the job at ${to} joined from ${from} in season ${s.season}`;
      s.jobHunt = { open: { club: to, league: '', tier: 1, season: s.season, week: s.week, matchesLeft: 0, roll: 0, status: 'accepted' }, cooldowns: [], sentSeason: s.season, sent: 1, summerMove: null };
      const joined = cal.joinClubNow(s);
      tick('doors', 2);
      if (!joined) { fail('doors', `${label}: joinClubNow returned nothing`); return; }
      if (joined.season !== s.season || joined.clubName !== to) fail('doors', `${label}: joined ${joined.clubName} in season ${joined.season}`);
      const book = lawNow(candidate, joined, label, 'at the handover', 'doors');
      if (book && !Object.keys(book.c).length) fail('doors', `${label}: the book is empty at week ${joined.week}, the run-in was not written down`);
      playOut(joined, label);
    });
  }
  console.log(`doors   ${checked.get('doors')} checks: three takeovers and two joined jobs (season one and season three), the law at the handover and after every entry to the end of the season`);
}

/* ---------- section dailies: a daily carries no book, and its state is what it was ---------- */
{
  const HOT_DATES = ['2026-10-10', '2026-10-12', '2026-10-27', '2027-01-30'];
  const DEADLINE_DATES = ['2026-10-10', '2026-10-18', '2026-11-09'];
  const hotOn = (mod, date) => onStream(0x7300, () => {
    const { hs, cm } = mod;
    const seen = [];
    const booked = [];
    const see = (what, st) => { seen.push(`${what} ${whole(st)}`); if (st && 'leagueBook' in st) booked.push(what); };
    const setup = hs.dailyHotSeat(date);
    let run = hs.startHotSeat({ club: setup.club, seed: setup.seed, daily: date });
    see('at the start', run.state);
    let guard = 0;
    while (!run.verdict && guard++ < 40) {
      run = hs.pendingPress(run) ? hs.answerHotSeatPress(run, 0) : hs.playHotSeatMatch(run, 'balanced', null);
      see(`after step ${guard}`, run.state);
    }
    /* Handed over to Club Manager: a season in flight with no book, played on. */
    let s = wake(mod, hs.handoverState(run));
    see('handed over', s);
    for (let k = 0; k < 3 && s.week < s.calendar.length; k++) { s = cm.playNextEntry(s, { skipHalftime: true }).state; see(`handed over, entry ${k + 1}`, s); }
    return { club: setup.club, seen, booked };
  });
  const deadlineOn = (mod, date) => onStream(0x7301, () => {
    const run = mod.dd.startDeadlineDay(mod.dd.dailyDeadlineDay(date));
    return { seen: [`at the start ${whole(run.state)}`], booked: 'leagueBook' in run.state ? ['at the start'] : [] };
  });
  for (const [kind, dates, deal] of [['Hot Seat', HOT_DATES, hotOn], ['Deadline Day', DEADLINE_DATES, deadlineOn]]) {
    const mine = await candidate.again();
    const got = dates.map(date => deal(mine, date));
    got.forEach((g, i) => { tick('dailies'); if (g.booked.length) fail('dailies', `${kind} ${dates[i]}: the state carries a league book ${g.booked[0]}${g.booked.length > 1 ? ` and at ${g.booked.length - 1} later points` : ''}`); });
    for (const [refName, ref] of refs) {
      const theirs = await ref.again();
      dates.forEach((date, i) => {
        const want = deal(theirs, date).seen;
        tick('dailies', want.length);
        const firstOff = want.findIndex((face, j) => face !== got[i].seen[j]);
        if (want.length !== got[i].seen.length || firstOff >= 0) fail('dailies', `${kind} ${date}: the state is not the ${refName} engine's ${firstOff >= 0 ? want[firstOff].replace(/ [0-9a-f]+$/, '') : 'all the way'}`);
      });
    }
  }
  console.log(`dailies ${checked.get('dailies')} checks: ${HOT_DATES.length} Hot Seat dates played to a verdict, handed over and played on, ${DEADLINE_DATES.length} Deadline Day dates, each state byte equal to ${refs.map(r => `the ${r[0]} engine's`).join(' and ')}`);
}

/* ---------- the printed numbers: for the lead's rulings, never gated here ---------- */
function printBoards(title, seasons) {
  console.log(title);
  for (const league of [...new Set(seasons.map(x => x.league))]) {
    const xs = seasons.filter(x => x.league === league);
    console.log(`        ${league.padEnd(12)} ${xs[0].clubs} clubs, ${String(xs.length).padStart(2)} seasons: top scorer mean ${fmt(mean(xs.map(x => x.bootBook)))} (${xs.map(x => x.bootBook).join(' ')}), old race mean ${fmt(mean(xs.map(x => x.bootRace)))}, most assists mean ${fmt(mean(xs.map(x => x.assistTop)))}, leading keeper's clean sheets mean ${fmt(mean(xs.map(x => x.keeperTop)))}`);
  }
  for (const [what, xs] of [['38 game leagues', seasons.filter(x => x.clubs === 20)], ['34 game leagues', seasons.filter(x => x.clubs === 18)], ['46 game leagues', seasons.filter(x => x.clubs === 24)], ['28 game leagues (15 clubs)', seasons.filter(x => x.clubs === 15)]]) {
    if (!xs.length) continue;
    const boots = xs.map(x => x.bootBook);
    const m = mean(boots);
    const spread = Math.sqrt(mean(boots.map(b => (b - m) ** 2)));
    console.log(`        ${what}: ${xs.length} seasons, top scorer mean ${fmt(m, 2)}, standard deviation ${fmt(spread, 2)}, standard error ${fmt(spread / Math.sqrt(xs.length), 2)}; old race mean ${fmt(mean(xs.map(x => x.bootRace)), 2)}`);
  }
}
printBoards(`boards  by league, the book against the old race on the same seasons (penalties and free kicks to the taker)`, acc.seasons);
{
  const xs = acc.seasons;
  const lines = ['ATT', 'MID', 'DEF'].map(l => `${l} ${xs.filter(x => x.bootLine === l).length}`).join(', ');
  console.log(`        the top scorer was a: ${lines} (of ${xs.length} seasons)`);
  const raced = acc.race.ATT + acc.race.MID + acc.race.DEF + acc.race.GK;
  console.log(`        the old race on the same seasons: ${raced} of ${acc.race.rivalGoals} rival goals given to anybody (${fmt(100 * raced / Math.max(1, acc.race.rivalGoals))}%), of those forwards ${fmt(100 * acc.race.ATT / Math.max(1, raced))}%, midfielders ${fmt(100 * acc.race.MID / Math.max(1, raced))}%; the book names a man for ${fmt(100 * acc.rowGoals / Math.max(1, acc.rowGoals + acc.og + acc.u))}% and marks ${acc.og} own goals and ${acc.u} unnamed`);
  console.log(`        a Clean sheets board of every man (keepers and defenders): its top ten holds men of ${fmt(mean(xs.map(x => x.sheetBoardClubs)), 2)} clubs and ${fmt(mean(xs.map(x => x.sheetBoardKeepers)), 2)} keepers on average`);
  console.log(`        a back four picked by clean sheets + goals + assists: ${fmt(mean(xs.map(x => x.draftedOfOne)), 2)} men of one club on average; by goals + assists (club clean sheets, then table place, to split): ${fmt(mean(xs.map(x => x.deedsOfOne)), 2)}, with ${fmt(mean(xs.map(x => x.deedsBlank)), 2)} of the four on no goal and no assist`);
}
if (process.env.BOOK_MEASURE === '1' && !CONTROL) {
  /* The same fleet with penalties and direct free kicks dealt by the weight like any other goal. */
  const byWeight = await engine('notaker', ROOT, [{ file: ENGINE, from: 'export const CM_BOOK_TAKER = true;', to: 'export const CM_BOOK_TAKER = false;' }]);
  const other = newAcc();
  fleet.forEach(f => playCareer(byWeight, f.club, f.era, f.seed, {
    seasonEnd(s) { const book = byWeight.cm.leagueBookOf(s); if (book) seasonBoards(byWeight, s, book, other, 0); },
  }));
  printBoards('boards  the same seasons with penalties and free kicks dealt by the weight (CM_BOOK_TAKER false)', other.seasons);
}

/* ---------- the verdict ---------- */
console.log(`law     ${acc.byeWeeks} weeks I did not play in which the rest of the round did (a league with an odd number of clubs), ${acc.twoInOne} club entries holding two matches of one club, ${acc.untold} club seasons whose clean sheets the table could not tell`);
console.log(`law     ${checked.get('law')} checks over ${acc.entries} entries of ${fleet.length} careers, and ${accVar.entries} entries of ${accVar.seasons.length} seasons with the video referee on (${accVar.myLeagueMatches} league matches of mine, ${accVar.reviews} reviews, ${accVar.shortLines} reports whose lines did not add up to the score)`);
let total = 0;
for (const s of SECTIONS) {
  const xs = red.get(s);
  total += xs.length;
  console.log(`${xs.length ? 'RED  ' : 'green'} ${s.padEnd(8)} ${checked.get(s)} checks${xs.length ? `, ${xs.length} failed` : ''}`);
  for (const m of xs.slice(0, 5)) console.log(`        ${m}`);
}
const secs = Math.round((Date.now() - T0) / 1000);
if (CONTROL) {
  const want = CONTROLS[CONTROL].red;
  const allowed = CONTROLS[CONTROL].also ?? [];
  const others = SECTIONS.filter(s => s !== want && !allowed.includes(s) && red.get(s).length);
  const withIt = allowed.filter(s => red.get(s).length);
  const fired = red.get(want).length > 0 && others.length === 0;
  console.log(fired
    ? `simCmLeagueBook: CONTROL ${CONTROL} FIRED: section ${want} went red (${red.get(want).length} failures)${withIt.length ? `, with ${withIt.join(', ')} as it must` : ''} and no other section did (${secs}s)`
    : `simCmLeagueBook: CONTROL ${CONTROL} DID NOT FIRE as it must: ${want} has ${red.get(want).length} failures, other red sections [${others.join(', ')}] (${secs}s)`);
  process.exit(fired ? 1 : 3);
}
console.log(total === 0
  ? `simCmLeagueBook: green, ${SECTIONS.length} sections, ${fleet.length} careers x ${SEASONS} seasons (${secs}s)`
  : `simCmLeagueBook: ${total} FAILURE(S) (${secs}s)`);
process.exit(total === 0 ? 0 : 1);

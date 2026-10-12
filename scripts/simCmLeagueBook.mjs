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
 *            clean sheets fit the ones I kept. Every season opens with an empty book. One career plays
 *            a league of fifteen clubs, so the week I do not play (its results are noted at a call of
 *            their own) is under the law too; one entry can then hold two matches of a club, and where
 *            the table cannot tell which of the two was the clean sheet that club is judged on a range
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
 *            table says for that eleven and that score, inside four standard deviations; (v) Round 1306,
 *            WHO is given a rival's assist: of the assists clubs with an eleven were given in matches
 *            between other clubs, the count on rows of forwards, midfielders and defenders against what
 *            the harness's own copy of the goal table and of the assist table says for each eleven,
 *            inside four binomial standard deviations
 *   oldsave  REWRITTEN in Round 1306 for the rule that replaced "a whole season or nothing": a save that
 *            reaches a match week with no fit book of its season starts one there (ensureLeagueBook).
 *            (i) five saves with no book (the two committed fixtures, loaded through loadCareer; two
 *            written in the run twenty entries into a season; one parked at the first week of a season):
 *            the load itself gives no book; the first entry opens a LATE book whose round is the next
 *            league entry's, opened on the rivals' goals for and on my men's league lines as they stood,
 *            or, for the parked one, an ordinary whole book; the law after every entry to the season's
 *            end; the save but its book byte equal, entry by entry and draw for draw, to the reference
 *            engines', with the same board and summary; the season after opens an empty whole book; and,
 *            with BOOK_BASE, the base commit's reader accepts the late book (a rolled back release reads
 *            it). (ii) the six unreadable books (a string, an array, a number, last season's own, a row
 *            with a hole, a club entry with no rows map): each is replaced at the next entry by exactly
 *            the late book the same save with no book is given, the week never throws, the save but its
 *            book plays the same entries; and with the repair off (the noBook path) the match week's own
 *            guard holds as it did. (iii) the stale book: ten entries on the candidate and three on an
 *            engine from before the book leave a book that reads and does not fit, and the next entry
 *            replaces it. (iv) over the whole fleet no career that started its season with a book ends
 *            an entry on a late one. Added by the fix pass of Round 1306: a sixth save in (i), the parked
 *            one with a goalless first round written into its table, which must get a LATE book (the
 *            repair asks whether a league match was played, not whether a goal was scored); and (vi),
 *            the transition a live save makes: seasons in play written by the base commit WITH its book
 *            are carried on by the candidate to the season's end, the book taken as it is (it reads, fits
 *            and is whole), the law after every entry, never reopened late, and the rows of clubs with no
 *            eleven growing where the base commit named nobody. ON EVERY RUN from two committed recordings
 *            (scripts/data/cmBookSaveHerthaFixture.json and cmBookSaveEvertonFixture.json, the saves the
 *            engine of Release AW wrote, each held by its sha256), and with BOOK_BASE from three more the
 *            base tree writes in the run
 *   doors    the takeover from the picker at its three entries and the job joined today in season one
 *            and in season three: a whole book at the handover and the law after every entry to the end
 *   dailies  Manager Hot Seat (six dates, two of them across the transfer window, played to a verdict,
 *            handed over to Club Manager and played on) and Deadline Day (three dates): no state of a
 *            daily ever carries a book, every state but its book is byte equal to the reference engines'
 *            for the same date, and the career handed over holds none and then a readable late book
 *            after each of its first entries in Club Manager (Round 1306)
 *   thin     Round 1306: a club that cannot field a named eleven is dealt over THE MEN ITS ROSTER HAS in
 *            the places a full eleven would give them, with an empty shirt (rated at the club's strength,
 *            never given a row) in every place it cannot fill. (i) at each season's end the clean sheets
 *            on the rows of such a club's keepers are the matches it conceded nothing in while its roster
 *            held a keeper, counted from the table, the ones against me included; (ii) every row such a
 *            club gains is a man of its roster under that position, and no row key of any club begins
 *            with the empty shirt's mark; (iii) the deal follows the weight for such a club too: of its
 *            goals against other clubs, the count on named rows against what the harness's OWN copy of
 *            the partial eleven and of the table says, inside four standard deviations; (iv) what was
 *            not meant to change (needs BOOK_BASE): the entry of every rival club that had an eleven all
 *            season is byte equal, at each season's end, to the base commit's; (v) printed: the share on
 *            record and the top scorer of each league of the fleet. The first law for these clubs is
 *            section law's, as for every club. Added by the fix pass of Round 1306 (two reviewers found
 *            that nothing held them): (vi) WHO is given a clean sheet: in every single match of such a
 *            club, its rostered keeper and each named man of its partial eleven's back line gain one when
 *            it conceded nothing and no other row gains any, and at each season's end, for EVERY club (a
 *            club with an eleven all season under section law), only a keeper's row and a row of the back
 *            line hold a clean sheet and no man of the back line holds more than his club can have kept
 *            by the table; (vii) one way to take an eleven: at each season's end the module's partial
 *            eleven of every roster that fields an eleven is the engine's own eleven (the same keeper,
 *            the same ten, no shirt), and of every roster that does not it is the harness's own reading,
 *            man for man and shirt for shirt in order. And (iii) now fails when there is no variance to
 *            judge a share on, instead of passing unasked
 *   boards   Round 1306, the pure reader (src/lib/clubManagerLeagueBoards.ts; the harness builds its
 *            input from the save) and, since Round 1311, the engine's own door to it (leagueBoardsOf): its
 *            input is the harness's, field for field, its share, round and keepers are the reader's, and it
 *            is null exactly where the book is unreadable or does not add up. (i) at every season's end of the fleet
 *            the book fits the table and is whole; (ii) each of the three boards, its top ten and its
 *            whole order, is the harness's own reading of the rule typed here once more, my best man is
 *            where that order puts him, and no board holds a man on nought, a man twice, a rival row
 *            under a name of my squad or, on Clean sheets, anybody but a keeper; (iii) the fleet once
 *            more with every reader called before every entry: the whole save but the book and the count
 *            of draws are the watched fleet's, and the save is the same text before and after the
 *            readers (leagueBoardsOf among them); (iv) the module's source and the two cards'
 *            (LeagueLeadersCard.tsx and SeasonHonoursCard.tsx), comments stripped, hold no Math.random,
 *            Date.now, new Date or localeCompare; and printed for the lead: the share and the keepers on record a
 *            league, each board's leader, and the three boards of three leagues after a full season
 *   awards   Round 1311, the season's honours, by the harness's own reading of the rule (a whole book with
 *            at least AWARD_FLOOR_RULED in 100 rival goals on record decides): (i) on every season's end of
 *            the fleet, and of a late arm (two careers whose book is taken off ten entries in), a season the
 *            book decides has the Goals board's first as its golden boot and the first of each board in its
 *            awards with the share on record, the same awards on the season's record; any other season has
 *            no awards and the old race's golden boot; (iii) with BOOK_BASE, on a season the book does not
 *            decide the WHOLE summary and record are the base commit's, on one it decides all of them but
 *            the four moved fields (goldenBoot, playerOfSeason, ballonDor, awards); step 5: the team of the
 *            season is a keeper, four defenders, four midfielders and two forwards by the harness's own
 *            lines, nobody twice, every man on a row or in my squad; (ii) a seven season career holds the
 *            winners on seven records and the team on the newest five only; (v) the back four's mean men of
 *            one club under BACK_FOUR_LINE (on a fleet of at least BACK_FOUR_MIN_TEAMS); and printed, a league:
 *            the shares at the season's end, how many the book decided, how often one of mine won the boot.
 *            The stream face leaves those four fields and each record's awards out, and nothing else.
 *   facts    Round 1311, the fleet's top scorers beside the real leagues' (scripts/data/cmLeagueBookFacts.json,
 *            USED figures only, read by the harness's own reading of that file's rule): printed by season
 *            length, and one band bound on 38 match seasons (see the section; it cannot tell the taker rule
 *            on from off)
 * Outside section stream "the reference engines" are the engine with the book out and, with BOOK_BASE,
 * the base commit; each pair is played on two FRESH copies of the bundles asked the same things in the
 * same order, because the engine numbers its youth players, press questions and messages as it goes.
 * And a save that is not the one a copy touched last is WOKEN first (wake below): the engine keeps one
 * save's league memberships registered at a time, the way loadCareer leaves them.
 *
 * NEGATIVE CONTROLS. BOOK_CONTROL=<name> patches the bundle's copy of the source (never a file on disk;
 * the anchor must occur exactly as often as stated or the run refuses) and the run then exits 1 with
 * FIRED only if the named section went red and no other did (four controls name the sections that go red,
 * or may, with theirs for the same reason, and say so on their last line when one did):
 *   weight        a striker weighs 8, not 5 (needs BOOK_BASE)         -> stream, and shapes with it
 *   mathrandom    the scorer pick reads Math.random                  -> stream (and since the repair of
 *                 Round 1306 oldsave and dailies with it: a save with no book and a hot seat career handed
 *                 over now keep a late book, so the same draw moves them off the book out engine too)
 *   dropmine      my own league match is not noted                   -> law, and with it the sections that
 *                 check the law or read the rows (names, oldsave, doors, thin, boards), and shapes since
 *                 the repair: the book is opened again after every match of mine, so most of a club's
 *                 goals are unnamed counts and the shares by line fall short of the weight
 *   byeweek       the results of a week I do not play (a league with an odd number of clubs) are not
 *                 noted                                              -> law (shapes, thin, boards and
 *                 oldsave may go with it: those goals are missing from the rows the shares and the clean
 *                 sheets are counted on, and the week after the bye the repair opens the book again)
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
 *   twoman        the deal is the old race's: 42 and 26 in a hundred to the two best rated forwards or
 *                 midfielders, the rest to nobody, and no taker      -> shapes
 *   flat          every outfield man weighs the same                 -> shapes
 *   penassist     a penalty or a free kick is paid an assist         -> shapes
 *   noog          no goal is ever an own goal                        -> shapes
 *   keyindex      the goal's own index is dropped from the deal key, so every goal of a side in one
 *                 match is the same roll: one man's brace every time  -> shapes
 *   redeal        loadCareer opens a book for a save that has none   -> oldsave
 *   hurtentry     a club entry with no rows map (a save edited by hand) is handed to the match week as
 *                 it is, and the week throws on it                   -> oldsave
 *   seasonstamp   the season's number is put back into the stamp     -> doors (and oldsave (vi) with it
 *                 since the second fix pass of Round 1306: a stamp with the season's number in it makes
 *                 each of the two committed recordings another season's book, so the reader refuses both;
 *                 with BOOK_BASE thin (iv) goes with it as well, as it does for stampv2: the stamp is in
 *                 every deal key)
 *   strip         the Hot Seat's strip of the book is taken out      -> dailies
 *   stripdeadline Deadline Day's strip is taken out                  -> dailies
 *   assistgoalweight the assist is shared out by the GOAL table (the mutation a reviewer of Round 1229
 *                 found nothing held)                                -> shapes (v)
 *   nofill        a partial eleven gets no empty shirt: every goal of a thin club lands on the men its
 *                 roster has                                         -> thin (iii)
 *   shirtrow      an empty shirt is given a row like any man         -> thin (ii)
 *   thinsheet     a thin club's clean sheet against ME is not written down -> thin (i)
 *   thinall       every club is routed through the partial eleven: the same men in another order, so
 *                 the same roll names another man (needs BOOK_BASE)  -> thin (iv)
 *   noreopen      the repair trusts whatever the match week's reader accepts, the law unasked: a stale
 *                 book is kept                                       -> oldsave (iii), and (ii) with it
 *   fitlive       the repair asks the match week's reader and then the law: the holed book is kept for
 *                 the season and the entry with no rows map throws   -> oldsave (ii), both books
 *   latezero      a late book opens every club on nought unnamed     -> oldsave (i): the law after the
 *                 first entry of a save with no book, and (ii), (iii) with it
 *   alwayslate    a book opened before any league match is a late one -> oldsave (i), the parked save
 *   hotseatbook1  the Hot Seat's walk past a window drops the noBook option -> dailies
 *   hotseatbook2  the Hot Seat's setup drops it                      -> dailies
 *   hotseatbook3  the Hot Seat's match drops it                      -> dailies
 *   (redeal and hurtentry above still hold what they held: the load opens no book; the match week's
 *   guard, now reached with the repair off, never throws on an entry with no rows map)
 *   readerdraw    the reader draws from Math.random once a board     -> boards (iii) and (iv) (stream with
 *                                                                        it since Round 1311: the engine reads
 *                                                                        leaders at a season's end)
 *   readerwrite   the reader turns the book's list of my clean sheets round in place -> boards (iii)
 *   The six of the fix pass of Round 1306, each for a check that pass added (a control may name the words
 *   its failures must hold, so red for another reason is not that control firing):
 *   thinbacks     a thin club's clean sheet goes to EVERY man of its partial eleven's outfield, the
 *                 filter for the back line dropped (the reviewer's mutation that every gate let through)
 *                                                                    -> thin (vi), the season's end
 *   nobacks       a thin club's clean sheet goes to its keeper and to no man of its back line
 *                                                                    -> thin (vi), the single match
 *   allbacks      the clean sheet of a club WITH an eleven goes to all ten of its outfield men
 *                                                                    -> law (thin (vi) at the season's
 *                 end, under section law for a club with an eleven; with BOOK_BASE thin (iv) goes with
 *                 it, those entries are not the base commit's)
 *   places433     the partial eleven is taken four, three, three     -> thin (vii), and (iii) with it
 *   goallesswhole the repair opens a whole book when no GOAL has been scored (the wording the builder
 *                 left for "no league match played")                 -> oldsave (i), the goalless save
 *   stampv2       the stamp gains a mark, so every book an earlier build wrote is another season's
 *                                                                    -> oldsave (vi) (with BOOK_BASE thin
 *                 (iv) goes with it: the stamp is in every deal key, so the same roll names another man)
 * The second fix pass of Round 1306 added one:
 *   novar         the match is never told which reviews to play, so the arm with the video referee on
 *                 sees none                                          -> law, the floor of that arm
 * Round 1311 added three:
 *   awardlate     the awards are read from a late book                -> awards (oldsave with it: every late
 *                                                                        book save of oldsave then takes its
 *                                                                        golden boot from the book)
 *   awardthin     the awards are read from a book under the floor     -> awards (oldsave with it: a carried
 *                                                                        save that closes under the floor is
 *                                                                        then given awards)
 *   bookleak      every goal of a side to its taker                    -> facts (shapes and thin with it: the
 *                                                                        deal no longer follows the weight)
 *   teamsheets    the back four picked on clean sheets plus goals plus assists -> awards (v); run it on the
 *                                                                        full fleet, the only one judged
 *   nocap         the team of the season is never let go               -> awards (ii)
 * Round 1311 derived two red lists again (remote check r1311-f1b): dropmine leaves no book that adds up, so
 * no season is decided by it, no team is named and no 38 match season reaches section facts (awards and facts
 * go red with it); twoman leaves a third of every side's goals unnamed, so every league falls under the
 * awards floor and section awards has no team to judge (awards goes red with it).
 * dropmine and byeweek break the first law, so section boards (i) goes red with them as well, and since
 * the repair of Round 1306 so does oldsave (iv): a law broken in one entry is mended at the top of the next
 * by a late book, which is exactly a book reopened in a healthy fleet. In the entry that reopens it the
 * watcher still holds the law and counts the late book, and compares nothing else: the new book is not the
 * old one plus what the week added, so a gain read across the two is no gain (measured on the first run
 * after step (d): byeweek's eight "names" failures were all of that kind, a row that "gained" nought and an
 * own goal count that "added" minus one). A healthy fleet has no such entry, which is oldsave (iv).
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
 *   BOOK_MEASURE=leagues ...                              Round 1306: plays MEASURE_SEEDS (2) careers of one
 *                                                         season in every league of every era and prints, a
 *                                                         league, the share of rival goals on record and the
 *                                                         best rival total under each rule; gates nothing
 *   BOOK_MEASURE=floor ...                                Round 1311: MEASURE_SEEDS careers of one season in
 *                                                         every league and prints, a league, the share on
 *                                                         record at the season's end, who settled the golden
 *                                                         boot and how often one of mine won it; gates nothing
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
const BOARDS = 'src/lib/clubManagerLeagueBoards.ts';
/** Round 1311: the league leaders card, read by section boards (iv) only. */
const LEADERS_CARD = 'src/components/club-manager/LeagueLeadersCard.tsx';
/** Round 1311 step 5: the season's honours card, read by section boards (iv) beside it. */
const HONOURS_CARD = 'src/components/club-manager/SeasonHonoursCard.tsx';
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
/* Round 1306: the one call that starts a book for a save that has none (ensureLeagueBook, at the top of the
   match week). The engine with the book out never makes it, so it is an engine from before the book. */
const ENSURE_CALL = '  if (!opts?.noBook) ensureLeagueBook(state);';
const BOOK_OFF = [
  { file: ENGINE, from: OPEN_LINE, to: '  void openBook;' },
  { file: ENGINE, from: NOTE_MINE, to: '' },
  { file: ENGINE, from: NOTE_RESULT, to: '', n: 2 },
  { file: ENGINE, from: ENSURE_CALL, to: '  void ensureLeagueBook;' },
];
/* The Hot Seat's three calls of the match week, each with the option that keeps a daily without a book. */
const HOT_CALL = who => `playNextEntry(${who}, { skipHalftime: true, noCoach: true, noBook: true })`;
const HOT_CALL_BOOKED = who => `playNextEntry(${who}, { skipHalftime: true, noCoach: true })`;
/* The line of noteBookSide that picks a club's eleven (null for a club that cannot field a named one). */
const SIDE_XI = '  const xi = pickOppSquad(roster)?.xi ?? null;';
/* Round 1311: the line of the reader module that says whether the book decides the awards. */
const DECIDES = '  return bookIsWhole(input.book) && bookShare(input.book, input.clubs).share >= AWARD_FLOOR;';
/* Round 1311: the order the team of the season's back four is picked in, and the control's other reading. */
const TEAM_DEF_ORDER = "  const defs = pick('DEF', TEAM_LINES.DEF, (a, b) => deeds(b) - deeds(a) || (clubSheets.get(b.club) ?? 0) - (clubSheets.get(a.club) ?? 0) || a.place - b.place || b.rating - a.rating || text(a.name, b.name) || text(a.club, b.club));";
const TEAM_DEF_SHEETS = "  const defs = pick('DEF', TEAM_LINES.DEF, (a, b) => (b.sheets + deeds(b)) - (a.sheets + deeds(a)) || a.place - b.place || b.rating - a.rating || text(a.name, b.name) || text(a.club, b.club));";
/* The line of the reader module that hands a board back (leaders). */
const LEADERS_RETURN = '  return order.slice(0, Math.max(0, limit)).map(m => boardMan(m, kind));';
/* The line of noteBookMine that credits a report's line and decides whether its assist is dealt. */
const MINE_GATE = '    if (!creditGoal(book, opp, man) || !man || line.penalty || line.freeKick) return;';
const SCORER_PICK = ': pickWeighted(outfield, m => goalWeight(m.p, m.r), scorerRoll);';
/* The fix pass of Round 1306. The line that says who of a thin club's partial eleven is given its clean
   sheet beside the keeper, and the line of noteBookSide that hands out the clean sheet of a club with an
   eleven (the anchor of control cleanside too). */
const THIN_BACKS = "const thinBacks = (outfield: readonly BookMan[]): BookMan[] => outfield.filter(p => groupOf(p.p) === 'DEF');";
const XI_SHEET = '  if (against === 0) creditCleanSheet(book, club, bookKeeper(xi), bookBacks(xi));';
const TWO_MAN = ": ((men, roll) => { const two = men.filter(m => !['CB', 'LB', 'RB', 'LWB', 'RWB'].includes(m.p)).sort((a, b) => b.r - a.r); return roll < 0.42 ? (two[0] ?? null) : roll < 0.68 ? (two[1] ?? null) : null; })(outfield, scorerRoll);";

/** name -> { patch: [{ file, from, to, n? }], red: the section that must go red, needs?: 'base', also?: sections
 *  that go red with it for the same reason and are allowed to (the law is checked in four sections, and the
 *  weight table is what the deal is judged against) } */
const CONTROLS = {
  weight: { patch: [{ file: WEIGHT, from: "pos === 'ST' || pos === 'CF' ? 5 :", to: "pos === 'ST' || pos === 'CF' ? 8 :" }], red: 'stream', needs: 'base', also: ['shapes', 'thin', 'awards'] },
  mathrandom: { patch: [{ file: BOOK, from: '    const scorerRoll = rng();', to: '    const scorerRoll = Math.random();' }], red: 'stream', also: ['oldsave', 'dailies', 'awards'] },
  dropmine: { patch: [{ file: ENGINE, from: NOTE_MINE, to: '' }], red: 'law', also: ['names', 'oldsave', 'doors', 'thin', 'boards', 'shapes', 'awards', 'facts'] },
  byeweek: { patch: [{ file: ENGINE, from: NOTE_BYE, to: '' }], red: 'law', also: ['shapes', 'thin', 'boards', 'oldsave'] },
  cleanside: { patch: [{ file: ENGINE, from: '  if (against === 0) creditCleanSheet(book, club, bookKeeper(xi), bookBacks(xi));', to: '  if (goals === 0) creditCleanSheet(book, club, bookKeeper(xi), bookBacks(xi));' }], red: 'law' },
  bought: { patch: [{ file: ENGINE, from: '  const notTheirs = mySquadNames(state);', to: '  const notTheirs = NO_NAMES;' }], red: 'names' },
  wrongman: { patch: [{ file: ENGINE, from: '    let man: OppXiLine | null = bookNamed(there, line.name) ?? bookNamed(theirs, line.name);', to: "    let man: OppXiLine | null = there.find(p => p.p !== 'GK') ?? bookNamed(theirs, line.name);" }], red: 'names' },
  unnamed: { patch: [{ file: ENGINE, from: MINE_GATE, to: `    man = null;\n${MINE_GATE}` }], red: 'names' },
  offbyone: { patch: [{ file: ENGINE, from: '  const lines = oppScorers.slice(0, oppGoals);', to: '  const lines = oppScorers.slice(0, Math.max(0, oppGoals - 1));' }], red: 'names' },
  penassistmine: { patch: [{ file: ENGINE, from: MINE_GATE, to: '    if (!creditGoal(book, opp, man) || !man) return;' }], red: 'names', also: ['shapes'] },
  assistbench: { patch: [{ file: ENGINE, from: '    const assist = dealAssist(`${key}|${i}`, man, there, rules);', to: '    const assist = dealAssist(`${key}|${i}`, man, theirs, rules);' }], red: 'names' },
  twoman: { patch: [{ file: BOOK, from: SCORER_PICK, to: TWO_MAN }, { file: BOOK, from: '  const taker = rules.taker ? takerOf(outfield) : null;', to: '  const taker = null;' }], red: 'shapes', also: ['thin', 'awards'] },
  flat: { patch: [{ file: BOOK, from: SCORER_PICK, to: ': pickWeighted(outfield, () => 1, scorerRoll);' }], red: 'shapes', also: ['thin'] },
  penassist: { patch: [{ file: BOOK, from: "assistFrom(rng, kind === 'open' ? scorer : null, outfield, rules);", to: "assistFrom(rng, kind === 'og' ? null : scorer, outfield, rules);" }], red: 'shapes' },
  noog: { patch: [{ file: BOOK, from: ": ownGoalTagged(`${key}|${i}|og`, rules.ownGoalOneIn) ? 'og' : 'open';", to: ": 'open';" }], red: 'shapes' },
  keyindex: { patch: [{ file: BOOK, from: '    const rng = keyedRng(`${key}|${i}`);', to: '    const rng = keyedRng(key);' }], red: 'shapes' },
  hurtentry: { patch: [{ file: BOOK, from: '  return isRecord(have) && isRecord(have.m) ? (have as unknown as BookClub) : null;', to: '  return have as unknown as BookClub;' }], red: 'oldsave' },
  redeal: { patch: [{ file: ENGINE, from: '    ensureRoles(parsed);', to: '    ensureRoles(parsed);\n    if (!parsed.leagueBook) openLeagueBook(parsed);' }], red: 'oldsave' },
  seasonstamp: { patch: [{ file: ENGINE, from: '`${leagueId}|${bookSalt(state.leagueClubs)}`;', to: '`${state.season}|${leagueId}|${bookSalt(state.leagueClubs)}`;' }], red: 'doors', also: ['oldsave', 'thin'], mentions: ['has no readable book'] },
  strip: { patch: [{ file: HOT, from: '  delete s.leagueBook;', to: '' }], red: 'dailies' },
  stripdeadline: { patch: [{ file: DEADLINE, from: '    delete state0.leagueBook;', to: '' }], red: 'dailies' },
  assistgoalweight: { patch: [{ file: BOOK, from: 'm => assistWeight(m.p, m.r), pick);', to: 'm => goalWeight(m.p, m.r), pick);' }], red: 'shapes' },
  nofill: { patch: [{ file: BOOK, from: '    for (let i = 0; i < open[line]; i += 1) outfield.push({ n: `?${++shirts}`, p: SHIRT_POS[line], r: rating, e: true });', to: '    void shirts;' }], red: 'thin' },
  shirtrow: { patch: [{ file: BOOK, from: '  if (man.e) return null;', to: '' }], red: 'thin' },
  thinsheet: { patch: [{ file: ENGINE, from: '    if (thin) creditCleanSheet(book, opp, thin.keeper, thinBacks(thin.outfield));', to: '    void thin;' }], red: 'thin' },
  noreopen: { patch: [{ file: ENGINE, from: '  if (book && bookFits(book, clubs)) return;', to: '  if (liveBook(state.leagueBook, stamp)) return;' }], red: 'oldsave', mentions: ['the stale book'] },
  fitlive: { patch: [{ file: ENGINE, from: '  const book = readBook(state.leagueBook, stamp);', to: '  const book = liveBook(state.leagueBook, stamp);' }], red: 'oldsave', mentions: ['a row with a hole', 'a club entry with no rows'] },
  latezero: { patch: [{ file: BOOK, from: '    book.c[c.club] = { m: {}, og: 0, u: c.gf };', to: '    book.c[c.club] = { m: {}, og: 0, u: 0 };' }], red: 'oldsave' },
  alwayslate: { patch: [{ file: ENGINE, from: '  if (state.table.every(r => r.w + r.d + r.l === 0)) {', to: '  if (state.table.length < 0) {' }], red: 'oldsave', mentions: ['parked'] },
  hotseatbook1: { patch: [{ file: HOT, from: HOT_CALL('run.state'), to: HOT_CALL_BOOKED('run.state') }], red: 'dailies' },
  hotseatbook2: { patch: [{ file: HOT, from: HOT_CALL('s'), to: HOT_CALL_BOOKED('s') }], red: 'dailies' },
  hotseatbook3: { patch: [{ file: HOT, from: HOT_CALL('ready'), to: HOT_CALL_BOOKED('ready') }], red: 'dailies' },
  /* Round 1311: the awards are read from a late book, or from a book under the floor. awardlate moves the
     golden boot of every late book save of section oldsave too, which judges it against the old race. */
  /* Round 1311 step 4: every goal of a side to its taker, a leak the band of section facts must catch. */
  bookleak: { patch: [{ file: BOOK, from: "      : kind !== 'open' && taker ? taker", to: '      : taker ? taker' }], red: 'facts', also: ['shapes', 'thin'] },
  awardlate: { patch: [{ file: BOARDS, from: DECIDES, to: '  return bookShare(input.book, input.clubs).share >= AWARD_FLOOR;' }], red: 'awards', also: ['oldsave'], mentions: ['a late book'] },
  awardthin: { patch: [{ file: BOARDS, from: DECIDES, to: '  return bookIsWhole(input.book);' }], red: 'awards', also: ['oldsave'], mentions: ['under the floor'] },
  teamsheets: { patch: [{ file: BOARDS, from: TEAM_DEF_ORDER, to: TEAM_DEF_SHEETS }], red: 'awards', mentions: ['back four'] },
  nocap: { patch: [{ file: ENGINE, from: '  state.history = keepTeams(state.history);', to: '' }], red: 'awards', mentions: ['team on'] },
  /* Since Round 1311 the engine itself reads leaders at a season's end (goldenBootTable and finishSeason, on a
     season the book decides), so a draw in it moves the match stream as well: derived on r1311-s2b and r1311-s4. */
  readerdraw: { patch: [{ file: BOARDS, from: LEADERS_RETURN, to: `  void Math.random();\n${LEADERS_RETURN}` }], red: 'boards', also: ['stream'] },
  readerwrite: { patch: [{ file: BOARDS, from: LEADERS_RETURN, to: `  input.book.my.reverse();\n${LEADERS_RETURN}` }], red: 'boards' },
  thinall: { patch: [{ file: ENGINE, from: SIDE_XI, to: '  const xi = null as OppXiLine[] | null; void pickOppSquad;' }], red: 'thin', needs: 'base' },
  thinbacks: { patch: [{ file: ENGINE, from: THIN_BACKS, to: 'const thinBacks = (outfield: readonly BookMan[]): BookMan[] => [...outfield];' }], red: 'thin', mentions: ['neither a keeper nor of the back line'] },
  nobacks: { patch: [{ file: ENGINE, from: THIN_BACKS, to: 'const thinBacks = (outfield: readonly BookMan[]): BookMan[] => outfield.filter(() => false);' }], red: 'thin', mentions: ['was given no clean sheet'] },
  allbacks: { patch: [{ file: ENGINE, from: XI_SHEET, to: "  if (against === 0) creditCleanSheet(book, club, bookKeeper(xi), xi.filter(p => p.p !== 'GK'));" }], red: 'law', also: ['thin'], mentions: ['neither a keeper nor of the back line'] },
  places433: { patch: [{ file: BOOK, from: 'const PLACES = { DEF: 4, MID: 4, ATT: 2 } as const;', to: 'const PLACES = { DEF: 4, MID: 3, ATT: 3 } as const;' }], red: 'thin', mentions: ['is not that eleven'] },
  goallesswhole: { patch: [{ file: ENGINE, from: '  if (state.table.every(r => r.w + r.d + r.l === 0)) {', to: '  if (state.table.every(r => r.gf === 0)) {' }], red: 'oldsave', mentions: ['goalless'] },
  stampv2: { patch: [{ file: ENGINE, from: '`${leagueId}|${bookSalt(state.leagueClubs)}`;', to: '`${leagueId}|${bookSalt(state.leagueClubs)}|v2`;' }], red: 'oldsave', also: ['thin'], mentions: ['written by the base commit'] },
  novar: { patch: [{ file: ENGINE, from: '  const varKinds = cmVarKindsAsked(varReviews);', to: '  const varKinds = cmVarKindsAsked(varReviews).slice(0, 0);' }], red: 'law', mentions: ['under the floor of'] },
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
/* The arm that plays the law with the video referee on: the first two clubs of the list (both in a league
   that uses reviews), three seeds each, on the default fleet and on the full one alike. MEASURED on GitHub
   runners over seed sets 0 to 4 (remote check r1306-f1, the full fleet, which already played these six):
   19 33 35 39 34 reviews in 228 league matches of mine. The floor is six tenths of the lowest of the five,
   the rule ASSIST_FLOOR follows: 11. Control novar (no review is ever asked for) reads none. */
const VAR_ARM = [0, 1].map(ci => [...ALL_CLUBS[ci], ci]);
const VAR_ARM_SEEDS = 3;
const VAR_REVIEW_FLOOR = 11;
/* THE SAVE MOST PLAYERS HOLD ON THE DAY A RELEASE SHIPS, oldsave (vi): a season in play with the book the
   commit before the round wrote. [club, entries played, the seed of the stream it was written on, the
   committed recording, its sha256]. Hertha BSC's league has seventeen rival clubs with no named eleven,
   Everton's none. HOW THE RECORDINGS WERE TAKEN, and how one is taken again: a run with BOOK_BASE at a
   worktree of the commit before the round (c9a1f86a, whose engine files are those of Release AW as it
   went live) and BOOK_WRITE_SAVES=<folder> writes the two saves there as it carries them on, and prints
   each one's bytes and sha256; the files are committed as written and the sha256 is typed here. */
const BOOK_SAVES = [
  ['Hertha BSC', 12, 0x7030, 'scripts/data/cmBookSaveHerthaFixture.json', '380727ea490315f80f478959722633fbec23bd33e03d42e785d55a561d4b393e'],
  ['Everton', 12, 0x7032, 'scripts/data/cmBookSaveEvertonFixture.json', '110d237ec964ec69176c09351ed56e093a86bf42e7eadd107ff46ab29e6c9fb8'],
];

/* Each run its own temp folder: two bundling harnesses at once must never share one. */
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'cm-book-'));
/* And each run takes its folder away again when it ends, however it ends (a control's exit included). */
process.on('exit', () => { try { fs.rmSync(TMP, { recursive: true, force: true }); } catch { /* a folder left behind fails nothing */ } });
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
    has(BOARDS) ? `export * as boards from ${P(BOARDS)};` : 'export const boards = null;',
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
    return { cm: copy.cm, cal: copy.cal, hs: copy.hs, dd: copy.dd, book: copy.book, boards: copy.boards, again };
  };
  return { cm: mod.cm, cal: mod.cal, hs: mod.hs, dd: mod.dd, book: mod.book, boards: mod.boards, again };
}

/*
 * MEASURED on GitHub runners, 2026-10-10, five seed sets each (SEEDSET 0 to 4), the tree as at 332c8ce7
 * (remote checks r1229-fx4 and r1229-fx5; docs/audits/ROUND-1229-NOTES.md has the boards). The fleet as it
 * is since the review: the full one is 27 careers x 2 seasons (54 seasons, about 47,000 rival goals), the
 * default 5 x 2, each with one career in a league of fifteen clubs.
 *   stream   108 of 108 faces equal with the book out on every full set and 20 of 20 on every default one,
 *            and 108 of 108 equal to the base commit (f78037dc, seed set 0). Controls: mathrandom moved 20
 *            of 20 default faces, weight 15 of 20.
 *   shapes (i)   the three lines against the harness's own table, z: full fleets within -2.02 to 1.40,
 *            default fleets within -1.83 to 2.26 (gate 4). Controls: twoman, forwards at z -37 and
 *            defenders at z -25 (none scores at all); flat, forwards at z -39 and defenders at z +60.
 *   shapes (ii)  forwards and wingers in the top ten of the Goals board, book minus old race: full fleets
 *            3.74 3.85 4.15 4.04 3.89, default fleets 3.30 3.60 3.20 3.60 3.90. Under the twoman control
 *            (the book dealing as the old race did, no taker) the default fleets read 0.00 -0.60 -0.10
 *            -0.20 -0.60. PURPOSE_FLOOR 1.5 sits 1.70 under the lowest healthy fleet and 1.50 over the
 *            highest control, about five of either's standard deviations (0.3 each) from each.
 *   shapes (iii) assists a credited goal of a club with an eleven, against 0.614, z: full 0.54 -0.58 -2.71
 *            -0.75 -0.74, default 0.53 -1.45 -1.15 -0.47 0.84 (gate 4; control penassist z 13.3). Read
 *            over EVERY club the same fleets gave 0.593 to 0.609, all ten under the rule: a club with no eleven
 *            can have a goal against me on a row, with nobody on its pitch to set it up, and the first
 *            cut of this check counted those. Own goals of a club with an eleven against 2.75 in a
 *            hundred, z: full 0.12 -0.73 0.60 -1.36 -2.04, default 0.68 -1.24 1.23 -1.08 0.29 (gate 4;
 *            control noog z -12.6).
 *   shapes (iv)  matches a club with an eleven scored two or more in against another club: 9,626 to 9,732
 *            a full fleet, 1,651 to 1,865 a default one; one man took every goal in 12.0 to 13.8 in a
 *            hundred of them where the harness's own table says 12.4 to 13.1, z: full -0.09 -0.36 0.70
 *            -0.70 0.76, default 0.29 0.10 -1.34 0.50 1.09 (gate 4). Control keyindex: about 92 in a
 *            hundred, z 99.1 102.4 99.4 101.3 105.4 on the five default sets. MULTI_FLOOR 1,000 is six
 *            tenths of the lowest default fleet; at that count the control would still stand near z 75.
 *   law      53,592 to 54,080 checks over 2,354 to 2,381 entries on the full fleet, none red; with the
 *            video referee on, 268 to 277 entries, 162 to 183 reviews in 228 league matches of mine, no
 *            report whose lines did not add up to its score. The league of fifteen clubs: 12 weeks I did
 *            not play in which the rest of the round did on a full fleet (4 on a default one), 130 club
 *            entries holding two matches of one club (26), 22 club seasons whose clean sheets are judged
 *            on a range (4). Controls: dropmine 5,055 failures, cleanside 132, byeweek 365 411 505 502
 *            325 on the five default sets.
 *   names    about 107,000 checks on the full fleet, each credit on its club's roster and not in my squad;
 *            the purchase probe fires on 4 of 4 purchases under the bought control. The book against the
 *            report, full fleet, seed set 0: 1,958 league matches of mine, 1,871 goal lines, 1,755 naming
 *            a man of that club's roster and every one of them on his row, 62 naming nobody its roster
 *            holds, 233 from the spot or a free kick, 827 assists, 10 matches not judged (the opponent
 *            played twice in the entry); a default fleet holds 366 matches and about 400 lines. Controls
 *            on the five default sets, failures: wrongman 654 to 825, unnamed 402 to 476, offbyone 278 to
 *            299, penassistmine 34 to 46, assistbench 69 to 89.
 *   oldsave, doors, dailies   exact comparisons, no band: redeal 4 failures, hurtentry 1 (the match week
 *            throws on the entry with no rows map), seasonstamp 32, strip 8, stripdeadline 6.
 * Every one of the 21 controls FIRED for its own section and no other on seed set 0 (r1229-fx4), and the
 * nine that are new or re-measured since the review on seed sets 1 to 4 as well (r1229-fx5).
 * Wall time: full fleet about 118 seconds, with BOOK_BASE and BOOK_MEASURE about 195; default fleet about 45.
 *
 * ROUND 1306, MEASURED on GitHub runners, 2026-10-11, five seed sets each (remote checks r1306-b1, r1306-c1
 * and r1306-e1; the base commit is 8d3f54c6, which keeps a book itself, so the saves of section oldsave are
 * written by the engine with the book out).
 *   thin (iii)   goals of clubs with no eleven against other clubs on a named row, against the harness's own
 *            partial eleven, z: full fleets 0.37 -0.37 -1.25 0.12 0.16 (9,260 to 11,030 goals, 68.5 to 69.3
 *            in a hundred named), default fleets -2.03 1.25 1.78 -0.70 -0.11 (2,041 to 2,565 goals), gate 4.
 *            Control nofill: every such goal lands on a named man, 1 failure, the z itself. THIN_FLOOR 1,200
 *            is six tenths of the lowest default fleet.
 *   thin (i)     keeper rows of 141 to 161 club seasons with no eleven a full fleet (29 to 36 a default one),
 *            49 to 60 of their clean sheets kept against me (8 to 25). Control thinsheet: 17 failures.
 *   thin (ii)    control shirtrow: 2,282 failures (every row under an empty shirt's mark).
 *   thin (iv)    671 of 671 entries of clubs with an eleven all season byte equal to the base commit's on the
 *            full fleet, 114 of 114 on the default one (seed set 0). Control thinall: 7 failures.
 *   stream       108 of 108 and 20 of 20 faces equal to the base commit's (seed set 0): step (b) moved no match.
 *   shapes (ii)  measured again, because thin clubs' forwards are on the Goals board now: rise full 4.35 4.41
 *            4.57 4.52 4.54, default 4.10 4.10 4.40 4.70 4.30. PURPOSE_FLOOR 1.5 stays, further under than before.
 *   shapes (v)   who is given an assist, the three lines against the harness's own two tables, z (forwards,
 *            midfielders, defenders): full (0.63 0.59 -1.46) (0.81 0.22 -1.23) (0.35 -0.79 0.54) (0.08 -0.40
 *            0.39) (-1.46 0.02 1.70), default (-1.99 0.37 1.92) (0.18 -0.92 0.89) (0.47 -1.33 1.04) (0.14 1.09
 *            -1.48) (-1.46 0.92 0.62): thirty healthy z, none over 2, gate 4. 20,101 to 20,376 assists a full
 *            fleet, 3,392 to 3,905 a default one. Control assistgoalweight: forwards z 7.98 9.08 9.42 10.64
 *            9.12 and defenders z -11.04 -11.15 -10.37 -12.20 -10.87 on the five default sets, 23.33 and
 *            -28.33 on a full one. ASSIST_FLOOR 2,000 is six tenths of the lowest default fleet; at that
 *            count the control would still stand near z 8 on defenders.
 *   boards       923 checks over 54 season ends on a full fleet. Controls: readerdraw 6 failures, readerwrite
 *            5. dropmine and byeweek turn boards red with their own section, as they must.
 *   law, THE VIDEO REFEREE ARM, READ AGAIN (the fix pass; a reviewer found the line above stale). The "162
 *            to 183 reviews in 228 league matches of mine" above is Round 1229's own measurement. On this
 *            round's base, which holds Round 1303, the same arm reads far fewer: 19 33 35 39 34 reviews in
 *            228 league matches of mine on the five full fleets and 3 10 5 5 2 in 84 on the five default
 *            ones (remote check r1306-f1, head ecb69867), and the same 19 and 3 on the base before any edit
 *            of this round (r1306-a). So the move is the base's, not this round's. The floor of that arm
 *            was "not zero" when this was written: the gate's own seed set read 3, and another seed set
 *            could have read none. The second fix pass changed it (its block is further down): the arm is
 *            the same six seasons on both fleets and holds a floor from measured headroom.
 *
 * THE FIX PASS OF ROUND 1306, MEASURED on a GitHub runner, 2026-10-12, seed set 0 (remote check r1306-fx1,
 * head 3c12797b, BOOK_BASE at c9a1f86a; the other seed sets are named in results-g/fix-1306.md). Every check
 * of the pass is exact, so there is no band: the numbers are what each had to hold and what its control did.
 *   thin (vi)    single matches of clubs with no eleven judged row by row: 9,860 on the full fleet, 2,326 of
 *            them clean sheets, 4,313 credits to named men of a back line; 2,256, 572 and 998 on the default
 *            fleet. No club entry was left out for a roster that moved inside the entry (0 and 0). Controls on
 *            the default fleet: thinbacks 3,395 failures in thin, nobacks 1,155 in thin, allbacks 898 in law
 *            (and thin (iv) with it under BOOK_BASE); cleanside, which shares the anchor, reads 336 where it
 *            read 129, because a defender of the side that did not score now breaks his club's bound too.
 *   thin (vii)   the module's partial eleven against the engine's eleven on 671 rosters and against the
 *            harness's own reading on 313 with no eleven (114 and 70 on the default fleet). Control places433:
 *            192 failures in thin. Three older controls read more for the new checks and still turn thin
 *            red alone: thinsheet 87 where it read 17 (the single match against me), nofill 64 where it read
 *            1 (a partial eleven with no shirt is not the harness's reading), shirtrow 3,319 where it read
 *            2,282 (a shirt's row gains a clean sheet nobody named may gain).
 *   oldsave      6,007 checks with BOOK_BASE (4,129 without): six saves with no book, five of them on a late
 *            book. Control goallesswhole: 3 failures, all three the goalless save's. (vi): three seasons in
 *            play written by the base commit with its book and carried on, two of them in a league with
 *            clubs that have no eleven. Control stampv2: 4 failures in oldsave (the reader refuses each of
 *            the three, so the transition is not tried) and thin (iv) with it.
 * After the pass the harness holds 41 controls. Wall time on a runner: full fleet with BOOK_BASE about 228
 * seconds, default fleet 63 (84 with BOOK_BASE).
 * AND ON THE TREE THESE LINES WERE ADDED TO (remote check r1306-fx2, head 2d0aa866; the commit that adds
 * them changes nothing but this comment): ALL 41 CONTROLS FIRED on seed set 0,
 * each for its own section and no other but the ones its line names, and twelve more fleets were green
 * (the default fleet on seed sets 1, 2, 3, 4 and 7 and on seed set 11 with three seasons, the full fleet on
 * seed sets 1, 2, 3, 4 and 7, and seed set 0 again with the base). Over those fleets thin (vi) judged 8,640
 * to 10,328 single matches a full fleet (2,090 to 2,507 clean sheets, 3,748 to 4,633 credits to named men of
 * a back line) and 1,772 to 2,290 a default one (484 to 585, 840 to 1,037), with no club entry left out on
 * any of them; thin (vii) held 666 to 696 rosters with an eleven and 280 to 322 without a full fleet, 113 to
 * 128 and 56 to 71 a default one.
 * Every control of the harness FIRED for its own section and no other (or with the sections its line names) on
 * seed set 0, the 21 of Round 1229 among them, after step (b) (r1306-b1, r1306-c1) and the new ones after the
 * step that added them. Wall time on a runner: full fleet 100 to 170 seconds, default 42 to 60.
 *
 * STEP (d), THE REPAIR (remote check r1306-d1, head 449361a1, ten fleets green):
 *   oldsave      3,231 checks on a full fleet with BOOK_BASE (3,023 to 3,099 without it): 5 saves with no book
 *            (4 finish on a late book, the one parked at the first week on a whole one), the season after
 *            each, the six unreadable books, the stale book. Over ten healthy fleets no career that started
 *            its season with a book ended an entry on a late one (0 of 2,366 entries on a full fleet).
 *   dailies      154 checks with BOOK_BASE (85 without): 6 Hot Seat dates and 3 Deadline Day dates.
 *   the controls of the step, failures on seed set 0: noreopen 5, fitlive 3, latezero 1,202, alwayslate 2,
 *            hotseatbook1 2, hotseatbook2 12, hotseatbook3 6; and the ones it could have moved: hurtentry 1,
 *            redeal 2, strip 12, stripdeadline 3.
 *   what the fit check costs (the careful reader and the law, once an ENTRY): the "book's own cost" line read
 *            0 to 32 in a hundred more on six fleets before the step (r1306-e1, mean 15.3) and -1 to 30 after
 *            it (r1306-d1, mean 15.0). On a sample of four to five seconds that is nothing measured.
 * AFTER THE REPAIR all 35 controls were fired again on seed set 0 (the critic's correction 7). 32 fired as
 * they were written. Three had their own section red and one more: mathrandom (oldsave and dailies), dropmine
 * (shapes) and byeweek (names). Their lists were derived again, the reasons are on their lines above, and the
 * result names of the run that fired them again are in docs/audits/ROUND-1306-NOTES.md.
 *
 * THE SECOND FIX PASS OF ROUND 1306, MEASURED on GitHub runners, 2026-10-12 (remote checks r1306-f2a, head
 * 03f972d3, and r1306-f2b, head 9126a480; BOOK_BASE at c9a1f86a).
 *   law, the video referee arm   Everton and Arsenal, three seeds each, on BOTH fleets: 267 to 279 entries,
 *            228 league matches of mine, 19 33 35 39 34 reviews on the default fleet of seed sets 0 to 4 (the
 *            same five the full fleet read in r1306-f1, the six seasons being the same), no report whose
 *            lines did not add up. VAR_REVIEW_FLOOR 11 is six tenths of the lowest. Control novar: 1 failure
 *            in law, 0 reviews in 228 matches. Before the pass the default fleet's arm was Everton and
 *            Southampton, 84 matches, 3 10 5 5 2 reviews against a floor of "not zero".
 *   oldsave (vi) two committed recordings (BOOK_SAVES: Hertha BSC, 97,447 bytes, and Everton, 106,156 bytes,
 *            twelve entries in, written by c9a1f86a with its book) carried on to the season's end on EVERY
 *            run: 5,147 checks in oldsave without BOOK_BASE (4,129 before the pass), 7,025 with it, when the
 *            base tree writes the three saves afresh as well and its two are byte equal to the recordings
 *            ("Hertha BSC yes, Everton yes"). The same two files came back from three runs (two worktrees of
 *            c9a1f86a and one of main at 4aa47b12). Control stampv2 no longer needs BOOK_BASE: 3 failures in
 *            oldsave without it (the reader refuses both recordings, so the transition is not tried), 7 with
 *            it and thin (iv) beside. Control seasonstamp turns oldsave red with doors for the same reason,
 *            and its line says so since this pass (it read "did not fire" on r1306-f2b before that).
 * After the pass the harness holds 42 controls. Wall time on a runner: default fleet 52 to 56 seconds (72
 * with BOOK_BASE), full fleet 127 to 138 (178 with BOOK_BASE).
 *   Round 1311 (decision 3, the critic's advice 21 (iii)): every carried save is finished at its season's
 *            end; its closing share is printed with what it was given, and the awards must follow the floor
 *            by the harness's own reading (decidesByHand). That is why awardthin may take oldsave with it.
 */
/** The gate of section shapes (ii): see MEASURED above. */
const PURPOSE_FLOOR = 1.5;
/** Section shapes (iv) is judged on at least this many matches: see MEASURED above. */
const MULTI_FLOOR = 1000;
/** Section shapes (v) is judged on at least this many assists between other clubs: see MEASURED, Round 1306. */
const ASSIST_FLOOR = 2000;
/** Section thin (iii) is judged on at least this many goals of clubs with no eleven: see MEASURED, Round 1306. */
const THIN_FLOOR = 1200;

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

/** The whole save but the book, as text: what "the engine's stream did not move" is judged on. Since Round
 *  1311 the honours a season's end reads from the book are left out with it, and nothing else: the four
 *  moved fields of the summary (goldenBoot, playerOfSeason, ballonDor, awards) and the awards of each
 *  season's record. Section awards holds those, and holds the WHOLE summary and record to the base commit
 *  on every season the book does not decide. */
const MOVED = ['goldenBoot', 'playerOfSeason', 'ballonDor', 'awards'];
const withoutBook = s => JSON.stringify(s, (k, v) => {
  if (k === 'leagueBook') return undefined;
  if (k === 'pendingSummary' && v && typeof v === 'object') { const o = { ...v }; for (const m of MOVED) delete o[m]; return o; }
  if (k === 'history' && Array.isArray(v)) return v.map(h => { if (!h || typeof h !== 'object') return h; const { awards, ...rest } = h; void awards; return rest; });
  return v;
});
const sha = text => createHash('sha256').update(text).digest('hex').slice(0, 24);

/* Round 1311: THE AWARDS RULE, typed here on purpose (the module's AWARD_FLOOR and bookDecides are what is
   judged): a whole book (no r0) with at least this many in 100 rival goals on record (a named row or an own
   goal; the goals a late book was opened with left out). */
const AWARD_FLOOR_RULED = 73;
/* Round 1311 step 5: the back four's line, MEASURED (remote check r1311-s5m, head 5090d373, full fleets of
   seed sets 0 to 4, 42 or 43 teams each): the rule reads 1.43 1.42 1.60 1.42 1.52 men of one club, the control
   teamsheets (clean sheets plus goals plus assists) 2.93 2.74 2.88 2.77 2.83. The ranges are 1.14 apart, so the
   line is bound, midway between 1.60 and 2.74. It is judged only on a fleet of at least BACK_FOUR_MIN_TEAMS
   teams: the default fleet holds eight, where one team moves the mean by an eighth and a healthy run could
   cross the line by chance; there it is printed. So the control teamsheets runs on the full fleet. */
const BACK_FOUR_LINE = 2.17;
const BACK_FOUR_MIN_TEAMS = 20;
function shareByHand(s, book) {
  let on = 0;
  let u = 0;
  for (const club of s.leagueClubs.filter(c => c !== s.clubName)) {
    const e = book.c[club];
    if (!e) continue;
    for (const row of Object.values(e.m)) on += row[0];
    on += e.og;
    u += e.u;
  }
  u = Math.max(0, u - (book.u0 ?? 0));
  return on + u ? Math.floor(100 * on / (on + u)) : 100;
}
function decidesByHand(s, book) {
  return book.r0 === undefined && shareByHand(s, book) >= AWARD_FLOOR_RULED;
}

/* ---------- the rule, typed out here once more ON PURPOSE ---------- */
/* The harness judges "the deal follows the weight" against its OWN copy of the table and the shares, never
   against the module it is judging: a control that flattens the module's weights must not flatten the
   expectation with it. */
const wBase = pos => (pos === 'ST' || pos === 'CF' ? 5 : pos === 'LW' || pos === 'RW' ? 3.6 : pos === 'CAM' ? 3
  : pos === 'LM' || pos === 'RM' ? 2.2 : pos === 'CM' ? 1.6 : pos === 'CDM' ? 0.9 : pos === 'GK' ? 0.02 : 0.55);
const W = man => wBase(man.p) * Math.pow(man.r / 70, 2);
/* Round 1306: the ASSIST table, typed out here too and for the same reason (shapes (v) judges who is given a
   rival's assist against this copy, never against the module's assistWeight). */
const AW = man => W(man) * 0.6 + 0.5;
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
 * Round 1306, shapes (v). Who is given the assist of an open play goal of this eleven, by line: the scorer
 * is one of the outfield men by the goal table, and the assist goes to one of the OTHER outfield men by the
 * assist table. (A penalty, a direct free kick and an own goal carry no assist, so only open play goals
 * enter, and their scorer is by the weight whatever the taker rule says.)
 */
function assistByLine(xi) {
  const outfield = xi.filter(m => m.p !== 'GK');
  const G = outfield.reduce((s, m) => s + W(m), 0);
  const A = outfield.reduce((s, m) => s + AW(m), 0);
  const out = { ATT: 0, MID: 0, DEF: 0 };
  for (const s of outfield) {
    for (const a of outfield) {
      if (a !== s) out[lineOf(a.p)] += (W(s) / G) * (AW(a) / (A - AW(s)));
    }
  }
  return out;
}

/**
 * Round 1306. The partial eleven of a club that cannot field a named one, AS THE HARNESS READS THE RULE (its
 * own copy, on purpose, like the table above): the roster's best keeper or nobody; the named men taken by
 * rating, a name once, four of the back line, four of midfield, two forwards, then the best outfield men
 * left up to ten; those last men cover the open places from the back, and every place still open is an
 * empty shirt at the club's strength, a striker's for a forward's place, a central midfielder's, a centre
 * back's. Null for a roster that holds nobody.
 */
function thinEleven(roster, strength) {
  if (!roster.length) return null;
  const byR = [...roster].sort((a, b) => b.r - a.r);
  const taken = new Set();
  const named = [];
  const keeper = byR.find(m => m.p === 'GK') ?? null;
  if (keeper) taken.add(keeper.n);
  const grab = (want, count) => {
    let got = 0;
    for (const m of byR) {
      if (got >= count || named.length >= 10) break;
      if (taken.has(m.n) || !want(m)) continue;
      named.push(m); taken.add(m.n); got += 1;
    }
    return got;
  };
  const open = { DEF: 4 - grab(m => lineOf(m.p) === 'DEF', 4), MID: 4 - grab(m => lineOf(m.p) === 'MID', 4), ATT: 2 - grab(m => lineOf(m.p) === 'ATT', 2) };
  let cover = grab(m => m.p !== 'GK', 10);
  for (const l of ['DEF', 'MID', 'ATT']) { const f = Math.min(open[l], cover); open[l] -= f; cover -= f; }
  const shirts = [];
  for (const [l, pos] of [['ATT', 'ST'], ['MID', 'CM'], ['DEF', 'CB']]) {
    for (let i = 0; i < open[l]; i++) shirts.push({ n: `?${shirts.length + 1}`, p: pos, r: Math.round(strength), e: true });
  }
  return { keeper, named, shirts };
}
/** The chance that one goal of a thin club against another club lands on a NAMED man's row: the open play
 *  share of the named men's weight, plus the set piece share when the taker (the heaviest of the ten, a
 *  shirt's mark sorting before any name on a tie) is a named man. An own goal is on nobody's row. */
function thinNamedShare(thin) {
  const ten = [...thin.named, ...thin.shirts];
  const total = ten.reduce((s, m) => s + W(m), 0);
  if (!(total > 0)) return 0;
  const taker = takerMan(ten);
  return P_OPEN * thin.named.reduce((s, m) => s + W(m), 0) / total + (taker && !taker.e ? P_SET : 0);
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
      hooks.finished?.(s, fin, season);
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
const SECTIONS = ['stream', 'law', 'names', 'shapes', 'oldsave', 'doors', 'dailies', 'thin', 'boards', 'awards', 'facts'];
const red = new Map(SECTIONS.map(s => [s, []]));
const checked = new Map(SECTIONS.map(s => [s, 0]));
const fail = (section, message) => { red.get(section).push(message); };
const tick = (section, n = 1) => checked.set(section, checked.get(section) + n);

/* What the fleet adds up, for the gates of section shapes and for the printed numbers. */
const newAcc = () => ({
  byLine: { ATT: 0, MID: 0, DEF: 0, GK: 0 }, rowGoals: 0, assists: 0, og: 0, u: 0, noXiClubWeeks: 0,
  aiObs: { ATT: 0, MID: 0, DEF: 0 }, aiExp: { ATT: 0, MID: 0, DEF: 0 }, aiGoals: 0,
  /* Round 1306, shapes (v): the assists of clubs with an eleven in matches between other clubs, by the line
     of the man given one, and what the harness's own two tables expect of that. */
  asObs: { ATT: 0, MID: 0, DEF: 0 }, asExp: { ATT: 0, MID: 0, DEF: 0 }, asN: 0,
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
  byeWeeks: 0, twoInOne: 0, untold: 0, cover: [],
  /* Round 1306, clubs with no named eleven: their goals against other clubs, how many of them a named row
     took, what the harness's own copy of the rule expects of that and its variance; the club seasons whose
     keeper rows were held against the table, the clean sheets on them, and the ones kept against me. */
  thinDeal: { goals: 0, named: 0, exp: 0, vr: 0, exact: 0 }, thinKeepers: { clubSeasons: 0, sheets: 0, vsMe: 0 },
  /* The fix pass of Round 1306, thin (vi): single matches of clubs with no eleven judged for who was given
     the clean sheet, the ones a clean sheet was kept in, the credits that went to named men of the back
     line, and the club entries left out because the roster moved inside the entry. And thin (vii): the
     rosters whose eleven was held against the module's partial eleven at a season's end, clubs with an
     eleven and clubs without. */
  thinBacks: { matches: 0, kept: 0, toBacks: 0, moved: 0 }, elevens: { full: 0, thin: 0 },
  /* The book's entries at each season's end and the clubs that were without an eleven at any entry of it. */
  ends: [],
  /* A copy of the whole save at each season's end, for section boards. */
  endSaves: [],
  /* Entries of the fleet that ended on a LATE book, and the first of them: must be none (oldsave (iv)). */
  lateEntries: 0, lateFirst: null,
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
  /* Clean sheets the table could not tell this season, a club: how many more it MAY have kept (see the entry hook). */
  let untold = new Map();
  let myKept = 0;
  let leagueId = '';
  /* Round 1306: the clubs that were without a named eleven at any entry of this season. */
  let thinSeen = new Set();
  /* The fix pass of Round 1306: the most clean sheets a club can have kept this season by the table, keeper
     on record or not (where the table cannot tell, the higher number): the bound on a defender's row. */
  let sheetsAtMost = new Map();
  /** The rows a thin club's clean sheet goes to as the harness reads the rule: its rostered keeper and the
   *  named men of its partial eleven's back line, as row keys. */
  const sheetKeys = thin => [...(thin.keeper ? [`${thin.keeper.n}|GK`] : []), ...thin.named.filter(m => lineOf(m.p) === 'DEF').map(m => `${m.n}|${m.p}`)];
  const hooks = {
    opened(s, seasonIndex) {
      keptByClub = new Map();
      untold = new Map();
      thinSeen = new Set();
      sheetsAtMost = new Map();
      myKept = 0;
      leagueId = cm.careerLeagueOf(s).id;
      tick('law');
      const book = cm.leagueBookOf(s);
      if (!book) fail('law', `${label}: no readable book at the start of season ${seasonIndex + 1}`);
      else if (Object.keys(book.c).length || book.my.length) fail('law', `${label}: the book of season ${seasonIndex + 1} did not open empty`);
    },
    peek(s) {
      const xi = new Map(rivalsOf(s).map(c => [c, cm.leagueBookEleven(s, c)]));
      return {
        table: new Map(s.table.map(r => [r.club, { p: played(r), gf: r.gf, ga: r.ga }])),
        mine: cm.mySquadNames(s),
        xi,
        /* A club with no eleven: its partial eleven by the harness's own copy of the rule (null: no roster man). */
        thin: new Map(rivalsOf(s).filter(c => !xi.get(c)).map(c => [c, thinEleven(cm.oppRosterFor(s, c), cm.strengthOf(s, c))])),
        book: s.leagueBook ? JSON.parse(JSON.stringify(s.leagueBook)) : null,
      };
    },
    entry(before, after, r, season) {
      acc.entries += 1;
      const where = `season ${season + 1} week ${after.week}`;
      /* Round 1306, oldsave (iv): a career that started its season with a book never has it reopened late. */
      if (after.leagueBook?.r0 !== undefined) { acc.lateEntries += 1; acc.lateFirst ??= `${label} ${where}`; }
      const book = lawNow(mod, after, label, where);
      if (!book || !before.book) return;
      /* Round 1306: a book REPLACED in this entry (the repair found it unfit and opened a late one) is
         another book, and what it gained since the entry began cannot be read off the old one. That it
         happened at all is section oldsave (iv)'s and boards (i)'s to say; the comparisons below would only
         say it again, in the words of sections that hold something else. No healthy career gets here. */
      if ((after.leagueBook?.r0 ?? null) !== (before.book.r0 ?? null)) return;
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
           is one match of a club. With an odd number, one call can play a week I am not part of and then my
           own match, so a club can play twice in it: what it conceded to me is the report's number, the
           rest is what it conceded elsewhere. Two matches elsewhere with something conceded hold one clean
           sheet or none, and the table cannot say which: that club's season is then judged on a range. */
        const games = played(now) - was.p;
        const vsMe = club === myOpp ? 1 : 0;
        const mineOnThem = vsMe ? (rep.home === after.clubName ? rep.homeGoals : rep.awayGoals) : 0;
        const elsewhere = games - vsMe;
        mostGames = Math.max(mostGames, games);
        if (games > 1) acc.twoInOne += 1;
        /* Round 1306: a club with no eleven whose roster holds a keeper has its clean sheets written down too. */
        const thin = xi ? null : (before.thin.get(club) ?? null);
        if (!xi) thinSeen.add(club);
        if (xi || thin?.keeper) {
          let kept = vsMe && mineOnThem === 0 ? 1 : 0;
          if (kept && !xi) acc.thinKeepers.vsMe += 1;
          if (elsewhere > 0 && now.ga - was.ga - mineOnThem === 0) kept += elsewhere;
          else if (elsewhere > 1) untold.set(club, (untold.get(club) ?? 0) + elsewhere - 1);
          if (kept) keptByClub.set(club, (keptByClub.get(club) ?? 0) + kept);
        }
        {
          /* The same count for EVERY club, with or without a keeper on record, as an upper bound. */
          let most = vsMe && mineOnThem === 0 ? 1 : 0;
          if (elsewhere > 0 && now.ga - was.ga - mineOnThem === 0) most += elsewhere;
          else if (elsewhere > 1) most += elsewhere - 1;
          if (most) sheetsAtMost.set(club, (sheetsAtMost.get(club) ?? 0) + most);
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
        const gotA = { ATT: 0, MID: 0, DEF: 0, GK: 0 };
        /* The most goals one row gained in this entry. */
        let mostOnOneRow = 0;
        /* My opponent of this entry: what its rows gained, by name, for the comparison with the report. */
        const gained = club === myOpp ? { goalsBy: new Map(), assistsBy: new Map() } : null;
        /* The rows whose clean sheet count moved in this entry, by row key (thin (vi) below). */
        const sheetsGot = new Map();
        for (const [key, row] of Object.entries(entry.m)) {
          const old = prior.m[key] ?? [0, 0, 0, 0];
          if (row[0] === old[0] && row[1] === old[1] && row[2] === old[2]) continue;
          if (row[2] !== old[2]) sheetsGot.set(key, row[2] - old[2]);
          const bar = key.lastIndexOf('|');
          const name = key.slice(0, bar);
          const pos = key.slice(bar + 1);
          if (gained && row[0] !== old[0]) gained.goalsBy.set(name, (gained.goalsBy.get(name) ?? 0) + row[0] - old[0]);
          if (gained && row[1] !== old[1]) gained.assistsBy.set(name, (gained.assistsBy.get(name) ?? 0) + row[1] - old[1]);
          /* He is on that club's roster as this save sees it, under that position (for a club with no
             eleven this is section thin's: an empty shirt given a row is exactly a man on no roster) ... */
          const rosterSection = xi ? 'names' : 'thin';
          tick(rosterSection);
          roster ??= cm.oppRosterFor(after, club, EMPTY);
          if (!roster.some(p => p.n === name && p.p === pos)) fail(rosterSection, `${label} ${where}: ${name} (${pos}) has a row at ${club} and is not on its roster`);
          /* ... and he was not one of mine when it was written. */
          if (before.mine.has(name) && mineNow.has(name)) fail('names', `${label} ${where}: ${name} is in my squad and was credited for ${club}`);
          got[lineOf(pos)] += row[0] - old[0];
          gotA[lineOf(pos)] += row[1] - old[1];
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
        /* Thin (vi), the fix pass of Round 1306: WHO IS GIVEN A THIN CLUB'S CLEAN SHEET, exactly, one match
           at a time. When a club with no eleven played its one match of the entry (against me or anybody)
           and conceded nothing, its rostered keeper and each named man of its partial eleven's back line
           gain one clean sheet and no other row gains any; when it conceded, no row gains one. The men are
           the harness's own partial eleven, read before the entry and again after it: a club whose roster
           moved inside the entry is left out and counted. A defender the row cap left without a row is
           the one man excused. */
        if (!xi && thin && games === 1) {
          const want = sheetKeys(thin);
          const after2 = thinEleven(cm.oppRosterFor(after, club), cm.strengthOf(after, club));
          if (!after2 || sheetKeys(after2).join('\n') !== want.join('\n')) acc.thinBacks.moved += 1;
          else {
            const keptIt = vsMe ? mineOnThem === 0 : now.ga - was.ga === 0;
            const full = Object.keys(entry.m).length >= mod.book.BOOK_ROWS_PER_CLUB;
            tick('thin');
            acc.thinBacks.matches += 1;
            if (keptIt) acc.thinBacks.kept += 1;
            for (const [key, n] of sheetsGot) {
              if (!keptIt || n !== 1 || !want.includes(key)) fail('thin', `${label} ${where}: ${key} at ${club}, a club with no eleven, gained ${n} clean sheet(s) in a match it ${keptIt ? 'kept a clean sheet in and is neither its keeper nor a named man of its back line' : 'conceded in'}`);
              else if (!key.endsWith('|GK')) acc.thinBacks.toBacks += 1;
            }
            if (keptIt) {
              for (const key of want) {
                if (!sheetsGot.has(key) && !(full && !(key in entry.m))) fail('thin', `${label} ${where}: ${key} at ${club}, a club with no eleven, was given no clean sheet for the one his side kept`);
              }
            }
          }
        }
        /* Round 1306, thin (iii). The goals of a club with no eleven against other clubs: how many a named
           row took, against the harness's own copy of the partial eleven and of the table for that roster. */
        if (club !== myOpp && !xi && thin && scored > 0) {
          const p = thinNamedShare(thin);
          const onRows = got.ATT + got.MID + got.DEF + got.GK;
          acc.thinDeal.goals += scored;
          acc.thinDeal.named += onRows;
          acc.thinDeal.exp += scored * p;
          acc.thinDeal.vr += scored * p * (1 - p);
          tick('thin');
          if (p === 0 && onRows > 0) { acc.thinDeal.exact += 1; fail('thin', `${label} ${where}: ${club} has no named outfield man and ${onRows} of its ${scored} goals found a row`); }
        }
        /* A match between two other clubs, by a club with an eleven: the deal against the harness's own table. */
        if (club !== myOpp && xi && scored > 0) {
          const exp = expectedByLine(xi);
          for (const line of LINES) { acc.aiObs[line] += got[line]; acc.aiExp[line] += scored * exp[line]; }
          acc.aiGoals += scored;
          /* Shapes (v): who was given the assists of this entry, against the harness's own two tables. */
          const given = gotA.ATT + gotA.MID + gotA.DEF;
          if (given > 0) {
            const expA = assistByLine(xi);
            for (const line of LINES) { acc.asObs[line] += gotA[line]; acc.asExp[line] += given * expA[line]; }
            acc.asN += given;
          }
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
      /* What this season covered, for the fleet's own promise (see "the fleet is what it says" below): how many
         clubs its league had, and whether that league keeps its results (a tiebreak that reads them). */
      acc.cover.push({ clubs: s.leagueClubs.length, ledger: Object.keys(s.pairResults?.[cm.careerLeagueOf(s).id] ?? {}).length > 0 });
      const book = lawNow(mod, s, label, where);
      if (!book) return;
      /* The clean sheets on a club's keeper rows are the matches it conceded nothing in, with an eleven named. */
      for (const club of rivalsOf(s)) {
        /* Round 1306, thin (i): a club that was without an eleven at any entry of the season is section
           thin's (its keeper rows count the matches it conceded nothing in while its roster held a keeper). */
        const section = thinSeen.has(club) ? 'thin' : 'law';
        tick(section);
        const onKeepers = Object.entries(book.c[club]?.m ?? {}).filter(([key]) => key.endsWith('|GK')).reduce((n, [, row]) => n + row[2], 0);
        const kept = keptByClub.get(club) ?? 0;
        const maybe = untold.get(club) ?? 0;
        if (maybe) acc.untold += 1;
        if (section === 'thin' && (kept || onKeepers)) { acc.thinKeepers.clubSeasons += 1; acc.thinKeepers.sheets += onKeepers; }
        if (onKeepers < kept || onKeepers > kept + maybe) fail(section, `${label} ${where}: ${club} kept ${kept}${maybe ? ` to ${kept + maybe}` : ''} clean sheets by the table, its keepers hold ${onKeepers}`);
      }
      /* Thin (ii): an empty shirt is nobody. No row key of any club begins with its mark. */
      for (const [club, entry] of Object.entries(book.c)) {
        tick('thin');
        const shirt = Object.keys(entry?.m ?? {}).find(key => key.startsWith('?'));
        if (shirt) fail('thin', `${label} ${where}: ${club} holds a row under an empty shirt's mark (${shirt})`);
      }
      /* Thin (vi), the fix pass of Round 1306, for EVERY club (a club that had an eleven all season is
         section law's, like its keeper rows above): a clean sheet is a keeper's and the back line's and
         nobody else's, and no man of the back line holds more than his club can have kept by the table.
         These rows are written into every save and cannot be rebuilt, and the round that picks a team
         of the season splits its back four on them. */
      for (const club of rivalsOf(s)) {
        const section = thinSeen.has(club) ? 'thin' : 'law';
        const most = sheetsAtMost.get(club) ?? 0;
        for (const [key, row] of Object.entries(book.c[club]?.m ?? {})) {
          if (!row[2]) continue;
          tick(section);
          const line = lineOf(key.slice(key.lastIndexOf('|') + 1));
          if (line !== 'GK' && line !== 'DEF') fail(section, `${label} ${where}: ${key} at ${club} holds ${row[2]} clean sheets and is neither a keeper nor of the back line`);
          else if (line === 'DEF' && row[2] > most) fail(section, `${label} ${where}: ${key} at ${club} holds ${row[2]} clean sheets, his club kept at most ${most} by the table`);
        }
      }
      /* Thin (vii), the fix pass of Round 1306: ONE WAY TO TAKE AN ELEVEN. The module's partial eleven
         retypes the take lines of the engine's own eleven (a keeper, four, four, two, then the best left,
         a name once) and this harness types them a third time; nothing tied the three. For a club that
         can field an eleven the partial eleven of its roster IS that eleven (the same keeper, the same
         ten, no shirt); for a club that cannot, it is the harness's own reading man for man and shirt for
         shirt, in order (the order is what a roll picks by). */
      for (const club of rivalsOf(s)) {
        const roster = cm.oppRosterFor(s, club);
        const strength = cm.strengthOf(s, club);
        const part = mod.book.partialEleven(roster.map(p => ({ n: p.n, p: p.p, r: p.r })), strength, cm.groupOf);
        const shirtsOf = men => men.filter(m => m.e).map(m => `${m.n} ${m.p} ${m.r}`).join(', ');
        const full = cm.leagueBookEleven(s, club);
        tick('thin');
        if (full) {
          acc.elevens.full += 1;
          const want = `${full.find(p => p.p === 'GK')?.n} / ${full.filter(p => p.p !== 'GK').map(p => p.n).sort().join(', ')} / `;
          const got = part ? `${part.keeper?.n} / ${part.outfield.filter(m => !m.e).map(m => m.n).sort().join(', ')} / ${shirtsOf(part.outfield)}` : 'nobody';
          if (got !== want) fail('thin', `${label} ${where}: ${club} can field an eleven and the partial eleven of its roster is not that eleven (${got} against ${want})`);
        } else {
          acc.elevens.thin += 1;
          const own = thinEleven(roster, strength);
          const want = own ? `${own.keeper?.n} / ${own.named.map(m => m.n).join(', ')} / ${shirtsOf(own.shirts)}` : 'nobody';
          const got = part ? `${part.keeper?.n} / ${part.outfield.filter(m => !m.e).map(m => m.n).join(', ')} / ${shirtsOf(part.outfield)}` : 'nobody';
          if (got !== want) fail('thin', `${label} ${where}: ${club} cannot field an eleven and the module's partial eleven is not the harness's own reading of the rule (${got} against ${want})`);
        }
      }
      acc.ends.push({ label, season, thinSeen: new Set(thinSeen), c: JSON.parse(JSON.stringify(book.c)), rivals: rivalsOf(s) });
      /* Section boards reads the reader module on a copy of this save AFTER the fleet has played, never in
         here: a reader that drew from the stream would move this career, and that is section boards' to say. */
      acc.endSaves.push({ label, season, save: JSON.parse(JSON.stringify(s)) });
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
  /* Round 1306: how much of the rivals' goals is on record (a named row or an own goal), and the best rival. */
  let onRecord = 0;
  let unnamed = 0;
  for (const club of rivalsOf(s)) { const g = mod.book.bookClubGoals(book, club); onRecord += g.rows + g.og; unnamed += g.u; }
  acc.seasons.push({
    onRecord, unnamed, bootRival: Math.max(0, ...rivalRows.map(r => r.goals)),
    league: cm.careerLeagueOf(s).id, clubs: s.leagueClubs.length,
    bootBook: bookTop[0]?.goals ?? 0, bootRace: raceTop[0]?.goals ?? 0, bootLine: bookTop[0] ? lineOf(bookTop[0].pos) : null,
    bookAtt: att(bookTop), raceAtt: att(raceTop), bookTop: bookTop.length, raceTop: raceTop.length,
    assistTop: Math.max(0, ...all.map(r => r.assists)), keeperTop: keepers[0]?.cleanSheets ?? 0,
    sheetBoardClubs: new Set(sheetBoard.map(r => r.club)).size, sheetBoardKeepers: sheetBoard.filter(r => r.pos === 'GK').length,
    draftedOfOne: mostOfOne(drafted), deedsOfOne: mostOfOne(byDeeds), deedsBlank: byDeeds.filter(r => r.goals + r.assists === 0).length,
  });
}

/* ---------- Round 1306, the measuring mode: every league of every era, printed and never gated ---------- */
/* The literal reading of "a club with no eleven is dealt over the men it has": every goal of such a club to
   the men its roster holds, by the weight, with no empty shirt. Measured beside the rule the engine follows,
   never shipped. */
const LITERAL = [{ file: ENGINE, from: SIDE_XI, to: "  const xi = pickOppSquad(roster)?.xi ?? (men => (men.length ? men : null))(roster.map(p => ({ n: p.n, p: p.p, r: p.r, ...(p.g ? { g: true } : {}) })));" }];
/* The rule before Round 1306, for the measuring mode: a club with no eleven is wholly unnamed. */
const OLD_RULE = [{ file: BOOK, from: '  if (!roster.length) return null;', to: '  if (roster.length >= 0) return null;' }];

/** One league season of one save, read the moment before finishSeason: what the lead rules on. */
function readLeagueSeason(mod, s) {
  const { cm } = mod;
  const book = cm.leagueBookOf(s);
  if (!book) return null;
  const mine = cm.mySquadNames(s);
  let rows = 0, og = 0, u = 0;
  /* Step (d): does this league's own calendar (a split, a play-off round, two conferences) keep the first law
     to the season's end? A club whose book and table disagree here, or a book that says it started late in
     a career that opened one at the first week, is a league format the note calls do not cover. */
  let misfit = 0;
  for (const club of rivalsOf(s)) {
    const g = mod.book.bookClubGoals(book, club); rows += g.rows; og += g.og; u += g.u;
    if (g.rows + g.og + g.u !== (s.table.find(r => r.club === club)?.gf ?? 0)) misfit += 1;
  }
  const late = book.r0 !== undefined ? book.r0 : null;
  const rivalTop = Math.max(0, ...mod.book.bookRows(book).filter(r => !mine.has(r.name)).map(r => r.goals));
  const raceTop = Math.max(0, ...(s.scorerRace ?? []).filter(e => !mine.has(e.name)).map(e => e.goals));
  const myTop = Math.max(0, ...s.squad.map(p => p.comp?.league?.goals ?? 0));
  const thin = [];
  const gaps = [];
  for (const club of rivalsOf(s)) {
    const xi = cm.leagueBookEleven(s, club, mine);
    if (!xi) {
      const men = cm.oppRosterFor(s, club, mine);
      /* The critic's correction 6: is the heaviest man of its partial eleven (its taker) an empty shirt? */
      const part = thinEleven(men, cm.strengthOf(s, club));
      thin.push({ club, men: men.length, keepers: men.filter(p => p.p === 'GK').length, shirts: part ? part.shirts.length : 10, shirtHeaviest: part ? Boolean(takerMan([...part.named, ...part.shirts])?.e) : true });
      continue;
    }
    /* Critic's advice 15: is the club's strength on the scale of its eleven's ratings? */
    gaps.push(cm.strengthOf(s, club) - mean(xi.filter(p => p.p !== 'GK').map(p => p.r)));
  }
  return { league: cm.careerLeagueOf(s).id, clubs: s.leagueClubs.length, rows, og, u, late, misfit, rivalTop, raceTop, myTop, thin, gaps, bytes: JSON.stringify(s.leagueBook).length, saveBytes: JSON.stringify(s).length };
}

/**
 * Round 1311, BOOK_MEASURE=floor: the awards floor in every league of every era, on the engine as committed.
 * MEASURE_SEEDS careers a league (default 2), one season each, judged at its end: the share on record, who
 * settled the golden boot (the book, or the old race under the floor or on a late book), and how often one of
 * MY men won it, beside how often he would have on the book's board and on the old race. Gates nothing.
 */
async function measureFloor(mod) {
  const seeds = Number(process.env.MEASURE_SEEDS ?? 2);
  const { cm } = mod;
  const only = (process.env.MEASURE_ONLY ?? '').split(',').filter(Boolean);
  const leagues = [...cm.REAL_LEAGUES.map(l => ['now', l]), ...Object.entries(cm.ERA_LEAGUES).flatMap(([era, ls]) => ls.map(l => [era, l]))]
    .filter(([, l]) => !only.length || only.includes(l.id));
  console.log(`simCmLeagueBook: MEASURE floor: ${leagues.length} leagues of every era, ${seeds} careers each, one season, the floor at ${mod.boards.AWARD_FLOOR} (the harness reads it as ${AWARD_FLOOR_RULED})`);
  const rows = [];
  leagues.forEach(([era, league], li) => {
    const club = league.clubs[0];
    const xs = [];
    for (let k = 0; k < seeds; k++) {
      const seed = (0x1311 + li * 257 + k * 31) >>> 0;
      try {
        playCareer(mod, club, era, seed, {
          finished(before, fin) {
            const book = cm.leagueBookOf(before);
            const lb = cm.leagueBoardsOf(before);
            const bookTop = lb ? mod.boards.leaders(lb.input, 'goals', 1)[0] : null;
            const raceTop = cm.goldenBootTable(before, 1, null)[0];
            xs.push({
              share: book ? shareByHand(before, book) : null, decided: Boolean(book && lb && decidesByHand(before, book)), late: Boolean(book && book.r0 !== undefined),
              by: cm.bookAwardsState(before, lb).by, won: fin.summary.goldenBoot?.club === before.clubName, bookMine: Boolean(bookTop?.mine), raceMine: Boolean(raceTop?.mine),
            });
          },
        }, 1);
      } catch (e) { xs.push({ error: String(e?.message ?? e).slice(0, 100) }); }
    }
    const ok = xs.filter(x => !x.error);
    const row = { era, league: league.id, n: ok.length, shares: ok.map(x => x.share), decided: ok.filter(x => x.decided).length, by: ok.map(x => x.by), won: ok.filter(x => x.won).length, bookMine: ok.filter(x => x.bookMine).length, raceMine: ok.filter(x => x.raceMine).length, errors: xs.length - ok.length };
    rows.push(row);
    console.log(`floor ${era.padEnd(7)} ${league.id.padEnd(14)} on record ${row.shares.join(' ')}; settled by ${row.by.join(' ')}; decided by the book ${row.decided} of ${row.n}; one of mine won the boot ${row.won} of ${row.n} (on the book's board ${row.bookMine}, on the old race ${row.raceMine})${row.errors ? `; ${row.errors} careers did not finish` : ''}`);
  });
  const under = rows.filter(r => r.decided < r.n);
  const all = rows.reduce((a, r) => ({ n: a.n + r.n, won: a.won + r.won, book: a.book + r.bookMine, race: a.race + r.raceMine }), { n: 0, won: 0, book: 0, race: 0 });
  const sub = xs => xs.reduce((a, r) => ({ n: a.n + r.n, won: a.won + r.won, book: a.book + r.bookMine, race: a.race + r.raceMine }), { n: 0, won: 0, book: 0, race: 0 });
  const u = sub(under);
  const o = sub(rows.filter(r => r.decided === r.n));
  console.log(`floor ${rows.length} leagues, ${all.n} careers: ${rows.filter(r => r.decided === r.n).length} leagues decided by the book in every career, ${rows.filter(r => r.decided === 0).length} in none, ${rows.filter(r => r.decided > 0 && r.decided < r.n).length} split`);
  console.log(`floor one of mine won the boot: ${all.won} of ${all.n} careers in all; where the book never or not always decides ${u.won} of ${u.n} (the book's board would give ${u.book}, the old race ${u.race}); where it always decides ${o.won} of ${o.n} (old race ${o.race})`);
  console.log(`simCmLeagueBook: MEASURE floor done, nothing gated (${Math.round((Date.now() - T0) / 1000)}s)`);
}

async function measureLeagues(arms) {
  const seeds = Number(process.env.MEASURE_SEEDS ?? 2);
  const { cm } = arms[0][1];
  /* MEASURE_ONLY=<league id>,<league id> narrows the run (a smoke test of the mode itself). */
  const only = (process.env.MEASURE_ONLY ?? '').split(',').filter(Boolean);
  const leagues = [...cm.REAL_LEAGUES.map(l => ['now', l]), ...Object.entries(cm.ERA_LEAGUES).flatMap(([era, ls]) => ls.map(l => [era, l]))]
    .filter(([, l]) => !only.length || only.includes(l.id));
  console.log(`simCmLeagueBook: MEASURE leagues: ${leagues.length} leagues of every era, ${seeds} careers each, one season, arms: ${arms.map(a => a[0]).join(', ')}`);
  console.log('measure a league: rival clubs with no eleven (their roster sizes), then for each arm the share of rival goals on record (rows + own goals in a hundred), the best rival total on the book, and how often one of my men leads the Goals board; then the old race\'s best rival total and my best man');
  const share = x => (x.rows + x.og + x.u ? Math.floor(100 * (x.rows + x.og) / (x.rows + x.og + x.u)) : 100);
  const table = [];
  const allGaps = [];
  const repair = { careers: 0, late: [], misfit: [], none: [] };
  leagues.forEach(([era, league], li) => {
    const club = league.clubs[0];
    const perArm = arms.map(() => []);
    for (let k = 0; k < seeds; k++) {
      const seed = (0x1306 + li * 257 + k * 31) >>> 0;
      arms.forEach(([, mod], ai) => {
        let got = null;
        try { playCareer(mod, club, era, seed, { seasonEnd(s) { got = readLeagueSeason(mod, s); }, stopAfterSeason: () => true }, 1); } catch (e) { got = { error: String(e?.message ?? e).slice(0, 100) }; }
        perArm[ai].push(got);
      });
    }
    const first = perArm[0].find(x => x && !x.error);
    if (!first) { console.log(`measure ${era} ${league.id}: NOT MEASURED (${perArm[0][0]?.error ?? 'no book at the season\'s end'})`); return; }
    allGaps.push(...first.gaps);
    const sizes = first.thin.map(t => t.men).sort((a, b) => a - b);
    const cols = arms.map(([name], ai) => {
      const xs = perArm[ai].filter(x => x && !x.error);
      const sum = xs.reduce((a, x) => ({ rows: a.rows + x.rows, og: a.og + x.og, u: a.u + x.u }), { rows: 0, og: 0, u: 0 });
      return { name, share: share(sum), top: mean(xs.map(x => x.rivalTop)), mineLead: xs.filter(x => x.myTop > x.rivalTop).length, n: xs.length, bytes: Math.round(mean(xs.map(x => x.bytes))), saveBytes: Math.round(mean(xs.map(x => x.saveBytes))) };
    });
    const xs0 = perArm[0].filter(x => x && !x.error);
    /* The candidate's arm ("the rule", the engine as committed): careers that ended the season on a late book
       or on a book that does not add up to the table, and careers with no readable book at all. */
    const cand = perArm[1] ?? [];
    repair.careers += cand.length;
    for (const x of cand) {
      if (!x || x.error) repair.none.push(`${era} ${league.id}`);
      else if (x.late !== null) repair.late.push(`${era} ${x.league} (from round index ${x.late})`);
      else if (x.misfit) repair.misfit.push(`${era} ${x.league} (${x.misfit} clubs)`);
    }
    table.push({ era, id: first.league, cols });
    console.log(`measure ${era.padEnd(7)} ${first.league.padEnd(14)} ${String(first.clubs).padStart(2)} clubs, no eleven ${String(first.thin.length).padStart(2)} of ${first.clubs - 1}${sizes.length ? ` (men ${sizes[0]} to ${sizes[sizes.length - 1]}, ${first.thin.filter(t => !t.keepers).length} with no keeper, ${first.thin.filter(t => t.shirtHeaviest).length} whose heaviest man is an empty shirt, ${first.thin.reduce((n, t) => n + t.shirts, 0)} shirts in all)` : ''}: ${cols.map(c => `${c.name} ${c.share} in 100, best rival ${fmt(c.top)}, mine leads ${c.mineLead} of ${c.n}, book ${c.bytes} bytes of a save of ${c.saveBytes}`).join('; ')}; old race best rival ${fmt(mean(xs0.map(x => x.raceTop)))} (mine leads ${xs0.filter(x => x.myTop > x.raceTop).length} of ${xs0.length}), my best ${fmt(mean(xs0.map(x => x.myTop)))}`);
  });
  for (const [ai, [name]] of arms.entries()) {
    const shares = table.map(t => t.cols[ai].share).sort((a, b) => a - b);
    const near = shares.filter(x => x >= 93 && x <= 97).length;
    console.log(`measure ${name}: of ${shares.length} leagues ${shares.filter(x => x >= 95).length} hold 95 in 100 or more on record, ${shares.filter(x => x < 95 && x >= 75).length} hold 75 to 94, ${shares.filter(x => x < 75).length} under 75; ${near} within two points of 95; the shares in order: ${shares.join(' ')}`);
  }
  const gm = mean(allGaps);
  const gsd = Math.sqrt(mean(allGaps.map(g => (g - gm) ** 2)));
  console.log(`measure a club's strength minus the mean rating of its eleven's outfield, over ${allGaps.length} clubs with an eleven: mean ${fmt(gm, 2)}, standard deviation ${fmt(gsd, 2)}, lowest ${fmt(Math.min(...allGaps), 1)}, highest ${fmt(Math.max(...allGaps), 1)} (an empty shirt stands at the club's strength)`);
  const whole = repair.careers - repair.late.length - repair.misfit.length - repair.none.length;
  console.log(`measure the repair: of ${repair.careers} careers on the engine as committed, ${whole} ended their season on a whole book that adds up to the table; on a late book ${repair.late.length}${repair.late.length ? ` [${repair.late.join('; ')}]` : ''}; whole and not adding up ${repair.misfit.length}${repair.misfit.length ? ` [${repair.misfit.join('; ')}]` : ''}; no readable book or no season end ${repair.none.length}${repair.none.length ? ` [${repair.none.join('; ')}]` : ''}`);
  console.log(`simCmLeagueBook: MEASURE leagues done, nothing gated (${Math.round((Date.now() - T0) / 1000)}s)`);
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
if (!candidate.boards) cannot('the league boards module is not in this tree');
for (const pos of ['GK', 'CB', 'LB', 'RB', 'LWB', 'RWB', 'CDM', 'CM', 'CAM', 'LM', 'RM', 'LW', 'RW', 'CF', 'ST']) {
  if (candidate.cm.groupOf(pos) !== lineOf(pos)) cannot(`the harness reads ${pos} as ${lineOf(pos)}, the engine as ${candidate.cm.groupOf(pos)}`);
}
if (process.env.BOOK_MEASURE === 'floor') {
  if (CONTROL) cannot('the measuring mode runs with no control');
  await measureFloor(candidate);
  process.exit(0);
}
if (process.env.BOOK_MEASURE === 'leagues') {
  if (CONTROL) cannot('the measuring mode runs with no control');
  let literal;
  let oldRule;
  try {
    literal = await engine('literal', ROOT, LITERAL);
    oldRule = await engine('oldrule', ROOT, OLD_RULE);
  } catch (e) { cannot(String(e?.message ?? e)); }
  await measureLeagues([['before the round', oldRule], ['the rule', candidate], ['literal', literal]]);
  process.exit(0);
}

console.log(`simCmLeagueBook: ${fleet.length} careers x ${SEASONS} seasons (${FULL ? 'full' : 'default'} fleet, seed set ${SEEDSET})${CONTROL ? `, CONTROL ${CONTROL}` : ''}`);
const acc = newAcc();
/* A save from the middle of a season, kept for the purchase probe of section names. */
const midSaves = [];
let tCand = Date.now();
const awardEnds = new Map();
const awardStats = [];
const candFaces = fleet.map((f, i) => playCareer(candidate, f.club, f.era, f.seed, {
  ...watcher(candidate, `${f.club} (${f.era}, seed ${f.seed})`, acc, {
    onEntry(after, r, season) {
      if (season !== 0 || i >= 4 || after.week < 22 || after.sacked || midSaves.some(m => m.f === f)) return;
      midSaves.push({ f, state: JSON.parse(JSON.stringify(after)) });
    },
  }),
  finished: (before, fin, season) => judgeAwards(candidate, `${f.club} (${f.era}, seed ${f.seed})`, before, fin, season),
}));
tCand = Date.now() - tCand;
/* THE FLEET IS WHAT IT SAYS, or the run says so and judges nothing: a data update that moves one of these
   clubs into another league must not quietly drop the arm it was picked for (the boards are only printed). */
{
  const sizes = new Set(acc.cover.map(x => x.clubs));
  const missing = [15, 18, 20, 24].filter(n => !sizes.has(n));
  if (missing.length) cannot(`the fleet no longer plays a league of ${missing.join(' and of ')} clubs (it played ${[...sizes].sort((a, b) => a - b).join(', ')}): pick another club for that arm`);
  if (!acc.cover.some(x => x.ledger) || !acc.cover.some(x => !x.ledger)) cannot('the fleet no longer plays both a league that keeps its results (a tiebreak reads them) and one that keeps none: pick another club for that arm');
}

/* The law once more with the video referee on. In a match I play a review can chalk a goal off or award a
   penalty, and the score is counted off the lines that are left; the book credits those same lines. The
   engine plays reviews when asked (the switch a player sees is another round's), so it is asked here. */
const accVar = newAcc();
/* THE ARM IS THE SAME SIX SEASONS ON BOTH FLEETS (the second fix pass of Round 1306): Everton and Arsenal,
   three seeds each, 228 league matches in a league that uses reviews. Until then the default fleet, the
   gate's own line, played two seasons here, one of them in a league with no video referee, and since Round
   1303 that read 2 to 10 reviews against a floor of "not zero". The six are the seasons the full fleet has
   always played on this arm (the same clubs, the same seeds), so its readings stand for both fleets now. */
for (const [club, era, ci] of VAR_ARM) {
  for (let k = 0; k < VAR_ARM_SEEDS; k++) {
    const seed = (seedOf(ci, k) ^ 0x5a5a) >>> 0;
    playCareer(candidate, club, era, seed, {
      ...watcher(candidate, `${club} (reviews on, seed ${seed})`, accVar), play: { skipHalftime: true, varReviews: true },
    }, 1);
  }
}
tick('law');
if (accVar.reviews < VAR_REVIEW_FLOOR) fail('law', `with the video referee on, ${accVar.reviews} reviews in ${accVar.myLeagueMatches} league matches of mine, under the floor of ${VAR_REVIEW_FLOOR}: the arm proved too little`);
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
/* Round 1306, thin (iv): the base commit's book entries at each season's end, by career and season. */
const baseEnds = new Map();
/* Round 1311, section awards (iii): the base commit's summary and record at each season's end. */
const baseAwardEnds = new Map();
if (BASE) {
  try { base = await engine('base', BASE); } catch (e) { cannot(`the base tree at ${BASE} did not build: ${String(e?.message ?? e)}`); }
  const n = fleet.length * SEASONS * 2;
  console.log(`stream  ${compareFaces('base', fleet.map(f => playCareer(base, f.club, f.era, f.seed, {
    seasonEnd(s, season) { baseEnds.set(`${f.club} (${f.era}, seed ${f.seed})|${season}`, JSON.parse(JSON.stringify(s.leagueBook?.c ?? null))); },
    finished(before, fin, season) { baseAwardEnds.set(`${f.club} (${f.era}, seed ${f.seed})|${season}`, { summary: JSON.stringify(fin.summary), record: JSON.stringify(fin.state.history.find(h => h.season === before.season) ?? null) }); },
  })))} of ${n} faces equal to the source of the base commit`);
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
  /* (v) WHO IS GIVEN A RIVAL'S ASSIST (Round 1306). Check (iii) holds HOW MANY assists there are and nothing
     held who gets them: with the assist dealt by the goal table the fleet and the unit file stayed green.
     Of the assists clubs with an eleven were given in matches between other clubs, the count on rows of
     forwards, midfielders and defenders against what the harness's own two tables say for each eleven. */
  const zAssist = {};
  for (const line of LINES) {
    tick('shapes');
    const p = acc.asExp[line] / Math.max(1, acc.asN);
    zAssist[line] = (acc.asObs[line] - acc.asExp[line]) / Math.max(1e-9, sd(acc.asN, p));
    if (Math.abs(zAssist[line]) > 4) fail('shapes', `${line}: given ${acc.asObs[line]} of ${acc.asN} assists between other clubs, the assist table says ${fmt(acc.asExp[line])} (z ${fmt(zAssist[line], 2)})`);
  }
  tick('shapes');
  if (acc.asN < ASSIST_FLOOR) fail('shapes', `only ${acc.asN} assists between other clubs: too few to judge who is given one (floor ${ASSIST_FLOOR})`);
  const all = acc.byLine.ATT + acc.byLine.MID + acc.byLine.DEF + acc.byLine.GK;
  const pct = x => fmt(100 * x / Math.max(1, all));
  console.log(`shapes  credited rival goals ${all}: forwards ${pct(acc.byLine.ATT)}%, midfielders ${pct(acc.byLine.MID)}%, defenders ${pct(acc.byLine.DEF)}%, keepers ${acc.byLine.GK} goals`);
  console.log(`        between other clubs (${n} goals), dealt against the weight: ${LINES.map(l => `${l} ${acc.aiObs[l]} vs ${fmt(acc.aiExp[l])} (z ${fmt((acc.aiObs[l] - acc.aiExp[l]) / Math.max(1e-9, sd(n, acc.aiExp[l] / Math.max(1, n))), 2)})`).join(', ')}`);
  console.log(`        clubs with an eleven: assists ${acc.xiAssists} on ${acc.xiRows} credited goals = ${fmt(acc.xiAssists / Math.max(1, acc.xiRows), 3)} a goal (the rule ${fmt(P_ASSIST, 3)}, z ${fmt(za, 2)}); own goals ${acc.xiOg} of ${named} = ${fmt(100 * acc.xiOg / Math.max(1, named), 2)}% (the rule ${fmt(100 * P_OG, 2)}%, z ${fmt(zo, 2)}); every club: ${acc.assists} assists on ${acc.rowGoals} credited goals = ${fmt(acc.assists / Math.max(1, acc.rowGoals), 3)} a goal`);
  console.log(`        who is given an assist, between other clubs (${acc.asN} assists), against the harness's own two tables: ${LINES.map(l => `${l} ${acc.asObs[l]} vs ${fmt(acc.asExp[l])} = ${fmt(100 * acc.asObs[l] / Math.max(1, acc.asN))}% vs ${fmt(100 * acc.asExp[l] / Math.max(1, acc.asN))}% (z ${fmt(zAssist[l], 2)})`).join(', ')}`);
  console.log(`        every goal its own roll: one man took every goal in ${acc.multi.one} of ${acc.multi.n} matches a club with an eleven scored two or more in = ${fmt(100 * acc.multi.one / Math.max(1, acc.multi.n))}% (the weight says ${fmt(100 * acc.multi.exp / Math.max(1, acc.multi.n))}%, z ${fmt(zm, 2)})`);
  console.log(`        unnamed goals ${acc.u} (club weeks with no named eleven: ${acc.noXiClubWeeks}); my league matches ${acc.myLeagueMatches}, reports whose lines did not add up to the score: ${acc.shortLines}`);
  for (const [league, t] of Object.entries(acc.thin)) {
    if (t.bare) console.log(`        no named eleven in ${league}: ${t.bare} of ${t.weeks} club weeks, ${t.clubs.size} of ${t.rivals.size} rival clubs seen (${[...t.clubs.values()].sort().slice(0, 6).join('; ')}${t.clubs.size > 6 ? '; ...' : ''})`);
  }
  console.log(`        top ten of the Goals board held by forwards and wingers: ${fmt(mean(acc.seasons.map(x => x.bookAtt)), 2)} on the book, ${fmt(mean(acc.seasons.map(x => x.raceAtt)), 2)} on the old race, rise ${fmt(purposeRise, 2)} (floor ${PURPOSE_FLOOR}) over ${acc.seasons.length} seasons`);
}

/* ---------- section thin (Round 1306): a club with no named eleven ---------- */
{
  const t = acc.thinDeal;
  /* (iii) THE DEAL FOLLOWS THE WEIGHT FOR A THIN CLUB TOO. A sum of unlike chances (each club its own
     roster), so its own variance, the way shapes (iv) is judged. */
  tick('thin');
  const zt = (t.named - t.exp) / Math.max(1e-9, Math.sqrt(t.vr));
  /* The fix pass of Round 1306: with no variance (every thin club of a fleet certain to name every goal, or
     certain to name none) there is no share to judge, and the gate says so instead of passing unasked. */
  if (!(t.vr > 0)) fail('thin', `the ${t.goals} goals of clubs with no eleven against other clubs carry no variance (every one certain to be named, or certain not to be): there is no share to judge`);
  else if (Math.abs(zt) > 4) fail('thin', `${t.named} of ${t.goals} goals of clubs with no eleven against other clubs are on a named row, the harness's own partial eleven says ${fmt(t.exp)} (z ${fmt(zt, 2)})`);
  tick('thin');
  if (t.goals < THIN_FLOOR) fail('thin', `only ${t.goals} goals of clubs with no eleven against other clubs: too few to judge a share on (floor ${THIN_FLOOR})`);
  /* (vi) and (vii) must have had something to hold: a thin club's clean sheet that went to a named man of
     its back line, and at least one roster of each kind held against the module's partial eleven. */
  tick('thin', 2);
  if (!acc.thinBacks.kept || !acc.thinBacks.toBacks) fail('thin', `of ${acc.thinBacks.matches} single matches of clubs with no eleven, ${acc.thinBacks.kept} were clean sheets and ${acc.thinBacks.toBacks} credits went to named men of a back line: nothing to judge who is given one on`);
  if (!acc.elevens.full || !acc.elevens.thin) fail('thin', `the module's partial eleven was held against ${acc.elevens.full} rosters that field an eleven and ${acc.elevens.thin} that do not: one kind was never tried`);
  /* (i) must have had something to hold: a thin club with a rostered keeper that kept one against me. */
  tick('thin');
  if (!acc.thinKeepers.clubSeasons || !acc.thinKeepers.vsMe) fail('thin', `the keeper rows of ${acc.thinKeepers.clubSeasons} club seasons with no eleven were held against the table, ${acc.thinKeepers.vsMe} of their clean sheets kept against me: nothing to judge on`);
  /* (iv) WHAT WAS NOT MEANT TO CHANGE: a club that had an eleven at every entry of a season. */
  let same = 0;
  let compared = 0;
  if (base && CONTROL !== 'weight') {
    for (const end of acc.ends) {
      const theirs = baseEnds.get(`${end.label}|${end.season}`);
      for (const club of end.rivals) {
        if (end.thinSeen.has(club)) continue;
        tick('thin');
        compared += 1;
        if (JSON.stringify(end.c[club] ?? null) === JSON.stringify(theirs?.[club] ?? null)) same += 1;
        else fail('thin', `${end.label} at the end of season ${end.season + 1}: the book's entry of ${club}, which had an eleven all season, is not the base commit's`);
      }
    }
    tick('thin');
    if (!compared) fail('thin', 'no club with an eleven all season was compared with the base commit');
  }
  console.log(`thin    clubs with no eleven, against other clubs: ${t.named} of ${t.goals} goals on a named row = ${fmt(100 * t.named / Math.max(1, t.goals))}% (the harness's own partial eleven says ${fmt(100 * t.exp / Math.max(1, t.goals))}%, z ${fmt(zt, 2)}, floor ${THIN_FLOOR} goals)`);
  console.log(`        keeper rows of ${acc.thinKeepers.clubSeasons} club seasons with no eleven held against the table (${acc.thinKeepers.sheets} clean sheets on them, ${acc.thinKeepers.vsMe} kept against me)`);
  console.log(`        who is given a thin club's clean sheet: ${acc.thinBacks.matches} single matches of clubs with no eleven judged row by row, ${acc.thinBacks.kept} of them clean sheets, ${acc.thinBacks.toBacks} credits to named men of a back line, ${acc.thinBacks.moved} club entries left out for a roster that moved inside the entry`);
  console.log(`        one way to take an eleven: the module's partial eleven held against the engine's eleven on ${acc.elevens.full} rosters and against the harness's own reading on ${acc.elevens.thin} rosters with no eleven`);
  console.log(base && CONTROL !== 'weight'
    ? `        clubs with an eleven all season: ${same} of ${compared} entries byte equal to the base commit's at the season's end`
    : '        thin (iv) NOT RUN: set BOOK_BASE to a worktree of the base commit');
  /* (v) printed: the thin league beside the whole one of the same length (the brief's stop rule, kept as a
     sanity print: a named man's edge over a shirt in his place is bounded, so it cannot fire by design). */
  const boots = id => acc.seasons.filter(x => x.league === id).map(x => x.bootRival);
  const se = xs => { const m = mean(xs); return Math.sqrt(mean(xs.map(x => (x - m) ** 2)) / Math.max(1, xs.length)); };
  const [thinBoots, wholeBoots] = [boots('bundesliga2'), boots('bundesliga')];
  if (thinBoots.length > 1 && wholeBoots.length > 1) {
    const gap = mean(thinBoots) - mean(wholeBoots);
    console.log(`        best rival total, the thin league against the whole one of the same length: bundesliga2 ${fmt(mean(thinBoots), 2)} (${thinBoots.length} seasons, standard error ${fmt(se(thinBoots), 2)}), bundesliga ${fmt(mean(wholeBoots), 2)} (${wholeBoots.length}, ${fmt(se(wholeBoots), 2)}): ${fmt(gap, 2)}, ${fmt(gap / Math.max(1e-9, Math.hypot(se(thinBoots), se(wholeBoots))), 2)} standard errors`);
  }
}

/* ---------- section boards (Round 1306): the pure reader, src/lib/clubManagerLeagueBoards.ts ---------- */
/**
 * What the engine will hand the reader, built here from a save by the harness: the book through the careful
 * reader, the rival clubs with their goals for, table place and whether the roster holds a keeper, my squad's
 * league lines. (The engine's own door is the round that follows; nothing in src calls the reader yet.)
 */
function boardInputOf(mod, s) {
  const { cm } = mod;
  const book = cm.leagueBookOf(s);
  if (!book) return null;
  const table = cm.sortedLeagueTable(s).map(r => r.club);
  const place = club => { const i = table.indexOf(club); return i < 0 ? table.length + 1 : i + 1; };
  const mine = cm.mySquadNames(s);
  const rosters = new Map();
  const rosterOf = club => { if (!rosters.has(club)) rosters.set(club, cm.oppRosterFor(s, club, mine)); return rosters.get(club); };
  const gf = new Map(s.table.map(r => [r.club, r.gf]));
  return {
    book,
    clubs: rivalsOf(s).map(club => ({ club, gf: gf.get(club) ?? 0, place: place(club), keeperOnRecord: rosterOf(club).some(p => p.p === 'GK') })),
    mine: s.squad.map(p => ({ id: p.id, name: p.name, pos: p.position, rating: p.rating, apps: p.comp?.league?.apps ?? 0, goals: p.comp?.league?.goals ?? 0, assists: p.comp?.league?.assists ?? 0, ...(p.generated ? { gen: true } : {}) })),
    myClub: s.clubName, myPlace: place(s.clubName),
    ratingOf: (club, name, pos) => rosterOf(club).find(p => p.n === name && p.p === pos)?.r ?? 0,
    lineOf: cm.groupOf,
  };
}
const BOARD_KINDS = ['goals', 'assists', 'sheets'];
/** The three boards' whole orders BY THE HARNESS'S OWN READING OF THE RULE (typed here on purpose): rival rows
 *  minus my squad's names, my men off their league lines (minus the baseline of a late book, never under
 *  nought) and the book's list of my clean sheets; a man on nought is on no board; names as plain text. */
function boardsByHand(s, input) {
  const { book } = input;
  const myNames = new Set(s.squad.map(p => p.name));
  const placeOf = new Map(input.clubs.map(c => [c.club, c.place]));
  const men = [];
  for (const [club, entry] of Object.entries(book.c)) {
    if (!placeOf.has(club)) continue;
    for (const [key, row] of Object.entries(entry.m)) {
      const bar = key.lastIndexOf('|');
      const name = key.slice(0, bar);
      if (myNames.has(name)) continue;
      men.push({ name, club, pos: key.slice(bar + 1), goals: row[0], assists: row[1], sheets: row[2], place: placeOf.get(club), gen: row[3] === 1 });
    }
  }
  const held = new Map((book.b ?? []).map(t => [t[0], t]));
  for (const p of s.squad) {
    const was = held.get(p.id);
    men.push({
      name: p.name, club: s.clubName, pos: p.position, mine: true, gen: p.generated === true, place: input.myPlace,
      goals: Math.max(0, (p.comp?.league?.goals ?? 0) - (was ? was[1] : 0)), assists: Math.max(0, (p.comp?.league?.assists ?? 0) - (was ? was[2] : 0)),
      sheets: (book.my.find(pair => pair[0] === p.id) ?? [0, 0])[1],
    });
  }
  const t = (a, b) => (a < b ? -1 : a > b ? 1 : 0);
  const last = (a, b) => t(a.name, b.name) || t(a.club, b.club) || t(a.pos, b.pos);
  const row = (m, n) => ({ name: m.name, club: m.club, pos: m.pos, n, ...(m.mine ? { mine: true } : {}), ...(m.gen ? { gen: true } : {}) });
  return {
    goals: men.filter(m => m.goals > 0).sort((a, b) => b.goals - a.goals || b.assists - a.assists || last(a, b)).map(m => row(m, m.goals)),
    assists: men.filter(m => m.assists > 0).sort((a, b) => b.assists - a.assists || b.goals - a.goals || last(a, b)).map(m => row(m, m.assists)),
    sheets: men.filter(m => m.pos === 'GK' && m.sheets > 0).sort((a, b) => b.sheets - a.sheets || a.place - b.place || last(a, b)).map(m => row(m, m.sheets)),
  };
}
/** Every reader of the module, called once on one save. */
function readEverything(mod, s) {
  const input = boardInputOf(mod, s);
  /* Round 1311: the engine's one door, asked on the same save. */
  const door = mod.cm.leagueBoardsOf ? mod.cm.leagueBoardsOf(s) : undefined;
  if (!input) return door ? { doorWithoutBook: true } : null;
  const { boards } = mod;
  const out = { fits: boards.bookFits(input.book, input.clubs), whole: boards.bookIsWhole(input.book), share: boards.bookShare(input.book, input.clubs), keepers: boards.keepersOnRecord(input.clubs), input, door };
  for (const kind of BOARD_KINDS) { out[kind] = boards.leaders(input, kind); out[`${kind}Mine`] = boards.bestOfMine(input, kind); }
  return out;
}
{
  const { boards } = candidate;
  const byLeague = new Map();
  for (const end of acc.endSaves) {
    const s = wake(candidate, end.save);
    const where = `${end.label} at the end of season ${end.season + 1}`;
    const got = readEverything(candidate, s);
    tick('boards');
    if (!got) { fail('boards', `${where}: no readable book to build the boards from`); continue; }
    if (got.doorWithoutBook) { fail('boards', `${where}: leagueBoardsOf answered on a save the careful reader refuses`); continue; }
    /* Round 1311: the engine's door is the harness's input, field for field, and says what the reader says. */
    tick('boards', 5);
    if (got.door === undefined) fail('boards', `${where}: the engine has no leagueBoardsOf`);
    else if ((got.door === null) !== !got.fits) fail('boards', `${where}: leagueBoardsOf is ${got.door === null ? 'null' : 'not null'} on a book that ${got.fits ? 'fits' : 'does not fit'}`);
    else if (got.door) {
      const plain = x => JSON.stringify({ book: x.book, clubs: x.clubs, mine: x.mine, myClub: x.myClub, myPlace: x.myPlace });
      if (plain(got.door.input) !== plain(got.input)) fail('boards', `${where}: leagueBoardsOf hands the reader another input than the save's`);
      if (got.door.share !== got.share.share || got.door.from !== (got.input.book.r0 ?? null) || JSON.stringify(got.door.keepers) !== JSON.stringify(got.keepers)) fail('boards', `${where}: leagueBoardsOf says share ${got.door.share}, from ${got.door.from}, keepers ${JSON.stringify(got.door.keepers)}; the reader says ${got.share.share}, ${got.input.book.r0 ?? null}, ${JSON.stringify(got.keepers)}`);
      const lines = s.squad.length ? candidate.book.bookRows(got.input.book) : [];
      const offRating = lines.find(r => got.door.input.ratingOf(r.club, r.name, r.pos) !== got.input.ratingOf(r.club, r.name, r.pos));
      if (offRating) fail('boards', `${where}: leagueBoardsOf rates ${offRating.name} (${offRating.club}) otherwise than his roster does`);
      if (got.door.input.lineOf !== candidate.cm.groupOf) fail('boards', `${where}: leagueBoardsOf does not hand in the engine's own grouping`);
    }
    /* (i) every career of the fleet started its season with a book: at the season's end it is WHOLE AND FITS. */
    tick('boards');
    if (!got.fits || !got.whole) fail('boards', `${where}: the book ${got.fits ? 'fits the table' : 'does not add up to the table'} and is ${got.whole ? 'whole' : 'a late book'}`);
    /* (ii) each board against the harness's own reading of the rule, and what a board may never hold. */
    const hand = boardsByHand(s, got.input);
    const myNames = new Set(s.squad.map(p => p.name));
    for (const kind of BOARD_KINDS) {
      tick('boards', 4);
      if (JSON.stringify(got[kind]) !== JSON.stringify(hand[kind].slice(0, boards.BOARD_ROWS))) fail('boards', `${where}: the ${kind} board is not the harness's own reading of the rule (first row ${JSON.stringify(got[kind][0] ?? null)} against ${JSON.stringify(hand[kind][0] ?? null)})`);
      const whole = boards.leaders(got.input, kind, 100000);
      if (JSON.stringify(whole) !== JSON.stringify(hand[kind])) fail('boards', `${where}: the whole order of the ${kind} board (${whole.length} men) is not the harness's own (${hand[kind].length})`);
      const firstMine = hand[kind].findIndex(m => m.mine);
      const wantMine = firstMine < 0 ? null : { place: firstMine + 1, man: hand[kind][firstMine] };
      if (JSON.stringify(got[`${kind}Mine`]) !== JSON.stringify(wantMine)) fail('boards', `${where}: my best man on the ${kind} board is ${JSON.stringify(got[`${kind}Mine`])}, the whole order says ${JSON.stringify(wantMine)}`);
      const bad = whole.find((m, i) => m.n <= 0 || (!m.mine && myNames.has(m.name)) || (kind === 'sheets' && m.pos !== 'GK') || whole.findIndex(o => o.name === m.name && o.club === m.club && o.pos === m.pos) !== i);
      if (bad) fail('boards', `${where}: the ${kind} board holds ${JSON.stringify(bad)} (on nought, twice, a rival row under a name of my squad, or not a keeper)`);
    }
    const leagueId = candidate.cm.careerLeagueOf(s).id;
    const lg = byLeague.get(leagueId) ?? { n: 0, named: 0, all: 0, keepers: got.keepers, top: { goals: [], assists: [], sheets: [] }, mineTop: 0, first: null };
    lg.n += 1;
    lg.named += got.share.named + got.share.own;
    lg.all += got.share.named + got.share.own + got.share.unnamed;
    for (const kind of BOARD_KINDS) lg.top[kind].push(got[kind][0]?.n ?? 0);
    if (got.goals[0]?.mine) lg.mineTop += 1;
    lg.first ??= { where, got };
    byLeague.set(leagueId, lg);
  }
  tick('boards');
  if (!acc.endSaves.length) fail('boards', 'no season of the fleet reached the reader');
  /* (iii) THE LEAD'S RULING 7: a match with the boards open is the match without them. The fleet once more
     on a fresh copy of the candidate, every reader called before every entry: the faces and the counts of
     draws are the watched fleet's, and the save is the same text before and after the readers. */
  {
    const reader = await candidate.again();
    fleet.forEach((f, i) => {
      let moved = 0;
      let calls = 0;
      const faces = playCareer(reader, f.club, f.era, f.seed, {
        peek(s) { const before = JSON.stringify(s); if (readEverything(reader, s)) calls += 1; if (JSON.stringify(s) !== before) moved += 1; return null; },
      });
      tick('boards', faces.length + 2);
      const off = faces.findIndex((face, j) => face !== candFaces[i][j]);
      if (faces.length !== candFaces[i].length || off >= 0) fail('boards', `${f.club} (${f.era}, seed ${f.seed}): with every reader called before every entry the save or the count of draws differs from face ${off} of ${faces.length}`);
      if (moved) fail('boards', `${f.club} (${f.era}, seed ${f.seed}): the readers changed the save they were handed at ${moved} entries`);
      if (!calls) fail('boards', `${f.club} (${f.era}, seed ${f.seed}): the readers were never called on a readable book`);
    });
  }
  /* (iv) the reader draws nothing and reads no clock or locale: its source as the control layer hands it,
     comments stripped. */
  for (const file of [BOARDS, LEADERS_CARD, HONOURS_CARD].filter(x => fs.existsSync(path.join(ROOT, x)))) {
    let text = fs.readFileSync(path.join(ROOT, file), 'utf8').replace(/\r\n/g, '\n');
    for (const p of (CONTROL ? CONTROLS[CONTROL].patch : []).filter(x => x.file === file)) text = text.split(p.from).join(p.to);
    const code = text.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
    for (const banned of ['Math.random', 'Date.now', 'new Date', 'localeCompare']) {
      tick('boards');
      if (code.includes(banned)) fail('boards', `${file} holds ${banned}: the reader and the card draw nothing, read no clock and compare names as plain text`);
    }
  }
  /* (vi) printed for the lead, never gated. */
  console.log(`boards  ${checked.get('boards')} checks over ${acc.endSaves.length} season ends: each board against the harness's own reading, every reader before every entry of the fleet`);
  for (const [league, lg] of byLeague) {
    console.log(`        ${league.padEnd(12)} ${String(lg.n).padStart(2)} seasons: on record ${lg.all ? Math.floor(100 * lg.named / lg.all) : 100} in 100, keepers on record ${lg.keepers.have} of ${lg.keepers.of}; leaders, mean: goals ${fmt(mean(lg.top.goals))}, assists ${fmt(mean(lg.top.assists))}, clean sheets ${fmt(mean(lg.top.sheets))}; one of mine top of the Goals board in ${lg.mineTop}`);
  }
  for (const league of ['premier', 'laliga', 'bundesliga2', 'championship', 'bundesliga'].filter(l => byLeague.has(l)).slice(0, 3)) {
    const { where, got } = byLeague.get(league).first;
    const line = xs => xs.map(m => `${m.name}${m.mine ? ' (mine)' : ''}${m.gen ? ' (made up)' : ''}, ${m.club}, ${m.pos} ${m.n}`).join('; ');
    console.log(`        ${league}, ${where} (on record ${got.share.share} in 100):`);
    console.log(`          Top scorers: ${line(got.goals)}`);
    console.log(`          Assists: ${line(got.assists.slice(0, 5))}`);
    console.log(`          Clean sheets: ${line(got.sheets.slice(0, 5))}`);
  }
}

/* ---------- section awards (Round 1311): the season's honours from the book, and only where it decides ---------- */
/**
 * One season's end, judged by the harness's own reading of the rule (decidesByHand). (i) On a season the book
 * decides, the summary's golden boot is the Goals board's first and its awards are the first of each board
 * with the share on record; the season's record keeps the same awards. On any other season (a late book, no
 * book that adds up, a share under the floor) nothing new is written and the golden boot is the old race's.
 */
function judgeAwards(mod, label, before, fin, season) {
  const { cm, boards } = mod;
  const where = `${label} at the end of season ${season + 1}`;
  const book = cm.leagueBookOf(before);
  const lb = cm.leagueBoardsOf(before);
  const share = book ? shareByHand(before, book) : null;
  const decided = Boolean(book && lb && decidesByHand(before, book));
  const { summary } = fin;
  const record = fin.state.history.find(h => h.season === before.season) ?? null;
  tick('awards', 3);
  if (decided) {
    const first = kind => boards.leaders(lb.input, kind, 1)[0] ?? null;
    const g = first('goals');
    const boot = g ? { name: g.name, club: g.club, goals: g.n } : null;
    if (JSON.stringify(summary.goldenBoot ?? null) !== JSON.stringify(boot)) fail('awards', `${where}: the summary's golden boot ${JSON.stringify(summary.goldenBoot)} is not the Goals board's first ${JSON.stringify(boot)}`);
    const want = { cov: share };
    for (const [key, kind] of [['boot', 'goals'], ['ast', 'assists'], ['glove', 'sheets']]) {
      const m = first(kind);
      if (m) want[key] = [m.name, m.club, m.n, (m.gen ? 1 : 0) + (m.mine ? 2 : 0)];
    }
    /* Round 1311 step 5: the team of the season, by the module, held to its shape here. */
    const xi = boards.teamOfSeason(lb.input);
    if (xi) {
      want.xi = xi;
      tick('awards', 3);
      const lines = xi.map(m => lineOf(m[2]));
      const shape = ['GK', 'DEF', 'DEF', 'DEF', 'DEF', 'MID', 'MID', 'MID', 'MID', 'ATT', 'ATT'];
      if (JSON.stringify(lines) !== JSON.stringify(shape)) fail('awards', `${where}: the team of the season is not a keeper, four defenders, four midfielders and two forwards: ${lines.join(' ')}`);
      if (new Set(xi.map(m => `${m[0]}|${m[1]}|${m[2]}`)).size !== 11) fail('awards', `${where}: a man is twice in the team of the season`);
      const myNames = new Set(before.squad.map(p => p.name));
      const rowKeys = new Set(mod.book.bookRows(book).map(r => `${r.name}|${r.club}|${r.pos}`));
      const stray = xi.find(m => ((m[3] & 2) ? !myNames.has(m[0]) : !rowKeys.has(`${m[0]}|${m[1]}|${m[2]}`)));
      if (stray) fail('awards', `${where}: ${stray[0]} (${stray[1]}) is in the team of the season with no row in the book and not in my squad`);
      /* (v) the back four: how many of one club. */
      const counts = new Map();
      for (const m of xi.slice(1, 5)) counts.set(m[1], (counts.get(m[1]) ?? 0) + 1);
      acc.backFours = acc.backFours ?? [];
      acc.backFours.push(Math.max(...counts.values()));
    } else acc.noTeam = (acc.noTeam ?? 0) + 1;
    if (JSON.stringify(summary.awards ?? null) !== JSON.stringify(want)) fail('awards', `${where}: the summary's awards ${JSON.stringify(summary.awards)} are not the first of each board with the share on record ${JSON.stringify(want)}`);
    if (JSON.stringify(record?.awards ?? null) !== JSON.stringify(want)) fail('awards', `${where}: the season's record keeps ${JSON.stringify(record?.awards)}, not the summary's awards`);
  } else {
    const why = !book || !lb ? 'no book that adds up' : book.r0 !== undefined ? 'a late book' : `under the floor: ${share} in 100 on record`;
    if ('awards' in summary || (record && 'awards' in record)) fail('awards', `${where}: awards were written on a season the book does not decide (${why})`);
    const race = cm.goldenBootTable(before, 1, null)[0] ?? null;
    const boot = race && race.goals > 0 ? { name: race.name, club: race.club, goals: race.goals } : null;
    if (JSON.stringify(summary.goldenBoot ?? null) !== JSON.stringify(boot)) fail('awards', `${where}: the summary's golden boot ${JSON.stringify(summary.goldenBoot)} is not the old race's ${JSON.stringify(boot)} (${why})`);
  }
  awardEnds.set(`${label}|${season}`, { decided, summary: JSON.stringify(summary), record: JSON.stringify(record) });
  const myRow = before.table.find(r => r.club === before.clubName);
  awardStats.push({
    league: cm.careerLeagueOf(before).id, share, decided, late: Boolean(book && book.r0 !== undefined), mineBoot: summary.goldenBoot?.club === before.clubName,
    whole: Boolean(book && book.r0 === undefined), top: lb ? (boards.leaders(lb.input, 'goals', 1)[0]?.n ?? 0) : null, len: myRow ? myRow.w + myRow.d + myRow.l : 0,
  });
}
{
  /* (i) on a LATE book: two careers of the fleet whose book is taken off the save ten entries in, so the next
     entry opens a late one; their season's end is judged like every other. */
  let lateEnds = 0;
  const lateMod = await candidate.again();
  for (const f of fleet.slice(0, 2)) {
    let n = 0;
    playCareer(lateMod, f.club, f.era, (f.seed ^ 0x1311) >>> 0, {
      entry(b, after) { n += 1; if (n === 10) delete after.leagueBook; },
      finished(before, fin, season) { if (before.leagueBook?.r0 !== undefined) lateEnds += 1; judgeAwards(lateMod,`${f.club} (${f.era}, a late book)`, before, fin, season); },
    }, 1);
  }
  tick('awards');
  if (!lateEnds) fail('awards', 'the late arm never ended a season on a late book: the rule for a late book was not tried');
  /* (v) THE BACK FOUR (step 5): over every season the book decided, the mean number of men of one club in the
     team's back four. Round 1229 read 1.7 under this rule and 2.9 to 3.2 under "clean sheets plus goals plus
     assists" (the control teamsheets). BACK_FOUR_LINE is midway between the two measured ranges (header). */
  {
    const xs = acc.backFours ?? [];
    tick('awards');
    if (xs.length < 4) fail('awards', `only ${xs.length} teams of the season to judge the back four on`);
    else if (xs.length >= BACK_FOUR_MIN_TEAMS && mean(xs) > BACK_FOUR_LINE) fail('awards', `the back four holds ${fmt(mean(xs), 2)} men of one club on average over ${xs.length} teams, over the line of ${BACK_FOUR_LINE}`);
    console.log(`awards  back four: ${fmt(mean(xs), 2)} men of one club on average over ${xs.length} teams of the season (line ${BACK_FOUR_LINE}, ${xs.length >= BACK_FOUR_MIN_TEAMS ? 'judged' : `printed only: under ${BACK_FOUR_MIN_TEAMS} teams`}); ${acc.noTeam ?? 0} seasons the book decided had no team`);
  }
  /* (ii) A SEVEN SEASON CAREER: the three winners on all seven records, the team on the newest five only, every
     record the same after a JSON round trip. One club of the fleet, on a fresh copy. */
  {
    const seven = await candidate.again();
    const f = fleet[0];
    let records = null;
    playCareer(seven, f.club, f.era, (f.seed ^ 0x7777) >>> 0, { finished(before, fin, season) { if (season === 6) records = fin.state.history; } }, 7);
    tick('awards', 3);
    if (!records) fail('awards', `${f.club}: the seven season career did not reach its seventh season's end`);
    else {
      const withAwards = records.filter(h => h.awards).sort((a, b) => b.season - a.season);
      const teams = withAwards.filter(h => h.awards.xi).map(h => h.season);
      const newest = withAwards.slice(0, 5).map(h => h.season);
      if (withAwards.length < 7) fail('awards', `${f.club}: ${withAwards.length} of 7 records hold awards`);
      if (teams.some(s => !newest.includes(s))) fail('awards', `${f.club}: a team on season ${teams.find(s => !newest.includes(s))}, older than the newest five records with awards`);
      if (JSON.stringify(JSON.parse(JSON.stringify(records))) !== JSON.stringify(records)) fail('awards', `${f.club}: the records do not survive a JSON round trip`);
      console.log(`awards  seven seasons of ${f.club}: awards on ${withAwards.length} records, a team on ${teams.length} (seasons ${teams.join(', ')})`);
    }
  }
  /* (iii) WHAT WAS NOT MEANT TO CHANGE (needs BOOK_BASE): on a season the book does not decide, the WHOLE
     summary and record are the base commit's; on one it decides, all of them but the four moved fields. */
  let same = 0;
  let compared = 0;
  if (base) {
    for (const [key, c] of awardEnds) {
      const b = baseAwardEnds.get(key);
      if (!b) continue;
      compared += 1;
      tick('awards', 2);
      const strip = json => JSON.stringify(json === 'null' ? null : (() => { const o = JSON.parse(json); for (const m of MOVED) delete o[m]; return o; })());
      const sumA = c.decided ? strip(c.summary) : c.summary;
      const sumB = c.decided ? strip(b.summary) : b.summary;
      const recA = c.decided ? strip(c.record) : c.record;
      const recB = c.decided ? strip(b.record) : b.record;
      if (sumA !== sumB) fail('awards', `${key}: the summary ${c.decided ? 'but its four moved fields ' : ''}differs from the base commit's${c.decided ? '' : ' on a season the book does not decide'}`);
      else if (recA !== recB) fail('awards', `${key}: the season's record ${c.decided ? 'but its awards ' : ''}differs from the base commit's`);
      else same += 1;
    }
    tick('awards');
    if (!compared) fail('awards', 'no season end was compared with the base commit');
  }
  const decidedN = awardStats.filter(x => x.decided).length;
  console.log(`awards  ${checked.get('awards')} checks over ${awardStats.length} season ends: ${decidedN} decided by the book, ${awardStats.filter(x => !x.decided && !x.late).length} under the floor or with no book, ${awardStats.filter(x => x.late).length} on a late book (${lateEnds} from the late arm)`);
  console.log(base ? `        ${same} of ${compared} season ends equal to the base commit (the whole summary and record where the book does not decide, all but the four moved fields where it does)` : '        awards (iii) NOT RUN: set BOOK_BASE to a worktree of the base commit');
  const byLeague = new Map();
  for (const x of awardStats) { const l = byLeague.get(x.league) ?? []; l.push(x); byLeague.set(x.league, l); }
  for (const [league, xs] of byLeague) console.log(`        ${league.padEnd(12)} ${xs.length} season ends: on record ${xs.map(x => x.share).join(' ')}, decided by the book ${xs.filter(x => x.decided).length}, one of mine won the boot ${xs.filter(x => x.mineBoot).length}`);
}

/* ---------- section facts (Round 1311 step 4): the fleet's top scorers beside the real leagues' ---------- */
/**
 * The real figures come from scripts/data/cmLeagueBookFacts.json (Round 1310), USED figures only, read here by
 * the harness's OWN reading of that file's rule (typed again on purpose, the way this harness types its weight
 * table): a figure is USED when two publishers on two different hosts print it and agree exactly, and a
 * season's length (the matches a club played) is USED the same way from the format rows (a span row says
 * nothing of 2019-20). Nothing under src reads the file (its own fence, scripts/simCmLeagueBookFacts.mjs,
 * holds that, and the receipt, and the two sources).
 * PRINTED: by season length, the fleet's mean top scorer beside each real league's mean of the same length,
 * and the gap in the fleet's own standard errors. BOUND, the one band with measured room: the fleet's mean
 * top scorer over its 38 match seasons lies between the lowest and the highest real 38 match league mean, each
 * edge widened by three of the fleet's own standard errors (its winners' deviation over the root of its
 * seasons). THIS BAND CANNOT TELL THE TAKER RULE ON FROM OFF: Round 1229 measured the taker off at 23.5 to
 * 24.8, astride the lower edge. It catches a leak (control bookleak: every goal of a side to its taker) and
 * nothing finer; do not cite it for the taker.
 */
function realTopScorers() {
  const facts = JSON.parse(fs.readFileSync(path.join(ROOT, 'scripts/data/cmLeagueBookFacts.json'), 'utf8'));
  const host = url => new URL(url).host.toLowerCase().replace(/^www\./, '');
  const seasonsOf = s => {
    let m = /^(\d{4})-(\d{2})$/.exec(s ?? '');
    if (m) return [s];
    m = /^(\d{4})-(\d{2}) to (\d{4})-(\d{2})$/.exec(s ?? '');
    if (!m) return [];
    const out = [];
    for (let y = Number(m[1]); y <= Number(m[3]); y += 1) out.push(`${y}-${String((y + 1) % 100).padStart(2, '0')}`);
    return out;
  };
  const used = rs => {
    if (!rs?.length) return null;
    const values = new Set(rs.map(r => r.value));
    return values.size === 1 && new Set(rs.map(r => r.row.publisher)).size >= 2 && new Set(rs.map(r => host(r.row.url))).size >= 2 ? rs[0].value : null;
  };
  const goals = new Map();
  const lengths = new Map();
  const add = (map, k, v) => map.set(k, [...(map.get(k) ?? []), v]);
  for (const row of facts.rows) {
    const fig = row.figures ?? {};
    const seasons = seasonsOf(row.season);
    if (typeof fig.topScorerGoals === 'number' && seasons.length === 1) add(goals, `${row.competition}|${row.season}`, { row, value: fig.topScorerGoals });
    if (fig.curtailed === true || Number.isInteger(fig.matchesPerClub) || Number.isInteger(fig.clubs)) {
      const value = fig.curtailed === true ? 'curtailed' : Number.isInteger(fig.matchesPerClub) ? fig.matchesPerClub : 2 * (fig.clubs - 1);
      for (const s of seasons) if (!(seasons.length > 1 && s === '2019-20')) add(lengths, `${row.competition}|${s}`, { row, value });
    }
  }
  const out = [];
  for (const [k, rs] of goals) {
    const g = used(rs);
    const len = used(lengths.get(k));
    if (g !== null && Number.isInteger(len)) out.push({ league: k.split('|')[0], season: k.split('|')[1], goals: g, len });
  }
  return out;
}
{
  const real = realTopScorers();
  const byLen = new Map();
  for (const r of real) { const m = byLen.get(r.len) ?? new Map(); m.set(r.league, [...(m.get(r.league) ?? []), r.goals]); byLen.set(r.len, m); }
  const fleetSeasons = awardStats.filter(x => x.whole && x.top !== null);
  const sdOf = xs => { const m = mean(xs); return Math.sqrt(xs.reduce((a, x) => a + (x - m) ** 2, 0) / Math.max(1, xs.length - 1)); };
  tick('facts');
  if (!real.length) fail('facts', 'no USED top scorer figure in scripts/data/cmLeagueBookFacts.json');
  for (const [len, leagues] of [...byLen.entries()].sort((a, b) => b[0] - a[0])) {
    const fleet = fleetSeasons.filter(x => x.len === len).map(x => x.top);
    const se = fleet.length > 1 ? sdOf(fleet) / Math.sqrt(fleet.length) : null;
    const line = [...leagues.entries()].map(([league, xs]) => `${league} ${fmt(mean(xs))} (${xs.length})${se ? `, gap ${fmt((mean(fleet) - mean(xs)) / se, 1)} standard errors` : ''}`).join('; ');
    console.log(`facts   ${len} match seasons: the fleet's top scorer ${fleet.length ? `${fmt(mean(fleet))} over ${fleet.length} seasons (standard error ${fmt(se ?? 0, 2)})` : 'not played'}; the real leagues: ${line}`);
  }
  /* THE BAND, on 38 match seasons. */
  const real38 = byLen.get(38);
  const fleet38 = fleetSeasons.filter(x => x.len === 38).map(x => x.top);
  tick('facts');
  if (!real38 || real38.size < 2) fail('facts', 'fewer than two real leagues with USED 38 match seasons: the band has no edges');
  else if (fleet38.length < 2) fail('facts', `the fleet played ${fleet38.length} season of 38 matches: the band cannot be judged`);
  else {
    const means = [...real38.values()].map(xs => mean(xs));
    const se = sdOf(fleet38) / Math.sqrt(fleet38.length);
    const lo = Math.min(...means) - 3 * se;
    const hi = Math.max(...means) + 3 * se;
    const m = mean(fleet38);
    console.log(`facts   the band on 38 match seasons: ${fmt(lo, 2)} to ${fmt(hi, 2)} (real league means ${fmt(Math.min(...means))} to ${fmt(Math.max(...means))}, widened by three standard errors of ${fmt(se, 2)}); the fleet ${fmt(m, 2)} over ${fleet38.length} seasons, ${fmt((m - lo) / se, 1)} standard errors over the low edge and ${fmt((hi - m) / se, 1)} under the high one`);
    if (m < lo || m > hi) fail('facts', `the fleet's mean top scorer over its 38 match seasons is ${fmt(m, 2)}, outside the band ${fmt(lo, 2)} to ${fmt(hi, 2)} the real leagues give`);
  }
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

/* ---------- section oldsave (Round 1306): a save with no fit book starts one at its next match week ---------- */
{
  const { boards } = candidate;
  const bookless = s => sha(withoutBook(s));
  /** What ensureLeagueBook must make of a save, read off the save as it stood BEFORE its first entry: no
   *  league match left means nothing; no league match played yet means an ordinary whole book; otherwise a
   *  late book from the next league round, opened on the rivals' goals for and my men's league lines. */
  const expected = s0 => {
    const gf = new Map(s0.table.map(r => [r.club, r.gf]));
    const next = s0.calendar.slice(s0.week).find(e => e.type === 'league') ?? null;
    return {
      next, whole: s0.table.every(r => played(r) === 0),
      u0: rivalsOf(s0).reduce((n, c) => n + (gf.get(c) ?? 0), 0),
      mine: s0.squad.map(p => `${p.comp?.league?.goals ?? 0}|${p.comp?.league?.assists ?? 0}`).filter(x => x !== '0|0').sort().join(' '),
    };
  };
  /** The book of `s` right after the entry that should have opened it, against `want`. */
  const judgeOpened = (mod, name, s, want) => {
    const book = mod.cm.leagueBookOf(s);
    tick('oldsave', 4);
    if (!want.next) { if ('leagueBook' in s && book) fail('oldsave', `${name}: a book was opened with no league match left to record`); return; }
    if (!book) { fail('oldsave', `${name}: after its first entry the save holds no readable book`); return; }
    if (want.whole) {
      if (!boards.bookIsWhole(book) || book.b !== undefined || book.u0 !== undefined) fail('oldsave', `${name}: no league match had been played, and the book opened is a late one (r0 ${book.r0})`);
      return;
    }
    if (book.r0 !== want.next.round) fail('oldsave', `${name}: the late book says it started at round index ${book.r0}, the next league entry was round index ${want.next.round}`);
    if (book.u0 !== want.u0) fail('oldsave', `${name}: the late book was opened on ${book.u0} rival goals, the table held ${want.u0}`);
    const held = (book.b ?? []).map(t => `${t[1]}|${t[2]}`).sort().join(' ');
    if (held !== want.mine) fail('oldsave', `${name}: the late book's baseline of my men (${held}) is not their league lines as they stood (${want.mine})`);
    /* (v) a release rolled back for a day reads a save this round wrote: the base commit's careful reader accepts it. */
    if (base?.book) {
      tick('oldsave');
      if (!base.book.readBook(JSON.parse(JSON.stringify(s.leagueBook)), s.leagueBook.s)) fail('oldsave', `${name}: the base commit's reader refuses the late book this engine wrote`);
    }
  };
  /** A save played to the end of its season on one engine: a face (the whole save but the book, and the
   *  count of draws) after every entry, the board, the summary, the next season. `judge` (the candidate
   *  only) also holds the book that opens and the law after every entry. */
  const finishOn = (mod, save, judge) => onStream(save.seed, draw => {
    let s;
    if (save.viaLoad) { store.clear(); store.set(mod.cm.SAVE_KEY, save.raw); s = mod.cm.loadCareer(); } else s = wake(mod, JSON.parse(save.raw));
    if (!s) return null;
    const faces = [bookless(s)];
    const bookAtLoad = 'leagueBook' in s;
    const want = judge ? expected(s) : null;
    let late = 0;
    let guard = 0;
    while (s.week < s.calendar.length && guard++ < 220) {
      const r = mod.cm.playNextEntry(s, { skipHalftime: true });
      s = r.state;
      faces.push(`${bookless(s)}|${draw.calls()}`);
      if (judge) {
        if (guard === 1) judgeOpened(mod, save.name, s, want);
        if (want.next) lawNow(mod, s, save.name, `entry ${guard}`, 'oldsave');
        if (s.leagueBook?.r0 !== undefined) late += 1;
      }
      if (r.kind === 'seasonOver') break;
    }
    const board = JSON.stringify(mod.cm.goldenBootTable(s, 12));
    /* Round 1311: does the book decide this season (by the harness's own reading of the rule)? Then the
       board and the boot must be the book's Goals board, and the reference engines' old race is not asked. */
    const ownBook = mod.cm.leagueBoardsOf ? mod.cm.leagueBoardsOf(s) : null;
    const decided = Boolean(ownBook && decidesByHand(s, ownBook.input.book));
    const bookBoard = decided ? JSON.stringify(mod.boards.leaders(ownBook.input, 'goals', 12).map(m => [m.name, m.club, m.n])) : null;
    const fin = mod.cm.finishSeason(s);
    return { faces, bookAtLoad, late, wantLate: Boolean(want?.next && !want.whole), board, boot: JSON.stringify(fin.summary.goldenBoot ?? null), decided, bookBoard, next: mod.cm.startNextSeason(fin.state) };
  });
  const saves = [
    { name: 'the committed save of Round 1052 (Sevilla)', raw: fs.readFileSync(path.join(ROOT, 'scripts/data/cmOldSave1052Fixture.json'), 'utf8'), viaLoad: true, seed: 0x7001 },
    { name: 'the committed second tier save (Valencia)', raw: fs.readFileSync(path.join(ROOT, 'scripts/data/cmSecondTierOldSaveFixture.json'), 'utf8'), viaLoad: true, seed: 0x7002 },
  ];
  /* And three written in this run by the engine with the book out (never by the base commit, which keeps a
     book itself): two twenty entries into a season, and one PARKED AT THE FIRST WEEK of its second season,
     where no league match has been played and the book that opens must be an ordinary whole one. */
  const writer = await refs[0][1].again();
  for (const [club, seed] of [['Everton', 0x7003], ['Southampton', 0x7004]]) {
    const raw = onStream(seed, () => {
      let s = writer.cm.startCareer(club);
      for (let k = 0; k < 20; k++) s = writer.cm.playNextEntry(s, { skipHalftime: true }).state;
      return JSON.stringify(s);
    });
    saves.push({ name: `${club}, twenty entries in, written by the ${refs[0][0]} engine`, raw, viaLoad: false, seed: seed + 16 });
  }
  {
    const raw = onStream(0x7005, () => {
      let s = writer.cm.startCareer('Bayern Munich');
      let guard = 0;
      while (s.week < s.calendar.length && guard++ < 220) { const r = writer.cm.playNextEntry(s, { skipHalftime: true }); s = r.state; if (r.kind === 'seasonOver') break; }
      return JSON.stringify(writer.cm.startNextSeason(writer.cm.finishSeason(s).state));
    });
    saves.push({ name: `Bayern Munich, parked at the first week of season two, written by the ${refs[0][0]} engine`, raw, viaLoad: false, seed: 0x7015, parked: true });
    /* The fix pass of Round 1306: the same parked save with A GOALLESS FIRST ROUND written into its table
       (every club one draw, nobody a goal). The repair asks whether a league MATCH has been played, not
       whether a goal has been scored: clean sheets were kept in that round, and a book opened whole would
       claim a season it did not see. So this one gets a LATE book. No fleet reaches a round with no goal
       in it, which is why the save is made by hand; only the table is touched, the one thing the repair
       reads for this. */
    const goalless = JSON.parse(raw);
    if (!goalless.table.every(r => played(r) === 0 && r.gf === 0)) cannot('the parked save is not at the first week of its season: the goalless round cannot be written into it');
    for (const r of goalless.table) { r.d = 1; r.pts = 1; }
    saves.push({ name: 'Bayern Munich at the first week of season two with a goalless first round written into its table', raw: JSON.stringify(goalless), viaLoad: false, seed: 0x7025 });
  }
  /* (i) each save on the candidate and on every reference engine, two fresh copies a pair. */
  const followUps = [];
  let lateSaves = 0;
  for (const [refName, ref] of refs) {
    const candCopy = await candidate.again();
    const refCopy = await ref.again();
    for (const save of saves) {
      if (JSON.parse(save.raw).leagueBook !== undefined) cannot(`${save.name} carries a league book: it is not an old save`);
      const first = refName === refs[0][0];
      const a = finishOn(candCopy, save, first);
      const b = finishOn(refCopy, save, false);
      tick('oldsave');
      if (!a || !b) { fail('oldsave', `${save.name}: did not load (${a ? 'candidate ok' : 'candidate null'}, ${b ? `${refName} ok` : `${refName} null`})`); continue; }
      tick('oldsave');
      if (a.bookAtLoad) fail('oldsave', `${save.name}: the load itself gave the save a league book (a load is a read: the book opens when a match is played)`);
      const firstOff = a.faces.findIndex((face, i) => face !== b.faces[i]);
      tick('oldsave', a.faces.length);
      if (a.faces.length !== b.faces.length || firstOff >= 0) fail('oldsave', `${save.name}: the save but its book differs from the ${refName} engine's from entry ${firstOff} of ${a.faces.length}`);
      tick('oldsave', 2);
      if (a.decided) {
        /* Round 1311: a season the book decides (the parked save opens a whole book): the board is the book's. */
        const top = JSON.parse(a.bookBoard)[0] ?? null;
        if (JSON.stringify(JSON.parse(a.board).map(e => [e.name, e.club, e.goals])) !== a.bookBoard) fail('oldsave', `${save.name}: on a season the book decides the golden boot board is not the book's Goals board`);
        if (a.boot !== JSON.stringify(top ? { name: top[0], club: top[1], goals: top[2] } : null)) fail('oldsave', `${save.name}: on a season the book decides the summary's golden boot is not the Goals board's first`);
      } else {
        if (a.board !== b.board) fail('oldsave', `${save.name}: the golden boot board differs from the ${refName} engine's (a late book feeds no race)`);
        if (a.boot !== b.boot) fail('oldsave', `${save.name}: the summary's golden boot differs from the ${refName} engine's`);
      }
      if (first) {
        tick('oldsave', 2);
        if (save.parked && a.late) fail('oldsave', `${save.name}: no league match had been played and the season was kept on a late book`);
        if (a.wantLate && a.late !== a.faces.length - 1) fail('oldsave', `${save.name}: ${a.late} of ${a.faces.length - 1} entries ended on a late book: it was opened late and must stay late to the season's end`);
        if (a.wantLate) lateSaves += 1;
        followUps.push({ save, next: a.next });
      }
    }
  }
  tick('oldsave');
  if (lateSaves < 2) fail('oldsave', `only ${lateSaves} of the saves with no book were in mid season: the late book was hardly tried`);
  /* The season after: an ordinary whole book from its first round, and it obeys the law. */
  for (const { save, next } of followUps) {
    onStream(save.seed + 99, () => {
      let s = wake(candidate, next);
      const opened = candidate.cm.leagueBookOf(s);
      tick('oldsave');
      if (!opened || Object.keys(opened.c).length || !boards.bookIsWhole(opened) || opened.b !== undefined) fail('oldsave', `${save.name}: the next season did not open with an empty whole book`);
      for (let k = 0; k < 8 && s.week < s.calendar.length; k++) {
        s = candidate.cm.playNextEntry(s, { skipHalftime: true }).state;
        const book = lawNow(candidate, s, save.name, `next season, entry ${k + 1}`, 'oldsave');
        if (book && !boards.bookIsWhole(book)) fail('oldsave', `${save.name}: next season, entry ${k + 1}: the book is a late one`);
      }
    });
  }
  /* (ii) THE SIX UNREADABLE BOOKS: a string, an array, a number, last season's own, one row with a hole, one
     club entry with no rows map. Each is replaced by a late book at the next entry, exactly the book the
     same save with NO book is given, the week never throws, and the save but its book plays the entries
     that save plays. (The fit check asks the careful reader first: the match week's reader, a stamp and a
     type check, accepts the last two, and the first law alone would keep the holed one for the whole
     season and throw on the other.) And the match week's own guard is still held, on the path that never
     repairs (noBook, the dailies'): there a book the week cannot read is left as it was found, the holed
     one is written to like its whole twin, and the entry with no rows map is stepped over, never thrown on. */
  {
    const maker = await candidate.again();
    const made = onStream(0x7010, () => {
      let s = maker.cm.startCareer('Everton');
      let guard = 0;
      while (s.week < s.calendar.length && guard++ < 220) { const r = maker.cm.playNextEntry(s, { skipHalftime: true }); s = r.state; if (r.kind === 'seasonOver') break; }
      const last = s.leagueBook ? JSON.parse(JSON.stringify(s.leagueBook)) : null;
      let next = maker.cm.startNextSeason(maker.cm.finishSeason(s).state);
      for (let k = 0; k < 4; k++) next = maker.cm.playNextEntry(next, { skipHalftime: true }).state;
      return { last, next };
    });
    const plain = JSON.parse(JSON.stringify(made.next));
    delete plain.leagueBook;
    if (!made.last || !made.next.leagueBook || made.last.s === made.next.leagueBook.s) cannot('last season and this one carry the same stamp, so a stale book cannot be told apart here');
    const good = JSON.stringify(made.next.leagueBook);
    const holed = JSON.parse(good.replace(/\[(\d+),(\d+),(\d+),(\d+)\]/, '[$1,$2,null,$4]'));
    const noRows = JSON.parse(good);
    const hurtClub = Object.keys(noRows.c)[0];
    if (!hurtClub) cannot('four entries into the season the book made for the unreadable books is still empty');
    noRows.c[hurtClub] = { m: null, og: 0, u: 0 };
    const damaged = [['a string', 'the book', true], ['an array', [made.next.leagueBook], true], ["last season's own", made.last, true], ['a row with a hole', holed, false], ['a number', 7, true], ['a club entry with no rows', noRows, false, hurtClub]];
    const fourOn = (mod, from, opts) => onStream(0x7011, () => { let s = wake(mod, from); for (let k = 0; k < 4; k++) s = mod.cm.playNextEntry(s, opts).state; return s; });
    for (const [what, value, weekRefuses, untouched] of damaged) {
      const v = JSON.parse(JSON.stringify(made.next));
      v.leagueBook = value;
      const text = JSON.stringify(value);
      if (text === good) cannot(`the damage "${what}" changed nothing`);
      tick('oldsave', 4);
      if (maker.cm.leagueBookOf(v) !== null) fail('oldsave', `a save whose book is ${what} reads as having a book`);
      /* The repair: replaced by the late book a save with no book is given. */
      try {
        const on = fourOn(await candidate.again(), v, { skipHalftime: true });
        const off = fourOn(await candidate.again(), JSON.parse(JSON.stringify(plain)), { skipHalftime: true });
        const book = candidate.cm.leagueBookOf(wake(candidate, on));
        if (!book || boards.bookIsWhole(book)) fail('oldsave', `a save whose book is ${what} was not given a late book at its next entry (${book ? 'the book reads as whole' : 'no readable book four entries on'})`);
        else if (!boards.bookFits(book, rivalsOf(on).map(club => ({ club, gf: on.table.find(r => r.club === club)?.gf ?? 0 })))) fail('oldsave', `a save whose book is ${what}: the late book it was given does not add up to the table`);
        if (JSON.stringify(on.leagueBook) !== JSON.stringify(off.leagueBook)) fail('oldsave', `a save whose book is ${what} was not given the book the same save with no book is given`);
        if (withoutBook(on) !== withoutBook(off)) fail('oldsave', `a save whose book is ${what} does not play the four entries the same save with no book plays`);
      } catch (e) {
        fail('oldsave', `a save whose book is ${what} threw in a match week: ${String(e?.message ?? e).slice(0, 120)}`);
      }
      /* The match week's own guard, with the repair off. */
      tick('oldsave', (weekRefuses ? 2 : 1) + (untouched ? 1 : 0));
      try {
        const on = fourOn(await candidate.again(), v, { skipHalftime: true, noBook: true });
        const off = fourOn(await candidate.again(), JSON.parse(JSON.stringify(weekRefuses ? plain : made.next)), { skipHalftime: true, noBook: true });
        if (withoutBook(on) !== withoutBook(off)) fail('oldsave', `with the repair off, a save whose book is ${what} does not play the four entries the same save with ${weekRefuses ? 'no book' : 'its book whole'} plays`);
        if (weekRefuses && JSON.stringify(on.leagueBook) !== text) fail('oldsave', `with the repair off, a save whose book is ${what} had it written into: ${String(JSON.stringify(on.leagueBook)).slice(0, 80)}`);
        if (untouched && JSON.stringify(on.leagueBook?.c?.[untouched]) !== JSON.stringify(value.c[untouched])) fail('oldsave', `with the repair off, a save whose book is ${what} had that entry (${untouched}) written into: ${String(JSON.stringify(on.leagueBook?.c?.[untouched])).slice(0, 80)}`);
      } catch (e) {
        fail('oldsave', `with the repair off, a save whose book is ${what} threw in a match week: ${String(e?.message ?? e).slice(0, 120)}`);
      }
    }
  }
  /* (iii) THE STALE BOOK. A tab left open across a deploy, a second device on a cached build: some weeks of a
     season played by an engine from before the book. The book still reads (its stamp and every row are
     sound) and no longer adds up. Ten entries on the candidate, three on the engine with the book out,
     handed back: the reader says it does not fit; the candidate's next entry opens a late book. */
  {
    const a = await candidate.again();
    const b = await refs[0][1].again();
    const stale = onStream(0x7020, () => {
      let s = a.cm.startCareer('Arsenal');
      for (let k = 0; k < 10; k++) s = a.cm.playNextEntry(s, { skipHalftime: true }).state;
      for (let k = 0; k < 3; k++) s = b.cm.playNextEntry(wake(b, s), { skipHalftime: true }).state;
      return s;
    });
    const clubsOf = s => rivalsOf(s).map(club => ({ club, gf: s.table.find(r => r.club === club)?.gf ?? 0 }));
    const before = a.cm.leagueBookOf(wake(a, stale));
    tick('oldsave', 3);
    if (!before) fail('oldsave', 'the stale book: three entries on an engine from before the book left the book unreadable (it should read and not fit)');
    else if (boards.bookFits(before, clubsOf(stale))) cannot('the stale book: three entries on the engine with the book out scored no rival goal, so nothing went stale');
    const want = expected(stale);
    const after = onStream(0x7021, () => a.cm.playNextEntry(stale, { skipHalftime: true }).state);
    const book = a.cm.leagueBookOf(after);
    if (!book || boards.bookIsWhole(book) || book.r0 !== want.next?.round) fail('oldsave', `the stale book was not replaced by a late book at the next entry (${book ? `r0 ${book.r0}, the next league round was ${want.next?.round}` : 'no readable book'})`);
    else if (!boards.bookFits(book, clubsOf(after))) fail('oldsave', 'the stale book: the late book that replaced it does not add up to the table');
  }
  /* (vi) THE SAVE MOST PLAYERS HOLD ON THE DAY A RELEASE SHIPS (the fix pass of Round 1306; since the second
     fix pass from two committed recordings on every run, and from the base tree as well with BOOK_BASE):
     a season in play WITH the book the base commit wrote. The candidate takes that book as it is (it reads,
     it fits, it is whole), plays the season out on it with the law after every entry, and never reopens
     it late. Where the base commit named nobody at a club with no eleven and the candidate does, the goals
     on those clubs' rows must grow, or the transition was not tried. Nothing but the book is compared
     here: two copies of the engine number their youth players, press questions and messages apart. */
  let carried = 0;
  let carriedThin = 0;
  /** Round 1311 (decision 3, the critic's advice 21 (iii)): each carried save's closing share and what it was given. */
  const closings = [];
  /** A season in play as `mod` writes it: a fresh copy of the engine starts `club` and plays `entries`
   *  entries on a seeded stream with the clock fixed. */
  const bookSaveBy = async (mod, club, entries, seed) => {
    const from = await mod.again();
    return onStream(seed, () => {
      let s = from.cm.startCareer(club);
      for (let k = 0; k < entries; k++) s = from.cm.playNextEntry(s, { skipHalftime: true }).state;
      return JSON.stringify(s);
    });
  };
  /** Carry such a save on to its season's end on a fresh copy of the candidate, the book judged all the way. */
  const carryOn = async (name, raw, seed) => {
      const clubsOf = s => rivalsOf(s).map(club => ({ club, gf: s.table.find(r => r.club === club)?.gf ?? 0 }));
      const on = await candidate.again();
      onStream(seed + 16, () => {
        let s = wake(on, JSON.parse(raw));
        const taken = on.cm.leagueBookOf(s);
        tick('oldsave', 3);
        if (!taken) { fail('oldsave', `${name}: the candidate's reader refuses the book`); return; }
        if (!boards.bookFits(taken, clubsOf(s)) || !boards.bookIsWhole(taken)) { fail('oldsave', `${name}: the candidate reads the book as ${boards.bookIsWhole(taken) ? 'not adding up to the table' : 'a late one'}`); return; }
        const bare = rivalsOf(s).filter(c => !on.cm.leagueBookEleven(s, c) && on.cm.oppRosterFor(s, c).some(p => p.p !== 'GK'));
        const onRows = book => bare.reduce((n, c) => n + sumRows(book.c[c], 0), 0);
        const rowsBefore = onRows(taken);
        let late = 0;
        let guard = 0;
        let end = taken;
        let ended = false;
        while (s.week < s.calendar.length && guard++ < 220) {
          const r = on.cm.playNextEntry(s, { skipHalftime: true });
          s = r.state;
          const book = lawNow(on, s, name, `entry ${guard}`, 'oldsave');
          if (book) end = book;
          if (!book || !boards.bookIsWhole(book)) late += 1;
          if (r.kind === 'seasonOver') { ended = true; break; }
        }
        if (late) fail('oldsave', `${name}: ${late} of ${guard} entries ended on a late book or none: a whole book of the season in play was reopened`);
        /* The last entry of a season leaves week at the calendar's length; seasonOver comes only from a call past it. */
        if (s.week >= s.calendar.length) ended = true;
        /* Round 1311: a save that was in play when the book shipped (thin clubs unnamed for its first
           entries, yet whole by the rule) closes on the share it has on record, and the awards follow the
           floor by the harness's own reading of the rule: given at or over it, withheld under it. */
        tick('oldsave');
        if (!ended) fail('oldsave', `${name}: the season never ended, so its awards were never judged`);
        else {
          const closing = on.cm.leagueBookOf(s);
          const fin = on.cm.finishSeason(s);
          const share = closing ? shareByHand(s, closing) : null;
          const decided = Boolean(closing && decidesByHand(s, closing));
          const got = fin.summary.awards ?? null;
          tick('oldsave', 2);
          if (decided !== Boolean(got)) fail('oldsave', `${name}: closed on record ${share} in 100 (${decided ? 'at or over' : 'under'} the floor of ${AWARD_FLOOR_RULED}) and was ${got ? '' : 'not '}given awards from the book`);
          if (got && got.cov !== share) fail('oldsave', `${name}: its awards keep ${got.cov} in 100 on record, the book closed on ${share}`);
          const boot = fin.summary.goldenBoot;
          closings.push(`${name.split(',')[0]} closed on record ${share} in 100: ${got ? `awards from the book (top scorer ${got.boot?.[0]} ${got.boot?.[2]}, team ${got.xi ? 'of 11' : 'none'})` : `no awards from the book, the golden boot from the old race (${boot ? `${boot.name} ${boot.goals}` : 'nobody'})`}`);
        }
        carried += 1;
        if (bare.length) {
          carriedThin += 1;
          tick('oldsave');
          if (!(onRows(end) > rowsBefore)) fail('oldsave', `${name}: its ${bare.length} clubs with no eleven held ${rowsBefore} goals on named rows at the handover and ${onRows(end)} at the season's end: the candidate named nobody there`);
        }
      });
  };
  /* THE COMMITTED RECORDINGS FIRST, ON EVERY RUN (the second fix pass of Round 1306). The gate's own line
     sets no BOOK_BASE, so until then the transition a live save makes was a builder's proof and nothing
     the gate held. The two saves of BOOK_SAVES are what the commit before the round wrote (the engine
     Release AW shipped), kept as files; a file that is not the recording named there stops the run. */
  const committed = new Map();
  for (const [club, entries, seed, file, want] of BOOK_SAVES) {
    const at = path.join(ROOT, file);
    if (!fs.existsSync(at)) cannot(`${file} is missing: it is a save oldsave (vi) carries on (BOOK_WRITE_SAVES with BOOK_BASE writes it)`);
    const raw = fs.readFileSync(at, 'utf8');
    const got = createHash('sha256').update(raw).digest('hex');
    if (got !== want) cannot(`${file} is not the recording this harness names (its sha256 is ${got}, the harness names ${want}): a recording is taken again by its own rule, never edited`);
    if (JSON.parse(raw).leagueBook === undefined) cannot(`${file} holds no league book, so it is not a save to carry on`);
    committed.set(file, raw);
    await carryOn(`${club}, ${entries} entries in with its book, written by the base commit and committed as ${path.basename(file)}`, raw, seed);
  }
  const carriedCommitted = carried;
  tick('oldsave');
  if (!carriedThin) fail('oldsave', `of ${carried} committed saves written by the base commit and carried on, none held a club with no eleven: the transition a live save makes was not tried`);
  const sameAsCommitted = [];
  if (base) {
    /* And written afresh by the tree BOOK_BASE names, the round's own proof. BOOK_WRITE_SAVES=<folder>: the
       saves of BOOK_SAVES are written there as this run carries them on (how the recordings are taken). */
    const thinBefore = carriedThin;
    const writeTo = process.env.BOOK_WRITE_SAVES ? path.resolve(process.env.BOOK_WRITE_SAVES) : null;
    if (writeTo) fs.mkdirSync(writeTo, { recursive: true });
    for (const [club, entries, seed, file] of [BOOK_SAVES[0], ['Southampton', 21, 0x7031, null], BOOK_SAVES[1]]) {
      const name = `${club}, ${entries} entries in with its book, written by the base commit`;
      const raw = await bookSaveBy(base, club, entries, seed);
      if (JSON.parse(raw).leagueBook === undefined) cannot(`${name}: the tree BOOK_BASE names keeps no league book, so there is no such save to carry on`);
      if (file) sameAsCommitted.push(`${club} ${raw === committed.get(file) ? 'yes' : 'no'}`);
      if (writeTo && file) {
        fs.writeFileSync(path.join(writeTo, path.basename(file)), raw);
        console.log(`        wrote ${path.basename(file)}: ${club}, ${entries} entries in, ${Buffer.byteLength(raw)} bytes, sha256 ${createHash('sha256').update(raw).digest('hex')}`);
      }
      await carryOn(name, raw, seed);
    }
    tick('oldsave');
    if (carriedThin === thinBefore) fail('oldsave', `of ${carried - carriedCommitted} saves written by the base commit in this run and carried on, none held a club with no eleven: the transition a live save makes was not tried`);
  }
  /* (iv) NOBODY'S BOOK IS REOPENED IN A HEALTHY FLEET: over every career that started with a book. */
  tick('oldsave');
  if (acc.lateEntries) fail('oldsave', `${acc.lateEntries} entries of the fleet ended on a late book: a career that started its season with a book had it reopened (${acc.lateFirst})`);
  console.log(`oldsave ${checked.get('oldsave')} checks: ${saves.length} saves with no book finished on the candidate and on ${refs.map(r => `the ${r[0]} engine`).join(' and ')} (${lateSaves} of them on a late book, one of those with a goalless first round in its table; one parked at the first week on a whole one), the season after each, six unreadable books replaced and the match week's own guard with the repair off, the stale book, and no book of the fleet reopened`);
  console.log(`        (vi) ${carriedCommitted} committed saves of seasons in play, written by the base commit WITH its book, carried on by the candidate to the season's end${base ? `, and ${carried - carriedCommitted} more written in this run by the tree BOOK_BASE names` : ''} (${carriedThin} of the ${carried} in a league with clubs that have no eleven): the book taken as it is, never reopened`);
  console.log(base
    ? `        (vi) the tree BOOK_BASE names writes the committed saves byte for byte: ${sameAsCommitted.join(', ')}`
    : '        oldsave (vi) from a base tree NOT RUN (the committed saves were): set BOOK_BASE to a worktree of the base commit');
  for (const c of closings) console.log(`        (vi) ${c}`);
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
    /* The manager has to still be in the job when the letter comes: the first of twelve seeds that gets there. */
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
    for (let tries = 0; tries < 12 && !raw; tries++) raw = reach(seed += 1);
    /* No such save is no fault of the book (an engine change that gets this manager sacked every time is
       somebody else's): the door then cannot be tried at all, and the run says that and judges nothing. */
    if (!raw) cannot(`no career at ${from} reached week 16 of season ${seasonsFirst + 1} still in the job on twelve seeds: the joined job of section doors could not be tried`);
    tick('doors');
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
  /* Round 1306: two more Hot Seat dates, picked because their runs cross the transfer window (2026-10-11 and
     2026-10-17). The Hot Seat calls the match week at three places, the day's setup, the walk past a window
     and the match itself, and the walk past a window is only reached by a run that meets one: the section
     says so below when no date does, so a data update cannot quietly drop that call from the proof. */
  const HOT_DATES = ['2026-10-10', '2026-10-11', '2026-10-12', '2026-10-17', '2026-10-27', '2027-01-30'];
  const DEADLINE_DATES = ['2026-10-10', '2026-10-18', '2026-11-09'];
  const hotOn = (mod, date) => onStream(0x7300, () => {
    const { hs, cm } = mod;
    const seen = [];
    const booked = [];
    /* Every state as the whole save but the book, and whether it carries a book: together, the whole save. */
    const see = (what, st, mayBook = false) => { seen.push(`${what} ${sha(withoutBook(st))}`); if (!mayBook && st && 'leagueBook' in st) booked.push(what); };
    const setup = hs.dailyHotSeat(date);
    let run = hs.startHotSeat({ club: setup.club, seed: setup.seed, daily: date });
    const from = run.takeover.calendarWeek;
    see('at the start', run.state);
    let guard = 0;
    while (!run.verdict && guard++ < 40) {
      run = hs.pendingPress(run) ? hs.answerHotSeatPress(run, 0) : hs.playHotSeatMatch(run, 'balanced', null);
      see(`after step ${guard}`, run.state);
    }
    const crossed = run.state.calendar.slice(from, run.state.week).some(e => e.type === 'window');
    /* Handed over to Club Manager: a season in flight with no book. Since Round 1306 it starts a late one at
       its first match week there, so from here on a book is allowed, and what it reads as is noted. */
    let s = wake(mod, hs.handoverState(run));
    see('handed over', s);
    const lateFrom = [];
    for (let k = 0; k < 3 && s.week < s.calendar.length; k++) {
      s = cm.playNextEntry(s, { skipHalftime: true }).state;
      see(`handed over, entry ${k + 1}`, s, true);
      lateFrom.push(cm.leagueBookOf(s)?.r0 ?? null);
    }
    return { club: setup.club, seen, booked, crossed, lateFrom };
  });
  const deadlineOn = (mod, date) => onStream(0x7301, () => {
    const run = mod.dd.startDeadlineDay(mod.dd.dailyDeadlineDay(date));
    return { seen: [`at the start ${sha(withoutBook(run.state))}`], booked: 'leagueBook' in run.state ? ['at the start'] : [] };
  });
  for (const [kind, dates, deal] of [['Hot Seat', HOT_DATES, hotOn], ['Deadline Day', DEADLINE_DATES, deadlineOn]]) {
    const mine = await candidate.again();
    const got = dates.map(date => deal(mine, date));
    got.forEach((g, i) => { tick('dailies'); if (g.booked.length) fail('dailies', `${kind} ${dates[i]}: the state carries a league book ${g.booked[0]}${g.booked.length > 1 ? ` and at ${g.booked.length - 1} later points` : ''}`); });
    if (kind === 'Hot Seat') {
      /* The career handed over starts a late book at its first match week in Club Manager, and keeps it. */
      got.forEach((g, i) => {
        tick('dailies');
        if (!g.lateFrom.length || g.lateFrom.some(r0 => typeof r0 !== 'number')) fail('dailies', `${kind} ${dates[i]}: handed over to Club Manager, the career does not hold a readable late book after each of its first entries there (${JSON.stringify(g.lateFrom)})`);
      });
      tick('dailies');
      if (!got.some(g => g.crossed)) fail('dailies', 'no Hot Seat date of the section plays a run across the transfer window: the walk past a window, one of the three places the Hot Seat calls the match week, was never run');
    }
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
    const rec = xs.reduce((n, x) => n + x.onRecord, 0);
    const all = rec + xs.reduce((n, x) => n + x.unnamed, 0);
    console.log(`        ${league.padEnd(12)} ${xs[0].clubs} clubs, ${String(xs.length).padStart(2)} seasons: on record ${all ? Math.floor(100 * rec / all) : 100} in 100 rival goals, best rival mean ${fmt(mean(xs.map(x => x.bootRival)))}, top scorer mean ${fmt(mean(xs.map(x => x.bootBook)))} (${xs.map(x => x.bootBook).join(' ')}), old race mean ${fmt(mean(xs.map(x => x.bootRace)))}, most assists mean ${fmt(mean(xs.map(x => x.assistTop)))}, leading keeper's clean sheets mean ${fmt(mean(xs.map(x => x.keeperTop)))}`);
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
console.log(`law     ${acc.byeWeeks} weeks I did not play in which the rest of the round did (a league with an odd number of clubs), ${acc.twoInOne} club entries holding two matches of one club, ${acc.untold} club seasons whose clean sheets are judged on a range for it`);
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
  /* A control may name what its failures must speak of: red for another reason is not this control firing. */
  const unsaid = (CONTROLS[CONTROL].mentions ?? []).filter(word => !red.get(want).some(m => m.includes(word)));
  const fired = red.get(want).length > 0 && others.length === 0 && unsaid.length === 0;
  console.log(fired
    ? `simCmLeagueBook: CONTROL ${CONTROL} FIRED: section ${want} went red (${red.get(want).length} failures)${withIt.length ? `, with ${withIt.join(', ')} as it must` : ''} and no other section did (${secs}s)`
    : `simCmLeagueBook: CONTROL ${CONTROL} DID NOT FIRE as it must: ${want} has ${red.get(want).length} failures${unsaid.length ? `, none of them about ${unsaid.join(' or about ')}` : ''}, other red sections [${others.join(', ')}] (${secs}s)`);
  process.exit(fired ? 1 : 3);
}
console.log(total === 0
  ? `simCmLeagueBook: green, ${SECTIONS.length} sections, ${fleet.length} careers x ${SEASONS} seasons (${secs}s)`
  : `simCmLeagueBook: ${total} FAILURE(S) (${secs}s)`);
process.exit(total === 0 ? 0 : 1);

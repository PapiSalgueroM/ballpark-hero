/**
 * Round 900 harness: the four US career boards still do exactly what they did.
 *
 * Round 900 turned NflMyCareerBoard, NbaMyCareerBoard, MlbMyCareerBoard and
 * NhlMyCareerBoard (four copies of one 1,090 line file) into one board plus
 * four bindings, with the rule that nothing a player sees, clicks or has saved
 * may move. scripts/data/usBoardFixture.json was recorded from main's tree
 * BEFORE any board was touched (its header carries the sha), and this harness
 * replays it against the tree it runs in.
 *
 * A) The fixture is whole: four sports, every screen the round names reached
 *    on each path (event card, extension talk, free agency window, rival beat,
 *    rival choice, both confirmations answered no and yes, retirement, the
 *    coach career, a reload, an older-era career), at least 12 seasons, the
 *    six required saves and the five old-shape saves the restore repairs.
 * B) The replay: src/test/usBoardFixture.test.tsx mounts the real boards in
 *    jsdom with the fixture's seeds and clock and presses the same buttons.
 *    After every press the save's bytes and the original screen markup must
 *    hash to what the fixture holds. Round 992 excludes only its additive
 *    practice section and its buttons; that new flow has separate tests. The
 *    fixture itself remains unchanged. Green needs Vitest's real exit code 0, all four
 *    sports passed, and an empty report.
 *
 * Measured when it was written (2026-10-02, this machine): 436, 506, 475 and
 * 442 clicks on the four paths (23 or 24 seasons each) and 1,860 more steps
 * across the ten fixed saves per sport; one replay takes about 160 seconds.
 * After the review that added the five old-shape saves and an older-era
 * second career in every sport (re-recorded from main 4ae96019): 439, 506,
 * 475 and 441 clicks, fifteen fixed saves per sport and 701, 721, 688 and
 * 688 screen steps; the fixture is 1,875,117 bytes.
 * Round 988 re-recorded it from its own tree, on purpose: the four career
 * content packs (Rounds 917 to 920) add draft night texts and a third life
 * deck, which changes which card is drawn. Recorded with and without deck C
 * on the same tree, the four paths are byte identical up to the first card
 * drawn with deck C in the deck (NFL step 12, NBA 51, MLB 11, NHL 14) and
 * differ from there; the fixed saves are cut from the path after that. Now
 * 451, 523, 449 and 415 clicks; the fixture is 1,864,777 bytes.
 * That isolates deck C only. Against main's fixture the packs move the paths
 * earlier (measured by the review, main's fixture against the same tree
 * recorded without deck C): the first save difference is step 9 in all four
 * sports (the new draft night texts land in the phone inbox); before the
 * clicks part, MLB and NHL also differ in the rivalry fields the new beats
 * move (pendingRivalryEvent, rivalryIntensity, lastRivalryEventId, morale,
 * fanbase) and the NHL in three seasons' results and headlines; the clicks
 * part at NFL 19, NBA 15, MLB 20 and NHL 37. So from step 9 on this fixture
 * proves the board replays the content packs' own recording, not the four
 * old boards. That parity was proven on main's fixture, and Round 988
 * touches no board or binding file.
 * Re-recorded again on 2026-10-05, after the review fix made the NFL and NHL
 * deck C buttons read the save. Against the fixture before it, the save
 * after every press is byte identical in all four sports, NBA and MLB are
 * identical throughout, and the only changes are deck C buttons that lost a
 * stat already at its limit: the NFL in 4 screens and 1 button label
 * ("Health +5, morale +3" became "Morale +3"), the NHL in 3 screens and 1
 * label ("Morale up" became "No change"). Recorded twice on the merged
 * tree (origin/main 211da297), byte for byte the same; 1,864,921 bytes.
 * Round 1039 re-recorded it on purpose, with the Round 988 method. The
 * replay mounts every binding with no Hall bound (hall: undefined), so no
 * retirement talk is asked and the retirement screen is the old one; the
 * retire button writes nothing new there either. Recorded on one tree (head
 * 69a106fa) with and without the life B deck change (the four decks at
 * 27f37b71: the retirement and farewell answers, the jersey record and the
 * NHL walk away): WITHOUT it the recording equals the 1038 fixture byte for
 * byte, header aside, in all four sports, so the board and the summer
 * filter are invisible with no Hall bound. WITH it the four click paths and
 * every save stay identical; the only change is one screen of markup in two
 * sports, the healthy walk away card (lifeB_retireHealthy and
 * mlbB_retireHealthy) showing its first answer's new effect, "Next season is
 * your last" where it said "Leave whole": NFL fixed save "mid" step 53 and
 * MLB fixed save "suspended" step 41. NBA and NHL do not move at all: their
 * recorded careers never draw a reconciled card. Still 1,864,921 bytes.
 * Release AL (2026-10-07) re-recorded it on purpose for Codex Round 1085,
 * grouped thousands, which changes what the boards print and nothing they
 * do. Proof first: the release tree at 35caba22 with four files taken back
 * from main 5b70b05f (src/lib/usCareerStatLine.ts and
 * src/components/us-career/UsCareerBoard.tsx, which carry 1085's change, and
 * src/lib/nbaMyCareer.ts and src/lib/nhlMyCareer.ts, which carry the
 * release's own follow up) replayed the 1039 fixture green in all four
 * sports. Then recorded from the release tree at 198e730d. Against the
 * 1039 fixture 1,130 fields differ and every one is a screen: 1,021 markup
 * hashes (NFL 334, NBA 241, MLB 214, NHL 232), 98 text excerpts and 11
 * Career Log labels, the last two in the NFL only. Zero save hashes, save
 * fields, click paths, lengths, coverage, fixed saves or first paint
 * hashes moved. The words are season lines of a thousand or more ("71 rec,
 * 1006 yds, 7 TD" is now "1,006 yds"); the markup is the hub's Career so
 * far line going from 10px to 12px text in every sport, plus the NBA and
 * NHL retirement cards, where the release grouped the totals 1085 left
 * bare (games in the NBA line, all four numbers in the NHL one): 12 screens
 * each. 1,864,932 bytes.
 * Round 1104 (NFL truth and the one bank) re-recorded it on its own branch
 * at e9d10a10, and that recording shipped with Release AP.
 * Round 1103 (the NBA numbers) re-recorded it on purpose on 2026-10-09, on
 * a GitHub runner, from its branch merged with Release AP (head 5320efca).
 * Against Release AP's fixture the NFL, the MLB and the NHL are byte for
 * byte the same: the path, the fifteen fixed saves and every screen. Only
 * the NBA moved, at the two places the round names. The first step that
 * differs is 12, the hub's Trophy Case before a game is played: the save
 * is the same and the screen reads "Badges 0 of 23" where it read "0 of
 * 21" (the two All-Star badges). The first save that differs is step 20,
 * the first season played, which is the new stat line: the second unit
 * rookie's "13 ppg, 3.6 rpg, 2.3 apg" is "6.9 ppg, 1.5 rpg, 1.0 apg", and
 * the line takes its own draws from the seeded stream, so the career goes
 * its own way from there (540 clicks where there were 523, still 24
 * seasons and 705 screen steps; 14 of the 15 fixed saves, all but
 * "rookie", which is cut before the first season). 1,881,710 bytes.
 * Round 1112 (the NBA rival on the player's line) re-recorded it on purpose
 * on 2026-10-09, on a GitHub runner, from its branch merged with Release AR
 * (head 70cb5722). Against Round 1103's fixture the MLB is byte for byte
 * the same. The NFL and the NHL keep every click and every save (the path
 * and the fifteen fixed saves each): what moved is the one sentence the
 * four sports share, a near tie now naming who leads the head to head. That
 * is one screen in the NFL (path step 345, the 2011 season card) and
 * fifteen in the NHL (path step 57, the 2034 season card, and 14 steps over
 * the fixed saves). The NBA moved at the place the round names. Step 20,
 * the first season played, is the first save that differs, and c.rival is
 * the only field in it: his line is the new one. Up to step 106 nothing
 * else on the save differs. At step 107 (the 2031 season) the rivalry roll
 * deals a different beat, because the All-Star beat is now dealt only when
 * one of the two made the roster, and at 109 that beat moves the fanbase;
 * the clicks part at step 122 and the career goes its own way (507 clicks
 * where there were 540, still 24 seasons and 705 screen steps, 10 rival
 * beats and 6 rival choices where there were 13 and 4; 14 of the 15 fixed
 * saves, all but "rookie"). The player's own stream did not move: scripts/
 * simNbaAwardsSense.mjs section P proves that on a fleet that answers no
 * card. 1,872,641 bytes.
 * Round 1227 (the NFL rival plays the player's position on the player's
 * own stat line) re-recorded it on purpose on 2026-10-10, on a GitHub
 * runner, once a step, each from the branch commit its header names.
 * Step c, the bind (recorded from 96c3f64d). Proof first: the commit
 * before it, dd3896ac, which only cuts nflStatLineFor out of simSeason,
 * replays the fixture before green in all four sports and passes the truth
 * digest with nothing allowed to move, so this recording moves for the bind
 * alone. The NBA, the MLB and the NHL are byte for byte the same. In the
 * NFL every one of the 459 clicks is the same button (43 seasons played,
 * 10 rival beats and 5 rival choices before and after, 685 screen steps).
 * Step 10, the first season played, is the first save that differs, and it
 * differs first in c.rival: his line is a wide receiver's own now, his
 * score is on the printed parts, and he carries the year and whether he
 * made the first team. The save hash differs at 438 of the 459 steps (the
 * rival is on every save from there), the markup at 39, and 14 of the 15
 * fixed saves moved, all but "rookie", which is cut before the first
 * season. The player's own stream did not move: scripts/simUsRivalSense.mjs
 * section P1 proves that on a fleet that answers no card, and P2 with
 * every card answered. 1,869,467 bytes.
 * The All-Pro card and beat 221 (recorded from 5bdd0a9c). Proof first: the
 * head with step c's recording in, 83d42fec, replays green in all four
 * sports and passes the truth digest plain, and between the two heads the
 * player's lines and the rival's trail are byte equal over the fleet (the
 * floor at zero in between moved no season of 107,618). The NBA, the MLB
 * and the NHL are byte for byte the same again, and so is the whole NFL
 * click path, all 459 steps, with every one of the fifteen fixed saves as
 * it starts. One screen walk moved: fixed save "negNet", step 52 (the 2034
 * season). The fixture before dealt the All-Pro card that said he was off
 * the first team a year after he was on it, a card of Round 1149 that is
 * no longer dealt once the rival is judged on the season; the same roll
 * now picks "Head to Head Win" from the pool, and steps 53 and 54 follow
 * it (4 of that save's 56 steps differ, in pendingRivalryEvent, then
 * morale and lastRivalryEventId). 1,869,465 bytes.
 * The single input of that recording, closed after the review (runners
 * r1227-x1 and r1227-x2, 2026-10-10). Two source commits lie between step
 * c's recording and this one: 55339449 (seven counts of nflStatLineFor
 * floored at zero) and 5bdd0a9c (the cards). On 55339449 ALONE step c's
 * recording replays green in all four sports (three runs of three in a
 * worktree of that commit, and two more with that commit's src and scripts
 * laid over the head) and the truth digest passes plain (two runs of two).
 * On 5bdd0a9c the same recording is red at fixed save "negNet" steps 52 to
 * 54, first in c.pendingRivalryEvent, and the digest is red. So the floor
 * moved no recorded career, and this recording and the 8 nfl leaves of the
 * truth digest (commit 2be3775c, whose message carries no attribution)
 * moved for the cards alone.
 * Seen once while proving it, and NOT a number: the very first replay on
 * 55339449 was red at fixed save "noCoachKey" step 38 (after "Announce this
 * is the last season"), where the screen read caught the farewell banner
 * and the recording's read had come before it. The banner is a React.lazy
 * component (UsCareerBoard.tsx), so that screen read races its chunk; the
 * save was equal, and the five replays after it on the same commit were
 * green. If this harness is ever red at that one step alone, rerun it once
 * before reading it as a change.
 * Taken once more from 4c010129, the head after the review's fix pass
 * (words, comments, harness checks and the merge of Release AT's main; no
 * engine line), on runner r1227-x6: all four sports byte for byte the
 * recording of 5bdd0a9c, 1,869,465 bytes again. Only recordedFrom moved,
 * and that is the whole of the commit. The truth digest taken again from
 * the same head with the nfl keys allowed came back byte equal, so it has
 * no commit.
 * Release AV (2026-10-11) met Round 1226 (the true MLB and NHL seasons, which
 * took the MLB and NHL sections again) with Round 1227 in this one file. The
 * merge took Round 1226's file whole and the recording was taken again on a
 * runner (rAV-f2) from the merged head a1e4f86b: the NFL section came back
 * byte for byte Round 1227's own (451,649 bytes), and the NBA, the MLB and
 * the NHL byte for byte the file before, so each round's section is the one
 * it recorded alone and the two rounds do not move each other. 1,870,889
 * bytes. The truth digest taken again from the same head with the nfl keys
 * allowed came back byte equal to the merged file, so it has no commit.
 * Round 1149 (the other three careers get what the NBA rival got)
 * re-recorded it on purpose on 2026-10-10, on a GitHub runner, once a step,
 * each from the branch commit its header names.
 * Step a, the Trophy Case tile's row for every award (recorded from
 * 62b7752f): the NFL and the NBA are byte for byte the same. In the MLB and
 * the NHL every click and every save is the same; what moved is the hub's
 * Trophy Case box on the screens of a career that holds a lesser award. MLB:
 * 28 fields, all on the fixed saves' screens, 26 markup hashes and 2 box
 * labels (fixed save "suspended" steps 47 and 55, "Empty, Nothing in it. Go
 * and win something" is now "1 honour, 1 in other awards, no ring yet"). NHL:
 * 41 fields, all on the click path, 40 markup hashes and 1 box label (step
 * 290, "2 honours" is now "3 honours" over the same "1 Cup, 1 All-Star
 * nods"). 1,872,637 bytes.
 * Steps c, d and e took the coin out of the roster beat of one sport each
 * (MLB 206, NHL 306, NFL 206 and 219), and each recording moved that sport
 * and no other. A coin beat drew once from the board's stream when it was
 * answered and no beat draws now, and the beat is in the rivalry pool in
 * far fewer seasons, so the same roll can pick another card.
 * MLB (from e2dd37a9, and unmoved when step d changed the beat's second
 * card): the click path of 449 steps and fourteen of the fifteen fixed
 * saves are byte equal. The fixed save "noRole" deals another beat at step
 * 26 of its screen walk and goes its own way: 262 fields, all its own.
 * NHL (from e5105752): all 415 clicks are the same buttons. At path step
 * 292 (the 2012 season) the roll deals "The Scrum" where it dealt "Rival
 * Becomes Teammate", and the save differs in its rivalry fields from there:
 * 128 fields on the path (122 save hashes, 2 markup hashes, 1 text) and 55
 * on the screens of two fixed saves (noCoachKey, suspended).
 * NFL (from 925a7f12): step 86 is the first that differs (a season whose
 * roll deals another beat) and the clicks part at step 96, so the career
 * goes its own way: 459 clicks where there were 468, still 24 seasons and
 * 685 screen steps, 10 rival beats and 5 rival choices where there were 14
 * and 5; eight of the fifteen fixed saves are cut from the new path
 * (coach, coachPhaseNoCoach, dirty, mid, negNet, retired,
 * retiredNoCoachKey, suspended). The player's own stream did not move in
 * any of the three: scripts/simNbaAwardsSense.mjs section Q proves that on
 * fleets that answer no card. 1,868,724 bytes.
 * same (cmp exit 0), which is what makes a red replay mean something. There is no
 * band here on purpose: the check is byte equality, and a path either
 * replays or it does not.
 *
 * Release AX (2026-10-11) merged the other lane's Rounds 1230 to 1234: a
 * contract talk and a free agency window are saved for their exact unplayed
 * year (phase extension or freeagency and a contractTalk beside the career),
 * a push shows a chance wheel in place of the card until it is seen, and the
 * window carries a Compare button. That moves what a US career saves ON
 * PURPOSE, so the fixture was taken again, once, on a GitHub runner, from
 * 5d5926f6. The walker had learned the wheel one commit BEFORE the merge
 * (934c29d9) and replayed the old recording byte for byte there, so nothing
 * but the merge moved it. What moved, measured against the recording it
 * replaces (scripts/qa/compareUsBoardFixture.mjs, old file then new): no step before
 * the first talk of any path differs (first talk at step 59, 52, 50 and 21);
 * with the 'market wheel: ' steps out (16, 14, 6 and 6 on the paths, two a
 * push) every path is the same sequence of presses and season counts, 459,
 * 507, 449 and 415 of them; at every aligned step every career field, the
 * team quality and the coach hash equal; all fifteen fixed saves of every
 * sport are byte for byte the saves they were, and the coverage objects are
 * equal. What differs on the paths is 40, 31, 21 and 19 steps: the phase
 * inside a talk and the talk on the save (24, 19, 12 and 11 steps, with the
 * talk screens' markup) and the step that leaves a talk (the phase and the
 * talk go, the save bytes are the old ones); no markup moved outside a talk.
 * A fixed save still plays thirty moves of its own (a wheel press is not
 * counted), so each of its walks is the old one with the wheel steps out;
 * the walks that reach no talk are byte identical (5, 6, 6 and 5 of fifteen).
 * Four named saves are new in every sport: extTalk and faTalk (the first save
 * inside each talk), wheel (the first with an unseen wheel: withdrawn in the
 * NFL, held in the NBA and the NHL, raised in MLB) and extCut (extTalk with
 * its talk cut to a stub, which must read as no talk at all). 475, 521, 455
 * and 421 clicks, nineteen fixed saves a sport, 928, 932, 886 and 900 screen
 * steps, 2,296,639 bytes. Section A now asks every sport for a wheel step, a
 * step saved in each talk phase and the four saves, and two controls joined.
 *
 * Round 1313 (2026-10-12) put the MLB and NHL rival on the player's own line
 * (his season made by the player's functions at his position, the head to head
 * read off the two saved lines, beat 206 and 306 naming both seasons). That
 * moves the rival on every MLB and NHL save after the first season ON PURPOSE,
 * so the fixture was taken again, once, on a GitHub runner (r1313-s5c1), from
 * 560a3f85. The chain: the recorder run on 8fde50f0 (the tree before the
 * switch) gave the committed recording back byte for byte, 2,296,639 bytes,
 * the header aside (r1313-s5pre); after the MLB switch this harness was red in
 * MLB alone (64 steps, r1313-s5ac), after the NHL switch in MLB and the NHL
 * alone (128 steps, r1313-s5bc). New against old, by the --rival mode of
 * scripts/qa/compareUsBoardFixture.mjs: the NFL and NBA sections byte equal;
 * in MLB and the NHL the first step whose saved career differs is the first
 * season played (step 10 and step 12, "Play the 2026 season") and it differs
 * in c.rival alone; neither click path parts; 455 and 421 clicks, 24 seasons,
 * 886 and 900 screen steps, 10 and 12 rival beats, 4 and 4 rival choices, all
 * as before; 18 of 19 fixed saves a sport moved (rookie, saved before any
 * season, did not) and 19 of 19 screen walks; 2,298,730 bytes. Section A's
 * counts are the ones above, the four named saves and MLB's raised push kept.
 *
 * Controls, one per run (each is a full replay, about three minutes):
 *   US_BOARD_PARITY_CONTROL=label    one label changed in a copy of the shared
 *                                    board: all four sports go red on the words
 *   US_BOARD_PARITY_CONTROL=draw     one extra Math.random() before the camp
 *                                    battle in the shared board: all four go
 *                                    red on the save
 *   US_BOARD_PARITY_CONTROL=binding  one word changed in a copy of the NHL
 *                                    binding: the NHL goes red on the words and
 *                                    the other three stay green
 *   US_BOARD_PARITY_CONTROL=restore  the pre Round 182 role repair deleted from
 *                                    a copy of the shared board: all four go
 *                                    red on the old shape save "noRole" (the
 *                                    saves a board just wrote all carry a role,
 *                                    so before the old shapes were added this
 *                                    left the replay green)
 *   US_BOARD_PARITY_CONTROL=era      the NFL binding stops passing the era to
 *                                    its engine: the NFL goes red on the save
 *                                    of its second career (always an older era
 *                                    one), the other three stay green
 *   US_BOARD_PARITY_CONTROL=fixture  one save hash changed in a copy of the
 *                                    fixture: that sport goes red (no source
 *                                    is touched, so this is the replay's own
 *                                    comparison being proved)
 *   US_BOARD_PARITY_CONTROL=wheel    the wheel steps of one sport renamed in a
 *                                    copy of the fixture: section A goes red
 *                                    for that sport alone, on the wheel floor
 *                                    (no replay runs; this one takes a second)
 *   US_BOARD_PARITY_CONTROL=talk     the restore stops reading the saved talk
 *                                    in a copy of the shared board: all four
 *                                    go red on the named save "extTalk", which
 *                                    no longer opens on its talk
 *   US_BOARD_PARITY_CONTROL=nosave   the NBA's named save "wheel" and its
 *                                    screens taken out of a copy: section A red
 *                                    for the NBA alone, on the saved talks floor
 *   US_BOARD_PARITY_CONTROL=nophase  the NBA path's free agency steps given the
 *                                    phase season in a copy: red for the NBA
 *                                    alone, on the talk phase floor
 *   US_BOARD_PARITY_CONTROL=noresult the named save "wheel" that came up
 *                                    withdrawn rewritten as held in a copy: the
 *                                    floor "each way a push can end is on the
 *                                    record" goes red, and nothing else
 *   (the last three are the Release AX fix pass's; like wheel they run no replay)
 *
 * Nothing here reaches the network. Run: node scripts/simUsBoardParity.mjs
 */
import { spawnSync } from 'node:child_process';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { US_CAREER_BOARD, usCareerSport, wrapperProblems } from './lib/usCareerFiles.mjs';
import { NFL_STAFF_RECOVERY_PANEL_HUNKS, stripNflStaffRecoveryPanelHunks } from './lib/usNflStaffRecoveryHunks.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const TEST = 'src/test/usBoardFixture.test.tsx';
const FIXTURE = path.join(ROOT, 'scripts/data/usBoardFixture.json');
const SPORTS = ['nfl', 'nba', 'mlb', 'nhl'];
const CONTROL = process.env.US_BOARD_PARITY_CONTROL || '';
/* Resolved the way node resolves it, so a worktree that borrows the main tree's node_modules works too. */
const VITEST = path.join(path.dirname(createRequire(path.join(ROOT, 'package.json')).resolve('vitest/package.json')), 'vitest.mjs');

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'usboard-'));
const litter = [];
process.on('exit', () => {
  for (const f of litter) { try { fs.rmSync(f, { force: true }); } catch { /* best effort */ } }
  try { fs.rmSync(tmp, { recursive: true, force: true }); } catch { /* best effort */ }
});
const read = f => fs.readFileSync(f, 'utf8').split('\r\n').join('\n');

/* Round 1424: this recording predates the explicit NFL staff action. Only the
   proved original Panel presentation is replayed; the current engine stays live. */
const currentCoachPanel = read(path.join(ROOT, 'src/components/us-career/CoachCareerPanel.tsx'));
const historicalCoachPanel = stripNflStaffRecoveryPanelHunks(currentCoachPanel);
assert.equal(stripNflStaffRecoveryPanelHunks(currentCoachPanel.replaceAll('\n', '\r\n')), historicalCoachPanel, 'Whole historical panel LF and CRLF inverse agree');
for (const [, hunk] of NFL_STAFF_RECOVERY_PANEL_HUNKS) {
  const altered = hunk.slice(0, -1) + 'X';
  assert.notEqual(altered, hunk);
  for (const subject of [currentCoachPanel.replace(hunk, ''), currentCoachPanel.replace(hunk, () => altered), currentCoachPanel + hunk]) {
    assert.notEqual(subject, currentCoachPanel, 'Effective historical inverse control');
    assert.throws(() => stripNflStaffRecoveryPanelHunks(subject), /Exactly one NFL staff panel inverse hunk/, 'Missing altered or duplicated panel hunk refuses');
  }
}
assert.throws(() => stripNflStaffRecoveryPanelHunks(currentCoachPanel + '\n// Unrelated source.\n'), /Whole historical panel SHA/, 'Unrelated panel source refuses');
const historicalPanelFile = path.join(tmp, 'CoachCareerPanel.historical.tsx');
fs.writeFileSync(historicalPanelFile, historicalCoachPanel, { flag: 'wx' });
const nativeRequire = createRequire(path.join(ROOT, 'package.json'));
const historicalAliases = {
  ...Object.fromEntries(['react/jsx-dev-runtime', 'react/jsx-runtime', 'react'].map(id => [id, nativeRequire.resolve(id)])),
  '@/components/us-career/CoachCareerPanel': historicalPanelFile,
};
const inheritedAliases = JSON.parse(process.env.NO_DOUBLE_SWAP || '{}');
for (const alias of Object.keys(historicalAliases)) assert(!(alias in inheritedAliases), 'No inherited alias replaces the proved historical Panel or native React');
const replayAliases = { ...historicalAliases, ...inheritedAliases };
console.log('Round1424 historical presentation: proved main775 coaching Panel SHA9390fab969844b20ca4f7adbc097664191d3f5ea082090553f479305fe85d321, current engine and unchanged fixture. This replay gives no current-Panel visual parity credit.');

/* The source controls. Each changes one thing in a copy of one file and
   points the replay at the copy. `red` is which sports that file draws: the
   shared board draws every sport whose wrapper hands it a binding (read off
   the four wrappers, so this stays true if a board ever leaves the shared
   one), and a binding draws only its own. */
const BOARD = US_CAREER_BOARD;
const onSharedBoard = SPORTS.filter(slug => wrapperProblems(ROOT, usCareerSport(slug)).length === 0);
const SOURCE_CONTROLS = {
  label: {
    file: BOARD,
    alias: '@/components/us-career/UsCareerBoard',
    from: '>Create your player</p>',
    to: '>Create your athlete</p>',
    red: onSharedBoard,
    says: 'the screen reads',
  },
  draw: {
    file: BOARD,
    alias: '@/components/us-career/UsCareerBoard',
    from: 'const campNote = sport.campBattle(c, teamQuality, Math.random);',
    to: 'Math.random(); const campNote = sport.campBattle(c, teamQuality, Math.random);',
    red: onSharedBoard,
    says: 'the save differs',
  },
  binding: {
    file: usCareerSport('nhl').binding,
    alias: '@/lib/nhlCareerSport',
    from: "'⭐ Top of the lineup'",
    to: "'⭐ Top line'",
    red: ['nhl'],
    says: 'the screen reads',
  },
  /* The restore's first repair dropped from the shared board: only the old
     shape save with no role can see it, so this is what proves those saves
     are in the fixture and replayed. */
  restore: {
    file: BOARD,
    alias: '@/components/us-career/UsCareerBoard',
    from: "if (!s.c.role) s.c.role = 'starter';",
    to: '',
    red: onSharedBoard,
    says: 'save "noRole"',
  },
  /* The NFL binding stops handing the era to its engine: only an older-era
     career can see it, so this proves the path starts one in the NFL. */
  era: {
    file: usCareerSport('nfl').binding,
    alias: '@/lib/nflCareerSport',
    from: "rng, appearance, eraId as 'now' | 'y2005', entry)",
    to: 'rng, appearance, undefined, entry)',
    red: ['nfl'],
    says: 'the save differs',
  },
  /* Release AX: the restore no longer reads a saved talk. Only a save taken
     inside a talk can see it, so this proves the named saves are in the
     fixture and reopen their talk. The click path never reloads inside a
     talk, so it stays as it was. */
  talk: {
    file: BOARD,
    alias: '@/components/us-career/UsCareerBoard',
    from: 'const heldTalk = restoreMarketTalk(s.contractTalk, loaded, sport.slug);',
    to: 'const heldTalk = null;',
    red: onSharedBoard,
    says: 'save "extTalk"',
  },
};

/* Section A as a function, so the wheel control can ask it of a changed copy. */
const REQUIRED_SAVES = ['rookie', 'mid', 'ext', 'fa', 'retired', 'coach', 'noRole', 'negNet', 'noCoachKey', 'coachPhaseNoCoach', 'retiredNoCoachKey'];
/* Release AX: the saved talks. Every sport's path holds a push (a wheel), a
   step saved inside each talk, and the four named saves taken there. */
const MARKET_SAVES = ['extTalk', 'faTalk', 'wheel', 'extCut'];
const WHEEL_STEP = 'market wheel: ';
const MIN_SEASONS = 12;
function wholeProblems(fx) {
  const out = [];
  for (const slug of SPORTS) {
    const s = fx.sports?.[slug];
    if (!s) continue;
    const say = m => out.push({ slug, m: `${slug}: ${m}` });
    const unreached = Object.keys(s.coverage).filter(k => !(s.coverage[k] > 0));
    const noSave = REQUIRED_SAVES.filter(n => !s.saves[n] || !(s.screens[n]?.length > 0));
    if (unreached.length) say(`the recorded path never reached ${unreached.join(', ')}`);
    if (s.coverage.seasons < MIN_SEASONS) say(`${s.coverage.seasons} seasons on the path, the round asks for ${MIN_SEASONS}`);
    if (noSave.length) say(`no fixed save or no screens for ${noSave.join(', ')}`);
    if (s.path.some(st => !st.s || !st.m)) say('a path step carries no hash');
    if (!s.path.some(st => st.a.startsWith(WHEEL_STEP))) say('the recorded path holds no market wheel step, so no push is on the record');
    for (const phase of ['extension', 'freeagency']) {
      if (!s.path.some(st => st.p === phase)) say(`no step of the recorded path is saved in the ${phase} phase`);
    }
    const noMarket = MARKET_SAVES.filter(n => !s.saves[n] || !(s.screens[n]?.length > 0));
    if (noMarket.length) say(`no fixed save or no screens for the saved talks ${noMarket.join(', ')}`);
  }
  /* Release AX fix pass (the recording reviewer's minor 5): each way a push can end is on the record at least
     once, across the four named saves "wheel" (today: the NFL's came up withdrawn, the NBA's and the NHL's held,
     MLB's raised). A later retake that lost one of the three would otherwise stay green. Asked only of a
     fixture that holds all four sports, since the three results are spread over them. */
  if (SPORTS.every(slug => fx.sports?.[slug])) {
    const ends = new Set(SPORTS.map(slug => { try { return JSON.parse(fx.sports[slug].saves?.wheel ?? 'null')?.contractTalk?.wheel?.result; } catch { return undefined; } }));
    const lost = ['raised', 'held', 'withdrawn'].filter(r => !ends.has(r));
    if (lost.length) out.push({ slug: 'all', m: `all: no named save "wheel" holds a push that came up ${lost.join(', ')}` });
  }
  return out;
}

function replay(env) {
  assert.equal(read(historicalPanelFile), historicalCoachPanel, 'Proved historical Panel copy held');
  const out = path.join(tmp, `report-${Date.now()}.json`);
  const report = path.join(tmp, `problems-${Date.now()}.txt`);
  fs.writeFileSync(report, '');
  const r = spawnSync(
    process.execPath,
    [VITEST, 'run', TEST, '--reporter=json', `--outputFile.json=${out}`, '--reporter=default'],
    {
      cwd: ROOT, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024,
      env: { ...process.env, ...env, NO_DOUBLE_SWAP: JSON.stringify(replayAliases), US_BOARD_FIXTURE: 'replay', US_BOARD_FIXTURE_REPORT: report, CI: '1', FORCE_COLOR: '0', NO_COLOR: '1' },
    },
  );
  const text = (r.stdout || '') + (r.stderr || '');
  if (!fs.existsSync(out)) return { exit: r.status, passed: [], failed: SPORTS, problems: ['Vitest wrote no report: ' + text.slice(-800)] };
  const rows = (JSON.parse(fs.readFileSync(out, 'utf8')).testResults || []).flatMap(f => f.assertionResults || []);
  const titled = status => rows.filter(a => a.status === status).map(a => a.title);
  return { exit: r.status, passed: titled('passed'), failed: titled('failed'), problems: read(report).split('\n').filter(Boolean) };
}

/* The first few problems of each sport, so one sport's long list cannot hide another's. */
const firstPerSport = (problems, n) => SPORTS.flatMap(slug => problems.filter(p => p.startsWith(slug + ' ')).slice(0, n))
  .concat(problems.filter(p => !SPORTS.some(slug => p.startsWith(slug + ' '))).slice(0, n));

let failures = 0;
const fail = m => { failures += 1; console.error('  FAIL: ' + m); };
const same = (a, b) => [...a].sort().join(',') === [...b].sort().join(',');

/* Release AX: section A's own floors, each proven on a changed copy. No source is touched and no replay runs.
   The healthy fixture must pass section A first, and the copy must be red for the one victim, on that floor
   alone. wheel came with the retake; nosave, nophase and noresult are the fix pass's (the recording reviewer's
   minor 5: two floors had no control, and one floor was missing). A damage that finds nothing to change answers
   null and the control refuses to run, because a control that changed nothing proves nothing. */
const FLOOR_CONTROLS = {
  wheel: { victim: 'mlb', reason: 'holds no market wheel step',
    damage(fx) { const steps = fx.sports?.mlb?.path.filter(st => st.a.startsWith(WHEEL_STEP)) ?? []; for (const st of steps) st.a = 'renamed ' + st.a; return steps.length ? `${steps.length} wheel steps of the mlb path renamed` : null; } },
  nosave: { victim: 'nba', reason: 'no fixed save or no screens for the saved talks wheel',
    damage(fx) { const s = fx.sports?.nba; if (!s?.saves?.wheel) return null; delete s.saves.wheel; delete s.screens.wheel; return 'the named save "wheel" of the nba and its screens taken out'; } },
  nophase: { victim: 'nba', reason: 'no step of the recorded path is saved in the freeagency phase',
    damage(fx) { const steps = fx.sports?.nba?.path.filter(st => st.p === 'freeagency') ?? []; for (const st of steps) st.p = 'season'; return steps.length ? `${steps.length} free agency steps of the nba path given the phase season` : null; } },
  noresult: { victim: 'all', reason: 'holds a push that came up withdrawn',
    damage(fx) {
      let n = 0;
      for (const slug of SPORTS) {
        const raw = fx.sports?.[slug]?.saves?.wheel; if (!raw) continue;
        const save = JSON.parse(raw);
        if (save.contractTalk?.wheel?.result !== 'withdrawn') continue;
        save.contractTalk.wheel.result = 'held'; fx.sports[slug].saves.wheel = JSON.stringify(save); n += 1;
      }
      return n ? `${n} named save "wheel" that came up withdrawn rewritten as held` : null;
    } },
};
if (FLOOR_CONTROLS[CONTROL]) {
  const c = FLOOR_CONTROLS[CONTROL];
  const healthy = wholeProblems(JSON.parse(read(FIXTURE)));
  const fx = JSON.parse(read(FIXTURE));
  const did = c.damage(fx);
  if (!did) { console.error(`control ${CONTROL}: the fixture holds nothing for it to change, so this control would change nothing and prove nothing`); process.exit(1); }
  const found = wholeProblems(fx);
  console.log(`control ${CONTROL}: ${did} in a copy; section A says [${found.map(p => p.m).join(' | ')}]`);
  if (healthy.length) fail(`control ${CONTROL}: the fixture in the tree is not whole to begin with (${healthy[0].m})`);
  else if (!found.length) fail(`control ${CONTROL} left section A green`);
  else if (!found.every(p => p.slug === c.victim)) fail(`control ${CONTROL} should turn ${c.victim} alone red, and it turned [${[...new Set(found.map(p => p.slug))].join(', ')}]`);
  else if (found.length !== 1 || !found[0].m.includes(c.reason)) fail(`control ${CONTROL} went red, but not for its own reason alone ("${found.map(p => p.m).join(' | ')}")`);
  else console.log(`  CONTROL FIRED: [${c.victim}] red on "${c.reason}", the rest green`);
  if (failures) { console.error(`simUsBoardParity control ${CONTROL}: failed`); process.exit(1); }
  console.log(`simUsBoardParity control ${CONTROL}: green. The control turned its own sport red for its own reason.`);
  process.exit(0);
}
if (CONTROL) {
  let r;
  let red;
  let says;
  if (CONTROL === 'fixture') {
    const src = read(FIXTURE);
    const fx = JSON.parse(src);
    const victim = fx.sports.mlb.path[40];
    if (!victim?.s) { console.error('control fixture: the fixture has no step 40 on the MLB path, so this control would prove nothing'); process.exit(1); }
    victim.s = '000000000000';
    const copy = path.join(tmp, 'fixture.json');
    fs.writeFileSync(copy, JSON.stringify(fx));
    r = replay({ US_BOARD_FIXTURE_IN: copy });
    red = ['mlb'];
    says = 'mlb click path step 40';
  } else {
    const c = SOURCE_CONTROLS[CONTROL];
    if (!c) { console.error(`unknown control "${CONTROL}": use label, draw, binding, restore, era, fixture, wheel or talk`); process.exit(1); }
    const src = read(path.join(ROOT, c.file));
    if (!c.red.length) { console.error(`control ${CONTROL}: no sport is drawn by ${c.file}, so this control would prove nothing`); process.exit(1); }
    if (src.split(c.from).length !== 2) { console.error(`control ${CONTROL}: ${c.file} does not carry exactly one "${c.from.trim()}", so this control would change nothing and prove nothing`); process.exit(1); }
    const copy = path.join(ROOT, 'src/test', `__control_usBoard_${CONTROL}${path.extname(c.file)}`);
    litter.push(copy);
    fs.writeFileSync(copy, src.replace(c.from, c.to));
    r = replay({ US_BOARD_CONTROL_ALIAS: c.alias, US_BOARD_CONTROL_FILE: copy });
    red = c.red;
    says = c.says;
  }
  console.log(`control ${CONTROL}: Vitest exit ${r.exit}, passed [${r.passed.join(', ')}], failed [${r.failed.join(', ')}]`);
  for (const p of firstPerSport(r.problems, 2)) console.log('   ' + p.slice(0, 300));
  if (r.exit === 0) fail(`control ${CONTROL} left the replay green`);
  else if (!same(r.failed, red)) fail(`control ${CONTROL} should turn exactly [${red.join(', ')}] red, and it turned [${r.failed.join(', ')}]`);
  else if (!r.problems.some(p => p.includes(says))) fail(`control ${CONTROL} went red, but not for its own reason ("${says}" is not in the report)`);
  else console.log(`  CONTROL FIRED: [${red.join(', ')}] red on "${says}", the rest green`);
  if (failures) { console.error(`simUsBoardParity control ${CONTROL}: failed`); process.exit(1); }
  console.log(`simUsBoardParity control ${CONTROL}: green. The control turned its own sports red for its own reason.`);
  process.exit(0);
}

console.log('A) the fixture is whole');
/* The six the round asked for, then the old shapes the restore repairs (a
   save from before Round 182, 422 or 126), so the restore cannot lose a
   repair with this harness green. */
if (!fs.existsSync(FIXTURE)) {
  fail('scripts/data/usBoardFixture.json is missing: node scripts/recordUsBoardFixture.mjs writes it');
} else {
  const fx = JSON.parse(read(FIXTURE));
  console.log(`   recorded from ${fx.header?.recordedFrom ?? 'nowhere it says'}`);
  if (!/^[0-9a-f]{40} /.test(fx.header?.recordedFrom ?? '')) fail('the fixture header does not say which commit it was recorded from');
  if (!same(Object.keys(fx.sports ?? {}), SPORTS)) fail(`the fixture holds [${Object.keys(fx.sports ?? {}).join(', ')}], not the four sports`);
  for (const slug of SPORTS) {
    const s = fx.sports?.[slug];
    if (!s) continue;
    const screens = Object.values(s.screens).reduce((n, steps) => n + steps.length, 0);
    const wheel = s.path.filter(st => st.a.startsWith(WHEEL_STEP)).length;
    const inTalk = phase => s.path.filter(st => st.p === phase).length;
    console.log(`   ${slug}: ${s.path.length} clicks, ${s.coverage.seasons} seasons, ${Object.keys(s.saves).length} fixed saves, ${screens} screen steps; ${wheel} wheel steps, ${inTalk('extension')} steps saved in an extension talk, ${inTalk('freeagency')} in free agency`);
  }
  for (const p of wholeProblems(fx)) fail(p.m);
}

console.log('B) the replay: every click, every save, every screen');
if (!failures) {
  const r = replay({});
  console.log(`   Vitest exit ${r.exit}, passed [${r.passed.join(', ')}], failed [${r.failed.join(', ')}]`);
  for (const p of firstPerSport(r.problems, 3)) console.error('   ' + p.slice(0, 400));
  if (r.exit !== 0) fail(`the replay exited ${r.exit}`);
  if (!same(r.passed, SPORTS)) fail(`the replay passed [${r.passed.join(', ')}], not all four sports`);
  if (r.problems.length) fail(`${r.problems.length} step${r.problems.length === 1 ? '' : 's'} differ from the fixture`);
}

console.log('');
if (failures) {
  /* This is a golden master, so it also goes red when a round changes a US
     career ON PURPOSE (Codex 905 and 906 did, inside Round 900). Say what to
     do, so the remedy is a decision and not a habit. */
  console.error('  If your round meant to change what a US career does, re-record from your tree');
  console.error('  (node scripts/recordUsBoardFixture.mjs), commit the fixture with the change and say so in the');
  console.error('  commit. If it did not, the red is a real change: read the first differing step above.');
  console.error(`simUsBoardParity: ${failures} failure${failures === 1 ? '' : 's'}`);
  process.exit(1);
}
console.log('simUsBoardParity: green. Four sports replayed click for click, save for save and screen for screen with the proved historical main775 coaching Panel.');

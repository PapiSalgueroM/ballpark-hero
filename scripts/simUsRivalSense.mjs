/* simUsRivalSense.mjs (Round 1227). Does the rival of a US My Career play the player's position on the player's
   own stat line, and does "who had the better year" say what the two printed lines say?

   It plays the real engines through each sport's own descriptor (the binding the board drives): one esbuild
   bundle of src, on a seeded mulberry32 that is both Math.random and the rng handed to the engine. Nothing
   reads the network and nothing is written outside the temp folder.

   Size. Full size is 1,500 careers a sport a seed, seeds 1 to 5. RIVAL_SEEDS=1,2 and RIVAL_CAREERS=300 shrink
   it while iterating: a shrunk run prints every number and judges only the exact checks.

   THE FLEET (playFleet). Positions are cycled, every archetype of a position in turn, and in the NFL every
   second lap of the positions is a 2005 career (16 game seasons through 2020), so a season whose length is not
   the engine's own rate is always played. The loop is the engine's: a role on draft night, a camp every
   season, the season, progress, the retirement test. NO rivalry card is answered, so the player's own path is
   the draw count law and nothing else (section P1).

   Run:  node scripts/simUsRivalSense.mjs
   It ends with one line, "simUsRivalSense: N checks, F failed (full size)", and exits by F.

   THE SECTIONS (every count is printed; an exact check is judged at every size, a banded one at full size)

   T    The table, by sport and position: how many rival lines are off the player's own shape, how many cannot be
        read back, how often the verdict on the save disagrees with the two printed lines scored the one way, my
        share of the head to head years (and by arm, by job, by age), the near ties, and the careers whose rival
        retired behind me (the badge's test). Printed for every sport; judged where the sport is BOUND.
   N    The NFL, bound in Round 1227 (nflRivalSeason in nflMyCareer.ts):
        N.U1  the hook takes exactly rivalSeasonDraws('nfl', pos) draws of the season's stream (3, a kicker's 1).
        N.U2  his season is nflStatLineFor's own on the keyed stream (rebuilt here from the tag, his name, the
              year and the draws) at the season's REAL length (16 and 17 game years are both in the fixtures),
              printed by the player's printer, scored off the printed text, with wonAward's own answer.
        N.U3  the same rival, form, year and draws give the same season; the rival object is left untouched.
        N.U5  at a position whose first team names one man (QB, RB, TE, K) he is never on it in a season the
              player is. There is no U4: no NFL line reads a kind.
        N.U6  the same rule AT ITS CALL SITE. N.U5 hands the hook the fact itself, so it cannot see whether
              simSeason passes the true one, and in the plain fleet two men on one first team is so rare that
              ONE dealt card was the whole net (the reviewers' mutation: the call site passing `firstTeam:
              false` left every gate green but that card). So the REAL simSeason is played on hand boosted
              careers (both men rated 97 at 26 every year, 800 careers a position, four seasons each): no
              season at QB, RB, TE or K has both on the first team, the fleet had the power to see one (the
              count expected if nothing forbade it is printed and floored), and where the team names more than
              one man both is common. Control `oneslotsite`.
        N.U7  nflStatLineFor returns no count below zero and prints no number below zero, at every position,
              over forms 40 to 99 (a player's form bottoms near 42, a rookie rival's near 44), 1 to 17 games
              and three streams (every draw 0, every draw 0.999, a seeded one). The fleet's own count of
              printed numbers below zero (N.F1) is 0 with or without the floor on the gate's seeds, so it
              cannot fail for the thing it names: this grid is what holds the floor. Control `nofloor`.
        N.F1  every rival line of the fleet is in the player's own shape, and no printed line of either man
              carries a number below zero (true and printed; the floor itself is held by N.U7).
        N.F2  both lines read back off their printed text and scored by the season score (a back's catches at 8
              yards, typed here): the verdict on the save never disagrees, and no line is unread.
        N.F3  my share of the head to head years is held at what Round 1227 measured (RIVAL_1227 below), within
              a FIXED width: three standard errors, the error worked out over careers (the years of one career
              share a rating, so a binomial over years is far too narrow), typed once from the full size run of
              2026-10-10. By position the share is printed, never judged.
        N.F5  every All-Pro card (beat 206) dealt says and promises what the two seasons support, none is one of
              the two own cards of Round 1149, and none is "both" where the first team names one man. And,
              card or no card: no judged season of the fleet at QB, RB, TE or K has both men on the first team
              (the count the table already printed, judged since the review).
        N.O   the committed saves built by the code before the round (src/test/fixtures/usRivalOldSaves.json).
   M.U, H.U  (Round 1313) the MLB and NHL hooks, mlbRivalSeason and nhlRivalSeason, on hand built rivals over
        every position (about 400 a sport), judged wherever the tree holds them:
        U1  exactly the two draws of the season's stream the law gives (controls drawsmlb, drawsnhl).
        U2  his season is the player's own line function on his keyed stream (rebuilt here from the tag, his name,
            the year and the two draws), on the healthy workload, carried to every slate of the ledgers (162, 161,
            163, 60, 58; 82, 84, 48, 56, 68 to 71), printed by the player's printer, scored off the printed text by
            the season score TYPED here, with wonAward's answer on the full line (oldscalemlb, oldscalenhl,
            offshapemlb, offshapenhl, wrongposmlb, wrongposnhl, workloadmlb, workloadnhl).
        U3  the same inputs give the same season, the rival is left untouched (impuremlb, impurenhl), and a rival
            and a player at a position no table holds still play a season (nofallbackmlb, nofallbacknhl).
        U4  his kind does not move with his rating or age; a reliever's rival has the player's bullpen job both
            ways: a closer's rival never prints more than 4 holds, a setup man's never more than 6 saves (kindjob).
        U5  the All-Star table names more than one man at every position (oneslotmlb, oneslotnhl).
        U7  no count below zero and no printed number below zero over forms 40 to 99, the workloads a season
            hands the line function and three streams (nofloormlb, nofloornhl).
        U6 (the call site, on the real season sims) lands with the switch, step 5.
   --record-old-saves-b  (Round 1313, with RIVAL_PROVE=<the round's base>) writes src/test/fixtures/
        usRivalOldSavesB.json from MLB and NHL saves built by that commit's code.
   P1   Under RIVAL_PROVE=<commit>, with RIVAL_MOVED and RIVAL_CARDS naming the sports the step moved: the same
        fleets on both trees. In all four sports the player's season lines and counters, the seasons a beat is
        dealt in and every note that is not the rival's own are byte equal. A sport not named in RIVAL_MOVED: the
        rival's trail and every note too. A sport named: the trail differs. B is the table on the tree before.
   L    The NBA's cards word for word (the lift moved its beat onto rosterBeat).
   P2   The same proof with every card answered, through the truth digest's own driver.

   WHAT WAS MEASURED (2026-10-10, five seeds of 1,500 careers a sport, GitHub runners)
   Before, on the base 980654fa (runner r1227-s0). My share of the head to head years:
     NFL 15.10 (by seed 14.8, 15.4, 15.1, 15.0, 15.2): QB 38.8, RB 22.9, WR 30.3, TE 18.8, LB 0.2, CB 0.0, EDGE 0.4,
       K 10.1. In 2005 careers (16 games, the rival on a 17 game line) QB 34.0 against 43.5 in modern ones, K 7.0
       against 13.2. Off the player's shape: 100 percent at QB, RB, CB, EDGE and K, 79.6 at LB, 27.9 at WR, 28.2 at
       TE. A corner's, an edge rusher's and a kicker's rival line could not be read as his position's at all. Where
       it could be read the verdict disagreed with the printed lines in 1.9 (QB), 2.3 (RB), 4.9 (WR), 8.7 (TE) and
       0.4 (LB) percent of judged years. Near ties 14.8, 9.3, 13.1, 10.3, 0.4, 0.0, 0.8, 13.5 percent. Careers whose
       rival retired behind me: 32.2, 0.0, 15.1, 4.3, 0.0, 0.0, 0.0, 0.2 percent.
     MLB and the NHL were measured again by Round 1313 on its own base (ecbdab63: the tree of b6eb78e7, with the
     throwback arms y2004 and y2006 added to the fleet; runner r1313-s0a, 2026-10-12). They replace 980654fa's.
     MLB 41.20 (by seed 40.5, 42.2, 40.4, 41.6, 41.3): SP 9.5, RP 8.3, C 25.4, 1B 61.7, 2B 29.0, 3B 56.0, SS 43.0,
       LF 53.4, CF 42.2, RF 56.0, DH 68.9; as a healthy starter 14.0, 8.6, 39.4, 80.9, 41.9, 75.2, 58.4, 71.4, 59.0,
       76.4, 85.5. Every rival line off shape and unread (a pitcher's rival prints a batting line, a hitter's has
       no RBI). By job: starter 53.9, backup 21.9, hurt 21.3. By age: 33.6, 35.4, 38.5, 46.4, 54.9. By season
       length: 162 games 41.1 (113,787 judged years), 161 games 39.4, 163 games 41.0, 60 games 50.8 (1,418), 58
       games 61.9 (97). A reliever by his own job: closer 5.9, setup 7.9, sidearm 11.2. Near ties 2.7 (RP) to 12.1
       (SS) percent. Careers whose rival retired behind me: SP 0.9, RP 0.1, C 9.1, 1B 67.9, 2B 14.7, 3B 56.9, SS
       35.9, LF 54.0, CF 33.4, RF 58.7, DH 80.0. Cards over the run: the tally beats, losing 2,817 and winning
       1,188; the own roster cards, Morale +5 197 and Morale -5 119. The error of the pooled share: 0.33 points.
     NHL 58.03 (by seed 57.4, 57.4, 58.2, 59.3, 57.8): C 64.3, LW 59.5, RW 64.2, D 39.4, G 62.7; as a healthy starter
       86.5, 85.6, 87.4, 55.1, 84.9 (the same to the tenth as 980654fa's). Every line off shape, a goalie's unread;
       a skater's built in line can be read, and the verdict disagrees with the two printed lines in 0.1 (C, RW) to
       1.1 (D) percent of judged years (my side is scored on the engine's own length). By job: starter 79.8,
       backup 11.3, hurt 24.9. By age: 48.0, 63.7, 65.3, 68.9, 55.8. By season length: 84 games 57.5 (70,045), 82
       games 57.0 (57,908), 68 to 71 games 64.9 to 70.2, 56 games 71.2 (3,750), 48 games 61.0 (3,750). Printed dead
       heats: C 443, LW 435, RW 400, D 705 of about 27,800 judged years each. Careers whose rival retired behind
       me: 72.1, 65.3, 73.3, 30.1, 70.8. Cards: the tally beats, losing 2,166 and winning 2,595; the own roster
       cards, Morale +5 233 and Morale -5 174. The error of the pooled share: 0.29 points.
   After the NFL bind (96c3f64d, runner r1227-c1): 0 of 107,618 rival lines off shape, 0 unread, 0 judged years
     where the verdict disagrees. My share 38.94 (by seed 38.7, 40.0, 39.0, 38.1, 38.9): QB 42.9, RB 25.1, WR 35.6,
     TE 37.5, LB 34.3, CB 30.6, EDGE 38.0, K 63.7. The two arms came together (QB 43.6 modern, 42.1 in 2005
     careers; K 64.3 and 63.0). As a healthy starter 66.4, 45.9, 55.9, 59.0, 56.5, 51.0, 59.2, 63.9. By job:
     starter 58.4, backup 2.5, hurt 11.1. By age: 32.0 (24 and under), 39.7, 42.0, 40.7, 40.7 (34 and over).
     Near ties 11.7, 9.7, 13.4, 15.8, 15.1, 12.3, 11.3, 23.1 percent. Careers whose rival retired behind me: 38.2,
     0.0, 22.2, 26.6, 19.9, 10.7, 27.2, 78.7 percent. The error of the pooled share over careers: 0.27 points.
     NOTHING WAS TUNED: a running back's 25 percent and no badge at all, and a kicker's 64 percent, are what one
     line for both men leaves once the bench years only the player has and the one aging curve every rival shares
     are in (a back falls off at 28, a kicker at 39, a rival at 31). Those are the lead's levers, for all four
     sports at once. */

import { build } from 'esbuild';
import { execSync } from 'node:child_process';
import crypto from 'node:crypto';
import { readFileSync, unlinkSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const norm = s => s.replace(/\r\n/g, '\n');
const srcOf = rel => norm(readFileSync(path.join(ROOT, rel), 'utf8'));
const SEEDS = (process.env.RIVAL_SEEDS || '1,2,3,4,5').split(',').map(Number).filter(Number.isFinite);
const CAREERS = Number(process.env.RIVAL_CAREERS || 1500);
const FULL = CAREERS >= 1500 && SEEDS.length >= 5;
const PROVE = process.env.RIVAL_PROVE || '';
const namesOf = v => (v || '').split(',').map(x => x.trim()).filter(x => x && x !== 'none');
const MOVED = namesOf(process.env.RIVAL_MOVED);
const CARDS = namesOf(process.env.RIVAL_CARDS);
const CONTROL = process.env.US_RIVAL_CONTROL || '';
const ALL = ['nfl', 'mlb', 'nhl', 'nba'];
for (const n of [...MOVED, ...CARDS]) if (!ALL.includes(n)) { console.error(`unknown sport "${n}" in RIVAL_MOVED or RIVAL_CARDS`); process.exit(2); }

/* The sports whose rival is bound to the player's own line ON THIS TREE. A bound sport is judged (U, F1, F2);
   one that is not is measured and printed (the BEFORE table). The NBA has been bound since Round 1112 and is
   judged by scripts/simNbaAwardsSense.mjs section R; here it rides the fleet for P1 and L. */
const BOUND = ['nfl', 'mlb', 'nhl'];

/* NEGATIVE CONTROLS, US_RIVAL_CONTROL=<name>. Each swaps one line of source in memory (an esbuild plugin, never
   a file), refuses to run when the anchor is not there exactly once or the swap changed nothing (exit 2, "Refusing
   to run"), and must turn its own section red: the closing line names the sections that went red. */
const CONTROLS = {
  /* P1, P2 (Round 1149's control, moved here with the proof it fires in): the MLB rivalry tick takes one more
     draw of the season's stream, so every draw of the player's after it moves. */
  tickdraws: { file: 'src/lib/mlbCareerRivalryEvents.ts', prove: true, needs: 'P1,P2',
    find: '  const rolled = rollRivalryEvent(p, c.rival, lastId, MLB_RIVALRY_EVENTS, rng);', put: '  rng(); const rolled = rollRivalryEvent(p, c.rival, lastId, MLB_RIVALRY_EVENTS, rng);' },
  /* N.F2: the one comparison turned round (the tally and the note go to the wrong man). */
  verdictswap: { file: 'src/lib/careerRival.ts', needs: 'N.F2,M.F2,H.F2', find: '  return myScore > hisScore;', put: '  return myScore < hisScore;' },
  /* N.U2, N.F2: the rival's score put back on the formula the built in line used (yards over 60, scores doubled). */
  oldscalenfl: { file: 'src/lib/nflMyCareer.ts', needs: 'N.U2,N.F2', find: '      score: nflHeadToHeadScore(pos, season),',
    put: '      score: ((season.passYds ?? 0) + (season.rushYds ?? 0) + (season.recYds ?? 0) + (season.tackles ?? 0) * 9 + (season.fgMade ?? 0) * 30) / 60 + ((season.passTd ?? 0) + (season.rushTd ?? 0) + (season.recTd ?? 0) + (season.sacks ?? 0) + (season.picks ?? 0)) * 2,' },
  /* N.F2: the player's side scored on his whole line (the award score), which reads a back's receiving yards and
     a linebacker's and a corner's forced fumbles: the verdict then says what the printed lines do not. */
  fullscorenfl: { file: 'src/lib/nflMyCareer.ts', needs: 'N.F2', find: "judgeRivalSeason(c.rival, nflHeadToHeadScore(c.pos, line), c.name, 'nfl', rng,", put: "judgeRivalSeason(c.rival, statScore, c.name, 'nfl', rng," },
  /* N.U2, N.F1: the hook prints with a template of its own (the old linebacker's three parts for everybody). */
  offshapenfl: { file: 'src/lib/nflMyCareer.ts', needs: 'N.U2,N.F1', find: '      line: nflStatLine(season, pos),',
    put: '      line: `${season.tackles ?? 0} tackles, ${season.sacks ?? 0} sacks, ${season.picks ?? 0} INT`,' },
  /* N.U1 (and P1 under RIVAL_PROVE): the hook takes one more draw of the season's stream than the law allows. */
  drawsnfl: { file: 'src/lib/nflMyCareer.ts', needs: 'N.U1', find: "    const keyed = rivalSeasonStream('nfl-rival', r, year, rng, rivalSeasonDraws('nfl', r.pos));",
    put: "    const keyed = rivalSeasonStream('nfl-rival', r, year, rng, rivalSeasonDraws('nfl', r.pos) + 1);" },
  /* N.U2, N.F2: a back's printed catches read at no yards at all in the source (the harness's own 8 disagrees). */
  bridge: { file: 'src/lib/usCareerStatLine.ts', needs: 'N.U2,N.F2', find: 'export const NFL_RB_PRINTED_YARDS_A_CATCH = 8;', put: 'export const NFL_RB_PRINTED_YARDS_A_CATCH = 0;' },
  /* N.U5: the one place rule taken out (two men on a first team that names one). */
  oneslot: { file: 'src/lib/nflMyCareer.ts', needs: 'N.U5', find: '      year, allStar: won && !(onePlace && mine.firstTeam),', put: '      year, allStar: won,' },
  /* N.U6: the rule left whole in the hook and starved at its call site (simSeason tells the hook the player is
     never on the first team). N.U5 cannot see this: it hands the hook the fact itself. */
  oneslotsite: { file: 'src/lib/nflMyCareer.ts', needs: 'N.U6', find: 'nflRivalSeason(c.year, { pos: c.pos, firstTeam: line.awards.includes(NFL_ROSTER_AWARD) })', put: 'nflRivalSeason(c.year, { pos: c.pos, firstTeam: false })' },
  /* N.U7: the floor at zero taken off a back's rushing yards (they go under zero below a form of 56 on a low draw). */
  nofloor: { file: 'src/lib/nflMyCareer.ts', needs: 'N.U7', find: '    line.rushYds = Math.max(0, Math.min(2080, Math.round((260 + (form - 62) * 46 + rng() * 260) * g)));',
    put: '    line.rushYds = Math.min(2080, Math.round((260 + (form - 62) * 46 + rng() * 260) * g));' },
  /* N.U3: the hook writes on the rival it was handed (the object must be left as it was: judgeRivalSeason is
     the one place a rival's season is written onto him). */
  impure: { file: 'src/lib/nflMyCareer.ts', needs: 'N.U3', find: '    const len = nflSeasonLength(year);', put: '    const len = nflSeasonLength(year); (r as { lastScore?: number }).lastScore = form;' },
  /* N.U2: the rival plays a 17 game line whatever the season's length (the defect of the built in line: Round
     1104 measured the player's share falling at every position in a 16 game season because of it). */
  workload17: { file: 'src/lib/nflMyCareer.ts', needs: 'N.U2', find: '    const len = nflSeasonLength(year);', put: '    const len = NFL_RATE_GAMES;' },
  /* N.F5: the "only you" card dealt on the two ratings (both 80 or better) instead of the two seasons, as the
     beat was while it flipped a coin. */
  rostergate: { file: 'src/lib/careerFactBeats.ts', needs: 'N.F5,M.F5,H.F5', find: '        when: (s, r) => { const f = facts(s, r); return !!f && f.mine && !f.his; },',
    put: '        when: (s, r) => (s as { ovr?: number }).ovr! >= 80 && (r as { ovr?: number }).ovr! >= 80,' },
  /* N.F5: the two own cards supported whatever the rival's season says (the "dropped off a year after" card is
     dealt again, in a year neither made the first team). */
  owndealt: { file: 'src/lib/careerFactBeats.ts', needs: 'N.F5,M.F5,H.F5', find: '    ? ownRosterCards<P, R>(spec.own).map(k => ({ ...k, when: (s: P, r: R) => facts(s, r) === null && k.when(s, r) }))',
    put: '    ? ownRosterCards<P, R>(spec.own)' },
  /* N.O: the two own cards taken out (a save sitting on a card the release before dealt, "Morale +5", is paid
     nothing). */
  owndead: { file: 'src/lib/careerFactBeats.ts', needs: 'N.O,M.O,H.O', find: '    ? ownRosterCards<P, R>(spec.own).map(k => ({ ...k, when: (s: P, r: R) => facts(s, r) === null && k.when(s, r) }))',
    put: '    ? ownRosterCards<P, R>(spec.own).slice(0, 0)' },
  /* N.F5: the NFL tick rolls on the bare save, so the beat reads the season BEFORE the one just played (the two
     seasons are then two different years, the fact cards shut, and an own card is dealt). */
  lastyearnfl: { file: 'src/lib/nflCareerRivalryEvents.ts', needs: 'N.F5', find: '  const p = withSeasonPlayed(c, season);', put: '  const p = withSeasonPlayed(c, undefined);' },
  /* P1, P2: the NFL line function takes one draw more than the block it was cut from (every draw of the player's
     after his stat line moves). */
  cutdraw: { file: 'src/lib/nflMyCareer.ts', prove: true, needs: 'P1,P2',
    find: '  const g = x.games / NFL_RATE_GAMES;', put: '  rng(); const g = x.games / NFL_RATE_GAMES;' },
  /* P1, P2 (Round 1313): the MLB line function takes one draw more than the block it was cut from (every draw of
     the player's after his stat line moves, in every MLB season). */
  cutdrawmlb: { file: 'src/lib/mlbMyCareer.ts', prove: true, needs: 'P1,P2',
    find: '  const prof = MLB_POS_PROFILE[x.pos] ?? MLB_POS_PROFILE.LF;', put: '  rng(); const prof = MLB_POS_PROFILE[x.pos] ?? MLB_POS_PROFILE.LF;' },
  /* P1, P2 (Round 1313): the NHL line function takes one draw more than the block it was cut from. */
  cutdrawnhl: { file: 'src/lib/nhlMyCareer.ts', prove: true, needs: 'P1,P2',
    find: '  const iceShare = x.iceShare;', put: '  rng(); const iceShare = x.iceShare;' },
  /* Round 1313, M.U and H.U: the two hooks of baseball and hockey, built in step 4 and called by nothing until
     the switch. Each control swaps one line of a hook (or of what it reads) in memory. */
  drawsmlb: { file: 'src/lib/mlbMyCareer.ts', needs: 'M.U1', find: "    const keyed = rivalSeasonStream('mlb-rival', r, year, rng, rivalSeasonDraws('mlb', r.pos));",
    put: "    const keyed = rivalSeasonStream('mlb-rival', r, year, rng, rivalSeasonDraws('mlb', r.pos) + 1);" },
  drawsnhl: { file: 'src/lib/nhlMyCareer.ts', needs: 'H.U1', find: "    const keyed = rivalSeasonStream('nhl-rival', r, year, rng, rivalSeasonDraws('nhl', r.pos));",
    put: "    const keyed = rivalSeasonStream('nhl-rival', r, year, rng, rivalSeasonDraws('nhl', r.pos) + 1);" },
  /* The rival's score put back on the built in line's formula. */
  oldscalemlb: { file: 'src/lib/mlbMyCareer.ts', needs: 'M.U2,M.F2', find: '    return { line: mlbStatLine(season, pos), score: mlbHeadToHeadScore(pos, season), year, allStar };',
    put: '    return { line: mlbStatLine(season, pos), score: Math.round((season.hr ?? 0) * 1.6 + ((season.avg ?? 0.24) - 0.24) * 300), year, allStar };' },
  oldscalenhl: { file: 'src/lib/nhlMyCareer.ts', needs: 'H.U2,H.F2', find: '    return { line: nhlStatLine(season, pos), score: nhlHeadToHeadScore(pos, season), year, allStar };',
    put: '    return { line: nhlStatLine(season, pos), score: (season.goals ?? 0) + (season.assists ?? 0), year, allStar };' },
  /* The hook prints with a template of its own (the built in shapes). */
  offshapemlb: { file: 'src/lib/mlbMyCareer.ts', needs: 'M.U2,M.F1', find: '    return { line: mlbStatLine(season, pos), score: mlbHeadToHeadScore(pos, season), year, allStar };',
    put: '    return { line: `${season.avg ?? 0}, ${season.hr ?? 0} HR`, score: mlbHeadToHeadScore(pos, season), year, allStar };' },
  offshapenhl: { file: 'src/lib/nhlMyCareer.ts', needs: 'H.U2,H.F1', find: '    return { line: nhlStatLine(season, pos), score: nhlHeadToHeadScore(pos, season), year, allStar };',
    put: '    return { line: `${season.goals ?? 0}G ${season.assists ?? 0}A ${season.points ?? 0}P`, score: nhlHeadToHeadScore(pos, season), year, allStar };' },
  /* The line made at one position whatever his own (the defect live before this round). */
  wrongposmlb: { file: 'src/lib/mlbMyCareer.ts', needs: 'M.U2,M.F1', find: "    const pos = (r.pos in MLB_ARCHETYPES ? r.pos : mine.pos in MLB_ARCHETYPES ? mine.pos : 'LF') as MlbCareerPos;",
    put: "    const pos = 'CF' as MlbCareerPos;" },
  wrongposnhl: { file: 'src/lib/nhlMyCareer.ts', needs: 'H.U2,H.F1', find: "    const pos = (r.pos in NHL_ARCHETYPES ? r.pos : mine.pos in NHL_ARCHETYPES ? mine.pos : 'C') as NhlCareerPos;",
    put: "    const pos = 'C' as NhlCareerPos;" },
  /* The line left on the engine's own length whatever the season's slate. */
  workloadmlb: { file: 'src/lib/mlbMyCareer.ts', needs: 'M.U2', find: '    const season = mlbLineOnSlate(full, mlbWorkSlate(pos, mine.slate));', put: '    const season = mlbLineOnSlate(full, US_ENGINE_SEASON.mlb);' },
  workloadnhl: { file: 'src/lib/nhlMyCareer.ts', needs: 'H.U2', find: '    const season = nhlLineOnSlate(full, nhlWorkSlate(pos, mine.slate));', put: '    const season = nhlLineOnSlate(full, US_ENGINE_SEASON.nhl);' },
  /* The hook writes on the rival it was handed. */
  impuremlb: { file: 'src/lib/mlbMyCareer.ts', needs: 'M.U3', find: '    const games = mlbFullWorkload(pos, keyed);', put: '    const games = mlbFullWorkload(pos, keyed); (r as { lastScore?: number }).lastScore = form;' },
  impurenhl: { file: 'src/lib/nhlMyCareer.ts', needs: 'H.U3', find: '    const games = nhlFullWorkload(pos, keyed);', put: '    const games = nhlFullWorkload(pos, keyed); (r as { lastScore?: number }).lastScore = form;' },
  /* Correction 7: the last fallback taken out (a position no table holds then throws inside the season sim). */
  nofallbackmlb: { file: 'src/lib/mlbMyCareer.ts', needs: 'M.U3', find: "    const pos = (r.pos in MLB_ARCHETYPES ? r.pos : mine.pos in MLB_ARCHETYPES ? mine.pos : 'LF') as MlbCareerPos;",
    put: '    const pos = (r.pos in MLB_ARCHETYPES ? r.pos : mine.pos) as MlbCareerPos;' },
  nofallbacknhl: { file: 'src/lib/nhlMyCareer.ts', needs: 'H.U3', find: "    const pos = (r.pos in NHL_ARCHETYPES ? r.pos : mine.pos in NHL_ARCHETYPES ? mine.pos : 'C') as NhlCareerPos;",
    put: '    const pos = (r.pos in NHL_ARCHETYPES ? r.pos : mine.pos) as NhlCareerPos;' },
  /* M.U4: a reliever's bullpen job hashed off his name like every other kind (a formality either way). */
  kindjob: { file: 'src/lib/mlbMyCareer.ts', needs: 'M.U4', find: "    const kind = pos === 'RP' ? mine.kind : pos === 'SP' ? '' : rivalKindOf('mlb-rival-kind', r, MLB_ARCHETYPES[pos]).id;",
    put: "    const kind = pos === 'SP' ? '' : rivalKindOf('mlb-rival-kind', r, MLB_ARCHETYPES[pos]).id;" },
  /* M.U5, H.U5: the All-Star table names one man at every position (in memory). */
  oneslotmlb: { file: 'src/lib/careerAwards.ts', needs: 'M.U5', find: '  return configFor(sport, award, pos)?.slots ?? null;', put: "  return sport === 'mlb' ? 1 : configFor(sport, award, pos)?.slots ?? null;" },
  oneslotnhl: { file: 'src/lib/careerAwards.ts', needs: 'H.U5', find: '  return configFor(sport, award, pos)?.slots ?? null;', put: "  return sport === 'nhl' ? 1 : configFor(sport, award, pos)?.slots ?? null;" },
  /* M.U7, H.U7: the floor at zero taken off home runs, and off goals. */
  nofloormlb: { file: 'src/lib/mlbMyCareer.ts', needs: 'M.U7', find: '    full.hr = Math.min(58, Math.max(0, Math.round((4 + (form - 62) * 0.85) * prof.power * g + rng() * 6 * prof.power)));',
    put: '    full.hr = Math.min(58, Math.round((4 + (form - 62) * 0.85) * prof.power * g + rng() * 6 * prof.power));' },
  nofloornhl: { file: 'src/lib/nhlMyCareer.ts', needs: 'H.U7', find: '    full.goals = Math.min(72, Math.max(1, Math.round((4 + (form - 62) * 1.35) * mult * off * g * iceShare + rng() * 5)));',
    put: '    full.goals = Math.min(72, Math.round((4 + (form - 62) * 1.35) * mult * off * g * iceShare + rng() * 5));' },
  /* Round 1313, the switch. M.F5: the MLB tick rolls on the bare save, so the beat reads the season BEFORE the one
     just played (moved here from scripts/simNbaAwardsSense.mjs, where it turned section S red). */
  lastyearmlb: { file: 'src/lib/mlbCareerRivalryEvents.ts', needs: 'M.F5', find: '  const p = withSeasonPlayed(c, season);', put: '  const p = withSeasonPlayed(c, undefined);' },
  /* M.F2: the player's side scored on his whole line (the award score, which reads a hitter's steals). */
  fullscoremlb: { file: 'src/lib/mlbMyCareer.ts', needs: 'M.F2', find: "judgeRivalSeason(c.rival, mlbHeadToHeadScore(c.pos, line), c.name, 'mlb', rng,", put: "judgeRivalSeason(c.rival, mlbSeasonScore(c.pos, line), c.name, 'mlb', rng," },
  /* M.U6: the call site hands the hook the engine's own length whatever the year's slate, or the closer's job for
     every reliever. Only the real season sim can see either. */
  siteslatemlb: { file: 'src/lib/mlbMyCareer.ts', needs: 'M.U6', find: 'mlbRivalSeason(c.year, { pos: c.pos, kind: c.archetype.id, slate })', put: 'mlbRivalSeason(c.year, { pos: c.pos, kind: c.archetype.id, slate: US_ENGINE_SEASON.mlb })' },
  sitekindmlb: { file: 'src/lib/mlbMyCareer.ts', needs: 'M.U6', find: 'mlbRivalSeason(c.year, { pos: c.pos, kind: c.archetype.id, slate })', put: "mlbRivalSeason(c.year, { pos: c.pos, kind: 'closer', slate })" },
  /* Step 5b, the NHL. H.F5: the tick rolls on the bare save (moved here from scripts/simNbaAwardsSense.mjs). */
  lastyearnhl: { file: 'src/lib/nhlCareerRivalryEvents.ts', needs: 'H.F5', find: '  const p = withSeasonPlayed(c, season);', put: '  const p = withSeasonPlayed(c, undefined);' },
  /* H.F5: one beat sold as a coin again (the NHL's head to head win promising "50/50 outcome"; moved here too). */
  soldascoin: { file: 'src/lib/nhlCareerRivalryEvents.ts', needs: 'H.F5', find: '    consequence: "Fanbase +5, confidence boost",', put: '    consequence: "50/50 outcome",' },
  /* H.U6: the call site hands the hook the engine's own length whatever the year's slate. */
  siteslatenhl: { file: 'src/lib/nhlMyCareer.ts', needs: 'H.U6', find: 'nhlRivalSeason(c.year, { pos: c.pos, slate })', put: 'nhlRivalSeason(c.year, { pos: c.pos, slate: US_ENGINE_SEASON.nhl })' },
  /* M.O, H.O (correction 8c): a rival who retired on an old save comes back and is judged again (his old line and
     his tally move). The season sims guard the call, so the control lifts the guard there. */
  retiredlinemlb: { file: 'src/lib/mlbMyCareer.ts', needs: 'M.O', find: '  if (c.rival && !c.rival.retired) {', put: '  if (c.rival) { c.rival.retired = false;' },
  retiredlinenhl: { file: 'src/lib/nhlMyCareer.ts', needs: 'H.O', find: '  if (c.rival && !c.rival.retired) {', put: '  if (c.rival) { c.rival.retired = false;' },
  /* M.O and H.O: an old save's head to head tally reset when its rival first plays on the player's line. */
  oldtallymlb: { file: 'src/lib/mlbMyCareer.ts', needs: 'M.O',
    find: "    for (const n of judgeRivalSeason(c.rival, mlbHeadToHeadScore(c.pos, line), c.name, 'mlb', rng, mlbRivalSeason(c.year, { pos: c.pos, kind: c.archetype.id, slate }))) notes.push(n);",
    put: "    if (c.rival.lastYear === undefined) { c.rival.myYears = 0; c.rival.hisYears = 0; } for (const n of judgeRivalSeason(c.rival, mlbHeadToHeadScore(c.pos, line), c.name, 'mlb', rng, mlbRivalSeason(c.year, { pos: c.pos, kind: c.archetype.id, slate }))) notes.push(n);" },
  oldtallynhl: { file: 'src/lib/nhlMyCareer.ts', needs: 'H.O',
    find: "    for (const n of judgeRivalSeason(c.rival, nhlHeadToHeadScore(c.pos, line), c.name, 'nhl', rng, nhlRivalSeason(c.year, { pos: c.pos, slate }))) notes.push(n);",
    put: "    if (c.rival.lastYear === undefined) { c.rival.myYears = 0; c.rival.hisYears = 0; } for (const n of judgeRivalSeason(c.rival, nhlHeadToHeadScore(c.pos, line), c.name, 'nhl', rng, nhlRivalSeason(c.year, { pos: c.pos, slate }))) notes.push(n);" },
  /* P1: the lifted stream keyed one character off the NBA's own key of Round 1112 (the NBA rival's whole trail
     moves, and nothing of the player's does). */
  liftkey: { file: 'src/lib/careerRival.ts', prove: true, needs: 'P1',
    find: '  let key = `${tag}|${r.name}|${year}`;', put: '  let key = `${tag}|${r.name}|${year}|`;' },
  /* L: one word of the lifted All-Star cards changed (the NBA's "both" card no longer reads as it did). */
  liftcard: { file: 'src/lib/careerFactBeats.ts', prove: true, needs: 'L',
    find: 'description: (r: { name: string }) => `The All-Star rosters are out, and you and ${r.name} are both on them.`,', put: 'description: (r: { name: string }) => `The All-Star rosters are out, and you and ${r.name} both made it.`,' },
};
if (CONTROL && CONTROLS[CONTROL]?.prove && !PROVE) { console.error(`control ${CONTROL} is judged against a tree before: set RIVAL_PROVE. Refusing to run.`); process.exit(2); }
if (CONTROL && !CONTROLS[CONTROL]) { console.error(`unknown US_RIVAL_CONTROL "${CONTROL}", expected one of: ${Object.keys(CONTROLS).join(', ') || '(none yet)'}`); process.exit(2); }
const edits = CONTROL ? [{ label: `control ${CONTROL}`, ...CONTROLS[CONTROL] }] : [];

function editedSource(list, file, src, onApplied = () => {}) {
  let out = src;
  for (const e of list.filter(x => file.replace(/\\/g, '/').endsWith(x.file))) {
    const hits = out.split(e.find).length - 1;
    if (hits !== 1) { console.error(`${e.label}: anchor ${e.find.slice(0, 80)} found ${hits} times in ${e.file}, expected exactly 1. Refusing to run.`); process.exit(2); }
    const was = out;
    out = out.replace(e.find, () => e.put);
    if (out === was) { console.error(`${e.label}: the swap changed nothing. Refusing to run.`); process.exit(2); }
    onApplied(e);
  }
  return out;
}

const BUNDLE = {
  stdin: {
    contents: [
      "export { NFL_CAREER_SPORT } from './src/lib/nflCareerSport.ts';",
      "export { MLB_CAREER_SPORT } from './src/lib/mlbCareerSport.ts';",
      "export { NHL_CAREER_SPORT } from './src/lib/nhlCareerSport.ts';",
      "export { NBA_CAREER_SPORT } from './src/lib/nbaCareerSport.ts';",
      "export * as nfl from './src/lib/nflMyCareer.ts';",
      "export * as mlb from './src/lib/mlbMyCareer.ts';",
      "export * as nhl from './src/lib/nhlMyCareer.ts';",
      "export * as shape from './src/lib/usSeasonShape.ts';",
      "export * as awards from './src/lib/careerAwards.ts';",
      "export * as rival from './src/lib/careerRival.ts';",
      "export * as events from './src/lib/careerRivalryEvents.ts';",
      "export * as factBeats from './src/lib/careerFactBeats.ts';",
      "export * as nflEvents from './src/lib/nflCareerRivalryEvents.ts';",
      "export * as lines from './src/lib/usCareerStatLine.ts';",
      "export { keyedRng } from './src/lib/keyedRng.ts';",
      "export { seasonSwing } from './src/lib/careerVariance.ts';",
      "export * as drive from './src/test/helpers/usCareerDrive.ts';",
    ].join('\n'),
    resolveDir: ROOT, loader: 'ts',
  },
  bundle: true, format: 'esm', platform: 'node', logLevel: 'error',
  alias: { '@': path.join(ROOT, 'src') },
};
globalThis.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };

/** The engines with this run's control swapped in memory. */
async function bundleWith(list, tag) {
  let applied = 0;
  const plugin = {
    name: 'rival-control',
    setup(b) {
      if (!list.length) return;
      b.onLoad({ filter: /[.]ts$/ }, args => {
        if (!list.some(e => args.path.replace(/\\/g, '/').endsWith(e.file))) return undefined;
        return { contents: editedSource(list, args.path, norm(readFileSync(args.path, 'utf8')), () => { applied += 1; }), loader: 'ts' };
      });
    },
  };
  const out = path.join(os.tmpdir(), `us-rival-${process.pid}-${tag}.mjs`);
  await build({ ...BUNDLE, outfile: out, plugins: [plugin] });
  if (applied !== list.length) { console.error(`${list.map(e => e.label).join(', ')}: ${applied} of ${list.length} swaps were applied (a file was never bundled). Refusing to run.`); process.exit(2); }
  const mod = await import(pathToFileURL(out).href);
  try { unlinkSync(out); } catch { /* another run may have cleaned it */ }
  return mod;
}
/** The engines with every src file that differs from `commit` read at that commit (git show, in memory). Says
 *  how many files it took back, so a proof against a tree that is this tree cannot pass quietly. */
async function bundleAt(commit) {
  const changed = execSync(`git diff --name-only ${commit} -- src`, { cwd: ROOT }).toString().split('\n').map(x => x.trim()).filter(Boolean);
  const served = new Set();
  const plugin = {
    name: 'rival-before',
    setup(b) {
      b.onLoad({ filter: /[.]tsx?$/ }, args => {
        const rel = path.relative(ROOT, args.path).replace(/\\/g, '/');
        if (!changed.includes(rel)) return undefined;
        let contents;
        try { contents = execSync(`git show ${commit}:${rel}`, { cwd: ROOT, maxBuffer: 1 << 28, stdio: ['ignore', 'pipe', 'ignore'] }).toString(); } catch { return undefined; /* a file the round added */ }
        served.add(rel);
        return { contents: norm(contents), loader: rel.endsWith('x') ? 'tsx' : 'ts' };
      });
    },
  };
  const out = path.join(os.tmpdir(), `us-rival-${process.pid}-before.mjs`);
  await build({ ...BUNDLE, outfile: out, plugins: [plugin] });
  const mod = await import(pathToFileURL(out).href);
  try { unlinkSync(out); } catch { /* another run may have cleaned it */ }
  return { mod, changed, served: [...served] };
}

function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const mean = a => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0);
const pc = (n, d) => (d ? (100 * n) / d : 0);
const f1 = x => (Math.round(x * 10) / 10).toFixed(1);
const f2 = x => (Math.round(x * 100) / 100).toFixed(2);

let checks = 0; let failed = 0;
const failedSections = new Set();
/** One judged check. `exact` checks are judged at every size; a banded one only at full size. */
function check(section, cond, msg) {
  checks += 1;
  if (cond) { console.log(`   ok   ${section}: ${msg}`); return; }
  failed += 1; failedSections.add(section);
  console.log(`   FAIL ${section}: ${msg}`);
}

/* ------------------------------------------------------------------ */
/* What a printed line is, by sport and position                       */
/* ------------------------------------------------------------------ */
/* Written from the printers in src/lib/usCareerStatLine.ts (nflStatLine, mlbStatLine, nhlStatLine), part by
   part and in their order. STRICT is the player's own shape, character for character (thousands grouped, sacks
   in halves, a three place average with no leading zero). LOOSE finds the same labelled part anywhere in a
   line, so an old rival line that carries the right parts in another order or format can still be read back
   and scored: "readable" in the tables below means that. A line missing a part is "unread". */
const raw = String.raw;
const N = raw`(\d{1,3}(?:,\d{3})*)`;
const H = raw`(\d{1,3}(?:,\d{3})*(?:\.5)?)`;
const T = raw`([\d,]+(?:\.\d+)?)`;
const ERA = raw`(\d+\.\d{2})`;
const num = s => Number(s.replace(/,/g, ''));
const part = (key, tail, o = {}) => ({
  key, val: o.val ?? num,
  strict: `${o.head ?? ''}${o.strict ?? N}${tail}`,
  loose: `${o.head ?? ''}${o.loose ?? T}${o.looseTail ?? tail}`,
});
const three = { strict: raw`\.(\d{3})`, loose: raw`0?\.(\d{3})`, val: s => Number(`0.${s}`) };
const skater = [part('goals', ' G', { looseTail: ' ?G' }), part('assists', ' A', { looseTail: ' ?A' }), part('points', ' P', { looseTail: ' ?P' })];
const hitter = [part('avg', '', three), part('hr', ' HR'), part('rbi', ' RBI')];
const catcher = [part('rec', ' rec'), part('recYds', ' yds'), part('recTd', ' TD')];
const SHAPES = {
  nfl: {
    QB: [part('passYds', ' yds'), part('passTd', ' TD'), part('ints', ' INT')],
    RB: [part('rushYds', ' rush yds'), part('rushTd', ' TD'), part('rec', ' rec')],
    WR: catcher, TE: catcher,
    LB: [part('tackles', ' tackles?'), part('sacks', ' sacks?', { strict: H }), part('picks', ' INT')],
    CB: [part('picks', ' INT'), part('passDef', ' pass(?:es)? defended'), part('tackles', ' tackles?')],
    EDGE: [part('sacks', ' sacks?', { strict: H }), part('tackles', ' tackles?'), part('forcedFum', ' forced fumbles?')],
    K: [part('fgMade', raw` of [\d,]+ FG`), part('longFg', '', { head: 'long of ' })],
  },
  mlb: {
    SP: [part('wins', raw`-\d+`), part('era', ' ERA', { strict: ERA }), part('so', ' K')],
    RP: [part('saves', ' saves?'), part('holds', ' holds?'), part('era', ' ERA', { strict: ERA }), part('so', ' K')],
    C: hitter, '1B': hitter, '2B': hitter, '3B': hitter, SS: hitter, LF: hitter, CF: hitter, RF: hitter, DH: hitter,
  },
  nhl: { C: skater, LW: skater, RW: skater, D: skater, G: [part('wins', ' W'), part('svpct', ' SV%', three)] },
};
/** Is `text` the player's own shape at this position? */
function inShape(sport, pos, text) {
  const parts = SHAPES[sport]?.[pos];
  return !!parts && new RegExp(`^${parts.map(p => p.strict).join(', ')}$`).test(text);
}
/** The printed parts of a line as numbers, or null when a part is not there. */
function readBack(sport, pos, text) {
  const parts = SHAPES[sport]?.[pos];
  if (!parts) return null;
  const out = {};
  for (const p of parts) {
    const m = new RegExp(`(?:^|[ ,])${p.loose}(?=$|[ ,])`).exec(text);
    if (!m) return null;
    out[p.key] = p.val(m[1]);
  }
  return out;
}
/* A running back's line prints catches, not receiving yards, and the season score reads yards: the verdict
   reads his printed catches at 8 yards each. Typed HERE and not imported, so control `bridge` can fire. */
const RB_YARDS_A_CATCH = 8;
/** The season score of the PRINTED parts: what the screen shows decides. */
function printedScore(M, sport, pos, parts) {
  if (sport === 'nfl') return M.awards.nflSeasonScore(pos, pos === 'RB' ? { ...parts, recYds: parts.rec * RB_YARDS_A_CATCH } : parts);
  if (sport === 'mlb') return MLB_SCORE(pos, parts);
  return NHL_SCORE(pos, parts);
}
/* Round 1313 (the lead's ruling on M.F2): baseball's and hockey's season scores are TYPED here, the way the walk
   types them, so the verdict is read off the screen against a rule the code under test cannot move. Their source
   is src/lib/careerAwards.ts lines 111 to 123 (mlbSeasonScore and nhlSeasonScore, read 2026-10-12), written in
   the same order of operations so a score agrees to the last bit. A deliberate change there is retyped here. */
function MLB_SCORE(pos, l) {
  return pos === 'SP'
    ? (l.so ?? 0) / 5 + (l.wins ?? 0) * 2.2 + Math.max(0, (3.8 - (l.era ?? 5)) * 22)
    : pos === 'RP'
      ? (l.saves ?? 0) * 1.5 + (l.holds ?? 0) * 1.1 + (l.so ?? 0) / 4 + Math.max(0, (3.6 - (l.era ?? 5)) * 26)
      : (l.hr ?? 0) * 1.6 + (l.rbi ?? 0) / 3 + Math.max(0, ((l.avg ?? 0.2) - 0.24) * 320) + (l.sb ?? 0) / 3;
}
function NHL_SCORE(pos, l) {
  return pos === 'G'
    ? (l.wins ?? 0) * 1.8 + Math.max(0, ((l.svpct ?? 0.9) - 0.9) * 2400)
    : (l.points ?? 0) * (pos === 'D' ? 1.35 : 1);
}

/* ------------------------------------------------------------------ */
/* The fleet                                                           */
/* ------------------------------------------------------------------ */
const FLEET = {
  nfl: { desc: M => M.NFL_CAREER_SPORT, pos: ['QB', 'RB', 'WR', 'TE', 'LB', 'CB', 'EDGE', 'K'], eras: ['now', 'y2005'] },
  /* Round 1313: baseball and hockey gained their throwback arm (every second lap a 2004 or a 2006-07 career),
     so the 60 game year of 2020 and the 48 and 56 game hockey years are played by the fleet as well. */
  mlb: { desc: M => M.MLB_CAREER_SPORT, pos: ['SP', 'RP', 'C', '1B', '2B', '3B', 'SS', 'LF', 'CF', 'RF', 'DH'], eras: ['now', 'y2004'] },
  nhl: { desc: M => M.NHL_CAREER_SPORT, pos: ['C', 'LW', 'RW', 'D', 'G'], eras: ['now', 'y2006'] },
  nba: { desc: M => M.NBA_CAREER_SPORT, pos: ['PG', 'SG', 'SF', 'PF', 'C'], eras: ['now'] },
};
/* The roster beat of a bound sport: its id and the award word the engine writes on the player's own season. */
const ROSTER = { nfl: { id: 206, award: 'All-Pro' }, mlb: { id: 206, award: 'All-Star' }, nhl: { id: 306, award: 'All-Star' } };
/* Round 1313, printed only: the engine's own season length (a season line carries `slate` only when its year is
   of another length), the two beats a sport deals off the tally (losing it, winning it: mlbCareerRivalryEvents.ts
   and nhlCareerRivalryEvents.ts, `r.hisYears >= 3 && r.hisYears > r.myYears` and its mirror) and the roster beat
   of a sport not yet bound (its cards are counted by what they promise). */
const ENGINE_LEN = { mlb: 162, nhl: 82 };
const TALLY_BEATS = { mlb: { 211: 'losing', 212: 'winning' }, nhl: { 311: 'losing', 312: 'winning' } };
const ROSTER_ID = { nfl: 206, mlb: 206, nhl: 306 };
const AGE_BANDS = [[0, 24, '24 and under'], [25, 27, '25 to 27'], [28, 30, '28 to 30'], [31, 33, '31 to 33'], [34, 99, '34 and over']];
const bandOf = age => AGE_BANDS.find(([lo, hi]) => age >= lo && age <= hi)[2];
const cell = () => ({ judged: 0, mine: 0, near: 0, heat: 0, read: 0, off: 0, unread: 0, disagree: 0, careers: 0, retired: 0, badge: 0, honMine: 0, honHis: 0, honBoth: 0 });
const tally = () => ({ judged: 0, mine: 0 });
const bump = (o, k, mine) => { const t = (o[k] ??= tally()); t.judged += 1; if (mine) t.mine += 1; };
const sha = () => crypto.createHash('sha256');

/**
 * `per` careers of one sport on one seed, on the engines of bundle M. Returns the hashes section P1 compares
 * (the player's seasons and counters, the seasons a beat was dealt in, the notes without the rival's own, the
 * rival's trail, the beats word for word, every note) and what the tables print, by position.
 */
function playFleet(M, sport, seed, per) {
  const F = FLEET[sport]; const S = F.desc(M);
  const rnd = mulberry32(seed * 7919 + sport.charCodeAt(1) * 104729 + 1227);
  const keep = Math.random; Math.random = rnd;
  const h = { player: sha(), dealt: sha(), notes: sha(), rival: sha(), beats: sha(), allNotes: sha() };
  const by = {}; const job = {}; const age = {}; const arm = {}; const jobPos = {};
  /* Round 1313, printed only: by the season's length (all positions, and by position), by kind pairing (a
     hockey skater's kind against the kind rivalKindOf would hash for his rival; a reliever's own bullpen job),
     and every card dealt off the tally or by the roster beat, by what it is. */
  const len = {}; const lenPos = {}; const kind = {}; const dealtBy = {};
  const firstOff = []; const firstDisagree = []; const coins = []; let beatsDealt = 0;
  /* One pair a career (the years he took, the years judged): the years of one career share a rating, so the
     error of a share is worked out over careers, never over years (clusterError below). */
  const pairs = [];
  /* Every roster beat dealt (N.F5), beside the two facts of the season it was dealt on. */
  const roster = [];
  const below = { mine: 0, his: 0, first: [] };
  try {
    for (let i = 0; i < per; i += 1) {
      const pos = F.pos[i % F.pos.length];
      const era = F.eras[Math.floor(i / F.pos.length) % F.eras.length];
      const archs = S.create.archetypes[pos];
      const c = S.startCareer('Sim', pos, archs[i % archs.length], rnd, null, era);
      const m = (by[pos] ??= cell());
      let tq = S.rollTeamQuality(null, rnd);
      S.assignRole(c, tq, rnd);
      for (let guard = 0; guard < 30; guard += 1) {
        S.campBattle(c, tq, rnd);
        const r0 = c.rival; const judged = !!r0 && !r0.retired; const my0 = r0?.myYears ?? 0;
        const pend0 = c.pendingRivalryEvent; const role = c.role; const ageNow = c.age;
        const played = S.simSeason(c, tq, rnd);
        const r = c.rival;
        const beat = c.pendingRivalryEvent && c.pendingRivalryEvent !== pend0 ? c.pendingRivalryEvent : null;
        h.dealt.update(beat ? '1' : '0');
        if (beat && ROSTER[sport]?.id === beat.id) {
          roster.push({ pos, says: beat.description, does: beat.consequence, rival: r?.name ?? '', year: played?.line?.year,
            mine: (played?.line?.awards ?? []).includes(ROSTER[sport].award), his: r?.lastAllStar === true, sameYear: r?.lastYear === played?.line?.year });
        }
        h.beats.update(JSON.stringify(beat ? [beat.id, beat.emoji, beat.title, beat.description, beat.consequence] : 0));
        if (beat && TALLY_BEATS[sport]?.[beat.id]) dealtBy[`tally ${TALLY_BEATS[sport][beat.id]}`] = (dealtBy[`tally ${TALLY_BEATS[sport][beat.id]}`] ?? 0) + 1;
        if (beat && ROSTER_ID[sport] === beat.id) dealtBy[`roster ${beat.consequence}`] = (dealtBy[`roster ${beat.consequence}`] ?? 0) + 1;
        if (beat) { beatsDealt += 1; if (`${beat.description} ${beat.consequence}`.includes('50/50')) coins.push(`${beat.id} "${beat.consequence}"`); }
        if (r) h.rival.update(JSON.stringify([r.lastLine, r.lastScore, r.myYears, r.hisYears, r.rings, r.ovr, r.age, r.retired, r.lastYear ?? null, r.lastAllStar ?? null]));
        const notes = played?.notes ?? [];
        h.allNotes.update(JSON.stringify(notes));
        h.notes.update(JSON.stringify(notes.filter(n => !n.startsWith('\u{1FA9E}'))));
        if (judged && sport !== 'nba') {
          const mine = r.myYears > my0;
          const hurt = notes.some(n => n.startsWith('\u{1F691}'));
          const jobNow = role === 'backup' && !(sport === 'nfl' && pos === 'K') ? 'backup' : hurt ? 'hurt' : 'starter';
          m.judged += 1; if (mine) m.mine += 1;
          if (ROSTER[sport]) {
            const a = (played.line.awards ?? []).includes(ROSTER[sport].award); const b = r.lastAllStar === true;
            if (a) m.honMine += 1; if (b) m.honHis += 1; if (a && b) m.honBoth += 1;
          }
          if (notes.some(n => n.startsWith('\u{1FA9E}') && n.includes('Nothing in it again'))) m.near += 1;
          bump(job, jobNow, mine); bump(age, bandOf(ageNow), mine); bump(arm, `${pos} ${era}`, mine); bump(jobPos, `${pos} ${jobNow}`, mine);
          if (ENGINE_LEN[sport]) { const games = played.line.slate ?? ENGINE_LEN[sport]; bump(len, String(games), mine); bump(lenPos, `${pos} ${games === ENGINE_LEN[sport] ? 'own' : 'other'}`, mine); }
          if (sport === 'nhl' && pos !== 'G') bump(kind, `${pos} ${c.archetype.id} v ${M.rival.rivalKindOf('nhl-rival-kind', r, S.create.archetypes[pos]).id}`, mine);
          if (sport === 'mlb' && pos === 'RP') bump(kind, `RP ${c.archetype.id}`, mine);
          const hisText = r.lastLine; const myText = S.statLine(played.line, pos);
          if (!inShape(sport, pos, hisText)) { m.off += 1; if (firstOff.length < 3) firstOff.push(`${pos}: "${hisText}"`); }
          /* A printed line that carries a number below zero, on either side (nflStatLineFor floors every count
             at zero since Round 1227; before it a running back's yards could print negative at a very low form). */
          if (/(^|[ ,])-\d/.test(hisText)) { below.his += 1; if (below.first.length < 3) below.first.push(`his, ${pos}: "${hisText}"`); }
          if (/(^|[ ,])-\d/.test(myText)) { below.mine += 1; if (below.first.length < 3) below.first.push(`mine, ${pos}: "${myText}"`); }
          const his = readBack(sport, pos, hisText); const me = readBack(sport, pos, myText);
          if (his && me) { m.read += 1; if (printedScore(M, sport, pos, me) === printedScore(M, sport, pos, his)) m.heat += 1; }
          if (!his || !me) m.unread += 1;
          else if ((printedScore(M, sport, pos, me) > printedScore(M, sport, pos, his)) !== mine) {
            m.disagree += 1;
            if (firstDisagree.length < 3) firstDisagree.push(`${pos} ${played.line.year}: mine "${myText}" his "${hisText}", the save gave the year to ${mine ? 'me' : 'him'}`);
          }
        }
        S.progress(c, rnd);
        if (S.shouldRetire(c)) break;
        tq = S.rollTeamQuality(tq, rnd);
      }
      const counters = Object.fromEntries(Object.entries(c).filter(([, v]) => typeof v === 'number').sort(([a], [b]) => (a < b ? -1 : 1)));
      h.player.update(JSON.stringify({ seasons: c.seasons, counters }));
      m.careers += 1;
      if (c.rival) pairs.push([c.rival.myYears, c.rival.myYears + c.rival.hisYears]);
      if (c.rival?.retired) { m.retired += 1; if (c.rival.myYears > c.rival.hisYears) m.badge += 1; }
    }
  } finally { Math.random = keep; }
  return { hash: Object.fromEntries(Object.entries(h).map(([k, v]) => [k, v.digest('hex')])), by, job, age, arm, jobPos, len, lenPos, kind, dealtBy, firstOff, firstDisagree, pairs, roster, below, coins, beatsDealt };
}
/** The standard error, in percent, of a share pooled over careers (a ratio estimator's error by career). */
function clusterError(pairs) {
  const N = pairs.reduce((a, [, n]) => a + n, 0);
  if (!N) return 0;
  const p = pairs.reduce((a, [m]) => a + m, 0) / N;
  return (100 * Math.sqrt(pairs.reduce((a, [m, n]) => a + (m - p * n) ** 2, 0))) / N;
}

/** Add one seed's table into a running one. */
function addInto(total, one) {
  for (const group of ['by', 'job', 'age', 'arm', 'jobPos', 'len', 'lenPos', 'kind']) {
    total[group] ??= {};
    for (const [k, v] of Object.entries(one[group])) {
      const t = (total[group][k] ??= {});
      for (const [f, n] of Object.entries(v)) t[f] = (t[f] ?? 0) + n;
    }
  }
  total.dealtBy ??= {};
  for (const [k, n] of Object.entries(one.dealtBy)) total.dealtBy[k] = (total.dealtBy[k] ?? 0) + n;
  return total;
}

/* ------------------------------------------------------------------ */
/* The tables                                                          */
/* ------------------------------------------------------------------ */
const shareOf = t => (t ? pc(t.mine, t.judged) : 0);
/** One sport's table, by position, with the by job, by age and by arm lines under it. */
function printTable(label, sport, total, perSeed) {
  console.log(`   ${label} ${sport}: my share of the head to head years by seed ${perSeed.map(f1).join(', ')} (mean ${f2(mean(perSeed))})`);
  for (const pos of FLEET[sport].pos) {
    const m = total.by[pos]; if (!m) continue;
    const read = m.judged - m.unread;
    const arms = FLEET[sport].eras.length > 1 ? `  (${FLEET[sport].eras.map(e => `${e} ${f1(shareOf(total.arm[`${pos} ${e}`]))}`).join(', ')})` : '';
    const hs = total.jobPos[`${pos} starter`];
    console.log(`     ${pos.padEnd(5)} judged ${String(m.judged).padStart(6)}  off shape ${f1(pc(m.off, m.judged)).padStart(5)}%  unread ${f1(pc(m.unread, m.judged)).padStart(5)}%  verdict against the printed lines: ${read ? `${f1(pc(m.disagree, read))}% disagree` : 'cannot be asked'}  my share ${f1(pc(m.mine, m.judged))}%${arms}  as a healthy starter ${f1(shareOf(hs))}% of ${hs?.judged ?? 0}  near ties ${f1(pc(m.near, m.judged))}%  rival retired behind me in ${f1(pc(m.badge, m.careers))}% of ${m.careers} careers`);
  }
  console.log(`     by job: ${['starter', 'backup', 'hurt'].map(j => `${j} ${f1(shareOf(total.job[j]))}% of ${total.job[j]?.judged ?? 0}`).join(', ')}`);
  console.log(`     by age: ${AGE_BANDS.map(([, , n]) => `${n} ${f1(shareOf(total.age[n]))}% of ${total.age[n]?.judged ?? 0}`).join(', ')}`);
  /* Round 1313, printed only. */
  if (ENGINE_LEN[sport]) {
    console.log(`     by season length: ${Object.keys(total.len ?? {}).sort((a, b) => Number(b) - Number(a)).map(k => `${k} games ${f1(shareOf(total.len[k]))}% of ${total.len[k].judged}`).join(', ')}`);
    console.log(`     by position, the engine's own length against another: ${FLEET[sport].pos.map(p => `${p} ${f1(shareOf(total.lenPos?.[`${p} own`]))} of ${total.lenPos?.[`${p} own`]?.judged ?? 0} / ${f1(shareOf(total.lenPos?.[`${p} other`]))} of ${total.lenPos?.[`${p} other`]?.judged ?? 0}`).join('; ')}`);
  }
  const kinds = Object.keys(total.kind ?? {}).sort();
  if (kinds.length) console.log(`     by kind pairing: ${kinds.map(k => `${k} ${f1(shareOf(total.kind[k]))}% of ${total.kind[k].judged}`).join('; ')}`);
  console.log(`     printed dead heats (both lines read, the two printed scores equal): ${FLEET[sport].pos.map(p => { const m = total.by[p]; return m ? `${p} ${m.heat} of ${m.read}` : `${p} -`; }).join(', ')}`);
  console.log(`     cards dealt over the run: ${Object.entries(total.dealtBy ?? {}).sort().map(([k, n]) => `${k} ${n}`).join(', ') || 'none counted'}`);
}
/** Play every seed of one sport on bundle M. */
function runSport(M, sport) {
  const seeds = SEEDS.map(seed => playFleet(M, sport, seed, CAREERS));
  const total = seeds.reduce(addInto, {});
  const perSeed = seeds.map(s => { const t = Object.values(s.by).reduce((a, m) => ({ judged: a.judged + m.judged, mine: a.mine + m.mine }), tally()); return pc(t.mine, t.judged); });
  return { seeds, total, perSeed, error: clusterError(seeds.flatMap(s => s.pairs)) };
}

/* ------------------------------------------------------------------ */
/* N.U: the NFL rival's season, on hand built rivals                   */
/* ------------------------------------------------------------------ */
/* The first team All-Pro names ONE man at these positions (NFL_ALL_PRO in careerAwards.ts: one quarterback, one
   running back, one tight end, a kicker). Typed here and not read from the engine, so control `oneslot` fires. */
const ONE_PLACE = ['QB', 'RB', 'TE', 'K'];
/* N.F3: my share of the head to head years as Round 1227 shipped it, five full size seeds (the header), and the
   fixed width it is held within: three times the 0.27 points one standard error came to over careers. */
const RIVAL_1227 = { nfl: [38.7, 40.0, 39.0, 38.1, 38.9] };
const HELD_TOL = { nfl: 0.81 };
/* FOR THE BUILDER OF A LATER ROUND (Round B first): on an unchanged tree the run is deterministic and N.F3 is
   exact. The day a round legitimately moves one NFL draw, the typed mean above and the new run are TWO samples:
   their difference has an error of 0.27 times root two, 0.38 points, so 0.81 is about 2.1 of those and roughly
   one such round in thirty turns N.F3 red for no reason of its own. The same holds for the "only him" floor of
   N.F5 (12 against 21 measured; a count that small has a spread near 4.6). When that happens: prove the player's
   path first (P1), then MEASURE five full size seeds again and RETYPE the means, the floors and the date here.
   Never widen a width or lower a floor to get a green. */
function nflUnit(M) {
  const NAMES = ['Marcus Whitaker', 'Devon Delgado', 'Kai Okafor', 'Theo Novak', 'Cruz Halstead'];
  const YEARS = [2005, 2012, 2020, 2021, 2026, 2031];
  const bad = { draws: [], season: [], pure: [], place: [] }; const made = {}; const reached = {}; const lens = new Set();
  const note = (list, text) => { if (list.length < 3) list.push(text); };
  let n = 0;
  for (const pos of FLEET.nfl.pos) for (let i = 0; i < 120; i += 1) {
    const year = YEARS[i % YEARS.length]; const form = 70 + ((i * 7) % 36); const firstTeam = i % 2 === 1;
    const r = { name: NAMES[i % NAMES.length], pos, team: 'KC', ovr: 80, pot: 90, age: 26, rings: 0, hisYears: 2, myYears: 3, retired: false, lastLine: 'x', lastScore: 1 };
    const frozen = JSON.stringify(r);
    const base = mulberry32(9000 + i * 31 + pos.length); const draws = [];
    const out = M.nfl.nflRivalSeason(year, { pos, firstTeam })(r, form, () => { const v = base(); draws.push(v); return v; });
    n += 1;
    const want = M.rival.rivalSeasonDraws('nfl', pos);
    if (draws.length !== want || want !== (pos === 'K' ? 1 : 3)) note(bad.draws, `${pos}: took ${draws.length} draws, the law says ${want}`);
    const keyed = M.keyedRng(['nfl-rival', r.name, year, ...draws].join('|'));
    const len = M.nfl.nflSeasonLength(year); lens.add(len);
    const stat = M.nfl.nflStatLineFor({ form, pos, games: len }, keyed);
    const text = M.lines.nflStatLine({ ...stat, teamResult: '' }, pos);
    const read = readBack('nfl', pos, text);
    const score = read ? printedScore(M, 'nfl', pos, read) : NaN;
    const won = M.awards.wonAward(keyed, 'nfl', 'allPro', pos, M.awards.nflSeasonScore(pos, M.nfl.nflAwardPaceLine({ games: len, ...stat }, len)));
    const honour = won && !(ONE_PLACE.includes(pos) && firstTeam);
    if (won) made[pos] = (made[pos] ?? 0) + 1;
    if (won && firstTeam) reached[pos] = (reached[pos] ?? 0) + 1;
    if (out.line !== text || out.score !== score || out.year !== year || out.allStar !== honour) note(bad.season, `${pos} ${year} form ${form}: the hook gave "${out.line}" ${out.score} ${out.allStar}, rebuilt "${text}" ${score} ${honour}`);
    if (won && firstTeam && ONE_PLACE.includes(pos) && out.allStar) note(bad.place, `${pos} ${year}: he is on a first team that names one man, in a season the player is on it`);
    let k = 0;
    const again = M.nfl.nflRivalSeason(year, { pos, firstTeam })(r, form, () => draws[k++]);
    if (JSON.stringify(again) !== JSON.stringify(out) || JSON.stringify(r) !== frozen) note(bad.pure, `${pos} ${year}: a second run from the same draws differs, or the rival was written`);
  }
  return { n, bad, made, reached, lens: [...lens].sort() };
}

/* N.U6: the one place rule at its call site, on the REAL simSeason. Both men are put at 97 in their prime
   before every season (the first team All-Pro is then common for both), on a 90 club, the player a healthy
   starter. Counted by position: the seasons he made it, the seasons the rival did, the seasons both did, and
   the rival's rate in the seasons the player did NOT make it, which gives the both seasons to expect if
   nothing forbade them (mine times that rate): the power of the count. Its own seeds, never RIVAL_SEEDS, so
   it is exact at every size. It is the run reviewer's probe of 2026-10-10, written into the harness. */
const SITE_CAREERS = 800;
function nflOnePlaceSite(M) {
  const S = M.NFL_CAREER_SPORT; const st = {};
  for (const pos of FLEET.nfl.pos) {
    const t = (st[pos] = { seasons: 0, mine: 0, his: 0, both: 0, hisWhenNotMine: 0, notMine: 0, expected: 0 });
    for (let i = 0; i < SITE_CAREERS; i += 1) {
      const rnd = mulberry32(31000 + i * 13 + pos.length * 7);
      const keep = Math.random; Math.random = rnd;
      try {
        const archs = S.create.archetypes[pos];
        const c = S.startCareer('Sim', pos, archs[i % archs.length], rnd, null, i % 2 ? 'y2005' : 'now');
        const tq = 90; S.assignRole(c, tq, rnd);
        for (let g = 0; g < 4 && c.rival; g += 1) {
          S.campBattle(c, tq, rnd);
          c.ovr = 97; c.pot = 99; c.morale = 95; c.health = 100; c.role = 'starter'; c.age = 26;
          c.rival.ovr = 97; c.rival.pot = 99; c.rival.age = 26; c.rival.retired = false;
          const played = S.simSeason(c, tq, rnd);
          const mine = (played?.line?.awards ?? []).includes(ROSTER.nfl.award); const his = c.rival.lastAllStar === true;
          t.seasons += 1; if (mine) t.mine += 1; if (his) t.his += 1; if (mine && his) t.both += 1;
          if (!mine) { t.notMine += 1; if (his) t.hisWhenNotMine += 1; }
          S.progress(c, rnd);
        }
      } finally { Math.random = keep; }
    }
    t.expected = t.notMine ? t.mine * (t.hisWhenNotMine / t.notMine) : 0;
  }
  return st;
}

/* N.U7: no count below zero out of the line function, and no number below zero in its printed text. The forms
   are the reachable range and a little under it (a player's form bottoms near 42, a rookie rival's at 55 less
   the swing's 11); below 33 an unfloored count that football never sees negative could go under (a corner's
   tackles), so the grid stops at 40 and says so. */
function nflFloorGrid(M) {
  const bad = []; let n = 0; let total = 0;
  const streams = [() => () => 0, () => () => 0.999, () => mulberry32(4242)];
  for (const pos of FLEET.nfl.pos) for (let form = 40; form <= 99; form += 1) for (let games = 1; games <= 17; games += 1) for (const [k, mk] of streams.entries()) {
    const stat = M.nfl.nflStatLineFor({ form, pos, games }, mk());
    const text = M.lines.nflStatLine({ ...stat, teamResult: '' }, pos);
    n += 1;
    const under = Object.entries(stat).filter(([, v]) => typeof v === 'number' && v < 0);
    if (!under.length && !/(^|[ ,])-\d/.test(text)) continue;
    total += 1;
    if (bad.length < 3) bad.push(`${pos} at form ${form}, ${games} games, stream ${k}: ${under.map(([key, v]) => `${key} ${v}`).join(', ') || 'a printed number'} ("${text}")`);
  }
  return { n, bad, total };
}

/* M.U and H.U (Round 1313): the MLB and NHL hooks on hand built rivals, the siblings of N.U. The slates are
   every season length the ledgers hold (the step 0 table printed each of them as played). */
const UNIT_SLATES = { mlb: [162, 161, 163, 60, 58], nhl: [82, 84, 48, 56, 68, 69, 70, 71] };
const UNIT_YEARS = { mlb: [2005, 2020, 2026, 2031], nhl: [2012, 2019, 2020, 2026] };
const UNIT_NAMES = ['Marcus Whitaker', 'Devon Delgado', 'Kai Okafor', 'Theo Novak', 'Cruz Halstead'];
/** His season as the hook must make it, rebuilt here from the tag, his name, the year and the draws taken. */
function rebuildUs(M, sport, r, pos, mine, year, form, draws) {
  const S = FLEET[sport].desc(M); const archs = S.create.archetypes;
  const keyed = M.keyedRng([`${sport}-rival`, r.name, year, ...draws].join('|'));
  if (sport === 'mlb') {
    const kind = pos === 'RP' ? mine.kind : pos === 'SP' ? '' : M.rival.rivalKindOf('mlb-rival-kind', r, archs[pos]).id;
    const games = M.mlb.mlbFullWorkload(pos, keyed);
    const full = { year, team: r.team, age: r.age, ovr: r.ovr, games, awards: [], teamResult: '', salary: 0, ...M.mlb.mlbStatLineFor({ form, pos, kind, games }, keyed) };
    const season = M.mlb.mlbLineOnSlate(full, M.mlb.mlbWorkSlate(pos, mine.slate));
    return { text: M.lines.mlbStatLine(season, pos), won: M.awards.wonAward(keyed, 'mlb', 'mlbAllStar', pos, M.awards.mlbSeasonScore(pos, full)) };
  }
  const scoringMult = pos === 'G' ? 0 : M.rival.rivalKindOf('nhl-rival-kind', r, archs[pos]).scoringMult;
  const games = M.nhl.nhlFullWorkload(pos, keyed);
  const full = { year, team: r.team, age: r.age, ovr: r.ovr, games, awards: [], teamResult: '', salary: 0, ...M.nhl.nhlStatLineFor({ form, pos, scoringMult, games, iceShare: 1 }, keyed) };
  const season = M.nhl.nhlLineOnSlate(full, M.nhl.nhlWorkSlate(pos, mine.slate));
  return { text: M.lines.nhlStatLine(season, pos), won: M.awards.wonAward(keyed, 'nhl', 'nhlAllStar', pos, M.awards.nhlSeasonScore(pos, full)) };
}
function usUnit(M, sport) {
  const hookOf = (year, mine) => (sport === 'mlb' ? M.mlb.mlbRivalSeason(year, mine) : M.nhl.nhlRivalSeason(year, mine));
  const S = FLEET[sport].desc(M); const archs = S.create.archetypes; const P = FLEET[sport].pos;
  const bad = { draws: [], season: [], pure: [], total: [], kind: [], job: [], slots: [] }; const lens = new Set(); let n = 0;
  const note = (list, text) => { if (list.length < 3) list.push(text); };
  const per = Math.ceil(400 / P.length);
  for (const pos of P) for (let i = 0; i < per; i += 1) {
    const year = UNIT_YEARS[sport][i % 4]; const slate = UNIT_SLATES[sport][i % UNIT_SLATES[sport].length]; const form = 40 + ((i * 7) % 60);
    const mine = sport === 'mlb' ? { pos, kind: archs[pos][i % archs[pos].length].id, slate } : { pos, slate };
    const r = { name: UNIT_NAMES[i % UNIT_NAMES.length], pos, team: sport === 'mlb' ? 'NYY' : 'BOS', ovr: 80, pot: 90, age: 26, rings: 0, hisYears: 2, myYears: 3, retired: false, lastLine: 'x', lastScore: 1 };
    const frozen = JSON.stringify(r);
    const base = mulberry32(9100 + i * 31 + pos.length); const draws = [];
    let out;
    try { out = hookOf(year, mine)(r, form, () => { const v = base(); draws.push(v); return v; }); } catch (e) { note(bad.total, `${pos} ${year}: the hook threw ${e?.message ?? e}`); continue; }
    n += 1; lens.add(slate);
    const want = M.rival.rivalSeasonDraws(sport, pos);
    if (draws.length !== want || want !== 2) note(bad.draws, `${pos}: took ${draws.length} draws, the law says ${want}`);
    const re = rebuildUs(M, sport, r, pos, mine, year, form, draws.slice(0, 2));
    const read = readBack(sport, pos, re.text); const score = read ? printedScore(M, sport, pos, read) : NaN;
    if (out.line !== re.text || out.score !== score || out.year !== year || out.allStar !== re.won || !inShape(sport, pos, out.line)) note(bad.season, `${pos} ${year} slate ${slate} form ${form}: the hook gave "${out.line}" ${out.score} ${out.allStar}, rebuilt "${re.text}" ${score} ${re.won}`);
    let k = 0;
    const again = hookOf(year, mine)(r, form, () => draws[k++]);
    if (JSON.stringify(again) !== JSON.stringify(out) || JSON.stringify(r) !== frozen) note(bad.pure, `${pos} ${year}: a second run from the same draws differs, or the rival was written`);
    /* U4: his kind does not move with his rating or his age (the same draws and form, another rating and age). */
    let k2 = 0;
    const older = hookOf(year, mine)({ ...r, ovr: 64, age: 35 }, form, () => draws[k2++]);
    if (older.line !== out.line) note(bad.kind, `${pos} ${year}: the line moved with his rating and age ("${out.line}" against "${older.line}")`);
  }
  /* U3, correction 7: a rival and a player both at a position no table holds still get a season and a line. */
  try { const odd = hookOf(2026, sport === 'mlb' ? { pos: 'XX', kind: 'closer', slate: 162 } : { pos: 'XX', slate: 82 })({ name: 'Theo Novak', pos: 'XX', team: 'NYY', ovr: 80, pot: 90, age: 26, rings: 0, hisYears: 0, myYears: 0, retired: false, lastLine: 'x', lastScore: 1 }, 80, mulberry32(3));
    if (!odd || typeof odd.line !== 'string' || !odd.line.length || !Number.isFinite(odd.score)) note(bad.total, `a position no table holds gave ${JSON.stringify(odd)}`);
  } catch (e) { note(bad.total, `a position no table holds threw: ${e?.message ?? e}`); }
  /* U4, baseball: a reliever's rival has the player's bullpen job, both ways. A closer's line never holds more than
     4 holds (Math.round(rng() * 4)) and a setup man's never more than 6 saves (Math.round(rng() * 6)), exact; the
     power is the count of seasons where the OTHER job's cap would have been broken, printed and floored. */
  const job = { closer: 0, other: 0, power: 0 };
  if (sport === 'mlb') for (let i = 0; i < 600; i += 1) {
    const mineKind = ['closer', 'setup', 'sidearm'][i % 3]; const year = UNIT_YEARS.mlb[i % 4];
    const out = hookOf(year, { pos: 'RP', kind: mineKind, slate: 162 })({ name: `${UNIT_NAMES[i % 5]} ${i}`, pos: 'RP', team: 'NYY', ovr: 85, pot: 90, age: 27, rings: 0, hisYears: 0, myYears: 0, retired: false, lastLine: 'x', lastScore: 1 }, 70 + (i % 30), mulberry32(700 + i));
    const p = readBack('mlb', 'RP', out.line); if (!p) { note(bad.job, `RP line unread: "${out.line}"`); continue; }
    if (mineKind === 'closer') { job.closer += 1; if (p.holds > 4) note(bad.job, `a closer's rival printed ${p.holds} holds: "${out.line}"`); if (p.saves > 6) job.power += 1; }
    else { job.other += 1; if (p.saves > 6) note(bad.job, `a ${mineKind}'s rival printed ${p.saves} saves: "${out.line}"`); if (p.holds > 4) job.power += 1; }
  }
  /* U5: the All-Star table names more than one man at every position, so "both" can be true. */
  for (const pos of P) { const slots = M.awards.awardSlots(sport, sport === 'mlb' ? 'mlbAllStar' : 'nhlAllStar', pos); if (!(slots > 1)) note(bad.slots, `${pos} ${slots}`); }
  return { n, bad, lens: [...lens].sort((a, b) => b - a), job };
}
/* U6 (Round 1313, corrections 1 and 3): the call site, on the REAL season sim. The hook is handed three facts by
   simMlbSeason and simNhlSeason (his position, the player's bullpen job, the season's slate) and every U section
   above hands them in itself, so only this can see a call site that passes a wrong one. In E8's forced cells
   (scripts/simUsSeasonLedger.mjs: every one a season of another length) and in 1990 (the engine's own length),
   the season sim plays on a stream that records its draws; then judgeRivalSeason is replayed on the rival as he
   was before the season, from each index of those draws, with the player's side scored by the exported head to
   head function off his SAVED line and the hook built from the TRUE facts (worked out here from the state and the
   ledger). The whole rival object on the save must come back byte for byte at some index. The power is printed
   and floored: the seasons where the line made with the WRONG fact (the engine's own length; the other bullpen
   job) differs from the saved one. Controls siteslatemlb, siteslatenhl, sitekindmlb. */
const SITE_CELLS = { mlb: [[2005, 'CIN'], [2020, 'BOS'], [2020, 'DET'], [2026, 'NYY'], [1990, 'NYY']], nhl: [[2012, 'BOS'], [2019, 'CAR'], [2020, 'BOS'], [2026, 'BOS'], [1990, 'BOS']] };
const SITE_PER = 300;
function siteCheck(M, sport) {
  const S = FLEET[sport].desc(M); const archs = S.create.archetypes; const P = FLEET[sport].pos; const X = sport === 'mlb' ? M.mlb : M.nhl;
  const score = (pos, line) => (sport === 'mlb' ? X.mlbHeadToHeadScore(pos, line) : X.nhlHeadToHeadScore(pos, line));
  const hook = (year, mine) => (sport === 'mlb' ? X.mlbRivalSeason(year, mine) : X.nhlRivalSeason(year, mine));
  const out = { seasons: 0, matched: 0, missed: [], short: 0, powerSlate: 0, relievers: 0, powerKind: 0 };
  for (const [year, team] of SITE_CELLS[sport]) {
    const slate = M.shape.seasonLength(sport, year, team);
    for (let i = 0; i < SITE_PER; i += 1) {
      const rnd = mulberry32(year * 4409 + i * 13 + 7);
      const keep = Math.random; Math.random = rnd;
      try {
        const pos = P[i % P.length];
        const c = S.startCareer('Site Check', pos, archs[pos][i % archs[pos].length], rnd, null, year < 2026 ? FLEET[sport].eras[1] : 'now');
        if (!c.rival || c.rival.retired) continue;
        c.team = team; c.year = year; c.health = 100; c.ovr = 74 + ((i * 7) % 23); c.pot = Math.max(c.pot, c.ovr);
        c.rival.ovr = Math.max(55, Math.min(95, c.ovr + (i % 7) - 3)); c.rival.pot = Math.max(c.rival.pot, c.rival.ovr);
        S.assignRole(c, 80, rnd);
        const before = JSON.stringify(c.rival);
        const base = mulberry32(year * 7001 + i); const draws = [];
        const played = S.simSeason(c, 80, () => { const v = base(); draws.push(v); return v; });
        const saved = JSON.stringify(c.rival);
        const truth = sport === 'mlb' ? { pos, kind: c.archetype.id, slate } : { pos, slate };
        const replay = (from, mine) => { const r = JSON.parse(before); let k = from; M.rival.judgeRivalSeason(r, score(pos, played.line), c.name, sport, () => (k < draws.length ? draws[k++] : 0.5), hook(year, mine)); return r; };
        let at = -1;
        for (let from = 0; from < draws.length && at < 0; from += 1) if (JSON.stringify(replay(from, truth)) === saved) at = from;
        out.seasons += 1;
        if (at < 0) { if (out.missed.length < 3) out.missed.push(`${pos} ${year} ${team}: no index of ${draws.length} draws gives back the saved rival ("${c.rival.lastLine}")`); continue; }
        out.matched += 1;
        if (slate !== ENGINE_LEN[sport]) { out.short += 1; if (replay(at, { ...truth, slate: ENGINE_LEN[sport] }).lastLine !== c.rival.lastLine) out.powerSlate += 1; }
        if (sport === 'mlb' && pos === 'RP') { out.relievers += 1; if (replay(at, { ...truth, kind: truth.kind === 'closer' ? 'setup' : 'closer' }).lastLine !== c.rival.lastLine) out.powerKind += 1; }
      } finally { Math.random = keep; }
    }
  }
  return out;
}

/* U7: no count below zero out of the line function, and no number below zero in its printed text, over forms 40
   to 99, the workloads a season can hand it (healthy, hurt, a backup's) and three streams. */
function usFloorGrid(M, sport) {
  const bad = []; let n = 0; let total = 0;
  const streams = [() => () => 0, () => () => 0.999, () => mulberry32(4243)];
  const S = FLEET[sport].desc(M); const archs = S.create.archetypes;
  for (const pos of FLEET[sport].pos) {
    const kinds = sport === 'mlb' ? archs[pos].map(a => a.id) : archs[pos].map(a => a.scoringMult);
    const loads = sport === 'mlb' ? (pos === 'SP' ? [6, 8, 32] : pos === 'RP' ? [20, 62, 71] : [40, 45, 155, 162]) : (pos === 'G' ? [12, 20, 58, 67] : [20, 79, 82]);
    for (let form = 40; form <= 99; form += 1) for (const games of loads) for (const kind of kinds) for (const [s, mk] of streams.entries()) for (const iceShare of sport === 'nhl' && pos !== 'G' ? [0.5, 1] : [1]) {
      const stat = sport === 'mlb' ? M.mlb.mlbStatLineFor({ form, pos, kind, games }, mk()) : M.nhl.nhlStatLineFor({ form, pos, scoringMult: kind, games, iceShare }, mk());
      const line = { year: 2026, team: 'X', age: 26, ovr: 80, games, awards: [], teamResult: '', salary: 0, ...stat };
      const text = sport === 'mlb' ? M.lines.mlbStatLine(line, pos) : M.lines.nhlStatLine(line, pos);
      n += 1;
      const under = Object.entries(stat).filter(([, v]) => typeof v === 'number' && v < 0);
      if (!under.length && !/(^|[ ,])-\d/.test(text)) continue;
      total += 1;
      if (bad.length < 3) bad.push(`${pos} ${kind} at form ${form}, ${games} games, stream ${s}: ${under.map(([key, v]) => `${key} ${v}`).join(', ') || 'a printed number'} ("${text}")`);
    }
  }
  return { n, bad, total };
}

console.log(`simUsRivalSense: seeds ${SEEDS.join(', ')}, ${CAREERS} careers a sport a seed${FULL ? ' (full size)' : ' (SHRUNK: exact checks only)'}${CONTROL ? `, control ${CONTROL}` : ''}${PROVE ? `, proving against ${PROVE} (moved: ${MOVED.join(', ') || 'none'}; cards: ${CARDS.join(', ') || 'none'})` : ''}`);
/* --record-old-saves (with RIVAL_PROVE=<the commit before this round>): writes src/test/fixtures/
   usRivalOldSaves.json from saves BUILT BY THAT COMMIT'S CODE, each driven the way the board drives a career
   (the truth digest's driver) and stamped with the commit. Three sit on a rivalry card that code dealt (caught
   at the moment the board would answer it); two are a corner's and a kicker's career after six seasons. */
if (process.argv.includes('--record-old-saves')) {
  if (!PROVE) { console.error('--record-old-saves needs RIVAL_PROVE=<the commit whose code builds the saves>. Refusing to run.'); process.exit(2); }
  const B = await bundleAt(PROVE); const S = B.mod.NFL_CAREER_SPORT;
  const saves = { nflMade: null, nflDropped: null, nfl221: null, nflCB: null, nflK: null };
  const sitting = c => {
    const e = c.pendingRivalryEvent; if (!e) return;
    const key = e.id === 206 && e.consequence === 'Morale +5' ? 'nflMade' : e.id === 206 && e.consequence === 'Morale -5' ? 'nflDropped' : e.id === 221 ? 'nfl221' : null;
    if (key && !saves[key]) saves[key] = JSON.parse(JSON.stringify(c));
  };
  const catching = { ...S, dismissRivalryEvent: c => { sitting(c); return S.dismissRivalryEvent(c); } };
  for (let i = 0; i < 3000 && !(saves.nflMade && saves.nflDropped && saves.nfl221); i += 1) {
    B.mod.drive.driveCareer(catching, { key: `old-${i}`, pos: FLEET.nfl.pos[i % 8], arch: i, seasons: 40 });
  }
  for (const [key, pos] of [['nflCB', 'CB'], ['nflK', 'K']]) {
    for (let i = 0; i < 400 && !saves[key]; i += 1) {
      const c = JSON.parse(B.mod.drive.driveCareer(S, { key: `old-${pos}-${i}`, pos, arch: i, seasons: 6 }).json);
      const r = c.rival;
      if (c.seasons.length === 6 && !c.retired && r && !r.retired && r.hisYears >= 4 && r.myYears <= 1 && !c.pendingRivalryEvent && !c.pendingRivalryChoice && (c.suspendedSeasons ?? 0) === 0 && c.contractYears > 0) saves[key] = c;
    }
  }
  const missing = Object.entries(saves).filter(([, v]) => !v).map(([k]) => k);
  if (missing.length) { console.error(`could not build: ${missing.join(', ')}. Nothing written.`); process.exit(1); }
  const recordedFrom = execSync(`git rev-parse ${PROVE}`, { cwd: ROOT }).toString().trim();
  const file = path.join(ROOT, 'src/test/fixtures/usRivalOldSaves.json');
  writeFileSync(file, `${JSON.stringify({ recordedFrom, recordedBy: 'RIVAL_PROVE=<commit> node scripts/simUsRivalSense.mjs --record-old-saves', what: 'NFL My Career saves built by the code of recordedFrom (before Round 1227 moved the rival onto the player\'s line). Read by src/test/usRivalOldSaves.test.ts and by section N.O of the harness. Never edit by hand.', saves }, null, 1)}\n`);
  console.log(`wrote ${path.relative(ROOT, file)} from ${recordedFrom}: ${Object.entries(saves).map(([k, c]) => `${k} (${c.pos}, ${c.seasons.length} seasons, rival "${c.rival.lastLine}" ${c.rival.myYears}-${c.rival.hisYears}${c.pendingRivalryEvent ? `, sitting on "${c.pendingRivalryEvent.title}" promising "${c.pendingRivalryEvent.consequence}"` : ''})`).join('; ')}`);
  process.exit(0);
}
/* --record-old-saves-b (Round 1313, with RIVAL_PROVE=<the commit before the round>): writes
   src/test/fixtures/usRivalOldSavesB.json (or RIVAL_OLD_SAVES_OUT) from MLB and NHL saves BUILT BY THAT COMMIT'S
   CODE, driven the way the board drives a career and stamped with the commit: for each sport a save sitting on
   the made card and one on the dropped card of the own roster beat; an MLB SP, an MLB RP, an MLB CF and an NHL G
   in mid career with the old shape last line and a lopsided tally; one save a sport whose rival has retired. */
if (process.argv.includes('--record-old-saves-b')) {
  if (!PROVE) { console.error('--record-old-saves-b needs RIVAL_PROVE=<the commit whose code builds the saves>. Refusing to run.'); process.exit(2); }
  const B = await bundleAt(PROVE);
  const saves = { mlbMade: null, mlbDropped: null, nhlMade: null, nhlDropped: null, mlbSP: null, mlbRP: null, mlbCF: null, nhlG: null, mlbRetired: null, nhlRetired: null };
  const ROSTER_ID_OF = { mlb: 206, nhl: 306 };
  for (const sport of ['mlb', 'nhl']) {
    const S = FLEET[sport].desc(B.mod);
    const sitting = c => {
      const e = c.pendingRivalryEvent; if (!e || e.id !== ROSTER_ID_OF[sport]) return;
      const key = e.consequence === 'Morale +5' ? `${sport}Made` : e.consequence === 'Morale -5' ? `${sport}Dropped` : null;
      if (key && !saves[key]) saves[key] = JSON.parse(JSON.stringify(c));
    };
    const catching = { ...S, dismissRivalryEvent: c => { sitting(c); return S.dismissRivalryEvent(c); } };
    for (let i = 0; i < 3000 && !(saves[`${sport}Made`] && saves[`${sport}Dropped`]); i += 1) {
      B.mod.drive.driveCareer(catching, { key: `oldB-${sport}-${i}`, pos: FLEET[sport].pos[i % FLEET[sport].pos.length], arch: i, seasons: 40 });
    }
    const calm = c => !c.retired && !c.pendingRivalryEvent && !c.pendingRivalryChoice && (c.suspendedSeasons ?? 0) === 0 && c.contractYears > 0;
    for (const [key, pos] of (sport === 'mlb' ? [['mlbSP', 'SP'], ['mlbRP', 'RP'], ['mlbCF', 'CF']] : [['nhlG', 'G']])) {
      for (let i = 0; i < 600 && !saves[key]; i += 1) {
        const c = JSON.parse(B.mod.drive.driveCareer(S, { key: `oldB-${pos}-${i}`, pos, arch: i, seasons: 6 }).json);
        const r = c.rival;
        if (c.seasons.length === 6 && calm(c) && r && !r.retired && Math.abs(r.hisYears - r.myYears) >= 3 && !inShape(sport, pos, r.lastLine)) saves[key] = c;
      }
    }
    for (let i = 0; i < 1500 && !saves[`${sport}Retired`]; i += 1) {
      const pos = FLEET[sport].pos[i % FLEET[sport].pos.length];
      const c = JSON.parse(B.mod.drive.driveCareer(S, { key: `oldB-ret-${sport}-${i}`, pos, arch: i, seasons: 20 }).json);
      if (!c.retired && !c.pendingRivalryEvent && !c.pendingRivalryChoice && c.rival?.retired === true && !inShape(sport, pos, c.rival.lastLine)) saves[`${sport}Retired`] = c;
    }
  }
  const missing = Object.entries(saves).filter(([, v]) => !v).map(([k]) => k);
  if (missing.length) { console.error(`could not build: ${missing.join(', ')}. Nothing written.`); process.exit(1); }
  const recordedFrom = execSync(`git rev-parse ${PROVE}`, { cwd: ROOT }).toString().trim();
  const file = process.env.RIVAL_OLD_SAVES_OUT || path.join(ROOT, 'src/test/fixtures/usRivalOldSavesB.json');
  writeFileSync(file, `${JSON.stringify({ recordedFrom, recordedBy: 'RIVAL_PROVE=<commit> node scripts/simUsRivalSense.mjs --record-old-saves-b', what: 'MLB and NHL My Career saves built by the code of recordedFrom (before Round 1313 moved the rival onto the player\'s line). Read by src/test/usRivalOldSavesB.test.ts and by sections M.O and H.O of the harness. Never edit by hand.', saves }, null, 1)}\n`);
  console.log(`wrote ${file} from ${recordedFrom}: ${Object.entries(saves).map(([k, c]) => `${k} (${c.pos}, ${c.seasons.length} seasons, rival "${c.rival.lastLine}" ${c.rival.myYears}-${c.rival.hisYears}${c.rival.retired ? ', retired' : ''}${c.pendingRivalryEvent ? `, sitting on "${c.pendingRivalryEvent.title}" promising "${c.pendingRivalryEvent.consequence}"` : ''})`).join('; ')}`);
  process.exit(0);
}
const E = await bundleWith(edits, 'run');
const NOW = Object.fromEntries(ALL.map(s => [s, runSport(E, s)]));

console.log('T) the table on this tree (measured, printed; judged only where a sport is bound)');
for (const sport of ['nfl', 'mlb', 'nhl']) {
  printTable(BOUND.includes(sport) ? 'bound' : 'not bound', sport, NOW[sport].total, NOW[sport].perSeed);
  const first = NOW[sport].seeds[0];
  if (first.firstOff.length) console.log(`     off shape, for example: ${first.firstOff.join(' | ')}`);
  if (first.firstDisagree.length) console.log(`     disagreeing, for example: ${first.firstDisagree.join(' | ')}`);
  console.log(`     the error of the pooled share, by career: ${f2(NOW[sport].error)} points (one standard error at this size)`);
}

if (BOUND.includes('nfl')) {
  console.log('N) the NFL rival plays the player\'s position on the player\'s own line');
  const u = nflUnit(E);
  check('N.U1', u.bad.draws.length === 0, `the hook takes exactly the draws the law gives its position, 3 or a kicker's 1 (${u.n} hand built seasons)${u.bad.draws.length ? `: ${u.bad.draws.join(' | ')}` : ''}`);
  check('N.U2', u.bad.season.length === 0 && u.lens.join() === '16,17', `his season is nflStatLineFor's own on his keyed stream at the season's real length (${u.lens.join(' and ')} games seen), printed by the player's printer, scored off the printed text, with wonAward's answer${u.bad.season.length ? `: ${u.bad.season.join(' | ')}` : ''}`);
  check('N.U3', u.bad.pure.length === 0, `the same rival, form, year and draws give the same season, and the rival is left untouched${u.bad.pure.length ? `: ${u.bad.pure.join(' | ')}` : ''}`);
  check('N.U5', u.bad.place.length === 0 && ONE_PLACE.every(p => (u.reached[p] ?? 0) > 0) && FLEET.nfl.pos.every(p => (u.made[p] ?? 0) > 0),
    `where the first team names one man he is never on it in a season the player is (reached ${ONE_PLACE.map(p => `${p} ${u.reached[p] ?? 0}`).join(', ')} times; he made a first team at every position: ${FLEET.nfl.pos.map(p => `${p} ${u.made[p] ?? 0}`).join(', ')})${u.bad.place.length ? `: ${u.bad.place.join(' | ')}` : ''}`);
  {
    /* SITE_POWER: the fewest both seasons a position must be EXPECTED to show (one place) or must SHOW (more
       places) for the count to mean anything. Measured 2026-10-10 on the head (runner r1227-x3, 800 careers a
       position, 3,200 seasons): expected QB 2,378, RB 2,469, TE 2,024, K 165 and 0 seen; seen WR 2,237, LB
       2,045, CB 1,615, EDGE 2,390 (the run reviewer's own probe printed the same counts). Under control
       `oneslotsite` on the same run: both seen at QB 2,253, RB 2,428, TE 1,818, K 174. 50 is under a third of
       the lowest, and it is a guard that the count could have fired, not a band on a share. */
    const SITE_POWER = 50;
    const st = nflOnePlaceSite(E); const many = FLEET.nfl.pos.filter(p => !ONE_PLACE.includes(p));
    for (const pos of FLEET.nfl.pos) { const t = st[pos]; console.log(`     N.U6 ${pos.padEnd(5)} ${ONE_PLACE.includes(pos) ? 'one place  ' : 'more places'} seasons ${t.seasons}  mine ${t.mine}  his ${t.his}  both ${t.both}  his rate when I am not on it ${f1(pc(t.hisWhenNotMine, t.notMine))}%, so ${Math.round(t.expected)} both seasons expected if nothing forbade them`); }
    const broke = ONE_PLACE.filter(p => st[p].both > 0); const weak = ONE_PLACE.filter(p => st[p].expected < SITE_POWER); const blind = many.filter(p => st[p].both < SITE_POWER);
    check('N.U6', broke.length === 0 && weak.length === 0 && blind.length === 0,
      `through the real simSeason on boosted careers, no season at ${ONE_PLACE.join(', ')} has both men on the first team (both: ${ONE_PLACE.map(p => `${p} ${st[p].both}`).join(', ')}; expected if nothing forbade it: ${ONE_PLACE.map(p => `${p} ${Math.round(st[p].expected)}`).join(', ')}, floor ${SITE_POWER}), and where the team names more than one man both is seen (${many.map(p => `${p} ${st[p].both}`).join(', ')}, floor ${SITE_POWER})${broke.length ? `: BROKEN at ${broke.join(', ')}` : ''}${weak.length ? `: no power at ${weak.join(', ')}` : ''}${blind.length ? `: the count saw too few both seasons at ${blind.join(', ')}` : ''}`);
    const fl = nflFloorGrid(E);
    check('N.U7', fl.n > 0 && fl.total === 0, `nflStatLineFor returns no count below zero and prints no number below zero (${fl.total} of ${fl.n} lines: every position, forms 40 to 99, 1 to 17 games, three streams)${fl.bad.length ? `: ${fl.bad.join(' | ')}` : ''}`);
  }
  const all = Object.values(NOW.nfl.total.by).reduce((a, m) => ({ judged: a.judged + m.judged, off: a.off + m.off, unread: a.unread + m.unread, disagree: a.disagree + m.disagree }), { judged: 0, off: 0, unread: 0, disagree: 0 });
  check('N.F1', all.judged > 0 && all.off === 0, `every rival line the fleet prints is in the player's own shape at his position (${all.off} of ${all.judged} off shape)`);
  check('N.F2', all.judged > 0 && all.unread === 0 && all.disagree === 0, `the verdict on the save never disagrees with the two printed lines scored the one way (${all.disagree} of ${all.judged} judged years disagree, ${all.unread} unread)`);
  {
    const held = mean(RIVAL_1227.nfl); const now = mean(NOW.nfl.perSeed);
    const tol = HELD_TOL.nfl * Math.sqrt(Math.max(1, (1500 * 5) / (CAREERS * SEEDS.length)));
    if (FULL) check('N.F3', Math.abs(now - held) <= tol, `my share of the head to head years: mean ${f2(now)} (${NOW.nfl.perSeed.map(f1).join(', ')}) against Round 1227's ${f2(held)} (${RIVAL_1227.nfl.join(', ')}), ${f2(Math.abs(now - held))} apart, allowed ${f2(tol)} (a fixed width, three standard errors over careers)`);
    else console.log(`     N.F3, not judged in a shrunk run: my share ${f2(now)} against Round 1227's ${f2(held)}`);
  }
  const under = NOW.nfl.seeds.reduce((a, s) => ({ mine: a.mine + s.below.mine, his: a.his + s.below.his, first: [...a.first, ...s.below.first] }), { mine: 0, his: 0, first: [] });
  check('N.F1', under.mine === 0 && under.his === 0, `no printed season line carries a number below zero (mine ${under.mine}, his ${under.his} of ${all.judged} judged years)${under.first.length ? `: ${under.first.slice(0, 3).join(' | ')}` : ''}`);

  /* N.F5: the roster beat (206, All-Pro Team). Every card the fleet deals says and promises what the two
     seasons support: both made the first team, only you, only him; never in a year neither did; never one of
     the two own cards of Round 1149 (those only pay a card an older release dealt); never "both" where the
     first team names one man. */
  const cards = NOW.nfl.seeds.map(s => s.roster);
  const kindOf = x => (new RegExp(`^The All-Pro team is out, and you and ${x.rival} are both on the first team[.]$`).test(x.says) ? 'both'
    : new RegExp(`^The All-Pro team is out[.] You are on the first team and ${x.rival} is not[.]$`).test(x.says) ? 'onlyYou'
      : new RegExp(`^The All-Pro team is out[.] ${x.rival} is on the first team and you are not[.]$`).test(x.says) ? 'onlyHim' : 'other');
  const PROMISE = { both: 'Fanbase +3', onlyYou: 'Morale +5', onlyHim: 'Morale -5' };
  const wrong = cards.flat().filter(x => {
    const k = kindOf(x);
    if (k === 'other' || !x.sameYear || x.does !== PROMISE[k]) return true;
    if (k === 'both') return !(x.mine && x.his) || ONE_PLACE.includes(x.pos);
    return k === 'onlyYou' ? !(x.mine && !x.his) : !(!x.mine && x.his);
  });
  const count = k => cards.map(list => list.filter(x => kindOf(x) === k).length);
  console.log(`     the first team All-Pro in judged seasons, by position (mine, his, both, percent): ${FLEET.nfl.pos.map(p => { const m = NOW.nfl.total.by[p]; return `${p} ${f2(pc(m.honMine, m.judged))} ${f2(pc(m.honHis, m.judged))} ${f2(pc(m.honBoth, m.judged))}`; }).join('; ')}`);
  check('N.F5', cards.flat().length > 0 && wrong.length === 0, `every All-Pro card dealt says and promises what the two seasons support: ${wrong.length} of ${cards.flat().length} wrong (a seed: both ${count('both').join(', ')}; only you ${count('onlyYou').join(', ')}; only him ${count('onlyHim').join(', ')})${wrong.length ? `; the first, a ${wrong[0].pos} in ${wrong[0].year}: "${wrong[0].says}" promising "${wrong[0].does}" with mine ${wrong[0].mine}, his ${wrong[0].his}` : ''}`);

  /* Card or no card. The table above already counted the judged seasons in which both men hold the honour;
     where the first team names one man that count is judged here (it was printed and not judged, and under the
     reviewers' mutation of the call site it read QB 0.01, RB 0.03, TE 0.01 and K 0.01 percent, about seven
     seasons, while one dealt card was the only red). Exact at every size; N.U6 is the check with power. */
  const bothOne = ONE_PLACE.map(p => [p, NOW.nfl.total.by[p]?.honBoth ?? 0]);
  check('N.F5', bothOne.every(([, n]) => n === 0), `no judged season of the fleet at a one place position has both men on the first team (${bothOne.map(([p, n]) => `${p} ${n}`).join(', ')})`);
  /* Round 1313: no NFL beat of the fleet promises a coin (scripts/simNbaAwardsSense.mjs section S held this for the
     three fleets until it was retired; M.F5 and H.F5 hold it for MLB and the NHL). */
  { const coins = NOW.nfl.seeds.flatMap(s => s.coins); const dealt = NOW.nfl.seeds.reduce((a, s) => a + s.beatsDealt, 0);
    check('N.F5', dealt > 0 && coins.length === 0, `${coins.length} of ${dealt} NFL beats dealt promise a "50/50 outcome"${coins.length ? `: ${coins.slice(0, 3).join(' | ')}` : ''}`); }

  /* Banded, at full size: the two cards a season can really deal still turn up. Measured 2026-10-10 on five
     seeds: only you 4, 8, 9, 9, 13 (43) and only him 5, 4, 8, 1, 3 (21); each floor is six tenths of the run's
     total, a sum over the run and not a floor a seed (one seed dealt "only him" once). "Both" was dealt 0 times
     on every seed (both on a first team in 0.00 to 0.03 percent of judged seasons, and only where the team names
     two or more): it is reported, not floored, and its words and payment are held on fixtures by
     scripts/simCareerRivalryEvents.mjs and on a real screen by scripts/playUsRivalLines.mjs. */
  const sum = k => count(k).reduce((a, n) => a + n, 0);
  if (FULL) check('N.F5', sum('onlyYou') >= 25 && sum('onlyHim') >= 12, `the two cards a season deals still turn up over the run: only you ${sum('onlyYou')} (floor 25), only him ${sum('onlyHim')} (floor 12); both ${sum('both')} (reported, no floor)`);

  /* N.O: saves from before this round, built by the base code and committed (src/test/fixtures/
     usRivalOldSaves.json, recorded by --record-old-saves). A card the release before dealt pays what it printed;
     an old shape last line stays until his next season and is his position's own shape after it. */
  const old = JSON.parse(readFileSync(path.join(ROOT, 'src/test/fixtures/usRivalOldSaves.json'), 'utf8'));
  const S = E.NFL_CAREER_SPORT; const clone = x => JSON.parse(JSON.stringify(x));
  const cap = v => Math.max(0, Math.min(100, v));
  const tap = save => { const keep = Math.random; Math.random = mulberry32(5); try { return S.dismissRivalryEvent(clone(save)); } finally { Math.random = keep; } };
  const badOld = [];
  {
    const a = old.saves.nflMade; const out = tap(a);
    if (out.state.morale !== cap(a.morale + 5) || !out.lines.some(l => l.includes('You were named first team All-Pro.')) || out.state.pendingRivalryEvent) badOld.push(`the "Morale +5" card paid ${out.state.morale - a.morale} and logged "${out.lines.join(' | ')}"`);
    const b = old.saves.nflDropped; const outB = tap(b);
    if (outB.state.morale !== cap(b.morale - 5) || !outB.lines.some(l => l.includes('You were left off the All-Pro first team.'))) badOld.push(`the "Morale -5" card paid ${outB.state.morale - b.morale} and logged "${outB.lines.join(' | ')}"`);
    const c = old.saves.nfl221; const outC = tap(c); const card = c.pendingRivalryEvent;
    if (outC.state.fanbase !== cap(c.fanbase + 4) || outC.state.rivalryIntensity !== cap((c.rivalryIntensity ?? 0) - 10) || outC.lines.join('|') !== `${card.emoji} ${card.title}`) badOld.push(`the old 221 card paid fanbase ${outC.state.fanbase - c.fanbase} and logged "${outC.lines.join(' | ')}"`);
    for (const key of ['nflCB', 'nflK']) {
      const c0 = old.saves[key]; const c1 = clone(c0); const rnd = mulberry32(77);
      const keep = Math.random; Math.random = rnd;
      try { S.campBattle(c1, 80, rnd); S.simSeason(c1, 80, rnd); } finally { Math.random = keep; }
      const season = c1.seasons[c1.seasons.length - 1]; const r0 = c0.rival; const r1 = c1.rival;
      if (inShape('nfl', c0.pos, r0.lastLine)) badOld.push(`${key}: the committed save's last line "${r0.lastLine}" is already the new shape, so it proves nothing`);
      if (!inShape('nfl', c1.pos, r1.lastLine) || r1.lastYear !== season.year || r1.myYears + r1.hisYears !== r0.myYears + r0.hisYears + 1 || r1.myYears < r0.myYears || r1.hisYears < r0.hisYears) badOld.push(`${key}: after one season his line reads "${r1.lastLine}" (year ${r1.lastYear}), tally ${r0.myYears}-${r0.hisYears} to ${r1.myYears}-${r1.hisYears}`);
    }
  }
  check('N.O', badOld.length === 0, `saves built by ${String(old.recordedFrom).slice(0, 8)}: a pending "Morale +5", "Morale -5" and old 221 card each pay what they printed, and a corner's and a kicker's old shape rival line becomes his position's own after one season with the tally kept${badOld.length ? `: ${badOld.join(' | ')}` : ''}`);
}

/* M.U and H.U (Round 1313): judged wherever the tree holds the two hooks (from step 4 on). */
for (const sport of ['mlb', 'nhl']) {
  const S = sport === 'mlb' ? 'M' : 'H';
  if (!(sport === 'mlb' ? E.mlb.mlbRivalSeason : E.nhl.nhlRivalSeason)) { console.log(`${S}.U) no ${sport} hook on this tree: not judged`); continue; }
  console.log(`${S}.U) the ${sport.toUpperCase()} rival's season, on hand built rivals`);
  const u = usUnit(E, sport);
  check(`${S}.U1`, u.bad.draws.length === 0 && u.n > 0, `the hook takes exactly the two draws the law gives (${u.n} hand built seasons)${u.bad.draws.length ? `: ${u.bad.draws.join(' | ')}` : ''}`);
  check(`${S}.U2`, u.bad.season.length === 0 && u.lens.join() === [...UNIT_SLATES[sport]].sort((a, b) => b - a).join(), `his season is the player's own line function on his keyed stream, on the healthy workload, carried to every slate of the ledger (${u.lens.join(', ')} seen), printed by the player's printer, scored off the printed text by the typed season score, with wonAward's answer on the full line${u.bad.season.length ? `: ${u.bad.season.join(' | ')}` : ''}`);
  check(`${S}.U3`, u.bad.pure.length === 0 && u.bad.total.length === 0, `the same rival, form, year and draws give the same season, the rival is left untouched, and a position no table holds still plays a season${[...u.bad.pure, ...u.bad.total].length ? `: ${[...u.bad.pure, ...u.bad.total].join(' | ')}` : ''}`);
  const JOB_POWER = 100;
  check(`${S}.U4`, u.bad.kind.length === 0 && u.bad.job.length === 0 && (sport !== 'mlb' || u.job.power >= JOB_POWER), `his kind does not move with his rating or his age${sport === 'mlb' ? `, and a reliever's rival has the player's bullpen job both ways (${u.job.closer} closers' rivals, ${u.job.other} others'; ${u.job.power} seasons the other job's cap would have broken, floor ${JOB_POWER})` : ''}${[...u.bad.kind, ...u.bad.job].length ? `: ${[...u.bad.kind, ...u.bad.job].join(' | ')}` : ''}`);
  check(`${S}.U5`, u.bad.slots.length === 0, `the All-Star table names more than one man at every position, so "both of you" can be true and no one place rule is owed${u.bad.slots.length ? `: one or none at ${u.bad.slots.join(', ')}` : ''}`);
  const fl = usFloorGrid(E, sport);
  check(`${S}.U7`, fl.n > 0 && fl.total === 0, `the line function returns no count below zero and prints no number below zero (${fl.total} of ${fl.n} lines: every position and kind, forms 40 to 99, the workloads a season hands it, three streams)${fl.bad.length ? `: ${fl.bad.join(' | ')}` : ''}`);
}

/* M.F and H.F (Round 1313): baseball and hockey on the player's own line, judged where the sport is BOUND (MLB
   from step 5a, the NHL from step 5b). U6 is the call site of correction 3, on the real season sim. */
const ALL_STAR_SAYS = {
  both: name => `The All-Star rosters are out, and you and ${name} are both on them.`,
  onlyYou: name => `The All-Star rosters are out. You are on one and ${name} is not.`,
  onlyHim: name => `The All-Star rosters are out. ${name} is on one and you are not.`,
};
const ALL_STAR_PROMISE = { both: 'Fanbase +3', onlyYou: 'Morale +5', onlyHim: 'Morale -5' };
for (const sport of ['mlb', 'nhl'].filter(s => BOUND.includes(s))) {
  const S = sport === 'mlb' ? 'M' : 'H'; const U = sport.toUpperCase();
  console.log(`${S}.F) the ${U} rival plays the player's position on the player's own line`);
  {
    const st = siteCheck(E, sport);
    const SITE_FLOOR = { seasons: 1000, slate: 100, kind: 30 };
    const ok = st.missed.length === 0 && st.matched === st.seasons && st.seasons >= SITE_FLOOR.seasons && st.powerSlate >= SITE_FLOOR.slate && (sport !== 'mlb' || st.powerKind >= SITE_FLOOR.kind);
    check(`${S}.U6`, ok, `through the real season sim in ${SITE_CELLS[sport].map(([y, t]) => `${y} ${t}`).join(', ')}: the rival on the save comes back byte for byte from the TRUE facts in ${st.matched} of ${st.seasons} seasons (floor ${SITE_FLOOR.seasons}); the engine's own length would have printed another line in ${st.powerSlate} of ${st.short} seasons of another length (floor ${SITE_FLOOR.slate})${sport === 'mlb' ? `; the other bullpen job in ${st.powerKind} of ${st.relievers} relievers' seasons (floor ${SITE_FLOOR.kind})` : ''}${st.missed.length ? `: ${st.missed.join(' | ')}` : ''}`);
  }
  const all = Object.values(NOW[sport].total.by).reduce((a, m) => ({ judged: a.judged + m.judged, off: a.off + m.off, unread: a.unread + m.unread, disagree: a.disagree + m.disagree }), { judged: 0, off: 0, unread: 0, disagree: 0 });
  check(`${S}.F1`, all.judged > 0 && all.off === 0, `every rival line the fleet prints is in the player's own shape at his position (${all.off} of ${all.judged} off shape)`);
  const under = NOW[sport].seeds.reduce((a, s) => ({ mine: a.mine + s.below.mine, his: a.his + s.below.his, first: [...a.first, ...s.below.first] }), { mine: 0, his: 0, first: [] });
  check(`${S}.F1`, under.mine === 0 && under.his === 0, `no printed season line carries a number below zero (mine ${under.mine}, his ${under.his} of ${all.judged} judged years)${under.first.length ? `: ${under.first.slice(0, 3).join(' | ')}` : ''}`);
  check(`${S}.F2`, all.judged > 0 && all.unread === 0 && all.disagree === 0, `the verdict on the save never disagrees with the two printed lines read back and scored by the season score typed here (${all.disagree} of ${all.judged} judged years disagree, ${all.unread} unread; by position and by length in the table above)`);
  /* F5, the exact half: every All-Star card dealt (beat 206 or 306) says and promises what the two seasons support,
     none in a year neither made it, none an own card of Round 1149; and no beat of the fleet promises a coin. */
  const cards = NOW[sport].seeds.map(s => s.roster);
  const kindOf = x => (Object.keys(ALL_STAR_SAYS).find(k => ALL_STAR_SAYS[k](x.rival) === x.says) ?? 'other');
  const wrong = cards.flat().filter(x => {
    const k = kindOf(x);
    if (k === 'other' || !x.sameYear || x.does !== ALL_STAR_PROMISE[k]) return true;
    if (k === 'both') return !(x.mine && x.his);
    return k === 'onlyYou' ? !(x.mine && !x.his) : !(!x.mine && x.his);
  });
  const count = k => cards.map(list => list.filter(x => kindOf(x) === k).length);
  const coins = NOW[sport].seeds.flatMap(s => s.coins); const dealt = NOW[sport].seeds.reduce((a, s) => a + s.beatsDealt, 0);
  console.log(`     the All-Star in judged seasons, by position (mine, his, both, percent): ${FLEET[sport].pos.map(p => { const m = NOW[sport].total.by[p]; return `${p} ${f2(pc(m.honMine, m.judged))} ${f2(pc(m.honHis, m.judged))} ${f2(pc(m.honBoth, m.judged))}`; }).join('; ')}`);
  /* O (Round 1313, 5c): the committed saves built by the code before the round (src/test/fixtures/
     usRivalOldSavesB.json, recorded by --record-old-saves-b). A card the release before dealt pays what it printed;
     an old shape last line stays until his next season and is his position's own after it, the tally kept; a
     rival who retired before keeps his old line and his tally for good. Controls owndead (the own cards taken
     out), retiredlinemlb and retiredlinenhl (a retired rival judged again) and oldtallymlb, oldtallynhl (an old
     save's tally reset). */
  {
    const oldB = JSON.parse(readFileSync(path.join(ROOT, 'src/test/fixtures/usRivalOldSavesB.json'), 'utf8'));
    const D = FLEET[sport].desc(E); const clone = x => JSON.parse(JSON.stringify(x)); const cap = v => Math.max(0, Math.min(100, v));
    const withRng = (seed, f) => { const keep = Math.random; Math.random = mulberry32(seed); try { return f(Math.random); } finally { Math.random = keep; } };
    const play = (c0, seed) => withRng(seed, rnd => { const c1 = clone(c0); D.campBattle(c1, 80, rnd); D.simSeason(c1, 80, rnd); return c1; });
    const badO = [];
    for (const [key, move] of [[`${sport}Made`, 5], [`${sport}Dropped`, -5]]) {
      const a = oldB.saves[key]; const out = withRng(5, () => D.dismissRivalryEvent(clone(a)));
      const told = move > 0 ? 'You made the All-Star roster.' : 'You were left off the All-Star roster.';
      if (out.state.morale !== cap(a.morale + move) || !out.lines.some(l => l.includes(told)) || out.state.pendingRivalryEvent) badO.push(`${key}: the "${a.pendingRivalryEvent?.consequence}" card paid ${out.state.morale - a.morale} and logged "${out.lines.join(' | ')}"`);
    }
    for (const key of Object.keys(oldB.saves).filter(k => k.startsWith(sport) && !/Made|Dropped|Retired/.test(k))) {
      const c0 = oldB.saves[key]; const c1 = play(c0, 77); const r0 = c0.rival; const r1 = c1.rival; const season = c1.seasons[c1.seasons.length - 1];
      if (inShape(sport, c0.pos, r0.lastLine)) badO.push(`${key}: the committed save's last line "${r0.lastLine}" is already the new shape, so it proves nothing`);
      if (!inShape(sport, c1.pos, r1.lastLine) || r1.lastYear !== season.year || r1.myYears + r1.hisYears !== r0.myYears + r0.hisYears + 1 || r1.myYears < r0.myYears || r1.hisYears < r0.hisYears) badO.push(`${key}: after one season his line reads "${r1.lastLine}" (year ${r1.lastYear}), tally ${r0.myYears}-${r0.hisYears} to ${r1.myYears}-${r1.hisYears}`);
    }
    { const key = `${sport}Retired`; const c0 = oldB.saves[key]; const c1 = play(c0, 78);
      if (!c0.rival.retired || c1.rival.lastLine !== c0.rival.lastLine || c1.rival.myYears !== c0.rival.myYears || c1.rival.hisYears !== c0.rival.hisYears) badO.push(`${key}: the retired rival now reads "${c1.rival.lastLine}" ${c1.rival.myYears}-${c1.rival.hisYears}, was "${c0.rival.lastLine}" ${c0.rival.myYears}-${c0.rival.hisYears}`); }
    check(`${S}.O`, badO.length === 0, `saves built by ${String(oldB.recordedFrom).slice(0, 8)}: the two own cards pay what they printed, the old shape lines become the position's own after one season with the tally kept, and a retired rival keeps his old line and tally${badO.length ? `: ${badO.join(' | ')}` : ''}`);
  }
  check(`${S}.F5`, cards.flat().length > 0 && wrong.length === 0 && dealt > 0 && coins.length === 0, `every All-Star card dealt says and promises what the two seasons support: ${wrong.length} of ${cards.flat().length} wrong (a seed: both ${count('both').join(', ')}; only you ${count('onlyYou').join(', ')}; only him ${count('onlyHim').join(', ')}); ${coins.length} of ${dealt} beats dealt promise a "50/50 outcome"${wrong.length ? `; the first, a ${wrong[0].pos} in ${wrong[0].year}: "${wrong[0].says}" promising "${wrong[0].does}" with mine ${wrong[0].mine}, his ${wrong[0].his}` : ''}${coins.length ? `; coin: ${coins.slice(0, 3).join(' | ')}` : ''}`);
}

/* ------------------------------------------------------------------ */
/* P1: the player's own path against the tree before                   */
/* ------------------------------------------------------------------ */
if (PROVE) {
  const B = await bundleAt(PROVE);
  console.log(`P1) the player's path against ${PROVE}: ${B.changed.length} src files differ, ${B.served.length} read at that commit (${B.served.join(', ') || 'none'})`);
  check('P1', B.served.length > 0, `the tree before is not this tree (${B.served.length} files taken back)`);
  const WAS = Object.fromEntries(ALL.map(s => [s, runSport(B.mod, s)]));
  console.log('B) the table on the tree before');
  for (const sport of ['nfl', 'mlb', 'nhl']) printTable('before', sport, WAS[sport].total, WAS[sport].perSeed);
  console.log(`     before, nfl: printed lines carrying a number below zero: mine ${WAS.nfl.seeds.reduce((a, s) => a + s.below.mine, 0)}, his ${WAS.nfl.seeds.reduce((a, s) => a + s.below.his, 0)}`);
  for (const sport of ALL) {
    const same = k => NOW[sport].seeds.every((s, i) => s.hash[k] === WAS[sport].seeds[i].hash[k]);
    check('P1', same('player'), `${sport}: every season line and every numeric counter on the final save is byte equal (${SEEDS.length} seeds of ${CAREERS})`);
    check('P1', same('dealt'), `${sport}: a rivalry beat is dealt in exactly the same seasons`);
    check('P1', same('notes'), `${sport}: every season note that is not the rival's own is equal line for line`);
    if (MOVED.includes(sport)) check('P1', !same('rival'), `${sport}: the rival's trail moved, as this step says it does`);
    else {
      check('P1', same('rival'), `${sport}: the rival's trail (his line, score, tally, rings, rating, age, retired, roster fact) is byte equal`);
      check('P1', same('allNotes'), `${sport}: every season note, the rival's included, is byte equal`);
      if (!CARDS.includes(sport)) check(sport === 'nba' ? 'L' : 'P1', same('beats'), `${sport}: every card dealt reads word for word and promises exactly what it did`);
    }
  }
  /* Only the step that binds a sport is proven against the old line; a later step's tree before is bound already. */
  for (const sport of BOUND.filter(s => MOVED.includes(s))) {
    const t = Object.values(WAS[sport].total.by).reduce((a, m) => a + m.off, 0);
    check('B', t > 0, `${sport}: the tree before was not clean (${t} rival lines off the player's shape), so this proof is against the old line`);
  }

  /* P2: the same proof with EVERY card answered, the way the board drives a career (src/test/helpers/
     usCareerDrive.ts, the truth digest's own driver: free agency, the camp, the season, the summer's cards, the
     inbox, the rivalry beat and the rival choice, each answered). Round 1149's proof never answered a card.
     A sport this step does not name: whole saves byte equal. A sport it names (RIVAL_MOVED or RIVAL_CARDS): the
     careers are driven one season further at a time, and at the first season where anything OFF the rival
     differs (a different beat was dealt or answered), every season line played so far is still byte equal. */
  const P2N = FULL ? 1000 : Math.min(200, CAREERS);
  /* How many careers of a named sport are stepped season by season (each step is a whole drive on both trees). */
  const P2_STEPPED = 300;
  console.log(`P2) with every card answered: ${P2N} careers a sport, driven through the sport's binding`);
  const driven = (M, sport, i, seasons) => {
    const F = FLEET[sport]; const S = F.desc(M); const pos = F.pos[i % F.pos.length];
    const era = F.eras[Math.floor(i / F.pos.length) % F.eras.length];
    let cards = 0; let choices = 0;
    const counted = { ...S,
      dismissRivalryEvent: c => { cards += 1; return S.dismissRivalryEvent(c); },
      resolveRivalryChoice: (...a) => { const res = S.resolveRivalryChoice(...a); if (res) choices += 1; return res; } };
    const out = M.drive.driveCareer(counted, { key: `p2-${i}`, pos, arch: i, eraId: era === 'now' ? undefined : era, seasons });
    return { json: out.json, cards, choices, seasons: out.seasons };
  };
  const offRival = json => { const c = JSON.parse(json); const seasons = JSON.stringify(c.seasons); delete c.rival; return { rest: JSON.stringify(c), seasons, c }; };
  for (const sport of ALL) {
    const named = MOVED.includes(sport) || CARDS.includes(sport);
    let cards = 0; let choices = 0; let equal = 0; let parted = 0; let linesHeld = 0; const firstKeys = {}; let seasons = 0;
    for (let i = 0; i < P2N; i += 1) {
      const now = driven(E, sport, i, 40); const was = driven(B.mod, sport, i, 40);
      cards += now.cards; choices += now.choices; seasons += now.seasons;
      if (now.json === was.json) { equal += 1; continue; }
      if (!named || i >= P2_STEPPED) continue;
      /* The first season where anything off the rival differs, by halving (a save that has parted stays parted:
         the feed and the last beat's id are on it), then proven at the season found: equal one season earlier. */
      const pair = k => ({ a: offRival(driven(E, sport, i, k).json), b: offRival(driven(B.mod, sport, i, k).json) });
      const last = Math.max(now.seasons, was.seasons);
      const end = pair(last);
      if (end.a.rest === end.b.rest) continue;
      let lo = 1; let hi = last; let at = end;
      while (lo < hi) { const mid = (lo + hi) >> 1; const m = pair(mid); if (m.a.rest !== m.b.rest) { hi = mid; at = m; } else lo = mid + 1; }
      parted += 1;
      const before = lo > 1 ? pair(lo - 1) : null;
      if (at.a.seasons === at.b.seasons && (!before || before.a.rest === before.b.rest)) linesHeld += 1;
      for (const key of new Set([...Object.keys(at.a.c), ...Object.keys(at.b.c)])) if (JSON.stringify(at.a.c[key]) !== JSON.stringify(at.b.c[key])) firstKeys[key] = (firstKeys[key] ?? 0) + 1;
    }
    check('P2', cards > 0 && seasons > 0, `${sport}: the drive answered ${cards} rivalry cards and ${choices} rival choices over ${seasons} seasons (more than none)`);
    if (!named) check('P2', equal === P2N, `${sport}: ${equal} of ${P2N} whole saves are byte equal`);
    else {
      check('P2', equal < P2N, `${sport}: the saves moved, as this step says they do (${P2N - equal} of ${P2N} differ)`);
      check('P2', parted > 0 && linesHeld === parted, `${sport}: at the first season where anything off the rival differs, every season line so far is byte equal and the season before it nothing off the rival differs (${linesHeld} of ${parted} careers that part, among the first ${Math.min(P2N, P2_STEPPED)} stepped season by season)`);
      console.log(`     ${sport}: what differs off the rival at that first season, by top level key: ${Object.entries(firstKeys).sort((x, y) => y[1] - x[1]).map(([k, n]) => `${k} ${n}`).join(', ') || 'nothing'}`);
    }
  }
}

const size = FULL ? 'full size' : 'shrunk, exact checks only';
if (CONTROL) {
  const needs = CONTROLS[CONTROL].needs;
  const hit = needs.split(',').every(n => failedSections.has(n));
  console.log(`control ${CONTROL}: ${hit ? 'FIRED' : 'DID NOT FIRE'} (must turn ${needs} red; red: ${[...failedSections].join(', ') || 'nothing'})`);
}
console.log(`simUsRivalSense: ${checks} checks, ${failed} failed (${size})${failed ? `, red sections: ${[...failedSections].join(', ')}` : ''}`);
process.exit(failed ? 1 : 0);

/**
 * Round 1305: what one press of the NFL front office's final week does to the
 * save, held as digests, so a round that changes what the press TELLS can
 * prove it changed nothing the press DECIDES.
 *
 * The board is rendered on a save at the final week and played to three
 * points: the recap, the draft opened, and the next season's hub after the
 * picks and the summer. At each the save in localStorage is hashed (sha1 of
 * its JSON) after two things are set aside, and nothing else:
 *   - the key `gameLog` is deleted (the season's told results, a key that
 *     did not exist on the base);
 *   - `homeScore` and `awayScore` of every game under `postseason.rounds`
 *     are zeroed (the scores are told by the football law since this round;
 *     home, away and WINNER of all thirteen games stay in the digest).
 * So the league with every roster and record, the champion, the titles, the
 * trust, the mandate, the desk, the draft class, the offseason and every
 * draw behind them are in the digest to the byte.
 *
 * TWELVE SAVES, because one cannot take every path: both league kinds (the
 * fifteen man league and full rosters), the GM desk off and on (a new
 * franchise opens with it on, so its edges, its tick and its summer are the
 * path nearly every live save takes), and three ways a season ends: an
 * ordinary one, a title (his roster made strong before the season is
 * played) and a firing (a title or bust mandate, trust at 5, a weak
 * roster). Each case asserts the ending it took, so the file fails if the
 * three are not all seen.
 *
 * EVERY CASE STARTS FROM A FRESH MODULE GRAPH WITH ITS OWN IDS. A player id
 * is `p<epoch>-<n>`: the epoch is drawn once from Math.random when
 * src/lib/entityIds.ts is evaluated and n counts up for the life of the
 * module. With the desk on, saved state depends on the id itself (the
 * trainer's weeks out and the scout's read are hashes keyed on it), so a
 * digest is only repeatable when both are fixed. Each case resets the
 * modules, seeds Math.random, and evaluates entityIds FIRST, so its epoch is
 * the seeded generator's first two draws whatever else the graph draws at
 * module scope, and its counter starts from nothing. A case therefore gives
 * the same digest alone, in any order, and on any machine.
 *
 * THE RECORD. The literals in RECORDED were printed on a GitHub runner with
 * FO_ONE_PRESS=print on origin/release-av-gate cbfa94fd's own src (this file
 * copied into a worktree of that commit: runner result r1305-a1b of
 * 2026-10-11, label print-base; print-base-again gave the same 52 values,
 * and so did this branch's head of that hour), before a line of the NFL
 * board moved. A run with -t "fired" gave the same values for its cases.
 * With no literal for a point the file FAILS unless FO_ONE_PRESS=print is
 * set: a digest test that passes with nothing recorded proves nothing.
 *
 * WHAT A DIGEST READS, so a later round knows when to record again on its
 * own base: src/lib/frontOffice.ts, src/data/frontOfficePlayers.ts and
 * src/data/frontOfficeDepth.ts, src/lib/nflGmDesk.ts with the desk
 * libraries under it, src/lib/foOwnerMandate.ts, src/lib/entityIds.ts, and
 * the board's press, draft and summer handlers. A round that means to move
 * any of them records again with FO_ONE_PRESS=print and says so; a round
 * that does not mean to and finds a digest moved has changed the game.
 *
 * THE LOG, SINCE THE ROUND THAT RECORDED THE DIGESTS. The digests set the
 * key `gameLog` aside, so beside them each case holds what the key must be:
 * on the recap save it reads whole and is Week 17 and then his playoff games
 * with the very scores the saved rounds hold; it rides unchanged into the
 * draft; and the summer ends it (the next season's hub holds no key).
 *
 * Negative controls: scripts/controlFrontOfficeBoard.mjs, in the repo. It
 * points this file at a copy of the board with one mutation through
 * FO_BOARD_NFL, the way scripts/simGmReload.mjs does for the season close
 * test, and reads which cases went red by name: the summer not ending the
 * log, the close not counting the season or run twice, a title counted
 * double (the title cases red and the ordinary ones green).
 */
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { createHash } from 'node:crypto';
import type { ComponentType } from 'react';
import { readGmGameLog } from '@/lib/gmGameLog';

vi.mock('@/hooks/useGameCompletion', () => ({ useGameCompletion: () => undefined }));
vi.mock('@/lib/completions', () => ({ recordActivity: () => undefined }));
vi.mock('@/components/game/ShareButtons', () => ({ default: () => null }));
vi.mock('@/hooks/useRevealScroll', () => ({ useRevealScroll: () => ({ current: null }) }));
vi.setConfig({ testTimeout: 300_000 });

function lehmer(seed: number) {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; };
}

/* eslint-disable @typescript-eslint/no-explicit-any */
const PRINT = process.env.FO_ONE_PRESS === 'print';
const SAVE_KEY = 'front-office-save-v1';
const REAL_RANDOM = Math.random;
const useRandom = (fn: () => number) => { Math.random = fn; };

type Kind = 'fifteen' | 'deep';
type Ending = 'ordinary' | 'title' | 'fired';
const KINDS: Kind[] = ['fifteen', 'deep'];
const ENDINGS: Ending[] = ['ordinary', 'title', 'fired'];

/* RECORDED-BEGIN (printed by FO_ONE_PRESS=print; see THE RECORD above) */
const RECORDED: Record<string, string> = {
  'deep|desk off|fired|press seed': '11',
  'deep|desk off|fired|recap': 'b56f3204559a899c9cdc5b9d4deb319645fcd1e4',
  'deep|desk off|fired|winners': 'IND,JAX,PIT,GB,DET,ATL,NE,PIT,SF,DET,PIT,SF,SF',
  'deep|desk off|ordinary|draft': '798791c8895d02da3f8f6d20e3ba4836661c483b',
  'deep|desk off|ordinary|hub': 'e118d28afa937477916367cfda9637eebac8d9f6',
  'deep|desk off|ordinary|press seed': '11',
  'deep|desk off|ordinary|recap': '780b9786e272e5c31a0787860e2dce284e8e0385',
  'deep|desk off|ordinary|winners': 'IND,JAX,PIT,GB,DET,ATL,NE,PIT,SF,DET,PIT,SF,SF',
  'deep|desk off|title|draft': 'e784c00eb869e52efb38f8cd67554c8a281a5021',
  'deep|desk off|title|hub': '7bb892d36dcb6609c4a5b56ef0adf5bf910f81b7',
  'deep|desk off|title|press seed': '11',
  'deep|desk off|title|recap': '4e2fbdd208d2c78733988af5f0fbeb223bd715eb',
  'deep|desk off|title|winners': 'IND,JAX,BAL,DAL,DET,ATL,NE,BAL,ARI,DET,BAL,ARI,ARI',
  'deep|desk on|fired|press seed': '11',
  'deep|desk on|fired|recap': '6a62b5c27eaa8659d95839d409b09773ab26b6c6',
  'deep|desk on|fired|winners': 'IND,JAX,PIT,GB,DET,ATL,NE,PIT,SF,DET,PIT,SF,SF',
  'deep|desk on|ordinary|draft': 'a6f7c8c5077e0e7c0960a460c9ab0d023af44617',
  'deep|desk on|ordinary|hub': 'ba264af1fa13f37dd8381ac16424a468524027c7',
  'deep|desk on|ordinary|press seed': '11',
  'deep|desk on|ordinary|recap': '843979bfcea96ac1fbad31f8f28d676b50bbd15e',
  'deep|desk on|ordinary|winners': 'IND,JAX,PIT,GB,DET,ATL,NE,PIT,SF,DET,PIT,SF,SF',
  'deep|desk on|title|draft': '434f5613410f60a8da7629f5084a57fc89e56f3c',
  'deep|desk on|title|hub': 'ffe1b1620747d749a527131df8b2dcd1acea86bf',
  'deep|desk on|title|press seed': '11',
  'deep|desk on|title|recap': 'c3f77605c067bf38825a44b180a0eec83df3af81',
  'deep|desk on|title|winners': 'IND,JAX,BAL,DAL,DET,ATL,NE,BAL,ARI,DET,BAL,ARI,ARI',
  'fifteen|desk off|fired|press seed': '11',
  'fifteen|desk off|fired|recap': 'cb1cd42e06c096ebe86fcb0aba44b84e680d3b12',
  'fifteen|desk off|fired|winners': 'LAC,KC,IND,GB,PHI,DET,BAL,KC,DET,GB,KC,DET,KC',
  'fifteen|desk off|ordinary|draft': '4490732b0adf62aa2c6cbea73825e92ddf97b870',
  'fifteen|desk off|ordinary|hub': 'e4615a4f723b1600b48b5007b94e7825770fdb64',
  'fifteen|desk off|ordinary|press seed': '11',
  'fifteen|desk off|ordinary|recap': 'ff8e20c90f42f580d957626ba4c3c417b27f5be9',
  'fifteen|desk off|ordinary|winners': 'LAC,KC,IND,GB,PHI,DET,BAL,KC,DET,GB,KC,DET,KC',
  'fifteen|desk off|title|draft': '39cb405e1b22d8437085f5850320f00284b076bc',
  'fifteen|desk off|title|hub': '78ca6a2c99dda340296bd1bf067ee9e5bedca834',
  'fifteen|desk off|title|press seed': '12',
  'fifteen|desk off|title|recap': 'd4df88f7b41aa21058edc729bf5de651bbc1b23b',
  'fifteen|desk off|title|winners': 'NE,DEN,BUF,SF,LA,TB,BAL,NE,ARI,LA,BAL,ARI,ARI',
  'fifteen|desk on|fired|press seed': '11',
  'fifteen|desk on|fired|recap': '5d14fd946fa9e6adb2e34d622dec6a396453d5b3',
  'fifteen|desk on|fired|winners': 'LAC,KC,IND,GB,PHI,DET,BAL,KC,DET,GB,KC,DET,KC',
  'fifteen|desk on|ordinary|draft': '1a76425648377b13555fde77bdd203b55243aa7e',
  'fifteen|desk on|ordinary|hub': 'd6d73c5ce95ccaa7b8d517f31b030b0447cd13ff',
  'fifteen|desk on|ordinary|press seed': '11',
  'fifteen|desk on|ordinary|recap': 'adc56f8f21309bc0b42ab03351f2240d9470e375',
  'fifteen|desk on|ordinary|winners': 'LAC,KC,IND,GB,PHI,DET,BAL,KC,DET,GB,KC,DET,KC',
  'fifteen|desk on|title|draft': 'ecbc67329370df3cc5f34d7132171620d7d1fab2',
  'fifteen|desk on|title|hub': 'b9090fb8bb55a95fa643c2e55f2439013d291bed',
  'fifteen|desk on|title|press seed': '11',
  'fifteen|desk on|title|recap': '1aed044af9bbacff211e119701f9bdbad62d7a4e',
  'fifteen|desk on|title|winners': 'KC,LAC,IND,DET,PHI,GB,BAL,LAC,ARI,DET,BAL,ARI,ARI',
};
/* RECORDED-END */

const sha1 = (s: string) => createHash('sha1').update(s).digest('hex');

/** The save with the two things this round changes set aside (see the header), and, since Round 1533, the two
    blocks the GM desk host writes at the close (gm.blocks.seat, his record, and gm.blocks.xp, his GM XP): a key
    that did not exist on the base, as gameLog was. Every other block of the desk stays in the digest to the byte;
    scripts/controlFrontOfficeBoard.mjs thirdkey proves a third key written at the close still turns it red. */
function onePressDigest(raw: string): string {
  const s = JSON.parse(raw);
  delete s.gameLog;
  if (s.gm && s.gm.blocks) { delete s.gm.blocks.seat; delete s.gm.blocks.xp; }
  for (const r of s.postseason?.rounds ?? []) for (const g of r.games) { g.homeScore = 0; g.awayScore = 0; }
  return sha1(JSON.stringify(s));
}

/** The engine, the desk and the board from one fresh module graph whose ids are fixed. */
async function freshGame() {
  vi.resetModules();
  useRandom(lehmer(1305));
  await import('@/lib/entityIds');
  const E = await import('@/lib/frontOffice');
  const { FO_DEPTH } = await import('@/data/frontOfficeDepth');
  const { openNflDesk } = await import('@/lib/nflGmDesk');
  const override = process.env.FO_BOARD_NFL;
  const { default: Board } = (override
    ? await import(/* @vite-ignore */ override)
    : await import('@/components/front-office/FrontOfficeBoard')) as { default: ComponentType };
  return { E, FO_DEPTH, openNflDesk, Board };
}

/** A save on the morning of the final week, doctored for the ending the case wants. */
function finalWeekSave(G: Awaited<ReturnType<typeof freshGame>>, kind: Kind, desk: boolean, ending: Ending) {
  const rng = lehmer(7);
  const league: any = kind === 'deep' ? G.E.initLeague(rng, { depth: G.FO_DEPTH }) : G.E.initLeague(rng);
  const team = Object.keys(league.teams)[0];
  if (ending === 'title') {
    /* strong before the season is played, so the record, the seed and the bracket are the engine's own */
    for (const p of league.teams[team].players) p.ovr = 99;
    league.teams[team].defense = 99;
  }
  for (let w = 1; w < G.E.REGULAR_WEEKS; w += 1) { league.schedule[w - 1].forEach((g: any) => G.E.simGame(g, league.teams, rng)); league.week += 1; }
  const save: any = { league, myTeam: team, phase: 'hub', titles: 0, seasonsPlayed: 0, draftClass: null, picksLeft: 0 };
  if (ending === 'fired') {
    /* the doomed season of scripts/playOwnerMandate.mjs: title or bust, no trust left to lose, a roster that cannot */
    save.trust = 5;
    save.mandate = { tier: 'title', text: 'Win the Super Bowl. Anything less is a failed season upstairs.', winFloor: 0, reqLevel: 4, season: league.season };
    for (const p of league.teams[team].players) p.ovr = 60;
    league.teams[team].defense = 60;
  }
  if (desk) save.gm = G.openNflDesk(league, team);
  return { save, team };
}

const printed: string[] = [];
/** Hold one recorded value, or print it when the record is being taken. */
function hold(key: string, value: string) {
  if (PRINT) { printed.push(`  '${key}': '${value}',`); console.log(`FO_ONE_PRESS|${key}|${value}`); return; }
  expect(RECORDED[key], `nothing is recorded for "${key}". Record on the base with FO_ONE_PRESS=print and commit the literals`).toBeDefined();
  expect(value, `"${key}" is not what the base wrote`).toBe(RECORDED[key]);
}

const raw = () => localStorage.getItem(SAVE_KEY)!;
const read = (): any => JSON.parse(raw());

afterEach(() => { cleanup(); Math.random = REAL_RANDOM; localStorage.clear(); });


/* The press is seeded 11, as in the shared season close test. A title is
   three or four playoff wins at about 0.95 each for a roster of 99s, so one
   seed does not always give one: the title case takes the FIRST seed from
   11 up whose season his club wins, and the seed it took is recorded with
   the digests (a head that needed another seed has moved a winner). */
const PRESS_SEED = 11;
const TITLE_SEEDS = 8;

for (const kind of KINDS) {
  for (const desk of [false, true]) {
    describe(`NFL front office, ${kind} league, GM desk ${desk ? 'on' : 'off'}: one press of the final week`, () => {
      for (const ending of ENDINGS) {
        const id = `${kind}|desk ${desk ? 'on' : 'off'}|${ending}`;
        it(`${ending}: the save at the recap, the draft and the next season's hub is the base's`, async () => {
          /* point one: the final week and the whole postseason, one press */
          let G!: Awaited<ReturnType<typeof freshGame>>;
          let team = '';
          let winsBefore = 0;
          let recap: any = null;
          let took: Ending = 'ordinary';
          let seed = PRESS_SEED;
          for (; seed < PRESS_SEED + (ending === 'title' ? TITLE_SEEDS : 1); seed += 1) {
            cleanup();
            localStorage.clear();
            G = await freshGame();
            const made = finalWeekSave(G, kind, desk, ending);
            team = made.team;
            winsBefore = made.save.league.teams[team].wins;
            localStorage.setItem(SAVE_KEY, JSON.stringify(made.save));
            useRandom(lehmer(seed));
            const first = render(<G.Board />);
            fireEvent.click(screen.getByText('This week'));
            fireEvent.click(screen.getByText('Play the final week + playoffs'));
            recap = read();
            took = recap.fired ? 'fired' : recap.postseason.champion === team ? 'title' : 'ordinary';
            first.unmount();
            if (took === ending) break;
          }
          console.log(`FO_ONE_PRESS_ENDING|${id}|took ${took}|press seed ${seed}|phase ${recap.phase}|champion ${recap.postseason.champion}|his club ${team} ${recap.league.teams[team].wins}-${recap.league.teams[team].losses}|trust ${recap.trust}`);
          expect(took, `the ${ending} case of ${id} must take the ${ending} ending`).toBe(ending);
          expect(recap.seasonsPlayed).toBe(1);
          expect(recap.postseason.rounds.flatMap((r: any) => r.games)).toHaveLength(13);
          hold(`${id}|press seed`, String(seed));
          hold(`${id}|winners`, recap.postseason.rounds.flatMap((r: any) => r.games.map((g: any) => g.winner)).join(','));
          hold(`${id}|recap`, onePressDigest(raw()));
          /* the season's log on the recap save: Week 17, then his playoff games, the saved rounds' own scores */
          const logOf = (s: any) => readGmGameLog(s.gameLog, c => Object.prototype.hasOwnProperty.call(s.league.teams, c), s.league.season, s.myTeam);
          const log = logOf(recap);
          expect(log, 'the recap save holds a log that reads whole').not.toBeNull();
          const his = recap.postseason.rounds.flatMap((r: any) => r.games.map((g: any) => ({ round: r.name, g }))).filter((x: any) => x.g.home === team || x.g.away === team);
          expect(log!.games.map(g => g.where)).toEqual(['w17', ...his.map((x: any) => x.round)]);
          expect(log!.games[0].winner === team ? 1 : 0, 'Week 17 in the log is the result the league took').toBe(recap.league.teams[team].wins - winsBefore);
          his.forEach((x: any, k: number) => {
            const e = log!.games[k + 1];
            expect([e.home, e.away, e.homeScore, e.awayScore, e.winner]).toEqual([x.g.home, x.g.away, x.g.homeScore, x.g.awayScore, x.g.winner]);
          });
          if (ending === 'title') expect(log!.games[log!.games.length - 1]).toMatchObject({ where: 'Super Bowl', winner: team });
          if (took === 'fired') {
            expect(recap.phase).toBe('fired');
            return;
          }
          expect(recap.phase).toBe('recap');

          /* point two: a reload ends the presser, and the recap's button opens the draft */
          render(<G.Board />);
          fireEvent.click(screen.getByText('Go to the draft'));
          expect(read().phase).toBe('draft');
          hold(`${id}|draft`, onePressDigest(raw()));
          expect(read().gameLog, 'the finished season rides into the draft with its log').toEqual(recap.gameLog);

          /* point three: his picks (the first prospect on the screen each time), the rivals', and the summer */
          let presses = 0;
          while (read().phase === 'draft' && presses < 12) {
            fireEvent.click(screen.getAllByText(/· age \d+/)[0]);
            presses += 1;
          }
          const hub = read();
          expect(hub.phase, `the draft closed after ${presses} picks`).toBe('hub');
          expect(hub.league.season).toBe(recap.league.season + 1);
          expect(hub.league.week).toBe(1);
          hold(`${id}|hub`, onePressDigest(raw()));
          expect('gameLog' in hub, 'the summer ends the log: the new season holds no key').toBe(false);
        });
      }
    });
  }
}

describe('the record', () => {
  it('is complete, or is being printed', () => {
    if (PRINT) {
      console.log(`FO_ONE_PRESS_RECORD ${printed.length} values\n${printed.join('\n')}`);
      return;
    }
    /* four league and desk pairs, each: two endings at three points and a firing at one, and the press seed and the
       thirteen winners of each of the three */
    expect(Object.keys(RECORDED)).toHaveLength(4 * (3 + 3 + 1 + 3 + 3));
  });
});

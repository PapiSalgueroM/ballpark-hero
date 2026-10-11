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
 * copied into a worktree of that commit; runner result named in
 * docs/audits/ROUND-1305-NOTES.md), before a line of the NFL board moved.
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
 * Negative control: FO_BOARD_NFL points the file at a copy of the board, the
 * way scripts/simGmReload.mjs does for the season close test.
 */
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { createHash } from 'node:crypto';
import type { ComponentType } from 'react';

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
const RECORDED: Record<string, string> = {};
/* RECORDED-END */

const sha1 = (s: string) => createHash('sha1').update(s).digest('hex');

/** The save with the two things this round changes set aside (see the header). */
function onePressDigest(raw: string): string {
  const s = JSON.parse(raw);
  delete s.gameLog;
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

for (const kind of KINDS) {
  for (const desk of [false, true]) {
    describe(`NFL front office, ${kind} league, GM desk ${desk ? 'on' : 'off'}: one press of the final week`, () => {
      for (const ending of ENDINGS) {
        const id = `${kind}|desk ${desk ? 'on' : 'off'}|${ending}`;
        it(`${ending}: the save at the recap, the draft and the next season's hub is the base's`, async () => {
          localStorage.clear();
          const G = await freshGame();
          const { save, team } = finalWeekSave(G, kind, desk, ending);
          localStorage.setItem(SAVE_KEY, JSON.stringify(save));
          useRandom(lehmer(11));

          /* point one: the final week and the whole postseason, one press */
          const first = render(<G.Board />);
          fireEvent.click(screen.getByText('This week'));
          fireEvent.click(screen.getByText('Play the final week + playoffs'));
          const recap = read();
          expect(recap.seasonsPlayed).toBe(1);
          expect(recap.postseason.rounds.flatMap((r: any) => r.games)).toHaveLength(13);
          const took: Ending = recap.fired ? 'fired' : recap.postseason.champion === team ? 'title' : 'ordinary';
          console.log(`FO_ONE_PRESS_ENDING|${id}|took ${took}|phase ${recap.phase}|champion ${recap.postseason.champion}|his club ${team} ${recap.league.teams[team].wins}-${recap.league.teams[team].losses}|trust ${recap.trust}`);
          expect(took, `the ${ending} case of ${id} must take the ${ending} ending`).toBe(ending);
          hold(`${id}|winners`, recap.postseason.rounds.flatMap((r: any) => r.games.map((g: any) => g.winner)).join(','));
          hold(`${id}|recap`, onePressDigest(raw()));
          first.unmount();
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
    /* four league and desk pairs, each: two endings at three points and a firing at one, and the thirteen winners of each */
    expect(Object.keys(RECORDED)).toHaveLength(4 * (3 + 3 + 1 + 3));
  });
});

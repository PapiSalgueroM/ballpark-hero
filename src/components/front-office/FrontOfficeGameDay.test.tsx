/**
 * Round 1305: the NFL front office tells every score like football and keeps
 * the season's results in the save. The real board, on real saves.
 *
 * What a player reads did change in this round (that is the round): the
 * week's sixteen scores and the thirteen of the one press postseason are
 * the football law's for the winners the engine decided. What must not move
 * (who wins, the standings, the draft, the summer) is held by the digests
 * of FrontOfficeOnePress.test.tsx. This file holds the new save field:
 *   - a press writes his game into `gameLog` and the week's grid shows that
 *     very score; the next press appends; a remount keeps it;
 *   - THE TOLD SCORES ARE THE SAVED SCORES on the one press path too: the
 *     recap's rounds in the save hold what the log holds for his games;
 *   - the key is ABSENT wherever there is nothing to hold: on a save from
 *     before the round until its first press, and after "Abandon" on the
 *     new franchise (the old club's games are not the new club's season);
 *   - a log that does not read whole is treated as absent: the save loads,
 *     plays on, and the next press starts a fresh log. It never refuses a
 *     save;
 *   - a save from before the round adopts the log at the week it is first
 *     played here, so the log starts at week k and is not his record.
 *   - WHAT THE BOARD HANDS THE BIND is held one for one on both paths, with
 *     the GM desk off and on: every game the engine played goes to the bind
 *     once, under this season and its own week or round, with the edges it
 *     was played with, and what the bind answers is what the grid prints
 *     and what the save keeps. The season and the place are half of a
 *     game's key, so a board that drifted on either would tell the same
 *     game another score than the round that plays the bracket by hand.
 * No card and no tile yet: nothing on screen reads the log in this round.
 *
 * Negative controls: scripts/controlFrontOfficeBoard.mjs, in the repo. It
 * points this file at a copy of the board with ONE mutation through
 * FO_BOARD_NFL (the way scripts/simGmReload.mjs does for the season close
 * test) and reads which tests went red by name. `list` names all of them:
 * the log dropped from persist, the clears dropped from Abandon and from a
 * new franchise, a log that does not read kept or made a refusal, the
 * engine's own scores on the grid or in the recap save, a game keyed to
 * another season or told without its edges on either path. Run it on a
 * GitHub runner after any edit of the board's press: `all` must end on
 * "fired" for every control and `blank` must say DID NOT FIRE.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup, waitFor } from '@testing-library/react';
import type { ComponentType } from 'react';
import { initLeague, simGame, winProb, REGULAR_WEEKS, DEEP_ROSTER_MAX } from '@/lib/frontOffice';
import { FO_TEAMS } from '@/data/frontOfficePlayers';
import { gmLogRecord, readGmGameLog, type GmGameLog } from '@/lib/gmGameLog';
import { nflGameKey, nflIsRegular } from '@/lib/frontOfficeGameDay';
import { quickGame } from '@/lib/gmGameScore';
import { NFL_SCORE_LAW } from '@/lib/gameLaws/nflScore';
import { nflDeskEdges, openNflDesk } from '@/lib/nflGmDesk';

/* WHAT THE BOARD HANDS THE BIND, written down at the two seams a press has.
   The engine side: every game as simGame left it with the edges it was
   handed, and the bracket as runPlayoffs left it with its edges. The bind
   side: what nflTell was handed (the game, the season, where, the edges)
   and what it answered. Both run untouched, the wrappers only write down,
   so a test can hold the hand over one for one: the season and the place a
   key is made of, and the edges a game is told with, are the board's half
   of the recipe and no harness reads the board for them. */
/* eslint-disable @typescript-eslint/no-explicit-any */
const seen = vi.hoisted(() => ({
  games: [] as { g: any; edges: any }[],
  playoffs: [] as { rounds: { name: string; games: any[] }[]; edges: any }[],
  told: [] as { g: any; season: number; where: string; edges: any; out: { game: any; last: any; byLaw: boolean } }[],
}));
vi.mock('@/lib/frontOffice', async importOriginal => {
  const real = await importOriginal<typeof import('@/lib/frontOffice')>();
  return {
    ...real,
    simGame: (...a: Parameters<typeof real.simGame>) => {
      const g = real.simGame(...a);
      seen.games.push({ g: { ...g }, edges: a[3] ? { ...a[3] } : a[3] });
      return g;
    },
    runPlayoffs: (...a: Parameters<typeof real.runPlayoffs>) => {
      const out = real.runPlayoffs(...a);
      seen.playoffs.push({ rounds: JSON.parse(JSON.stringify(out.rounds)), edges: a[2] ? { ...a[2] } : a[2] });
      return out;
    },
  };
});
vi.mock('@/lib/frontOfficeGameDay', async importOriginal => {
  const real = await importOriginal<typeof import('@/lib/frontOfficeGameDay')>();
  return {
    ...real,
    nflTell: (...a: Parameters<typeof real.nflTell>) => {
      const out = real.nflTell(...a);
      seen.told.push({ g: { ...a[0] }, season: a[2], where: a[3], edges: a[4] ? { ...a[4] } : a[4], out });
      return out;
    },
  };
});
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
const SAVE_KEY = 'front-office-save-v1';
const override = process.env.FO_BOARD_NFL;
const { default: Board } = (override
  ? await import(/* @vite-ignore */ override)
  : await import('@/components/front-office/FrontOfficeBoard')) as { default: ComponentType };

/** A fifteen man league on the morning of `week`, with the club the GM runs. `strong`: his roster made of 99s first. */
function leagueAt(week: number, strong = false) {
  const rng = lehmer(7);
  const league: any = initLeague(rng);
  const team = Object.keys(league.teams)[0];
  if (strong) { for (const p of league.teams[team].players) p.ovr = 99; league.teams[team].defense = 99; }
  for (let w = 1; w < week; w += 1) { league.schedule[w - 1].forEach((g: any) => simGame(g, league.teams, rng)); league.week += 1; }
  return { league, team };
}
const shape = (league: any, team: string, patch: Record<string, unknown> = {}) =>
  ({ league, myTeam: team, phase: 'hub', titles: 0, seasonsPlayed: 0, draftClass: null, picksLeft: 0, ...patch });
const save = (s: unknown) => localStorage.setItem(SAVE_KEY, JSON.stringify(s));
const read = (): any => JSON.parse(localStorage.getItem(SAVE_KEY)!);
/** The save's log as the board's own reader reads it: null when the save holds none that reads whole. */
const logOf = (s: any): GmGameLog | null => readGmGameLog(s.gameLog, id => Object.prototype.hasOwnProperty.call(s.league.teams, id), s.league.season, s.myTeam);
const wheres = (s: any) => (logOf(s)?.games ?? []).map(g => g.where);
const openWeek = () => fireEvent.click(screen.getByText('This week'));
const play = (text: string) => fireEvent.click(screen.getByText(text));
/** The week's grid as text: one [home and its score, away's score and away] pair a game. */
const grid = () => [...document.querySelectorAll('div.grid.max-h-56 > div')].map(row => {
  const spans = [...row.querySelectorAll('span')].map(s => (s.textContent ?? '').trim());
  return { home: spans[0], away: spans[2] };
});
/** A game as the grid prints it. */
const rowOf = (g: any) => ({ home: `${g.home} ${g.homeScore}`, away: `${g.awayScore} ${g.away}` });
/** One press, and what the engine and the bind did in it (the recorders are emptied first). */
const pressed = (text: string) => {
  seen.games.length = 0; seen.playoffs.length = 0; seen.told.length = 0;
  play(text);
  return { games: [...seen.games], playoffs: [...seen.playoffs], told: [...seen.told] };
};
type Told = ReturnType<typeof pressed>['told'];
/** What nflTell was handed, in the shape the engine side is written down in. */
const handed = (told: Told) => told.map(t => ({ g: t.g, season: t.season, where: t.where, edges: t.edges }));
/** How many of these games the law told another score than the engine's own. */
const movedBy = (told: Told) => told.filter(t => t.out.game.homeScore !== t.g.homeScore || t.out.game.awayScore !== t.g.awayScore).length;
const isHis = (team: string) => (t: Told[number]) => t.g.home === team || t.g.away === team;

let restoreRandom: (() => void) | null = null;
beforeEach(() => {
  localStorage.clear();
  const spy = vi.spyOn(Math, 'random').mockImplementation(lehmer(11));
  restoreRandom = () => spy.mockRestore();
});
afterEach(() => { cleanup(); restoreRandom?.(); });

describe('NFL front office: a press tells his game and keeps it', () => {
  it('his game of the week is in the save, and the grid shows that very score, a football score', () => {
    const { league, team } = leagueAt(6);
    const before = { w: league.teams[team].wins, l: league.teams[team].losses };
    save(shape(league, team));
    render(<Board />);
    expect('gameLog' in read()).toBe(false);
    openWeek();
    const press = pressed('Play Week 6');
    const s = read();
    expect(s.league.week).toBe(7);
    const log = logOf(s)!;
    expect(log, 'the save holds a log that reads').not.toBeNull();
    /* the board saved exactly what the reader hands back: no field the reader does not know */
    expect(s.gameLog).toEqual(log);
    expect(log.season).toBe(league.season);
    expect(log.games).toHaveLength(1);
    const g = log.games[0];
    expect(g.where).toBe('w6');
    expect([g.home, g.away]).toContain(team);
    /* the engine's own result, told: his record moved by this game and no other */
    const after = s.league.teams[team];
    expect(after.wins + after.losses).toBe(before.w + before.l + 1);
    expect(after.wins - before.w).toBe(g.winner === team ? 1 : 0);
    /* THE HAND OVER: the bind was handed the sixteen games the engine played, each once and in order, under
       this season and this week, with the edges the engine itself was handed (none: the desk is off) */
    expect(press.games).toHaveLength(16);
    expect(press.playoffs).toHaveLength(0);
    expect(handed(press.told)).toEqual(press.games.map(e => ({ g: e.g, season: league.season, where: 'w6', edges: e.edges })));
    /* his entry is what the bind answered for his game, under the key the recipe gives: the season, where,
       the two clubs and the ENGINE'S OWN score */
    const mine = press.told.filter(isHis(team));
    expect(mine).toHaveLength(1);
    expect(g).toEqual(mine[0].out.last);
    expect(g.key).toBe(nflGameKey(league.season, 'w6', mine[0].g));
    expect(g.key.startsWith(`${s.league.season}|${g.where}|${g.home}|${g.away}|`)).toBe(true);
    /* the grid: the sixteen told games in the engine's order, and nothing else */
    const rows = grid();
    expect(rows).toEqual(press.told.map(t => rowOf(t.out.game)));
    expect(rows).toContainEqual(rowOf(g));
    const finals = rows.map(r => [Number(r.home.split(' ').pop()), Number(r.away.split(' ')[0])]);
    for (const [h, a] of finals) expect(h).not.toBe(a);
    /* and the telling did something: the equality above would hold for a grid of the engine's own scores if
       the law had moved none of them, so the count it moved is printed and must not be zero */
    const moved = movedBy(press.told);
    console.log(`FO_GAMEDAY week 6: his game ${g.home} ${g.homeScore}, ${g.away} ${g.awayScore} (the engine's own ${mine[0].g.homeScore}-${mine[0].g.awayScore}); the law told ${moved} of the sixteen another score than the engine's`);
    expect(moved).toBeGreaterThan(0);
  });

  it('the next press appends in week order, and a remount keeps the log', () => {
    const { league, team } = leagueAt(6);
    save(shape(league, team));
    const first = render(<Board />);
    openWeek();
    play('Play Week 6');
    play('Play Week 7');
    const two = read();
    expect(wheres(two)).toEqual(['w6', 'w7']);
    const kept = logOf(two)!.games;
    first.unmount();
    render(<Board />);
    /* a load writes nothing and loses nothing */
    expect(read()).toEqual(two);
    openWeek();
    play('Play Week 8');
    const three = logOf(read())!;
    expect(three.games.map(g => g.where)).toEqual(['w6', 'w7', 'w8']);
    expect(three.games.slice(0, 2)).toEqual(kept);
    for (const g of three.games) expect([g.home, g.away]).toContain(team);
    expect(new Set(three.games.map(g => g.key)).size).toBe(3);
  });

  it('a save from before the round adopts the log at the week it is first played here: it starts at week 9 and is not his record', () => {
    const { league, team } = leagueAt(9);
    save(shape(league, team));
    render(<Board />);
    expect('gameLog' in read()).toBe(false);
    openWeek();
    play('Play Week 9');
    expect(wheres(read())).toEqual(['w9']);
    play('Play Week 10');
    const s = read();
    expect(wheres(s)).toEqual(['w9', 'w10']);
    const r = gmLogRecord(logOf(s), team, nflIsRegular);
    const club = s.league.teams[team];
    console.log(`FO_GAMEDAY adopted at week 9: the log reads ${r.won}-${r.lost}, the league's record is ${club.wins}-${club.losses}`);
    expect(r.won + r.lost).toBe(2);
    expect(club.wins + club.losses).toBe(10);
  });
});

describe('NFL front office: a log that does not read whole is absent, and never refuses the save', () => {
  it('a damaged log, a log of another season or another club, an empty one or junk: the save loads, plays on, and the next press starts a fresh log', () => {
    const { league, team } = leagueAt(6);
    const clubs = Object.keys(league.teams).filter(a => a !== team);
    const entry = (n: number, home: string, away: string, hs: number, as: number) =>
      ({ v: 1, key: `${league.season}|w${n}|${home}|${away}|20-17`, where: `w${n}`, home, away, homeScore: hs, awayScore: as, winner: hs > as ? home : away });
    const good = entry(5, team, clubs[0], 27, 20);
    const BAD: [string, unknown][] = [
      ['a level final in an entry', { v: 1, season: league.season, games: [good, { ...entry(4, clubs[1], team, 20, 20), winner: team }] }],
      ['a winner the final does not name', { v: 1, season: league.season, games: [{ ...good, winner: clubs[0] }] }],
      ['a score over the ceiling', { v: 1, season: league.season, games: [{ ...good, homeScore: 250000 }] }],
      ['an unknown version', { v: 2, season: league.season, games: [good] }],
      ['another season', { v: 1, season: league.season - 1, games: [good] }],
      ['the games of two other clubs (the club he ran before)', { v: 1, season: league.season, games: [entry(5, clubs[0], clubs[1], 27, 20)] }],
      ['the same game twice', { v: 1, season: league.season, games: [good, good] }],
      ['an empty log', { v: 1, season: league.season, games: [] }],
      ['null', null],
      ['a word', 'log'],
    ];
    for (const [name, gameLog] of BAD) {
      cleanup();
      localStorage.clear();
      save(shape(league, team, { gameLog }));
      render(<Board />);
      /* the hub, not the save error screen */
      expect(screen.getByText('This week'), name).toBeTruthy();
      openWeek();
      play('Play Week 6');
      expect(wheres(read()), `${name}: the next press starts a fresh log`).toEqual(['w6']);
      expect(read().league.week, name).toBe(7);
    }
    /* and a log that does read is kept: the press appends to it */
    cleanup();
    localStorage.clear();
    save(shape(league, team, { gameLog: { v: 1, season: league.season, games: [good] } }));
    render(<Board />);
    openWeek();
    play('Play Week 6');
    expect(wheres(read())).toEqual(['w5', 'w6']);
  });
});

describe('NFL front office: the log does not follow a GM into his next franchise', () => {
  it('abandon in the middle of a season and start again: the new save holds no log, and its first press logs one game of the new club', async () => {
    const { league, team } = leagueAt(6);
    save(shape(league, team));
    const first = render(<Board />);
    openWeek();
    play('Play Week 6');
    expect(wheres(read())).toEqual(['w6']);
    fireEvent.click(screen.getByText('Abandon franchise and restart'));
    expect(localStorage.getItem(SAVE_KEY)).toBeNull();
    const next = FO_TEAMS.find(t => t.abbr !== team)!;
    fireEvent.click(screen.getByText(`${next.city} ${next.name}`));
    await waitFor(() => expect(localStorage.getItem(SAVE_KEY)).not.toBeNull(), { timeout: 60_000 });
    const opened = read();
    expect(opened.myTeam).toBe(next.abbr);
    expect(opened.league.week).toBe(1);
    expect('gameLog' in opened, 'a new franchise holds no log').toBe(false);
    /* a reload ends the introduction scrum; then his club cuts down if it owes a cut, the board's own way */
    first.unmount();
    render(<Board />);
    if (read().league.teams[next.abbr].players.length > DEEP_ROSTER_MAX) {
      fireEvent.click(screen.getByText('Roster'));
      while (read().league.teams[next.abbr].players.length > DEEP_ROSTER_MAX) {
        const group = [...document.querySelectorAll('[data-roster-group]')].find(b => /DB|LB|WR/.test(b.getAttribute('data-roster-group') ?? '')) as HTMLElement;
        fireEvent.click(group);
        const rows = [...document.querySelectorAll('[data-roster-row]')] as HTMLElement[];
        fireEvent.click(rows[rows.length - 1].querySelector('button')!);
        fireEvent.click(screen.getByText('Cut him'));
        fireEvent.click(screen.getByText('Groups'));
      }
      fireEvent.click(screen.getByText('Hub'));
    }
    expect('gameLog' in read()).toBe(false);
    openWeek();
    play('Play Week 1');
    const log = logOf(read())!;
    expect(log).not.toBeNull();
    expect(log.games.map(g => g.where)).toEqual(['w1']);
    expect([log.games[0].home, log.games[0].away]).toContain(next.abbr);
  });
});

describe('NFL front office: the one press finish', () => {
  it.each([['off', false], ['on', true]] as const)('the told scores are the saved scores, with the GM desk %s: the rounds of the recap hold what the bind answered for the games the engine played, and the log holds his', (word, desk) => {
    const { league, team } = leagueAt(REGULAR_WEEKS, true);
    save(shape(league, team, desk ? { gm: openNflDesk(league, team) } : {}));
    render(<Board />);
    openWeek();
    const press = pressed('Play the final week + playoffs');
    const s = read();
    expect(s.seasonsPlayed).toBe(1);
    /* THE HAND OVER, on both halves of the press. Week 17: the sixteen games the engine played, under this
       season and "w17", with the edges each was played with. The bracket: its thirteen games in the engine's
       own order, each under the name of its round, with the edges runPlayoffs was handed. With the desk on
       those edges are his staff's and with it off there are none: a telling that dropped them, or keyed a
       game to another season or another round, is not the game that was played. */
    expect(press.games).toHaveLength(16);
    expect(press.playoffs).toHaveLength(1);
    const bracket = press.playoffs[0];
    /* the check has teeth only if the engine really was handed edges with the desk on, and none with it off */
    expect(bracket.edges === undefined, `the bracket's edges, the desk ${word}`).toBe(!desk);
    expect(press.games.filter(e => e.edges === undefined).length, `the week's edges, the desk ${word}`).toBe(desk ? 0 : 16);
    const toldWeek = press.told.slice(0, 16), toldBracket = press.told.slice(16);
    expect(handed(toldWeek)).toEqual(press.games.map(e => ({ g: e.g, season: league.season, where: `w${REGULAR_WEEKS}`, edges: e.edges })));
    expect(handed(toldBracket)).toEqual(bracket.rounds.flatMap(r => r.games.map(g => ({ g, season: league.season, where: r.name, edges: bracket.edges }))));
    const log = logOf(s)!;
    expect(log, 'the log reads on the recap save').not.toBeNull();
    const rounds: { name: string; games: any[] }[] = s.postseason.rounds;
    const all = rounds.flatMap(r => r.games.map(g => ({ round: r.name, g })));
    expect(all).toHaveLength(13);
    const his = all.filter(x => x.g.home === team || x.g.away === team);
    console.log(`FO_GAMEDAY one press: his club ${team} played ${his.length} playoff games; the log holds ${log.games.map(g => g.where).join(', ')}`);
    expect(his.length, 'a roster of 99s reaches the playoffs').toBeGreaterThanOrEqual(1);
    /* Week 17, then his playoff games in the order they were played, each under the name of its round */
    expect(log.games.map(g => g.where)).toEqual([`w${REGULAR_WEEKS}`, ...his.map(x => x.round)]);
    const playoff = log.games.slice(1);
    his.forEach((x, k) => {
      expect([playoff[k].home, playoff[k].away, playoff[k].homeScore, playoff[k].awayScore, playoff[k].winner])
        .toEqual([x.g.home, x.g.away, x.g.homeScore, x.g.awayScore, x.g.winner]);
      expect(nflIsRegular(playoff[k])).toBe(false);
    });
    /* the regular season record in the save did not take the playoff games */
    expect(s.league.teams[team].wins + s.league.teams[team].losses).toBe(REGULAR_WEEKS);
    /* THE SAVED ROUNDS ARE WHAT THE BIND ANSWERED, game for game in the engine's order, and the log's entries
       are the bind's own for his games (Week 17 first), each under the key the recipe gives */
    let at = 0;
    expect(rounds).toEqual(bracket.rounds.map(r => ({ name: r.name, games: r.games.map(() => toldBracket[at++].out.game) })));
    const mine = press.told.filter(isHis(team));
    expect(log.games).toEqual(mine.map(t => t.out.last));
    for (const [k, t] of mine.entries()) expect(log.games[k].key).toBe(nflGameKey(league.season, t.where, t.g));
    for (const e of log.games) expect(e.key.startsWith(`${s.league.season}|${e.where}|${e.home}|${e.away}|`)).toBe(true);
    for (const x of all) expect(x.g.homeScore > x.g.awayScore).toBe(x.g.winner === x.g.home);
    /* and the telling did something: the saved rounds would equal the engine's own if the law had moved no
       score, so the count it moved is printed and must not be zero */
    const moved = movedBy(toldBracket);
    console.log(`FO_GAMEDAY one press, the desk ${word}: the law told ${moved} of the thirteen playoff games another score than the engine's`);
    expect(moved).toBeGreaterThan(0);
  });

  it('with the GM desk on, his game is told at the chance it was played at, the edge of his staff included', () => {
    const { league, team } = leagueAt(6);
    const gm = openNflDesk(league, team);
    save(shape(league, team, { gm }));
    render(<Board />);
    openWeek();
    const press = pressed('Play Week 6');
    const s = read();
    /* the hand over with the desk on: every game of the week was told with the very edges it was played with */
    expect(press.games).toHaveLength(16);
    expect(press.games.filter(e => e.edges === undefined), 'the engine was handed the desk\'s edges').toHaveLength(0);
    expect(handed(press.told)).toEqual(press.games.map(e => ({ g: e.g, season: league.season, where: 'w6', edges: e.edges })));
    const g = logOf(s)!.games[0];
    const edge = nflDeskEdges(gm, league, team)[team] ?? 0;
    const teams = s.league.teams;
    const eh = g.home === team ? edge : 0;
    const ea = g.away === team ? edge : 0;
    const told = (pHome: number) => quickGame(NFL_SCORE_LAW, { key: g.key, home: g.home, away: g.away, decided: { homeWon: g.winner === g.home, pHome } })!;
    const withEdge = told(winProb(teams[g.home], teams[g.away], eh, ea));
    const without = told(winProb(teams[g.home], teams[g.away]));
    console.log(`FO_GAMEDAY desk on: the edge of his staff is ${edge}; told with it ${withEdge.homeScore}-${withEdge.awayScore}, without it ${without.homeScore}-${without.awayScore}; the log holds ${g.homeScore}-${g.awayScore}`);
    expect([g.homeScore, g.awayScore]).toEqual([withEdge.homeScore, withEdge.awayScore]);
  });
});

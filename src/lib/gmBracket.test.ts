/* Round 1224: the bracket a front office plays (src/lib/gmBracket.ts) and the
   NFL's as data (src/data/gmBrackets/nfl.ts).

   The NFL data is held to the engine's own postseason by
   scripts/simGmGameDay.mjs (a recorded fixture, draw for draw). This file
   holds what that cannot: the worked example of the "?", the two shapes the
   other three front offices need (a best of seven with a play in, and an
   engine that plays one side of the bracket to its end first), and the save
   guard, the replay check and the repair with every field damaged, one at a
   time. */
import { describe, expect, it } from 'vitest';
import {
  BRACKET_REBUILT_LINES, bracketByes, bracketChampion, bracketOut, bracketOutcomes, bracketPairings, bracketProblems, bracketRounds, bracketWeek,
  isGmBracketSave, openBracket, playBracketAll, playBracketGame, playBracketWeek, repairGmBracket,
  type BracketFormat, type GmBracketSave, type PlayTie,
} from '@/lib/gmBracket';
import { GM_SCORE_CEILING } from '@/lib/gmGameScore';
import { NFL_BRACKET, NFL_BRACKET_HELP, NFL_BRACKET_SEASONS, NFL_TITLE_GAME_LEAN, nflBracketFor } from '@/data/gmBrackets/nfl';
import { NFL_PLAYOFF_PERIODS, periodFor } from '@/lib/nflPlayoffFormatHistory';
import { initLeague, winProb } from '@/lib/frontOffice';
import { keyedRng } from '@/lib/keyedRng';

const SEEDS = Array.from({ length: 14 }, (_, i) => `S${i + 1}`);
const isClub = (id: string) => /^S\d+$/.test(id);
const seedNo = (id: string) => Number(id.slice(1));
/** The better seed wins 27 to 20, except the ties named in `upsets` (by tie id), which the away side wins 24 to 17. */
const chalk = (upsets: string[] = []): PlayTie => (home, away, tie) => (upsets.includes(tie.id)
  ? { homeScore: 17, awayScore: 24, winner: away }
  : { homeScore: 27, awayScore: 20, winner: home });
const frozen = <T,>(x: T): T => JSON.parse(JSON.stringify(x), (_k, v) => (v && typeof v === 'object' ? Object.freeze(v) : v));
/** Curly quotation marks and the two dashes, by code so no tool rewrites them. */
const NOT_PLAIN = new RegExp('[' + [0x201c, 0x201d, 0x2013, 0x2014].map(c => String.fromCharCode(c)).join('') + ']');

describe('the NFL bracket as data', () => {
  it('is the fourteen club format of the two sourced ledger, for the seasons that ledger gives it', () => {
    const period = NFL_PLAYOFF_PERIODS.find(p => p.id === 'fourteen-teams')!;
    expect(NFL_BRACKET.qualifiers).toBe(period.fieldSize);
    expect(NFL_BRACKET_SEASONS.from).toBe(period.from);
    expect(NFL_BRACKET_SEASONS.to).toBe(period.to);
    expect(periodFor(NFL_BRACKET_SEASONS.asOf).id).toBe('fourteen-teams');
    expect(nflBracketFor(2019)).toBeNull();
    expect(nflBracketFor(2020.5)).toBeNull();
    for (const season of [2020, 2025, 2026, 2031]) expect(nflBracketFor(season)).toBe(NFL_BRACKET);
  });

  it('gives each conference one bye, to its top seed, and thirteen single games', () => {
    expect(bracketByes(NFL_BRACKET)).toEqual([1, 8]);
    expect(NFL_BRACKET.ties.length).toBe(13);
    expect(NFL_BRACKET.ties.filter(t => t.neutral).map(t => t.id)).toEqual(['SB']);
    const open = openBracket(NFL_BRACKET, 2026, SEEDS);
    expect(bracketPairings(NFL_BRACKET, open, 1)!.map(p => [seedNo(p.homeId), seedNo(p.awayId)])).toEqual([[2, 7], [3, 6], [4, 5], [9, 14], [10, 13], [11, 12]]);
    expect(bracketPairings(NFL_BRACKET, open, 2)).toBeNull();
  });

  it('plays the worked example of the "?" the way the "?" tells it', () => {
    /* seed 7 wins at seed 2, seed 3 beats seed 6, seed 5 wins at seed 4 */
    const afterWildCard = playBracketWeek(NFL_BRACKET, openBracket(NFL_BRACKET, 2026, SEEDS), chalk(['AFC-WC-1', 'AFC-WC-3']));
    const divisional = bracketPairings(NFL_BRACKET, afterWildCard, 2)!.slice(0, 2).map(p => [seedNo(p.homeId), seedNo(p.awayId)]);
    expect(divisional).toEqual([[1, 7], [3, 5]]);
    expect(NFL_BRACKET_HELP.examples[0].body).toContain('seed 1 hosts seed 7');
    expect(NFL_BRACKET_HELP.examples[0].body).toContain('seed 3 hosts seed 5');
  });

  it('pairs the top seed with the lowest seed left whoever came through, and the better seed hosts', () => {
    const ids = ['AFC-WC-1', 'AFC-WC-2', 'AFC-WC-3'];
    for (let mask = 0; mask < 8; mask += 1) {
      const upsets = ids.filter((_, k) => mask & (1 << k));
      const s = playBracketWeek(NFL_BRACKET, openBracket(NFL_BRACKET, 2026, SEEDS), chalk(upsets));
      const alive = [2, 3, 4].map((home, k) => (upsets.includes(ids[k]) ? 9 - home : home)).sort((a, b) => a - b);
      const [top, other] = bracketPairings(NFL_BRACKET, s, 2)!;
      expect([seedNo(top.homeId), seedNo(top.awayId)]).toEqual([1, alive[2]]);
      expect([seedNo(other.homeId), seedNo(other.awayId)]).toEqual([alive[0], alive[1]]);
      /* and on to the conference championship, whoever wins the two Divisional games: the better seed of the two is at home */
      for (let div = 0; div < 4; div += 1) {
        const later = ['AFC-DIV-1', 'AFC-DIV-2'].filter((_, k) => div & (1 << k));
        const s2 = playBracketWeek(NFL_BRACKET, s, chalk(later));
        const through = [later.includes('AFC-DIV-1') ? alive[2] : 1, later.includes('AFC-DIV-2') ? alive[1] : alive[0]].sort((a, b) => a - b);
        const title = bracketPairings(NFL_BRACKET, s2, 3)![0];
        expect([title.id, seedNo(title.homeId), seedNo(title.awayId)], `wild card upsets ${upsets.join(' ')}, divisional upsets ${later.join(' ')}`).toEqual(['AFC-CC', through[0], through[1]]);
      }
    }
  });

  it('gives the home side of every game before the title game to the better seed, in both conferences, whoever wins', () => {
    /* sixteen ways the bracket can go (a keyed coin a game); the title game is the one tie with no host by seed */
    for (let run = 0; run < 16; run += 1) {
      const coin = keyedRng(`gmBracket hosts|${run}`);
      const all = playBracketAll(NFL_BRACKET, openBracket(NFL_BRACKET, 2026, SEEDS), (home, away) => (coin() < 0.5 ? { homeScore: 27, awayScore: 20, winner: home } : { homeScore: 17, awayScore: 24, winner: away }));
      expect(all.played.length).toBe(13);
      for (const p of all.played.filter(x => x.id !== 'SB')) expect(seedNo(p.home), `run ${run}, ${p.id}: ${p.home} hosts ${p.away}`).toBeLessThan(seedNo(p.away));
    }
  });

  it('is the same bracket all at once and a round a press, and never touches the save it is handed', () => {
    const play = chalk(['AFC-WC-2', 'NFC-DIV-1', 'AFC-CC', 'SB']);
    const open = frozen(openBracket(NFL_BRACKET, 2026, SEEDS));
    const all = playBracketAll(NFL_BRACKET, open, play);
    let s: GmBracketSave = open;
    const weeks: (number | null)[] = [];
    for (let press = 0; press < 4; press += 1) { weeks.push(bracketWeek(NFL_BRACKET, s)); s = frozen(playBracketWeek(NFL_BRACKET, s, play)); }
    expect(weeks).toEqual([1, 2, 3, 4]);
    expect(bracketWeek(NFL_BRACKET, s)).toBeNull();
    expect(s).toEqual(all);
    expect(open.played).toEqual([]);
    expect(playBracketWeek(NFL_BRACKET, s, play)).toBe(s);
    expect(bracketProblems(NFL_BRACKET, all, isClub)).toEqual([]);
    expect(bracketRounds(NFL_BRACKET, all).map(r => [r.name, r.games.length])).toEqual([
      ['AFC Wild Card', 3], ['NFC Wild Card', 3], ['AFC Divisional', 2], ['NFC Divisional', 2], ['AFC Championship', 1], ['NFC Championship', 1], ['Super Bowl', 1],
    ]);
    /* the NFC champion wins the title game here: it is the away side of the last tie */
    const last = all.played[12];
    expect(bracketChampion(NFL_BRACKET, all)).toBe(last.away);
    expect(bracketOut(NFL_BRACKET, all).size).toBe(13);
    expect(bracketOut(NFL_BRACKET, all).has(last.away)).toBe(false);
    expect(bracketChampion(NFL_BRACKET, playBracketWeek(NFL_BRACKET, open, play))).toBeNull();
    expect(bracketRounds(NFL_BRACKET, playBracketWeek(NFL_BRACKET, open, play)).length).toBe(2);
  });

  it('says in its "?" what is dated and what is this sim own lean, and the lean is the engine arithmetic', () => {
    const all = [NFL_BRACKET_HELP.title, ...NFL_BRACKET_HELP.intro, NFL_BRACKET_HELP.controls, NFL_BRACKET_HELP.footnote, ...NFL_BRACKET_HELP.examples.flatMap(e => [e.head, e.body])];
    for (const line of all) { expect(line).not.toMatch(NOT_PLAIN); expect(line).not.toContain(String.fromCharCode(34)); }
    expect(NFL_BRACKET_HELP.intro[0]).toContain(`as it stood in ${NFL_BRACKET_SEASONS.asOf}`);
    const lean = NFL_BRACKET_HELP.intro.find(l => l.includes('AFC champion'))!;
    expect(lean.startsWith("This sim's own")).toBe(true);
    expect(lean).toContain(`${NFL_TITLE_GAME_LEAN} times in 100`);
    /* a club against itself is a level game: the first club named is given the engine's two points */
    const club = Object.values(initLeague(keyedRng('gmBracket test league')).teams)[0];
    expect(Math.round(100 * winProb(club, club))).toBe(NFL_TITLE_GAME_LEAN);
    expect(NFL_BRACKET_HELP.intro.filter(l => l.startsWith('Real')).length).toBe(3);
  });
});

/* A ten club conference: a play in for seeds 7 to 10, then best of seven rounds. What a basketball front office brings. */
const PLAY_IN: BracketFormat = {
  id: 'test-play-in',
  qualifiers: 10,
  ties: [
    { id: 'PI-78', week: 1, round: 'Play in', home: { seed: 7 }, away: { seed: 8 } },
    { id: 'PI-910', week: 1, round: 'Play in', home: { seed: 9 }, away: { seed: 10 } },
    { id: 'PI-8', week: 2, round: 'Play in', home: { loserOf: 'PI-78' }, away: { winnerOf: 'PI-910' } },
    { id: 'R1-A', week: 3, round: 'First round', home: { seed: 1 }, away: { winnerOf: 'PI-8' } },
    { id: 'R1-B', week: 3, round: 'First round', home: { seed: 4 }, away: { seed: 5 } },
    { id: 'R1-C', week: 3, round: 'First round', home: { seed: 3 }, away: { seed: 6 } },
    { id: 'R1-D', week: 3, round: 'First round', home: { seed: 2 }, away: { winnerOf: 'PI-78' } },
    { id: 'SF-A', week: 4, round: 'Semifinals', home: { winnerOf: 'R1-A' }, away: { winnerOf: 'R1-B' } },
    { id: 'SF-B', week: 4, round: 'Semifinals', home: { winnerOf: 'R1-D' }, away: { winnerOf: 'R1-C' } },
    { id: 'F', week: 5, round: 'Final', home: { winnerOf: 'SF-A' }, away: { winnerOf: 'SF-B' } },
  ],
  winsNeeded: { 3: 4, 4: 4, 5: 4 },
};
/* Two halves and a final, with an engine that plays the SECOND half to its end before the first. */
const HALVES: BracketFormat = {
  id: 'test-halves',
  qualifiers: 4,
  ties: [
    { id: 'A', week: 1, round: 'Half A', home: { seed: 1 }, away: { seed: 2 } },
    { id: 'B', week: 1, round: 'Half B', home: { seed: 3 }, away: { seed: 4 } },
    { id: 'F', week: 2, round: 'Final', home: { winnerOf: 'A' }, away: { winnerOf: 'B' } },
  ],
  winsNeeded: { 1: 2, 2: 2 },
  order: ['B', 'A', 'F'],
};
/** The home side wins the odd games and the away side the even ones: a series goes the distance and the home side takes it. */
const alternate: PlayTie = (home, away, _tie, gameNo) => (gameNo % 2 ? { homeScore: 110, awayScore: 101, winner: home } : { homeScore: 99, awayScore: 104, winner: away });

describe('the shapes the other front offices bring', () => {
  it('plays a play in and best of seven rounds, a game at a time or a round at a time', () => {
    const ten = SEEDS.slice(0, 10);
    const calls: [string, number][] = [];
    const logged: PlayTie = (home, away, tie, gameNo) => { calls.push([tie.id, gameNo]); return alternate(home, away, tie, gameNo); };
    let s = playBracketWeek(PLAY_IN, openBracket(PLAY_IN, 2026, ten), logged);
    s = playBracketWeek(PLAY_IN, s, logged);
    /* 7 beat 8, 9 beat 10, then the loser of the first (8) beat 9 for the last place */
    expect(bracketOutcomes(PLAY_IN, s)).toEqual({ 'PI-78': { winner: 'S7', loser: 'S8' }, 'PI-910': { winner: 'S9', loser: 'S10' }, 'PI-8': { winner: 'S8', loser: 'S9' } });
    expect([...bracketOut(PLAY_IN, s)].sort()).toEqual(['S10', 'S9']);
    expect(bracketPairings(PLAY_IN, s, 3)!.map(p => `${p.homeId} ${p.awayId}`)).toEqual(['S1 S8', 'S4 S5', 'S3 S6', 'S2 S7']);
    /* one game of one series: the week does not move on, and the save in the middle of a series is sound */
    const mid = playBracketGame(PLAY_IN, s, 'R1-B', logged);
    expect(mid.played.find(p => p.id === 'R1-B')!.games.length).toBe(1);
    expect(bracketWeek(PLAY_IN, mid)).toBe(3);
    expect(bracketProblems(PLAY_IN, mid, isClub)).toEqual([]);
    expect(isGmBracketSave(JSON.parse(JSON.stringify(mid)), isClub)).toBe(true);
    const round = playBracketWeek(PLAY_IN, mid, logged);
    for (const id of ['R1-A', 'R1-B', 'R1-C', 'R1-D']) expect(round.played.find(p => p.id === id)!.games.length).toBe(7);
    expect(calls.filter(c => c[0] === 'R1-B').map(c => c[1])).toEqual([1, 2, 3, 4, 5, 6, 7]);
    expect(playBracketGame(PLAY_IN, round, 'R1-B', logged)).toBe(round);
    const done = playBracketAll(PLAY_IN, round, logged);
    expect(bracketChampion(PLAY_IN, done)).toBe('S1');
    expect(bracketProblems(PLAY_IN, done, isClub)).toEqual([]);
    expect(bracketRounds(PLAY_IN, done).map(r => [r.name, r.games.length])).toEqual([['Play in', 3], ['First round', 28], ['Semifinals', 14], ['Final', 7]]);
    expect(bracketByes(PLAY_IN)).toEqual([1, 2, 3, 4, 5, 6]);
  });

  it('plays a format with an order of its own in that order, and still a round at a time', () => {
    const four = SEEDS.slice(0, 4);
    const all = playBracketAll(HALVES, openBracket(HALVES, 2026, four), alternate);
    expect(all.played.map(p => p.id)).toEqual(['B', 'A', 'F']);
    expect(bracketProblems(HALVES, all, isClub)).toEqual([]);
    const byRound = playBracketWeek(HALVES, playBracketWeek(HALVES, openBracket(HALVES, 2026, four), alternate), alternate);
    expect(byRound.played.map(p => p.id)).toEqual(['A', 'B', 'F']);
    expect(bracketChampion(HALVES, byRound)).toBe(bracketChampion(HALVES, all));
    expect(bracketProblems(HALVES, byRound, isClub)).toEqual([]);
  });

  it('refuses a game whose winner is neither side, and plays nothing for a tie it cannot name', () => {
    const open = openBracket(NFL_BRACKET, 2026, SEEDS);
    expect(() => playBracketGame(NFL_BRACKET, open, 'AFC-WC-1', () => ({ homeScore: 1, awayScore: 0, winner: 'S14' }))).toThrow();
    expect(playBracketGame(NFL_BRACKET, open, 'SB', chalk())).toBe(open);
    expect(playBracketGame(NFL_BRACKET, open, 'no such tie', chalk())).toBe(open);
  });

  it('plays no tie out of turn: a tie that can be named is still not played before an earlier week is settled', () => {
    /* the AFC's Wild Card round is in, the NFC's is not: the AFC's top seed can be paired, and the validator would call that game out of turn */
    let s = openBracket(NFL_BRACKET, 2026, SEEDS);
    for (const id of ['AFC-WC-1', 'AFC-WC-2', 'AFC-WC-3']) s = playBracketGame(NFL_BRACKET, s, id, chalk());
    expect(s.played.length).toBe(3);
    expect(playBracketGame(NFL_BRACKET, s, 'AFC-DIV-1', chalk())).toBe(s);
    expect(playBracketGame(NFL_BRACKET, s, 'AFC-DIV-2', chalk())).toBe(s);
    for (const id of ['NFC-WC-1', 'NFC-WC-2', 'NFC-WC-3']) s = playBracketGame(NFL_BRACKET, s, id, chalk());
    const next = playBracketGame(NFL_BRACKET, s, 'AFC-DIV-1', chalk());
    expect(next.played.map(p => p.id)).toEqual(['AFC-WC-1', 'AFC-WC-2', 'AFC-WC-3', 'NFC-WC-1', 'NFC-WC-2', 'NFC-WC-3', 'AFC-DIV-1']);
    expect(bracketProblems(NFL_BRACKET, next, isClub)).toEqual([]);
    /* a format with an order of its own is played in that order, across its weeks */
    const halves = playBracketGame(HALVES, openBracket(HALVES, 2026, SEEDS.slice(0, 4)), 'B', alternate);
    expect(halves.played.map(p => p.id)).toEqual(['B']);
  });

  it('never makes a save the validator condemns, whatever tie is asked for next', () => {
    /* a keyed walk: ask for any tie of the format, in any order, a game at a time, until the bracket is played out */
    const formats: [BracketFormat, string[]][] = [[NFL_BRACKET, SEEDS], [PLAY_IN, SEEDS.slice(0, 10)], [HALVES, SEEDS.slice(0, 4)]];
    for (const [format, seeds] of formats) {
      for (let run = 0; run < 12; run += 1) {
        const pick = keyedRng(`gmBracket any order|${format.id}|${run}`);
        const coin: PlayTie = (home, away) => (pick() < 0.5 ? { homeScore: 5, awayScore: 3, winner: home } : { homeScore: 2, awayScore: 4, winner: away });
        let s = openBracket(format, 2026, seeds);
        let moves = 0;
        for (let ask = 0; ask < 4000 && bracketChampion(format, s) === null; ask += 1) {
          const next = playBracketGame(format, s, format.ties[Math.floor(pick() * format.ties.length)].id, coin);
          if (next === s) continue;
          moves += 1;
          s = JSON.parse(JSON.stringify(next));
          expect(bracketProblems(format, s, isClub), `${format.id} run ${run} after ${moves} games`).toEqual([]);
          expect(repairGmBracket(format, s, 2026, () => seeds, isClub).save).toBe(s);
        }
        expect(bracketChampion(format, s), `${format.id} run ${run}`).not.toBeNull();
      }
    }
  });
});

describe('the saved bracket: optional, guarded and repairable', () => {
  const played = (): GmBracketSave => playBracketWeek(NFL_BRACKET, playBracketWeek(NFL_BRACKET, openBracket(NFL_BRACKET, 2026, SEEDS), chalk(['AFC-WC-1'])), chalk());
  const copy = <T,>(x: T): T => JSON.parse(JSON.stringify(x));
  const thrower = () => Object.defineProperty(copy(played()), 'seeds', { get() { throw new Error('boom'); } });

  it('reads a sound save and refuses every field damaged, one at a time, without ever throwing', () => {
    const sound = played();
    expect(isGmBracketSave(sound, isClub)).toBe(true);
    expect(isGmBracketSave(copy(sound), isClub)).toBe(true);
    const outer: Record<string, unknown[]> = {
      v: [undefined, 0, 2, '1', null],
      format: [undefined, '', 7, null],
      season: [undefined, '2026', 2026.5, -1, Number.NaN, null],
      seeds: [undefined, null, 'S1', {}, [...SEEDS.slice(0, 13), 'S1'], [...SEEDS.slice(0, 13), 'ZZZ'], [...SEEDS.slice(0, 13), 14], [...SEEDS.slice(0, 13), '']],
      played: [undefined, null, {}, 'x', [null], [7], [[]]],
    };
    const tie: Record<string, unknown[]> = {
      id: [undefined, '', 3, null],
      home: [undefined, '', 'ZZZ', 4, null, 'S7'],
      away: [undefined, '', 'ZZZ', 4, null, 'S2'],
      games: [undefined, null, {}, 'x', [null], [7]],
    };
    const game: Record<string, unknown[]> = {
      /* the last three: a score above the ceiling (with none, a saved 250000 threw out of a story law and 1e21 never came back) */
      homeScore: [undefined, '17', 17.5, -1, Number.NaN, null, GM_SCORE_CEILING + 1, 250000, 1e21],
      awayScore: [undefined, '24', 24.5, -1, Number.POSITIVE_INFINITY, null, GM_SCORE_CEILING + 1, 250000, 1e21],
      winner: [undefined, '', 'ZZZ', 7, null],
    };
    let cases = 0;
    const damaged = (edit: (s: Record<string, any>, v: unknown, field: string) => void, fields: Record<string, unknown[]>) => {
      for (const [field, values] of Object.entries(fields)) for (const v of values) {
        const bad = copy(sound) as Record<string, any>;
        edit(bad, v, field);
        expect(isGmBracketSave(bad, isClub), `${field} = ${JSON.stringify(v) ?? String(v)}`).toBe(false);
        expect(bracketProblems(NFL_BRACKET, bad as GmBracketSave, isClub).length).toBeGreaterThan(0);
        expect(repairGmBracket(NFL_BRACKET, bad, 2026, () => SEEDS, isClub).rebuilt).not.toBeNull();
        cases += 1;
      }
    };
    const put = (o: Record<string, any>, v: unknown, field: string) => { if (v === undefined) delete o[field]; else o[field] = v; };
    damaged((s, v, f) => put(s, v, f), outer);
    damaged((s, v, f) => put(s.played[0], v, f), tie);
    damaged((s, v, f) => put(s.played[0].games[0], v, f), game);
    expect(cases).toBe(5 + 4 + 6 + 8 + 7 + 4 + 6 + 6 + 6 + 9 + 9 + 5);
    /* the ceiling itself is a score: only what is above it is refused */
    const top = copy(sound);
    top.played[0].games[0].awayScore = GM_SCORE_CEILING;
    expect(isGmBracketSave(top, isClub)).toBe(true);
    for (const v of [undefined, null, 0, 'x', [], [sound], () => sound, thrower()]) expect(isGmBracketSave(v, isClub)).toBe(false);
    expect(isGmBracketSave(sound, () => { throw new Error('boom'); })).toBe(false);
    expect(isGmBracketSave(sound, (() => 1) as never)).toBe(false);
  });

  it('names what is wrong with a save that reads but does not replay', () => {
    const sound = played();
    const doctored: [string, (s: GmBracketSave) => void, RegExp][] = [
      ['another format', s => { s.format = 'nfl-12'; }, /format/],
      ['a seed short', s => { s.seeds.pop(); }, /seeds/],
      ['a tie that is not in the bracket', s => { s.played[0].id = 'AFC-WC-9'; }, /not a tie/],
      ['a tie played twice', s => { s.played.push(copy(s.played[0])); }, /twice/],
      ['a tie played out of turn', s => { s.played = s.played.filter(p => p.id !== 'NFC-WC-3'); }, /out of turn/],
      ['a later tie listed before the ties it draws from', s => { s.played.unshift(s.played.pop()!); }, /before its two sides were known/],
      ['a pairing that is not the one the seeds give', s => { [s.played[1].away, s.played[2].away] = [s.played[2].away, s.played[1].away]; }, /should be/],
      ['a tie with no game', s => { s.played[3].games = []; }, /no game/],
      ['a game after the tie was decided', s => { s.played[3].games.push(copy(s.played[3].games[0])); }, /after the tie was decided/],
      ['a winner on the lower score', s => { s.played[4].games[0].homeScore = 3; }, /lower score/],
      ['a level game', s => { s.played[4].games[0].awayScore = s.played[4].games[0].homeScore; }, /lower score/],
      ['a winner who is not in the game', s => { s.played[5].games[0].winner = 'S1'; }, /not in it/],
      ['a flipped winner', s => { const g = s.played[0]; g.games[0].winner = g.games[0].winner === g.home ? g.away : g.home; }, /lower score/],
    ];
    expect(bracketProblems(NFL_BRACKET, sound, isClub)).toEqual([]);
    for (const [name, edit, says] of doctored) {
      const bad = copy(sound);
      edit(bad);
      const problems = bracketProblems(NFL_BRACKET, bad, isClub);
      expect(problems.some(p => says.test(p)), `${name}: ${problems.join(' / ') || 'no problem named'}`).toBe(true);
      const fixed = repairGmBracket(NFL_BRACKET, bad, 2026, () => SEEDS.slice().reverse(), isClub);
      expect(fixed.save.played, name).toEqual([]);
      expect(fixed.problems.length, name).toBeGreaterThan(0);
      expect(bracketProblems(NFL_BRACKET, fixed.save, isClub), name).toEqual([]);
    }
  });

  it('hands a sound save back untouched, rebuilds from the same seeds when they still read, and from fresh ones when they do not', () => {
    const sound = played();
    let asked = 0;
    const fresh = () => { asked += 1; return SEEDS.slice().reverse(); };
    const kept = repairGmBracket(NFL_BRACKET, sound, 2026, fresh, isClub);
    expect(kept.save).toBe(sound);
    expect([kept.rebuilt, kept.line, kept.problems]).toEqual([null, null, []]);
    const bad = copy(sound);
    bad.played[0].games[0].winner = 'S14';
    const again = repairGmBracket(NFL_BRACKET, bad, 2026, fresh, isClub);
    expect([again.rebuilt, again.line]).toEqual(['seeds', BRACKET_REBUILT_LINES.seeds]);
    expect(again.save).toEqual(openBracket(NFL_BRACKET, 2026, SEEDS));
    expect(asked).toBe(0);
    const freshCases: [string, unknown, ((seeds: string[]) => boolean)?][] = [
      ['thirteen seeds', { ...copy(bad), seeds: SEEDS.slice(0, 13) }],
      ['a seed twice', { ...copy(bad), seeds: [...SEEDS.slice(0, 13), 'S1'] }],
      ['a seed that is not a club', { ...copy(bad), seeds: [...SEEDS.slice(0, 13), 'ZZZ'] }],
      ['another season', { ...copy(sound), season: 2025 }],
      ['seeds the league itself refuses', copy(bad), () => false],
      ['null', null], ['a number', 7], ['a word', 'x'], ['a list', []], ['an empty block', {}], ['a block that throws', thrower()],
    ];
    for (const [name, value, seedsOk] of freshCases) {
      const before = asked;
      const r = repairGmBracket(NFL_BRACKET, value, 2026, fresh, isClub, seedsOk);
      expect([r.rebuilt, r.line], name).toEqual(['fresh', BRACKET_REBUILT_LINES.fresh]);
      expect(r.save, name).toEqual(openBracket(NFL_BRACKET, 2026, SEEDS.slice().reverse()));
      expect(asked, name).toBe(before + 1);
    }
    for (const line of Object.values(BRACKET_REBUILT_LINES)) expect(line).not.toMatch(NOT_PLAIN);
  });

  it('asks the league about the seeds of a save that replays soundly, and starts again from fresh ones when it says no', () => {
    const fresh = () => SEEDS.slice().reverse();
    const sound = played();
    const seen: string[][] = [];
    const yes = repairGmBracket(NFL_BRACKET, sound, 2026, fresh, isClub, seeds => { seen.push(seeds); return true; });
    expect(yes.save).toBe(sound);
    expect(seen).toEqual([SEEDS]);
    expect(seen[0]).not.toBe(sound.seeds);
    /* a sound save with no fault of its own, and a league that refuses its seeds */
    const no = repairGmBracket(NFL_BRACKET, sound, 2026, fresh, isClub, () => false);
    expect([no.rebuilt, no.line]).toEqual(['fresh', BRACKET_REBUILT_LINES.fresh]);
    expect(no.problems.some(p => /does not accept the seeds/.test(p))).toBe(true);
    expect(no.save).toEqual(openBracket(NFL_BRACKET, 2026, fresh()));
    /* the block cannot know its seeds are the wrong clubs: an unplayed bracket with two seeds exchanged replays soundly, and only the league can tell */
    const swapped = openBracket(NFL_BRACKET, 2026, [SEEDS[13], ...SEEDS.slice(1, 13), SEEDS[0]]);
    expect(bracketProblems(NFL_BRACKET, swapped, isClub)).toEqual([]);
    const rightList = (seeds: string[]) => seeds.join() === fresh().join();
    expect(repairGmBracket(NFL_BRACKET, swapped, 2026, fresh, isClub, rightList).rebuilt).toBe('fresh');
    expect(repairGmBracket(NFL_BRACKET, openBracket(NFL_BRACKET, 2026, fresh()), 2026, fresh, isClub, rightList).rebuilt).toBeNull();
    /* a league whose check answers something that is not true is a refusal */
    expect(repairGmBracket(NFL_BRACKET, sound, 2026, fresh, isClub, (() => 1) as never).rebuilt).toBe('fresh');
  });

  it('answers a save with no block like a damaged one, which is why a board asks first whether the save is in its postseason', () => {
    const r = repairGmBracket(NFL_BRACKET, undefined, 2026, () => SEEDS, isClub);
    expect([r.rebuilt, r.line, r.problems]).toEqual(['fresh', BRACKET_REBUILT_LINES.fresh, ['the block does not read as a saved bracket']]);
    expect(isGmBracketSave(undefined, isClub)).toBe(false);
  });

  it('throws when the fresh seeds themselves do not open a bracket, and only then', () => {
    const sound = played();
    const badFresh: [string, string[]][] = [['thirteen seeds', SEEDS.slice(0, 13)], ['a seed twice', [...SEEDS.slice(0, 13), 'S1']], ['a seed that is not a club', [...SEEDS.slice(0, 13), 'ZZZ']], ['no seeds', []]];
    for (const [name, seeds] of badFresh) {
      expect(() => repairGmBracket(NFL_BRACKET, null, 2026, () => seeds, isClub), name).toThrow(/fresh seeds/);
      /* a sound save, and a damaged one whose own seeds still read, never ask for fresh ones */
      expect(repairGmBracket(NFL_BRACKET, sound, 2026, () => seeds, isClub).rebuilt, name).toBeNull();
      const bad = copy(sound);
      bad.played[0].games[0].winner = 'S14';
      expect(repairGmBracket(NFL_BRACKET, bad, 2026, () => seeds, isClub).rebuilt, name).toBe('seeds');
    }
  });
});

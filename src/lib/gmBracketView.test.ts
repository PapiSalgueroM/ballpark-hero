/* Round 1308: every word and number of the bracket card
   (src/lib/gmBracketView.ts). The six kinds of the place line, each on the
   NFL's real bracket data played by a made up chalk game; the club he meets
   named only once the bracket can name it; and no line that states a rule
   the engine does not play (who hosts, who goes through). The rows a card
   draws, for one game ties and for a best of seven. */
import { describe, expect, it } from 'vitest';
import { bracketPairings, openBracket, playBracketAll, playBracketGame, playBracketWeek, type BracketFormat, type GmBracketSave, type PlayTie } from '@/lib/gmBracket';
import { NFL_BRACKET } from '@/data/gmBrackets/nfl';
import { GM_BRACKET_LINES, gmBracketPlace, gmBracketRows, gmBracketWeeks, gmSeedText, gmSeriesNote, gmSideText } from '@/lib/gmBracketView';

const SEEDS = Array.from({ length: 14 }, (_, i) => `S${i + 1}`);
const name = (id: string) => `Club ${id}`;
/** The first slot wins 27 to 20, except the ties named, which the second slot wins 24 to 17. */
const chalk = (upsets: string[] = []): PlayTie => (home, away, tie) => (upsets.includes(tie.id) ? { homeScore: 17, awayScore: 24, winner: away } : { homeScore: 27, awayScore: 20, winner: home });
const open = (): GmBracketSave => openBracket(NFL_BRACKET, 2026, SEEDS);
const place = (save: GmBracketSave, club: string) => gmBracketPlace(NFL_BRACKET, save, club, name);
/** Curly quotation marks and the two dashes, by code so no tool rewrites them. */
const NOT_PLAIN = new RegExp('[' + [0x201c, 0x201d, 0x2013, 0x2014].map(c => String.fromCharCode(c)).join('') + ']');

describe('gmBracketPlace: the six kinds', () => {
  it('no playoffs: a club outside the seeds', () => {
    expect(place(open(), 'S15')).toEqual({ kind: 'missed', line: 'No playoffs this year.', tie: null });
  });

  it('the bye: the two top seeds sit out the Wild Card round, and only they', () => {
    for (const club of ['S1', 'S8']) expect(place(open(), club)).toEqual({ kind: 'bye', line: 'You have the bye.', tie: null });
    for (const club of SEEDS.filter(c => c !== 'S1' && c !== 'S8')) expect(place(open(), club).kind).toBe('next');
    /* the AFC's round is in, the NFC's is not: the week is still the Wild Card's, and the top seed still waits */
    const half = ['AFC-WC-1', 'AFC-WC-2', 'AFC-WC-3'].reduce((s, id) => playBracketGame(NFL_BRACKET, s, id, chalk()), open());
    expect(place(half, 'S1').kind).toBe('bye');
  });

  it('next: the round and the club he meets, named once the bracket names it', () => {
    expect(place(open(), 'S2')).toEqual({ kind: 'next', line: 'Next: the AFC Wild Card, against Club S7.', tie: 'AFC-WC-1' });
    expect(place(open(), 'S12')).toEqual({ kind: 'next', line: 'Next: the NFC Wild Card, against Club S11.', tie: 'NFC-WC-3' });
    const week1 = playBracketWeek(NFL_BRACKET, open(), chalk());
    /* chalk: 2, 3 and 4 come through, so the top seed meets the lowest seed left, 4 */
    expect(place(week1, 'S1')).toEqual({ kind: 'next', line: 'Next: the AFC Divisional, against Club S4.', tie: 'AFC-DIV-1' });
    const week3 = playBracketWeek(NFL_BRACKET, playBracketWeek(NFL_BRACKET, week1, chalk()), chalk());
    expect(place(week3, 'S8')).toEqual({ kind: 'next', line: 'Next: the Super Bowl, against Club S1.', tie: 'SB' });
  });

  it('next with no club named while the bracket cannot name the week', () => {
    /* a made up week whose second tie waits on its first: no pairing of that week can be named yet */
    const WAITS: BracketFormat = {
      id: 'test-waits', qualifiers: 3, winsNeeded: { 1: 1, 2: 1 },
      ties: [
        { id: 'A', week: 1, round: 'Opener', home: { seed: 1 }, away: { seed: 2 } },
        { id: 'B', week: 1, round: 'Play in', home: { seed: 3 }, away: { loserOf: 'A' } },
        { id: 'F', week: 2, round: 'Final', home: { winnerOf: 'A' }, away: { winnerOf: 'B' } },
      ],
    };
    const s = openBracket(WAITS, 2026, ['S1', 'S2', 'S3']);
    expect(bracketPairings(WAITS, s, 1)).toBeNull();
    expect(gmBracketPlace(WAITS, s, 'S3', name)).toEqual({ kind: 'next', line: 'Next: the Play in.', tie: 'B' });
  });

  it('through: his tie is won and the rest of the round is still to play', () => {
    const one = playBracketGame(NFL_BRACKET, open(), 'AFC-WC-1', chalk());
    expect(place(one, 'S2')).toEqual({ kind: 'through', line: 'Through. The rest of this round is still to play.', tie: 'AFC-WC-1' });
  });

  it('out: the round he went out in, his own conference\'s', () => {
    const week1 = playBracketWeek(NFL_BRACKET, open(), chalk(['NFC-WC-2']));
    expect(place(week1, 'S7')).toEqual({ kind: 'out', line: 'Out in the AFC Wild Card.', tie: 'AFC-WC-1' });
    expect(place(week1, 'S10')).toEqual({ kind: 'out', line: 'Out in the NFC Wild Card.', tie: 'NFC-WC-2' });
    /* beaten in the title tie: out too, said the way a fan says it */
    const done = playBracketAll(NFL_BRACKET, open(), chalk());
    expect(place(done, 'S8')).toEqual({ kind: 'out', line: 'Lost the Super Bowl.', tie: 'SB' });
    expect(place(playBracketAll(NFL_BRACKET, open(), chalk(['SB'])), 'S1')).toEqual({ kind: 'out', line: 'Lost the Super Bowl.', tie: 'SB' });
    /* beaten before it: the round's own name (chalk: 3 loses to 2 in the Divisional, 2 to 1 in the Championship) */
    expect(place(done, 'S3')).toEqual({ kind: 'out', line: 'Out in the AFC Divisional.', tie: 'AFC-DIV-2' });
    expect(place(done, 'S2')).toEqual({ kind: 'out', line: 'Out in the AFC Championship.', tie: 'AFC-CC' });
  });

  it('champions: the title tie is won', () => {
    expect(place(playBracketAll(NFL_BRACKET, open(), chalk()), 'S1')).toEqual({ kind: 'champion', line: 'Champions.', tie: 'SB' });
  });

  it('no line says who hosts or who goes through, and every line is plain text', () => {
    const states = [open(), playBracketGame(NFL_BRACKET, open(), 'AFC-WC-1', chalk()), playBracketWeek(NFL_BRACKET, open(), chalk(['AFC-WC-2'])), playBracketAll(NFL_BRACKET, open(), chalk(['SB']))];
    const kinds = new Set<string>();
    for (const s of states) for (const club of [...SEEDS, 'S15']) {
      const p = place(s, club);
      kinds.add(p.kind);
      expect(p.line, `${club}: ${p.line}`).not.toMatch(/\bhome\b|\bhost|\bat\b|\btop\b|\bgo(es)? through\b/i);
      expect(NOT_PLAIN.test(p.line)).toBe(false);
    }
    expect([...kinds].sort()).toEqual(['bye', 'champion', 'missed', 'next', 'out', 'through']);
    for (const l of [GM_BRACKET_LINES.bye, GM_BRACKET_LINES.through, GM_BRACKET_LINES.champion, GM_BRACKET_LINES.missed, GM_BRACKET_LINES.out('X'), GM_BRACKET_LINES.lostFinal('X'), GM_BRACKET_LINES.next('X', 'Y')]) expect(NOT_PLAIN.test(l)).toBe(false);
  });
});

describe('the rows and the weeks a card draws', () => {
  it('opens on the week to play next, and on the last once it is all played', () => {
    expect(gmBracketWeeks(NFL_BRACKET, open())).toEqual({ weeks: [1, 2, 3, 4], open: 1 });
    expect(gmBracketWeeks(NFL_BRACKET, playBracketWeek(NFL_BRACKET, open(), chalk())).open).toBe(2);
    expect(gmBracketWeeks(NFL_BRACKET, playBracketAll(NFL_BRACKET, open(), chalk())).open).toBe(4);
  });

  it('a one game tie: both clubs, the final once played, the winner, his tie, a club that is out', () => {
    const before = gmBracketRows(NFL_BRACKET, open(), 1, 'S2');
    expect(before.map(r => r.id)).toEqual(['AFC-WC-1', 'AFC-WC-2', 'AFC-WC-3', 'NFC-WC-1', 'NFC-WC-2', 'NFC-WC-3']);
    expect(before[0]).toMatchObject({ round: 'AFC Wild Card', series: false, played: 0, decided: false, mine: true });
    expect(before[0].sides.map(s => [s.club, s.score, gmSideText(before[0], 0)])).toEqual([['S2', null, ''], ['S7', null, '']]);
    expect(before.filter(r => r.mine).length).toBe(1);
    /* the Divisional before the Wild Card is in: the top seed is named, his opponent is not */
    const div = gmBracketRows(NFL_BRACKET, open(), 2, 'S1');
    expect(div[0].sides.map(s => s.club)).toEqual(['S1', null]);
    const after = gmBracketRows(NFL_BRACKET, playBracketWeek(NFL_BRACKET, open(), chalk(['AFC-WC-1'])), 1, 'S2');
    expect(after[0]).toMatchObject({ played: 1, decided: true, mine: true });
    expect(after[0].sides.map(s => [s.club, s.won, s.out])).toEqual([['S2', false, true], ['S7', true, false]]);
    expect([gmSideText(after[0], 0), gmSideText(after[0], 1)]).toEqual(['17', '24']);
    expect(gmSeriesNote(NFL_BRACKET, after[0], 1)).toBeNull();
    expect(gmBracketRows(NFL_BRACKET, playBracketAll(NFL_BRACKET, open(), chalk()), 4, 'S1')[0]).toMatchObject({ id: 'SB', neutral: true, decided: true });
  });

  it('a best of seven: the wins a side and where the series stands', () => {
    const SEVEN: BracketFormat = {
      id: 'test-seven', qualifiers: 4, winsNeeded: { 1: 4, 2: 4 },
      ties: [
        { id: 'A', week: 1, round: 'Semifinals', home: { seed: 1 }, away: { seed: 4 } },
        { id: 'B', week: 1, round: 'Semifinals', home: { seed: 2 }, away: { seed: 3 } },
        { id: 'F', week: 2, round: 'Final', home: { winnerOf: 'A' }, away: { winnerOf: 'B' } },
      ],
    };
    /* the first slot wins the odd games and the second the even ones: a series goes the distance */
    const alternate: PlayTie = (home, away, _tie, gameNo) => (gameNo % 2 ? { homeScore: 110, awayScore: 101, winner: home } : { homeScore: 99, awayScore: 104, winner: away });
    const s0 = openBracket(SEVEN, 2026, ['S1', 'S2', 'S3', 'S4']);
    const r0 = gmBracketRows(SEVEN, s0, 1, 'S1')[0];
    expect([gmSideText(r0, 0), gmSideText(r0, 1), gmSeriesNote(SEVEN, r0, 1)]).toEqual(['', '', 'First to 4 wins.']);
    const s3 = [1, 2, 3].reduce(s => playBracketGame(SEVEN, s, 'A', alternate), s0);
    const r3 = gmBracketRows(SEVEN, s3, 1, 'S1')[0];
    expect([r3.series, r3.played, gmSideText(r3, 0), gmSideText(r3, 1), gmSeriesNote(SEVEN, r3, 1)]).toEqual([true, 3, '2', '1', '3 played, first to 4 wins.']);
    const s7 = playBracketWeek(SEVEN, s3, alternate);
    const r7 = gmBracketRows(SEVEN, s7, 1, 'S1')[0];
    expect([r7.decided, gmSideText(r7, 0), gmSideText(r7, 1), gmSeriesNote(SEVEN, r7, 1), r7.sides[0].won]).toEqual([true, '4', '3', 'Over in 7 games.', true]);
  });

  it('a seed is printed as the sport numbers it, and nothing for no seed', () => {
    expect(gmSeedText(1)).toBe('1');
    expect(gmSeedText(null)).toBe('');
  });
});

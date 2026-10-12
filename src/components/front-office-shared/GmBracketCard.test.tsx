/**
 * Round 1308: the bracket card, face by face (src/components/front-office-
 * shared/GmBracketCard.tsx, bound for the NFL in src/components/front-office/
 * NflBracket.tsx). Nothing mounts it yet; Round 1309's walk draws it at 320,
 * 390 and 1280. What jsdom can hold is held here:
 *   - every face (next, a bye, through, out, champions, no playoffs) fills
 *     the same box the same way: the same root classes, one named scroller;
 *   - every control is 44 px by its class, no text is under 12 px, and the
 *     card holds no press button (Play, Watch and Sim are the board's);
 *   - "Your game" only on a decided tie of his, and it tells the board which;
 *   - the week chips list a week and play nothing; the "?" opens, closes and
 *     opens again, over the host it is handed;
 *   - the NFL's seeds count from 1 in each conference and its weeks are the
 *     ledger's names; a best of seven shows the wins of each side.
 */
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, fireEvent, cleanup, within } from '@testing-library/react';
import { GmBracketCard, scrollToShow } from './GmBracketCard';
import NflBracket, { nflSeedOf, nflWeekLabel } from '@/components/front-office/NflBracket';
import { openBracket, playBracketAll, playBracketGame, playBracketWeek, type BracketFormat, type GmBracketSave, type PlayTie } from '@/lib/gmBracket';
import { gmBracketPlace } from '@/lib/gmBracketView';
import type { GmBracketMount } from '@/lib/gmPostseason';
import { NFL_BRACKET } from '@/data/gmBrackets/nfl';
import { NFL_BRACKET_HELP } from '@/data/gmBrackets/nflHelp';
import { usPostseasonRounds } from '@/data/usPostseasonFormat';

const SEEDS = Array.from({ length: 14 }, (_, i) => `S${i + 1}`);
const name = (id: string) => `Club ${id}`;
const chalk = (upsets: string[] = []): PlayTie => (home, away, tie) => (upsets.includes(tie.id) ? { homeScore: 17, awayScore: 24, winner: away } : { homeScore: 27, awayScore: 20, winner: home });
const open = (): GmBracketSave => openBracket(NFL_BRACKET, 2026, SEEDS);
const mount = (save: GmBracketSave, my: string, patch: Partial<GmBracketMount> = {}): GmBracketMount => ({ format: NFL_BRACKET, save, my, name, onOpenGame: () => undefined, helpHost: null, ...patch });
const q = (sel: string) => document.querySelector(sel);
const qa = (sel: string) => Array.from(document.querySelectorAll(sel));

/** The six faces, each a save and his club. */
const FACES: [string, GmBracketSave, string][] = [
  ['next', open(), 'S2'],
  ['bye', open(), 'S1'],
  ['through', playBracketGame(NFL_BRACKET, open(), 'AFC-WC-1', chalk()), 'S2'],
  ['out', playBracketWeek(NFL_BRACKET, open(), chalk()), 'S7'],
  ['champion', playBracketAll(NFL_BRACKET, open(), chalk()), 'S1'],
  ['missed', open(), 'S15'],
];

afterEach(() => { cleanup(); });

describe('GmBracketCard', () => {
  it('every face fills the same box the same way, with one named scroller and the place line the view lib decides', () => {
    const roots = new Set<string>();
    for (const [kind, save, my] of FACES) {
      render(<NflBracket {...mount(save, my)} />);
      const root = q('[data-bracket]') as HTMLElement;
      expect(root.getAttribute('data-bracket-face'), kind).toBe(kind);
      roots.add(root.className);
      expect(root.className).toContain('h-full');
      expect(qa('[data-bracket-scroll]').length, kind).toBe(1);
      expect(q('[data-bracket-place]')!.textContent).toBe(gmBracketPlace(NFL_BRACKET, save, my, name).line);
      cleanup();
    }
    expect(roots.size).toBe(1);
  });

  it('every control is 44 px by its class, no text is under 12 px, and no button plays, watches or sims', () => {
    for (const [kind, save, my] of FACES) {
      render(<NflBracket {...mount(save, my)} />);
      fireEvent.click(q('[data-bracket-help]')!);
      const buttons = qa('button');
      expect(buttons.length, kind).toBeGreaterThanOrEqual(5);
      for (const b of buttons) {
        expect(b.className, `${kind}: ${b.textContent}`).toMatch(/\bh-11\b/);
        expect(b.textContent ?? '', kind).not.toMatch(/\b(play|watch|sim)\b/i);
      }
      for (const el of qa('[data-bracket] *')) expect((el as HTMLElement).className || '', kind).not.toMatch(/text-\[/);
      cleanup();
    }
  });

  it('"Your game" only on a decided tie of his, and it tells the board which tie', () => {
    const asked = vi.fn();
    const save = playBracketWeek(NFL_BRACKET, open(), chalk(['AFC-WC-1']));
    render(<NflBracket {...mount(save, 'S2', { onOpenGame: asked })} />);
    /* the card opens on the week to play next, where his club has no tie: no "Your game" there */
    expect(qa('[data-bracket-open]').length).toBe(0);
    fireEvent.click(q('[data-bracket-week="1"]')!);
    expect(qa('[data-bracket-open]').map(b => b.getAttribute('data-bracket-open'))).toEqual(['AFC-WC-1']);
    fireEvent.click(q('[data-bracket-open]')!);
    expect(asked).toHaveBeenCalledWith('AFC-WC-1');
    cleanup();
    render(<NflBracket {...mount(open(), 'S2')} />);
    expect(qa('[data-bracket-open]').length).toBe(0);
  });

  it('the week chips list a week and play nothing', () => {
    const save = playBracketWeek(NFL_BRACKET, open(), chalk());
    const before = JSON.stringify(save);
    render(<NflBracket {...mount(save, 'S1')} />);
    expect(qa('[data-bracket-week]').map(b => b.textContent)).toEqual(usPostseasonRounds('nfl').map(r => r.name));
    expect(q('[data-bracket-week="2"]')!.getAttribute('aria-pressed')).toBe('true');
    expect(qa('[data-bracket-tie]').map(t => t.getAttribute('data-bracket-tie'))).toEqual(['AFC-DIV-1', 'AFC-DIV-2', 'NFC-DIV-1', 'NFC-DIV-2']);
    fireEvent.click(q('[data-bracket-week="1"]')!);
    expect(q('[data-bracket-week="1"]')!.getAttribute('aria-pressed')).toBe('true');
    expect(qa('[data-bracket-tie]').length).toBe(6);
    expect(qa('[data-bracket-tie] [data-won="true"]').length).toBe(6);
    expect(JSON.stringify(save)).toBe(before);
    fireEvent.click(q('[data-bracket-week="3"]')!);
    expect(qa('[data-bracket-tie]').map(t => t.textContent).join(' ')).toContain('To be decided');
  });

  it('a week he looked back at gives way to the new week once the bracket moves on', () => {
    const week1 = playBracketWeek(NFL_BRACKET, open(), chalk());
    const { rerender } = render(<NflBracket {...mount(week1, 'S1')} />);
    fireEvent.click(q('[data-bracket-week="1"]')!);
    expect(q('[data-bracket-week="1"]')!.getAttribute('aria-pressed')).toBe('true');
    /* the same save drawn again keeps his choice; the next round played opens the week after it */
    rerender(<NflBracket {...mount(JSON.parse(JSON.stringify(week1)), 'S1')} />);
    expect(q('[data-bracket-week="1"]')!.getAttribute('aria-pressed')).toBe('true');
    rerender(<NflBracket {...mount(playBracketWeek(NFL_BRACKET, week1, chalk()), 'S1')} />);
    expect(q('[data-bracket-week="3"]')!.getAttribute('aria-pressed')).toBe('true');
    expect(q('[data-bracket-place]')!.textContent).toBe('Next: the AFC Championship, against Club S2.');
  });

  it('a week he looked back at is not carried onto another bracket whose week to play is the same', () => {
    const week1 = playBracketWeek(NFL_BRACKET, open(), chalk());
    const { rerender } = render(<NflBracket {...mount(week1, 'S1')} />);
    fireEvent.click(q('[data-bracket-week="1"]')!);
    expect(q('[data-bracket-week="1"]')!.getAttribute('aria-pressed')).toBe('true');
    /* the next season's bracket, also at its Divisional, on the same mounted card: it opens on its own week to play */
    rerender(<NflBracket {...mount(playBracketWeek(NFL_BRACKET, openBracket(NFL_BRACKET, 2027, SEEDS), chalk()), 'S1')} />);
    expect(q('[data-bracket-week="2"]')!.getAttribute('aria-pressed')).toBe('true');
    /* and a bracket of other seeds in the same season */
    fireEvent.click(q('[data-bracket-week="1"]')!);
    rerender(<NflBracket {...mount(playBracketWeek(NFL_BRACKET, openBracket(NFL_BRACKET, 2027, [...SEEDS].reverse()), chalk()), 'S1')} />);
    expect(q('[data-bracket-week="2"]')!.getAttribute('aria-pressed')).toBe('true');
  });

  it('his chip and his tie are brought into view by the card\'s own scrollers, moved as little as they can be', () => {
    /* the arithmetic the card uses for its chip row and its tie list (jsdom lays nothing out; the browser walk measures it) */
    expect(scrollToShow(0, 100, 20, 30)).toBe(0);
    expect(scrollToShow(0, 100, 150, 30)).toBe(80);
    expect(scrollToShow(120, 100, 40, 30)).toBe(40);
    expect(scrollToShow(0, 100, 50, 140)).toBe(50);
    expect(scrollToShow(60, 100, 100, 50)).toBe(60);
  });

  it('the "?" opens, closes and opens again, over the host it is handed', () => {
    const host = document.createElement('div');
    document.body.appendChild(host);
    render(<NflBracket {...mount(open(), 'S2', { helpHost: host })} />);
    const openHelp = () => fireEvent.click(q('[data-bracket-help]')!);
    openHelp();
    const sheet = host.querySelector('[data-season-help]') as HTMLElement;
    expect(sheet).not.toBeNull();
    expect(sheet.textContent).toContain(NFL_BRACKET_HELP.examples[0].body);
    expect(q('[data-bracket] [data-season-help]')).toBeNull();
    fireEvent.click(within(sheet).getByText('Got it'));
    expect(host.querySelector('[data-season-help]')).toBeNull();
    openHelp();
    expect(host.querySelector('[data-season-help]')).not.toBeNull();
    host.remove();
  });

  it('the NFL counts its seeds from 1 in each conference and names its weeks from the ledger', () => {
    expect(nflSeedOf(SEEDS, 'S1')).toBe(1);
    expect(nflSeedOf(SEEDS, 'S7')).toBe(7);
    expect(nflSeedOf(SEEDS, 'S8')).toBe(1);
    expect(nflSeedOf(SEEDS, 'S14')).toBe(7);
    expect(nflSeedOf(SEEDS, 'S15')).toBeNull();
    expect([1, 2, 3, 4].map(nflWeekLabel)).toEqual(['Wild Card', 'Divisional', 'Conference Championship', 'Super Bowl']);
    render(<NflBracket {...mount(open(), 'S12')} />);
    const nfc = q('[data-bracket-tie="NFC-WC-3"]') as HTMLElement;
    expect(Array.from(nfc.querySelectorAll('[data-bracket-seed]')).map(s => s.textContent)).toEqual(['4', '5']);
    expect(nfc.getAttribute('data-bracket-mine')).toBe('true');
  });

  it('a best of seven shows the wins of each side, so the other front offices mount it unchanged', () => {
    const SEVEN: BracketFormat = {
      id: 'test-seven', qualifiers: 4, winsNeeded: { 1: 4, 2: 4 },
      ties: [
        { id: 'A', week: 1, round: 'Semifinals', home: { seed: 1 }, away: { seed: 4 } },
        { id: 'B', week: 1, round: 'Semifinals', home: { seed: 2 }, away: { seed: 3 } },
        { id: 'F', week: 2, round: 'Final', home: { winnerOf: 'A' }, away: { winnerOf: 'B' } },
      ],
    };
    const alternate: PlayTie = (home, away, _tie, gameNo) => (gameNo % 2 ? { homeScore: 110, awayScore: 101, winner: home } : { homeScore: 99, awayScore: 104, winner: away });
    const save = [1, 2, 3, 4, 5].reduce(s => playBracketGame(SEVEN, s, 'A', alternate), openBracket(SEVEN, 2026, ['S1', 'S2', 'S3', 'S4']));
    render(<GmBracketCard format={SEVEN} save={save} my="S1" name={name} onOpenGame={() => undefined} helpHost={null} help={NFL_BRACKET_HELP} seedOf={c => Number(c.slice(1))} weekLabel={w => (w === 1 ? 'Semifinals' : 'Final')} />);
    const a = q('[data-bracket-tie="A"]') as HTMLElement;
    expect(Array.from(a.querySelectorAll('[data-bracket-score]')).map(s => s.textContent)).toEqual(['3', '2']);
    expect(a.querySelector('[data-bracket-series]')!.textContent).toBe('5 played, first to 4 wins.');
    expect(q('[data-bracket-place]')!.textContent).toBe('Next: the Semifinals, against Club S4.');
  });

  it('the play in and best of seven rounds of src/lib/gmBracket.test.ts: losing the first play in game is not going out', () => {
    /* PLAY_IN as src/lib/gmBracket.test.ts writes it (a test file exports nothing, so it is typed again here) */
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
    const alternate: PlayTie = (home, away, _tie, gameNo) => (gameNo % 2 ? { homeScore: 110, awayScore: 101, winner: home } : { homeScore: 99, awayScore: 104, winner: away });
    const ten = SEEDS.slice(0, 10);
    const s0 = openBracket(PLAY_IN, 2026, ten);
    const week1 = playBracketWeek(PLAY_IN, s0, alternate);
    expect(gmBracketPlace(PLAY_IN, s0, 'S1', name).kind).toBe('bye');
    expect(gmBracketPlace(PLAY_IN, week1, 'S8', name)).toEqual({ kind: 'next', line: 'Next: the Play in, against Club S9.', tie: 'PI-8' });
    expect(gmBracketPlace(PLAY_IN, week1, 'S10', name)).toEqual({ kind: 'out', line: 'Out in the Play in.', tie: 'PI-910' });
    /* beaten twice in the play in (by 7, then by 9): the tie he went out in is the LAST he lost, not the first */
    const twice = playBracketWeek(PLAY_IN, week1, (home, away, tie) => (tie.id === 'PI-8' ? { homeScore: 99, awayScore: 104, winner: away } : { homeScore: 110, awayScore: 101, winner: home }));
    expect(gmBracketPlace(PLAY_IN, twice, 'S8', name)).toEqual({ kind: 'out', line: 'Out in the Play in.', tie: 'PI-8' });
    const week2 = playBracketWeek(PLAY_IN, week1, alternate);
    const three = [1, 2, 3].reduce(s => playBracketGame(PLAY_IN, s, 'R1-A', alternate), week2);
    const props = { format: PLAY_IN, save: three, my: 'S1', name, onOpenGame: () => undefined, helpHost: null, help: NFL_BRACKET_HELP, seedOf: (c: string) => Number(c.slice(1)), weekLabel: (w: number) => ['Play in', 'Play in', 'First round', 'Semifinals', 'Final'][w - 1] };
    render(<GmBracketCard {...props} />);
    expect(qa('[data-bracket-week]').length).toBe(5);
    const a = q('[data-bracket-tie="R1-A"]') as HTMLElement;
    expect(Array.from(a.querySelectorAll('[data-bracket-score]')).map(s => s.textContent)).toEqual(['2', '1']);
    expect(Array.from(a.querySelectorAll('[data-bracket-side]')).map(s => s.textContent)).toEqual(['1Club S12', '8Club S81']);
    expect(a.querySelector('[data-bracket-series]')!.textContent).toBe('3 played, first to 4 wins.');
    expect(q('[data-bracket-scroll]')).not.toBeNull();
  });
});

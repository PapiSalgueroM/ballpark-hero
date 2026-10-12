/**
 * Round 1307: the Game Day tile, face by face, on real told finals.
 *
 * The finals are the quick path's own (the NFL score law, keyed), so the
 * card is tested on what a board really saves. What the card prints is
 * compared with src/lib/gmGameDayView.ts (whose own test holds it to the
 * law), and the rules of the tile are asked directly:
 *   - nothing of a result is in the box while a game is watched;
 *   - Results goes straight to the final and tells the board once;
 *   - reduced motion and a final the law will not tell have no clock;
 *   - a chip opens its game on the same box; the "?" opens, closes and
 *     opens again, over the host it is handed and not over the box.
 */
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup, waitFor, within } from '@testing-library/react';
import { useState } from 'react';
import { GmGameDayCard } from './GmGameDayCard';
import NflGameDay, { nflWhereLabel } from '@/components/front-office/NflGameDay';
import { gameDayView, standingLine } from '@/lib/gmGameDayView';
import { makeGmLastGame, quickGame, type GmLastGame } from '@/lib/gmGameScore';
import { NFL_SCORE_LAW } from '@/lib/gameLaws/nflScore';
import { NFL_GAME_DAY, NFL_GAME_DAY_HELP, NFL_MAX_SCORE } from '@/lib/gameLaws/nflGameDay';
import type { GmGameDayMount } from '@/lib/gmGameLog';

const NAMES: Record<string, string> = { SEA: 'Seahawks', ARI: 'Cardinals', TEN: 'Titans' };
const name = (id: string) => NAMES[id] ?? id;
const short = (id: string) => id;

/** Three told games of SEA's season: weeks 1 to 3, home, away, home. */
function season(): GmLastGame[] {
  const out: GmLastGame[] = [];
  const fixtures: [string, string, boolean][] = [['SEA', 'ARI', true], ['TEN', 'SEA', true], ['SEA', 'TEN', false]];
  fixtures.forEach(([home, away, homeWon], i) => {
    const told = quickGame(NFL_SCORE_LAW, { key: `2026|w${i + 1}|${home}|${away}|card`, home, away, decided: { homeWon, pHome: 0.5 } });
    out.push(makeGmLastGame(told!, `w${i + 1}`)!);
  });
  return out;
}
const LOG = season();
const STANDING = { table: 'NFC', seed: 3, seeds: 7 };
const base = (patch: Partial<GmGameDayMount> = {}): GmGameDayMount => ({
  log: LOG, my: 'SEA', name, short, next: { label: 'Titans', home: false }, mode: 'result', onWatched: () => undefined, standing: STANDING, helpHost: null, ...patch,
});
const finalText = (g: GmLastGame, club = 'SEA') => {
  const v = gameDayView(NFL_GAME_DAY, g, club, name);
  return `${v.us} ${v.final.us}, ${v.them} ${v.final.them}`;
};
const q = (sel: string) => document.querySelector(sel);
const reduce = (on: boolean) => { (window as unknown as { matchMedia: unknown }).matchMedia = (query: string) => ({ matches: on && /reduce/.test(query), media: query, addEventListener: () => undefined, removeEventListener: () => undefined, addListener: () => undefined, removeListener: () => undefined }); };

/** The card under a host that does what a board does: `watch` until the card says the watch is over. */
function Host({ start, watched, patch }: { start: 'result' | 'watch'; watched: () => void; patch?: Partial<GmGameDayMount> }) {
  const [mode, setMode] = useState(start);
  return <NflGameDay {...base({ mode, onWatched: () => { watched(); setMode('result'); }, ...patch })} />;
}

afterEach(() => { cleanup(); reduce(false); });

describe('GmGameDayCard', () => {
  it('nothing told yet: the next game in the board\'s words, and no result', () => {
    render(<NflGameDay {...base({ log: [] })} />);
    expect(q('[data-gameday]')!.getAttribute('data-gameday-face')).toBe('next');
    expect(q('[data-gameday-next]')!.textContent).toBe('Next up: at Titans.');
    expect(q('[data-gameday-final]')).toBeNull();
    cleanup();
    render(<NflGameDay {...base({ log: [], next: null })} />);
    expect(q('[data-gameday-next]')!.textContent).toBe('No game for you this week.');
  });

  it('the result face prints the last game as the view lib decides it', () => {
    render(<NflGameDay {...base()} />);
    const last = LOG[2];
    const v = gameDayView(NFL_GAME_DAY, last, 'SEA', name);
    expect(q('[data-gameday]')!.getAttribute('data-gameday-face')).toBe('result');
    expect(q('[data-gameday-final]')!.textContent).toBe(`${v.won ? 'W' : 'L'}${finalText(last)}`);
    expect(q('[data-gameday-where]')!.textContent).toBe('Wk 3 · vs TEN');
    const cells = (side: string) => [...document.querySelectorAll(`[data-line-row="${side}"] td`)].map(td => td.textContent);
    expect(cells('us')).toEqual(['Seahawks', ...v.line!.us.map(String), String(v.final.us)]);
    expect(cells('them')).toEqual(['Titans', ...v.line!.them.map(String), String(v.final.them)]);
    expect(q('[data-gameday-shape]')!.textContent).toBe(v.shape);
    const rows = [...document.querySelectorAll('[data-deciding] li')];
    expect(rows.map(li => li.textContent)).toEqual(v.deciding.map(p => `${p.clock}${p.text}${p.after}`));
    expect(rows.filter(li => li.getAttribute('data-decided') === 'true').length).toBe(1);
    expect(q('[data-gameday-standing]')!.textContent).toBe(standingLine(STANDING));
    /* the season so far: one chip a told game, each under its own week, the open one pressed */
    const chips = [...document.querySelectorAll('[data-gameday-chip]')];
    expect(chips.map(c => c.getAttribute('data-gameday-chip'))).toEqual(['w1', 'w2', 'w3']);
    expect(chips.map(c => c.getAttribute('aria-pressed'))).toEqual(['false', 'false', 'true']);
    expect(chips[0].textContent).toMatch(/^Wk 1[WL] \d+-\d+$/);
    /* the story is the one part that scrolls, and it holds the sentence and the plays */
    const scroller = q('[data-gameday-scroll]')!;
    expect(scroller.className).toContain('overflow-y-auto');
    expect(scroller.contains(q('[data-gameday-shape]'))).toBe(true);
    expect(scroller.contains(q('[data-deciding]'))).toBe(true);
  });

  it('a chip opens its game on the same box', () => {
    render(<NflGameDay {...base()} />);
    const root = q('[data-gameday]')!;
    const before = root.className;
    fireEvent.click(document.querySelector('[data-gameday-chip="w1"]')!);
    expect(q('[data-gameday-final]')!.textContent).toContain(finalText(LOG[0]));
    expect(q('[data-gameday-where]')!.textContent).toBe('Wk 1 · vs ARI');
    expect([...document.querySelectorAll('[data-gameday-chip]')].map(c => c.getAttribute('aria-pressed'))).toEqual(['true', 'false', 'false']);
    fireEvent.click(document.querySelector('[data-gameday-chip="w2"]')!);
    expect(q('[data-gameday-where]')!.textContent).toBe('Wk 2 · at TEN');
    expect(q('[data-gameday]')).toBe(root);
    expect(root.className).toBe(before);
    expect(root.getAttribute('style')).toBeNull();
  });

  it('while a game is watched nothing of its result is in the box; Results tells the board once and shows it', async () => {
    const watched = vi.fn();
    render(<Host start="watch" watched={watched} />);
    const root = q('[data-gameday]')!;
    expect(root.getAttribute('data-gameday-face')).toBe('watch');
    expect(q('[data-match-clock]')).not.toBeNull();
    expect(q('[data-score-bug]')!.textContent).toBe('0-0');
    for (const sel of ['[data-gameday-final]', '[data-line-score]', '[data-gameday-scroll]', '[data-gameday-standing]', '[data-gameday-chips]', '[data-gameday-again]']) expect(q(sel)).toBeNull();
    const v = gameDayView(NFL_GAME_DAY, LOG[2], 'SEA', name);
    expect(root.textContent).not.toContain(`${v.final.us}, `);
    expect(root.textContent).not.toContain(v.shape!);
    expect(watched).not.toHaveBeenCalled();
    fireEvent.click(q('[data-gameday-speed="Results"]')!);
    await waitFor(() => expect(watched).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(q('[data-gameday]')!.getAttribute('data-gameday-face')).toBe('result'));
    expect(q('[data-match-clock]')).toBeNull();
    expect(q('[data-gameday-final]')!.textContent).toContain(finalText(LOG[2]));
    expect(watched).toHaveBeenCalledTimes(1);
  });

  it('the "?" opened in the middle of a watch stops the clock, and closing it lets the game run on', async () => {
    const watched = vi.fn();
    render(<Host start="watch" watched={watched} />);
    const minute = () => Number(q('[data-match-clock]')!.getAttribute('data-minute'));
    const wait = (ms: number) => new Promise(r => setTimeout(r, ms));
    fireEvent.click(q('[data-gameday-speed="3x"]')!);
    /* the clock is really running: a game is five seconds at 3x, so 300 ms is minutes of it. Every reading here
       is one minute against another a moment later, never a minute against zero. */
    await wait(120);
    const a = minute();
    await wait(300);
    expect(minute(), 'the clock runs before the "?" is opened').toBeGreaterThan(a);
    fireEvent.click(q('[data-gameday-help]')!);
    expect(q('[data-season-help]')).not.toBeNull();
    await wait(60);
    const at = minute();
    /* 700 ms is a seventh of the game at 3x: a clock that ran behind the sheet has moved by minutes */
    await wait(700);
    expect(q('[data-match-clock]'), 'the game is still on the clock behind the sheet').not.toBeNull();
    expect(minute(), 'the clock while the "?" is open').toBe(at);
    expect(watched).not.toHaveBeenCalled();
    fireEvent.click(within(q('[data-season-help]') as HTMLElement).getByText('Got it'));
    expect(q('[data-season-help]')).toBeNull();
    await wait(120);
    const c = minute();
    await wait(300);
    expect(minute(), 'the clock runs on once the "?" is closed').toBeGreaterThan(c);
    expect(watched).not.toHaveBeenCalled();
  });

  it('the line under the next fixture is the board\'s when it hands one', () => {
    render(<NflGameDay {...base({ log: [] })} />);
    expect(q('[data-gameday-next-note]')!.textContent).toBe('Play it or watch it. Your result lands here.');
    cleanup();
    render(<NflGameDay {...base({ log: [], nextNote: 'No Watch on this one.' })} />);
    expect(q('[data-gameday-next]')!.textContent).toBe('Next up: at Titans.');
    expect(q('[data-gameday-next-note]')!.textContent).toBe('No Watch on this one.');
    expect(q('[data-gameday]')!.textContent).not.toContain('watch it');
  });

  it('Watch again runs the clock on the open game and comes back without telling the board', async () => {
    const watched = vi.fn();
    render(<Host start="result" watched={watched} />);
    fireEvent.click(document.querySelector('[data-gameday-chip="w1"]')!);
    fireEvent.click(q('[data-gameday-again]')!);
    expect(q('[data-gameday]')!.getAttribute('data-gameday-face')).toBe('watch');
    expect(q('[data-gameday-final]')).toBeNull();
    expect(q('[data-gameday-where]')!.textContent).toBe('Wk 1 · vs ARI');
    fireEvent.click(q('[data-gameday-speed="Results"]')!);
    await waitFor(() => expect(q('[data-gameday]')!.getAttribute('data-gameday-face')).toBe('result'));
    expect(q('[data-gameday-final]')!.textContent).toContain(finalText(LOG[0]));
    expect(watched).not.toHaveBeenCalled();
  });

  it('reduced motion: a watch shows the result at once, with no clock and no Watch again', async () => {
    reduce(true);
    const watched = vi.fn();
    render(<Host start="watch" watched={watched} />);
    expect(q('[data-match-clock]')).toBeNull();
    await waitFor(() => expect(watched).toHaveBeenCalledTimes(1));
    expect(q('[data-gameday]')!.getAttribute('data-gameday-face')).toBe('result');
    expect(q('[data-gameday-final]')!.textContent).toContain(finalText(LOG[2]));
    expect(q('[data-gameday-again]')).toBeNull();
    expect(q('[data-match-clock]')).toBeNull();
  });

  it('a final the law will not tell shows the final alone, and a watch of it is over at once', async () => {
    const over: GmLastGame = { v: 1, key: 'over', where: 'w4', home: 'SEA', away: 'ARI', homeScore: NFL_MAX_SCORE + 1, awayScore: 10, winner: 'SEA' };
    const watched = vi.fn();
    render(<Host start="watch" watched={watched} patch={{ log: [...LOG, over] }} />);
    await waitFor(() => expect(watched).toHaveBeenCalledTimes(1));
    expect(q('[data-gameday-final]')!.textContent).toBe(`WSEA ${NFL_MAX_SCORE + 1}, ARI 10`);
    for (const sel of ['[data-line-score]', '[data-gameday-shape]', '[data-deciding]', '[data-gameday-again]', '[data-match-clock]']) expect(q(sel)).toBeNull();
    expect(document.querySelectorAll('[data-gameday-chip]').length).toBe(4);
  });

  it('the "?" opens over the host it is handed, closes, and opens again', () => {
    const host = document.createElement('div');
    document.body.appendChild(host);
    render(<NflGameDay {...base({ helpHost: host })} />);
    const open = () => fireEvent.click(q('[data-gameday-help]')!);
    open();
    const sheet = host.querySelector('[data-season-help]') as HTMLElement;
    expect(sheet).not.toBeNull();
    expect(q('[data-gameday]')!.contains(sheet)).toBe(false);
    expect(within(sheet).getByText(NFL_GAME_DAY_HELP.title)).toBeTruthy();
    for (const p of NFL_GAME_DAY_HELP.intro) expect(sheet.textContent).toContain(p);
    expect(sheet.textContent).toContain(NFL_GAME_DAY_HELP.examples[0].body);
    fireEvent.click(within(sheet).getByText('Got it'));
    expect(host.querySelector('[data-season-help]')).toBeNull();
    open();
    expect(host.querySelector('[data-season-help]')).not.toBeNull();
    host.remove();
  });

  it('with no host the sheet is drawn in the box, and every face keeps the "?"', () => {
    render(<GmGameDayCard {...base({ log: [] })} law={NFL_GAME_DAY} help={NFL_GAME_DAY_HELP} whereLabel={nflWhereLabel} />);
    fireEvent.click(q('[data-gameday-help]')!);
    expect(q('[data-gameday] [data-season-help]')).not.toBeNull();
    cleanup();
    render(<Host start="watch" watched={() => undefined} />);
    expect(q('[data-gameday-help]')).not.toBeNull();
    expect(screen.getByLabelText('How Game Day works')).toBeTruthy();
  });

  it('nflWhereLabel: a week reads as a week and a round keeps its name', () => {
    expect(nflWhereLabel('w6')).toBe('Wk 6');
    expect(nflWhereLabel('w17')).toBe('Wk 17');
    expect(nflWhereLabel('AFC Wild Card')).toBe('AFC Wild Card');
  });
});

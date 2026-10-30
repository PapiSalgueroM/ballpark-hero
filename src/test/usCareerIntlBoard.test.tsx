/**
 * Round 1544: the national team's call on the one US career board, through the
 * real NBA binding (brief-1541 3.7 with the bar at 87).
 *
 * WHAT THIS HOLDS:
 *   1. A throwback save just after the season labelled 2003, rated 90, opens on
 *      the call for the 2004 Olympics: a holding box first, the card once the
 *      face has loaded, in the same container (no new screen, so no scroll).
 *      Go writes the summer's row with the phase the save had, shows the
 *      result with Your games and The bracket (each with Back), and Continue
 *      goes to the hub. A reload asks nothing more and shows no result.
 *   2. Rest writes { year, edition, went: false } and nothing else.
 *   3. Rated 80 after 2003: no call. After the season labelled 2004 (summer
 *      2005, no edition): no call, and nothing international loads.
 *   4. Played on the board: the season labelled 2005 at 95 ends on the gate's
 *      curtain line, the summer is dealt at the press, the call comes after the
 *      curtain and before the summer's card, and answering it leaves the dealt
 *      cards exactly as they were (never dealt, redrawn or reordered).
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

vi.mock('@/lib/completions', () => ({ recordCompletion: vi.fn(), recordActivity: vi.fn(), getCurrentPlayerName: () => 'Tester' }));
vi.mock('@/lib/badges', () => ({ getNewlyEarnedBadges: () => Promise.resolve([]) }));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: null, profile: null, refreshProfile: () => undefined }) }));
vi.mock('sonner', () => ({ toast: { success: () => undefined } }));

import UsCareerBoard from '@/components/us-career/UsCareerBoard';
import { NBA_CAREER_SPORT } from '@/lib/nbaCareerSport';
import { NBA_INTL_CURTAIN_LINE } from '@/lib/nbaCareerIntlGate';
import { defaultAppearance } from '@/lib/soccerCareerAppearance';
import type { UsCareerCore } from '@/lib/usCareerSport';

const sport = NBA_CAREER_SPORT;

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** A throwback career after `seasons` seasons (the first is labelled 2003), its last season rated `ovr`. */
function throwback(seasons: number, ovr: number): { c: UsCareerCore; tq: number } {
  const rng = mulberry32(1544);
  const pos = 'SF';
  const c = sport.startCareer('Intl Tester', pos, sport.create.archetypes[pos][0], rng, defaultAppearance(), 'y2004');
  let tq = sport.rollTeamQuality(null, rng);
  sport.assignRole(c, tq, rng);
  for (let y = 0; y < seasons; y += 1) {
    sport.campBattle(c, tq, rng);
    sport.simSeason(c, tq, rng);
    sport.progress(c, rng);
    tq = sport.rollTeamQuality(tq, rng);
  }
  const line = c.seasons[c.seasons.length - 1];
  line.ovr = ovr;
  line.teamResult = line.teamResult === 'SUSPENDED' ? 'Missed the playoffs' : line.teamResult;
  Object.assign(c, { ovr, age: 24, health: 90, retired: false, suspendedSeasons: 0, contractYears: 3, pendingRivalryEvent: null, pendingRivalryChoice: null });
  return { c, tq };
}

const save = (c: UsCareerCore, tq: number, phase = 'season') =>
  localStorage.setItem(sport.saveKey, JSON.stringify({ c, phase, teamQuality: tq, coach: null }));
const read = () => JSON.parse(localStorage.getItem(sport.saveKey)!);
const mount = () => render(<MemoryRouter><UsCareerBoard sport={sport} /></MemoryRouter>);
const q = (sel: string) => document.querySelector(sel) as HTMLElement | null;
const button = (text: string) => [...document.querySelectorAll('button')].find(b => b.textContent?.includes(text));

beforeEach(() => {
  localStorage.clear();
  vi.spyOn(Math, 'random').mockImplementation(mulberry32(1544));
  vi.stubGlobal('requestAnimationFrame', () => 1);
  vi.stubGlobal('cancelAnimationFrame', () => undefined);
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('NBA My Career: the national team on the board', () => {
  it('a 2003-04 season at 90 meets the 2004 call: the holding box, then the card in place; Go, the result, a reload', async () => {
    const { c, tq } = throwback(1, 90);
    expect(c.seasons[c.seasons.length - 1].year).toBe(2003);
    save(c, tq);
    const scrolls = vi.fn();
    Object.defineProperty(Element.prototype, 'scrollIntoView', { value: scrolls, configurable: true, writable: true });
    mount();
    await waitFor(() => expect(q('[data-intl-holding]') ?? q('[data-intl-call]')).toBeTruthy());
    const box = (q('[data-intl-holding]') ?? q('[data-intl-call]'))!.parentElement!;
    const before = scrolls.mock.calls.length;
    await waitFor(() => expect(q('[data-intl-call]')).toBeTruthy());
    expect(box.isConnected && box.contains(q('[data-intl-call]')), 'the card lands in the box that held its place').toBe(true);
    expect(scrolls.mock.calls.length, 'the card landing is not a new screen').toBe(before);
    expect(document.body.textContent).toContain('the 2004 Olympics in Athens');
    expect(document.body.textContent).not.toMatch(/Team USA|USA Basketball|Dream Team/);
    expect(button(`Play the ${c.year} season`)).toBeUndefined();
    fireEvent.click(q('[data-intl-answer="go"]')!);
    await waitFor(() => expect(q('[data-intl-result]')).toBeTruthy());
    const after = read();
    expect(after.phase).toBe('season');
    expect(after.c.intl.summers).toHaveLength(1);
    expect(after.c.intl.summers[0]).toMatchObject({ year: 2004, edition: 'oly-2004', went: true, age: 24 });
    expect(after.c.intl.last).toBeUndefined();
    expect(document.body.textContent).toContain('this career\'s own');
    fireEvent.click(q('[data-intl-tile="games"]')!);
    await waitFor(() => expect(q('[data-intl-view="games"]')).toBeTruthy());
    expect(document.querySelectorAll('[data-intl-view="games"] li').length).toBe(after.c.intl.summers[0].games);
    fireEvent.click(q('[data-intl-back]')!);
    fireEvent.click(q('[data-intl-tile="bracket"]')!);
    await waitFor(() => expect(q('[data-intl-view="bracket"]')).toBeTruthy());
    expect(q('[data-intl-group]')).toBeTruthy();
    fireEvent.click(q('[data-intl-back]')!);
    fireEvent.click(q('[data-intl-continue]')!);
    await waitFor(() => expect(button(`Play the ${c.year} season`)).toBeTruthy());
    expect(q('[data-intl-call]')).toBeNull();
    const bytes = localStorage.getItem(sport.saveKey);
    cleanup();
    mount();
    await waitFor(() => expect(button(`Play the ${c.year} season`)).toBeTruthy());
    expect(q('[data-intl-call]') ?? q('[data-intl-result]') ?? q('[data-intl-holding]')).toBeNull();
    expect(localStorage.getItem(sport.saveKey), 'a reload writes nothing').toBe(bytes);
  });

  it('Rest writes the year, the edition and went false, and nothing else; a reload mid beat asks again', async () => {
    const { c, tq } = throwback(1, 90);
    save(c, tq);
    mount();
    await waitFor(() => expect(q('[data-intl-call]')).toBeTruthy());
    cleanup();
    mount();
    await waitFor(() => expect(q('[data-intl-call]')).toBeTruthy());
    const was = read();
    fireEvent.click(q('[data-intl-answer="rest"]')!);
    await waitFor(() => expect(button(`Play the ${c.year} season`)).toBeTruthy());
    const after = read();
    expect(after.c.intl).toEqual({ v: 1, summers: [{ year: 2004, edition: 'oly-2004', went: false }] });
    expect(JSON.stringify({ ...after, c: { ...after.c, intl: undefined } })).toBe(JSON.stringify({ ...was, c: { ...was.c, intl: undefined } }));
    expect(q('[data-intl-result]')).toBeNull();
  });

  it('rated 80 after 2003, or after the season labelled 2004 (no edition in 2005), nobody calls', async () => {
    for (const [seasons, ovr] of [[1, 80], [2, 95]] as const) {
      const { c, tq } = throwback(seasons, ovr);
      save(c, tq);
      mount();
      await waitFor(() => expect(button(`Play the ${c.year} season`)).toBeTruthy());
      expect(q('[data-intl-call]') ?? q('[data-intl-holding]')).toBeNull();
      expect(sport.intl?.pendingYear(c as never)).toBeNull();
      cleanup();
      localStorage.clear();
    }
  });

  it('played on the board: the curtain says it, the summer is dealt at the press, the call comes first and leaves the cards alone', async () => {
    const { c, tq } = throwback(2, 95);
    save(c, tq);
    mount();
    await waitFor(() => expect(button(`Play the ${c.year} season`)).toBeTruthy());
    fireEvent.click(button(`Play the ${c.year} season`)!);
    await waitFor(() => expect(q('[data-season-reveal]')).toBeTruthy());
    expect(document.body.textContent).toContain(NBA_INTL_CURTAIN_LINE);
    const pressed = read();
    expect(pressed.c.seasons[pressed.c.seasons.length - 1].year).toBe(2005);
    fireEvent.click(button('Continue')!);
    for (let i = 0; i < 4 && !q('[data-intl-call]'); i += 1) {
      await waitFor(() => expect(q('[data-intl-call]') ?? q('[data-intl-holding]') ?? button('Continue')).toBeTruthy());
      if (!q('[data-intl-call]') && !q('[data-intl-holding]')) fireEvent.click(button('Continue')!);
      else await waitFor(() => expect(q('[data-intl-call]')).toBeTruthy());
    }
    expect(q('[data-intl-call]')).toBeTruthy();
    expect(document.body.textContent).toContain('the 2006 World Championship in Japan');
    const dealt = read();
    fireEvent.click(q('[data-intl-answer="rest"]')!);
    const after = read();
    expect(after.c.intl.summers).toEqual([{ year: 2006, edition: 'wc-2006', went: false }]);
    expect(after.phase).toBe(dealt.phase);
    expect(JSON.stringify(after.c.summer ?? null), 'the dealt summer is untouched').toBe(JSON.stringify(dealt.c.summer ?? null));
  });
});

/* Round 1557: the medals on the shelf. A save carrying a gold from 2004 and a rest in 2006 loads the face (the
   load hunk), and the Trophy Case shows the medal as a row of its own, outside the individual honours count; the
   hub tile adds it once; the International tile opens every summer called, the summer he went to opens its result
   with Back to the list, the rested one is a tile with no press, and the list's Back is the case again. Nothing of
   it writes the save. */
describe('NBA My Career: the medals on the shelf', () => {
  const gold = { year: 2004, edition: 'oly-2004', went: true, age: 24, place: 'gold', games: 8, wins: 8, avg: { pts: 21.5, reb: 5.1, ast: 4.2 }, hurt: false };
  const rest = { year: 2006, edition: 'wc-2006', went: false };
  const openCase = async () => {
    const tile = [...document.querySelectorAll('button')].find(b => /Trophy Case/.test(b.textContent ?? ''));
    expect(tile, 'the hub has a Trophy Case tile').toBeTruthy();
    fireEvent.click(tile!);
    await waitFor(() => expect(q('[data-trophy-case]')).toBeTruthy());
  };

  it('the medal row, the honours line, the tile count, the International view and its Backs', async () => {
    const { c, tq } = throwback(3, 80);
    c.intl = { v: 1, summers: [gold, rest] } as unknown as UsCareerCore['intl'];
    save(c, tq);
    const bytes = localStorage.getItem(sport.saveKey);
    mount();
    await waitFor(() => expect(button(`Play the ${c.year} season`)).toBeTruthy());
    const awards = c.seasons.reduce((n, s) => n + (s.awards?.length ?? 0), 0);
    const tile = sport.ringsOf(c as never) + awards + 1;
    await waitFor(() => expect([...document.querySelectorAll('button')].find(b => /Trophy Case/.test(b.textContent ?? ''))?.textContent, 'the hub tile counts the medal once')
      .toContain(`${tile} ${tile === 1 ? 'honour' : 'honours'}`));
    await openCase();
    /* the badge grid names "Olympic gold" whether it is earned or not, so the row is read inside the case */
    await waitFor(() => expect(q('[data-trophy-case]')!.textContent).toContain('Olympic gold'));
    const caseText = q('[data-trophy-case]')!.textContent ?? '';
    expect(caseText).toContain('2004');
    if (awards > 0) expect(caseText).toContain(`${awards} individual`);
    else expect(caseText).toContain('No individual honour yet');
    expect(q('[data-intl-open]'), 'the International tile sits in the case').toBeTruthy();
    expect(document.querySelectorAll('[data-career-badge]').length).toBe(sport.badges.length);
    fireEvent.click(q('[data-intl-open]')!);
    await waitFor(() => expect(q('[data-intl-summers-view="list"]')).toBeTruthy());
    expect(q('[data-trophy-case]'), 'the view replaces the case, never stacks above the badges').toBeNull();
    expect(q('[data-career-badge]')).toBeNull();
    expect(q('[data-intl-summer="2004"]')).toBeTruthy();
    expect(q('[data-intl-summer-rest="2006"]')).toBeTruthy();
    expect(q('[data-intl-summer="2006"]'), 'a rested summer has nothing to open').toBeNull();
    expect(document.body.textContent).toContain('The 2006 World Championship in Japan');
    fireEvent.click(q('[data-intl-summer="2004"]')!);
    await waitFor(() => expect(q('[data-intl-result]')).toBeTruthy());
    expect(q('[data-intl-place="gold"]')).toBeTruthy();
    expect(q('[data-intl-continue]')!.textContent).toContain('Back');
    fireEvent.click(q('[data-intl-continue]')!);
    await waitFor(() => expect(q('[data-intl-summers-view="list"]')).toBeTruthy());
    fireEvent.click(q('[data-intl-summers-back]')!);
    await waitFor(() => expect(q('[data-trophy-case]')).toBeTruthy());
    expect(q('[data-intl-summers-view]')).toBeNull();
    expect(document.body.textContent).not.toMatch(/Team USA|USA Basketball|Dream Team/);
    expect(localStorage.getItem(sport.saveKey), 'looking at the shelf writes nothing').toBe(bytes);
  });

  /* Round 1557's fix (review-run-1557, minor 2): leaving the trophies panel by the header's Hub button with the
     International view up, then opening the Trophy Case again, opens the case, not the view. Nothing else held the
     board's closing effect: with it removed this case goes red and every other one stays green. */
  it('the header\'s Hub button with the International view up, then the Trophy Case again: the case, not the view', async () => {
    const { c, tq } = throwback(3, 80);
    c.intl = { v: 1, summers: [gold, rest] } as unknown as UsCareerCore['intl'];
    save(c, tq);
    mount();
    await waitFor(() => expect(button(`Play the ${c.year} season`)).toBeTruthy());
    await openCase();
    await waitFor(() => expect(q('[data-intl-open]')).toBeTruthy());
    fireEvent.click(q('[data-intl-open]')!);
    await waitFor(() => expect(q('[data-intl-summers-view="list"]')).toBeTruthy());
    const hub = [...document.querySelectorAll('button')].find(b => (b.textContent ?? '').trim() === 'Hub');
    expect(hub, 'the panel header has its Hub button').toBeTruthy();
    fireEvent.click(hub!);
    await waitFor(() => expect(button(`Play the ${c.year} season`)).toBeTruthy());
    fireEvent.click([...document.querySelectorAll('button')].find(b => /Trophy Case/.test(b.textContent ?? ''))!);
    await waitFor(() => expect(q('[data-trophy-case], [data-intl-summers-view]')).toBeTruthy());
    expect(q('[data-intl-summers-view]'), 'the Trophy Case opens on the case').toBeNull();
    expect(q('[data-trophy-case]')).toBeTruthy();
  });

  it('a save with no summer shows no medal row and no International tile, and the badges it always had', async () => {
    const { c, tq } = throwback(3, 80);
    save(c, tq);
    mount();
    await waitFor(() => expect(button(`Play the ${c.year} season`)).toBeTruthy());
    await openCase();
    expect(q('[data-intl-open]')).toBeNull();
    expect(q('[data-trophy-case]')!.textContent).not.toMatch(/Olympic|World Cup|International/);
    expect(document.querySelectorAll('[data-career-badge]').length).toBe(sport.badges.length);
  });
});

/* Critic advice 18, the second arm. usBoardFixture.test.tsx bridges the call off on its SHARED knob (all four
   sports; only the NBA binds one). Here the fixture's fixed NBA saves are mounted with the bind and without it:
   every save that meets no call must draw the same board and keep the same bytes. Measured on 2026-10-22: the
   fixture holds 19 fixed NBA saves and none meets a call (the best last season among them is rated 85), so the
   floor is 19; and so the arm cannot pass on nothing, the mid save raised to 90 (the season labelled 2030, so
   the 2031 World Cup) must meet the beat and draw differently. */
describe('the board fixture\'s fixed NBA saves with the bind mounted', () => {
  it('draw the board they drew without it where no call is met, and a raised save meets the beat', async () => {
    const fs = await import('node:fs');
    const fx = JSON.parse(fs.readFileSync('scripts/data/usBoardFixture.json', 'utf8')).sports.nba.saves as Record<string, string>;
    const bare = { ...sport, intl: undefined };
    const shot = async (s: typeof sport, raw: string) => {
      localStorage.clear();
      localStorage.setItem(sport.saveKey, raw);
      vi.spyOn(Math, 'random').mockImplementation(mulberry32(7));
      const v = render(<MemoryRouter><UsCareerBoard sport={s} /></MemoryRouter>);
      /* Round 1557: settle before the photograph. Under a loaded runner one mount could still show a lazy part's
         holding line ("Counting the Hall votes...") where the other showed the part (r1557-s2b and s8, the
         retired save): a race of the chunk, not of the bind. Both mounts wait the same way, up to 100 turns,
         until no holding line is up and the board stands still for a turn; the comparison itself is unchanged. */
      const HOLDING = /Counting the Hall votes|Loading\.\.\.|Loading season review|Opening practice|data-intl-holding/;
      let last = '';
      for (let turn = 0; turn < 100; turn += 1) {
        await new Promise(r => setTimeout(r, 0));
        const now = v.container.innerHTML;
        if (now === last && !HOLDING.test(now)) break;
        last = now;
      }
      /* React numbers useId's ids from one counter for every client root, so two mounts of the same board
         differ only there: the ids are read as one placeholder. */
      const out = { html: v.container.innerHTML.replace(/:r[0-9a-z]+:/g, ':r:'), bytes: localStorage.getItem(sport.saveKey) };
      cleanup();
      return out;
    };
    let same = 0;
    let met = 0;
    for (const [k, raw] of Object.entries(fx)) {
      const c = JSON.parse(raw).c;
      if (c && sport.intl?.pendingYear(c) !== null) { met += 1; continue; }
      /* A first mount loads the board's own lazy parts, so the two compared mounts both find them loaded. */
      await shot(bare, raw);
      const a = await shot(sport, raw);
      const b = await shot(bare, raw);
      expect(a.bytes, `fixture save ${k}: the save`).toBe(b.bytes);
      let at = 0;
      while (at < a.html.length && a.html[at] === b.html[at]) at += 1;
      const where = a.html === b.html ? '' : `${a.html.slice(Math.max(0, at - 80), at + 120)} VERSUS ${b.html.slice(Math.max(0, at - 80), at + 120)}`;
      expect(where, `fixture save ${k}: the board`).toBe('');
      same += 1;
    }
    console.log(`usCareerIntlBoard: ${same} fixed NBA fixture saves meet no call and draw the same board; ${met} meet one`);
    expect(same).toBeGreaterThanOrEqual(19);
    const mid = JSON.parse(fx.mid);
    mid.c.seasons[mid.c.seasons.length - 1].ovr = 90;
    expect(sport.intl?.pendingYear(mid.c)).toBe(2031);
    const raised = JSON.stringify(mid);
    await shot(bare, raised);
    const a = await shot(sport, raised);
    const b = await shot(bare, raised);
    expect(a.html).not.toBe(b.html);
    expect(a.html).toMatch(/data-intl-(holding|call)/);
  });
});

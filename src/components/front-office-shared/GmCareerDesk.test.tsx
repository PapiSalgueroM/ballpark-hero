/**
 * Round 1223: the three career panels and the lazy mount, as taps.
 *
 * The panels are drawn through their eager default exports (a lazy one draws
 * its fallback first), and the lazy path is then driven for real through
 * GmDeskMount: the fallback, the panel landing, and state inside the panel
 * surviving a parent re-render, with the control that proves the helper's one
 * rule (called inside a render, the open panel is remounted and loses it).
 *
 * scripts/simGmDeskHost.mjs carries the outcome checks on the four real
 * engines; this file is the screen.
 */
import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, cleanup, waitFor } from '@testing-library/react';
import { renderToStaticMarkup } from 'react-dom/server';
import { useState } from 'react';
import { GmDeskMount } from './GmDeskMount';
import GmJobMarketPanel from './GmJobMarketPanel';
import GmCareerPanel from './GmCareerPanel';
import GmXpDeskPanel from './GmXpDeskPanel';
import { GM_CAREER_KEYS, GM_CAREER_PANELS } from './gmCareerDesk';
import { GmPanelLoading, lazyGmPanel } from './gmLazyPanel';
import { freshGmDesk, gmDeskTiles, withGmBlock, type GmDesk, type GmPanelDef, type GmPhase } from '@/lib/gmDesk';
import { GM_SPORTS } from '@/lib/gmSport';
import type { FoHubFacts } from '@/lib/foHub';
import {
  GM_HOST_KEYS, hostEarnsLine, hostLegacySeat, hostMarket, hostSitArmLine, hostTakeArmLine,
  type GmCareerBinding, type GmCareerFacts, type GmDeskHost, type GmSeatBlock, type HostClub,
} from '@/lib/gmDeskHost';
import { defaultGmXp, xpForLevel, type GmTree } from '@/lib/gmXp';
import type { FoGradeResult } from '@/lib/foOwnerMandate';
import { GM_SEAT_PACKS } from '@/data/gmSeat/packs';

afterEach(cleanup);

const HUB: FoHubFacts = {
  roster: [], freeAgents: [], capRoom: 12, wins: 3, losses: 1, period: 5, periods: 20,
  playWord: 'Play', periodWord: 'round', hasFixtures: false, nextOpponent: null, lastResult: null,
  place: 2, cut: 8, tableName: 'the conference', tradeLine: null, titles: 0,
};

/* A small league and its read adapter, the same shape the lib test uses. */
interface TLeague { season: number; cap: number; clubs: { id: string; strength: number; wins: number; losses: number; payroll: number }[]; champion: string }
const idOf = (i: number) => `T${String(i).padStart(2, '0')}`;
const nameOf = (id: string) => `Club ${id}`;
const LEAGUE: TLeague = {
  season: 2030, cap: 100, champion: idOf(0),
  clubs: Array.from({ length: 32 }, (_, i) => ({ id: idOf(i), strength: 90 - i, wins: 50 - i, losses: 30 + i, payroll: 80 + (i % 7) })),
};
const HOST: GmDeskHost<TLeague> = {
  sport: 'nhl', pack: GM_SEAT_PACKS.nhl,
  clubs: l => l.clubs.map((c, i): HostClub => ({
    id: c.id, wins: c.wins, losses: c.losses, strength: c.strength, games: 80, record: `${c.wins}-${c.losses}`, place: i + 1, payroll: c.payroll,
  })),
  season: l => l.season, cap: l => l.cap, champion: (l, s) => (s === l.season ? l.champion : null),
};
const BOTTOM = idOf(31);
const firedFrom = (grades: FoGradeResult[], team = BOTTOM, from = 2026): GmSeatBlock => ({
  v: 1, career: { version: 1, stints: [{ team, tier: 4, from, grades, ended: 'fired' }], seasonsOut: 0 },
});
/* Strong enough that the engine's own count is never zero, weak enough to be shut for good, and one in between. */
const WINNER = firedFrom(['title', 'title', 'title', 'title', 'title', 'overachieved', 'overachieved', 'overachieved', 'missed']);
const WRECK = firedFrom(['badly', 'badly', 'badly']);
const CLIMB = firedFrom(['badly', 'badly']);
const HELD: GmSeatBlock = { v: 1, career: { version: 1, stints: [{ team: BOTTOM, tier: 4, from: 2026, grades: ['met', 'title'] }], seasonsOut: 0 } };

const binding = (seat: GmSeatBlock, over: Partial<GmCareerBinding> = {}): GmCareerBinding => ({
  pack: GM_SEAT_PACKS.nhl, seat, market: hostMarket(HOST, LEAGUE, seat, nameOf), nameOf,
  live: ['ownership', 'media'], deskOn: true, earns: hostEarnsLine(['wins', 'titles', 'playoffs', 'mandate']),
  take: vi.fn(), sitOut: vi.fn(), spend: vi.fn(), ...over,
});
const factsOf = (career: GmCareerBinding, phase: GmPhase = 'fired'): GmCareerFacts => ({
  teamId: BOTTOM, teamLabel: nameOf(BOTTOM), seasonsPlayed: 3, phase, hub: HUB, career,
});
const panelProps = (career: GmCareerBinding, desk: GmDesk = freshGmDesk()) => ({
  sport: GM_SPORTS.nhl, desk, facts: factsOf(career), onDesk: vi.fn(), onBack: vi.fn(),
});

describe('the three boxes', () => {
  it('are one module level list, and the Job market box shows only between seats', () => {
    expect(GM_CAREER_PANELS.map(p => p.key)).toEqual([GM_CAREER_KEYS.market, GM_CAREER_KEYS.career, GM_CAREER_KEYS.xp]);
    expect(GM_CAREER_PANELS.map(p => p.title)).toEqual(['Job market', 'Career', 'GM level']);
    const out = gmDeskTiles(GM_SPORTS.nhl, freshGmDesk(), factsOf(binding(WINNER), 'fired'), GM_CAREER_PANELS);
    expect(out.map(t => t.title)).toEqual(['Job market', 'Career', 'GM level']);
    const hub = gmDeskTiles(GM_SPORTS.nhl, freshGmDesk(), factsOf(binding(HELD), 'hub'), GM_CAREER_PANELS);
    expect(hub.map(t => t.title)).toEqual(['Career', 'GM level']);
    for (const t of [...out, ...hub]) { expect(t.value).not.toBe(''); expect(t.sub).not.toBe(''); }
  });
});

describe('the job market panel', () => {
  it('draws one tile an offer and takes a job on the second tap only', () => {
    const career = binding(WINNER);
    const market = career.market!;
    expect(market.offers.length).toBeGreaterThan(0);
    const { container } = render(<GmJobMarketPanel {...panelProps(career)} />);
    expect(container.querySelectorAll('[data-gm-offer]')).toHaveLength(market.offers.length);
    expect(container.querySelector('[data-gm-market-line]')!.textContent).toBe(market.line);
    const offer = market.offers[0];
    fireEvent.click(container.querySelector(`[data-gm-offer="${offer.teamId}"]`)!);
    /* The offer alone: its ask, why they called, the club's facts. */
    const open = container.querySelector('[data-gm-offer-open]')!;
    expect(open.textContent).toContain(offer.ask.text);
    expect(open.textContent).toContain(offer.reason);
    expect(container.querySelector('[data-gm-offer-facts]')!.textContent).toContain(market.facts[offer.teamId].record);
    expect(container.querySelector('[data-gm-sit-out]')).toBeNull();
    /* First tap arms and says what will happen. */
    const takeButton = container.querySelector('[data-gm-take]')!;
    fireEvent.click(takeButton);
    expect(career.take).not.toHaveBeenCalled();
    expect(container.querySelector('[data-gm-arm="take"]')!.textContent).toBe(hostTakeArmLine(career.pack, offer, true));
    /* Going back disarms it. */
    fireEvent.click(screen.getByText('Back to the offers'));
    fireEvent.click(container.querySelector(`[data-gm-offer="${offer.teamId}"]`)!);
    expect(container.querySelector('[data-gm-arm="take"]')).toBeNull();
    fireEvent.click(container.querySelector('[data-gm-take]')!);
    fireEvent.click(container.querySelector('[data-gm-take]')!);
    expect(career.take).toHaveBeenCalledTimes(1);
    expect(career.take).toHaveBeenCalledWith(offer);
    /* The arm is spent with the action: a third tap arms again and takes nothing. */
    fireEvent.click(container.querySelector('[data-gm-take]')!);
    expect(career.take).toHaveBeenCalledTimes(1);
    expect(container.querySelector('[data-gm-arm="take"]')).not.toBeNull();
  });
  it('stays out a year on the second tap only, and says when that opens the desk', () => {
    const career = binding(CLIMB, { deskOn: false });
    expect(career.market!.state).toBe('quiet');
    const { container } = render(<GmJobMarketPanel {...panelProps(career)} />);
    expect(container.querySelector('[data-gm-offers]')).toBeNull();
    const button = container.querySelector('[data-gm-sit-out]')!;
    fireEvent.click(button);
    expect(career.sitOut).not.toHaveBeenCalled();
    /* The first tap says what the year costs: here next year hangs on his old club. */
    expect(container.querySelector('[data-gm-arm="sit"]')!.textContent).toBe(hostSitArmLine(career.market!, false));
    expect(hostSitArmLine(career.market!, false)).toContain('only if your old club has climbed the league by then');
    expect(hostSitArmLine(career.market!, false)).toContain('opens your GM desk');
    expect(hostSitArmLine(career.market!, true)).not.toContain('opens your GM desk');
    fireEvent.click(button);
    expect(career.sitOut).toHaveBeenCalledTimes(1);
    /* The arm is spent with the action: one more tap only arms again, it never plays a second year. */
    expect(container.querySelector('[data-gm-arm="sit"]')).toBeNull();
    fireEvent.click(container.querySelector('[data-gm-sit-out]')!);
    expect(career.sitOut).toHaveBeenCalledTimes(1);
    expect(container.querySelector('[data-gm-arm="sit"]')).not.toBeNull();
  });
  it('drops an armed tap when the market under it changes, so no year out ever takes one tap', () => {
    const before = firedFrom(['badly', 'missed', 'missed']);
    const after: GmSeatBlock = { ...before, career: { ...before.career, seasonsOut: 1 } };
    const first = binding(before);
    const { container, rerender } = render(<GmJobMarketPanel {...panelProps(first)} />);
    fireEvent.click(container.querySelector('[data-gm-sit-out]')!);
    expect(container.querySelector('[data-gm-arm="sit"]')).not.toBeNull();
    /* What a board does after a year out: the same panel, kept by the mount, over a new market. */
    const second = binding(after);
    expect(second.market!.seasonsOut).toBe(1);
    rerender(<GmJobMarketPanel {...panelProps(second)} />);
    expect(container.querySelector('[data-gm-arm="sit"]')).toBeNull();
    fireEvent.click(container.querySelector('[data-gm-sit-out]')!);
    expect(first.sitOut).not.toHaveBeenCalled();
    expect(second.sitOut).not.toHaveBeenCalled();
    expect(container.querySelector('[data-gm-arm="sit"]')).not.toBeNull();
  });
  it('offers no year out when the calls on the table are the last ones, and the line says so', () => {
    /* A top tier club's wreck: over the floor today, under it next year whatever
       happens. Read off many keys, some feeds hold the one offer. */
    let seat: GmSeatBlock | null = null;
    for (let from = 1990; from < 2027 && !seat; from++) {
      const s = firedFrom(['badly', 'badly', 'badly'], idOf(0), from);
      if (hostMarket(HOST, LEAGUE, s, nameOf)!.state === 'offers') seat = s;
    }
    expect(seat).not.toBeNull();
    const career = binding(seat!);
    expect(career.market).toMatchObject({ state: 'offers', nextYear: 'shut' });
    const { container } = render(<GmJobMarketPanel {...panelProps(career)} />);
    expect(container.querySelectorAll('[data-gm-offer]')).toHaveLength(career.market!.offers.length);
    expect(container.querySelector('[data-gm-sit-out]')).toBeNull();
    expect(container.querySelector('[data-gm-market-line]')!.textContent).toContain('you will get: pass, and the phone stops for good.');
    expect(/stay out/i.test(container.textContent ?? '')).toBe(false);
  });
  it('offers no year out on a closed market, and its "?" opens the rules', () => {
    const career = binding(WRECK);
    expect(career.market!.state).toBe('closed');
    const { container } = render(<GmJobMarketPanel {...panelProps(career)} />);
    expect(container.querySelector('[data-gm-sit-out]')).toBeNull();
    expect(container.querySelector('[data-gm-market="closed"]')).not.toBeNull();
    expect(/\bsit|stay out/i.test(container.textContent ?? '')).toBe(false);
    expect(container.querySelector('[data-gm-market-help]')).toBeNull();
    fireEvent.click(screen.getByLabelText('How the job market works'));
    expect(container.querySelectorAll('[data-gm-market-help] p')).toHaveLength(4);
  });
  it('draws something sane while he holds a seat', () => {
    const { container } = render(<GmJobMarketPanel {...panelProps(binding(HELD))} />);
    expect(container.querySelector('[data-gm-market="held"]')).not.toBeNull();
    expect(container.querySelector('[data-gm-take]')).toBeNull();
    expect(container.querySelector('[data-gm-sit-out]')).toBeNull();
  });
});

describe('the career panel', () => {
  it('draws a box a stint with a mark a graded season', () => {
    const { container } = render(<GmCareerPanel {...panelProps(binding(HELD))} />);
    const boxes = container.querySelectorAll('[data-gm-stint]');
    expect(boxes).toHaveLength(1);
    expect(boxes[0].textContent).toContain(nameOf(BOTTOM));
    expect(boxes[0].textContent).toContain('Took over in 2026, bottom tier');
    expect(boxes[0].textContent).toContain('Still here');
    expect(container.querySelector('[data-gm-marks]')!.textContent!.split(' ')).toHaveLength(2);
    expect(container.querySelector('[data-gm-career-totals]')!.textContent).toBe('2 seasons, 1 club, 1 title');
  });
  it('leaves the tier off a record older than the block and counts the seasons it cannot grade', () => {
    const old = hostLegacySeat({ team: BOTTOM, tier: 4, season: 2030, seasonCounted: true, seasonsPlayed: 9, titles: 2, fired: true, lastGrade: null });
    const { container } = render(<GmCareerPanel {...panelProps(binding(old))} />);
    const box = container.querySelector('[data-gm-stint]')!;
    expect(box.textContent).toContain('In the chair since 2022');
    expect(box.textContent).not.toContain('tier');
    expect(container.querySelector('[data-gm-earlier]')!.textContent).toBe('Plus 7 earlier seasons, not graded');
    expect(container.querySelector('[data-gm-career-totals]')!.textContent).toBe('9 seasons, 1 club, 2 titles');
    fireEvent.click(screen.getByLabelText('How the career record works'));
    expect(container.querySelectorAll('[data-gm-career-help] p')).toHaveLength(4);
  });
});

describe('the GM level panel', () => {
  const rich = withGmBlock(freshGmDesk(), GM_HOST_KEYS.xp, { ...defaultGmXp(), xp: xpForLevel(4) });
  it('sells a point only in a tree this desk routes', () => {
    const career = binding(HELD);
    const { container } = render(<GmXpDeskPanel {...panelProps(career, rich)} />);
    const button = (tree: GmTree) => container.querySelector(`[data-gm-tree="${tree}"] button`) as HTMLButtonElement;
    expect(button('ownership').disabled).toBe(false);
    expect(button('media').disabled).toBe(false);
    for (const tree of ['scouting', 'negotiation', 'capCraft', 'development', 'trading'] as GmTree[]) {
      expect(button(tree).disabled).toBe(true);
      expect(button(tree).textContent).toBe('Not here yet');
    }
    fireEvent.click(button('ownership'));
    expect(career.spend).toHaveBeenCalledWith('ownership');
    fireEvent.click(button('trading'));
    expect(career.spend).toHaveBeenCalledTimes(1);
    expect(container.querySelector('[data-gm-xp-earns]')!.textContent).toBe(career.earns);
    fireEvent.click(screen.getByLabelText('How GM XP works'));
    expect(container.querySelectorAll('[data-gm-xp-help] p')).toHaveLength(4);
    /* The earn line is on the screen once: above the "?", never a second time inside it. */
    expect(container.textContent!.split(career.earns)).toHaveLength(2);
  });
  it('says XP has not started on a save whose desk is off, and the "?" then carries the earn line', () => {
    const career = binding(HELD, { deskOn: false });
    const { container } = render(<GmXpDeskPanel {...panelProps(career)} />);
    expect(container.querySelector('[data-gm-xp-earns]')!.textContent).toBe('XP starts once your GM desk is open.');
    fireEvent.click(screen.getByLabelText('How GM XP works'));
    const lines = container.querySelectorAll('[data-gm-xp-help] p');
    expect(lines).toHaveLength(5);
    expect(lines[0].textContent).toBe(career.earns);
    expect(container.textContent!.split(career.earns)).toHaveLength(2);
  });
});

/* ---------------- the lazy path, through the real mount ---------------- */

/**
 * A board with the Career panel open. `broken` is the control: the helper
 * called inside the render, which the header of gmLazyPanel.tsx forbids, so
 * every save hands the mount a new component type.
 */
function Board({ broken = false }: { broken?: boolean }) {
  const [open, setOpen] = useState<string | null>(GM_CAREER_KEYS.career);
  const [desk, setDesk] = useState<GmDesk>(freshGmDesk());
  const panels: readonly GmPanelDef<GmCareerFacts>[] = !broken ? GM_CAREER_PANELS : GM_CAREER_PANELS.map(p => (
    p.key === GM_CAREER_KEYS.career ? { ...p, Panel: lazyGmPanel<GmCareerFacts>(() => import('./GmCareerPanel')) } : p
  ));
  return (
    <div>
      {/* What a save does to a board: a new desk object, a new render. */}
      <button onClick={() => setDesk(d => withGmBlock(d, 'tick', Date.now()))}>save</button>
      <GmDeskMount sport="nhl" desk={desk} facts={factsOf(binding(HELD), 'hub')} panels={panels} open={open} onOpen={setOpen} onDesk={setDesk} />
    </div>
  );
}

describe('a panel that loads on demand', () => {
  const landed = (c: HTMLElement) => waitFor(() => expect(c.querySelector('[data-gm-career]')).not.toBeNull());

  it('shows a fixed height box first, then the panel, and keeps the panel across a save', async () => {
    const { container } = render(<Board />);
    const loading = container.querySelector('[data-gm-panel-loading]') as HTMLElement;
    expect(loading).not.toBeNull();
    expect(loading.getAttribute('role')).toBe('status');
    expect(loading.style.minHeight).toBe('220px');
    await landed(container);
    expect(container.querySelector('[data-gm-panel-loading]')).toBeNull();
    /* State inside the panel: its "?" opened. */
    fireEvent.click(screen.getByLabelText('How the career record works'));
    expect(container.querySelector('[data-gm-career-help]')).not.toBeNull();
    const before = container.querySelector('[data-gm-career]');
    fireEvent.click(screen.getByText('save'));
    fireEvent.click(screen.getByText('save'));
    /* The same panel, not a new one: the node is the node, and the "?" is still open. */
    expect(container.querySelector('[data-gm-career]')).toBe(before);
    expect(container.querySelector('[data-gm-panel-loading]')).toBeNull();
    expect(container.querySelector('[data-gm-career-help]')).not.toBeNull();
  });

  it('control: built inside a render, the open panel is remounted by a save and loses what it held', async () => {
    const { container } = render(<Board broken />);
    await landed(container);
    fireEvent.click(screen.getByLabelText('How the career record works'));
    expect(container.querySelector('[data-gm-career-help]')).not.toBeNull();
    const before = container.querySelector('[data-gm-career]');
    fireEvent.click(screen.getByText('save'));
    await landed(container);
    expect(container.querySelector('[data-gm-career]')).not.toBe(before);
    expect(container.querySelector('[data-gm-career-help]')).toBeNull();
  });

  it('draws its fallback under a server render and never throws', () => {
    const html = renderToStaticMarkup(
      <GmDeskMount sport="nhl" desk={freshGmDesk()} facts={factsOf(binding(HELD), 'hub')} panels={GM_CAREER_PANELS} open={GM_CAREER_KEYS.xp} onOpen={() => {}} onDesk={() => {}} />,
    );
    expect(html).toContain('data-gm-panel-loading');
    expect(html).toContain('GM level');
    expect(renderToStaticMarkup(<GmPanelLoading minHeight={300} />)).toContain('min-height:300px');
  });

  it('every loader resolves to a component', async () => {
    const mods = await Promise.all([import('./GmJobMarketPanel'), import('./GmCareerPanel'), import('./GmXpDeskPanel')]);
    for (const m of mods) expect(typeof m.default).toBe('function');
  });
});

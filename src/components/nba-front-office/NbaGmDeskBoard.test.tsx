/**
 * Round 1018 (review fix): the round's central promise, on the live board.
 * scripts/simNbaGmDesk.mjs replays the board's calls in its own copy; this
 * renders the real NbaFrontOfficeBoard over a saved league and plays it.
 *   1. With the GM desk on, draft night ends in the desk's summer, never the
 *      engine's coin flip: every expiring man of the user's has a recorded
 *      decision, applied as written (the GM's own calls kept, the rest
 *      settled by the staff's rule), and a first round pick signs the rookie
 *      scale (four seasons left once the summer has run, where the engine's
 *      own deal leaves three).
 *   2. A pick sent by an old trade path (the trade finder's sweetener)
 *      follows into the ledger, and one that would leave the club without a
 *      first in two drafts running is refused before the trade engine runs.
 * Negative control, built in: the same draft night on a save with the desk
 * off (the board's coin flip path) must show the checker both failures, so
 * a board that falls back to the coin flip with the desk on, or forgets the
 * rookie scale, cannot pass test 1. Measured by hand on the night of
 * 2026-10-05, each on the board itself: with `if (deskNow) {` in finishDraft
 * made `if (false) {`, test 1 goes red (two problems, among them no
 * decision for the man left to the staff's rule); with `if (gm) nbaSignDraftee(drafted,
 * pickRound);` removed it goes red on the rookie scale; with pickRuleBlock
 * dropped from acceptShopOffer the last test goes red on the refusal. The
 * other tests stayed green under each.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { initNbaLeague, nbaDraftClass, nbaTrade, NBA_ROUNDS, type NbaLeague } from '@/lib/nbaFrontOffice';
import type { FinderOffer } from '@/lib/tradeFinder';
import { leagueNames } from '@/lib/foNames';
import { openNbaDesk, nbaContractsOf, nbaPicksOf, NBA_DESK_KEYS } from '@/lib/nbaGmDesk';
import { deskCases, letGo, keepAtAsk } from '@/lib/gmContracts';
import { nbaContractHost } from '@/lib/gmContractsHostNba';
import { withGmBlock, type GmDesk } from '@/lib/gmDesk';
import { NBA_ROOKIE_SCALE_YEARS } from '@/lib/gmContractRules';
import { movePicks, pickKey, picksHeldBy } from '@/lib/gmPicks';

vi.mock('@/hooks/useGameCompletion', () => ({ useGameCompletion: () => undefined }));
vi.mock('@/lib/completions', () => ({ recordActivity: () => undefined }));
vi.mock('@/components/game/ShareButtons', () => ({ default: () => null }));
vi.mock('@/hooks/useRevealScroll', () => ({ useRevealScroll: () => ({ current: null }) }));
vi.mock('@/lib/tradeFinder', async (orig) => {
  const real = await orig<typeof import('@/lib/tradeFinder')>();
  return { ...real, findTrades: vi.fn(real.findTrades) };
});
import { findTrades } from '@/lib/tradeFinder';
import NbaFrontOfficeBoard from '@/components/nba-front-office/NbaFrontOfficeBoard';
/* A whole draft night and summer on the real board: about 3 s a test on a
   quiet machine, 15 s on a busy one. */
vi.setConfig({ testTimeout: 120_000 });

function lehmer(seed: number) {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; };
}
const SAVE_KEY = 'nba-front-office-save-v1';
/* eslint-disable @typescript-eslint/no-explicit-any */
const saved = () => JSON.parse(localStorage.getItem(SAVE_KEY) ?? 'null');
const STAYS = new Set(['keep', 'option', 'tender', 'qualify-accepted', 'match']);

interface DraftSetup { team: string; season: number; expiring: { id: string; name: string }[]; letGoId: string | null; keptId: string | null }

/** A save on draft night with two picks and three young men out of contract. */
function draftNightSave(withDesk: boolean): DraftSetup {
  const rng = lehmer(9);
  const league = initNbaLeague(rng);
  const team = Object.keys(league.teams)[0];
  league.round = NBA_ROUNDS;
  league.teams[team].picks = [1, 2];
  const mine = league.teams[team].players;
  for (const p of mine) if (p.years <= 1) p.years = 2;
  const young = [...mine].sort((a, b) => a.age - b.age || a.id.localeCompare(b.id)).slice(0, 3);
  for (const p of young) p.years = 1;
  let gm: GmDesk | undefined;
  let letGoId: string | null = null, keptId: string | null = null;
  if (withDesk) {
    gm = openNbaDesk(league, team);
    /* The GM's own calls, made on the re-sign desk before draft night, the way the panel makes them. */
    const ledger = JSON.parse(JSON.stringify(nbaContractsOf(gm, league, team)));
    const cases = deskCases(nbaContractHost, league, ledger);
    const c0 = cases.find(c => c.man.id === young[0].id)!, c1 = cases.find(c => c.man.id === young[1].id)!;
    expect(letGo(ledger, league, c0).ok).toBe(true);
    expect(keepAtAsk(ledger, league, c1).ok).toBe(true);
    letGoId = young[0].id; keptId = young[1].id;
    gm = withGmBlock(gm, NBA_DESK_KEYS.contracts, ledger);
  }
  const draftClass = nbaDraftClass(rng, 24, leagueNames(league));
  localStorage.setItem(SAVE_KEY, JSON.stringify({
    league, myTeam: team, phase: 'draft', titles: 0, seasonsPlayed: 1, draftClass, picksLeft: 2, draftAiBatchesLeft: 2, ...(gm ? { gm } : {}),
  }));
  return { team, season: league.season, expiring: young.map(p => ({ id: p.id, name: p.name })), letGoId, keptId };
}

/** Make both picks on the real board; returns the round one and round two draftees' ids. */
function draftTwo(team: string): { r1: string; r2: string } {
  const ids = (s: any) => new Set<string>(s.league.teams[team].players.map((p: any) => p.id));
  const before = ids(saved());
  const pickFirst = () => {
    const grid = document.querySelector('.grid.max-h-96') as HTMLElement;
    expect(grid).toBeTruthy();
    fireEvent.click(grid.querySelectorAll('button')[0]);
  };
  pickFirst();
  const mid = saved();
  const r1 = [...ids(mid)].find(id => !before.has(id))!;
  pickFirst();
  const end = saved();
  const r2 = (end.league.teams[team].players as any[]).map(p => p.id).find(id => !before.has(id) && id !== r1)!;
  return { r1, r2 };
}

/** What the desk promises after the summer; every broken promise is one line. */
function summerProblems(setup: DraftSetup, r1: string): string[] {
  const end = saved();
  const roster: any[] = end.league.teams[setup.team].players;
  const decisions: any[] = end.gm?.blocks?.contracts?.decisions ?? [];
  const out: string[] = [];
  for (const m of setup.expiring) {
    const d = decisions.find(x => x.season === setup.season && x.id === m.id);
    if (!d) { out.push(`no decision: ${m.name}`); continue; }
    const here = roster.some(p => p.id === m.id);
    if (STAYS.has(d.kind) !== here) out.push(`not applied: ${m.name} ${d.kind} but ${here ? 'still here' : 'gone'}`);
    if (m.id === setup.letGoId && !(d.via === 'gm' && !STAYS.has(d.kind))) out.push(`the GM's release of ${m.name} was not kept`);
    if (m.id === setup.keptId && !(d.via === 'gm' && d.kind === 'keep')) out.push(`the GM's keep of ${m.name} was not kept`);
  }
  const rookie = roster.find(p => p.id === r1);
  if (!rookie) out.push('the round one draftee is gone');
  else if (rookie.years !== NBA_ROOKIE_SCALE_YEARS) out.push(`rookie scale: the round one draftee has ${rookie.years} seasons left, the scale leaves ${NBA_ROOKIE_SCALE_YEARS}`);
  return out;
}

/** A hub save mid season with the desk on, and a trade the engine takes with a pick attached. */
function tradeSave(stepien: boolean) {
  const league: NbaLeague = initNbaLeague(lehmer(7));
  const ids = Object.keys(league.teams);
  const team = ids[0];
  league.round = 5;
  let gm = openNbaDesk(league, team);
  let ledger = nbaPicksOf(gm, league);
  const S = league.season;
  if (stepien) {
    /* Next season's first already sent, and this season's second: the engine
       list is [1], so the sweetener would send this season's first. */
    const next1 = picksHeldBy(ledger, team, S + 1).find(p => p.round === 1 && p.orig === team)!;
    const now2 = picksHeldBy(ledger, team, S).find(p => p.round === 2 && p.orig === team)!;
    ledger = movePicks(ledger, [pickKey(next1), pickKey(now2)], ids[2]);
    gm = withGmBlock(gm, NBA_DESK_KEYS.picks, ledger);
  }
  league.teams[team].picks = picksHeldBy(ledger, team, S).map(p => p.round).sort((a, b) => a - b);
  /* A pair the engine accepts with the pick on, found on a copy. */
  let found: { mine: string; partner: string; theirs: string } | null = null;
  for (const partner of ids.slice(1)) {
    for (const m of league.teams[team].players) {
      for (const t of league.teams[partner].players) {
        const c: NbaLeague = JSON.parse(JSON.stringify(league));
        if (nbaTrade(c.teams[team], c.teams[partner], m.id, t.id, true, c.cap, c.taxScale) === 'accepted') { found = { mine: m.id, partner, theirs: t.id }; break; }
      }
      if (found) break;
    }
    if (found) break;
  }
  expect(found).not.toBeNull();
  localStorage.setItem(SAVE_KEY, JSON.stringify({ league, myTeam: team, phase: 'hub', titles: 0, seasonsPlayed: 0, draftClass: null, picksLeft: 0, gm }));
  const t = league.teams[found!.partner].players.find(p => p.id === found!.theirs)!;
  const offer: FinderOffer = {
    teamId: found!.partner, playerId: t.id, playerName: t.name, playerPos: t.pos, playerOvr: t.ovr, playerAge: t.age, playerSalary: t.salary, sweeten: true, gain: 0,
  };
  const myName = league.teams[team].players.find(p => p.id === found!.mine)!.name;
  return { team, S, found: found!, offer, myName };
}

/** Shop the man on the real trade screen and take the offer. */
function acceptSweetened(myName: string, offer: FinderOffer) {
  fireEvent.click(screen.getByText('Trades'));
  const list = document.querySelector('[data-trade-shop-list]') as HTMLElement;
  const mineBtn = [...list.querySelectorAll('button')].find(b => (b.textContent ?? '').includes(myName));
  expect(mineBtn).toBeTruthy();
  fireEvent.click(mineBtn!);
  vi.mocked(findTrades).mockImplementationOnce(() => [offer]);
  fireEvent.click(screen.getByText('Shop him around the league'));
  fireEvent.click(screen.getByText('Accept'));
}

describe('Round 1018: the NBA GM desk on the real board', () => {
  let restore: (() => void) | null = null;
  beforeEach(() => {
    localStorage.clear();
    const spy = vi.spyOn(Math, 'random').mockImplementation(lehmer(11));
    restore = () => spy.mockRestore();
    vi.mocked(findTrades).mockClear();
  });
  afterEach(() => { cleanup(); restore?.(); });

  it('desk on: draft night ends in the desk summer, the GM calls applied and the rookie scale signed', () => {
    const setup = draftNightSave(true);
    render(<NbaFrontOfficeBoard />);
    const { r1 } = draftTwo(setup.team);
    expect(saved().league.season).toBe(setup.season + 1);
    expect(summerProblems(setup, r1)).toEqual([]);
    /* The man nobody decided was settled by the staff's rule, not dropped. */
    const d = saved().gm.blocks.contracts.decisions.find((x: any) => x.id === setup.expiring[2].id && x.season === setup.season);
    expect(d?.via).toBe('auto');
  });

  it('control: the same night with the desk off fails the checker on both counts', () => {
    const setup = draftNightSave(false);
    render(<NbaFrontOfficeBoard />);
    const { r1 } = draftTwo(setup.team);
    expect(saved().league.season).toBe(setup.season + 1);
    const problems = summerProblems(setup, r1);
    expect(problems.filter(p => p.startsWith('no decision')).length).toBe(3);
    expect(problems.some(p => p.startsWith('rookie scale'))).toBe(true);
  });

  it('the trade finder sweetener moves the same pick in the ledger, and every engine list is the ledger', () => {
    const { team, S, found, offer, myName } = tradeSave(false);
    render(<NbaFrontOfficeBoard />);
    acceptSweetened(myName, offer);
    const s = saved();
    expect(s.league.teams[team].players.some((p: any) => p.id === found.theirs)).toBe(true);
    const ledger = s.gm.blocks.picks;
    const second = ledger.picks.find((p: any) => p.year === S && p.round === 2 && p.orig === team);
    expect(second.holder).toBe(found.partner);
    for (const [abbr, t] of Object.entries<any>(s.league.teams)) {
      const held = picksHeldBy(ledger, abbr, S).map(p => p.round).sort((a, b) => a - b);
      expect([...t.picks].sort((a: number, b: number) => a - b)).toEqual(held);
    }
  });

  it('a sweetener that would leave no first in two drafts running is refused before the trade engine runs', () => {
    const { team, S, found, offer, myName } = tradeSave(true);
    render(<NbaFrontOfficeBoard />);
    acceptSweetened(myName, offer);
    expect(document.body.textContent ?? '').toContain('two drafts running');
    const s = saved();
    expect(s.league.teams[team].players.some((p: any) => p.id === found.mine)).toBe(true);
    const first = s.gm.blocks.picks.picks.find((p: any) => p.year === S && p.round === 1 && p.orig === team);
    expect(first.holder).toBe(team);
    expect(s.league.teams[team].picks).toEqual([1]);
  });
});

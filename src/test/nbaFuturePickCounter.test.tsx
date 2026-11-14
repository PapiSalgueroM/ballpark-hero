import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { NBA_DESK_PANELS, type NbaDeskFacts } from '@/components/nba-front-office/NbaGmDesk';
import { withGmBlock } from '@/lib/gmDesk';
import { gmSport } from '@/lib/gmSport';
import { movePicks, findPick, pickKey, picksHeldBy } from '@/lib/gmPicks';
import { assetKey, evaluatePackage, type TradePackage } from '@/lib/gmTradePackage';
import { keyedRng } from '@/lib/keyedRng';
import {
  NBA_DESK_KEYS, nbaFuturePickCounter, nbaPackageContext, nbaPicksOf, nbaProposePackage, openNbaDesk,
} from '@/lib/nbaGmDesk';
import { initNbaLeague, NBA_ROUNDS } from '@/lib/nbaFrontOffice';

const team = 'BOS', partner = 'ATL';
const TradePanel = NBA_DESK_PANELS.find(panel => panel.key === 'deals')!.Panel;

function fixture() {
  const league = initNbaLeague(keyedRng('future-pick counter'));
  const mine = league.teams[team].players[0], theirs = league.teams[partner].players[0];
  Object.assign(mine, { name: 'Fixture Guard Out', age: 24, ovr: 80, salary: 20 });
  Object.assign(theirs, { name: 'Fixture Guard In', age: 24, ovr: 80, salary: 20 });
  const desk = openNbaDesk(league, team);
  const pkg: TradePackage = { from: team, to: partner, give: [{ kind: 'player', id: mine.id }], get: [{ kind: 'player', id: theirs.id }] };
  return { league, desk, pkg, mine, theirs };
}

afterEach(cleanup);

describe('NBA Trade Desk future pick counter', () => {
  it('quotes the least valuable legal future asset without moving the league or ledger', () => {
    const { league, desk, pkg } = fixture(), ctx = nbaPackageContext(league, desk, team, partner);
    const leagueBytes = JSON.stringify(league), deskBytes = JSON.stringify(desk), packageBytes = JSON.stringify(pkg);
    expect(evaluatePackage(pkg, ctx).verdict).toBe('rejected');
    const quoted = nbaFuturePickCounter(pkg, ctx)!;
    const held = findPick(ctx.ledger, quoted.key)!;
    expect(held).toMatchObject({ holder: team, round: 2, year: league.season + 2 });
    expect(evaluatePackage({ ...pkg, give: [...pkg.give, quoted] }, ctx).verdict).toBe('accepted');
    const acceptable = picksHeldBy(ctx.ledger, team).filter(pick => pick.year > league.season).flatMap(pick => {
      const a = { kind: 'pick' as const, key: pickKey(pick) };
      return evaluatePackage({ ...pkg, give: [...pkg.give, a] }, ctx).verdict === 'accepted' ? [ctx.valueOf(a)] : [];
    });
    expect(acceptable.length).toBeGreaterThan(1);
    expect(ctx.valueOf(quoted)).toBe(Math.min(...acceptable));
    expect([JSON.stringify(league), JSON.stringify(desk), JSON.stringify(pkg)]).toEqual([leagueBytes, deskBytes, packageBytes]);
    const dealt = nbaProposePackage(league, desk, team, { ...pkg, give: [...pkg.give, quoted] });
    expect(dealt.verdict.verdict).toBe('accepted');
    expect(findPick(nbaPicksOf(dealt.desk, league), quoted.key)?.holder).toBe(partner);
    expect(nbaProposePackage(league, dealt.desk, team, { ...pkg, give: [...pkg.give, quoted] }).verdict.verdict).toBe('invalid');
  });

  it('obeys the deadline and salary and roster blockers before offering extra assets', () => {
    const { league, desk, pkg, theirs } = fixture();
    const context = () => nbaPackageContext(league, desk, team, partner);
    league.round = NBA_ROUNDS;
    expect(evaluatePackage(pkg, context()).step).toBe(1);
    expect(nbaFuturePickCounter(pkg, context())).toBeNull();
    league.round = 1;
    theirs.salary = 400;
    expect(evaluatePackage(pkg, context()).step).toBe(4);
    expect(nbaFuturePickCounter(pkg, context())).toBeNull();
    theirs.salary = 20;
    league.teams[team].players = league.teams[team].players.slice(0, 7);
    expect(evaluatePackage(pkg, context()).step).toBe(4);
    expect(nbaFuturePickCounter(pkg, context())).toBeNull();
  });

  it('skips already-used assets and picks that would leave consecutive drafts without a first', () => {
    const { league, desk, pkg, theirs } = fixture();
    theirs.ovr = 90;
    const full = nbaPicksOf(desk, league);
    const initial = picksHeldBy(full, team);
    const out = initial.filter(p => p.round === 2 && p.year > league.season)
      .concat(initial.filter(p => p.round === 1 && (p.year === league.season || p.year > league.season + 1)));
    const ledger = movePicks(full, out.map(pickKey), partner);
    const context = nbaPackageContext(league, withGmBlock(desk, NBA_DESK_KEYS.picks, ledger), team, partner);
    const blocked = { kind: 'pick' as const, key: pickKey({ year: league.season + 1, round: 1, orig: team }) };
    expect(evaluatePackage(pkg, context).verdict).toBe('rejected');
    expect(evaluatePackage({ ...pkg, give: [...pkg.give, blocked] }, context).step).toBe(3);
    expect(nbaFuturePickCounter(pkg, context)).toBeNull();
    const normal = nbaPackageContext(league, desk, team, partner);
    expect(nbaFuturePickCounter(pkg, normal)).not.toBeNull();
    const second = picksHeldBy(full, team).find(p => p.year > league.season && p.round === 2)!;
    const used = { kind: 'pick' as const, key: pickKey(second) };
    const bigger = { ...pkg, give: [...pkg.give, used] };
    expect(evaluatePackage(bigger, normal).verdict).toBe('rejected');
    const next = nbaFuturePickCounter(bigger, normal);
    expect(next).not.toBeNull();
    expect(next?.key).not.toBe(used.key);
  });

  it('adds the pick for review before the user makes the actual deal', () => {
    const { league, desk, pkg } = fixture();
    const quoted = nbaFuturePickCounter(pkg, nbaPackageContext(league, desk, team, partner))!;
    const commit = vi.fn();
    const facts: NbaDeskFacts = {
      league, teamId: team, teamLabel: team, seasonsPlayed: 0, phase: 'hub',
      seasonOver: false, deskOn: true, clubName: abbr => abbr, say: vi.fn(), commit,
      hub: {
        roster: [], freeAgents: [], capRoom: 0, wins: 0, losses: 0, period: 1, periods: NBA_ROUNDS, playWord: 'Play',
        periodWord: 'round', hasFixtures: false, nextOpponent: null, lastResult: null, place: 1, cut: 10,
        tableName: 'East', tradeLine: null, titles: 0,
      },
    };
    const before = JSON.stringify(league);
    render(<TradePanel sport={gmSport('nba')} desk={desk} facts={facts} onDesk={vi.fn()} onBack={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: /Fixture Guard Out/ }));
    fireEvent.click(screen.getByRole('button', { name: /Fixture Guard In/ }));
    const suggest = screen.getByRole('button', { name: /pick to review/ });
    const make = screen.getByRole('button', { name: 'Make the trade' });
    expect(make).toBeDisabled();
    fireEvent.click(suggest);
    expect(commit).not.toHaveBeenCalled();
    expect(JSON.stringify(league)).toBe(before);
    expect(make).toBeEnabled();
    const pick = document.querySelector(`[data-gm-tile="${assetKey(quoted)}"]`)!;
    expect(pick).toHaveAttribute('aria-pressed', 'true');
    fireEvent.click(pick);
    expect(make).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: /pick to review/ }));
    fireEvent.click(make);
    expect(commit).toHaveBeenCalledTimes(1);
    const [next, nextDesk] = commit.mock.calls[0];
    expect(findPick(nbaPicksOf(nextDesk, next), quoted.key)?.holder).toBe(partner);
  });
});

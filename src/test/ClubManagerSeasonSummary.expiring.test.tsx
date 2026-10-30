/**
 * Round 1597: the summer contracts checkpoint. The season review lists every man in the final year of his deal and
 * keeps Continue shut until each one has an answer: Renew (the contracts desk's own renewContract) or Let him go.
 * "Let the rest go" answers the rest at once. The summary is the engine's own (finishSeason on a fresh career), with
 * exactly three men put in the last year of their deals and everyone else on three years.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render } from '@testing-library/react';
import { useState } from 'react';
import ClubManagerSeasonSummary from '@/components/club-manager/ClubManagerSeasonSummary';
import { expiringDeals, expiringPlayers, finishSeason, money, renewalTerms, renewContract, renewContractWithClause, startCareer, startNextSeason, type CareerState, type CMPlayer, type SeasonSummary } from '@/lib/clubManager';
import { expiringDealsLine } from '@/lib/clubManagerHubLines';

afterEach(cleanup);

const DASHES = [String.fromCharCode(0x2013), String.fromCharCode(0x2014)];

function setup(extra: Partial<CareerState> = {}) {
  const { state, summary } = finishSeason(startCareer('OB'));
  const squad = state.squad.map(p => ({ ...p, contractYears: 3 }));
  const three = squad.filter(p => !p.onLoan).sort((a, b) => b.rating - a.rating).slice(0, 3).map(p => p.id);
  const c0: CareerState = { ...state, budget: 999, squad: squad.map(p => (three.includes(p.id) ? { ...p, contractYears: 1 } : p)),
    pendingSummary: summary, jobHunt: undefined, ...extra };
  const sm: SeasonSummary = { ...summary, offers: [] };
  const renewed: CareerState[] = [];
  const g = { nextSeason: vi.fn(), startNew: vi.fn(), renew: vi.fn() };
  /* The page's hook in miniature: Renew goes through renewContract, as useClubManager's renew does. */
  function Host() {
    const [c, setC] = useState<CareerState>(c0);
    g.renew.mockImplementation((id: string) => setC(prev => { const next = renewContract(prev, id) ?? prev; renewed.push(next); return next; }));
    return <ClubManagerSeasonSummary sm={sm} c={c} g={g} />;
  }
  const view = render(<Host />);
  return { view, g, sm, three, c0, renewed };
}
const continueButton = (root: HTMLElement) => [...root.querySelectorAll('button')]
  .find(b => /^(Answer \d+ deals? first|Continue to Season \d+)$/.test((b.textContent ?? '').trim())) as HTMLButtonElement;
const rows = (root: HTMLElement) => [...root.querySelectorAll('[data-cm-deal]')] as HTMLElement[];
const rowOf = (root: HTMLElement, c0: CareerState, id: string) => {
  const name = c0.squad.find(p => p.id === id)!.name;
  return rows(root).find(r => r.textContent?.includes(name))!;
};

describe('Round 1597: no deal ends unseen', () => {
  it('lists the three final year men and keeps Continue shut', () => {
    const { view } = setup();
    expect(rows(view.container)).toHaveLength(3);
    expect(rows(view.container).every(r => r.getAttribute('data-cm-deal') === 'open')).toBe(true);
    const cont = continueButton(view.container);
    expect(cont.disabled).toBe(true);
    expect(cont.textContent).toBe('Answer 3 deals first');
  });

  it('answering two keeps it shut, the third opens it, and a renewal is the desk\'s own', () => {
    const { view, g, sm, three, c0, renewed } = setup();
    fireEvent.click(rowOf(view.container, c0, three[0]).querySelector('[data-cm-deal-renew]')!);
    expect(g.renew).toHaveBeenCalledWith(three[0]);
    expect(renewed[0]).toEqual(renewContract(c0, three[0]));
    fireEvent.click(rowOf(view.container, c0, three[1]).querySelector('[data-cm-deal-letgo]')!);
    expect(rows(view.container)).toHaveLength(3);
    expect(rowOf(view.container, c0, three[0]).getAttribute('data-cm-deal')).toBe('renewed');
    expect(rowOf(view.container, c0, three[1]).getAttribute('data-cm-deal')).toBe('letGo');
    expect(continueButton(view.container).disabled).toBe(true);
    expect(continueButton(view.container).textContent).toBe('Answer 1 deal first');
    fireEvent.click(rowOf(view.container, c0, three[2]).querySelector('[data-cm-deal-letgo]')!);
    const cont = continueButton(view.container);
    expect(cont.disabled).toBe(false);
    expect(cont.textContent).toBe(`Continue to Season ${sm.season + 1}`);
    fireEvent.click(cont);
    expect(g.nextSeason).toHaveBeenCalledTimes(1);
  });

  it('Let the rest go answers every open deal at once and renews nobody', () => {
    const { view, g } = setup();
    fireEvent.click(view.container.querySelector('[data-cm-deals-rest]')!);
    expect(rows(view.container).every(r => r.getAttribute('data-cm-deal') === 'letGo')).toBe(true);
    expect(continueButton(view.container).disabled).toBe(false);
    expect(g.renew).not.toHaveBeenCalled();
  });

  it('a man the budget cannot renew can still be let go', () => {
    const { view, three, c0 } = setup({ budget: 0 });
    const row = rowOf(view.container, c0, three[0]);
    expect((row.querySelector('[data-cm-deal-renew]') as HTMLButtonElement).disabled).toBe(true);
    fireEvent.click(view.container.querySelector('[data-cm-deals-rest]')!);
    expect(continueButton(view.container).disabled).toBe(false);
  });

  it('a manager leaving for a job he booked is not asked', () => {
    const { view } = setup({ jobHunt: { summerMove: { club: 'Brentford', blurb: 'A Contender club' } } as unknown as CareerState['jobHunt'] });
    expect(view.container.querySelector('[data-cm-deals]')).toBeNull();
    expect(continueButton(view.container)).toBeUndefined();
    const start = [...view.container.querySelectorAll('button')].find(b => b.textContent?.includes('at Brentford')) as HTMLButtonElement;
    expect(start.disabled).toBe(false);
  });

  /* Review fix, Round 1325's rule: a real man's deal printed beside his name says it is this game's, on the row and on
     the hub line, and a made up man's does not. Read off the element and its words both, as cmTablesTruth does. */
  it('labels a real man\'s deal as this game\'s, on the row and the hub line, and no made up man\'s', () => {
    const { state, summary } = finishSeason(startCareer('OB'));
    const squad = state.squad.map(p => ({ ...p, contractYears: 3 }));
    const [a, b] = squad.filter(p => !p.onLoan).sort((x, y) => y.rating - x.rating).slice(0, 2);
    const real = { ...a, contractYears: 1, generated: undefined, isYouth: false, academyGrad: undefined };
    const madeUpMan = { ...b, contractYears: 1, generated: true };
    const c0: CareerState = { ...state, budget: 999, squad: squad.map(p => (p.id === a.id ? real : p.id === b.id ? madeUpMan : p)),
      pendingSummary: summary, jobHunt: undefined };
    const g = { nextSeason: vi.fn(), startNew: vi.fn(), renew: vi.fn() };
    const view = render(<ClubManagerSeasonSummary sm={{ ...summary, offers: [] }} c={c0} g={g} />);
    const labelled = (row: Element) => {
      const el = !!row.querySelector('[data-cm-deal-label]');
      expect(el).toBe(/this game's (deal|wage|numbers)/.test(row.textContent ?? ''));
      return el;
    };
    expect(labelled(rowOf(view.container, c0, real.id))).toBe(true);
    expect(labelled(rowOf(view.container, c0, madeUpMan.id))).toBe(false);
    const line = (squadOf: CMPlayer[]) => expiringDealsLine({ squad: squadOf, loanedOut: [], week: 0, calendar: [{ type: 'league' }] as unknown as CareerState['calendar'] });
    expect(line(c0.squad)?.real).toBe(true);
    expect(line(c0.squad.filter(p => p.id !== real.id))?.real).toBe(false);
  });

  /* Review fix: a man in his last year who is out on loan came home at the summer and walked with no row here, no
     hub line and no way to renew him (both renewals looked in the squad only). */
  it('a final year man out on loan is listed, named by the hub, renewed where he is, and comes home on the new deal', () => {
    const { state, summary } = finishSeason(startCareer('OB'));
    const squad = state.squad.map(p => ({ ...p, contractYears: 3 }));
    /* Under 29 and no youth pad, so the summer cannot retire him and the trim cannot cut him. */
    const lentMan = { ...squad.filter(p => !p.onLoan && !p.isYouth && p.position !== 'GK' && p.age <= 28).sort((a, b) => b.rating - a.rating)[0], contractYears: 1 };
    const c0: CareerState = { ...state, budget: 999, squad: squad.filter(p => p.id !== lentMan.id),
      loanedOut: [{ player: lentMan, club: 'Loan Club Test', fee: 1, season: state.season }], pendingSummary: summary, jobHunt: undefined };
    expect(expiringPlayers(c0).map(p => p.id)).not.toContain(lentMan.id);
    expect(expiringDeals(c0)).toEqual([{ player: lentMan, loanClub: 'Loan Club Test' }]);
    /* The hub line, with one league week left to play. */
    const lastWeek = { squad: c0.squad, loanedOut: c0.loanedOut, week: 0, calendar: [{ type: 'league' }] as unknown as CareerState['calendar'] };
    expect(expiringDealsLine(lastWeek)?.text).toBe(`1 deal ends this summer: ${lentMan.name} (on loan).`);
    /* The review's row, and Renew through the page's own renew. */
    const g = { nextSeason: vi.fn(), startNew: vi.fn(), renew: vi.fn() };
    let latest = c0;
    function Host() {
      const [c, setC] = useState<CareerState>(c0);
      g.renew.mockImplementation((id: string) => setC(prev => { latest = renewContract(prev, id) ?? prev; return latest; }));
      return <ClubManagerSeasonSummary sm={{ ...summary, offers: [] }} c={c} g={g} />;
    }
    const view = render(<Host />);
    expect(rows(view.container)).toHaveLength(1);
    const row = rows(view.container)[0];
    expect(row.getAttribute('data-cm-deal-loan')).toBe('Loan Club Test');
    expect(row.textContent).toContain('on loan at Loan Club Test');
    expect(continueButton(view.container).disabled).toBe(true);
    fireEvent.click(row.querySelector('[data-cm-deal-renew]')!);
    expect(g.renew).toHaveBeenCalledWith(lentMan.id);
    expect(rows(view.container)[0].getAttribute('data-cm-deal')).toBe('renewed');
    expect(continueButton(view.container).disabled).toBe(false);
    /* The new deal is written where he is; the squad is untouched and the fee is paid. */
    const terms = renewalTerms(lentMan);
    expect(latest.squad).toBe(c0.squad);
    expect(latest.loanedOut?.[0].player.contractYears).toBe(terms.years);
    expect(latest.loanedOut?.[0].player.wage).toBe(terms.wage);
    expect(latest.budget).toBe(Math.round((999 - terms.fee) * 10) / 10);
    expect(renewContractWithClause(c0, lentMan.id)?.loanedOut?.[0].player.releaseClause).toBeGreaterThan(0);
    /* And he comes home on it at the summer instead of walking. */
    const next = startNextSeason(latest);
    expect(next.squad.some(p => p.name === lentMan.name)).toBe(true);
    expect((next.freeAgents ?? []).some(f => f.name === lentMan.name)).toBe(false);
    /* Not renewed, he walks onto the list as before (nobody vanishes), now after a row that asked. */
    const walked = startNextSeason(c0);
    expect(walked.squad.some(p => p.name === lentMan.name)).toBe(false);
    expect((walked.freeAgents ?? []).some(f => f.name === lentMan.name)).toBe(true);
  }, 120000);

  it('the ? opens the rules with a worked example off the engine\'s numbers, and no dash anywhere', () => {
    const { view } = setup();
    expect(view.container.querySelector('[data-cm-deals-rules]')).toBeNull();
    fireEvent.click(view.container.querySelector('[data-cm-deals-help]')!);
    const rules = view.container.querySelector('[data-cm-deals-rules]')!;
    const ex = renewalTerms({ id: 'example', name: 'Example', position: 'RW', rating: 74, age: 24, value: 12, fitness: 100, morale: 70,
      injuryWeeks: 0, suspendedMatches: 0, isYouth: false, seasonGoals: 0, seasonAssists: 0 } as CMPlayer);
    expect(rules.textContent).toContain(`${ex.years} years at ${ex.wage}k a week, with a ${money(ex.fee)} signing on fee`);
    const tile = view.container.querySelector('[data-cm-deals]')!;
    for (const d of DASHES) expect(tile.textContent ?? '').not.toContain(d);
  });
});

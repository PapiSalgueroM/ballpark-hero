import { useState } from 'react';
import { cleanup, fireEvent, render, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ContractsCard } from '@/components/club-manager/ContractsCard';
import {
  startCareer, moneyIn, wageBill, wageCapFrom, renewalTerms, renewalTermsWithClause,
  renewContract, renewContractWithClause, saveCareer, loadCareer, type CareerState,
} from '@/lib/clubManager';

type Kind = 'plain' | 'clause';
const engine = { plain: renewContract, clause: renewContractWithClause };
const termsFor = { plain: renewalTerms, clause: renewalTermsWithClause };

/* Existing real career players, with controlled simulation contract boundaries.
   No player, roster, historical statistic or sports record is generated here. */
function fixture(): { id: string; career: CareerState } {
  const base = startCareer('Brentford');
  const target = base.squad.find(p => !p.onLoan && !p.isYouth && p.age >= 20 && p.age <= 29)!;
  expect(target).toBeDefined();
  return {
    id: target.id,
    career: {
      ...base,
      squad: base.squad.map(p => ({ ...p, contractYears: p.id === target.id ? 1 : Math.max(2, p.contractYears ?? 2) })),
    },
  };
}

const preview = (container: HTMLElement, id: string, kind: Kind | 'remove') =>
  container.querySelector<HTMLElement>(`[data-contract-preview="${kind}"][data-contract-player-id="${id}"]`);
const action = (container: HTMLElement, kind: Kind) => within(container).getByRole('button', { name: kind === 'plain' ? /^Renew ·/ : /^\+Clause ·/ });
function expectQuote(container: HTMLElement, career: CareerState, id: string, kind: Kind | 'remove') {
  const deal = kind === 'clause' ? 'clause' : 'plain';
  const player = career.squad.find(p => p.id === id)!;
  const terms = termsFor[deal](player);
  const next = engine[deal](career, id)!;
  expect(next).not.toBeNull();
  const quote = preview(container, id, kind);
  expect(quote).toHaveTextContent(`${terms.years} years at ${terms.wage}k a week. ${moneyIn(career)(terms.fee)} to sign.`);
  expect(quote).toHaveTextContent(`Leaves ${moneyIn(career)(next.budget)} in the transfer kitty.`);
  const cap = next.wageCap ?? wageCapFrom(wageBill(next));
  expect(quote).toHaveTextContent(`Wage bill: ${wageBill(next)}k of ${cap}k a week.`);
  expect(quote).toHaveTextContent(deal === 'clause'
    ? `Exit clause ${moneyIn(career)(renewalTermsWithClause(player).clause)}. Any club can pay it.`
    : 'No release clause.');
  return next;
}

function CommittingContracts({ initial, onRenew, onClause, observe }: {
  initial: CareerState; onRenew: (id: string) => void; onClause: (id: string) => void; observe: (career: CareerState) => void;
}) {
  const [career, setCareer] = useState(initial);
  observe(career);
  return <ContractsCard career={career} onRenew={id => {
    onRenew(id);
    const next = renewContract(career, id);
    if (next) setCareer(next);
  }} onRenewWithClause={id => {
    onClause(id);
    const next = renewContractWithClause(career, id);
    if (next) setCareer(next);
  }} />;
}

beforeEach(() => localStorage.clear());
afterEach(() => { cleanup(); vi.restoreAllMocks(); });

describe('Club Manager contract preview', () => {
  it('shows both complete real renewal quotes without mutating career or saving', () => {
    const { career, id } = fixture(), before = JSON.stringify(career);
    const onRenew = vi.fn(), onClause = vi.fn(), writes = vi.spyOn(Storage.prototype, 'setItem');
    const view = render(<ContractsCard career={career} onRenew={onRenew} onRenewWithClause={onClause} />);
    expectQuote(view.container, career, id, 'plain'); expectQuote(view.container, career, id, 'clause');
    view.rerender(<ContractsCard career={{ ...career }} onRenew={onRenew} onRenewWithClause={onClause} />);
    expect(JSON.stringify(career)).toBe(before);
    expect(onRenew).not.toHaveBeenCalled(); expect(onClause).not.toHaveBeenCalled(); expect(writes).not.toHaveBeenCalled();
  });

  it.each(['plain', 'clause'] as const)('makes the %s forecast become the real contract budget wage and saved deal', kind => {
    const { career, id } = fixture(), before = JSON.stringify(career);
    const onRenew = vi.fn(), onClause = vi.fn(); let observed = career;
    const view = render(<CommittingContracts initial={career} onRenew={onRenew} onClause={onClause} observe={state => { observed = state; }} />);
    const next = expectQuote(view.container, career, id, kind);
    fireEvent.click(action(view.container, kind));
    expect(kind === 'plain' ? onRenew : onClause).toHaveBeenCalledExactlyOnceWith(id);
    expect(kind === 'plain' ? onClause : onRenew).not.toHaveBeenCalled();
    expect(observed).toEqual(next);
    expect(view.getByText(`${wageBill(next)}k of ${next.wageCap ?? wageCapFrom(wageBill(next))}k a week`)).toBeVisible();
    expect(saveCareer(observed)).toBe(true);
    const restored = loadCareer()!;
    expect(restored.budget).toBe(next.budget);
    expect(restored.squad.find(p => p.id === id)).toEqual(next.squad.find(p => p.id === id));
    expect(JSON.stringify(career)).toBe(before);
  });

  it('explains both actual signing fee shortfalls and keeps unaffordable actions disabled', () => {
    const { career, id } = fixture(); career.budget = 0;
    const onRenew = vi.fn(), onClause = vi.fn();
    const view = render(<ContractsCard career={career} onRenew={onRenew} onRenewWithClause={onClause} />);
    for (const kind of ['plain', 'clause'] as const) {
      const terms = termsFor[kind](career.squad.find(p => p.id === id)!);
      expect(preview(view.container, id, kind)).toHaveTextContent(`Need ${moneyIn(career)(terms.fee)} more for the signing fee.`);
      expect(preview(view.container, id, kind)).not.toHaveTextContent('Leaves');
      expect(action(view.container, kind)).toBeDisabled(); fireEvent.click(action(view.container, kind));
    }
    expect(onRenew).not.toHaveBeenCalled(); expect(onClause).not.toHaveBeenCalled();
  });

  it.each(['plain', 'clause'] as const)('allows the exact %s fee boundary and really leaves zero in the kitty', kind => {
    const { career, id } = fixture(); career.budget = termsFor[kind](career.squad.find(p => p.id === id)!).fee;
    let observed = career; const onRenew = vi.fn(), onClause = vi.fn();
    const view = render(<CommittingContracts initial={career} onRenew={onRenew} onClause={onClause} observe={state => { observed = state; }} />);
    const next = expectQuote(view.container, career, id, kind); expect(next.budget).toBe(0);
    expect(action(view.container, kind)).toBeEnabled(); fireEvent.click(action(view.container, kind));
    expect(observed.budget).toBe(0); expect(observed).toEqual(next);
  });

  it.each(['plain', 'clause'] as const)('warns about the %s soft cap but preserves an affordable over-cap renewal', kind => {
    const { career, id } = fixture();
    career.wageCap = wageBill(engine[kind](career, id)!) - 1;
    let observed = career; const onRenew = vi.fn(), onClause = vi.fn();
    const view = render(<CommittingContracts initial={career} onRenew={onRenew} onClause={onClause} observe={state => { observed = state; }} />);
    const next = expectQuote(view.container, career, id, kind);
    expect(preview(view.container, id, kind)).toHaveTextContent('Over the wage budget by 1k a week. The board notice every week.');
    expect(action(view.container, kind)).toBeEnabled(); fireEvent.click(action(view.container, kind));
    expect(observed).toEqual(next); expect(wageBill(observed)).toBeGreaterThan(career.wageCap!);
  });

  it('quotes the full renewal behind Remove and really deletes the existing clause', () => {
    const fresh = fixture(), career = renewContractWithClause(fresh.career, fresh.id)!;
    let observed = career; const onRenew = vi.fn(), onClause = vi.fn();
    const view = render(<CommittingContracts initial={career} onRenew={onRenew} onClause={onClause} observe={state => { observed = state; }} />);
    const next = expectQuote(view.container, career, fresh.id, 'remove');
    fireEvent.click(view.getByRole('button', { name: /^Remove ·/ }));
    expect(onRenew).toHaveBeenCalledExactlyOnceWith(fresh.id); expect(onClause).not.toHaveBeenCalled();
    expect(observed).toEqual(next); expect(observed.squad.find(p => p.id === fresh.id)!.releaseClause).toBeUndefined();
    expect(JSON.parse(JSON.stringify(observed)).squad.find((p: { id: string }) => p.id === fresh.id)).not.toHaveProperty('releaseClause');
    expect(view.queryByRole('button', { name: /^Remove ·/ })).toBeNull();
  });

  it('uses supported missing wage and cap defaults without repairing the input', () => {
    const { career, id } = fixture(); delete career.squad.find(p => p.id === id)!.wage; delete career.wageCap;
    const before = JSON.stringify(career);
    const view = render(<ContractsCard career={career} onRenew={vi.fn()} onRenewWithClause={vi.fn()} />);
    expectQuote(view.container, career, id, 'plain'); expectQuote(view.container, career, id, 'clause');
    expect(JSON.stringify(career)).toBe(before);
  });

  it.each(['plain', 'clause'] as const)('makes the missing-cap %s forecast match the committed header and saved reload', kind => {
    const { career, id } = fixture(); delete career.wageCap;
    const before = JSON.stringify(career); let observed = career;
    const onRenew = vi.fn(), onClause = vi.fn();
    const view = render(<CommittingContracts initial={career} onRenew={onRenew} onClause={onClause} observe={state => { observed = state; }} />);
    const next = expectQuote(view.container, career, id, kind), cap = wageCapFrom(wageBill(next));
    fireEvent.click(action(view.container, kind));
    expect(observed).toEqual(next); expect(observed.wageCap).toBeUndefined();
    expect(view.getByText(`${wageBill(next)}k of ${cap}k a week`)).toBeVisible();
    expect(saveCareer(observed)).toBe(true);
    const restored = loadCareer()!;
    expect(restored.budget).toBe(next.budget);
    expect(restored.squad.find(p => p.id === id)).toEqual(next.squad.find(p => p.id === id));
    expect(restored.wageCap ?? wageCapFrom(wageBill(restored))).toBe(cap);
    view.rerender(<ContractsCard career={restored} onRenew={onRenew} onRenewWithClause={onClause} />);
    expect(view.getByText(`${wageBill(next)}k of ${cap}k a week`)).toBeVisible();
    expect(JSON.stringify(career)).toBe(before);
  });

  it('does not claim a signed deal when the original callback makes no change', () => {
    const { career, id } = fixture(), onRenew = vi.fn();
    const view = render(<ContractsCard career={career} onRenew={onRenew} onRenewWithClause={vi.fn()} />);
    const html = view.container.innerHTML; fireEvent.click(action(view.container, 'plain'));
    expect(onRenew).toHaveBeenCalledExactlyOnceWith(id); expect(view.container.innerHTML).toBe(html);
    expect(view.queryByRole('status')).toBeNull();
  });

  it('preserves native keyboard routing and the exact renewal callback', () => {
    const { career, id } = fixture(), onClause = vi.fn();
    const view = render(<ContractsCard career={career} onRenew={vi.fn()} onRenewWithClause={onClause} />);
    const button = action(view.container, 'clause'); button.focus();
    expect(button).toHaveFocus(); expect(fireEvent.keyDown(button, { key: 'Enter' })).toBe(true);
    fireEvent.click(button); fireEvent.keyUp(button, { key: 'Enter' });
    expect(onClause).toHaveBeenCalledExactlyOnceWith(id); expect(button).toHaveFocus();
  });

  it('keeps the existing quiet empty desk when no deal is expiring or claused', () => {
    const { career } = fixture(); career.squad = career.squad.map(p => ({ ...p, contractYears: 2, releaseClause: undefined }));
    const view = render(<ContractsCard career={career} onRenew={vi.fn()} onRenewWithClause={vi.fn()} />);
    expect(view.getByText('Nobody is in the last year of his deal. Nothing needs signing today.')).toBeVisible();
    expect(view.container.querySelector('[data-contract-preview]')).toBeNull();
  });
});

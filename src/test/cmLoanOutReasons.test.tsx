import fs from 'node:fs';
import path from 'node:path';
import { cleanup, fireEvent, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { TransferScreen } from '@/components/club-manager/TransferScreen';
import {
  engineRegistrations, loanOutFee, loanOutPlayer, loanOutRefusal, makeOffer, moneyIn,
  restoreEngineRegistrations, startCareer, startNegotiation,
} from '@/lib/clubManager';
import type { CareerState, MarketPlayer } from '@/lib/clubManager';

let registrations: ReturnType<typeof engineRegistrations>;
beforeEach(() => { registrations = engineRegistrations(); localStorage.clear(); });
afterEach(() => { cleanup(); restoreEngineRegistrations(registrations); localStorage.clear(); });

function fixture() {
  const random = Math.random, now = Date.now;
  let seed = 513;
  Math.random = () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let mixed = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    mixed = (mixed + Math.imul(mixed ^ (mixed >>> 7), 61 | mixed)) ^ mixed;
    return ((mixed ^ (mixed >>> 14)) >>> 0) / 4294967296;
  };
  Date.now = () => Date.UTC(2026, 10, 3, 12);
  try {
    // The existing builder makes a fictional club and squad. No real sports record is added or changed.
    return startCareer('Loan Reason Lab', 'now', {
      name: 'Loan Reason Lab', leagueId: 'premier', stadium: 'Lab Ground',
      budgetTier: 'small', quality: 72, replacedClub: '',
      crest: { shape: 0, pattern: 0, color1: '#2563eb', color2: '#ffffff', initials: 'LR' },
    });
  } finally { Math.random = random; Date.now = now; }
}

const cases = [
  ['only_keeper', 'shows the only-keeper refusal beside his disabled loan action'],
  ['promised', 'shows the agreed-deal refusal beside his disabled loan action'],
  ['eligible', 'keeps an eligible loan action and its quoted fee working'],
  ['minimum', 'keeps the existing minimum-squad explanation and refusal'],
  ['closed', 'keeps the existing closed-window explanation and refusal'],
  ['used', 'keeps the existing once-a-season explanation and refusal'],
] as const;

function scenario(key: typeof cases[number][0]) {
  let career = fixture();
  expect(career.clubName, 'CM_LOAN_REASON_FICTIONAL_CLUB').toBe('Loan Reason Lab');
  expect(career.squad.length, 'CM_LOAN_REASON_REAL_CUSTOM_SQUAD').toBeGreaterThan(14);
  expect(career.transferWindow, 'CM_LOAN_REASON_OPEN_FIXTURE_WINDOW').not.toBeNull();
  const keeper = career.squad.find(player => player.position === 'GK');
  const outfield = career.squad.find(player => player.position !== 'GK' && !player.onLoan);
  if (!keeper || !outfield) throw new Error('The fictional squad needs a keeper and an owned outfield player');
  let player = outfield;
  if (key === 'only_keeper') {
    player = keeper;
    career.squad = career.squad.filter(member => member.position !== 'GK' || member.id === keeper.id);
    career.xiIds = career.xiIds.map(id => career.squad.some(member => member.id === id) ? id : null);
    expect(career.squad.length, 'CM_LOAN_REASON_ONLY_KEEPER_ABOVE_MINIMUM').toBeGreaterThan(14);
    expect(career.squad.filter(member => member.position === 'GK')).toHaveLength(1);
  } else if (key === 'promised') {
    // This explicitly fictional target drives the real fee negotiation into its actual agreed-swap state.
    const target: MarketPlayer = {
      name: 'Synthetic Loan Deal Target', club: 'Synthetic Selling Club', position: 'CM',
      age: 24, rating: 70, price: 0.2, generated: true, nation: 'England',
    };
    const opened = startNegotiation(career, target);
    if (!opened?.negotiation) throw new Error('The real engine did not open the synthetic fee negotiation');
    const agreed = makeOffer(opened, opened.negotiation.theirAsk, { swapId: player.id });
    if (!agreed) throw new Error('The real engine did not accept the synthetic fee offer');
    career = agreed;
    expect(career.negotiation?.status).toBe('open');
    expect(career.negotiation?.phase).toBe('terms');
    expect(career.negotiation?.agreedExtras?.swapId).toBe(player.id);
  } else if (key === 'minimum') {
    career.squad = [keeper, ...career.squad.filter(member => member.position !== 'GK').slice(0, 13)];
    career.xiIds = career.xiIds.map(id => career.squad.some(member => member.id === id) ? id : null);
    expect(career.squad).toHaveLength(14);
  } else if (key === 'closed') {
    career.transferWindow = null;
  } else if (key === 'used') {
    player.loanOutSeason = career.season;
  }
  const expectedReason = key === 'only_keeper' ? `${player.name} is your only keeper.`
    : key === 'promised' ? `${player.name} is promised in the deal on the table, so he stays until it is settled.`
    : key === 'minimum' ? 'Your squad is at the minimum of 14. Nobody else can leave.'
    : key === 'closed' ? 'Loans out need an open transfer window.'
    : key === 'used' ? `${player.name} has already been out on loan once this season. One loan out a season.` : null;
  return { career, player, expectedReason };
}

function shownText(element: Element | undefined): boolean {
  if (!element) return false;
  for (let current: Element | null = element; current; current = current.parentElement) {
    if (current.hasAttribute('hidden') || current.getAttribute('aria-hidden') === 'true') return false;
    if (current instanceof HTMLElement && (current.style.display === 'none' || current.style.visibility === 'hidden')) return false;
  }
  return true;
}

describe('Club Manager loan-out refusal visibility', () => {
  for (const [key, title] of cases) it(title, () => {
    const { career, player, expectedReason } = scenario(key);
    expect(career.squad.filter(member => member.name === player.name)).toHaveLength(1);
    const before = JSON.stringify(career), fee = loanOutFee(player), money = moneyIn(career);
    const engineReason = loanOutRefusal(career, player.id);
    const engineNext = loanOutPlayer(career, player.id, 'Synthetic Loan Host', fee);
    const loanCalls: string[] = [], outcomes: (CareerState | null)[] = [], otherCalls: string[] = [];
    const noOtherAction = () => { otherCalls.push('unexpected action'); };
    const view = render(<MemoryRouter><TransferScreen career={career} market={[]}
      onNegotiate={noOtherAction} onOffer={noOtherAction} onWalk={noOtherAction}
      onDismissNegotiation={noOtherAction} onClause={noOtherAction} onLoan={noOtherAction}
      onAcceptBid={noOtherAction} onRejectBid={noOtherAction} onSetStatus={noOtherAction}
      onLoanOut={id => { loanCalls.push(id); outcomes.push(loanOutPlayer(career, id, 'Synthetic Loan Host', fee)); }}
      onProposeTerms={noOtherAction} onBuyLoanee={noOtherAction} onEndLoanEarly={noOtherAction}
      onRecallLoanee={noOtherAction} /></MemoryRouter>);
    // DOM queries deliberately avoid JSDOM's unrelated CSS visibility selector path.
    const sell = Array.from(view.container.querySelectorAll<HTMLButtonElement>('button'))
      .find(button => button.textContent?.trim() === 'Sell');
    if (!sell) throw new Error('The actual Sell desk is missing');
    fireEvent.click(sell);
    const button = Array.from(view.container.querySelectorAll<HTMLButtonElement>('button[data-cm-loan-out]'))
      .find(action => action.parentElement?.parentElement?.textContent?.includes(player.name));
    if (!button?.parentElement?.parentElement) throw new Error('The actual player loan-out row is missing');
    const row = button.parentElement.parentElement;
    const reasonNode = expectedReason ? Array.from(row.querySelectorAll<HTMLElement>('p, span, div'))
      .find(element => element.childElementCount === 0 && element.textContent === expectedReason) : undefined;
    const visibleReason = shownText(reasonNode);
    const descriptionId = button.getAttribute('aria-describedby');
    const descriptionMatches = !!reasonNode?.id && descriptionId === reasonNode.id;
    const label = button.textContent?.trim();
    const expectedLabel = key === 'used' ? 'Loaned out once this season' : 'Loan out now +' + money(fee);
    fireEvent.click(button);
    const next = outcomes[0] ?? null;
    const expectedCallbacks = key === 'eligible' ? [player.id] : [];
    const receipt = {
      key, fixture: 'Existing engine fictional custom squad; synthetic fee target and host; only scenario state is adjusted',
      playerId: player.id, playerName: player.name, squadSize: career.squad.length,
      engineReason, expectedReason, engineAllowed: engineNext !== null, fee, label, expectedLabel,
      title: button.title, disabled: button.disabled, rowText: row.textContent, visibleReason, descriptionId, descriptionMatches,
      minimumCaption: view.container.textContent?.includes('Squad at minimum size (14). Nobody else can leave.') ?? false,
      closedCaption: view.container.textContent?.includes('The window is shut, so no transfers today.') ?? false,
      callbackIds: loanCalls, expectedCallbacks, otherCalls, callbackMatchesEngine: JSON.stringify(next) === JSON.stringify(engineNext),
      nextLoanFee: next?.loanedOut?.find(loan => loan.player.id === player.id)?.fee ?? null,
      budgetDelta: next ? Math.round((next.budget - career.budget) * 10) / 10 : null,
      inputUnchanged: JSON.stringify(career) === before,
    };
    const rawDir = process.env.CM_LOAN_REASONS_RAW;
    if (rawDir) {
      fs.mkdirSync(rawDir, { recursive: true });
      fs.writeFileSync(path.join(rawDir, key + '.json'), JSON.stringify(receipt, null, 2) + '\n', { flag: 'wx' });
    }
    console.info('CM_LOAN_OUT_REASON ' + JSON.stringify(receipt));
    expect(engineReason, 'CM_LOAN_REASON_ENGINE_' + key.toUpperCase()).toBe(expectedReason);
    expect(engineNext !== null, 'CM_LOAN_REASON_ENGINE_ALLOWED_' + key.toUpperCase()).toBe(key === 'eligible');
    expect(label, 'CM_LOAN_REASON_LABEL_AND_FEE_' + key.toUpperCase()).toBe(expectedLabel);
    expect(button.title, 'CM_LOAN_REASON_EXISTING_TITLE').toBe(expectedReason ?? 'Send him out on loan for the rest of the season');
    expect(button.disabled, 'CM_LOAN_REASON_DISABLED_' + key.toUpperCase()).toBe(key !== 'eligible');
    expect(loanCalls, 'CM_LOAN_REASON_CALLBACK_' + key.toUpperCase()).toEqual(expectedCallbacks);
    expect(otherCalls, 'CM_LOAN_REASON_NO_OTHER_ACTION').toEqual([]);
    expect(JSON.stringify(career), 'CM_LOAN_REASON_INPUT_UNCHANGED').toBe(before);
    if (key === 'eligible') {
      expect(JSON.stringify(next), 'CM_LOAN_REASON_REAL_CALLBACK_OUTCOME').toBe(JSON.stringify(engineNext));
      expect(receipt.nextLoanFee).toBe(fee); expect(receipt.budgetDelta).toBe(fee);
    } else expect(outcomes).toEqual([]);
    if (key === 'minimum') expect(receipt.minimumCaption, 'CM_LOAN_REASON_EXISTING_MINIMUM_CAPTION').toBe(true);
    if (key === 'closed') expect(receipt.closedCaption, 'CM_LOAN_REASON_EXISTING_CLOSED_CAPTION').toBe(true);
    if (key === 'only_keeper' || key === 'promised') {
      expect(visibleReason, 'CM_LOAN_REASON_VISIBLE_' + key.toUpperCase()).toBe(true);
      expect(descriptionMatches, 'CM_LOAN_REASON_DESCRIBED_' + key.toUpperCase()).toBe(true);
    }
  });
});

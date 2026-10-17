import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, isAbsolute } from 'node:path';
import { cleanup, fireEvent, render } from '@testing-library/react';
import { afterAll, afterEach, describe, expect, it, vi } from 'vitest';
import { TransferScreen } from '@/components/club-manager/TransferScreen';
import { moneyIn, startCareer, type CareerState, type TransferNews } from '@/lib/clubManager';

const CASE_TITLES = {
  ownPages: 'all retained own deals are reachable in newest-first pages',
  feePages: 'fee pages sort the complete retained list and reset safely',
  allFirstFifty: 'all clubs keeps the existing first fifty newest saved deals',
  smallOwn: 'small own histories keep counterparties loan flags and saved gross fees',
  boundaries: 'empty single and fifty-row histories keep their boundary states',
  readOnly: 'browsing keeps career ledger feedback callbacks and random stream unchanged',
};
const cases: Record<keyof typeof CASE_TITLES, unknown> = {
  ownPages: null, feePages: null, allFirstFifty: null, smallOwn: null, boundaries: null, readOnly: null,
};

// Prepared saved display rows, not a claim about real transfers or natural frequency.
function fixture() {
  const random = vi.spyOn(Math, 'random').mockReturnValue(0.6);
  const clock = vi.spyOn(Date, 'now').mockReturnValue(0);
  let career: CareerState;
  try { career = startCareer('Brentford'); }
  finally { clock.mockRestore(); random.mockRestore(); }
  const own: TransferNews[] = Array.from({ length: 61 }, (_, index) => ({
    name: `Fixture own deal ${String(index + 1).padStart(2, '0')}`,
    from: index % 2 === 0 ? 'Fixture seller' : career.clubName,
    to: index % 2 === 0 ? career.clubName : 'Fixture buyer',
    fee: index === 0 ? 99 : index === 1 ? 9 : index === 2 ? 0.5 : index === 3 ? 0.2 : (index * 17) % 13 + 0.25,
    ...(index === 2 || index === 3 ? { loan: true } : {}),
    season: career.season, week: index % 24 + 1,
  }));
  const noise: TransferNews[] = Array.from({ length: 19 }, (_, index) => ({
    name: `Fixture world deal ${String(index + 1).padStart(2, '0')}`,
    from: 'Fixture other seller', to: 'Fixture other buyer', fee: index === 0 ? 125 : (index * 11) % 13 + 0.25,
    season: career.season, week: index + 1,
  }));
  const log: TransferNews[] = [];
  own.forEach((row, index) => {
    log.push(row);
    if (index % 3 === 2 && index < 57) log.push(noise[(index - 2) / 3]);
  });
  return { career: { ...career, transferWindow: null, negotiation: null, aiHeadlines: [], incomingBids: [],
    transferLog: log, seasonSignings: [{ dir: 'out' as const, name: own[1].name, fee: 7 }] }, own, noise, log };
}
function screen(career: CareerState, feedback = false) {
  const action = vi.fn(), clearNote = vi.fn();
  const props = { market: [], onNegotiate: action, onOffer: action, onWalk: action, onDismissNegotiation: action,
    onClause: action, onLoan: action, onAcceptBid: action, onRejectBid: action, onSetStatus: action,
    onLoanOut: action, onProposeTerms: action, onBuyLoanee: action, onEndLoanEarly: action, onRecallLoanee: action,
    deskNote: feedback ? 'Fixture refusal. The saved deal remains unchanged.' : null, onClearNote: clearNote };
  const view = render(<TransferScreen career={career} {...props} />);
  fireEvent.click(view.getByRole('button', { name: 'Latest' }));
  return { ...view, action, clearNote, update: (next: CareerState) => view.rerender(<TransferScreen career={next} {...props} />) };
}
type Screen = ReturnType<typeof screen>;
function pane(view: Screen) {
  const node = view.queryByTestId('cm-transfer-news') ?? view.container.querySelector('div.max-h-96');
  if (!(node instanceof HTMLElement)) throw new Error('The actual saved-deals pane must be mounted');
  return node;
}
function names(view: Screen) {
  return [...pane(view).querySelectorAll(':scope > div')].map(row => row.querySelector('span.font-bold')?.textContent ?? '');
}
function snapshot(view: Screen) {
  const next = view.queryByRole('button', { name: 'Next deals' }) as HTMLButtonElement | null;
  const previous = view.queryByRole('button', { name: 'Previous deals' }) as HTMLButtonElement | null;
  return { names: names(view), range: view.queryByText(/^\d+ to \d+ of \d+$/)?.textContent ?? null,
    next: { present: next !== null, disabled: next?.disabled ?? null },
    previous: { present: previous !== null, disabled: previous?.disabled ?? null }, paneScrollTop: pane(view).scrollTop };
}
function click(view: Screen, label: string) { fireEvent.click(view.getByRole('button', { name: label })); }
const newest = (rows: TransferNews[]) => [...rows].reverse().map(row => row.name);
function fees(log: TransferNews[], club?: string) {
  return log.map((row, index) => ({ row, index })).filter(({ row }) => !club || row.from === club || row.to === club)
    .sort((a, b) => b.row.fee - a.row.fee || b.index - a.index).map(({ row }) => row.name);
}
function exactRows(view: Screen, rows: TransferNews[], career: CareerState) {
  for (const row of rows) {
    const element = view.getByText(row.name, { exact: true }).parentElement!.parentElement!;
    expect(element).toHaveTextContent(`${row.from} to ${row.to}`);
    expect(element).toHaveTextContent(moneyIn(career)(row.fee));
    expect(element.textContent?.includes('(loan)')).toBe(row.loan === true);
  }
}
afterEach(() => { cleanup(); vi.restoreAllMocks(); document.documentElement.scrollTop = 0; document.body.scrollTop = 0; });
afterAll(() => {
  const out = process.env.MSDL_RAW;
  if (!out) return;
  if (!isAbsolute(out)) throw new Error('MSDL_RAW must be absolute');
  mkdirSync(dirname(out), { recursive: true });
  writeFileSync(out, JSON.stringify({ version: 1, caseTitles: CASE_TITLES, cases }, null, 2) + '\n', { flag: 'wx' });
});

describe('saved Club Manager deal pages', () => {
  it(CASE_TITLES.ownPages, () => {
    const { career, own, log } = fixture(), view = screen(career);
    const before = JSON.stringify(career), random = vi.spyOn(Math, 'random');
    click(view, 'Your club');
    const evidence = { fixture: { retained: log.length, own: own.length, noise: 19 }, initial: snapshot(view), pages: [] as ReturnType<typeof snapshot>[],
      careerBefore: before, careerAfter: JSON.stringify(career), actionCalls: view.action.mock.calls, draws: random.mock.results.map(result => result.value) };
    cases.ownPages = evidence;
    const next = view.queryByRole('button', { name: 'Next deals' });
    expect(next !== null, 'The next page must expose retained own deals beyond fifty').toBe(true);
    expect(names(view)).toEqual(newest(own).slice(0, 50));
    expect(view.getByText('1 to 50 of 61')).toBeInTheDocument();
    expect(view.getByRole('button', { name: 'Previous deals' })).toBeDisabled();
    fireEvent.click(next!);
    evidence.pages.push(snapshot(view));
    expect(names(view)).toEqual(newest(own).slice(50));
    expect(view.getByText('51 to 61 of 61')).toBeInTheDocument();
    expect(view.getByRole('button', { name: 'Next deals' })).toBeDisabled();
    expect([...evidence.initial.names, ...names(view)]).toEqual(newest(own));
    expect(new Set([...evidence.initial.names, ...names(view)]).size).toBe(61);
    exactRows(view, own.slice(0, 11), career);
    click(view, 'Previous deals');
    expect(names(view)).toEqual(evidence.initial.names);
    view.update({ ...career, transferLog: own.slice(0, 51) });
    evidence.pages.push(snapshot(view));
    expect(view.getByText('1 to 50 of 51')).toBeInTheDocument();
    click(view, 'Next deals');
    evidence.pages.push(snapshot(view));
    expect(names(view)).toEqual([own[0].name]);
    expect(view.getByText('51 to 51 of 51')).toBeInTheDocument();
    evidence.careerAfter = JSON.stringify(career); evidence.draws = random.mock.results.map(result => result.value);
    expect(evidence.careerAfter).toBe(before); expect(view.action).not.toHaveBeenCalled(); expect(random).not.toHaveBeenCalled();
  });

  it(CASE_TITLES.feePages, () => {
    const { career, own, log } = fixture(), view = screen(career);
    const before = JSON.stringify(career), random = vi.spyOn(Math, 'random');
    click(view, 'Biggest fees');
    const evidence = { fixture: { retained: log.length, own: own.length, noise: 19 }, initial: snapshot(view), pages: [] as ReturnType<typeof snapshot>[],
      careerBefore: before, careerAfter: JSON.stringify(career), actionCalls: view.action.mock.calls, draws: random.mock.results.map(result => result.value) };
    cases.feePages = evidence;
    const next = view.queryByRole('button', { name: 'Next deals' });
    expect(next !== null, 'The next fee page must expose the remaining retained deals').toBe(true);
    const allFees = fees(log), ownFees = fees(log, career.clubName);
    expect(names(view)).toEqual(allFees.slice(0, 50));
    expect(names(view).slice(0, 2)).toEqual(['Fixture world deal 01', 'Fixture own deal 01']);
    expect(view.getByText('1 to 50 of 80')).toBeInTheDocument();
    expect(pane(view).contains(next)).toBe(false);
    expect(pane(view).contains(view.getByRole('button', { name: 'Previous deals' }))).toBe(false);
    const pageScroll = vi.spyOn(window, 'scrollTo').mockImplementation(() => {});
    document.documentElement.scrollTop = 321; document.body.scrollTop = 123; pane(view).scrollTop = 177;
    fireEvent.click(next!);
    evidence.pages.push(snapshot(view));
    expect(names(view)).toEqual(allFees.slice(50));
    expect([...evidence.initial.names, ...names(view)]).toEqual(allFees);
    expect(pane(view).scrollTop).toBe(0);
    expect(document.documentElement.scrollTop).toBe(321); expect(document.body.scrollTop).toBe(123);
    expect(pageScroll).not.toHaveBeenCalled();
    click(view, 'Your club');
    expect(names(view)).toEqual(ownFees.slice(0, 50)); expect(view.getByText('1 to 50 of 61')).toBeInTheDocument();
    click(view, 'Next deals');
    expect(names(view)).toEqual(ownFees.slice(50));
    click(view, 'Most recent');
    expect(names(view)).toEqual(newest(own).slice(0, 50)); expect(view.getByText('1 to 50 of 61')).toBeInTheDocument();
    click(view, 'Next deals'); click(view, 'All clubs');
    expect(names(view)).toEqual(newest(log).slice(0, 50)); expect(view.getByText('1 to 50 of 80')).toBeInTheDocument();
    click(view, 'Next deals');
    view.update({ ...career, transferLog: own.slice(0, 3) });
    evidence.pages.push(snapshot(view));
    expect(names(view)).toEqual(newest(own.slice(0, 3)));
    expect(view.queryByRole('button', { name: 'Next deals' })).toBeNull();
    view.update(career); click(view, 'Biggest fees'); click(view, 'Your club'); click(view, 'Next deals');
    view.update({ ...career, clubName: 'Fixture buyer' });
    evidence.pages.push(snapshot(view));
    expect(names(view)).toEqual(fees(log, 'Fixture buyer'));
    expect(view.queryByRole('button', { name: 'Next deals' })).toBeNull();
    evidence.careerAfter = JSON.stringify(career); evidence.draws = random.mock.results.map(result => result.value);
    expect(evidence.careerAfter).toBe(before); expect(view.action).not.toHaveBeenCalled(); expect(random).not.toHaveBeenCalled();
  });

  it(CASE_TITLES.allFirstFifty, () => {
    const { career, log } = fixture(), view = screen(career);
    cases.allFirstFifty = { retained: log.length, expected: newest(log).slice(0, 50), observedNames: names(view),
      disclaimer: view.queryByText('Recent recorded deals only. Older moves may no longer be in this save.')?.textContent ?? null };
    expect(log).toHaveLength(80);
    expect(names(view)).toEqual(newest(log).slice(0, 50));
    expect(view.getByText('Recent recorded deals only. Older moves may no longer be in this save.')).toBeInTheDocument();
  });

  it(CASE_TITLES.smallOwn, () => {
    const { career, own, noise } = fixture();
    career.transferLog = [...own.slice(0, 4), noise[0]];
    const view = screen(career); click(view, 'Your club');
    const recent = snapshot(view); click(view, 'Biggest fees');
    cases.smallOwn = { recent, fee: snapshot(view), records: career.transferLog, netLedger: career.seasonSignings };
    expect(recent.names).toEqual(newest(own.slice(0, 4)));
    expect(names(view)).toEqual([own[0].name, own[1].name, own[2].name, own[3].name]);
    exactRows(view, own.slice(0, 4), career);
    expect(view.queryByText(noise[0].name, { exact: true })).toBeNull();
    expect(view.queryByRole('button', { name: 'Next deals' })).toBeNull();
    expect(career.transferLog[1].fee).toBe(9); expect(career.seasonSignings[0].fee).toBe(7);
  });

  it(CASE_TITLES.boundaries, () => {
    const { career, own } = fixture(), view = screen({ ...career, transferLog: [] });
    const observations: { count: number; all: ReturnType<typeof snapshot>; mine: ReturnType<typeof snapshot>; emptyAll: boolean; emptyMine: boolean }[] = [];
    for (const count of [0, 1, 50]) {
      view.update({ ...career, transferLog: own.slice(0, count) }); click(view, 'All clubs');
      const all = snapshot(view), emptyAll = view.queryByText('No transfers yet. Open a window and make some noise.') !== null;
      click(view, 'Your club');
      observations.push({ count, all, mine: snapshot(view), emptyAll, emptyMine: view.queryByText('No recent recorded deals for your club.') !== null });
    }
    cases.boundaries = observations;
    for (const row of observations) {
      expect(row.all.names).toEqual(newest(own.slice(0, row.count))); expect(row.mine.names).toEqual(row.all.names);
      expect(row.all.next.present).toBe(false); expect(row.mine.next.present).toBe(false);
      expect(row.emptyAll).toBe(row.count === 0); expect(row.emptyMine).toBe(row.count === 0);
    }
  });

  it(CASE_TITLES.readOnly, () => {
    const { career } = fixture(), before = JSON.stringify(career), view = screen(career, true);
    const random = vi.spyOn(Math, 'random');
    click(view, 'Your club'); click(view, 'Biggest fees'); click(view, 'Most recent'); click(view, 'All clubs');
    const history = { names: names(view) }; click(view, 'Buy');
    const business = view.getByTestId('cm-season-business'), feedback = view.getByTestId('cm-desk-note');
    fireEvent.click(view.getByRole('button', { name: 'Dismiss' }));
    cases.readOnly = { careerBefore: before, careerAfter: JSON.stringify(career), history, business: business.textContent,
      feedback: { role: feedback.getAttribute('role'), text: feedback.textContent }, actionCalls: view.action.mock.calls,
      clearCalls: view.clearNote.mock.calls, draws: random.mock.results.map(result => result.value) };
    expect(JSON.stringify(career)).toBe(before);
    expect(business).toHaveTextContent(career.seasonSignings[0].name); expect(business).toHaveTextContent(moneyIn(career)(7));
    expect(feedback).toHaveAttribute('role', 'status'); expect(feedback).toHaveTextContent('Fixture refusal. The saved deal remains unchanged.');
    expect(view.action).not.toHaveBeenCalled(); expect(view.clearNote).toHaveBeenCalledTimes(1); expect(random).not.toHaveBeenCalled();
  });
});

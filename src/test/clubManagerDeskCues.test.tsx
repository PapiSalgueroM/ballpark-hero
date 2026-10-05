import { useState } from 'react';
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ContractsCard } from '@/components/club-manager/ContractsCard';
import { AcademyScreen } from '@/components/club-manager/AcademyScreen';
import { FacilitiesScreen } from '@/components/club-manager/FacilitiesScreen';
import { DESK_CUE_MS } from '@/components/club-manager/deskCue';
import {
  startCareer, moneyIn, renewContract, renewContractWithClause, releasePlayer, signFreeAgent,
  promoteProspect, ensureFreeAgents, freeAgentBlock, releaseBlock, type CareerState, type Prospect,
} from '@/lib/clubManager';
import {
  CLUB_FACILITY_INFO, FACILITY_IDS, FACILITY_MAX, facilitiesOf, facilityEffectLine, upgradeFacility,
} from '@/lib/clubManagerFacilities';
import type { FacilityId } from '@/lib/clubManagerFacilities';

/* Round 982: the desk cues. Every case presses the real control against a
   career built by the real engine, and the expected line is read off the save
   the parent ends up holding, never off the screen's own arithmetic. A refused
   press (the parent leaves the save alone) and a press the parent answers with
   some other change must both say nothing, and a desk reopened on a save that
   already changed must not replay the line.

   scripts/simClubManagerDeskCues.mjs runs this file in the sim suite and owns
   its negative controls: each one swaps a one line broken copy of a desk in
   through NO_DOUBLE_SWAP and names the exact cases that must fail. */

const fx = { players: 'Existing real career players from the shipped data; only contract years and the kitty are set here.' };

function base(budget = 400): CareerState {
  const c = startCareer('Brentford');
  ensureFreeAgents(c);
  return { ...c, budget, squad: c.squad.map(p => ({ ...p, contractYears: Math.max(2, p.contractYears ?? 2) })) };
}
function expiringFixture(): { career: CareerState; id: string } {
  const c = base();
  const target = c.squad.find(p => !p.onLoan && !p.isYouth && p.age >= 20 && p.age <= 29)!;
  expect(target, fx.players).toBeDefined();
  return { id: target.id, career: { ...c, squad: c.squad.map(p => (p.id === target.id ? { ...p, contractYears: 1 } : p)) } };
}

type Change = (c: CareerState) => CareerState | null;
/** A parent that applies the engine the way useClubManager does: `?? prev`. */
function Desk({ initial, observe, show }: {
  initial: CareerState;
  observe: (c: CareerState) => void;
  show: (career: CareerState, apply: (f: Change) => void) => JSX.Element;
}) {
  const [career, setCareer] = useState(initial);
  observe(career);
  return show(career, f => setCareer(prev => f(prev) ?? prev));
}

const cueOf = (id: string) => screen.getByTestId(id);
/** The line on show, or '' when nothing is on show. */
const said = (id: string) => (screen.queryByTestId(id)?.textContent ?? '').trim();
/** A desk's live region: in the page from the first render, so only its words change. */
const live = (id: string) => document.querySelector<HTMLElement>(`[data-desk-cue-live="${id}"]`);
/** What a screen reader is told, read off the live region. */
const heard = (id: string) => (live(id)?.textContent ?? '').trim();
/** Before any press the region already exists, empty, and is no role=status. */
function listening(id: string) {
  const region = live(id);
  expect(region, `${id} needs its live region before anything is said`).not.toBeNull();
  expect(region).toHaveAttribute('aria-live', 'polite');
  expect(region).not.toHaveAttribute('role');
  expect(heard(id)).toBe('');
  return region!;
}
/** Nothing said: no pill on show, every desk region empty, and no role=status
    from a desk (the shape the contract and facility preview tests hold). */
function silent() {
  expect(document.querySelectorAll('[data-desk-cue]')).toHaveLength(0);
  document.querySelectorAll('[data-desk-cue-live]').forEach(r => expect(r.textContent).toBe(''));
  expect(document.querySelectorAll('[data-desk-cue-live][role], [data-desk-cue-anchor] [role="status"]')).toHaveLength(0);
}

beforeEach(() => localStorage.clear());
afterEach(() => { cleanup(); vi.useRealTimers(); vi.restoreAllMocks(); });

/* ---------------- contracts ---------------- */

function mountContracts(initial: CareerState, change: (kind: string, key: string) => Change) {
  let latest = initial;
  const view = render(
    <Desk initial={initial} observe={c => { latest = c; }} show={(career, apply) => (
      <ContractsCard
        career={career}
        onRenew={id => apply(change('renew', id))}
        onRenewWithClause={id => apply(change('clause', id))}
        onRelease={id => apply(change('release', id))}
        onSignFreeAgent={name => apply(change('sign', name))}
      />
    )} />,
  );
  return { view, after: () => latest };
}
const realContracts = (kind: string, key: string): Change => c => (
  kind === 'renew' ? renewContract(c, key)
    : kind === 'clause' ? renewContractWithClause(c, key)
      : kind === 'release' ? releasePlayer(c, key)
        : signFreeAgent(c, key));
const refuse = (): Change => () => null;

describe('Club Manager desk cues: contracts', () => {
  it('a plain renewal says who and the terms the save now holds, on the slam, once', () => {
    const { career, id } = expiringFixture();
    const { view, after } = mountContracts(career, realContracts);
    expect(said('cm-contracts-cue')).toBe('');
    const region = listening('cm-contracts-cue');
    fireEvent.click(within(view.container).getByRole('button', { name: /^Renew ·/ }));
    const saved = after();
    const p = saved.squad.find(x => x.id === id)!;
    expect(saved).not.toBe(career);
    const fee = Math.round((career.budget - saved.budget) * 10) / 10;
    const line = `Renewed: ${p.name}. ${p.contractYears} years at ${p.wage}k a week, no release clause, ${moneyIn(saved)(fee)} to sign.`;
    expect(said('cm-contracts-cue')).toBe(line);
    /* The same region took the words (it was not swapped for a new one), and
       the pill is for the eye only, so nothing is read twice. */
    expect(live('cm-contracts-cue')).toBe(region);
    expect(heard('cm-contracts-cue')).toBe(line);
    expect(cueOf('cm-contracts-cue')).toHaveAttribute('aria-hidden', 'true');
    expect(cueOf('cm-contracts-cue').querySelector('p')).toHaveClass('cm-slam');
    /* Reopened on the save that already changed: nothing replays. */
    cleanup();
    render(<ContractsCard career={saved} onRenew={vi.fn()} onRenewWithClause={vi.fn()} />);
    expect(said('cm-contracts-cue')).toBe('');
    listening('cm-contracts-cue');
  });

  it('a clause renewal names the exit clause the save wrote', () => {
    const { career, id } = expiringFixture();
    const { view, after } = mountContracts(career, realContracts);
    fireEvent.click(within(view.container).getByRole('button', { name: /^\+Clause ·/ }));
    const p = after().squad.find(x => x.id === id)!;
    expect(p.releaseClause).toBeGreaterThan(0);
    expect(said('cm-contracts-cue')).toContain(`Renewed: ${p.name}. ${p.contractYears} years at ${p.wage}k a week, exit clause ${moneyIn(career)(p.releaseClause as number)},`);
  });

  it('a release states the settlement row the save holds', () => {
    const career = base();
    const victim = career.squad.find(p => !p.onLoan && !p.isYouth && p.age >= 20 && !releaseBlock(career, p))!;
    expect(victim).toBeDefined();
    const { view, after } = mountContracts(career, realContracts);
    fireEvent.click(view.container.querySelector(`[data-release-id="${victim.id}"]`)!);
    fireEvent.click(within(view.container).getByRole('button', { name: 'Release him' }));
    const rows = after().severance ?? [];
    const row = rows[rows.length - 1];
    expect(row.name).toBe(victim.name);
    expect(after().squad.some(x => x.id === victim.id)).toBe(false);
    expect(row.weeksLeft).toBeGreaterThan(1);
    expect(said('cm-contracts-cue')).toBe(`Released: ${row.name}. You pay him ${row.weekly}k a week for ${row.weeksLeft} more weeks.`);
    expect(heard('cm-contracts-cue')).toBe(said('cm-contracts-cue'));
  });

  it('a release with one week left to pay says one week, not one weeks', () => {
    const c = base();
    const victim = c.squad.find(p => !p.onLoan && !p.isYouth && p.age >= 20 && !releaseBlock(c, p))!;
    expect(victim).toBeDefined();
    /* One year left on his deal and one week left in the season: severanceFor
       owes exactly one more week. */
    const career: CareerState = {
      ...c,
      week: Math.max(1, c.calendar.length - 1),
      squad: c.squad.map(p => (p.id === victim.id ? { ...p, contractYears: 1 } : p)),
    };
    expect(releaseBlock(career, career.squad.find(p => p.id === victim.id)!)).toBeNull();
    const { view, after } = mountContracts(career, realContracts);
    fireEvent.click(view.container.querySelector(`[data-release-id="${victim.id}"]`)!);
    fireEvent.click(within(view.container).getByRole('button', { name: 'Release him' }));
    const rows = after().severance ?? [];
    const row = rows[rows.length - 1];
    expect(row.name).toBe(victim.name);
    expect(row.weeksLeft).toBe(1);
    expect(said('cm-contracts-cue')).toBe(`Released: ${row.name}. You pay him ${row.weekly}k a week for 1 more week.`);
  });

  it('a free agent signing states the deal the save gave him', () => {
    const career = base();
    const pool = career.freeAgents ?? [];
    const fa = pool.find(f => !freeAgentBlock(career, f))!;
    expect(fa, 'the started career needs one signable free agent').toBeDefined();
    const { view, after } = mountContracts(career, realContracts);
    fireEvent.click(view.container.querySelector(`[data-sign-index="${pool.indexOf(fa)}"]`)!);
    const had = new Set(career.squad.map(x => x.id));
    const p = after().squad.find(x => !had.has(x.id))!;
    expect(p.name).toBe(fa.name);
    const fee = Math.round((career.budget - after().budget) * 10) / 10;
    expect(said('cm-contracts-cue')).toBe(`Signed: ${p.name}. ${p.contractYears} years at ${p.wage}k a week, ${moneyIn(career)(fee)} to sign.`);
  });

  it('a refused press and a save that moved some other way say nothing', () => {
    const { career } = expiringFixture();
    const refused = mountContracts(career, refuse);
    fireEvent.click(within(refused.view.container).getByRole('button', { name: /^Renew ·/ }));
    expect(refused.after()).toBe(career);
    expect(said('cm-contracts-cue')).toBe('');
    silent();
    cleanup();
    /* The parent answers with a different change: the kitty moves but no deal is signed. */
    const moved = mountContracts(career, () => c => ({ ...c, budget: c.budget - 1 }));
    fireEvent.click(within(moved.view.container).getByRole('button', { name: /^Renew ·/ }));
    expect(moved.after()).not.toBe(career);
    expect(said('cm-contracts-cue')).toBe('');
    silent();
  });

  it('the line clears on its timer', () => {
    vi.useFakeTimers();
    const { career } = expiringFixture();
    const { view } = mountContracts(career, realContracts);
    fireEvent.click(within(view.container).getByRole('button', { name: /^Renew ·/ }));
    expect(said('cm-contracts-cue')).toMatch(/^Renewed: /);
    act(() => { vi.advanceTimersByTime(DESK_CUE_MS + 10); });
    expect(said('cm-contracts-cue')).toBe('');
    expect(heard('cm-contracts-cue')).toBe('');
  });

  it('while the cookie banner is unanswered the line sits above it, and drops back once it is answered', () => {
    /* The banner's own shape (CookieConsent: role=region, "Cookie choices",
       fixed to the foot, body flagged while consent is pending). jsdom has no
       layout, so its top edge is stubbed where the 390 by 740 walk measured it. */
    const banner = document.createElement('div');
    banner.setAttribute('role', 'region');
    banner.setAttribute('aria-label', 'Cookie choices');
    banner.style.position = 'fixed';
    const top = window.innerHeight - 143;
    vi.spyOn(banner, 'getBoundingClientRect').mockReturnValue({ top, bottom: window.innerHeight, left: 0, right: 390, width: 390, height: 143, x: 0, y: top, toJSON: () => ({}) } as DOMRect);
    document.body.appendChild(banner);
    document.body.dataset.consentPending = '1';
    try {
      const { career } = expiringFixture();
      const { view } = mountContracts(career, realContracts);
      const anchor = view.container.querySelector<HTMLElement>('[data-desk-cue-anchor]')!;
      expect(anchor.style.bottom).toBe('');
      fireEvent.click(within(view.container).getByRole('button', { name: /^Renew ·/ }));
      expect(said('cm-contracts-cue')).toMatch(/^Renewed: /);
      expect(anchor.style.bottom).toBe(`${143 + 12}px`);
      cleanup();
      /* Answered: the banner is gone, the next line sits at the foot again. */
      delete document.body.dataset.consentPending;
      const again = mountContracts(expiringFixture().career, realContracts);
      fireEvent.click(within(again.view.container).getByRole('button', { name: /^Renew ·/ }));
      expect(said('cm-contracts-cue')).toMatch(/^Renewed: /);
      expect(again.view.container.querySelector<HTMLElement>('[data-desk-cue-anchor]')!.style.bottom).toBe('');
    } finally {
      delete document.body.dataset.consentPending;
      banner.remove();
    }
  });
});

/* ---------------- academy ---------------- */

/** A made up kid for the fixture, not a real person, on a fee the kitty covers. */
function kid(fee: number): Prospect {
  return { id: 'desk-cue-kid', name: 'Fixture Academy Kid', position: 'CM', age: 17, rating: 58, potential: 78, lowGuess: 70, highGuess: 82, source: 'Academy', flag: '', fee, season: 1 };
}
function academyFixture(fee = 0.5): CareerState {
  const c = base();
  return { ...c, academy: { recruitment: 5, coaching: 5, facilities: 5, scouts: [], candidates: [], prospects: [kid(fee)], lastIntakeSeason: c.season } };
}
function mountAcademy(initial: CareerState, change: (id: string) => Change) {
  let latest = initial;
  const view = render(
    <Desk initial={initial} observe={c => { latest = c; }} show={(career, apply) => (
      <AcademyScreen career={career} onUpgrade={vi.fn()} onHire={vi.fn()} onRecall={vi.fn()} onRelease={vi.fn()} onPromote={id => apply(change(id))} />
    )} />,
  );
  return { view, after: () => latest };
}

describe('Club Manager desk cues: academy', () => {
  it('a promotion names the kid and says he joined the first team, from the save', () => {
    const career = academyFixture();
    expect(career.squad.length).toBeLessThan(30);
    const { after } = mountAcademy(career, id => c => promoteProspect(c, id));
    expect(said('cm-academy-cue')).toBe('');
    listening('cm-academy-cue');
    fireEvent.click(screen.getByRole('button', { name: 'Sign him' }));
    const saved = after();
    const had = new Set(career.squad.map(x => x.id));
    const p = saved.squad.find(x => !had.has(x.id))!;
    expect(p.name).toBe('Fixture Academy Kid');
    expect(saved.academy?.prospects ?? []).toHaveLength(0);
    /* What he cost is read off the kitty the save holds, not off his row. */
    const fee = Math.round((career.budget - saved.budget) * 10) / 10;
    expect(fee).toBe(0.5);
    expect(said('cm-academy-cue')).toBe(`Fixture Academy Kid has joined the first team. ${p.contractYears} years at ${p.wage}k a week, ${moneyIn(saved)(fee)} to sign.`);
    expect(heard('cm-academy-cue')).toBe(said('cm-academy-cue'));
    expect(cueOf('cm-academy-cue').querySelector('p')).toHaveClass('cm-slam');
    cleanup();
    render(<AcademyScreen career={saved} onUpgrade={vi.fn()} onHire={vi.fn()} onRecall={vi.fn()} onRelease={vi.fn()} onPromote={vi.fn()} />);
    expect(said('cm-academy-cue')).toBe('');
  });

  it('a refused promotion and a save that moved some other way say nothing', () => {
    const career = academyFixture();
    const refused = mountAcademy(career, refuse);
    fireEvent.click(screen.getByRole('button', { name: 'Sign him' }));
    expect(refused.after()).toBe(career);
    expect(said('cm-academy-cue')).toBe('');
    cleanup();
    /* He leaves the books but nobody joins the squad: no line claims he did. */
    const moved = mountAcademy(career, () => c => ({ ...c, academy: { ...c.academy!, prospects: [] } }));
    fireEvent.click(screen.getByRole('button', { name: 'Sign him' }));
    expect(moved.after()).not.toBe(career);
    expect(said('cm-academy-cue')).toBe('');
    silent();
  });

  it('a desk opened before the academy exists survives it opening, and a free kid is free to sign', () => {
    /* The screen's hooks run above its "academy opens later" return, so the
       render that finds an academy calls the same hooks as the one that did
       not (React error 310 otherwise). */
    const closed: CareerState = { ...base(), academy: undefined };
    let open: (c: CareerState) => void = () => undefined;
    let latest = closed;
    function Host() {
      const [career, setCareer] = useState(closed);
      open = setCareer;
      latest = career;
      return <AcademyScreen career={career} onUpgrade={vi.fn()} onHire={vi.fn()} onRecall={vi.fn()} onRelease={vi.fn()} onPromote={id => setCareer(prev => promoteProspect(prev, id) ?? prev)} />;
    }
    render(<Host />);
    expect(screen.getByText(/academy opens the first time/i)).toBeInTheDocument();
    const opened = academyFixture(0);
    act(() => open(opened));
    listening('cm-academy-cue');
    fireEvent.click(screen.getByRole('button', { name: 'Sign him' }));
    const p = latest.squad.find(x => x.name === 'Fixture Academy Kid')!;
    expect(p).toBeDefined();
    expect(latest.budget).toBe(opened.budget);
    expect(said('cm-academy-cue')).toBe(`Fixture Academy Kid has joined the first team. ${p.contractYears} years at ${p.wage}k a week, free to sign.`);
  });
});

/* ---------------- facilities ---------------- */

function mountFacilities(initial: CareerState, change: (id: FacilityId) => Change) {
  let latest = initial;
  const view = render(
    <Desk initial={initial} observe={c => { latest = c; }} show={(career, apply) => (
      <FacilitiesScreen career={career} onUpgrade={id => apply(change(id))} />
    )} />,
  );
  return { view, after: () => latest };
}
const upgradable = (c: CareerState) => FACILITY_IDS.find(id => upgradeFacility(c, id) !== null)!;
const upgradeButton = (container: HTMLElement, id: FacilityId) =>
  within(container.querySelector<HTMLElement>(`[data-facility="${id}"]`)!).getByRole('button');

describe('Club Manager desk cues: facilities', () => {
  it('the pip the upgrade lit pulses once and the Now line ticks in with the saved level', () => {
    const career = base(999);
    const id = upgradable(career);
    const from = facilitiesOf(career)[id];
    const { view, after } = mountFacilities(career, f => c => upgradeFacility(c, f));
    expect(view.container.querySelector('[data-facility-pip-fresh]')).toBeNull();
    const region = listening('cm-facilities-cue');
    fireEvent.click(upgradeButton(view.container, id));
    expect(live('cm-facilities-cue')).toBe(region);
    const saved = after();
    const level = facilitiesOf(saved)[id];
    expect(level).toBe(from + 1);
    const row = view.container.querySelector<HTMLElement>(`[data-facility="${id}"]`)!;
    const pips = row.querySelectorAll('[aria-hidden] > span');
    expect(pips).toHaveLength(FACILITY_MAX);
    const fresh = row.querySelectorAll('[data-facility-pip-fresh]');
    expect(fresh).toHaveLength(1);
    expect(fresh[0]).toBe(pips[level - 1]);
    expect(fresh[0]).toHaveClass('cm-win-pulse');
    const now = row.querySelector('[data-facility-current]')!;
    expect(now).toHaveClass('cm-tick-in');
    /* The Now line opens on the engine's effect line for the saved level
       (the training ground's card may add Round 963's ceiling sentence), and
       the spoken line repeats that Now line word for word. */
    const nowText = (now.textContent ?? '').replace(/^Now: /, '');
    expect(nowText.startsWith(facilityEffectLine(saved, id))).toBe(true);
    expect(said('cm-facilities-cue')).toBe(`${CLUB_FACILITY_INFO[id].label} is level ${level} of ${FACILITY_MAX} now. ${nowText}`);
    /* Only the pressed facility moves. */
    expect(view.container.querySelectorAll('[data-facility-fresh]')).toHaveLength(1);
  });

  it('every step of the ladder, pressed in a row, pulses the pip it lit and only that one', () => {
    const career = base(99999);
    const id = FACILITY_IDS.find(f => facilitiesOf(career)[f] <= FACILITY_MAX - 2)!;
    expect(id, 'one facility with at least two levels to climb').toBeDefined();
    const { view, after } = mountFacilities(career, f => c => upgradeFacility(c, f));
    const row = () => view.container.querySelector<HTMLElement>(`[data-facility="${id}"]`)!;
    let steps = 0;
    while (upgradeFacility(after(), id) !== null) {
      const before = facilitiesOf(after())[id];
      fireEvent.click(upgradeButton(view.container, id));
      const level = facilitiesOf(after())[id];
      expect(level).toBe(before + 1);
      const fresh = row().querySelectorAll('[data-facility-pip-fresh]');
      expect(fresh).toHaveLength(1);
      expect(fresh[0]).toBe(row().querySelectorAll('[aria-hidden] > span')[level - 1]);
      const nowText = (row().querySelector('[data-facility-current]')?.textContent ?? '').replace(/^Now: /, '');
      expect(nowText.startsWith(facilityEffectLine(after(), id))).toBe(true);
      expect(said('cm-facilities-cue')).toBe(`${CLUB_FACILITY_INFO[id].label} is level ${level} of ${FACILITY_MAX} now. ${nowText}`);
      steps++;
    }
    expect(facilitiesOf(after())[id]).toBe(FACILITY_MAX);
    expect(steps).toBeGreaterThanOrEqual(2);
    /* At the top the button is Maxed and disabled: nothing more to say. */
    expect(upgradeButton(view.container, id)).toBeDisabled();
  });

  it('a refused upgrade and a save that moved some other way say nothing', () => {
    const career = base(999);
    const id = upgradable(career);
    const refused = mountFacilities(career, refuse);
    fireEvent.click(upgradeButton(refused.view.container, id));
    expect(refused.after()).toBe(career);
    expect(refused.view.container.querySelector('[data-facility-pip-fresh], [data-facility-fresh]')).toBeNull();
    expect(said('cm-facilities-cue')).toBe('');
    silent();
    cleanup();
    const moved = mountFacilities(career, () => c => ({ ...c, budget: c.budget - 1 }));
    fireEvent.click(upgradeButton(moved.view.container, id));
    expect(moved.view.container.querySelector('[data-facility-pip-fresh], [data-facility-fresh]')).toBeNull();
    expect(said('cm-facilities-cue')).toBe('');
    silent();
  });
});

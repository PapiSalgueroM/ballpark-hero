import { useState } from 'react';
import { cleanup, fireEvent, render, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { FacilitiesScreen } from '@/components/club-manager/FacilitiesScreen';
import { moneyIn, startCareer, type CareerState } from '@/lib/clubManager';
import { FACILITY_IDS, FACILITY_MAX, facilitiesOf, facilityEffectLine, facilityUpgradeCost, upgradeFacility, type FacilityId } from '@/lib/clubManagerFacilities';

const row = (container: HTMLElement, id: FacilityId) => container.querySelector<HTMLElement>(`[data-facility="${id}"]`)!;
const preview = (container: HTMLElement, id: FacilityId) => row(container, id).querySelector<HTMLElement>('[data-facility-preview]');
const fixture = () => startCareer('Brentford');

function expectPreview(container: HTMLElement, initial: CareerState, id: FacilityId) {
  const next = upgradeFacility(initial, id)!;
  expect(next).not.toBeNull();
  expect(preview(container, id)).toHaveTextContent(`Next, level ${facilitiesOf(next)[id]}: ${facilityEffectLine(next, id)}`);
  expect(preview(container, id)).toHaveTextContent(`Leaves ${moneyIn(initial)(next.budget)} in the transfer kitty.`);
  return next;
}

function CommittingFacilities({ initial, onUpgrade, observe }: { initial: CareerState; onUpgrade: (id: FacilityId) => void; observe: (state: CareerState) => void }) {
  const [career, setCareer] = useState(initial);
  observe(career);
  return <FacilitiesScreen career={career} onUpgrade={id => {
    onUpgrade(id);
    const next = upgradeFacility(career, id);
    if (next) setCareer(next);
  }} />;
}

afterEach(() => { cleanup(); vi.restoreAllMocks(); });

describe('Club Manager facilities preview', () => {
  it('quotes all four real upgrades without changing the career, callbacks or storage', () => {
    const initial = fixture();
    const before = JSON.stringify(initial);
    const writes = vi.spyOn(Storage.prototype, 'setItem');
    const onUpgrade = vi.fn();
    const view = render(<FacilitiesScreen career={initial} onUpgrade={onUpgrade} />);
    FACILITY_IDS.forEach(id => expectPreview(view.container, initial, id));
    view.rerender(<FacilitiesScreen career={{ ...initial }} onUpgrade={onUpgrade} />);
    expect(JSON.stringify(initial)).toBe(before);
    expect(onUpgrade).not.toHaveBeenCalled();
    expect(writes).not.toHaveBeenCalled();
  });

  it.each(FACILITY_IDS)('makes the %s forecast become the actual engine level, effect and remaining budget', id => {
    const initial = fixture();
    const before = JSON.stringify(initial);
    const onUpgrade = vi.fn();
    let observed = initial;
    const view = render(<CommittingFacilities initial={initial} onUpgrade={onUpgrade} observe={career => { observed = career; }} />);
    const expected = expectPreview(view.container, initial, id);
    fireEvent.click(within(row(view.container, id)).getByRole('button'));
    expect(onUpgrade).toHaveBeenCalledExactlyOnceWith(id);
    expect(observed).toEqual(expected);
    expect(row(view.container, id)).toHaveAttribute('data-facility-level', String(facilitiesOf(expected)[id]));
    expect(row(view.container, id).querySelector('[data-facility-current]')).toHaveTextContent(facilityEffectLine(expected, id));
    expect(view.getByText(`Facilities · ${moneyIn(expected)(expected.budget)} to spend`, { exact: false })).toBeVisible();
    expect(JSON.stringify(initial)).toBe(before);
  });

  it('owns up to the growth ceiling on the training ground card only, counting a regular season', () => {
    /* Round 963: the training ground's lift sits inside developmentRate's clamp. The kid has
       played twelve games and the other none, and both count because the card reads a
       regular's season. The veteran turns thirty and never grows; the slow man is far off. */
    /* Every facility above level 1, so the three that must stay quiet are not quiet for that reason. */
    let initial: CareerState = { ...fixture(), budget: 3000 };
    for (const id of FACILITY_IDS) initial = upgradeFacility(initial, id) ?? initial;
    const young = { ...initial.squad[0], position: 'CM', rating: 60, potential: 80, age: 19, apps: 12, onLoan: false } as CareerState['squad'][number];
    initial.squad = [
      { ...young, id: 'fixture-kid', name: 'Fixture Kid' },
      { ...young, id: 'fixture-summer', name: 'Fixture Summer', apps: 0 },
      { ...young, id: 'fixture-veteran', name: 'Fixture Veteran', age: 29 },
      { ...young, id: 'fixture-slow', name: 'Fixture Slow', potential: 62 },
    ];
    initial.academy = { ...initial.academy!, coaching: 20, facilities: 20 };
    initial.training = { intensity: 'double', focus: 'balanced' };
    const view = render(<FacilitiesScreen career={initial} onUpgrade={vi.fn()} />);
    expect(facilitiesOf(initial).trainingGround).toBeGreaterThan(1);
    expect(row(view.container, 'trainingGround').querySelector('[data-facility-current]')).toHaveTextContent(
      `Now: ${facilityEffectLine(initial, 'trainingGround')} As regulars, 2 players would be growing as fast as anyone can, so they would get less of the lift.`);
    for (const id of FACILITY_IDS.filter(other => other !== 'trainingGround')) {
      expect(facilitiesOf(initial)[id]).toBeGreaterThan(1);
      expect(row(view.container, id)).not.toHaveTextContent('as fast as anyone can');
    }
  });

  it('explains each exact shortfall and never calls a blocked upgrade', () => {
    const initial = { ...fixture(), budget: 0 };
    const onUpgrade = vi.fn();
    const view = render(<FacilitiesScreen career={initial} onUpgrade={onUpgrade} />);
    for (const id of FACILITY_IDS) {
      expect(preview(view.container, id)).toBeNull();
      expect(row(view.container, id)).toHaveTextContent(`Need ${moneyIn(initial)(facilityUpgradeCost(initial, id)! - initial.budget)} more to upgrade.`);
      const button = within(row(view.container, id)).getByRole('button');
      expect(button).toBeDisabled();
      fireEvent.click(button);
    }
    expect(onUpgrade).not.toHaveBeenCalled();
  });

  it('explains the reached cap without advertising or calling another upgrade', () => {
    let initial = { ...fixture(), budget: 3000 };
    for (const id of FACILITY_IDS) while (facilitiesOf(initial)[id] < FACILITY_MAX) initial = upgradeFacility(initial, id)!;
    const onUpgrade = vi.fn();
    const view = render(<FacilitiesScreen career={initial} onUpgrade={onUpgrade} />);
    for (const id of FACILITY_IDS) {
      expect(preview(view.container, id)).toBeNull();
      expect(row(view.container, id)).toHaveTextContent('Maximum level reached.');
      const button = within(row(view.container, id)).getByRole('button', { name: 'Maxed' });
      expect(button).toBeDisabled();
      fireEvent.click(button);
    }
    expect(onUpgrade).not.toHaveBeenCalled();
  });

  it('allows the exact affordable boundary and shows zero remaining before the real purchase', () => {
    const initial = fixture();
    initial.budget = facilityUpgradeCost(initial, 'medical')!;
    const onUpgrade = vi.fn();
    let observed = initial;
    const view = render(<CommittingFacilities initial={initial} onUpgrade={onUpgrade} observe={career => { observed = career; }} />);
    const expected = expectPreview(view.container, initial, 'medical');
    expect(expected.budget).toBe(0);
    const button = within(row(view.container, 'medical')).getByRole('button');
    expect(button).toBeEnabled();
    fireEvent.click(button);
    expect(onUpgrade).toHaveBeenCalledExactlyOnceWith('medical');
    expect(observed).toEqual(expected);
    expect(button).toBeDisabled();
    expect(row(view.container, 'medical')).toHaveTextContent(`Need ${moneyIn(expected)(facilityUpgradeCost(expected, 'medical')!)} more to upgrade.`);
  });

  it('previews the supported legacy facilities fallback without repairing the input during render', () => {
    const initial = fixture();
    delete initial.facilities;
    const before = JSON.stringify(initial);
    const view = render(<FacilitiesScreen career={initial} onUpgrade={vi.fn()} />);
    FACILITY_IDS.forEach(id => expectPreview(view.container, initial, id));
    expect(JSON.stringify(initial)).toBe(before);
    expect(initial.facilities).toBeUndefined();
  });

  it('keeps the actual level and budget when an upgrade callback does not commit', () => {
    const initial = fixture();
    const onUpgrade = vi.fn();
    const view = render(<FacilitiesScreen career={initial} onUpgrade={onUpgrade} />);
    const before = view.container.innerHTML;
    fireEvent.click(within(row(view.container, 'trainingGround')).getByRole('button'));
    expect(onUpgrade).toHaveBeenCalledExactlyOnceWith('trainingGround');
    expect(view.container.innerHTML).toBe(before);
    expect(view.queryByRole('status')).toBeNull();
  });

  it('keeps the native keyboard action and focus through an actual upgrade', () => {
    const initial = fixture();
    const onUpgrade = vi.fn();
    const view = render(<CommittingFacilities initial={initial} onUpgrade={onUpgrade} observe={() => {}} />);
    const button = within(row(view.container, 'dressingRoom')).getByRole('button');
    button.focus();
    expect(button).toHaveFocus();
    expect(fireEvent.keyDown(button, { key: 'Enter' })).toBe(true);
    fireEvent.click(button);
    fireEvent.keyUp(button, { key: 'Enter' });
    expect(onUpgrade).toHaveBeenCalledExactlyOnceWith('dressingRoom');
    expect(within(row(view.container, 'dressingRoom')).getByRole('button')).toBe(button);
    expect(button).toHaveFocus();
  });
});

import React, { StrictMode, useCallback, useLayoutEffect, useState } from 'react';
import { act, cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { CareerState, ClubData } from '@/lib/soccerCareerEngine';
import * as E from '@/lib/soccerCareerEngine';
import { serializeSoccerCareerSave } from '@/lib/soccerCareerSave';
import { advanceReviewedManagerSeason, quoteManagerJob, setManagerJobReview } from '@/lib/soccerCareerManagerJobReview';
import { useSoccerManagerJobReview } from '@/hooks/useSoccerManagerJobReview';
import { manager, pending, seeded } from './helpers/managerJobReviewFixtures';

type Controls = ReturnType<typeof useSoccerManagerJobReview> & {
  state: CareerState; revision: number; queueRender: () => void;
  replace: (state: CareerState) => void; replaceClubs: (clubs: ClubData[]) => void;
};
function setup(initial: CareerState) {
  let live: Controls | undefined;
  const adopted = vi.fn();
  function Host() {
    const [state, setState] = useState<CareerState | null>(initial);
    const [clubs, setClubs] = useState(E.FALLBACK_CLUBS);
    const [revision, setRevision] = useState(0);
    const dispatch = useCallback<React.Dispatch<React.SetStateAction<CareerState | null>>>((next) => { adopted(next); setState(next); }, []);
    const api = useSoccerManagerJobReview(state, clubs, dispatch);
    useLayoutEffect(() => { live = { ...api, state: state!, revision, queueRender: () => setRevision(value => value + 1), replace: setState, replaceClubs: setClubs }; });
    return <output data-revision={revision}>{state?.managerState?.club}</output>;
  }
  const view = render(<StrictMode><Host /></StrictMode>);
  return { get current() { return live!; }, adopted, view };
}
afterEach(cleanup);
describe('actual committed manager job review transaction', () => {
  it('StrictMode queued render constructs one canonical season and uses value adoption', () => {
    const input = setManagerJobReview(manager(), E.FALLBACK_CLUBS, true), host = setup(input);
    const expected = seeded(22, () => advanceReviewedManagerSeason(structuredClone(input), E.FALLBACK_CLUBS));
    const actual = seeded(22, () => { act(() => { host.current.queueRender(); host.current.advance(); }); return host.current.state; });
    expect(host.current.revision).toBe(1);
    expect(host.view.container.querySelector('output')?.getAttribute('data-revision')).toBe('1');
    expect(actual.value).toStrictEqual(expected.value);
    expect(serializeSoccerCareerSave(actual.value)).toBe(serializeSoccerCareerSave(expected.value));
    expect(actual.draws).toEqual(expected.draws); expect(actual.next).toBe(expected.next);
    expect(host.adopted).toHaveBeenCalledTimes(1); expect(typeof host.adopted.mock.calls[0][0]).not.toBe('function');
  });
  it('duplicate advance callbacks cannot replay a season or consume another draw', () => {
    const input = setManagerJobReview(manager(), E.FALLBACK_CLUBS, true), host = setup(input), start = host.current.advance;
    const expected = seeded(22, () => advanceReviewedManagerSeason(structuredClone(input), E.FALLBACK_CLUBS));
    const actual = seeded(22, () => { act(() => { start(); start(); }); return host.current.state; });
    expect(actual.value).toStrictEqual(expected.value); expect(actual.draws).toEqual(expected.draws); expect(actual.next).toBe(expected.next);
    expect(host.adopted).toHaveBeenCalledTimes(1);
  });
  it('replaced saves reject captured callbacks and a fresh callback uses the current save', () => {
    const input = setManagerJobReview(manager(), E.FALLBACK_CLUBS, true), host = setup(input), old = host.current.advance;
    const replacement = structuredClone(input);
    act(() => { host.current.replace(replacement); });
    const rejected = seeded(22, () => { act(old); return host.current.state; });
    expect(rejected.value).toBe(replacement); expect(rejected.draws).toHaveLength(0); expect(host.adopted).not.toHaveBeenCalled();
    const expected = seeded(22, () => advanceReviewedManagerSeason(structuredClone(replacement), E.FALLBACK_CLUBS));
    const actual = seeded(22, () => { act(host.current.advance); return host.current.state; });
    expect(actual.value).toStrictEqual(expected.value); expect(actual.draws).toEqual(expected.draws); expect(actual.next).toBe(expected.next);
  });
  it('replaced club pools reject the previous callback without random work', () => {
    const input = setManagerJobReview(manager(), E.FALLBACK_CLUBS, true), host = setup(input), old = host.current.advance;
    act(() => { host.current.replaceClubs([...E.FALLBACK_CLUBS]); });
    const actual = seeded(22, () => { act(old); return host.current.state; });
    expect(actual.value).toBe(input); expect(actual.draws).toHaveLength(0); expect(host.adopted).not.toHaveBeenCalled();
  });
  it('stale choice rejects after a real phone deposit and a fresh choice preserves current money', () => {
    const initial = pending(), host = setup(initial), oldResolve = host.current.resolve, oldQuote = quoteManagerJob(initial, E.FALLBACK_CLUBS)!;
    const changed = E.applyMoneyAction(initial, { t: 'deposit', amount: 0.1 }).state;
    expect(changed).not.toBe(initial);
    act(() => { host.current.replace(changed); });
    const rejected = seeded(3, () => { act(() => oldResolve(oldQuote, 'accept')); return host.current.state; });
    expect(rejected.value).toBe(changed); expect(rejected.draws).toHaveLength(0);
    const quote = quoteManagerJob(changed, E.FALLBACK_CLUBS)!;
    const actual = seeded(3, () => { act(() => { host.current.resolve(quote, 'accept'); host.current.resolve(quote, 'accept'); }); return host.current.state; });
    expect(actual.value.managerState!.club).toBe(quote.destination);
    expect(actual.value.netWorth).toBe(changed.netWorth);
    expect((actual.value as CareerState & { money?: unknown }).money).toStrictEqual((changed as CareerState & { money?: unknown }).money);
    expect(actual.draws).toHaveLength(0); expect(host.adopted).toHaveBeenCalledTimes(1);
  });
  it('unmounted transaction callbacks reject every action without adoption or random work', () => {
    const initial = pending(), host = setup(initial), old = host.current, quote = quoteManagerJob(initial, E.FALLBACK_CLUBS)!;
    host.view.unmount();
    const actual = seeded(1, () => { old.advance(); old.resolve(quote, 'stay'); old.setEnabled(false); });
    expect(actual.draws).toHaveLength(0); expect(host.adopted).not.toHaveBeenCalled();
  });
});

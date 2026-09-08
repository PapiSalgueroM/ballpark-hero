/** Real Conquest pages and real help dialogs, with inert peripheral boards. */
import assert from 'node:assert/strict';
import { Component, ReactNode } from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, it, vi } from 'vitest';
import Conquest from '@/pages/Conquest';
import ConquestNba from '@/pages/ConquestNba';

const fixture = vi.hoisted(() => ({ blocked: '' as '' | 'getter' | 'get' | 'set', unfinished: false, daily: [] as string[] }));
vi.mock('@/components/game/GameNavbar', () => ({ GameNavbar: () => null }));
vi.mock('@/components/game/GameHelp', () => ({ GameHelp: () => null }));
vi.mock('@/components/game/GameNav', () => ({ GameNav: () => null }));
vi.mock('@/components/seo/PageSeo', () => ({ default: () => null }));
vi.mock('@/components/seo/GameSeoContent', () => ({ default: () => null }));
vi.mock('@/components/conquest/ConquestBoard', () => ({ default: () => <p data-testid="arcade-board">NFL Arcade fixture</p> }));
vi.mock('@/components/conquest/ConquestBoardNba', () => ({ default: () => <p data-testid="arcade-board">NBA Arcade fixture</p> }));
vi.mock('@/components/conquest/ImperialismBoardShared', () => ({ default: ({ sport }: { sport: { id: string } }) => <p data-testid="daily-board">{sport.id} Imperialism fixture</p> }));
vi.mock('@/data/conquestSports', () => ({ NFL_CONQUEST_GAME: {}, NFL_IMPERIALISM: { id: 'nfl' }, NBA_CONQUEST_GAME: {}, NBA_IMPERIALISM: { id: 'nba' } }));
vi.mock('@/data/conquestData', () => ({ NFL_CONQUEST_MAP: {} }));
vi.mock('@/data/conquestDataNba', () => ({ NBA_CONQUEST_MAP: {} }));
vi.mock('@/lib/conquestDaily', () => ({ hasUnfinishedDaily: (sport: string) => { fixture.daily.push(sport); return fixture.unfinished; } }));
vi.mock('@/integrations/supabase/client', () => ({ supabase: new Proxy({}, { get() { throw new Error('Unexpected help-test backend access'); } }) }));

const SPORTS = [
  { id: 'nfl', Page: Conquest, key: 'conquest-how-to-play-seen', other: 'conquest-nba-how-to-play-seen' },
  { id: 'nba', Page: ConquestNba, key: 'conquest-nba-how-to-play-seen', other: 'conquest-how-to-play-seen' },
] as const;
const check = (value: unknown, message: string) => assert.ok(value, message);
const shape = (error: unknown) => ({ name: String((error as Error)?.name), message: String((error as Error)?.message) });
let values: Map<string, string>, reads: string[], writes: [string, string][], caught: unknown[], logs: unknown[][], unexpected: string[];
const known = (error: unknown) => {
  const fault = shape(error);
  return ((fixture.blocked === 'getter' || fixture.blocked === 'get') && fault.name === 'SecurityError' && fault.message === 'Synthetic help read denied')
    || (fixture.blocked === 'set' && fault.name === 'QuotaExceededError' && fault.message === 'Synthetic help write denied');
};
class HelpErrorBoundary extends Component<{ children: ReactNode }, { crashed: boolean }> {
  state = { crashed: false };
  static getDerivedStateFromError() { return { crashed: true }; }
  componentDidCatch(error: Error) { caught.push(error); }
  render() { return this.state.crashed ? <p>Fixture caught page error</p> : this.props.children; }
}
function enter(Page: typeof Conquest) {
  render(<HelpErrorBoundary><Page /></HelpErrorBoundary>);
  fireEvent.click(screen.getByRole('button', { name: /Arcade/ }));
}
function closeHelp() { fireEvent.click(screen.getByRole('button', { name: 'Start Conquering!' })); }
function helpOpen() { return !!screen.queryByRole('dialog', { name: 'How to Play' }); }
function reopenHelp() { fireEvent.click(screen.getByRole('button', { name: 'How to play' })); }
function chooseModes() { fireEvent.click(screen.getByRole('button', { name: 'Modes' })); }
let removeWindowError: () => void;
beforeEach(() => {
  fixture.blocked = ''; fixture.unfinished = false; fixture.daily = [];
  values = new Map(); reads = []; writes = []; caught = []; logs = []; unexpected = [];
  const storage = window.localStorage;
  vi.spyOn(window, 'localStorage', 'get').mockImplementation(() => {
    if (fixture.blocked === 'getter') throw new DOMException('Synthetic help read denied', 'SecurityError');
    return storage;
  });
  vi.spyOn(Storage.prototype, 'getItem').mockImplementation(key => {
    reads.push(key);
    if (fixture.blocked === 'get') throw new DOMException('Synthetic help read denied', 'SecurityError');
    return values.get(key) ?? null;
  });
  vi.spyOn(Storage.prototype, 'setItem').mockImplementation((key, value) => {
    writes.push([key, value]);
    if (fixture.blocked === 'set') throw new DOMException('Synthetic help write denied', 'QuotaExceededError');
    values.set(key, value);
  });
  const deny = (message: string): never => { unexpected.push(message); throw new Error(message); };
  vi.spyOn(Storage.prototype, 'removeItem').mockImplementation(() => deny('Unexpected help-test storage remove'));
  vi.spyOn(Storage.prototype, 'clear').mockImplementation(() => deny('Unexpected help-test storage clear'));
  vi.stubGlobal('fetch', () => deny('Unexpected help-test fetch'));
  vi.spyOn(XMLHttpRequest.prototype, 'open').mockImplementation(() => deny('Unexpected help-test XMLHttpRequest'));
  vi.stubGlobal('WebSocket', class { constructor() { deny('Unexpected help-test WebSocket'); } });
  vi.spyOn(console, 'error').mockImplementation((...args) => { logs.push(args); });
  const onError = (event: ErrorEvent) => { if (known(event.error)) event.preventDefault(); else unexpected.push(JSON.stringify(shape(event.error))); };
  window.addEventListener('error', onError); removeWindowError = () => window.removeEventListener('error', onError);
});
afterEach(() => {
  cleanup(); removeWindowError();
  for (const error of caught) if (!known(error)) unexpected.push(JSON.stringify(shape(error)));
  for (const args of logs) {
    const text = args.map(String).join(' ');
    if (!(caught.length > 0 && caught.every(known) && text.startsWith('The above error occurred in the <') && text.includes('Conquest') && text.includes('HelpErrorBoundary'))) unexpected.push(text);
  }
  vi.restoreAllMocks(); vi.unstubAllGlobals();
  check(unexpected.length === 0, `BOUNDARY: only the selected storage failure is tolerated (${unexpected.join('; ')})`);
});

for (const { id, Page, key, other } of SPORTS) describe(`${id} Arcade help`, () => {
  it('survives a denied help-flag read and shows the real instructions', () => {
    for (const blocked of ['getter', 'get'] as const) {
      fixture.blocked = blocked; enter(Page);
      check(!!screen.queryByTestId('arcade-board') && helpOpen() && caught.length === 0, 'READ: denied help storage cannot crash the page or hide first-run instructions');
      check((blocked === 'getter' ? reads.length === 0 : reads.length === 1 && reads[0] === key) && writes.length === 0, 'READ ATTEMPT: denied reads cannot persist an unread flag');
      closeHelp(); reopenHelp();
      check(helpOpen(), 'MANUAL READ: instructions remain reopenable after a denied read');
      cleanup();
    }
  });
  it('survives a denied help-flag write and keeps instructions usable', () => {
    fixture.blocked = 'set'; enter(Page);
    check(!!screen.queryByTestId('arcade-board') && helpOpen() && caught.length === 0, 'WRITE: failed help persistence cannot crash the page or hide instructions');
    check(reads.length === 1 && reads[0] === key && writes.length === 1 && writes[0][0] === key && writes[0][1] === 'true' && values.size === 0, 'WRITE ATTEMPT: the first visit attempts only its own flag');
    closeHelp(); reopenHelp();
    check(helpOpen(), 'MANUAL WRITE: instructions remain reopenable after a denied write');
  });
  it('shows first-run instructions with a separate flag and remembers the visit', () => {
    values.set(other, 'other-sport-seen'); enter(Page);
    check(helpOpen() && !!screen.queryByTestId('arcade-board'), 'FIRST: another sport flag cannot hide first-run instructions');
    check(reads.length === 1 && reads[0] === key && writes.length === 1 && writes[0][0] === key && writes[0][1] === 'true'
      && values.get(key) === 'true' && values.get(other) === 'other-sport-seen' && values.size === 2, 'PERSIST: only this sport flag is recorded');
    closeHelp(); chooseModes(); fireEvent.click(screen.getByRole('button', { name: /Arcade/ }));
    check(!helpOpen() && !!screen.queryByTestId('arcade-board') && writes.length === 1, 'RETURN: a saved visit does not reopen or rewrite instructions');
  });
  it('respects existing seen flags and allows manual reopening', () => {
    for (const seen of ['true', 'legacy-seen']) {
      values.set(key, seen); enter(Page);
      check(!helpOpen() && !!screen.queryByTestId('arcade-board') && writes.length === 0 && values.get(key) === seen, 'SEEN: existing nonempty flags suppress only automatic instructions');
      reopenHelp(); check(helpOpen(), 'MANUAL: returning players can reopen the real instructions');
      closeHelp(); check(!helpOpen() && !!screen.queryByTestId('arcade-board'), 'CLOSE: instructions close without losing the selected board');
      cleanup();
    }
  });
  it('keeps the mode chooser and Imperialism independent of Arcade help storage', () => {
    fixture.blocked = 'get'; render(<HelpErrorBoundary><Page /></HelpErrorBoundary>);
    check(!helpOpen() && reads.length === 0 && writes.length === 0 && !!screen.queryByRole('button', { name: /Arcade/ }), 'MODES: choosing a game does not read Arcade help storage');
    fireEvent.click(screen.getByRole('button', { name: /Imperialism/ }));
    check(screen.queryByTestId('daily-board')?.textContent === `${id} Imperialism fixture` && !helpOpen() && reads.length === 0 && writes.length === 0, 'IMPERIALISM: the selected daily board does not read Arcade help storage');
    chooseModes(); fireEvent.click(screen.getByRole('button', { name: /Arcade/ }));
    check(!!screen.queryByTestId('arcade-board') && helpOpen() && caught.length === 0, 'SWITCH: Arcade still opens its own instructions after another mode');
  });
  it('resumes the correct unfinished daily before switching to Arcade', () => {
    fixture.unfinished = true; fixture.blocked = 'get'; render(<HelpErrorBoundary><Page /></HelpErrorBoundary>);
    check(screen.queryByTestId('daily-board')?.textContent === `${id} Imperialism fixture` && fixture.daily.length === 1 && fixture.daily[0] === id
      && !helpOpen() && reads.length === 0 && writes.length === 0, 'RESUME: an unfinished daily opens its own sport without Arcade storage');
    chooseModes(); fireEvent.click(screen.getByRole('button', { name: /Arcade/ }));
    check(!!screen.queryByTestId('arcade-board') && helpOpen() && caught.length === 0, 'RESUME SWITCH: a resumed daily can still switch to Arcade');
  });
});

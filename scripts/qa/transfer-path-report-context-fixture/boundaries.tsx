import React, { useEffect, useState, useSyncExternalStore } from 'react';

export const NAMES = ['Start Alder', 'Target Birch', 'Bridge Vale', 'Rejected Cedar', 'Rejected Juniper', 'Duplicate Elm', 'Inactive Ash', 'Outside Fir'];
const fresh = () => ({
  puzzle: { id: 'fixture-puzzle', playerA: NAMES[0], playerB: NAMES[1], minSteps: 2 },
  chain: [NAMES[0]], connections: [''], status: 'playing', score: 900,
  mode: 'unlimited', unlimitedIndex: 7, rule: 'classic', activeRule: 'classic',
  ruleLocked: false, dailyRuleBlocked: false,
  ruleAvailability: { classic: 3, active: 3, europe: 3 },
  optimal: 2, hint: 'Fictional clue for the current chain head.',
  stranded: false, moreHelp: { lines: ['Fictional option count: 2.', 'Fictional shortest-route count: 1.'] },
  revealPath: [{ player: NAMES[0], club: '' }, { player: NAMES[2], club: 'Fixture Club' }, { player: NAMES[1], club: 'Fixture Club' }],
  isLoadingPool: false, isLoading: false, ignoreNextRule: false,
});
let model = fresh();
const listeners = new Set<() => void>();
const clone = (value: unknown) => JSON.parse(JSON.stringify(value));
const telemetry = () => (window as any).__tp1439;
function change(kind: string, apply: (before: any) => any) {
  const before = clone(model);
  model = apply(model);
  telemetry().hookEvents.push({ kind, before, after: clone(model), date: Date.now(), performance: performance.now() });
  for (const listener of listeners) listener();
}
const subscribe = (listener: () => void) => { listeners.add(listener); return () => listeners.delete(listener); };
const allNames = () => NAMES;
const nationality = () => 'Fixture';
const addPlayer = (name: string) => {
  telemetry().addCalls.push({ name, chain: clone(model.chain), date: Date.now(), performance: performance.now() });
  const reasons: Record<string, string> = { 'Duplicate Elm': 'duplicate', 'Inactive Ash': 'unverified-active', 'Outside Fir': 'outside-europe' };
  if (name !== 'Bridge Vale') return { ok: false, reason: reasons[name] || 'no-overlap' };
  change('accepted-fictional-player', previous => ({ ...previous, chain: [...previous.chain, name], connections: [...previous.connections, 'Fixture Club, fixture season'] }));
  return { ok: true };
};
const nextPuzzle = () => change('actual-next-puzzle-callback', previous => ({ ...previous, unlimitedIndex: 0, status: 'playing', chain: [previous.puzzle.playerA], connections: [''] }));
const switchToUnlimited = () => change('actual-switch-to-unlimited-callback', previous => ({ ...previous, mode: 'unlimited', unlimitedIndex: 0, status: 'playing', chain: [previous.puzzle.playerA], connections: [''] }));
const setRule = (rule: string) => {
  if (model.ignoreNextRule) {
    change('ignored-rule-callback', previous => ({ ...previous, ignoreNextRule: false }));
    return false;
  }
  change('accepted-rule-callback', previous => ({ ...previous, rule, activeRule: rule, chain: [previous.puzzle.playerA], connections: [''] }));
  return true;
};
const giveUp = () => change('actual-give-up-callback', previous => ({ ...previous, status: 'gaveup' }));
export function useTransferPath() {
  const state = useSyncExternalStore(subscribe, () => model);
  return { ...state, addPlayer, nextPuzzle, switchToUnlimited, setRule, giveUp, getAllPlayerNames: allNames, getPlayerNationality: nationality };
}
const identities: Record<string, (state: any) => any> = {
  id: state => ({ ...state, puzzle: { ...state.puzzle, id: state.puzzle.id + '-changed' } }),
  playerA: state => ({ ...state, puzzle: { ...state.puzzle, playerA: 'Start Cypress' }, chain: ['Start Cypress'] }),
  playerB: state => ({ ...state, puzzle: { ...state.puzzle, playerB: 'Target Willow' } }),
  mode: state => ({ ...state, mode: 'daily' }),
  index: state => ({ ...state, unlimitedIndex: state.unlimitedIndex + 1 }),
  activeRule: state => ({ ...state, activeRule: 'active' }),
};
export function FixtureControls() {
  const state = useSyncExternalStore(subscribe, () => model);
  return <section data-fixture-controls aria-label="Fictional boundary controls">
    <button data-fixture-action="reset" onClick={() => change('fixture-scenario-reset', () => fresh())}>Reset fictional boundary</button>
    {Object.entries(identities).map(([key, apply]) => <button key={key} data-fixture-action={'identity-' + key} onClick={() => change('isolated-identity-' + key, apply)}>Change only {key}</button>)}
    <button data-fixture-action="prepare-next" onClick={() => change('prepare-same-id-index-wrap', previous => ({ ...previous, status: 'playing', mode: 'unlimited', unlimitedIndex: 999 }))}>Prepare same-ID next callback</button>
    <button data-fixture-action="prepare-daily-win" onClick={() => change('prepare-daily-win', previous => ({ ...previous, status: 'won', mode: 'daily' }))}>Prepare daily-win callback</button>
    <button data-fixture-action="ignore-rule" onClick={() => change('prepare-ignored-rule', previous => ({ ...previous, ignoreNextRule: true }))}>Ignore next rule callback</button>
    <output data-fixture-hook-state>{JSON.stringify(state)}</output>
  </section>;
}
export function installTelemetry() {
  if (telemetry()) throw new Error('Fixture telemetry must be installed exactly once');
  (window as any).__tp1439 = { scope: 'actual Board local state and props only', events: [], hookEvents: [], addCalls: [], reports: [], latestReport: null };
  for (const type of ['pointerdown', 'pointerup', 'click', 'keydown', 'keyup', 'input', 'change']) {
    document.addEventListener(type, event => {
      const target = event.target as HTMLElement;
      telemetry().events.push({ type, trusted: event.isTrusted, key: (event as KeyboardEvent).key || null,
        tag: target?.tagName || '', text: target?.textContent?.slice(0, 160) || '', action: target?.closest('[data-fixture-action]')?.getAttribute('data-fixture-action') || null,
        date: Date.now(), performance: performance.now() });
    }, true);
  }
}
export function GameShell({ title, subtitle, headerExtra, children }: any) {
  return <main data-actual-board><h1>{title}</h1><p>{subtitle}</p>{headerExtra}{children}</main>;
}
export function ResultScreen({ headline, onPlayAgain, playAgainLabel, playNext }: any) {
  return <section data-fixture-result><h2>{headline}</h2>{onPlayAgain && <button onClick={onPlayAgain}>{playAgainLabel}</button>}{playNext}</section>;
}
export function FlagImg() { return <span aria-hidden="true" className="fixture-flag">FC</span>; }
export function GiveUpButton({ onGiveUp, label }: any) { return <button onClick={onGiveUp}>{label}</button>; }
export function HowToPlayPopover({ title, children }: any) {
  const [open, setOpen] = useState(false);
  return <><button aria-expanded={open} data-fixture-help onClick={() => setOpen(!open)}>How to play</button>{open && <section role="dialog" aria-label={title} data-fixture-instructions>{children}</section>}</>;
}
export default function ReportQuestion(props: any) {
  useEffect(() => {
    const capture = { props: clone(props), date: Date.now(), performance: performance.now() };
    telemetry().reports.push(capture);
    telemetry().latestReport = capture;
  });
  return <section data-fixture-report><p>Captured ReportQuestion props, fictional boundary only</p><pre data-fixture-report-props>{JSON.stringify(props)}</pre></section>;
}
export function PlayerAutocomplete({ value, onChange, onSelect, searchOptions, placeholder, emptyText, onNoResults }: any) {
  const matches = value.trim().length >= searchOptions.minChars ? NAMES.filter(name => name.toLowerCase().includes(value.toLowerCase()) && !searchOptions.exclude.has(normalizeName(name))) : [];
  useEffect(() => { if (value.trim().length >= searchOptions.minChars && !matches.length) onNoResults(value); }, [value, matches.length, onNoResults, searchOptions.minChars]);
  return <section data-fixture-autocomplete><label>Fictional player search<input aria-label="Fictional player search" value={value} placeholder={placeholder} onChange={event => onChange(event.target.value)} /></label>
    {matches.map((name, index) => <button key={name} data-fixture-pick={name} onClick={() => onSelect({ id: 'fixture-' + index, name, nationality: 'Fixture' })}>{name}</button>)}
    {value.trim().length >= searchOptions.minChars && !matches.length && <p data-fixture-empty>{emptyText}</p>}
  </section>;
}
export const TRANSFER_PATH_PLAYER_SOURCE = 'FICTIONAL_BOUNDARY_NO_DATA_SOURCE';
export const normalizeName = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
export const foldName = (value: string) => ({ words: normalizeName(value).split(/\s+/), joined: normalizeName(value).replace(/\s/g, '') });
export const emptyListReason = () => 'pool';
export const ACTIVE_YEAR = 2026;
export const TRANSFER_PATH_RULES = ['classic', 'active', 'europe'];
export const RULE_LABEL: Record<string, string> = { classic: 'Everyday', active: 'Active players only', europe: 'Europe only' };
export const RULE_BLURB: Record<string, string> = { classic: 'Any teammate counts: same club, same season.', active: 'Fictional verified active-record filter.', europe: 'Fictional European-club filter.' };
export const cn = (...values: any[]) => values.filter(Boolean).join(' ');
export const RotateCcw = () => <span aria-hidden="true">R</span>;
export const ArrowRight = () => <span aria-hidden="true">to</span>;
export const Lightbulb = () => <span aria-hidden="true">?</span>;
export const Search = () => <span aria-hidden="true">+</span>;


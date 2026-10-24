import React, { useLayoutEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { useClubManager } from '@/hooks/useClubManager';
import ClubManagerSeasonSummary from '@/components/club-manager/ClubManagerSeasonSummary';
import * as E from '@/lib/clubManager';
import type { CareerState, CMPlayer } from '@/lib/clubManager';
import { recordWorldRosterTransfer, worldRosterView } from '@/lib/clubManagerWorldRoster';
import { applyVeteranRetirement, previewVeteranRetirement } from '@/lib/clubManagerVeteranRetirement';
import { readVeteranReviews, sameVeteranIdentity, veteranIdentity } from '@/lib/clubManagerVeteranLedger';
import { saveFence } from '@/lib/saveFence';
import '@/index.css';

const query = new URL(location.href).searchParams;
const mode = query.get('case'), theme = query.get('theme');
if (!['renewal', 'decline', 'future'].includes(mode ?? '') || !['light', 'dark'].includes(theme ?? ''))
  throw new Error('Unknown veteran fixture input');
document.documentElement.classList.toggle('light', theme === 'light');
const playerId = 'fictional-browser-veteran';
const marker = 'cm-veteran-browser-prepared-v1';
let seed: number | null = null, draws = 0, rejectWrites = false, faults = 0, nextId = 0;
const nativeRandom = Math.random;
Math.random = () => {
  draws += 1;
  if (seed === null) return nativeRandom();
  seed = seed * 16807 % 2147483647;
  return (seed - 1) / 2147483646;
};
const writes: { refused: boolean; raw: string; bytes: number }[] = [];
const nativeSet = Storage.prototype.setItem;
Storage.prototype.setItem = function (key: string, value: string) {
  if (this === localStorage && key === E.SAVE_KEY) {
    if (writes.length >= 256) throw new Error('Fixture write ceiling');
    writes.push({ raw: value, bytes: new TextEncoder().encode(value).length, refused: rejectWrites });
    if (rejectWrites) { faults += 1; throw new DOMException('Declared career quota fault', 'QuotaExceededError'); }
  }
  nativeSet.call(this, key, value);
};
const identities = new WeakMap<object, number>();
const identity = (value: object | null) => {
  if (!value) return null;
  if (!identities.has(value)) identities.set(value, ++nextId);
  return identities.get(value)!;
};
type Api = ReturnType<typeof useClubManager>;
type Action = {
  playerId: string; settled: boolean; ok: boolean | null; phase: string; beforeIdentity: number | null;
  beforeRaw: string | null; beforeJSON: string; expectedJSON: string | null; beforeDraws: number; afterDraws?: number;
};
let current: Api | null = null;
const actions: Action[] = [], transitions: {
  identity: number | null; phase: string; careerJSON: string; raw: string | null; summaryIdentity: number | null;
}[] = [];
const events: { type: string; trusted: boolean; label: string }[] = [];
for (const type of ['click', 'keydown', 'change']) document.addEventListener(type, event => {
  const node = event.target instanceof Element ? event.target.closest('button,select') : null;
  if (node && events.length < 512) events.push({
    type, trusted: event.isTrusted, label: node.getAttribute('aria-label') ?? node.textContent?.trim() ?? '',
  });
}, true);

function prepare() {
  if (sessionStorage.getItem(marker) === mode) {
    if (!E.loadCareer()) throw new Error('The actual saved fixture disappeared');
    return;
  }
  seed = 1461001;
  try {
    const base = E.startCareer('Everton');
    const donor = base.squad.find(player => !player.onLoan);
    if (!donor) throw new Error('No actual owned donor');
    // Procedural fictional fixture, not a real player, transfer or played season.
    const veteran: CMPlayer = {
      ...donor, id: playerId, name: 'Fictional Browser Veteran', generated: true,
      worldRosterKey: undefined, worldRosterSince: undefined, age: 36, rating: 85, potential: 85,
      contractYears: 1, wage: 3, role: 'rotation', lastTen: [1, 0, 1, 0],
      wantsOut: mode === 'decline', onLoan: undefined, injuryWeeks: 0, suspendedMatches: 0,
      isYouth: false, academyGrad: false,
    };
    let prepared: CareerState = {
      ...base, budget: 500, live: null, pendingMove: null,
      squad: base.squad.map(player => player.id === donor.id ? veteran : player),
    };
    prepared = recordWorldRosterTransfer(prepared, {
      player: veteran, from: 'Fictional Browser Origin', to: prepared.clubName, kind: 'permanent', since: 0,
    });
    const owned = prepared.squad.find(player => player.id === playerId);
    const rows = worldRosterView(prepared)?.records.filter(row => row.key === owned?.worldRosterKey) ?? [];
    if (!owned?.worldRosterKey || rows.length !== 1 || rows[0].owner !== prepared.clubName
      || rows[0].status !== 'owned' || JSON.stringify(rows[0].player) !== JSON.stringify(owned))
      throw new Error('Actual world record builder did not certify the fictional owned fixture');
    const finished = E.finishSeason({
      ...prepared, week: prepared.calendar.length, pendingSummary: null,
    });
    prepared = finished.state;
    if (prepared.pendingSummary !== finished.summary || prepared.pendingSummary.season !== prepared.season
      || prepared.pendingSummary.club !== prepared.clubName || prepared.week !== prepared.calendar.length)
      throw new Error('Actual completed review foundation refused');
    if (mode === 'future') prepared = { ...prepared, veteranReviews: { v: 2, reviews: [], future: { kept: 'raw' } } };
    const preview = previewVeteranRetirement(prepared, playerId);
    if (mode === 'future' ? preview.kind !== 'blocked'
      : preview.kind !== 'offer' || preview.decision !== (mode === 'decline' ? 'declined' : 'agreed'))
      throw new Error('Actual review preview disagrees with the declared fixture mode');
    if (mode === 'renewal' && (preview.kind !== 'offer' || !preview.renewal))
      throw new Error('Actual renewal terms missing');
    saveFence.release(E.SAVE_KEY);
    if (!E.saveCareer(prepared)) throw new Error('Actual prepared writer refused');
    const loaded = E.loadCareer();
    if (!loaded?.pendingSummary || !loaded.squad.some(player => player.id === playerId))
      throw new Error('Actual prepared reader refused');
    sessionStorage.setItem(marker, mode!);
  } finally { seed = null; }
}
function Fixture() {
  const g = useClubManager();
  const [faultShown, setFaultShown] = useState(false);
  current = g;
  useLayoutEffect(() => {
    if (transitions.length >= 256) throw new Error('Fixture publication ceiling');
    transitions.push({ identity: identity(g.career), phase: g.phase, careerJSON: JSON.stringify(g.career),
      raw: localStorage.getItem(E.SAVE_KEY), summaryIdentity: identity(g.summary) });
  }, [g.career, g.phase, g.summary]);
  const review = async (id: string) => {
    const career = g.career;
    if (!career) throw new Error('Actual hook has no career');
    if (actions.length >= 16) throw new Error('Fixture action ceiling');
    // Independent pure uncommitted candidate, no writer or callback success is invented.
    const expected = applyVeteranRetirement(career, id);
    const row: Action = { playerId: id, settled: false, ok: null, phase: g.phase,
      beforeIdentity: identity(career), beforeRaw: localStorage.getItem(E.SAVE_KEY),
      beforeJSON: JSON.stringify(career), expectedJSON: expected ? JSON.stringify(expected) : null, beforeDraws: draws };
    actions.push(row);
    const ok = await g.reviewVeteran(id);
    row.ok = ok; row.settled = true; row.afterDraws = draws;
    return ok;
  };
  return <main className="mx-auto w-full max-w-4xl space-y-3 px-4 py-3" data-cm-veteran-fixture>
    <h1 className="font-display text-lg font-bold">Veteran review actual summary fixture</h1>
    <p className="text-xs">Prepared fictional review. Actual summary, hook, writer and CSS, not the full career page.</p>
    <div className="flex flex-wrap gap-2" data-fixture-controls>
      <button type="button" className="min-h-11 rounded border border-border px-3" aria-pressed={faultShown}
        onClick={() => { rejectWrites = !rejectWrites; setFaultShown(rejectWrites); }}>Storage fault {faultShown ? 'on' : 'off'}</button>
      <button type="button" className="min-h-11 rounded border border-border px-3" onClick={() => location.reload()}>Reload saved fixture</button>
    </div>
    <p data-cm-fixture-phase>{g.phase}</p>
    {g.phase === 'resume' && <button type="button" className="min-h-11 rounded border border-border px-3"
      onClick={g.resume}>Resume actual saved career</button>}
    {g.phase === 'seasonEnd' && g.career && g.summary && <div data-actual-season-summary>
      <ClubManagerSeasonSummary c={g.career} sm={g.summary} g={{ nextSeason: g.nextSeason, startNew: g.startNew,
        reviewVeteran: review, pointsSlot: g.pointsSlot }} />
    </div>}
  </main>;
}
function read() {
  if (!current) throw new Error('Real hook has not mounted');
  const c = current.career, player = c?.squad.find(row => row.id === playerId) ?? null;
  const ledger = c ? readVeteranReviews(c.veteranReviews) : null;
  const ownIdentity = c && player ? veteranIdentity(c, player, E.worldYear(c)) : null;
  const saved = c && ownIdentity ? ledger?.reviews.find(row => row.club === c.clubName
    && row.season === c.season && sameVeteranIdentity(row.identity, ownIdentity)) ?? null : null;
  const preview = c && player ? previewVeteranRetirement(c, playerId) : null;
  const renewal = preview?.kind === 'offer' ? preview.renewal : null;
  return JSON.parse(JSON.stringify({ mode, theme, playerId, phase: current.phase, career: c,
    identity: identity(c), summaryIdentity: identity(current.summary), summaryJSON: JSON.stringify(current.summary),
    player, role: player ? E.roleOf(player) : null, roleLabel: player ? E.ROLE_INFO[E.roleOf(player)].label : null,
    raw: localStorage.getItem(E.SAVE_KEY), savedReview: saved, preview, renewalDisplay: c && renewal ? {
      fee: E.money(renewal.fee, c), wage: E.money(renewal.wage / 1000, c) + '/week', years: String(renewal.years),
    } : null, draws, actions, transitions, writes, faults, events,
    saveFailed: current.saveFailed, saveMoved: current.saveMoved,
  }));
}
Object.defineProperty(window, '__CM_VETERAN_FIXTURE__', { value: Object.freeze({ read }) });
queueMicrotask(() => {
  prepare();
  createRoot(document.getElementById('root')!).render(<Fixture />);
});

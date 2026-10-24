import React, { useLayoutEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { useClubManager } from '@/hooks/useClubManager';
import { TrainingScreen } from '@/components/club-manager/TrainingScreen';
import { SquadScreen } from '@/components/club-manager/SquadScreen';
import { TacticsScreen } from '@/components/club-manager/TacticsScreen';
import { CM_PARTIAL, CM_ROSTERS } from '@/data/clubManagerRosters';
import { FORMATIONS, SAVE_KEY, effectiveXIWithSlots, fitGrade, instructionsOf, loadCareer, saveCareer, setInstructions } from '@/lib/clubManager';
import type { CareerState } from '@/lib/clubManager';
import { coachedStyleXi, readCoachedStyle, readCoachedStyleCourse, startCoachedStyle, tickCoachedStyle } from '@/lib/clubManagerTraits';
import '@/index.css';

const query = new URL(location.href).searchParams;
const mode = query.get('case'), theme = query.get('theme');
if (!['actions', 'healthy', 'injury', 'suspension', 'duplicate'].includes(mode ?? '') || !['light', 'dark'].includes(theme ?? '')) throw new Error('Unknown coached-style fixture input');
document.documentElement.classList.toggle('light', theme === 'light');
const BASE_KEY = 'cm-coached-browser-declared-base-v1';
const META_KEY = 'cm-coached-browser-declared-meta-v1';
type Meta = { id: string; index: number; club: string };
let meta: Meta | null = null;
function prepareReadout() {
  let body = sessionStorage.getItem(BASE_KEY);
  if (!body) {
    if (mode !== 'healthy') throw new Error('Prepare healthy saved readout first');
    const loaded = loadCareer();
    if (!loaded) throw new Error('The real hook must create and save the career first');
    let c: CareerState = { ...loaded, squad: loaded.squad.map(p => ({ ...p, fitness: 100, injuryWeeks: 0, suspendedMatches: 0 })) };
    const instructed = setInstructions(c, { press: 1, tempo: 0, width: 0, line: 0 });
    if (!instructed) throw new Error('Actual instructions refused');
    c = instructed;
    const formation = FORMATIONS[c.formationIndex] ?? FORMATIONS[0];
    const row = effectiveXIWithSlots(c).find(r => r.slot && formation.slots.indexOf(r.slot) > 0 && r.p.position !== 'GK' && !r.p.onLoan && !r.p.retraining && ['natural', 'family'].includes(fitGrade(r.p, r.slot)));
    if (!row?.slot) throw new Error('No real fitted owned outfielder');
    const start = startCoachedStyle(row.p, 'press', { owned: true, awayOnLoan: false, live: false });
    if (!start.ok) throw new Error('Actual course fixture refused: ' + start.reason);
    let learned = start.player;
    // Declared learned-payload fixture, not a claim that calendar weeks were played.
    for (let i = 0; i < 6; i += 1) learned = tickCoachedStyle(learned, { owned: true, awayOnLoan: false });
    if (readCoachedStyle(learned)?.id !== 'press') throw new Error('Actual helper did not finish fixture');
    c = { ...c, squad: c.squad.map(p => p.id === learned.id ? learned : p) };
    meta = { id: learned.id, index: formation.slots.indexOf(row.slot), club: c.clubName };
    body = JSON.stringify(c);
    sessionStorage.setItem(BASE_KEY, body);
    sessionStorage.setItem(META_KEY, JSON.stringify(meta));
  }
  meta = JSON.parse(sessionStorage.getItem(META_KEY)!);
  if (!meta || !Number.isInteger(meta.index) || typeof meta.id !== 'string') throw new Error('Missing declared readout identity');
  const base: CareerState = JSON.parse(body);
  const candidate: CareerState = mode === 'duplicate'
    ? { ...base, xiIds: base.xiIds.map((id, i) => i === 0 ? meta!.id : id) }
    : mode === 'injury' || mode === 'suspension'
      ? { ...base, squad: base.squad.map(p => p.id === meta!.id ? { ...p, injuryWeeks: mode === 'injury' ? 2 : 0, suspendedMatches: mode === 'suspension' ? 2 : 0 } : p) }
      : base;
  if (!saveCareer(candidate)) throw new Error('Actual prepared readout save refused');
  const reread = loadCareer();
  if (!reread || readCoachedStyle(reread.squad.find(p => p.id === meta!.id)!)?.id !== 'press') throw new Error('Actual load lost learned fixture');
}
// Prepare declared readouts after module initialization, before mounting the real hook.

type Api = ReturnType<typeof useClubManager>;
let current: Api | null = null, rejectWrites = false, faults = 0, nextIdentity = 0;
const identities = new WeakMap<object, number>();
const identity = (v: object | null) => {
  if (!v) return null;
  if (!identities.has(v)) identities.set(v, ++nextIdentity);
  return identities.get(v)!;
};
const writes: Array<{ key: string; bytes: number; refused: boolean }> = [];
const nativeSet = Storage.prototype.setItem;
Storage.prototype.setItem = function (key: string, value: string) {
  if (this === localStorage) {
    if (writes.length >= 256) throw new Error('Fixture write recording ceiling');
    writes.push({ key, bytes: new TextEncoder().encode(value).length, refused: rejectWrites });
    if (rejectWrites) { faults += 1; throw new DOMException('Declared browser quota fault', 'QuotaExceededError'); }
  }
  nativeSet.call(this, key, value);
};
const transitions: Array<{ identity: number | null; save: string; raw: string | null }> = [];
const actions: Array<{ kind: string; ok: boolean; beforeIdentity: number | null; beforeRaw: string | null }> = [];
const trusted: Array<{ type: string; trusted: boolean; text: string }> = [];
document.addEventListener('click', e => {
  const button = e.target instanceof Element ? e.target.closest('button') : null;
  if (button && trusted.length < 128) trusted.push({ type: e.type, trusted: e.isTrusted, text: button.textContent?.trim() ?? '' });
}, true);
function Fixture() {
  const g = useClubManager();
  const [screen, setScreen] = useState<'training' | 'squad' | 'tactics'>(mode === 'actions' ? 'training' : 'tactics');
  const [faultShown, setFaultShown] = useState(false);
  current = g;
  useLayoutEffect(() => {
    if (transitions.length >= 128) throw new Error('Fixture transition ceiling');
    transitions.push({ identity: identity(g.career), save: g.coachedStyleSaveState, raw: localStorage.getItem(SAVE_KEY) });
  }, [g.career, g.coachedStyleSaveState]);
  const c = g.career;
  const edit: Api['editCoachedStyle'] = (id, make) => {
    const beforeIdentity = identity(g.career), beforeRaw = localStorage.getItem(SAVE_KEY);
    let kind = 'refused';
    const ok = g.editCoachedStyle(id, (player, context) => {
      const result = make(player, context);
      if (result.ok) kind = readCoachedStyleCourse(result.player) ? 'start' : 'cancel';
      return result;
    });
    actions.push({ kind, ok, beforeIdentity, beforeRaw });
    return ok;
  };
  const club = Object.keys(CM_ROSTERS).find(name => !CM_PARTIAL.includes(name)) ?? Object.keys(CM_ROSTERS)[0];
  return <main className="mx-auto w-full max-w-4xl space-y-3 px-4 py-3" data-cm-coached-browser>
    <h1 className="font-display text-lg font-bold">Coached-style actual component fixture</h1>
    <p className="text-xs">Declared local career. Component, hook, storage and CSS check only.</p>
    <nav className="flex flex-wrap gap-2" aria-label="Fixture screens">
      {(['training', 'squad', 'tactics'] as const).map(tab => <button key={tab} type="button" className="min-h-11 rounded border border-border px-3" aria-pressed={screen === tab} onClick={() => setScreen(tab)}>{tab[0].toUpperCase() + tab.slice(1)}</button>)}
    </nav>
    <div className="flex flex-wrap gap-2">
      <button type="button" className="min-h-11 rounded border border-border px-3" aria-pressed={faultShown} onClick={() => { rejectWrites = !rejectWrites; setFaultShown(rejectWrites); }}>Storage fault {faultShown ? 'on' : 'off'}</button>
      <button type="button" className="min-h-11 rounded border border-border px-3" onClick={() => location.reload()}>Reload saved fixture</button>
    </div>
    <p data-cm-fixture-phase>{g.phase}</p>
    {g.phase === 'clubSelect' && <div className="flex flex-wrap gap-2">
      <button type="button" className="min-h-11 rounded border border-border px-3" onClick={() => g.chooseClub(club)}>Select real roster club</button>
      <button type="button" className="min-h-11 rounded border border-border px-3" disabled={!g.pendingClub} onClick={() => g.confirmClub()}>Confirm actual career</button>
    </div>}
    {g.phase === 'resume' && <button type="button" className="min-h-11 rounded border border-border px-3" onClick={g.resume}>Resume actual saved career</button>}
    {g.saveFailed && <p role="alert">Your career is not being saved right now.</p>}
    {g.saveMoved && <p role="alert">The actual save fence refused this page.</p>}
    {c && g.phase === 'hub' && <section data-cm-fixture-screen={screen}>
      {screen === 'training' && <TrainingScreen career={c} onSetPlan={g.setTraining} onRetrain={g.retrain} onStopRetrain={g.stopRetrain}
        onEditCoachedStyle={edit} coachedStyleSaveState={g.coachedStyleSaveState} />}
      {screen === 'squad' && <SquadScreen squad={c.squad} xiIds={c.xiIds} eraId={c.eraId} career={c} coachedStyleSaveState={g.coachedStyleSaveState} />}
      {screen === 'tactics' && <TacticsScreen career={c} coachedStyleSaveState={g.coachedStyleSaveState}
        onFormation={g.setFormationIndex} onMentality={g.setMentality} onInstructions={g.setTeamInstructions}
        onSlot={g.setXiSlot} onSwap={g.swapXiSlots} onAutoPick={g.autoPick} onDuty={g.setSlotDuty}
        onSetPiece={g.assignSetPiece} onAutoSetPieces={g.autoPickSetPieces} onShootoutOrder={g.setShootoutOrder} />}
    </section>}
  </main>;
}
const read = () => {
  if (!current) throw new Error('Real hook has not mounted');
  const c = current.career;
  return JSON.parse(JSON.stringify({ mode, theme, meta, phase: current.phase, save: current.coachedStyleSaveState,
    saveFailed: current.saveFailed, saveMoved: current.saveMoved, identity: identity(c), career: c,
    raw: localStorage.getItem(SAVE_KEY), faults, writes, actions, transitions, trusted,
    effective: c ? effectiveXIWithSlots(c).map(row => ({ id: row.p.id, slot: row.slot ? (FORMATIONS[c.formationIndex] ?? FORMATIONS[0]).slots.indexOf(row.slot) : null })) : [],
    expected: c ? coachedStyleXi(effectiveXIWithSlots(c), instructionsOf(c)) : null,
    courses: c ? c.squad.filter(p => readCoachedStyleCourse(p)).map(p => ({ id: p.id, course: readCoachedStyleCourse(p) })) : [] }));
};
Object.defineProperty(window, '__CM_COACHED_FIXTURE__', { value: Object.freeze({ read }) });
queueMicrotask(() => {
  if (mode !== 'actions') prepareReadout();
  createRoot(document.getElementById('root')!).render(<Fixture />);
});

import React, { useLayoutEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { useClubManager } from '@/hooks/useClubManager';
import { TacticsScreen } from '@/components/club-manager/TacticsScreen';
import { LiveSimScreen } from '@/components/club-manager/LiveSimScreen';
import * as E from '@/lib/clubManager';
import type { CareerState } from '@/lib/clubManager';
import { saveMatchPlan } from '@/lib/clubManagerMatchPlans';
import { readCustomShape, type CustomShapePoint } from '@/lib/clubManagerPositions';
import { saveFence } from '@/lib/saveFence';
import '@/index.css';

const query = new URL(location.href).searchParams;
const mode = query.get('case'), theme = query.get('theme');
if (!['actions', 'overlap', 'future', 'malformed', 'blocked', 'stage'].includes(mode ?? '')
  || !['light', 'dark'].includes(theme ?? '')) throw new Error('Unknown position fixture input');
document.documentElement.classList.toggle('light', theme === 'light');
type Api = ReturnType<typeof useClubManager>;
type Trace = { kind: string; ok: boolean; before: number | null; drawsBefore: number; drawsAfter: number; writeStart: number; writeEnd: number; points?: readonly CustomShapePoint[] | null };
let current: Api | null = null, rejectWrites = false, faults = 0, draws = 0, nextIdentity = 0;
const identities = new WeakMap<object, number>();
function identity(value: object | null) {
  if (!value) return null;
  if (!identities.has(value)) identities.set(value, ++nextIdentity);
  return identities.get(value)!;
}
let seed = 1458201;
Math.random = () => { draws++; seed = seed * 16807 % 2147483647; return (seed - 1) / 2147483646; };
const writes: Array<{ key: string; refused: boolean; bytes: number }> = [];
const actions: Trace[] = [];
const transitions: Array<{ identity: number | null; formationIndex: number | null; own: boolean; shape: unknown; rawOwn: boolean; rawShape: unknown; rawFormation: unknown }> = [];
const events: Array<{ type: string; trusted: boolean; label: string | null; pointerId?: number; clientX?: number; clientY?: number; key?: string }> = [];
const nativeSet = Storage.prototype.setItem;
Storage.prototype.setItem = function (key: string, value: string) {
  if (this === localStorage) {
    if (writes.length >= 256) throw new Error('Position fixture write ceiling');
    const refused = rejectWrites && key === E.SAVE_KEY;
    writes.push({ key, refused, bytes: new TextEncoder().encode(value).length });
    if (refused) { faults++; throw new DOMException('Declared native quota boundary', 'QuotaExceededError'); }
  }
  nativeSet.call(this, key, value);
};
for (const type of ['pointerdown', 'pointermove', 'pointerup', 'pointercancel', 'lostpointercapture', 'keydown']) {
  document.addEventListener(type, event => {
    const target = event.target instanceof Element ? event.target.closest('button,select,input') : null;
    if (!target || events.length >= 512) return;
    const item = { type, trusted: event.isTrusted, label: target.getAttribute('aria-label') ?? target.textContent?.trim() ?? null };
    events.push(event instanceof PointerEvent ? { ...item, pointerId: event.pointerId, clientX: event.clientX, clientY: event.clientY }
      : event instanceof KeyboardEvent ? { ...item, key: event.key } : item);
  }, true);
}
function execute(kind: string, make: () => boolean, points?: readonly CustomShapePoint[] | null) {
  const before = identity(current?.career ?? null), drawsBefore = draws, writeStart = writes.length;
  const ok = make();
  actions.push({ kind, ok, before, drawsBefore, drawsAfter: draws, writeStart, writeEnd: writes.length,
    ...(points !== undefined ? { points } : {}) });
  return ok;
}
async function prepare() {
  await import('@/lib/clubManagerTactics');
  if (sessionStorage.getItem('cm-position-fixture-mode-v1') === mode) {
    if (!E.loadCareer()) throw new Error('The declared saved fixture disappeared');
    return;
  }
  let career = saveMatchPlan(E.startCareer('Everton'), 0, 'Fixture preset');
  if (career.matchPlans?.length !== 1) throw new Error('Actual plan foundation refused');
  const formation = E.FORMATIONS[career.formationIndex];
  if (formation?.slots.length !== 11) throw new Error('Actual eleven-slot formation required');
  const preset = formation.slots.map(slot => ({ x: slot.x, y: slot.y }));
  if (mode !== 'actions') {
    career = { ...career, customShape: { v: 1, formationIndex: career.formationIndex,
      points: mode === 'overlap' ? preset.map(() => ({ x: 50, y: 50 })) : preset } };
  }
  if (mode === 'future') (career.customShape as unknown as { v: number }).v = 2;
  if (mode === 'malformed') (career.customShape as unknown as { points: unknown }).points = preset.slice(0, 10);
  if (mode === 'blocked' || mode === 'stage') {
    let found = false;
    for (let guard = 0; guard < 24; guard++) {
      const result = E.playNextEntry(career, { noCoach: true });
      career = result.state;
      if (result.kind !== 'halftime' || !career.live) continue;
      const second = E.startSecondHalf(JSON.parse(JSON.stringify(career)));
      if (career.live.positionRules !== 1 || !second?.live?.h2Drawn)
        throw new Error('Actual healthy marked-match foundation required');
      career = JSON.parse(JSON.stringify(mode === 'stage' ? second : career));
      (career.live as unknown as { positionRules: number }).positionRules = 2;
      const refused = E.playNextEntry(career, { noCoach: true });
      if (refused.blocked !== 'position-state-invalid' || refused.state !== career)
        throw new Error('Actual invalid marked-match refusal required');
      found = true; break;
    }
    if (!found) throw new Error('Actual marked live fixture not reached');
  }
  saveFence.release(E.SAVE_KEY);
  if (!E.saveCareer(career)) throw new Error('Actual initial writer refused');
  const loaded = E.loadCareer();
  if (!loaded || loaded.clubName !== career.clubName || loaded.formationIndex !== career.formationIndex)
    throw new Error('Actual initial reader foundation failed');
  sessionStorage.setItem('cm-position-fixture-mode-v1', mode!);
}
function Fixture() {
  const g = useClubManager();
  current = g;
  const [faultShown, setFaultShown] = useState(false);
  const [showStage, setShowStage] = useState(false);
  useLayoutEffect(() => {
    if (transitions.length >= 128) throw new Error('Position fixture publication ceiling');
    const raw = localStorage.getItem(E.SAVE_KEY), stored = raw ? JSON.parse(raw) : null;
    transitions.push({ identity: identity(g.career), formationIndex: g.career?.formationIndex ?? null,
      own: !!g.career && Object.prototype.hasOwnProperty.call(g.career, 'customShape'), shape: g.career?.customShape ?? null,
      rawOwn: !!stored && Object.prototype.hasOwnProperty.call(stored, 'customShape'), rawShape: stored?.customShape ?? null,
      rawFormation: stored?.formationIndex ?? null });
  }, [g.career]);
  const c = g.career;
  const edit = (index: number, points: readonly CustomShapePoint[] | null) =>
    execute(points === null ? 'reset' : 'shape', () => g.setCustomShape(index, points), points);
  return <main className="mx-auto w-full max-w-4xl space-y-3 px-4 py-3" data-cm-position-fixture>
    <h1 className="font-display text-lg font-bold">Position editor actual component fixture</h1>
    <p className="text-xs">Declared local career. This is not the full career page.</p>
    <div className="flex flex-wrap gap-2" aria-label="Declared fixture controls">
      <button type="button" className="min-h-11 rounded border border-border px-3" aria-pressed={faultShown}
        onClick={() => { rejectWrites = !rejectWrites; setFaultShown(rejectWrites); }}>Storage fault {faultShown ? 'on' : 'off'}</button>
      <button type="button" className="min-h-11 rounded border border-border px-3" onClick={() => location.reload()}>Reload saved fixture</button>
      {mode === 'actions' && c && g.phase === 'hub' && <button type="button" className="min-h-11 rounded border border-border px-3"
        onClick={() => {
          const points = E.FORMATIONS[c.formationIndex].slots.map(slot => ({ x: slot.x, y: slot.y }));
          points[0] = { ...points[0], x: Math.min(94, points[0].x + 2) };
          execute('same-turn-shape', () => g.setCustomShape(c.formationIndex, points), points);
          execute('same-turn-reset', () => g.setCustomShape(c.formationIndex, null), null);
        }}>Write then reset in one turn</button>}
      {mode === 'blocked' && c && g.phase === 'hub' && <>
        <button type="button" className="min-h-11 rounded border border-border px-3" onClick={g.play}>Try actual Play</button>
        <button type="button" className="min-h-11 rounded border border-border px-3" onClick={() => g.simToWeek(c.week + 1)}>Try actual Calendar</button>
      </>}
      {mode === 'stage' && c && g.phase === 'hub' && <button type="button" className="min-h-11 rounded border border-border px-3"
        onClick={() => { g.secondHalf(); setShowStage(true); }}>Open actual refused stage</button>}
    </div>
    <p data-cm-fixture-phase>{g.phase}</p>
    {g.phase === 'resume' && <button type="button" className="min-h-11 rounded border border-border px-3" onClick={g.resume}>Resume actual saved career</button>}
    {g.saveFailed && <p role="alert">Your career is not being saved right now.</p>}
    {g.saveMoved && <p role="alert">The actual save fence refused this page.</p>}
    {g.positionNotice && <p role="alert" data-fixture-position-notice>{g.positionNotice}</p>}
    {c && g.phase === 'hub' && !showStage && <section data-cm-positions-screen>
      <TacticsScreen career={c} onCustomShape={edit} onFormation={g.setFormationIndex}
        onMentality={g.setMentality} onInstructions={g.setTeamInstructions} onSlot={g.setXiSlot}
        onSwap={g.swapXiSlots} onAutoPick={g.autoPick} onDuty={g.setSlotDuty} onSetPiece={g.assignSetPiece}
        onAutoSetPieces={g.autoPickSetPieces} onShootoutOrder={g.setShootoutOrder}
        onSaveMatchPlan={(slot, name) => execute('plan-save', () => g.saveMatchPlan(slot, name))}
        onApplyMatchPlan={slot => execute('plan-apply', () => g.applyMatchPlan(slot))}
        onDeleteMatchPlan={slot => execute('plan-delete', () => g.deleteMatchPlan(slot))} />
    </section>}
    {c && showStage && <LiveSimScreen career={c} live={c.live ?? null} report={null} clubColor="#16824d"
      positionNotice={g.positionNotice} onSub={g.subAtHalftime} onShape={g.shapeAtHalftime} onTalk={g.halftimeTalk}
      onSecondHalf={g.secondHalf} onStartSecondHalf={g.startSecondHalfLive} onStartExtraTime={g.startExtraTimeLive}
      onChange={g.changeAt} onMark={g.markMinute} onExit={() => setShowStage(false)} />}
  </main>;
}
function read() {
  if (!current) throw new Error('Actual hook not mounted');
  const c = current.career, formation = c ? E.FORMATIONS[c.formationIndex] : null;
  const shape = c && formation ? readCustomShape(c.customShape, c.formationIndex, formation.slots) : null;
  return JSON.parse(JSON.stringify({ mode, theme, phase: current.phase, identity: identity(c), draws, faults, writes, actions, transitions, events,
    raw: localStorage.getItem(E.SAVE_KEY), saveFailed: current.saveFailed, saveMoved: current.saveMoved,
    positionNotice: current.positionNotice, own: !!c && Object.prototype.hasOwnProperty.call(c, 'customShape'), shape,
    rawShape: c?.customShape ?? null, formationIndex: c?.formationIndex ?? null, xiIds: c?.xiIds ?? [],
    xiDuties: c?.xiDuties ?? null, mentality: c?.mentality ?? null, live: c?.live ? { positionRules: c.live.positionRules } : null,
    canonical: formation?.slots.map((slot, index) => ({ identity: identity(slot), index, label: slot.label, allowed: slot.allowed, x: slot.x, y: slot.y })) ?? [],
    formations: E.FORMATIONS.map((f, index) => ({ index, name: f.name, count: f.slots.length })),
    preset: formation?.slots.map(slot => ({ x: slot.x, y: slot.y })) ?? [] }));
}
Object.defineProperty(window, '__CM_POSITION_FIXTURE__', { value: Object.freeze({ read }) });
queueMicrotask(() => { void prepare().then(() => createRoot(document.getElementById('root')!).render(<Fixture />)); });

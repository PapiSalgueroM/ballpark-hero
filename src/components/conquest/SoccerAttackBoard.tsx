import { useEffect, useMemo, useRef, useState } from 'react';
import { RotateCcw, Shield, Sparkles, Swords, Trophy } from 'lucide-react';
import AttackMap from '@/components/conquest/AttackMap';
import { HowToPlayPopover } from '@/components/game/HowToPlayPopover';
import { makeSoccerAttackSetup } from '@/data/soccerAttack';
import { advanceAttack, createAttack, type AttackResult, type AttackState } from '@/lib/conquestAttack';
import {
  ATTACK_SAVE_KEY,
  commitAttackSave,
  loadAttackSave,
  type AttackSaveLoad,
} from '@/lib/conquestAttackSave';
import { useRevealScroll } from '@/hooks/useRevealScroll';

const PREVIEW_STATE = createAttack(makeSoccerAttackSetup(0));
const CURRENT_DATA_VERSION = PREVIEW_STATE.setup.dataVersion;

type AnimationStage = 'team' | 'direction' | 'result' | null;
interface PendingSave { next: AttackState; animation: AnimationStage; expectedRaw: string | null }

const actionClass = 'min-h-[44px] w-full rounded-xl bg-primary px-4 py-3 text-sm font-bold text-primary-foreground shadow-sm transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50';
const quietButton = 'min-h-[38px] rounded-xl border border-border bg-background px-3 py-2 text-xs font-bold text-foreground hover:border-primary/60 disabled:opacity-50';

function randomSeed(): number {
  try {
    const value = new Uint32Array(1);
    crypto.getRandomValues(value);
    return value[0];
  } catch {
    return Math.floor(Math.random() * 4294967296) >>> 0;
  }
}

function openingState(): AttackState {
  return createAttack(makeSoccerAttackSetup(randomSeed()));
}

function TeamWheel({ spinning, color }: { spinning?: boolean; color?: string }) {
  return (
    <div
      aria-hidden="true"
      className={`relative mx-auto grid h-24 w-24 place-items-center rounded-full border-4 border-card shadow-[0_0_0_2px_hsl(var(--border))] ${spinning ? 'motion-safe:animate-spin' : ''}`}
      style={{ background: color ? `conic-gradient(${color} 0 55%, #ffffff 55% 70%, #172033 70% 100%)` : 'conic-gradient(#dc2626 0 20%, #2563eb 20% 40%, #facc15 40% 60%, #15803d 60% 80%, #ffffff 80% 100%)' }}
    >
      <span className="grid h-11 w-11 place-items-center rounded-full border-2 border-slate-950 bg-card text-primary"><Shield className="h-5 w-5" /></span>
      <span className="absolute -top-3 h-0 w-0 border-x-[8px] border-t-[12px] border-x-transparent border-t-yellow-400" />
    </div>
  );
}

function DirectionWheel({ spinning, bearing }: { spinning?: boolean; bearing?: number | null }) {
  return (
    <div aria-hidden="true" className="relative mx-auto h-24 w-24 rounded-full border-4 border-slate-800 bg-white text-slate-950 shadow-[inset_0_0_0_5px_#4d9bc6]">
      {['N', 'E', 'S', 'W'].map((point, index) => (
        <span key={point} className="absolute left-1/2 top-1/2 text-[10px] font-black" style={{ transform: `translate(-50%, -50%) rotate(${index * 90}deg) translateY(-34px) rotate(${-index * 90}deg)` }}>{point}</span>
      ))}
      <span
        className={`absolute left-1/2 top-1/2 h-8 w-1 origin-bottom rounded-full bg-red-600 ${spinning ? 'motion-safe:animate-spin' : ''}`}
        style={{ transform: `translate(-50%, -100%) rotate(${bearing ?? 0}deg)` }}
      />
      <span className="absolute left-1/2 top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-slate-950" />
    </div>
  );
}

function initialSession(): { state: AttackState | null; raw: string | null; issue: AttackSaveLoad | null } {
  const loaded = loadAttackSave(CURRENT_DATA_VERSION);
  if (loaded.kind === 'saved') return { state: loaded.state, raw: loaded.raw, issue: null };
  return { state: null, raw: loaded.raw, issue: loaded.kind === 'empty' ? null : loaded };
}

function Rules({ detailed = false }: { detailed?: boolean }) {
  return (
    <div className={detailed ? 'space-y-3' : 'space-y-2'}>
      <div>
        <h3 className="font-bold text-foreground">The loop</h3>
        <ol className="mt-1 list-inside list-decimal space-y-1 text-muted-foreground">
          <li>Spin for the attacking club.</li>
          <li>Spin a legal compass direction across connected land.</li>
          <li>Claim neutral ground or play the club hit by the ray.</li>
        </ol>
      </div>
      {detailed && (
        <>
          <div>
            <h3 className="font-bold text-foreground">Winning and capturing</h3>
            <p className="mt-1 text-muted-foreground">
              After a match, the loser is eliminated and the winner takes the whole empire, including every region it owned.
            </p>
            <p className="mt-1 text-muted-foreground">
              The winner captures the loser's best original player, plus every player that club captured earlier. That captured-player chain moves again if the new club is later eliminated.
            </p>
          </div>
          <div>
            <h3 className="font-bold text-foreground">Upgrades and the finish</h3>
            <p className="mt-1 text-muted-foreground">
              Claiming neutral land gives a best player two rating points. When the final club claims all of England, its upgrade is four points instead of two. Simulated ratings stop at 99.
            </p>
          </div>
          <div>
            <h3 className="font-bold text-foreground">Launch points</h3>
            <p className="mt-1 text-muted-foreground">
              The direction wheel skips angles that leave connected land. If a club's home has no legal route, the ray starts from its nearest owned frontier with a legal route. This is this app's interpretation for keeping the map playable, not a claim about the source video.
            </p>
          </div>
        </>
      )}
      <div>
        <h3 className="font-bold text-foreground">What this map means</h3>
        <p className="mt-1 text-muted-foreground">
          This is the English-league first slice. The complete World mode is not here yet. Borders are generated game regions, not real administrative lines. Club strength and player upgrades use simulated ratings. Only angles that reach land can be selected. Attack is unlimited and gives no ranked points.
        </p>
      </div>
      <div>
        <h3 className="font-bold text-foreground">Worked fictional example</h3>
        <p className="mt-1 text-muted-foreground">
          Amber Vale spins east into a neutral region. It claims that land, its best player gains two rating points, and the next turn starts with a new club spin.
        </p>
      </div>
    </div>
  );
}

function resultCopy(result: AttackResult, state: AttackState) {
  const teamName = (id: string | null) => state.teams.find(team => team.id === id)?.name ?? 'Neutral land';
  const regionName = state.setup.regions.find(region => region.id === result.targetRegion)?.name ?? result.targetRegion;
  const score = result.score
    ? `${result.score.attacker}-${result.score.defender}${result.score.shootout ? ` (${result.score.shootout.attacker}-${result.score.shootout.defender} on penalties)` : ''}`
    : null;
  return {
    headline: result.kind === 'expansion'
      ? `${teamName(result.attacker)} claimed ${regionName}`
      : `${teamName(result.winner)} beat ${teamName(result.loser)}`,
    matchup: result.kind === 'match' ? `${teamName(result.attacker)} ${score} ${teamName(result.defender)}` : null,
    territory: `${result.changedRegions.length} ${result.changedRegions.length === 1 ? 'region' : 'regions'} changed hands`,
    captures: result.capturedPlayers.map(player => player.name),
    upgrade: result.upgrade
      ? `${state.teams.flatMap(team => team.players).find(player => player.id === result.upgrade?.playerId)?.name ?? 'Player'} improved ${result.upgrade.before} to ${result.upgrade.after}`
      : null,
  };
}

export default function SoccerAttackBoard() {
  const [session, setSession] = useState(initialSession);
  const [pending, setPending] = useState<PendingSave | null>(null);
  const [unsaved, setUnsaved] = useState(false);
  const [notice, setNotice] = useState('');
  const [animation, setAnimation] = useState<AnimationStage>(null);
  const [inspectedRegion, setInspectedRegion] = useState<string | null>(() => session.state?.originRegion ?? session.state?.setup.teams[0]?.homeRegion ?? null);
  const busy = useRef(false);
  const [working, setWorking] = useState(false);
  const revealRef = useRevealScroll<HTMLDivElement>(`${session.state?.revision ?? 'intro'}:${notice}`);

  const state = session.state;
  const recovery = session.issue;
  const teamById = useMemo(() => new Map(state?.teams.map(team => [team.id, team]) ?? []), [state?.teams]);
  const regionById = useMemo(() => new Map(state?.setup.regions.map(region => [region.id, region]) ?? []), [state?.setup.regions]);

  useEffect(() => {
    if (!animation) return;
    const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (reduced) { setAnimation(null); return; }
    const timer = window.setTimeout(() => setAnimation(null), animation === 'result' ? 520 : 760);
    return () => window.clearTimeout(timer);
  }, [animation]);

  useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      if (event.key !== ATTACK_SAVE_KEY || unsaved) return;
      const latest = loadAttackSave(CURRENT_DATA_VERSION);
      if (latest.kind === 'saved' && latest.raw !== session.raw) {
        setSession({ state: latest.state, raw: latest.raw, issue: null });
        setPending(null);
        setAnimation(null);
        setNotice('Attack progress moved forward in another tab. Your saved run is restored.');
      } else if (latest.kind === 'damaged') {
        setSession(current => ({ ...current, issue: latest }));
        setNotice('The save changed in another tab. This screen will not overwrite it.');
      }
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, [session.raw, unsaved]);

  const applyCommitted = (next: AttackState, raw: string | null, nextAnimation: AnimationStage) => {
    setSession({ state: next, raw, issue: null });
    setPending(null);
    setNotice('');
    setAnimation(nextAnimation);
    setInspectedRegion(next.originRegion ?? next.targetRegion ?? inspectedRegion ?? next.setup.teams[0].homeRegion);
  };

  const restoreConflict = () => {
    const latest = loadAttackSave(CURRENT_DATA_VERSION);
    if (latest.kind === 'saved') {
      setSession({ state: latest.state, raw: latest.raw, issue: null });
      setInspectedRegion(latest.state.originRegion ?? latest.state.targetRegion ?? latest.state.setup.teams[0].homeRegion);
    } else {
      setSession(current => ({ ...current, issue: latest.kind === 'empty' ? null : latest, raw: latest.raw }));
    }
    setPending(null);
    setAnimation(null);
    setNotice('Attack progress changed in another tab. Your latest saved run is restored.');
  };

  const saveThenReveal = async (next: AttackState, nextAnimation: AnimationStage, expectedRaw = session.raw, allowRecovery = false) => {
    if (busy.current) return;
    if (unsaved) { applyCommitted(next, null, nextAnimation); return; }
    if (recovery && !allowRecovery) {
      setNotice('Resolve the changed save before continuing this run.');
      return;
    }
    busy.current = true;
    setWorking(true);
    const attempt = { next, animation: nextAnimation, expectedRaw };
    try {
      const outcome = await commitAttackSave(expectedRaw, next);
      if (outcome.status === 'saved') applyCommitted(next, outcome.raw!, nextAnimation);
      else if (outcome.status === 'conflict') restoreConflict();
      else {
        setPending(attempt);
        setNotice('That move is not saved yet. Retry save before continuing, or play this exact run without saving.');
      }
    } finally {
      busy.current = false;
      setWorking(false);
    }
  };

  const start = (replace = false) => {
    const next = pending?.next ?? openingState();
    void saveThenReveal(next, null, replace ? recovery?.raw ?? session.raw : session.raw, replace);
  };

  const retry = () => {
    if (pending) void saveThenReveal(pending.next, pending.animation, pending.expectedRaw);
  };

  const playUnsaved = () => {
    if (busy.current) return;
    const next = pending?.next ?? state ?? openingState();
    setUnsaved(true);
    applyCommitted(next, null, pending?.animation ?? null);
    setNotice('This session is not saved and will be lost if you close or reload the page.');
  };

  const replaceDamagedSave = () => {
    if (!state || recovery?.kind !== 'damaged') return;
    void saveThenReveal(state, null, recovery.raw, true);
  };

  const newRun = () => {
    if (state && state.phase !== 'finished' && !window.confirm('Replace this unfinished Attack run with a new one?')) return;
    const next = openingState();
    if (unsaved) applyCommitted(next, null, null);
    else void saveThenReveal(next, null, session.raw);
  };

  const advance = () => {
    if (!state || animation || working) return;
    const next = advanceAttack(state);
    const nextAnimation: AnimationStage = state.phase === 'team' ? 'team'
      : state.phase === 'direction' ? 'direction'
        : state.phase === 'target' ? 'result' : null;
    void saveThenReveal(next, nextAnimation);
  };

  if (!state) {
    const recoveryText = recovery?.kind === 'damaged'
      ? 'This Attack save is damaged or unsupported. It has not been changed.'
      : recovery?.kind === 'blocked'
          ? 'Safe browser storage is blocked. Attack cannot promise to resume.'
          : '';
    return (
      <div className="relative space-y-4">
        <HowToPlayPopover title="How to play Attack" triggerSide="right" triggerLabel="Attack rules" className="top-0 right-0">
          <Rules detailed />
        </HowToPlayPopover>
        {recoveryText && (
          <div role="alert" className="rounded-xl border border-amber-500/50 bg-amber-500/10 p-3 text-sm text-foreground">
            <p>{recoveryText}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {recovery?.kind !== 'blocked' && (
                <button type="button" onClick={() => start(true)} className={quietButton}>
                  Replace damaged save
                </button>
              )}
              <button type="button" onClick={playUnsaved} disabled={working} className={quietButton}>Play without saving</button>
            </div>
          </div>
        )}
        {notice && (
          <div role="status" className="rounded-xl border border-amber-500/50 bg-amber-500/10 p-3 text-sm text-foreground">
            <p>{notice}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <button type="button" onClick={retry} disabled={working} className={quietButton}>Retry save</button>
              <button type="button" onClick={playUnsaved} disabled={working} className={quietButton}>Play this run without saving</button>
            </div>
          </div>
        )}
        <div className="grid min-w-0 gap-4 lg:grid-cols-[minmax(0,1.65fr)_minmax(260px,0.7fr)]">
          <AttackMap state={PREVIEW_STATE} inspectedRegion={inspectedRegion} onInspect={setInspectedRegion} />
          <section className="self-start rounded-2xl border border-border bg-card p-4 shadow-sm">
            <h2 className="font-display text-xl font-bold text-primary">How Attack works</h2>
            <div className="mt-3 text-sm"><Rules /></div>
            {!recovery && !notice && (
              <button type="button" onClick={() => start()} disabled={working} className={`${actionClass} mt-4`}>
                {working ? 'Saving map...' : 'Start Attack'}
              </button>
            )}
          </section>
        </div>
      </div>
    );
  }

  const living = new Set(Object.values(state.owners).filter(Boolean)).size;
  const owned = Object.values(state.owners).filter(Boolean).length;
  const selected = state.selectedTeam ? teamById.get(state.selectedTeam) : null;
  const target = state.targetRegion ? regionById.get(state.targetRegion) : null;
  const targetOwner = target ? teamById.get(state.owners[target.id] ?? '') : null;
  const origin = state.originRegion ? regionById.get(state.originRegion) : null;
  const home = selected ? regionById.get(selected.homeRegion) : null;
  const frontier = !!origin && !!home && origin.id !== home.id;
  const inspected = inspectedRegion ? regionById.get(inspectedRegion) : null;
  const inspectedOwner = inspected ? teamById.get(state.owners[inspected.id] ?? '') : null;
  const result = state.lastResult ? resultCopy(state.lastResult, state) : null;
  const locked = working || !!animation || !!recovery;

  return (
    <div className="relative space-y-3">
      <HowToPlayPopover title="How to play Attack" triggerSide="right" triggerLabel="Attack rules" className="top-0 right-0">
        <Rules detailed />
      </HowToPlayPopover>
      <div className="flex flex-wrap items-center gap-2 pr-10 text-xs">
        <span className="rounded-full border border-border bg-card px-3 py-1.5 font-bold">{living} clubs left</span>
        <span className="rounded-full border border-border bg-card px-3 py-1.5">{owned}/{state.setup.regions.length} claimed</span>
        <span className="rounded-full border border-border bg-card px-3 py-1.5">Turn {Math.floor(state.revision / 4) + 1}</span>
        {unsaved && <span className="rounded-full border border-amber-500/60 bg-amber-500/10 px-3 py-1.5 font-bold text-amber-700 dark:text-amber-300">Unsaved session</span>}
      </div>
      {recovery && (
        <div role="alert" className="rounded-xl border border-amber-500/50 bg-amber-500/10 p-3 text-sm text-foreground">
          <p>{recovery.kind === 'damaged' ? 'This Attack save changed to damaged data. It has not been overwritten.' : 'Safe browser storage is blocked. This run cannot be saved right now.'}</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {recovery.kind === 'damaged' && <button type="button" onClick={replaceDamagedSave} disabled={working} className={quietButton}>Replace damaged save</button>}
            <button type="button" onClick={playUnsaved} disabled={working} className={quietButton}>Continue without saving</button>
          </div>
        </div>
      )}
      {notice && !recovery && (
        <div role="status" className="rounded-xl border border-amber-500/50 bg-amber-500/10 p-3 text-sm text-foreground">
          <p>{notice}</p>
          {pending && (
            <div className="mt-2 flex flex-wrap gap-2">
              <button type="button" onClick={retry} disabled={working} className={quietButton}>Retry save</button>
              <button type="button" onClick={playUnsaved} disabled={working} className={quietButton}>Play this run without saving</button>
            </div>
          )}
        </div>
      )}
      <div className="grid min-w-0 items-start gap-4 lg:grid-cols-[minmax(0,1.65fr)_minmax(280px,0.72fr)]">
        <AttackMap state={state} inspectedRegion={inspectedRegion} onInspect={setInspectedRegion} />
        <div ref={revealRef} className="min-w-0 space-y-3">
          <section aria-live="polite" aria-busy={locked} className="rounded-2xl border border-border bg-card p-4 shadow-sm">
            {animation === 'team' ? (
              <div className="text-center">
                <TeamWheel spinning color={selected?.color} />
                <h2 className="mt-2 font-display text-lg font-bold">Team wheel spinning</h2>
              </div>
            ) : animation === 'direction' ? (
              <div className="text-center">
                <DirectionWheel spinning bearing={state.bearing} />
                <h2 className="mt-2 font-display text-lg font-bold">Direction wheel spinning</h2>
                <p className="mt-1 text-sm text-muted-foreground">Finding the first legal region on the ray.</p>
              </div>
            ) : state.phase === 'team' ? (
              <>
                <TeamWheel />
                <h2 className="mt-3 text-center font-display text-xl font-bold">Team wheel</h2>
                <p className="mt-1 text-sm text-muted-foreground">Every club still holding land has a place on the wheel.</p>
                <button type="button" onClick={advance} disabled={locked} className={`${actionClass} mt-4`}>Spin team wheel</button>
              </>
            ) : state.phase === 'direction' ? (
              <>
                <DirectionWheel />
                <h2 className="mt-3 text-center font-display text-xl font-bold">Direction wheel</h2>
                <p className="mt-1 text-sm"><b>{selected?.name}</b> attacks from {origin?.name}.</p>
                {frontier && <p className="mt-2 text-xs text-muted-foreground">The home region has no legal route, so this attack launches from the nearest owned frontier, {origin?.name}.</p>}
                <button type="button" onClick={advance} disabled={locked} className={`${actionClass} mt-4`}>Spin direction wheel</button>
              </>
            ) : state.phase === 'target' ? (
              <>
                <Swords className="h-7 w-7 text-primary" />
                <h2 className="mt-2 font-display text-xl font-bold">Attack lined up</h2>
                <p className="mt-1 text-sm"><b>{selected?.name}</b> fires at {state.bearing} degrees from {origin?.name}.</p>
                <div className="mt-3 rounded-xl border border-border bg-background p-3 text-sm">
                  <p className="font-bold">Target: {target?.name}</p>
                  <p className="text-muted-foreground">{targetOwner ? `Held by ${targetOwner.name}` : 'Neutral land'}</p>
                </div>
                {frontier && <p className="mt-2 text-xs text-muted-foreground">The ray begins at the owned frontier {origin?.name}, not the club label or old home.</p>}
                <button type="button" onClick={advance} disabled={locked} className={`${actionClass} mt-4`}>Play attack</button>
              </>
            ) : state.phase === 'recap' && result ? (
              <>
                <Sparkles className="h-7 w-7 text-primary" />
                <h2 className="mt-2 font-display text-xl font-bold">{result.headline}</h2>
                {result.matchup && <p className="mt-1 text-sm font-semibold">{result.matchup}</p>}
                <p className="mt-2 text-sm text-muted-foreground">{result.territory}</p>
                {result.captures.length > 0 && <p className="mt-1 text-sm text-muted-foreground">Captured: {result.captures.join(', ')}</p>}
                {result.upgrade && <p className="mt-1 text-sm text-muted-foreground">Upgrade: {result.upgrade}</p>}
                {frontier && <p className="mt-2 text-xs text-muted-foreground">This ray launched from {origin?.name}. The saved launch stays on the recap even if the attacker lost its land.</p>}
                <button type="button" onClick={advance} disabled={locked} className={`${actionClass} mt-4`}>Continue</button>
              </>
            ) : (
              <div className="text-center">
                <Trophy className="mx-auto h-10 w-10 text-yellow-500" />
                <h2 className="mt-2 font-display text-xl font-bold">{teamById.get(state.champion ?? '')?.name} rules England</h2>
                <p className="mt-1 text-sm text-muted-foreground">All generated regions belong to one club. Attack is unlimited, so this finish adds no ranked points.</p>
                <button type="button" onClick={newRun} disabled={locked} className={`${actionClass} mt-4`}>Play another Attack</button>
              </div>
            )}
          </section>
          {inspected && (
            <section aria-label="Region inspection" className="rounded-2xl border border-border bg-card p-4 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="font-display text-lg font-bold">{inspected.name}</h2>
                  <p className="text-xs text-muted-foreground">{inspectedOwner ? `Owned by ${inspectedOwner.name}` : 'Neutral land'}</p>
                </div>
                <button type="button" onClick={() => setInspectedRegion(null)} className="min-h-[30px] rounded-lg border border-border px-2 text-xs">Close</button>
              </div>
              {inspectedOwner && (
                <div className="mt-3 max-h-40 overflow-y-auto rounded-xl border border-border bg-background p-2">
                  <p className="mb-1 text-xs font-bold">Current roster, {inspectedOwner.players.length}</p>
                  <ul className="space-y-1 text-xs text-muted-foreground">
                    {[...inspectedOwner.players].sort((a, b) => b.rating - a.rating).map(player => (
                      <li key={player.id} className="flex justify-between gap-3"><span>{player.name}</span><b className="text-foreground">{player.rating}</b></li>
                    ))}
                  </ul>
                </div>
              )}
            </section>
          )}
          <button type="button" onClick={newRun} disabled={locked} className={`${quietButton} inline-flex w-full items-center justify-center gap-2`}>
            <RotateCcw className="h-4 w-4" /> Start new Attack
          </button>
        </div>
      </div>
    </div>
  );
}

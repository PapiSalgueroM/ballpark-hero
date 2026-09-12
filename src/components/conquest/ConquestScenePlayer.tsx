import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ConquestBattleView, ConquestTakeover } from '@/components/conquest/ConquestRegionMap';
import { diffOwners, isLightHex, type ConquestMapSport } from '@/lib/conquestMapLook';
import { SCENE_TIMINGS, WHEEL_SPIN_MS, type ConquestScene, type WheelSpec } from '@/lib/conquestScenes';
import { recordLabel, regionNoun, statesOf, teamLabel, type ImpRecords, type ImperialismSport } from '@/lib/imperialismEngine';
import { ARROW_SPIN_MS } from '@/components/conquest/ConquestWheel';
import { cn } from '@/lib/utils';

/**
 * Round 529: a settled round plays as scenes, one game at a time.
 *
 * The hook steps a cursor through the scenes on SCENE_TIMINGS and hands the
 * board a frame for the map: the owners to paint, the fight to mark, the
 * takeover to run and the regions to zoom on. The board renders the map; the
 * component below renders what sits under it: the matchup card, the score
 * at its final value (Round 147: a score appears, it never counts up), the
 * gain chip, the player's call on the featured scene, and a Skip button.
 *
 * Every value shown comes off the scene, and every scene is the engine's
 * game (src/lib/conquestScenes.ts), so nothing here can show land moving
 * that did not move. scripts/simConquestScenes.mjs section 7 renders this at
 * every beat and holds the score element to the beats it belongs to.
 *
 * Reduced motion: play() jumps straight to the last scene's final frame and
 * fires onDone, so the round shows its recap directly. The card's own slide
 * in lands on its final frame under the media query; nothing is hidden.
 */

export type SceneBeat = 'card' | 'fight' | 'score' | 'takeover' | 'done';

/** What the board hands the map for the current frame; the board renders ConquestRegionMap, the player never does. */
export interface SceneFrame {
  owners: Record<string, string>;
  battle: ConquestBattleView | null;
  takeover: ConquestTakeover | null;
  focusRegions: string[] | null;
  highlightTeam: string | null;
}

export interface SceneCursor { index: number; beat: SceneBeat }

export interface UseScenePlayerOptions {
  reducedMotion?: boolean;
  initialCursor?: SceneCursor;
  onDone?: () => void;
}

/** The featured scene's card beat also carries the wheel's spin and the needle's settle. */
export const WHEEL_BEAT_MS = WHEEL_SPIN_MS + ARROW_SPIN_MS;

/** The cursor a finished round rests on: the last scene at beat done. */
export function finalCursor(scenes: ConquestScene[]): SceneCursor {
  return { index: Math.max(0, scenes.length - 1), beat: 'done' };
}

/** How long the cursor rests on a beat. A scene that moved nothing has no takeover beat, and the featured scene's card waits for the wheel. */
export function beatDurationMs(scene: ConquestScene, beat: SceneBeat): number {
  if (beat === 'done') return 0;
  if (beat === 'card') return SCENE_TIMINGS.card + (scene.featured ? WHEEL_BEAT_MS : 0);
  return SCENE_TIMINGS[beat];
}

/** The beat after this one: card, fight, score, takeover (only when land moved), then the next scene's card or done. */
export function nextCursor(scenes: ConquestScene[], cursor: SceneCursor): SceneCursor {
  const scene = scenes[cursor.index];
  if (!scene || cursor.beat === 'done') return finalCursor(scenes);
  if (cursor.beat === 'card') return { index: cursor.index, beat: 'fight' };
  if (cursor.beat === 'fight') return { index: cursor.index, beat: 'score' };
  if (cursor.beat === 'score' && scene.flipped.length > 0) return { index: cursor.index, beat: 'takeover' };
  return cursor.index + 1 < scenes.length ? { index: cursor.index + 1, beat: 'card' } : finalCursor(scenes);
}

/** The regions both empires hold on the scene's opening map: what the camera zooms on. */
export function sceneFocus(scene: ConquestScene, known?: Set<string>): string[] {
  const out: string[] = [];
  for (const region of Object.keys(scene.before)) {
    const owner = scene.before[region];
    if ((owner === scene.game.home || owner === scene.game.away) && (!known || known.has(region))) out.push(region);
  }
  return out;
}

/** The takeover a scene ran, keyed by its index so the map restarts the wave once per scene; null when it moved nothing. */
function takeoverOf(scene: ConquestScene): ConquestTakeover | null {
  return scene.flipped.length > 0 ? { key: scene.index + 1, from: diffOwners(scene.before, scene.after) } : null;
}

/** The map's frame at a cursor. The attacker is the home side: that is the
 *  wedge the wheel lands on. The previous scene's wave is carried into the
 *  next scene's card and fight beats (and the last scene's into done) so the
 *  outer waves finish rather than being cut on the beat. */
export function frameAt(scenes: ConquestScene[], cursor: SceneCursor, known?: Set<string>): SceneFrame {
  const scene = scenes[cursor.index];
  if (!scene) return { owners: {}, battle: null, takeover: null, focusRegions: null, highlightTeam: null };
  if (cursor.beat === 'done') {
    const last = scenes[scenes.length - 1];
    return { owners: last.after, battle: null, takeover: takeoverOf(last), focusRegions: null, highlightTeam: null };
  }
  const { game } = scene;
  const focusRegions = sceneFocus(scene, known);
  if (cursor.beat === 'card' || cursor.beat === 'fight') {
    const previous = cursor.index > 0 ? scenes[cursor.index - 1] : null;
    return {
      owners: scene.before,
      battle: { attacker: game.home, defender: game.away, stage: cursor.beat === 'card' ? 'pending' : 'live' },
      takeover: previous ? takeoverOf(previous) : null,
      focusRegions,
      highlightTeam: null,
    };
  }
  const battle: ConquestBattleView = { attacker: game.home, defender: game.away, stage: 'resolved', winner: game.winner };
  if (cursor.beat === 'score') return { owners: scene.before, battle, takeover: null, focusRegions, highlightTeam: null };
  return { owners: scene.after, battle, takeover: takeoverOf(scene), focusRegions, highlightTeam: null };
}

/** Steps through the scenes on SCENE_TIMINGS; reduced motion jumps every scene to its final frame. skip() lands on the last scene's final frame and fires onDone once. */
export function useScenePlayer(
  scenes: ConquestScene[],
  map: ConquestMapSport,
  options: UseScenePlayerOptions = {},
): { cursor: SceneCursor; scene: ConquestScene | null; frame: SceneFrame; playing: boolean; play: () => void; skip: () => void } {
  const { reducedMotion = false, initialCursor } = options;
  const [cursor, setCursor] = useState<SceneCursor>(() => initialCursor ?? { index: 0, beat: 'card' });
  const [playing, setPlaying] = useState(false);
  const doneFired = useRef(false);
  const onDoneRef = useRef(options.onDone);
  onDoneRef.current = options.onDone;

  const finish = useCallback(() => {
    setCursor(finalCursor(scenes));
    setPlaying(false);
    if (doneFired.current) return;
    doneFired.current = true;
    onDoneRef.current?.();
  }, [scenes]);

  const play = useCallback(() => {
    doneFired.current = false;
    if (scenes.length === 0 || reducedMotion) {
      finish();
      return;
    }
    setCursor({ index: 0, beat: 'card' });
    setPlaying(true);
  }, [scenes, reducedMotion, finish]);

  useEffect(() => {
    if (!playing) return;
    if (cursor.beat === 'done') {
      finish();
      return;
    }
    const scene = scenes[cursor.index];
    if (!scene) {
      finish();
      return;
    }
    const timer = window.setTimeout(() => setCursor(c => nextCursor(scenes, c)), beatDurationMs(scene, cursor.beat));
    return () => window.clearTimeout(timer);
  }, [playing, cursor, scenes, finish]);

  const known = useMemo(() => new Set(map.regions.map(r => r.id)), [map]);
  const frame = useMemo(() => frameAt(scenes, cursor, known), [scenes, cursor, known]);
  const scene = scenes[cursor.index] ?? null;
  return { cursor, scene, frame, playing, play, skip: finish };
}

export interface ConquestScenePlayerProps {
  sport: ImperialismSport;
  map: ConquestMapSport;
  scenes: ConquestScene[];
  cursor: SceneCursor;
  records: ImpRecords;
  favorite: string;
  wheel: WheelSpec | null;
  arrowDeg: number | null;
  onSkip: () => void;
}

/** The matchup card (data-scene-card, data-scene-index), the score (data-scene-score, mounted only at beats score and takeover, text "H to A, FINAL"), the call and hit chip on the featured scene, and the Skip button. */
export default function ConquestScenePlayer({
  sport, map, scenes, cursor, records, favorite, wheel, arrowDeg, onSkip,
}: ConquestScenePlayerProps) {
  const scene = scenes[cursor.index] ?? null;
  const colorOf = useMemo(() => {
    const m = new Map(map.teams.map(t => [t.id, t.color]));
    return (id: string) => m.get(id) ?? '#2a3040';
  }, [map]);
  if (!scene) return <div data-scene-player data-scene-beat="done" />;

  const { game, before } = scene;
  const label = (id: string) => teamLabel(sport, id);
  /* The score exists only from its own beat: never a placeholder, never a count. */
  const scored = cursor.beat === 'score' || cursor.beat === 'takeover';
  const loser = game.winner === game.home ? game.away : game.home;
  const gained = scene.flipped.length;
  const side = (teamId: string, role: 'attacker' | 'defender') => {
    const color = colorOf(teamId);
    const held = statesOf(before, teamId).length;
    const won = scored && game.winner === teamId;
    const lost = scored && game.winner !== teamId;
    return (
      <div
        data-scene-side={role}
        data-team={teamId}
        className={cn('min-w-0 flex-1 rounded-xl border-2 px-2 py-2 text-center transition-opacity', won ? 'border-gold' : 'border-border', lost && 'opacity-60')}
        style={{ background: `${color}22` }}
      >
        <span className="block h-2 w-full rounded-full" style={{ background: color }} />
        <span className="mt-1.5 block truncate text-sm font-black" style={{ color: isLightHex(color) ? undefined : color }}>{label(teamId)}</span>
        <span className="block text-[10px] text-muted-foreground">
          {held} {regionNoun(sport, held)} · {recordLabel(records[teamId])}
        </span>
        {teamId === favorite && <span className="mt-1 inline-block rounded-full bg-gold/15 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-gold">You</span>}
      </div>
    );
  };

  return (
    <div
      data-scene-player
      data-scene-beat={cursor.beat}
      data-scene-total={scenes.length}
      className="space-y-2"
    >
      <div
        key={scene.index}
        data-scene-card
        data-scene-index={scene.index}
        data-scene-featured={scene.featured ? 'yes' : 'no'}
        className={cn('cq-scene-in rounded-2xl border bg-card p-3', scene.featured ? 'border-gold/60' : 'border-border')}
      >
        <p className="text-center text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          Game {scene.index + 1} of {scenes.length}
          {scene.featured && wheel ? ` · the wheel picked ${label(wheel.wedges[wheel.landingIndex]?.teamId ?? game.home)}` : ''}
        </p>
        <div className="mt-2 flex items-stretch gap-2">
          {side(game.home, 'attacker')}
          <div className="flex w-8 shrink-0 flex-col items-center justify-center text-muted-foreground">
            {scene.featured && arrowDeg !== null ? (
              <span data-scene-arrow data-angle={arrowDeg} className="text-lg" style={{ display: 'inline-block', transform: `rotate(${arrowDeg}deg)` }} aria-hidden>➜</span>
            ) : (
              <span className="text-xs font-bold">at</span>
            )}
          </div>
          {side(game.away, 'defender')}
        </div>
        {scene.featured && scene.call !== null && (
          <p data-scene-call data-team={scene.call} className="mt-2 text-center text-[11px] text-muted-foreground">
            Your call: <b className="text-foreground">{label(scene.call)}</b>
          </p>
        )}
        {scored && (
          <div className="mt-2 text-center">
            <p data-scene-score className="cq-scene-slam font-display text-2xl font-black text-foreground">
              {game.homeScore} to {game.awayScore}, FINAL{game.overtime ? ` (${sport.score.tieBreakLabel})` : ''}
            </p>
            <p className="text-[11px] text-muted-foreground">
              {label(game.winner)} {game.comeback ? 'come from behind to beat' : 'beat'} {label(loser)}
            </p>
            {scene.featured && scene.hit !== null && (
              <span
                data-scene-hit={scene.hit ? 'yes' : 'no'}
                className={cn('cq-scene-rise mt-1.5 inline-block rounded-full px-3 py-1 text-xs font-bold', scene.hit ? 'bg-gold/15 text-gold' : 'bg-destructive/15 text-destructive')}
              >
                {scene.hit ? 'You called it. +25' : 'Missed the call'}
              </span>
            )}
          </div>
        )}
        {(cursor.beat === 'takeover' || cursor.beat === 'done') && (
          <p className="mt-2 text-center">
            {gained > 0 ? (
              <span data-scene-chip data-gain={gained} className="cq-scene-rise inline-block rounded-full bg-gold px-3 py-1 text-xs font-black text-[#111111]">
                +{gained} {regionNoun(sport, gained)} to {label(game.winner)}
              </span>
            ) : (
              <span data-scene-chip data-gain={0} className="inline-block text-[11px] text-muted-foreground">
                Nothing at stake: {label(loser)} held no land.
              </span>
            )}
          </p>
        )}
      </div>
      <button
        type="button"
        data-scene-skip
        onClick={onSkip}
        className="inline-flex min-h-[44px] w-full items-center justify-center rounded-full border border-border bg-background px-4 text-sm font-semibold text-foreground hover:bg-muted"
      >
        Skip to the results
      </button>
      <style>{`
        @keyframes cq-scene-in { 0% { opacity: 0; transform: translateX(24px); } 100% { opacity: 1; transform: none; } }
        .cq-scene-in { opacity: 0; animation: cq-scene-in ${SCENE_TIMINGS.card}ms cubic-bezier(0.2, 0.8, 0.2, 1) forwards; }
        @keyframes cq-scene-slam { 0% { opacity: 0; transform: scale(1.7); } 60% { opacity: 1; transform: scale(0.94); } 100% { opacity: 1; transform: scale(1); } }
        .cq-scene-slam { opacity: 0; animation: cq-scene-slam 0.4s cubic-bezier(0.2, 0.8, 0.3, 1.2) forwards; }
        @keyframes cq-scene-rise { 0% { opacity: 0; transform: translateY(6px); } 100% { opacity: 1; transform: none; } }
        .cq-scene-rise { opacity: 0; animation: cq-scene-rise 0.35s ease-out forwards; }
        @media (prefers-reduced-motion: reduce) {
          .cq-scene-in, .cq-scene-slam, .cq-scene-rise { animation: none; opacity: 1; transform: none; }
        }
      `}</style>
    </div>
  );
}

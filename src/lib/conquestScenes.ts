import type { ConquestRun } from './conquestRun';
import type { ImpGame, ImperialismSport } from './imperialismEngine';
import { UNCLAIMED_COLOR, type ConquestMapSport } from './conquestMapLook';

/**
 * Round 529: a settled round as the stage plays it, one game at a time.
 *
 * The engine settles a round in pairing order and mutates one owners map as
 * it goes, so ImpGame.flipped records exactly what each game moved given
 * everything before it. The scenes here replay that: scene 0 opens on the map
 * the round was played on, every scene applies its own game's flipped regions
 * to the winner, and the last scene closes on the map the engine produced.
 * Nothing is recomputed from strengths or rolls, so a scene can never show
 * land moving that did not move, and scripts/simConquestScenes.mjs holds the
 * last scene's map to run.history[roundIndex + 1] byte for byte.
 *
 * The wheel and the arrow are decoration over values the engine already
 * fixed: the wheel lands on the attacker the pairing named, the arrow points
 * from one empire to the other. A reload replays the same run (Round 476), so
 * neither can change anything.
 *
 * Siblings are imported with relative paths on purpose: the harness copies
 * this lib set to a temp directory and rewrites one file for a control.
 */

/** One game of a settled round as the stage plays it: the map before, the map after, what moved. */
export interface ConquestScene {
  index: number;
  game: ImpGame;
  before: Record<string, string>;
  after: Record<string, string>;
  /** game.flipped, copied. */
  flipped: string[];
  featured: boolean;
  /** The player's call, only on the featured scene, else null. */
  call: string | null;
  /** call === game.winner, only on the featured scene with a call, else null. */
  hit: boolean | null;
}

/** The games of run.rounds[roundIndex] in ENGINE order. before is history[roundIndex] for scene 0 and the previous scene's after otherwise; after is a copy of before with every flipped region set to game.winner. Returns [] when roundIndex is out of range. */
export function buildScenes(
  run: ConquestRun,
  roundIndex: number,
  featured: [string, string] | null,
  call: string | null,
): ConquestScene[] {
  const round = run.rounds[roundIndex];
  const opening = run.history[roundIndex];
  if (!round || !opening) return [];
  const scenes: ConquestScene[] = [];
  let before = opening;
  round.games.forEach((game, index) => {
    const after = { ...before };
    for (const region of game.flipped) after[region] = game.winner;
    const isFeatured = !!featured && (
      (game.home === featured[0] && game.away === featured[1]) ||
      (game.home === featured[1] && game.away === featured[0])
    );
    scenes.push({
      index,
      game,
      before,
      after,
      flipped: [...game.flipped],
      featured: isFeatured,
      call: isFeatured ? call : null,
      hit: isFeatured && call !== null ? call === game.winner : null,
    });
    before = after;
  });
  return scenes;
}

/** The wheel: one wedge per team in the sport's team order, colour from the map spec (UNCLAIMED_COLOR when the map lacks the team), landing on the attacker. landingIndex is -1 when the attacker is not a team of the sport, and the wheel then renders nothing. */
export interface WheelSpec {
  wedges: { teamId: string; name: string; color: string }[];
  landingIndex: number;
}

export function wheelSpec(sport: ImperialismSport, map: ConquestMapSport, attacker: string): WheelSpec {
  const colors = new Map(map.teams.map(t => [t.id, t.color]));
  const wedges = sport.teams.map(t => ({ teamId: t.id, name: t.name, color: colors.get(t.id) ?? UNCLAIMED_COLOR }));
  return { wedges, landingIndex: wedges.findIndex(w => w.teamId === attacker) };
}

/** Direction from one point to another in degrees on [0, 360): 0 points right, 90 points down (SVG y grows downward, so clockwise is positive). Equal points give 0. */
export function arrowAngle(from: { x: number; y: number }, to: { x: number; y: number }): number {
  const deg = (Math.atan2(to.y - from.y, to.x - from.x) * 180) / Math.PI;
  const wrapped = ((deg % 360) + 360) % 360;
  return wrapped === 360 ? 0 : wrapped;
}

/** Beat lengths in ms: card slides in, the fight (camera, pulse, arrow), the score slams in, the takeover wave. Total 3100 per scene that moves land. */
export const SCENE_TIMINGS = { card: 700, fight: 900, score: 600, takeover: 900 } as const;

/** card + fight + score, plus takeover only when the scene flipped something (a nothingAtStake game has no wave). */
export function sceneDurationMs(scene: ConquestScene): number {
  const base = SCENE_TIMINGS.card + SCENE_TIMINGS.fight + SCENE_TIMINGS.score;
  return scene.flipped.length > 0 ? base + SCENE_TIMINGS.takeover : base;
}

/** How long the wheel spins before the featured scene, and the direction arrow after it. Decorative: the landing is fixed before the spin starts. */
export const WHEEL_SPIN_MS = 1600;

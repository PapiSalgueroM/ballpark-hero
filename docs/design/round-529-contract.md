# Round 529 contract: shared signatures for the scene work

Written 2026-09-11 by the wave 1 architect from `docs/design/round-529-conquest-scenes.md` and a
read of the code it names. Every signature below is exact. Builders implement these and nothing
else in the shared surface; a change to a signature here is a change to this file first.

## What already exists, quoted so nobody re-derives it

`src/lib/imperialismEngine.ts`
- `export interface ImpGame { home: string; away: string; winner: string; homeScore: number; awayScore: number; swing: number; flipped: string[]; nothingAtStake: boolean; comeback: boolean; overtime: boolean }`
- `export interface ImpRoundResult { round: number; label: string; games: ImpGame[]; headlines: string[] }`
- `export function resolveGame(sport, home, away, owners, rng, records?): ImpGame` mutates `owners` in pairing order; `flipped` is the loser's whole empire at kickoff.
- `export function empireCounts(sport: ImperialismSport, owners: Record<string, string>): Map<string, number>`
- `export function statesOf(owners: Record<string, string>, teamId: string): string[]`
- `export function teamLabel(sport: ImperialismSport, teamId: string): string`
- `export function regionNoun(sport: ImperialismSport, n: number): string`
- `export function totalConquest(owners: Record<string, string>): string | null`

`src/lib/conquestRun.ts`
- `export interface ConquestRun { favorite; owners; records; round; bracket; pairings; lastRound; champion; madePlayoffs; picks; hits; phase }`
- `export function startRun(sport: ImperialismSport, favorite: string, rng: () => number): ConquestRun`
- `export function playRound(sport: ImperialismSport, run: ConquestRun, call: string, rng: () => number): ConquestRun`
- `export function continueRun(sport: ImperialismSport, run: ConquestRun, rng: () => number): ConquestRun`
- `export function replayRun(sport, favorite, picks, rng): ConquestRun` (startRun, then continueRun and playRound per call)
- `export function dailyRunRecord(run: ConquestRun): ConquestDailyRun` returns `{ team: run.favorite, picks: run.picks, done: false, result: null }`
- `export function featuredPairing(sport, run): [string, string] | null`

`src/lib/conquestMapLook.ts`
- `export interface ConquestMapTeam { id; name; city?; color; secondaryColor? }`, `export interface ConquestMapSport { key; regions; adjacency; teams; viewBox; regionNoun; labelScale? }`
- `export interface TeamLook { teamId; color; kind; accent; ink: '#111111' | '#ffffff' }`, `export const UNCLAIMED_COLOR = '#2a3040'`
- `export function labelFor(team: ConquestMapTeam, fontSize: number, availableWidth: number): string`
- `export function diffOwners(prev, next): Record<string, string | null>`

`src/lib/conquestMapGeometry.ts`: `export function pathBoundingBox(d: string): { minX; minY; maxX; maxY }`

`src/components/conquest/ConquestRegionMap.tsx`
- `export interface ConquestRegionMapProps { sport: ConquestMapSport; owners: Record<string, string | null>; battle?: ConquestBattleView | null; takeover?: ConquestTakeover | null; powerupStates?: Set<string>; invincibleTeams?: Set<string>; territoryStolenState?: string | null; showLegend?: boolean }`
- `export interface ConquestBattleView { attacker: string | null; defender: string | null; stage: 'pending' | 'live' | 'resolved'; winner?: string | null; targetRegion?: string | null }`
- `export interface ConquestTakeover { key: number; from: Record<string, string | null> }`
- Layers in render order, all direct children of the `<svg>` after `<defs>`: 1 fill (`data-layer="fill"`), 2 takeover, 3 edge, 4 role, 5 hit targets, 6 power-up text, 7 labels (`data-label-team`), 8 arrow (`data-layer="arrow"`), 9 result (`data-layer="result"`).

Sport specs: `NFL_IMPERIALISM`, `NBA_IMPERIALISM`, `MLB_IMPERIALISM`, `NHL_IMPERIALISM` in `src/data/conquestSports.ts`; `SOCCER_IMPERIALISM`, `SOCCER_CONQUEST_MAP` in `src/data/soccerConquest.ts`; the four US `*_CONQUEST_MAP` specs in `src/data/conquestData*.ts`.

## A. `src/lib/conquestRun.ts` additions (pure, no React)

Two new fields on `ConquestRun`, appended after `phase`:

```ts
  /** The owners map after every settled round. history[0] is the opening map. Each entry is its own object. */
  history: Record<string, string>[];
  /** Every settled round in order, regular then playoff. rounds[i] was played on history[i] and produced history[i + 1]. */
  rounds: ImpRoundResult[];
```

Invariant at every phase: `history.length === rounds.length + 1 === picks.length + 1`.

Where they are set, and nowhere else:
- `startRun`: compute `const owners = seedEmpires(sport);` before the return, then return `owners`, `history: [{ ...owners }]`, `rounds: []`. Do not call `seedEmpires` twice.
- `playRound`: in the returned object add `history: [...run.history, { ...owners }]` and `rounds: [...run.rounds, lastRound]`, where `owners` and `lastRound` are the locals the function already builds. Nothing else in the function moves; the rng order is untouched.
- `continueRun`: untouched. Its two spreads carry both fields forward.
- `replayRun`: untouched. Because it goes through `startRun` and `playRound`, a replayed run carries the same `history` and `rounds` as the live one, and `restoreDailyRun` rebuilds them on reload without saving anything new.
- `dailyRunRecord`: untouched. It reads `favorite` and `picks` only, so the saved record is byte identical to Round 476's.

Season records:

```ts
/** One of the four end of season records the web map's format shows. */
export interface SeasonRecord {
  key: 'landGrab' | 'reign' | 'conquered' | 'collapse';
  /** 'Biggest Land Grab', 'Longest Reign', 'Most Conquered', 'Biggest Collapse'. */
  title: string;
  teamId: string | null;
  value: number;
  /** Names the team and the round label, e.g. "Chiefs took 9 states from the Broncos, Week 4". Empty when teamId is null. */
  detail: string;
}
/** The four records, always in the order landGrab, reign, conquered, collapse, computed from run.rounds and run.history only. */
export function seasonRecords(sport: ImperialismSport, run: ConquestRun): SeasonRecord[];
```

Definitions, each returning `teamId: null, value: 0, detail: ''` when nothing qualifies:
- `landGrab`: over every game of every round in order, the game with the largest `swing`; ties go to the earliest game. `teamId` is the winner, `value` the swing, detail names the winner, the loser and `rounds[i].label`. Implementation shape is fixed so the harness control has a line to rewrite: build `const grabs = games.filter(x => x.game.swing > 0).sort((a, b) => b.game.swing - a.game.swing || a.order - b.order);` over `{ game, order, label }` entries then `const top = grabs[0];`.
- `reign`: for each settled round i (1 to rounds.length) the largest empire in `history[i]` by `empireCounts`; a round with a tie for largest counts for nobody. The record is the longest run of consecutive rounds held by one team; ties on length go to the run that started first. `value` is the run length, detail names the team and the labels of the first and last rounds of the run ("from Week 3 to Week 9", or the one label when the run is one round).
- `conquered`: a team is wiped in round i when `statesOf(history[i - 1], t).length > 0` and `statesOf(history[i], t).length === 0`. The record is the team wiped most often; ties go to the team whose first wipe came earliest, then sport team order. `value` is the count, detail names the team, the count and the label of the last wipe.
- `collapse`: over every wipe as defined above, the largest `statesOf(history[i - 1], t).length`; ties go to the earliest round, then sport team order. `teamId` is the wiped team, `value` the empire it held before the round, detail names the team, the size and the round label. This is the same number as that game's swing by construction (every team plays once per round); it is credited to the loser and computed from `history`, which is what makes section 4 an independent recomputation.

## B. New `src/lib/conquestScenes.ts` (pure)

Imports its siblings with RELATIVE paths (`./conquestRun`, `./imperialismEngine`, `./conquestMapLook`) so the harness can copy the lib set to a temp directory and rewrite one file.

```ts
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
export function buildScenes(run: ConquestRun, roundIndex: number, featured: [string, string] | null, call: string | null): ConquestScene[];
```

Fixed lines inside `buildScenes`, so the controls have something to rewrite: the scene literal carries the line `      game,` and the function ends with `  return scenes;`. The last scene's `after` deep equals `run.history[roundIndex + 1]`; section 3 holds it.

```ts
/** The wheel: one wedge per team in the sport's team order, colour from the map spec (UNCLAIMED_COLOR when the map lacks the team), landing on the attacker. landingIndex is -1 when the attacker is not a team of the sport, and the wheel then renders nothing. */
export interface WheelSpec { wedges: { teamId: string; name: string; color: string }[]; landingIndex: number }
export function wheelSpec(sport: ImperialismSport, map: ConquestMapSport, attacker: string): WheelSpec;
/** Direction from one point to another in degrees on [0, 360): 0 points right, 90 points down (SVG y grows downward, so clockwise is positive). Equal points give 0. */
export function arrowAngle(from: { x: number; y: number }, to: { x: number; y: number }): number;
/** Beat lengths in ms: card slides in, the fight (camera, pulse, arrow), the score slams in, the takeover wave. Total 3100 per scene that moves land. */
export const SCENE_TIMINGS = { card: 700, fight: 900, score: 600, takeover: 900 } as const;
/** card + fight + score, plus takeover only when the scene flipped something (a nothingAtStake game has no wave). */
export function sceneDurationMs(scene: ConquestScene): number;
/** How long the wheel spins before the featured scene, and the direction arrow after it. Decorative: the landing is fixed before the spin starts. */
export const WHEEL_SPIN_MS = 1600;
```

## C. `ConquestRegionMapProps` additions (all optional; omitted means today's markup, byte for byte)

```ts
  /** The camera. undefined: no camera group at all (today's markup). null: the group is drawn with no transform. An array: zoom to those regions. */
  focusRegions?: string[] | null;
  /** teamId to its home region id: a ring at that region's label point, the "stadium dot". */
  homeRegions?: Record<string, string>;
  /** That team's regions get brightness 1.25 and a white ring. */
  highlightTeam?: string | null;
  /** 'caps' renders every empire label in uppercase, letter spaced, with a floor on the size. Default 'classic'. */
  labelStyle?: 'classic' | 'caps';
  /** 'stage' drops the rounded border and lets the svg fill its container. Default 'card'. */
  size?: 'card' | 'stage';
```

Rendering rules:
- Camera: when `focusRegions !== undefined`, layers 1 to 9 (the hit targets included, so hovers stay aligned) render inside one `<g data-layer="camera" className="cq-camera">`; `<defs>` stays outside. With an array, take the union of `pathBoundingBox(region.path)` over the named regions (unknown ids ignored, an empty union means no transform), pad each side by 8 percent of the box's own width and height, then `scale = Math.min(viewBox.width / paddedW, viewBox.height / paddedH, 2.6)` and translate so the padded box centre lands on the viewBox centre. Emit `style={{ transform: 'translate(TXpx, TYpx) scale(S)', transition: 'transform 450ms ease-in-out' }}` and `data-camera-scale={S}` (S to three decimals). With null, `transform: 'none'` and `data-camera-scale="1"`. The rendered `<style>` carries `@media (prefers-reduced-motion: reduce) { .cq-camera { transform: none !important; transition: none; } }`.
- Home rings: after layer 3, `<circle data-layer="home" data-team data-region cx={labelX} cy={labelY} r={2.2} fill="none" stroke={look.ink} strokeWidth={0.8} />` per entry whose region exists. Unknown teams take `#ffffff`.
- Highlight: the fill path of every region owned by `highlightTeam` gets `filter: brightness(1.25)` (a stolen region keeps its own filter); after layer 4 a `<path data-layer="highlight" data-team fill="none" stroke="#ffffff" strokeWidth={1.6} strokeLinejoin="round" />` per region.
- Caps: the label text is `text.toUpperCase()`, `letterSpacing="0.06em"`, `fontSize = Math.max(fontSize, 5.5)` before the phone scale, and the svg carries `data-label-style="caps"`. Fit test: `labelFor` gains a fourth parameter `caps = false` that multiplies the estimated width by `CAPS_WIDTH_FACTOR = 1.15` (new export beside `PHONE_LABEL_SCALE`), so a name that only fits in lowercase falls back to the code.
- Stage: svg className `w-full h-auto bg-[#0a0f1a]` (no `rounded-xl border border-border`) plus `data-size="stage"`; the wrapping div is unchanged. Card is today's class string with no data attribute.
- Nothing above adds an attribute, a group or a style rule when its prop is absent. `simConquestMap` keeps passing unchanged.

## D. Wave 2 component signatures (files under `src/components/conquest/`)

```ts
// ConquestScenePlayer.tsx
export type SceneBeat = 'card' | 'fight' | 'score' | 'takeover' | 'done';
/** What the board hands the map for the current frame; the board renders ConquestRegionMap, the player never does. */
export interface SceneFrame { owners: Record<string, string>; battle: ConquestBattleView | null; takeover: ConquestTakeover | null; focusRegions: string[] | null; highlightTeam: string | null }
export interface SceneCursor { index: number; beat: SceneBeat }
export interface UseScenePlayerOptions { reducedMotion?: boolean; initialCursor?: SceneCursor; onDone?: () => void }
/** Steps through the scenes on SCENE_TIMINGS; reduced motion jumps every scene to its final frame. skip() lands on the last scene's final frame and fires onDone once. */
export function useScenePlayer(scenes: ConquestScene[], map: ConquestMapSport, options?: UseScenePlayerOptions): { cursor: SceneCursor; scene: ConquestScene | null; frame: SceneFrame; playing: boolean; play: () => void; skip: () => void };
export interface ConquestScenePlayerProps { sport: ImperialismSport; map: ConquestMapSport; scenes: ConquestScene[]; cursor: SceneCursor; records: ImpRecords; favorite: string; wheel: WheelSpec | null; arrowDeg: number | null; onSkip: () => void }
/** The matchup card (data-scene-card, data-scene-index), the score (data-scene-score, mounted only at beats score and takeover, text "H to A, FINAL"), the call and hit chip on the featured scene, and the Skip button. */
export default function ConquestScenePlayer(props: ConquestScenePlayerProps): JSX.Element;

// ConquestWheel.tsx
export interface ConquestWheelProps { spec: WheelSpec; spinning: boolean; arrowDeg: number | null; durationMs?: number; reducedMotion?: boolean; onLanded?: () => void }
/** A ring of colour wedges with names (data-wheel, one data-wedge per team, data-landing="yes" on spec.landingIndex) and a compass needle (data-wheel-arrow, data-angle) that settles on arrowDeg after the wheel lands. Colour and text only, never a logo. Renders null when landingIndex is -1. */
export default function ConquestWheel(props: ConquestWheelProps): JSX.Element | null;

// ConquestTimeline.tsx
export interface ConquestTimelineProps { labels: string[]; index: number; onChange: (index: number) => void; disabled?: boolean }
/** A range input (data-timeline, 30px thumb) from labels[0] "Start" to the last settled round; index i shows run.history[i]. */
export default function ConquestTimeline(props: ConquestTimelineProps): JSX.Element;

// ConquestStandingsStrip.tsx
export interface ConquestStandingsStripProps { sport: ImperialismSport; map: ConquestMapSport; owners: Record<string, string>; records: ImpRecords; favorite: string | null; highlightTeam: string | null; onHighlight: (teamId: string | null) => void; compact?: boolean }
/** Teams Remaining: ranked chips (data-standings, data-team, data-count) with a territory bar, the favourite pinned first, "N of T hold land, M wiped out" on the right, top eight plus "+N more" when compact. */
export default function ConquestStandingsStrip(props: ConquestStandingsStripProps): JSX.Element;

// ImperialismHowToPlay.tsx
export interface ImperialismHowToPlayProps { open: boolean; onOpenChange: (open: boolean) => void; sport: ImperialismSport; game: ImperialismGameSpec }
/** The imperialism mode's own How to Play in the shape of ConquestHowToPlay (Dialog, open, onOpenChange): the rules, the wheel, what a takeover means, a worked round, sport nouns from the spec. */
export function ImperialismHowToPlay(props: ImperialismHowToPlayProps): JSX.Element;
```

The board's done screen renders `seasonRecords(sport, run)` as four rows carrying `data-record={key}`, `data-team`, `data-value`.

## E. `scripts/simConquestScenes.mjs`

Style: the two existing harnesses. Copy `conquestRun.ts`, `conquestDaily.ts`, `imperialismEngine.ts`, `conquestMomentum.ts`, `conquestMapLook.ts` and `conquestScenes.ts` to a temp directory so a control can rewrite one; esbuild the copies plus the real `ConquestRegionMap.tsx` (wave 1) and the wave 2 components with `--alias:@=src`, jsx automatic, react-dom/server through a MemoryRouter. Seeded runs: for every one of the five sports, `dailyConquestRng(sport.key, '2026-09-12')` with a mixed caller (right every third call), played through `startRun`, `playRound`, `continueRun` to `phase === 'done'`, exactly as `simConquestDaily.playDaily` does. Every count is printed; every section floors its sample so a run that measured nothing cannot pass.

Wave 1 (pure libs and the renderer):
1. Scene list. For every settled round of every run, `buildScenes` returns exactly `rounds[i].games.length` scenes whose `game` objects are the engine's, in engine order (compare home, away, winner and index). `buildScenes(run, rounds.length, ...)` returns []. Featured marks exactly one scene, in either orientation, and only it carries `call` and `hit`; `hit` equals `call === game.winner`.
2. Scores. Every scene's `game.homeScore` and `game.awayScore` equal the engine's for that game, `sceneDurationMs` equals the four beats summed with the takeover dropped on scenes with an empty `flipped`, and `SCENE_TIMINGS` sums to 3100.
3. Takeover. For every scene, `scene.flipped` equals `game.flipped`; `diffOwners(scene.before, scene.after)` names exactly those regions with the loser as the old owner; applying the scenes in order reproduces `history[i + 1]` deep equal; and the real renderer given `owners: scene.after` and `takeover: { key, from: diffOwners(before, after) }` draws `data-layer="takeover"` groups naming exactly `scene.flipped`. Fewer than 300 scenes with land moving across the five sports is a failure.
4. Records. `seasonRecords` for every finished run equals an independent recomputation written in the harness from `history` and `rounds` (its own loops, not the lib's), for all four keys, including the null case on a run with zero settled rounds. The four titles and the fixed order are asserted.
5. Timeline. `history.length === rounds.length + 1`, `history[0]` deep equals `sport.seed()`, the last entry deep equals `run.owners`, no two entries are the same object, `replayRun(sport, favorite, run.picks, freshRng)` reproduces `history` and `rounds` deep equal, and `JSON.stringify(dailyRunRecord(run))` equals `JSON.stringify({ team: run.favorite, picks: run.picks, done: false, result: null })`.
6. Wheel, arrow and camera. For every settled round with a featured pairing, `wheelSpec(sport, map, featured[0]).wedges` is the sport's team order with `landingIndex` at the attacker; `arrowAngle` over the four compass cases returns 0, 90, 180, 270 and lands in [0, 360) on 200 random pairs; rendering the map with `focusRegions` set to the two empires' regions yields one `data-layer="camera"` group with a transform, `data-camera-scale` at most 2.6 and at least 1; `homeRegions` yields one `data-layer="home"` circle per team with a drawn region; `highlightTeam` rings exactly that team's regions; `labelStyle: 'caps'` renders every label as its uppercase and no label under 5.5 units; `size: 'stage'` drops the border classes; and the render with none of the five props is byte identical to today's (the harness compares against a render taken before the props are touched, i.e. with all five omitted, the markup must contain no camera, home or highlight layer and no data-size or data-label-style attribute).

Wave 2 (components):
7. Reduced motion and the score element. `useScenePlayer` with `initialCursor` at each beat: the rendered player mounts `data-scene-score` only at beats score and takeover, with text equal to the engine's score; with `reducedMotion: true` the cursor after `play()` is the last scene at beat done; the rendered style of the map under reduced motion carries the `.cq-camera { transform: none` rule and every `.cq-*` animation is stilled, and the timeline and the strip render one chip per team with the favourite first.
8. Source scan. In `src/components/conquest`, comments stripped first, `data-scene-card`, `data-wheel` and `data-timeline` appear only in `ConquestScenePlayer.tsx`, `ConquestWheel.tsx` and `ConquestTimeline.tsx` respectively; `ImperialismBoardShared.tsx` imports all five new components and `seasonRecords`; no other file draws a scene, a wheel or a timeline.

Negative controls (`SCENE_CONTROL=...`), each rewriting the temp copy of `conquestScenes.ts` or `conquestRun.ts` and refusing to run if the needle is missing or the rewrite changed nothing, and each expected to turn exactly its section red:
- `extra`: `  return scenes;` becomes `  return scenes.concat({ ...scenes[0], index: scenes.length, game: { ...scenes[0].game, home: scenes[0].game.away, away: scenes[0].game.home } });` (a scene for a game the engine did not play). Section 1 must go red.
- `fakescore`: `      game,` becomes `      game: { ...game, homeScore: game.homeScore + 1 },`. Section 2 must go red.
- `records`: `const top = grabs[0];` becomes `const top = grabs[1] ?? grabs[0];`. Section 4 must go red.

A control run exits 0 only when its section failed and prints which sections fired, as `simConquestDaily` does.

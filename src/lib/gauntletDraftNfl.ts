import { FO_TEAMS } from '@/data/frontOfficePlayers';
import { GauntletConfig, FormationLike } from '@/lib/gauntletEngine';

/**
 * Gauntlet Draft: NFL (Round 520, the second of the two follow-up sports the
 * owner's "a draft mode game per sport" backlog row asked for; see
 * src/lib/gauntletEngine.ts for the shared mechanism).
 *
 * SCOPE, DECIDED HONESTLY RATHER THAN FORCED TO ELEVEN. src/data/frontOfficePlayers.ts
 * (the real, generated 2026 roster data NFL Front Office already plays,
 * see that file's own header for the generation rules) carries eight
 * position families: QB, RB, WR, TE, OL, DL, LB, DB. Measured on that data
 * (Round 1130, 2026-10-08, when the file began to carry the one opening
 * estimate every game prints): quarterbacks run 65 to 93, running backs and
 * receivers 63 to 95, tight ends 70 to 95, the same order of spread
 * soccer's pool offers a slot. Those four are the positions the estimate
 * reads on how well a man played, how much of the work he carried and what
 * he produced a game off two publishers. The other four families carry the
 * frozen checkpoint's estimate alone, and the data files mark most of them
 * as limited evidence (every lineman and every linebacker), and for OL
 * specifically that shows up as a visibly narrower band too (74 to 83, nine
 * points wide against the skill positions' twenty five and more); DL, LB
 * and DB measure a spread close to the skill positions' own (roughly 66 to
 * 95), so the real reason those four sit out is the thin evidence itself,
 * not a universally narrow band. A gauntlet pick that is not a real choice
 * is the exact failure mode CLAUDE.md's sim rules warn against ("never
 * assert on a max", "measure the strongest signal"), so this draft is
 * scoped to the four skill positions only: one quarterback, two running
 * backs, three receivers, one tight end, seven slots, not eleven. Extending
 * it to the other four families needs ratings built on sturdier evidence
 * first (the defence is the next part of Round 1130); today's OL field is also only the
 * top two linemen a team, not a full five man front. Future scope, noted in
 * the round report rather than faked here.
 */

export interface NflGauntletPlayer {
  name: string;
  pos: 'QB' | 'RB' | 'WR' | 'TE';
  ovr: number;
  team: string;
}

const SKILL_POS = new Set<string>(['QB', 'RB', 'WR', 'TE']);

/** Flattened straight off FO_TEAMS: every skill position player on every
 *  2026 roster, real name, real generated rating, nothing invented. */
export const NFL_GAUNTLET_POOL: NflGauntletPlayer[] = FO_TEAMS.flatMap(team =>
  team.players
    .filter(p => SKILL_POS.has(p.pos))
    .map(p => ({ name: p.name, pos: p.pos as NflGauntletPlayer['pos'], ovr: p.ovr, team: `${team.city} ${team.name}` })),
);

const NFL_FORMATION: FormationLike = {
  name: 'Starting Offense',
  slots: [
    { label: 'QB', allowed: ['QB'] },
    { label: 'RB', allowed: ['RB'] },
    { label: 'RB', allowed: ['RB'] },
    { label: 'WR', allowed: ['WR'] },
    { label: 'WR', allowed: ['WR'] },
    { label: 'WR', allowed: ['WR'] },
    { label: 'TE', allowed: ['TE'] },
  ],
};

/* Tuned against measured draft distributions (scripts/simGauntletEngine.mjs
   section 4 prints the real numbers over 300 seeded drafts). Re-measured in
   Round 1130 (2026-10-08, five seed streams of 300 drafts), when the pool
   began to carry the one opening estimate instead of the selection rule's
   rank scale: an always-best-card seven off this pool averages a squad
   rating around 93 (it was 96), an always-worst-card seven around 71 (it
   was 69). That 22 point gap is still wider than soccer's (roughly 14 to 17
   between its own best and worst XIs), because a skill-position-only NFL
   pool spans 63 to 95 across its four positions instead of averaging across
   eleven slots of mixed spread, so the worst-card squad is a genuinely weak
   seven rather than a merely below-average one. The ladder moved with the
   pool, by the same method and to the same target (it was 78, 85, 90, 95,
   99, and on the new numbers that ladder let the best seven lift the trophy
   in only 5 to 14 runs of 300): against this one the best seven clears
   3.34 to 3.40 rounds and lifts the trophy in 26 to 36 runs of 300, about 1
   run in 9 or 10 (before the pool moved: 3.30 to 3.44 and 28 to 38), the
   worst seven clears under 0.05 rounds and effectively never wins a single
   match, let alone the cup. */
export const NFL_GAUNTLET_ROUNDS = [
  { name: 'The Qualifier', opp: 'Ironbrook Marauders', rating: 79 },
  { name: 'The Last Sixteen', opp: 'Port Callahan Voyagers', rating: 83 },
  { name: 'The Quarter Final', opp: 'Westfall Miners', rating: 88 },
  { name: 'The Semi Final', opp: 'Cross Timber Wardens', rating: 92 },
  { name: 'The Final', opp: 'Sterling Vale Kings', rating: 97 },
] as const;

/* Round 520: distinct from soccer's 0x47445231 and the NBA gauntlet's
   0x4e424131 so all three never draw the same daily seed off the same ET
   date. 'NFL1' read as bytes. */
const NFL_DAILY_SALT = 0x4e464c31;

export const NFL_GAUNTLET_CONFIG: GauntletConfig<NflGauntletPlayer> = {
  gameId: 'nfl-gauntlet-draft',
  pool: NFL_GAUNTLET_POOL,
  nameOf: p => p.name,
  ratingOf: p => p.ovr,
  fitsSlot: (p, slot) => slot.allowed.includes(p.pos),
  formations: [NFL_FORMATION],
  rounds: NFL_GAUNTLET_ROUNDS,
  dailySeedSalt: NFL_DAILY_SALT,

  gameName: 'Gauntlet Draft: NFL',
  gamePath: '/nfl-gauntlet-draft',
  emoji: '⚔️',
  squadNoun: 'offense',
  slotsPhrase: 'starting offense slots (QB, two RB, three WR, TE)',
  /* Round 538: this said "overtime, then a shootout", and Round 522 then made
     the result label agree with it by calling an NFL result a shootout. The
     two agreeing was an improvement on them disagreeing, and both were wrong
     about the sport. Football has overtime and no shootout. */
  tiebreak: { phrase: 'overtime, and another if it is still level', won: 'Won in overtime', lost: 'Lost in overtime' },
  /* Round 826: the first overtime settling it is still overtime. */
  extraTime: { won: 'Won in overtime', lost: 'Lost in overtime' },
  subtitleOf: p => p.team,
  positionOf: p => p.pos,
  tierFloors: [93, 84, 75],
  /* Round 538: three plus seven a goal, so every match reads as a real NFL
     scoreline (3, 10, 17, 24, 31 ...) instead of the raw goal counts Round 520
     printed. Strictly increasing, so it cannot contradict who won. */
  scoreline: g => 3 + g * 7,
  /* A field goal. */
  tiebreakBump: 3,
};

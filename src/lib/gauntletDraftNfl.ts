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
 * (scripts/simGauntletEngine.mjs prints the numbers), the four skill
 * positions span a real 66 to 97 rating range each, the same order of
 * spread soccer's pool offers a slot. OL, DL, LB and LINEBACKER/DB by
 * contrast sit in a visibly narrower band (OL alone is 80 to 90, ten points
 * wide against the skill positions' thirty one), because the data file's
 * own header says defensive and line ratings lean on draft position and
 * years played rather than the counting stats the skill ratings are built
 * on. A gauntlet pick that is not a real choice is the exact failure mode
 * CLAUDE.md's sim rules warn against ("never assert on a max", "measure the
 * strongest signal"), so this draft is scoped to the four skill positions
 * only: one quarterback, two running backs, three receivers, one tight
 * end, seven slots, not eleven. Extending it to a genuine offensive line
 * read (today's OL field is only the top two linemen a team, not a full
 * five man front) is future scope, noted in the round report rather than
 * faked here.
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
   section 4 prints the real numbers over 500 seeded drafts): an
   always-best-card seven off this pool averages a squad rating around 96,
   an always-worst-card seven around 69. That 27 point gap is much wider
   than soccer's (roughly 14 to 17 between its own best and worst XIs),
   because a skill-position-only NFL pool spans a real 66 to 97 rating range
   at every one of the four positions instead of averaging across eleven
   slots of mixed spread, so the worst-card squad is a genuinely weak seven
   rather than a merely below-average one. Against this ladder the best
   seven clears about 3.4 rounds and lifts the trophy about 1 run in 9, the
   worst seven clears under 0.1 rounds and effectively never wins a single
   match, let alone the cup. */
export const NFL_GAUNTLET_ROUNDS = [
  { name: 'The Qualifier', opp: 'Ironbrook Marauders', rating: 78 },
  { name: 'The Last Sixteen', opp: 'Port Callahan Voyagers', rating: 85 },
  { name: 'The Quarter Final', opp: 'Westfall Miners', rating: 90 },
  { name: 'The Semi Final', opp: 'Cross Timber Wardens', rating: 95 },
  { name: 'The Final', opp: 'Sterling Vale Kings', rating: 99 },
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
};

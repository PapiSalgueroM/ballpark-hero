import { applyMomentum, type MomentumCtx } from './conquestMomentum';
import { SOCCER_CLUBS, SOCCER_CLUB_MAP, INITIAL_TERRITORIES_SOCCER } from '@/data/conquestDataSoccer';

/**
 * Soccer Imperialism engine (Round 358, the world map). Same canonical rules as
 * src/lib/imperialism.ts: winners annex the loser's entire empire, landless
 * clubs keep playing and can take it all back. Its own module so no sport can
 * regress another.
 *
 * THE SOCCER TWIST, and the reason this is not the hockey game reskinned.
 * Football draws. The NHL engine says "no ties, ever" and it is right to,
 * because hockey settles every game. Here a league-phase draw is a real result
 * and NOTHING MOVES: no territory changes hands, both clubs bank a point, and a
 * giant who cannot break down a minnow has genuinely wasted a matchday. That
 * makes a hard fixture worth fearing for a reason the other conquests do not
 * have, and it gives the player a third thing to predict.
 *
 * Knockouts cannot draw, for the same reason a cup tie cannot: the round has to
 * produce a winner. A knockout level with the draw band goes to extra time and
 * penalties and is labelled as such, so the drama is visible rather than hidden.
 *
 * The 32 clubs are one per country (see conquestDataSoccer.ts for why) and the
 * map is the whole world: 173 countries, every one owned at kickoff.
 */

export const SOCCER_REGULAR_ROUNDS = 16;
export const SOCCER_PLAYOFF_LABELS = ['Quarterfinals', 'Semifinals', 'World Final'];

/**
 * How often a league game ends level. Set to 0.12 either side of the win
 * probability, which lands near the ~25 percent of real league matches that
 * finish drawn, and less than that for lopsided ties because the band is
 * clipped at the ends. simConquestSoccer measures the realised rate rather
 * than trusting this comment.
 */
export const DRAW_BAND = 0.12;

export function seedSoccerEmpires(): Record<string, string> {
  return { ...INITIAL_TERRITORIES_SOCCER };
}

export interface SoccerImpGame {
  home: string;
  away: string;
  /** null when the league game finished level. */
  winner: string | null;
  homeGoals: number;
  awayGoals: number;
  swing: number;
  nothingAtStake: boolean;
  comeback: boolean;
  drawn: boolean;
  /** a knockout that needed spot kicks to separate them */
  penalties: boolean;
}

export interface SoccerImpRoundResult {
  round: number;
  label: string;
  games: SoccerImpGame[];
  headlines: string[];
}

export function soccerLandsOf(owners: Record<string, string>, clubId: string): string[] {
  return Object.keys(owners).filter(iso => owners[iso] === clubId);
}

export function soccerEmpireCounts(owners: Record<string, string>): Map<string, number> {
  const m = new Map<string, number>();
  for (const c of SOCCER_CLUBS) m.set(c.id, 0);
  for (const iso of Object.keys(owners)) {
    m.set(owners[iso], (m.get(owners[iso]) ?? 0) + 1);
  }
  return m;
}

export function soccerLandlessClubs(owners: Record<string, string>): string[] {
  const counts = soccerEmpireCounts(owners);
  return SOCCER_CLUBS.filter(c => (counts.get(c.id) ?? 0) === 0).map(c => c.id);
}

function overallOf(clubId: string): number {
  return SOCCER_CLUB_MAP.get(clubId)?.overall ?? 74;
}

export function soccerClubLabel(clubId: string): string {
  return SOCCER_CLUB_MAP.get(clubId)?.name ?? clubId;
}

export function soccerCountryLabel(clubId: string): string {
  return SOCCER_CLUB_MAP.get(clubId)?.country ?? '';
}

/** Home win probability: overall-gap logistic plus home advantage. */
export function soccerHomeWinProb(home: string, away: string, ctx?: MomentumCtx): number {
  const gap = overallOf(home) - overallOf(away) + 2;
  const base = 1 / (1 + Math.pow(10, -gap / 22));
  return applyMomentum(base, ctx);
}

/** Winner 1-5, beaten side 1-3 fewer. Football scorelines, not hockey ones. */
function soccerGoalPair(rng: () => number): [number, number] {
  const winner = 1 + Math.floor(rng() * 5); // 1-5
  const margin = 1 + Math.floor(rng() * Math.min(3, winner)); // 1-3, capped
  return [winner, Math.max(0, winner - margin)];
}

export function resolveSoccerGame(
  home: string,
  away: string,
  owners: Record<string, string>,
  rng: () => number = Math.random,
  records?: Record<string, { streak: number }>,
  knockout = false,
): SoccerImpGame {
  const ctx: MomentumCtx = {
    homeLand: soccerLandsOf(owners, home).length,
    awayLand: soccerLandsOf(owners, away).length,
    totalLand: Object.keys(owners).length,
    homeStreak: records?.[home]?.streak ?? 0,
    awayStreak: records?.[away]?.streak ?? 0,
  };
  const pHome = soccerHomeWinProb(home, away, ctx);
  const roll = rng();
  const tight = Math.abs(roll - pHome) < DRAW_BAND;

  // A league game this close ends level; a knockout goes to penalties instead.
  if (tight && !knockout) {
    const goals = Math.floor(rng() * 4); // 0-0 through 3-3
    return {
      home, away, winner: null, homeGoals: goals, awayGoals: goals,
      swing: 0, nothingAtStake: true, comeback: false, drawn: true, penalties: false,
    };
  }

  const winner = roll < pHome ? home : away;
  const loser = winner === home ? away : home;
  let [w, l] = soccerGoalPair(rng);
  if (tight) { l = w; } // level after extra time, settled from the spot
  const homeGoals = winner === home ? w : l;
  const awayGoals = winner === home ? l : w;

  const loserLands = soccerLandsOf(owners, loser);
  const winnerHadNothing = soccerLandsOf(owners, winner).length === 0;
  for (const iso of loserLands) owners[iso] = winner;

  return {
    home, away, winner, homeGoals, awayGoals,
    swing: loserLands.length,
    nothingAtStake: loserLands.length === 0,
    comeback: winnerHadNothing && loserLands.length > 0,
    drawn: false,
    penalties: tight && knockout,
  };
}

export function soccerRandomPairings(rng: () => number = Math.random): [string, string][] {
  const pool = SOCCER_CLUBS.map(c => c.id);
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  const pairs: [string, string][] = [];
  for (let i = 0; i + 1 < pool.length; i += 2) pairs.push([pool[i], pool[i + 1]]);
  return pairs;
}

export interface SoccerImpRecord { w: number; d: number; l: number; streak: number }
export type SoccerImpRecords = Record<string, SoccerImpRecord>;

export function soccerEmptyRecords(): SoccerImpRecords {
  const out: SoccerImpRecords = {};
  for (const c of SOCCER_CLUBS) out[c.id] = { w: 0, d: 0, l: 0, streak: 0 };
  return out;
}

/** Three for a win, one for a draw, the way a table is actually kept. */
export function soccerPoints(r?: SoccerImpRecord): number {
  return r ? r.w * 3 + r.d : 0;
}

/** Pure: returns a NEW records object with the round's results applied. */
export function soccerApplyRecords(records: SoccerImpRecords, games: SoccerImpGame[]): SoccerImpRecords {
  const next: SoccerImpRecords = {};
  for (const id of Object.keys(records)) next[id] = { ...records[id] };
  const ensure = (id: string) => (next[id] ??= { w: 0, d: 0, l: 0, streak: 0 });
  for (const g of games) {
    if (g.drawn) {
      for (const id of [g.home, g.away]) {
        const r = ensure(id);
        r.d += 1;
        r.streak = 0; // a draw ends a run, in both directions
      }
      continue;
    }
    const loser = g.winner === g.home ? g.away : g.home;
    const w = ensure(g.winner!);
    const l = ensure(loser);
    w.w += 1;
    w.streak = w.streak >= 0 ? w.streak + 1 : 1;
    l.l += 1;
    l.streak = l.streak <= 0 ? l.streak - 1 : -1;
  }
  return next;
}

export function soccerRecordLabel(r?: SoccerImpRecord): string {
  return r ? `${r.w}-${r.d}-${r.l}` : '0-0-0';
}

export function soccerBuildHeadlines(
  games: SoccerImpGame[],
  owners: Record<string, string>,
  records?: SoccerImpRecords,
): string[] {
  const out: string[] = [];
  const comebacks = games.filter(g => g.comeback).sort((a, b) => b.swing - a.swing);
  for (const g of comebacks.slice(0, 2)) {
    out.push(`🔥 ${soccerClubLabel(g.winner!)} kicked off with nothing and just took ${g.swing} countr${g.swing === 1 ? 'y' : 'ies'}!`);
  }
  const big = games.filter(g => !g.comeback && g.swing >= 8).sort((a, b) => b.swing - a.swing);
  for (const g of big.slice(0, 2)) {
    const loser = g.winner === g.home ? g.away : g.home;
    out.push(`💥 ${soccerClubLabel(g.winner!)} wipe ${soccerClubLabel(loser)} off the map and take ${g.swing} countries.`);
  }
  // The draw is this game's own drama: a giant held is a giant who lost a matchday.
  const heldGiant = games
    .filter(g => g.drawn)
    .map(g => {
      const gap = Math.abs(overallOf(g.home) - overallOf(g.away));
      const fav = overallOf(g.home) >= overallOf(g.away) ? g.home : g.away;
      const dog = fav === g.home ? g.away : g.home;
      return { g, gap, fav, dog };
    })
    .sort((a, b) => b.gap - a.gap)[0];
  if (heldGiant && heldGiant.gap >= 8) {
    out.push(`🧱 ${soccerClubLabel(heldGiant.dog)} hold ${soccerClubLabel(heldGiant.fav)} to ${heldGiant.g.homeGoals}-${heldGiant.g.awayGoals}. Not a border moves.`);
  }
  const counts = soccerEmpireCounts(owners);
  let leader = SOCCER_CLUBS[0].id;
  let max = -1;
  for (const [c, n] of counts) if (n > max) { max = n; leader = c; }
  const total = Object.keys(owners).length;
  if (max >= total * 0.5) out.push(`👑 ${soccerClubLabel(leader)} now hold ${max} of ${total} countries. The map is turning one colour.`);
  if (records) {
    const hot = Object.entries(records).sort((a, b) => b[1].streak - a[1].streak)[0];
    if (hot && hot[1].streak >= 4) out.push(`📈 ${soccerClubLabel(hot[0])} have won ${hot[1].streak} straight.`);
    const cold = Object.entries(records).sort((a, b) => a[1].streak - b[1].streak)[0];
    if (cold && cold[1].streak <= -4) out.push(`📉 ${soccerClubLabel(cold[0])} have lost ${-cold[1].streak} in a row.`);
  }
  const draws = games.filter(g => g.drawn).length;
  if (out.length === 0) {
    out.push(draws >= 5
      ? `😴 ${draws} of the ${games.length} ties finished level. Barely a border moved all matchday.`
      : '🌍 A quiet matchday: no empire moved in a big way.');
  }
  return out;
}

export function soccerPlayoffSeeds(owners: Record<string, string>, records?: SoccerImpRecords): string[] {
  const counts = soccerEmpireCounts(owners);
  return SOCCER_CLUBS
    .map(c => c.id)
    .sort((a, b) =>
      (counts.get(b)! - counts.get(a)!) ||
      (soccerPoints(records?.[b]) - soccerPoints(records?.[a])) ||
      (overallOf(b) - overallOf(a)) ||
      a.localeCompare(b))
    .slice(0, 8);
}

export function soccerTotalConquest(owners: Record<string, string>): string | null {
  const isos = Object.keys(owners);
  const first = owners[isos[0]];
  return isos.every(iso => owners[iso] === first) ? first : null;
}

export function soccerFinalScore(
  favorite: string,
  owners: Record<string, string>,
  predictionHits: number,
  champion: string | null,
  madePlayoffs: boolean,
): number {
  const mine = soccerLandsOf(owners, favorite).length;
  return mine + predictionHits * 25 + (champion === favorite ? 200 : 0) + (madePlayoffs ? 50 : 0);
}

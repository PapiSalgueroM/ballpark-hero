/**
 * Round 908: the NBA front office, as the re-sign desk sees it. The engine is
 * imported and never edited. Its tax and its aprons are untouched and still
 * bill whatever payroll the desk leaves behind.
 */
import {
  NBA_ROSTER_MAX, NBA_ROSTER_MIN, nbaMinContract, nbaNextCap, nbaOffseason, nbaSalaryFor,
  type NbaGmPlayer, type NbaLeague, type NbaOffseasonOptions,
} from '@/lib/nbaFrontOffice';
import { type CutLedger, type DeadCapEntry, cutPlayer, deadCapUsed, rollDeadCap } from '@/lib/frontOfficeCuts';
import { nbaReconcileRotation } from '@/lib/nbaRotation';
import type { GmContractHost, GmSheetArrival } from '@/lib/gmContracts';

/** An arrival on a sheet as he stood before the summer: his club, himself, the club's roster order and its ledger. */
interface HeldArrival { club: string; man: NbaGmPlayer; order: string[]; dead: DeadCapEntry[] }

/**
 * Round 1556: the engine's summer, with every man who let a rival's offer
 * sheet stand kept at the club that tabled it ("Let a sheet go and he joins
 * that club on its terms", the desk's rules card). The desk puts him there
 * just before the summer, and the draft may have filled that club since, so
 * the engine's summer (Round 722) waives it down to fifteen by its lowest
 * rated man and the pool keeps its best 30 only. On about one stream in
 * twenty that man was he, and he left the league (Round 1540, item 7).
 *
 * The engine is not edited and runs exactly as it always has. Afterwards, for
 * an arrival the waiver took, his club passes over him the way the waiver
 * would have: he is back where he stood, on his sheet's terms, his line
 * leaves the pool and his dead money leaves the club's ledger, and the club
 * makes room by its own rule instead, waiving its lowest rated other man
 * through the shared cut, with that dead money rolled as the summer rolls
 * every ledger. The man waived in his place goes into the pool on the
 * summer's free agent terms and stays there: nobody leaves the league for
 * this. A summer whose waiver passed over every arrival (nearly every one) is
 * the engine's exactly: nothing here draws a number or writes to the league.
 */
export function nbaSummerKeepingSheets(
  league: NbaLeague, rng: () => number, team: string, arrivals?: readonly GmSheetArrival[], opts?: NbaOffseasonOptions,
): string[] {
  const held: HeldArrival[] = (arrivals ?? []).flatMap(a => {
    const club = a.club === team ? undefined : league.teams[a.club];
    const man = club?.players.find(p => p.id === a.id);
    return club && man ? [{ club: a.club, man, order: club.players.map(p => p.id), dead: [...(club.deadCap ?? [])] }] : [];
  });
  const notes = nbaOffseason(league, rng, team, opts);
  const kept = new Set(held.map(h => h.man.id));
  for (const h of held) handBack(league, h, notes, kept);
  return notes;
}

function handBack(league: NbaLeague, h: HeldArrival, notes: readonly string[], kept: ReadonlySet<string>): void {
  const club = league.teams[h.club];
  if (club.players.some(p => p.id === h.man.id)) return;
  /* The summer's own way out: he retired. */
  if (notes.some(n => n.endsWith(`${h.man.name} retires.`))) return;
  /* The waiver took him. His line comes out of the pool, if the pool kept it. */
  const line = league.freeAgents.findIndex(p => p.id === h.man.id);
  if (line >= 0) league.freeAgents.splice(line, 1);
  /* His dead money comes off the club's ledger: a summer's cut sits behind every
     entry the club carried into the summer that outlived its roll. */
  const carriedIn: CutLedger = { deadCap: h.dead, releasedThisSeason: [] };
  rollDeadCap(carriedIn);
  const carried = carriedIn.deadCap?.length ?? 0;
  club.deadCap = (club.deadCap ?? []).filter((d, i) => i < carried || d.playerId !== h.man.id);
  /* Back where he stood. The engine already aged him and took this season off
     his deal before it waived him, so he is on his sheet's terms. */
  const rank = (id: string) => h.order.indexOf(id);
  const at = club.players.findIndex(p => rank(p.id) > rank(h.man.id));
  club.players.splice(at < 0 ? club.players.length : at, 0, h.man);
  /* The club makes room by its own rule (Round 722): its lowest rated man who
     did not arrive on a sheet goes, through the shared cut and before his dead
     money rolls, so the summer still ends with a clean release list. */
  while (club.players.length > NBA_ROSTER_MAX) {
    const worst = [...club.players].filter(p => !kept.has(p.id)).sort((a, b) => a.ovr - b.ovr)[0];
    if (!worst) break;
    const cut: CutLedger & { players: NbaGmPlayer[] } = { players: club.players, deadCap: [], releasedThisSeason: [] };
    const waived: NbaGmPlayer[] = [];
    if (!cutPlayer(cut, waived, worst.id, NBA_ROSTER_MIN)) break;
    rollDeadCap(cut);
    club.deadCap = [...(club.deadCap ?? []), ...(cut.deadCap ?? [])];
    /* The summer's free agent step, as nbaOffseason gives every man it waived:
       a year on, the decline from 32, and his ask in next season's money (the
       league's cap is next season's by now). */
    for (const fa of waived) {
      fa.age += 1;
      if (fa.age >= 32) fa.ovr = Math.max(64, fa.ovr - 1);
      fa.salary = nbaSalaryFor(fa.ovr, league.cap);
      league.freeAgents.push(fa);
    }
  }
  nbaReconcileRotation(club);
}

export const nbaContractHost: GmContractHost<NbaLeague, string[]> = {
  sport: 'nba',
  /* Since Round 824 the engine prices a new deal in next season's money. */
  marketSalary: (league, man) => nbaSalaryFor(man.ovr, nbaNextCap(league.cap)),
  nextCap: league => nbaNextCap(league.cap),
  /* Round 1556: the engine's summer, keeping a man who let a sheet stand at the club that tabled it. */
  runOffseason: (league, rng, team, arrivals) => nbaSummerKeepingSheets(league, rng, team, arrivals),
  minSalary: league => nbaMinContract(nbaNextCap(league.cap)),
  /* Round 1018: the engine's roster ceiling. Read only for an offer sheet
     (restricted free agency): a rival with no spot cannot table one. */
  rosterMax: () => NBA_ROSTER_MAX,
  /* The engine's room is the cap less salaries, dead money and the tax cheque
     written at the last season close (nbaCapRoom). Next season's dead money is
     this season's rolled forward by the engine's own rollDeadCap, run on a
     copy so the club is not touched. The cheque is held back from next
     season's spending, so it counts here as it does in nbaCapRoom. */
  nextPayroll: (league, team, without) => {
    const t = league.teams[team];
    if (!t) return 0;
    const next: CutLedger = { deadCap: t.deadCap, releasedThisSeason: [] };
    rollDeadCap(next);
    return t.players.reduce((s, p) => s + (p.id === without ? 0 : p.salary), 0) + deadCapUsed(next) + (t.taxDue ?? 0);
  },
};

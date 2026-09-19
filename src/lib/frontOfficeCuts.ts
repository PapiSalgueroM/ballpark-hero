/* Round 631: DEAD MONEY, shared by the four front office engines.

   NFL, NBA, MLB and NHL each had a release that dropped the man and his whole
   salary in one move, and a sign that would take him straight back out of the
   pool on a one year deal. So a cut was full cap relief for nothing and a cut
   plus re-sign was a free contract reset. Measured before the fix, cap room
   before, after the cut, after the re-sign: NFL Trey McBride 23.7M with three
   years left, 190.4, 214.1, 190.4, his deal reset to one year. MLB Corbin
   Carroll 21.8M with four, 75.3, 97.1, 75.3, reset to one. NHL Leo Carlsson
   9.6M with four, 19.6, 29.2, 19.6, reset to one. NBA Nikola Jokic 61.1M with
   three freed the whole 61.1, and the re-sign was refused only because Denver
   was already over the cap, never by a rule. Round 619 closed the same hole in
   Club Manager with a settlement that lives on the save and a rule that a
   released man never signs back. This is that shape, written once:

     1. Dead money. This season's number carries half his salary, rounded to
        0.1. If his deal had more than one year left, next season's carries a
        quarter (half of the recorded half, so the ledger holds one number per
        man). Each sport's capUsed adds it, so room rises by less than his
        salary and never by all of it.
     2. No way back this season. His id goes on releasedThisSeason and each
        sport's sign path refuses him for this team until the offseason clears
        the list. Every other team can sign him as before.
     3. The offseason rolls it: seasonsLeft drops one, an entry at zero is
        gone, a survivor halves, and releasedThisSeason empties, for every
        team.

   THE NUMBER IT COUNTS AGAINST is whatever the sport's sign path checks. The
   NFL, NBA and NHL carry a cap. MLB has no cap: its league.cap is the luxury
   tax line, which the game treats as a hard payroll line and mlbSign checks
   against, so dead money counts against the tax line exactly as a salary does.

   Both fields are optional on every team, so a league saved before this round
   keeps loading and reads as having neither. A cut still moves the man to the
   pool on one year and keeps each sport's own roster floor.

   scripts/simFrontOfficeCuts.mjs measures all of it on the four engines and
   reads the four files to make sure no engine takes a man off a roster on its
   own: cutPlayer below is the one place that may. */

export interface DeadCapEntry {
  playerId: string;
  name: string;
  /** What this season's number carries for him, in $M. */
  amount: number;
  /** Seasons this entry still runs, counting this one. */
  seasonsLeft: number;
}

/** The two fields a team carries. Both optional so every saved league loads. */
export interface CutLedger {
  deadCap?: DeadCapEntry[];
  releasedThisSeason?: string[];
}

/** The least a man needs to be cut: an id, a name, a salary and years. */
export interface CutPlayer {
  id: string;
  name: string;
  salary: number;
  years: number;
}

const round1 = (n: number): number => Math.round(n * 10) / 10;

/** What cutting this man would cost, so a screen can say so before it happens. */
export function deadMoneyFor(p: Pick<CutPlayer, 'salary' | 'years'>): { now: number; next: number } {
  const now = round1(p.salary * 0.5);
  const next = p.years > 1 ? round1(now / 2) : 0;
  return { now, next };
}

/** What this season's number still carries for men who were cut. */
export function deadCapUsed(team: CutLedger): number {
  return round1((team.deadCap ?? []).reduce((s, d) => s + d.amount, 0));
}

/** The roster's salaries plus this season's dead money: what each sport's capUsed returns. */
export function payrollWithDeadCap(players: { salary: number }[], team: CutLedger): number {
  return round1(players.reduce((s, p) => s + p.salary, 0) + deadCapUsed(team));
}

/**
 * The cut. Refuses a man not on the roster and a roster at its floor, records
 * the dead money and the id, and moves him to the pool on one year. This is
 * the one place a front office engine may take a man off a roster for nothing
 * in return; the fence reads the engines to keep it that way.
 */
export function cutPlayer<P extends CutPlayer>(team: CutLedger & { players: P[] }, freeAgents: P[], playerId: string, floor: number): boolean {
  const idx = team.players.findIndex(p => p.id === playerId);
  if (idx < 0 || team.players.length <= floor) return false;
  const [p] = team.players.splice(idx, 1);
  const { now } = deadMoneyFor(p);
  team.deadCap = [...(team.deadCap ?? []), { playerId: p.id, name: p.name, amount: now, seasonsLeft: p.years > 1 ? 2 : 1 }];
  team.releasedThisSeason = [...(team.releasedThisSeason ?? []), p.id];
  freeAgents.push({ ...p, years: 1 });
  return true;
}

/**
 * Why this team cannot sign this free agent, or null when it can. The boards
 * read it so the button and the engine never disagree, and pass their own
 * word for the cut (waived, designated for assignment). Cap room is not in
 * here: every board already greys a man the room cannot cover.
 */
export function signRefusal(team: CutLedger, playerId: string, pastVerb = 'cut'): string | null {
  if ((team.releasedThisSeason ?? []).includes(playerId)) return `You ${pastVerb} him this season. He can come back after the offseason.`;
  return null;
}

/** One offseason's worth of the ledger, for one team. */
export function rollDeadCap(team: CutLedger): void {
  team.deadCap = (team.deadCap ?? [])
    .map(d => ({ ...d, amount: round1(d.amount / 2), seasonsLeft: d.seasonsLeft - 1 }))
    .filter(d => d.seasonsLeft > 0);
  team.releasedThisSeason = [];
}

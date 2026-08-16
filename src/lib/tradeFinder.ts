/* ─── Round 82: the Trade Finder ───
   A "shop this player" trade finder for all four Front Office GM sims. One
   generic engine: probe every other franchise with the sport's REAL trade
   function on deep clones, collect the deals the AI would actually accept,
   rank them by how much value you gain, prefer deals that keep your picks.
   Because the probe runs the exact same acceptance code as the manual trade
   screen, a listed offer can never be rejected when you accept it on the
   same league state. */

export interface FinderOffer {
  teamId: string;      // who is offering
  playerId: string;    // the player you would receive
  playerName: string;
  playerPos: string;
  playerOvr: number;
  playerAge: number;
  playerSalary: number;
  sweeten: boolean;    // true = you must attach one of your picks
  gain: number;        // their player's trade value minus yours (pick cost discounted)
}

interface FinderPlayer { id: string; name: string; pos: string; age: number; ovr: number; salary: number }
interface FinderTeam { players: FinderPlayer[]; picks: unknown[] }

type TradeResult = 'accepted' | 'rejected' | 'invalid';
type TradeFn<T> = (my: T, their: T, myId: string, theirId: string, sweeten: boolean, cap: number) => TradeResult;

const clone = <T,>(v: T): T => JSON.parse(JSON.stringify(v)) as T;

/**
 * Shop one of your players around the league.
 * teams: the league's team map keyed by id/abbr (NOT mutated).
 * tradeFn/valueFn: that sport's real trade + value functions.
 * Returns up to maxOffers accepted deals, best gain first.
 */
export function findTrades<T extends FinderTeam>(
  teams: Record<string, T>,
  myTeamId: string,
  myPlayerId: string,
  cap: number,
  tradeFn: TradeFn<T>,
  valueFn: (p: FinderPlayer) => number,
  opts?: { maxOffers?: number; pickPenalty?: number },
): FinderOffer[] {
  const maxOffers = opts?.maxOffers ?? 4;
  const pickPenalty = opts?.pickPenalty ?? 8; // gain discount when a deal costs you a pick
  const myTeam = teams[myTeamId];
  const mine = myTeam?.players.find(p => p.id === myPlayerId);
  if (!myTeam || !mine) return [];
  const myValue = valueFn(mine);
  const offers: FinderOffer[] = [];

  for (const [teamId, theirTeam] of Object.entries(teams)) {
    if (teamId === myTeamId) continue;
    // Probe their roster, best players first, and keep only this team's
    // single best accepted deal so the list spans several franchises.
    let best: FinderOffer | null = null;
    const sorted = [...theirTeam.players].sort((a, b) => b.ovr - a.ovr);
    for (const target of sorted) {
      // try the pickless deal first; only spend a pick when we must
      for (const sweeten of [false, true]) {
        if (sweeten && myTeam.picks.length === 0) continue;
        const myClone = clone(myTeam);
        const theirClone = clone(theirTeam);
        if (tradeFn(myClone, theirClone, myPlayerId, target.id, sweeten, cap) === 'accepted') {
          const gain = valueFn(target) - myValue - (sweeten ? pickPenalty : 0);
          if (!best || gain > best.gain) {
            best = {
              teamId, playerId: target.id, playerName: target.name, playerPos: target.pos,
              playerOvr: target.ovr, playerAge: target.age, playerSalary: target.salary,
              sweeten, gain: Math.round(gain * 10) / 10,
            };
          }
          break; // pickless accepted: no need to probe the sweetened version
        }
      }
    }
    if (best) offers.push(best);
  }

  return offers.sort((a, b) => b.gain - a.gain).slice(0, maxOffers);
}

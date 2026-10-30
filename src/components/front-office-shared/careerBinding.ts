/**
 * Round 1561: the career half of a Front Office board's facts, built once a render for the three career boxes, on
 * every sport. Round 1533 wrote it inline on the NFL board (careerOf) and Round 1550 gave it a "before the kit"
 * branch; the NFL board and the NHL board both build it here now, the sport handed in.
 *
 * - Before the career kit is here the binding is the hub's, and the hub reads the two boxes off it and nothing else.
 *   His record is the stored block when it fits the save (hostSeatOf), else the record a save older than the block
 *   stands on, built from the save alone (hostBoxLegacy says what it leaves out and why the boxes never read it;
 *   scripts/simFoLazyDesk.mjs holds every box equal to the kit's own record's). The screens behind the boxes, the
 *   only readers of the seat pack and the earn line, are drawn once the kit is here, never before, so a read of
 *   either without it is a bug and says so.
 * - With the kit: his record is the stored block when it fits the save, else the legacy record the kit read off the
 *   league; the market is read only while he is between seats.
 *
 * Pure: it reads, it never writes. The host's two functions are typed with `import type` only, so a page that
 * imports this file imports no host code (the kit hands them in).
 */
import { hostBoxLegacy, hostSeatOf, type HostBoxFacts, type HostLegacy } from '@/lib/gmCareerFace';
import type { GmDesk } from '@/lib/gmDesk';
import type { GmCareerBinding, GmDeskHost, HostXpSource, hostEarnsLine, hostMarket } from '@/lib/gmDeskHost';
import type { SeatOffer } from '@/lib/gmSeat';
import type { GmTree } from '@/lib/gmXp';

export interface CareerBindingFacts {
  /** The board's GM desk; null on a save whose desk has never been opened. */
  desk: GmDesk | null;
  /** He is between seats (the market is read only then). */
  fired: boolean;
  nameOf(id: string): string;
  /** What the save alone knows of itself: the hub's record before the kit is here. */
  box: HostBoxFacts;
  /** The trees this sport's desk routes to its engine, and what it pays XP for. */
  live: readonly GmTree[];
  sources: readonly HostXpSource[];
  take(offer: SeatOffer): void;
  sitOut(): void;
  spend(tree: GmTree): void;
}

/** What the kit hands the binding: the sport's adapter, its legacy record read off the league, and two host calls. */
export interface CareerBindingKit<L> {
  host: GmDeskHost<L>;
  league: L;
  legacy: HostLegacy;
  hostMarket: typeof hostMarket;
  hostEarnsLine: typeof hostEarnsLine;
}

const beforeKit = (): never => { throw new Error('the career kit was read before it arrived'); };

export function careerBindingOf<L>(f: CareerBindingFacts, kit: CareerBindingKit<L> | null): GmCareerBinding {
  if (!kit) {
    const seat = hostSeatOf(f.desk, hostBoxLegacy(f.box));
    return {
      get pack(): GmCareerBinding['pack'] { return beforeKit(); },
      seat, market: null, nameOf: f.nameOf, live: f.live, deskOn: f.desk !== null,
      get earns(): string { return beforeKit(); },
      take: f.take, sitOut: f.sitOut, spend: f.spend,
    };
  }
  const seat = hostSeatOf(f.desk, kit.legacy);
  return {
    pack: kit.host.pack, seat, market: f.fired ? kit.hostMarket(kit.host, kit.league, seat, f.nameOf) : null, nameOf: f.nameOf,
    live: f.live, deskOn: f.desk !== null, earns: kit.hostEarnsLine(f.sources),
    take: f.take, sitOut: f.sitOut, spend: f.spend,
  };
}

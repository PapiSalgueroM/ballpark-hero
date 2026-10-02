/**
 * Round 907: the GM desk on a front office hub, shared by all four sports.
 *
 * A board hands this a sport, its desk (the `gm` block off the save), its
 * facts and a list of panel definitions. Closed, it draws one more row of hub
 * boxes in the same style as the board's own five. Open, it draws the bar that
 * takes you back and the one panel behind the box you tapped, and nothing
 * else: boxes that open onto a different view, never a long stacked page.
 *
 * It knows nothing about what any panel does. Contracts, picks, staff and
 * whatever follows each bring their own definition, their own block validator
 * and their own words (src/lib/gmDesk.ts explains the contract). An empty list
 * draws nothing at all, which is what every board gets until a system is
 * bound to it.
 *
 * `open` is held by the board, not in here, because the board has to hide its
 * own boxes while a desk panel is open and the desk has to step aside while
 * one of the board's own is. The usual wiring:
 *
 *   {tab === null && gmOpen === null && <FoHubTiles ... />}
 *   {tab === null && <GmDeskMount open={gmOpen} onOpen={setGmOpen} ... />}
 *
 * What each box SAYS comes from gmDeskTiles in the lib, so it is checkable
 * without a browser. This file is only the shape.
 */
import { HubTiles, HubPanelHeader } from '@/components/hub/HubTiles';
import { gmDeskTiles, gmPanelFor, type GmDesk, type GmFacts, type GmPanelDef } from '@/lib/gmDesk';
import { gmSport, type GmSportKey } from '@/lib/gmSport';

export interface GmDeskMountProps<F extends GmFacts = GmFacts> {
  sport: GmSportKey;
  desk: GmDesk;
  facts: F;
  panels: readonly GmPanelDef<F>[];
  /** The open panel's key (a tile key works too), or null on the hub. */
  open: string | null;
  /** Called with a panel key to open it and with null to go back. */
  onOpen: (key: string | null) => void;
  /** Called with the next desk when a panel changes its block. The board saves it. */
  onDesk: (next: GmDesk) => void;
}

export function GmDeskMount<F extends GmFacts = GmFacts>({ sport, desk, facts, panels, open, onOpen, onDesk }: GmDeskMountProps<F>) {
  if (panels.length === 0) return null;
  const descriptor = gmSport(sport);
  const panel = gmPanelFor(panels, open);

  if (panel) {
    const back = () => onOpen(null);
    return (
      <div data-gm-desk="panel" data-gm-panel={panel.key} className="space-y-3">
        <HubPanelHeader title={panel.title} onBack={back} />
        <panel.Panel sport={descriptor} desk={desk} facts={facts} onDesk={onDesk} onBack={back} />
      </div>
    );
  }

  /* A stale key (a panel that is no longer in the list) lands here too: the
     hub is the honest answer to "open something that does not exist". */
  const tiles = gmDeskTiles(descriptor, desk, facts, panels);
  if (tiles.length === 0) return null;
  return (
    <div data-gm-desk="tiles">
      <HubTiles tiles={tiles} onOpen={key => { const p = gmPanelFor(panels, key); if (p) onOpen(p.key); }} />
    </div>
  );
}

export default GmDeskMount;

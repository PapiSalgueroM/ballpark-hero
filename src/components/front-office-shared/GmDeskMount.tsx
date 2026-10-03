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
 *   {tab === null && gmPanelFor(gmPanels, gmOpen) === null && <FoHubTiles ... />}
 *   {tab === null && <GmDeskMount open={gmOpen} onOpen={setGmOpen} panels={gmPanels} ... />}
 *
 * Gate the board's boxes on gmPanelFor, never on gmOpen === null. A key can go
 * stale (a panel list that changes with the phase, a key restored from a
 * save), and a stale key opens nothing here: gating on the key itself would
 * hide the board's five boxes behind a panel that is not there, and with no
 * desk boxes either the hub would be blank with no way back. The mount also
 * hands a stale key back as null, so a panel that returns later does not pop
 * open by itself.
 *
 * Build the panel list once, at module level, not inside the board's render:
 * each entry's Panel is a component type, and a new function every render
 * remounts the open panel on every save and loses whatever it held.
 *
 * What each box SAYS comes from gmDeskTiles in the lib, so it is checkable
 * without a browser. This file is only the shape.
 */
import { useEffect } from 'react';
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
  const descriptor = gmSport(sport);
  const panel = gmPanelFor(panels, open);
  /* A key that names no panel goes back to null, so the board's own boxes
     come back on its next render. Above every return, as hooks must be. */
  const stale = open !== null && panel === null;
  useEffect(() => { if (stale) onOpen(null); }, [stale, onOpen]);

  if (panel) {
    const back = () => onOpen(null);
    return (
      <div data-gm-desk="panel" data-gm-panel={panel.key} className="space-y-3">
        <HubPanelHeader title={panel.title} onBack={back} />
        <panel.Panel sport={descriptor} desk={desk} facts={facts} onDesk={onDesk} onBack={back} />
      </div>
    );
  }

  /* A stale key (a panel that is no longer in the list) lands here too, for
     the one render before the effect above clears it: the hub is the honest
     answer to "open something that does not exist". And no
     boxes means no wrapper either: an empty list, or one whose every tile said
     null, must leave nothing on the hub, not an empty gap. */
  const tiles = gmDeskTiles(descriptor, desk, facts, panels);
  if (tiles.length === 0) return null;
  return (
    <div data-gm-desk="tiles">
      <HubTiles tiles={tiles} onOpen={key => { const p = gmPanelFor(panels, key); if (p) onOpen(p.key); }} />
    </div>
  );
}

export default GmDeskMount;

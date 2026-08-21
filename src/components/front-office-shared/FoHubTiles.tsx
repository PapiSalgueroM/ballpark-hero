/**
 * Round 204 introduced the front office tile hub here. Round 208 moved the
 * drawing to components/hub/HubTiles.tsx, because the same box now serves
 * the four My Career games as well and a name beginning "Fo" would have
 * been claiming otherwise.
 *
 * This file stays as the front office boards' door to it, so those four
 * boards did not need touching for a rename. What each box SAYS is still
 * decided in src/lib/foHub.ts.
 */
import { HubTiles, HubPanelHeader } from '@/components/hub/HubTiles';
import type { FoPanelKey, FoTile } from '@/lib/foHub';

export function FoHubTiles({ tiles, onOpen }: { tiles: FoTile[]; onOpen: (key: FoPanelKey) => void }) {
  return <HubTiles tiles={tiles} onOpen={k => onOpen(k as FoPanelKey)} />;
}

export function FoPanelHeader({ title, onBack }: { title: string; onBack: () => void }) {
  return <HubPanelHeader title={title} onBack={onBack} />;
}

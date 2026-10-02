/**
 * Round 907: the GM desk, the one save block every front office system hangs on.
 *
 * The owner, 2026-10-02: the manager games for every sport should behave like
 * the soccer one, with each sport's own things. Club Manager has contract
 * talks, draft style capital, a staff desk, scouting, an inbox. The four Front
 * Office sims have none of them, and four separate save shapes. If each new
 * system added its own fields to four saves and its own tab to four boards,
 * every one of them would be written four times and drift, which is exactly
 * what Round 426 and Round 431 paid for.
 *
 * So there is ONE optional field on a front office save, `gm`, and it is a
 * bag: { v, blocks }. Each system (contracts, picks, staff, whatever comes
 * next) owns one key in `blocks`, brings its own validator and its own fresh
 * value, and reads through gmBlock. Nobody edits this file to add a system.
 *
 * THE THREE PROMISES.
 *   1. An old save has no `gm` at all. readGmDesk(undefined) is a fresh desk,
 *      and nothing else about the save is touched, so old saves load unchanged.
 *   2. One bad block costs one block. gmBlock hands back that system's fresh
 *      value and leaves every other key exactly as it was.
 *   3. It fails closed. A block that is missing, the wrong shape, or whose
 *      validator throws is never half trusted: the answer is the fresh value.
 *
 * Everything in a block must survive JSON.stringify, because the boards save
 * the whole thing to localStorage that way. No Dates, no Maps, no functions.
 *
 * The screen half is components/front-office-shared/GmDeskMount.tsx. What a
 * tile SAYS is decided here and in each system's own lib file, never in JSX,
 * so scripts/simGmDesk.mjs can check it without a browser.
 */
import type { ReactNode } from 'react';
import type { FoHubFacts } from './foHub';
import type { GmSport } from './gmSport';

/* ------------------------------------------------------------------ */
/* The save block                                                      */
/* ------------------------------------------------------------------ */

/** The envelope's own version. A block's inner shape is versioned by its owner, inside the block. */
export const GM_DESK_VERSION = 1;

export interface GmDesk {
  v: number;
  /** One key per system. Unknown keys are carried through every write untouched. */
  blocks: Record<string, unknown>;
}

export const freshGmDesk = (): GmDesk => ({ v: GM_DESK_VERSION, blocks: {} });

const isBag = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v);

/**
 * The desk off a save. Pass whatever sits at save.gm, including nothing.
 * An envelope this build does not know (no version, another version, blocks
 * that are not a plain object) is a fresh desk: its shape cannot be trusted,
 * so none of it is read.
 */
export function readGmDesk(raw: unknown): GmDesk {
  if (!isBag(raw) || raw.v !== GM_DESK_VERSION || !isBag(raw.blocks)) return freshGmDesk();
  return { v: GM_DESK_VERSION, blocks: raw.blocks };
}

/**
 * One system's block, validated by that system.
 *
 * `isValid` is the owner's own check (a type guard is best) and `fresh` builds
 * its starting value. Missing, invalid, or a validator that throws: fresh().
 * This never writes. The block is replaced the next time its owner calls
 * withGmBlock, and no other key is disturbed either way.
 *
 * What comes back is the stored object itself, not a copy. Treat it as read
 * only and build the next value fresh: changing it in place changes the
 * board's state behind React's back and the screen will not redraw.
 */
export function gmBlock<T>(desk: GmDesk, key: string, isValid: (v: unknown) => boolean, fresh: () => T): T {
  if (Object.prototype.hasOwnProperty.call(desk.blocks, key)) {
    const v = desk.blocks[key];
    try {
      if (isValid(v)) return v as T;
    } catch {
      /* a validator that threw has not said yes */
    }
  }
  return fresh();
}

/** A new desk with one block replaced. The desk handed in is not changed. */
export function withGmBlock<T>(desk: GmDesk, key: string, value: T): GmDesk {
  return { v: GM_DESK_VERSION, blocks: { ...desk.blocks, [key]: value } };
}

/* ------------------------------------------------------------------ */
/* What a board tells the desk                                         */
/* ------------------------------------------------------------------ */

/** The phases all four front office boards share. */
export type GmPhase = 'pick' | 'hub' | 'draft' | 'recap' | 'fired';

/**
 * The facts adapter: a board's state, flattened into the few things every
 * sport has. `hub` is the FoHubFacts the board already builds for its own
 * tiles (roster, market, room, record, period), so binding a board costs one
 * object, not a second flattening.
 *
 * A system that needs more (contract years, a pick ledger) extends this with
 * its own fields and types its panel as GmPanelDef<ItsFacts>; the board then
 * builds one facts object that satisfies every panel it mounts.
 */
export interface GmFacts {
  /** The engine's id for the user's club. */
  teamId: string;
  /** How the board prints that club: 'Kansas City Chiefs'. */
  teamLabel: string;
  /** Seasons this save has finished. The season in play is this plus one. */
  seasonsPlayed: number;
  phase: GmPhase;
  hub: FoHubFacts;
}

/* ------------------------------------------------------------------ */
/* Panels                                                              */
/* ------------------------------------------------------------------ */

/** What a tile's maker is handed. */
export interface GmTileContext<F extends GmFacts = GmFacts> {
  sport: GmSport;
  desk: GmDesk;
  facts: F;
}

/** What a panel is handed. */
export interface GmPanelProps<F extends GmFacts = GmFacts> extends GmTileContext<F> {
  /** Hand back the next desk (build it with withGmBlock). The board saves it. */
  onDesk: (next: GmDesk) => void;
  /** Close the panel and go back to the hub. */
  onBack: () => void;
}

/** The live half of a box: everything except its key and its word. */
export interface GmTileFace {
  icon: string;
  /** The headline fact. Never empty. */
  value: string;
  /** The second line. Never empty: an empty box looks broken. */
  sub: string;
  /** The pulse. True means something wants a decision from you. */
  accent: boolean;
}

/**
 * One system's door on the hub. The caller hands GmDeskMount a list of these;
 * the mount knows nothing about what any of them does.
 */
export interface GmPanelDef<F extends GmFacts = GmFacts> {
  /** Unique in the list. By habit also the system's block key. */
  key: string;
  /** The word on the box and above the open panel. Harnesses tap by it. */
  title: string;
  /** The box's live face, or null to leave the box off the hub for now. */
  tile: (ctx: GmTileContext<F>) => GmTileFace | null;
  /**
   * The screen behind the box. A real component, so it may use hooks. Typed by
   * its call alone, so a plain function, an FC and a memo all fit.
   */
  Panel: (props: GmPanelProps<F>) => ReactNode;
}

/** A hub box, in the shape components/hub/HubTiles draws. */
export interface GmTile extends GmTileFace {
  key: string;
  title: string;
}

/** Desk boxes are keyed apart from a board's own five ('team', 'trade', ...), so one grid can hold both. */
export const gmTileKey = (panelKey: string): string => `gm:${panelKey}`;

/**
 * The boxes for a list of panels, in list order. A panel whose tile says null
 * is left out. A key seen twice keeps its first panel: two systems that picked
 * the same key must not both answer one tap.
 */
export function gmDeskTiles<F extends GmFacts>(sport: GmSport, desk: GmDesk, facts: F, panels: readonly GmPanelDef<F>[]): GmTile[] {
  const seen = new Set<string>();
  const out: GmTile[] = [];
  for (const p of panels) {
    if (seen.has(p.key)) continue;
    seen.add(p.key);
    const face = p.tile({ sport, desk, facts });
    if (face) out.push({ key: gmTileKey(p.key), title: p.title, ...face });
  }
  return out;
}

/** The panel a tile key or a panel key opens, or null. First of a repeated key, the same one gmDeskTiles drew. */
export function gmPanelFor<F extends GmFacts>(panels: readonly GmPanelDef<F>[], open: string | null): GmPanelDef<F> | null {
  if (!open) return null;
  return panels.find(p => p.key === open || gmTileKey(p.key) === open) ?? null;
}

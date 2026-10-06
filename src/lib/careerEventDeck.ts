/* ─── Round 1038: the event ledger every career shares ───

   Round 725 gave Soccer Career a memory for its event cards: every card sits
   out a number of seasons after it fires, the season it fired in is written
   to eventLastFired on the save, keyed by its id (or by the story it shares
   with other cards), and a card is held out while (this season minus that
   season) is at most its cooldown. Those rules lived inside
   soccerCareerEngine.ts. They live here now, once, with the same key format
   and the same comparison, so the four US careers read the same rule and
   Soccer Career can switch to these imports without changing a single draw.
   Until it does, scripts/simUsCareerSummer.mjs (section 8) holds the two
   copies to the same answers.

   Imports nothing, on purpose: every career engine can reach it without
   pulling another sport in with it. */

/** The season each ledger key last fired in. */
export type EventLedger = Record<string, number>;

/** The fields of a card the ledger reads. Every career's card has them. */
export interface LedgerCard {
  id: string | number;
  story?: string;
  cooldown?: number;
}

/** The ledger key: 'story:' plus the shared story, or the card's own id. */
export function ledgerKey(e: Pick<LedgerCard, 'id' | 'story'>): string {
  return e.story ? `story:${e.story}` : String(e.id);
}

/** A card's own cooldown when it gives a finite number at or above zero
 *  (floored), otherwise the fallback the caller names for it. */
export function cooldownOf(e: Pick<LedgerCard, 'cooldown'>, fallback: number): number {
  const c = e.cooldown;
  if (typeof c === 'number' && Number.isFinite(c) && c >= 0) return Math.floor(c);
  return fallback;
}

/** True while (season minus the season it last fired) is at most its cooldown.
 *  A key the ledger has never seen, or holds as anything but a finite number,
 *  is never on cooldown. */
export function onCooldown(ledger: EventLedger | undefined | null, e: LedgerCard, season: number, fallback: number): boolean {
  const last = ledger?.[ledgerKey(e)];
  if (typeof last !== 'number' || !Number.isFinite(last)) return false;
  return season - last <= cooldownOf(e, fallback);
}

/** A new ledger with every picked card stamped at this season. The map is
 *  replaced, never written into, so the caller's previous state is untouched. */
export function stampFired(ledger: EventLedger | undefined | null, picked: LedgerCard[], season: number): EventLedger {
  const out: EventLedger = { ...(ledger ?? {}) };
  for (const e of picked) out[ledgerKey(e)] = season;
  return out;
}

/** Up to `count` cards with distinct ledger keys, each a uniform pick among
 *  what is still eligible: not on cooldown (unless `exempt` says the card is
 *  outside the ledger), and no key in `excludeKeys` or already taken here.
 *  Returns [] when nothing qualifies. Draws exactly one rng value per card
 *  taken, and none when nothing is eligible. */
export function takeFresh<E extends LedgerCard>(
  candidates: E[],
  count: number,
  ledger: EventLedger | undefined | null,
  season: number,
  fallback: number,
  excludeKeys: Iterable<string>,
  rng: () => number,
  exempt: (e: E) => boolean = () => false,
): E[] {
  const taken = new Set<string>(excludeKeys);
  let pool = candidates.filter(e => !taken.has(ledgerKey(e)) && (exempt(e) || !onCooldown(ledger, e, season, fallback)));
  const out: E[] = [];
  while (out.length < count && pool.length > 0) {
    const pick = pool[Math.floor(rng() * pool.length)];
    const key = ledgerKey(pick);
    out.push(pick);
    taken.add(key);
    pool = pool.filter(e => ledgerKey(e) !== key);
  }
  return out;
}

/** The pick the four US engines have always made, written once: an open
 *  corruption arc takes the card 45 percent of the time (from the corruption
 *  cards), otherwise one uniform pick from the whole deck. With `fresh`
 *  absent the draws, their order and the result are exactly what each
 *  engine's own copy did. With it, the same draws run over the cards `fresh`
 *  accepts, and a list it would empty falls back to the whole list, so an
 *  offseason is never empty. */
export function pickDeckCard<E>(deck: E[], corrupt: E[], arcOpen: boolean, rng: () => number, fresh?: (e: E) => boolean): E {
  const within = (list: E[]): E[] => {
    if (!fresh) return list;
    const kept = list.filter(fresh);
    return kept.length > 0 ? kept : list;
  };
  if (arcOpen && corrupt.length > 0 && rng() < 0.45) {
    const pool = within(corrupt);
    return pool[Math.floor(rng() * pool.length)];
  }
  const pool = within(deck);
  return pool[Math.floor(rng() * pool.length)];
}

/** The ledger as a save may hold it: only finite numbers survive, and
 *  anything that is not a plain object comes back as {}, which reads as
 *  nothing on cooldown. */
export function sanitizeLedger(raw: unknown): EventLedger {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {};
  const out: EventLedger = {};
  for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
    if (typeof v === 'number' && Number.isFinite(v)) out[k] = v;
  }
  return out;
}

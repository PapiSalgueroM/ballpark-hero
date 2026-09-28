/**
 * The daily record the three chain games share.
 *
 * Round 645 part three. NASCAR Chain, Tennis Chain and Combat Chain are one
 * idea written three times (a starting name hashed from the day, extend the
 * chain with someone who beat them, a wrong guess or Give Up ends it), and
 * none of the three kept anything across a refresh: a finished daily came
 * back as the mode menu, Daily dealt the same starter again, and every replay
 * recorded a second completion and paid the score again. A chain walked away
 * from part way was dealt again from the starter too. This is the record all
 * three file, written once, on the Round 428 helper, after every link and on
 * the end.
 *
 * What is stored is the chain itself and how it ended; everything a card
 * shows is DERIVED from that on the way back by the hook that owns the sport
 * (the score from the chain length and the game's own multiplier, the badge
 * from the length, a fighter from his name), so a tampered record can claim
 * nothing the rules would not have produced. Fails closed on shape like every
 * loader here: a chain that does not open on today's starter, a link without
 * a name, a name used twice, an ended chain with no reason, and the route
 * deals a fresh daily.
 */
import { readDailyRecord, writeDailyRecord } from '@/lib/dailyRecord';

export interface ChainDailyLink {
  name: string;
  /** How this link was beaten by the next one, as the validator worded it. */
  note?: string;
}

export interface ChainDailyRecord {
  links: ChainDailyLink[];
  ended: boolean;
  reason: string | null;
  /** Combat Chain's "correct answer was" name on an ended chain. */
  correctAnswer: string | null;
}

/* A chain can never be longer than the names that exist to extend it; this
   only has to be past any real chain and short of a tampered megabyte. */
const MAX_LINKS = 500;

function isLink(v: unknown): v is ChainDailyLink {
  if (!v || typeof v !== 'object' || Array.isArray(v)) return false;
  const o = v as Record<string, unknown>;
  if (typeof o.name !== 'string' || o.name.trim() === '') return false;
  if (o.note !== undefined && typeof o.note !== 'string') return false;
  return true;
}

/** Today's chain for `slug`, or null. `starter` is the name the day deals:
 *  a record that does not open on it belongs to some other deal. */
export function readChainDaily(slug: string, today: string, starter: string): ChainDailyRecord | null {
  return readDailyRecord<ChainDailyRecord>(slug, today, f => {
    if (!Array.isArray(f.links) || f.links.length === 0 || f.links.length > MAX_LINKS || !f.links.every(isLink)) return null;
    const links = (f.links as ChainDailyLink[]).map(l => (l.note !== undefined ? { name: l.name, note: l.note } : { name: l.name }));
    if (links[0].name !== starter) return null;
    if (new Set(links.map(l => l.name.toLowerCase())).size !== links.length) return null;
    if (typeof f.ended !== 'boolean') return null;
    if (f.reason !== null && typeof f.reason !== 'string') return null;
    if (f.ended && typeof f.reason !== 'string') return null;
    if (f.correctAnswer !== null && typeof f.correctAnswer !== 'string') return null;
    return { links, ended: f.ended, reason: f.reason as string | null, correctAnswer: f.correctAnswer as string | null };
  });
}

export function writeChainDaily(slug: string, today: string, rec: ChainDailyRecord): void {
  writeDailyRecord(slug, today, { links: rec.links, ended: rec.ended, reason: rec.reason, correctAnswer: rec.correctAnswer });
}

/* ─── Round 473: the signature boot, the top of the branding line ───────────

   His list: "social media and branding with a shoe deal as a long earned
   peak". The branding ladder was already there and it worked, but the shoe
   deal on it was not a peak: SPONSORSHIP_TIERS hands out the Global Boot Deal
   at five million followers, and measured over 120 seeded careers every
   single one of them cleared five million, most of them in their early
   twenties. It was a rung, and it was the second rung.

   So the peak is the boot with your name on the sole, and it is late on
   purpose: you need to still be good (an 84 overall), old enough to have a
   story (25), long enough in the game (six seasons) and big enough that a
   brand wants the name rather than the feet (the follower mark the engine's
   own table sets for a global ambassador, handed in by the caller so this
   file never has to repeat a number at that table).

   THREE REAL TRADES, no free option:
     the flat fee    certain money, every year, for as long as you play.
     a cut of sales  half the fee up front and a share of every pair, which
                     is worth more than the flat deal or a lot less, and
                     scripts/simCareerLife.mjs measures that both really
                     happen rather than one of them being decoration.
     no boot         no money at all, and the only one of the three that
                     leaves you with something to say about it afterwards.

   TYPES ONLY on the engine import, so the engine can import this file for the
   event without a cycle. The brand names are the two the game already signs
   in event 5, so nothing new is invented here.
*/
import type { CareerState, RandomEvent } from "./soccerCareerEngine";

const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));
const flag = (s: CareerState, key: string): number => (s.lifeFlags || {})[key] || 0;
const setFlag = (s: CareerState, key: string, value: number) => {
  s.lifeFlags = { ...(s.lifeFlags || {}), [key]: value };
};

/** The one flag: 0 not offered yet, 1 flat fee, 2 a cut of sales, 3 refused. */
export const BOOT_FLAG = "signatureBoot";

/** Signed one, either way. The badge case reads this. */
export const hasSignatureBoot = (s: CareerState): boolean => flag(s, BOOT_FLAG) === 1 || flag(s, BOOT_FLAG) === 2;

const bump = (s: CareerState, delta: number) => {
  s.sponsorBonus = Math.round(((s.sponsorBonus ?? 0) + delta) * 100) / 100;
};

/** The brand that already has you, or the one that came looking. */
function brandFor(s: CareerState): string {
  if (s.sponsorDeal === "Vortex" || s.sponsorDeal === "Kinetiq") return s.sponsorDeal;
  return (s.playerName || "").length % 2 === 0 ? "Vortex" : "Kinetiq";
}

/**
 * Self gating like every other catalog here, so the caller needs no rules.
 * `ambassadorFollowers` is SPONSORSHIP_TIERS' global ambassador mark in
 * millions, handed in by the engine so this file stays types only.
 */
export function getBootEvents(state: CareerState, ambassadorFollowers: number): RandomEvent[] {
  if (state.retired || state.age < 25) return [];
  if (flag(state, BOOT_FLAG) !== 0) return [];
  if (state.overall < 84) return [];
  if ((state.socialMediaFollowers ?? 0) < ambassadorFollowers) return [];
  const played = (state.seasons ?? []).filter(s => s.type === "playing");
  if (played.length < 6) return [];
  const brand = brandFor(state);

  return [{
    id: 501, emoji: "👟", title: "Your Own Boot",
    description: `${brand} have been on your feet for years. This is different: they want a boot with your name on the sole, your colours, your silhouette on the box, sold in every country they sell in. There is a designer in the room with a sketch of it already.`,
    category: "positive",
    choices: [
      {
        label: "Sign the flat fee", emoji: "✍️", color: "bg-emerald-600",
        consequence: "€4M a year, every year, for as long as you play. Popularity +5",
        apply: s => {
          setFlag(s, BOOT_FLAG, 1);
          bump(s, 4);
          s.popularity = clamp(s.popularity + 5, 0, 100);
          s.events = [...s.events, `👟 Signed the ${brand} signature boot on a flat fee. Your name is on the sole`];
          return s;
        },
      },
      {
        label: "Half the fee, and a cut of every pair", emoji: "📈", color: "bg-amber-600",
        consequence: "50%: the boot sells and it is worth €9M a year plus 2M followers. 50%: it does not and you are on €1.5M",
        apply: s => {
          setFlag(s, BOOT_FLAG, 2);
          if (Math.random() < 0.5) {
            bump(s, 9);
            s.socialMediaFollowers = Math.round((s.socialMediaFollowers + 2) * 100) / 100;
            s.popularity = clamp(s.popularity + 8, 0, 100);
            s.events = [...s.events, `👟 Took a cut instead of a fee and the ${brand} boot sold out twice. Best deal you ever signed`];
          } else {
            bump(s, 1.5);
            s.events = [...s.events, `👟 Took a cut instead of a fee and the ${brand} boot sat on the shelves. The colourway was brave`];
          }
          return s;
        },
      },
      {
        label: "No boot. You wear what you have always worn", emoji: "🥾", color: "bg-muted",
        consequence: "No money at all. Integrity +6, Morale +5",
        apply: s => {
          setFlag(s, BOOT_FLAG, 3);
          s.integrityBonus += 6;
          s.morale = clamp(s.morale + 5, 0, 100);
          s.events = [...s.events, "👟 Turned down a signature boot. You have worn the same pair since you were seventeen and everybody knows it"];
          return s;
        },
      },
    ],
  }];
}

/* Round 192: the podium downstairs, one engine, four Front Office games.

   The S-5 parity push gave the four GM sims the owner (180) and true trade
   talks (190), and gave the four PLAYER careers a press room (184). The GM
   never faced the room. Now the season's actual facts decide whether there
   is a presser and which one: win it all and you get the podium, miss the
   ask and you get the accountability scrum, swing a headline deal in a
   normal year and the room wants to talk about it, take a new job and the
   city wants its introduction. A quiet, mandate-met, no-news summer is
   PROVABLY quiet: no presser at all, because a press room with nothing to
   ask is filler.

   The stakes are the GM loop itself, not a copied fanbase meter. Every
   answer moves TRUST upstairs (the Round 180 meter, the one that fires
   you), and the season-end answers can TILT next season's mandate one
   tier: talk big and the ask ratchets up, ask for patience and it softens,
   at a cost, because ownership hates hearing smallness. That is the
   trade-off the three buttons carry: the measured answer is safe, the
   candid one risks a little for a little, the bold one gambles real trust
   and raises the bar it will be graded against. No option dominates.

   Two hard rules, both pinned in simGmPress:
   - The room can bruise you, only a graded season can end you: press trust
     clamps to a floor of 1, never 0, so a firing happens exactly where
     Round 180 put it, at the season grade.
   - A fired GM gets NO presser. Round 187 decided the door shuts with one
     honest shake; a scrum after the fired screen would be a second ending.

   Legal shape, same as usCareerPress (184): the SPEAKER IS ALWAYS YOUR
   FICTIONAL GM. Questions come from an unnamed room, never a named real
   person, and nothing here invents words for anyone real. The one real
   name that can appear is inside tradeLine, which the boards build from a
   deal that actually happened in the save ("the deal that brought X in"),
   narration of a save fact, exactly like the news feed line it echoes.

   Shared-engine pattern per usCoachCareer (126), usCareerFreeAgency (179),
   foOwnerMandate (180) and foTradeTalks (190): sport words come in as
   data, the four boards render one shared card. Zero new screens. */

import type { FoSportWords, FoGradeResult } from './foOwnerMandate';

/** What one answer does to the meter upstairs. */
export interface GmPressEffect {
  /** Flat trust shift, applied always. */
  trust: number;
  /** Bold and candid answers gamble: an extra +gain or -risk on top. */
  gamble?: { gain: number; risk: number; odds: number };
  /** Tilt applied to NEXT season's mandate tier: -1 softer, +1 harder. */
  tilt: -1 | 0 | 1;
}

export interface GmPressOption {
  label: string;
  effectLine: string;
  effect: GmPressEffect;
}

export interface GmPresser {
  id: string;
  title: string;
  body: string;
  /** Always [measured, candid, bold]. */
  options: [GmPressOption, GmPressOption, GmPressOption];
}

/** The facts the room can see. All derivable from board state. */
export interface GmPressFacts {
  /** True right after taking a job; the only presser outside season end. */
  justHired: boolean;
  /** 'City Name' label for the intro body. */
  teamLabel: string;
  fired: boolean;
  wonTitle: boolean;
  gradeResult: FoGradeResult | null;
  /** Board-narrated headline deal this season, or null. */
  tradeLine: string | null;
  seasonsPlayed: number;
}

/** Build the presser this moment deserves, or null for a quiet one.
    Priority: no room for the fired, podium, scrum, the trade question. */
export function buildGmPresser(words: FoSportWords, f: GmPressFacts): GmPresser | null {
  if (f.fired) return null;

  if (f.justHired) {
    return {
      id: 'gmPressIntro',
      title: 'The introduction',
      body: `First day, full room. The ${f.teamLabel} beat writers want to know what kind of front office this is going to be.`,
      options: [
        { label: 'Process, patience, all the safe words', effectLine: 'Nobody clips it. That is the point', effect: { trust: 3, tilt: 0 } },
        { label: 'Name the roster holes out loud', effectLine: 'Candor plays upstairs, usually', effect: { trust: 2, gamble: { gain: 3, risk: 2, odds: 0.7 }, tilt: 0 } },
        { label: `Say ${words.title} is the only bar`, effectLine: 'The clip will outlive you, either way', effect: { trust: 2, gamble: { gain: 8, risk: 5, odds: 0.5 }, tilt: 0 } },
      ],
    };
  }

  if (f.wonTitle) {
    return {
      id: 'gmPressPodium',
      title: 'The podium',
      body: `Confetti still on the floor and the room wants the architect. Every question is the same question: was this the plan, and does it hold?`,
      options: [
        { label: 'Credit the coaches and the room', effectLine: 'Classy, forgettable, safe', effect: { trust: 3, tilt: 0 } },
        { label: 'Cool the dynasty talk yourself', effectLine: 'Next season breathes easier for it', effect: { trust: 0, tilt: -1 } },
        { label: 'Promise the repeat, on the record', effectLine: 'Upstairs loves it or owns you with it', effect: { trust: 2, gamble: { gain: 8, risk: 4, odds: 0.6 }, tilt: 1 } },
      ],
    };
  }

  if (f.gradeResult === 'missed' || f.gradeResult === 'badly') {
    return {
      id: 'gmPressScrum',
      title: 'The accountability scrum',
      body: `The season fell short of the ask and the front row counted every miss. Somebody answers for it, and the cameras picked the GM.`,
      options: [
        { label: 'Say the right, empty things', effectLine: 'Survives the news cycle, moves nothing', effect: { trust: 1, tilt: 0 } },
        { label: 'Ask the room for patience', effectLine: 'The ask softens. Upstairs hates hearing it', effect: { trust: -1, tilt: -1 } },
        { label: 'Call the collapse a blip, on the record', effectLine: 'Defiance lands or it buries you', effect: { trust: 0, gamble: { gain: 9, risk: 7, odds: 0.45 }, tilt: 1 } },
      ],
    };
  }

  if (f.tradeLine) {
    return {
      id: 'gmPressTrade',
      title: 'The trade question',
      body: `A steady season, so the room goes to the ledger: ${f.tradeLine}. Half of them called it a heist, half called it a panic. Which was it?`,
      options: [
        { label: 'Call it one move among many', effectLine: 'Boring answer, quiet week', effect: { trust: 2, tilt: 0 } },
        { label: 'Defend the deal line by line', effectLine: 'Conviction usually reads well upstairs', effect: { trust: 1, gamble: { gain: 4, risk: 2, odds: 0.7 }, tilt: 0 } },
        { label: `Declare it the move that wins ${words.title}`, effectLine: 'Now the deal has a bar to clear', effect: { trust: 1, gamble: { gain: 7, risk: 5, odds: 0.55 }, tilt: 1 } },
      ],
    };
  }

  return null;
}

/** Apply one answer. Trust floors at 1: the room can bruise you, only a
    graded season can end you (the Round 180 firing stays the only exit). */
export function applyGmPressChoice(trust: number, opt: GmPressOption, rng: () => number): { trust: number; line: string; tilt: -1 | 0 | 1 } {
  let shift = opt.effect.trust;
  let line = `🎙️ ${opt.effectLine}.`;
  if (opt.effect.gamble) {
    const g = opt.effect.gamble;
    if (rng() < g.odds) {
      shift += g.gain;
      line = `🎙️ It LANDED. The room bought every word (+${opt.effect.trust + g.gain} trust).`;
    } else {
      shift -= g.risk;
      line = `🎙️ It backfired. The clip runs upstairs for the wrong reasons (${opt.effect.trust - g.risk} trust).`;
    }
  }
  return { trust: Math.max(1, Math.min(100, trust + shift)), line, tilt: opt.effect.tilt };
}

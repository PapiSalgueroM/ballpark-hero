/* Round 1042: the player's own national squad.

   Who is picked, the team sheet, and the real men of 2016 to 2026. Lifted out
   of soccerInternational.ts word for word, so that the national team pools
   (src/data/nationalPools.ts, 12,703 real rows) are downloaded by the one game
   that reads them. This file is the ONLY reader of that data and it is
   imported by Soccer Career only (soccerCareerEngine.ts). A manager game
   imports soccerInternational.ts and gets the tournaments without the squads:
   runManagerSummer hands simulateTournament no squad at all.

   The edge runs one way, from here to the engine. soccerInternational.ts must
   never import or re export this file, or Club Manager, Manager Hot Seat,
   Deadline Day and Transfer Path get the pools back.
   scripts/simCmDataOnDemand.mjs holds that.
*/

import { intlName } from './intlNames';
import { NATIONAL_POOLS, NATIONAL_POOL_YEARS } from '@/data/nationalPools';
import {
  SQUAD_PLACES, clamp, nationStrength, positionGroup, runQualifying, simulateTournament,
  tournamentForYear,
} from './soccerInternational';
import type {
  IntlTournament, PlayerForm, SquadCall, StartingEleven, XiMan,
} from './soccerInternational';

/* ─── The squad announcement ─────────────────────────────────────────────── */

/* ─── Round 197: the starting eleven ─────────────────────────────────────── */

/** The shape every national side lines up in here. One shape on purpose:
 *  the screen is about WHO, not about tactics, and eleven shirts a player
 *  recognises beats a formation picker he did not ask for. */
const XI_SHAPE: { slot: string; group: 'GK' | 'DEF' | 'MID' | 'ATT' }[] = [
  /* Round 257, owner report: "I'm a right winger but I'm in the position
     of a left winger. Also cdm isn't in the correct spot."
     This array is ALSO the left-to-right render order of each line (see
     order() below), and it was listing the right side first, so every
     sheet was mirrored: the right winger sat on the left of the screen
     and the holding midfielder sat out on a flank. A team sheet is drawn
     the way a camera behind your own goal sees it, so the left-sided
     shirts come first and the holder sits in the middle of his three. */
  { slot: 'GK', group: 'GK' },
  { slot: 'LB', group: 'DEF' }, { slot: 'CB', group: 'DEF' }, { slot: 'CB', group: 'DEF' }, { slot: 'RB', group: 'DEF' },
  { slot: 'CM', group: 'MID' }, { slot: 'CDM', group: 'MID' }, { slot: 'CM', group: 'MID' },
  { slot: 'LW', group: 'ATT' }, { slot: 'ST', group: 'ATT' }, { slot: 'RW', group: 'ATT' },
];

/* ─── Round 259: real internationals, for the years we have them ─────────
   Owner report: "What type of squad is this? There's no real life players and
   this is only 2023. I get it in like 2045 because we don't know who's going
   to be good then but right now u can say who's good."

   src/data/nationalPools.ts is baked from the same market value table the
   rest of the site's real players come from, one entry per nation per year,
   so a 2023 squad holds who was actually good in 2023. Outside that window,
   and for any nation whose pool that year could not field a team, the
   generator carries on exactly as it did, which is the part he said he
   understood. Nothing here invents a cap, a nationality or a rating: a
   player appears for a nation because his row says that nation, and his
   number comes off the same value curve as every other real player here. */

/** The game's nation names against the data's. Only where they differ. */
const POOL_ALIAS: Record<string, string> = {
  USA: 'United States',
  Turkey: 'Türkiye',
  'Ivory Coast': "Cote d'Ivoire",
  'South Korea': 'Korea, South',
  'Bosnia & Herzegovina': 'Bosnia-Herzegovina',
};
/* Checked against the data's own distinct nationality list rather than
   assumed: Cape Verde, Czech Republic, DR Congo and North Macedonia all
   already match, so they are deliberately NOT in the map above. An alias that
   renames a name to itself is a line nobody can tell is wrong. */

export interface PoolMan { name: string; pos: string; ovr: number; group: 'GK' | 'DEF' | 'MID' | 'ATT'; }

const poolCache = new Map<string, PoolMan[] | null>();

/** The real players a nation had that year, best first, or null if we have
 *  no fieldable pool for it and the generator should take over. */
export function realPool(nation: string, year: number): PoolMan[] | null {
  /* Outside the baked window there is nothing to find, and saying so here
     keeps the intent visible: a 2045 squad is generated because nobody knows
     who will be good in 2045, not because a lookup happened to miss. */
  if (year < NATIONAL_POOL_YEARS.first || year > NATIONAL_POOL_YEARS.last) return null;
  const key = `${POOL_ALIAS[nation] ?? nation}|${year}`;
  if (poolCache.has(key)) return poolCache.get(key) ?? null;
  const blob = NATIONAL_POOLS[key];
  if (!blob) { poolCache.set(key, null); return null; }
  const men: PoolMan[] = [];
  for (const entry of blob.split(',')) {
    const [name, pos, ovr] = entry.split(':');
    if (!name || !pos || !ovr) continue;
    men.push({ name, pos, ovr: Number(ovr), group: positionGroup(pos) });
  }
  men.sort((a, b) => b.ovr - a.ovr);
  poolCache.set(key, men.length ? men : null);
  return men.length ? men : null;
}

/** Starters per position group, and the order the best men fill the shirts:
 *  the two centre halves are a nation's best defenders, its best midfielder
 *  plays higher than its holder, and its best forward leads the line. */
const XI_FILL: Record<'GK' | 'DEF' | 'MID' | 'ATT', string[]> = {
  GK: ['GK'],
  DEF: ['CB', 'CB', 'RB', 'LB'],
  MID: ['CM', 'CM', 'CDM'],
  ATT: ['ST', 'RW', 'LW'],
};

/** Where a player's own position sits in the shape. A number ten has no
 *  shirt of his own in a 4-3-3, so he takes a central midfield one and the
 *  sheet calls it what he actually is, the way a manager shifts a shape
 *  around the one player he will not leave out. */
function slotForPosition(pos: string): string {
  if (pos === 'GK') return 'GK';
  if (pos === 'CAM') return 'CM';
  if (pos === 'CF') return 'ST';
  if (XI_SHAPE.some(x => x.slot === pos)) return pos;
  return positionGroup(pos) === 'ATT' ? 'ST' : positionGroup(pos) === 'MID' ? 'CM' : 'CB';
}

/**
 * Build the team sheet. `rivals` is the pool pickSquad already generated for
 * the player's own position group, reused rather than redrawn so the eleven
 * can never contradict the rank the same function just calculated.
 */
function buildStartingXi(
  nation: string, form: PlayerForm | null, myScore: number, myRank: number,
  rivals: number[], called: boolean, year?: number,
): StartingEleven {
  /* Round 259: real men for the years the data covers. The pool is read once
     per sheet and drained per group, so no two shirts carry the same person,
     and a group the pool cannot cover falls back to the generator line by
     line rather than all or nothing. */
  const pool = year === undefined ? null : realPool(nation, year);
  const drawn = new Set<string>();
  /**
   * Hand a group's shirts to the real men who actually play there.
   *
   * The first pass simply took the group's best by rating and let the shirt
   * order fall where it fell, which put Trent Alexander-Arnold at centre half
   * for England. That is the owner's own complaint from a round earlier
   * arriving by another road, so each shirt now asks for its own position
   * first (a right back shirt wants a right back), takes the best man left in
   * the group only if nobody plays there, and comes back empty if the pool
   * has run out, in which case the line is generated as before. Mixing is
   * fine and honest: the data simply does not hold every position for every
   * nation.
   */
  const shirtWants: Record<string, string[]> = {
    GK: ['GK'],
    CB: ['CB'], LB: ['LB', 'LM'], RB: ['RB', 'RM'],
    CDM: ['CDM', 'CM'], CM: ['CM', 'CAM', 'CDM'],
    ST: ['ST', 'CF'], LW: ['LW', 'LM'], RW: ['RW', 'RM'],
  };
  const takeForShirts = (group: 'GK' | 'DEF' | 'MID' | 'ATT', shirts: string[]): (PoolMan | null)[] => {
    if (!pool) return shirts.map(() => null);
    const out: (PoolMan | null)[] = [];
    for (const shirt of shirts) {
      const wants = shirtWants[shirt] ?? [shirt];
      let man: PoolMan | undefined;
      for (const want of wants) {
        man = pool.find(m => m.pos === want && !drawn.has(m.name));
        if (man) break;
      }
      if (!man) man = pool.find(m => m.group === group && !drawn.has(m.name));
      if (man) drawn.add(man.name);
      out.push(man ?? null);
    }
    return out;
  };
  const str = nationStrength(nation);
  const poolTop = 0.65 * str + 28.6;
  const myGroup = form ? positionGroup(form.position) : null;
  const rows: Record<'GK' | 'DEF' | 'MID' | 'ATT', XiMan[]> = { GK: [], DEF: [], MID: [], ATT: [] };
  let mySlot: string | null = null;
  let aheadOfMe: string | null = null;
  /* One running index across the whole eleven so no two men share a name:
     the generator steps its two pools by co-prime strides, so eleven
     consecutive indices are eleven different men. */
  let nameIdx = 0;

  for (const group of ['GK', 'DEF', 'MID', 'ATT'] as const) {
    const shirts = [...XI_FILL[group]];
    const starters = shirts.length;
    /* This group's men, best first. The player's own group reuses the pool
       his rank was measured against; the others are drawn on the same curve
       a nation of this strength produces. */
    const others = group === myGroup
      ? [...rivals].sort((a, b) => b - a)
      : Array.from({ length: starters }, (_, i) => poolTop - i * 1.4 + (Math.random() * 4 - 2)).sort((a, b) => b - a);
    /* The real men for this group's shirts, matched to the position each
       shirt asks for. Their names and their numbers both come off the row:
       nothing here rerates a real player to make a sheet look tidier. */
    const real = takeForShirts(group, shirts);
    const nameFor = (i: number) => real[i]?.name ?? intlName(nation, nameIdx + i);
    const ovrFor = (i: number, fallback: number) => (real[i] ? real[i]!.ovr : Math.round(fallback));

    const iStart = called && group === myGroup && myRank <= starters;
    if (iStart && form) {
      /* He takes the shirt his position says, and the invented men fill the
         rest in order of what they are worth. */
      const want = slotForPosition(form.position);
      const idx = shirts.indexOf(want);
      const takes = idx >= 0 ? idx : shirts.length - 1;
      const label = form.position === 'CAM' || !shirts.includes(form.position) ? form.position : shirts[takes];
      mySlot = label;
      const mine: XiMan = { slot: label, name: 'You', ovr: Math.round(form.overall), me: true };
      /* The real men were matched shirt by shirt, so taking a shirt out has
         to take its man out with it or every name after it shifts one place
         and ends up at the wrong position. */
      shirts.splice(takes, 1);
      real.splice(takes, 1);
      const rest = shirts.map((slot, i) => ({
        slot, name: nameFor(i), ovr: ovrFor(i, others[i] ?? poolTop), me: false,
      }));
      nameIdx += shirts.length;
      rows[group] = [mine, ...rest];
    } else {
      rows[group] = shirts.map((slot, i) => ({
        slot, name: nameFor(i), ovr: ovrFor(i, others[i] ?? poolTop), me: false,
      }));
      nameIdx += shirts.length;
      if (called && group === myGroup) {
        /* In the squad, not in the eleven: the last man in the line is the
           one keeping him out, and the screen names him. */
        aheadOfMe = rows[group][rows[group].length - 1].name;
      }
    }
  }

  /* Render order is the shape, not the pecking order. */
  const order = (group: 'GK' | 'DEF' | 'MID' | 'ATT') => {
    const want = XI_SHAPE.filter(x => x.group === group).map(x => x.slot);
    const men = [...rows[group]];
    const out: XiMan[] = [];
    for (const slot of want) {
      const i = men.findIndex(m => m.slot === slot);
      if (i >= 0) out.push(...men.splice(i, 1));
    }
    return [...out, ...men];
  };

  return {
    formation: '4-3-3',
    gk: order('GK'), def: order('DEF'), mid: order('MID'), att: order('ATT'),
    mySlot, aheadOfMe,
  };
}

/**
 * Being left out of a squad is one of the most real things in football, so it
 * is decided the way a manager decides it: your rating and your form against
 * the other players your nation has in your position. No coin flip. A weak
 * nation will take a 72 rated forward without blinking; Spain will not.
 */
export function pickSquad(nation: string, form: PlayerForm | null, year?: number): SquadCall {
  const grp = form ? positionGroup(form.position) : 'ATT';
  const places = SQUAD_PLACES[grp];
  const str = nationStrength(nation);
  /* The nation's other options in this position, best first. A nation's team
     rating and an individual player's overall are NOT the same scale: Spain
     is a 92 as a team but their best forward is an 88, and a 60 rated nation
     still has a 70 rated best player. This maps one onto the other, so a
     nation's first choice runs from about 88 at the top of the world down to
     about 70 at the bottom, and each name after that is a step weaker. */
  const poolTop = 0.65 * str + 28.6;
  const poolSize = places * 2 + 2;
  const rivals: number[] = [];
  for (let i = 0; i < poolSize - 1; i++) {
    rivals.push(poolTop - i * 1.4 + (Math.random() * 4 - 2));
  }
  if (!form) {
    return {
      called: false, role: null, myRank: poolSize, poolSize, places,
      myScore: 0, cutScore: Math.round(rivals[places - 1] ?? str),
      reason: `You are not in the ${nation} setup.`,
      /* Round 197: the eleven exists whether or not he is in it. Watching
         the team you are not in is the point of being left out. */
      xi: buildStartingXi(nation, null, 0, poolSize, rivals, false, year),
    };
  }
  // Form is the last club season: a rating above 7.0 and goals both help, and
  // a bad year genuinely costs you your place.
  const formBonus = clamp((form.lastRating - 6.9) * 4, -6, 6)
    + clamp(form.lastGoals * 0.12, 0, 4);
  // Managers are loyal to a captain and wary of a body that is going.
  const agePenalty = form.age >= 36 ? 5 : form.age >= 34 ? 2.5 : 0;
  const captainBonus = form.isCaptain ? 3 : 0;
  const myScore = form.overall + formBonus + captainBonus - agePenalty;
  const better = rivals.filter(r => r > myScore).length;
  const myRank = better + 1;
  const cut = [...rivals].sort((a, b) => b - a)[places - 1] ?? 0;
  const called = myRank <= places;
  let role: SquadCall['role'] = null;
  if (called) {
    if (form.isCaptain) role = 'Captain';
    else if (myRank === 1) role = 'Starter';
    else if (myRank <= Math.max(1, Math.ceil(places / 2))) role = 'Starter';
    else role = 'Squad player';
  }
  const reason = called
    ? myRank === 1
      ? `You are ${nation}'s first choice in your position.`
      : `You made it as number ${myRank} of ${places} in your position.`
    : `You came ${myRank}th in your position and ${nation} named ${places}. Not this time.`;
  return {
    called, role, reason, myRank, poolSize, places,
    myScore: Math.round(myScore), cutScore: Math.round(cut),
    xi: buildStartingXi(nation, form, myScore, myRank, rivals, called, year),
  };
}

/**
 * The whole cycle for one summer: qualify, get picked or not, play or watch.
 * Returns null in the two years out of four with no tournament.
 */
export function runInternationalSummer(
  nation: string, year: number, form: PlayerForm | null,
): IntlTournament | null {
  const fmt = tournamentForYear(nation, year);
  if (!fmt) return null;
  const qualifying = runQualifying(nation, fmt, form);
  const squad = qualifying.qualified ? pickSquad(nation, form, year) : null;
  return simulateTournament(nation, fmt, year, qualifying, squad, form);
}

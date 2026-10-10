/**
 * Round 1115: the words of the Squad sheet.
 *
 * Everything only the sheet needs lives here, so the tile on the career page
 * (which loads with the page) carries the numbers and nothing else, and the
 * sentences arrive with the sheet's own chunk. Only SquadSheet.tsx imports
 * this file.
 *
 * Every sentence is the engine's own input read back, never a new opinion,
 * and nobody speaks: there are no quotes here, and the manager is a role
 * that is narrated.
 *
 * TWO PICTURES, NAMED EVERY TIME. Rank is where RATING puts him among the
 * men in his line. The plan (trust) is how many league games the engine
 * means to give him. They usually agree and sometimes do not, so a sentence
 * about the eleven or the last shirt always says "on our ratings", and the
 * games sentence beside it always comes from the plan.
 */
import type { CareerState } from './soccerCareerEngine';
import { projectLeagueApps, ELITE_CLUBS } from './soccerCareerEngine';
import { ordinal } from './soccerCareerLeague';
import { REDUCED_ROLE_GAMES } from './soccerCareerRole';
import { squadCentre } from './soccerClubSquadGen';
import {
  chartFrom, squadView, realSeasons, GROUP_LABEL,
  type SquadAt, type SquadMan, type SquadView, type Trust,
} from './soccerClubSquad';

/** A man inside a sentence: his name, or his role on a sheet with no names. */
export function who(m: SquadMan): string {
  return m.role ? `the ${m.role.toLowerCase()}` : m.name;
}

const clampN = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));

/** The reasons behind the trust figure, each only when its input says so. */
export function trustLines(c: CareerState, at: SquadAt, trust: Trust, myOverall: number = c.overall): string[] {
  const lines: string[] = [];
  const centre = squadCentre(at.tier);
  const d = Math.round(myOverall) - centre;
  if (trust.frozen) {
    lines.push('You stayed when the club wanted you gone, so you are out of the plans: 8 league games at most.');
  } else {
    const a = clampN(trust.band.min + trust.swing + trust.form.swing + (trust.roleSwing ?? 0), 0, 38);
    const b = clampN(trust.band.max + trust.swing + trust.form.swing + (trust.roleSwing ?? 0), 0, 38);
    lines.push(`The plan is about ${a} to ${b} league games if you stay fit.`);
  }
  lines.push(d > 0 ? `You are ${d} above the level this squad expects (${centre}).`
    : d < 0 ? `You are ${-d} under the level this squad expects (${centre}).`
      : `You are right at the level this squad expects (${centre}).`);
  const seasonsAtClub = c.seasons.filter(s => s.club === at.club && s.type === 'playing').length;
  if (ELITE_CLUBS.includes(at.club) && seasonsAtClub === 0 && d <= -5) {
    lines.push('First season at a club this size: the minutes build once you have a year behind you.');
  }
  if (trust.swing > 0) {
    lines.push(`The dressing room has your back: about ${trust.swing} more league games.`);
  } else if (trust.swing < 0) {
    lines.push(`The dressing room has gone cold on you: about ${-trust.swing} fewer league games. Your phone is where that gets fixed.`);
  }
  if (trust.form.row) lines.push(trust.form.reason);
  if (trust.roleSwing < 0) {
    lines.push(`You accepted the new manager's smaller role: ${-trust.roleSwing} fewer planned league games for this season at ${at.club}, before selection limits, injuries and bans.`);
  }
  return lines;
}

/** The headline on the sheet's home screen. Rating first, and it says so. */
export function rankHeadline(view: SquadView): string {
  const label = GROUP_LABEL[view.group];
  if (view.rank === 1) return `On our ratings nobody at ${view.club} is above you among the ${label}.`;
  const place = `On our ratings you are ${ordinal(view.rank)} of ${view.groupSize} ${label}`;
  if (view.inElevenOnRating || !view.keepsMeOut) return `${place}, inside the eleven.`;
  return `${place}. ${cap(who(view.keepsMeOut))} is the last one in ahead of you.`;
}

/** The plan beside the headline: the games, never the rank. */
export function planLine(trust: Trust): string {
  if (trust.frozen) return 'The plan: frozen out, 8 league games at most.';
  const a = clampN(trust.band.min + trust.swing + trust.form.swing + (trust.roleSwing ?? 0), 0, 38);
  const b = clampN(trust.band.max + trust.swing + trust.form.swing + (trust.roleSwing ?? 0), 0, 38);
  return `The plan is about ${a} to ${b} league games.`;
}

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** A season the way the game prints one: "2023/24" starts in 2023. */
export function seasonLabel(startYear: number): string {
  return `${startYear}/${String((startYear + 1) % 100).padStart(2, '0')}`;
}

/** One honest line saying what kind of squad this is. The seasons it names
 *  come from the lib's own window, never from a typed year. */
export function sourceLine(view: SquadView): string {
  const season = seasonLabel(view.year);
  const lastReal = realSeasons().last;
  if (view.source === 'real') {
    /* Release AN, after review: a real row is a selection, never the whole squad list. The bake keeps
       the highest rated men at each exact position, four at most (scripts/bakeClubSquads.mjs, KEEP),
       so a real squad man can be missing (Tottenham 2019/20 holds 19 names), and the rank on this
       sheet is a rank among the men listed. The line says so. */
    return `The real ${view.club} squad of ${season}, rated on the same scale as the rest of the site. It lists up to four players at each position, the highest rated ones, so not everyone at the club is here.`;
  }
  if (view.source === 'roles') {
    return `The game has no checked squad list for ${view.club} in ${season}, so nobody is named: these are the roles, ages and ratings a squad at this level has.`;
  }
  if (view.carried > 0) {
    return `From ${seasonLabel(lastReal + 1)} this is your career's own world. ${view.carried} of the real ${seasonLabel(lastReal)} squad are still here, and the new faces are invented.`;
  }
  return `From ${seasonLabel(lastReal + 1)} this is your career's own world: these ${view.club} teammates are invented for your career.`;
}

export const SOURCE_CHIP: Record<SquadView['source'], string> = {
  real: 'REAL SQUAD',
  roles: 'ROLES ONLY',
  invented: 'INVENTED TEAMMATES',
};

/** A squad of the game's own years that still holds real men: the chip says
 *  both, and every real man in it is tagged where he is listed. */
export function isMixed(view: SquadView): boolean {
  return view.source === 'invented' && view.carried > 0;
}

/** The chip in the sheet's header: what kind of squad this is. */
export function sourceChip(view: SquadView): string {
  return isMixed(view) ? 'REAL AND INVENTED' : SOURCE_CHIP[view.source];
}

/** True for a real man still at the club in a squad that also holds invented ones. */
export function realAmongInvented(view: SquadView, m: SquadMan): boolean {
  return isMixed(view) && !m.me && m.id === undefined;
}

export interface LastSeason {
  club: string;
  year: number;
  loan: boolean;
  leagueApps: number;
  apps: number;
  /** Under 20 league games: the engine's own line between a starter and cover. */
  thin: boolean;
  /**
   * The row lost games after selection. The engine draws his league games
   * first and takes an injury off the season's TOTAL only, so on such a row
   * the league figure is what his place was worth, never games played, and it
   * can be higher than the total. The screen then prints the total alone.
   */
  cut: boolean;
  injuryWeeks: number;
  lines: string[];
}

const count = (n: number, one: string) => `${n} ${one}${n === 1 ? '' : 's'}`;

/** The games line on the Last season screen: only numbers that were played. */
export function lastGamesLine(last: LastSeason): string {
  return last.cut
    ? `${count(last.apps, 'game')} in all competitions`
    : `${count(last.leagueApps, 'league game')}, ${last.apps} in all competitions`;
}

/** Under the games line on a cut row: what the league figure really is. */
export function lastWorthLine(last: LastSeason): string | null {
  if (!last.cut) return null;
  const worth = `your place was worth ${count(last.leagueApps, 'league game')}`;
  return last.injuryWeeks > 0 ? `An injury took games off that total. Before it, ${worth}.` : `Going in, ${worth}.`;
}

/** The one number on the sheet's Last season tile. */
export function lastTileValue(last: LastSeason): string {
  return last.cut ? count(last.apps, 'game') : count(last.leagueApps, 'league game');
}

/**
 * What the saved record says about the season just played. From the saved
 * row only: a freeze is not marked on a row, so it is never claimed for a
 * past season, and an injury is never said to have cost league games (the
 * engine takes injuries off the total, not off the league figure).
 */
export function lastSeason(c: CareerState): LastSeason | null {
  const row = c.seasons[c.seasons.length - 1];
  if (!row || row.type !== 'playing' || row.leagueApps === undefined) return null;
  const centre = squadCentre(row.clubTier);
  const thin = row.leagueApps < 20;
  const cut = (row.injuryWeeks ?? 0) > 0 || row.apps < row.leagueApps;
  const before = c.seasons.filter(s => s !== row && s.club === row.club && s.type === 'playing').length;
  const lines: string[] = [];
  const injured = (row.injuryWeeks ?? 0) >= 4;
  if (injured) {
    lines.push(row.injury ? `${row.injuryWeeks} weeks out injured (${row.injury}).` : `${row.injuryWeeks} weeks out injured.`);
  }
  let explained = false;
  if (row.ovr !== undefined) {
    if (thin) {
      const then = squadView(c, { club: row.club, country: row.clubCountry, tier: row.clubTier, year: row.year }, row.ovr);
      if (then && !then.inElevenOnRating && then.keepsMeOut) {
        lines.push(`On our ratings you went into the season ${ordinal(then.rank)} of ${then.groupSize} ${GROUP_LABEL[then.group]}, and ${who(then.keepsMeOut)} was the last one in ahead of you.`);
        explained = true;
      }
    }
    if (row.ovr < centre - 5) {
      lines.push(`Going into that season you were ${centre - Math.round(row.ovr)} rating points under the level that squad expects.`);
      explained = true;
    }
    if (ELITE_CLUBS.includes(row.club) && before === 0 && row.ovr - centre <= -5) {
      lines.push('It was your first season at a club that size, and the minutes build slowly there.');
      explained = true;
    }
  }
  /* An injury never lowers the league figure, so on its own it explains
     nothing about a thin one: the selection line is still owed. */
  if (thin && !explained) {
    if (row.ovr !== undefined) {
      const band = projectLeagueApps(row.ovr, row.clubTier, row.club, before);
      const range = `your range going in was ${band.min} to ${band.max} league games.`;
      lines.push(injured
        ? `${FALLBACK_AFTER_INJURY}: ${range}`
        : `${FALLBACK_PLAIN}: ${range}`);
    } else {
      lines.push('This season was saved before the game kept the numbers that explain it.');
    }
  }
  return {
    club: row.club, year: row.year, loan: !!row.onLoanFrom,
    leagueApps: row.leagueApps, apps: row.apps, thin, cut, injuryWeeks: row.injuryWeeks ?? 0, lines,
  };
}

/* The two openings of the line a thin season gets when no reason was found. */
const FALLBACK_PLAIN = 'Nothing in your record explains it beyond selection';
const FALLBACK_AFTER_INJURY = 'The injury aside, nothing in your record explains the selection';

/**
 * His place at a club that has made an offer, for the coming season. Not on
 * the page yet (the offer card still reads the real squad only); it ships
 * tested so the round that next owns that card changes one line.
 */
export function offerFit(
  c: CareerState, offer: { club: { name: string; country: string; tier: number } },
): SquadView | null {
  const last = c.seasons[c.seasons.length - 1];
  return squadView(c, {
    club: offer.club.name, country: offer.club.country, tier: offer.club.tier, year: (last?.year ?? 0) + 1,
  });
}

export interface SquadHelpNumbers {
  forwards: number[];
  mine: number;
  atOrAbove: number;
  rank: number;
  groupSize: number;
  centre: number;
  above: number;
  band: { min: number; max: number };
  mid: number;
  pct: number;
  swing: number;
  pctWithSwing: number;
  thinOvr: number;
  under: number;
  thinBand: { min: number; max: number };
  thinRank: number;
}

/** The numbers in the help's worked examples, computed, never typed: a
 *  retune of the engine cannot leave the help wrong. */
export function squadHelpExamples(): SquadHelpNumbers {
  const forwards = [80, 74, 71, 69, 65];
  const men: SquadMan[] = forwards.map((ovr, i) => ({ name: `Forward ${i + 1}`, pos: 'ST', ovr, group: 'ATT' }));
  const mine = 74;
  const thinOvr = 62;
  const chart = chartFrom(men, '', 0, 'ST', mine, 'You');
  const thinChart = chartFrom(men, '', 0, 'ST', thinOvr, 'You');
  const centre = squadCentre(2);
  const band = projectLeagueApps(mine, 2, '', 1);
  const mid = (band.min + band.max) / 2;
  const swing = 2;
  return {
    forwards, mine,
    atOrAbove: chart ? chart.ahead : 0,
    rank: chart ? chart.ahead + 1 : 0,
    groupSize: chart ? chart.men.length : 0,
    centre,
    above: mine - centre,
    band, mid,
    pct: Math.round((mid / 38) * 100),
    swing,
    pctWithSwing: Math.round(((mid + swing) / 38) * 100),
    thinOvr,
    under: centre - thinOvr,
    thinBand: projectLeagueApps(thinOvr, 2, '', 1),
    thinRank: thinChart ? thinChart.ahead + 1 : 0,
  };
}

export interface SquadHelp { title: string; rules: string[]; examples: string[] }

/** The ? button: the rules and four worked examples, in the words shown. */
export function squadHelp(): SquadHelp {
  const n = squadHelpExamples();
  const list = `${n.forwards.slice(0, -1).join(', ')} and ${n.forwards[n.forwards.length - 1]}`;
  const real = realSeasons();
  return {
    title: 'How the squad works',
    rules: [
      'This screen shows what the game already decided. Nothing here changes how many games you play.',
      'Your rank is where your rating puts you among the players in your position group at the club. A teammate on the same rating counts as ahead of you: to pass him you have to be rated higher.',
      'The eleven is the highest rated keeper, four defenders, three midfielders and three forwards on our ratings. It is a picture of the squad, not the manager\'s team sheet.',
      'Trust is how much of the league season the manager plans to give you. It comes from your rating against the level the squad expects, how long you have been at the club, your form in the previous club season, and how the dressing room feels about you. The dressing room part is your phone.'
        /* Release AT: the smaller role moves the same two printed numbers, so the rules say so too. */
        + ` A smaller role you accepted from a new manager takes ${REDUCED_ROLE_GAMES} planned league games off on top, for one season at that club.`,
      `Real, roles or invented: from ${seasonLabel(real.first)} to ${seasonLabel(real.last)} you see the club's real squad of that season where we have it. A real past season with no checked squad list shows roles, ages and ratings, and no names. From ${seasonLabel(real.last + 1)} the world is your career's own: the last real squad carries on, players leave, and every new face is invented. Invented teammates get a year older every summer.`,
      'Form is a small simulation adjustment: at least 10 recorded league games at this club last season, with a rating of 7.6 or more, adds up to 2 league games to the plan. A rating of 6.4 or less takes away up to 2. Other ratings leave it alone. A move, a gap or an unplayed season carries no form adjustment. The frozen-out limit still applies.',
    ],
    examples: [
      `Rank. You are a ${n.mine} rated striker and the club's forwards are ${list}. ${n.atOrAbove} of them are rated ${n.mine} or more (a tie goes to the other ${n.mine}), so on our ratings you are ${ordinal(n.rank)} of ${n.groupSize} forwards: the last one into the front three.`,
      `Trust. At a club whose squad level is ${n.centre}, a ${n.mine} is ${n.above} above it. The plan for that is ${n.band.min} to ${n.band.max} league games, and ${n.mid} of 38 is trust ${n.pct}%. A dressing room that has your back adds ${n.swing} games: ${n.pctWithSwing}%.`,
      `A thin season. At ${n.thinOvr} in that same squad you are ${n.under} under the level and ${ordinal(n.thinRank)} of ${n.groupSize} forwards on our ratings. The plan for that is ${n.thinBand.min} to ${n.thinBand.max} league games, and Last season tells you why.`,
      'Form. Last season at this club you played 24 league games and rated 7.8. A plan of 20 to 30 games becomes 22 to 32 before dressing room effects, injuries or a freeze. The same appearances with a 6.2 rating make it 18 to 28. At a new club neither result carries over.',
    ],
  };
}

/* ─── Round 469: the fans and the headlines, one rule for every career ──────

   Round 319, his review item 11: "Soccer Career social gram tells a goalkeeper
   to score more goals." The fix was three lines inside PhonePanel.tsx: what
   the fans nag you for is the thing your position is actually judged on. It
   was the right rule and it lived in a React component, where the NFL career
   could not reach it, and the NFL career had no fans at all.

   So the rule is here now, as a table per sport, and both careers read it.
   The soccer strings are the Round 319 strings, verbatim, so the flagship's
   phone does not change by a character. The NFL strings are new and they
   follow the same law: a corner is never asked for touchdowns, a kicker is
   never asked for tackles, a quarterback is never asked for sacks.

   scripts/simCareerParity.mjs holds it: every line these functions can print
   for every position in both sports is checked against a list of the stat
   words that position is never judged on.

   Legal shape, same as everywhere: the fans are unnamed, the player is
   fictional, the rival is generated. No real person is quoted or described.
*/

export type SocialSport = 'soccer' | 'nfl';

/* ─── what the fans ask for ──────────────────────────────────────────────── */

/** Round 319, unchanged: the flagship's four asks, by position group. */
function soccerAsk(pos: string): string {
  if (pos === 'GK') return 'More clean sheets please 🙏';
  if (pos === 'CB' || pos === 'LB' || pos === 'RB' || pos === 'LWB' || pos === 'RWB') return 'Lock it down at the back please 🙏';
  if (pos === 'CDM' || pos === 'CM') return 'Run that midfield please 🙏';
  return 'More goals please 🙏';
}

/** The NFL asks. Each one names the stat that position's season line
 *  actually carries in nflMyCareer.ts, and nothing else. */
function nflAsk(pos: string): string {
  switch (pos) {
    case 'QB': return 'More touchdowns please 🙏';
    case 'RB': return 'Give him the ball more please 🙏';
    case 'WR':
    case 'TE': return 'Throw him the ball please 🙏';
    case 'LB': return 'More tackles please 🙏';
    case 'CB': return 'Lock down that side please 🙏';
    case 'EDGE': return 'More sacks please 🙏';
    case 'K': return 'Just make the kicks please 🙏';
    default: return 'Big season next year please 🙏';
  }
}

/** The one line the fans nag you with, by sport and position. */
export function askForMore(sport: SocialSport, pos: string): string {
  return sport === 'soccer' ? soccerAsk(pos) : nflAsk(pos);
}

export interface FanFacts {
  pos: string;
  /** 0 to 100. Karma in the flagship, the fanbase in the NFL. */
  standing: number;
  /** Already formatted by the sport: "1.2M" or "340K". */
  followers: string;
}

/**
 * Three comments under the latest post, tiered by standing. The soccer set
 * is the Round 130 set that has been on the phone since; the NFL set says
 * the same things in a jersey and on a Sunday.
 */
export function fanComments(sport: SocialSport, f: FanFacts): string[] {
  const ask = askForMore(sport, f.pos);
  if (sport === 'soccer') {
    if (f.standing >= 70) return ['Best in the world AND a good person 😭', 'My kid has your poster up. Never change', `${f.followers} followers and still humble. Rare.`];
    if (f.standing >= 50) return ['Decent season tbh', 'We rate you around here', ask];
    if (f.standing >= 30) return ['Talented but man the attitude...', 'Rooting for the old you', 'Focus on football maybe?'];
    return ["Can't support this guy anymore", 'Talent wasted on a villain', 'The boos on Saturday? Deserved.'];
  }
  if (f.standing >= 70) return ['Best in the league AND a good person 😭', 'My kid has your jersey. Never change', `${f.followers} followers and still humble. Rare.`];
  if (f.standing >= 50) return ['Decent season tbh', 'We rate you around here', ask];
  if (f.standing >= 30) return ['Talented but man the attitude...', 'Rooting for the old you', 'Focus on football maybe?'];
  return ["Can't support this guy anymore", 'Talent wasted on a villain', 'The boos on Sunday? Deserved.'];
}

/* ─── followers, for a sport that never counted them ─────────────────────── */

/**
 * The flagship counts followers on the save. The NFL career only ever had a
 * fanbase meter, so the number on its gram is read off that meter and the
 * career behind it: the meter sets the scale, every season, ring and award
 * adds to it, and nothing about it is random, so the same save always shows
 * the same number. In millions.
 */
export function followersFromFanbase(f: { fanbase: number; seasons: number; rings: number; awards: number }): number {
  const base = Math.pow(Math.max(0, f.fanbase) / 100, 2.2) * 6;
  const career = f.seasons * 0.08 + f.rings * 0.9 + f.awards * 0.5;
  return Math.round((0.02 + base + career) * 100) / 100;
}

export function fmtFollowers(m: number): string {
  return m >= 1 ? `${m.toFixed(1)}M` : `${Math.round(m * 1000)}K`;
}

/* ─── the headlines a season writes ─────────────────────────────────────── */

/** Only the columns the headlines read. Structural, like AwardSeasonLine in
 *  careerAwards.ts, so this file imports nothing from an engine. */
export interface HeadlineLine {
  games: number;
  passYds?: number; passTd?: number; ints?: number;
  rushYds?: number; rushTd?: number;
  rec?: number; recYds?: number; recTd?: number;
  tackles?: number; sacks?: number; picks?: number; passDef?: number; forcedFum?: number;
  fgMade?: number; fgAtt?: number; longFg?: number;
  awards: string[];
  teamResult: string;
}

export interface NflHeadlineFacts {
  name: string;
  /** The team's full label, era aware. */
  team: string;
  pos: string;
  line: HeadlineLine;
  /** Games missed hurt, 0 when the season was whole. */
  missed: number;
  role?: 'starter' | 'backup';
}

const n = (v: number | undefined): number => v ?? 0;
const fmtN = (v: number): string => v.toLocaleString('en-US');

/**
 * The stat headline, position aware. Every number in it is the season line's
 * own, and the noun beside it is the stat that position is judged on.
 * Returns null when the season was too short to be a story.
 */
function statHeadline(f: NflHeadlineFacts): string | null {
  const { name, line, pos } = f;
  if (line.games <= 0) return null;
  if (pos === 'QB') {
    if (n(line.ints) >= 15 && n(line.passTd) < n(line.ints)) return `${n(line.ints)} interceptions. ${name}'s turnover problem is the story`;
    if (n(line.passYds) >= 5000) return `${name} throws for ${fmtN(n(line.passYds))} yards, a 5,000 yard season`;
    return `${name} throws for ${fmtN(n(line.passYds))} yards and ${n(line.passTd)} touchdowns`;
  }
  if (pos === 'RB') {
    if (n(line.rushYds) >= 2000) return `${name} runs for ${fmtN(n(line.rushYds))}. A 2,000 yard season`;
    return `${name} runs for ${fmtN(n(line.rushYds))} yards and ${n(line.rushTd)} touchdowns`;
  }
  if (pos === 'WR' || pos === 'TE') {
    return `${name} hauls in ${n(line.rec)} catches for ${fmtN(n(line.recYds))} yards`;
  }
  if (pos === 'LB') {
    return n(line.sacks) >= 5
      ? `${n(line.tackles)} tackles and ${n(line.sacks)} sacks for ${name}`
      : `${name} racks up ${n(line.tackles)} tackles`;
  }
  if (pos === 'CB') {
    return n(line.picks) >= 4
      ? `${n(line.picks)} interceptions. ${name} is a no throw zone`
      : `${name} breaks up ${n(line.passDef)} passes`;
  }
  if (pos === 'EDGE') {
    return n(line.sacks) >= 20
      ? `${n(line.sacks)} sacks. ${name} lives in the backfield`
      : `${n(line.sacks)} sacks for ${name}`;
  }
  if (pos === 'K') {
    return n(line.fgAtt) > 0 && n(line.fgMade) === n(line.fgAtt)
      ? `${name} does not miss: ${n(line.fgMade)} of ${n(line.fgAtt)} field goals`
      : `${name} makes ${n(line.fgMade)} of ${n(line.fgAtt)} field goals`;
  }
  return null;
}

/**
 * Up to three headlines for the season just played, the stat line first.
 * Deterministic: no rng, so the same season always writes the same paper.
 */
export function nflSeasonHeadlines(f: NflHeadlineFacts): string[] {
  const out: string[] = [];
  const { name, team, line } = f;
  if (line.teamResult === 'SUSPENDED') return [`${name} sits out the year on the suspended list`];
  const stat = statHeadline(f);
  if (stat) out.push(stat);
  if (line.teamResult === 'WON THE SUPER BOWL') out.push(`${team} win the Super Bowl. ${name} has a ring`);
  else if (line.teamResult === 'Lost the Super Bowl') out.push(`${team} fall one game short of the Super Bowl`);
  if (line.awards.includes('MVP')) out.push(`${name} named league MVP`);
  else if (line.awards.includes('Defensive Player of the Year')) out.push(`${name} named Defensive Player of the Year`);
  else if (line.awards.includes('All-Pro')) out.push(`${name} makes first team All-Pro`);
  else if (line.awards.some(a => a.endsWith('Rookie of the Year'))) out.push(`${name} takes Rookie of the Year`);
  if (out.length < 3 && f.missed >= 4) out.push(`Injury cost ${name} ${f.missed} games this season`);
  if (out.length < 3 && f.role === 'backup') out.push(`${name} spends another year on the bench`);
  return out.slice(0, 3);
}

/** Keep the newest lines on the save, oldest dropped. */
export const MAX_HEADLINES = 12;
export function pushHeadlines(prev: string[] | undefined, lines: string[]): string[] {
  return [...lines.slice().reverse(), ...(prev ?? [])].slice(0, MAX_HEADLINES);
}

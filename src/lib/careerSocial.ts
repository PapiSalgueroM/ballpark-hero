/* ─── Round 469: the fans and the headlines, one rule for every career ──────
   ─── Round 470: and now for all five of them ───────────────────────────────

   Round 319, his review item 11: "Soccer Career social gram tells a goalkeeper
   to score more goals." The fix was three lines inside PhonePanel.tsx: what
   the fans nag you for is the thing your position is actually judged on. It
   was the right rule and it lived in a React component, where the other
   careers could not reach it, and four of the five had no fans at all.

   So the rule is here now, as a table per sport, and every career reads it.
   The soccer strings are the Round 319 strings, verbatim, so the flagship's
   phone does not change by a character. The NFL strings are Round 469's. The
   NBA, MLB and NHL strings are Round 470's and they follow the same law: a
   centre is never told to shoot threes, a goalie is never told to score, a
   catcher is never told to steal bases, and no line ever names a stat the
   sport's own season line does not carry.

   THE SHAPE, and why it is a table rather than five functions. Round 426 is
   the counter example this repo keeps quoting: the same idea written twice,
   so a bug fixed in one sport lived on in the other. There is one comment
   ladder here, one paper writer, and what changes per sport is data:

     VOICE   four lines that name the sport out loud (what a kid has of
             yours, what the fans call the game, where the boos came from)
             plus that sport's position asks.
     PAPER   the teamResult that means a title, the awards worth a back page
             in order, and the one function that reads a season line into a
             stat headline.

   scripts/simCareerParity.mjs holds it: every line these functions can print
   for every position in all five sports is checked against a list of the stat
   words that position is never judged on, and it counts the branches in this
   file so a new position or a new headline cannot be added without the
   forbidden list growing to cover it.

   Legal shape, same as everywhere: the fans are unnamed, the player is
   fictional, the rival is generated. No real person is quoted or described.
*/

export type SocialSport = 'soccer' | 'nfl' | 'nba' | 'mlb' | 'nhl';

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

/** The NBA asks. The season line carries points, rebounds and assists and
 *  nothing else, so nothing else is ever asked for. */
function nbaAsk(pos: string): string {
  switch (pos) {
    case 'PG': return 'More assists please 🙏';
    case 'SG': return 'More buckets please 🙏';
    case 'SF': return 'Score it and rebound it please 🙏';
    case 'PF': return 'Crash the glass please 🙏';
    case 'C': return 'Own the glass please 🙏';
    default: return 'Big season next year please 🙏';
  }
}

/** The MLB asks. Pitchers are never nagged for a bat and hitters are never
 *  nagged for an arm, and the three spots with no speed in them (catcher,
 *  first base, designated hitter) are never nagged for steals. */
function mlbAsk(pos: string): string {
  switch (pos) {
    case 'SP': return 'Go deeper into games please 🙏';
    case 'RP': return 'Shut the door please 🙏';
    case 'C': return 'More pop from behind the plate please 🙏';
    case '1B':
    case '3B':
    case 'LF':
    case 'RF':
    case 'DH': return 'More home runs please 🙏';
    case '2B':
    case 'SS': return 'Get on base please 🙏';
    case 'CF': return 'Get on and make something happen please 🙏';
    default: return 'Big season next year please 🙏';
  }
}

/** The NHL asks. The goalie is asked for saves and only saves. */
function nhlAsk(pos: string): string {
  switch (pos) {
    case 'C': return 'More points please 🙏';
    case 'LW':
    case 'RW': return 'Bury more chances please 🙏';
    case 'D': return 'Move the puck and keep it out please 🙏';
    case 'G': return 'Just make the saves please 🙏';
    default: return 'Big season next year please 🙏';
  }
}

/**
 * The four lines that name the sport out loud, plus its position asks. Every
 * other line the fans say is the same in all five games, on purpose: they are
 * about the person, not the sport.
 */
interface SportVoice {
  /** The top tier's opener. */
  best: string;
  /** The top tier's second line: the thing a kid has of yours. */
  keepsake: string;
  /** The third tier's closer, which says the sport by name. */
  focus: string;
  /** The bottom tier's closer: where and when the boos came. */
  boos: string;
  ask: (pos: string) => string;
}

const VOICE: Record<SocialSport, SportVoice> = {
  soccer: {
    best: 'Best in the world AND a good person 😭',
    keepsake: 'My kid has your poster up. Never change',
    focus: 'Focus on football maybe?',
    boos: 'The boos on Saturday? Deserved.',
    ask: soccerAsk,
  },
  nfl: {
    best: 'Best in the league AND a good person 😭',
    keepsake: 'My kid has your jersey. Never change',
    focus: 'Focus on football maybe?',
    boos: 'The boos on Sunday? Deserved.',
    ask: nflAsk,
  },
  nba: {
    best: 'Best in the league AND a good person 😭',
    keepsake: 'My kid wears your number at the park. Never change',
    focus: 'Focus on basketball maybe?',
    boos: 'The boos at home? Deserved.',
    ask: nbaAsk,
  },
  mlb: {
    best: 'Best in the league AND a good person 😭',
    keepsake: 'My kid has your card on the wall. Never change',
    focus: 'Focus on baseball maybe?',
    boos: 'The boos at the ballpark? Deserved.',
    ask: mlbAsk,
  },
  nhl: {
    best: 'Best in the league AND a good person 😭',
    keepsake: 'My kid has your sweater. Never change',
    focus: 'Focus on hockey maybe?',
    boos: 'The boos at the barn? Deserved.',
    ask: nhlAsk,
  },
};

/** The one line the fans nag you with, by sport and position. */
export function askForMore(sport: SocialSport, pos: string): string {
  return VOICE[sport].ask(pos);
}

export interface FanFacts {
  pos: string;
  /** 0 to 100. Karma in the flagship, the fanbase in the American careers. */
  standing: number;
  /** Already formatted by the sport: "1.2M" or "340K". */
  followers: string;
}

/**
 * Three comments under the latest post, tiered by standing. The ladder is the
 * Round 130 one that has been on the flagship's phone since; only the four
 * lines that name a sport change from game to game.
 */
export function fanComments(sport: SocialSport, f: FanFacts): string[] {
  const v = VOICE[sport];
  if (f.standing >= 70) return [v.best, v.keepsake, `${f.followers} followers and still humble. Rare.`];
  if (f.standing >= 50) return ['Decent season tbh', 'We rate you around here', askForMore(sport, f.pos)];
  if (f.standing >= 30) return ['Talented but man the attitude...', 'Rooting for the old you', v.focus];
  return ["Can't support this guy anymore", 'Talent wasted on a villain', v.boos];
}

/* ─── followers, for a sport that never counted them ─────────────────────── */

/**
 * The flagship counts followers on the save. The American careers only ever
 * had a fanbase meter, so the number on their gram is read off that meter and
 * the career behind it: the meter sets the scale, every season, ring and award
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

/** The three columns every sport's season line has. Structural, like
 *  AwardSeasonLine in careerAwards.ts, so this file imports nothing from an
 *  engine. */
export interface PaperLine {
  games: number;
  awards: string[];
  teamResult: string;
}

/** Only the columns the NFL headlines read. */
export interface HeadlineLine extends PaperLine {
  passYds?: number; passTd?: number; ints?: number;
  rushYds?: number; rushTd?: number;
  rec?: number; recYds?: number; recTd?: number;
  tackles?: number; sacks?: number; picks?: number; passDef?: number; forcedFum?: number;
  fgMade?: number; fgAtt?: number; longFg?: number;
}

/** Only the columns the NBA headlines read. */
export interface NbaHeadlineLine extends PaperLine {
  ppg: number; rpg: number; apg: number;
}

/** Only the columns the MLB headlines read. */
export interface MlbHeadlineLine extends PaperLine {
  avg?: number; hr?: number; rbi?: number; sb?: number;
  wins?: number; lossesP?: number; era?: number; so?: number; saves?: number;
}

/** Only the columns the NHL headlines read. */
export interface NhlHeadlineLine extends PaperLine {
  goals?: number; assists?: number; points?: number;
  wins?: number; svpct?: number;
}

export interface PaperFacts<L extends PaperLine> {
  name: string;
  /** The team's full label, era aware. */
  team: string;
  pos: string;
  line: L;
  /** Games missed hurt, 0 when the season was whole or when the gap says
   *  nothing about health (a bench role, a suspension). */
  missed: number;
  role?: 'starter' | 'backup';
}

/** What a sport hands the paper. Words and thresholds, never a rule. */
export interface SeasonPaper<L extends PaperLine> {
  /** The teamResult string that means the title, and the one that means the
   *  final was lost. */
  title: string;
  runnerUp: string;
  titleLine: (team: string, name: string) => string;
  runnerUpLine: (team: string) => string;
  /** The teamResult that means a year served on the suspended list. */
  suspendedResult: string;
  suspendedLine: (name: string) => string;
  /** The awards worth a back page, in order. The first match wins, so the
   *  biggest goes first. */
  awards: { when: (awards: string[]) => boolean; line: (name: string) => string }[];
  /** How many games missed is a story in this sport, by position: a starting
   *  pitcher's season is 32 starts and a skater's is 82. */
  missedFloor: (pos: string) => number;
  bench: (name: string) => string;
  /** The stat headline, position aware. Every number in it is the season
   *  line's own and the noun beside it is a stat that position is judged on.
   *  Null when the season was too short to be a story. */
  stat: (name: string, pos: string, line: L) => string | null;
}

const n = (v: number | undefined): number => v ?? 0;
const fmtN = (v: number): string => v.toLocaleString('en-US');
/** A baseball average or a save percentage, written the way the sport writes
 *  it: no leading zero, three digits. */
const dec3 = (v: number): string => `.${String(Math.round(v * 1000)).padStart(3, '0')}`;

/**
 * Up to three headlines for the season just played, the stat line first.
 * Deterministic: no rng, so the same season always writes the same paper.
 * One ladder for all five sports; what differs is the paper handed in.
 */
export function seasonHeadlines<L extends PaperLine>(f: PaperFacts<L>, paper: SeasonPaper<L>): string[] {
  const out: string[] = [];
  const { name, team, line } = f;
  if (line.teamResult === paper.suspendedResult) return [paper.suspendedLine(name)];
  const stat = paper.stat(name, f.pos, line);
  if (stat) out.push(stat);
  if (line.teamResult === paper.title) out.push(paper.titleLine(team, name));
  else if (line.teamResult === paper.runnerUp) out.push(paper.runnerUpLine(team));
  for (const a of paper.awards) {
    if (a.when(line.awards)) { out.push(a.line(name)); break; }
  }
  if (out.length < 3 && f.missed >= paper.missedFloor(f.pos)) out.push(`Injury cost ${name} ${f.missed} games this season`);
  if (out.length < 3 && f.role === 'backup') out.push(paper.bench(name));
  return out.slice(0, 3);
}

/* ─── the NFL paper (Round 469, unchanged output) ────────────────────────── */

function nflStat(name: string, pos: string, line: HeadlineLine): string | null {
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

export const NFL_PAPER: SeasonPaper<HeadlineLine> = {
  title: 'WON THE SUPER BOWL',
  runnerUp: 'Lost the Super Bowl',
  titleLine: (team, name) => `${team} win the Super Bowl. ${name} has a ring`,
  runnerUpLine: team => `${team} fall one game short of the Super Bowl`,
  suspendedResult: 'SUSPENDED',
  suspendedLine: name => `${name} sits out the year on the suspended list`,
  awards: [
    { when: a => a.includes('MVP'), line: name => `${name} named league MVP` },
    { when: a => a.includes('Defensive Player of the Year'), line: name => `${name} named Defensive Player of the Year` },
    { when: a => a.includes('All-Pro'), line: name => `${name} makes first team All-Pro` },
    { when: a => a.some(x => x.endsWith('Rookie of the Year')), line: name => `${name} takes Rookie of the Year` },
  ],
  missedFloor: () => 4,
  bench: name => `${name} spends another year on the bench`,
  stat: nflStat,
};

export type NflHeadlineFacts = PaperFacts<HeadlineLine>;

export function nflSeasonHeadlines(f: NflHeadlineFacts): string[] {
  return seasonHeadlines(f, NFL_PAPER);
}

/* ─── the NBA paper ──────────────────────────────────────────────────────────
   Points, rebounds and assists are the whole season line, so they are the
   whole paper. A guard is never written up for rim protection and a big is
   never written up for running the offence, and no line names a three, a
   block or a steal, because nbaMyCareer.ts does not count one. */

function nbaStat(name: string, pos: string, line: NbaHeadlineLine): string | null {
  if (line.games <= 0) return null;
  const { ppg, rpg, apg } = line;
  if (ppg >= 10 && rpg >= 10 && apg >= 10) {
    return `${name} averages a triple double: ${ppg} points, ${rpg} rebounds, ${apg} assists`;
  }
  if (pos === 'PG') {
    return apg >= 8
      ? `${name} hands out ${apg} assists a night`
      : `${name} averages ${ppg} points and ${apg} assists a night`;
  }
  if (pos === 'SG' || pos === 'SF') {
    return ppg >= 30
      ? `${ppg} a night. ${name} had a scoring season people will remember`
      : `${name} averages ${ppg} points and ${rpg} rebounds a night`;
  }
  if (pos === 'PF' || pos === 'C') {
    return rpg >= 12
      ? `${name} pulls down ${rpg} rebounds a night`
      : `${name} goes for ${ppg} points and ${rpg} rebounds a night`;
  }
  return null;
}

export const NBA_PAPER: SeasonPaper<NbaHeadlineLine> = {
  title: 'WON THE NBA FINALS',
  runnerUp: 'Lost the NBA Finals',
  titleLine: (team, name) => `${team} win the title. ${name} has a ring`,
  runnerUpLine: team => `${team} lose the Finals with the trophy in the building`,
  suspendedResult: 'SUSPENDED',
  suspendedLine: name => `${name} sits out the year on the suspended list`,
  awards: [
    { when: a => a.includes('MVP'), line: name => `${name} named league MVP` },
    { when: a => a.includes('Finals MVP'), line: name => `${name} takes Finals MVP` },
    { when: a => a.includes('Defensive Player of the Year'), line: name => `${name} named Defensive Player of the Year` },
    { when: a => a.includes('Scoring Champion'), line: name => `${name} finishes the year as scoring champion` },
    { when: a => a.includes('Rookie of the Year'), line: name => `${name} takes Rookie of the Year` },
    { when: a => a.includes('All-NBA'), line: name => `${name} makes All-NBA` },
  ],
  missedFloor: () => 15,
  bench: name => `${name} spends another year in the second unit`,
  stat: nbaStat,
};

export function nbaSeasonHeadlines(f: PaperFacts<NbaHeadlineLine>): string[] {
  return seasonHeadlines(f, NBA_PAPER);
}

/* ─── the MLB paper ──────────────────────────────────────────────────────────
   Two different sports share this locker room. A pitcher's line has an ERA, a
   strikeout count and saves and no bat at all; a hitter's has an average, home
   runs, runs driven in and steals and no arm at all, so neither is ever
   written up in the other one's numbers. Catchers, first basemen and
   designated hitters are never written up for their legs. */

/** The three spots the sim gives almost no speed to (MLB_POS_PROFILE has them
 *  at 0.3, 0.4 and 0.25), so a steal is never their story. */
const MLB_NO_STEALS = new Set(['C', '1B', 'DH']);

function mlbStat(name: string, pos: string, line: MlbHeadlineLine): string | null {
  if (line.games <= 0) return null;
  if (pos === 'SP') {
    if (n(line.era) > 0 && n(line.era) <= 2.5) return `${name} finishes the year with a ${n(line.era).toFixed(2)} ERA`;
    if (n(line.wins) >= 18) return `${n(line.wins)} wins for ${name}`;
    return `${name} goes ${n(line.wins)} and ${n(line.lossesP)} with ${fmtN(n(line.so))} strikeouts`;
  }
  if (pos === 'RP') {
    if (n(line.saves) >= 30) return `${name} nails down ${n(line.saves)} saves`;
    return `${name} works ${line.games} games out of the bullpen with a ${n(line.era).toFixed(2)} ERA`;
  }
  if (n(line.hr) >= 45) return `${n(line.hr)} home runs for ${name}`;
  if (n(line.avg) >= 0.32) return `${name} hits ${dec3(n(line.avg))} over a full season`;
  if (!MLB_NO_STEALS.has(pos) && n(line.sb) >= 40) return `${n(line.sb)} stolen bases for ${name}`;
  return `${name} hits ${dec3(n(line.avg))} with ${n(line.hr)} home runs and ${n(line.rbi)} driven in`;
}

export const MLB_PAPER: SeasonPaper<MlbHeadlineLine> = {
  title: 'WON THE WORLD SERIES',
  runnerUp: 'Lost the World Series',
  titleLine: (team, name) => `${team} win the World Series. ${name} has a ring`,
  runnerUpLine: team => `${team} lose the World Series and the parade goes elsewhere`,
  suspendedResult: 'SUSPENDED',
  suspendedLine: name => `${name} sits out the year on the suspended list`,
  awards: [
    { when: a => a.includes('MVP'), line: name => `${name} named league MVP` },
    { when: a => a.includes('Cy Young'), line: name => `${name} takes the Cy Young` },
    { when: a => a.includes('Rookie of the Year'), line: name => `${name} takes Rookie of the Year` },
    { when: a => a.includes('Batting Title'), line: name => `${name} wins the batting title` },
    { when: a => a.includes('Home Run Champion'), line: name => `${name} leads the league in home runs` },
    { when: a => a.includes('Saves Leader'), line: name => `${name} leads the league in saves` },
    { when: a => a.includes('All-Star'), line: name => `${name} makes the All-Star team` },
  ],
  /* A starter's season is about 32 starts and a reliever's about 62
     appearances, so the same gap means very different things. */
  missedFloor: pos => (pos === 'SP' ? 8 : pos === 'RP' ? 16 : 30),
  bench: name => `${name} spends another year off the everyday lineup card`,
  stat: mlbStat,
};

export function mlbSeasonHeadlines(f: PaperFacts<MlbHeadlineLine>): string[] {
  return seasonHeadlines(f, MLB_PAPER);
}

/* ─── the NHL paper ──────────────────────────────────────────────────────────
   The goalie's line is wins and a save percentage and nothing else, so he is
   never written up for a goal, a point or an assist. Skaters are never written
   up in the crease. */

function nhlStat(name: string, pos: string, line: NhlHeadlineLine): string | null {
  if (line.games <= 0) return null;
  if (pos === 'G') {
    if (n(line.wins) >= 40) return `${n(line.wins)} wins for ${name}`;
    if (n(line.svpct) >= 0.925) return `${name} finishes at ${dec3(n(line.svpct))} and the crease is his`;
    return `${name} wins ${n(line.wins)} of ${line.games} in the crease`;
  }
  if (pos === 'D') {
    return `${name} puts up ${n(line.assists)} assists from the blue line`;
  }
  if (n(line.goals) >= 50) return `${n(line.goals)} goals for ${name}`;
  if (n(line.points) >= 100) return `${name} finishes on ${n(line.points)} points`;
  return `${name} goes ${n(line.goals)}G ${n(line.assists)}A ${n(line.points)}P`;
}

export const NHL_PAPER: SeasonPaper<NhlHeadlineLine> = {
  title: 'WON THE STANLEY CUP',
  runnerUp: 'Lost the Cup Final',
  titleLine: (team, name) => `${team} lift the Cup. ${name} gets his day with it`,
  runnerUpLine: team => `${team} lose the Cup Final and shake hands anyway`,
  suspendedResult: 'SUSPENDED',
  suspendedLine: name => `${name} sits out the year on the suspended list`,
  awards: [
    { when: a => a.includes('Hart'), line: name => `${name} wins the Hart Trophy` },
    { when: a => a.includes('Vezina'), line: name => `${name} wins the Vezina Trophy` },
    { when: a => a.includes('Norris'), line: name => `${name} wins the Norris Trophy` },
    { when: a => a.includes('Conn Smythe'), line: name => `${name} takes the Conn Smythe` },
    { when: a => a.includes('Calder Trophy'), line: name => `${name} takes the Calder Trophy` },
    { when: a => a.includes('Art Ross'), line: name => `${name} wins the Art Ross` },
    { when: a => a.includes('Rocket Richard'), line: name => `${name} wins the Rocket Richard` },
    { when: a => a.includes('All-Star'), line: name => `${name} makes the All-Star team` },
  ],
  missedFloor: pos => (pos === 'G' ? 12 : 15),
  bench: name => `${name} spends another year down the lineup`,
  stat: nhlStat,
};

export function nhlSeasonHeadlines(f: PaperFacts<NhlHeadlineLine>): string[] {
  return seasonHeadlines(f, NHL_PAPER);
}

/** Keep the newest lines on the save, oldest dropped. */
export const MAX_HEADLINES = 12;
export function pushHeadlines(prev: string[] | undefined, lines: string[]): string[] {
  return [...lines.slice().reverse(), ...(prev ?? [])].slice(0, MAX_HEADLINES);
}

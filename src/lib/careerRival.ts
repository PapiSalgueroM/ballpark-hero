/* ─── Round 104: the career rival, in every sport ───

   Soccer Career has had a rival since Round 62: another player drafted the
   same year as you, whose whole career runs alongside yours, so every season
   has a scoreboard beyond your own numbers. It is the best storytelling
   device in that game and the four US career sims have nothing like it. You
   put up 27 a night and there was no one to be measured against.

   This is that idea, applied to all four and improved on it in three ways:

   1. The rival is simulated with the SAME machinery you are, so he has
      career years and lost years too. In the soccer version he was a smooth
      curve; here he is as lumpy as a real player, which means the head to
      head genuinely swings.
   2. The head to head is CUMULATIVE and kept, so at retirement there is a
      real record between you rather than a vague sense of who was better.
   3. He is a person with a career shape: he can break out, fall off a cliff,
      win a ring before you, and retire before you do. That is what makes
      beating him feel like something.

   The rival is fictional, like your own player, for the same reason: no real
   person's likeness or career is being simulated.
*/

import { seasonSwing } from './careerVariance';
import { keyedRng } from './keyedRng';

export type RivalSport = 'mlb' | 'nba' | 'nfl' | 'nhl';

export interface CareerRival {
  name: string;
  pos: string;
  team: string;
  ovr: number;
  pot: number;
  age: number;
  rings: number;
  /** Seasons he beat me, and seasons I beat him. */
  hisYears: number;
  myYears: number;
  retired: boolean;
  /** What he put up last season, ready to print. */
  lastLine: string;
  /** His score last season, so the comparison is on the record. */
  lastScore: number;
  /** Round 1112: the season his last line belongs to, and whether that season made the sport's roster honour
   *  (Round 1227 widened the meaning, not the name, because NBA saves hold the field: the All-Star roster in the
   *  NBA, MLB and the NHL, the first team All-Pro in the NFL). Only a sport that plays its rival through a
   *  RivalSeasonPlay writes them; a save from before has neither. */
  lastYear?: number;
  lastAllStar?: boolean;
}

/** Round 1112: what a sport's own rival season hands back. `line` is printed as it stands; `score` is that
 *  line scored the way the caller scores the player's, because the two are compared and nothing else is. */
export interface RivalSeasonResult { line: string; score: number; year?: number; allStar?: boolean }
/**
 * Round 1112: the one per sport hook. A sport whose rival plays on the player's OWN stat line hands this to
 * judgeRivalSeason, and the built in line for that sport below is not used. It gets the rival, his form for
 * the season (rating plus the season's swing, drawn here exactly as it always was) and the season's stream.
 * THE RULE FOR A SPORT THAT MOVES OVER: take from `rng` exactly the draws that sport's built in line took (the
 * NBA's took one), and key everything else off the rival (keyedRng), so the player's own stream does not move
 * by one draw. The NBA binding is nbaRivalSeason in nbaMyCareer.ts.
 */
export type RivalSeasonPlay = (r: CareerRival, form: number, rng: () => number) => RivalSeasonResult;

/* ─── Round 1227: what every sport's rival season shares ──────────────────────

   Round 1112 wrote the NBA's binding by hand. These three are that binding's
   own lines, lifted so the other sports bind to the same law instead of a
   copy of it, and the NBA calls them (proven byte equal: scripts/
   simUsRivalSense.mjs section P1, scripts/simNbaAwardsSense.mjs section R). */

/**
 * THE DRAW COUNT LAW. How many draws of the season's stream a sport's rival season takes after the swing: what
 * that sport's built in line took (read off simRivalSeason below: the NHL's goals and assists, MLB's home runs
 * and average, the NFL's three parts or a kicker's one; the NBA's line took one before Round 1112). A binding
 * takes exactly this many and pays for everything else from a stream keyed on the rival, so the player's own
 * stream is where it always was. It outlives the built in lines: the count is the law, not the lines.
 */
export function rivalSeasonDraws(sport: RivalSport, pos: string): number {
  if (sport === 'nba') return 1;
  if (sport === 'nfl') return pos === 'K' ? 1 : 3;
  return 2;
}

/** The stream a rival's season draws on: `draws` draws of the season's stream, then a generator keyed on the
 *  tag, his name, the year and each of those draws in order. With one draw the key is the NBA's own of Round
 *  1112, character for character. */
export function rivalSeasonStream(
  tag: string, r: Pick<CareerRival, 'name'>, year: number, rng: () => number, draws: number,
): () => number {
  let key = `${tag}|${r.name}|${year}`;
  for (let i = 0; i < draws; i += 1) key += `|${rng()}`;
  return keyedRng(key);
}

/** The rival's kind of player among his position's kinds: fixed for him, by a hash of his name and position
 *  (never his rating or his age, which move). ONE rule for every sport that deals a rival a kind. */
export function rivalKindOf<K>(tag: string, r: Pick<CareerRival, 'name' | 'pos'>, kinds: readonly K[]): K {
  return kinds[Math.floor(keyedRng(`${tag}|${r.name}|${r.pos}`)() * kinds.length)];
}

/** Round 1112: who had the better year, from the scores of the two printed lines. THE one comparison: the
 *  season note and the head to head tally are both written from it, and every card that says who is ahead
 *  reads that tally. A dead heat is his year, as it always was. */
export function rivalYearIsMine(myScore: number, hisScore: number): boolean {
  return myScore > hisScore;
}

/* Fictional names, deliberately common combinations so nothing reads as a
   specific real player. Same approach the soccer rival uses. */
const FIRST = [
  'Marcus', 'Devon', 'Tyrell', 'Cole', 'Jaxon', 'Andre', 'Brody', 'Kai',
  'Elias', 'Rhys', 'Dominic', 'Zane', 'Theo', 'Malik', 'Jonah', 'Beau',
  'Emmett', 'Rowan', 'Silas', 'Cruz', 'Nico', 'Reese', 'Quinn', 'Bodhi',
];
const LAST = [
  'Whitaker', 'Delgado', 'Okafor', 'Brennan', 'Vasquez', 'Lindqvist',
  'Boudreau', 'Nakamura', 'Kowalski', 'Amaro', 'Fitzgerald', 'Petrenko',
  'Ashford', 'Moreau', 'Salvatore', 'Hendricks', 'Bergeron', 'Castellanos',
  'Novak', 'Rylander', 'Beaumont', 'Ferreira', 'Halstead', 'Marchetti',
];

/**
 * Draft a rival alongside the player: same age, same position, a ceiling in
 * the same neighbourhood so the race is worth running. Slightly better on
 * day one about half the time, because being behind is the interesting start.
 */
export function draftRival(
  pos: string, myOvr: number, myPot: number, age: number, team: string, rng: () => number,
): CareerRival {
  const name = `${FIRST[Math.floor(rng() * FIRST.length)]} ${LAST[Math.floor(rng() * LAST.length)]}`;
  const ovr = Math.max(55, Math.min(95, myOvr + Math.round(rng() * 6 - 3)));
  const pot = Math.max(ovr + 3, Math.min(99, myPot + Math.round(rng() * 8 - 4)));
  return {
    name, pos, team, ovr, pot, age,
    rings: 0, hisYears: 0, myYears: 0, retired: false,
    lastLine: '', lastScore: 0,
  };
}

/** The sports whose rival line is still built in below. The NBA's is not: Round 1112 moved it onto the
 *  player's own line (nbaRivalSeason in nbaMyCareer.ts), so an NBA call has to hand in its play. */
export type BuiltInRivalSport = Exclude<RivalSport, 'nba'>;

/** Roll the rival's season and return a printable line plus a score. */
export function simRivalSeason(r: CareerRival, sport: RivalSport, rng: () => number, play?: RivalSeasonPlay): RivalSeasonResult {
  const form = r.ovr + seasonSwing(rng, r.age);
  if (play) return play(r, form, rng);
  let line = '', score = 0;
  if (sport === 'nhl') {
    const g = Math.max(1, Math.round((6 + (form - 62) * 0.9) + rng() * 4));
    const a = Math.max(1, Math.round((9 + (form - 62) * 1.1) + rng() * 5));
    line = `${g}G ${a}A ${g + a}P`;
    score = g + a;
  } else if (sport === 'nfl') {
    // Football positions are not on one scale: a quarterback throws for
    // 4000 yards while a corner never touches the ball, so the rival plays
    // MY position and is scored the same way I am. Without this the head to
    // head against a quarterback finished 13-0 every single career, which is
    // not a rivalry, it is a formality.
    const p = r.pos;
    if (p === 'QB') {
      const yds = Math.max(400, Math.round(1900 + (form - 62) * 92 + rng() * 500));
      const td = Math.max(1, Math.round(6 + (form - 62) * 0.95 + rng() * 6));
      const ip = Math.max(1, Math.round(18.5 - (form - 62) * 0.36 + rng() * 4));
      line = `${yds} yds, ${td} TD, ${ip} INT`;
      score = yds / 60 + td * 2;
    } else if (p === 'RB') {
      const yds = Math.max(80, Math.round(260 + (form - 62) * 46 + rng() * 260));
      const rec = Math.max(0, Math.round(14 + (form - 62) * 1.1 + rng() * 12));
      const td = Math.max(0, Math.round(1 + (form - 62) * 0.42 + rng() * 3));
      line = `${yds} rush yds, ${rec} rec, ${td} TD`;
      score = (yds + rec * 8) / 60 + td * 2;
    } else if (p === 'WR' || p === 'TE') {
      const rec = Math.max(4, Math.round(28 + (form - 62) * 2.5 + rng() * 14));
      const yds = Math.round(rec * (10.5 + rng() * 4));
      const td = Math.max(0, Math.round(1 + (form - 62) * 0.35 + rng() * 3));
      line = `${rec} rec, ${yds} yds, ${td} TD`;
      score = yds / 60 + td * 2;
    } else if (p === 'K') {
      const fg = Math.max(6, Math.round(22 + (form - 62) * 0.5 + rng() * 5));
      line = `${fg} field goals`;
      score = (fg * 30) / 60;
    } else {
      const tk = Math.max(15, Math.round(95 + (form - 62) * 2.4 + rng() * 20));
      const sk = Math.max(0, Math.round((3 + (form - 62) * 0.35 + rng() * 3) * 10) / 10);
      const pk = Math.max(0, Math.round(1 + (form - 62) * 0.08 + rng() * 2));
      line = `${tk} tackles, ${sk} sacks, ${pk} INT`;
      score = (tk * 9) / 60 + (sk + pk) * 2;
    }
  } else {
    const hr = Math.max(0, Math.round((4 + (form - 62) * 0.85) + rng() * 5));
    const avg = Math.min(0.36, Math.max(0.2, Math.round((0.226 + (form - 62) * 0.0026 + rng() * 0.02) * 1000) / 1000));
    line = `${avg.toFixed(3)}, ${hr} HR`;
    score = hr * 1.6 + (avg - 0.24) * 300;
  }
  return { line, score: Math.round(score * 10) / 10 };
}

/**
 * Age the rival a year. He grows toward his ceiling while young and falls
 * off after his prime, on the same shape as the player's own progression,
 * and he retires when he is done rather than hanging around forever.
 */
export function ageRival(r: CareerRival, rng: () => number): void {
  if (r.retired) return;
  if (r.age <= 26 && r.ovr < r.pot) {
    const drag = r.ovr >= 90 ? 0.35 : r.ovr >= 86 ? 0.6 : 1;
    r.ovr = Math.min(r.pot, r.ovr + Math.max(1, Math.round((1 + Math.floor(rng() * 2)) * drag)));
  } else if (r.age <= 29 && r.ovr < r.pot && rng() < 0.4) {
    r.ovr = Math.min(r.pot, r.ovr + 1);
  } else if (r.age >= 31) {
    r.ovr = Math.max(52, Math.round(r.ovr - (1 + rng() * 2)));
  }
  r.age += 1;
  if (r.ovr <= 60 || r.age >= 39 || (r.age >= 35 && rng() < 0.25)) r.retired = true;
}

/** Round 1112: who leads the head to head, off the tally and nothing else. The near tie note said "You lead"
 *  whoever led, in all four sports. */
export function rivalLeadLine(r: Pick<CareerRival, 'myYears' | 'hisYears'>): string {
  if (r.myYears > r.hisYears) return `You lead the head to head ${r.myYears}-${r.hisYears}.`;
  if (r.hisYears > r.myYears) return `He leads the head to head ${r.hisYears}-${r.myYears}.`;
  return `The head to head is level at ${r.myYears}-${r.hisYears}.`;
}

/**
 * Score one season of the race and produce the note the player reads.
 * `myScore` is the player's own season on the same scale as the rival's.
 */
export function judgeRivalSeason(
  r: CareerRival, myScore: number, myName: string, sport: BuiltInRivalSport, rng: () => number,
): string[];
export function judgeRivalSeason(
  r: CareerRival, myScore: number, myName: string, sport: RivalSport, rng: () => number, play: RivalSeasonPlay,
): string[];
export function judgeRivalSeason(
  r: CareerRival, myScore: number, myName: string, sport: RivalSport, rng: () => number, play?: RivalSeasonPlay,
): string[] {
  const notes: string[] = [];
  if (r.retired) return notes;
  const { line, score, year, allStar } = simRivalSeason(r, sport, rng, play);
  r.lastLine = line;
  r.lastScore = score;
  if (play) { r.lastYear = year; r.lastAllStar = allStar === true; }
  // A ring of his own, roughly as often as anyone good gets one.
  if (rng() < 0.08 + Math.max(0, (r.ovr - 80)) * 0.004) r.rings += 1;

  const gap = myScore - score;
  const mine = rivalYearIsMine(myScore, score);
  if (mine) r.myYears += 1; else r.hisYears += 1;
  const head = `${r.myYears}-${r.hisYears}`;

  if (Math.abs(gap) < score * 0.06) {
    notes.push(`🪞 ${r.name} went ${line}. Nothing in it again. ${rivalLeadLine(r)}`);
  } else if (mine) {
    notes.push(`🪞 ${r.name} went ${line}. You had the better year. Head to head ${head}.`);
  } else {
    notes.push(`🪞 ${r.name} went ${line} and had the better year of the two of you. Head to head ${head}.`);
  }
  ageRival(r, rng);
  if (r.retired) {
    const verdict = r.myYears > r.hisYears
      ? `You finished ahead of him ${head}.`
      : r.hisYears > r.myYears ? `He finished ahead of you ${r.hisYears}-${r.myYears}.` : 'You finished dead level.';
    notes.push(`🪞 ${r.name} retired. ${verdict}`);
  }
  return notes;
}

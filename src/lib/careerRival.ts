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

/** Roll the rival's season and return a printable line plus a score. */
export function simRivalSeason(r: CareerRival, sport: RivalSport, rng: () => number): { line: string; score: number } {
  const form = r.ovr + seasonSwing(rng, r.age);
  let line = '', score = 0;
  if (sport === 'nba') {
    const ppg = Math.max(3, Math.round((5 + (form - 64) * 0.62) + rng() * 3));
    const rpg = Math.max(1, Math.round((2 + (form - 64) * 0.22) * 10) / 10);
    const apg = Math.max(0.5, Math.round((1.5 + (form - 64) * 0.24) * 10) / 10);
    line = `${ppg} ppg, ${rpg} rpg, ${apg} apg`;
    score = ppg * 1.6 + rpg * 1.4 + apg * 1.7;
  } else if (sport === 'nhl') {
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

/**
 * Score one season of the race and produce the note the player reads.
 * `myScore` is the player's own season on the same scale as the rival's.
 */
export function judgeRivalSeason(
  r: CareerRival, myScore: number, myName: string, sport: RivalSport, rng: () => number,
): string[] {
  const notes: string[] = [];
  if (r.retired) return notes;
  const { line, score } = simRivalSeason(r, sport, rng);
  r.lastLine = line;
  r.lastScore = score;
  // A ring of his own, roughly as often as anyone good gets one.
  if (rng() < 0.08 + Math.max(0, (r.ovr - 80)) * 0.004) r.rings += 1;

  const gap = myScore - score;
  if (gap > 0) r.myYears += 1; else r.hisYears += 1;
  const head = `${r.myYears}-${r.hisYears}`;

  if (Math.abs(gap) < score * 0.06) {
    notes.push(`🪞 ${r.name} went ${line}. Nothing in it again. You lead the head to head ${head}.`);
  } else if (gap > 0) {
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

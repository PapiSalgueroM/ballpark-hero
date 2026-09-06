/* ─── Round 473: Soccer Career's binding for the critic ─────────────────────

   careerCritic.ts holds the columnist, his stance maths and his voice, and
   knows no engine. This file turns a soccer CareerState into the facts he
   reads and writes the one factual clause each column is built around.

   TYPES ONLY on the engine import, the same contract soccerCareerLife.ts and
   soccerCareerRealismA.ts keep, because the engine imports this file at
   runtime for the event and the newspaper column. Nothing here is evaluated
   at module scope and nothing here calls Math.random.

   THE CLAUSE FOLLOWS THE ROUND 319 LAW. What the fans nag you for, and what
   a critic measures you by, is the thing your position is actually judged on:
   a keeper is written about in clean sheets, a centre back in games and
   average rating, a striker in goals. scripts/simCareerLife.mjs checks every
   clause this file can print for every position against the stat words that
   position never carries. */
import type { CareerState, SeasonRecord, RandomEvent } from "./soccerCareerEngine";
import {
  criticName, criticPaper, criticScore, criticStance, criticColumn,
  type CriticStance, type CriticColumn,
} from "./careerCritic";

const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));
const flag = (s: CareerState, key: string): number => (s.lifeFlags || {})[key] || 0;
const setFlag = (s: CareerState, key: string, value: number) => {
  s.lifeFlags = { ...(s.lifeFlags || {}), [key]: value };
};

/** The one flag this whole feature stores: what you did about him, once. */
export const CRITIC_FLAG = "criticAnswered";

const GK = (pos: string) => pos === "GK";
const BACK = (pos: string) => ["CB", "LB", "RB", "LWB", "RWB", "CDM"].includes(pos);

/** The columnist this career drew. Stable for the life of the save. */
export function soccerCriticName(c: CareerState): string {
  const born = c.seasons?.[0]?.year ?? 2020;
  return criticName(`${c.playerName}|${c.nationality}|${born}`);
}

const trophiesIn = (s: SeasonRecord): number =>
  (s.leagueTitle ? 1 : 0) + (s.domesticCup ? 1 : 0) + (s.championsLeague ? 1 : 0)
  + (s.worldCup ? 1 : 0) + (s.continentalCup ? 1 : 0);

/** The factual half of a column: what the season actually was, in the stat
 *  the position carries. */
export function seasonClause(pos: string, s: SeasonRecord): string {
  const apps = s.apps ?? 0;
  const games = `${apps} game${apps === 1 ? "" : "s"}`;
  if (GK(pos)) return `${s.cleanSheets ?? 0} clean sheets in ${games}`;
  if (BACK(pos)) return `${games} at a ${(s.rating ?? 0).toFixed(1)} average`;
  return `${s.goals ?? 0} goals and ${s.assists ?? 0} assists in ${games}`;
}

/**
 * Where he stands after the season at `index` in the playing record. Reading
 * an older index is how the back catalogue is rebuilt, so his old columns say
 * what he thought at the time rather than what he thinks now.
 */
export function stanceAfter(c: CareerState, played: SeasonRecord[], index: number): { score: number; stance: CriticStance } {
  const window = played.slice(Math.max(0, index - 2), index + 1);
  const upTo = played.slice(0, index + 1);
  const score = criticScore({
    recentRatings: window.map(s => s.rating ?? 0),
    recentApps: window.map(s => s.apps ?? 0),
    recentTrophies: window.reduce((a, s) => a + trophiesIn(s), 0),
    careerTrophies: upTo.reduce((a, s) => a + trophiesIn(s), 0),
    popularity: c.popularity ?? 50,
    answered: flag(c, CRITIC_FLAG),
  });
  return { score, stance: criticStance(score) };
}

/** The playing seasons, oldest first. Youth years are not a career yet. */
export function playedSeasons(c: CareerState): SeasonRecord[] {
  return (c.seasons ?? []).filter(s => s.type === "playing");
}

/**
 * His back catalogue, newest first, rebuilt from the seasons on the save.
 * Nothing is stored: this is why an old save opens with his whole history.
 */
export function soccerCriticColumns(c: CareerState, limit = 4): CriticColumn[] {
  const played = playedSeasons(c);
  const name = soccerCriticName(c);
  const out: CriticColumn[] = [];
  for (let i = played.length - 1; i >= 0 && out.length < limit; i -= 1) {
    const { stance } = stanceAfter(c, played, i);
    out.push(criticColumn(name, played[i].year, stance, seasonClause(c.position, played[i])));
  }
  return out;
}

/** Where he stands right now, for the header on his screen. */
export function soccerCriticNow(c: CareerState): { score: number; stance: CriticStance } {
  const played = playedSeasons(c);
  if (played.length === 0) return { score: 50, stance: "watching" };
  return stanceAfter(c, played, played.length - 1);
}

/** The column the season just gone earns, for the newspaper. `papers` is the
 *  engine's own masthead list, handed in so this file stays types only. */
export function soccerCriticArticle(c: CareerState, season: SeasonRecord, papers: string[]): { paper: string; headline: string; body: string; hostile: boolean } | null {
  /* A season that is not filed as a playing year (a year inside, a year the
     record calls something else) still happened and he still writes about it,
     so the season in hand is the fallback. Without this, simCareerLife found
     one newspaper in 971 going out with no column in it. */
  const played = playedSeasons(c).length ? playedSeasons(c) : [season];
  const { stance } = stanceAfter(c, played, played.length - 1);
  const name = soccerCriticName(c);
  const col = criticColumn(name, season.year, stance, seasonClause(c.position, season));
  const title: Record<CriticStance, string> = {
    backing: `THE COLUMN: ${name} Has Seen Enough, And He Is Saying So`,
    watching: `THE COLUMN: ${name} Is Still Making His Mind Up About ${c.playerName}`,
    doubting: `THE COLUMN: ${name} Wants To Know Where The Rest Of It Went`,
    written_off: `THE COLUMN: ${name} Says The Argument About ${c.playerName} Is Over`,
  };
  return {
    paper: criticPaper(`${c.playerName}|${c.nationality}|${played[0].year}`, papers),
    headline: title[stance],
    body: col.line,
    hostile: stance === "doubting" || stance === "written_off",
  };
}

/* Round 473: the conviction replaces the whole newspaper and returns early,
   which meant the one man who had written about you every season since you
   turned pro went silent on the single biggest day of the story.
   simCareerLife section 8 found four papers in 970 like that. */
const DISGRACE = [
  (c: string) => `${c} has written about you every season since you turned pro. This week he filed four hundred words, none of them about football, and the last line was that he should have asked harder questions sooner.`,
  (c: string) => `${c} pulled every column he ever wrote about you and printed the dates beside the charges. He did not editorialise. He did not need to.`,
  (c: string) => `${c} wrote that he had spent a decade arguing about your first touch with people who now want to talk about something else entirely.`,
];

/** The column on the day it all comes out. */
export function soccerCriticDisgraceArticle(c: CareerState, papers: string[]): { paper: string; headline: string; body: string } {
  const name = soccerCriticName(c);
  const played = playedSeasons(c);
  const year = played.length ? played[played.length - 1].year : (c.seasons?.[0]?.year ?? 2020);
  return {
    paper: criticPaper(`${c.playerName}|${c.nationality}|${played[0]?.year ?? year}`, papers),
    headline: `THE COLUMN: ${name} Has Been Writing About You For Years. Never Like This`,
    body: DISGRACE[Math.abs(year) % DISGRACE.length](name),
  };
}

/* ─── the one thing you can do about him ─────────────────────────────────── */

/**
 * Round 473, id 500. Self gating like every other catalog in this game, so
 * the caller needs no eligibility rule: it only appears once, only after
 * three seasons, and only when he has actually turned on you.
 *
 * Three real trades and no free option:
 *   answer back   he is invested now, so every season after this counts
 *                 harder with him in both directions, and he starts four
 *                 points colder for having been answered.
 *   say nothing   from here his verdict is the season you told him to wait
 *                 for and nothing else. A good one converts him in one go; a
 *                 bad one buries you in one go.
 *   invite him in he softens for good, and the dressing room hates that you
 *                 let a journalist watch them work.
 */
export function getCriticEvents(state: CareerState): RandomEvent[] {
  if (state.retired || state.age < 20) return [];
  if (flag(state, CRITIC_FLAG) !== 0) return [];
  const played = playedSeasons(state);
  if (played.length < 3) return [];
  const { stance } = stanceAfter(state, played, played.length - 1);
  if (stance !== "doubting" && stance !== "written_off") return [];
  const name = soccerCriticName(state);

  return [{
    id: 500, emoji: "🗞️", title: "The Column About You",
    description: `${name} has been writing about you since you turned pro and this week he wrote that the club would get more out of the money somewhere else. The piece is on every phone in the building. Two teammates have already sent it to you.`,
    category: "negative",
    choices: [
      {
        label: "Answer him, on the record, in the mixed zone", emoji: "🎤", color: "bg-red-600",
        consequence: "55%: the room is with you (Popularity +8, Morale +6). 45%: it reads as rattled (Popularity -10, Morale -6). Either way he is invested now, and every season after this counts harder with him",
        apply: s => {
          setFlag(s, CRITIC_FLAG, 1);
          if (Math.random() < 0.55) {
            s.popularity = clamp(s.popularity + 8, 0, 100);
            s.morale = clamp(s.morale + 6, 0, 100);
            s.events = [...s.events, `🎤 Answered ${name} on the record and the room went with you. He will be watching every touch now`];
          } else {
            s.popularity = clamp(s.popularity - 10, 0, 100);
            s.morale = clamp(s.morale - 6, 0, 100);
            s.events = [...s.events, `🎤 Answered ${name} on the record and it played as rattled. He will be watching every touch now`];
          }
          return s;
        },
      },
      {
        label: "Say nothing. Let next season answer him", emoji: "🤐", color: "bg-blue-600",
        consequence: "Nothing today. From now on he judges the season in front of him and nothing else, good or bad",
        apply: s => {
          setFlag(s, CRITIC_FLAG, 2);
          s.events = [...s.events, `🤐 Said nothing about ${name}'s column. Next season is the reply`];
          return s;
        },
      },
      {
        label: "Invite him in to watch a week of training", emoji: "🚪", color: "bg-emerald-600",
        consequence: "He softens for good. Morale -4: the dressing room hates that you let a journalist in, Integrity +2",
        apply: s => {
          setFlag(s, CRITIC_FLAG, 3);
          s.morale = clamp(s.morale - 4, 0, 100);
          s.integrityBonus += 2;
          s.events = [...s.events, `🚪 Let ${name} watch a full week of training. He wrote it up straight, and the lads have not let it go`];
          return s;
        },
      },
    ],
  }];
}

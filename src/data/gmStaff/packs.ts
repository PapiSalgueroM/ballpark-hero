/**
 * Round 910: every manager game's staff desk, as data.
 *
 * src/lib/gmStaff.ts is the desk (hire, sack, promote, rivals poach, you
 * match a limited number of times). This file is the jobs. A pack is one
 * game's post list: what each job is called, which unit or read it moves and
 * by how much at the most, what it pays on that game's own money scale, and
 * how often a rival comes in. A new sport is a new pack, never a new engine.
 *
 * RULES EVERY PACK KEEPS, held by scripts/simGmStaff.mjs:
 *   - every effect is `none` at level 1 and on an empty chair, so a game that
 *     binds its pack and never opens the desk plays exactly as it did;
 *   - every level from 1 to 10 moves every effect its post declares;
 *   - two posts that move the same key add up to the key's bound and never
 *     past it (a head coach 0.75 and a coordinator 2.25 make the 3 rating
 *     points a college coordinator has been capped at since Round 728);
 *   - a full desk of level 10 people fits inside the season purse with room
 *     to spare, and a full desk costs something.
 *
 * NOTHING HERE IS A REAL NUMBER. The wages, fees and purses are the games'
 * own money, sized against each game's own budget (the note on each pack says
 * which), not anybody's real salary. Every person who fills these posts is
 * generated from the banks in gmStaff.ts.
 *
 * The head coach is the GM's call: he is on the shortlist to appoint and on
 * the desk to sack, and no rival ever comes in for him. Coordinators and
 * assistants are the ones who get noticed, and a strong one is approached
 * for a head coach's job elsewhere.
 */
import type { GmStaffKey, GmStaffPack, GmStaffPost, GmStaffRules } from '@/lib/gmStaff';
import { GM_STAFF_NAME_BANKS, GM_SCOUT_SPREAD_BEST, GM_SCOUT_SPREAD_NONE } from '@/lib/gmStaff';

/* ------------------------------------------------------------ shared pieces */

/** The most a staff may move one unit, in rating points. collegeProgram.ts caps a coordinator at the same 3. */
export const GM_UNIT_EDGE_MAX = 3;

const edgeKey = (what: string): GmStaffKey => ({ none: 0, lo: 0, hi: GM_UNIT_EDGE_MAX, mult: false, what });
const SCOUT_KEY: GmStaffKey = {
  none: GM_SCOUT_SPREAD_NONE, lo: GM_SCOUT_SPREAD_BEST, hi: GM_SCOUT_SPREAD_NONE, mult: false,
  what: 'the scouting spread, so a grade misses by this at most (rounded up) and by a little over half of it on average',
};
const GROWTH_KEY: GmStaffKey = { none: 1, lo: 1, hi: 1.1, mult: true, what: 'how fast young players grow where they have room, never past their ceiling' };
const INJURY_KEY: GmStaffKey = { none: 1, lo: 0.75, hi: 1, mult: true, what: 'how long an injury keeps a player out' };

const SCOUT_EFFECT = { key: 'scoutSpread', none: GM_SCOUT_SPREAD_NONE, best: GM_SCOUT_SPREAD_BEST } as const;

type Money = Pick<GmStaffRules, 'wageBase' | 'wagePerLevel' | 'feeBase' | 'feePerLevel' | 'severanceTicks' | 'wagePerPurse' | 'severanceMin' | 'poachPerLevel' | 'poachWeeks'>
  & Partial<Pick<GmStaffRules, 'feeDp' | 'purseDp'>>;

/** One pack's rules: the shared desk habits plus that game's money, in one place. */
function rulesFor<P extends string>(
  posts: readonly GmStaffPost<P>[], money: Money, pay: Partial<Record<P, number>>, from: readonly string[], promotedFrom: string,
): GmStaffRules<P> {
  return {
    posts: posts.map(p => p.id),
    version: 1,
    maxLevel: 10,
    matchesPerSeason: 2,
    first: GM_STAFF_NAME_BANKS.first,
    last: GM_STAFF_NAME_BANKS.last,
    pay,
    matchRaise: 1.25,
    poachFromLevel: 6,
    unpoachable: posts.filter(p => p.head).map(p => p.id),
    /* An approach nobody answered by the end of the season takes its man. */
    walkAtSummer: true,
    growChance: 0.32,
    growChanceRoomy: 0.5,
    outsideFrom: from,
    promotedFrom,
    ...money,
  };
}

const PRO_FROM = [
  'Out of the league since his last staff was let go',
  'A position coach somewhere else, ready for more',
  'Ran a college staff, wants the pros',
  'Ten years in one building, wants a new one',
  'Did the job for a contender a while back',
];

/**
 * The medical chair every pro front office has: the NBA, MLB and NHL engines
 * all carry an `out` count of rounds a hurt player misses, which is what
 * injuryWeeks shortens. The NFL's head trainer below is the same job.
 */
const medicalPost = <P extends string>(id: P, label: string): GmStaffPost<P> => ({
  id, label, short: 'Medical', emoji: '\u{1FA79}',
  blurb: 'Runs the training room and the rehab. Hurt players are back a little sooner, and a short knock stays a short knock.',
  effects: [{ key: 'injuryWeeks', none: 1, best: 0.75 }],
});

/** A pro staff is paid by the week over the weeks the game plays; the head coach earns five times the curve. */
const proMoney = (poachPerLevel: number): Money => ({
  wageBase: 3, wagePerLevel: 2.1, feeBase: 0.1, feePerLevel: 0.03, severanceTicks: 9, wagePerPurse: 1000, severanceMin: 0.05,
  poachPerLevel, poachWeeks: 2,
});

/* ------------------------------------------------------------ the four front offices */

export type NflStaffPost = 'hc' | 'oc' | 'dc' | 'scouting' | 'trainer';

const NFL_POSTS: readonly GmStaffPost<NflStaffPost>[] = [
  {
    id: 'hc', label: 'Head coach', short: 'Head coach', emoji: '\u{1F9E2}', head: true,
    blurb: 'Your hire and your call to move on from. Sets the tone on both sides of the ball.',
    effects: [{ key: 'offEdge', none: 0, best: 0.75 }, { key: 'defEdge', none: 0, best: 0.75 }],
  },
  {
    id: 'oc', label: 'Offensive coordinator', short: 'Offense', emoji: '\u{1F3AF}', headCoachTrack: true,
    blurb: 'Calls the plays. A good one gets the most out of the offense you gave him, and gets head coach calls for it.',
    effects: [{ key: 'offEdge', none: 0, best: 2.25 }],
  },
  {
    id: 'dc', label: 'Defensive coordinator', short: 'Defense', emoji: '\u{1F6E1}️', headCoachTrack: true,
    blurb: 'Runs the defense. Same deal: the better he is, the sooner somebody wants him to run their whole team.',
    effects: [{ key: 'defEdge', none: 0, best: 2.25 }],
  },
  {
    id: 'scouting', label: 'Scouting director', short: 'Scouting', emoji: '\u{1F50E}',
    blurb: 'Runs the draft board. The better he is, the closer a prospect\'s grade sits to what the kid really is.',
    effects: [SCOUT_EFFECT],
  },
  {
    id: 'trainer', label: 'Head trainer', short: 'Training room', emoji: '\u{1FA79}',
    blurb: 'Gets hurt players back on the field sooner. Never sooner than a week.',
    effects: [{ key: 'injuryWeeks', none: 1, best: 0.75 }],
  },
];

export const NFL_STAFF_PACK: GmStaffPack<NflStaffPost> = {
  id: 'nfl',
  game: 'NFL Front Office',
  headJob: 'head coach',
  posts: NFL_POSTS,
  rules: rulesFor(NFL_POSTS, proMoney(0.01), { hc: 5, oc: 2, dc: 2 }, PRO_FROM, 'A position coach in the building already'),
  keys: {
    offEdge: edgeKey('rating points on the offense'),
    defEdge: edgeKey('rating points on the defense'),
    scoutSpread: SCOUT_KEY,
    injuryWeeks: INJURY_KEY,
  },
  money: {
    wageUnit: 'k a week', purseUnit: 'm', ticksPerSeason: 18, tickWord: 'week', seasonPurse: 8,
    purseNote: 'The staff budget ownership opens the desk with, in the game\'s own millions. Staff are paid outside the salary cap.',
  },
};

export type NbaStaffPost = 'hc' | 'assistant' | 'development' | 'scouting' | 'medical';

const NBA_POSTS: readonly GmStaffPost<NbaStaffPost>[] = [
  {
    id: 'hc', label: 'Head coach', short: 'Head coach', emoji: '\u{1F4CB}', head: true,
    blurb: 'Your hire and your call to move on from. Half of what a staff can do at either end is him.',
    effects: [{ key: 'offEdge', none: 0, best: 1.5 }, { key: 'defEdge', none: 0, best: 1.5 }],
  },
  {
    id: 'assistant', label: 'Lead assistant', short: 'Lead assistant', emoji: '\u{1F5E3}️', headCoachTrack: true,
    blurb: 'Sits next to the head coach and does the scouting report every night. The other half, and the first name on every head coach search.',
    effects: [{ key: 'offEdge', none: 0, best: 1.5 }, { key: 'defEdge', none: 0, best: 1.5 }],
  },
  {
    id: 'development', label: 'Player development coach', short: 'Development', emoji: '\u{1F4C8}',
    blurb: 'Works the young guys before practice and after it. They grow a little faster, and nobody grows past his ceiling.',
    effects: [{ key: 'growth', none: 1, best: 1.1 }],
  },
  {
    id: 'scouting', label: 'Scouting director', short: 'Scouting', emoji: '\u{1F50E}',
    blurb: 'Runs the draft board. The better he is, the closer a prospect\'s grade sits to what the kid really is.',
    effects: [SCOUT_EFFECT],
  },
  medicalPost('medical', 'Head athletic trainer'),
];

export const NBA_STAFF_PACK: GmStaffPack<NbaStaffPost> = {
  id: 'nba',
  game: 'NBA Front Office',
  headJob: 'head coach',
  posts: NBA_POSTS,
  rules: rulesFor(NBA_POSTS, proMoney(0.008), { hc: 5, assistant: 2 }, PRO_FROM, 'A video coordinator in the building already'),
  keys: {
    /* Round 1018 bound this pack (src/lib/nbaGmDesk.ts). The engine has one
       strength number for both ends of the floor, so a point at one end
       reaches it at half (NBA_END_WEIGHT there), and the words say so. */
    offEdge: edgeKey('rating points at the offensive end. One strength number covers both ends here, so half of them reach team strength'),
    defEdge: edgeKey('rating points at the defensive end. One strength number covers both ends here, so half of them reach team strength'),
    growth: GROWTH_KEY,
    scoutSpread: SCOUT_KEY,
    injuryWeeks: INJURY_KEY,
  },
  money: {
    /* Round 1018: the board ticks the desk once a round over its 20 rounds
       (NBA_ROUNDS), so the clock and the wages count rounds. */
    wageUnit: 'k a round', purseUnit: 'm', ticksPerSeason: 20, tickWord: 'round', seasonPurse: 9,
    purseNote: 'The staff budget ownership opens the desk with, in the game\'s own millions. Staff are paid outside the salary cap.',
  },
};

export type MlbStaffPost = 'manager' | 'pitching' | 'hitting' | 'scouting' | 'farm' | 'medical';

const MLB_POSTS: readonly GmStaffPost<MlbStaffPost>[] = [
  {
    id: 'manager', label: 'Manager', short: 'Manager', emoji: '\u{1F9E2}', head: true,
    blurb: 'Your hire and your call to move on from. Runs the dugout, the lineup card and the bullpen phone.',
    effects: [{ key: 'hitEdge', none: 0, best: 0.75 }, { key: 'pitchEdge', none: 0, best: 0.75 }],
  },
  {
    id: 'pitching', label: 'Pitching coach', short: 'Pitching', emoji: '\u{26BE}', headCoachTrack: true,
    blurb: 'Works the staff and the pen. A good one is on somebody\'s list for a manager\'s job by the winter.',
    effects: [{ key: 'pitchEdge', none: 0, best: 2.25 }],
  },
  {
    id: 'hitting', label: 'Hitting coach', short: 'Hitting', emoji: '\u{1F3CF}', headCoachTrack: true,
    blurb: 'Works the lineup in the cage. Same deal as the pitching coach, other half of the game.',
    effects: [{ key: 'hitEdge', none: 0, best: 2.25 }],
  },
  {
    id: 'scouting', label: 'Scouting director', short: 'Scouting', emoji: '\u{1F50E}',
    blurb: 'Runs the draft room. The better he is, the closer a prospect\'s grade sits to what the kid really is.',
    effects: [SCOUT_EFFECT],
  },
  {
    id: 'farm', label: 'Farm director', short: 'Farm system', emoji: '\u{1F331}',
    blurb: 'Runs player development on the farm. Prospects grow a little faster, and nobody grows past his ceiling.',
    effects: [{ key: 'growth', none: 1, best: 1.1 }],
  },
  medicalPost('medical', 'Head athletic trainer'),
];

export const MLB_STAFF_PACK: GmStaffPack<MlbStaffPost> = {
  id: 'mlb',
  game: 'MLB Front Office',
  headJob: 'manager',
  posts: MLB_POSTS,
  rules: rulesFor(MLB_POSTS, proMoney(0.007), { manager: 4, pitching: 2, hitting: 2 }, PRO_FROM, 'A coach on the farm already'),
  keys: {
    hitEdge: edgeKey('rating points on the lineup'),
    pitchEdge: edgeKey('rating points on the pitching staff'),
    scoutSpread: SCOUT_KEY,
    growth: GROWTH_KEY,
    injuryWeeks: INJURY_KEY,
  },
  money: {
    wageUnit: 'k a week', purseUnit: 'm', ticksPerSeason: 26, tickWord: 'week', seasonPurse: 11,
    purseNote: 'The staff budget ownership opens the desk with, in the game\'s own millions. Staff are paid outside the payroll the tax line reads.',
  },
};

/*
 * Round 987 bound this pack (src/lib/nhlGmDesk.ts). src/lib/nhlFrontOffice.ts
 * has no special teams model (no power play, no penalty kill: one strength
 * number decides a game), so specialTeamsEdge counts toward that one number
 * at a fifth of its weight (NHL_SPECIAL_TEAMS_WEIGHT there), and the key's
 * words below say exactly that on the screen.
 */
export type NhlStaffPost = 'hc' | 'specialTeams' | 'goalie' | 'scouting' | 'medical';

const NHL_POSTS: readonly GmStaffPost<NhlStaffPost>[] = [
  {
    id: 'hc', label: 'Head coach', short: 'Head coach', emoji: '\u{1F4CB}', head: true,
    blurb: 'Your hire and your call to move on from. The whole five on five game is his.',
    effects: [{ key: 'offEdge', none: 0, best: 1.5 }, { key: 'defEdge', none: 0, best: 1.5 }],
  },
  {
    id: 'specialTeams', label: 'Special teams assistant', short: 'Special teams', emoji: '\u{26A1}', headCoachTrack: true,
    blurb: 'Runs the power play and the penalty kill. The assistant other teams call first when they need a head coach.',
    effects: [{ key: 'specialTeamsEdge', none: 0, best: 3 }],
  },
  {
    id: 'goalie', label: 'Goalie coach', short: 'Goalies', emoji: '\u{1F945}',
    blurb: 'Works the goalies, who nobody else on the staff ever touches.',
    effects: [{ key: 'goalieEdge', none: 0, best: 3 }],
  },
  {
    id: 'scouting', label: 'Scouting director', short: 'Scouting', emoji: '\u{1F50E}',
    blurb: 'Runs the draft table. The better he is, the closer a prospect\'s grade sits to what the kid really is.',
    effects: [SCOUT_EFFECT],
  },
  medicalPost('medical', 'Head athletic therapist'),
];

export const NHL_STAFF_PACK: GmStaffPack<NhlStaffPost> = {
  id: 'nhl',
  game: 'NHL Front Office',
  headJob: 'head coach',
  posts: NHL_POSTS,
  rules: rulesFor(NHL_POSTS, proMoney(0.009), { hc: 5, specialTeams: 2 }, PRO_FROM, 'A coach with the minor league team already'),
  keys: {
    offEdge: edgeKey('rating points on the attack at even strength'),
    defEdge: edgeKey('rating points on the defense at even strength'),
    specialTeamsEdge: edgeKey('rating points on special teams. This game has no power play of its own, so a fifth of them reach team strength'),
    goalieEdge: edgeKey('rating points on the goalies'),
    scoutSpread: SCOUT_KEY,
    injuryWeeks: INJURY_KEY,
  },
  money: {
    /* Round 987: the board ticks the desk once a round over its 20 rounds
       (NHL_FO_ROUNDS), so the clock and the wages count rounds. */
    wageUnit: 'k a round', purseUnit: 'm', ticksPerSeason: 20, tickWord: 'round', seasonPurse: 8,
    purseNote: 'The staff budget ownership opens the desk with, in the game\'s own millions. Staff are paid outside the hard cap.',
  },
};

/* ------------------------------------------------------------ the two college programs */

/*
 * The offensive and defensive coordinator chairs already exist in
 * src/lib/collegeProgram.ts (Round 728) and stay there for now. These are the
 * two jobs a program has around them. Money is program budget points a
 * season, the same pot the coordinators and the recruiting class are paid
 * from, so the desk ticks once a season: an approach lands at that tick, the
 * way the coaching carousel runs after the regular season, and the GM has
 * the offseason to match it or let him go. Ignored, he goes at the summer
 * (walkAtSummer), so ignoring an approach is never free.
 */
export type CollegeStaffPost = 'recruiting' | 'strength';

const COLLEGE_POSTS: readonly GmStaffPost<CollegeStaffPost>[] = [
  {
    id: 'recruiting', label: 'Recruiting coordinator', short: 'Recruiting', emoji: '\u{1F4DE}', headCoachTrack: true,
    blurb: 'Lives on the phone and on the road. The program pulls a little harder on every recruit, and the best ones get offered a program of their own.',
    effects: [{ key: 'recruitPull', none: 1, best: 1.1 }],
  },
  {
    id: 'strength', label: 'Strength coach', short: 'Strength', emoji: '\u{1F3CB}️',
    blurb: 'Owns the weight room and the summer. Players grow a little faster where they have room, and come back from injury sooner.',
    effects: [{ key: 'growth', none: 1, best: 1.08 }, { key: 'injuryWeeks', none: 1, best: 0.8 }],
  },
];

const COLLEGE_KEYS: Readonly<Record<string, GmStaffKey>> = {
  recruitPull: { none: 1, lo: 1, hi: 1.1, mult: true, what: 'how hard the program pulls on a recruit' },
  growth: GROWTH_KEY,
  injuryWeeks: INJURY_KEY,
};

const COLLEGE_FROM = [
  'A position coach at a smaller program',
  'Ran a high school powerhouse, wants the college game',
  'Let go with the last staff at a bigger place',
  'A grad assistant not long ago, moved up fast',
  'Twenty years on the road for one school, ready to move',
];

/** Budget points a season: 2 at level 1, 7 at level 10. A coordinator in collegeProgram.ts costs 3 to 16. */
const COLLEGE_MONEY: Money = {
  wageBase: 1, wagePerLevel: 0.6, feeBase: 1, feePerLevel: 0.3, severanceTicks: 1, wagePerPurse: 1, severanceMin: 1,
  poachPerLevel: 0.05, poachWeeks: 1, feeDp: 0, purseDp: 0,
};

export const CFB_STAFF_PACK: GmStaffPack<CollegeStaffPost> = {
  id: 'cfb',
  game: 'CFB Dynasty',
  headJob: 'head coach',
  posts: COLLEGE_POSTS,
  rules: rulesFor(COLLEGE_POSTS, COLLEGE_MONEY, {}, COLLEGE_FROM, 'A grad assistant on the staff already'),
  keys: COLLEGE_KEYS,
  money: {
    wageUnit: 'points a season', purseUnit: 'points', ticksPerSeason: 1, tickWord: 'season', seasonPurse: 62,
    purseNote: 'What nilBudgetFor in cfbDynasty.ts gives a prestige 80 program off a winless year: 40 + (80 - 70) * 2.2.',
  },
};

export const CBB_STAFF_PACK: GmStaffPack<CollegeStaffPost> = {
  id: 'cbb',
  game: 'CBB Dynasty',
  headJob: 'head coach',
  posts: COLLEGE_POSTS,
  rules: rulesFor(COLLEGE_POSTS, COLLEGE_MONEY, {}, COLLEGE_FROM, 'A grad assistant on the staff already'),
  keys: COLLEGE_KEYS,
  money: {
    wageUnit: 'points a season', purseUnit: 'points', ticksPerSeason: 1, tickWord: 'season', seasonPurse: 54,
    purseNote: 'What cbbNilFor in cbbDynasty.ts gives a prestige 80 program off a winless year: 36 + (80 - 72) * 2.2, rounded.',
  },
};

/* ------------------------------------------------------------ the fight gym */

export type GymStaffPost = 'trainer' | 'cutman' | 'strength' | 'matchmaker';

const GYM_POSTS: readonly GmStaffPost<GymStaffPost>[] = [
  {
    id: 'trainer', label: 'Head trainer', short: 'Trainer', emoji: '\u{1F94A}',
    blurb: 'Runs camp. A session moves a fighter a little further toward his ceiling, and never past it.',
    effects: [{ key: 'campGain', none: 1, best: 1.15 }],
  },
  {
    id: 'cutman', label: 'Cutman', short: 'Cutman', emoji: '\u{1FA79}',
    blurb: 'Works the corner between rounds. Your fighters carry a little less damage out of every fight.',
    effects: [{ key: 'damageTaken', none: 1, best: 0.85 }],
  },
  {
    id: 'strength', label: 'Strength coach', short: 'Strength', emoji: '\u{1F3CB}️',
    blurb: 'Roadwork, weights and the scale. Your fighters have more left in the late rounds.',
    effects: [{ key: 'staminaEdge', none: 0, best: 3 }],
  },
  {
    id: 'matchmaker', label: 'Matchmaker', short: 'Matchmaker', emoji: '\u{1F91D}',
    blurb: 'Knows every gym in the country. Reads an opponent closer to what he really is, and talks the purse up a little.',
    effects: [SCOUT_EFFECT, { key: 'purse', none: 1, best: 1.1 }],
  },
];

export const GYM_STAFF_PACK: GmStaffPack<GymStaffPost> = {
  id: 'fightGym',
  game: 'Fight Gym',
  posts: GYM_POSTS,
  rules: rulesFor(GYM_POSTS, {
    wageBase: 0.5, wagePerLevel: 0.45, feeBase: 0.01, feePerLevel: 0.006, severanceTicks: 8, wagePerPurse: 1000, severanceMin: 0.005,
    poachPerLevel: 0.004, poachWeeks: 2, feeDp: 3, purseDp: 3,
  }, {}, [
    'Had a champion once, a long time ago',
    'Worked corners up and down the country',
    'Let go when his last gym closed',
    'An amateur coach who wants the pro game',
    'Came up in a gym two towns over',
  ], 'Has swept this gym\'s floor since he was a kid'),
  keys: {
    campGain: { none: 1, lo: 1, hi: 1.15, mult: true, what: 'how far one training session moves a fighter toward his ceiling' },
    damageTaken: { none: 1, lo: 0.85, hi: 1, mult: true, what: 'how much damage a fighter carries out of a fight' },
    staminaEdge: edgeKey('rating points of stamina on fight night'),
    scoutSpread: SCOUT_KEY,
    purse: { none: 1, lo: 1, hi: 1.1, mult: true, what: 'the purse a fight is made for' },
  },
  money: {
    wageUnit: 'k a week', purseUnit: 'm', ticksPerSeason: 52, tickWord: 'week', seasonPurse: 3.432,
    purseNote: 'A six fighter gym\'s own overhead for a year: 52 weeks of weeklyCost in fightGym.ts, 0.012 + 6 * 0.009 a week.',
  },
};

/* ------------------------------------------------------------ Australian football */

/*
 * Sized to src/lib/aussieRulesManager.ts as it plays today: ten rounds, one
 * season, six clubs, fatigue but no injuries, no draft and no money. So the
 * fitness boss moves fatigue (the engine's own number), the desk ticks ten
 * times and is paid over ten rounds. OWED BY THE AFL BIND: the game has no
 * scouting read for the list manager to move and never reaches a second
 * season, so the summer (growth, the reset, a walk at the summer) never runs
 * there until the game plays more than one; the bind round adds both or
 * drops the post.
 */

export type AflStaffPost = 'forwards' | 'midfield' | 'backs' | 'list' | 'fitness';

const AFL_POSTS: readonly GmStaffPost<AflStaffPost>[] = [
  {
    id: 'forwards', label: 'Forwards coach', short: 'Forwards', emoji: '\u{1F3AF}', headCoachTrack: true,
    blurb: 'Runs the forward line: leading patterns, forward pressure, set shots. The best line coaches get offered a senior job.',
    effects: [{ key: 'forwardEdge', none: 0, best: 3 }],
  },
  {
    id: 'midfield', label: 'Midfield coach', short: 'Midfield', emoji: '\u{1F504}', headCoachTrack: true,
    blurb: 'Runs the stoppages and the rotations through the middle.',
    effects: [{ key: 'midfieldEdge', none: 0, best: 3 }],
  },
  {
    id: 'backs', label: 'Backs coach', short: 'Backs', emoji: '\u{1F6E1}️', headCoachTrack: true,
    blurb: 'Runs the back six: the match ups, the zone and the rebound out of defence.',
    effects: [{ key: 'backEdge', none: 0, best: 3 }],
  },
  {
    id: 'list', label: 'List manager', short: 'List', emoji: '\u{1F50E}',
    blurb: 'Runs the draft and the trade period. The better he is, the closer a kid\'s grade sits to what he really is.',
    effects: [SCOUT_EFFECT],
  },
  {
    id: 'fitness', label: 'Fitness boss', short: 'Fitness', emoji: '\u{1F3C3}',
    blurb: 'Runs the conditioning and the recovery group. Players pick up less fatigue from every match and every session.',
    effects: [{ key: 'fatigueGain', none: 1, best: 0.8 }],
  },
];

export const AFL_STAFF_PACK: GmStaffPack<AflStaffPost> = {
  id: 'afl',
  game: 'Aussie Rules Manager',
  headJob: 'senior coach',
  posts: AFL_POSTS,
  rules: rulesFor(AFL_POSTS, {
    wageBase: 2, wagePerLevel: 1.2, feeBase: 0.02, feePerLevel: 0.009, severanceTicks: 5, wagePerPurse: 1000, severanceMin: 0.01,
    poachPerLevel: 0.014, poachWeeks: 2, feeDp: 2,
  }, {}, [
    'A line coach at another club, out of contract',
    'Coached his own side in the state league',
    'Not long retired as a player, wants to coach',
    'Let go when the last senior coach was',
    'Ran an under 18s program for years',
  ], 'A development coach at the club already'),
  keys: {
    forwardEdge: edgeKey('rating points on the forward line'),
    midfieldEdge: edgeKey('rating points through the midfield'),
    backEdge: edgeKey('rating points on the back line'),
    scoutSpread: SCOUT_KEY,
    fatigueGain: { none: 1, lo: 0.8, hi: 1, mult: true, what: 'the fatigue a player picks up from a match or a training session' },
  },
  money: {
    wageUnit: 'k a round', purseUnit: 'm', ticksPerSeason: 10, tickWord: 'round', seasonPurse: 1.3,
    purseNote: 'The football department budget the desk opens with, in the game\'s own millions, over the ten round season aussieRulesManager.ts plays. The game has no other money yet.',
  },
};

/* ------------------------------------------------------------ all of them */

/** Every pack, for the harness and for anything that lists the desks. Club Manager's four posts live in clubManagerStaff.ts. */
export const GM_STAFF_PACKS: readonly GmStaffPack[] = [
  NFL_STAFF_PACK, NBA_STAFF_PACK, MLB_STAFF_PACK, NHL_STAFF_PACK, CFB_STAFF_PACK, CBB_STAFF_PACK, GYM_STAFF_PACK, AFL_STAFF_PACK,
] as unknown as readonly GmStaffPack[];

export function gmStaffPackById(id: string): GmStaffPack | null {
  return GM_STAFF_PACKS.find(p => p.id === id) ?? null;
}

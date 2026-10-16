/* Round 1334: Soccer Career's starter pack for the shared deck (src/lib/gmInbox.ts),
   dealt by the soccer binding in src/lib/soccerDeck.ts: at most one card a
   summer, first in the batch, from its own keyed stream, never replacing a
   card of the old catalog. Ids 700 to 999 are this deck's.

   The facts are the save's own, read by soccerDeckFacts at the deal; the
   specs below are what the event deck kit draws honest values from. A card's
   position group is a range on `pos` (0 keeper, 1 defender, 2 midfielder,
   3 forward: careerDrills.ts drillForPosition), so the kit's float draws reach
   every card.

   28 cards, ids 701 to 728: five for each position group (keeper 701 to
   705, defender 706 to 710, midfielder 711 to 715, forward 716 to 720) and
   eight about where a career stands (721 to 728). Only a position card
   trains, and only its own group's skills. Every card has an option that
   moves nothing. Voices are roles, nothing is quoted, no real person or club
   fact, and a card states only what the save holds (docs/audits/
   ROUND-1334-NOTES.md has the card by code table and each card's nearest
   routine of the other lane). Its words are frozen once recorded
   (scripts/data/eventDeckWords.json, store: compact). */
import type { GmEventDef } from '@/lib/gmInbox';
import type { RandomEvent } from '@/lib/soccerCareerEngine';
import type { SoccerDeckPack } from '@/lib/soccerDeck';

type Card = [GmEventDef, string, RandomEvent['category']];
const KEEPER = { fact: 'pos', op: '<', value: 1 } as const;
const DEFENDER = [{ fact: 'pos', op: '>=', value: 1 }, { fact: 'pos', op: '<', value: 2 }] as const;
const MIDFIELDER = [{ fact: 'pos', op: '>=', value: 2 }, { fact: 'pos', op: '<', value: 3 }] as const;
const FORWARD = { fact: 'pos', op: '>=', value: 3 } as const;

const CARDS: Card[] = [
  /* ─── keepers ─── */
  [{ id: '701', beat: 'summer', from: 'Your keeper coach', emoji: '🧤', cooldown: 3, when: [KEEPER],
    text: 'Preseason is two weeks away. Your keeper coach wants an extra hour a day on high balls into a packed six yard box: corners, deep free kicks, a couple of big centre halves leaning on you.',
    choices: [
      { label: 'Do the extra hour', reply: 'You stay out for the extra hour every day.', karma: 0, morale: -1, fx: { gk_aerial_command: 1 } },
      { label: 'Stick to the normal plan', reply: 'You keep to the normal preseason plan.', karma: 0 },
    ] }, 'Crosses into a crowded box', 'positive'],
  [{ id: '702', beat: 'summer', from: 'The analyst', emoji: '🎯', cooldown: 3, when: [KEEPER],
    text: 'The analyst has clips of every goal kick and back pass you played last season. The coaches want the build up to start with you next season.',
    choices: [
      { label: 'Work on short passing', reply: 'You spend the summer sessions passing out under pressure.', karma: 0, fx: { gk_distribution: 1 } },
      { label: 'Keep it simple', reply: 'You stick to clearing your lines.', karma: 0 },
    ] }, 'Playing it out from the back', 'positive'],
  [{ id: '703', beat: 'summer', from: 'Your keeper coach', emoji: '📂', cooldown: 4, when: [KEEPER],
    text: 'Your keeper coach has built a file on penalty takers: where they like to put it, how they run up, what they do when the pressure is on.',
    choices: [
      { label: 'Study it', reply: 'You go through the file until you know it by heart.', karma: 0, fx: { gk_penalty_saving: 1 } },
      { label: 'Trust your instincts', reply: 'You leave the file on the desk and trust your instincts.', karma: 0 },
    ] }, 'The penalty file', 'positive'],
  [{ id: '704', beat: 'summer', from: 'The coaching staff', emoji: '🏃', cooldown: 4, when: [KEEPER],
    text: 'The coaching staff want to push the defensive line higher next season. That leaves a lot of grass behind it for you to cover.',
    choices: [
      { label: 'Do the sprint work', reply: 'You put in the sprint work off your line.', karma: 0, morale: -1, fx: { gk_sweeping_speed: 1 } },
      { label: 'Stay on your line', reply: 'You keep to your usual starting position.', karma: 0 },
    ] }, 'Sweeping behind a high line', 'positive'],
  [{ id: '705', beat: 'summer', from: 'Your keeper coach', emoji: '🥅', cooldown: 3,
    when: [KEEPER, { fact: 'apps', op: '<', value: 15 }, { fact: 'sameClub', op: '==', value: true }],
    text: 'You did not get many games here last season. Your keeper coach thinks the shirt is there to be won in preseason, if you want it badly enough.',
    choices: [
      { label: 'One on one drills every day', reply: 'You face one on ones every day until your legs are gone.', karma: 0, fx: { gk_shot_stopping: 1 } },
      { label: 'Rest up first', reply: 'You take a proper break before the fight starts.', karma: 0, morale: 2 },
      { label: 'Carry on as normal', reply: 'You carry on as normal.', karma: 0 },
    ] }, 'Fighting for the shirt', 'negative'],
  /* ─── defenders (a CDM is a defender here, as in the drills) ─── */
  [{ id: '706', beat: 'summer', from: 'Your set piece coach', emoji: '🧱', cooldown: 3, when: [...DEFENDER],
    text: 'Your set piece coach is building a new zonal setup for defending corners and wants every defender to know it inside out. That means film sessions before the rest of the squad reports back.',
    choices: [
      { label: 'Learn it inside out', reply: 'You learn every run and every zone before anyone else is back.', karma: 0, morale: -1, fx: { t_defending: 1 } },
      { label: 'Learn it with everyone else', reply: 'You pick it up with the squad in preseason.', karma: 0 },
    ] }, 'A new way to defend corners', 'positive'],
  [{ id: '707', beat: 'summer', from: 'The coaching staff', emoji: '🔁', cooldown: 3, when: [...DEFENDER],
    text: 'The coaching staff expect teams to press high next season and want their defenders comfortable on the ball when they do.',
    choices: [
      { label: 'Do the passing work', reply: 'You spend the summer playing out of tight spaces.', karma: 0, fx: { t_passing: 1 } },
      { label: 'Play it safe', reply: 'You stick with going long when it gets tight.', karma: 0 },
    ] }, 'Playing out under a press', 'positive'],
  [{ id: '708', beat: 'summer', from: 'Your fitness coach', emoji: '💨', cooldown: 4, when: [...DEFENDER],
    text: 'Your fitness coach wants more pace in your recovery runs, so a quick winger cannot get away from you once he is goal side.',
    choices: [
      { label: 'Do the sprint work', reply: 'You grind through the sprint sessions.', karma: 0, morale: -1, fx: { t_pace: 1 } },
      { label: 'Keep your usual routine', reply: 'You keep your usual summer routine.', karma: 0 },
    ] }, 'Recovery runs', 'positive'],
  [{ id: '709', beat: 'summer', from: 'The analyst', emoji: '🟨', cooldown: 4, when: [...DEFENDER, { fact: 'yellows', op: '>=', value: 7 }],
    text: 'You picked up a lot of yellow cards last season. The analyst has put the clips together, and most of them come down to timing.',
    choices: [
      { label: 'Go through the clips', reply: 'You go through every booking with the analyst.', karma: 0, fx: { t_defending: 1 } },
      { label: 'Leave the clips', reply: 'You leave the clips for another day.', karma: 0 },
    ] }, 'Timing your tackles', 'negative'],
  [{ id: '710', beat: 'summer', from: 'The coaching staff', emoji: '📋', cooldown: 3, when: [...DEFENDER, { fact: 'age', op: '>=', value: 26 }],
    text: 'The coaching staff want an experienced voice leading the defensive walkthroughs in preseason, and they think it should be you.',
    choices: [
      { label: 'Run the walkthroughs', reply: 'You lead the walkthroughs every morning.', karma: 0, morale: -1, fx: { t_defending: 1 } },
      { label: 'Let the coaches run them', reply: 'You leave the walkthroughs to the coaches.', karma: 0 },
    ] }, 'Organising the defence', 'positive'],
  /* ─── midfielders ─── */
  [{ id: '711', beat: 'summer', from: 'The analyst', emoji: '🏃', cooldown: 3, when: [...MIDFIELDER],
    text: 'The coaches want you calling the pressing triggers in midfield next season. The analyst has a reel ready, and it comes with a lot of running before preseason starts.',
    choices: [
      { label: 'Learn the triggers', reply: 'You learn when to go and when to hold.', karma: 0, morale: -1, fx: { t_physical: 1 } },
      { label: 'Leave it to the coaches', reply: 'You leave the pressing calls to the coaches.', karma: 0 },
    ] }, 'When to press', 'positive'],
  [{ id: '712', beat: 'summer', from: 'Your set piece coach', emoji: '🎯', cooldown: 3, when: [...MIDFIELDER],
    text: 'Your set piece coach wants a reliable delivery from corners and wide free kicks next season, and has asked whether you want to put the extra work in.',
    choices: [
      { label: 'Do the delivery work', reply: 'You stay behind to whip balls in until it feels automatic.', karma: 0, fx: { t_passing: 1 } },
      { label: 'Leave it to the others', reply: 'You leave the set pieces to the others.', karma: 0 },
    ] }, 'Set piece delivery', 'positive'],
  [{ id: '713', beat: 'summer', from: 'The coaching staff', emoji: '🧲', cooldown: 3, when: [...MIDFIELDER],
    text: 'The coaching staff are running tight rondos every morning of preseason and want you in the middle of them, taking the ball with someone on your back.',
    choices: [
      { label: 'Get in the middle', reply: 'You spend the rondos in the middle, taking it under pressure.', karma: 0, fx: { t_dribbling: 1 } },
      { label: 'Stay on the outside', reply: 'You take your usual spot on the outside.', karma: 0 },
    ] }, 'First touch under pressure', 'positive'],
  [{ id: '714', beat: 'summer', from: 'The coaching staff', emoji: '🚀', cooldown: 4, when: [...MIDFIELDER, { fact: 'goals', op: '>=', value: 4 }],
    text: 'You chipped in with goals last season, and the coaching staff think there are more in you from outside the box.',
    choices: [
      { label: 'Stay late and shoot', reply: 'You stay late after every session hitting shots from range.', karma: 0, fx: { t_shooting: 1 } },
      { label: 'Keep it as it is', reply: 'You keep your game as it is.', karma: 0 },
    ] }, 'Shooting from distance', 'positive'],
  [{ id: '715', beat: 'summer', from: 'The analyst', emoji: '🧭', cooldown: 4, when: [...MIDFIELDER],
    text: 'The analyst has marked every time the space behind you opened up last season and wants you working on your defensive shape this summer.',
    choices: [
      { label: 'Do the shape work', reply: 'You put the hours into your defensive shape.', karma: 0, fx: { t_defending: 1 } },
      { label: 'Focus on going forward', reply: 'You keep your focus on going forward.', karma: 0 },
    ] }, 'Covering the space', 'positive'],
  /* ─── forwards (LW and RW are forwards here, as in the drills) ─── */
  [{ id: '716', beat: 'summer', from: 'The coaching staff', emoji: '⚽', cooldown: 4, when: [FORWARD],
    text: "The coaching staff are drawing up next season's penalty order. Put your name down and preseason starts with a hundred spot kicks a day.",
    choices: [
      { label: 'Put your name down', reply: 'You put your name down for penalties.', karma: 0, fx: { t_shooting: 1 } },
      { label: 'Let someone else take them', reply: 'You leave the penalties to someone else.', karma: 0 },
    ] }, 'Penalty duty', 'positive'],
  [{ id: '717', beat: 'summer', from: 'Your finishing coach', emoji: '🦶', cooldown: 3, when: [FORWARD],
    text: 'Your finishing coach reckons defenders have started showing you onto your weaker foot. A summer of finishing with it would change that.',
    choices: [
      { label: 'Do the weaker foot work', reply: 'You finish with your weaker foot every session.', karma: 0, fx: { t_shooting: 1 } },
      { label: 'Back your stronger foot', reply: 'You stick with your stronger foot.', karma: 0 },
    ] }, 'Your weaker foot', 'positive'],
  [{ id: '718', beat: 'summer', from: 'Your fitness coach', emoji: '🔋', cooldown: 4, when: [FORWARD],
    text: 'The press next season starts with the forwards, and your fitness coach wants you able to keep it up for ninety minutes.',
    choices: [
      { label: 'Do the sprint work', reply: 'You push through the sprint work.', karma: 0, morale: -1, fx: { t_pace: 1 } },
      { label: 'Keep your usual routine', reply: 'You keep your usual summer routine.', karma: 0 },
    ] }, 'Pressing from the front', 'positive'],
  [{ id: '719', beat: 'summer', from: 'Your finishing coach', emoji: '🥶', cooldown: 3,
    when: [FORWARD, { fact: 'goals', op: '<=', value: 3 }, { fact: 'apps', op: '>=', value: 15 }],
    text: 'You played plenty of games last season without scoring many. Your finishing coach has ideas, and there is also a case for just clearing your head.',
    choices: [
      { label: 'Extra finishing', reply: 'You book extra finishing sessions for the whole summer.', karma: 0, morale: -1, fx: { t_shooting: 1 } },
      { label: 'Clear your head', reply: 'You switch off and come back fresh.', karma: 0, morale: 2 },
      { label: 'Carry on as normal', reply: 'You carry on as normal.', karma: 0 },
    ] }, 'A quiet season in front of goal', 'negative'],
  [{ id: '720', beat: 'summer', from: 'The coaching staff', emoji: '⚡', cooldown: 3, when: [FORWARD],
    text: 'The coaching staff want you taking defenders on more next season and have set up one on one sessions for the summer.',
    choices: [
      { label: 'Do the one on one work', reply: 'You take on a defender in every session.', karma: 0, fx: { t_dribbling: 1 } },
      { label: 'Keep it simple', reply: 'You keep your game simple.', karma: 0 },
    ] }, 'Beating your man', 'positive'],
  /* ─── where a career stands (every group) ─── */
  [{ id: '721', beat: 'summer', from: 'The first team coach', emoji: '🌱', cooldown: 99, when: [{ fact: 'seniorSeasons', op: '<', value: 2 }],
    text: 'You have one senior season behind you. The first team coach wants you in early for preseason, training with the senior players from the first day.',
    choices: [
      { label: 'Go in early', reply: 'You go in early and stay late with the senior players.', karma: 0, morale: 1 },
      { label: 'Report on the usual day', reply: 'You report back on the usual day.', karma: 0 },
    ] }, 'Learning from the senior players', 'positive'],
  [{ id: '722', beat: 'summer', from: 'The sports science staff', emoji: '🧘', cooldown: 3, when: [{ fact: 'age', op: '>=', value: 31 }],
    text: 'The sports science staff have a load plan for the summer: fewer sessions, more recovery, so your legs are fresh when the season starts.',
    choices: [
      { label: 'Follow the load plan', reply: 'You follow the load plan to the letter.', karma: 0, morale: 2 },
      { label: 'Train as you always have', reply: 'You train the way you always have.', karma: 0 },
    ] }, 'Managing the miles', 'positive'],
  [{ id: '723', beat: 'summer', from: 'Your fitness coach', emoji: '📅', cooldown: 2, when: [{ fact: 'contractYear', op: '==', value: true }],
    text: 'You go into the last year of your contract, and your fitness coach wants you fresh for it.',
    choices: [
      { label: 'Take the full break', reply: 'You take the whole break and switch off.', karma: 0, morale: 2 },
      { label: 'Come back on the usual day', reply: 'You come back with everyone else.', karma: 0 },
    ] }, 'The last year of your deal', 'positive'],
  [{ id: '724', beat: 'summer', from: 'The medical staff', emoji: '🌍', cooldown: 2, when: [{ fact: 'capped', op: '==', value: true }],
    text: 'You played for your country last season, so the medical staff want you to take the whole break before preseason.',
    choices: [
      { label: 'Take the whole break', reply: 'You switch off for the whole break.', karma: 0, morale: 2 },
      { label: 'Come back on the usual day', reply: 'You come back with everyone else.', karma: 0 },
    ] }, 'Back from international duty', 'international'],
  [{ id: '725', beat: 'summer', from: 'The coaching staff', emoji: '🎖️', cooldown: 3, when: [{ fact: 'captain', op: '==', value: true }],
    text: 'You wear the armband here, and the coaching staff want you setting the tone in the first week of preseason.',
    choices: [
      { label: 'Set the tone', reply: 'You are first in and last out all week.', karma: 0, morale: 1 },
      { label: 'Let your work speak', reply: 'You get on with your own work.', karma: 0 },
    ] }, 'Setting the standard', 'positive'],
  [{ id: '726', beat: 'summer', from: 'The physio', emoji: '🩹', cooldown: 2, when: [{ fact: 'injuryWeeks', op: '>=', value: 8 }],
    text: 'You spent a long spell out injured last season. The physio wants you to ease back in this summer rather than rush it.',
    choices: [
      { label: 'Ease back in', reply: 'You take the summer slowly and ease back in.', karma: 0, morale: 2 },
      { label: 'Follow the usual plan', reply: 'You follow the usual summer plan.', karma: 0 },
    ] }, 'The return plan', 'negative'],
  [{ id: '727', beat: 'summer', from: 'The first team coach', emoji: '⭐', cooldown: 3,
    when: [{ fact: 'tier', op: '<', value: 2 }, { fact: 'age', op: '<=', value: 22 }],
    text: 'You are young and at one of the top clubs around. The first team coach wants you in early to train alongside the senior players.',
    choices: [
      { label: 'Go in early', reply: 'You go in early and keep up with the senior players.', karma: 0, morale: 1 },
      { label: 'Report on the usual day', reply: 'You report back on the usual day.', karma: 0 },
    ] }, 'Training with the best', 'positive'],
  [{ id: '728', beat: 'summer', from: 'The analyst', emoji: '🔥', cooldown: 3, when: [{ fact: 'derbies', op: '>=', value: 1 }],
    text: 'The analyst has cut together every derby you played last season, the good moments and the bad ones.',
    choices: [
      { label: 'Watch them all', reply: 'You watch every one of them, twice.', karma: 0, morale: 1 },
      { label: 'Leave them', reply: 'You leave the clips alone.', karma: 0 },
    ] }, 'Derby clips', 'positive'],
];

export const STARTER: SoccerDeckPack = {
  seat: 'soccer',
  label: 'Soccer Career',
  calendar: [{ id: 'summer', label: 'Summer', emoji: '☀️' }],
  span: { summer: 1 },
  facts: {
    pos: { kind: 'num', min: 0, max: 3.99, per: 'season' },
    age: { kind: 'num', min: 17, max: 39, per: 'season' },
    tier: { kind: 'num', min: 1, max: 4.99, per: 'season' },
    apps: { kind: 'num', min: 0, max: 60, per: 'season' },
    goals: { kind: 'num', min: 0, max: 40, per: 'season' },
    cleanSheets: { kind: 'num', min: 0, max: 25, per: 'season' },
    yellows: { kind: 'num', min: 0, max: 15, per: 'season' },
    rating: { kind: 'num', min: 5.5, max: 8.5, per: 'season' },
    injuryWeeks: { kind: 'num', min: 0, max: 40, per: 'season' },
    derbies: { kind: 'num', min: 0, max: 3, per: 'season' },
    room: { kind: 'num', min: 0, max: 10, per: 'season' },
    morale: { kind: 'num', min: 0, max: 100, per: 'season' },
    seniorSeasons: { kind: 'num', min: 1, max: 20, per: 'season' },
    capped: { kind: 'bool', p: 0.3, per: 'season' },
    captain: { kind: 'bool', p: 0.15, per: 'season' },
    contractYear: { kind: 'bool', p: 0.3, per: 'season' },
    sameClub: { kind: 'bool', p: 0.85, per: 'season' },
  },
  targets: {},
  meters: { trust: 'Karma', fans: 'Popularity', money: 'Cash', morale: 'Morale' },
  money: { prefix: '€', suffix: 'M' },
  perWeek: 1,
  cooldown: 3,
  chance: 1,
  clock: 'season',
  store: 'compact',
  /* The most the pack may push each meter it moves in a season. At most one card is dealt a summer, so a season's
     push can never pass the largest single option on that meter: morale +2 (and -1 the other way), a training key +1.
     No card moves integrity: simSoccerDeck section 8 measured the integrity options moving the recorded legacy score
     past its seed to seed spread (ruling 2(j)), so the pack dropped them; the key stays registered for a later pack. These are those bounds; scripts/simSoccerDeck.mjs section 8 measures what the real engine's
     fleet does under them, and the event deck kit's section 15 holds BEST and WORST to them. */
  pressure: {
    morale: 2,
    t_pace: 1, t_shooting: 1, t_passing: 1, t_dribbling: 1, t_defending: 1, t_physical: 1,
    gk_shot_stopping: 1, gk_aerial_command: 1, gk_distribution: 1, gk_penalty_saving: 1, gk_sweeping_speed: 1,
  },
  events: CARDS.map(([e]) => e),
  titles: Object.fromEntries(CARDS.map(([e, title]) => [e.id, title])),
  kinds: Object.fromEntries(CARDS.map(([e, , kind]) => [e.id, kind])),
};

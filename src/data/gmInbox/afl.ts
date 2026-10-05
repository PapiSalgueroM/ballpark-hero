/* Round 940: the Australian football desk's inbox. Data only, the rules are
   src/lib/gmInbox.ts.

   The seat is the one the site has: /aussie-rules-manager
   (src/lib/aussieRulesManager.ts), a fictional six club league of ten rounds
   with a squad of 36, selection, training or rest, and tactics. It has no
   trade period, draft, budget, members or contracts, so this pack has no beat
   or effect for any of them. Its year is the ten rounds (3, 4 and 3 below),
   and its options move only the inbox's own two meters (board trust, which
   every seat that binds the inbox carries, and the playing group's mood), one
   player's rating, or one player missing rounds. No option moves supporters
   or club funds: those two labels exist because every pack must name four
   meters, and they are never printed. A save is one season, so the two
   events that make sense once a career are one shots.

   Every voice is a club role and every man is a role: nothing here names or
   quotes anybody. The one real league rule the pack leans on is the
   suspension card's: a club can accept a ban from the match review or
   challenge it at the tribunal, and the tribunal can uphold it. Both options
   leave him out the same rounds, so the card never promises a challenge wins.
   Sources at the foot of the file. */
import type { GmInboxPack } from '@/lib/gmInbox';

export const AFL_GM_INBOX: GmInboxPack = {
  seat: 'afl',
  label: 'Australian football club',
  calendar: [
    { id: 'opening', label: 'Opening rounds', emoji: '🏉' },
    { id: 'middle', label: 'Middle rounds', emoji: '📋' },
    { id: 'runhome', label: 'Run home', emoji: '🏁' },
  ],
  span: { opening: 3, middle: 4, runhome: 3 },
  facts: {
    winPct: { kind: 'num', min: 0, max: 1, per: 'week' },
  },
  targets: {
    midfielder: 'Your best midfielder', youngster: 'Your homesick youngster',
    defender: 'Your reported defender', ruck: 'Your second ruck',
  },
  meters: { trust: 'Board trust', fans: 'Supporters', money: 'Club funds', morale: 'Playing group' },
  money: { prefix: 'A$', suffix: 'M' },
  perWeek: 1,
  cooldown: 10,
  chance: 0.5,
  events: [
    {
      id: 'afl_sore_midfielder', beat: 'opening', from: 'Your physio', emoji: '🩹',
      text: 'Your best midfielder pulled up sore at training. He could play through it this week or sit out a round.',
      choices: [
        { label: 'Sit him for a round', reply: 'Rest it.', karma: 0, out: { who: 'midfielder', weeks: 1 } },
        { label: 'Play him through it', reply: 'Strap it and go.', karma: 0, morale: 1, rating: { who: 'midfielder', delta: -1 } },
      ],
    },
    {
      id: 'afl_suspension', beat: 'middle', from: 'Your head of football', emoji: '⚖️', chance: 0.25,
      text: 'One of your defenders was reported on the weekend and the match review has handed him a ban. The club can accept it or challenge it at the tribunal, which can uphold it.',
      choices: [
        { label: 'Challenge it', reply: 'The tribunal upheld it, but the group saw you back him.', karma: -1, morale: 2, out: { who: 'defender', weeks: 2 } },
        { label: 'Accept it', reply: 'Cop it and move on.', karma: 1, out: { who: 'defender', weeks: 2 } },
      ],
    },
    {
      id: 'afl_go_home', beat: 'middle', from: 'Your player welfare manager', emoji: '🏠', oneShot: true,
      text: 'Your youngest player is homesick and wants a few days back home with his family before the run home.',
      choices: [
        { label: 'Give him a round at home', reply: 'Go and see your family.', karma: 0, morale: 1, out: { who: 'youngster', weeks: 1 } },
        { label: 'Keep him with the group', reply: 'We need you here.', karma: 0, morale: -1, rating: { who: 'youngster', delta: -1 } },
      ],
    },
    {
      id: 'afl_ruck_time', beat: 'middle', from: 'Your senior coach', emoji: '🧢', cooldown: 20,
      when: [{ fact: 'winPct', op: '<', value: 0.4 }],
      text: 'You are getting beaten at the stoppages. The senior coach wants extra ruck work this week for your second ruck.',
      choices: [
        { label: 'Give him the extra work', reply: 'Throw him in.', karma: 0, morale: -1, rating: { who: 'ruck', delta: 2 } },
        { label: 'Keep the setup as it is', reply: 'Stick with what we have.', karma: 0, morale: 1 },
      ],
    },
    {
      id: 'afl_where_he_stands', beat: 'runhome', from: 'His manager', emoji: '💼', oneShot: true,
      text: 'Your best midfielder wants to know where he stands at the club before the run home.',
      choices: [
        { label: 'Tell him he is the main man', reply: 'First name on the team sheet.', karma: 0, morale: -1, rating: { who: 'midfielder', delta: 1 } },
        { label: 'Treat him like everyone else', reply: 'Nobody is bigger than the club.', karma: 1, morale: 1, rating: { who: 'midfielder', delta: -1 } },
      ],
    },
    {
      id: 'afl_board_heat', beat: 'runhome', from: 'The board', emoji: '🏛️',
      when: [{ fact: 'winPct', op: '<', value: 0.3 }],
      text: 'The club is near the bottom of the ladder and the board wants a plan for next year before the season ends.',
      choices: [
        { label: 'Front the board', reply: 'Here is the plan.', karma: 2, morale: -1 },
        { label: 'Back the group in public', reply: 'This group will turn it around.', karma: -2, morale: 2 },
      ],
    },
  ],
};

/* SOURCES, each read 2026-10-03, two per rule. The copy carries no number, date or name from them.
   A club can accept a ban from the match review or challenge it at the tribunal:
     https://www.lions.com.au/news/1968067/lions-mro-update-bulldogs (the club challenges two sanctions, to be
     heard by the tribunal, and accepts a third)
     https://resources.afl.com.au/afl/document/2026/02/13/54c158af-15e9-483b-a195-62a0f4e33b11/AFL-Regulations-Final-11-February-2026-.pdf
     (Regulation 16.12(i)(iii) and (iv): an early plea accepts the sanction, otherwise the tribunal deals with it)
   A challenge at the tribunal can be upheld:
     https://www.melbournefc.com.au/news/1338851/hunter-sanction-upheld-at-afl-tribunal (the club challenged the
     match review grading and the ban was upheld)
     the same 2026 AFL Regulations, Regulation 19.6(a) (a charge the tribunal sustains takes the sanction of the
     match review's grading) */

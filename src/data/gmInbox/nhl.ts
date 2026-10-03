/* Round 940: the NHL desk's inbox. Data only, the rules are src/lib/gmInbox.ts.
   Every voice is a role and every man is a role: nothing here names or quotes
   anybody. The league rules the copy leans on (an offer sheet to a restricted
   free agent, a no trade clause list) carry no number or date, and their two
   sources are listed at the foot of this file. */
import type { GmInboxPack } from '@/lib/gmInbox';

export const NHL_GM_INBOX: GmInboxPack = {
  seat: 'nhl',
  label: 'NHL front office',
  calendar: [
    { id: 'july', label: 'Free agency', emoji: '📝' },
    { id: 'camp', label: 'Training camp', emoji: '⛸️' },
    { id: 'season', label: 'Regular season', emoji: '🏒' },
    { id: 'deadline', label: 'Trade deadline', emoji: '⏰' },
    { id: 'stretch', label: 'Stretch run', emoji: '🏁' },
    { id: 'offseason', label: 'Draft season', emoji: '🎓' },
  ],
  span: { july: 2, camp: 2, season: 10, deadline: 1, stretch: 6, offseason: 1 },
  facts: {
    rfaStar: { kind: 'bool', p: 0.3, per: 'season' },
    ntcVet: { kind: 'bool', p: 0.35, per: 'season' },
    threeGoalies: { kind: 'bool', p: 0.3, per: 'season' },
    winPct: { kind: 'num', min: 0.2, max: 0.75, per: 'week' },
    starHurt: { kind: 'bool', p: 0.12, per: 'week' },
  },
  targets: { young: 'Your young center', dman: 'Your top defenceman', kidGoalie: 'Your young goalie' },
  meters: { trust: 'Owner trust', fans: 'Fans', money: 'Budget', morale: 'Room' },
  money: { prefix: '$', suffix: 'M' },
  perWeek: 1,
  cooldown: 22,
  chance: 0.35,
  events: [
    {
      id: 'nhl_offer_sheet', beat: 'july', from: 'Your capologist', emoji: '📑',
      when: [{ fact: 'rfaStar', op: '==', value: true }],
      text: 'Another club is circling your restricted free agent with an offer sheet. If one is signed you can match it, or let him go and usually get draft picks back.',
      choices: [
        { label: 'Sign him before they can', reply: 'Get him done today.', karma: 1, cash: -2, morale: 2 },
        { label: 'Wait them out', reply: 'Let them try. We will match.', karma: -1, morale: -2 },
      ],
    },
    {
      id: 'nhl_crowded_crease', beat: 'camp', from: 'Your goalie coach', emoji: '🥅',
      when: [{ fact: 'threeGoalies', op: '==', value: true }],
      text: 'Three goalies, two spots. Somebody has to go, and the young one would play every night in the minors.',
      choices: [
        { label: 'Carry all three', reply: 'Keep them all for now.', karma: 0, cash: -0.5, morale: -1 },
        { label: 'Send the kid down to play', reply: 'Starts are what he needs.', karma: 1, rating: { who: 'kidGoalie', delta: 1 } },
      ],
    },
    {
      id: 'nhl_line_juggle', beat: 'season', from: 'Your head coach', emoji: '🧢',
      when: [{ fact: 'winPct', op: '<', value: 0.4 }],
      text: 'The top line has gone cold. The coach wants to break it up and move your young center up.',
      choices: [
        { label: 'Promote the kid', reply: 'Top line, tonight.', karma: 0, popularity: 2, morale: -1, rating: { who: 'young', delta: 2 } },
        { label: 'Keep the lines', reply: 'They will come out of it.', karma: 0, popularity: -1, morale: 1 },
      ],
    },
    {
      id: 'nhl_heavy_hit', beat: 'season', from: 'Team doctor', emoji: '🩺',
      when: [{ fact: 'starHurt', op: '==', value: true }],
      text: 'Your top defenceman took a heavy hit. He could dress tonight, the doctor would rather he sat.',
      choices: [
        { label: 'Sit him', reply: 'He sits.', karma: 1, out: { who: 'dman', weeks: 1 } },
        { label: 'Dress him', reply: 'He plays.', karma: -1, popularity: 1, rating: { who: 'dman', delta: -2 } },
      ],
    },
    {
      id: 'nhl_no_trade_list', beat: 'deadline', from: 'His agent', emoji: '💼',
      when: [{ fact: 'ntcVet', op: '==', value: true }, { fact: 'winPct', op: '<', value: 0.45 }],
      text: 'Your veteran with a no trade clause has sent over the teams he would accept a move to. The list is short.',
      choices: [
        { label: 'Work the list', reply: 'Call all of them.', karma: 2, cash: 1, morale: -2, popularity: -2 },
        { label: 'Keep him', reply: 'He finishes the year here.', karma: -2, morale: 1 },
      ],
    },
    {
      id: 'nhl_deadline_buy', beat: 'deadline', from: 'Ownership', emoji: '🏢',
      when: [{ fact: 'winPct', op: '>=', value: 0.55 }],
      text: 'You are in a playoff spot. Ownership will add salary for a depth forward at the deadline.',
      choices: [
        { label: 'Add him', reply: 'Go get him.', karma: 3, cash: -2, morale: 2 },
        { label: 'Stand pat', reply: 'This group got us here.', karma: -2, morale: -1 },
      ],
    },
    {
      id: 'nhl_fan_promo', beat: 'stretch', from: 'Ticket office', emoji: '🎟️',
      when: [{ fact: 'winPct', op: '<', value: 0.35 }],
      text: 'The playoffs are out of reach and the rink is quiet. The ticket office wants a cheap seats weekend.',
      choices: [
        { label: 'Run it', reply: 'Fill the rink.', karma: 0, cash: -0.5, popularity: 3 },
        { label: 'Hold the prices', reply: 'No discounts.', karma: 1, popularity: -2 },
      ],
    },
    {
      id: 'nhl_junior_trip', beat: 'offseason', from: 'Your scouting director', emoji: '🔭',
      text: 'The draft is coming and the scouts want money for one more trip to watch junior hockey.',
      choices: [
        { label: 'Fund the trip', reply: 'Go see him again.', karma: 1, cash: -0.5 },
        { label: 'Use the tape', reply: 'We have seen enough.', karma: -1 },
      ],
    },
  ],
};

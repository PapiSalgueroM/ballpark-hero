/* Round 940: the fight gym's inbox. Data only, the rules are src/lib/gmInbox.ts.
   Every fighter at the gym is generated (fightGym.ts), and even so nobody
   here is named or quoted: every voice is a role (your head trainer, a
   promoter, his manager) and every man is a role. The gym has no fan meter
   and no room, so no option here moves either: reputation is its trust
   meter and money is its budget, in millions like the gym's own books. */
import type { GmInboxPack } from '@/lib/gmInbox';

export const GYM_GM_INBOX: GmInboxPack = {
  seat: 'gym',
  label: 'Fight gym',
  calendar: [
    { id: 'camp', label: 'Fight camp', emoji: '🥊' },
    { id: 'fightweek', label: 'Fight week', emoji: '⚖️' },
    { id: 'downtime', label: 'Between fights', emoji: '🛋️' },
  ],
  span: { camp: 8, fightweek: 2, downtime: 6 },
  facts: {
    contenderUnhappy: { kind: 'bool', p: 0.3, per: 'season' },
    money: { kind: 'num', min: 0, max: 3, per: 'season' },
    shortNotice: { kind: 'bool', p: 0.25, per: 'week' },
    weightTrouble: { kind: 'bool', p: 0.25, per: 'week' },
    sparringHard: { kind: 'bool', p: 0.2, per: 'week' },
  },
  targets: { fighter: 'Your top fighter', prospect: 'Your prospect', cutter: 'The fighter cutting weight' },
  meters: { trust: 'Reputation', fans: 'Following', money: 'Gym money', morale: 'Gym mood' },
  money: { prefix: '$', suffix: 'M' },
  perWeek: 1,
  cooldown: 14,
  chance: 0.35,
  events: [
    {
      id: 'gym_sparring_knock', beat: 'camp', from: 'Your head trainer', emoji: '🥊',
      when: [{ fact: 'sparringHard', op: '==', value: true }],
      text: 'Hard sparring this week and your top fighter took a knock. The trainer would ease off.',
      choices: [
        { label: 'Ease off for a week', reply: 'Light work only.', karma: 1, out: { who: 'fighter', weeks: 1 } },
        { label: 'Keep the hard rounds', reply: 'Camp is camp.', karma: -1, rating: { who: 'fighter', delta: 1 } },
      ],
    },
    {
      id: 'gym_shorts_sponsor', beat: 'camp', from: 'A local sponsor', emoji: '🏪',
      when: [{ fact: 'money', op: '<', value: 1 }],
      text: 'A car wash down the road wants its name on your fighter\'s shorts for the next camp.',
      choices: [
        { label: 'Take the deal', reply: 'Money is money.', karma: 0, cash: 0.05 },
        { label: 'Keep the shorts clean', reply: 'Not this time.', karma: 1 },
      ],
    },
    {
      id: 'gym_missed_weight', beat: 'fightweek', from: 'Your nutritionist', emoji: '🥗',
      when: [{ fact: 'weightTrouble', op: '==', value: true }],
      text: 'The fighter cutting weight is still over the night before the weigh in.',
      choices: [
        { label: 'Pull him out', reply: 'Not worth his health.', karma: 1, cash: -0.05, out: { who: 'cutter', weeks: 2 } },
        { label: 'Make the cut, whatever it takes', reply: 'Sauna, now.', karma: -1, rating: { who: 'cutter', delta: -2 } },
      ],
    },
    {
      id: 'gym_short_notice', beat: 'downtime', from: 'A promoter', emoji: '📞',
      when: [{ fact: 'shortNotice', op: '==', value: true }],
      text: 'A promoter has a short notice slot for your prospect. Good money, no camp, and a hungry opponent.',
      choices: [
        { label: 'Rush him in for the payday', reply: 'He is ready enough.', karma: 1, cash: 0.1, rating: { who: 'prospect', delta: -1 } },
        { label: 'Wait for a full camp', reply: 'He needs a full camp.', karma: -1 },
      ],
    },
    {
      id: 'gym_wants_out', beat: 'downtime', from: 'His manager', emoji: '💼',
      when: [{ fact: 'contenderUnhappy', op: '==', value: true }],
      text: 'Your top fighter\'s manager says he wants out of his deal with the gym unless the split changes.',
      choices: [
        { label: 'Improve his split', reply: 'Fair enough, he has earned it.', karma: 2, cash: -0.1 },
        { label: 'Hold him to the deal', reply: 'A deal is a deal.', karma: -3, rating: { who: 'fighter', delta: -1 } },
      ],
    },
    {
      id: 'gym_six_am_kid', beat: 'downtime', from: 'Your head trainer', emoji: '🥊',
      text: 'A kid from the neighbourhood keeps turning up at six every morning. The trainer wants to give him a free membership.',
      choices: [
        { label: 'Give it to him', reply: 'Let him train.', karma: 2, cash: -0.02 },
        { label: 'He pays like everyone', reply: 'Rules are rules.', karma: -1 },
      ],
    },
  ],
};

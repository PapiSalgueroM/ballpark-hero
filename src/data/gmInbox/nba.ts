/* Round 940: the NBA desk's inbox. Data only, the rules are src/lib/gmInbox.ts.
   Every voice is a role and every man is a role: nothing here names or quotes
   anybody. The league rules the copy leans on (the buyout market, extension
   eligibility, the luxury tax) carry no number or date, and their two sources
   are listed at the foot of this file. */
import type { GmInboxPack } from '@/lib/gmInbox';

export const NBA_GM_INBOX: GmInboxPack = {
  seat: 'nba',
  label: 'NBA front office',
  calendar: [
    { id: 'summer', label: 'Summer', emoji: '☀️' },
    { id: 'camp', label: 'Training camp', emoji: '🏀' },
    { id: 'season', label: 'Regular season', emoji: '🗓️' },
    { id: 'deadline', label: 'Trade deadline', emoji: '⏰' },
    { id: 'buyout', label: 'Buyout market', emoji: '🛒' },
    { id: 'stretch', label: 'Stretch run', emoji: '🏁' },
    { id: 'lottery', label: 'Lottery season', emoji: '🎱' },
  ],
  span: { summer: 2, camp: 1, season: 10, deadline: 1, buyout: 1, stretch: 6, lottery: 1 },
  facts: {
    starExtEligible: { kind: 'bool', p: 0.3, per: 'season' },
    starUnhappy: { kind: 'bool', p: 0.25, per: 'season' },
    overTax: { kind: 'bool', p: 0.3, per: 'season' },
    youngCore: { kind: 'bool', p: 0.5, per: 'season' },
    winPct: { kind: 'num', min: 0, max: 1, per: 'week' },
    starHurt: { kind: 'bool', p: 0.12, per: 'week' },
  },
  targets: { star: 'Your best player', young: 'Your young guard' },
  meters: { trust: 'Owner trust', fans: 'Fans', money: 'Budget', morale: 'Locker room' },
  money: { prefix: '$', suffix: 'M' },
  perWeek: 1,
  cooldown: 22,
  chance: 0.35,
  events: [
    {
      id: 'nba_trade_demand', beat: 'deadline', from: 'His agent', emoji: '💼',
      when: [{ fact: 'starUnhappy', op: '==', value: true }, { fact: 'winPct', op: '<', value: 0.45 }],
      text: 'Word from your best player\'s agent: he would like a trade before the deadline. It has not leaked yet.',
      choices: [
        { label: 'Tell his agent you will listen', reply: 'Bring me the best package out there.', karma: 1, popularity: -5, morale: -2 },
        { label: 'Tell his agent he is staying', reply: 'He is not going anywhere.', karma: 2, morale: -3, popularity: 1 },
      ],
    },
    {
      id: 'nba_buyout_vet', beat: 'buyout', from: 'Your assistant GM', emoji: '🗂️',
      when: [{ fact: 'winPct', op: '>=', value: 0.55 }],
      text: 'The buyout market is open. Your assistant GM wants money set aside in case a veteran shooter comes free.',
      choices: [
        { label: 'Set the money aside', reply: 'Be ready to move.', karma: 2, cash: -1, morale: 1 },
        { label: 'Keep the minutes for the kid', reply: 'The minutes stay with our guy.', karma: -1, rating: { who: 'young', delta: 1 } },
      ],
    },
    {
      id: 'nba_extension', beat: 'summer', from: 'Your capologist', emoji: '📑',
      when: [{ fact: 'starExtEligible', op: '==', value: true }],
      text: 'Your best player is eligible for an extension this summer. Sign now at today\'s number, or wait and pay what he is worth next year.',
      choices: [
        { label: 'Open extension talks now', reply: 'Let us get it done this summer.', karma: 2, morale: 3 },
        { label: 'Wait a year', reply: 'Let him prove it first.', karma: -1, morale: -2 },
      ],
    },
    {
      id: 'nba_tax_bill', beat: 'summer', from: 'Ownership', emoji: '🏢',
      when: [{ fact: 'overTax', op: '==', value: true }],
      text: 'You are over the luxury tax line and ownership has been reading the bill. They want the travel and staff extras trimmed.',
      choices: [
        { label: 'Trim the extras', reply: 'Cut what we can.', karma: 3, cash: 2, morale: -2 },
        { label: 'Keep the extras', reply: 'This roster is worth it.', karma: -3, morale: 1 },
      ],
    },
    {
      id: 'nba_minutes', beat: 'season', from: 'Your head coach', emoji: '🧢',
      when: [{ fact: 'youngCore', op: '==', value: true }, { fact: 'winPct', op: '<', value: 0.4 }],
      text: 'The young guard is ready for more minutes, and the veteran ahead of him is not thrilled about it.',
      choices: [
        { label: 'Make the kid the priority', reply: 'Let him play through mistakes.', karma: 0, popularity: 2, morale: -2, rating: { who: 'young', delta: 2 } },
        { label: 'Keep the rotation as it is', reply: 'Minutes are earned.', karma: 0, popularity: -1, morale: 2 },
      ],
    },
    {
      id: 'nba_back_to_back', beat: 'season', from: 'Your training staff', emoji: '🩺',
      when: [{ fact: 'starHurt', op: '==', value: true }],
      text: 'Your best player\'s knee is sore going into the second night of a back to back.',
      choices: [
        { label: 'Rest him', reply: 'Sit him tonight.', karma: 1, popularity: -2, out: { who: 'star', weeks: 1 } },
        { label: 'Play him', reply: 'He plays, watch his minutes.', karma: -1, popularity: 1, rating: { who: 'star', delta: -1 } },
      ],
    },
    {
      id: 'nba_scout_trip', beat: 'lottery', from: 'Your scouting director', emoji: '🔭',
      when: [{ fact: 'winPct', op: '<', value: 0.35 }],
      text: 'You are headed for the lottery. The scouts want money for one more trip overseas to see a prospect.',
      choices: [
        { label: 'Fund the trip', reply: 'Go see him twice.', karma: 1, cash: -0.5 },
        { label: 'Stay home', reply: 'The tape will do.', karma: -1 },
      ],
    },
    {
      id: 'nba_jersey_night', beat: 'stretch', from: 'Marketing', emoji: '📣',
      when: [{ fact: 'winPct', op: '>=', value: 0.6 }],
      text: 'You are winning and the building is loud. Marketing wants an alternate jersey night.',
      choices: [
        { label: 'Do it', reply: 'Sell the jerseys.', karma: 0, cash: 1, popularity: 2 },
        { label: 'Not in the middle of a race', reply: 'After the season.', karma: 0, morale: 1 },
      ],
    },
  ],
};

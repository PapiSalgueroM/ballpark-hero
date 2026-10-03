/* Round 940: the NFL desk's inbox. Data only, the rules are src/lib/gmInbox.ts.
   Every voice is a role and every man is a role: nothing here names or quotes
   anybody. The league rules the copy leans on (a tagged player's long term
   deal deadline, cut down day) carry no number or date, and their two
   sources are listed at the foot of this file. */
import type { GmInboxPack } from '@/lib/gmInbox';

export const NFL_GM_INBOX: GmInboxPack = {
  seat: 'nfl',
  label: 'NFL front office',
  calendar: [
    { id: 'tag', label: 'Tag deadline', emoji: '🏷️' },
    { id: 'camp', label: 'Training camp', emoji: '🏕️' },
    { id: 'cutdown', label: 'Cut down day', emoji: '✂️' },
    { id: 'season', label: 'Regular season', emoji: '🏈' },
    { id: 'deadline', label: 'Trade deadline', emoji: '⏰' },
    { id: 'stretch', label: 'Stretch run', emoji: '🏁' },
    { id: 'winter', label: 'Offseason', emoji: '🌨️' },
  ],
  span: { tag: 1, camp: 2, cutdown: 1, season: 8, deadline: 1, stretch: 7, winter: 2 },
  facts: {
    starExpiring: { kind: 'bool', p: 0.35, per: 'season' },
    tagged: { kind: 'bool', p: 0.3, per: 'season' },
    capSpace: { kind: 'num', min: -5, max: 40, per: 'season' },
    rookieQB: { kind: 'bool', p: 0.3, per: 'season' },
    winPct: { kind: 'num', min: 0, max: 1, per: 'week' },
    starHurt: { kind: 'bool', p: 0.12, per: 'week' },
  },
  targets: { star: 'Your franchise player', rookie: 'Your rookie quarterback', kid: 'Your undrafted rookie' },
  meters: { trust: 'Owner trust', fans: 'Fans', money: 'Budget', morale: 'Locker room' },
  money: { prefix: '$', suffix: 'M' },
  perWeek: 1,
  cooldown: 22,
  chance: 0.35,
  events: [
    {
      id: 'nfl_holdout', beat: 'camp', from: 'His camp', emoji: '💼',
      when: [{ fact: 'starExpiring', op: '==', value: true }],
      text: 'Your franchise player has not reported to camp. His camp wants a new deal before he takes a snap.',
      choices: [
        { label: 'Find money to get him in', reply: 'Get him in before the pads come on.', karma: -2, cash: -3, morale: 3, popularity: 3 },
        { label: 'Hold firm and wait', reply: 'Camp is not optional.', karma: 2, morale: -3, out: { who: 'star', weeks: 2 } },
      ],
    },
    {
      id: 'nfl_tag_deadline', beat: 'tag', from: 'Your capologist', emoji: '📑',
      when: [{ fact: 'tagged', op: '==', value: true }],
      text: 'This is the last week to work out a long term deal with your tagged player. After it he plays the year on the tag.',
      choices: [
        { label: 'Make him a long term offer', reply: 'Put a real offer on the table.', karma: 1, morale: 2 },
        { label: 'Let him play on the tag', reply: 'One year, and we talk again.', karma: 0, morale: -2, popularity: -1 },
      ],
    },
    {
      id: 'nfl_cutdown_last_spot', beat: 'cutdown', from: 'Your head coach', emoji: '🧢',
      text: 'Cut down day. The coach wants to know who gets the reps in the last practice: a veteran who knows the system, or the undrafted kid who flew around all camp.',
      choices: [
        { label: 'Reps to the veteran', reply: 'Experience first.', karma: 1, morale: 2 },
        { label: 'Reps to the kid', reply: 'He earned a look.', karma: 0, popularity: 2, rating: { who: 'kid', delta: 2 } },
      ],
    },
    {
      id: 'nfl_cutdown_money', beat: 'cutdown', from: 'Your capologist', emoji: '📑',
      when: [{ fact: 'capSpace', op: '<', value: 5 }],
      text: 'You are tight against the cap. Your capologist wants to ask a veteran to take less this year, and the room will not love it.',
      choices: [
        { label: 'Ask for the pay cut', reply: 'Make the call.', karma: 2, cash: 1.5, morale: -3 },
        { label: 'Leave his deal alone', reply: 'Find the room somewhere else.', karma: -2, morale: 1 },
      ],
    },
    {
      id: 'nfl_qb_room', beat: 'season', from: 'Your offensive coordinator', emoji: '📋',
      when: [{ fact: 'rookieQB', op: '==', value: true }, { fact: 'winPct', op: '<', value: 0.4 }],
      text: 'The rookie quarterback has been sharp in practice and the starter is not winning. The room wants to know who plays Sunday.',
      choices: [
        { label: 'First team reps to the rookie', reply: 'Let him take the reps.', karma: 1, popularity: 3, morale: -2, rating: { who: 'rookie', delta: 2 } },
        { label: 'Keep the reps as they are', reply: 'We ride with the starter.', karma: -1, popularity: -2, morale: 2 },
      ],
    },
    {
      id: 'nfl_play_through', beat: 'season', from: 'Team doctor', emoji: '🩺',
      when: [{ fact: 'starHurt', op: '==', value: true }],
      text: 'Your franchise player could play through the ankle this week, or sit and let it settle properly.',
      choices: [
        { label: 'Sit him', reply: 'Two weeks off. No arguments.', karma: 1, out: { who: 'star', weeks: 2 } },
        { label: 'Play him', reply: 'Tape it and go.', karma: -1, popularity: 2, rating: { who: 'star', delta: -2 } },
      ],
    },
    {
      id: 'nfl_deadline_buy', beat: 'deadline', from: 'Ownership', emoji: '🏢',
      when: [{ fact: 'winPct', op: '>=', value: 0.6 }],
      text: 'You are in the race. Ownership wants to know if you are buying at the deadline, and the room is listening.',
      choices: [
        { label: 'Tell ownership you are working the phones', reply: 'We are going for it.', karma: 3, morale: -1 },
        { label: 'Tell the room this group is enough', reply: 'This group has done it so far.', karma: -3, morale: 3 },
      ],
    },
    {
      id: 'nfl_deadline_sell', beat: 'deadline', from: 'Ownership', emoji: '🏢',
      when: [{ fact: 'winPct', op: '<', value: 0.35 }],
      text: 'The season is slipping. Ownership wants a plan, and selling a veteran for picks is one.',
      choices: [
        { label: 'Say you will listen on veterans', reply: 'Picks would help.', karma: 2, morale: -3, popularity: -2 },
        { label: 'Back the group', reply: 'Nobody is giving up.', karma: -3, morale: 2 },
      ],
    },
    {
      id: 'nfl_fan_night', beat: 'stretch', from: 'Ticket office', emoji: '🎟️',
      when: [{ fact: 'winPct', op: '<', value: 0.3 }],
      text: 'Renewals are soft after a rough year. The ticket office wants a fan night with cheap seats.',
      choices: [
        { label: 'Run the promo', reply: 'Fill the place.', karma: 0, cash: -0.5, popularity: 4 },
        { label: 'No discounts', reply: 'Win and they come back.', karma: 1, popularity: -2 },
      ],
    },
    {
      id: 'nfl_staff_review', beat: 'winter', from: 'Ownership', emoji: '🏢',
      when: [{ fact: 'winPct', op: '<', value: 0.4 }],
      text: 'Ownership wants to know whether the coaching staff is coming back next year.',
      choices: [
        { label: 'Back the staff', reply: 'They stay. The problem is the roster.', karma: -4, morale: 3 },
        { label: 'Promise changes', reply: 'Changes are coming.', karma: 3, morale: -3 },
      ],
    },
  ],
};

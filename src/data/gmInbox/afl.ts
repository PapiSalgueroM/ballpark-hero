/* Round 940: the Australian football desk's inbox. Data only, the rules are
   src/lib/gmInbox.ts. Every voice is a club role (your list manager, the
   senior coach, the football manager) and every man is a role: nothing here
   names or quotes anybody. The trade period and the draft appear as words,
   with no number, date or rule beyond their names. */
import type { GmInboxPack } from '@/lib/gmInbox';

export const AFL_GM_INBOX: GmInboxPack = {
  seat: 'afl',
  label: 'Australian football club',
  calendar: [
    { id: 'preseason', label: 'Preseason', emoji: '🏃' },
    { id: 'season', label: 'Home and away', emoji: '🏉' },
    { id: 'runhome', label: 'Run home', emoji: '🏁' },
    { id: 'trade', label: 'Trade period', emoji: '🔁' },
    { id: 'draft', label: 'Draft', emoji: '🎓' },
  ],
  span: { preseason: 2, season: 12, runhome: 4, trade: 1, draft: 1 },
  facts: {
    starOutOfContract: { kind: 'bool', p: 0.35, per: 'season' },
    interstateDraftee: { kind: 'bool', p: 0.3, per: 'season' },
    youngRuck: { kind: 'bool', p: 0.5, per: 'season' },
    suspended: { kind: 'bool', p: 0.08, per: 'week' },
    winPct: { kind: 'num', min: 0, max: 1, per: 'week' },
  },
  targets: { draftee: 'Your interstate draftee', suspended: 'Your suspended defender', ruck: 'Your young ruck' },
  meters: { trust: 'Board trust', fans: 'Members', money: 'Budget', morale: 'Playing group' },
  money: { prefix: 'A$', suffix: 'M' },
  perWeek: 1,
  cooldown: 20,
  chance: 0.5,
  events: [
    {
      id: 'afl_altitude_camp', beat: 'preseason', from: 'Your high performance manager', emoji: '🏔️',
      text: 'A high altitude camp would cost money this preseason, and the playing group is split on it.',
      choices: [
        { label: 'Book the camp', reply: 'Pack the bags.', karma: 1, cash: -0.2, morale: 1 },
        { label: 'Train at home', reply: 'Our own track will do.', karma: -1 },
      ],
    },
    {
      id: 'afl_suspension', beat: 'season', from: 'Your football manager', emoji: '📋',
      when: [{ fact: 'suspended', op: '==', value: true }],
      text: 'One of your key defenders has been handed a suspension. You can challenge it or take the weeks.',
      choices: [
        { label: 'Challenge it', reply: 'Get the lawyers in.', karma: -1, cash: -0.05, out: { who: 'suspended', weeks: 1 } },
        { label: 'Take the weeks', reply: 'Cop it and move on.', karma: 1, out: { who: 'suspended', weeks: 2 } },
      ],
    },
    {
      id: 'afl_ruck_time', beat: 'season', from: 'Your senior coach', emoji: '🧢',
      when: [{ fact: 'youngRuck', op: '==', value: true }, { fact: 'winPct', op: '<', value: 0.4 }],
      text: 'You are getting beaten at the stoppages. The senior coach asks whether the young ruck should become the priority.',
      choices: [
        { label: 'Make the young ruck the priority', reply: 'Throw him in.', karma: 0, morale: -1, rating: { who: 'ruck', delta: 2 } },
        { label: 'Keep the setup as it is', reply: 'Stick with what we have.', karma: 0, morale: 1, popularity: -1 },
      ],
    },
    {
      id: 'afl_member_drive', beat: 'runhome', from: 'Membership team', emoji: '🎟️',
      when: [{ fact: 'winPct', op: '>=', value: 0.6 }],
      text: 'You are a finals chance. The membership team wants a member drive while the club is winning.',
      choices: [
        { label: 'Run the drive', reply: 'Sign them up.', karma: 0, cash: 0.2, popularity: 2 },
        { label: 'Keep the focus on footy', reply: 'After the season.', karma: 0, morale: 1 },
      ],
    },
    {
      id: 'afl_contract_standoff', beat: 'runhome', from: 'His manager', emoji: '💼',
      when: [{ fact: 'starOutOfContract', op: '==', value: true }],
      text: 'Your best midfielder is out of contract at the end of the year and his manager says talks have stalled.',
      choices: [
        { label: 'Table a better offer', reply: 'Put more on the table.', karma: -1, cash: -0.3, morale: 2 },
        { label: 'Hold your offer', reply: 'It is a fair offer.', karma: 2, morale: -2, popularity: -2 },
      ],
    },
    {
      id: 'afl_go_home', beat: 'trade', from: 'Your list manager', emoji: '📋',
      when: [{ fact: 'interstateDraftee', op: '==', value: true }],
      text: 'Your interstate draftee is homesick and his manager has raised a trade back to his home state.',
      choices: [
        { label: 'Help him settle in', reply: 'Fly his family over.', karma: 0, cash: -0.05, rating: { who: 'draftee', delta: 1 } },
        { label: 'Say you will listen', reply: 'We will hear offers.', karma: 1, morale: -2, popularity: -1 },
      ],
    },
    {
      id: 'afl_scouting_trip', beat: 'draft', from: 'Your recruiting manager', emoji: '🔭',
      text: 'The draft is close and the recruiters want money for one more trip to watch a prospect interstate.',
      choices: [
        { label: 'Fund the trip', reply: 'Go and see him.', karma: 1, cash: -0.05 },
        { label: 'Use the vision', reply: 'The vision will do.', karma: -1 },
      ],
    },
  ],
};

/* Round 940: the MLB desk's inbox. Data only, the rules are src/lib/gmInbox.ts.
   Every voice is a role and every man is a role: nothing here names or quotes
   anybody. The league rules the copy leans on (the qualifying offer, salary
   arbitration figures, a prospect's service time) carry no number or date,
   and their two sources are listed at the foot of this file. */
import type { GmInboxPack } from '@/lib/gmInbox';

export const MLB_GM_INBOX: GmInboxPack = {
  seat: 'mlb',
  label: 'MLB front office',
  calendar: [
    { id: 'qo', label: 'Qualifying offer call', emoji: '📨' },
    { id: 'winter', label: 'Arbitration winter', emoji: '⚖️' },
    { id: 'spring', label: 'Spring training', emoji: '🌴' },
    { id: 'season', label: 'Regular season', emoji: '⚾' },
    { id: 'deadline', label: 'Trade deadline', emoji: '⏰' },
    { id: 'stretch', label: 'Stretch run', emoji: '🏁' },
  ],
  span: { qo: 1, winter: 2, spring: 2, season: 10, deadline: 1, stretch: 6 },
  facts: {
    expiringStar: { kind: 'bool', p: 0.3, per: 'season' },
    arbEligible: { kind: 'bool', p: 0.5, per: 'season' },
    topProspect: { kind: 'bool', p: 0.35, per: 'season' },
    youngArm: { kind: 'bool', p: 0.35, per: 'season' },
    winPct: { kind: 'num', min: 0.25, max: 0.7, per: 'week' },
    starHurt: { kind: 'bool', p: 0.12, per: 'week' },
  },
  targets: { prospect: 'Your top prospect', youngArm: 'Your young starter', ace: 'Your ace' },
  meters: { trust: 'Owner trust', fans: 'Fans', money: 'Budget', morale: 'Clubhouse' },
  money: { prefix: '$', suffix: 'M' },
  perWeek: 1,
  cooldown: 22,
  chance: 0.5,
  events: [
    {
      id: 'mlb_qualifying_offer', beat: 'qo', from: 'Your capologist', emoji: '📑',
      when: [{ fact: 'expiringStar', op: '==', value: true }],
      text: 'Your best free agent to be is about to hit the market. Make him the qualifying offer and he either takes the year or you may get a pick back when he signs elsewhere.',
      choices: [
        { label: 'Make him the offer', reply: 'Put it in front of him.', karma: 2, morale: 1 },
        { label: 'Do not make the offer', reply: 'We have other plans.', karma: -1, popularity: -3 },
      ],
    },
    {
      id: 'mlb_arb_figures', beat: 'winter', from: 'Your arbitration team', emoji: '⚖️',
      when: [{ fact: 'arbEligible', op: '==', value: true }],
      text: 'Arbitration figures are swapped with your starting second baseman, and the gap between the two numbers is wide. Settle or go to a hearing?',
      choices: [
        { label: 'Settle in the middle', reply: 'Meet him halfway.', karma: 0, cash: -1, morale: 2 },
        { label: 'Go to a hearing', reply: 'We like our number.', karma: 1, morale: -3 },
      ],
    },
    {
      id: 'mlb_service_clock', beat: 'spring', from: 'Your farm director', emoji: '🌱',
      when: [{ fact: 'topProspect', op: '==', value: true }],
      text: 'Your top prospect tore up spring and the fans want him up on opening day. Holding him down a few weeks can keep an extra year of control. Your farm director wants to know what to tell him.',
      choices: [
        { label: 'Tell him he has earned it', reply: 'He has earned it.', karma: 0, popularity: 3, morale: 2, rating: { who: 'prospect', delta: 1 } },
        { label: 'Tell him a few more weeks', reply: 'A few more weeks down there.', karma: 2, popularity: -3, morale: -1 },
      ],
    },
    {
      id: 'mlb_ace_elbow', beat: 'season', from: 'Team doctor', emoji: '🩺',
      when: [{ fact: 'starHurt', op: '==', value: true }],
      text: 'Your ace felt something in his elbow on his last start. The scan is clean, the doctor would still skip a turn.',
      choices: [
        { label: 'Skip a start', reply: 'One turn off.', karma: 1, out: { who: 'ace', weeks: 1 } },
        { label: 'Send him out there', reply: 'He takes the ball.', karma: -1, popularity: 1, rating: { who: 'ace', delta: -2 } },
      ],
    },
    {
      id: 'mlb_giveaway', beat: 'season', from: 'Ticket office', emoji: '🎟️',
      when: [{ fact: 'winPct', op: '<', value: 0.4 }],
      text: 'Crowds are thin. The ticket office wants a giveaway night to fill the upper deck.',
      choices: [
        { label: 'Run it', reply: 'Fill the seats.', karma: 0, cash: -0.5, popularity: 3 },
        { label: 'Save the money', reply: 'Not this year.', karma: 1, popularity: -1 },
      ],
    },
    {
      id: 'mlb_deadline_rental', beat: 'deadline', from: 'Ownership', emoji: '🏢',
      when: [{ fact: 'winPct', op: '>=', value: 0.55 }],
      text: 'You are in the race. Ownership wants to know if you are buying an arm at the deadline, and the clubhouse is listening.',
      choices: [
        { label: 'Tell ownership you are working the phones', reply: 'We are going for it.', karma: 3, morale: -1 },
        { label: 'Tell the clubhouse this staff is enough', reply: 'Our staff is good enough.', karma: -2, morale: 2 },
      ],
    },
    {
      id: 'mlb_deadline_closer', beat: 'deadline', from: 'Your assistant GM', emoji: '🗂️',
      when: [{ fact: 'winPct', op: '<', value: 0.45 }],
      text: 'The season is gone and a contender keeps calling about your closer.',
      choices: [
        { label: 'Take their calls', reply: 'Hear the best offer.', karma: 2, morale: -2, popularity: -2 },
        { label: 'Tell them he is not available', reply: 'He closes for us next year too.', karma: -2, morale: 1 },
      ],
    },
    {
      id: 'mlb_innings_limit', beat: 'stretch', from: 'Your pitching coach', emoji: '🧢',
      when: [{ fact: 'youngArm', op: '==', value: true }],
      text: 'Your young starter is past the innings the medical staff wanted for him this year.',
      choices: [
        { label: 'Shut him down', reply: 'His season is over.', karma: 1, popularity: -1, out: { who: 'youngArm', weeks: 4 } },
        { label: 'Keep him going', reply: 'Shorter outings, but he pitches.', karma: -1, popularity: 2, rating: { who: 'youngArm', delta: -1 } },
      ],
    },
  ],
};

/* SOURCES, each read 2026-10-03, two per rule. The copy carries no number or date from them.
   The qualifying offer: a one year offer, and usually a pick back when a player who turns it down signs elsewhere
   (compensation depends on the club, hence "may" in the copy); it is still in use for the 2025-26 winter:
     https://mlbtraderumors.com/2015/10/explaining-the-qualifying-offer-system.html
     https://ublawsportsforum.com/2022/10/19/mlbs-qualifying-offer-from-its-inception-to-its-impending-removal/
     https://www.cbssports.com/mlb/news/mlb-qualifying-offer-2026-contract-bichette-tucker-schwarber-diaz/
   Arbitration figures are exchanged, a deal can still be reached, and otherwise a hearing picks one figure:
     https://mlbtraderumors.com/2025/01/17-players-exchange-filing-figures.html
     https://www.cbssports.com/mlb/news/mlb-hot-stove-rumors-and-news-roundup-for-january-16
   Holding a prospect down a few weeks can still buy an extra year of control:
     https://www.espn.com/mlb/story/_/id/33761266/the-end-mlb-service-manipulation-how-kris-bryant-paved-way-next-kris-bryant
     https://frontofficesports.com/article/jackson-holliday-service-time/ (April 2024, under the 2022 CBA: a top prospect
     called up well after the cutoff for a year of service; replaces a 2022 source written to the 2016 CBA) */

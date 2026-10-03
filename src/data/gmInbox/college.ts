/* Round 940: the college desk's inbox, for both college dynasties. Data only,
   the rules are src/lib/gmInbox.ts. Sport neutral on purpose (a starter, a
   freshman, a game day), so football and basketball programs share one pack.
   Every voice is a role and every man is a role, and the booster is a
   nameless generated person: nothing here names or quotes anybody. NIL and
   the transfer portal appear as words, with no number, date or window.
   The money meter is the dynasties' own NIL budget, kept in points
   (cfbDynasty's nil, roughly 40 to 100 a year; the basketball board prints
   it as points too), so only NIL money moves it: a booster's collective
   money and a starter's bigger deal. Coaching pay and recruiting trips are
   not NIL, so they cost AD trust instead. */
import type { GmInboxPack } from '@/lib/gmInbox';

export const COLLEGE_GM_INBOX: GmInboxPack = {
  seat: 'college',
  label: 'College program',
  calendar: [
    { id: 'offseason', label: 'Offseason workouts', emoji: '🏋️' },
    { id: 'season', label: 'Season', emoji: '🏟️' },
    { id: 'stretch', label: 'Stretch run', emoji: '🏁' },
    { id: 'carousel', label: 'Coaching carousel', emoji: '🎠' },
    { id: 'portal', label: 'Transfer portal', emoji: '🚪' },
    { id: 'signing', label: 'Signing day', emoji: '✍️' },
  ],
  span: { offseason: 2, season: 9, stretch: 4, carousel: 1, portal: 2, signing: 1 },
  facts: {
    starterUnhappy: { kind: 'bool', p: 0.3, per: 'season' },
    boosterLoud: { kind: 'bool', p: 0.35, per: 'season' },
    coordinatorHot: { kind: 'bool', p: 0.35, per: 'season' },
    eligibilityFlag: { kind: 'bool', p: 0.08, per: 'week' },
    commitWavering: { kind: 'bool', p: 0.35, per: 'week' },
    winPct: { kind: 'num', min: 0, max: 1, per: 'week' },
  },
  targets: { freshman: 'Your freshman', flagged: 'The starter under review' },
  meters: { trust: 'AD trust', fans: 'Fans', money: 'NIL budget', morale: 'Locker room', recruit: 'Recruit interest' },
  money: { prefix: '', suffix: ' pts' },
  perWeek: 1,
  cooldown: 19,
  chance: 0.5,
  events: [
    {
      id: 'col_freshman_reps', beat: 'offseason', from: 'Your coordinator', emoji: '📋',
      text: 'Offseason workouts. Your coordinator wants to know if the freshman gets first team work or the veteran keeps it.',
      choices: [
        { label: 'Freshman with the ones', reply: 'Throw him in.', karma: 0, morale: -1, recruit: 2, rating: { who: 'freshman', delta: 2 } },
        { label: 'Veteran with the ones', reply: 'The veteran earned it.', karma: 0, morale: 2 },
      ],
    },
    {
      id: 'col_booster_say', beat: 'season', from: 'A big booster', emoji: '💰',
      when: [{ fact: 'boosterLoud', op: '==', value: true }, { fact: 'winPct', op: '<', value: 0.5 }],
      text: 'A big booster wants a say in who starts, and he has been generous to the NIL collective.',
      choices: [
        { label: 'Hear him out', reply: 'Sit down with him.', karma: -3, cash: 5, morale: -2 },
        { label: 'Keep those calls in the building', reply: 'Thanks, but no.', karma: 2, cash: -5, morale: 1 },
      ],
    },
    {
      id: 'col_eligibility', beat: 'season', from: 'Compliance office', emoji: '📋',
      when: [{ fact: 'eligibilityFlag', op: '==', value: true }],
      text: 'Compliance has a question about one of your starters\' eligibility. Sit him until it clears, or play him and take the risk.',
      choices: [
        { label: 'Sit him until it clears', reply: 'He sits.', karma: 2, out: { who: 'flagged', weeks: 2 } },
        { label: 'Play him and take the risk', reply: 'He plays.', karma: -4, popularity: 1 },
      ],
    },
    {
      id: 'col_game_day_visit', beat: 'season', from: 'Your recruiting coordinator', emoji: '📞',
      text: 'A top target is coming to a game this week. Roll out the full visit, or keep it simple?',
      choices: [
        { label: 'The full treatment', reply: 'Make it a day he remembers.', karma: -2, recruit: 6 },
        { label: 'Keep it simple', reply: 'Let the program sell itself.', karma: 0, recruit: 2 },
      ],
    },
    {
      id: 'col_blackout', beat: 'stretch', from: 'Marketing', emoji: '📣',
      when: [{ fact: 'winPct', op: '>=', value: 0.5 }],
      text: 'Rivalry week. The student section wants a blackout and marketing is all for it.',
      choices: [
        { label: 'Do the blackout', reply: 'Black it out.', karma: 0, popularity: 3 },
        { label: 'Keep it normal', reply: 'Just play the game.', karma: 1, popularity: -1 },
      ],
    },
    {
      id: 'col_coordinator_call', beat: 'carousel', from: 'Your athletic director', emoji: '🏛️',
      when: [{ fact: 'coordinatorHot', op: '==', value: true }],
      text: 'A bigger school has called about your coordinator. Recruits are already asking whether he is staying.',
      choices: [
        { label: 'Find him a raise', reply: 'Keep him here.', karma: -2, morale: 2, recruit: 2 },
        { label: 'Let him interview', reply: 'He has earned the chance.', karma: 1, morale: -2, recruit: -3 },
      ],
    },
    {
      id: 'col_nil_or_portal', beat: 'portal', from: 'His representative', emoji: '💼',
      when: [{ fact: 'starterUnhappy', op: '==', value: true }],
      text: 'Your best starter wants a bigger NIL deal, and his representative says the transfer portal is the other option.',
      choices: [
        { label: 'Find more NIL money', reply: 'We will find it.', karma: -1, cash: -10, morale: 2 },
        { label: 'Hold the line', reply: 'The number is the number.', karma: 2, morale: -2, popularity: -2 },
      ],
    },
    {
      id: 'col_commit_wavers', beat: 'signing', from: 'Your recruiting coordinator', emoji: '📞',
      when: [{ fact: 'commitWavering', op: '==', value: true }],
      text: 'Your top commit is taking calls from a rival program. One more home visit could settle it.',
      choices: [
        { label: 'Fly out for a home visit', reply: 'Book the flight.', karma: -1, recruit: 8 },
        { label: 'Trust the commitment', reply: 'He gave his word.', karma: 0, recruit: -5 },
      ],
    },
  ],
};

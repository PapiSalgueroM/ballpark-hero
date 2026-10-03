/**
 * Round 916: the Fight Career inbox, a binding on careerInbox.ts.
 *
 * The engine (pick, deliver, answer, the mood drift, the one text per beat
 * rule) is the shared one every other career uses. What is boxing's own is
 * the calendar and the bank of texts. A fight is this game's clock, so the
 * "season" the shared tick talks about is one fight here, and the beats are
 * what a fight can be: the debut, a win, a loss, a title changing hands, and
 * the ordinary weeks in the gym.
 *
 * SENDERS ARE ROLES. Your trainer, your manager, your mother, the gym owner.
 * Nobody real writes to you and nobody in here has a name at all.
 *
 * EVERY TEXT HAS A REPLY THAT MOVES NOTHING (karma 0, no morale). Mood couples
 * into morale at the extremes and morale reaches the camp, so that reply is
 * what "answered neutrally" means for a text, and the harness checks that
 * every text carries one.
 */

import {
  receiveInboxTexts, answerInboxMessage, unreadInboxCount,
  type InboxSport, type InboxBeat, type InboxMessageDef, type InboxMessage,
} from '@/lib/careerInbox';
import { keyedRng } from '@/lib/keyedRng';
import { round2 } from '@/lib/fightCareerMoney';
import type { FightCareerState } from '@/lib/fightCareer';
import { describeLifeEffect, type FightLife, type LifeEffect } from '@/lib/fightCareerLife';

export const FIGHT_INBOX_CALENDAR: InboxBeat[] = [
  { id: 'debut', label: 'Your debut', emoji: '🔔', oneOff: true },
  { id: 'title', label: 'Title night', emoji: '🏆', oneOff: true },
  { id: 'win', label: 'After a win', emoji: '✅' },
  { id: 'loss', label: 'After a loss', emoji: '❌' },
  { id: 'gym', label: 'In the gym', emoji: '🥊' },
];

const TRAINER = 'Your trainer';
const MANAGER = 'Your manager';
const MOTHER = 'Your mother';
const GYM_OWNER = 'The gym owner';
const AMATEUR_COACH = 'Your old amateur coach';
const CUT_MAN = 'Your cut man';
const REPORTER = 'A local reporter';
const SPARRING = 'Your sparring partner';
const SISTER = 'Your sister';

const t = (
  id: string, beat: string, from: string, emoji: string, text: string,
  choices: InboxMessageDef['choices'],
): InboxMessageDef => ({ id, beat, from, emoji, text, phase: 'pro', choices });

export const FIGHT_INBOX_POOL: InboxMessageDef[] = [
  t('fi-debut-mum', 'debut', MOTHER, '👩', 'I watched it through my fingers. Are you eating properly?', [
    { label: 'Call her back', reply: 'Rang home and stayed on for an hour.', karma: 4, morale: 2 },
    { label: 'Send a thumbs up', reply: 'Sent a thumbs up.', karma: 0 },
  ]),
  t('fi-debut-coach', 'debut', AMATEUR_COACH, '🧓', 'Saw the result. You dropped your left hand twice. Proud of you anyway.', [
    { label: 'Thank him properly', reply: 'Told him none of it happens without him.', karma: 3 },
    { label: 'Say you will fix the left hand', reply: 'Promised to keep the left hand up.', karma: 0 },
  ]),
  t('fi-title-manager', 'title', MANAGER, '💼', 'Phone has not stopped. Everybody wants a piece of the champion now. Rest, I will sort them.', [
    { label: 'Tell him to say yes to the local ones', reply: 'Asked for the local requests to come first.', karma: 2, popularity: 2 },
    { label: 'Leave it with him', reply: 'Left the phone to the manager.', karma: 0 },
  ]),
  t('fi-title-sister', 'title', SISTER, '👧', 'The whole street was in our front room. Mum cried. Dad pretended he did not.', [
    { label: 'Bring the belt round', reply: 'Took the belt home for the street to hold.', karma: 4, morale: 3 },
    { label: 'Tell her you will call tomorrow', reply: 'Said you would ring in the morning.', karma: 0 },
  ]),
  t('fi-title-reporter', 'title', REPORTER, '📰', 'Any chance of ten minutes for the paper? People round here have followed you since the amateurs.', [
    { label: 'Give him the ten minutes', reply: 'Sat down with the local paper.', karma: 2, popularity: 3 },
    { label: 'Point him at your manager', reply: 'Passed the request to the manager.', karma: 0 },
    { label: 'Ignore it', reply: 'Left the local paper on read.', karma: -3 },
  ]),
  t('fi-win-trainer', 'win', TRAINER, '🧢', 'Good night. Take three days, then we look at the tape. There is plenty on it.', [
    { label: 'Ask for the tape tonight', reply: 'Asked to see the tape before the swelling went down.', karma: 2 },
    { label: 'Take the three days', reply: 'Took the three days.', karma: 0 },
  ]),
  t('fi-win-sparring', 'win', SPARRING, '🥊', 'Told you that counter would land. You owe me a dinner.', [
    { label: 'Buy the dinner', reply: 'Bought dinner for the man who took the punches in camp.', karma: 3, cash: -0.01 },
    { label: 'Tell him he owes you two', reply: 'Told him the score was the other way round.', karma: 0 },
  ]),
  t('fi-win-owner', 'win', GYM_OWNER, '🏛️', 'Three kids walked in this morning asking where you train. Putting your poster up by the door.', [
    { label: 'Come in and meet them', reply: 'Went in on a day off to meet the new kids.', karma: 3, popularity: 1 },
    { label: 'Tell him to use the good photo', reply: 'Asked for the good photo on the poster.', karma: 0 },
  ]),
  t('fi-win-reporter', 'win', REPORTER, '📰', 'Good win. Who is next? People are asking and I would rather print something true.', [
    { label: 'Name the man you want', reply: 'Named a name for the paper.', karma: -1, popularity: 3 },
    { label: 'Say that is the manager\'s job', reply: 'Said the next fight was the manager\'s business.', karma: 0 },
  ]),
  t('fi-win-mum', 'win', MOTHER, '👩', 'Well done. Your face looks fine on the photos. Is it fine?', [
    { label: 'Send her a photo to prove it', reply: 'Sent a photo with both eyes open.', karma: 2, morale: 1 },
    { label: 'Tell her it is fine', reply: 'Said it was fine.', karma: 0 },
  ]),
  t('fi-win-cutman', 'win', CUT_MAN, '🩹', 'Easy night for me. Long may it last.', [
    { label: 'Slip him a bit extra', reply: 'Put a bit extra in the cut man\'s pocket.', karma: 3, cash: -0.01 },
    { label: 'Tell him not to get used to it', reply: 'Told the cut man not to get comfortable.', karma: 0 },
  ]),
];

const MORE_TEXTS: InboxMessageDef[] = [
  t('fi-loss-trainer', 'loss', TRAINER, '🧢', 'That one is on me as much as you. Wrong plan. We go again.', [
    { label: 'Tell him it was your fault', reply: 'Took the blame for the night.', karma: 3 },
    { label: 'Say you will be in on Monday', reply: 'Said Monday, usual time.', karma: 0 },
    { label: 'Agree it was his plan', reply: 'Agreed the plan was wrong, and said so.', karma: -4, morale: -2 },
  ]),
  t('fi-loss-mum', 'loss', MOTHER, '👩', 'Come home for a few days. I do not care about the result.', [
    { label: 'Go home', reply: 'Went home and was fed until it stopped hurting.', karma: 3, morale: 3 },
    { label: 'Tell her you are fine', reply: 'Said you were fine.', karma: 0 },
  ]),
  t('fi-loss-manager', 'loss', MANAGER, '💼', 'It is one loss. I have already had two calls. Nobody has forgotten you.', [
    { label: 'Ask him to find the right fight back', reply: 'Asked for a sensible way back.', karma: 1 },
    { label: 'Thank him and leave it', reply: 'Left the comeback to the manager.', karma: 0 },
  ]),
  t('fi-loss-coach', 'loss', AMATEUR_COACH, '🧓', 'You lost your first amateur fight too. Remember what you did the week after?', [
    { label: 'Tell him you remember', reply: 'Remembered the week after, and went for a run.', karma: 2, morale: 2 },
    { label: 'Send back a smile', reply: 'Sent a smile.', karma: 0 },
  ]),
  t('fi-loss-sparring', 'loss', SPARRING, '🥊', 'He caught you with the one we worked on. Sorry. I should have thrown it more in camp.', [
    { label: 'Tell him it is not on him', reply: 'Told the sparring partner he did his job.', karma: 3 },
    { label: 'Say see you in the gym', reply: 'Said see you in the gym.', karma: 0 },
  ]),
  t('fi-loss-reporter', 'loss', REPORTER, '📰', 'Tough night. Do you want to say anything before I write it up?', [
    { label: 'Give the other man his credit', reply: 'Gave the winner his credit in print.', karma: 3, popularity: 1 },
    { label: 'No comment', reply: 'Had no comment.', karma: 0 },
    { label: 'Blame the judges', reply: 'Blamed the cards in the paper.', karma: -5, popularity: -1 },
  ]),
  t('fi-gym-owner-rent', 'gym', GYM_OWNER, '🏛️', 'Roof is leaking over the heavy bags again. Not asking, just telling you why there is a bucket.', [
    { label: 'Pay for the roof', reply: 'Paid to have the gym roof patched.', karma: 5, cash: -0.02 },
    { label: 'Offer to move the bags', reply: 'Moved the bags out from under the drip.', karma: 0 },
  ]),
  t('fi-gym-trainer-roadwork', 'gym', TRAINER, '🧢', 'Six in the morning at the track. Do not make me come and get you.', [
    { label: 'Be there at half five', reply: 'Was at the track before the trainer.', karma: 2, morale: 1 },
    { label: 'Be there at six', reply: 'Was at the track at six.', karma: 0 },
    { label: 'Ask for seven', reply: 'Asked for seven and got a look.', karma: -2 },
  ]),
  t('fi-gym-sister-tickets', 'gym', SISTER, '👧', 'Fourteen people from work want tickets for the next one. Fourteen.', [
    { label: 'Sort all fourteen', reply: 'Found fourteen tickets.', karma: 3, popularity: 1, cash: -0.01 },
    { label: 'Send her the box office number', reply: 'Sent the box office number.', karma: 0 },
  ]),
  t('fi-gym-cutman-kit', 'gym', CUT_MAN, '🩹', 'Need new end swells and I am out of the good adrenaline. Do I go through the manager or you?', [
    { label: 'Tell him to send you the bill', reply: 'Paid for the cut man\'s kit yourself.', karma: 2, cash: -0.01 },
    { label: 'Send him to the manager', reply: 'Sent the cut man to the manager.', karma: 0 },
  ]),
  t('fi-gym-manager-interview', 'gym', MANAGER, '💼', 'Radio want you on the breakfast show. It is early and it is free. Your call.', [
    { label: 'Do the radio', reply: 'Did the breakfast show half asleep.', karma: 0, popularity: 2 },
    { label: 'Tell him you are in camp', reply: 'Said camp comes first.', karma: 1 },
  ]),
  t('fi-gym-coach-kids', 'gym', AMATEUR_COACH, '🧓', 'Got a twelve year old here who moves like you did. Would mean a lot if you watched him spar.', [
    { label: 'Go and watch', reply: 'Watched a twelve year old spar and saw it too.', karma: 4 },
    { label: 'Ask him to film it', reply: 'Asked for a video.', karma: 0 },
  ]),
  t('fi-gym-sparring-borrow', 'gym', SPARRING, '🥊', 'Short this month. Any chance of a sub until the next camp?', [
    { label: 'Lend it', reply: 'Lent the sparring partner what he needed.', karma: 4, cash: -0.01 },
    { label: 'Offer extra rounds instead', reply: 'Offered more paid rounds instead of a loan.', karma: 0 },
    { label: 'Say no', reply: 'Said no to the loan.', karma: -2 },
  ]),
  t('fi-gym-mum-sunday', 'gym', MOTHER, '👩', 'Sunday dinner. I know you are making weight. I will do you a plate with no potatoes.', [
    { label: 'Be there', reply: 'Went for Sunday dinner and ate the plate with no potatoes.', karma: 2, morale: 2 },
    { label: 'Say you will try', reply: 'Said you would try.', karma: 0 },
  ]),
  t('fi-gym-reporter-profile', 'gym', REPORTER, '📰', 'Thinking of a longer piece about the gym. Would you be in it?', [
    { label: 'Make it about the gym, not you', reply: 'Pointed the paper at the people who run the gym.', karma: 4 },
    { label: 'Say yes', reply: 'Agreed to the piece.', karma: 0, popularity: 2 },
  ]),
  t('fi-gym-trainer-weight', 'gym', TRAINER, '🧢', 'Scale this morning was not pretty. What did you eat?', [
    { label: 'Tell the truth', reply: 'Owned up to the takeaway.', karma: 2 },
    { label: 'Say you will run it off', reply: 'Promised to run it off.', karma: 0 },
    { label: 'Say the scale is broken', reply: 'Blamed the scale.', karma: -3 },
  ]),
  t('fi-gym-owner-banner', 'gym', GYM_OWNER, '🏛️', 'Want to hang a banner with your record on it. Do you mind?', [
    { label: 'Ask him to put the whole gym on it', reply: 'Asked for every pro in the gym to be on the banner.', karma: 3 },
    { label: 'Tell him to go ahead', reply: 'Said go ahead.', karma: 0, popularity: 1 },
  ]),
  t('fi-gym-manager-offer', 'gym', MANAGER, '💼', 'Had a silly offer for an exhibition overseas. Said no for you. Shout if I was wrong.', [
    { label: 'Tell him he was right', reply: 'Backed the manager.', karma: 1 },
    { label: 'Say nothing', reply: 'Let it lie.', karma: 0 },
  ]),
];

/** Everything the inbox can send, one bank. */
export const FIGHT_INBOX_TEXTS: InboxMessageDef[] = [...FIGHT_INBOX_POOL, ...MORE_TEXTS];

/** The reply that moves nothing: karma 0 and no morale. */
export function neutralInboxChoice(m: { choices: InboxMessage['choices'] }): number {
  return m.choices.findIndex(c => c.karma === 0 && !c.morale);
}

/**
 * Round 916 review: a reply is a LifeEffect too, so its button can print what
 * it does in the same words as a card. The shared inbox applies karma to the
 * mood meter (karma here), morale, popularity (the fans meter here) and cash,
 * and nothing else, which is exactly this mapping.
 */
export function inboxChoiceEffect(c: InboxMessage['choices'][number]): LifeEffect {
  const e: LifeEffect = {};
  if (c.karma) e.karma = c.karma;
  if (c.morale) e.morale = c.morale;
  if (c.popularity) e.fans = c.popularity;
  if (c.cash) e.cash = c.cash;
  return e;
}

export const describeInboxChoice = (c: InboxMessage['choices'][number]): string =>
  describeLifeEffect(inboxChoiceEffect(c));

/** The binding. Age and the fight number come from the save around the block. */
export function fightInboxSport(st: FightCareerState): InboxSport<FightLife> {
  return {
    pool: FIGHT_INBOX_TEXTS,
    calendar: FIGHT_INBOX_CALENDAR,
    moodOf: l => l.karma,
    setMood: (l, v) => { l.karma = v; },
    addPopularity: (l, d) => { l.fanbase = Math.max(0, Math.min(100, l.fanbase + d)); },
    addCash: (l, amount) => { l.bank = round2(l.bank + amount); },
    ageOf: () => Math.floor(st.fighter.age),
    /* A text is dated by the fight it followed: this game has no calendar year. */
    yearOf: () => st.fightNo,
    maxInbox: 10,
    wantPerSeason: 1,
  };
}

/**
 * One fight's worth of inbox. `beats` is what the night was. Draws from its
 * own keyed stream, never the bout's and never the deck's, so a text added to
 * the bank cannot move a fight or a card. Mutates `life`.
 */
export function fightInboxTick(st: FightCareerState, life: FightLife, beats: readonly string[]): InboxMessage[] {
  const rng = keyedRng(`${st.seed}|${st.fightNo}|${life.phoneUsedIds.length}|fight-inbox`);
  return receiveInboxTexts(life, 'pro', fightInboxSport(st), rng, beats);
}

/** Answer one text. Mutates `life` and returns the feed line, or null. */
export function answerFightInbox(st: FightCareerState, life: FightLife, msgId: string, choiceIdx: number): string | null {
  const line = answerInboxMessage(life, msgId, choiceIdx, fightInboxSport(st));
  /* The shared line says "Karma up" for a big swing; this game shows the
     meter under the same name, so the line is kept as it comes. */
  return line;
}

export const unreadFightInbox = (life: FightLife): number => unreadInboxCount(life);

/**
 * Round 796: the Soccer Career probe behind the "soccer is unchanged" fixture.
 *
 * Round 796 changes the shared inbox engine (src/lib/careerInbox.ts) so a
 * sport can deliver on its own calendar beats, and lifts Soccer Career's four
 * interactive rivalry dilemmas into src/lib/careerRivalryChoices.ts. Soccer
 * has to come out of both exactly as it went in. This file is the one
 * procedure that measures it, used twice:
 *
 *   scripts/recordSoccerInboxFixture796.mjs ran it ONCE, against the tree as
 *   it stood before any Round 796 code moved (origin/main b04c7897), and
 *   wrote scripts/data/soccerInboxFixture796.json.
 *
 *   scripts/simCareerInboxBeats.mjs section 1 runs it again against the
 *   current tree and requires the output to match that file byte for byte.
 *
 * Same procedure both times, so a difference can only come from the code it
 * drives. It touches only the layers Round 796 moves: the shared inbox bound
 * through SOCCER_INBOX (not the Round 130 thread system on top of it, which
 * this round leaves alone and which another lane owns), and
 * applyMoralDilemmaChoice for the four rival dilemmas plus the dilemma list's
 * order (the trigger picks out of that list, so moving an entry would change
 * which dilemma a seed draws even with every mutation intact).
 *
 * Every random draw goes through a seeded Math.random, restored afterwards.
 */

import { createHash } from 'node:crypto';

/** The whole state, every field, as one short string. The clear fields kept
 *  beside it are for reading a failure; this is what makes the match total. */
const hashOf = v => createHash('sha256').update(JSON.stringify(v)).digest('hex').slice(0, 32);

const mulberry32 = a => () => {
  a |= 0; a = (a + 0x6D2B79F5) | 0;
  let t = Math.imul(a ^ (a >>> 15), 1 | a);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

export const RIVAL_DILEMMA_IDS = ['rival_club_offer', 'rival_bad_tackle', 'goat_debate_show', 'rival_charity_match'];

/** The inbox layer: many seeded careers, several seasons each, answering as
 *  a real player would (alternating choices), with the refusal paths too. */
function probeInbox(soccer, inboxMod) {
  const out = [];
  for (let seed = 1; seed <= 60; seed += 1) {
    const rng = mulberry32(seed * 7919 + 3);
    const s = {
      age: 16 + Math.floor(rng() * 20),
      karma: Math.floor(rng() * 101),
      popularity: Math.floor(rng() * 101),
      morale: Math.floor(rng() * 101),
      netWorth: Math.round(rng() * 60 * 10) / 10,
      seasons: [{ year: 2016 + Math.floor(rng() * 12) }],
      phoneInbox: [],
      phoneUsedIds: [],
    };
    const phase = seed % 4 === 0 ? 'youth' : 'pro';
    const seasons = [];
    for (let season = 0; season < 6; season += 1) {
      const real = Math.random;
      Math.random = mulberry32(seed * 104729 + season * 31 + 7);
      let fresh;
      try {
        fresh = inboxMod.receiveInboxTexts(s, phase, soccer.SOCCER_INBOX);
      } finally {
        Math.random = real;
      }
      const lines = [];
      /* Answer every unanswered text but the newest on even seasons, all of
         them on odd ones, so the want-per-season gate and the cap both see
         a real mix of answered and pending messages. */
      const pending = (s.phoneInbox ?? []).filter(m => m.answered === undefined);
      const answerCount = season % 2 === 0 ? Math.max(0, pending.length - 1) : pending.length;
      for (let i = 0; i < answerCount; i += 1) {
        const m = pending[i];
        lines.push(inboxMod.answerInboxMessage(s, m.id, (seed + season + i) % Math.max(1, m.choices.length), soccer.SOCCER_INBOX));
      }
      /* The three refusals: a bogus id, a double answer, a choice out of range. */
      lines.push(inboxMod.answerInboxMessage(s, 'not-a-real-id', 0, soccer.SOCCER_INBOX));
      const answered = (s.phoneInbox ?? []).find(m => m.answered !== undefined);
      if (answered) lines.push(inboxMod.answerInboxMessage(s, answered.id, 0, soccer.SOCCER_INBOX));
      const open = (s.phoneInbox ?? []).find(m => m.answered === undefined);
      if (open) lines.push(inboxMod.answerInboxMessage(s, open.id, 99, soccer.SOCCER_INBOX));
      seasons.push({
        fresh: fresh.map(m => m.id),
        lines,
        meters: { karma: s.karma, popularity: s.popularity, morale: s.morale, netWorth: s.netWorth },
        inbox: (s.phoneInbox ?? []).map(m => `${m.id}:${m.answered ?? '-'}`),
        used: [...(s.phoneUsedIds ?? [])],
        stateHash: hashOf(s),
      });
      s.age += 1;
      s.seasons.push({ year: s.seasons[s.seasons.length - 1].year + 1 });
    }
    out.push({ seed, phase, seasons });
  }
  return out;
}

/** The four rival dilemmas: every choice, many seeds, with and without a
 *  rival on the save and with the optional fields both present and absent. */
function probeRivalDilemmas(soccer) {
  const out = [];
  for (const id of RIVAL_DILEMMA_IDS) {
    const dilemma = soccer.MORAL_DILEMMAS.find(d => d.id === id);
    for (let choice = 0; choice < 3; choice += 1) {
      for (let seed = 1; seed <= 16; seed += 1) {
        const rng = mulberry32(seed * 50021 + choice * 13 + id.length);
        const s = {
          rival: seed % 5 === 0 ? null : { name: `Rival ${seed}`, retired: false },
          netWorth: Math.round(rng() * 80 * 100) / 100,
          popularity: Math.floor(rng() * 101),
          morale: Math.floor(rng() * 101),
          integrityBonus: Math.floor(rng() * 40) - 10,
          statBoostNextSeason: seed % 3 === 0 ? { shooting: 2, pace: 1 } : {},
          events: ['earlier line'],
          pendingMoralDilemma: dilemma,
          phase: 'playing',
        };
        if (seed % 4 !== 0) s.rivalryIntensity = Math.floor(rng() * 101);
        const real = Math.random;
        Math.random = mulberry32(seed * 3001 + choice * 101 + 17);
        let next;
        try {
          next = soccer.applyMoralDilemmaChoice(s, choice);
        } finally {
          Math.random = real;
        }
        out.push({ id, choice, seed, next: JSON.parse(JSON.stringify(next)) });
      }
    }
  }
  return out;
}

export function probeSoccer({ soccer, inboxMod }) {
  return {
    dilemmaOrder: soccer.MORAL_DILEMMAS.map(d => d.id),
    rivalDilemmaDefs: RIVAL_DILEMMA_IDS.map(id => soccer.MORAL_DILEMMAS.find(d => d.id === id)),
    inbox: probeInbox(soccer, inboxMod),
    rivalDilemmas: probeRivalDilemmas(soccer),
  };
}

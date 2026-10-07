/* ─── careerHallSpeech.ts, the induction speech (Round 915, split out in Round 1039) ───
   The speaker is the player's own generated character. The options are
   SpeechOption lists from careerAwardsNight, so a button's words are built
   from the same steps applySpeech applies. Every line is narration in the
   second person and thanks roles, never a real person by name. The two
   meters live on the speech block itself: how the crowd and the old room
   took it. Nothing in the career score reads them.

   Round 1039 moved this out of careerHallOfFame.ts so the US career board's
   eager path (the retirement talk and the ballot) does not carry
   careerAwardsNight: only the lazily loaded HallOfFameCard imports this file.
   The save block's type and its sanitizer stay in careerHallOfFame.ts. */

import { keyedRng } from "./keyedRng";
import { applySpeech, describeSteps } from "./careerAwardsNight";
import type { AwardsMeter, SpeechOption } from "./careerAwardsNight";
import type { HallMeterId, HallRecord, HallSpeechBlock, HallSpeechId } from "./careerHallOfFame";

const clampMeter = (n: number) => Math.max(0, Math.min(100, Math.round(n)));

export const HALL_SPEECH_METERS: Record<HallMeterId, AwardsMeter<HallSpeechBlock>> = {
  crowd: { label: "Crowd", add: (s, d) => { s.crowd = clampMeter((s.crowd ?? 50) + d); }, read: s => s.crowd ?? 50 },
  room: { label: "Old room", add: (s, d) => { s.room = clampMeter((s.room ?? 50) + d); }, read: s => s.room ?? 50 },
};

export const HALL_SPEECHES: SpeechOption<HallSpeechBlock, HallMeterId, HallSpeechId>[] = [
  {
    id: "fans", emoji: "🙌", label: "Thank the fans", tone: "gold",
    effect: [{ meter: "crowd", delta: 12 }],
    line: () => "You gave the longest stretch to the people in the seats, the ones who drove in for every home game. The crowd stood for it.",
  },
  {
    id: "room", emoji: "🤝", label: "Thank the locker room", tone: "bold",
    effect: [{ meter: "room", delta: 12 }],
    line: () => "You went role by role: the trainers, the equipment staff, the backups who pushed you every practice, your first head coach. The old room was on its feet.",
  },
  {
    id: "story", emoji: "📖", label: "Tell the whole story, bad years too", tone: "bold",
    effect: [],
    risk: { chance: 0.5, hit: [{ meter: "crowd", delta: 16 }, { meter: "room", delta: 6 }], miss: [{ meter: "crowd", delta: -6 }, { meter: "room", delta: -4 }] },
    line: (_s, outcome) => outcome === "hit"
      ? "You told all of it, the slumps and the injuries included, and the room went quiet in the right way."
      : "You told all of it and ran twenty minutes long. Half the room was checking the time.",
  },
  {
    id: "short", emoji: "⏱️", label: "Keep it short", tone: "quiet",
    effect: [{ meter: "crowd", delta: 4 }, { meter: "room", delta: 4 }],
    line: () => "Four minutes, a thank you to your family and the people who taught you the game, and off the stage.",
  },
];

/** What a speech button promises, built from its own steps. */
export function speechPromise(option: SpeechOption<HallSpeechBlock, HallMeterId, HallSpeechId>): string {
  const sure = option.effect.length ? describeSteps(HALL_SPEECH_METERS, option.effect) : "";
  if (!option.risk) return sure;
  const pct = Math.round(option.risk.chance * 100);
  const risk = `${pct} percent: ${describeSteps(HALL_SPEECH_METERS, option.risk.hit)}. Otherwise: ${describeSteps(HALL_SPEECH_METERS, option.risk.miss)}`;
  return sure ? `${sure}. ${risk}` : risk;
}

/** Gives the speech once. The coin, where there is one, is keyedRng on the
 *  career's key, so a reload cannot reroll it. A second call changes nothing. */
export function giveHallSpeech(block: HallSpeechBlock | undefined, record: HallRecord, careerKey: string, id: HallSpeechId): HallSpeechBlock {
  const b: HallSpeechBlock = { ...(block ?? {}) };
  if (record.outcome !== "inducted" || b.speechId) return b;
  const line = applySpeech(
    { meters: HALL_SPEECH_METERS, say: (s, l) => { s.line = l; } },
    HALL_SPEECHES, b, id, keyedRng(`hall-speech:${record.sport}:${careerKey}`),
  );
  if (line !== null) b.speechId = id;
  return b;
}

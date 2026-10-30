/* Round 1334: the soccer deck's effect words, data only.

   Every key a soccer card's option may move through `fx`, with the words its
   button prints (gmInbox's choiceEffects reads these). The applies live in
   src/lib/soccerDeck.ts, which reaches the whole Soccer Career engine, so the
   event deck kit (scripts/simEventDeck.mjs) imports the words from HERE and
   never from there: exported from soccerDeck.ts they would bundle the engine
   into the kit's GM build.

   A training key adds to one stat's statBoostNextSeason, so it lands with
   next season's growth. Its word is the family the attribute screen prints
   for that stat (soccerCareerAttributes.ts: OUTFIELD_TREE for an outfield
   player, GK_TREE for a keeper, whose families sit on the same seven stats
   under keeper words). src/lib/soccerDeck.test.ts holds every label against
   attrTreeFor, so a renamed family turns it red. */
import type { GmFxWords } from '@/lib/gmInbox';

/** The seven stats a training key can write. */
export type SoccerDeckStat = 'pace' | 'shooting' | 'passing' | 'dribbling' | 'defending' | 'physical' | 'reflexes';

/** Each training key: the stat it writes and whose screen word it prints. */
export const SOCCER_TRAINING_KEYS: Readonly<Record<string, { stat: SoccerDeckStat; keeper: boolean }>> = {
  t_pace: { stat: 'pace', keeper: false },
  t_shooting: { stat: 'shooting', keeper: false },
  t_passing: { stat: 'passing', keeper: false },
  t_dribbling: { stat: 'dribbling', keeper: false },
  t_defending: { stat: 'defending', keeper: false },
  t_physical: { stat: 'physical', keeper: false },
  gk_reflexes: { stat: 'reflexes', keeper: true },
  gk_shot_stopping: { stat: 'shooting', keeper: true },
  gk_positioning: { stat: 'defending', keeper: true },
  gk_aerial_command: { stat: 'physical', keeper: true },
  gk_distribution: { stat: 'passing', keeper: true },
  gk_penalty_saving: { stat: 'dribbling', keeper: true },
  gk_sweeping_speed: { stat: 'pace', keeper: true },
};

/** The words every registered soccer key prints: integrity and the thirteen training keys. */
export const SOCCER_FX_WORDS: Readonly<Record<string, GmFxWords>> = {
  integrity: { label: 'Integrity' },
  t_pace: { label: 'Pace next season' },
  t_shooting: { label: 'Shooting next season' },
  t_passing: { label: 'Passing next season' },
  t_dribbling: { label: 'Dribbling next season' },
  t_defending: { label: 'Defending next season' },
  t_physical: { label: 'Physical next season' },
  gk_reflexes: { label: 'Reflexes next season' },
  gk_shot_stopping: { label: 'Shot Stopping next season' },
  gk_positioning: { label: 'Positioning next season' },
  gk_aerial_command: { label: 'Aerial Command next season' },
  gk_distribution: { label: 'Distribution next season' },
  gk_penalty_saving: { label: 'Penalty Saving next season' },
  gk_sweeping_speed: { label: 'Sweeping Speed next season' },
};

/*
   nflCareerLifeTags.ts, the tags on every NFL My Career life card (Round 917)

   Three optional fields joined CareerEvent in Round 917: category, cooldown
   and story. NOTHING READS THEM YET. They are the table the summer machine
   that follows needs (the flagship's picker has run on the same three since
   its Round 725), written down now, card by card, so that round is a bind
   and not an audit of 126 cards.

   The shape is the flagship's own (soccerCareerLife.ts, COOLDOWN and STORY):

     category  the section of the deck file the card sits under. One word per
               section header, so the table below reads straight off the files.
     cooldown  seasons the card sits out after it fires. ONCE is longer than
               any career, so that story happens one time.
     story     a key shared by cards in different sections that tell the same
               story, so a picker can rest them as one.

   This file imports nothing on purpose. The deck files and the engine import
   each other, and a value read at module scope across that cycle is how a
   page once crashed on load. A file with no imports cannot join a cycle.
*/

/** Seasons a card sits out after it fires, one number per section. */
export const NFL_LIFE_COOLDOWN = {
  /* deck A */
  lockerRoom: 2,
  media: 1,
  city: 2,
  body: 3,
  coaching: 2,
  camp: 1,
  money: 2,
  /* deck B */
  family: 2,
  legacy: 3,
  rivalry: 2,
  business: 2,
  offseason: 1,
  weird: 3,
  contract: 2,
  /* deck C */
  position: 2,
  earlyYears: 2,
  veteran: 2,
  backup: 2,
  rosterRules: 3,
  /* a story that happens one time */
  once: 99,
} as const;

export type NflLifeCategory = Exclude<keyof typeof NFL_LIFE_COOLDOWN, 'once'>;

/** Stories told by more than one card. Cards carrying one rest together. */
export const NFL_LIFE_STORY = {
  franchiseTag: 'franchiseTag',
  familyHouse: 'familyHouse',
  youthCamp: 'youthCamp',
  trashTalk: 'trashTalk',
  capRestructure: 'capRestructure',
  practiceSquad: 'practiceSquad',
  injuredReserve: 'injuredReserve',
} as const;

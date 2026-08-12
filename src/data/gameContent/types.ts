/**
 * Long-form on-page content for every game, rendered by GameSeoContent at the
 * bottom of each game page. This is real reader content (how to play, rules,
 * an example run, strategy, FAQs), written casual and human. House rules:
 * no em dashes anywhere, exact numbers that match the game code, and nothing
 * invented. Keyed by the game's route path from src/data/gameRegistry.ts.
 */

export interface GameFaq {
  q: string;
  a: string;
}

export interface GameContent {
  /** Two or three short paragraphs introducing the game. */
  intro: string[];
  /** Step by step instructions, one step per string. */
  howToPlay: string[];
  /** The details that decide wins and losses: limits, scoring, modes. */
  rules: string[];
  /** A concrete walkthrough of one imagined run, one paragraph per beat. */
  example: string[];
  /** Practical strategy advice, one tip per string. */
  tips: string[];
  /** Game specific questions and answers. */
  faqs: GameFaq[];
}

export type GameContentMap = Record<string, GameContent>;

/**
 * Long-form on-page content for every game, rendered by GameSeoContent at the
 * bottom of each game page. This is real reader content (how to play, rules,
 * an example run, strategy, FAQs), written casual and human. House rules:
 * no em dashes anywhere, exact numbers that match the game code, and nothing
 * invented. Keyed by the game's route path from src/data/gameRegistry.ts.
 *
 * Round 638: a guide part can be written two ways. The flat list (howToPlay,
 * rules, example, tips) renders under its h2 exactly as it always has. The
 * sectioned form (howToPlaySections and friends) renders the same sentences
 * under h3 headings, with optional h4 groups, so the page carries the words a
 * searcher types. A part holds ONE of the two, never both, so a converted
 * guide has one source of truth. Anything that needs the flat sentences reads
 * them through flatGuide in ./guideShape, which derives them from the
 * sections when they exist. scripts/simGuideHeadings.mjs fences the shape.
 */

export interface GameFaq {
  q: string;
  a: string;
}

/**
 * One h3 block inside a guide part: a heading over a list, with optional h4
 * groups under it. The heading names a concrete thing in the game (the
 * transfer window, the board's two asks), never "Step 1".
 */
export interface GuideSection {
  /** The h3 text. */
  heading: string;
  /** The list under the h3, one entry per sentence group, rendered before any h4. */
  items: string[];
  /** Optional h4 groups under this h3, each a heading over its own list. */
  subsections?: { heading: string; items: string[] }[];
}

/** One h3 beat of the worked example: a heading over walkthrough paragraphs. */
export interface GuideStorySection {
  /** The h3 text. */
  heading: string;
  /** The walkthrough paragraphs under it, one per beat. */
  paragraphs: string[];
}

/**
 * Keyword bearing h2 titles for the five guide parts. Each must contain the
 * game's own registry label (simGuideHeadings section 1). A missing key falls
 * back to the default title in guideH2Titles.
 */
export interface GuideHeadings {
  howToPlay?: string;
  rules?: string;
  example?: string;
  tips?: string;
  faq?: string;
}

interface GameContentBase {
  /** Two or three short paragraphs introducing the game. */
  intro: string[];
  /** Game specific questions and answers. */
  faqs: GameFaq[];
  /** Round 638: keyword bearing h2 titles. Required in practice once a guide has sections. */
  headings?: GuideHeadings;
}

type HowToPlayPart =
  | {
      /** Step by step instructions, one step per string. */
      howToPlay: string[];
      howToPlaySections?: never;
    }
  | {
      howToPlay?: never;
      /** Round 638: the steps grouped under h3 headings. Replaces howToPlay. */
      howToPlaySections: GuideSection[];
    };

type RulesPart =
  | {
      /** The details that decide wins and losses: limits, scoring, modes. */
      rules: string[];
      ruleSections?: never;
    }
  | {
      rules?: never;
      /** Round 638: the rules grouped into h3 themes. Replaces rules. */
      ruleSections: GuideSection[];
    };

type ExamplePart =
  | {
      /** A concrete walkthrough of one imagined run, one paragraph per beat. */
      example: string[];
      exampleSections?: never;
    }
  | {
      example?: never;
      /** Round 638: the walkthrough split into h3 beats. Replaces example. */
      exampleSections: GuideStorySection[];
    };

type TipsPart =
  | {
      /** Practical strategy advice, one tip per string. */
      tips: string[];
      tipSections?: never;
    }
  | {
      tips?: never;
      /** Round 638: the tips grouped into h3 themes. Replaces tips. */
      tipSections: GuideSection[];
    };

export type GameContent = GameContentBase & HowToPlayPart & RulesPart & ExamplePart & TipsPart;

export type GameContentMap = Record<string, GameContent>;

import type { GameContent, GuideSection } from './types';

/**
 * Round 638: the one way to read a guide's sentences.
 *
 * A converted guide keeps its sentences only inside its h3 sections, so
 * anything that wants the flat lists (the "?" popover, the search keyword
 * generator, a harness) reads them here. When a part has sections the list
 * is derived from them in page order: each h3's items, then each of its h4
 * groups. When it has none, the flat list is returned as written.
 */
export interface FlatGuide {
  howToPlay: string[];
  rules: string[];
  example: string[];
  tips: string[];
}

const sectionItems = (sections: GuideSection[]): string[] =>
  sections.flatMap(s => [...s.items, ...(s.subsections ?? []).flatMap(sub => sub.items)]);

export function flatGuide(content: GameContent): FlatGuide {
  return {
    howToPlay: content.howToPlaySections ? sectionItems(content.howToPlaySections) : content.howToPlay,
    rules: content.ruleSections ? sectionItems(content.ruleSections) : content.rules,
    example: content.exampleSections ? content.exampleSections.flatMap(s => s.paragraphs) : content.example,
    tips: content.tipSections ? sectionItems(content.tipSections) : content.tips,
  };
}

/**
 * The five h2 titles the guide block prints, in page order. A title the guide
 * sets in `headings` wins; otherwise the default that every unconverted guide
 * has always shown.
 */
export function guideH2Titles(content: GameContent, gameLabel: string) {
  const h = content.headings ?? {};
  return {
    howToPlay: h.howToPlay ?? `How to play ${gameLabel}`,
    rules: h.rules ?? 'Rules to know',
    example: h.example ?? 'Example walkthrough',
    tips: h.tips ?? 'Strategy tips',
    faq: h.faq ?? `${gameLabel} FAQ`,
  };
}

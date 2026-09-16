import { GAME_EDITORIAL_GUIDES, type EditorialSection } from '@/data/gameEditorialGuides';

interface GameEditorialGuideProps {
  /** Route path, e.g. /who-am-i. Used to look up static copy when sections are omitted. */
  path: string;
  title?: string;
  sections?: EditorialSection[];
}

/**
 * Crawlable editorial under a game board. Content always stays in the DOM.
 * <details open> ships open on first paint so the prerenderer (innerText,
 * display:none skipped) keeps the headings and paragraphs. Closing the summary
 * hides visually without unmounting nodes. This is extra copy, not the in-game
 * ? rules modal.
 */
const GameEditorialGuide = ({ path, title, sections }: GameEditorialGuideProps) => {
  const copy = sections
    ? { title: title ?? 'Game guide', sections }
    : GAME_EDITORIAL_GUIDES[path];

  if (!copy) return null;

  const heading = title ?? copy.title;

  return (
    <details
      className="group mx-auto mt-10 mb-4 max-w-2xl px-4 pb-[max(0.5rem,env(safe-area-inset-bottom,0px))]"
      open
    >
      <summary className="flex min-h-11 min-w-[44px] cursor-pointer list-none items-center gap-2 py-2 text-sm font-semibold text-foreground marker:content-none [&::-webkit-details-marker]:hidden">
        <span
          aria-hidden
          className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-md border border-border bg-card text-base leading-none transition-transform group-open:rotate-90"
        >
          ▸
        </span>
        <span className="font-display">Read guide: {heading}</span>
      </summary>

      <article className="mt-3 space-y-8 text-left text-sm leading-relaxed text-muted-foreground">
        {copy.sections.map((section) => (
          <section key={section.heading}>
            <h2 className="mb-3 text-base font-semibold text-foreground font-display">
              {section.heading}
            </h2>
            <div className="space-y-3">
              {section.paragraphs.map((p, i) => (
                <p key={i}>{p}</p>
              ))}
            </div>
          </section>
        ))}
      </article>
    </details>
  );
};

export default GameEditorialGuide;

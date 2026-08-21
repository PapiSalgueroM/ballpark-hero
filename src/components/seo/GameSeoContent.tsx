import { Link, useLocation } from 'react-router-dom';
import { ALL_GAMES } from '@/data/gameRegistry';
import { GAME_CONTENT } from '@/data/gameContent';
// Round 181: the deterministic related-games graph (S-6 internal links).
import { relatedGamesFor } from '@/lib/relatedGames';

interface GameSeoContentProps {
  title: string;
  description: string;
  howToPlay?: string[];
  examples?: string[];
  /**
   * Round 198: does the page already print its own first level heading?
   *
   * This block's heading used to be an h1 on every page, which was right
   * for the eighty two games whose board has no headline of its own and
   * wrong for the forty that do: those shipped two competing page titles.
   * Making it an h2 everywhere would have been worse, because it would
   * have left those eighty two pages with no h1 at all, which is weaker
   * than having two. So the level follows the page: pass this flag from a
   * page that already has an h1 and the block drops to h2 underneath it.
   * simIndexing checks the flag against the real headings in every page
   * and its components, so neither state can drift.
   */
  pageHasOwnH1?: boolean;
}

// Round 48 (AdSense content build): this block grew from title + description only
// into a real on-page guide. Every game in the registry has a long-form entry in
// src/data/gameContent (intro, how to play, rules, example run, tips, FAQs), keyed
// by route path, so all 100+ call sites get the rich content with zero per-page
// prop changes (same trick as the FAQ schema + internal links from MASTER_PLAN
// #114). The legacy howToPlay/examples props are kept for backwards compatibility
// and only render as a small fallback when a page has no gameContent entry.
// The visible FAQ list and the FAQPage JSON-LD are built from the same array so
// the structured data always matches what is actually on the page.
const GameSeoContent = ({ title, description, howToPlay, pageHasOwnH1 }: GameSeoContentProps) => {
  const location = useLocation();
  const path = location.pathname;

  const game = ALL_GAMES.find(g => g.path === path);
  const content = GAME_CONTENT[path];

  const gameLabel = game?.label || title;

  const faqs = content
    ? [
        ...content.faqs,
        {
          q: `Is ${gameLabel} free to play?`,
          a: `Yes. ${gameLabel} is free to play on DoUKnowBall, right in your browser. No download and no signup needed.`,
        },
      ]
    : [
        {
          q: `What is ${gameLabel}?`,
          a: description,
        },
        {
          q: `How do you play ${gameLabel}?`,
          a: `Open the game at douknowball.com${path} and follow the on-screen prompts. Use the "?" help button on the page for the full rules.`,
        },
        {
          q: `Is ${gameLabel} free to play?`,
          a: `Yes. ${gameLabel} is free to play on DoUKnowBall, with no login required and no download.`,
        },
      ];

  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map(({ q, a }) => ({
      '@type': 'Question',
      name: q,
      acceptedAnswer: {
        '@type': 'Answer',
        text: a,
      },
    })),
  };

  /* Round 181: the old picker here took the FIRST three siblings in registry
     order, so every page in a category pointed at the same three games and
     most games had zero inbound internal links. relatedGamesFor builds a
     deterministic graph instead: a ring through my category, a link into the
     next category (so the whole site is one crawlable component, proven by
     simRelatedGames with a real BFS), and two hash-spread variety picks. */
  const related = relatedGamesFor(path);

  return (
    <section className="max-w-2xl mx-auto mt-12 mb-8 px-4">
      <div className="text-center">
        {/* Round 198: the heading level follows the page, see the prop's
            comment above. Identical classes either way, so nothing moves
            on screen; only the level a crawler reads changes. */}
        {pageHasOwnH1 ? (
          <h2 className="text-lg font-semibold text-muted-foreground font-display mb-2">
            {title}
          </h2>
        ) : (
          <h1 className="text-lg font-semibold text-muted-foreground font-display mb-2">
            {title}
          </h1>
        )}
        <p className="text-sm text-muted-foreground leading-relaxed">
          {description}
        </p>
      </div>

      {content && (
        <article className="mt-10 text-left text-sm text-muted-foreground leading-relaxed space-y-8">
          <div className="space-y-3">
            {content.intro.map((p, i) => (
              <p key={i}>{p}</p>
            ))}
          </div>

          <div>
            <h2 className="text-base font-semibold text-foreground mb-3">
              How to play {gameLabel}
            </h2>
            <ol className="list-decimal pl-5 space-y-2">
              {content.howToPlay.map((step, i) => (
                <li key={i}>{step}</li>
              ))}
            </ol>
          </div>

          <div>
            <h2 className="text-base font-semibold text-foreground mb-3">
              Rules to know
            </h2>
            <ul className="list-disc pl-5 space-y-2">
              {content.rules.map((rule, i) => (
                <li key={i}>{rule}</li>
              ))}
            </ul>
          </div>

          <div>
            <h2 className="text-base font-semibold text-foreground mb-3">
              Example walkthrough
            </h2>
            <div className="space-y-3">
              {content.example.map((p, i) => (
                <p key={i}>{p}</p>
              ))}
            </div>
          </div>

          <div>
            <h2 className="text-base font-semibold text-foreground mb-3">
              Strategy tips
            </h2>
            <ul className="list-disc pl-5 space-y-2">
              {content.tips.map((tip, i) => (
                <li key={i}>{tip}</li>
              ))}
            </ul>
          </div>

          <div>
            <h2 className="text-base font-semibold text-foreground mb-3">
              {gameLabel} FAQ
            </h2>
            <div className="space-y-4">
              {faqs.map((faq, i) => (
                <div key={i}>
                  <h3 className="font-medium text-foreground">{faq.q}</h3>
                  <p className="mt-1">{faq.a}</p>
                </div>
              ))}
            </div>
          </div>
        </article>
      )}

      {!content && howToPlay && howToPlay.length > 0 && (
        <div className="mt-8 text-left text-sm text-muted-foreground leading-relaxed">
          <h2 className="text-base font-semibold text-foreground mb-3">How to play</h2>
          <ol className="list-decimal pl-5 space-y-2">
            {howToPlay.map((step, i) => (
              <li key={i}>{step}</li>
            ))}
          </ol>
        </div>
      )}

      {game && (
        <script type="application/ld+json">{JSON.stringify(faqJsonLd)}</script>
      )}

      {/* Round 53: breadcrumb structured data (Home > Game) for richer snippets. */}
      {game && (
        <script type="application/ld+json">{JSON.stringify({
          '@context': 'https://schema.org',
          '@type': 'BreadcrumbList',
          itemListElement: [
            { '@type': 'ListItem', position: 1, name: 'DoUKnowBall', item: 'https://douknowball.com' },
            { '@type': 'ListItem', position: 2, name: gameLabel, item: `https://douknowball.com${path}` },
          ],
        })}</script>
      )}

      {/* Round 181: real tiles instead of three bare text links, per the
          tile rule. Plain anchors via Link so crawlers walk the graph. */}
      {related.length > 0 && (
        <nav aria-label="More games" data-related-games className="mt-10">
          <h2 className="mb-3 text-center text-base font-semibold text-foreground">More games to play</h2>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {related.map(r => (
              <Link
                key={r.path}
                to={r.path}
                className="rounded-xl border border-border bg-card px-3 py-2.5 transition-colors hover:border-primary/50"
              >
                <span className="block text-lg">{r.emoji}</span>
                <span className="mt-0.5 block truncate text-xs font-bold text-foreground">{r.label}</span>
                <span className="mt-0.5 block text-[10px] leading-snug text-muted-foreground line-clamp-2">{r.description}</span>
              </Link>
            ))}
          </div>
        </nav>
      )}
    </section>
  );
};

export default GameSeoContent;

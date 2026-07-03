import { Link, useLocation } from 'react-router-dom';
import { CATEGORIES, ALL_GAMES } from '@/data/gameRegistry';

interface GameSeoContentProps {
  title: string;
  description: string;
  howToPlay: string[];
  examples?: string[];
}

// NOTE: the on-page "How to Play" list was removed from the bottom of every game
// (it duplicated the top-right "?" help modal and looked cluttered). We keep the
// SEO title + description for search ranking. howToPlay/examples props are kept on
// the interface for backwards compatibility with the 52 call sites but no longer rendered.
//
// FAQ schema + internal links (MASTER_PLAN #114): both are derived entirely from the
// current route (via useLocation) and the game registry, so every one of the 70+ call
// sites gets them for free with zero per-page prop changes. If a page's path isn't in
// the registry (e.g. a hub page), the lookup is undefined and both blocks quietly skip.
const GameSeoContent = ({ title, description }: GameSeoContentProps) => {
  const location = useLocation();
  const path = location.pathname;

  const game = ALL_GAMES.find(g => g.path === path);
  const category = CATEGORIES.find(c => c.games.some(g => g.path === path));

  const gameLabel = game?.label || title;

  const faqs = [
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

  // Deterministic, not random: first 3 sibling games in registry order, self excluded.
  const siblings = (category?.games || []).filter(g => g.path !== path).slice(0, 3);

  return (
    <section className="max-w-2xl mx-auto mt-12 mb-8 px-4 text-center">
      <h1 className="text-lg font-semibold text-muted-foreground font-display mb-2">
        {title}
      </h1>
      <p className="text-sm text-muted-foreground leading-relaxed">
        {description}
      </p>

      {game && (
        <script type="application/ld+json">{JSON.stringify(faqJsonLd)}</script>
      )}

      {siblings.length > 0 && (
        <nav aria-label="More games" className="mt-6 flex flex-wrap items-center justify-center gap-x-4 gap-y-2">
          {siblings.map(sibling => (
            <Link
              key={sibling.path}
              to={sibling.path}
              className="text-xs text-muted-foreground hover:text-primary transition-colors"
            >
              {sibling.emoji} {sibling.label}
            </Link>
          ))}
        </nav>
      )}
    </section>
  );
};

export default GameSeoContent;

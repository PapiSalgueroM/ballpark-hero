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
const GameSeoContent = ({ title, description }: GameSeoContentProps) => (
  <section className="max-w-2xl mx-auto mt-12 mb-8 px-4 text-center">
    <h1 className="text-lg font-semibold text-muted-foreground font-display mb-2">
      {title}
    </h1>
    <p className="text-sm text-muted-foreground leading-relaxed">
      {description}
    </p>
  </section>
);

export default GameSeoContent;

interface GameSeoContentProps {
  title: string;
  description: string;
  howToPlay: string[];
}

const GameSeoContent = ({ title, description, howToPlay }: GameSeoContentProps) => (
  <section className="max-w-2xl mx-auto mt-12 mb-8 px-4 text-center">
    <h1 className="text-lg font-semibold text-muted-foreground/70 font-display mb-2">
      {title}
    </h1>
    <p className="text-sm text-muted-foreground/60 leading-relaxed mb-4">
      {description}
    </p>
    <div className="text-left max-w-md mx-auto">
      <h3 className="text-xs font-semibold text-muted-foreground/50 uppercase tracking-wider mb-2">
        How to Play
      </h3>
      <ul className="list-disc list-inside space-y-1 text-xs text-muted-foreground/50">
        {howToPlay.map((step, i) => (
          <li key={i}>{step}</li>
        ))}
      </ul>
    </div>
  </section>
);

export default GameSeoContent;

interface SeoContentProps {
  title: string;
  description: string;
  className?: string;
}

const SeoContent = ({ title, description, className = '' }: SeoContentProps) => (
  <section className={`text-center max-w-2xl mx-auto mb-8 ${className}`}>
    <h1 className="text-3xl md:text-5xl font-bold tracking-[0.12em] text-primary font-display mb-2">
      {title}
    </h1>
    <p className="text-muted-foreground text-sm md:text-base leading-relaxed">
      {description}
    </p>
  </section>
);

export default SeoContent;

import { Fragment } from 'react';
import { Link } from 'react-router-dom';
import { HOME_COPY, type HomeCopyBlock, type HomeCopyLine } from '@/data/homeCopy';

/**
 * Round 840: what the site is, in words, below the game tiles.
 *
 * The same copy index.html carries for crawlers that do not run JavaScript,
 * read from the one module both are drawn from (src/data/homeCopy.ts). Google
 * indexes the page after it renders, and until this the rendered home page was
 * a wall of tiles with no paragraph saying what the site is. It sits under the
 * games on purpose: the first screen still belongs to something to play, and
 * scripts/playHomeFold.mjs holds the first tile where it was.
 *
 * Visible text, not a toggle and not hidden: a reader can read it, which is the
 * point. Small headings and the site's own body type, in two columns on a wide
 * screen so it stays compact.
 */
function Line({ parts }: { parts: HomeCopyLine }) {
  return (
    <>
      {parts.map((part, i) =>
        typeof part === 'string' ? (
          <Fragment key={i}>{part}</Fragment>
        ) : (
          <Link key={i} to={part.to} className="font-medium text-primary underline-offset-2 hover:underline">
            {part.text}
          </Link>
        ),
      )}
    </>
  );
}

function Block({ block }: { block: HomeCopyBlock }) {
  if (block.kind === 'question') {
    return <h4 className="mt-4 text-sm font-semibold text-foreground">{block.text}</h4>;
  }
  if (block.kind === 'list') {
    return (
      <ul className="mt-2 list-disc space-y-1 pl-5 marker:text-muted-foreground/60">
        {block.items.map((item, i) => (
          <li key={i}><Line parts={item} /></li>
        ))}
      </ul>
    );
  }
  return <p className="mt-2"><Line parts={block.parts} /></p>;
}

export function HomeAbout() {
  return (
    <section data-home-about="" aria-labelledby="home-about-heading" className="mt-10 border-t border-border pt-8">
      <h2 id="home-about-heading" className="text-lg font-display font-bold text-foreground">
        {HOME_COPY.aboutHeading}
      </h2>
      <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
        <Line parts={HOME_COPY.intro} />
      </p>
      <div className="mt-6 text-sm leading-6 text-muted-foreground md:columns-2 md:gap-10">
        {HOME_COPY.sections.map(section => (
          <div key={section.heading} className="mb-6 break-inside-avoid">
            <h3 className="text-sm font-semibold text-foreground">{section.heading}</h3>
            {section.blocks.map((block, i) => (
              <Block key={i} block={block} />
            ))}
          </div>
        ))}
      </div>
      <p className="text-xs leading-6 text-muted-foreground">
        <Line parts={HOME_COPY.closing} />
      </p>
    </section>
  );
}

import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { ALL_GAMES } from '@/data/gameRegistry';
/* Round 210: the guide arrives one sport at a time instead of every word
   of prose on the site arriving on every page. See gameContent/loader.ts. */
import { loadGameContent } from '@/data/gameContent/loader';
import type { GameContent } from '@/data/gameContent/types';
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
// the structured data always matches what is actually on the page. Round 373
// made that true: the array used to carry a generic placeholder set while the
// guide file was loading, and that set fed the JSON-LD without ever appearing
// on screen. See the long note on `faqs` below.
const GameSeoContent = ({ title, description, howToPlay, pageHasOwnH1 }: GameSeoContentProps) => {
  const location = useLocation();
  const path = location.pathname;

  const game = ALL_GAMES.find(g => g.path === path);
  /* Fetched, not bundled. The block below renders its fallback copy while
     the sport file is in flight, so the page is never empty and a crawler
     that waits for the network (all of them do, this whole site is client
     rendered) gets the full guide. */
  /* Round 284: three states, not two. undefined is "still in flight", null is
     "this route has no guide", and the section below says which on a data
     attribute so the prerenderer can wait for the answer instead of guessing
     at it with a timer. It had been guessing: the first three clock sample
     run caught five pages whose head disagreed with itself, and every one
     was the FAQ structured data captured before the sport file had landed on
     one sample and after it on another. Nothing about that was the clock's
     doing, it was a 3.5 second settle racing a lazy chunk on a busy machine,
     and the single sample prerender had been exposed to the same race all
     along with nothing to notice it. */
  const [content, setContent] = useState<GameContent | null | undefined>(undefined);
  useEffect(() => {
    let live = true;
    setContent(undefined);
    loadGameContent(path).then(c => { if (live) setContent(c); });
    return () => { live = false; };
  }, [path]);

  const gameLabel = game?.label || title;

  /* ROUND 373: THERE IS NO FALLBACK FAQ ANY MORE, AND ITS REMOVAL FIXES TWO
     THINGS AT ONCE.
     Until this round, this array held a generic three question set ("What is
     X? / How do you play X? / Is X free to play?") for as long as the guide
     file was in flight, and swapped to the real questions when it landed. The
     visible list below is inside {content && ...}, so that generic set was
     NEVER ON SCREEN. It existed only to fill the JSON-LD, which means the page
     was declaring FAQPage markup for questions a visitor could not see, and
     Google's own FAQPage guidance is that the content must be visible on the
     page. The comment at the top of this file has claimed since Round 281 that
     "the structured data always matches what is actually on the page". That was
     true after the swap and false before it.
     The second thing it fixes is a duplicate that reached four shipped
     documents. react-helmet-async 3 on React 19 does not touch the DOM: it
     renders the head tags as React elements and lets React 19 hoist them. A
     hoisted inline <script> whose CONTENT changes after mount is not reliably
     replaced, and this array changing was the only place on the site where a
     JSON-LD block's content ever changed after mount. Measured with a
     MutationObserver installed before boot: the head passed through the generic
     block on every single page, and on some loads the real block was appended
     without the generic one being removed, permanently. /front-office,
     /nhl-front-office, /gauntlet-draft and /nhl-connect-4 each shipped TWO
     FAQPage blocks contradicting each other, from the Round 369 rebuild.
     So the block is written once, from real content, or not at all. A game page
     that ends up with no FAQ markup is a page whose guide file did not load,
     which is a real failure and simSchema section 3 already fails on it. */
  const faqs = content
    ? [
        ...content.faqs,
        {
          q: `Is ${gameLabel} free to play?`,
          a: `Yes. ${gameLabel} is free to play on DoUKnowBall, right in your browser. No download and no signup needed.`,
        },
      ]
    : [];

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
    <section
      className="max-w-2xl mx-auto mt-12 mb-8 px-4"
      data-seo-content={content === undefined ? 'loading' : 'ready'}
    >
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

      {/* ROUND 281: BOTH OF THESE USED TO BE RENDERED HERE, IN THE BODY, WHERE
          NO CRAWLER EVER SAW THEM.

          Since Round 256 every page ships as a snapshot whose head is kept
          exactly as the build produced it and whose body is rebuilt from the
          page's readable content: headings, paragraphs, list items, links. A
          script tag in the body is not readable content, so it was thrown away.
          Measured across all 127 shipped documents on 2026-08-24: exactly one
          ld+json block per page, the Game one from PageSeo, which lives in the
          head. The FAQ markup and the breadcrumbs, both built and both correct,
          reached nobody on any of the 113 game pages.

          Moving them into Helmet puts them in the head, where the snapshot keeps
          them verbatim. Nothing about what is generated changes; only where it
          is put. The FAQ list stays built from the same array the visible
          questions come from, which is the property that keeps the markup and
          the page honest with each other.

          Breadcrumbs are the one of the two that Google routinely renders in a
          result, so losing them was losing a visible thing, not only a hint. */}
      {game && (
        <Helmet>
          <script type="application/ld+json">{JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'BreadcrumbList',
            itemListElement: [
              { '@type': 'ListItem', position: 1, name: 'DoUKnowBall', item: 'https://douknowball.com' },
              { '@type': 'ListItem', position: 2, name: gameLabel, item: `https://douknowball.com${path}` },
            ],
          })}</script>
        </Helmet>
      )}
      {/* ROUND 373: A SEPARATE Helmet, AND THE SEPARATION IS THE POINT.
          The breadcrumb above is known the moment the route is known and never
          changes, so it can mount immediately. The FAQ is not known until the
          guide file lands. Sharing one Helmet would mean that Helmet's script
          list CHANGING when the content arrived, which is the exact thing React
          19's head hoisting does not clean up after (see the note on faqs
          above). A second Helmet that mounts once, already holding its final
          content, only ever adds. On a client side route change it unmounts
          with its route, which React does remove correctly, and the next route
          mounts its own. */}
      {game && content && (
        <Helmet>
          <script type="application/ld+json">{JSON.stringify(faqJsonLd)}</script>
        </Helmet>
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

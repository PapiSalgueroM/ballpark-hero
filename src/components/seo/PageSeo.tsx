import { useEffect } from 'react';
import { Helmet } from 'react-helmet-async';

interface PageSeoProps {
  title: string;
  description: string;
  path: string;
  ogImage?: string;
  /**
   * Round 198: keep this page out of the index on purpose.
   *
   * His ask was "make sure every page is good to be indexed", and the honest
   * reading of that is not "index everything": it is that every page the
   * site serves should either be worth indexing and reachable, or told
   * plainly not to be indexed. Three kinds of page take this flag:
   *
   *   RETIRED GAMES. Twelve games were pulled from the site's own menus on
   *   his own reviews ("too easy and boring", "get rid of this game") but
   *   their routes were kept alive so old links still work. Seven of them
   *   were still being submitted to Google, so a stranger's search result
   *   could be a game the owner deleted, with no way back into the site
   *   from any menu.
   *
   *   PRIVATE PAGES. A profile, a password reset, the admin screens. There
   *   is nothing there for a searcher, and a signed-out crawler sees an
   *   empty shell.
   *
   *   THE 404. Never worth a result.
   *
   * Always "noindex, follow": the page keeps passing its links onward, it
   * just stops asking to be a landing page itself. The canonical stays too,
   * because a noindexed page with a self canonical is unambiguous, while a
   * noindexed page with no canonical invites a crawler to guess.
   */
  noindex?: boolean;
}

const BASE_URL = 'https://douknowball.com';
const DEFAULT_OG_IMAGE = `${BASE_URL}/og-image.png`;

const PageSeo = ({ title, description, path, ogImage, noindex }: PageSeoProps) => {
  const canonicalUrl = `${BASE_URL}${path}`;
  const image = ogImage || DEFAULT_OG_IMAGE;

  /* Round 274: take the TEMPLATE's canonical back off the page.
   *
   * index.html carries a hardcoded canonical to the home page, added in Round
   * 265 for the one route that is not prerendered and therefore has no other
   * way to declare one. It was right for the home page and quietly wrong for
   * every other page, because Helmet ADDS its own canonical rather than
   * replacing a static one. Measured on the shipped documents: 126 of 134 were
   * carrying TWO canonical tags, the home page's first and their own second.
   *
   * That is not a cosmetic duplicate. Google's guidance for conflicting
   * rel=canonical is to ignore all of them, and a crawler that simply takes
   * the first one is being told that /privacy, /soccer-career and every other
   * page on this site IS the home page. This shipped inside the unpushed
   * queue, so it never reached the live site, and it was found only because
   * Round 274 got playIndexing running again: that harness reads the FIRST
   * canonical in the rendered head, which is exactly what such a crawler does,
   * and it had been unable to complete at all.
   *
   * Removing it here rather than in the prerenderer means one mechanism rather
   * than two, and it fixes the live DOM as well as the snapshot. The home page
   * loses nothing: PageSeo on / emits the same URL, and a crawler that runs no
   * JavaScript never gets this far and keeps the template's tag, which is the
   * whole reason Round 265 put it there.
   */
  useEffect(() => {
    for (const el of Array.from(document.querySelectorAll('link[rel="canonical"]'))) {
      if (!el.hasAttribute('data-rh')) el.remove();
    }
  });

  const jsonLd = path === '/'
    ? {
        "@context": "https://schema.org",
        "@type": "WebApplication",
        "name": "DoUKnowBall",
        "url": "https://douknowball.com",
        "description": "Free daily sports trivia games covering NFL, NBA, Soccer, MLB, NHL, UFC, F1, Tennis, NASCAR and more.",
        "applicationCategory": "GameApplication",
        "operatingSystem": "Web Browser",
        "offers": { "@type": "Offer", "price": "0", "priceCurrency": "USD" }
      }
    : {
        "@context": "https://schema.org",
        "@type": "Game",
        "name": title,
        "description": description,
        "url": canonicalUrl,
        "isAccessibleForFree": true,
        "gamePlatform": "Web Browser"
      };

  return (
    <Helmet>
      <title>{title}</title>
      <meta name="description" content={description} />
      <link rel="canonical" href={canonicalUrl} />
      {noindex ? <meta name="robots" content="noindex, follow" /> : null}
      <meta property="og:type" content="website" />
      <meta property="og:url" content={canonicalUrl} />
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:image" content={image} />
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={image} />
      {/* Round 198: a noindexed page has no business advertising itself as a
          Game in structured data, so the block is dropped there entirely. */}
      {noindex ? null : <script type="application/ld+json">{JSON.stringify(jsonLd)}</script>}
    </Helmet>
  );
};

export default PageSeo;

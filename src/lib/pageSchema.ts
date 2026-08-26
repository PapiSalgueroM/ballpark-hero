/**
 * ROUND 281: WHAT EACH PAGE ACTUALLY IS, IN STRUCTURED DATA.
 *
 * WHAT WAS WRONG. PageSeo emitted one shape for the home page and `@type: Game`
 * for literally everything else, so measured across the 127 submitted documents
 * on 2026-08-24: the privacy policy, the terms, the about page, the contact
 * page, the record books, the world leaderboard, the changelog and all six sport
 * hubs, thirteen pages in total, each told Google in machine readable terms that
 * it is a video game. Google's structured data guidelines are explicit that
 * markup has to describe the page's main content; markup that does not is
 * ignored at best, and a privacy policy declaring itself a game is exactly the
 * kind of thing that reads as low quality on a site that has already been turned
 * down once for low value content.
 *
 * AND THE HOME PAGE HAD NO SITE LEVEL MARKUP AT ALL. No WebSite, no
 * Organization, which are the two things Google reads to work out who a domain
 * belongs to and what to call it. For a domain still trying to be recognised as
 * a brand rather than 127 loose pages, that is the cheapest thing there is.
 *
 * HOW THE TYPE IS DECIDED, and it is deliberately not a prop on the component.
 * A prop is a thing you forget. A route that is in the game registry is a Game;
 * every other submitted route has to appear in the table below with a reason
 * attached, and scripts/simSchema.mjs fails if a submitted route is neither. So
 * a new static page cannot quietly inherit "Game", and a new game needs no
 * change here at all.
 *
 * TYPES CHOSEN TO BE TRUE RATHER THAN FLATTERING. There is no schema.org type
 * for a privacy policy, so those are plain WebPage rather than something more
 * impressive that does not fit. The hubs and the changelog are CollectionPage
 * because that is what they are, a page whose content is a list of other pages.
 * Nothing here claims a rich result the page cannot back up.
 */
import { ALL_GAMES } from '@/data/gameRegistry';

const SITE = 'https://douknowball.com';

/** Every submitted route that is not a game, and what it really is. */
const STATIC_TYPES: Record<string, string> = {
  '/about': 'AboutPage',
  '/contact': 'ContactPage',
  '/privacy': 'WebPage',
  '/terms': 'WebPage',
  '/records': 'CollectionPage',
  '/leaderboard': 'WebPage',
  '/whats-new': 'CollectionPage',
  '/soccer': 'CollectionPage',
  '/pro-basketball': 'CollectionPage',
  '/pro-football': 'CollectionPage',
  '/baseball': 'CollectionPage',
  '/hockey': 'CollectionPage',
  '/college': 'CollectionPage',
};

/** The one place that decides. Exported so the guard can check it directly. */
export function schemaTypeFor(path: string): string {
  const p = path.replace(/\/$/, '') || '/';
  if (p === '/') return 'WebSite';
  if (STATIC_TYPES[p]) return STATIC_TYPES[p];
  if (ALL_GAMES.some(g => g.path === p)) return 'Game';
  /* An unlisted route reaching here is a page nobody has classified. Falling
     back to WebPage is the honest answer: it is true of every page on the web
     and claims nothing. The guard fails on it separately so it gets fixed. */
  return 'WebPage';
}

export function jsonLdFor(path: string, title: string, description: string, canonicalUrl: string): unknown | null {
  const type = schemaTypeFor(path);

  if (type === 'WebSite') {
    /* NOTHING AT RUNTIME FOR THE HOME PAGE, on purpose.

       The home page is the one page that is not prerendered, because vite
       regenerates it from index.html on whatever machine builds the site, so a
       tag React adds never reaches the raw HTML a crawler reads. Measured on
       2026-08-24 the shipped home page carried zero ld+json blocks: the
       WebApplication object the app had been generating since Round 53 had been
       seen only by browsers that run JavaScript. Same trap that swallowed the
       canonical in Round 265 and the readable copy in Round 257.

       So all three of its objects live in the template instead, written from
       SITE_JSON_LD below, and emitting them again here would only duplicate
       what is already in the document. */
    return null;
  }

  if (type === 'Game') {
    return {
      '@context': 'https://schema.org',
      '@type': 'Game',
      name: title,
      description,
      url: canonicalUrl,
      isAccessibleForFree: true,
      gamePlatform: 'Web Browser',
      publisher: { '@id': `${SITE}/#org` },
    };
  }

  /* Everything else. isPartOf ties the page to the site entity declared on the
     home page, which is what lets a crawler treat 127 documents as one site. */
  return {
    '@context': 'https://schema.org',
    '@type': type,
    name: title,
    description,
    url: canonicalUrl,
    isPartOf: { '@id': `${SITE}/#website` },
    publisher: { '@id': `${SITE}/#org` },
  };
}

/**
 * The site level objects, exactly as they are written into index.html.
 *
 * These are claims about the SITE, not about whichever page is being served, so
 * they are correct on every page and are what tie 127 separate documents to one
 * entity. Every one carries an @id naming the site root, so nothing here can be
 * read as a claim about the current page. The snapshots copy this head verbatim,
 * which is how all 126 of them end up carrying it.
 *
 * Exported so the guard can compare the template against this rather than
 * against a copy typed out a second time, which is how two sources of truth
 * start.
 */
export const SITE_JSON_LD = [
  {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    '@id': `${SITE}/#website`,
    name: 'DoUKnowBall',
    alternateName: 'Do U Know Ball',
    url: `${SITE}/`,
    inLanguage: 'en',
    publisher: { '@id': `${SITE}/#org` },
  },
  {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    '@id': `${SITE}/#org`,
    name: 'DoUKnowBall',
    url: `${SITE}/`,
    logo: `${SITE}/og-image.png`,
  },
  {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    '@id': `${SITE}/#webapp`,
    name: 'DoUKnowBall',
    url: `${SITE}/`,
    applicationCategory: 'GameApplication',
    operatingSystem: 'Web Browser',
    isAccessibleForFree: true,
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
    publisher: { '@id': `${SITE}/#org` },
  },
];

import { useEffect, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { ALL_GAMES } from '@/data/gameRegistry';
import { jsonLdFor } from '@/lib/pageSchema';

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

/* Round 277: the brand suffix comes off a title that would otherwise be cut in
 * half by Google.
 *
 * MEASURED across the 126 shipped pages: 37 of them run past 60 characters,
 * which is roughly where a search result title gets truncated with an ellipsis.
 * The longest was /soccer at 73. Every one of those 37 ends in the same 14
 * character brand suffix, and dropping it brings ALL of them under: the longest
 * becomes 59.
 *
 * So the rule is arithmetic rather than judgement, and it is applied here rather
 * than by hand-editing 37 pages of copy, because a rule cannot drift when
 * somebody writes the next title and a hand edit can. The brand stays wherever
 * it fits, which is 89 of the 126 pages, and comes off only where its cost is a
 * truncated title.
 *
 * It comes off the <title> ONLY. og:title and twitter:title keep the full text,
 * because a social card has roughly 88 characters to play with and the brand is
 * worth more there than the last few words of a game name.
 *
 * If a title is still too long after the suffix comes off, that is a real copy
 * problem and no rule can fix it. simHeadTags fails on it rather than trimming
 * further, because truncating a sentence in code is how you end up shipping
 * half a word. */
const BRAND_SUFFIX = ' | DoUKnowBall';
const SEARCH_TITLE_LIMIT = 60;
export const searchTitle = (full: string): string =>
  full.length > SEARCH_TITLE_LIMIT && full.endsWith(BRAND_SUFFIX)
    ? full.slice(0, -BRAND_SUFFIX.length)
    : full;

/* Round 642: a game's search title and description come from
 * src/data/seoMeta.ts, loaded on its own.
 *
 * The owner asked for "lots of key words ... because we need more traction".
 * Measured before this round: titles like "Missing XI | DoUKnowBall" and
 * "Rarity Round | DoUKnowBall" named no sport and no kind of game, so a search
 * for a soccer lineup quiz had nothing to match, and 46 of the 127 game
 * descriptions ran past 158 characters, where a result starts cutting them.
 *
 * WHY A DYNAMIC IMPORT. The first cut put the text on every GameDef, which put
 * about 28 KB (7.5 KB gzipped) into the entry chunk every page loads and left
 * /soccer-career 8 KB under its weight ceiling, for text a page needs exactly
 * one line of. So it is its own chunk now. The module promise and the loaded
 * map are cached HERE, at module level: the first PageSeo to mount starts the
 * load and renders the page's own props meanwhile, then swaps once the chunk
 * lands, and every page after that reads the map synchronously on its first
 * render. Nothing is drawn in a state initialiser; the state is only a nudge
 * to render again. A failed load leaves the page's own props in place and
 * clears the cache so the next page tries again.
 *
 * The saved pages are what a crawler reads, and the prerenderer waits for the
 * head to stop moving before it captures, so the swap lands in them. The brand
 * suffix goes on here and the Round 277 rule above still decides whether it
 * stays in the <title>, so og:title, twitter:title and the JSON-LD name get the
 * full text exactly as they always have. A path with no entry (the hubs, the
 * legal pages, the retired games) keeps the props it passes, unchanged.
 * scripts/simSeoTitles.mjs renders every game page through this component
 * before and after the load, and checks the text stays out of the entry chunk. */
type SeoMetaMap = typeof import('@/data/seoMeta').SEO_META;
let seoMeta: SeoMetaMap | null = null;
let seoMetaLoad: Promise<SeoMetaMap | null> | null = null;
export const loadSeoMeta = (): Promise<SeoMetaMap | null> => {
  if (!seoMetaLoad) {
    seoMetaLoad = import('@/data/seoMeta')
      .then(m => (seoMeta = m.SEO_META))
      .catch(() => {
        seoMetaLoad = null;
        return null;
      });
  }
  return seoMetaLoad;
};

const PageSeo = ({ title: pageTitle, description: pageDescription, path, ogImage, noindex }: PageSeoProps) => {
  const [, setSeoMetaLoaded] = useState(false);
  useEffect(() => {
    /* Only a game page has an entry, so the home page, the hubs and the legal
       pages never fetch the chunk. The registry is already in the entry chunk
       (pageSchema reads it), so asking costs nothing. */
    if (seoMeta || !ALL_GAMES.some(g => g.path === path)) return;
    let live = true;
    loadSeoMeta().then(m => {
      if (live && m) setSeoMetaLoaded(true);
    });
    return () => {
      live = false;
    };
  }, [path]);
  const entry = seoMeta?.[path];
  const title = entry ? `${entry.title}${BRAND_SUFFIX}` : pageTitle;
  const description = entry ? entry.description : pageDescription;
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
  /* Round 276: the same fault, nine more times over.
   *
   * Round 274 removed the template's canonical once Helmet had added the page's
   * own. It was the right fix for one tag and it stopped there, because that is
   * the one tag the harness that found it happened to read. Measured across the
   * 126 shipped pages afterwards: NINE more meta tags were duplicated on every
   * single one of them, all authored by index.html and all re-authored by
   * Helmet. description, og:type, og:title, og:description, og:image,
   * twitter:card, twitter:title, twitter:description, twitter:image.
   *
   * What that costs is not theoretical. A reader takes the FIRST tag it finds,
   * so every page was handing out the generic site description instead of its
   * own, and every share of every game on Facebook, LinkedIn or X carried the
   * same site wide title, blurb and picture rather than the game's. Footle's
   * own line, "Guess the mystery soccer player in 8 tries", was sitting second
   * in the file behind "How deep does your sports knowledge go".
   *
   * The rule below is deliberately narrow: a static tag is removed ONLY when a
   * Helmet authored tag with the same key exists to replace it. So the tags the
   * template owns outright and Helmet never sets, the viewport, the charset,
   * the AdSense verification tag, are untouched by construction rather than by
   * an allowlist somebody has to maintain.
   */
  /* WHY A HEAD OBSERVER AND NOT JUST AN EFFECT. The first version of this ran
     the sweep in a plain effect, and it worked for the canonical and then only
     for 9 of the 126 pages once it covered the other nine tags. Helmet writes
     into the head asynchronously and this component does not re-render when it
     does, so on most pages the sweep ran BEFORE the replacement tags existed
     and found nothing to replace. Watching the head instead means the sweep
     happens whenever Helmet actually lands, which is the only moment it can be
     correct. Removing a node retriggers the observer, which then finds nothing
     left to remove, so it settles rather than looping. */
  useEffect(() => {
    const keyOf = (el: Element) =>
      el.tagName === 'LINK'
        ? `link:${el.getAttribute('rel')}`
        : `meta:${el.getAttribute('name') ?? el.getAttribute('property')}`;
    const sweep = () => {
      // A saved private page starts with its noindex tag already in the head.
      // Helmet has no replacement robots tag on an indexable route, so remove
      // that stale tag explicitly when the visitor moves into a public page.
      if (!noindex) {
        for (const el of Array.from(document.querySelectorAll('meta[name="robots"][content*="noindex"]'))) {
          el.remove();
        }
      }
      const owned = new Set<string>();
      for (const el of Array.from(document.querySelectorAll('head [data-rh]'))) owned.add(keyOf(el));
      if (!owned.size) return;
      for (const el of Array.from(document.querySelectorAll('head meta, head link[rel="canonical"]'))) {
        if (el.hasAttribute('data-rh')) continue;
        if (owned.has(keyOf(el))) el.remove();
      }
    };
    sweep();
    const mo = new MutationObserver(sweep);
    mo.observe(document.head, { childList: true, subtree: true });
    return () => mo.disconnect();
  }, [noindex]);

  /* ROUND 281: the type comes from src/lib/pageSchema.ts, not from here.
     Until this round every page that was not the home page was emitted as
     @type Game, which meant the privacy policy, the terms, the about and
     contact pages, the record books, the leaderboard, the changelog and all
     six sport hubs, thirteen documents, each told Google it is a video game.
     The decision is now made in one place off the game registry plus an
     explicit table, and scripts/simSchema.mjs fails if a submitted route is in
     neither, so a new static page cannot inherit Game by accident. */
  const jsonLd = jsonLdFor(path, title, description, canonicalUrl);

  return (
    <Helmet>
      <title>{searchTitle(title)}</title>
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
      {/* Round 198: a noindexed page has no business advertising itself in
          structured data at all, so the block is dropped there entirely. */}
      {noindex || !jsonLd ? null : <script type="application/ld+json">{JSON.stringify(jsonLd)}</script>}
    </Helmet>
  );
};

export default PageSeo;

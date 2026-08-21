/* Round 257: boot the real app on top of a prerendered page.
 *
 * WHY THIS FILE EXISTS. Every route in the sitemap is prerendered to a real
 * HTML document so a crawler can read the site without running JavaScript
 * (Round 256, which is what got the site turned down for "low value
 * content" in the first place). Those documents live in public/ and are
 * copied verbatim into every future build, so anything hash-named inside
 * one goes stale the moment the next build runs. The first version copied
 * vite's <script src="/assets/index-HASH.js"> straight in, and a headless
 * check proved the consequence: served against a fresh build, a deep link
 * 404s on the entry bundle and on every lazy chunk, and the app simply
 * never starts. The page would show its text and nothing on it would work.
 *
 * So the snapshots carry no hashed paths at all. This file has a stable
 * name that no build ever renames, and it does the one thing a snapshot
 * cannot do for itself: read the CURRENT asset tags off the live root
 * document and put them into this one.
 *
 * If the fetch fails, the page keeps its text and its links, every one of
 * which is a real anchor to another page that will try the same thing. That
 * is a worse experience than the app, and an honest one.
 */
(function () {
  'use strict';
  /* the root document is built by vite and already has its own tags */
  if (location.pathname === '/' || location.pathname === '/index.html') return;
  /* nothing to do if a build ever does inject them here */
  if (document.querySelector('script[type="module"][src^="/assets/"]')) return;

  var done = false;
  function inject(html) {
    if (done) return;
    done = true;
    var doc;
    try {
      doc = new DOMParser().parseFromString(html, 'text/html');
    } catch (e) { return; }
    var head = doc.head;
    if (!head) return;

    /* stylesheets first, so the app paints styled rather than flashing */
    var links = head.querySelectorAll('link[rel="stylesheet"][href^="/assets/"]');
    for (var i = 0; i < links.length; i++) {
      var l = document.createElement('link');
      l.rel = 'stylesheet';
      l.href = links[i].getAttribute('href');
      document.head.appendChild(l);
    }
    /* then the entry module. React mounts into #root and replaces the
       snapshot's markup with the real app, exactly as it does on the root
       page, where #root also holds static content until it boots. */
    var mods = head.querySelectorAll('script[type="module"][src^="/assets/"]');
    for (var j = 0; j < mods.length; j++) {
      var s = document.createElement('script');
      s.type = 'module';
      s.src = mods[j].getAttribute('src');
      document.body.appendChild(s);
    }
  }

  try {
    fetch('/', { cache: 'no-store', credentials: 'same-origin' })
      .then(function (r) { return r.ok ? r.text() : null; })
      .then(function (t) { if (t) inject(t); })
      .catch(function () { /* offline or blocked: the text stays, the links work */ });
  } catch (e) { /* no fetch: same fallback */ }
})();

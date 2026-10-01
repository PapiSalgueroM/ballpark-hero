# AdSense quality follow-up, 2026-10-01

Codex836 and837. The owner's current screenshot names **Low value content**.
It does not identify a URL, a minimum word count, a required traffic level or
an indexing threshold. Approval remains unresolved. No review, indexing or
sitemap request was submitted in this round.

## What the evidence establishes

- Google's review is a content and user-value assessment. Passing our HTML,
  canonical, sitemap and noindex checks does not establish AdSense readiness.
- Google's guidance calls for original, useful content and usable navigation.
  Adding generic paragraphs or increasing the game count is not evidence that
  the site meets that standard.
- Our Sept30 account receipt records a Sept25 rejection and a Sept20 indexing
  report with68 indexed and94 not indexed. Those are dated observations, not
  today's counts. The reported noindex example was the intentionally retired
  `/pack-battle` route. It should remain excluded.
- A rejection date does not establish Google's latest crawl date. A target
  above68 indexed pages or a suggested October14 recheck is a planning choice,
  not a published Google approval requirement.

Sources: [site readiness](https://support.google.com/adsense/answer/12176698?hl=en),
[original content and navigation](https://support.google.com/adsense/answer/7299563?hl=en),
[ad inventory policy](https://support.google.com/publisherpolicies/answer/11112688?hl=en).
Prior account evidence: [Google readiness receipt](GOOGLE-READINESS-2026-09-30.md).

The existing signed-in AdSense panel was read again on October1 and still
showed Needs attention, Low value content, Authorized ads.txt and the same
September25 4:59 AM EDT update. Search Console could not be refreshed: the
Computer Use helper could not verify the active browser URL and stopped
input. No new indexing counts or example URLs were obtained. The September20
numbers must not be relabeled as an October1 report.

## Concrete issues found

1. **Unsupported game promises on the home page.** The template advertised an
   MLB farm system, dynasty redshirting, trade deadlines and a universal real
   salary cap/locker-room response. Those descriptions exceed the implemented
   games. Codex836 replaces them with the existing roster, contracts, payroll,
   trades, draft, recruiting, portal and NIL features.
2. **Basketball and baseball hub accuracy.** The basketball hub implied every
   sim player was real, although simulations include generated players and
   fictional future seasons. Both hubs advertised a trade deadline without
   that game phase. Codex836 corrects the copy and regenerates the affected
   saved pages. The home page's corrected copy lives directly in index.html.
3. **Conflicting Club Manager era claims.** The public picker promises exact
   squads and says every player is real, while its own disclosures explain
   partial squads and generated youth padding. `clubManagerEras.ts` is already
   owned by Claude832. The exact issue and affected now.blurb, now.honesty and
   eraRealShareLabel statements were handed over in WORKBOARD, without editing
   that active file. This correction remains open until verified.
4. **NBA Stat Line manual ad eligibility.** Its slot mounts during loading and
   pool failure. Codex837 holds it until a playable setup, play or result is
   available. The page also contains a useful guide, so this is a conservative
   placement correction, not proof that this screen caused the rejection.
5. **Real-world data versus simulation on About.** The previous blanket claim
   about real rosters and stats did not distinguish generated simulation data.
   Codex836 adds that distinction, explains partial squad youth fill-ins and
   links the existing Record Books. The owner's personal note is preserved.

These are independently observed issues. Google has not confirmed which, if
any, contributed to the rejection.

## Bounded published usability check

Release N, entry index-DIQbV2hM.js: home, Club Manager and Soccer Career return
200 and render at390px with no horizontal overflow, runtime errors or broken
same-origin assets. The first playable home tile begins at y249. Signed-out
setup is available in both games and the Club Manager era picker advances to
nation selection. No creation form was submitted. The help dialog opens and
Escape returns focus without moving the document.

The shared help opener is36px and its close control32px. They remain a small
touch-target improvement, separate from the content corrections. These three
routes are a sample, not a full gameplay or AdSense assessment. Claude836 owns
the full rendered public audit, so this lane is not repeating that crawl.

Receipts: TEMP/dukb-adsense-visitor-audit/report.json and help-report.json.
TEMP means C:/Users/antho/AppData/Local/Temp on the owner's computer.

## Release and review boundary

Update after the shared Git sync: Claude's Release O handoff confirms that
Codex831, 836 and 837 reached production with main `fcdae1bf`, deployment
`102f28a4` and entry `index-Bj5VrkKR.js`. This is the publishing lane's receipt;
Codex has not repeated the rendered production check. The new Codex838 contest
was pushed afterward as `2db7c148` and still needs publication. AdSense approval
and current Search Console counts remain unverified.

Claude's rendered audit also identified missing home copy after React mounts,
a leaderboard timeout and slow college grids. Claims 839-841 cover those fixes.
The additional About/Contact, record-page, metadata and guide-copy findings
remain pending. These are the concrete follow-ups to the current rejection.

836 and837 passed the real app type check, production build,15 artifact
harnesses and explicit snapshot boot. The three affected saved pages are
updated, with changed fingerprints only for home, About, basketball and
baseball. The other166 ledger entries remain unchanged. The manual ad guard
also passes12 focused actual-Page outcomes and three effective copied
regressions. These checks establish the bounded implementation, not approval.
Build/source receipts: TEMP/dukb-round836-production/.

Code and saved-page fixes must reach the published domain and be checked there
before counting them as live improvements. A GitHub push updates the preview;
it does not publish the custom domain. WORKBOARD carries the release handoff.
The screenshot's confirmation checkbox should only be used after the owner has
reviewed the actual published changes. No approval guarantee is justified.

Remaining content work is concrete: resolve the era-copy contradiction, fix
failures identified by the rendered audit, and keep guides accurate as the
ongoing roster/league/career work lands. Preserve useful pages and intentional
retired-route exclusions. Do not blanket-noindex games to manipulate the review.

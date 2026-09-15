# Search Console inspection, September 15, 2026

Status scope: these Search Console observations precede the 4:19 AM EDT
AdSense review submission. The later guide corrections were independently
confirmed live at 18:47 EDT, but this document does not contain a newer
Google crawl or indexing result. The five indexing requests were not repeated.

Observed through the owner's signed-in Search Console for the domain property
`douknowball.com`. This is an indexing diagnostic, not an AdSense rejection
diagnosis. The new AdSense screenshot names only **Low value content**, with no
individual URLs or decision date.

## Aggregate report is older than the newest guides

Page indexing says **Last update: 9/3/26**. It reports 58 indexed and 91 not
indexed: 17 crawled, 71 discovered, and 3 pages with redirects. All 71 discovered
examples have N/A for their last crawl. These totals must not be presented as a
fresh September 15 measurement of the current release.

The crawled examples have dates from March through May, apart from the XML
sitemap on August 28. Validation badges are old too: the crawled group failed
August 22 after starting August 12; the discovered group passed April 14 after
starting March 9. An old validation badge is not a current quality verdict.

## Fresh inspection of the five format guides

All five URL Inspection results show **Discovered, currently not indexed**, a
recognized sitemap, and no recorded last crawl. NBA lists the sitemap as its
referring page; the other four say no referring page detected. This does not mean
they lack links: the live HTML audit verifies links from their sport hubs.

| Guide | Google live test | Indexing request |
|---|---|---|
| Champions League format history | Available to Google, September 15 at 12:39 AM | Accepted into the priority crawl queue |
| NFL playoff format history | Available to Google, September 15 at 12:43 AM | Accepted into the priority crawl queue |
| NBA playoff format history | Available to Google, September 15 at 12:47 AM | Accepted into the priority crawl queue |
| MLB postseason format history | Available to Google, September 15 at 12:50 AM | Accepted into the priority crawl queue |
| NHL playoff format history | Available to Google, September 15 at 12:55 AM | Accepted into the priority crawl queue |

Times are displayed in the local Search Console UI. The expanded Champions
League live result explicitly confirms smartphone inspection, crawl allowed,
successful fetch, indexing allowed, and the correct self canonical. Live tests
and accepted requests do not prove that a URL is indexed. Google says repeated
requests do not improve a page's queue position, so no duplicates were submitted.

The Sitemaps screen separately reports Success for `https://douknowball.com/sitemap.xml`,
148 discovered pages, and September 15 for both Submitted and Last read. This
session observed that status without resubmitting the sitemap.

The Manual actions and Security issues reports both say no issues detected.
Those are Google Search reports and do not clear the separate AdSense rejection.

## Live checks of the 17 older crawled examples

The read-only audit fetched current responses without JavaScript. Ten active
games all return 200, have self canonicals, no noindex, readable saved HTML,
sitemap entries and a verified incoming HTML link:

- `/football-connect-4`, `/guess-cbb-team`, `/guess-nascar-driver`
- `/guess-tennis-player`, `/guess-the-college`, `/f1-driver`, `/footle`
- `/baseball-career`, `/baseball-connections`, `/connections`

The other examples have distinct purposes:

- `/football-draft`, `/guess-soccer-club`, `/world-cup`: intentional HTML
  retirement redirects to home, matching the route and stub generators.
- `/guess-nfl-team`, `/football-timeline`: intentional hidden legacy games with
  noindex and omission from the sitemap.
- `/terms`: indexable legal content.
- `/sitemap.xml`: actual XML containing 148 URLs, not an HTML content page.

Do not remove retirement or noindex controls merely to reduce an exclusion count.
No accidental noindex, missing canonical or empty saved page was found among the
ten active candidates. All five format guides also pass these live checks and
have a two-link path from home through their sport hub.

## Changes supported by the audit

- Round 600 puts existing verified source links beside the sections they support.
- Round 602 corrects Footle's broad "No tracking" claim and links the four US
  Front Office pages and Record Books to relevant existing format guides.
- No arbitrary word quota, article count or approval probability is used.

The next evidence to obtain is a recorded crawl or indexing result after these
requests and the next publish. The current result is that the five guides had
not received a recorded crawl when inspected, not that Google rejected their
content after reading it. No AdSense re-review has been submitted in this session.

## Evidence and interpretation

The local read-only HTTP audit is in
`C:/Users/antho/.codex/scratch/gsc-live-audit-20260915/`, with `audit.json`,
`REPORT.md`, the probe, and response bodies. It includes 36 HTTP records and
records an isolated sitemap timeout followed by a successful recheck without
attributing that timeout to indexing.

Google's [URL Inspection documentation](https://support.google.com/webmasters/answer/9012289)
distinguishes the indexed version from a live test. Its
[recrawl guidance](https://support.google.com/webmasters/answer/6065812) explains
the request workflow. Search indexing is useful diagnostic evidence but is not a
published guarantee or prerequisite that settles AdSense approval.

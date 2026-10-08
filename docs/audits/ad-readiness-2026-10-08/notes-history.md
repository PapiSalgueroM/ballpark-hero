# notes-history (area: history)

Status: DONE 2026-10-08. Outputs: this file and history.json (same folder). Nothing else written, no tracked file touched, no build, no live fetch, no database.

If you are a restart: everything is finished. Re-emit the StructuredOutput from history.json and the summary below.

## What was read
OWNER-BRIEF.md; docs/OWNER-ADSENSE-RECOVERY-2026-08-30.md; docs/adsense/ (reapply-readiness, console-check, checklist-review, exclusion-source-audit, live-document-audit); docs/audits/ GOOGLE-READINESS-2026-09-30, GOOGLE-STATUS-2026-10-03, ADSENSE-QUALITY-2026-10-01, LIVE-RENDERED-AUDIT-2026-10-01, FORENSIC-QUALITY-AUDIT and QUALITY-REPAIR-BACKLOG (the indexing parts); docs/seo/ gsc-indexing-2026-09-15, indexing-audit, google-render-audit (top); OPERATING-CONTRACT, OWNER-DIRECTIVES, LEGAL_REVIEW; owner-prompts/2026-10-01/03-adsense-quality.md; MASTER-BUILD-SPEC sections 18, 21, 22, 23, 119, 172, D45, D46, D47, D140; SPEC-RECONCILIATION rows; PROJECT-STATE and WORKBOARD around every AdSense, low value, Search Console hit; HANDOFF-2026-10-02; fence headers (simGuideHeadings, simSeoTitles, simSeoMetaSplit, simSingleFooter, simSitemap, simAdsense, simIndexing, simHeadTags, simFaqSchema, simSchema, simInternalLinks, simHubDepth, simRecordPages, simHiddenPages, simRetiredRoutes, genRetiredStubs, simNoRivalNames, simHomeCopy, simLegalPages, simNoInventedQuotes, playHomeFold); git log on origin/main for round dates.

## Headline findings
1. Four rejections on record, all "Low value content": by 2026-08-21, 2026-08-30 03:52 EDT, 2026-09-09 16:47 EDT, 2026-09-25 04:59 EDT. Reviews requested about 2026-08-20, about 2026-08-22, 2026-09-02, 2026-09-15 04:19 EDT. No request and no new decision recorded after that. Owner paused Google work 2026-10-03.
2. The brief's Phase 1 collides head on with Round 638 (2026-09-19, his own ask for keyword headings and sub headings) and its fence simGuideHeadings (label in every h2, at least 8 h3 and 1 h4, 131 guides, 2,385 frozen items, 59,718 words). The brief's golf example is real today (moreSports.ts:1133, 1153-1156) and is that round's product.
3. simSchema section 3 requires a FAQPage with 2 or more questions on every game page; GameSeoContent.tsx:174-180 appends "Is X free to play?" to every guide.
4. GameHelp.tsx (the in game "?") reads the same guide data, so a copy rewrite changes in game help.
5. No 301 and no real 404 on this host (Round 272: _redirects not honored; Round 282 marker). /jeopardy and /deal-or-no-deal are already retired to /quiz-board and /squad-deal.
6. Owner asked on 2026-09-01 for his name OFF the site (Round 382); simNoInventedQuotes fails a real name next to a first person sentence. The brief wants a public owner name and bylines.
7. Sitemap claim in the brief is stale: 171 URLs today, derived dates 2026-08-25 to 2026-10-07, includes records (index plus 13), hubs, about, contact, whats-new, stadium-tycoon. Matches the pre Round 148 (2026-08-17) picture.
8. Two footers: fixed Round 313 (2026-08-28), fenced.
9. ads.txt: brief's string ends fa8; the real file and Google's id end fa0. Do not change the file.
10. Codex holds paused, unaccepted, uncommitted drafts (842 About/Contact, 843 record pages, 844 hub/archive metadata, 845 ten Higher or Lower guides) in the root checkout: the same work as brief Phases 1 to 3.
11. Of the 2026-10-01 rendered audit's ten fixes: 1 (Round 840) and 2 (Round 839) live; 3 (Round 841) claimed, no commit; 5, 6, 7 and the first family of 4 are the Codex drafts; 8, 9, 10 and the rest of 4 have no record.
12. Bing sends more search visits than Google (7,953 against 2,619 in the 30 days to 2026-09-14), and the keyword rounds were built for it.
13. Production load rule (2026-10-02 outage) rations the aggregate queries Phase 2 item 3 needs.
14. One consent component in src (CookieConsent.tsx) plus a Google CMP European message published in the AdSense account since 2026-02-11: probably the brief's "two banners" (inference).
15. This is at least the third outside written assessment pasted in (2026-08-25, 2026-09-15 judged "not reliable evidence of the current site state", 2026-10-08).

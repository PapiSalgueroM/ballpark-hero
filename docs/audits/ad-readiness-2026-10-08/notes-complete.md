# notes-complete (completeness critic of AUDIT.md draft)

Started 2026-10-08. Draft read: AUDIT.md, 801 lines, written 05:33. I do NOT edit the draft. Output is StructuredOutput only.
The only file I added is this one. No tracked file touched, nothing staged, nothing committed.

STATE: ALL CHECKING DONE. If restarted, do not redo anything: send the StructuredOutput from the lists below.

## Steps

- [x] Read OWNER-BRIEF.md in full (105 lines)
- [x] Read AUDIT.md draft in full (801 lines)
- [x] Read notes: writer, routes, crawl, trust, tech, marks, copy, history; history.json (21 fences, 16 owner decisions, causes, GSC, traffic, recovery rounds)
- [x] Read family-plan.md, marks.md (A, B1, B3 to B8, C, conflicts, plan), trust-lists.md
- [x] Spot checks: localhost:4190 (ads.txt fa0, sitemap 171 with 14 /records rows, dead address 200 and 32,200 bytes, disclaimers about 2, terms 3, home 0, "120+ free" 4 times on home), duplicates.json buckets, thin headings by level, 13 record pages' first paragraphs, 2 explainers, simAdsense line 464, registry comments, reapply-readiness 131 to 144, root checkout stash list and uncommitted WORKBOARD (read only)
- [ ] Return findings (StructuredOutput)

## Checked and fine (no correction)

- Tier tables sum (A 21 / 37,943 / 3,552; B 47 / 36,653 / 7,951; C 65 / 39,725 / 15,269; 114,321). 12 + 12 families = 133.
- All count sums in sections 1, 2, 4 (194 routes, 171 sitemap, 192 documents, 172+4+1+15).
- Five games retired July 2026: registry comments say 2026-07-06 and 07-08. Draft right.
- "Not yours, but standing advice of 2026-09-12": right, reapply-readiness.md is the lane's text (history.json filed it under owner decisions).
- No non ASCII, no em or en dash in the draft. Data index lists every file in the folder.
- 12 uncommitted source files in the root checkout, soccer2.ts not among them (but see stashes below).

## CORRECTIONS (draft says something the data does not support)

1. Record pages. Draft 8a gap "No intro of its own per page" and Phase 2 step 2 "give each of the 13 pages its own intro, notes on odd seasons". All 13 saved record pages already open with their own one or two sentence intro and already note odd seasons (World Series 1904 and 1994; Stanley Cup 1919 and 2005; NCAA 2020; Brownlow 1942 to 1945; NRL 2007 and 2009 vacant; Dally M 1997 and 2003; Heisman 2005 Bush). Missing is only the dated "last verified" line and a named source.
2. H1s. Draft 8e "keeps the keyword titles and H1s that the September rounds wrote". On 126 of 133 game pages the H1 is the plain game name and the search title is printed again as an EXTRA h2 above the guide; 7 use the search title as H1 (family-plan.md 216 to 219; saved golf page h1 "GOLF HIGHER OR LOWER", h2 "Golf Higher or Lower: Major Championships Quiz"). The extra h2 is never mentioned and no question asks about it.
3. Section 3 arithmetic. "106 ... 3, about 21 and 82" are the masked buckets (3/1/21/7/82 = 114). Leaves out 1 sentence on 67 pages and 7 on 6 pages. 10.5% is the masked share; raw 106 is 9%.
4. 1,876. Thin copy headings on the 133 game pages by level: h1 76, h2 39, h3 1,634, h4 127. So 1,761 are sub headings. Draft 8e uses 1,876 as "sub headings" baseline for a zero target, two lines after saying H1s cannot change.
5. Traffic "Nothing newer is recorded": WORKBOARD.md 7358 to 7361 has 2026-09-05 to 09-19, about 1,000 visitors a day, Bing 3,882 vs Google 1,705 (history.json trafficReadings[2]). About 30K a month, the brief's figure. No all traffic device split on record.
6. "the 4 pages with an ad slot": 4 of the 17 walked. simAdsense.mjs:464 EXPECTED_CALLERS = 80. "Essential only 0 and 0" was 2 pages.
7. 8f "8 of the 10": root checkout git stash list has stash 0 "Paused Codex845 soccer2 guide", stash 1 "Paused Codex845 football guide", stash 2 "four guide files"; 7 stashes. All ten guides were drafted.
8. Two banners: trust notes line 91 says the two LAYOUTS are "probably what the brief saw", line 95 says the Google message is "the likeliest". Draft picks one.
9. Section 9 says three decisions block Phase 1; section 10 heads ten questions "Decisions that block Phase 1".
10. Section 6 suggestions drop marks.md caveats: "None of this is legal advice" (line 7) and "Each new name would need a quick check that nobody else trades under it" (line 338).
11. 8b noindex row quotes "Do not mass-delete useful game pages" only. Same prompt: "Do not keep weak pages indexed merely because they create more URLs", "Do not add these sections mechanically".

## MISSING (auditors reported it, or the brief asks, and the draft lacks it)

A. The 2026-10-01 rendered audit and its ranked ten fixes (LIVE-RENDERED-AUDIT-2026-10-01.md 272 to 283). Status per notes-history item 11: 1 and 2 live; 3 claimed no commit; 4 to 7 = Codex drafts; 8, 9, 10 no record. Fix 4 = "Deepen the short guides, family by family ... start with the 10 higher or lower pages": the opposite of the brief's Tier C, and the reason the Codex draft is 75% longer. Draft 8f says "opposite way to the brief" with no source.
B. Open items of that audit on his ranking pages: /college-grid and /cbb-grid content 13 to 18 s after load (fix 3), /fantasy-draft "Could not load today's criteria" (fix 9), render blocking fonts (fix 10). Not re-measured by anyone today.
C. Other lane today (root checkout uncommitted WORKBOARD, "CODEX TO CLAUDE F" notes of October 8): brief not pasted to it; no Phase 1 to 4 work starts there; drafts not to be shipped on its notes; file split to be proposed after approval. It is building Round 1097 "Soccer Perfect Season" (a fifth Perfect Season reskin) in the September heading shape, heading check floor 131 to 132. Draft numbers (133 games, 68 reskins, 4 Perfect Season, 131, 171) move when it lands. Question not asked: do new games keep shipping in the old shape while Phase 1 waits.
D. Already done, not in 8a: the 5 explainers print sources and a typed "last checked" date (CL "40 sources across 4 publishers, last checked 2026-09-10", 93 outside links; NFL "13 sources across 6 publishers, last checked 2026-09-15"); 2,062 to 3,900 words each.
E. Collisions dropped from 8b/8c: ad banner count pinned at 80 and no ad on a noindex page; new outside source links need a privacy section 4 line; sport hub checks (700 words floor, 22 percent likeness cap); record page check (h1 is the search phrase, span rule) and Codex draft 843 edits that check; no rival names rule (81 names; Connect 4, Connections, Footle, Sports Millionaire pass it; packBattle.ts:14 comment); 2026-08-29 "Preserve existing routes" and "Archive and answer pages are wanted"; 2026-08-30 recovery addendum; Terms pin "an individual doing business as DoUKnowBall".
F. Indexing breakdown: 2026-09-20 = 68 indexed, 94 not (78 discovered never crawled, 10 crawled not indexed, 5 redirects, 1 noindex). Earlier audit's line that linking and technical work will not move it. Third outside assessment pasted in (2026-08-25, 2026-09-15, 2026-10-08).
G. Questions not asked: the extra h2; whether the 8 ranking pages get the heading removal with the rest, last or not at all; new games in the old shape meanwhile; when the audit gets committed (brief: commit after each phase; three scripts sit under scripts/); /ufc and /olympics and league names in URLs; ad slot on new guide or family pages.
H. Lists and pointers: sections 2, 3, 4, 5 have no inline pointer to the full list; footer, disclaimer and consent components never named (trust-lists.md has them); non page public files not in the inventory (robots.txt content never described, llms.txt, manifest.json, IndexNow key file); /profile/<name> not explained; 3 boards with an empty database fallback line; 12 commented out registry entries; record page URLs with trophy names missing from the league names list; Australia a quarter of the audience; privacy storage described in general only; headshot_url columns.
I. No plan for non game families: 6 sport hubs (/soccer worst thin heading page 39 of 51, 6 long descriptions, Codex retitles them), 5 explainers, 4 archives, /whats-new.
J. Family hub: copy auditor recommends 8 pages or 1 (family-plan.md line 95); draft gives five options, no proposal. Candidate explainer topics exist in family-plan.md section 6, draft only says "six to ten".
K. Readability: two sets of heading numbers side by side; unexplained terms (four word runs, hooks, signpost before it is defined, stubs, floor, ledger, tree, head, release gate, proxy, masked); repetition (ads.txt typo in 6 places, no 301 in 7, Codex drafts twice); lane only items in "Small things"; 801 lines for an owner who reads short messages; 33 questions with no default if unanswered.
